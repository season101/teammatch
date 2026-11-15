import os

os.environ.setdefault("DJANGO_SECRET_KEY", "local-dev-only-not-a-secret")

from .base import *  # noqa: E402, F403
from .base import MIDDLEWARE, REST_FRAMEWORK  # noqa: E402

DEBUG = True
ALLOWED_HOSTS = ["*"]
CSRF_TRUSTED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
# e2e tests read verification links from files; unset, mail still goes to the console.
if EMAIL_FILE_PATH := os.environ.get("EMAIL_FILE_PATH"):
    EMAIL_BACKEND = "django.core.mail.backends.filebased.EmailBackend"
# e2e runs sign up many accounts from one IP; allauth's per-IP limits would stall them.
if os.environ.get("E2E_NO_RATE_LIMITS") == "1":
    ACCOUNT_RATE_LIMITS = False
# Behind the Next rewrite the Host is api:8000; Google's redirect_uri must say localhost:3000.
USE_X_FORWARDED_HOST = True

# uvicorn does not serve static like runserver does; with DEBUG on, WhiteNoise
# reads straight from the app dirs so admin and /api/docs work without collectstatic.
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")

# Playwright runs and demo rehearsals apply far more often than a student would.
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["apply"] = "10000/hour"
