import pytest
from django.db import IntegrityError

from apps.accounts.models import Role, User
from apps.core import testing


def test_phone_is_normalised_on_create(clinic):
    user = User.objects.create_user(
        phone="+20 100-000 0001", password="x", full_name="A", role=Role.DOCTOR, clinic=clinic
    )
    assert user.phone == "+201000000001"


def test_phone_is_unique(clinic):
    testing.make_doctor(clinic, phone="01000000001")
    with pytest.raises(IntegrityError):
        testing.make_doctor(clinic, phone="0100 000 0001")


def test_clinic_staff_requires_clinic(db):
    with pytest.raises(IntegrityError):
        User.objects.create_user(phone="01000000009", password="x", full_name="A", role=Role.DOCTOR)


def test_superuser_without_clinic_is_allowed(db):
    admin = User.objects.create_superuser(phone="01000000010", password="x", full_name="Admin")
    assert admin.is_staff and admin.is_superuser
    assert not admin.has_app_role
    assert list(admin.permitted_doctors()) == []


def test_clinic_can_have_one_or_many_doctors(clinic):
    """CLINIC-001."""
    first = testing.make_doctor(clinic)
    assert clinic.is_single_doctor
    testing.make_doctor(clinic)
    assert not clinic.is_single_doctor
    assert clinic.active_doctors.count() == 2
    first.is_active = False
    first.save()
    assert clinic.is_single_doctor


class TestPermittedDoctors:
    def test_doctor_is_permitted_only_for_themself(self, doctor, second_doctor):
        assert list(doctor.permitted_doctors()) == [doctor]

    def test_staff_are_permitted_for_assigned_doctors(self, clinic, doctor, second_doctor):
        staff = testing.make_receptionist(clinic, doctors=[doctor, second_doctor])
        assert set(staff.permitted_doctors()) == {doctor, second_doctor}

    def test_staff_without_assignment_have_no_doctors(self, clinic, doctor):
        staff = testing.make_assistant(clinic)
        assert list(staff.permitted_doctors()) == []

    def test_inactive_doctors_are_excluded(self, clinic, doctor, second_doctor):
        staff = testing.make_receptionist(clinic, doctors=[doctor, second_doctor])
        second_doctor.is_active = False
        second_doctor.save()
        assert list(staff.permitted_doctors()) == [doctor]

    def test_doctors_of_another_clinic_are_excluded(self, clinic, other_clinic, doctor):
        foreign_doctor = testing.make_doctor(other_clinic)
        staff = testing.make_receptionist(clinic, doctors=[doctor, foreign_doctor])
        assert list(staff.permitted_doctors()) == [doctor]
