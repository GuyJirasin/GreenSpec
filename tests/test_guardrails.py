# tests/test_guardrails.py
import pytest
from greenspec_core.types import ProjectInput
from greenspec_core.guardrails import evaluate_guardrail

def test_mat_foundation_mass_concrete_rules():
    proj = ProjectInput(
        project_name="Metro Station",
        element_type="mat_foundation",
        volume_m3=2000.0,
        fc_prime_mpa=35.0,
        notes="Mat foundation 1.5m thick"
    )
    result = evaluate_guardrail(proj)
    assert result.status == "Pass"
    assert result.risk_rating == "Low"
    assert result.max_scm_percent >= 35.0
    assert result.recommended_test_age_days == 56
    assert result.thermal_control_plan_required is True
    assert result.mandatory_curing_days >= 7

def test_post_tensioned_slab_early_strength_cap():
    proj = ProjectInput(
        project_name="Residential Tower",
        element_type="pt_slab",
        volume_m3=300.0,
        fc_prime_mpa=32.0,
        notes="Post tensioned floor slab"
    )
    result = evaluate_guardrail(proj)
    assert result.max_scm_percent <= 20.0
    assert result.early_strength_required is True
    assert result.recommended_test_age_days == 28

def test_column_high_strength_rules():
    proj = ProjectInput(
        project_name="High Rise Tower",
        element_type="column",
        volume_m3=500.0,
        fc_prime_mpa=50.0
    )
    result = evaluate_guardrail(proj)
    assert result.max_scm_percent <= 25.0
    assert result.recommended_test_age_days == 28
