from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings
from django.core.exceptions import ValidationError

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


class SocialAccountAdapter(DefaultSocialAccountAdapter):
    # Runs on every Google login, new or returning. The hd auth param is only a hint
    # to Google's account picker, so the ID token's claims decide.
    def pre_social_login(self, request, sociallogin):
        claims = sociallogin.account.extra_data
        hd = settings.SOCIALACCOUNT_PROVIDERS["google"]["AUTH_PARAMS"]["hd"]
        if claims.get("hd") != hd or claims.get("email_verified") is not True:
            raise ValidationError(
                f"Use your @{hd} Google account.", code="google_account_not_allowed"
            )
