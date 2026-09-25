from apps.patients.models import Patient


def test_patient_admin_pages_load(admin_site_client, clinic, doctor):
    patient = Patient.objects.create(clinic=clinic, full_name="P", phone="01200000000")
    for url in ["/admin/patients/patient/", f"/admin/patients/patient/{patient.pk}/change/"]:
        assert admin_site_client.get(url).status_code == 200
