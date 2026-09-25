from django.contrib.auth import authenticate
from rest_framework import serializers, status
from rest_framework.exceptions import APIException

from apps.clinics.models import Clinic

from .models import Role, User


class LoginFailed(APIException):
    """HTTP 400 rendered as ``{"detail": ..., "code": ...}`` so clients show one message."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "login_failed"


class DoctorSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "full_name"]


class ClinicSummarySerializer(serializers.ModelSerializer):
    doctor_count = serializers.SerializerMethodField()

    class Meta:
        model = Clinic
        fields = ["id", "name", "doctor_count"]

    def get_doctor_count(self, obj: Clinic) -> int:
        return obj.active_doctors.count()


class MeSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    clinic = ClinicSummarySerializer(read_only=True)
    permissions = serializers.SerializerMethodField()
    permitted_doctors = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "phone",
            "full_name",
            "role",
            "role_display",
            "clinic",
            "permissions",
            "permitted_doctors",
        ]

    def get_permissions(self, obj: User) -> list[str]:
        return sorted(obj.get_all_permissions())

    def get_permitted_doctors(self, obj: User) -> list[dict]:
        return DoctorSummarySerializer(obj.permitted_doctors(), many=True).data


class LoginSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=32)
    password = serializers.CharField(max_length=128, trim_whitespace=False, write_only=True)
    role = serializers.ChoiceField(
        choices=Role.choices,
        required=False,
        help_text="Role of the login page. When sent, accounts of another role are refused.",
    )

    def validate(self, attrs):
        user = authenticate(
            self.context.get("request"), phone=attrs["phone"], password=attrs["password"]
        )
        if user is None:
            raise LoginFailed("Invalid phone number or password.", code="invalid_credentials")
        if not user.has_app_role or not user.clinic_id or not user.clinic.is_active:
            raise LoginFailed(
                "This account is not linked to an active clinic.", code="no_clinic_access"
            )
        expected_role = attrs.get("role")
        if expected_role and expected_role != user.role:
            raise LoginFailed(
                f"This is a {user.get_role_display()} account. "
                f"Please use the {user.get_role_display()} login page.",
                code="role_mismatch",
            )
        attrs["user"] = user
        return attrs


class LoginResponseSerializer(serializers.Serializer):
    token = serializers.CharField()
    user = MeSerializer()
