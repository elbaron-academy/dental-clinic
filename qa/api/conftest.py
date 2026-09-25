"""QA acceptance fixtures.

Clinic and staff setup is Django Admin work, so it is prepared through the
ORM. Everything under test goes through the public HTTP API only.
"""

import pytest
from django.core.cache import cache

from apps.core import testing

PASSWORD = testing.DEFAULT_PASSWORD


@pytest.fixture(autouse=True)
def _clean_cache():
    cache.clear()


class Clinic:
    """A clinic with two doctors, an assistant of doctor A and a receptionist of both."""

    def __init__(self, name):
        self.clinic = testing.make_clinic(name)
        self.doctor_a = testing.make_doctor(self.clinic, full_name=f"Dr. A ({name})")
        self.doctor_b = testing.make_doctor(self.clinic, full_name=f"Dr. B ({name})")
        self.assistant = testing.make_assistant(self.clinic, doctors=[self.doctor_a])
        self.receptionist = testing.make_receptionist(
            self.clinic, doctors=[self.doctor_a, self.doctor_b]
        )


@pytest.fixture
def smile(db):
    return Clinic("Smile")


@pytest.fixture
def other(db):
    return Clinic("Other")


@pytest.fixture
def solo(db):
    """A single-doctor clinic (CLINIC-002)."""
    clinic = testing.make_clinic("Solo")
    doctor = testing.make_doctor(clinic, full_name="Dr. Solo")
    reception = testing.make_receptionist(clinic, doctors=[doctor])
    return {"clinic": clinic, "doctor": doctor, "reception": reception}


@pytest.fixture
def login():
    """Logs in through the API like a real client and returns an authenticated client."""

    def _login(user, role=None):
        client = testing.client_for()
        payload = {"phone": user.phone, "password": PASSWORD}
        if role:
            payload["role"] = role
        response = client.post("/api/auth/login/", payload)
        assert response.status_code == 200, response.content
        client.credentials(HTTP_AUTHORIZATION=f"Token {response.json()['token']}")
        return client

    return _login


@pytest.fixture
def api_client_factory():
    return testing.client_for
