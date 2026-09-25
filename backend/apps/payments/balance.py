from apps.appointments.models import AppointmentStatus

from . import billing
from .models import PaymentStatus


def patient_balance(appointments) -> dict:
    """Totals over non-cancelled appointments; ``amount_due`` not set counts as 0."""
    totals = {
        "amount_due": billing.ZERO,
        "amount_paid": billing.ZERO,
        "remaining_amount": billing.ZERO,
        "appointments_pending": 0,
        "appointments_not_set": 0,
    }
    rows = billing.with_amount_paid(appointments.exclude(status=AppointmentStatus.CANCELLED))
    for appointment in rows:
        item = billing.summary(appointment)
        totals["amount_due"] += item["amount_due"] or billing.ZERO
        totals["amount_paid"] += item["amount_paid"]
        totals["remaining_amount"] += item["remaining_amount"] or billing.ZERO
        if item["payment_status"] == PaymentStatus.PENDING:
            totals["appointments_pending"] += 1
        elif item["payment_status"] == PaymentStatus.NOT_SET:
            totals["appointments_not_set"] += 1
    return totals
