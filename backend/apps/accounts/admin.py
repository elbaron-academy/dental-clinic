from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.forms import BaseUserCreationForm
from django.contrib.auth.forms import UserChangeForm as DjangoUserChangeForm
from django.core.exceptions import ValidationError

from apps.core.phone import normalize_phone

from .models import Role, User


class ClinicRoleFormMixin:
    """Validation shared by the add and change forms (CLINIC-001, CR-001)."""

    def clean_phone(self):
        return normalize_phone(self.cleaned_data.get("phone"))

    def clean(self):
        cleaned = super().clean()
        role = cleaned.get("role")
        clinic = cleaned.get("clinic")
        doctors = cleaned.get("assigned_doctors")
        if role and not clinic:
            self.add_error("clinic", "Clinic staff must belong to a clinic.")
        if doctors:
            if role not in (Role.ASSISTANT, Role.RECEPTIONIST):
                self.add_error(
                    "assigned_doctors",
                    "Only assistants and receptionists are assigned to doctors.",
                )
            elif clinic:
                foreign = [d.full_name for d in doctors if d.clinic_id != clinic.pk]
                if foreign:
                    self.add_error(
                        "assigned_doctors",
                        ValidationError(
                            "These doctors belong to another clinic: %(names)s",
                            params={"names": ", ".join(foreign)},
                        ),
                    )
        return cleaned


class UserCreationForm(ClinicRoleFormMixin, BaseUserCreationForm):
    class Meta:
        model = User
        fields = ("phone", "full_name", "clinic", "role", "assigned_doctors")


class UserChangeForm(ClinicRoleFormMixin, DjangoUserChangeForm):
    class Meta:
        model = User
        fields = "__all__"


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    list_display = ("full_name", "phone", "role", "clinic", "is_active", "is_staff")
    list_filter = ("role", "clinic", "is_active", "is_staff")
    search_fields = ("full_name", "phone")
    ordering = ("full_name",)
    filter_horizontal = ("assigned_doctors", "groups", "user_permissions")
    fieldsets = (
        (None, {"fields": ("phone", "password")}),
        ("Profile", {"fields": ("full_name",)}),
        ("Clinic role", {"fields": ("clinic", "role", "assigned_doctors")}),
        (
            "Extra permissions",
            {
                "classes": ("collapse",),
                "description": (
                    "The role already grants its default permissions. "
                    "Use these fields only to grant additional access."
                ),
                "fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions"),
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "phone",
                    "full_name",
                    "clinic",
                    "role",
                    "assigned_doctors",
                    "password1",
                    "password2",
                ),
            },
        ),
    )
