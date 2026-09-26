"""Acceptance: users-and-roles.md (ROLE-001..004, AUTH-002, CLINIC-003)."""

from .helpers import book, check_in, later, register, start


def test_receptionist_duties(smile, login):
    """ROLE-003: registration, appointments/check-in, queue state and payments."""
    client = login(smile.receptionist)
    patient = register(client, doctor_ids=[smile.doctor_a.id])
    appointment = book(client, patient["id"], doctor_id=smile.doctor_a.id)
    check_in(client, appointment["id"])
    assert start(client, appointment["id"]).status_code == 201
    assert client.post(
        f"/api/appointments/{appointment['id']}/amount-due/", {"amount_due": "100"}
    ).status_code == 200


def test_receptionist_cannot_manage_clinical_record(smile, login):
    reception = login(smile.receptionist)
    patient = register(reception, doctor_ids=[smile.doctor_a.id])
    appointment = book(reception, patient["id"], doctor_id=smile.doctor_a.id)
    check_in(reception, appointment["id"])
    visit_id = start(reception, appointment["id"]).json()["visit_id"]
    assert reception.get(f"/api/visits/{visit_id}/").status_code == 403
    assert reception.patch(f"/api/visits/{visit_id}/", {"notes": "x"}).status_code == 403


def test_doctor_manages_clinical_information_of_assigned_patients(smile, login):
    """ROLE-001."""
    reception = login(smile.receptionist)
    patient = register(reception, doctor_ids=[smile.doctor_a.id])
    appointment = book(reception, patient["id"], doctor_id=smile.doctor_a.id)
    check_in(reception, appointment["id"])
    visit_id = start(reception, appointment["id"]).json()["visit_id"]

    doctor = login(smile.doctor_a)
    assert doctor.get(f"/api/patients/{patient['id']}/").status_code == 200
    assert doctor.patch(f"/api/visits/{visit_id}/", {"diagnosis": "Caries"}).status_code == 200
    # Other reception work stays with reception by default.
    assert doctor.post(
        "/api/appointments/", {"patient_id": patient["id"], "scheduled_at": later()}
    ).status_code == 403


def test_doctor_registers_patient_assigned_to_themself(smile, login):
    """CR-021: a doctor may register a patient; it is assigned to that doctor only."""
    doctor = login(smile.doctor_a)
    patient = register(doctor, "Doctor's Own Patient")
    assert [d["id"] for d in patient["doctors"]] == [smile.doctor_a.id]
    # The doctor cannot register a patient for another doctor.
    response = doctor.post(
        "/api/patients/",
        {"full_name": "X", "phone": "0100000000", "doctor_ids": [smile.doctor_b.id]},
    )
    assert response.status_code == 400
    # Reception assigned to the doctor sees the new patient; the other doctor does not.
    listed = login(smile.receptionist).get("/api/patients/").json()["results"]
    assert patient["id"] in {p["id"] for p in listed}
    assert login(smile.doctor_b).get(f"/api/patients/{patient['id']}/").status_code == 404


def test_other_doctor_cannot_access_patient_or_visit(smile, login):
    """ROLE-004, APPT-006."""
    reception = login(smile.receptionist)
    patient = register(reception, doctor_ids=[smile.doctor_a.id])
    appointment = book(reception, patient["id"], doctor_id=smile.doctor_a.id)
    check_in(reception, appointment["id"])
    visit_id = start(reception, appointment["id"]).json()["visit_id"]

    other_doctor = login(smile.doctor_b)
    assert other_doctor.get(f"/api/patients/{patient['id']}/").status_code == 404
    assert other_doctor.get(f"/api/visits/{visit_id}/").status_code == 404
    assert other_doctor.post(f"/api/visits/{visit_id}/complete/").status_code == 404


def test_assistant_access_follows_assignment(smile, login):
    """ROLE-002: the assistant is assigned to doctor A only."""
    reception = login(smile.receptionist)
    of_a = register(reception, "Patient of A", doctor_ids=[smile.doctor_a.id])
    of_b = register(reception, "Patient of B", doctor_ids=[smile.doctor_b.id])
    assistant = login(smile.assistant)
    visible = {p["id"] for p in assistant.get("/api/patients/").json()["results"]}
    assert visible == {of_a["id"]}
    assert assistant.get(f"/api/patients/{of_b['id']}/").status_code == 404
    doctors = assistant.get("/api/doctors/").json()
    assert [d["id"] for d in doctors] == [smile.doctor_a.id]
    # Read-only by default.
    assert assistant.post("/api/patients/", {"full_name": "X", "phone": "0100000000"}).status_code == 403


def test_cross_clinic_isolation(smile, other, login):
    """ROLE-004: nothing leaks between clinics."""
    theirs = register(login(other.receptionist), doctor_ids=[other.doctor_a.id])
    appointment = book(login(other.receptionist), theirs["id"], doctor_id=other.doctor_a.id)
    client = login(smile.receptionist)
    assert client.get(f"/api/patients/{theirs['id']}/").status_code == 404
    assert client.get(f"/api/appointments/{appointment['id']}/").status_code == 404
    assert client.post(f"/api/appointments/{appointment['id']}/check-in/").status_code == 404
    assert client.get("/api/patients/").json()["count"] == 0
    booking = client.post(
        "/api/appointments/",
        {"patient_id": theirs["id"], "doctor_id": smile.doctor_a.id, "scheduled_at": "2030-01-01T09:00:00Z"},
    )
    assert booking.status_code == 400
