"""One `request finished` log line per request and an X-Request-ID header (logq's contract)."""

import logging
import re
import time

from django.utils.deprecation import MiddlewareMixin
from django.utils.log import log_response
from opentelemetry import trace

logger = logging.getLogger("api.request")

_CONVERTER = re.compile(r"<(?:\w+:)?(\w+)>")  # path(): <int:pk>
_REGEX_GROUP = re.compile(r"\(\?P<(\w+)>[^)]*\)")  # re_path() / routers: (?P<pk>[^/.]+)


def route_template(route):
    """The matched route as a template: `api/v1/projects/<int:pk>/` -> `/api/v1/projects/{pk}/`."""
    route = _CONVERTER.sub(r"{\1}", _REGEX_GROUP.sub(r"{\1}", route))
    return "/" + route.replace("^", "").replace("$", "")


# MiddlewareMixin runs under ASGI (uvicorn) and WSGI (tests) alike.
class RequestLogMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request._log_start = time.perf_counter()

    def process_response(self, request, response):
        ctx = trace.get_current_span().get_span_context()
        if ctx.is_valid:  # no span outside opentelemetry-instrument (tests, manage.py)
            response["X-Request-ID"] = format(ctx.trace_id, "032x")
        if response.status_code >= 400:
            # Django logs 4xx itself, but after the span has ended (no trace_id); it then
            # skips its own copy.
            log_response(
                "%s: %s", response.reason_phrase, request.path, response=response, request=request
            )
        match = request.resolver_match  # None when no URL matched (404)
        logger.info(
            "request finished",
            extra={
                "http.request.method": request.method,
                **({"http.route": route_template(match.route)} if match else {}),
                "http.response.status_code": response.status_code,
                "duration_ms": round((time.perf_counter() - request._log_start) * 1000, 1),
            },
        )
        return response
