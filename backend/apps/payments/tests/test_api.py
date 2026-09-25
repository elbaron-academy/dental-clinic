"""PAY-001..004, PAY-007, CR-014..016."""

from decimal import Decimal

import pytest

from apps.appointments.models import AppointmentStatus
from apps.core import testing
from apps.payments.models import Payment, PaymentMethod
from apps.visits.services import complete_visit

APPOINTMENTS = "/api/appointments/"
PAYMENTS = "/api/payments/"


@pytest.fixture
def cash(db):
    return PaymentMethod.objects.get(code="cash")


@pytest.fixture
def patient(clinic, doctor):
    return testing.make_patient(clinic, [doctor], full_name="Karim Said")


@pytest.fixture
def appointment(patient, doctor):
    return testing.make_appointment(patient, doctor)


@pytest.fixture
def reception(client_for, receptionist):
    return client_for(receptionist)


def set_due(client, appointment, amount):
    return client.post(f"{APPOINTMENTS}{appointment.id}/amount-due/", {"amount_due": amount})


def pay(client, appointment, amount, method, **extra):
    return client.post(
        PAYMENTS,
        {"appointment_id": appointment.id, "amount": amount, "method_id": method.id, **extra},
    )


def billing_of(client, appointment):
    return client.get(f"{APPOINTMENTS}{appointment.id}/").json()["billing"]


class TestAmountDue:
    def test_billing_starts_not_set(self, reception, appointment):
        assert billing_of(reception, appointment) == {
            "amount_due": None,
            "amount_paid": "0.00",
            "remaining_amount": None,
            "payment_status": "NOT_SET",
            "payment_status_display": "Amount due not set",
        }

    def test_record_amount_due(self, reception, appointment):
        """PAY-001."""
        response = set_due(reception, appointment, "350.00")
        assert response.status_code == 200
        assert response.json()["billing"]["amount_due"] == "350.00"
        assert response.json()["billing"]["payment_status"] == "PENDING"

    def test_amount_due_cannot_be_negative(self, reception, appointment):
        assert set_due(reception, appointment, "-1").status_code == 400

    def test_amount_due_not_below_paid(self, reception, appointment, cash):
        set_due(reception, appointment, "300")
        pay(reception, appointment, "200", cash)
        response = set_due(reception, appointment, "150")
        assert response.status_code == 400
        assert "amount_due" in response.json()

    def test_cancelled_appointment_cannot_be_billed(self, reception, patient, doctor):
        cancelled = testing.make_appointment(patient, doctor, status=AppointmentStatus.CANCELLED)
        response = set_due(reception, cancelled, "100")
        assert response.status_code == 409
        assert response.json()["code"] == "appointment_cancelled"

    @pytest.mark.parametrize("role_fixture", ["doctor", "assistant"])
    def test_only_reception_manages_billing(self, request, client_for, appointment, role_fixture):
        user = request.getfixturevalue(role_fixture)
        assert set_due(client_for(user), appointment, "100").status_code == 403

    def test_billing_hidden_without_permission(self, client_for, doctor, appointment):
        assert client_for(doctor).get(f"{APPOINTMENTS}{appointment.id}/").json()["billing"] is None


class TestPayments:
    def test_partial_and_full_payment(self, reception, appointment, cash, receptionist):
        """PAY-002, PAY-003."""
        set_due(reception, appointment, "500")
        response = pay(reception, appointment, "200", cash, note="First instalment")
        assert response.status_code == 201, response.content
        body = response.json()
        assert body["amount"] == "200.00"
        assert body["method"] == {"id": cash.id, "name": "Cash", "code": "cash"}
        assert body["received_by"] == receptionist.full_name
        assert billing_of(reception, appointment)["remaining_amount"] == "300.00"

        pay(reception, appointment, "300", cash)
        billing = billing_of(reception, appointment)
        assert billing["amount_paid"] == "500.00"
        assert billing["remaining_amount"] == "0.00"
        assert billing["payment_status"] == "PAID"

    def test_payment_before_visit(self, reception, appointment, cash):
        """PAY-004: collected before the session."""
        set_due(reception, appointment, "100")
        assert pay(reception, appointment, "100", cash).status_code == 201
        assert appointment.status == AppointmentStatus.SCHEDULED

    def test_payment_after_visit(self, reception, patient, doctor, cash):
        """PAY-004: collected after the session."""
        visit = testing.make_active_visit(patient, doctor)
        visit.notes = "Scaling"
        visit.save()
        complete_visit(visit, doctor)
        set_due(reception, visit.appointment, "250")
        assert pay(reception, visit.appointment, "250", cash).status_code == 201
        assert billing_of(reception, visit.appointment)["payment_status"] == "PAID"

    def test_amount_due_required_first(self, reception, appointment, cash):
        response = pay(reception, appointment, "50", cash)
        assert response.status_code == 409
        assert response.json()["code"] == "amount_due_not_set"

    def test_overpayment_rejected(self, reception, appointment, cash):
        set_due(reception, appointment, "100")
        response = pay(reception, appointment, "100.01", cash)
        assert response.status_code == 400
        assert "remaining amount (100.00)" in response.json()["amount"][0]

    @pytest.mark.parametrize("amount", ["0", "-5", "abc"])
    def test_invalid_amount(self, reception, appointment, cash, amount):
        set_due(reception, appointment, "100")
        assert pay(reception, appointment, amount, cash).status_code == 400

    def test_inactive_method_rejected(self, reception, appointment):
        retired = PaymentMethod.objects.create(name="Cheque", code="cheque", is_active=False)
        set_due(reception, appointment, "100")
        response = pay(reception, appointment, "10", retired)
        assert response.status_code == 400
        assert "method_id" in response.json()

    def test_cannot_pay_for_invisible_appointment(self, reception, clinic, second_doctor, cash):
        hidden = testing.make_appointment(
            testing.make_patient(clinic, [second_doctor]), second_doctor
        )
        hidden.amount_due = Decimal("10")
        hidden.save()
        response = pay(reception, hidden, "10", cash)
        assert response.status_code == 400
        assert "appointment_id" in response.json()

    def test_list_payments_for_appointment(self, reception, appointment, patient, doctor, cash):
        other = testing.make_appointment(patient, doctor)
        for appt in (appointment, other):
            set_due(reception, appt, "100")
            pay(reception, appt, "40", cash)
        response = reception.get(PAYMENTS, {"appointment": appointment.id})
        assert response.status_code == 200
        assert [p["appointment_id"] for p in response.json()["results"]] == [appointment.id]
        assert reception.get(PAYMENTS, {"patient": patient.id}).json()["count"] == 2

    def test_doctor_cannot_record_or_view_payments(self, client_for, doctor, appointment, cash):
        client = client_for(doctor)
        assert client.get(PAYMENTS).status_code == 403
        assert pay(client, appointment, "1", cash).status_code == 403

    def test_payments_scoped_to_clinic(self, reception, other_clinic, cash):
        foreign_doctor = testing.make_doctor(other_clinic)
        foreign = testing.make_appointment(
            testing.make_patient(other_clinic, [foreign_doctor]), foreign_doctor, amount_due=10
        )
        Payment.objects.create(clinic=other_clinic, appointment=foreign, amount=5, method=cash)
        assert reception.get(PAYMENTS).json()["count"] == 0


def test_patient_balance(reception, patient, doctor, cash):
    """PAY-003, PAY-007: basic balance tracking across appointments."""
    paid = testing.make_appointment(patient, doctor)
    partial = testing.make_appointment(patient, doctor)
    testing.make_appointment(patient, doctor)  # amount due not set
    testing.make_appointment(
        patient, doctor, status=AppointmentStatus.CANCELLED, amount_due=Decimal("999")
    )
    set_due(reception, paid, "100")
    pay(reception, paid, "100", cash)
    set_due(reception, partial, "300")
    pay(reception, partial, "50", cash)

    response = reception.get(f"/api/patients/{patient.id}/balance/")
    assert response.status_code == 200
    assert response.json() == {
        "amount_due": "400.00",
        "amount_paid": "150.00",
        "remaining_amount": "250.00",
        "appointments_pending": 1,
        "appointments_not_set": 1,
    }


def test_balance_requires_payment_permission(client_for, doctor, patient):
    assert client_for(doctor).get(f"/api/patients/{patient.id}/balance/").status_code == 403


def test_no_invoice_endpoints(api_client, db):
    """PAY-007: invoicing/accounting is out of scope."""
    assert api_client.get("/api/invoices/").status_code == 404
