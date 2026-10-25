from allauth.account.adapter import DefaultAccountAdapter

from .domains import domain_not_allowed_error, is_allowed_email


class AccountAdapter(DefaultAccountAdapter):
    # Sign up: allauth runs every new email through here.
    def clean_email(self, email):
        email = super().clean_email(email)
        if not is_allowed_email(email):
            raise domain_not_allowed_error()
        return email

    # Sign in: also blocks accounts made before the allowlist, or in the admin.
    def authenticate(self, request, **credentials):
        email = credentials.get("email")
        if email and not is_allowed_email(email):
            raise domain_not_allowed_error()
        return super().authenticate(request, **credentials)
