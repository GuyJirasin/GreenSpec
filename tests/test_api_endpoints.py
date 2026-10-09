# tests/test_api_endpoints.py
import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_api_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_api_catalog_endpoint():
    response = client.get("/api/catalog")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 6
    brands = [item["brand"] for item in data]
    assert any("CPAC" in b for b in brands)
    assert any("กฟผ" in b for b in brands)

def test_api_analyze_endpoint():
    payload = {
        "project_name": "Riverside Condominium",
        "element_type": "mat_foundation",
        "volume_m3": 2500.0,
        "fc_prime_mpa": 35.0,
        "notes": "1.8m thick mass concrete"
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "matched_products" in data
    assert data["matched_products"]["balanced_product"] is not None
    assert "technical_package" in data
    assert "03 30 00" in data["technical_package"]["spec_clause_th"]
