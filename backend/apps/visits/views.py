from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.appointments.models import Appointment
from apps.core.permissions import ActionPermission, IsClinicMember
from apps.core.scoping import scoped_visits

from . import services
from .models import Visit, VisitStatus
from .serializers import (
    FollowUpSerializer,
    VisitMedicationSerializer,
    VisitProcedureSerializer,
    VisitSerializer,
)


@extend_schema_view(
    list=extend_schema(
        parameters=[
            OpenApiParameter("patient", int, description="Visit history of one patient."),
            OpenApiParameter("doctor", int),
            OpenApiParameter("status", str, enum=VisitStatus.values),
        ]
    )
)
class VisitViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Clinical visits: recording, completion and patient history (VISIT-001..008)."""

    serializer_class = VisitSerializer
    permission_classes = [IsClinicMember, ActionPermission]
    ordering = ["-started_at", "-id"]
    action_permissions = {
        "list": ("visits.view_visit",),
        "retrieve": ("visits.view_visit",),
        "update": ("visits.record_visit",),
        "partial_update": ("visits.record_visit",),
        "add_procedure": ("visits.record_visit",),
        "remove_procedure": ("visits.record_visit",),
        "add_medication": ("visits.record_visit",),
        "remove_medication": ("visits.record_visit",),
        "add_follow_up": ("visits.record_visit",),
        "complete": ("visits.complete_visit",),
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # OpenAPI generation
            return Visit.objects.none()
        queryset = scoped_visits(self.request.user).select_related("patient", "doctor")
        queryset = queryset.prefetch_related(
            "procedures__procedure",
            "medications__medication",
            Prefetch("follow_ups", queryset=Appointment.objects.order_by("scheduled_at")),
        )
        params = self.request.query_params
        if self.action == "list":
            for name in ("patient", "doctor"):
                if params.get(name, "").isdigit():
                    queryset = queryset.filter(**{f"{name}_id": int(params[name])})
            if params.get("status") in VisitStatus.values:
                queryset = queryset.filter(status=params["status"])
        return queryset

    def _visit_response(self, visit, status_code=status.HTTP_200_OK):
        visit = self.get_queryset().get(pk=visit.pk)
        return Response(self.get_serializer(visit).data, status=status_code)

    def perform_update(self, serializer):
        services.ensure_recordable(serializer.instance, self.request.user)
        serializer.save()

    def _add_entry(self, request, serializer_class):
        visit = self.get_object()
        services.ensure_recordable(visit, request.user)
        serializer = serializer_class(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        serializer.save(visit=visit)
        return self._visit_response(visit, status.HTTP_201_CREATED)

    def _remove_entry(self, request, related_name, entry_id):
        visit = self.get_object()
        services.ensure_recordable(visit, request.user)
        get_object_or_404(getattr(visit, related_name), pk=entry_id).delete()
        return self._visit_response(visit)

    @extend_schema(request=VisitProcedureSerializer, responses={201: VisitSerializer})
    @action(detail=True, methods=["post"], url_path="procedures")
    def add_procedure(self, request, pk=None):
        """Record tooth/procedure information (VISIT-003)."""
        return self._add_entry(request, VisitProcedureSerializer)

    @extend_schema(request=None, responses=VisitSerializer)
    @action(detail=True, methods=["delete"], url_path=r"procedures/(?P<entry_id>[0-9]+)")
    def remove_procedure(self, request, pk=None, entry_id=None):
        return self._remove_entry(request, "procedures", entry_id)

    @extend_schema(request=VisitMedicationSerializer, responses={201: VisitSerializer})
    @action(detail=True, methods=["post"], url_path="medications")
    def add_medication(self, request, pk=None):
        """Prescribe a catalog medication with quantity and duration (MED-002)."""
        return self._add_entry(request, VisitMedicationSerializer)

    @extend_schema(request=None, responses=VisitSerializer)
    @action(detail=True, methods=["delete"], url_path=r"medications/(?P<entry_id>[0-9]+)")
    def remove_medication(self, request, pk=None, entry_id=None):
        return self._remove_entry(request, "medications", entry_id)

    @extend_schema(request=FollowUpSerializer, responses={201: VisitSerializer})
    @action(detail=True, methods=["post"], url_path="follow-ups")
    def add_follow_up(self, request, pk=None):
        """Book a follow-up appointment with the same doctor (VISIT-006)."""
        visit = self.get_object()
        services.ensure_recordable(visit, request.user)
        serializer = FollowUpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.add_follow_up(visit, request.user, **serializer.validated_data)
        return self._visit_response(visit, status.HTTP_201_CREATED)

    @extend_schema(request=None, responses=VisitSerializer)
    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Complete the visit; it stays in the patient's history (VISIT-007/008)."""
        visit = services.complete_visit(self.get_object(), request.user)
        return self._visit_response(visit)
