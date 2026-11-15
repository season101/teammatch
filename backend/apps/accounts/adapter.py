from allauth.account.adapter import DefaultAccountAdapter
from allauth.account.utils import filter_users_by_email
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
        user = super().authenticate(request, **credentials)
        # F1-13, DD-37: the one exception to the single sign-in error. Saying yes
        # only emails a set-password link to the inbox owner.
        if user is None and email and is_google_only(email):
            raise ValidationError(
                "This email signs in with Google. Want to set a password too?",
                code="google_only_account",
            )
        return user


def is_google_only(email):
    return any(
        not user.has_usable_password() and user.socialaccount_set.filter(provider="google").exists()
        for user in filter_users_by_email(email)
    )


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
        # Social signup never calls clean_email, and a returning login never calls authenticate.
        if not is_allowed_email(claims.get("email", "")):
            raise domain_not_allowed_error()
        # Connect from Settings (F1-12, DD-36): the Google account has to have the same
        # email as the signed-in student, so one email stays one account.
        user = request.user
        if sociallogin.state.get("process") == "connect" and user.is_authenticated:
            if claims.get("email", "").lower() != user.email.lower():
                raise ValidationError(
                    f"That Google account uses a different email. Use the one for {user.email}.",
                    code="google_email_mismatch",
                )
