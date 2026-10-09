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

THAI_MATERIAL_CATALOG: List[SupplierProduct] = [
    # --- CPAC (SCG) Ready-Mix Concrete ---
    SupplierProduct(
        product_id="CPAC-LC-350",
        brand="CPAC (SCG)",
        product_name="CPAC Low Carbon Concrete f'c 35 MPa (Cylinder)",
        category="ready_mix_concrete",
        fc_prime_mpa=35.0,
        scm_type="TIS_2594_Hydraulic_With_FlyAsh",
        scm_replacement_pct=25.0,
        carbon_intensity=245.0,
        unit="m3",
        price_per_unit_thb=2550.0,
        epd_certified=True,
        certifications=["ฉลากคาร์บอนฟุตพริ้นท์ TGO", "SCG Green Choice", "LEED v4.1 Eligible"],
        standards=["มอก. 213 (คอนกรีตผสมเสร็จ)", "มอก. 2594 (ปูนไฮดรอลิก)", "วสท. 1014"],
        suitable_elements=["mat_foundation", "beam_slab", "column", "general"],
        supplier_notes="ใช้ปูนซีเมนต์ไฮดรอลิกผสมเถ้าลอยแม่เมาะ ลดคาร์บอนลง 22% ผ่านเกณฑ์อาคารเขียว"
    ),
    SupplierProduct(
        product_id="CPAC-LC-320",
        brand="CPAC (SCG)",
        product_name="CPAC Low Carbon Concrete f'c 32 MPa (Cylinder)",
        category="ready_mix_concrete",
        fc_prime_mpa=32.0,
        scm_type="TIS_2594_Hydraulic_With_FlyAsh",
        scm_replacement_pct=25.0,
        carbon_intensity=235.0,
        unit="m3",
        price_per_unit_thb=2450.0,
        epd_certified=True,
        certifications=["ฉลากคาร์บอนฟุตพริ้นท์ TGO", "SCG Green Choice"],
        standards=["มอก. 213", "มอก. 2594"],
        suitable_elements=["beam_slab", "mat_foundation", "general"],
        supplier_notes="สูตรมาตรฐานสำหรับงานโครงสร้างอาคารทั่วไปและพื้นคอนกรีต"
    ),
    SupplierProduct(
        product_id="CPAC-LC-400-MASS",
        brand="CPAC (SCG)",
        product_name="CPAC Low Heat Low Carbon Concrete f'c 40 MPa @ 56 Days",
        category="ready_mix_concrete",
        fc_prime_mpa=40.0,
        scm_type="TIS_2135_FlyAsh_Class_F",
        scm_replacement_pct=35.0,
        carbon_intensity=210.0,
        unit="m3",
        price_per_unit_thb=2750.0,
        epd_certified=True,
        certifications=["ฉลากคาร์บอนฟุตพริ้นท์ TGO", "SCG Green Choice", "Low Heat Hydration"],
        standards=["มอก. 213", "ACI 207 (Mass Concrete)", "วสท. 1014"],
        suitable_elements=["mat_foundation", "mass_concrete"],
        supplier_notes="สูตรสำหรับฐานรากหนาพิเศษ ควบคุมอุณหภูมิความร้อนไฮเดรชันเพื่อลดรอยแตกร้าว"
    ),

    # --- INSEE (Siam City Cement) Ready-Mix Concrete ---
    SupplierProduct(
        product_id="INSEE-ECO-350",
        brand="INSEE (ปูนนกอินทรี)",
        product_name="INSEE Eco-Concrete f'c 35 MPa (Cylinder)",
        category="ready_mix_concrete",
        fc_prime_mpa=35.0,
        scm_type="TIS_2594_Hydraulic",
        scm_replacement_pct=22.0,
        carbon_intensity=248.0,
        unit="m3",
        price_per_unit_thb=2540.0,
        epd_certified=True,
        certifications=["ฉลากลดโลกร้อน TGO", "INSEE Green Heart", "TREES Compliant"],
        standards=["มอก. 213", "มอก. 2594"],
        suitable_elements=["mat_foundation", "beam_slab", "column", "general"],
        supplier_notes="คอนกรีตรักษ์โลกอินทรี ผสมปูนซีเมนต์ไฮดรอลิกอินทรีเพชร พัฒนากำลังอัดได้รวดเร็ว"
    ),
    SupplierProduct(
        product_id="INSEE-ECO-SLAG-350",
        brand="INSEE (ปูนนกอินทรี)",
        product_name="INSEE Slag Blend Concrete f'c 35 MPa",
        category="ready_mix_concrete",
        fc_prime_mpa=35.0,
        scm_type="ASTM_C989_Slag",
        scm_replacement_pct=40.0,
        carbon_intensity=202.0,
        unit="m3",
        price_per_unit_thb=2680.0,
        epd_certified=True,
        certifications=["ฉลากคาร์บอนฟุตพริ้นท์ TGO", "EPD Verified"],
        standards=["มอก. 213", "ASTM C989"],
        suitable_elements=["mat_foundation", "mass_concrete", "marine"],
        supplier_notes="คอนกรีตผสมสแลกเตาถลุง ลดคาร์บอนสูงถึง 36% ทนทานต่อคลอไรด์และซัลเฟตสูง"
    ),

    # --- EGAT Mae Moh By-Products (Raw SCMs & Aggregates) ---
    SupplierProduct(
        product_id="EGAT-FLYASH-F",
        brand="กฟผ. แม่เมาะ (EGAT)",
        product_name="เถ้าลอยแม่เมาะ มอก. 2135 ชั้นคุณภาพ F (Mae Moh Fly Ash Class F)",
        category="pozzolan_scm",
        fc_prime_mpa=0.0,
        scm_type="TIS_2135_FlyAsh_Class_F",
        scm_replacement_pct=100.0,
        carbon_intensity=18.0,
        unit="ton",
        price_per_unit_thb=450.0,
        epd_certified=True,
        certifications=["มอก. 2135-2545", "ASTM C618 Class F", "ฉลาก Circular Economy TGO"],
        standards=["มอก. 2135", "ASTM C618"],
        suitable_elements=["mat_foundation", "beam_slab", "mass_concrete", "precast"],
        supplier_notes="วัตถุพลอยได้จากโรงไฟฟ้าแม่เมาะ ค่า LOI <= 4.5% ซิลิกาสูง ทำปฏิกิริยาปอซโซลานได้ดีเยี่ยม"
    ),
    SupplierProduct(
        product_id="EGAT-BOTTOMASH-AGG",
        brand="กฟผ. แม่เมาะ (EGAT)",
        product_name="เถ้าหนักแม่เมาะ มอก. 2601 สำหรับมวลรวมคอนกรีต (Mae Moh Bottom Ash)",
        category="aggregate_replacement",
        fc_prime_mpa=0.0,
        scm_type="TIS_2601_BottomAsh",
        scm_replacement_pct=100.0,
        carbon_intensity=12.0,
        unit="ton",
        price_per_unit_thb=150.0,
        epd_certified=True,
        certifications=["มอก. 2601-2556", "ASTM C331", "Zero Waste to Landfill Initiative"],
        standards=["มอก. 2601", "ASTM C331"],
        suitable_elements=["masonry_blocks", "road_base", "lightweight_concrete"],
        supplier_notes="เถ้าก้นเตาเม็ดหยาบใช้ทดแทนทรายธรรมชาติ 10-30% หรือใช้ผลิตบล็อกปูถนนและอิฐมวลเบา"
    )
]

def get_catalog() -> List[SupplierProduct]:
    return list(THAI_MATERIAL_CATALOG)
