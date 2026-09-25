from django.contrib import admin

from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("full_name", "phone", "clinic", "is_minor", "created_at")
    list_filter = ("clinic", "is_minor")
    search_fields = ("full_name", "phone", "guardian_phone")
    filter_horizontal = ("doctors",)
    readonly_fields = ("created_by", "created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("clinic", "doctors", "full_name", "phone", "address")}),
        ("Minor", {"fields": ("is_minor", "guardian_name", "guardian_phone")}),
        ("Audit", {"fields": ("created_by", "created_at", "updated_at")}),
    )
