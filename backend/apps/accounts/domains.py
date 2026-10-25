from django.conf import settings
from django.core.exceptions import ValidationError


# BR-01: only school email domains get in (F1-06).
def allowed_domains() -> list[str]:
    return [d.strip().lstrip("@").lower() for d in settings.ALLOWED_EMAIL_DOMAINS if d.strip()]


def is_allowed_email(email: str) -> bool:
    # "Student@LATECH.EDU" counts as latech.edu
    domain = email.rpartition("@")[2].strip().lower()
    return domain in allowed_domains()


def domain_not_allowed_error() -> ValidationError:
    domains = ", ".join(f"@{d}" for d in allowed_domains())
    return ValidationError(
        f"Use your school email. Allowed: {domains}.", code="email_domain_not_allowed"
    )
