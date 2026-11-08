from django.http import Http404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied, ValidationError

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
    """My team's chat, newest first, 50 a page (F4-09). Not a member: 403. No such team: 404."""

    serializer_class = ChatMessageSerializer
    pagination_class = ChatHistoryPagination

    def get_queryset(self):
        team_id = self.kwargs["pk"]
        access = services.team_access(self.request.user, team_id)
        if access is services.TeamAccess.NO_TEAM:
            raise Http404
        if access is services.TeamAccess.NOT_MEMBER:
            raise PermissionDenied()
        messages = ChatMessage.objects.filter(team_id=team_id).select_related("sender__profile")
        after = self.request.query_params.get("after")
        if after:
            try:
                messages = messages.filter(id__gt=int(after))
            except ValueError:
                raise ValidationError({"after": ["Must be a message id."]}) from None
        return messages
