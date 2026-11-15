from drf_spectacular.authentication import SessionScheme
from rest_framework import authentication


class SessionAuthentication(authentication.SessionAuthentication):
    """The session cookie, with signed-out requests answered 401 not_authenticated.

    DRF answers 403 instead unless the first authenticator names a WWW-Authenticate
    scheme. Browsers don't prompt for an unknown one like this.
    """

    def authenticate_header(self, request):
        return "Session"


class SessionAuthenticationScheme(SessionScheme):
    """The same cookieAuth entry in the schema as DRF's own SessionAuthentication."""

    target_class = SessionAuthentication
