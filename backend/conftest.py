import pytest
from django.core.cache import cache

from apps.core import testing


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def clinic(db):
    return testing.make_clinic("Smile Dental")


@pytest.fixture
def other_clinic(db):
    return testing.make_clinic("Other Clinic")


@pytest.fixture
def doctor(clinic):
    return testing.make_doctor(clinic, full_name="Dr. Amal Hassan")


@pytest.fixture
def second_doctor(clinic):
    return testing.make_doctor(clinic, full_name="Dr. Omar Nabil")


@pytest.fixture
def receptionist(clinic, doctor):
    return testing.make_receptionist(clinic, doctors=[doctor], full_name="Rana Reception")


@pytest.fixture
def assistant(clinic, doctor):
    return testing.make_assistant(clinic, doctors=[doctor], full_name="Sara Assistant")


@pytest.fixture
def api_client():
    return testing.client_for()


@pytest.fixture
def client_for():
    return testing.client_for


@pytest.fixture
def superuser(db, django_user_model):
    return django_user_model.objects.create_superuser(
        phone="01099999999", password=testing.DEFAULT_PASSWORD, full_name="Platform Admin"
    )


@pytest.fixture
def admin_site_client(client, superuser):
    client.force_login(superuser)
    return client
