from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsStudent(BasePermission):
    """Admins and moderators don't act as students: no posting, applying or committing.
    Reading is fine. Put it after IsAuthenticated, so a signed-out call stays 401."""

    message = "Moderators and admins can't post or join projects."
    code = "not_a_student"

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or request.user.role == "student"
