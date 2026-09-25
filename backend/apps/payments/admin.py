from django.contrib import admin

from .models import Payment, PaymentMethod


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "is_active", "sort_order")
    list_editable = ("is_active", "sort_order")
    prepopulated_fields = {"code": ("name",)}


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("received_at", "appointment", "amount", "method", "received_by", "clinic")
    list_filter = ("method", "clinic")
    search_fields = ("appointment__patient__full_name", "appointment__patient__phone", "note")
    date_hierarchy = "received_at"
    raw_id_fields = ("appointment", "received_by")
