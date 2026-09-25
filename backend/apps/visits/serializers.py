from django.utils import timezone
from rest_framework import serializers

from apps.accounts.serializers import DoctorSummarySerializer
from apps.appointments.models import Appointment
from apps.catalog.models import Medication, Procedure
from apps.catalog.serializers import (
    AvailableCatalogField,
    MedicationSerializer,
    ProcedureSerializer,
)
from apps.patients.serializers import PatientSummarySerializer

from .models import Visit, VisitMedication, VisitProcedure


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
