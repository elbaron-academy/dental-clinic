"""Acceptance: authentication.md, users-and-roles.md (AUTH-001..003)."""

import pytest

from .conftest import PASSWORD


@pytest.mark.parametrize(
    ("attr", "role"),
    [("doctor_a", "DOCTOR"), ("assistant", "ASSISTANT"), ("receptionist", "RECEPTIONIST")],
)
def test_all_roles_log_in_with_phone_and_password(smile, login, attr, role):
    client = login(getattr(smile, attr), role=role)
    me = client.get("/api/auth/me/").json()
    assert me["role"] == role
    assert me["clinic"]["name"] == "Smile"


def test_formatted_phone_is_accepted(smile, api_client_factory):
    client = api_client_factory()
    phone = smile.doctor_a.phone
    formatted = f"{phone[:4]} {phone[4:7]}-{phone[7:]}"
    response = client.post("/api/auth/login/", {"phone": formatted, "password": PASSWORD})
    assert response.status_code == 200


@pytest.mark.parametrize("username", ["dr.amal", "DR.Amal", " dr.amal "])
def test_username_login(smile, api_client_factory, username):
    smile.doctor_a.username = "dr.amal"
    smile.doctor_a.save()
    response = api_client_factory().post(
        "/api/auth/login/", {"identifier": username, "password": PASSWORD}
    )
    assert response.status_code == 200
    assert response.json()["user"]["id"] == smile.doctor_a.id


def test_identifier_accepts_phone(smile, api_client_factory):
    response = api_client_factory().post(
        "/api/auth/login/", {"identifier": smile.doctor_a.phone, "password": PASSWORD}
    )
    assert response.status_code == 200


def test_unknown_username_or_wrong_password_is_refused(smile, api_client_factory):
    smile.doctor_a.username = "dr.amal"
    smile.doctor_a.save()
    client = api_client_factory()
    for body in [
        {"identifier": "nobody", "password": PASSWORD},
        {"identifier": "dr.amal", "password": "wrong"},
    ]:
        response = client.post("/api/auth/login/", body)
        assert response.status_code == 400
        assert response.json()["code"] == "invalid_credentials"


def test_username_login_respects_portal_role(smile, api_client_factory):
    smile.receptionist.username = "rana"
    smile.receptionist.save()
    response = api_client_factory().post(
        "/api/auth/login/", {"identifier": "rana", "password": PASSWORD, "role": "DOCTOR"}
    )
    assert response.status_code == 400
    assert response.json()["code"] == "role_mismatch"


def test_there_is_no_foreign_password_flow(api_client_factory, db):
    """AUTH-003: no alternative password endpoint exists."""
    client = api_client_factory()
    for path in ["/api/auth/foreign-password/", "/api/auth/password/", "/api/auth/token/"]:
        assert client.post(path, {}).status_code == 404


def test_wrong_portal_is_refused(smile, api_client_factory):
    client = api_client_factory()
    response = client.post(
        "/api/auth/login/",
        {"phone": smile.assistant.phone, "password": PASSWORD, "role": "RECEPTIONIST"},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "role_mismatch"


def test_role_permissions_are_exposed_for_role_aware_ui(smile, login):
    reception = login(smile.receptionist).get("/api/auth/me/").json()
    doctor = login(smile.doctor_a).get("/api/auth/me/").json()
    assert "patients.add_patient" in reception["permissions"]
    assert "visits.record_visit" not in reception["permissions"]
    assert "visits.record_visit" in doctor["permissions"]
    assert "patients.add_patient" in doctor["permissions"]  # CR-021
    assert "appointments.add_appointment" in doctor["permissions"]  # CR-022
    assert "appointments.check_in_appointment" not in doctor["permissions"]
    assert "payments.add_payment" not in doctor["permissions"]


def test_logout_ends_the_session(smile, login):
    client = login(smile.doctor_a)
    assert client.post("/api/auth/logout/").status_code == 204
    assert client.get("/api/auth/me/").status_code == 401

