import os

os.environ.setdefault("DJANGO_SECRET_KEY", "local-dev-only-not-a-secret")

from .base import *  # noqa: E402, F403
from .base import MIDDLEWARE  # noqa: E402

DEBUG = True
ALLOWED_HOSTS = ["*"]
CSRF_TRUSTED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# uvicorn does not serve static like runserver does; with DEBUG on, WhiteNoise
# reads straight from the app dirs so admin and /api/docs work without collectstatic.
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")
