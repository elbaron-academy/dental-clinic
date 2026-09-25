"""Routes for the clinic API. Each app registers its viewsets here."""

from rest_framework.routers import DefaultRouter

from apps.appointments.views import AppointmentViewSet
from apps.catalog.views import MedicationViewSet, ProcedureViewSet
from apps.patients.views import PatientViewSet
from apps.payments.views import PaymentMethodViewSet, PaymentViewSet
from apps.visits.views import VisitViewSet

router = DefaultRouter(trailing_slash=True)
router.include_root_view = False
router.register("patients", PatientViewSet, basename="patient")
router.register("appointments", AppointmentViewSet, basename="appointment")
router.register("visits", VisitViewSet, basename="visit")
router.register("catalog/procedures", ProcedureViewSet, basename="procedure")
router.register("catalog/medications", MedicationViewSet, basename="medication")
router.register("payments", PaymentViewSet, basename="payment")
router.register("payment-methods", PaymentMethodViewSet, basename="payment-method")

urlpatterns = router.urls
