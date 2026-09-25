from rest_framework.permissions import BasePermission


class IsClinicMember(BasePermission):
    """Only active staff that belong to an active clinic and have an app role.

    Platform administrators without a clinic manage the system through Django
    Admin, not through the clinic API (ROLE-004).
    """

    message = "Your account is not linked to an active clinic."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and user.has_app_role
            and user.clinic_id
            and user.clinic.is_active
        )


class ActionPermission(BasePermission):
    """Checks the Django permissions a viewset declares for the current action.

    Views declare ``action_permissions = {"list": ("app.perm",), ...}``.
    Actions that are not declared are denied, so new endpoints are closed until
    someone explicitly decides who may use them.
    """

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        action = getattr(view, "action", None)
        if action == "metadata":
            return True
        required = getattr(view, "action_permissions", {}).get(action)
        if required is None:
            return False
        return request.user.has_perms(required)
