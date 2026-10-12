from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


# One profile per user. Skills (F1-04), avatar (F1-07) and retired_until (F1-08) come later.
class Profile(TimeStampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    display_name = models.CharField(max_length=80, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    major = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return self.display_name or self.user.email
