from django.contrib import admin

from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("scheduled_at", "patient", "doctor", "status", "clinic")
    list_filter = ("status", "clinic", "doctor")
    search_fields = ("patient__full_name", "patient__phone")
    date_hierarchy = "scheduled_at"
    raw_id_fields = ("patient", "doctor", "follow_up_of")
    readonly_fields = (
        "checked_in_at",
        "checked_in_by",
        "cancelled_at",
        "cancelled_by",
        "created_by",
        "created_at",
        "updated_at",
    )
