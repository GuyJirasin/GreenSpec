from typing import Tuple
from greenspec_core.types import ProjectInput, GuardrailResult, MixOption
from greenspec_core.config import EMISSION_FACTORS, READY_MIX_BASE_COST_PER_M3

def estimate_binder_content(fc_mpa: float) -> float:
    """Estimate total binder content in kg/m3 based on fc' MPa."""
    if fc_mpa <= 25:
        return 300.0
    elif fc_mpa <= 30:
        return 330.0
    elif fc_mpa <= 35:
        return 360.0
    elif fc_mpa <= 40:
        return 390.0
    else:
        return 430.0

def get_base_cost_per_m3(fc_mpa: float) -> float:
    closest_grade = min(READY_MIX_BASE_COST_PER_M3.keys(), key=lambda k: abs(k - fc_mpa))
    return READY_MIX_BASE_COST_PER_M3[closest_grade]

def calculate_mix_emission_intensity(
    total_binder_kg: float,
    opc_kg: float,
    hydraulic_kg: float,
    flyash_kg: float,
    slag_kg: float
) -> float:
    # Aggregates ~1850 kg/m3
    agg_emission = (1850.0 / 1000.0) * EMISSION_FACTORS["Aggregates"]
    binder_emission = (
        (opc_kg / 1000.0) * EMISSION_FACTORS["OPC_Type_1"] +
        (hydraulic_kg / 1000.0) * EMISSION_FACTORS["TIS_2594_Hydraulic"] +
        (flyash_kg / 1000.0) * EMISSION_FACTORS["TIS_2135_FlyAsh"] +
        (slag_kg / 1000.0) * EMISSION_FACTORS["ASTM_C989_Slag"]
    )
    # Water & Admixture constant baseline ~ 8 kgCO2e/m3
    return binder_emission + agg_emission + 8.0

def calculate_impacts(
    project: ProjectInput,
    guardrail: GuardrailResult
) -> Tuple[float, float, float, MixOption, MixOption]:
    binder_kg = estimate_binder_content(project.fc_prime_mpa)
    base_cost_rate = get_base_cost_per_m3(project.fc_prime_mpa)
    vol = project.volume_m3

    # Baseline: 100% OPC Type 1
    baseline_intensity = calculate_mix_emission_intensity(binder_kg, opc_kg=binder_kg, hydraulic_kg=0, flyash_kg=0, slag_kg=0)
    baseline_total_tco2e = (baseline_intensity * vol) / 1000.0
    baseline_total_cost = base_cost_rate * vol

    # Option A: Balanced (OPC + 20-25% Fly Ash or TIS 2594 Hydraulic) -> ~20-25% reduction
    opt_a_scm_pct = min(guardrail.max_scm_percent, 25.0 if guardrail.max_scm_percent >= 25 else guardrail.max_scm_percent)
    opt_a_flyash_kg = binder_kg * (opt_a_scm_pct / 100.0)
    opt_a_opc_kg = binder_kg - opt_a_flyash_kg
    opt_a_intensity = calculate_mix_emission_intensity(binder_kg, opc_kg=opt_a_opc_kg, hydraulic_kg=0, flyash_kg=opt_a_flyash_kg, slag_kg=0)
    opt_a_total_tco2e = (opt_a_intensity * vol) / 1000.0
    opt_a_cut_tco2e = max(0.0, baseline_total_tco2e - opt_a_total_tco2e)
    opt_a_cut_pct = (opt_a_cut_tco2e / baseline_total_tco2e) * 100.0
    # Fly ash replaces cement -> ~3-5% material saving
    opt_a_cost_saving_rate = base_cost_rate * (0.015 + (opt_a_scm_pct / 100.0) * 0.08)
    opt_a_cost_delta = opt_a_cost_saving_rate * vol

    opt_a = MixOption(
        name=f"Balanced Mix (เถ้าลอย มอก. 2135 สัดส่วน {opt_a_scm_pct:.0f}%)",
        binder_description=f"ปูนซีเมนต์ปอร์ตแลนด์ร่วมกับเถ้าลอย มอก. 2135 ชั้น F สัดส่วน {opt_a_scm_pct:.0f}%",
        scm_replacement_percent=opt_a_scm_pct,
        scm_type="TIS_2135_FlyAsh_Class_F",
        target_fc_mpa=project.fc_prime_mpa,
        acceptance_age_days=guardrail.recommended_test_age_days,
        max_wb_ratio=0.45 if project.fc_prime_mpa <= 35 else 0.38,
        carbon_intensity_kg_m3=round(opt_a_intensity, 1),
        carbon_reduction_tco2e=round(opt_a_cut_tco2e, 1),
        carbon_reduction_percent=round(opt_a_cut_pct, 1),
        cost_delta_thb=round(opt_a_cost_delta, 0),
        risk_rating="Low",
        compliance_status="Pass",
        notes="ความเสี่ยงต่ำ กำลังอัดและสมรรถนะเทียบเท่าสูตรเดิม ประหยัดต้นทุนเล็กน้อย"
    )

    # Option B: High Reduction (Slag 40% or Max Fly Ash up to guardrail limit)
    opt_b_scm_pct = guardrail.max_scm_percent
    use_slag = "ASTM_C989_Slag" in guardrail.allowed_scms and opt_b_scm_pct >= 30.0
    if use_slag:
        opt_b_slag_kg = binder_kg * (opt_b_scm_pct / 100.0)
        opt_b_opc_kg = binder_kg - opt_b_slag_kg
        opt_b_intensity = calculate_mix_emission_intensity(binder_kg, opc_kg=opt_b_opc_kg, hydraulic_kg=0, flyash_kg=0, slag_kg=opt_b_slag_kg)
        scm_name = f"Slag (GGBS) {opt_b_scm_pct:.0f}%"
        scm_type = "ASTM_C989_Slag"
        # Slag in Thailand may have slight premium or parity
        opt_b_cost_delta = - (base_cost_rate * 0.02) * vol
    else:
        opt_b_flyash_kg = binder_kg * (opt_b_scm_pct / 100.0)
        opt_b_hydraulic_kg = binder_kg - opt_b_flyash_kg
        opt_b_intensity = calculate_mix_emission_intensity(binder_kg, opc_kg=0, hydraulic_kg=opt_b_hydraulic_kg, flyash_kg=opt_b_flyash_kg, slag_kg=0)
        scm_name = f"เถ้าลอย มอก. 2135 {opt_b_scm_pct:.0f}%"
        scm_type = "TIS_2135_FlyAsh_Class_F"
        opt_b_cost_delta = base_cost_rate * 0.04 * vol

    opt_b_total_tco2e = (opt_b_intensity * vol) / 1000.0
    opt_b_cut_tco2e = max(0.0, baseline_total_tco2e - opt_b_total_tco2e)
    opt_b_cut_pct = (opt_b_cut_tco2e / baseline_total_tco2e) * 100.0

    opt_b = MixOption(
        name=f"Maximum Carbon Reduction ({scm_name})",
        binder_description=f"สูตรลดคาร์บอนสูงสุดด้วย {scm_name} โดยคงเกรดกำลังอัดระบุ {project.fc_prime_mpa} MPa",
        scm_replacement_percent=opt_b_scm_pct,
        scm_type=scm_type,
        target_fc_mpa=project.fc_prime_mpa,
        acceptance_age_days=guardrail.recommended_test_age_days,
        max_wb_ratio=0.42 if project.fc_prime_mpa <= 35 else 0.35,
        carbon_intensity_kg_m3=round(opt_b_intensity, 1),
        carbon_reduction_tco2e=round(opt_b_cut_tco2e, 1),
        carbon_reduction_percent=round(opt_b_cut_pct, 1),
        cost_delta_thb=round(opt_b_cost_delta, 0),
        risk_rating="Medium",
        compliance_status="Needs Review",
        notes=f"ลดคาร์บอนระดับสูง ({opt_b_cut_pct:.1f}%) ต้องมี Curing Plan และผลทดสอบ Trial Mix ยืนยัน"
    )

    return (
        round(baseline_intensity, 1),
        round(baseline_total_tco2e, 1),
        round(baseline_total_cost, 0),
        opt_a,
        opt_b
    )
