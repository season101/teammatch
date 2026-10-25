from unittest import mock
from urllib.parse import parse_qs, urlsplit

import pytest
from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from django.contrib.auth import get_user_model
from django.core import mail

pytestmark = pytest.mark.django_db

REDIRECT = "/_allauth/browser/v1/auth/provider/redirect"
CALLBACK = "/accounts/google/login/callback/"

STUDENT = {
    "sub": "1234567890",
    "email": "s123@email.latech.edu",
    "email_verified": True,
    "hd": "email.latech.edu",
    "given_name": "Sam",
    "family_name": "Student",
}


@pytest.fixture(autouse=True)
def google_app(settings):
    google = {**settings.SOCIALACCOUNT_PROVIDERS["google"]}
    google["APPS"] = [{"client_id": "test-client", "secret": "test-secret"}]
    settings.SOCIALACCOUNT_PROVIDERS = {"google": google}


def start(client):
    """What the frontend's form POST does; returns the URL it sends the browser to."""
    response = client.post(
        REDIRECT, {"provider": "google", "callback_url": "/auth/callback", "process": "login"}
    )
    assert response.status_code == 302
    return response["Location"]


def google_returns(client, claims):
    """Google sends the browser back with a code; the token exchange yields these claims."""
    state = parse_qs(urlsplit(start(client)).query)["state"][0]
    with (
        mock.patch.object(
            GoogleOAuth2Adapter,
            "get_access_token_data",
            return_value={"access_token": "at", "id_token": "jwt", "expires_in": 3600},
        ),
        mock.patch.object(GoogleOAuth2Adapter, "_decode_id_token", return_value=dict(claims)),
    ):
        return client.get(CALLBACK, {"code": "c", "state": state})


def error_of(response):
    assert response.status_code == 302
    url = urlsplit(response["Location"])
    assert url.path == "/auth/callback"
    return parse_qs(url.query).get("error", [None])[0]


def test_auth_url_asks_google_for_a_school_account(client):
    query = parse_qs(urlsplit(start(client)).query)

    assert query["hd"] == ["email.latech.edu"]
    assert set(query["scope"][0].split()) == {"openid", "email", "profile"}
    assert query["redirect_uri"] == ["http://testserver/accounts/google/login/callback/"]


def test_new_google_user_gets_an_account_without_email_verification(client):
    response = google_returns(client, STUDENT)

    assert error_of(response) is None
    user = get_user_model().objects.get(email="s123@email.latech.edu")
    assert client.session["_auth_user_id"] == str(user.pk)
    assert SocialAccount.objects.filter(user=user, provider="google").exists()
    assert EmailAddress.objects.get(user=user).verified
    assert mail.outbox == []  # DD-12: no verification email


def test_existing_account_with_the_same_email_is_linked_not_duplicated(client):
    user = get_user_model().objects.create_user(STUDENT["email"], "a-long-password-123")
    EmailAddress.objects.create(user=user, email=user.email, verified=True, primary=True)

    response = google_returns(client, STUDENT)

    assert error_of(response) is None
    assert get_user_model().objects.count() == 1
    assert SocialAccount.objects.get(provider="google").user == user
    assert client.session["_auth_user_id"] == str(user.pk)
    user.refresh_from_db()
    assert user.check_password("a-long-password-123")  # email/password still works


def test_cancel_at_google_returns_to_the_app_with_an_error(client):
    state = parse_qs(urlsplit(start(client)).query)["state"][0]

    response = client.get(CALLBACK, {"error": "access_denied", "state": state})

    assert error_of(response) == "cancelled"
    assert "_auth_user_id" not in client.session


@pytest.mark.parametrize(
    "claims",
    [
        {**STUDENT, "hd": "latech.edu"},  # another Workspace
        {k: v for k, v in STUDENT.items() if k != "hd"},  # personal Google account
        {**STUDENT, "email_verified": False},
    ],
    ids=["other-hd", "no-hd", "unverified"],
)
def test_non_school_google_accounts_are_rejected(client, claims):
    response = google_returns(client, claims)

    assert error_of(response) == "google_account_not_allowed"
    assert "_auth_user_id" not in client.session
    assert not get_user_model().objects.exists()


def test_rejection_also_applies_to_an_already_linked_account(client):
    google_returns(client, STUDENT)
    client.logout()

    response = google_returns(client, {**STUDENT, "hd": "gmail.com"})

    assert error_of(response) == "google_account_not_allowed"
    assert "_auth_user_id" not in client.session


def test_config_lists_google_for_the_frontend(client):
    providers = client.get("/_allauth/browser/v1/config").json()["data"]["socialaccount"]

    assert providers["providers"] == [
        {
            "id": "google",
            "name": "Google",
            "flows": ["provider_redirect", "provider_token"],
            "client_id": "test-client",
        }
    ]
