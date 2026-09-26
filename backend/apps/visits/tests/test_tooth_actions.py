"""CHART-001..005: dental chart action types and per-visit tooth actions (CR-023)."""

import pytest
from django.contrib.auth.models import Permission

from apps.catalog.models import DentalActionType
from apps.core import testing
from apps.visits.services import complete_visit

URL = "/api/visits/"


@pytest.fixture
def patient(clinic, doctor):
    return testing.make_patient(clinic, [doctor], full_name="Nour Ali")


@pytest.fixture
def visit(patient, doctor):
    return testing.make_active_visit(patient, doctor)


@pytest.fixture
def filling(db):
    return DentalActionType.objects.get(name="Filling", clinic=None)


@pytest.fixture
def extraction(db):
    return DentalActionType.objects.get(name="Extraction", clinic=None)


def mark(client, visit, action_type, tooth="36", **extra):
    return client.post(
        f"{URL}{visit.id}/tooth-actions/",
        {"tooth": tooth, "action_type_id": action_type.id, **extra},
    )


class TestActionTypes:
    def test_defaults_are_seeded_with_colors(self, db):
        """CHART-001: the chart works out of the box; admins change it later."""
        colors = dict(DentalActionType.objects.values_list("name", "color"))
        assert colors == {
            "Caries": "#DC2626",
            "Filling": "#2563EB",
            "Root canal": "#7C3AED",
            "Crown": "#D97706",
            "Extraction": "#475569",
            "Implant": "#0D9488",
            "Scaling": "#16A34A",
        }

    def test_list_available_to_clinic(self, client_for, clinic, other_clinic, doctor, filling):
        DentalActionType.objects.create(name="Bridge", color="#DB2777", clinic=clinic)
        DentalActionType.objects.create(name="Veneer", color="#000000", clinic=other_clinic)
        filling.is_active = False
        filling.save()
        response = client_for(doctor).get("/api/catalog/dental-actions/")
        assert response.status_code == 200
        body = response.json()
        names = [item["name"] for item in body]
        assert "Bridge" in names
        assert "Veneer" not in names
        assert "Filling" not in names
        assert names == sorted(names)
        bridge = next(item for item in body if item["name"] == "Bridge")
        assert set(bridge) == {"id", "name", "code", "color"}
        assert bridge["color"] == "#DB2777"

    def test_list_requires_authentication(self, api_client, db):
        assert api_client.get("/api/catalog/dental-actions/").status_code == 401

    def test_list_is_read_only(self, client_for, doctor):
        response = client_for(doctor).post("/api/catalog/dental-actions/", {"name": "X"})
        assert response.status_code == 405

    def test_admin_manages_action_types(self, admin_site_client):
        response = admin_site_client.post(
            "/admin/catalog/dentalactiontype/add/",
            {"name": "Bridge", "code": "", "color": "#DB2777", "is_active": "on"},
        )
        assert response.status_code == 302
        assert DentalActionType.objects.get(name="Bridge").color == "#DB2777"
        assert admin_site_client.get("/admin/catalog/dentalactiontype/").status_code == 200

    def test_admin_rejects_invalid_color(self, admin_site_client):
        response = admin_site_client.post(
            "/admin/catalog/dentalactiontype/add/",
            {"name": "Bad", "color": "blue", "is_active": "on"},
        )
        assert response.status_code == 200
        assert not DentalActionType.objects.filter(name="Bad").exists()


class TestRecording:
    def test_doctor_marks_tooth(self, client_for, doctor, visit, filling):
        """CHART-002."""
        response = mark(client_for(doctor), visit, filling, notes="Occlusal")
        assert response.status_code == 201, response.content
        [entry] = response.json()["tooth_actions"]
        assert entry["tooth"] == "36"
        assert entry["notes"] == "Occlusal"
        assert entry["action_type"] == {
            "id": filling.id,
            "name": "Filling",
            "code": "D2391",
            "color": "#2563EB",
        }

    def test_primary_teeth(self, client_for, doctor, visit, filling):
        assert mark(client_for(doctor), visit, filling, tooth="55").status_code == 201

    def test_several_actions_on_one_tooth(self, client_for, doctor, visit, filling, extraction):
        client = client_for(doctor)
        mark(client, visit, filling)
        response = mark(client, visit, extraction)
        assert response.status_code == 201
        assert [a["action_type"]["name"] for a in response.json()["tooth_actions"]] == [
            "Filling",
            "Extraction",
        ]

    def test_same_action_twice_on_one_tooth_rejected(self, client_for, doctor, visit, filling):
        client = client_for(doctor)
        mark(client, visit, filling)
        response = mark(client, visit, filling)
        assert response.status_code == 400
        assert response.json()["action_type_id"] == ["Tooth 36 already has this action."]
        assert mark(client, visit, filling, tooth="37").status_code == 201

    @pytest.mark.parametrize("tooth", ["", "19", "00", "90", "56", "1", "abc"])
    def test_invalid_tooth(self, client_for, doctor, visit, filling, tooth):
        response = mark(client_for(doctor), visit, filling, tooth=tooth)
        assert response.status_code == 400
        assert "tooth" in response.json()

    def test_action_type_required(self, client_for, doctor, visit):
        response = client_for(doctor).post(f"{URL}{visit.id}/tooth-actions/", {"tooth": "11"})
        assert response.status_code == 400
        assert "action_type_id" in response.json()

    def test_inactive_action_type_rejected(self, client_for, doctor, visit, filling):
        filling.is_active = False
        filling.save()
        assert mark(client_for(doctor), visit, filling).status_code == 400

    def test_other_clinic_action_type_rejected(self, client_for, other_clinic, doctor, visit):
        foreign = DentalActionType.objects.create(name="Foreign", clinic=other_clinic)
        assert mark(client_for(doctor), visit, foreign).status_code == 400

    def test_remove_tooth_action(self, client_for, doctor, visit, filling):
        client = client_for(doctor)
        entry_id = mark(client, visit, filling).json()["tooth_actions"][0]["id"]
        response = client.delete(f"{URL}{visit.id}/tooth-actions/{entry_id}/")
        assert response.status_code == 200
        assert response.json()["tooth_actions"] == []

    def test_tooth_action_counts_as_outcome(self, client_for, doctor, visit, filling):
        """CR-010 + CR-023."""
        client = client_for(doctor)
        mark(client, visit, filling)
        assert client.post(f"{URL}{visit.id}/complete/").status_code == 200

    def test_retired_action_type_stays_in_history(self, client_for, doctor, visit, filling):
        client = client_for(doctor)
        mark(client, visit, filling)
        filling.is_active = False
        filling.save()
        [entry] = client.get(f"{URL}{visit.id}/").json()["tooth_actions"]
        assert entry["action_type"]["name"] == "Filling"


class TestPermissions:
    """CHART-003: only the owning doctor changes the chart of an active visit."""

    def test_other_doctor_cannot_see_or_mark(self, client_for, clinic, visit, filling):
        other_doctor = testing.make_doctor(clinic)
        visit.patient.doctors.add(other_doctor)
        assert mark(client_for(other_doctor), visit, filling).status_code == 404

    def test_permitted_staff_with_record_permission_still_not_owner(
        self, client_for, clinic, doctor, visit, filling
    ):
        staff = testing.make_assistant(clinic, doctors=[doctor])
        staff.user_permissions.add(Permission.objects.get(codename="record_visit"))
        response = mark(client_for(staff), visit, filling)
        assert response.status_code == 403
        assert "Only the doctor handling this visit" in response.json()["detail"]

    def test_assistant_views_chart_but_cannot_mark(
        self, client_for, doctor, assistant, visit, filling
    ):
        entry_id = mark(client_for(doctor), visit, filling).json()["tooth_actions"][0]["id"]
        client = client_for(assistant)
        body = client.get(f"{URL}{visit.id}/").json()
        assert [a["tooth"] for a in body["tooth_actions"]] == ["36"]
        assert client.get("/api/catalog/dental-actions/").status_code == 200
        assert mark(client, visit, filling, tooth="11").status_code == 403
        response = client.delete(f"{URL}{visit.id}/tooth-actions/{entry_id}/")
        assert response.status_code == 403

    def test_receptionist_cannot_see_chart(self, client_for, receptionist, visit, filling):
        """CR-017."""
        client = client_for(receptionist)
        assert client.get(f"{URL}{visit.id}/").status_code == 403
        assert mark(client, visit, filling).status_code == 403

    def test_completed_visit_chart_is_read_only(self, client_for, doctor, visit, filling):
        client = client_for(doctor)
        entry_id = mark(client, visit, filling).json()["tooth_actions"][0]["id"]
        client.post(f"{URL}{visit.id}/complete/")
        for response in (
            mark(client, visit, filling, tooth="11"),
            client.delete(f"{URL}{visit.id}/tooth-actions/{entry_id}/"),
        ):
            assert response.status_code == 409
            assert response.json()["code"] == "visit_completed"

    def test_unauthenticated(self, api_client, visit, filling):
        assert mark(api_client, visit, filling).status_code == 401


class TestVisitIsolation:
    """CHART-004: every visit has its own chart."""

    def test_actions_do_not_carry_over_to_next_visit(
        self, client_for, doctor, patient, visit, filling
    ):
        client = client_for(doctor)
        mark(client, visit, filling)
        complete_visit(visit, doctor)
        second = testing.make_active_visit(patient, doctor)
        assert client.get(f"{URL}{second.id}/").json()["tooth_actions"] == []
        # The same action on the same tooth is allowed again in a new visit.
        assert mark(client, second, filling).status_code == 201
        history = client.get(URL, {"patient": patient.id}).json()["results"]
        assert [len(v["tooth_actions"]) for v in history] == [1, 1]

    def test_entry_of_another_visit_cannot_be_removed(
        self, client_for, clinic, doctor, visit, filling
    ):
        other_patient = testing.make_patient(clinic, [doctor])
        other_visit = testing.make_active_visit(other_patient, doctor)
        client = client_for(doctor)
        entry_id = mark(client, other_visit, filling).json()["tooth_actions"][0]["id"]
        response = client.delete(f"{URL}{visit.id}/tooth-actions/{entry_id}/")
        assert response.status_code == 404
        assert other_visit.tooth_actions.count() == 1

    def test_duplicate_check_is_per_visit(self, client_for, clinic, doctor, visit, filling):
        other_patient = testing.make_patient(clinic, [doctor])
        other_visit = testing.make_active_visit(other_patient, doctor)
        client = client_for(doctor)
        assert mark(client, other_visit, filling).status_code == 201
        assert mark(client, visit, filling).status_code == 201


def test_visit_admin_shows_tooth_actions(admin_site_client, client_for, doctor, visit, filling):
    mark(client_for(doctor), visit, filling)
    response = admin_site_client.get(f"/admin/visits/visit/{visit.pk}/change/")
    assert response.status_code == 200
    assert b"tooth action" in response.content.lower()
