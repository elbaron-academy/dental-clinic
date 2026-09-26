from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import DentalActionType, Medication, Procedure


class ProcedureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Procedure
        fields = ["id", "name", "code"]


class DentalActionTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DentalActionType
        fields = ["id", "name", "code", "color"]

    def validate_name(self, value):
        """A doctor-created action must not duplicate one the clinic already has (CR-024)."""
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Enter a name.")
        request = self.context.get("request")
        clinic_id = request.user.clinic_id if request else None
        if DentalActionType.objects.available_to(clinic_id).filter(name__iexact=name).exists():
            raise serializers.ValidationError("An action with this name already exists.")
        return name

    def validate_color(self, value):
        return value.upper()


class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = ["id", "name", "details"]


@extend_schema_field(OpenApiTypes.INT)
class AvailableCatalogField(serializers.PrimaryKeyRelatedField):
    """Primary key of an active catalog item available to the user's clinic."""

    default_error_messages = {
        "does_not_exist": "Item {pk_value} is not available in your clinic's catalog.",
    }

    def __init__(self, model, **kwargs):
        self.model = model
        super().__init__(**kwargs)

    def get_queryset(self):
        request = self.context.get("request")
        if request is None:
            return self.model.objects.none()
        return self.model.objects.available_to(request.user.clinic_id)
