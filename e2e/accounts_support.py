"""Helpers for the accounts tests: emailed links and a Google-only account."""

import re
import subprocess
import time
import uuid

import pytest
from conftest import ALLAUTH, User, _body, _messages


def mail_links(address, pattern):
    """Every link matching `pattern` in mail to `address`, newest first."""
    return [
        found.group(0)
        for message in _messages()
        if message["To"] == address
        for found in [re.search(pattern, _body(message))]
        if found
    ]


RESET = r"https?://\S+/reset-password/\S+"


def new_link(address, pattern, seen=(), timeout=15):
    """The first link for `address` that isn't in `seen`: waits for the mail to be written."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        fresh = [link for link in mail_links(address, pattern) if link not in seen]
        if fresh:
            return fresh[0]
        time.sleep(0.2)
    pytest.fail(f"No new mail matching {pattern} for {address} after {timeout} s")


def make_google_only(user: User, link: bool = True):
    """Link a Google account and drop the password: the account F1-13 is about (test data only).

    Returns a session key for that account, for a browser that is already "signed in with Google".
    """
    code = (
        "from django.contrib.auth import get_user_model\n"
        "from allauth.socialaccount.models import SocialAccount\n"
        f"u = get_user_model().objects.get(email__iexact='{user.email}')\n"
        f"{link!r} and SocialAccount.objects.create(provider='google', uid='e2e-{uuid.uuid4().hex}', user=u)\n"
        "u.set_unusable_password()\n"
        "u.save()\n"
        "from django.contrib.sessions.backends.db import SessionStore\n"
        "s = SessionStore()\n"
        "s['_auth_user_id'] = str(u.pk)\n"
        "s['_auth_user_backend'] = 'django.contrib.auth.backends.ModelBackend'\n"
        "s['_auth_user_hash'] = u.get_session_auth_hash()\n"
        "s.save()\n"
        "print('google-only-ok', s.session_key)\n"
    )
    out = subprocess.run(
        [
            "docker", "compose", "-p", "teammatch-e2e", "exec", "-T", "api",
            "python", "manage.py", "shell", "-c", code,
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert "google-only-ok" in out.stdout, out.stdout + out.stderr
    # a session for the new state: changing the password signs the old one out
    return out.stdout.split("google-only-ok")[1].split()[0]


def signup_api(api, email, password):
    return api().send("POST", f"{ALLAUTH}/auth/signup", {"email": email, "password": password})


def alerts(scope):
    """The page's own error messages: not Next's always-present, empty route announcer."""
    return scope.get_by_role("alert").filter(has_text=re.compile(r"\S"))
