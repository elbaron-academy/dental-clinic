from django.utils import timezone
from rest_framework import serializers

from apps.accounts.serializers import DoctorSummarySerializer
from apps.appointments.models import Appointment
from apps.catalog.models import DentalActionType, Medication, Procedure
from apps.catalog.serializers import (
    AvailableCatalogField,
    DentalActionTypeSerializer,
    MedicationSerializer,
    ProcedureSerializer,
)
from apps.patients.serializers import PatientSummarySerializer

from .models import Visit, VisitMedication, VisitProcedure, VisitToothAction


class VisitProcedureSerializer(serializers.ModelSerializer):
    procedure = ProcedureSerializer(read_only=True)
    procedure_id = AvailableCatalogField(
        Procedure,
        source="procedure",
        write_only=True,
        required=False,
        allow_null=True,
        help_text="Catalog procedure, where applicable (DX-001).",
    )

    class Meta:
        model = VisitProcedure
        fields = ["id", "procedure", "procedure_id", "tooth", "notes"]

    def validate(self, attrs):
        if not attrs.get("procedure") and not attrs.get("notes", "").strip():
            raise serializers.ValidationError(
                {"procedure_id": ["Select a procedure or describe it in the notes."]}
            )
        return attrs


class VisitToothActionSerializer(serializers.ModelSerializer):
    """One action on one tooth of the visit's dental chart (CHART-002)."""

    action_type = DentalActionTypeSerializer(read_only=True)
    action_type_id = AvailableCatalogField(
        DentalActionType,
        source="action_type",
        write_only=True,
        help_text="Active dental action type available to the clinic (CHART-001).",
    )

    class Meta:
        model = VisitToothAction
        fields = ["id", "tooth", "action_type", "action_type_id", "notes"]
        extra_kwargs = {"tooth": {"help_text": "FDI notation: 11-48 permanent, 51-85 primary."}}

    def validate(self, attrs):
        visit = self.context.get("visit")
        duplicate = (
            visit is not None
            and visit.tooth_actions.filter(
                tooth=attrs["tooth"], action_type=attrs["action_type"]
            ).exists()
        )
        if duplicate:
            raise serializers.ValidationError(
                {"action_type_id": [f"Tooth {attrs['tooth']} already has this action."]}
            )
        return attrs


class VisitMedicationSerializer(serializers.ModelSerializer):
    medication = MedicationSerializer(read_only=True)
    medication_id = AvailableCatalogField(Medication, source="medication", write_only=True)

    class Meta:
        model = VisitMedication
        fields = ["id", "medication", "medication_id", "quantity", "duration"]


class FollowUpSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Appointment
        fields = ["id", "scheduled_at", "notes", "status", "status_display"]
        read_only_fields = ["status"]

    def validate_scheduled_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("A follow-up must be scheduled in the future.")
        return value


class VisitSerializer(serializers.ModelSerializer):
    patient = PatientSummarySerializer(read_only=True)
    doctor = DoctorSummarySerializer(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    procedures = VisitProcedureSerializer(many=True, read_only=True)
    tooth_actions = VisitToothActionSerializer(many=True, read_only=True)
    medications = VisitMedicationSerializer(many=True, read_only=True)
    follow_ups = FollowUpSerializer(many=True, read_only=True)
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = Visit
        fields = [
            "id",
            "status",
            "status_display",
            "patient",
            "doctor",
            "appointment",
            "started_at",
            "completed_at",
            "notes",
            "diagnosis",
            "treatment",
            "procedures",
            "tooth_actions",
            "medications",
            "follow_ups",
            "can_edit",
        ]
        read_only_fields = ["status", "appointment", "started_at", "completed_at"]

    def get_can_edit(self, obj) -> bool:
        request = self.context.get("request")
        return bool(
            request
            and obj.is_active
            and obj.doctor_id == request.user.pk
            and request.user.has_perm("visits.record_visit")
        )
