"""DX-002, MED-001: the clinical catalog is configured in Django Admin."""

from apps.catalog.models import Medication, Procedure


def test_admin_manages_procedures(admin_site_client):
    response = admin_site_client.post(
        "/admin/catalog/procedure/add/", {"name": "Root canal", "code": "D3310", "is_active": "on"}
    )
    assert response.status_code == 302
    assert Procedure.objects.get(name="Root canal").code == "D3310"
    assert admin_site_client.get("/admin/catalog/procedure/").status_code == 200


def test_admin_manages_medications(admin_site_client, clinic):
    response = admin_site_client.post(
        "/admin/catalog/medication/add/",
        {"name": "Chlorhexidine", "details": "0.12% rinse", "clinic": clinic.pk, "is_active": "on"},
    )
    assert response.status_code == 302
    assert Medication.objects.get(name="Chlorhexidine").clinic == clinic
    assert admin_site_client.get("/admin/catalog/medication/").status_code == 200
