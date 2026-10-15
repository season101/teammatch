import pytest
from django.core import mail

pytestmark = pytest.mark.django_db


def test_verification_email_links_to_the_web_app(client, settings):
    response = client.post(
        "/_allauth/browser/v1/auth/signup",
        {"email": "sam@latech.edu", "password": "a-long-password-123"},
        content_type="application/json",
    )

    assert response.status_code == 401  # created, email verification pending
    assert f"{settings.FRONTEND_URL}/verify-email/" in mail.outbox[0].body
