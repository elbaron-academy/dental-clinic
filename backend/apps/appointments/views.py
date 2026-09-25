from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import ActionPermission, IsClinicMember
from apps.core.scoping import scoped_appointments
from apps.payments import billing
from apps.payments import services as payment_services
from apps.payments.serializers import AmountDueSerializer
from apps.visits import services as visit_services

from . import services
from .filters import filter_appointments
from .models import Appointment, AppointmentStatus
from .serializers import AppointmentSerializer, QueueSerializer

LIST_PARAMETERS = [
    OpenApiParameter("status", str, description="Comma-separated statuses."),
    OpenApiParameter("doctor", int),
    OpenApiParameter("patient", int),
    OpenApiParameter("date", str, description="YYYY-MM-DD in the server time zone."),
    OpenApiParameter("scheduled_from", str, description="ISO date-time, inclusive."),
    OpenApiParameter("scheduled_to", str, description="ISO date-time, exclusive."),
    OpenApiParameter("search", str, description="Patient name or phone."),
]


@extend_schema_view(list=extend_schema(parameters=LIST_PARAMETERS))
class AppointmentViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Appointments, check-in, queue and visit start (APPT-001..006)."""

    serializer_class = AppointmentSerializer
    permission_classes = [IsClinicMember, ActionPermission]
    search_fields = ["patient__full_name", "patient__phone"]
    ordering_fields = ["scheduled_at", "checked_in_at", "created_at"]
    ordering = ["scheduled_at", "id"]
    action_permissions = {
        "list": ("appointments.view_appointment",),
        "retrieve": ("appointments.view_appointment",),
        "queue": ("appointments.view_appointment",),
        "create": ("appointments.add_appointment",),
        "update": ("appointments.change_appointment",),
        "partial_update": ("appointments.change_appointment",),
        "check_in": ("appointments.check_in_appointment",),
        "cancel": ("appointments.cancel_appointment",),
        "start_visit": ("visits.start_visit",),
        "amount_due": ("payments.manage_billing",),
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # OpenAPI generation
            return Appointment.objects.none()
        queryset = billing.with_amount_paid(
            scoped_appointments(self.request.user).select_related("patient", "doctor", "visit")
        )
        if self.action == "list":
            queryset = filter_appointments(queryset, self.request.query_params)
        return queryset

    def _respond(self, appointment, status_code=status.HTTP_200_OK):
        appointment = self.get_queryset().get(pk=appointment.pk)
        return Response(self.get_serializer(appointment).data, status=status_code)

    @extend_schema(request=None, responses=AppointmentSerializer)
    @action(detail=True, methods=["post"], url_path="check-in")
    def check_in(self, request, pk=None):
        """Mark the patient as arrived; they now wait for the doctor (APPT-002)."""
        return self._respond(services.check_in(self.get_object(), request.user))

    @extend_schema(request=None, responses=AppointmentSerializer)
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._respond(services.cancel(self.get_object(), request.user))

    @extend_schema(request=None, responses={201: AppointmentSerializer})
    @action(detail=True, methods=["post"], url_path="start-visit")
    def start_visit(self, request, pk=None):
        """Start the active visit. Fails with 409 if the patient is already in one (APPT-005)."""
        visit = visit_services.start_visit(self.get_object(), request.user)
        return self._respond(visit.appointment, status.HTTP_201_CREATED)

    @extend_schema(request=AmountDueSerializer, responses=AppointmentSerializer)
    @action(detail=True, methods=["post"], url_path="amount-due")
    def amount_due(self, request, pk=None):
        """Record the amount due; allowed before or after the session (PAY-001, PAY-004)."""
        serializer = AmountDueSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appointment = payment_services.set_amount_due(
            self.get_object(), serializer.validated_data["amount_due"]
        )
        return self._respond(appointment)

    @extend_schema(
        parameters=[OpenApiParameter("doctor", int, description="Limit to one doctor.")],
        responses=QueueSerializer,
    )
    @action(detail=False, methods=["get"])
    def queue(self, request):
        """Patients waiting for each doctor and the visits in progress (APPT-003)."""
        queryset = self.get_queryset()
        doctor = request.query_params.get("doctor")
        if doctor and doctor.isdigit():
            queryset = queryset.filter(doctor_id=int(doctor))
        waiting = queryset.filter(status=AppointmentStatus.CHECKED_IN).order_by(
            "checked_in_at", "id"
        )
        in_visit = queryset.filter(status=AppointmentStatus.IN_VISIT).order_by(
            "visit__started_at", "id"
        )
        context = self.get_serializer_context()
        return Response(
            {
                "waiting": AppointmentSerializer(waiting, many=True, context=context).data,
                "in_visit": AppointmentSerializer(in_visit, many=True, context=context).data,
            }
        )
