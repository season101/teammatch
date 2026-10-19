from datetime import date
from io import StringIO

import pytest
from allauth.account.models import EmailAddress
from django.core.management import call_command

from apps.accounts.models import User
from apps.core.models import Term

pytestmark = pytest.mark.django_db

SEED_ENV = {
    "SEED_ADMIN_EMAIL": "admin@latech.edu",
    "SEED_ADMIN_PASSWORD": "admin-pass-123",  # gitleaks:allow (test-only value)
    "SEED_OWNER_EMAIL": "olive.owner@latech.edu",
    "SEED_OWNER_PASSWORD": "owner-pass-123",  # gitleaks:allow (test-only value)
    "SEED_CANDIDATE_EMAIL": "sam.student@latech.edu",
    "SEED_CANDIDATE_PASSWORD": "candidate-pass-123",  # gitleaks:allow (test-only value)
}


@pytest.fixture
def seed_env(monkeypatch):
    for key, value in SEED_ENV.items():
        monkeypatch.setenv(key, value)


def run_bootstrap():
    out = StringIO()
    call_command("bootstrap", stdout=out)
    return out.getvalue()


def test_creates_the_seed_accounts_verified_with_one_admin(seed_env):
    output = run_bootstrap()

    for role in ("ADMIN", "OWNER", "CANDIDATE"):
        email = SEED_ENV[f"SEED_{role}_EMAIL"]
        user = User.objects.get(email=email)
        assert user.check_password(SEED_ENV[f"SEED_{role}_PASSWORD"])
        assert EmailAddress.objects.get(email=email).verified
        assert SEED_ENV[f"SEED_{role}_PASSWORD"] not in output
    assert list(User.objects.filter(is_superuser=True).values_list("email", flat=True)) == [
        "admin@latech.edu"
    ]


def test_running_again_updates_passwords_without_duplicates(seed_env, monkeypatch):
    run_bootstrap()
    monkeypatch.setenv("SEED_OWNER_PASSWORD", "a-new-pass-456")

    run_bootstrap()

    assert User.objects.get(email="olive.owner@latech.edu").check_password("a-new-pass-456")
    assert User.objects.count() == 3
    assert EmailAddress.objects.count() == 3


def test_accounts_without_settings_are_skipped(monkeypatch):
    for key in SEED_ENV:
        monkeypatch.delenv(key, raising=False)

    run_bootstrap()

    assert not User.objects.exists()


def test_adds_the_fall_2026_term_once():
    run_bootstrap()
    run_bootstrap()

    term = Term.objects.get(name="Fall 2026")
    assert (term.start_date, term.end_date) == (date(2026, 9, 1), date(2026, 11, 20))


def test_keeps_term_dates_an_admin_changed():
    Term.objects.create(name="Fall 2026", start_date=date(2026, 9, 3), end_date=date(2026, 11, 19))

    run_bootstrap()

    assert Term.objects.get(name="Fall 2026").start_date == date(2026, 9, 3)
