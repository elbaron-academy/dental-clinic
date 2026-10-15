from django.db import migrations, models

import apps.accounts.models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_doctor"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="username",
            field=models.CharField(
                blank=True,
                error_messages={"unique": "A user with this username already exists."},
                help_text="Optional. An alternative to the phone number when signing in. Not case-sensitive.",
                max_length=32,
                null=True,
                unique=True,
                validators=[apps.accounts.models.validate_username],
            ),
        ),
    ]
