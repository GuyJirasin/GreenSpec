# tests/test_tools.py
import pytest
from greenspec_core.tools import (
    calculate_concrete_mix,
    calculate_embodied_carbon,
    evaluate_thermal_mass_concrete,
    convert_concrete_strength,
    estimate_cost_impact,
)

def test_convert_concrete_strength():
    # 280 ksc cylinder to MPa and Cube
    res = convert_concrete_strength(280.0, from_format="cylinder_ksc")
    assert 27.0 <= res["cylinder_15x30cm"]["strength_mpa"] <= 28.0
    # Cube should be ~ 337 ksc (280 / 0.83)
    assert 330.0 <= res["cube_15x15cm"]["strength_ksc"] <= 345.0

def test_calculate_concrete_mix_absolute_volume_balance():
    # Design for 35 MPa with 25% Fly Ash
    res = calculate_concrete_mix(
        fc_target_mpa=35.0,
        element_type="beam_slab",
        slump_cm=12.0,
        scm_type="fly_ash",
        scm_percent=25.0,
        aggregate_size_mm=19.0
    )
    props = res["mix_proportions_per_m3"]
    assert props["cement_opc_kg"] > 200.0
    assert props["scm_kg"] > 50.0
    assert props["water_kg"] > 140.0
    assert props["coarse_aggregate_kg"] > 900.0
    assert props["fine_aggregate_sand_kg"] > 600.0
    
    # Check volumetric balance equals 1.0 m3
    vol = res["volumetric_balance"]["sum_absolute_volumes_m3"]
    assert 0.99 <= vol <= 1.01

def test_calculate_embodied_carbon():
    # 100 m3 of concrete with 270kg OPC and 90kg Fly Ash
    res = calculate_embodied_carbon(
        cement_opc_kg=270.0,
        scm_kg=90.0,
        scm_type="fly_ash",
        ca_kg=1000.0,
        sand_kg=750.0,
        volume_m3=100.0
    )
    assert res["carbon_intensity_kg_m3"] < res["baseline_intensity_kg_m3"]
    assert res["reduction_percent"] >= 20.0
    assert res["project_saved_tco2e"] > 0.0

def test_evaluate_thermal_mass_concrete_detection_and_def():
    # 2.0m thick mass foundation without fly ash -> High DEF risk
    res_hot = evaluate_thermal_mass_concrete(
        thickness_m=2.0,
        total_binder_kg_m3=420.0,
        scm_percent=0.0,
        placing_temp_c=32.0
    )
    assert res_hot["is_mass_concrete"] is True
    assert res_hot["expected_core_temp_c"] >= 70.0
    assert res_hot["def_risk_flag"] is True

    # Same 2.0m thick with 40% fly ash -> Safe below 70C
    res_safe = evaluate_thermal_mass_concrete(
        thickness_m=2.0,
        total_binder_kg_m3=380.0,
        scm_percent=40.0,
        placing_temp_c=28.0
    )
    assert res_safe["expected_core_temp_c"] < 70.0
    assert res_safe["def_risk_flag"] is False

def test_estimate_cost_impact():
    res = estimate_cost_impact(fc_mpa=35.0, volume_m3=1000.0, scm_percent=25.0)
    assert res["net_project_savings_thb"] > 0.0
    assert res["low_carbon_rate_thb_m3"] < res["base_readymix_rate_thb_m3"]
