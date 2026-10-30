from django.conf import settings
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


# One profile per user. Avatar (F1-07) comes later.
class Profile(TimeStampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    display_name = models.CharField(max_length=80, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    major = models.CharField(max_length=100, blank=True)
    skills = models.ManyToManyField(Skill, blank=True, related_name="profiles")
    # Set by retire() when their team locks (BR-08). F1-08 adds the rest.
    retired_until = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.display_name or self.user.email


# post_save, not allauth's user_signed_up, so admin and createsuperuser users get one too (UC-02).
@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_profile(sender, instance, created, raw=False, **kwargs):
    if created and not raw:
        Profile.objects.create(user=instance)
