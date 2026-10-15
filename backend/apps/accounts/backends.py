from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import Permission

from apps.core.phone import looks_like_phone, normalize_phone

from .models import normalize_username
from .roles import role_group_name


class PhoneRoleBackend(ModelBackend):
    """Phone + password authentication; the user's role grants its group's permissions.

    The role is the single source of truth: users do not need to be added to
    the role group by hand. Extra groups and per-user permissions still apply.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        identifier = kwargs.get("identifier") or kwargs.get("phone") or username
        if not identifier or password is None:
            return None
        UserModel = get_user_model()
        identifier = str(identifier).strip()
        # Usernames start with a letter, so they can never be mistaken for a phone number.
        if looks_like_phone(identifier):
            lookup = {"phone": normalize_phone(identifier)}
        else:
            lookup = {"username": normalize_username(identifier)}
        user = UserModel._default_manager.filter(**lookup).first()
        if user is None:
            UserModel().set_password(password)  # keep timing similar for unknown accounts
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

    def _get_group_permissions(self, user_obj):
        permissions = super()._get_group_permissions(user_obj)
        group_name = role_group_name(user_obj.role)
        if group_name:
            permissions = permissions | Permission.objects.filter(group__name=group_name)
        return permissions
