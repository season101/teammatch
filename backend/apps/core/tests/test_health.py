from unittest import mock

import pytest

pytestmark = pytest.mark.django_db


def test_healthz_is_ok_without_dependencies(client):
    with mock.patch("apps.core.views.readiness") as readiness:
        response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    readiness.assert_not_called()


def test_readyz_ok_when_db_and_redis_up(client):
    response = client.get("/readyz")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["checks"]["database"]["ok"] is True
    assert body["checks"]["redis"]["ok"] is True


def test_readyz_503_when_redis_down(client):
    with mock.patch("apps.core.services._check_redis", side_effect=ConnectionError):
        response = client.get("/readyz")
    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert body["checks"]["redis"] == {
        "ok": False,
        "latency_ms": mock.ANY,
        "error": "ConnectionError",
    }


def test_api_health_is_public_and_always_200(client):
    with mock.patch("apps.core.services._check_db", side_effect=RuntimeError):
        response = client.get("/api/v1/health/")
    assert response.status_code == 200
    assert response.json()["status"] == "degraded"
    assert response.json()["checks"]["database"]["ok"] is False
