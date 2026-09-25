"""Visit workflow rules (APPT-004..006, VISIT-006, VISIT-007, CR-010, CR-013)."""

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from apps.appointments.models import Appointment, AppointmentStatus
from apps.core.exceptions import BusinessRuleViolation

from .models import Visit, VisitStatus

ACTIVE_VISIT_MESSAGE = "This patient is already in an active visit."


@transaction.atomic
def start_visit(appointment: Appointment, user) -> Visit:
    """Move a checked-in patient into an active visit with the appointment's doctor."""
    appointment = Appointment.objects.select_for_update().get(pk=appointment.pk)
    if appointment.status != AppointmentStatus.CHECKED_IN:
        raise BusinessRuleViolation(
            "Check the patient in before starting the visit.", code="invalid_status"
        )
    if Visit.objects.filter(patient_id=appointment.patient_id, status=VisitStatus.ACTIVE).exists():
        raise BusinessRuleViolation(ACTIVE_VISIT_MESSAGE, code="active_visit_exists")
    try:
        with transaction.atomic():
            visit = Visit.objects.create(
                clinic_id=appointment.clinic_id,
                patient_id=appointment.patient_id,
                doctor_id=appointment.doctor_id,
                appointment=appointment,
                started_by=user,
            )
    except IntegrityError as exc:  # A concurrent request won the race.
        raise BusinessRuleViolation(ACTIVE_VISIT_MESSAGE, code="active_visit_exists") from exc
    appointment.status = AppointmentStatus.IN_VISIT
    appointment.save(update_fields=["status", "updated_at"])
    return visit


def ensure_recordable(visit: Visit, user) -> None:
    """Only the owning doctor may change an active visit (APPT-006)."""
    if visit.doctor_id != user.pk:
        raise PermissionDenied("Only the doctor handling this visit can record it.")
    if visit.status != VisitStatus.ACTIVE:
        raise BusinessRuleViolation("Completed visits cannot be changed.", code="visit_completed")


@transaction.atomic
def complete_visit(visit: Visit, user) -> Visit:
    visit = Visit.objects.select_for_update().get(pk=visit.pk)
    ensure_recordable(visit, user)
    if not visit.has_outcome():
        raise BusinessRuleViolation(
            "Record the session outcome (notes, diagnosis, treatment or a procedure) "
            "before completing the visit.",
            code="outcome_required",
        )
    visit.status = VisitStatus.COMPLETED
    visit.completed_at = timezone.now()
    visit.save(update_fields=["status", "completed_at", "updated_at"])
    Appointment.objects.filter(pk=visit.appointment_id).update(
        status=AppointmentStatus.COMPLETED, updated_at=timezone.now()
    )
    return visit


def add_follow_up(visit: Visit, user, *, scheduled_at, notes: str = "") -> Appointment:
    ensure_recordable(visit, user)
    return Appointment.objects.create(
        clinic_id=visit.clinic_id,
        patient_id=visit.patient_id,
        doctor_id=visit.doctor_id,
        scheduled_at=scheduled_at,
        notes=notes,
        follow_up_of=visit,
        created_by=user,
    )
