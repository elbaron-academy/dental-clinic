from django.contrib import admin
from django.utils.html import format_html

from .models import DentalActionType, Medication, Procedure


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


@admin.register(DentalActionType)
class DentalActionTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "swatch", "color", "clinic", "is_active")
    list_filter = ("is_active", "clinic")
    search_fields = ("name", "code")
    list_editable = ("is_active",)

    @admin.display(description="Chart color")
    def swatch(self, obj):
        return format_html(
            '<span style="display:inline-block;width:1.5em;height:1em;border-radius:3px;'
            'background:{}"></span>',
            obj.color,
        )
