from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


class AppointmentStatus(models.TextChoices):
    """Lifecycle of an appointment (LIFE-001).

    SCHEDULED -> CHECKED_IN (waiting for doctor) -> IN_VISIT -> COMPLETED.
    SCHEDULED or CHECKED_IN -> CANCELLED (CR-007).
    """

    SCHEDULED = "SCHEDULED", "Scheduled"
    CHECKED_IN = "CHECKED_IN", "Waiting for doctor"
    IN_VISIT = "IN_VISIT", "In visit"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


OPEN_STATUSES = (AppointmentStatus.SCHEDULED, AppointmentStatus.CHECKED_IN)


class Appointment(models.Model):
    clinic = models.ForeignKey(
        "clinics.Clinic", on_delete=models.PROTECT, related_name="appointments"
    )
    patient = models.ForeignKey(
        "patients.Patient", on_delete=models.PROTECT, related_name="appointments"
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="doctor_appointments",
        limit_choices_to={"role": "DOCTOR"},
    )
    scheduled_at = models.DateTimeField(db_index=True)
    status = models.CharField(
        max_length=20, choices=AppointmentStatus.choices, default=AppointmentStatus.SCHEDULED
    )
    notes = models.TextField(blank=True)
    follow_up_of = models.ForeignKey(
        "visits.Visit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="follow_ups",
        help_text="The visit in which the doctor requested this follow-up.",
    )
    amount_due = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Amount the patient owes for this appointment; empty until set (PAY-001).",
    )
    checked_in_at = models.DateTimeField(null=True, blank=True)
    checked_in_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["scheduled_at", "id"]
        indexes = [
            models.Index(fields=["clinic", "scheduled_at"]),
            models.Index(fields=["doctor", "status"]),
        ]
        permissions = [
            ("check_in_appointment", "Can check a patient in"),
            ("cancel_appointment", "Can cancel an appointment"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(amount_due__isnull=True) | Q(amount_due__gte=0),
                name="amount_due_not_negative",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.patient} with {self.doctor.full_name} at {self.scheduled_at:%Y-%m-%d %H:%M}"

    @property
    def is_open(self) -> bool:
        return self.status in OPEN_STATUSES
