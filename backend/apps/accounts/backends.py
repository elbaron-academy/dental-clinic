from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import Permission

from apps.core.phone import normalize_phone

from .roles import role_group_name


class PhoneRoleBackend(ModelBackend):
    """Phone + password authentication; the user's role grants its group's permissions.

    The role is the single source of truth: users do not need to be added to
    the role group by hand. Extra groups and per-user permissions still apply.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        phone = kwargs.get("phone", username)
        if phone is None or password is None:
            return None
        return super().authenticate(request, username=normalize_phone(phone), password=password)

    def _get_group_permissions(self, user_obj):
        permissions = super()._get_group_permissions(user_obj)
        group_name = role_group_name(user_obj.role)
        if group_name:
            permissions = permissions | Permission.objects.filter(group__name=group_name)
        return permissions
