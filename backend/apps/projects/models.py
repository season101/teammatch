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


class RoleStatus(models.TextChoices):
    OPEN = "open", "Open"
    FILLED = "filled", "Filled"


class Role(TimeStampedModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="roles")
    title = models.CharField(max_length=100)
    description = models.TextField(max_length=1000, blank=True)
    status = models.CharField(max_length=10, choices=RoleStatus.choices, default=RoleStatus.OPEN)
    filled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="filled_roles",
    )
    # required_skills (M2M to Skill) is added once the Skill model lands (F1-04 / F2-02).

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(status__in=RoleStatus.values),
                name="role_status_valid",
            ),
            # filled means someone fills it, and only then
            models.CheckConstraint(
                condition=(
                    models.Q(status=RoleStatus.FILLED, filled_by__isnull=False)
                    | models.Q(status=RoleStatus.OPEN, filled_by__isnull=True)
                ),
                name="role_filled_has_filler",
            ),
        ]
        indexes = [
            models.Index(fields=["project", "status"], name="role_project_status_idx"),
            models.Index(
                fields=["status"],
                name="role_open_idx",
                condition=models.Q(status=RoleStatus.OPEN),
            ),
        ]

    def __str__(self):
        return f"{self.title} ({self.project})"
