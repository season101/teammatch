import re
from urllib.parse import unquote

import pytest
from allauth.account.models import EmailAddress
from django.core import mail
from django.test import Client

from apps.accounts.models import User

pytestmark = pytest.mark.django_db

SIGNUP = "/_allauth/browser/v1/auth/signup"
VERIFY = "/_allauth/browser/v1/auth/email/verify"
SESSION = "/_allauth/browser/v1/auth/session"


def sign_up(client, email):
    client.post(
        SIGNUP, {"email": email, "password": "a-long-password-123"}, content_type="application/json"
    )
    # the link has the key percent-encoded, as the web app receives it
    return unquote(re.search(r"/verify-email/(\S+)", mail.outbox[-1].body).group(1))


def verify(client, key):
    return client.post(VERIFY, {"key": key}, content_type="application/json")


def test_verification_email_links_to_the_web_app(client, settings):
    response = client.post(
        "/_allauth/browser/v1/auth/signup",
        {"email": "sam@latech.edu", "password": "a-long-password-123"},
        content_type="application/json",
    )

    assert response.status_code == 401  # created, email verification pending
    assert f"{settings.FRONTEND_URL}/verify-email/" in mail.outbox[0].body


def test_verification_email_is_branded_as_teammatch(client):
    client.post(
        "/_allauth/browser/v1/auth/signup",
        # another address: allauth rate-limits confirmation emails per address across tests
        {"email": "olive@latech.edu", "password": "a-long-password-123"},
        content_type="application/json",
    )

    message = mail.outbox[0]
    assert message.from_email == "TeamMatch <verification@teammatch.sijancodes.com>"
    assert message.subject == "TeamMatch: Please confirm your email address"
    assert message.body.startswith("Hello from TeamMatch!")
    assert "testserver" not in message.body  # no internal host name leaks into the text


def test_signing_up_again_with_a_taken_email_sends_a_reset_link(client, settings):
    User.objects.create_user("kim@latech.edu", "a-long-password-123")

    response = client.post(
        "/_allauth/browser/v1/auth/signup",
        {"email": "kim@latech.edu", "password": "another-long-password-456"},
        content_type="application/json",
    )

    assert response.status_code == 401  # same as a new signup: doesn't reveal the account
    assert User.objects.filter(email="kim@latech.edu").count() == 1
    assert f"{settings.FRONTEND_URL}/reset-password" in mail.outbox[0].body


def test_verifying_in_the_browser_that_signed_up_signs_you_in(client):
    key = sign_up(client, "ada@latech.edu")

    assert verify(client, key).status_code == 200
    assert client.get(SESSION).json()["data"]["user"]["email"] == "ada@latech.edu"


def test_verifying_in_another_browser_verifies_but_does_not_sign_in(client):
    key = sign_up(client, "lin@latech.edu")
    other_browser = Client()

    assert verify(other_browser, key).status_code == 401  # verified, sign in to continue
    assert EmailAddress.objects.get(email="lin@latech.edu").verified
    assert other_browser.get(SESSION).status_code == 401
    # nor does the browser that signed up get signed in by someone else's click
    assert client.get(SESSION).status_code == 401
