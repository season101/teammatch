import asyncio

from asgiref.sync import async_to_sync
from channels_redis.core import RedisChannelLayer

from config.settings import base


# Uses the real Redis at REDIS_URL with the prod layer config, not the test InMemoryChannelLayer.
def test_an_idle_receive_outlasts_the_redis_read_timeout():
    async def wait_seven_seconds_for_a_message():
        layer = RedisChannelLayer(**base.CHANNEL_LAYERS["default"]["CONFIG"])
        channel = await layer.new_channel()

        async def send_later():
            await asyncio.sleep(7)  # past redis-py's 5 s default read timeout
            await layer.send(channel, {"type": "chat.message"})

        sender = asyncio.create_task(send_later())
        try:
            assert await layer.receive(channel) == {"type": "chat.message"}
        finally:
            await sender
            await layer.flush()

    async_to_sync(wait_seven_seconds_for_a_message)()
