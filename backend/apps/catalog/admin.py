from django.contrib import admin

from .models import Medication, Procedure


@admin.register(Procedure)
class ProcedureAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "clinic", "is_active")
    list_filter = ("is_active", "clinic")
    search_fields = ("name", "code")
    list_editable = ("is_active",)


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ("name", "details", "clinic", "is_active")
    list_filter = ("is_active", "clinic")
    search_fields = ("name", "details")
    list_editable = ("is_active",)
