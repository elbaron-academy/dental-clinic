from rest_framework import viewsets

from apps.core.permissions import IsClinicMember

from .models import Medication, Procedure
from .serializers import MedicationSerializer, ProcedureSerializer


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
