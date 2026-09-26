import django.core.validators
import django.db.models.deletion
from django.db import migrations, models

# Default dental chart actions (CR-023). Admins can rename, recolor, deactivate
# or add action types in Django Admin.
DEFAULT_ACTION_TYPES = [
    ("Caries", "", "#DC2626"),
    ("Filling", "D2391", "#2563EB"),
    ("Root canal", "D3310", "#7C3AED"),
    ("Crown", "D2740", "#D97706"),
    ("Extraction", "D7140", "#475569"),
    ("Implant", "D6010", "#0D9488"),
    ("Scaling", "D1110", "#16A34A"),
]


def seed_action_types(apps, schema_editor):
    DentalActionType = apps.get_model("catalog", "DentalActionType")
    for name, code, color in DEFAULT_ACTION_TYPES:
        DentalActionType.objects.get_or_create(
            name=name, clinic=None, defaults={"code": code, "color": color}
        )


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0001_initial"),
        ("clinics", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="DentalActionType",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=150)),
                (
                    "is_active",
                    models.BooleanField(
                        default=True,
                        help_text="Inactive items stay in history but cannot be selected.",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "code",
                    models.CharField(
                        blank=True,
                        help_text="Optional internal or ADA code.",
                        max_length=20,
                    ),
                ),
                (
                    "color",
                    models.CharField(
                        default="#2563EB",
                        help_text="Tooth color on the dental chart, e.g. #2563EB.",
                        max_length=7,
                        validators=[
                            django.core.validators.RegexValidator(
                                "^#[0-9A-Fa-f]{6}$",
                                "Use a hex color such as #2563EB.",
                                code="invalid_color",
                            )
                        ],
                    ),
                ),
                (
                    "clinic",
                    models.ForeignKey(
                        blank=True,
                        help_text="Leave empty to make the item available to all clinics.",
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="+",
                        to="clinics.clinic",
                    ),
                ),
            ],
            options={
                "verbose_name": "dental action type",
                "ordering": ["name", "id"],
                "abstract": False,
            },
        ),
        migrations.RunPython(seed_action_types, migrations.RunPython.noop),
    ]
