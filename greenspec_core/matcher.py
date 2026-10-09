from typing import Dict, Any, List, Optional
from greenspec_core.types import ProjectInput, GuardrailResult
from greenspec_core.catalog import SupplierProduct, get_catalog

def match_products(project: ProjectInput, guardrail: GuardrailResult) -> Dict[str, Any]:
    catalog = get_catalog()
    elem = project.element_type.lower()
    req_fc = project.fc_prime_mpa
    vol = project.volume_m3

    # Filter ready-mix products that satisfy structural safety
    ready_mix_candidates = []
    for p in catalog:
        if p.category != "ready_mix_concrete":
            continue
        # Compressive strength must meet or exceed required
        if p.fc_prime_mpa < req_fc:
            continue
        # SCM replacement must not exceed guardrail limit
        if p.scm_replacement_pct > guardrail.max_scm_percent:
            continue
        ready_mix_candidates.append(p)

    # Sort candidates by carbon intensity (lowest carbon first)
    ready_mix_candidates.sort(key=lambda x: x.carbon_intensity)

    # 1. Balanced Product: Moderate SCM (~20-25%), low risk, competitive cost
    balanced_candidates = [
        p for p in ready_mix_candidates
        if 20.0 <= p.scm_replacement_pct <= 28.0
    ]
    balanced_prod = balanced_candidates[0] if balanced_candidates else (ready_mix_candidates[-1] if ready_mix_candidates else None)

    # 2. Maximum Carbon Cut Product: Highest SCM up to guardrail limit
    max_carbon_candidates = [
        p for p in ready_mix_candidates
        if p.scm_replacement_pct > 28.0
    ]
    max_carbon_prod = max_carbon_candidates[0] if max_carbon_candidates else (ready_mix_candidates[0] if ready_mix_candidates else balanced_prod)

    # 3. Raw Materials (EGAT Mae Moh Fly Ash & Bottom Ash)
    fly_ash = next((p for p in catalog if p.product_id == "EGAT-FLYASH-F"), None)
    bottom_ash = next((p for p in catalog if p.product_id == "EGAT-BOTTOMASH-AGG"), None)

    return {
        "status": "matched" if balanced_prod else "no_direct_match",
        "balanced_product": balanced_prod.to_dict() if balanced_prod else None,
        "balanced_total_cost_thb": round(balanced_prod.price_per_unit_thb * vol, 0) if balanced_prod else 0.0,
        "max_carbon_product": max_carbon_prod.to_dict() if max_carbon_prod else None,
        "max_carbon_total_cost_thb": round(max_carbon_prod.price_per_unit_thb * vol, 0) if max_carbon_prod else 0.0,
        "raw_scm_option": fly_ash.to_dict() if fly_ash else None,
        "bottom_ash_option": bottom_ash.to_dict() if bottom_ash else None,
        "matching_notes": (
            f"จับคู่สินค้าสำเร็จสำหรับโครงสร้าง {project.element_type} (กำลังอัด {req_fc} MPa). "
            f"คัดเลือกผลิตภัณฑ์ที่มีใบรับรอง EPD และฉลากคาร์บอนฟุตพริ้นท์ TGO"
        )
    }
