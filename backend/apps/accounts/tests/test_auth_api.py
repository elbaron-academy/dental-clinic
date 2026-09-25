"""AUTH-001, AUTH-003: phone number + password login for every role."""

import pytest
from rest_framework.authtoken.models import Token

from apps.accounts.models import Role
from apps.core import testing

LOGIN_URL = "/api/auth/login/"


@pytest.mark.parametrize("role", [Role.DOCTOR, Role.ASSISTANT, Role.RECEPTIONIST])
def test_every_role_logs_in_with_phone_and_password(api_client, clinic, role):
    user = testing.make_user(role, clinic, phone="01011112222")
    response = api_client.post(
        LOGIN_URL, {"phone": "0101 111 2222", "password": testing.DEFAULT_PASSWORD}
    )
    assert response.status_code == 200, response.content
    body = response.json()
    assert body["token"] == Token.objects.get(user=user).key
    assert body["user"]["role"] == role
    assert body["user"]["clinic"]["name"] == clinic.name


def test_wrong_password_is_rejected(api_client, doctor):
    response = api_client.post(LOGIN_URL, {"phone": doctor.phone, "password": "wrong"})
    assert response.status_code == 400
    assert response.json() == {
        "detail": "Invalid phone number or password.",
        "code": "invalid_credentials",
    }


def test_unknown_phone_is_rejected_with_same_message(api_client, db):
    response = api_client.post(LOGIN_URL, {"phone": "0109999999", "password": "whatever"})
    assert response.status_code == 400
    assert response.json()["code"] == "invalid_credentials"


def test_inactive_user_cannot_log_in(api_client, doctor):
    doctor.is_active = False
    doctor.save()
    response = api_client.post(
        LOGIN_URL, {"phone": doctor.phone, "password": testing.DEFAULT_PASSWORD}
    )
    assert response.status_code == 400
    assert response.json()["code"] == "invalid_credentials"


def test_username_field_is_not_accepted(api_client, doctor):
    """AUTH-003: there is no username login."""
    response = api_client.post(
        LOGIN_URL, {"username": doctor.phone, "password": testing.DEFAULT_PASSWORD}
    )
    assert response.status_code == 400
    assert "phone" in response.json()


def test_login_requires_both_fields(api_client, db):
    response = api_client.post(LOGIN_URL, {})
    assert response.status_code == 400
    assert set(response.json()) == {"phone", "password"}


def test_role_mismatch_is_refused_without_token(api_client, receptionist):
    """CR-003: role-specific login pages only accept their role."""
    response = api_client.post(
        LOGIN_URL,
        {"phone": receptionist.phone, "password": testing.DEFAULT_PASSWORD, "role": Role.DOCTOR},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "role_mismatch"
    assert "Receptionist" in response.json()["detail"]
    assert not Token.objects.filter(user=receptionist).exists()


def test_matching_role_is_accepted(api_client, doctor):
    response = api_client.post(
        LOGIN_URL,
        {"phone": doctor.phone, "password": testing.DEFAULT_PASSWORD, "role": Role.DOCTOR},
    )
    assert response.status_code == 200


def test_platform_admin_without_clinic_cannot_use_clinic_app(api_client, django_user_model):
    django_user_model.objects.create_superuser(
        phone="01000000077", password=testing.DEFAULT_PASSWORD, full_name="Admin"
    )
    response = api_client.post(
        LOGIN_URL, {"phone": "01000000077", "password": testing.DEFAULT_PASSWORD}
    )
    assert response.status_code == 400
    assert response.json()["code"] == "no_clinic_access"


def test_inactive_clinic_blocks_login(api_client, clinic, doctor):
    clinic.is_active = False
    clinic.save()
    response = api_client.post(
        LOGIN_URL, {"phone": doctor.phone, "password": testing.DEFAULT_PASSWORD}
    )
    assert response.json()["code"] == "no_clinic_access"


def test_login_is_throttled(api_client, doctor, monkeypatch):
    """CR-019: repeated login attempts are rate limited."""
    from rest_framework.throttling import ScopedRateThrottle

    monkeypatch.setattr(
        ScopedRateThrottle,
        "THROTTLE_RATES",
        {**ScopedRateThrottle.THROTTLE_RATES, "login": "3/min"},
    )
    codes = [
        api_client.post(LOGIN_URL, {"phone": doctor.phone, "password": "bad"}).status_code
        for _ in range(4)
    ]
    assert codes == [400, 400, 400, 429]


def test_me_returns_profile_permissions_and_doctors(client_for, receptionist, doctor):
    response = client_for(receptionist).get("/api/auth/me/")
    assert response.status_code == 200
    body = response.json()
    assert body["full_name"] == receptionist.full_name
    assert body["role"] == Role.RECEPTIONIST
    assert body["role_display"] == "Receptionist"
    assert body["permitted_doctors"] == [{"id": doctor.id, "full_name": doctor.full_name}]
    assert body["clinic"]["doctor_count"] == 1
    assert isinstance(body["permissions"], list)


def test_me_requires_authentication(api_client, db):
    response = api_client.get("/api/auth/me/")
    assert response.status_code == 401
    assert response.json()["code"] == "not_authenticated"


def test_logout_revokes_token(api_client, doctor):
    token = api_client.post(
        LOGIN_URL, {"phone": doctor.phone, "password": testing.DEFAULT_PASSWORD}
    ).json()["token"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    assert api_client.post("/api/auth/logout/").status_code == 204
    assert api_client.get("/api/auth/me/").status_code == 401


def test_deactivated_user_token_stops_working(client_for, doctor):
    client = client_for(doctor)
    doctor.is_active = False
    doctor.save()
    assert client.get("/api/auth/me/").status_code == 401


def test_doctor_list_for_receptionist(client_for, clinic, doctor, second_doctor):
    staff = testing.make_receptionist(clinic, doctors=[doctor, second_doctor])
    response = client_for(staff).get("/api/doctors/")
    assert response.status_code == 200
    assert {d["id"] for d in response.json()} == {doctor.id, second_doctor.id}


def test_doctor_list_for_doctor_is_self(client_for, doctor, second_doctor):
    response = client_for(doctor).get("/api/doctors/")
    assert response.json() == [{"id": doctor.id, "full_name": doctor.full_name}]
