import datetime

from django.utils import timezone


def later(hours: float = 1) -> str:
    return (timezone.now() + datetime.timedelta(hours=hours)).isoformat()


def register(client, name="QA Patient", phone="01234567890", **extra):
    response = client.post("/api/patients/", {"full_name": name, "phone": phone, **extra})
    assert response.status_code == 201, response.content
    return response.json()


def book(client, patient_id, **extra):
    response = client.post(
        "/api/appointments/", {"patient_id": patient_id, "scheduled_at": later(), **extra}
    )
    assert response.status_code == 201, response.content
    return response.json()


def check_in(client, appointment_id):
    response = client.post(f"/api/appointments/{appointment_id}/check-in/")
    assert response.status_code == 200, response.content
    return response.json()


def start(client, appointment_id):
    return client.post(f"/api/appointments/{appointment_id}/start-visit/")
