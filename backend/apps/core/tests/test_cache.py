from django.core.cache.backends.redis import RedisCache

from config.settings import base


# Uses the real Redis at REDIS_URL with the prod cache config, not the test LocMemCache.
def test_the_cache_is_redis_so_every_worker_shares_the_counts():
    config = base.CACHES["default"]
    assert config["BACKEND"] == "django.core.cache.backends.redis.RedisCache"

    worker_a = RedisCache(config["LOCATION"], {"KEY_PREFIX": "test-cache"})
    worker_b = RedisCache(config["LOCATION"], {"KEY_PREFIX": "test-cache"})
    worker_a.set("attempts", 0, 30)
    try:
        worker_a.incr("attempts")
        worker_b.incr("attempts")
        assert worker_a.get("attempts") == 2
    finally:
        worker_a.delete("attempts")
