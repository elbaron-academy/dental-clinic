"""AUTH-002, ROLE-001..003, CR-002: the default permission matrix per role."""

import pytest
from django.contrib.auth.models import Group, Permission

from apps.accounts.models import Role
from apps.accounts.roles import DEFAULT_ROLE_PERMISSIONS, ROLE_GROUP_NAMES, ensure_role_groups
from apps.core import testing


def test_every_default_permission_exists(db):
    for role, perms in DEFAULT_ROLE_PERMISSIONS.items():
        for name in perms:
            app_label, codename = name.split(".")
            assert Permission.objects.filter(
                content_type__app_label=app_label, codename=codename
            ).exists(), f"{role}: {name}"


def test_role_groups_are_created_on_migrate(db):
    for role, group_name in ROLE_GROUP_NAMES.items():
        group = Group.objects.get(name=group_name)
        granted = {f"{p.content_type.app_label}.{p.codename}" for p in group.permissions.all()}
        assert granted == set(DEFAULT_ROLE_PERMISSIONS[role])


@pytest.mark.parametrize("role", list(Role))
def test_role_grants_default_permissions_without_group_membership(clinic, role):
    user = testing.make_user(role, clinic)
    assert not user.groups.exists()
    assert user.get_all_permissions() == set(DEFAULT_ROLE_PERMISSIONS[role])


EXPECTED = {
    # permission: (doctor, assistant, receptionist)
    "patients.view_patient": (True, True, True),
    "patients.add_patient": (True, False, True),  # CR-021
    "patients.change_patient": (False, False, True),
    "appointments.view_appointment": (True, True, True),
    "appointments.add_appointment": (False, False, True),
    "appointments.check_in_appointment": (False, False, True),
    "appointments.cancel_appointment": (False, False, True),
    "visits.start_visit": (True, False, True),
    "visits.view_visit": (True, True, False),
    "visits.record_visit": (True, False, False),
    "visits.complete_visit": (True, False, False),
    "payments.view_payment": (False, False, True),
    "payments.add_payment": (False, False, True),
    "payments.manage_billing": (False, False, True),
}


@pytest.mark.parametrize("perm", EXPECTED)
def test_permission_matrix(clinic, perm):
    """Matches the matrix documented in docs/DECISIONS.md."""
    users = [
        testing.make_user(role, clinic) for role in (Role.DOCTOR, Role.ASSISTANT, Role.RECEPTIONIST)
    ]
    assert tuple(u.has_perm(perm) for u in users) == EXPECTED[perm]


def test_admin_can_extend_a_role_group(clinic):
    assistant = testing.make_user(Role.ASSISTANT, clinic)
    assert not assistant.has_perm("patients.add_patient")
    Group.objects.get(name="Assistant").permissions.add(
        Permission.objects.get(codename="add_patient")
    )
    assistant = type(assistant).objects.get(pk=assistant.pk)  # clear permission cache
    assert assistant.has_perm("patients.add_patient")


def test_ensure_keeps_extra_grants_unless_reset(db):
    group = Group.objects.get(name="Assistant")
    extra = Permission.objects.get(codename="add_patient")
    group.permissions.add(extra)
    ensure_role_groups()
    assert group.permissions.filter(pk=extra.pk).exists()
    ensure_role_groups(reset=True)
    assert not group.permissions.filter(pk=extra.pk).exists()


def test_sync_role_permissions_command(db):
    from io import StringIO

    from django.core.management import call_command

    out = StringIO()
    call_command("sync_role_permissions", "--reset", stdout=out)
    assert "up to date" in out.getvalue()


def test_user_without_role_has_no_app_permissions(db, django_user_model):
    user = django_user_model.objects.create_user(
        phone="01000000123", password="x", full_name="X", is_staff=True
    )
    assert user.get_all_permissions() == set()
