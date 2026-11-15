import gzip
import json

import pytest
from django.contrib.auth import get_user_model

pytestmark = pytest.mark.django_db


@pytest.fixture
def client_signed_in(client):
    client.force_login(get_user_model().objects.create_user("sam@latech.edu", "pw-123456789"))
    return client


def test_json_is_gzipped_when_the_browser_accepts_it(client_signed_in):
    # PL-17: the skills list (seeded by a migration) is well over GZipMiddleware's 200 bytes.
    response = client_signed_in.get("/api/v1/skills/", HTTP_ACCEPT_ENCODING="gzip")

    assert response.status_code == 200
    assert response["Content-Encoding"] == "gzip"
    assert "Accept-Encoding" in response["Vary"]
    body = json.loads(gzip.decompress(response.content))
    assert len(body) > 0


def test_json_is_plain_when_the_browser_does_not_ask_for_gzip(client_signed_in):
    response = client_signed_in.get("/api/v1/skills/")

    assert response.status_code == 200
    assert not response.has_header("Content-Encoding")
    assert json.loads(response.content)
