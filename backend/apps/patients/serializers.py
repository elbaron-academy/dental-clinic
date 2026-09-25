from rest_framework import serializers

from apps.accounts.serializers import DoctorSummarySerializer
from apps.core.serializers import PermittedDoctorField, PhoneField, select_doctor

from .models import Patient


class PatientSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = ["id", "full_name", "phone", "is_minor"]


class PatientSerializer(serializers.ModelSerializer):
    phone = PhoneField()
    guardian_phone = PhoneField(required=False, allow_blank=True)
    doctors = DoctorSummarySerializer(many=True, read_only=True)
    doctor_ids = PermittedDoctorField(
        many=True,
        write_only=True,
        required=False,
        help_text=(
            "Doctors to associate with the patient. Optional when the user has "
            "exactly one permitted doctor (it is selected automatically). On "
            "update, doctors are added and never removed."
        ),
    )

    class Meta:
        model = Patient
        fields = [
            "id",
            "full_name",
            "phone",
            "address",
            "is_minor",
            "guardian_name",
            "guardian_phone",
            "doctors",
            "doctor_ids",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs):
        instance = self.instance
        is_minor = attrs.get("is_minor", instance.is_minor if instance else False)
        if is_minor:
            errors = {}
            guardian_name = attrs.get("guardian_name", instance.guardian_name if instance else "")
            guardian_phone = attrs.get(
                "guardian_phone", instance.guardian_phone if instance else ""
            )
            if not (guardian_name or "").strip():
                errors["guardian_name"] = ["Guardian name is required for a minor."]
            if not guardian_phone:
                errors["guardian_phone"] = ["Guardian phone is required for a minor."]
            if errors:
                raise serializers.ValidationError(errors)
        else:
            attrs["guardian_name"] = ""
            attrs["guardian_phone"] = ""

        if instance is None:
            chosen = attrs.get("doctor_ids") or []
            if not chosen:
                attrs["doctor_ids"] = [
                    select_doctor(self.context["request"].user, None, "doctor_ids")
                ]
        return attrs

    def create(self, validated_data):
        doctors = validated_data.pop("doctor_ids")
        user = self.context["request"].user
        patient = Patient.objects.create(clinic=user.clinic, created_by=user, **validated_data)
        patient.doctors.set(doctors)
        return patient

    def update(self, instance, validated_data):
        doctors = validated_data.pop("doctor_ids", [])
        instance = super().update(instance, validated_data)
        if doctors:
            instance.doctors.add(*doctors)
        return instance
