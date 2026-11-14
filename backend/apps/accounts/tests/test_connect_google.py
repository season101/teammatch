"""F1-12: add Google or a password from Settings."""

from unittest import mock
from urllib.parse import parse_qs, urlsplit

import pytest
from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from django.contrib.auth import get_user_model

from apps.accounts.tests.test_google_sign_in import STUDENT, google_app, google_returns  # noqa: F401

pytestmark = pytest.mark.django_db

PASSWORD = "a-long-password-123"


def student(email=STUDENT["email"], password=PASSWORD):
    user = get_user_model().objects.create_user(email, password)
    EmailAddress.objects.create(user=user, email=email, verified=True, primary=True)
    return user


def connect(client, claims):
    """What Settings' Connect button does, then Google coming back with these claims."""
    start = client.post(
        "/_allauth/browser/v1/auth/provider/redirect",
        {"provider": "google", "callback_url": "/settings", "process": "connect"},
    )
    state = parse_qs(urlsplit(start["Location"]).query)["state"][0]
    with (
        mock.patch.object(
            GoogleOAuth2Adapter,
            "get_access_token_data",
            return_value={"access_token": "at", "id_token": "jwt", "expires_in": 3600},
        ),
        mock.patch.object(GoogleOAuth2Adapter, "_decode_id_token", return_value=dict(claims)),
    ):
        return client.get("/accounts/google/login/callback/", {"code": "c", "state": state})


def back_to_settings(response):
    """Where Google sends the browser back: /settings, and the ?error= code if refused."""
    assert response.status_code == 302
    url = urlsplit(response["Location"])
    assert url.path == "/settings"
    return parse_qs(url.query).get("error", [None])[0]


def test_connect_with_the_same_email_links_google_and_keeps_the_password(client):
    sam = student()
    client.force_login(sam)

    assert back_to_settings(connect(client, STUDENT)) is None

    assert SocialAccount.objects.get(provider="google").user == sam
    sam.refresh_from_db()
    assert sam.check_password(PASSWORD)
    providers = client.get("/_allauth/browser/v1/account/providers").json()["data"]
    assert [p["provider"]["id"] for p in providers] == ["google"]


def test_connect_refuses_a_google_account_with_a_different_email(client):
    kim = student("kim@email.latech.edu")
    client.force_login(kim)

    response = connect(client, {**STUDENT, "sub": "999", "email": "other@email.latech.edu"})

    assert back_to_settings(response) == "google_email_mismatch"
    assert not SocialAccount.objects.exists()
    assert client.session["_auth_user_id"] == str(kim.pk)  # still signed in as Kim


def test_connect_refuses_a_google_account_already_on_another_account(client):
    google_returns(client, STUDENT)  # Sam signs up with Google
    client.logout()
    kim = student("kim@email.latech.edu")
    client.force_login(kim)

    # Sam's Google account, picked while signed in as Kim: the email doesn't match either
    assert back_to_settings(connect(client, STUDENT)) == "google_email_mismatch"
    assert SocialAccount.objects.get().user.email == STUDENT["email"]


def test_connect_refuses_a_google_account_that_isnt_a_school_account(client):
    client.force_login(student())

    response = connect(client, {k: v for k, v in STUDENT.items() if k != "hd"})

    assert back_to_settings(response) == "google_account_not_allowed"
    assert not SocialAccount.objects.exists()


def test_a_google_only_account_sets_a_password_without_a_current_one(client):
    google_returns(client, STUDENT)
    user = get_user_model().objects.get(email=STUDENT["email"])
    assert not client.get("/_allauth/browser/v1/auth/session").json()["data"]["user"][
        "has_usable_password"
    ]

    response = client.post(
        "/_allauth/browser/v1/account/password/change",
        {"new_password": "a-new-long-password-7"},
        content_type="application/json",
    )

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.check_password("a-new-long-password-7")
    # both ways sign in afterward
    client.logout()
    login = client.post(
        "/_allauth/browser/v1/auth/login",
        {"email": STUDENT["email"], "password": "a-new-long-password-7"},
        content_type="application/json",
    )
    assert login.status_code == 200
    client.logout()
    google_returns(client, STUDENT)
    assert client.session["_auth_user_id"] == str(user.pk)
