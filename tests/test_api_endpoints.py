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

def test_api_tools_endpoints():
    # 1. Strength convert
    resp = client.get("/api/tools/strength-convert?value=280&from_format=cylinder_ksc")
    assert resp.status_code == 200
    assert resp.json()["cylinder_15x30cm"]["strength_mpa"] > 27.0

    # 2. Mix design
    resp = client.post("/api/tools/mix-design", json={"fc_target_mpa": 35.0, "scm_percent": 25.0})
    assert resp.status_code == 200
    assert resp.json()["mix_proportions_per_m3"]["cement_opc_kg"] > 0

    # 3. Thermal check
    resp = client.post("/api/tools/thermal-check", json={"thickness_m": 1.5, "scm_percent": 35.0})
    assert resp.status_code == 200
    assert resp.json()["is_mass_concrete"] is True

    # 4. Carbon calc
    resp = client.post("/api/tools/carbon-calc", json={
        "cement_opc_kg": 270.0,
        "scm_kg": 90.0,
        "scm_type": "fly_ash",
        "ca_kg": 1000.0,
        "sand_kg": 750.0,
        "volume_m3": 500.0
    })
    assert resp.status_code == 200
    assert resp.json()["reduction_percent"] > 20.0
