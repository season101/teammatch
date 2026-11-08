from django.urls import path

from apps.chat.consumers import ChatConsumer

websocket_urlpatterns = [
    path("ws/teams/<int:team_id>/", ChatConsumer.as_asgi()),
]
