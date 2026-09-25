"""Amount due / paid / remaining calculations (PAY-001..003, PAY-007)."""

from decimal import Decimal

from django.db.models import DecimalField, OuterRef, Subquery, Sum, Value
from django.db.models.functions import Coalesce

from .models import Payment, PaymentStatus

ZERO = Decimal("0.00")


def paid_subquery():
    totals = (
        Payment.objects.filter(appointment=OuterRef("pk"))
        .values("appointment")
        .annotate(total=Sum("amount"))
        .values("total")
    )
    return Coalesce(
        Subquery(totals, output_field=DecimalField(max_digits=12, decimal_places=2)),
        Value(ZERO),
        output_field=DecimalField(max_digits=12, decimal_places=2),
    )


def with_amount_paid(queryset):
    """Annotate appointments with ``amount_paid_total`` without join fan-out."""
    return queryset.annotate(amount_paid_total=paid_subquery())


def amount_paid(appointment) -> Decimal:
    annotated = getattr(appointment, "amount_paid_total", None)
    if annotated is not None:
        return annotated
    total = appointment.payments.aggregate(total=Sum("amount"))["total"]
    return total or ZERO


def summary(appointment) -> dict:
    paid = amount_paid(appointment)
    due = appointment.amount_due
    if due is None:
        remaining, status = None, PaymentStatus.NOT_SET
    else:
        remaining = due - paid
        status = PaymentStatus.PENDING if remaining > 0 else PaymentStatus.PAID
    return {
        "amount_due": due,
        "amount_paid": paid,
        "remaining_amount": remaining,
        "payment_status": status.value,
        "payment_status_display": status.label,
    }
