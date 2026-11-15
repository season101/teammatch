import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

# Django has to be set up before anything imports models.
django_asgi_app = get_asgi_application()

from channels.auth import AuthMiddlewareStack  # noqa: E402
from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import AllowedHostsOriginValidator  # noqa: E402

from config.routing import websocket_urlpatterns  # noqa: E402

websocket_app = AllowedHostsOriginValidator(AuthMiddlewareStack(URLRouter(websocket_urlpatterns)))
try:
    # Dev-only package (logq pilot). The Django instrumentation traces HTTP; this gives each
    # chat socket a span, so the consumer's log lines carry a trace_id too.
    from opentelemetry.instrumentation.asgi import OpenTelemetryMiddleware

    websocket_app = OpenTelemetryMiddleware(websocket_app)
except ImportError:
    pass

application = ProtocolTypeRouter({"http": django_asgi_app, "websocket": websocket_app})
