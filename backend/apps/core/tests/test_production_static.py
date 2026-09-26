"""Admin pages render with the production static files storage.

The test settings use plain StaticFilesStorage. Production uses WhiteNoise's
manifest storage, where a missing manifest entry used to break every admin
page (jazzmin asks for the "vendor/bootswatch" directory).
"""

import pytest
from django.core.management import call_command

PRODUCTION_STATIC = "whitenoise.storage.CompressedManifestStaticFilesStorage"


@pytest.fixture
def production_static(settings, tmp_path):
    settings.STATIC_ROOT = tmp_path / "staticfiles"
    settings.STORAGES = {**settings.STORAGES, "staticfiles": {"BACKEND": PRODUCTION_STATIC}}
    call_command("collectstatic", interactive=False, verbosity=0)


def test_admin_pages_render_with_manifest_storage(production_static, admin_site_client, doctor):
    for url in [
        "/admin/",
        "/admin/accounts/user/",
        f"/admin/accounts/user/{doctor.pk}/change/",
        "/admin/accounts/doctor/",
        "/admin/accounts/doctor/add/",
        "/admin/patients/patient/",
    ]:
        response = admin_site_client.get(url)
        assert response.status_code == 200, url
        assert "/static/jazzmin/" in response.content.decode(), url
