from django.core.exceptions import ObjectDoesNotExist
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.accounts.serializers import DoctorSummarySerializer
from apps.core.exceptions import BusinessRuleViolation
from apps.core.scoping import scoped_patients
from apps.core.serializers import PermittedDoctorField, select_doctor
from apps.patients.serializers import PatientSummarySerializer
from apps.payments import billing
from apps.payments.serializers import BillingSerializer

from .models import Appointment


@extend_schema_field(OpenApiTypes.INT)
class ScopedPatientField(serializers.PrimaryKeyRelatedField):
    default_error_messages = {"does_not_exist": "Patient {pk_value} was not found."}

    def get_queryset(self):
        return scoped_patients(self.context["request"].user)


class AppointmentSerializer(serializers.ModelSerializer):
    patient = PatientSummarySerializer(read_only=True)
    patient_id = ScopedPatientField(write_only=True)
    doctor = DoctorSummarySerializer(read_only=True)
    doctor_id = PermittedDoctorField(
        write_only=True,
        required=False,
        help_text="Optional when the user has exactly one permitted doctor.",
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    visit_id = serializers.SerializerMethodField()
    billing = serializers.SerializerMethodField(
        help_text="Present only for users with the payments.view_payment permission."
    )

    class Meta:
        model = Appointment
        fields = [
            "id",
            "patient",
            "patient_id",
            "doctor",
            "doctor_id",
            "scheduled_at",
            "status",
            "status_display",
            "notes",
            "follow_up_of",
            "visit_id",
            "billing",
            "checked_in_at",
            "cancelled_at",
            "created_at",
        ]
        read_only_fields = ["status", "follow_up_of", "checked_in_at", "cancelled_at", "created_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance is not None and not isinstance(self.instance, list | tuple):
            # The patient of an existing appointment never changes.
            self.fields["patient_id"].read_only = True

    def get_visit_id(self, obj) -> int | None:
        try:
            return obj.visit.pk
        except ObjectDoesNotExist:
            return None

    @extend_schema_field(BillingSerializer(allow_null=True))
    def get_billing(self, obj) -> dict | None:
        request = self.context.get("request")
        if request is None or not request.user.has_perm("payments.view_payment"):
            return None
        return BillingSerializer(billing.summary(obj)).data

    def validate(self, attrs):
        user = self.context["request"].user
        if self.instance is None:
            attrs["doctor_id"] = select_doctor(user, attrs.get("doctor_id"))
        elif not self.instance.is_open:
            raise BusinessRuleViolation(
                "Only scheduled or waiting appointments can be changed.", code="invalid_status"
            )
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        patient = validated_data.pop("patient_id")
        doctor = validated_data.pop("doctor_id")
        appointment = Appointment.objects.create(
            clinic=user.clinic, patient=patient, doctor=doctor, created_by=user, **validated_data
        )
        patient.doctors.add(doctor)  # The patient now belongs to this doctor's context.
        return appointment

    def update(self, instance, validated_data):
        doctor = validated_data.pop("doctor_id", None)
        if doctor is not None:
            instance.doctor = doctor
            instance.patient.doctors.add(doctor)
        return super().update(instance, validated_data)


class QueueSerializer(serializers.Serializer):
    waiting = AppointmentSerializer(many=True)
    in_visit = AppointmentSerializer(many=True)
