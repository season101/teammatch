import os

from . import hostenv  # noqa: F401

os.environ.setdefault("DJANGO_SECRET_KEY", "local-dev-only-not-a-secret")

from .base import *  # noqa: E402, F403

DEBUG = True
ALLOWED_HOSTS = ["*"]
CSRF_TRUSTED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
