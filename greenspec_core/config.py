import os
from dataclasses import dataclass

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

EMISSION_FACTORS = {
    "OPC_Type_1": 830.0,              # kgCO2e / ton
    "TIS_2594_Hydraulic": 690.0,       # kgCO2e / ton
    "TIS_2135_FlyAsh": 18.0,          # kgCO2e / ton
    "ASTM_C989_Slag": 85.0,            # kgCO2e / ton
    "Aggregates": 5.0,                 # kgCO2e / ton
}

READY_MIX_BASE_COST_PER_M3 = {
    25.0: 2200.0,
    30.0: 2400.0,
    35.0: 2600.0,
    40.0: 2850.0,
    50.0: 3200.0,
}

@dataclass
class Config:
    # Typhoon LLM Settings
    typhoon_api_key: str = os.getenv("TYPHOON_API_KEY", "")
    typhoon_base_url: str = os.getenv("TYPHOON_BASE_URL", "https://api.opentyphoon.ai/v1")
    typhoon_model: str = os.getenv("TYPHOON_MODEL", "typhoon-v1.5-instruct")
    temperature: float = 0.2
    max_tokens: int = 2500

    # Supabase Settings (Database & Vector RAG)
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
