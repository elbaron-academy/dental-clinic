from apps.payments.models import PaymentMethod


def test_cash_is_seeded(db):
    """PAY-006."""
    cash = PaymentMethod.objects.get(code="cash")
    assert cash.name == "Cash"
    assert cash.is_active
