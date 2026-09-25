from django.contrib import admin

from .models import Visit, VisitMedication, VisitProcedure


class VisitProcedureInline(admin.TabularInline):
    model = VisitProcedure
    extra = 0


class VisitMedicationInline(admin.TabularInline):
    model = VisitMedication
    extra = 0


@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "doctor", "status", "started_at", "completed_at")
    list_filter = ("status", "clinic", "doctor")
    search_fields = ("patient__full_name", "patient__phone")
    raw_id_fields = ("patient", "doctor", "appointment", "started_by")
    readonly_fields = ("started_at", "completed_at", "updated_at")
    inlines = [VisitProcedureInline, VisitMedicationInline]
