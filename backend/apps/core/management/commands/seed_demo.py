"""Demo data: two clinics (multi- and single-doctor), staff, clinical catalog.

Creates accounts with a known password, so it refuses to run unless
DJANGO_DEBUG is on or --force is given. Safe to run repeatedly.
"""

import datetime

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Role, User
from apps.catalog.models import Medication, Procedure
from apps.clinics.models import Clinic

DEMO_PASSWORD = "demo-pass-123"

CLINICS = {
    "Smile Dental Center": {
        "users": [
            ("01000000001", "Dr. Amal Hassan", Role.DOCTOR, []),
            ("01000000002", "Dr. Omar Nabil", Role.DOCTOR, []),
            ("01000000003", "Sara Mostafa", Role.ASSISTANT, ["01000000001"]),
            ("01000000004", "Rana Adel", Role.RECEPTIONIST, ["01000000001", "01000000002"]),
        ],
    },
    "Nile Family Dental": {
        "users": [
            ("01000000011", "Dr. Youssef Kamal", Role.DOCTOR, []),
            ("01000000014", "Mai Hamdy", Role.RECEPTIONIST, ["01000000011"]),
        ],
    },
}

PROCEDURES = [
    ("Examination", "D0150"),
    ("Scaling and polishing", "D1110"),
    ("Composite filling", "D2391"),
    ("Root canal treatment", "D3310"),
    ("Crown", "D2740"),
    ("Extraction", "D7140"),
]

MEDICATIONS = [
    ("Amoxicillin", "500 mg capsule"),
    ("Ibuprofen", "400 mg tablet"),
    ("Paracetamol", "500 mg tablet"),
    ("Metronidazole", "500 mg tablet"),
    ("Chlorhexidine", "0.12% mouthwash"),
]


class Command(BaseCommand):
    help = "Create demo clinics, staff accounts and a clinical catalog (development only)."

    def add_arguments(self, parser):
        parser.add_argument("--password", default=DEMO_PASSWORD)
        parser.add_argument(
            "--sample-patients",
            action="store_true",
            help="Also create sample patients and today's appointments.",
        )
        parser.add_argument(
            "--force", action="store_true", help="Run even when DJANGO_DEBUG is off."
        )

    @transaction.atomic
    def handle(self, *args, password, sample_patients, force, **options):
        if not settings.DEBUG and not force:
            raise CommandError(
                "seed_demo creates accounts with a known password. "
                "Run it with DJANGO_DEBUG=true or pass --force."
            )
        admin, created = User.objects.get_or_create(
            phone="01000000000",
            defaults={"full_name": "Platform Admin", "is_staff": True, "is_superuser": True},
        )
        if created:
            admin.set_password(password)
            admin.save()

        for clinic_name, spec in CLINICS.items():
            clinic, _ = Clinic.objects.get_or_create(name=clinic_name)
            for phone, name, role, doctor_phones in spec["users"]:
                user, created = User.objects.get_or_create(
                    phone=phone, defaults={"full_name": name, "role": role, "clinic": clinic}
                )
                if created:
                    user.set_password(password)
                    user.save()
                if doctor_phones:
                    user.assigned_doctors.set(User.objects.filter(phone__in=doctor_phones))

        for name, code in PROCEDURES:
            Procedure.objects.get_or_create(name=name, clinic=None, defaults={"code": code})
        for name, details in MEDICATIONS:
            Medication.objects.get_or_create(name=name, clinic=None, defaults={"details": details})

        if sample_patients:
            self._sample_patients()

        self.stdout.write(self.style.SUCCESS("Demo data ready."))
        self.stdout.write(f"All demo accounts use the password: {password}")
        for spec in CLINICS.values():
            for phone, name, role, _ in spec["users"]:
                self.stdout.write(f"  {role.label:<13} {phone}  {name}")
        self.stdout.write("  Django Admin  01000000000  Platform Admin")

    def _sample_patients(self):
        from apps.appointments.models import Appointment
        from apps.patients.models import Patient

        clinic = Clinic.objects.get(name="Smile Dental Center")
        amal = User.objects.get(phone="01000000001")
        omar = User.objects.get(phone="01000000002")
        now = timezone.now().replace(minute=0, second=0, microsecond=0)
        samples = [
            ("Mona Adel", "01223334444", False, amal, 1),
            ("Hany Fathy", "01112223333", False, amal, 2),
            ("Laila Samir", "01556667777", True, omar, 3),
        ]
        for name, phone, minor, doctor, hours in samples:
            patient, created = Patient.objects.get_or_create(
                clinic=clinic,
                full_name=name,
                defaults={
                    "phone": phone,
                    "is_minor": minor,
                    "guardian_name": "Samir Fawzy" if minor else "",
                    "guardian_phone": "01009998888" if minor else "",
                },
            )
            patient.doctors.add(doctor)
            if created:
                Appointment.objects.create(
                    clinic=clinic,
                    patient=patient,
                    doctor=doctor,
                    scheduled_at=now + datetime.timedelta(hours=hours),
                )
