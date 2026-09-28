from .base import *  # noqa: F403
from .base import MIDDLEWARE, STORAGES, env

DEBUG = False

# Traefik terminates TLS and redirects http to https.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = env.int("DJANGO_HSTS_SECONDS", default=3600)
SECURE_CONTENT_TYPE_NOSNIFF = True

# admin and DRF static files, collected into the image at build time
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")
STORAGES["staticfiles"] = {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"}

# EMAIL_URL like smtp+tls://user:pass@host:587 sets EMAIL_BACKEND, EMAIL_HOST, etc.
globals().update(env.email_url("EMAIL_URL", default="consolemail://"))
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="TeamMatch <no-reply@sijancodes.com>")
