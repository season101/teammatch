import pytest
from allauth.account.models import EmailAddress

from apps.accounts.models import User

pytestmark = pytest.mark.django_db

LOGIN = "/_allauth/browser/v1/auth/login"
SESSION = "/_allauth/browser/v1/auth/session"


@pytest.fixture
def sam():
    user = User.objects.create_user("sam@latech.edu", "a-long-password")
    EmailAddress.objects.create(user=user, email=user.email, verified=True, primary=True)
    return user


def sign_in(client, email, password):
    return client.post(
        LOGIN, {"email": email, "password": password}, content_type="application/json"
    )


def test_right_credentials_sign_in_with_a_session_cookie(client, sam):
    response = sign_in(client, "sam@latech.edu", "a-long-password")
    assert response.status_code == 200
    assert "sessionid" in response.cookies
    assert client.get(SESSION).json()["data"]["user"]["email"] == "sam@latech.edu"


def test_wrong_password_and_unknown_email_get_the_same_error(client, sam):
    wrong_password = sign_in(client, "sam@latech.edu", "not-the-password")
    unknown_email = sign_in(client, "nobody@latech.edu", "a-long-password")
    assert wrong_password.status_code == unknown_email.status_code == 400
    assert wrong_password.json()["errors"][0]["code"] == unknown_email.json()["errors"][0]["code"]


def test_unverified_email_cannot_sign_in(client):
    User.objects.create_user("new@latech.edu", "a-long-password")
    response = sign_in(client, "new@latech.edu", "a-long-password")
    assert response.status_code == 401
    assert client.get("/api/v1/me/profile/").status_code in (401, 403)


def test_sign_out_ends_the_session(client, sam):
    sign_in(client, "sam@latech.edu", "a-long-password")
    assert client.get("/api/v1/me/profile/").status_code == 200

    assert client.delete(SESSION).status_code == 401
    assert client.get(SESSION).status_code == 401
    assert client.get("/api/v1/me/profile/").status_code in (401, 403)
