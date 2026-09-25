from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from .validators import validate_tooth


class VisitStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    COMPLETED = "COMPLETED", "Completed"


class Visit(models.Model):
    """The clinical interaction between a doctor and a patient (VISIT-001..008).

    A patient can be in at most one active visit (APPT-005); the database
    enforces this with a partial unique constraint. The visit belongs to the
    doctor handling the patient (APPT-006).
    """

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="visits")
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="visits")
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="doctor_visits",
        limit_choices_to={"role": "DOCTOR"},
    )
    appointment = models.OneToOneField(
        "appointments.Appointment", on_delete=models.PROTECT, related_name="visit"
    )
    status = models.CharField(
        max_length=20, choices=VisitStatus.choices, default=VisitStatus.ACTIVE
    )
    started_at = models.DateTimeField(default=timezone.now)
    started_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField("visit notes", blank=True)
    diagnosis = models.TextField(blank=True)
    treatment = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-started_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["patient"],
                condition=Q(status="ACTIVE"),
                name="one_active_visit_per_patient",
            ),
        ]
        permissions = [
            ("start_visit", "Can start an active visit"),
            ("record_visit", "Can record the clinical session of own visits"),
            ("complete_visit", "Can complete own visits"),
        ]

    def __str__(self) -> str:
        return f"Visit #{self.pk} — {self.patient} ({self.get_status_display()})"

    @property
    def is_active(self) -> bool:
        return self.status == VisitStatus.ACTIVE

    def has_outcome(self) -> bool:
        return bool(
            self.notes.strip()
            or self.diagnosis.strip()
            or self.treatment.strip()
            or self.procedures.exists()
        )


class VisitProcedure(models.Model):
    """Tooth/procedure information recorded on a visit (VISIT-003, DX-001)."""

    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name="procedures")
    procedure = models.ForeignKey(
        "catalog.Procedure", on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    tooth = models.CharField(max_length=2, blank=True, validators=[validate_tooth])
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(procedure__isnull=False) | ~Q(notes=""),
                name="procedure_or_notes_required",
            ),
        ]

    def __str__(self) -> str:
        label = self.procedure.name if self.procedure else self.notes[:40]
        return f"{label} (tooth {self.tooth})" if self.tooth else label


class VisitMedication(models.Model):
    """Medication prescribed during a visit (VISIT-005, MED-002)."""

    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name="medications")
    medication = models.ForeignKey("catalog.Medication", on_delete=models.PROTECT, related_name="+")
    quantity = models.CharField(max_length=100)
    duration = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return f"{self.medication} — {self.quantity}, {self.duration}"
