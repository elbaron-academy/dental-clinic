from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView

from apps.core.views import HealthView

admin.site.site_header = "Dental Clinic administration"
admin.site.site_title = "Dental Clinic admin"
admin.site.index_title = "Clinic setup and configuration"

api_patterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularRedocView.as_view(url_name="schema"), name="api-docs"),
    path("", include("apps.accounts.urls")),
    path("", include("apps.core.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api_patterns)),
]
