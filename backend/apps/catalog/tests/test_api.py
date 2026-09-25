"""DX-001, MED-001: catalog items available to a clinic."""

from apps.catalog.models import Medication, Procedure


def test_procedures_available_to_clinic(client_for, clinic, other_clinic, doctor):
    Procedure.objects.create(name="Scaling", code="D1110")
    Procedure.objects.create(name="Clinic filling", clinic=clinic)
    Procedure.objects.create(name="Other clinic crown", clinic=other_clinic)
    Procedure.objects.create(name="Retired", is_active=False)
    response = client_for(doctor).get("/api/catalog/procedures/")
    assert response.status_code == 200
    assert [p["name"] for p in response.json()] == ["Clinic filling", "Scaling"]


def test_medications_available_to_clinic(client_for, clinic, receptionist):
    Medication.objects.create(name="Amoxicillin", details="500 mg capsule")
    Medication.objects.create(name="Old drug", is_active=False)
    response = client_for(receptionist).get("/api/catalog/medications/")
    assert response.json() == [
        {
            "id": Medication.objects.get(name="Amoxicillin").id,
            "name": "Amoxicillin",
            "details": "500 mg capsule",
        }
    ]


def test_catalog_search(client_for, doctor):
    Medication.objects.create(name="Ibuprofen")
    Medication.objects.create(name="Paracetamol")
    response = client_for(doctor).get("/api/catalog/medications/", {"search": "ibu"})
    assert [m["name"] for m in response.json()] == ["Ibuprofen"]


def test_catalog_requires_authentication(api_client, db):
    assert api_client.get("/api/catalog/procedures/").status_code == 401


def test_catalog_is_read_only(client_for, doctor):
    response = client_for(doctor).post("/api/catalog/procedures/", {"name": "X"})
    assert response.status_code == 405
