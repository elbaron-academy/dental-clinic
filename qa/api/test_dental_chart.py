"""Acceptance: visits.md dental chart (CHART-001..004, CR-023).

Functional, permission and visit-isolation checks through the public API.
"""

from apps.catalog.models import DentalActionType

from .helpers import book, check_in, register, start

ACTIONS = "/api/catalog/dental-actions/"


def active_visit(reception, patient_id, doctor_id):
    appointment = book(reception, patient_id, doctor_id=doctor_id)
    check_in(reception, appointment["id"])
    response = start(reception, appointment["id"])
    assert response.status_code == 201, response.content
    return response.json()["visit_id"]


def action_ids(client):
    return {item["name"]: item["id"] for item in client.get(ACTIONS).json()}


def mark(client, visit_id, tooth, action_type_id, **extra):
    return client.post(
        f"/api/visits/{visit_id}/tooth-actions/",
        {"tooth": tooth, "action_type_id": action_type_id, **extra},
    )


# --- Action types (CHART-001) -------------------------------------------------


def test_default_action_types_have_colors(smile, login):
    body = login(smile.doctor_a).get(ACTIONS).json()
    names = [item["name"] for item in body]
    for expected in ("Caries", "Filling", "Root canal", "Crown", "Extraction", "Implant"):
        assert expected in names
    for item in body:
        assert item["color"].startswith("#") and len(item["color"]) == 7


def test_action_types_follow_clinic_catalog_rules(smile, other, login):
    DentalActionType.objects.create(name="Smile bridge", color="#DB2777", clinic=smile.clinic)
    DentalActionType.objects.create(name="Other veneer", color="#000000", clinic=other.clinic)
    DentalActionType.objects.filter(name="Implant").update(is_active=False)
    names = set(action_ids(login(smile.receptionist)))
    assert "Smile bridge" in names
    assert "Other veneer" not in names
    assert "Implant" not in names


# --- Recording (CHART-002) ----------------------------------------------------


def test_doctor_charts_teeth_during_visit(smile, login):
    reception = login(smile.receptionist)
    doctor = login(smile.doctor_a)
    patient = register(reception, doctor_ids=[smile.doctor_a.id])
    visit_id = active_visit(reception, patient["id"], smile.doctor_a.id)
    ids = action_ids(doctor)

    assert mark(doctor, visit_id, "36", ids["Caries"]).status_code == 201
    assert mark(doctor, visit_id, "36", ids["Filling"], notes="MO").status_code == 201
    assert mark(doctor, visit_id, "55", ids["Extraction"]).status_code == 201
    chart = doctor.get(f"/api/visits/{visit_id}/").json()["tooth_actions"]
    assert [(a["tooth"], a["action_type"]["name"], a["notes"]) for a in chart] == [
        ("36", "Caries", ""),
        ("36", "Filling", "MO"),
        ("55", "Extraction", ""),
    ]
    assert all(a["action_type"]["color"] for a in chart)

    duplicate = mark(doctor, visit_id, "36", ids["Filling"])
    assert duplicate.status_code == 400
    assert "action_type_id" in duplicate.json()
    for tooth in ("19", "99", "00", ""):
        assert mark(doctor, visit_id, tooth, ids["Filling"]).status_code == 400

    removed = doctor.delete(f"/api/visits/{visit_id}/tooth-actions/{chart[0]['id']}/")
    assert removed.status_code == 200
    assert [a["action_type"]["name"] for a in removed.json()["tooth_actions"]] == [
        "Filling",
        "Extraction",
    ]

    # A charted tooth is a session outcome (CR-010), and the chart stays in history.
    assert doctor.post(f"/api/visits/{visit_id}/complete/").status_code == 200
    history = doctor.get("/api/visits/", {"patient": patient["id"]}).json()["results"]
    assert len(history[0]["tooth_actions"]) == 2


# --- Permissions (CHART-003) ---------------------------------------------------


def test_only_owning_doctor_changes_the_chart(smile, other, login):
    reception = login(smile.receptionist)
    doctor_a = login(smile.doctor_a)
    patient = register(reception, doctor_ids=[smile.doctor_a.id, smile.doctor_b.id])
    visit_id = active_visit(reception, patient["id"], smile.doctor_a.id)
    ids = action_ids(doctor_a)
    entry = mark(doctor_a, visit_id, "11", ids["Crown"]).json()["tooth_actions"][0]

    # Another doctor of the same patient does not even see the visit (CR-009).
    doctor_b = login(smile.doctor_b)
    assert mark(doctor_b, visit_id, "12", ids["Crown"]).status_code == 404
    assert doctor_b.delete(f"/api/visits/{visit_id}/tooth-actions/{entry['id']}/").status_code == 404

    # The assistant sees the chart but cannot change it.
    assistant = login(smile.assistant)
    assert assistant.get(f"/api/visits/{visit_id}/").json()["tooth_actions"][0]["tooth"] == "11"
    assert mark(assistant, visit_id, "12", ids["Crown"]).status_code == 403
    assert assistant.delete(f"/api/visits/{visit_id}/tooth-actions/{entry['id']}/").status_code == 403

    # Reception does not see clinical content (CR-017).
    assert reception.get(f"/api/visits/{visit_id}/").status_code == 403
    assert mark(reception, visit_id, "12", ids["Crown"]).status_code == 403

    # Another clinic cannot reach it at all.
    assert mark(login(other.doctor_a), visit_id, "12", ids["Crown"]).status_code == 404

    # Completed visits are locked.
    doctor_a.post(f"/api/visits/{visit_id}/complete/")
    locked = mark(doctor_a, visit_id, "12", ids["Crown"])
    assert locked.status_code == 409
    assert locked.json()["code"] == "visit_completed"
    assert doctor_a.delete(f"/api/visits/{visit_id}/tooth-actions/{entry['id']}/").status_code == 409


# --- Visit isolation (CHART-004) -----------------------------------------------


def test_each_visit_has_its_own_chart(smile, login):
    reception = login(smile.receptionist)
    doctor = login(smile.doctor_a)
    patient = register(reception, doctor_ids=[smile.doctor_a.id])
    ids = action_ids(doctor)

    first = active_visit(reception, patient["id"], smile.doctor_a.id)
    first_entry = mark(doctor, first, "46", ids["Root canal"]).json()["tooth_actions"][0]
    doctor.post(f"/api/visits/{first}/complete/")

    second = active_visit(reception, patient["id"], smile.doctor_a.id)
    assert doctor.get(f"/api/visits/{second}/").json()["tooth_actions"] == []
    assert mark(doctor, second, "46", ids["Root canal"]).status_code == 201
    assert mark(doctor, second, "46", ids["Crown"]).status_code == 201

    # An entry of the first visit cannot be removed through the second one.
    response = doctor.delete(f"/api/visits/{second}/tooth-actions/{first_entry['id']}/")
    assert response.status_code == 404

    first_chart = doctor.get(f"/api/visits/{first}/").json()["tooth_actions"]
    second_chart = doctor.get(f"/api/visits/{second}/").json()["tooth_actions"]
    assert [a["action_type"]["name"] for a in first_chart] == ["Root canal"]
    assert [a["action_type"]["name"] for a in second_chart] == ["Root canal", "Crown"]


def test_charts_of_two_patients_do_not_mix(smile, login):
    reception = login(smile.receptionist)
    doctor = login(smile.doctor_a)
    ids = action_ids(doctor)
    one = register(reception, "Chart One", doctor_ids=[smile.doctor_a.id])
    two = register(reception, "Chart Two", doctor_ids=[smile.doctor_a.id])
    visit_one = active_visit(reception, one["id"], smile.doctor_a.id)
    visit_two = active_visit(reception, two["id"], smile.doctor_a.id)
    mark(doctor, visit_one, "21", ids["Caries"])
    assert doctor.get(f"/api/visits/{visit_two}/").json()["tooth_actions"] == []


# --- Doctor adds actions (CHART-006, CR-024) ----------------------------------


def test_doctor_adds_a_new_action_and_marks_it(smile, other, login):
    reception = login(smile.receptionist)
    doctor = login(smile.doctor_a)
    patient = register(reception, doctor_ids=[smile.doctor_a.id])
    visit_id = active_visit(reception, patient["id"], smile.doctor_a.id)

    created = doctor.post(ACTIONS, {"name": "Veneer", "color": "#db2777"})
    assert created.status_code == 201, created.content
    veneer = created.json()
    assert veneer["color"] == "#DB2777"
    marked = mark(doctor, visit_id, "21", veneer["id"])
    assert marked.status_code == 201
    assert marked.json()["tooth_actions"][0]["action_type"]["name"] == "Veneer"

    # Shared with the clinic (the other doctor, the assistant), not with other clinics.
    assert "Veneer" in action_ids(login(smile.doctor_b))
    assert "Veneer" in action_ids(login(smile.assistant))
    assert "Veneer" not in action_ids(login(other.doctor_a))

    # No duplicates of an existing action (case-insensitive); color must be hex.
    assert doctor.post(ACTIONS, {"name": "veneer", "color": "#000000"}).status_code == 400
    assert doctor.post(ACTIONS, {"name": "Filling", "color": "#000000"}).status_code == 400
    assert doctor.post(ACTIONS, {"name": "Sealant", "color": "green"}).status_code == 400


def test_only_doctors_add_actions(smile, login):
    for user in (smile.assistant, smile.receptionist):
        response = login(user).post(ACTIONS, {"name": "Nope", "color": "#000000"})
        assert response.status_code == 403
