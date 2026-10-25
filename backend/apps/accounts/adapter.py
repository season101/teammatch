from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings
from django.core.exceptions import ValidationError


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
