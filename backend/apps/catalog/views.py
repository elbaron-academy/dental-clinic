from rest_framework import mixins, viewsets

from apps.core.permissions import ActionPermission, IsClinicMember

from .models import DentalActionType, Medication, Procedure
from .serializers import DentalActionTypeSerializer, MedicationSerializer, ProcedureSerializer


class ProcedureViewSet(viewsets.ReadOnlyModelViewSet):
    """Active procedures available to the user's clinic."""

    serializer_class = ProcedureSerializer
    permission_classes = [IsClinicMember]
    pagination_class = None
    search_fields = ["name", "code"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # OpenAPI generation
            return Procedure.objects.none()
        return Procedure.objects.available_to(self.request.user.clinic_id)


class MedicationViewSet(viewsets.ReadOnlyModelViewSet):
    """Active medications available to the user's clinic."""

    serializer_class = MedicationSerializer
    permission_classes = [IsClinicMember]
    pagination_class = None
    search_fields = ["name", "details"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # OpenAPI generation
            return Medication.objects.none()
        return Medication.objects.available_to(self.request.user.clinic_id)


class DentalActionTypeViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """Active dental chart actions available to the user's clinic, with colors (CHART-001).

    Doctors can add actions for their own clinic while charting (CHART-006, CR-024).
    """

    serializer_class = DentalActionTypeSerializer
    permission_classes = [IsClinicMember, ActionPermission]
    action_permissions = {
        "list": (),
        "retrieve": (),
        "create": ("catalog.add_dentalactiontype",),
    }
    pagination_class = None
    search_fields = ["name", "code"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # OpenAPI generation
            return DentalActionType.objects.none()
        return DentalActionType.objects.available_to(self.request.user.clinic_id)

    def perform_create(self, serializer):
        serializer.save(clinic_id=self.request.user.clinic_id)
