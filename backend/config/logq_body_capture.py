# From logq's logging contract ("Request bodies in spans"): adds http.request.body and
# http.response.body to the current span when LOGQ_CAPTURE_BODY=1. Local development only.
import os
import re

from django.core.exceptions import MiddlewareNotUsed
from django.utils.deprecation import MiddlewareMixin
from opentelemetry import trace

_SECRET = re.compile(
    r"""
    (?P<k>\b(?:authorization|\w*(?:pass(?:word|wd)|secret|token|api[_-]?key)\w*)["']?\s*[:=]\s*)
        (?:"(?:\\.|[^"\\])*"|(?:[a-z][\w-]*\s+)?[^\s,;&"'}]+)
  | \bbearer\s+[\w.~+/=-]+ | \beyJ[\w-]+\.[\w-]+\.[\w-]+
  | \b(?:AKIA[0-9A-Z]{16}|sk-[\w-]{20,}|ghp_\w{20,}|github_pat_\w{20,}|xox[bp]-[\w-]+)
  | (?<=://)[^\s:/@]*:[^\s/]+(?=@)
""",
    re.I | re.X,
)


def _clean(raw):  # redact first, then cut to 2 KB, so the cut cannot leave half a secret
    text = _SECRET.sub(lambda m: (m["k"] or "") + "[REDACTED]", raw.decode("utf-8", "replace"))
    return text.encode()[:2048].decode("utf-8", "ignore")


class BodyCaptureMiddleware(MiddlewareMixin):
    def __init__(self, get_response):
        if os.environ.get("LOGQ_CAPTURE_BODY") != "1":
            raise MiddlewareNotUsed  # off by default: Django drops this middleware
        super().__init__(get_response)

    # A debug aid must never change the response, so every failure is ignored.
    def process_request(self, request):
        try:  # request bodies over 64 KB are skipped
            size = int(request.META.get("CONTENT_LENGTH") or 0)
            if "json" in request.content_type and size <= 65536:
                span = trace.get_current_span()
                span.set_attribute("http.request.body", _clean(request.body))
        except Exception:
            pass

    def process_response(self, request, response):
        try:
            if "json" in response.headers.get("Content-Type", "") and not response.streaming:
                span = trace.get_current_span()
                span.set_attribute("http.response.body", _clean(response.content))
        except Exception:
            pass
        return response
