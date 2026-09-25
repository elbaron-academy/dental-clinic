"""CLINIC-001: clinics, doctors and staff are set up in Django Admin."""

from apps.accounts.models import Role, User
from apps.core import testing


def test_admin_pages_load(admin_site_client, clinic, doctor):
    for url in [
        "/admin/",
        "/admin/accounts/user/",
        "/admin/accounts/user/add/",
        f"/admin/accounts/user/{doctor.pk}/change/",
        "/admin/clinics/clinic/",
        "/admin/clinics/clinic/add/",
    ]:
        assert admin_site_client.get(url).status_code == 200, url


def test_admin_login_uses_phone_number(client, superuser):
    response = client.post(
        "/admin/login/?next=/admin/",
        {"username": superuser.phone, "password": testing.DEFAULT_PASSWORD},
    )
    assert response.status_code == 302


def _add_user(client, **data):
    payload = {
        "password1": "Clinic-pass-2024",
        "password2": "Clinic-pass-2024",
        **data,
    }
    return client.post("/admin/accounts/user/add/", payload)


def test_admin_creates_receptionist_assigned_to_doctor(admin_site_client, clinic, doctor):
    response = _add_user(
        admin_site_client,
        phone="010 5555 0000",
        full_name="New Receptionist",
        clinic=clinic.pk,
        role=Role.RECEPTIONIST,
        assigned_doctors=[doctor.pk],
    )
    assert response.status_code == 302, response.context["adminform"].form.errors
    user = User.objects.get(phone="01055550000")
    assert list(user.assigned_doctors.all()) == [doctor]
    assert user.check_password("Clinic-pass-2024")


def test_admin_rejects_staff_without_clinic(admin_site_client, db):
    response = _add_user(admin_site_client, phone="01055550001", full_name="X", role=Role.DOCTOR)
    assert response.status_code == 200
    assert "clinic" in response.context["adminform"].form.errors


def test_admin_rejects_doctor_from_another_clinic(admin_site_client, clinic, other_clinic):
    foreign = testing.make_doctor(other_clinic)
    response = _add_user(
        admin_site_client,
        phone="01055550002",
        full_name="X",
        clinic=clinic.pk,
        role=Role.ASSISTANT,
        assigned_doctors=[foreign.pk],
    )
    assert response.status_code == 200
    assert "assigned_doctors" in response.context["adminform"].form.errors


def test_admin_rejects_doctor_assignment_for_doctors(admin_site_client, clinic, doctor):
    response = _add_user(
        admin_site_client,
        phone="01055550003",
        full_name="X",
        clinic=clinic.pk,
        role=Role.DOCTOR,
        assigned_doctors=[doctor.pk],
    )
    assert response.status_code == 200
    assert "assigned_doctors" in response.context["adminform"].form.errors
