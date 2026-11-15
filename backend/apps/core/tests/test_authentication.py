import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User

pytestmark = pytest.mark.django_db


def test_signed_out_calls_get_401_not_authenticated():
    response = APIClient().get("/api/v1/me/profile/")

    assert response.status_code == 401
    assert response.json()["code"] == "not_authenticated"
    assert response["WWW-Authenticate"] == "Session"


def test_a_signed_in_write_without_the_csrf_token_is_still_403():
    client = APIClient(enforce_csrf_checks=True)
    client.force_login(User.objects.create_user("sam@latech.edu", "a-long-password"))

    response = client.post("/api/v1/me/rules/accept/")

    assert response.status_code == 403
    assert "CSRF" in response.json()["detail"]
