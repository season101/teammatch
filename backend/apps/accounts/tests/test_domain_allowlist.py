import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model

pytestmark = pytest.mark.django_db

SIGNUP = "/_allauth/browser/v1/auth/signup"
LOGIN = "/_allauth/browser/v1/auth/login"


def post(client, url, email, password="a-long-password-123"):
    return client.post(url, {"email": email, "password": password}, content_type="application/json")


def test_sign_up_with_another_domain_is_rejected(client):
    response = post(client, SIGNUP, "sam@gmail.com")

    assert response.status_code == 400
    error = response.json()["errors"][0]
    assert error["code"] == "email_domain_not_allowed"
    assert "@latech.edu" in error["message"]  # the message lists the allowed domains
    assert not get_user_model().objects.filter(email__iexact="sam@gmail.com").exists()


def test_school_domain_is_accepted_in_any_case(client):
    response = post(client, SIGNUP, "Student@LATECH.EDU")

    assert response.status_code == 401  # created, email verification pending


def test_lookalike_domain_is_rejected(client):
    response = post(client, SIGNUP, "sam@latech.edu.evil.com")

    assert response.json()["errors"][0]["code"] == "email_domain_not_allowed"


def test_sign_in_with_another_domain_is_rejected(client):
    # made outside sign-up (e.g. in the admin), so the sign-up check never saw it
    user = get_user_model().objects.create_user("old@gmail.com", "a-long-password-123")
    EmailAddress.objects.create(user=user, email=user.email, verified=True, primary=True)

    response = post(client, LOGIN, "old@gmail.com")

    assert response.status_code == 400
    assert response.json()["errors"][0]["code"] == "email_domain_not_allowed"
    assert "_auth_user_id" not in client.session


def test_allowed_domains_come_from_settings(client, settings):
    settings.ALLOWED_EMAIL_DOMAINS = ["latech.edu", "@ULM.edu"]

    assert post(client, SIGNUP, "pat@ulm.edu").status_code == 401
    message = post(client, SIGNUP, "pat@gmail.com").json()["errors"][0]["message"]
    assert message == "Use your school email. Allowed: @latech.edu, @ulm.edu."
