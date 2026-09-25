"""Default permissions for each clinic role (CR-002).

Each role is backed by a Django group with the same name. The groups are
created, and their default permissions granted, on every ``migrate``.
Administrators can grant *additional* permissions to a group or to a single
user in Django Admin. ``manage.py sync_role_permissions --reset`` restores the
defaults exactly.
"""

import logging

from django.contrib.auth.models import Group, Permission

from .models import Role

logger = logging.getLogger(__name__)

ROLE_GROUP_NAMES: dict[str, str] = {
    Role.DOCTOR: "Doctor",
    Role.ASSISTANT: "Assistant",
    Role.RECEPTIONIST: "Receptionist",
}

DEFAULT_ROLE_PERMISSIONS: dict[str, tuple[str, ...]] = {
    Role.DOCTOR: (
        "patients.view_patient",
        "appointments.view_appointment",
        "visits.start_visit",
        "visits.view_visit",
        "visits.record_visit",
        "visits.complete_visit",
    ),
    Role.ASSISTANT: (
        "patients.view_patient",
        "appointments.view_appointment",
        "visits.view_visit",
    ),
    Role.RECEPTIONIST: (
        "patients.view_patient",
        "patients.add_patient",
        "patients.change_patient",
        "appointments.view_appointment",
        "appointments.add_appointment",
        "appointments.change_appointment",
        "appointments.check_in_appointment",
        "appointments.cancel_appointment",
        "visits.start_visit",
        "payments.view_payment",
        "payments.add_payment",
        "payments.manage_billing",
    ),
}


def _resolve(perm_names, using):
    found, missing = [], []
    for name in perm_names:
        app_label, codename = name.split(".", 1)
        perm = (
            Permission.objects.using(using)
            .filter(content_type__app_label=app_label, codename=codename)
            .first()
        )
        (found if perm else missing).append(perm or name)
    return found, missing


def ensure_role_groups(using: str = "default", reset: bool = False) -> list[str]:
    """Create the role groups and grant their default permissions.

    Returns the permission names that do not exist (yet), for example while
    migrations of later apps have not run.
    """
    missing_all: list[str] = []
    for role, group_name in ROLE_GROUP_NAMES.items():
        group, _ = Group.objects.using(using).get_or_create(name=group_name)
        perms, missing = _resolve(DEFAULT_ROLE_PERMISSIONS[role], using)
        if reset:
            group.permissions.set(perms)
        else:
            group.permissions.add(*perms)
        missing_all.extend(missing)
    return missing_all


def role_group_name(role: str) -> str | None:
    return ROLE_GROUP_NAMES.get(role)
