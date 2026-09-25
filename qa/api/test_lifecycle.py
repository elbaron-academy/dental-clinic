"""Acceptance: patient-lifecycle.md, appointments.md, visits.md (LIFE-001..003, APPT, VISIT)."""

from apps.catalog.models import Medication, Procedure

from .helpers import book, check_in, later, register, start


def test_full_patient_lifecycle(smile, login, db):
    """Registered -> Appointment -> Checked in -> Waiting -> Active visit -> Recorded
    -> Completed -> Payment pending/paid -> Follow-up (LIFE-001)."""
    filling = Procedure.objects.create(name="Composite filling")
    ibuprofen = Medication.objects.create(name="Ibuprofen", details="400 mg")
    reception = login(smile.receptionist)
    doctor = login(smile.doctor_a)

    patient = register(reception, "Lifecycle Patient", doctor_ids=[smile.doctor_a.id])
    appointment = book(reception, patient["id"], doctor_id=smile.doctor_a.id)
    assert appointment["status"] == "SCHEDULED"

    arrived = check_in(reception, appointment["id"])
    assert arrived["status_display"] == "Waiting for doctor"
    queue = doctor.get("/api/appointments/queue/").json()
    assert [a["id"] for a in queue["waiting"]] == [appointment["id"]]

    started = doctor.post(f"/api/appointments/{appointment['id']}/start-visit/")
    assert started.status_code == 201
    visit_id = started.json()["visit_id"]
    queue = reception.get("/api/appointments/queue/").json()
    assert [a["id"] for a in queue["in_visit"]] == [appointment["id"]]

    url = f"/api/visits/{visit_id}/"
    assert doctor.patch(url, {"notes": "Pain", "diagnosis": "Caries #26",
                              "treatment": "Filling"}).status_code == 200
    assert doctor.post(f"{url}procedures/", {"procedure_id": filling.id, "tooth": "26"}).status_code == 201
    assert doctor.post(f"{url}medications/", {"medication_id": ibuprofen.id, "quantity": "10 tablets",
                                              "duration": "5 days"}).status_code == 201
    follow = doctor.post(f"{url}follow-ups/", {"scheduled_at": later(24 * 14), "notes": "Review"})
    assert follow.status_code == 201
    completed = doctor.post(f"{url}complete/")
    assert completed.status_code == 200
    assert completed.json()["status"] == "COMPLETED"

    billing = reception.get(f"/api/appointments/{appointment['id']}/").json()
    assert billing["status"] == "COMPLETED"
    assert billing["billing"]["payment_status"] == "NOT_SET"
    reception.post(f"/api/appointments/{appointment['id']}/amount-due/", {"amount_due": "300"})
    pending = reception.get(f"/api/appointments/{appointment['id']}/").json()["billing"]
    assert pending["payment_status"] == "PENDING"
    cash = reception.get("/api/payment-methods/").json()[0]
    reception.post("/api/payments/", {"appointment_id": appointment["id"], "amount": "300",
                                      "method_id": cash["id"]})
    paid = reception.get(f"/api/appointments/{appointment['id']}/").json()["billing"]
    assert paid["payment_status"] == "PAID"

    upcoming = reception.get("/api/appointments/", {"patient": patient["id"],
                                                    "status": "SCHEDULED"}).json()["results"]
    assert [a["follow_up_of"] for a in upcoming] == [visit_id]

    history = doctor.get("/api/visits/", {"patient": patient["id"]}).json()["results"]
    assert history[0]["id"] == visit_id
    assert history[0]["diagnosis"] == "Caries #26"
    assert history[0]["procedures"][0]["tooth"] == "26"
    assert history[0]["medications"][0]["duration"] == "5 days"


def test_patient_cannot_be_in_two_active_visits(smile, login):
    """APPT-005."""
    reception = login(smile.receptionist)
    patient = register(reception, doctor_ids=[smile.doctor_a.id, smile.doctor_b.id])
    first = book(reception, patient["id"], doctor_id=smile.doctor_a.id)
    second = book(reception, patient["id"], doctor_id=smile.doctor_b.id)
    check_in(reception, first["id"])
    check_in(reception, second["id"])
    assert start(reception, first["id"]).status_code == 201
    blocked = start(reception, second["id"])
    assert blocked.status_code == 409
    assert blocked.json()["code"] == "active_visit_exists"


def test_visit_requires_check_in(smile, login):
    reception = login(smile.receptionist)
    patient = register(reception, doctor_ids=[smile.doctor_a.id])
    appointment = book(reception, patient["id"], doctor_id=smile.doctor_a.id)
    assert start(reception, appointment["id"]).status_code == 409


def test_completed_visit_stays_in_history_and_is_locked(smile, login):
    """VISIT-008, LIFE-003."""
    reception = login(smile.receptionist)
    doctor = login(smile.doctor_a)
    patient = register(reception, doctor_ids=[smile.doctor_a.id])
    appointment = book(reception, patient["id"], doctor_id=smile.doctor_a.id)
    check_in(reception, appointment["id"])
    visit_id = start(reception, appointment["id"]).json()["visit_id"]
    assert doctor.post(f"/api/visits/{visit_id}/complete/").json()["code"] == "outcome_required"
    doctor.patch(f"/api/visits/{visit_id}/", {"notes": "Check-up"})
    doctor.post(f"/api/visits/{visit_id}/complete/")
    assert doctor.patch(f"/api/visits/{visit_id}/", {"notes": "edit"}).status_code == 409
    for viewer in (doctor, login(smile.assistant)):
        history = viewer.get("/api/visits/", {"patient": patient["id"]}).json()["results"]
        assert [v["status"] for v in history] == ["COMPLETED"]


def test_single_doctor_clinic_appointment_auto_selects_doctor(solo, login):
    """CLINIC-002."""
    reception = login(solo["reception"])
    patient = register(reception)
    appointment = book(reception, patient["id"])
    assert appointment["doctor"]["id"] == solo["doctor"].id


def test_multi_doctor_clinic_requires_doctor_selection(smile, login):
    """CLINIC-003."""
    reception = login(smile.receptionist)
    patient = register(reception, doctor_ids=[smile.doctor_a.id])
    response = reception.post("/api/appointments/", {"patient_id": patient["id"], "scheduled_at": later()})
    assert response.status_code == 400
    assert response.json()["doctor_id"] == ["Select a doctor."]
