"""Acceptance: patients.md, clinic.md (PATIENT-001..005, CLINIC-002/003)."""

import pytest

from .helpers import register


def test_minimum_registration_is_name_and_phone(smile, login):
    client = login(smile.receptionist)
    patient = register(client, doctor_ids=[smile.doctor_a.id])
    assert patient["full_name"] == "QA Patient"
    assert patient["address"] == ""


@pytest.mark.parametrize("missing", ["full_name", "phone"])
def test_name_and_phone_are_mandatory(smile, login, missing):
    client = login(smile.receptionist)
    payload = {"full_name": "A", "phone": "0100000000", "doctor_ids": [smile.doctor_a.id]}
    payload[missing] = ""
    assert client.post("/api/patients/", payload).status_code == 400


def test_address_is_optional(smile, login):
    client = login(smile.receptionist)
    patient = register(client, address="Giza", doctor_ids=[smile.doctor_a.id])
    assert patient["address"] == "Giza"


def test_minor_needs_guardian_name_and_phone(smile, login):
    client = login(smile.receptionist)
    base = {"full_name": "Kid", "phone": "0100000000", "is_minor": True,
            "doctor_ids": [smile.doctor_a.id]}
    response = client.post("/api/patients/", base)
    assert response.status_code == 400
    assert {"guardian_name", "guardian_phone"} <= set(response.json())
    ok = client.post(
        "/api/patients/", {**base, "guardian_name": "Parent", "guardian_phone": "0101111111"}
    )
    assert ok.status_code == 201


def test_single_doctor_clinic_selects_doctor_automatically(solo, login):
    patient = register(login(solo["reception"]))
    assert [d["id"] for d in patient["doctors"]] == [solo["doctor"].id]


def test_multi_doctor_clinic_requires_permitted_doctor(smile, other, login):
    client = login(smile.receptionist)
    missing = client.post("/api/patients/", {"full_name": "A", "phone": "0100000000"})
    assert missing.status_code == 400
    foreign = client.post(
        "/api/patients/",
        {"full_name": "A", "phone": "0100000000", "doctor_ids": [other.doctor_a.id]},
    )
    assert foreign.status_code == 400


def test_search_by_name_and_phone(smile, login):
    client = login(smile.receptionist)
    register(client, "Salma Ibrahim", "01112345678", doctor_ids=[smile.doctor_a.id])
    register(client, "Tamer Hosny", "01298765432", doctor_ids=[smile.doctor_a.id])
    by_name = client.get("/api/patients/", {"search": "salma"}).json()["results"]
    by_phone = client.get("/api/patients/", {"search": "0129876"}).json()["results"]
    assert [p["full_name"] for p in by_name] == ["Salma Ibrahim"]
    assert [p["full_name"] for p in by_phone] == ["Tamer Hosny"]


def test_new_patient_has_no_history(smile, login):
    """LIFE-002."""
    patient = register(login(smile.receptionist), doctor_ids=[smile.doctor_a.id])
    history = login(smile.doctor_a).get("/api/visits/", {"patient": patient["id"]}).json()
    assert history["count"] == 0
