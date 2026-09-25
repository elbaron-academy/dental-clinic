"""Row-level access: clinic + permitted doctors (ROLE-004, PATIENT-004).

Every API queryset for clinical data goes through these helpers so the
scoping rule lives in one place.
"""

from django.db.models import Exists, OuterRef


def permitted_doctor_ids(user) -> list[int]:
    cache = getattr(user, "_permitted_doctor_ids", None)
    if cache is None:
        cache = list(user.permitted_doctors().values_list("pk", flat=True))
        user._permitted_doctor_ids = cache
    return cache


def scoped_patients(user):
    from apps.patients.models import Patient

    link = Patient.doctors.through.objects.filter(
        patient_id=OuterRef("pk"), user_id__in=permitted_doctor_ids(user)
    )
    return Patient.objects.filter(clinic_id=user.clinic_id).filter(Exists(link))


def scoped_appointments(user):
    from apps.appointments.models import Appointment

    return Appointment.objects.filter(
        clinic_id=user.clinic_id, doctor_id__in=permitted_doctor_ids(user)
    )


def scoped_visits(user):
    """Visits handled by the user's permitted doctors (strict default, CR-009)."""
    from apps.visits.models import Visit

    return Visit.objects.filter(clinic_id=user.clinic_id, doctor_id__in=permitted_doctor_ids(user))
