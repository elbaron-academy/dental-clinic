"""Appointment state transitions (APPT-002, CR-007).

Each transition locks the appointment row so two receptionists cannot move
the same appointment at the same time.
"""

from django.db import transaction
from django.utils import timezone

from apps.core.exceptions import BusinessRuleViolation

from .models import OPEN_STATUSES, Appointment, AppointmentStatus


def _locked(appointment: Appointment) -> Appointment:
    return Appointment.objects.select_for_update().get(pk=appointment.pk)


@transaction.atomic
def check_in(appointment: Appointment, user) -> Appointment:
    appointment = _locked(appointment)
    if appointment.status != AppointmentStatus.SCHEDULED:
        raise BusinessRuleViolation(
            f"Only scheduled appointments can be checked in "
            f"(this one is {appointment.get_status_display().lower()}).",
            code="invalid_status",
        )
    appointment.status = AppointmentStatus.CHECKED_IN
    appointment.checked_in_at = timezone.now()
    appointment.checked_in_by = user
    appointment.save(update_fields=["status", "checked_in_at", "checked_in_by", "updated_at"])
    return appointment


@transaction.atomic
def cancel(appointment: Appointment, user) -> Appointment:
    appointment = _locked(appointment)
    if appointment.status not in OPEN_STATUSES:
        raise BusinessRuleViolation(
            "Only scheduled or waiting appointments can be cancelled.", code="invalid_status"
        )
    appointment.status = AppointmentStatus.CANCELLED
    appointment.cancelled_at = timezone.now()
    appointment.cancelled_by = user
    appointment.save(update_fields=["status", "cancelled_at", "cancelled_by", "updated_at"])
    return appointment
