import pytest
from django.core.exceptions import MiddlewareNotUsed

from config.logq_body_capture import BodyCaptureMiddleware, _clean


def test_off_by_default(monkeypatch):
    monkeypatch.delenv("LOGQ_CAPTURE_BODY", raising=False)
    with pytest.raises(MiddlewareNotUsed):
        BodyCaptureMiddleware(lambda request: None)


def test_secrets_are_redacted():
    body = b'{"email": "a@b.c", "password": "hunter2", "key": "eyJhbGci.eyJzdWIi.c2ln"}'
    cleaned = _clean(body)
    assert "hunter2" not in cleaned
    assert "eyJ" not in cleaned
    assert '"email": "a@b.c"' in cleaned


def test_cut_to_2_kb():
    assert len(_clean(b"x" * 5000)) == 2048
