import pytest
from django.core import mail

from apps.accounts.models import User

pytestmark = pytest.mark.django_db


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
