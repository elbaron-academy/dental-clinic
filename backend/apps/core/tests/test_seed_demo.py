"""CLINIC-001: demo setup with a multi-doctor and a single-doctor clinic."""

import pytest
from django.core.management import CommandError, call_command

from apps.accounts.models import User
from apps.clinics.models import Clinic
from apps.patients.models import Patient


def test_seed_demo_is_idempotent(db, api_client):
    call_command("seed_demo", "--force", "--sample-patients")
    call_command("seed_demo", "--force", "--sample-patients")
    assert Clinic.objects.count() == 2
    assert not Clinic.objects.get(name="Smile Dental Center").is_single_doctor
    assert Clinic.objects.get(name="Nile Family Dental").is_single_doctor
    assert User.objects.count() == 7
    assert Patient.objects.count() == 3
    reception = User.objects.get(phone="01000000004")
    assert reception.permitted_doctors().count() == 2
    response = api_client.post(
        "/api/auth/login/", {"phone": "01000000004", "password": "demo-pass-123"}
    )
    assert response.status_code == 200


def test_seed_demo_refuses_without_debug(db, settings):
    settings.DEBUG = False
    with pytest.raises(CommandError):
        call_command("seed_demo")
