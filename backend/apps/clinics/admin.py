from django.contrib import admin

from apps.accounts.models import Role

from .models import Clinic


@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "doctor_count", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "phone")

    @admin.display(description="Doctors")
    def doctor_count(self, obj: Clinic) -> int:
        return obj.members.filter(role=Role.DOCTOR, is_active=True).count()
