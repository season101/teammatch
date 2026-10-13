from django.conf import settings
from django.db import models

from apps.core.models import Term, TimeStampedModel


class ProjectStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    OPEN = "open", "Open"
    LOCKED = "locked", "Locked"
    ARCHIVED = "archived", "Archived"


class Project(TimeStampedModel):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,  # history is not silently lost if a user is deleted
        related_name="projects",
    )
    term = models.ForeignKey(Term, on_delete=models.PROTECT, related_name="projects")
    title = models.CharField(max_length=100)
    pitch = models.TextField(max_length=2000)
    status = models.CharField(
        max_length=10,
        choices=ProjectStatus.choices,
        default=ProjectStatus.DRAFT,
    )

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(status__in=ProjectStatus.values),
                name="project_status_valid",
            ),
        ]
        indexes = [
            models.Index(fields=["term", "status"], name="project_term_status_idx"),
        ]

    def __str__(self):
        return self.title
