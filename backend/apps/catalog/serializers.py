from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Medication, Procedure


class ProcedureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Procedure
        fields = ["id", "name", "code"]


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
