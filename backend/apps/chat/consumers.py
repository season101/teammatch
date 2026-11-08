import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework.exceptions import ValidationError

from . import services


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """Team chat at /ws/teams/<id>/ (F4-08). Frames are {type, data}, see api.md."""

    async def connect(self):
        self.team_id = self.scope["url_route"]["kwargs"]["team_id"]
        self.group = services.group_name(self.team_id)
        self.joined = False
        user = self.scope["user"]
        # Accept first: a close before accept reaches the browser as a plain 403, without our code.
        await self.accept()
        if not user.is_authenticated:
            await self.close(code=4401)
        elif not await database_sync_to_async(services.is_member)(user, self.team_id):
            await self.close(code=4404)
        else:
            await self.channel_layer.group_add(self.group, self.channel_name)
            self.joined = True

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None, **kwargs):
        if not self.joined:
            return  # refused sockets can't post, even if a frame slips in before the close
        try:
            content = json.loads(text_data)
        except (TypeError, ValueError, RecursionError):  # RecursionError: deeply nested JSON
            await self.send_error("Frames must be JSON text.")
        else:
            await self.receive_json(content)

    async def receive_json(self, content, **kwargs):
        data = content.get("data") if isinstance(content, dict) else None
        if not isinstance(data, dict):
            await self.send_error("Frames look like {type, data}.")
        elif content.get("type") == "ping":
            await self.send_json({"type": "pong", "data": {}})
        elif content.get("type") == "chat.send":
            await self.post(data)
        else:
            await self.send_error("Unknown frame type.")

    async def post(self, data):
        # echoed to the whole team, so only a short string
        client_id = data.get("client_id")
        client_id = client_id[:64] if isinstance(client_id, str) else None
        try:
            await database_sync_to_async(services.post_message)(
                self.team_id, self.scope["user"], data.get("body"), client_id
            )
        except ValidationError as error:
            await self.send_error(error.detail["body"][0], client_id)

    async def chat_message(self, event):
        await self.send_json({"type": "chat.message", "data": event["data"]})

    async def send_error(self, message, client_id=None):
        await self.send_json(
            {
                "type": "chat.error",
                "data": {"code": "validation_error", "message": message, "client_id": client_id},
            }
        )
