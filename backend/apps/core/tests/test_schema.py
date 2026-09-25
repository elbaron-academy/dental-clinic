"""FND-006: the OpenAPI contract is generated and documents the core endpoints."""


def test_openapi_schema_is_served(api_client, db):
    response = api_client.get("/api/schema/", HTTP_ACCEPT="application/vnd.oai.openapi+json")
    assert response.status_code == 200
    paths = response.json()["paths"]
    for path in ["/api/auth/login/", "/api/auth/me/", "/api/doctors/"]:
        assert path in paths
