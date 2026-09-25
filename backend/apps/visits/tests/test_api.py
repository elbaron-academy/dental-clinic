"""VISIT-001..008, MED-002, DX-001, APPT-006, LIFE-002/003."""

import datetime

import pytest
from django.utils import timezone

from apps.appointments.models import AppointmentStatus
from apps.catalog.models import Medication, Procedure
from apps.core import testing
from apps.visits.models import VisitStatus

URL = "/api/visits/"


@pytest.fixture
def patient(clinic, doctor):
    return testing.make_patient(clinic, [doctor], full_name="Nour Ali")


@pytest.fixture
def visit(patient, doctor):
    return testing.make_active_visit(patient, doctor)


@pytest.fixture
def filling(db):
    return Procedure.objects.create(name="Composite filling", code="D2391")


@pytest.fixture
def amoxicillin(db):
    return Medication.objects.create(name="Amoxicillin", details="500 mg capsule")


def future(days=7):
    return (timezone.now() + datetime.timedelta(days=days)).isoformat()


class TestRecording:
    def test_doctor_records_notes_diagnosis_treatment(self, client_for, doctor, visit):
        response = client_for(doctor).patch(
            f"{URL}{visit.id}/",
            {
                "notes": "Pain on cold drinks",
                "diagnosis": "Reversible pulpitis #36",
                "treatment": "Composite restoration",
            },
        )
        assert response.status_code == 200, response.content
        body = response.json()
        assert body["notes"] == "Pain on cold drinks"
        assert body["diagnosis"] == "Reversible pulpitis #36"
        assert body["treatment"] == "Composite restoration"
        assert body["can_edit"] is True

    def test_status_cannot_be_patched(self, client_for, doctor, visit):
        client_for(doctor).patch(f"{URL}{visit.id}/", {"status": "COMPLETED"})
        visit.refresh_from_db()
        assert visit.status == VisitStatus.ACTIVE

    def test_add_procedure_with_catalog_item_and_tooth(self, client_for, doctor, visit, filling):
        response = client_for(doctor).post(
            f"{URL}{visit.id}/procedures/", {"procedure_id": filling.id, "tooth": "36"}
        )
        assert response.status_code == 201, response.content
        [entry] = response.json()["procedures"]
        assert entry["procedure"] == {
            "id": filling.id,
            "name": "Composite filling",
            "code": "D2391",
        }
        assert entry["tooth"] == "36"

    def test_add_procedure_free_text(self, client_for, doctor, visit):
        response = client_for(doctor).post(
            f"{URL}{visit.id}/procedures/", {"notes": "Occlusal adjustment", "tooth": "55"}
        )
        assert response.status_code == 201
        assert response.json()["procedures"][0]["procedure"] is None

    def test_add_procedure_requires_item_or_notes(self, client_for, doctor, visit):
        response = client_for(doctor).post(f"{URL}{visit.id}/procedures/", {"tooth": "11"})
        assert response.status_code == 400

    @pytest.mark.parametrize("tooth", ["19", "00", "90", "56", "1", "abc"])
    def test_add_procedure_invalid_tooth(self, client_for, doctor, visit, filling, tooth):
        response = client_for(doctor).post(
            f"{URL}{visit.id}/procedures/", {"procedure_id": filling.id, "tooth": tooth}
        )
        assert response.status_code == 400
        assert "tooth" in response.json()

    def test_add_procedure_inactive_catalog_item_rejected(self, client_for, doctor, visit):
        retired = Procedure.objects.create(name="Retired", is_active=False)
        response = client_for(doctor).post(
            f"{URL}{visit.id}/procedures/", {"procedure_id": retired.id}
        )
        assert response.status_code == 400

    def test_remove_procedure(self, client_for, doctor, visit, filling):
        client = client_for(doctor)
        entry_id = client.post(f"{URL}{visit.id}/procedures/", {"procedure_id": filling.id}).json()[
            "procedures"
        ][0]["id"]
        response = client.delete(f"{URL}{visit.id}/procedures/{entry_id}/")
        assert response.status_code == 200
        assert response.json()["procedures"] == []

    def test_add_medication_with_quantity_and_duration(
        self, client_for, doctor, visit, amoxicillin
    ):
        response = client_for(doctor).post(
            f"{URL}{visit.id}/medications/",
            {"medication_id": amoxicillin.id, "quantity": "21 capsules", "duration": "7 days"},
        )
        assert response.status_code == 201, response.content
        [entry] = response.json()["medications"]
        assert entry["medication"]["name"] == "Amoxicillin"
        assert entry["quantity"] == "21 capsules"
        assert entry["duration"] == "7 days"

    @pytest.mark.parametrize("missing", ["medication_id", "quantity", "duration"])
    def test_add_medication_requires_fields(self, client_for, doctor, visit, amoxicillin, missing):
        payload = {"medication_id": amoxicillin.id, "quantity": "10", "duration": "5 days"}
        payload.pop(missing)
        response = client_for(doctor).post(f"{URL}{visit.id}/medications/", payload)
        assert response.status_code == 400
        assert missing in response.json()

    def test_remove_medication(self, client_for, doctor, visit, amoxicillin):
        client = client_for(doctor)
        entry_id = client.post(
            f"{URL}{visit.id}/medications/",
            {"medication_id": amoxicillin.id, "quantity": "1", "duration": "1 day"},
        ).json()["medications"][0]["id"]
        response = client.delete(f"{URL}{visit.id}/medications/{entry_id}/")
        assert response.json()["medications"] == []

    def test_follow_up_creates_scheduled_appointment(self, client_for, doctor, visit):
        """VISIT-006."""
        response = client_for(doctor).post(
            f"{URL}{visit.id}/follow-ups/", {"scheduled_at": future(), "notes": "Check filling"}
        )
        assert response.status_code == 201, response.content
        [follow_up] = response.json()["follow_ups"]
        assert follow_up["status"] == "SCHEDULED"
        assert follow_up["notes"] == "Check filling"
        appointment = visit.follow_ups.get()
        assert appointment.doctor == doctor
        assert appointment.patient == visit.patient

    def test_follow_up_must_be_in_future(self, client_for, doctor, visit):
        response = client_for(doctor).post(
            f"{URL}{visit.id}/follow-ups/", {"scheduled_at": future(-1)}
        )
        assert response.status_code == 400
        assert "scheduled_at" in response.json()


class TestOwnership:
    """APPT-006: only the doctor handling the visit records and completes it."""

    def test_only_owning_doctor_can_record(self, client_for, clinic, doctor, visit):
        other_doctor = testing.make_doctor(clinic)
        visit.patient.doctors.add(other_doctor)
        response = client_for(other_doctor).patch(f"{URL}{visit.id}/", {"notes": "x"})
        assert response.status_code == 404  # Not even visible: another doctor's visit.

    def test_only_owning_doctor_even_with_visibility(self, client_for, clinic, doctor, visit):
        from django.contrib.auth.models import Permission

        staff = testing.make_assistant(clinic, doctors=[doctor])
        staff.user_permissions.add(Permission.objects.get(codename="record_visit"))
        response = client_for(staff).patch(f"{URL}{visit.id}/", {"notes": "x"})
        assert response.status_code == 403
        assert "Only the doctor handling this visit" in response.json()["detail"]

    def test_assistant_can_view_but_not_record(self, client_for, assistant, visit):
        client = client_for(assistant)
        response = client.get(f"{URL}{visit.id}/")
        assert response.status_code == 200
        assert response.json()["can_edit"] is False
        assert client.patch(f"{URL}{visit.id}/", {"notes": "x"}).status_code == 403
        assert client.post(f"{URL}{visit.id}/complete/").status_code == 403

    def test_receptionist_cannot_view_clinical_record(self, client_for, receptionist, visit):
        """CR-017."""
        assert client_for(receptionist).get(f"{URL}{visit.id}/").status_code == 403
        assert client_for(receptionist).get(URL).status_code == 403


class TestCompletion:
    def test_complete_after_recording(self, client_for, doctor, visit):
        """VISIT-007."""
        client = client_for(doctor)
        client.patch(f"{URL}{visit.id}/", {"diagnosis": "Caries"})
        response = client.post(f"{URL}{visit.id}/complete/")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "COMPLETED"
        assert body["completed_at"]
        assert body["can_edit"] is False
        visit.appointment.refresh_from_db()
        assert visit.appointment.status == AppointmentStatus.COMPLETED

    def test_complete_with_procedure_only(self, client_for, doctor, visit, filling):
        client = client_for(doctor)
        client.post(f"{URL}{visit.id}/procedures/", {"procedure_id": filling.id})
        assert client.post(f"{URL}{visit.id}/complete/").status_code == 200

    def test_cannot_complete_without_outcome(self, client_for, doctor, visit):
        """CR-010."""
        response = client_for(doctor).post(f"{URL}{visit.id}/complete/")
        assert response.status_code == 409
        assert response.json()["code"] == "outcome_required"

    def test_completed_visit_is_read_only(self, client_for, doctor, visit, amoxicillin):
        client = client_for(doctor)
        client.patch(f"{URL}{visit.id}/", {"notes": "Done"})
        client.post(f"{URL}{visit.id}/complete/")
        for method, path, data in [
            ("patch", "", {"notes": "changed"}),
            ("post", "procedures/", {"notes": "x"}),
            (
                "post",
                "medications/",
                {"medication_id": amoxicillin.id, "quantity": "1", "duration": "1"},
            ),
            ("post", "follow-ups/", {"scheduled_at": future()}),
            ("post", "complete/", {}),
        ]:
            response = getattr(client, method)(f"{URL}{visit.id}/{path}", data)
            assert response.status_code == 409, path
            assert response.json()["code"] == "visit_completed"


class TestHistory:
    def test_history_empty_for_new_patient(self, client_for, doctor, clinic):
        """LIFE-002."""
        newcomer = testing.make_patient(clinic, [doctor])
        response = client_for(doctor).get(URL, {"patient": newcomer.id})
        assert response.status_code == 200
        assert response.json()["results"] == []

    def test_history_keeps_completed_visits(self, client_for, doctor, patient, assistant):
        """VISIT-008, LIFE-003."""
        from apps.visits.services import complete_visit

        first = testing.make_active_visit(patient, doctor)
        first.diagnosis = "Gingivitis"
        first.save()
        complete_visit(first, doctor)
        second = testing.make_active_visit(patient, doctor)

        for user in (doctor, assistant):
            results = client_for(user).get(URL, {"patient": patient.id}).json()["results"]
            assert [v["id"] for v in results] == [second.id, first.id]
            assert results[1]["status"] == "COMPLETED"
            assert results[1]["diagnosis"] == "Gingivitis"

    def test_history_filter_by_status(self, client_for, doctor, patient, visit):
        results = client_for(doctor).get(URL, {"status": "COMPLETED"}).json()["results"]
        assert results == []

    def test_history_scoped_to_permitted_doctors(self, client_for, clinic, doctor, patient):
        """CR-009 strict default."""
        other_doctor = testing.make_doctor(clinic)
        patient.doctors.add(other_doctor)
        testing.make_active_visit(patient, other_doctor)
        assert client_for(doctor).get(URL, {"patient": patient.id}).json()["results"] == []


def test_visit_admin_pages_load(admin_site_client, visit):
    assert admin_site_client.get("/admin/visits/visit/").status_code == 200
    assert admin_site_client.get(f"/admin/visits/visit/{visit.pk}/change/").status_code == 200
