import os

os.environ.setdefault("DJANGO_SECRET_KEY", "test-only")

from .base import *  # noqa: E402, F403
from .base import STORAGES  # noqa: E402

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
# Uploads stay in memory, so tests don't need SeaweedFS.
STORAGES = {
    **STORAGES,
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "resumes": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
}
