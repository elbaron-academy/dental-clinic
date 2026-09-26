from django.db import migrations

import apps.accounts.models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Doctor",
            fields=[],
            options={
                "verbose_name": "doctor",
                "verbose_name_plural": "doctors",
                "proxy": True,
                "indexes": [],
                "constraints": [],
            },
            bases=("accounts.user",),
            managers=[
                ("objects", apps.accounts.models.UserManager()),
            ],
        ),
    ]
