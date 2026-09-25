from decimal import Decimal

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.core.scoping import scoped_appointments

from .models import Payment, PaymentMethod, PaymentStatus


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ["id", "name", "code"]


class BillingSerializer(serializers.Serializer):
    """Billing summary of one appointment."""

    amount_due = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    amount_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    remaining_amount = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    payment_status = serializers.ChoiceField(choices=PaymentStatus.choices)
    payment_status_display = serializers.CharField()


class AmountDueSerializer(serializers.Serializer):
    amount_due = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)


class BalanceSerializer(serializers.Serializer):
    """Totals over the patient's non-cancelled appointments (PAY-003, PAY-007)."""

    amount_due = serializers.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    remaining_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    appointments_pending = serializers.IntegerField()
    appointments_not_set = serializers.IntegerField()


@extend_schema_field(OpenApiTypes.INT)
class ScopedAppointmentField(serializers.PrimaryKeyRelatedField):
    default_error_messages = {"does_not_exist": "Appointment {pk_value} was not found."}

    def get_queryset(self):
        return scoped_appointments(self.context["request"].user)


class PaymentSerializer(serializers.ModelSerializer):
    appointment_id = ScopedAppointmentField(source="appointment")
    method = PaymentMethodSerializer(read_only=True)
    method_id = serializers.PrimaryKeyRelatedField(
        source="method",
        queryset=PaymentMethod.objects.filter(is_active=True),
        write_only=True,
    )
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))
    received_by = serializers.CharField(
        source="received_by.full_name", read_only=True, default=None
    )

    class Meta:
        model = Payment
        fields = [
            "id",
            "appointment_id",
            "amount",
            "method",
            "method_id",
            "note",
            "received_by",
            "received_at",
        ]
        read_only_fields = ["received_at"]
