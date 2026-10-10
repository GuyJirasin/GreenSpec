"""
Deterministic Civil Engineering & Concrete Calculation Tools
Based on ACI 211.1, ACI 207, Chulalongkorn University 2101311 Lecture,
KMUTT Pozzolanic Research, and Thailand Greenhouse Gas Management Organization (TGO) standards.
"""

from typing import Dict, Any, Optional
from greenspec_core.config import EMISSION_FACTORS, READY_MIX_BASE_COST_PER_M3

# Specific gravities (SSD/OD) of standard materials in Thailand
SG_CEMENT_OPC = 3.15
SG_HYDRAULIC_CEMENT = 3.10
SG_FLY_ASH = 2.25       # EGAT Mae Moh Fly Ash Class F
SG_BOTTOM_ASH = 2.10    # Ground Bottom Ash (KMUTT/Chula)
SG_SLAG = 2.90
SG_COARSE_AGG = 2.68    # Crushed limestone
SG_FINE_AGG = 2.62      # River sand
DRUW_COARSE_AGG = 1600.0 # Dry-rodded unit weight kg/m3

def convert_concrete_strength(
    strength_value: float,
    from_format: str = "cylinder_ksc"
) -> Dict[str, Any]:
    """
    Convert compressive strength between Cylinder (15x30 cm) and Cube (15x15 cm),
    and between MPa and KSC (kgf/cm2) per DPT 1101-64 and ACI 318.
    """
    fmt = from_format.lower()
    
    # 1. Convert to Cylinder MPa as pivot
    if fmt == "cylinder_mpa":
        cyl_mpa = strength_value
    elif fmt == "cylinder_ksc":
        cyl_mpa = strength_value / 10.19716
    elif fmt == "cube_mpa":
        cyl_mpa = strength_value * 0.83
    elif fmt == "cube_ksc":
        cyl_ksc = strength_value * 0.83
        cyl_mpa = cyl_ksc / 10.19716
    else:
        cyl_mpa = strength_value

    cyl_ksc = cyl_mpa * 10.19716
    cube_mpa = cyl_mpa / 0.83
    cube_ksc = cyl_ksc / 0.83

    return {
        "input_value": strength_value,
        "input_format": from_format,
        "cylinder_15x30cm": {
            "strength_mpa": round(cyl_mpa, 1),
            "strength_ksc": round(cyl_ksc, 0)
        },
        "cube_15x15cm": {
            "strength_mpa": round(cube_mpa, 1),
            "strength_ksc": round(cube_ksc, 0)
        },
        "standard_reference": "มยผ. 1101-64 ข้อ 4.2: Cylinder ≈ 0.83 × Cube"
    }

def calculate_concrete_mix(
    fc_target_mpa: float,
    element_type: str = "beam_slab",
    slump_cm: float = 12.0,
    scm_type: str = "fly_ash",
    scm_percent: float = 25.0,
    aggregate_size_mm: float = 19.0,
    sand_fineness_modulus: float = 2.80
) -> Dict[str, Any]:
    """
    Calculate deterministic concrete mix proportions per 1.0 m3 of concrete
    using ACI 211.1 Absolute Volume Method and Chulalongkorn University guidelines.
    """
    # 1. Target average strength f'cr (ACI 318 Tabulated Margin)
    if fc_target_mpa <= 35.0:
        fcr_mpa = fc_target_mpa + 8.5
    else:
        fcr_mpa = 1.10 * fc_target_mpa + 5.0

    # 2. Select w/b ratio from ACI 211.1 Table 3 curve
    # Linear interpolation between 20 MPa (w/b 0.69) and 45 MPa (w/b 0.38)
    wb_ratio = max(0.32, min(0.65, 0.69 - ((fcr_mpa - 20.0) / 25.0) * (0.69 - 0.38)))
    wb_ratio = round(wb_ratio, 2)

    # 3. Base water content from slump & NMSA (ACI Table 2)
    # Approx 205 kg for 19mm aggregate at 10-12cm slump
    base_water = 205.0 if aggregate_size_mm <= 19.0 else 193.0
    if slump_cm > 15.0:
        base_water += 12.0
    elif slump_cm < 8.0:
        base_water -= 15.0

    # 4. Superplasticizer reduction (PCE reduces water by 12-18% when using SCMs)
    has_pce = scm_percent > 0 or fc_target_mpa >= 35.0
    water_reduction = 0.15 if has_pce else 0.0
    actual_water_kg = round(base_water * (1.0 - water_reduction), 1)

    # 5. Total binder content B = W / (w/b)
    total_binder_kg = round(actual_water_kg / wb_ratio, 1)

    # Minimum cementitious requirement check
    if fc_target_mpa >= 35.0 and total_binder_kg < 360.0:
        total_binder_kg = 360.0
        actual_water_kg = round(total_binder_kg * wb_ratio, 1)

    # 6. SCM and Cement proportions
    scm_pct = max(0.0, min(60.0, scm_percent))
    scm_kg = round(total_binder_kg * (scm_pct / 100.0), 1)
    cement_kg = round(total_binder_kg - scm_kg, 1)

    # Determine SCM Specific Gravity
    sg_scm = SG_FLY_ASH
    if "bottom" in scm_type.lower():
        sg_scm = SG_BOTTOM_ASH
    elif "slag" in scm_type.lower():
        sg_scm = SG_SLAG

    # 7. Coarse Aggregate Bulk Volume per Table 4
    # For NMSA 19mm and Sand FM 2.80 -> 0.62
    ca_vol_ratio = 0.62 if aggregate_size_mm <= 19.0 else 0.67
    ca_dry_kg = round(ca_vol_ratio * DRUW_COARSE_AGG, 1)

    # 8. Absolute Volume Calculation (sum must equal 1.000 m3)
    air_vol = 0.015  # 1.5% entrapped air
    water_vol = actual_water_kg / 1000.0
    cement_vol = cement_kg / (SG_CEMENT_OPC * 1000.0)
    scm_vol = (scm_kg / (sg_scm * 1000.0)) if scm_kg > 0 else 0.0
    ca_vol = ca_dry_kg / (SG_COARSE_AGG * 1000.0)

    used_vol = air_vol + water_vol + cement_vol + scm_vol + ca_vol
    sand_vol = max(0.15, 1.000 - used_vol)
    sand_dry_kg = round(sand_vol * SG_FINE_AGG * 1000.0, 1)

    total_unit_weight_kg = round(actual_water_kg + cement_kg + scm_kg + ca_dry_kg + sand_dry_kg, 0)

    # Admixture dosage (PCE: 0.8 - 1.2% by binder weight)
    admixture_liters = round((total_binder_kg * 0.010) / 1.08, 2) if has_pce else 0.0

    return {
        "design_criteria": {
            "specified_fc_mpa": fc_target_mpa,
            "target_fcr_mpa": round(fcr_mpa, 1),
            "target_slump_cm": slump_cm,
            "max_wb_ratio": wb_ratio,
            "nominal_max_aggregate_mm": aggregate_size_mm,
            "element_type": element_type
        },
        "mix_proportions_per_m3": {
            "cement_opc_kg": cement_kg,
            "scm_kg": scm_kg,
            "scm_type": scm_type,
            "scm_percent": scm_pct,
            "water_kg": actual_water_kg,
            "coarse_aggregate_kg": ca_dry_kg,
            "fine_aggregate_sand_kg": sand_dry_kg,
            "chemical_admixture_pce_liters": admixture_liters,
            "total_unit_weight_kg_m3": total_unit_weight_kg
        },
        "volumetric_balance": {
            "sum_absolute_volumes_m3": round(used_vol + sand_vol, 3),
            "air_content_percent": 1.5
        },
        "standards_compliance": "ออกแบบตามวิธี ACI 211.1 Absolute Volume Method & ภาควิชาวิศวกรรมโยธา จุฬาลงกรณ์มหาวิทยาลัย"
    }

def calculate_embodied_carbon(
    cement_opc_kg: float,
    scm_kg: float,
    scm_type: str,
    ca_kg: float,
    sand_kg: float,
    volume_m3: float = 1.0
) -> Dict[str, Any]:
    """
    Calculate cradle-to-gate embodied carbon (kgCO2e/m3 and total tCO2e)
    using Thailand Greenhouse Gas Management Organization (TGO) verified factors.
    """
    # Unit emission factors (kgCO2e / kg)
    ef_opc = EMISSION_FACTORS["OPC_Type_1"] / 1000.0        # ~0.830 kgCO2e/kg
    ef_agg = EMISSION_FACTORS["Aggregates"] / 1000.0        # ~0.0075 kgCO2e/kg
    
    if "bottom" in scm_type.lower():
        ef_scm = EMISSION_FACTORS["TIS_2601_BottomAsh"] / 1000.0  # ~0.012 kgCO2e/kg
    elif "slag" in scm_type.lower():
        ef_scm = EMISSION_FACTORS["ASTM_C989_Slag"] / 1000.0      # ~0.085 kgCO2e/kg
    elif "hydraulic" in scm_type.lower():
        ef_scm = EMISSION_FACTORS["TIS_2594_Hydraulic"] / 1000.0  # ~0.690 kgCO2e/kg
    else:
        ef_scm = EMISSION_FACTORS["TIS_2135_FlyAsh"] / 1000.0     # ~0.0185 kgCO2e/kg

    # Mix emissions per m3
    cement_co2 = cement_opc_kg * ef_opc
    scm_co2 = scm_kg * ef_scm
    agg_co2 = (ca_kg + sand_kg) * ef_agg
    admix_water_co2 = 8.0  # constant baseline for water & logistics

    mix_intensity_kg_m3 = round(cement_co2 + scm_co2 + agg_co2 + admix_water_co2, 1)
    
    # Baseline: 100% OPC equivalent with same binder weight
    total_binder_kg = cement_opc_kg + scm_kg
    baseline_intensity_kg_m3 = round((total_binder_kg * ef_opc) + agg_co2 + admix_water_co2, 1)

    saved_intensity_kg_m3 = max(0.0, baseline_intensity_kg_m3 - mix_intensity_kg_m3)
    reduction_pct = round((saved_intensity_kg_m3 / baseline_intensity_kg_m3) * 100.0, 1)

    total_baseline_tco2e = round((baseline_intensity_kg_m3 * volume_m3) / 1000.0, 2)
    total_mix_tco2e = round((mix_intensity_kg_m3 * volume_m3) / 1000.0, 2)
    total_saved_tco2e = round(total_baseline_tco2e - total_mix_tco2e, 2)

    return {
        "carbon_intensity_kg_m3": mix_intensity_kg_m3,
        "baseline_intensity_kg_m3": baseline_intensity_kg_m3,
        "reduction_per_m3_kg": round(saved_intensity_kg_m3, 1),
        "reduction_percent": reduction_pct,
        "project_volume_m3": volume_m3,
        "project_total_tco2e": total_mix_tco2e,
        "project_baseline_tco2e": total_baseline_tco2e,
        "project_saved_tco2e": total_saved_tco2e,
        "equivalent_trees_planted": int(total_saved_tco2e * 10.0),
        "certified_source": "องค์การบริหารจัดการก๊าซเรือนกระจก (อบก. - TGO) Carbon Footprint Registry"
    }

def evaluate_thermal_mass_concrete(
    thickness_m: float,
    total_binder_kg_m3: float = 380.0,
    scm_percent: float = 30.0,
    scm_type: str = "fly_ash",
    placing_temp_c: float = 30.0
) -> Dict[str, Any]:
    """
    Evaluate mass concrete adiabatic temperature rise, core temperature,
    surface temperature difference (Delta T), and Delayed Ettringite Formation (DEF) risk
    per ACI 207 and Chula/KMUTT research.
    """
    is_mass = thickness_m >= 0.80

    # Heat of hydration: OPC ~ 380 J/g, Class F Fly Ash ~ 150 J/g, Bottom Ash ~ 130 J/g
    heat_cement = 380.0
    heat_scm = 140.0 if "bottom" in scm_type.lower() else 150.0

    scm_fraction = scm_percent / 100.0
    weighted_heat_j_g = (1.0 - scm_fraction) * heat_cement + scm_fraction * heat_scm

    # Adiabatic temperature rise Delta T_ad = (Binder * H) / (c_p * rho)
    # c_p ~ 1.0 kJ/kg-C, rho ~ 2400 kg/m3
    adiabatic_rise_c = (total_binder_kg_m3 * weighted_heat_j_g) / 2400.0

    # Thickness dissipation factor: for thicker elements, less heat escapes
    dissipation_factor = 0.85 if thickness_m >= 1.5 else (0.75 if thickness_m >= 1.0 else 0.60)
    
    expected_peak_core_temp = round(placing_temp_c + (adiabatic_rise_c * dissipation_factor), 1)
    
    # Surface temperature under ambient ~32C
    expected_surface_temp = round(placing_temp_c + 12.0, 1)
    delta_t = round(expected_peak_core_temp - expected_surface_temp, 1)

    # Threshold checks
    def_risk = expected_peak_core_temp >= 70.0
    thermal_cracking_risk = delta_t > 20.0

    recommendations = []
    if def_risk:
        recommendations.append(f"เตือนวิกฤต: อุณหภูมิแกนกลาง {expected_peak_core_temp}°C เกิน 70°C เสี่ยงเกิด DEF ให้ใช้น้ำแข็งเกล็ด (Flake ice) ลดอุณหภูมิเทลงเหลือ ≤ 25°C หรือเพิ่มเถ้าลอยเป็น 35-40%")
    if thermal_cracking_risk:
        recommendations.append(f"เตือน: ผลต่างอุณหภูมิ Delta T = {delta_t}°C เกินเกณฑ์ 20°C ต้องคลุมฉนวนกันความร้อน (Insulation blankets) ที่ผิวหน้าทันที")
    if not def_risk and not thermal_cracking_risk:
        recommendations.append("สภาวะอุณหภูมิผ่านเกณฑ์ปลอดภัย (Core < 70°C และ Delta T ≤ 20°C)")

    return {
        "is_mass_concrete": is_mass,
        "thickness_m": thickness_m,
        "adiabatic_temp_rise_c": round(adiabatic_rise_c, 1),
        "expected_core_temp_c": expected_peak_core_temp,
        "expected_surface_temp_c": expected_surface_temp,
        "temperature_difference_delta_t_c": delta_t,
        "def_risk_flag": def_risk,
        "thermal_cracking_risk_flag": thermal_cracking_risk,
        "compliance_status": "FAIL" if (def_risk or thermal_cracking_risk) else "PASS",
        "recommendations": recommendations,
        "standard_reference": "ACI 207.1R, ACI 207.2R & งานวิจัย จุฬาฯ/มจธ. (JOBE 2023)"
    }

def estimate_cost_impact(
    fc_mpa: float,
    volume_m3: float,
    scm_percent: float = 25.0,
    scm_type: str = "fly_ash"
) -> Dict[str, Any]:
    """
    Estimate ready-mix concrete pricing and contractor cost impact in Thailand.
    Fly ash (~450 THB/ton) replaces Portland cement (~2,400 THB/ton).
    """
    closest_grade = min(READY_MIX_BASE_COST_PER_M3.keys(), key=lambda k: abs(k - fc_mpa))
    base_rate_per_m3 = READY_MIX_BASE_COST_PER_M3[closest_grade]

    # Material cost saving rate: ~2% base + ~7% per SCM fraction
    saving_ratio = 0.015 + (scm_percent / 100.0) * 0.08
    saving_rate_per_m3 = round(base_rate_per_m3 * saving_ratio, 0)
    low_carbon_rate_per_m3 = base_rate_per_m3 - saving_rate_per_m3

    total_baseline_thb = base_rate_per_m3 * volume_m3
    total_low_carbon_thb = low_carbon_rate_per_m3 * volume_m3
    net_savings_thb = total_baseline_thb - total_low_carbon_thb

    return {
        "strength_grade_fc_mpa": fc_mpa,
        "base_readymix_rate_thb_m3": base_rate_per_m3,
        "low_carbon_rate_thb_m3": low_carbon_rate_per_m3,
        "saving_per_m3_thb": saving_rate_per_m3,
        "saving_percent": round(saving_ratio * 100.0, 1),
        "total_volume_m3": volume_m3,
        "total_baseline_cost_thb": total_baseline_thb,
        "total_low_carbon_cost_thb": total_low_carbon_thb,
        "net_project_savings_thb": net_savings_thb
    }
