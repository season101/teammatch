import pytest
from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount

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


def account(email, password=None, google=False):
    user = User.objects.create_user(email, password)  # no password: unusable, like a Google signup
    EmailAddress.objects.create(user=user, email=email, verified=True, primary=True)
    if google:
        SocialAccount.objects.create(user=user, provider="google", uid=email)
    return user


# F1-13, DD-37: the one exception to the single sign-in error.
def test_google_only_account_is_offered_a_password(client):
    account("g@email.latech.edu", google=True)

    response = sign_in(client, "G@email.latech.edu", "any-password")

    assert response.status_code == 400
    error = response.json()["errors"][0]
    assert error["code"] == "google_only_account"
    assert error["message"] == "This email signs in with Google. Want to set a password too?"
    assert client.get(SESSION).status_code == 401


@pytest.mark.parametrize(
    "password, google",
    [
        ("a-long-password", True),  # Google and a password: a wrong one is just wrong
        (None, False),  # no password and no Google
    ],
)
def test_other_accounts_keep_the_single_error(client, sam, password, google):
    account("other@email.latech.edu", password, google)
    expected = sign_in(client, "sam@latech.edu", "not-the-password").json()["errors"][0]["code"]

    response = sign_in(client, "other@email.latech.edu", "not-the-password")

    assert response.status_code == 400
    assert response.json()["errors"][0]["code"] == expected != "google_only_account"
