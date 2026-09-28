import time

import redis
from django.conf import settings
from django.db import connection


def _timed(check):
    start = time.perf_counter()
    try:
        check()
        ok, error = True, None
    except Exception as exc:  # any failure means "not ready", the type goes in the report
        ok, error = False, type(exc).__name__
    return {"ok": ok, "latency_ms": round((time.perf_counter() - start) * 1000, 1), "error": error}


def _check_db():
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")


def _check_redis():
    client = redis.Redis.from_url(settings.REDIS_URL, socket_timeout=2, socket_connect_timeout=2)
    try:
        client.ping()
    finally:
        client.close()


def readiness():
    checks = {"database": _timed(_check_db), "redis": _timed(_check_redis)}
    return {
        "status": "ok" if all(c["ok"] for c in checks.values()) else "degraded",
        "version": settings.APP_VERSION,
        "checks": checks,
    }
