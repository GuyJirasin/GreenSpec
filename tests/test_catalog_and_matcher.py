# tests/test_catalog_and_matcher.py
import pytest
from greenspec_core.types import ProjectInput
from greenspec_core.guardrails import evaluate_guardrail
from greenspec_core.catalog import THAI_MATERIAL_CATALOG, get_catalog
from greenspec_core.matcher import match_products

def test_catalog_contains_real_thai_products():
    catalog = get_catalog()
    assert len(catalog) >= 6

    # Verify CPAC product
    cpac_items = [p for p in catalog if "CPAC" in p.brand]
    assert len(cpac_items) > 0
    assert any(p.epd_certified for p in cpac_items)

    # Verify Insee product
    insee_items = [p for p in catalog if "INSEE" in p.brand]
    assert len(insee_items) > 0

    # Verify EGAT Fly Ash and Bottom Ash
    egat_items = [p for p in catalog if "กฟผ" in p.brand or "EGAT" in p.brand]
    assert len(egat_items) >= 2
    fly_ash = next(p for p in egat_items if "เถ้าลอย" in p.product_name)
    bottom_ash = next(p for p in egat_items if "เถ้าหนัก" in p.product_name)

    assert "2135" in fly_ash.standards[0]
    assert "2601" in bottom_ash.standards[0]

def test_product_matching_for_mat_foundation():
    proj = ProjectInput(
        project_name="Icon Tower",
        element_type="mat_foundation",
        volume_m3=2000.0,
        fc_prime_mpa=35.0,
        notes="Mass concrete mat foundation"
    )
    guardrail = evaluate_guardrail(proj)
    match_result = match_products(proj, guardrail)

    assert match_result["balanced_product"] is not None
    assert match_result["max_carbon_product"] is not None
    assert match_result["raw_scm_option"] is not None

    balanced = match_result["balanced_product"]
    assert balanced["fc_prime_mpa"] >= 35.0
    assert balanced["epd_certified"] is True

    raw_scm = match_result["raw_scm_option"]
    assert "เถ้าลอย" in raw_scm["product_name"]
