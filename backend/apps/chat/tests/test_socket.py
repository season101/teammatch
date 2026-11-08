import functools
from contextlib import suppress
from datetime import datetime
from unittest import mock

import pytest
from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from django.db import transaction
from django.test import Client

from apps.chat.models import ChatMessage
from apps.chat.services import post_message
from apps.matching.tests.test_fill_and_lock import committed
from apps.matching.tests.test_my_team import locked_team, user
from config.asgi import application
from config.routing import websocket_urlpatterns

# The consumer's DB work and on_commit need real commits. A plain transaction=True flush
# would recreate content types under new ids and break the other committed tests.
pytestmark = committed

ORIGIN = (b"origin", b"http://localhost")
count_messages = database_sync_to_async(ChatMessage.objects.count)


def run_async(test):
    """No pytest-asyncio here: run the async body with async_to_sync instead."""

    @functools.wraps(test)
    def wrapper(*args, **kwargs):
        return async_to_sync(test)(*args, **kwargs)

    return wrapper


def socket_for(team_id, someone):
    """Skips the auth middleware and puts the user on the scope the way it would."""
    socket = WebsocketCommunicator(URLRouter(websocket_urlpatterns), f"/ws/teams/{team_id}/")
    socket.scope["user"] = someone
    return socket


async def joined(team_id, someone):
    socket = socket_for(team_id, someone)
    connected, _ = await socket.connect()
    assert connected
    return socket


async def close_code(socket):
    connected, _ = await socket.connect()
    assert connected  # accepted first, so the browser sees our code
    frame = await socket.receive_output()
    assert frame["type"] == "websocket.close"
    await socket.disconnect()
    return frame["code"]


def error(message, client_id=None):
    data = {"code": "validation_error", "message": message, "client_id": client_id}
    return {"type": "chat.error", "data": data}


@pytest.fixture
def ava_cookie(ava):
    client = Client()
    client.force_login(ava)
    return f"sessionid={client.cookies['sessionid'].value}".encode()


@run_async
async def test_signed_out_sockets_are_closed_with_4401(team):
    socket = WebsocketCommunicator(application, f"/ws/teams/{team.id}/", [ORIGIN])

    assert await close_code(socket) == 4401


@run_async
async def test_another_origin_is_refused(team, ava_cookie):
    headers = [(b"origin", b"http://evil.example"), (b"cookie", ava_cookie)]
    socket = WebsocketCommunicator(application, f"/ws/teams/{team.id}/", headers)

    connected, _ = await socket.connect()

    assert not connected


@run_async
async def test_a_member_signed_in_by_cookie_can_ping_and_post(team, ava, ava_cookie):
    headers = [ORIGIN, (b"cookie", ava_cookie)]
    socket = WebsocketCommunicator(application, f"/ws/teams/{team.id}/", headers)

    connected, _ = await socket.connect()
    await socket.send_json_to({"type": "ping", "data": {}})
    pong = await socket.receive_json_from()
    await socket.send_json_to({"type": "chat.send", "data": {"body": "hey", "client_id": "c-3"}})
    message = await socket.receive_json_from()

    assert connected
    assert pong == {"type": "pong", "data": {}}
    assert message["type"] == "chat.message"
    assert message["data"]["sender"] == {"id": ava.id, "display_name": "Ava"}
    assert message["data"]["client_id"] == "c-3"
    row = await database_sync_to_async(ChatMessage.objects.get)()
    assert (row.sender_id, row.body) == (ava.id, "hey")
    await socket.disconnect()


@pytest.mark.parametrize("who", ["outsider", "member of a missing team"])
@run_async
async def test_non_members_and_missing_teams_both_get_4404(team, ava, outsider, who):
    socket = socket_for(team.id, outsider) if who == "outsider" else socket_for(team.id + 1, ava)

    assert await close_code(socket) == 4404


@run_async
async def test_a_refused_socket_cannot_post(team, outsider):
    socket = socket_for(team.id, outsider)
    await socket.connect()
    await socket.receive_output()

    await socket.send_json_to({"type": "chat.send", "data": {"body": "sneaky"}})
    await socket.disconnect()

    assert await count_messages() == 0


@run_async
async def test_a_message_is_saved_and_reaches_every_member(team, marco, ava):
    sender = await joined(team.id, marco)
    other = await joined(team.id, ava)

    await sender.send_json_to(
        {"type": "chat.send", "data": {"body": "hi team", "client_id": "c-1"}}
    )
    to_sender = await sender.receive_json_from()
    to_other = await other.receive_json_from()

    row = await database_sync_to_async(ChatMessage.objects.get)()
    assert (row.team_id, row.sender_id, row.body) == (team.id, marco.id, "hi team")
    assert to_sender == to_other
    data = to_sender["data"]
    assert to_sender["type"] == "chat.message"
    assert datetime.fromisoformat(data.pop("created_at")) == row.created_at
    assert data == {
        "id": row.id,
        "team": team.id,
        "sender": {"id": marco.id, "display_name": "Marco"},
        "body": "hi team",
        "client_id": "c-1",
    }
    await sender.disconnect()
    await other.disconnect()


@pytest.fixture
def bea():
    return user("bea@latech.edu", "Bea")


@pytest.fixture
def other_team(team, bea):
    dee = user("dee@latech.edu", "Dee")
    return locked_team(bea, team.project.term, "Ruston Rides", [("Designer", dee)])


@run_async
async def test_a_message_stays_in_its_own_team(team, marco, other_team, bea):
    sender = await joined(team.id, marco)
    elsewhere = await joined(other_team.id, bea)

    await sender.send_json_to({"type": "chat.send", "data": {"body": "team A only"}})

    assert (await sender.receive_json_from())["type"] == "chat.message"
    assert await elsewhere.receive_nothing()
    await sender.disconnect()
    await elsewhere.disconnect()


@pytest.mark.parametrize(
    ("body", "message"),
    [
        ("", "This field may not be blank."),
        ("   ", "This field may not be blank."),
        ("x" * 2001, "Ensure this field has no more than 2000 characters."),
    ],
)
@run_async
async def test_bad_bodies_get_chat_error_and_save_nothing(team, marco, ava, body, message):
    sender = await joined(team.id, marco)
    other = await joined(team.id, ava)

    await sender.send_json_to({"type": "chat.send", "data": {"body": body, "client_id": "c-2"}})

    assert await sender.receive_json_from() == error(message, "c-2")
    assert await other.receive_nothing()
    assert await count_messages() == 0
    await sender.disconnect()
    await other.disconnect()


@run_async
async def test_a_2000_char_body_is_fine(team, marco):
    socket = await joined(team.id, marco)

    await socket.send_json_to({"type": "chat.send", "data": {"body": "x" * 2000}})

    frame = await socket.receive_json_from()
    assert frame["type"] == "chat.message"
    assert len(frame["data"]["body"]) == 2000
    assert frame["data"]["client_id"] is None
    await socket.disconnect()


@pytest.mark.parametrize(
    ("frame", "message"),
    [
        ({"text_data": "not json"}, "Frames must be JSON text."),
        ({"bytes_data": b"\x00"}, "Frames must be JSON text."),
        ({"text_data": "[" * 100000}, "Frames must be JSON text."),
        ({"text_data": "[]"}, "Frames look like {type, data}."),
        ({"text_data": '{"type": "ping"}'}, "Frames look like {type, data}."),
        ({"text_data": '{"type": "dance", "data": {}}'}, "Unknown frame type."),
    ],
)
@run_async
async def test_bad_frames_get_chat_error_and_keep_the_socket_open(team, marco, frame, message):
    socket = await joined(team.id, marco)

    await socket.send_to(**frame)
    assert await socket.receive_json_from() == error(message)

    await socket.send_json_to({"type": "ping", "data": {}})
    assert await socket.receive_json_from() == {"type": "pong", "data": {}}
    await socket.disconnect()


class Boom(Exception):
    pass


def post_then_roll_back(team, sender):
    with suppress(Boom), transaction.atomic():
        post_message(team.id, sender, "never happened")
        raise Boom


@run_async
async def test_the_broadcast_waits_for_the_commit(team, marco, ava):
    listener = await joined(team.id, ava)

    await database_sync_to_async(post_then_roll_back)(team, marco)

    assert await listener.receive_nothing()
    assert await count_messages() == 0
    await listener.disconnect()


def test_a_failed_broadcast_is_logged_and_the_message_kept(team, marco, caplog):
    with mock.patch("apps.chat.services.get_channel_layer", side_effect=OSError("redis down")):
        post_message(team.id, marco, "still saved")

    assert ChatMessage.objects.filter(body="still saved").exists()
    assert "redis down" in caplog.text
