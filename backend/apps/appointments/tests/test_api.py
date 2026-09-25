"""APPT-001..005, CLINIC-002/003, LIFE-001, CR-007."""

import datetime

import pytest
from django.utils import timezone

from apps.appointments.models import Appointment, AppointmentStatus
from apps.core import testing
from apps.visits.models import Visit, VisitStatus

URL = "/api/appointments/"


def at(hours: float = 1) -> str:
    return (timezone.now() + datetime.timedelta(hours=hours)).isoformat()


@pytest.fixture
def patient(clinic, doctor):
    return testing.make_patient(clinic, [doctor], full_name="Hany Fathy")


class TestCreate:
    def test_reception_creates_appointment(self, client_for, receptionist, patient, doctor):
        response = client_for(receptionist).post(
            URL, {"patient_id": patient.id, "scheduled_at": at(), "notes": "Toothache"}
        )
        assert response.status_code == 201, response.content
        body = response.json()
        assert body["status"] == "SCHEDULED"
        assert body["status_display"] == "Scheduled"
        assert body["patient"]["id"] == patient.id
        assert body["notes"] == "Toothache"

    def test_doctor_auto_selected_for_single_doctor(
        self, client_for, receptionist, patient, doctor
    ):
        """CLINIC-002."""
        response = client_for(receptionist).post(
            URL, {"patient_id": patient.id, "scheduled_at": at()}
        )
        assert response.json()["doctor"]["id"] == doctor.id

    def test_multi_doctor_requires_doctor(self, client_for, clinic, doctor, second_doctor, patient):
        """CLINIC-003."""
        staff = testing.make_receptionist(clinic, doctors=[doctor, second_doctor])
        response = client_for(staff).post(URL, {"patient_id": patient.id, "scheduled_at": at()})
        assert response.status_code == 400
        assert response.json()["doctor_id"] == ["Select a doctor."]

    def test_multi_doctor_selection_links_patient_to_doctor(
        self, client_for, clinic, doctor, second_doctor, patient
    ):
        staff = testing.make_receptionist(clinic, doctors=[doctor, second_doctor])
        response = client_for(staff).post(
            URL, {"patient_id": patient.id, "doctor_id": second_doctor.id, "scheduled_at": at()}
        )
        assert response.status_code == 201
        assert response.json()["doctor"]["id"] == second_doctor.id
        assert set(patient.doctors.all()) == {doctor, second_doctor}

    def test_cannot_book_unpermitted_doctor(self, client_for, receptionist, second_doctor, patient):
        response = client_for(receptionist).post(
            URL, {"patient_id": patient.id, "doctor_id": second_doctor.id, "scheduled_at": at()}
        )
        assert response.status_code == 400
        assert "doctor_id" in response.json()

    def test_cannot_book_invisible_patient(self, client_for, receptionist, clinic, second_doctor):
        hidden = testing.make_patient(clinic, [second_doctor])
        response = client_for(receptionist).post(
            URL, {"patient_id": hidden.id, "scheduled_at": at()}
        )
        assert response.status_code == 400
        assert "patient_id" in response.json()

    @pytest.mark.parametrize("field", ["patient_id", "scheduled_at"])
    def test_required_fields(self, client_for, receptionist, patient, field):
        payload = {"patient_id": patient.id, "scheduled_at": at()}
        payload.pop(field)
        response = client_for(receptionist).post(URL, payload)
        assert response.status_code == 400
        assert field in response.json()

    @pytest.mark.parametrize("role_fixture", ["doctor", "assistant"])
    def test_only_reception_books_by_default(self, request, client_for, patient, role_fixture):
        user = request.getfixturevalue(role_fixture)
        response = client_for(user).post(URL, {"patient_id": patient.id, "scheduled_at": at()})
        assert response.status_code == 403


class TestUpdate:
    def test_reschedule(self, client_for, receptionist, patient, doctor):
        appointment = testing.make_appointment(patient, doctor)
        new_time = at(48)
        response = client_for(receptionist).patch(
            f"{URL}{appointment.id}/", {"scheduled_at": new_time}
        )
        assert response.status_code == 200
        appointment.refresh_from_db()
        assert appointment.scheduled_at == datetime.datetime.fromisoformat(new_time)

    def test_patient_cannot_be_changed(self, client_for, receptionist, clinic, patient, doctor):
        other = testing.make_patient(clinic, [doctor])
        appointment = testing.make_appointment(patient, doctor)
        client_for(receptionist).patch(f"{URL}{appointment.id}/", {"patient_id": other.id})
        appointment.refresh_from_db()
        assert appointment.patient == patient

    def test_reassign_doctor_before_visit(self, client_for, clinic, doctor, second_doctor, patient):
        staff = testing.make_receptionist(clinic, doctors=[doctor, second_doctor])
        appointment = testing.make_appointment(patient, doctor, status=AppointmentStatus.CHECKED_IN)
        response = client_for(staff).patch(
            f"{URL}{appointment.id}/", {"doctor_id": second_doctor.id}
        )
        assert response.status_code == 200
        assert response.json()["doctor"]["id"] == second_doctor.id

    def test_closed_appointment_cannot_change(self, client_for, receptionist, patient, doctor):
        appointment = testing.make_appointment(patient, doctor, status=AppointmentStatus.CANCELLED)
        response = client_for(receptionist).patch(f"{URL}{appointment.id}/", {"notes": "x"})
        assert response.status_code == 409
        assert response.json()["code"] == "invalid_status"


class TestCheckInAndCancel:
    def test_check_in_marks_waiting_for_doctor(self, client_for, receptionist, patient, doctor):
        """APPT-002."""
        appointment = testing.make_appointment(patient, doctor)
        response = client_for(receptionist).post(f"{URL}{appointment.id}/check-in/")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "CHECKED_IN"
        assert body["status_display"] == "Waiting for doctor"
        assert body["checked_in_at"]

    def test_check_in_twice_is_rejected(self, client_for, receptionist, patient, doctor):
        appointment = testing.make_appointment(patient, doctor)
        client = client_for(receptionist)
        client.post(f"{URL}{appointment.id}/check-in/")
        response = client.post(f"{URL}{appointment.id}/check-in/")
        assert response.status_code == 409
        assert response.json()["code"] == "invalid_status"

    def test_doctor_cannot_check_in(self, client_for, doctor, patient):
        appointment = testing.make_appointment(patient, doctor)
        assert client_for(doctor).post(f"{URL}{appointment.id}/check-in/").status_code == 403

    @pytest.mark.parametrize("initial", [AppointmentStatus.SCHEDULED, AppointmentStatus.CHECKED_IN])
    def test_cancel_open_appointment(self, client_for, receptionist, patient, doctor, initial):
        appointment = testing.make_appointment(patient, doctor, status=initial)
        response = client_for(receptionist).post(f"{URL}{appointment.id}/cancel/")
        assert response.status_code == 200
        assert response.json()["status"] == "CANCELLED"

    def test_cancelled_cannot_be_checked_in(self, client_for, receptionist, patient, doctor):
        appointment = testing.make_appointment(patient, doctor, status=AppointmentStatus.CANCELLED)
        response = client_for(receptionist).post(f"{URL}{appointment.id}/check-in/")
        assert response.status_code == 409

    def test_in_visit_cannot_be_cancelled(self, client_for, receptionist, patient, doctor):
        visit = testing.make_active_visit(patient, doctor)
        response = client_for(receptionist).post(f"{URL}{visit.appointment_id}/cancel/")
        assert response.status_code == 409


class TestStartVisit:
    def test_reception_starts_visit_for_checked_in_patient(
        self, client_for, receptionist, patient, doctor
    ):
        """APPT-004, APPT-006: the visit belongs to the appointment's doctor."""
        appointment = testing.make_appointment(patient, doctor, status=AppointmentStatus.CHECKED_IN)
        response = client_for(receptionist).post(f"{URL}{appointment.id}/start-visit/")
        assert response.status_code == 201, response.content
        body = response.json()
        assert body["status"] == "IN_VISIT"
        visit = Visit.objects.get(pk=body["visit_id"])
        assert visit.status == VisitStatus.ACTIVE
        assert visit.doctor == doctor
        assert visit.started_by == receptionist

    def test_doctor_starts_visit_from_own_queue(self, client_for, doctor, patient):
        appointment = testing.make_appointment(patient, doctor, status=AppointmentStatus.CHECKED_IN)
        response = client_for(doctor).post(f"{URL}{appointment.id}/start-visit/")
        assert response.status_code == 201

    def test_assistant_cannot_start_visit(self, client_for, assistant, patient, doctor):
        appointment = testing.make_appointment(patient, doctor, status=AppointmentStatus.CHECKED_IN)
        assert client_for(assistant).post(f"{URL}{appointment.id}/start-visit/").status_code == 403

    def test_visit_requires_check_in(self, client_for, receptionist, patient, doctor):
        appointment = testing.make_appointment(patient, doctor)
        response = client_for(receptionist).post(f"{URL}{appointment.id}/start-visit/")
        assert response.status_code == 409
        assert response.json()["code"] == "invalid_status"

    def test_second_active_visit_is_rejected(self, client_for, receptionist, patient, doctor):
        """APPT-005."""
        testing.make_active_visit(patient, doctor)
        second = testing.make_appointment(patient, doctor, status=AppointmentStatus.CHECKED_IN)
        response = client_for(receptionist).post(f"{URL}{second.id}/start-visit/")
        assert response.status_code == 409
        assert response.json() == {
            "detail": "This patient is already in an active visit.",
            "code": "active_visit_exists",
        }
        second.refresh_from_db()
        assert second.status == AppointmentStatus.CHECKED_IN

    def test_second_active_visit_rejected_across_doctors(
        self, client_for, clinic, doctor, second_doctor, patient
    ):
        staff = testing.make_receptionist(clinic, doctors=[doctor, second_doctor])
        testing.make_active_visit(patient, doctor)
        other = testing.make_appointment(
            patient, second_doctor, status=AppointmentStatus.CHECKED_IN
        )
        response = client_for(staff).post(f"{URL}{other.id}/start-visit/")
        assert response.status_code == 409

    def test_new_visit_allowed_after_completion(self, client_for, receptionist, patient, doctor):
        visit = testing.make_active_visit(patient, doctor)
        visit.notes = "done"
        visit.save()
        from apps.visits.services import complete_visit

        complete_visit(visit, doctor)
        second = testing.make_appointment(patient, doctor, status=AppointmentStatus.CHECKED_IN)
        assert client_for(receptionist).post(f"{URL}{second.id}/start-visit/").status_code == 201


class TestQueueAndListing:
    def test_queue_lists_waiting_and_in_visit(self, client_for, clinic, doctor, receptionist):
        """APPT-003."""
        early = testing.make_patient(clinic, [doctor], full_name="Early")
        late = testing.make_patient(clinic, [doctor], full_name="Late")
        busy = testing.make_patient(clinic, [doctor], full_name="Busy")
        client = client_for(receptionist)
        for p in (early, late):
            appt = testing.make_appointment(p, doctor)
            client.post(f"{URL}{appt.id}/check-in/")
        testing.make_active_visit(busy, doctor)
        testing.make_appointment(testing.make_patient(clinic, [doctor]), doctor)  # just scheduled

        body = client.get(f"{URL}queue/").json()
        assert [a["patient"]["full_name"] for a in body["waiting"]] == ["Early", "Late"]
        assert [a["patient"]["full_name"] for a in body["in_visit"]] == ["Busy"]
        assert body["in_visit"][0]["visit_id"]

    def test_queue_is_scoped_per_doctor(self, client_for, clinic, doctor, second_doctor):
        mine = testing.make_patient(clinic, [doctor])
        theirs = testing.make_patient(clinic, [second_doctor])
        testing.make_appointment(mine, doctor, status=AppointmentStatus.CHECKED_IN)
        testing.make_appointment(theirs, second_doctor, status=AppointmentStatus.CHECKED_IN)
        waiting = client_for(doctor).get(f"{URL}queue/").json()["waiting"]
        assert [a["patient"]["id"] for a in waiting] == [mine.id]

    def test_queue_filter_by_doctor(self, client_for, clinic, doctor, second_doctor):
        staff = testing.make_receptionist(clinic, doctors=[doctor, second_doctor])
        for d in (doctor, second_doctor):
            testing.make_appointment(
                testing.make_patient(clinic, [d]), d, status=AppointmentStatus.CHECKED_IN
            )
        waiting = client_for(staff).get(f"{URL}queue/", {"doctor": second_doctor.id}).json()
        assert [a["doctor"]["id"] for a in waiting["waiting"]] == [second_doctor.id]

    def test_assistant_can_view_queue(self, client_for, assistant):
        assert client_for(assistant).get(f"{URL}queue/").status_code == 200

    def test_list_filters(self, client_for, receptionist, patient, doctor):
        now = timezone.now()
        today = testing.make_appointment(patient, doctor, when=now)
        testing.make_appointment(patient, doctor, when=now + datetime.timedelta(days=3))
        cancelled = testing.make_appointment(
            patient, doctor, when=now, status=AppointmentStatus.CANCELLED
        )
        client = client_for(receptionist)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        in_range = client.get(
            URL,
            {
                "scheduled_from": day_start.isoformat(),
                "scheduled_to": (day_start + datetime.timedelta(days=1)).isoformat(),
            },
        ).json()["results"]
        assert {a["id"] for a in in_range} == {today.id, cancelled.id}
        by_status = client.get(URL, {"status": "SCHEDULED,CHECKED_IN"}).json()["results"]
        assert cancelled.id not in {a["id"] for a in by_status}
        by_date = client.get(URL, {"date": timezone.localdate(now).isoformat()}).json()["results"]
        assert {a["id"] for a in by_date} == {today.id, cancelled.id}

    @pytest.mark.parametrize(
        "params",
        [
            {"status": "NOPE"},
            {"date": "2024-13-01"},
            {"scheduled_from": "tomorrow"},
            {"doctor": "x"},
        ],
    )
    def test_invalid_filters(self, client_for, receptionist, params):
        assert client_for(receptionist).get(URL, params).status_code == 400

    def test_other_clinic_appointments_invisible(self, client_for, receptionist, other_clinic):
        foreign_doctor = testing.make_doctor(other_clinic)
        foreign = testing.make_appointment(
            testing.make_patient(other_clinic, [foreign_doctor]), foreign_doctor
        )
        client = client_for(receptionist)
        assert client.get(URL).json()["count"] == 0
        assert client.get(f"{URL}{foreign.id}/").status_code == 404
        assert client.post(f"{URL}{foreign.id}/check-in/").status_code == 404


def test_one_active_visit_constraint_in_database(clinic, doctor):
    """APPT-005 is also enforced by the database."""
    from django.db import IntegrityError

    patient = testing.make_patient(clinic, [doctor])
    testing.make_active_visit(patient, doctor)
    appointment = testing.make_appointment(patient, doctor)
    with pytest.raises(IntegrityError):
        Visit.objects.create(clinic=clinic, patient=patient, doctor=doctor, appointment=appointment)


def test_appointment_admin_pages_load(admin_site_client, clinic, doctor):
    appointment = testing.make_appointment(testing.make_patient(clinic, [doctor]), doctor)
    assert admin_site_client.get("/admin/appointments/appointment/").status_code == 200
    url = f"/admin/appointments/appointment/{appointment.pk}/change/"
    assert admin_site_client.get(url).status_code == 200
    assert Appointment.objects.count() == 1
