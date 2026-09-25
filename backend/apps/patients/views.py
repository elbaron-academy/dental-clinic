from django.db.models import Prefetch
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import User
from apps.core.permissions import ActionPermission, IsClinicMember
from apps.core.scoping import scoped_appointments, scoped_patients
from apps.payments.balance import patient_balance
from apps.payments.serializers import BalanceSerializer

from .models import Patient
from .serializers import PatientSerializer


@extend_schema_view(
    list=extend_schema(
        parameters=[
            OpenApiParameter("search", str, description="Matches name or phone."),
            OpenApiParameter("doctor", int, description="Only patients of this doctor."),
        ]
    )
)
class PatientViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Patient registration and records, scoped to clinic and permitted doctors."""

    serializer_class = PatientSerializer
    permission_classes = [IsClinicMember, ActionPermission]
    search_fields = ["full_name", "phone", "guardian_phone"]
    ordering_fields = ["full_name", "created_at"]
    ordering = ["full_name"]
    action_permissions = {
        "list": ("patients.view_patient",),
        "retrieve": ("patients.view_patient",),
        "create": ("patients.add_patient",),
        "update": ("patients.change_patient",),
        "partial_update": ("patients.change_patient",),
        "balance": ("patients.view_patient", "payments.view_payment"),
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # OpenAPI generation
            return Patient.objects.none()
        queryset = scoped_patients(self.request.user).prefetch_related(
            Prefetch("doctors", queryset=User.objects.order_by("full_name"))
        )
        doctor = self.request.query_params.get("doctor")
        if doctor and doctor.isdigit():
            queryset = queryset.filter(doctors__id=doctor)
        return queryset

    @extend_schema(responses=BalanceSerializer)
    @action(detail=True, methods=["get"])
    def balance(self, request, pk=None):
        """Amount due, paid and remaining over the patient's appointments (PAY-003, PAY-007)."""
        patient = self.get_object()
        appointments = scoped_appointments(request.user).filter(patient=patient)
        return Response(BalanceSerializer(patient_balance(appointments)).data)
