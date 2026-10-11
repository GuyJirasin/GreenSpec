from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional

@dataclass
class SupplierProduct:
    product_id: str
    brand: str
    product_name: str
    category: str                       # ready_mix_concrete, pozzolan_scm, aggregate_replacement
    fc_prime_mpa: float                 # Specified compressive strength (cylinder)
    scm_type: str                       # TIS_2135_FlyAsh_Class_F, TIS_2594_Hydraulic, ASTM_C989_Slag, TIS_2601_BottomAsh
    scm_replacement_pct: float          # Percentage of SCM replacement
    carbon_intensity: float             # kgCO2e/m3 for concrete, or kgCO2e/ton for raw materials
    unit: str                           # m3 or ton
    price_per_unit_thb: float           # Estimated base price
    epd_certified: bool
    certifications: List[str]
    standards: List[str]
    suitable_elements: List[str]
    supplier_notes: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

THAI_MATERIAL_CATALOG: List[SupplierProduct] = []

def get_catalog() -> List[SupplierProduct]:
    return list(THAI_MATERIAL_CATALOG)
