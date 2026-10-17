from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel
from apps.projects.models import Project, Role


class ApplicationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    LIKED = "liked", "Liked"
    PASSED = "passed", "Passed"
    WITHDRAWN = "withdrawn", "Withdrawn"


class Application(TimeStampedModel):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="applications")
    applicant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    status = models.CharField(
        max_length=10,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.PENDING,
    )
    note = models.TextField(max_length=300, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["role", "applicant"], name="application_one_per_user_per_role"
            ),
            models.CheckConstraint(
                condition=models.Q(status__in=ApplicationStatus.values),
                name="application_status_valid",
            ),
        ]
        indexes = [
            models.Index(fields=["role", "status"], name="application_role_status_idx"),
            models.Index(fields=["applicant", "status"], name="application_applicant_idx"),
        ]

    def __str__(self):
        return f"{self.applicant} -> {self.role}"


# A candidate's pass on a role. The owner never sees these.
class RoleDismissal(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="role_dismissals",
    )
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="dismissals")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "role"], name="role_dismissal_once"),
        ]

    def __str__(self):
        return f"{self.user} passed {self.role}"


# Formed once every role is filled (BR-06). created_at is when the team formed.
class Team(TimeStampedModel):
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name="team")

    def __str__(self):
        return f"Team for {self.project}"


# One seat per filled role, plus the owner's seat (role is null).
class Membership(TimeStampedModel):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="memberships",
    )
    role = models.OneToOneField(
        Role, on_delete=models.CASCADE, null=True, blank=True, related_name="membership"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["team"],
                condition=models.Q(role__isnull=True),
                name="membership_one_owner_seat",
            ),
        ]

    def __str__(self):
        return f"{self.user} in {self.team}"
