from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

from apps.matching.models import Membership

from .serializers import ChatMessageSerializer


def is_member(user, team_id):
    """Only the team's members can read and post in its chat (BR-12).

    Used by the history view and the chat socket. Both treat a non-member the same as a
    missing team (404 / 4404), so team ids do not leak.
    """
    return Membership.objects.filter(team_id=team_id, user_id=user.id).exists()


def group_name(team_id):
    return f"team_{team_id}"


def post_message(team_id, sender, body, client_id=None):
    """Save a chat message (1-2000 chars) and send it to everyone on the team's socket.

    Raises ValidationError for a blank or too-long body. The broadcast waits for the commit,
    so nobody sees a message that rolled back. A failed broadcast is only logged: the row is
    saved, and the client's ?after= catch-up finds it.
    """
    serializer = ChatMessageSerializer(data={"body": body})
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        message = serializer.save(team_id=team_id, sender=sender)
        event = {
            "type": "chat.message",
            "data": {**ChatMessageSerializer(message).data, "client_id": client_id},
        }
        transaction.on_commit(
            lambda: async_to_sync(get_channel_layer().group_send)(group_name(team_id), event),
            robust=True,
        )
    return message
