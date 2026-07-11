from rest_framework.permissions import BasePermission


class IsDev(BasePermission):
    """Only the dev role may access. Full system control."""

    message = "Only the developer account can access this resource."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "dev"
        )


class IsAdminOrDev(BasePermission):
    """Admins and devs can access (devs have superset access everywhere)."""

    message = "You must be an administrator to access this resource."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("admin", "dev")
        )
