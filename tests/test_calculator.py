# tests/test_calculator.py
import pytest
from greenspec_core.types import ProjectInput
from greenspec_core.guardrails import evaluate_guardrail
from greenspec_core.calculator import calculate_impacts

def test_carbon_and_cost_calculation_balanced_and_max():
    proj = ProjectInput(
        project_name="Bangkok Hub",
        element_type="mat_foundation",
        volume_m3=1000.0,
        fc_prime_mpa=35.0
    )
    guardrail = evaluate_guardrail(proj)
    base_intensity, base_total, base_cost, opt_a, opt_b = calculate_impacts(proj, guardrail)

    # Baseline check (approx 315 kg/m3 for 35 MPa, total 315 tCO2e for 1000 m3)
    assert 300.0 <= base_intensity <= 330.0
    assert 300.0 <= base_total <= 330.0
    assert base_cost > 0

    # Option A (Balanced: 20-25% reduction)
    assert 18.0 <= opt_a.carbon_reduction_percent <= 26.0
    assert opt_a.carbon_reduction_tco2e > 0
    assert opt_a.cost_delta_thb >= 0 # savings

    # Option B (High cut: 30-40% reduction)
    assert 30.0 <= opt_b.carbon_reduction_percent <= 42.0
    assert opt_b.carbon_reduction_tco2e > opt_a.carbon_reduction_tco2e
