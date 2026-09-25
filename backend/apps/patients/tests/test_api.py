"""PATIENT-001..005, CLINIC-002/003, ROLE-004."""

import pytest
from django.db import IntegrityError

from apps.core import testing
from apps.patients.models import Patient

URL = "/api/patients/"


def register(client, **data):
    payload = {"full_name": "Mona Adel", "phone": "0122 333 4444", **data}
    return client.post(URL, payload)


def make_patient(clinic, doctors, **kwargs):
    patient = Patient.objects.create(
        clinic=clinic,
        full_name=kwargs.pop("full_name", "Patient"),
        phone=kwargs.pop("phone", "01200000000"),
        **kwargs,
    )
    patient.doctors.set(doctors)
    return patient


class TestRegistration:
    def test_register_with_name_and_phone(self, client_for, receptionist, doctor):
        response = register(client_for(receptionist))
        assert response.status_code == 201, response.content
        body = response.json()
        assert body["full_name"] == "Mona Adel"
        assert body["phone"] == "01223334444"
        assert body["address"] == ""
        assert body["is_minor"] is False
        patient = Patient.objects.get(pk=body["id"])
        assert patient.clinic == receptionist.clinic
        assert patient.created_by == receptionist

    @pytest.mark.parametrize("missing", ["full_name", "phone"])
    def test_name_and_phone_are_required(self, client_for, receptionist, missing):
        response = register(client_for(receptionist), **{missing: ""})
        assert response.status_code == 400
        assert missing in response.json()

    def test_invalid_phone_is_rejected(self, client_for, receptionist):
        response = register(client_for(receptionist), phone="12ab")
        assert response.status_code == 400
        assert "phone" in response.json()

    def test_optional_address(self, client_for, receptionist):
        response = register(client_for(receptionist), address="12 Nile St, Cairo")
        assert response.status_code == 201
        assert response.json()["address"] == "12 Nile St, Cairo"

    def test_minor_requires_guardian_name_and_phone(self, client_for, receptionist):
        response = register(client_for(receptionist), is_minor=True)
        assert response.status_code == 400
        assert set(response.json()) == {"guardian_name", "guardian_phone"}

    def test_minor_with_guardian(self, client_for, receptionist):
        response = register(
            client_for(receptionist),
            is_minor=True,
            guardian_name="Adel Mahmoud",
            guardian_phone="010-1234-5678",
        )
        assert response.status_code == 201
        assert response.json()["guardian_phone"] == "01012345678"

    def test_guardian_fields_are_cleared_for_adults(self, client_for, receptionist):
        response = register(
            client_for(receptionist), guardian_name="X", guardian_phone="0101234567"
        )
        assert response.status_code == 201
        assert response.json()["guardian_name"] == ""

    def test_minor_constraint_enforced_in_database(self, clinic, doctor):
        with pytest.raises(IntegrityError):
            make_patient(clinic, [doctor], is_minor=True)

    def test_duplicate_phone_is_allowed(self, client_for, receptionist):
        """CR-005: family members may share a phone number."""
        client = client_for(receptionist)
        assert register(client).status_code == 201
        assert register(client, full_name="Sister").status_code == 201


class TestDoctorAssociation:
    def test_single_permitted_doctor_is_auto_selected(self, client_for, receptionist, doctor):
        """CLINIC-002."""
        response = register(client_for(receptionist))
        assert response.json()["doctors"] == [{"id": doctor.id, "full_name": doctor.full_name}]

    def test_multi_doctor_requires_selection(self, client_for, clinic, doctor, second_doctor):
        """CLINIC-003."""
        staff = testing.make_receptionist(clinic, doctors=[doctor, second_doctor])
        response = register(client_for(staff))
        assert response.status_code == 400
        assert response.json()["doctor_ids"] == ["Select a doctor."]

    def test_multi_doctor_selection(self, client_for, clinic, doctor, second_doctor):
        staff = testing.make_receptionist(clinic, doctors=[doctor, second_doctor])
        response = register(client_for(staff), doctor_ids=[second_doctor.id])
        assert response.status_code == 201
        assert [d["id"] for d in response.json()["doctors"]] == [second_doctor.id]

    def test_cannot_select_unpermitted_doctor(self, client_for, receptionist, second_doctor):
        response = register(client_for(receptionist), doctor_ids=[second_doctor.id])
        assert response.status_code == 400
        assert "doctor_ids" in response.json()

    def test_staff_without_doctors_cannot_register(self, client_for, clinic, doctor):
        staff = testing.make_receptionist(clinic)
        response = register(client_for(staff))
        assert response.status_code == 400
        assert "not assigned to any doctor" in response.json()["doctor_ids"][0]

    def test_update_adds_doctors_without_removing(self, client_for, clinic, doctor, second_doctor):
        staff = testing.make_receptionist(clinic, doctors=[doctor, second_doctor])
        patient = make_patient(clinic, [doctor])
        response = client_for(staff).patch(
            f"{URL}{patient.id}/", {"doctor_ids": [second_doctor.id]}
        )
        assert response.status_code == 200
        assert {d["id"] for d in response.json()["doctors"]} == {doctor.id, second_doctor.id}


class TestScopingAndPermissions:
    def test_list_is_scoped_to_permitted_doctors(
        self, client_for, clinic, doctor, second_doctor, receptionist
    ):
        mine = make_patient(clinic, [doctor], full_name="Mine")
        make_patient(clinic, [second_doctor], full_name="Not mine")
        shared = make_patient(clinic, [doctor, second_doctor], full_name="Shared")
        response = client_for(receptionist).get(URL)
        assert response.status_code == 200
        assert {p["id"] for p in response.json()["results"]} == {mine.id, shared.id}

    def test_other_clinic_patients_are_invisible(self, client_for, other_clinic, receptionist):
        foreign_doctor = testing.make_doctor(other_clinic)
        foreign = make_patient(other_clinic, [foreign_doctor])
        client = client_for(receptionist)
        assert client.get(URL).json()["count"] == 0
        assert client.get(f"{URL}{foreign.id}/").status_code == 404

    def test_doctor_sees_only_own_patients(self, client_for, clinic, doctor, second_doctor):
        mine = make_patient(clinic, [doctor])
        make_patient(clinic, [second_doctor])
        response = client_for(doctor).get(URL)
        assert [p["id"] for p in response.json()["results"]] == [mine.id]

    def test_assistant_sees_assigned_doctor_patients(self, client_for, clinic, doctor, assistant):
        """ROLE-002."""
        patient = make_patient(clinic, [doctor])
        response = client_for(assistant).get(URL)
        assert [p["id"] for p in response.json()["results"]] == [patient.id]

    @pytest.mark.parametrize("role_fixture", ["doctor", "assistant"])
    def test_only_reception_registers_by_default(self, request, client_for, role_fixture):
        user = request.getfixturevalue(role_fixture)
        assert register(client_for(user)).status_code == 403

    def test_doctor_cannot_edit_patient(self, client_for, clinic, doctor):
        patient = make_patient(clinic, [doctor])
        response = client_for(doctor).patch(f"{URL}{patient.id}/", {"address": "x"})
        assert response.status_code == 403

    def test_extra_permission_can_be_granted(self, client_for, doctor):
        """AUTH-002: permissions, not only roles, determine access."""
        from django.contrib.auth.models import Permission

        doctor.user_permissions.add(Permission.objects.get(codename="add_patient"))
        assert register(client_for(doctor)).status_code == 201

    def test_anonymous_is_rejected(self, api_client, db):
        assert api_client.get(URL).status_code == 401

    def test_delete_is_not_available(self, client_for, clinic, doctor, receptionist):
        patient = make_patient(clinic, [doctor])
        assert client_for(receptionist).delete(f"{URL}{patient.id}/").status_code == 405


class TestSearch:
    def test_search_by_name_and_phone(self, client_for, clinic, doctor, receptionist):
        make_patient(clinic, [doctor], full_name="Youssef Kamal", phone="01011110000")
        make_patient(clinic, [doctor], full_name="Laila Samir", phone="01022220000")
        client = client_for(receptionist)
        by_name = client.get(URL, {"search": "youssef"}).json()["results"]
        by_phone = client.get(URL, {"search": "0102222"}).json()["results"]
        assert [p["full_name"] for p in by_name] == ["Youssef Kamal"]
        assert [p["full_name"] for p in by_phone] == ["Laila Samir"]

    def test_filter_by_doctor(self, client_for, clinic, doctor, second_doctor):
        staff = testing.make_receptionist(clinic, doctors=[doctor, second_doctor])
        make_patient(clinic, [doctor], full_name="A")
        make_patient(clinic, [second_doctor], full_name="B")
        response = client_for(staff).get(URL, {"doctor": second_doctor.id})
        assert [p["full_name"] for p in response.json()["results"]] == ["B"]

    def test_list_is_paginated(self, client_for, clinic, doctor, receptionist):
        for i in range(30):
            make_patient(clinic, [doctor], full_name=f"P{i:02d}")
        body = client_for(receptionist).get(URL).json()
        assert body["count"] == 30
        assert len(body["results"]) == 25
        assert body["next"]
