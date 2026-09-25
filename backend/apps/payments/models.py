from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


class PaymentMethod(models.Model):
    """Configurable in Django Admin; Cash is seeded by a data migration (PAY-005, PAY-006)."""

    name = models.CharField(max_length=50, unique=True)
    code = models.SlugField(max_length=30, unique=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return self.name


class PaymentStatus(models.TextChoices):
    """Payment state of an appointment (LIFE-001, CR-016)."""

    NOT_SET = "NOT_SET", "Amount due not set"
    PENDING = "PENDING", "Payment pending"
    PAID = "PAID", "Paid"


class Payment(models.Model):
    """Money received against an appointment, before or after the session (PAY-002, PAY-004)."""

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="payments")
    appointment = models.ForeignKey(
        "appointments.Appointment", on_delete=models.PROTECT, related_name="payments"
    )
    amount = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT, related_name="payments")
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    received_at = models.DateTimeField(default=timezone.now)
    note = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["received_at", "id"]
        permissions = [("manage_billing", "Can set the amount due")]
        constraints = [
            models.CheckConstraint(condition=Q(amount__gt=0), name="payment_amount_positive"),
        ]

    def __str__(self) -> str:
        return f"{self.amount} ({self.method}) for appointment #{self.appointment_id}"
