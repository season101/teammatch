from django.conf import settings
from django.db import models

from apps.matching.models import Team


# Messages are never edited, so no updated_at (and no TimeStampedModel).
class ChatMessage(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="chat_messages",
    )
    body = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["team", "-created_at"], name="chat_message_team_created_idx"),
        ]

    def __str__(self):
        return f"{self.sender} in {self.team}: {self.body[:30]}"
