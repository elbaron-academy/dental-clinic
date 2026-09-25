"""Small factories shared by backend tests and QA API acceptance tests."""

import itertools

from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.clinics.models import Clinic

DEFAULT_PASSWORD = "Str0ng-pass!23"  # noqa: S105

_phone_counter = itertools.count(1)


def next_phone() -> str:
    return f"0100{next(_phone_counter):07d}"


def make_clinic(name: str = "Smile Dental", **kwargs) -> Clinic:
    return Clinic.objects.create(name=name, **kwargs)


def make_user(
    role: str,
    clinic: Clinic | None,
    *,
    full_name: str | None = None,
    phone: str | None = None,
    password: str = DEFAULT_PASSWORD,
    assigned_doctors=(),
    **kwargs,
) -> User:
    user = User.objects.create_user(
        phone=phone or next_phone(),
        password=password,
        full_name=full_name or f"{Role(role).label} {next(_phone_counter)}",
        role=role,
        clinic=clinic,
        **kwargs,
    )
    if assigned_doctors:
        user.assigned_doctors.set(assigned_doctors)
    return user


def make_doctor(clinic: Clinic, **kwargs) -> User:
    return make_user(Role.DOCTOR, clinic, **kwargs)


def make_assistant(clinic: Clinic, doctors=(), **kwargs) -> User:
    return make_user(Role.ASSISTANT, clinic, assigned_doctors=doctors, **kwargs)


def make_receptionist(clinic: Clinic, doctors=(), **kwargs) -> User:
    return make_user(Role.RECEPTIONIST, clinic, assigned_doctors=doctors, **kwargs)


def client_for(user: User | None = None) -> APIClient:
    client = APIClient()
    if user is not None:
        token, _ = Token.objects.get_or_create(user=user)
        client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


def make_patient(clinic: Clinic, doctors, *, full_name: str = "Test Patient", **kwargs):
    from apps.patients.models import Patient

    patient = Patient.objects.create(
        clinic=clinic, full_name=full_name, phone=kwargs.pop("phone", next_phone()), **kwargs
    )
    patient.doctors.set(doctors)
    return patient


def make_appointment(patient, doctor, *, when=None, **kwargs):
    from django.utils import timezone

    from apps.appointments.models import Appointment

    return Appointment.objects.create(
        clinic=patient.clinic,
        patient=patient,
        doctor=doctor,
        scheduled_at=when or timezone.now(),
        **kwargs,
    )


def make_active_visit(patient, doctor, *, started_by=None):
    """A checked-in appointment moved into an active visit."""
    from apps.appointments.models import AppointmentStatus
    from apps.visits.services import start_visit

    appointment = make_appointment(patient, doctor, status=AppointmentStatus.CHECKED_IN)
    return start_visit(appointment, started_by or doctor)
