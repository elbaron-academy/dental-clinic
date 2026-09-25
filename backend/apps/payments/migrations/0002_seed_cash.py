from django.db import migrations


def seed_cash(apps, schema_editor):
    """PAY-006: Cash is the initial supported payment method."""
    PaymentMethod = apps.get_model("payments", "PaymentMethod")
    PaymentMethod.objects.get_or_create(code="cash", defaults={"name": "Cash", "sort_order": 0})


class Migration(migrations.Migration):
    dependencies = [("payments", "0001_initial")]

    operations = [migrations.RunPython(seed_cash, migrations.RunPython.noop)]
