import pytest

from apps.accounts.models import User

pytestmark = pytest.mark.django_db


def test_create_user_uses_email_as_login():
    user = User.objects.create_user("Sam@Example.edu", "a-long-password")
    assert user.email == "Sam@example.edu"
    assert user.check_password("a-long-password")
    assert not user.is_staff
