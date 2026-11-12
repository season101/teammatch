from base64 import b64encode
from urllib.parse import urlencode

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def test_forged_cursor_position_is_a_404_not_a_500():
    user = get_user_model().objects.create_user(email="user@latech.edu", password="pw")
    client = APIClient()
    client.force_authenticate(user)
    # same encoding DRF uses for its own cursors, but the position isn't a datetime
    cursor = b64encode(urlencode({"p": "not-a-date"}).encode("ascii")).decode("ascii")
    response = client.get("/api/v1/projects/", {"cursor": cursor})
    assert response.status_code == 404
    assert response.json() == {"detail": "Invalid cursor", "code": "not_found"}
