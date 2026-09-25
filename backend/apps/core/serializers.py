from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.core.phone import normalize_phone, validate_phone


class PhoneField(serializers.CharField):
    """Accepts formatted phone numbers and stores the normalised form (CR-006)."""

    def __init__(self, **kwargs):
        kwargs.setdefault("max_length", 32)
        super().__init__(**kwargs)
        self.validators.append(validate_phone)

    def to_internal_value(self, data):
        return normalize_phone(super().to_internal_value(data))


def select_doctor(user, doctor, field_name: str = "doctor_id"):
    """Resolve the doctor for a workflow step (CLINIC-002 / CLINIC-003).

    ``doctor`` is the (already permission-checked) doctor chosen by the user,
    or ``None``. With exactly one permitted doctor it is chosen automatically.
    """
    if doctor is not None:
        return doctor
    doctors = list(user.permitted_doctors()[:2])
    if len(doctors) == 1:
        return doctors[0]
    if not doctors:
        raise serializers.ValidationError(
            {field_name: ["You are not assigned to any doctor. Ask an administrator."]}
        )
    raise serializers.ValidationError({field_name: ["Select a doctor."]})


@extend_schema_field(OpenApiTypes.INT)
class PermittedDoctorField(serializers.PrimaryKeyRelatedField):
    """A doctor id restricted to the requesting user's permitted doctors."""

    default_error_messages = {
        "does_not_exist": "Doctor {pk_value} is not one of your permitted doctors.",
    }

    def get_queryset(self):
        request = self.context.get("request")
        if request is None:
            from apps.accounts.models import User

            return User.objects.none()
        return request.user.permitted_doctors()
