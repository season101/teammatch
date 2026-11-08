from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import ChatMessage


class ChatSenderSerializer(serializers.ModelSerializer):
    # display name only, never the sender's email
    display_name = serializers.CharField(source="profile.display_name", read_only=True)

    class Meta:
        model = get_user_model()
        fields = ["id", "display_name"]


class ChatMessageSerializer(serializers.ModelSerializer):
    """Same shape as the chat.message socket event, minus client_id."""

    sender = ChatSenderSerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = ["id", "team", "sender", "body", "created_at"]
        read_only_fields = ["team"]
