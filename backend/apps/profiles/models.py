from django.conf import settings
from django.db import models
from django.db.models.functions import Lower

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


# One profile per user. Avatar (F1-07) and retired_until (F1-08) come later.
class Profile(TimeStampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    display_name = models.CharField(max_length=80, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    major = models.CharField(max_length=100, blank=True)
    skills = models.ManyToManyField(Skill, blank=True, related_name="profiles")

    def __str__(self):
        return self.display_name or self.user.email
