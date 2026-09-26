from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.core.phone import normalize_phone, validate_phone


class Role(models.TextChoices):
    DOCTOR = "DOCTOR", "Doctor"
    ASSISTANT = "ASSISTANT", "Assistant"
    RECEPTIONIST = "RECEPTIONIST", "Receptionist"


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, phone, password, **extra_fields):
        if not phone:
            raise ValueError("A phone number is required.")
        user = self.model(phone=normalize_phone(phone), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, phone, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(phone, password, **extra_fields)

    def create_superuser(self, phone, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(phone, password, **extra_fields)

    def get_by_natural_key(self, phone):
        return self.get(**{self.model.USERNAME_FIELD: normalize_phone(phone)})


class User(AbstractBaseUser, PermissionsMixin):
    """Application user. Identified by phone number, never by username (AUTH-001/003)."""

    phone = models.CharField(
        "phone number",
        max_length=16,
        unique=True,
        validators=[validate_phone],
        help_text="Used to log in. Spaces and dashes are removed automatically.",
        error_messages={"unique": "A user with this phone number already exists."},
    )
    full_name = models.CharField(max_length=150)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        blank=True,
        help_text="Clinic role. Leave empty only for platform administrators.",
    )
    clinic = models.ForeignKey(
        "clinics.Clinic",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="members",
    )
    assigned_doctors = models.ManyToManyField(
        "self",
        symmetrical=False,
        blank=True,
        related_name="assigned_staff",
        limit_choices_to={"role": Role.DOCTOR},
        help_text=(
            "Assistants and receptionists only see patients, appointments and "
            "visits of the doctors assigned here."
        ),
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(
        "Django Admin access",
        default=False,
        help_text="Allows signing in to Django Admin.",
    )
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        ordering = ["full_name"]
        constraints = [
            models.CheckConstraint(
                condition=Q(role="") | Q(clinic__isnull=False),
                name="clinic_staff_requires_clinic",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.full_name} ({self.phone})"

    def clean(self):
        super().clean()
        self.phone = normalize_phone(self.phone)
        if self.role and not self.clinic_id:
            raise ValidationError({"clinic": "Clinic staff must belong to a clinic."})

    def save(self, *args, **kwargs):
        self.phone = normalize_phone(self.phone)
        super().save(*args, **kwargs)

    def get_full_name(self) -> str:
        return self.full_name

    def get_short_name(self) -> str:
        return self.full_name

    @property
    def has_app_role(self) -> bool:
        return self.role in Role.values

    @property
    def is_doctor(self) -> bool:
        return self.role == Role.DOCTOR

    def permitted_doctors(self):
        """Doctors whose patients, appointments and visits this user may access.

        A doctor is permitted only for themself. Assistants and receptionists
        are permitted for the active doctors of their clinic that are assigned
        to them (ROLE-004, CR-001).
        """
        if not self.has_app_role or not self.clinic_id or not self.is_active:
            return User.objects.none()
        doctors = User.objects.filter(clinic_id=self.clinic_id, role=Role.DOCTOR, is_active=True)
        if self.role == Role.DOCTOR:
            return doctors.filter(pk=self.pk)
        return doctors.filter(assigned_staff=self)


class Doctor(User):
    """Doctors only, so Django Admin can list and add them on their own page.

    A proxy model: no extra table. Saving always stores the Doctor role.
    """

    class Meta:
        proxy = True
        verbose_name = "doctor"
        verbose_name_plural = "doctors"

    def save(self, *args, **kwargs):
        self.role = Role.DOCTOR
        super().save(*args, **kwargs)
