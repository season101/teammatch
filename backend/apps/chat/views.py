from django.http import Http404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics
from rest_framework.exceptions import ValidationError

from apps.core.pagination import DefaultCursorPagination

from . import services
from .models import ChatMessage
from .serializers import ChatMessageSerializer


class ChatHistoryPagination(DefaultCursorPagination):
    page_size = 50


@extend_schema(
    tags=["chat"],
    parameters=[
        OpenApiParameter(
            "after",
            int,
            description="Only messages with a greater id, to catch up after a reconnect.",
        )
    ],
)
class TeamMessagesView(generics.ListAPIView):
    """My team's chat, newest first, 50 a page (F4-09). Not on the team or no such team: 404."""

    serializer_class = ChatMessageSerializer
    pagination_class = ChatHistoryPagination

    def get_queryset(self):
        team_id = self.kwargs["pk"]
        if not services.is_member(self.request.user, team_id):
            raise Http404
        messages = ChatMessage.objects.filter(team_id=team_id).select_related("sender__profile")
        after = self.request.query_params.get("after")
        if after:
            try:
                messages = messages.filter(id__gt=int(after))
            except ValueError:
                raise ValidationError({"after": ["Must be a message id."]}) from None
        return messages
