from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from apps.core.phone import normalize_phone, validate_phone


class Patient(models.Model):
    """A registered patient of a clinic (PATIENT-001..004).

    ``doctors`` links the patient to the doctors whose context they belong
    to; it drives who may see the record (ROLE-004).
    """

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="patients")
    doctors = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="patients",
        limit_choices_to={"role": "DOCTOR"},
        help_text="Doctors whose team may access this patient.",
    )
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=16, validators=[validate_phone], db_index=True)
    address = models.TextField(blank=True)
    is_minor = models.BooleanField("patient is a minor", default=False)
    guardian_name = models.CharField(max_length=150, blank=True)
    guardian_phone = models.CharField(max_length=16, blank=True, validators=[validate_phone])
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name", "id"]
        indexes = [models.Index(fields=["clinic", "full_name"])]
        constraints = [
            models.CheckConstraint(
                condition=Q(is_minor=False) | (~Q(guardian_name="") & ~Q(guardian_phone="")),
                name="minor_requires_guardian",
            ),
        ]

    def __str__(self) -> str:
        return self.full_name

    def save(self, *args, **kwargs):
        self.phone = normalize_phone(self.phone)
        self.guardian_phone = normalize_phone(self.guardian_phone)
        super().save(*args, **kwargs)

    def clean(self):
        super().clean()
        errors = {}
        if self.is_minor:
            if not self.guardian_name.strip():
                errors["guardian_name"] = "Guardian name is required for a minor."
            if not self.guardian_phone.strip():
                errors["guardian_phone"] = "Guardian phone is required for a minor."
        if errors:
            raise ValidationError(errors)
