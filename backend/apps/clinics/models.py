from django.db import models


class Clinic(models.Model):
    """A dental clinic. It may have one or several doctors (CLINIC-001)."""

    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

    @property
    def active_doctors(self):
        from apps.accounts.models import Role

        return self.members.filter(role=Role.DOCTOR, is_active=True)

    @property
    def is_single_doctor(self) -> bool:
        return self.active_doctors.count() == 1
