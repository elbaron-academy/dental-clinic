"""Acceptance: payments.md (PAY-001..007)."""

from .helpers import book, check_in, register, start


def _setup(smile, login):
    reception = login(smile.receptionist)
    patient = register(reception, doctor_ids=[smile.doctor_a.id])
    appointment = book(reception, patient["id"], doctor_id=smile.doctor_a.id)
    cash = reception.get("/api/payment-methods/").json()
    return reception, patient, appointment, cash


def test_cash_is_the_initial_method(smile, login):
    _, _, _, methods = _setup(smile, login)
    assert [m["name"] for m in methods] == ["Cash"]


def test_due_paid_and_remaining(smile, login):
    reception, _, appointment, methods = _setup(smile, login)
    url = f"/api/appointments/{appointment['id']}/"
    reception.post(f"{url}amount-due/", {"amount_due": "500.00"})
    reception.post("/api/payments/", {"appointment_id": appointment["id"], "amount": "120.50",
                                      "method_id": methods[0]["id"]})
    billing = reception.get(url).json()["billing"]
    assert billing == {
        "amount_due": "500.00",
        "amount_paid": "120.50",
        "remaining_amount": "379.50",
        "payment_status": "PENDING",
        "payment_status_display": "Payment pending",
    }


def test_payment_before_the_session(smile, login):
    reception, _, appointment, methods = _setup(smile, login)
    reception.post(f"/api/appointments/{appointment['id']}/amount-due/", {"amount_due": "200"})
    paid = reception.post("/api/payments/", {"appointment_id": appointment["id"], "amount": "200",
                                             "method_id": methods[0]["id"]})
    assert paid.status_code == 201
    check_in(reception, appointment["id"])
    assert start(reception, appointment["id"]).status_code == 201


def test_payment_after_the_session(smile, login):
    reception, _, appointment, methods = _setup(smile, login)
    doctor = login(smile.doctor_a)
    check_in(reception, appointment["id"])
    visit_id = start(reception, appointment["id"]).json()["visit_id"]
    doctor.patch(f"/api/visits/{visit_id}/", {"treatment": "Scaling"})
    doctor.post(f"/api/visits/{visit_id}/complete/")
    reception.post(f"/api/appointments/{appointment['id']}/amount-due/", {"amount_due": "150"})
    paid = reception.post("/api/payments/", {"appointment_id": appointment["id"], "amount": "150",
                                             "method_id": methods[0]["id"]})
    assert paid.status_code == 201
    assert reception.get(f"/api/appointments/{appointment['id']}/").json()["billing"]["payment_status"] == "PAID"


def test_overpayment_is_refused(smile, login):
    reception, _, appointment, methods = _setup(smile, login)
    reception.post(f"/api/appointments/{appointment['id']}/amount-due/", {"amount_due": "50"})
    response = reception.post("/api/payments/", {"appointment_id": appointment["id"],
                                                  "amount": "60", "method_id": methods[0]["id"]})
    assert response.status_code == 400


def test_patient_balance_summary(smile, login):
    reception, patient, appointment, methods = _setup(smile, login)
    reception.post(f"/api/appointments/{appointment['id']}/amount-due/", {"amount_due": "400"})
    reception.post("/api/payments/", {"appointment_id": appointment["id"], "amount": "100",
                                      "method_id": methods[0]["id"]})
    balance = reception.get(f"/api/patients/{patient['id']}/balance/").json()
    assert balance["amount_due"] == "400.00"
    assert balance["amount_paid"] == "100.00"
    assert balance["remaining_amount"] == "300.00"


def test_no_invoicing_module(smile, login):
    """PAY-007."""
    reception = login(smile.receptionist)
    assert reception.get("/api/invoices/").status_code == 404
    assert reception.get("/api/accounting/").status_code == 404
