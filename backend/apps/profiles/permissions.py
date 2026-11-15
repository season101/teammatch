from rest_framework.permissions import SAFE_METHODS, BasePermission

from .services import rules_accepted


class IsOwnerOrReadOnly(BasePermission):
    """Anyone signed in can read a profile; only its owner can change it."""

    def has_object_permission(self, request, view, obj):
        return request.method in SAFE_METHODS or obj.user_id == request.user.id


class RulesAccepted(BasePermission):
    """Acting (apply, create or publish a project, like or pass, commit) needs the Team rules
    accepted (DD-12). The app's gate asks first (DD-47); this holds for any client.
    Reading doesn't. Put it after IsAuthenticated, so a signed-out call stays 401."""

    message = "Agree to the Team rules before you do that."
    code = "rules_not_accepted"

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or rules_accepted(request.user)
