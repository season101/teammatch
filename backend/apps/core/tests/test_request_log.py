import logging

from opentelemetry import trace
from opentelemetry.trace import NonRecordingSpan, SpanContext

from config.request_log import route_template


def test_request_finished_line(client, caplog):
    with caplog.at_level(logging.INFO, logger="api.request"):
        response = client.get("/healthz")
        client.get("/no-such-page/")
    ok, missing = [r for r in caplog.records if r.name == "api.request"]
    assert ok.getMessage() == "request finished"
    assert getattr(ok, "http.request.method") == "GET"
    assert getattr(ok, "http.route") == "/healthz"
    assert getattr(ok, "http.response.status_code") == 200
    assert isinstance(ok.duration_ms, float)
    assert not hasattr(missing, "http.route")
    assert getattr(missing, "http.response.status_code") == 404
    assert "X-Request-ID" not in response  # no span outside opentelemetry-instrument


def test_x_request_id_is_the_trace_id(client):
    ctx = SpanContext(
        trace_id=0x7F3A9C21B04E4D5A8E12C6D9F0A3B457, span_id=0xA1B2C3D4E5F60718, is_remote=False
    )
    with trace.use_span(NonRecordingSpan(ctx)):
        response = client.get("/healthz")
    assert response["X-Request-ID"] == "7f3a9c21b04e4d5a8e12c6d9f0a3b457"


def test_django_logs_4xx_once(client, caplog):
    with caplog.at_level(logging.WARNING, logger="django.request"):
        client.get("/api/v1/projects/")  # 403 returned by DRF, not raised
    messages = [r.getMessage() for r in caplog.records if r.name == "django.request"]
    assert messages == ["Forbidden: /api/v1/projects/"]


def test_route_template():
    assert route_template("api/v1/projects/<int:pk>/") == "/api/v1/projects/{pk}/"
    assert route_template("api/v1/feed/") == "/api/v1/feed/"
    assert route_template("api/x/(?P<pk>[^/.]+)/$") == "/api/x/{pk}/"
