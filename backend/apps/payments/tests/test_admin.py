"""PAY-005: payment methods are configurable through Django Admin."""

from apps.payments.models import PaymentMethod


def test_admin_adds_and_deactivates_payment_method(admin_site_client, client_for, receptionist):
    response = admin_site_client.post(
        "/admin/payments/paymentmethod/add/",
        {"name": "Card", "code": "card", "is_active": "on", "sort_order": 1},
    )
    assert response.status_code == 302
    client = client_for(receptionist)
    assert [m["name"] for m in client.get("/api/payment-methods/").json()] == ["Cash", "Card"]

    card = PaymentMethod.objects.get(code="card")
    response = admin_site_client.post(
        f"/admin/payments/paymentmethod/{card.pk}/change/",
        {"name": "Card", "code": "card", "sort_order": 1},
    )
    assert response.status_code == 302
    assert [m["name"] for m in client.get("/api/payment-methods/").json()] == ["Cash"]


def test_payment_admin_pages_load(admin_site_client):
    assert admin_site_client.get("/admin/payments/payment/").status_code == 200
    assert admin_site_client.get("/admin/payments/paymentmethod/").status_code == 200
