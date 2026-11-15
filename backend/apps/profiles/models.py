from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.core.files.storage import storages
from django.db import models
from django.db.models.functions import Lower
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.core.models import TimeStampedModel


# The fixed skill list people pick from (seeded in a migration).
class Skill(models.Model):
    name = models.CharField(max_length=50)
    slug = models.SlugField(max_length=50, unique=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            # "django" and "Django" count as the same skill
            models.UniqueConstraint(Lower("name"), name="skill_name_ci_unique"),
        ]

    def __str__(self):
        return self.name


def avatar_path(profile, filename):
    # avatars/{user_id}/{uuid}.{ext}: a new name per upload, so a cached old photo never shows.
    return f"avatars/{profile.user_id}/{uuid4().hex}{Path(filename).suffix}"


def resume_path(profile, filename):
    return f"resumes/{profile.user_id}/{uuid4().hex}.pdf"


def resume_storage():
    # The private "resumes" storage, never the public-style default (F1-16, DD-42).
    return storages["resumes"]


# One profile per user.
class Profile(TimeStampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    display_name = models.CharField(max_length=80, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    major = models.CharField(max_length=100, blank=True)
    skills = models.ManyToManyField(Skill, blank=True, related_name="profiles")
    # On the default storage (SeaweedFS). The API streams it; the bucket is never public (F1-07).
    avatar = models.ImageField(upload_to=avatar_path, blank=True)
    # Only https://github.com/... and https://linkedin.com/..., checked by the serializer (F1-15).
    github_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)
    # A PDF only its owner and owners they applied to can read, streamed by the API (F1-16).
    resume = models.FileField(upload_to=resume_path, storage=resume_storage, blank=True)
    # The name it was uploaded with, shown to its owner and used for downloads.
    resume_name = models.CharField(max_length=255, blank=True)
    # Set by retire() when their team locks (BR-08). F1-08 adds the rest.
    retired_until = models.DateField(null=True, blank=True)
    # When they agreed to the Team rules (DD-12). Empty until they do.
    rules_accepted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.display_name or self.user.email


# post_save, not allauth's user_signed_up, so admin and createsuperuser users get one too (UC-02).
@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_profile(sender, instance, created, raw=False, **kwargs):
    if created and not raw:
        Profile.objects.create(user=instance)
