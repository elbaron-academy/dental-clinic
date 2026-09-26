"""Clinical catalog managed in Django Admin (DX-001, DX-002, MED-001, CHART-001).

Items without a clinic are available to every clinic. Items are deactivated
rather than deleted so that visit history keeps its references.
"""

from django.core.validators import RegexValidator
from django.db import models
from django.db.models import Q

validate_hex_color = RegexValidator(
    r"^#[0-9A-Fa-f]{6}$", "Use a hex color such as #2563EB.", code="invalid_color"
)


class CatalogQuerySet(models.QuerySet):
    def available_to(self, clinic_id):
        return self.filter(is_active=True).filter(Q(clinic__isnull=True) | Q(clinic_id=clinic_id))


class CatalogItem(models.Model):
    clinic = models.ForeignKey(
        "clinics.Clinic",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="+",
        help_text="Leave empty to make the item available to all clinics.",
    )
    name = models.CharField(max_length=150)
    is_active = models.BooleanField(
        default=True, help_text="Inactive items stay in history but cannot be selected."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CatalogQuerySet.as_manager()

    class Meta:
        abstract = True
        ordering = ["name", "id"]

    def __str__(self) -> str:
        return self.name


class Procedure(CatalogItem):
    """A dental procedure/treatment the doctor can record on a visit."""

    code = models.CharField(max_length=20, blank=True, help_text="Optional internal or ADA code.")

    class Meta(CatalogItem.Meta):
        pass


class Medication(CatalogItem):
    """A medication the doctor can prescribe during a visit."""

    details = models.CharField(
        max_length=200, blank=True, help_text="Optional strength/form, e.g. 500 mg capsule."
    )

    class Meta(CatalogItem.Meta):
        pass


class DentalActionType(CatalogItem):
    """An action the doctor can mark on a tooth in the dental chart (CHART-001, CR-023).

    The color paints the tooth on the chart and appears in the chart legend.
    """

    code = models.CharField(max_length=20, blank=True, help_text="Optional internal or ADA code.")
    color = models.CharField(
        max_length=7,
        default="#2563EB",
        validators=[validate_hex_color],
        help_text="Tooth color on the dental chart, e.g. #2563EB.",
    )

    class Meta(CatalogItem.Meta):
        verbose_name = "dental action type"
