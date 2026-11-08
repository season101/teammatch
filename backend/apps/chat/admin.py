from django.contrib import admin

from .models import ChatMessage


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("sender", "team", "created_at")
    list_select_related = ("sender", "team__project")
    search_fields = ("sender__email", "body")
    raw_id_fields = ("team", "sender")
