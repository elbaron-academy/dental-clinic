from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.response import Response

from apps.core.permissions import ActionPermission, IsClinicMember
from apps.core.scoping import scoped_appointments

from . import services
from .models import Payment, PaymentMethod
from .serializers import PaymentMethodSerializer, PaymentSerializer


class PaymentMethodViewSet(viewsets.ReadOnlyModelViewSet):
    """Active payment methods configured in Django Admin (PAY-005)."""

    serializer_class = PaymentMethodSerializer
    permission_classes = [IsClinicMember]
    pagination_class = None
    queryset = PaymentMethod.objects.filter(is_active=True)


@extend_schema_view(
    list=extend_schema(
        parameters=[OpenApiParameter("appointment", int), OpenApiParameter("patient", int)]
    )
)
class PaymentViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Payments received, before or after the session (PAY-002, PAY-004)."""

    serializer_class = PaymentSerializer
    permission_classes = [IsClinicMember, ActionPermission]
    ordering = ["received_at", "id"]
    action_permissions = {
        "list": ("payments.view_payment",),
        "retrieve": ("payments.view_payment",),
        "create": ("payments.add_payment",),
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # OpenAPI generation
            return Payment.objects.none()
        appointments = scoped_appointments(self.request.user)
        queryset = Payment.objects.filter(appointment__in=appointments).select_related(
            "method", "received_by"
        )
        params = self.request.query_params
        if params.get("appointment", "").isdigit():
            queryset = queryset.filter(appointment_id=int(params["appointment"]))
        if params.get("patient", "").isdigit():
            queryset = queryset.filter(appointment__patient_id=int(params["patient"]))
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        payment = services.record_payment(
            data["appointment"],
            request.user,
            amount=data["amount"],
            method=data["method"],
            note=data.get("note", ""),
        )
        return Response(self.get_serializer(payment).data, status=status.HTTP_201_CREATED)
