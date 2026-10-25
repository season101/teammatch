import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model

pytestmark = pytest.mark.django_db

SIGNUP = "/_allauth/browser/v1/auth/signup"
LOGIN = "/_allauth/browser/v1/auth/login"
PASSWORD_RESET = "/_allauth/browser/v1/auth/password/request"
ADD_EMAIL = "/_allauth/browser/v1/account/email"


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
    assert get_user_model().objects.filter(email__iexact="student@latech.edu").exists()


def test_student_domain_is_accepted(client):
    # students sign up with their Google Workspace address
    response = post(client, SIGNUP, "s123@email.latech.edu")

    assert response.status_code == 401
    assert get_user_model().objects.filter(email="s123@email.latech.edu").exists()


# exact match only: no subdomains, no names that merely end in latech.edu
@pytest.mark.parametrize(
    "email", ["sam@latech.edu.evil.com", "sam@sub.latech.edu", "sam@evil-latech.edu"]
)
def test_lookalike_domain_is_rejected(client, email):
    response = post(client, SIGNUP, email)

    assert response.json()["errors"][0]["code"] == "email_domain_not_allowed"


def test_sign_in_with_another_domain_is_rejected(client):
    # made outside sign-up (e.g. in the admin), so the sign-up check never saw it
    user = get_user_model().objects.create_user("old@gmail.com", "a-long-password-123")
    EmailAddress.objects.create(user=user, email=user.email, verified=True, primary=True)

    response = post(client, LOGIN, "old@gmail.com")

    assert response.status_code == 400
    assert response.json()["errors"][0]["code"] == "email_domain_not_allowed"
    assert "_auth_user_id" not in client.session


# The same answer whether or not the account exists, so it can't be used to probe emails.
@pytest.mark.parametrize("email", ["old@gmail.com", "nobody@gmail.com"])
def test_password_reset_for_another_domain_is_rejected(client, email):
    get_user_model().objects.create_user("old@gmail.com", "a-long-password-123")

    response = client.post(PASSWORD_RESET, {"email": email}, content_type="application/json")

    assert response.status_code == 400
    assert response.json()["errors"][0]["code"] == "email_domain_not_allowed"


def test_adding_an_email_from_another_domain_is_rejected(client):
    user = get_user_model().objects.create_user("sam@latech.edu", "a-long-password-123")
    EmailAddress.objects.create(user=user, email=user.email, verified=True, primary=True)
    client.force_login(user)

    response = client.post(ADD_EMAIL, {"email": "alt@gmail.com"}, content_type="application/json")

    assert response.status_code == 400
    assert response.json()["errors"][0]["code"] == "email_domain_not_allowed"
    assert not EmailAddress.objects.filter(email="alt@gmail.com").exists()


def test_allowed_domains_come_from_settings(client, settings):
    settings.ALLOWED_EMAIL_DOMAINS = ["latech.edu", "@ULM.edu"]

    assert post(client, SIGNUP, "pat@ulm.edu").status_code == 401
    message = post(client, SIGNUP, "pat@gmail.com").json()["errors"][0]["message"]
    assert message == "Use your @latech.edu or @ulm.edu email."
