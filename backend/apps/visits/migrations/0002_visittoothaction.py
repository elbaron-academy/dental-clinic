import apps.visits.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0002_dentalactiontype"),
        ("visits", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="VisitToothAction",
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
                (
                    "tooth",
                    models.CharField(
                        max_length=2,
                        validators=[apps.visits.validators.validate_tooth],
                    ),
                ),
                ("notes", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "action_type",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="+",
                        to="catalog.dentalactiontype",
                    ),
                ),
                (
                    "visit",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="tooth_actions",
                        to="visits.visit",
                    ),
                ),
            ],
            options={
                "ordering": ["id"],
                "constraints": [
                    models.UniqueConstraint(
                        fields=("visit", "tooth", "action_type"),
                        name="one_action_type_per_tooth_per_visit",
                    )
                ],
            },
        ),
    ]
