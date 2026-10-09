# tests/test_config_and_types.py
import pytest
from greenspec_core.config import Config, EMISSION_FACTORS
from greenspec_core.types import ProjectInput, GuardrailResult, AnalysisResult

def test_default_config_emission_factors():
    assert "OPC_Type_1" in EMISSION_FACTORS
    assert EMISSION_FACTORS["OPC_Type_1"] == 830.0
    assert EMISSION_FACTORS["TIS_2594_Hydraulic"] == 690.0
    assert EMISSION_FACTORS["TIS_2135_FlyAsh"] == 18.0

def test_config_typhoon_and_supabase_fields():
    cfg = Config()
    assert hasattr(cfg, "typhoon_api_key")
    assert hasattr(cfg, "typhoon_base_url")
    assert hasattr(cfg, "typhoon_model")
    assert hasattr(cfg, "supabase_url")
    assert hasattr(cfg, "supabase_anon_key")
    assert hasattr(cfg, "supabase_service_role_key")
    assert "opentyphoon" in cfg.typhoon_base_url

def test_project_input_validation():
    data = ProjectInput(
        project_name="Test Tower",
        element_type="mat_foundation",
        volume_m3=1000.0,
        fc_prime_mpa=35.0,
        test_age_days=28
    )
    assert data.project_name == "Test Tower"
    assert data.element_type == "mat_foundation"
    assert data.volume_m3 == 1000.0
    assert data.fc_prime_mpa == 35.0
