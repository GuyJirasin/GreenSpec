# tests/test_handler.py
import pytest
from greenspec_core.handler import analyze_and_draft_spec, lambda_handler

def test_analyze_and_draft_spec_end_to_end():
    payload = {
        "project_name": "Bangkok Tower",
        "element_type": "mat_foundation",
        "volume_m3": 1500.0,
        "fc_prime_mpa": 35.0,
        "test_age_days": 28,
        "notes": "Thickness 1.8m mass concrete"
    }
    result = analyze_and_draft_spec(payload, use_mock=True)

    assert result["status"] == "success"
    assert result["project_name"] == "Bangkok Tower"
    assert "baseline" in result
    assert result["baseline"]["total_carbon_tco2e"] > 0
    assert "options" in result
    assert "option_a" in result["options"]
    assert "option_b" in result["options"]

    pkg = result["technical_package"]
    assert "spec_clause_th" in pkg
    assert "03 30 00" in pkg["spec_clause_th"]
    assert "compliance_matrix" in pkg
    assert len(pkg["compliance_matrix"]) >= 2
    assert "submittal_checklist" in pkg
    assert len(pkg["submittal_checklist"]) >= 3

def test_lambda_handler_wrapper():
    event = {
        "body": '{"project_name": "Test Project", "element_type": "beam_slab", "volume_m3": 500, "fc_prime_mpa": 32}'
    }
    response = lambda_handler(event, None)
    assert response["statusCode"] == 200
    assert "body" in response
    assert "Bangkok" not in response["body"]
