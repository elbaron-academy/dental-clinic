"""Payment rules (CR-014, CR-015)."""

from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.appointments.models import Appointment, AppointmentStatus
from apps.core.exceptions import BusinessRuleViolation

from .billing import amount_paid
from .models import Payment, PaymentMethod


def _lock(appointment: Appointment) -> Appointment:
    appointment = Appointment.objects.select_for_update().get(pk=appointment.pk)
    if appointment.status == AppointmentStatus.CANCELLED:
        raise BusinessRuleViolation(
            "Cancelled appointments cannot be billed.", code="appointment_cancelled"
        )
    return appointment


@transaction.atomic
def set_amount_due(appointment: Appointment, amount_due: Decimal) -> Appointment:
    appointment = _lock(appointment)
    paid = amount_paid(appointment)
    if amount_due < paid:
        raise ValidationError(
            {"amount_due": [f"Cannot be less than the amount already paid ({paid})."]}
        )
    appointment.amount_due = amount_due
    appointment.save(update_fields=["amount_due", "updated_at"])
    return appointment


@transaction.atomic
def record_payment(
    appointment: Appointment, user, *, amount: Decimal, method: PaymentMethod, note: str = ""
) -> Payment:
    appointment = _lock(appointment)
    if appointment.amount_due is None:
        raise BusinessRuleViolation(
            "Set the amount due before recording a payment.", code="amount_due_not_set"
        )
    remaining = appointment.amount_due - amount_paid(appointment)
    if amount > remaining:
        raise ValidationError({"amount": [f"Payment exceeds the remaining amount ({remaining})."]})
    return Payment.objects.create(
        clinic_id=appointment.clinic_id,
        appointment=appointment,
        amount=amount,
        method=method,
        note=note,
        received_by=user,
    )
