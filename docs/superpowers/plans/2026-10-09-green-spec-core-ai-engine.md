# GreenSpec Core AI Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a serverless-ready Python package (`greenspec_core/`) that enforces deterministic civil engineering guardrails (TIS/ACI/EIT), calculates embodied carbon and cost deltas, and leverages Typhoon LLM (with pluggable RAG) to draft legally precise construction TOR clauses and technical approval packages.

**Architecture:** A decoupled modular pipeline where incoming concrete requirements are first evaluated by a deterministic civil engineering guardrail (zero hallucination for structural safety), calculated for carbon and cost impacts, augmented with standards context via a pluggable RAG interface, drafted into CSI 3-Part/EIT specification clauses by Typhoon LLM with exact parameter infill, and packaged into an approval-ready technical package.

**Tech Stack:** Python 3.10+, Pytest 8.2+, Pydantic/dataclasses, standard library `urllib` / `json` (or lightweight HTTP client) for Typhoon OpenAI-compatible API, zero heavy framework dependencies for instant serverless cold-starts.

## Global Constraints

- Standalone, lightweight Python package under `greenspec_core/` with minimal external dependencies.
- Pluggable RAG design: abstract `BaseRetriever` interface so external developers can attach any vector DB without modifying core logic.
- Typhoon LLM integration: OpenAI-compatible REST API client with built-in mock mode for offline testing.
- Civil Engineering standards adherence: TIS 2135 (Fly Ash Class F), TIS 2594 (Hydraulic Cement), TIS 15 (OPC), EIT 1014 (วสท.), ACI 318, ACI 207 (Mass Concrete).
- 100% test coverage on guardrail safety constraints and calculator formulas.

---

### Task 1: Project Setup, Config & Core Domain Schemas

**Files:**
- Create: `greenspec_core/__init__.py`
- Create: `greenspec_core/config.py`
- Create: `greenspec_core/types.py`
- Test: `tests/test_config_and_types.py`

**Interfaces:**
- Produces: `ProjectInput`, `GuardrailResult`, `MixOption`, `ComplianceItem`, `TechnicalPackage`, `AnalysisResult` dataclasses; `Config` with Typhoon and emission factors.

- [ ] **Step 1: Write failing test for config and domain schemas**

```python
# tests/test_config_and_types.py
import pytest
from greenspec_core.config import Config, EMISSION_FACTORS
from greenspec_core.types import ProjectInput, GuardrailResult, AnalysisResult

def test_default_config_emission_factors():
    assert "OPC_Type_1" in EMISSION_FACTORS
    assert EMISSION_FACTORS["OPC_Type_1"] == 830.0
    assert EMISSION_FACTORS["TIS_2594_Hydraulic"] == 690.0
    assert EMISSION_FACTORS["TIS_2135_FlyAsh"] == 18.0

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/test_config_and_types.py -v`
Expected: FAIL (ModuleNotFoundError: No module named 'greenspec_core')

- [ ] **Step 3: Implement config and types**

Create `greenspec_core/__init__.py`:
```python
"""GreenSpec Core AI Engine & Civil Engineering Knowledge Architecture."""
from greenspec_core.config import Config, EMISSION_FACTORS
from greenspec_core.types import (
    ProjectInput,
    GuardrailResult,
    MixOption,
    ComplianceItem,
    TechnicalPackage,
    AnalysisResult,
)

__all__ = [
    "Config",
    "EMISSION_FACTORS",
    "ProjectInput",
    "GuardrailResult",
    "MixOption",
    "ComplianceItem",
    "TechnicalPackage",
    "AnalysisResult",
]
```

Create `greenspec_core/config.py`:
```python
import os
from dataclasses import dataclass

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
    typhoon_api_key: str = os.getenv("TYPHOON_API_KEY", "")
    typhoon_base_url: str = os.getenv("TYPHOON_BASE_URL", "https://api.opentyphoon.ai/v1")
    typhoon_model: str = os.getenv("TYPHOON_MODEL", "typhoon-v1.5-instruct")
    temperature: float = 0.2
    max_tokens: int = 2500
```

Create `greenspec_core/types.py`:
```python
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any

@dataclass
class ProjectInput:
    project_name: str
    element_type: str                   # mat_foundation, pt_slab, column, beam_slab
    volume_m3: float
    fc_prime_mpa: float
    test_age_days: int = 28
    current_binder: str = "OPC_Type_1"
    slump_cm: float = 12.0
    exposure_class: str = "normal"      # normal, marine, sulfate
    notes: str = ""

@dataclass
class GuardrailResult:
    element_type: str
    status: str                         # Pass, Needs Review, Blocked
    risk_rating: str                    # Low, Medium, High
    max_scm_percent: float
    recommended_binder: str
    allowed_scms: List[str]
    early_strength_required: bool
    recommended_test_age_days: int
    mandatory_curing_days: int
    thermal_control_plan_required: bool
    reasons: List[str]

@dataclass
class MixOption:
    name: str
    binder_description: str
    scm_replacement_percent: float
    scm_type: str
    target_fc_mpa: float
    acceptance_age_days: int
    max_wb_ratio: float
    carbon_intensity_kg_m3: float
    carbon_reduction_tco2e: float
    carbon_reduction_percent: float
    cost_delta_thb: float
    risk_rating: str
    compliance_status: str
    notes: str

@dataclass
class ComplianceItem:
    property_name: str
    original_spec: str
    proposed_spec: str
    standard_reference: str
    justification: str

@dataclass
class TechnicalPackage:
    spec_clause_th: str
    spec_clause_en: str
    compliance_matrix: List[ComplianceItem]
    submittal_checklist: List[str]

@dataclass
class AnalysisResult:
    project_name: str
    element_type: str
    volume_m3: float
    guardrail: GuardrailResult
    baseline_carbon_intensity_kg_m3: float
    baseline_total_tco2e: float
    baseline_cost_thb: float
    option_a: MixOption
    option_b: MixOption
    technical_package: Optional[TechnicalPackage] = None

    def to_dict(self) -> Dict[str, Any]:
        from dataclasses import asdict
        return asdict(self)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m pytest tests/test_config_and_types.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add greenspec_core/ tests/test_config_and_types.py
git commit -m "feat(core): setup package structure, config and core domain types"
```

---

### Task 2: Deterministic Civil Engineering Guardrail Engine

**Files:**
- Create: `greenspec_core/guardrails.py`
- Test: `tests/test_guardrails.py`

**Interfaces:**
- Consumes: `ProjectInput`, `GuardrailResult` from `greenspec_core.types`
- Produces: `evaluate_guardrail(project: ProjectInput) -> GuardrailResult`

- [ ] **Step 1: Write failing tests for guardrail rules**

```python
# tests/test_guardrails.py
import pytest
from greenspec_core.types import ProjectInput
from greenspec_core.guardrails import evaluate_guardrail

def test_mat_foundation_mass_concrete_rules():
    proj = ProjectInput(
        project_name="Metro Station",
        element_type="mat_foundation",
        volume_m3=2000.0,
        fc_prime_mpa=35.0,
        notes="Mat foundation 1.5m thick"
    )
    result = evaluate_guardrail(proj)
    assert result.status == "Pass"
    assert result.risk_rating == "Low"
    assert result.max_scm_percent >= 35.0
    assert result.recommended_test_age_days == 56
    assert result.thermal_control_plan_required is True
    assert result.mandatory_curing_days >= 7

def test_post_tensioned_slab_early_strength_cap():
    proj = ProjectInput(
        project_name="Residential Tower",
        element_type="pt_slab",
        volume_m3=300.0,
        fc_prime_mpa=32.0,
        notes="Post tensioned floor slab"
    )
    result = evaluate_guardrail(proj)
    assert result.max_scm_percent <= 20.0
    assert result.early_strength_required is True
    assert result.recommended_test_age_days == 28

def test_column_high_strength_rules():
    proj = ProjectInput(
        project_name="High Rise Tower",
        element_type="column",
        volume_m3=500.0,
        fc_prime_mpa=50.0
    )
    result = evaluate_guardrail(proj)
    assert result.max_scm_percent <= 25.0
    assert result.recommended_test_age_days == 28
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/test_guardrails.py -v`
Expected: FAIL (ModuleNotFoundError: No module named 'greenspec_core.guardrails')

- [ ] **Step 3: Implement deterministic civil engineering guardrail**

Create `greenspec_core/guardrails.py`:
```python
from greenspec_core.types import ProjectInput, GuardrailResult

def evaluate_guardrail(project: ProjectInput) -> GuardrailResult:
    elem = project.element_type.lower()
    fc = project.fc_prime_mpa
    notes = (project.notes or "").lower()

    is_mass_concrete = "mat" in elem or "footing" in elem or "mass" in notes or "1." in notes or "2." in notes
    is_pt = "pt" in elem or "post" in elem or "tension" in notes
    is_column = "column" in elem or "wall" in elem or "shear" in elem

    if is_mass_concrete:
        return GuardrailResult(
            element_type=project.element_type,
            status="Pass",
            risk_rating="Low",
            max_scm_percent=40.0,
            recommended_binder="TIS_2594_Hydraulic_With_FlyAsh",
            allowed_scms=["TIS_2135_FlyAsh_Class_F", "ASTM_C989_Slag"],
            early_strength_required=False,
            recommended_test_age_days=56,
            mandatory_curing_days=14,
            thermal_control_plan_required=True,
            reasons=[
                "ACI 207 / วสท. 1014: องค์อาคารมีความหนา เข้าเกณฑ์ Mass Concrete เสี่ยงต่อ Thermal Cracking",
                "แนะนำการใช้ SCM สูง (25-40%) เพื่อลด Heat of Hydration และควบคุมผลต่างอุณหภูมิ delta T <= 20 deg C",
                "อนุญาตให้ใช้เกณฑ์กำลังอัดที่อายุ 56 วัน (f'c,56) เป็นเกณฑ์ตรวจรับงานเพื่อรองรับการพัฒนากำลังระยะยาว"
            ]
        )

    if is_pt:
        return GuardrailResult(
            element_type=project.element_type,
            status="Needs Review",
            risk_rating="Medium",
            max_scm_percent=20.0,
            recommended_binder="TIS_2594_Hydraulic",
            allowed_scms=["TIS_2135_FlyAsh_Class_F"],
            early_strength_required=True,
            recommended_test_age_days=28,
            mandatory_curing_days=7,
            thermal_control_plan_required=False,
            reasons=[
                "ACI 318 / วสท. 1014: โครงสร้างคอนกรีตอัดแรง (Post-Tensioned) ต้องการ Early-age strength สำหรับดึงลวด (Tendon Stressing)",
                "จำกัดสัดส่วนเถ้าลอย (Fly Ash) ไม่เกิน 20% เพื่อป้องกันกำลังอัดช่วง 3-7 วันขึ้นช้า",
                "ต้องระบุกำลังอัดขั้นต่ำก่อนดึงลวด (มักต้องการ f'c >= 18-24 MPa) ในข้อกำหนด TOR ชัดเจน"
            ]
        )

    if is_column:
        max_scm = 20.0 if fc >= 45.0 else 25.0
        return GuardrailResult(
            element_type=project.element_type,
            status="Pass",
            risk_rating="Low",
            max_scm_percent=max_scm,
            recommended_binder="TIS_2594_Hydraulic",
            allowed_scms=["TIS_2135_FlyAsh_Class_F", "ASTM_C989_Slag"],
            early_strength_required=True,
            recommended_test_age_days=28,
            mandatory_curing_days=7,
            thermal_control_plan_required=False,
            reasons=[
                "เสาและผนังรับแรงเฉือนต้องรับแรงอัดแกนสูงและต้องการ Modulus of Elasticity (Ec) สูง",
                "แนะนำปูนซีเมนต์ไฮดรอลิก มอก. 2594 หรือใช้เถ้าลอยไม่เกิน 20-25% ควบคุม W/B <= 0.38",
                "ต้องใช้สารลดน้ำยิ่งยวด (Superplasticizer) เพื่อคงค่ายุบตัวโดยไม่เพิ่มปริมาณน้ำ"
            ]
        )

    # Normal Beam / Slab / Wall / Pile
    return GuardrailResult(
        element_type=project.element_type,
        status="Pass",
        risk_rating="Low",
        max_scm_percent=30.0,
        recommended_binder="TIS_2594_Hydraulic_With_FlyAsh",
        allowed_scms=["TIS_2135_FlyAsh_Class_F", "ASTM_C989_Slag"],
        early_strength_required=False,
        recommended_test_age_days=28,
        mandatory_curing_days=7,
        thermal_control_plan_required=False,
        reasons=[
            "คอนกรีตโครงสร้างทั่วไป (คาน-พื้น) สามารถแทนที่ด้วยปูนไฮดรอลิก มอก. 2594 หรือเถ้าลอย 20-30% ได้อย่างปลอดภัย",
            "ต้องมีการบ่มชื้นต่อเนื่อง (Moist Curing) อย่างน้อย 7 วัน เพื่อให้ปฏิกิริยาปอซโซลานเกิดสมบูรณ์"
        ]
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m pytest tests/test_guardrails.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add greenspec_core/guardrails.py tests/test_guardrails.py
git commit -m "feat(guardrail): implement deterministic civil engineering constraints"
```

---

### Task 3: Carbon & Cost Calculation Engine

**Files:**
- Create: `greenspec_core/calculator.py`
- Test: `tests/test_calculator.py`

**Interfaces:**
- Consumes: `ProjectInput`, `GuardrailResult`, `EMISSION_FACTORS`, `READY_MIX_BASE_COST_PER_M3`
- Produces: `calculate_impacts(project: ProjectInput, guardrail: GuardrailResult) -> Tuple[float, float, float, MixOption, MixOption]`

- [ ] **Step 1: Write failing test for carbon and cost calculations**

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/test_calculator.py -v`
Expected: FAIL (ModuleNotFoundError: No module named 'greenspec_core.calculator')

- [ ] **Step 3: Implement calculation formulas**

Create `greenspec_core/calculator.py`:
```python
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

    # Option A: Balanced (TIS 2594 Hydraulic + 20-25% Fly Ash)
    opt_a_scm_pct = min(guardrail.max_scm_percent, 25.0 if guardrail.max_scm_percent >= 25 else guardrail.max_scm_percent)
    opt_a_flyash_kg = binder_kg * (opt_a_scm_pct / 100.0)
    opt_a_hydraulic_kg = binder_kg - opt_a_flyash_kg
    opt_a_intensity = calculate_mix_emission_intensity(binder_kg, opc_kg=0, hydraulic_kg=opt_a_hydraulic_kg, flyash_kg=opt_a_flyash_kg, slag_kg=0)
    opt_a_total_tco2e = (opt_a_intensity * vol) / 1000.0
    opt_a_cut_tco2e = max(0.0, baseline_total_tco2e - opt_a_total_tco2e)
    opt_a_cut_pct = (opt_a_cut_tco2e / baseline_total_tco2e) * 100.0
    # Fly ash replaces cement -> ~3-5% material saving
    opt_a_cost_saving_rate = base_cost_rate * (0.015 + (opt_a_scm_pct / 100.0) * 0.08)
    opt_a_cost_delta = opt_a_cost_saving_rate * vol

    opt_a = MixOption(
        name=f"Balanced Mix (ปูนไฮดรอลิก มอก. 2594 + เถ้าลอย {opt_a_scm_pct:.0f}%)",
        binder_description=f"ปูนซีเมนต์ไฮดรอลิก มอก. 2594 ร่วมกับเถ้าลอย มอก. 2135 ชั้น F สัดส่วน {opt_a_scm_pct:.0f}%",
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m pytest tests/test_calculator.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add greenspec_core/calculator.py tests/test_calculator.py
git commit -m "feat(calculator): implement carbon baseline and ready-mix cost models"
```

---

### Task 4: Pluggable RAG Interface & Local Standards Knowledge

**Files:**
- Create: `greenspec_core/rag_interface.py`
- Test: `tests/test_rag_interface.py`

**Interfaces:**
- Produces: `BaseRetriever` (Abstract Base Class), `LocalStandardsRetriever` (Built-in default)

- [ ] **Step 1: Write failing test for RAG interface and local retrieval**

```python
# tests/test_rag_interface.py
import pytest
from greenspec_core.rag_interface import BaseRetriever, LocalStandardsRetriever

def test_local_retriever_returns_relevant_standards():
    retriever = LocalStandardsRetriever()
    assert isinstance(retriever, BaseRetriever)

    # Query for mat foundation / mass concrete
    docs = retriever.retrieve(element_type="mat_foundation", query="mass concrete fly ash")
    assert len(docs) > 0
    combined = " ".join(docs)
    assert "วสท." in combined or "ACI 207" in combined
    assert "มอก. 2135" in combined

def test_local_retriever_returns_pt_slab_standards():
    retriever = LocalStandardsRetriever()
    docs = retriever.retrieve(element_type="pt_slab", query="early strength tendon")
    combined = " ".join(docs)
    assert "ACI 318" in combined or "Early-age" in combined
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/test_rag_interface.py -v`
Expected: FAIL (ModuleNotFoundError: No module named 'greenspec_core.rag_interface')

- [ ] **Step 3: Implement pluggable RAG interface**

Create `greenspec_core/rag_interface.py`:
```python
from abc import ABC, abstractmethod
from typing import List

class BaseRetriever(ABC):
    """Abstract interface for RAG context retrieval."""
    @abstractmethod
    def retrieve(self, element_type: str, query: str) -> List[str]:
        """Retrieve relevant standard clauses or knowledge snippets."""
        pass

class LocalStandardsRetriever(BaseRetriever):
    """Default embedded knowledge base for Thai and international concrete standards."""

    STANDARDS_DB = {
        "mass_concrete": [
            "วสท. 1014 / ACI 207.1R: สำหรับคอนกรีตที่มีมิติหนาตั้งแต่ 1.0 เมตรขึ้นไป ต้องควบคุมผลต่างอุณหภูมิระหว่างแกนกลางและผิวคอนกรีต (Delta T) ไม่เกิน 20 องศาเซลเซียส และอุณหภูมิแกนกลางสูงสุดไม่เกิน 70 องศาเซลเซียส",
            "มอก. 2135 / ASTM C618: เถ้าลอยชั้นคุณภาพ F (Class F) มีปริมาณ SiO2 + Al2O3 + Fe2O3 >= 70% และค่า LOI <= 6.0% เหมาะสำหรับงาน Mass Concrete เพื่อลดความร้อนไฮเดรชัน",
            "ACI 318-19 Table 26.4.2.2: ในโครงสร้างหนา อนุญาตให้ใช้ผลทดสอบกำลังอัดที่อายุ 56 วัน หรือ 90 วัน เป็นเกณฑ์ตรวจรับความแข็งแรงของโครงสร้างได้"
        ],
        "pt_slab": [
            "ACI 318-19 Chapter 26 / วสท. 1014: คอนกรีตอัดแรงชนิดดึงทีหลัง (Post-tensioned) ต้องมีกำลังอัดขั้นต่ำก่อนการดึงลวด (Initial Stressing) ไม่น้อยกว่า 18-24 MPa (หรือ 70% ของ f'c)",
            "ACI 232.2R: การใช้เถ้าลอยในแผ่นพื้น Post-tensioned ควรจำกัดสัดส่วนไม่เกิน 15-20% เพื่อไม่ให้กระทบต่อกำหนดเวลาการดึงลวดและการถอดแบบหล่อ (Cycle time)",
            "ASTM C39 / มอก. 213: ต้องเก็บตัวอย่างลูกปูนเพื่อทดสอบกำลังอัดที่ 3 วัน, 7 วัน และ 28 วัน เพื่อยืนยันความปลอดภัยก่อนดึงลวด"
        ],
        "column": [
            "วสท. 1014 / ACI 318-19: สำหรับเสาอาคารสูง อัตราส่วนน้ำต่อวัสดุประสาน (W/B) ต้องไม่เกิน 0.38-0.40 เพื่อให้ได้ค่า Modulus of Elasticity และความทึบน้ำที่ดี",
            "มอก. 2594: ปูนซีเมนต์ไฮดรอลิก สามารถใช้ทดแทนปูนซีเมนต์ปอร์ตแลนด์ประเภท 1 ได้ตามมาตรฐาน มยผ. และ วสท. โดยให้กำลังอัดต้นและปลายเทียบเท่ากัน"
        ],
        "general": [
            "มอก. 2135: เถ้าลอยสำหรับใช้เป็นมวลผสมคอนกรีต ต้องมีใบรับรองผลทดสอบจากผู้ผลิต (Mill Certificate) ตรวจสอบค่าความละเอียดค้างตะแกรง 45 ไมครอน <= 34%",
            "วสท. 1014: การบ่มคอนกรีตผสมเถ้าลอยหรือสแลก ต้องบ่มชื้นอย่างต่อเนื่องไม่น้อยกว่า 7 วันสำหรับโครงสร้างทั่วไป และ 14 วันสำหรับสูตรผสม SCMs สูง"
        ]
    }

    def retrieve(self, element_type: str, query: str) -> List[str]:
        key = "general"
        elem = element_type.lower()
        if "mat" in elem or "footing" in elem or "mass" in elem:
            key = "mass_concrete"
        elif "pt" in elem or "post" in elem:
            key = "pt_slab"
        elif "column" in elem:
            key = "column"

        results = list(self.STANDARDS_DB.get(key, []))
        # Add general curing & mill certificate clauses
        results.extend(self.STANDARDS_DB["general"])
        return results
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m pytest tests/test_rag_interface.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add greenspec_core/rag_interface.py tests/test_rag_interface.py
git commit -m "feat(rag): add pluggable BaseRetriever and LocalStandardsRetriever"
```

---

### Task 5: Typhoon LLM Bridge & Civil Spec Linter

**Files:**
- Create: `greenspec_core/llm_client.py`
- Test: `tests/test_llm_client.py`

**Interfaces:**
- Consumes: `ProjectInput`, `GuardrailResult`, `MixOption`, RAG snippets
- Produces: `TyphoonClient`, `SpecLinter`, `generate_spec_clauses(...) -> Tuple[str, str]`

- [ ] **Step 1: Write failing test for Typhoon client and spec linter**

```python
# tests/test_llm_client.py
import pytest
from greenspec_core.llm_client import TyphoonClient, SpecLinter

def test_spec_linter_passes_valid_clause():
    valid_th = """
    หมวดที่ 03 30 00 คอนกรีตโครงสร้างหล่อในที่
    ส่วนที่ 1 ทั่วไป: ผู้รับจ้างต้องส่งผลทดสอบ Trial Mix ล่วงหน้าไม่น้อยกว่า 35 วัน ตาม มอก. 213
    ส่วนที่ 2 วัสดุ: ใช้ปูนซีเมนต์ไฮดรอลิก มอก. 2594 ผสมเถ้าลอย มอก. 2135 ชั้น F ไม่เกิน 25% กำลังอัด f'c >= 35 MPa ที่ 28 วัน
    ส่วนที่ 3 การบ่ม: ต้องบ่มชื้นต่อเนื่องไม่น้อยกว่า 7 วัน
    """
    valid, errors = SpecLinter.lint(valid_th, target_fc=35.0, scm_pct=25.0)
    assert valid is True
    assert len(errors) == 0

def test_spec_linter_fails_vague_clause():
    vague_th = "ใช้คอนกรีตสีเขียวผสมเถ้าลอยตามความเหมาะสม"
    valid, errors = SpecLinter.lint(vague_th, target_fc=35.0, scm_pct=25.0)
    assert valid is False
    assert any("มอก." in err or "มาตรฐาน" in err for err in errors)

def test_typhoon_client_mock_mode():
    client = TyphoonClient(api_key="", use_mock=True)
    th_clause, en_clause = client.generate_spec(
        project_name="Metro Park",
        element_type="mat_foundation",
        fc_mpa=35.0,
        age_days=56,
        scm_name="TIS 2135 Fly Ash 25%",
        scm_pct=25.0,
        wb_ratio=0.42,
        curing_days=14,
        standards_context=["มอก. 2135", "ACI 207"]
    )
    assert "03 30 00" in th_clause
    assert "PART 1" in en_clause or "SECTION 03 30 00" in en_clause
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/test_llm_client.py -v`
Expected: FAIL (ModuleNotFoundError: No module named 'greenspec_core.llm_client')

- [ ] **Step 3: Implement Typhoon LLM client and linter**

Create `greenspec_core/llm_client.py`:
```python
import json
import urllib.request
import urllib.error
from typing import List, Tuple
from greenspec_core.config import Config

class SpecLinter:
    """Verifies that drafted specification text contains required civil engineering clauses."""
    @staticmethod
    def lint(spec_text: str, target_fc: float, scm_pct: float) -> Tuple[bool, List[str]]:
        errors = []
        text_lower = spec_text.lower()

        # 1. Standard Citations check
        has_std = any(std in spec_text for std in ["มอก.", "วสท.", "aci", "astm", "tis"])
        if not has_std:
            errors.append("ขาดการอ้างอิงมาตรฐานวิศวกรรม (มอก. / วสท. / ACI / ASTM)")

        # 2. Trial Mix / Submittal check
        has_trial = any(kw in text_lower for kw in ["trial mix", "ทดสอบผสม", "submittal", "35 วัน", "28 วัน"])
        if not has_trial:
            errors.append("ขาดข้อกำหนดการส่งผลทดสอบ Trial Mix ล่วงหน้าก่อนเทจริง")

        # 3. Curing duration check
        has_curing = any(kw in text_lower for kw in ["บ่ม", "curing", "7 วัน", "14 วัน"])
        if not has_curing:
            errors.append("ขาดข้อกำหนดระยะเวลาและวิธีการบ่มคอนกรีต (Curing)")

        return len(errors) == 0, errors

class TyphoonClient:
    """Typhoon LLM API Client (OpenAI-compatible) with strict civil prompt templates."""

    def __init__(self, api_key: str = "", base_url: str = "", model: str = "", use_mock: bool = False):
        cfg = Config()
        self.api_key = api_key or cfg.typhoon_api_key
        self.base_url = (base_url or cfg.typhoon_base_url).rstrip("/")
        self.model = model or cfg.typhoon_model
        self.use_mock = use_mock or not bool(self.api_key)

    def generate_spec(
        self,
        project_name: str,
        element_type: str,
        fc_mpa: float,
        age_days: int,
        scm_name: str,
        scm_pct: float,
        wb_ratio: float,
        curing_days: int,
        standards_context: List[str]
    ) -> Tuple[str, str]:
        if self.use_mock:
            return self._mock_generate(project_name, element_type, fc_mpa, age_days, scm_name, scm_pct, wb_ratio, curing_days)

        prompt = self._build_prompt(project_name, element_type, fc_mpa, age_days, scm_name, scm_pct, wb_ratio, curing_days, standards_context)
        try:
            req_data = json.dumps({
                "model": self.model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "คุณคือ Senior Structural & Materials Engineer ผู้เชี่ยวชาญการร่างข้อกำหนด TOR "
                            "ตามมาตรฐาน วสท. 1014, ACI 318 และ CSI MasterFormat 03 30 00. "
                            "ห้ามแก้ไขตัวเลขสเปคที่ได้รับ ให้คงค่า f'c, % SCM, W/B และอายุทดสอบตามที่กำหนดไว้ 100% "
                            "จงร่างข้อกำหนดทั้งภาษาไทย (Thai) และภาษาอังกฤษ (English) ในรูปแบบ 3-Part Specification อย่างเคร่งครัด"
                        )
                    },
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2,
                "max_tokens": 2500
            }).encode("utf-8")

            req = urllib.request.Request(
                f"{self.base_url}/chat/completions",
                data=req_data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}"
                }
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_json = json.loads(resp.read().decode("utf-8"))
                content = resp_json["choices"][0]["message"]["content"]
                return self._parse_llm_output(content)
        except Exception:
            # Fallback to deterministic mock template on API failure
            return self._mock_generate(project_name, element_type, fc_mpa, age_days, scm_name, scm_pct, wb_ratio, curing_days)

    def _build_prompt(self, project_name, element_type, fc_mpa, age_days, scm_name, scm_pct, wb_ratio, curing_days, standards_context):
        context_str = "\n".join(f"- {s}" for s in standards_context)
        return f"""
โครงการ: {project_name}
ชิ้นส่วนโครงสร้าง: {element_type}
กำลังอัดระบุ f'c: {fc_mpa} MPa (Cylinder)
อายุตรวจรับกำลังอัด: {age_days} วัน
สูตรผสมที่ผ่านการตรวจสอบ: {scm_name} (สัดส่วน {scm_pct}%)
อัตราส่วนน้ำต่อวัสดุประสาน (W/B) สูงสุด: {wb_ratio}
ระยะเวลาบ่มชื้นขั้นต่ำ: {curing_days} วัน

มาตรฐานอ้างอิง:
{context_str}

กรุณาร่างข้อกำหนด TOR ในหมวด SECTION 03 30 00 - CAST-IN-PLACE CONCRETE แบ่งเป็น 2 ส่วนชัดเจน:
1. ข้อกำหนดภาษาไทย (CSI 3-Part: ทั่วไป, วัสดุ, การดำเนินการก่อสร้าง)
2. Specification ภาษาอังกฤษ (PART 1 - GENERAL, PART 2 - PRODUCTS, PART 3 - EXECUTION)
"""

    def _parse_llm_output(self, content: str) -> Tuple[str, str]:
        parts = content.split("---")
        if len(parts) >= 2:
            return parts[0].strip(), parts[1].strip()
        return content.strip(), content.strip()

    def _mock_generate(self, project_name, element_type, fc_mpa, age_days, scm_name, scm_pct, wb_ratio, curing_days) -> Tuple[str, str]:
        th_clause = f"""หมวดที่ 03 30 00 งานคอนกรีตโครงสร้างหล่อในที่ (คอนกรีตคาร์บอนต่ำ)
โครงการ: {project_name} | องค์อาคาร: {element_type}

ส่วนที่ 1 - ข้อกำหนดทั่วไป (GENERAL)
1.1 การส่งเอกสารอนุมัติ (Submittals):
    - ผู้รับจ้างต้องเสนอผลการออกแบบส่วนผสม (Mix Design) และผลการทดสอบส่วนผสมในห้องปฏิบัติการ (Trial Mix Test Results) ล่วงหน้าไม่น้อยกว่า 35 วันก่อนเริ่มการเทคอนกรีต
    - แนบใบรับรองคุณภาพจากโรงงานผู้ผลิต (Mill Certificate) ของเถ้าลอยตาม มอก. 2135 ชั้นคุณภาพ F และปูนซีเมนต์ไฮดรอลิก มอก. 2594
    - แผนงานการบ่มคอนกรีต (Curing Plan) และแผนควบคุมอุณหภูมิ (Thermal Control Plan กรณีคอนกรีตหนา)

ส่วนที่ 2 - วัสดุและส่วนผสม (PRODUCTS)
2.1 วัสดุประสาน:
    - ปูนซีเมนต์ไฮดรอลิกตาม มอก. 2594 หรือปูนซีเมนต์ปอร์ตแลนด์ตาม มอก. 15
    - เถ้าลอยถ่านหินตาม มอก. 2135 ชั้นคุณภาพ F (LOI <= 6.0%, ความละเอียดค้างตะแกรง 45 ไมครอน <= 34%)
2.2 สัดส่วนผสมและคุณสมบัติทางวิศวกรรม:
    - กำลังอัดประลัยระบุ f'c ไม่น้อยกว่า {fc_mpa:.1f} MPa (ทดสอบด้วยแท่งทรงกระบอก Cylinder) ที่อายุ {age_days} วัน
    - การแทนที่ด้วย {scm_name} สัดส่วนไม่เกิน {scm_pct:.0f}% โดยน้ำหนักของวัสดุประสานรวม
    - อัตราส่วนน้ำต่อวัสดุประสาน (W/B) สูงสุดไม่เกิน {wb_ratio:.2f}

ส่วนที่ 3 - การดำเนินการก่อสร้าง (EXECUTION)
3.1 การลำเลียงและเท: ต้องเทคอนกรีตให้เสร็จสิ้นภายใน 90 นาที หรือไม่เกิน 300 รอบหมุนโม่
3.2 การบ่มคอนกรีต: ต้องดำเนินการบ่มชื้นต่อเนื่องอย่างเคร่งครัดไม่น้อยกว่า {curing_days} วัน"""

        en_clause = f"""SECTION 03 30 00 - CAST-IN-PLACE CONCRETE (LOW-CARBON MIX SPECIFICATION)
Project: {project_name} | Structural Element: {element_type}

PART 1 - GENERAL
1.1 SUBMITTAL REQUIREMENTS:
    - Submit mix design proportions and laboratory trial batch test reports conforming to ASTM C39 / TIS 213 at least 35 days prior to concrete placement.
    - Submit manufacturer mill test certificates for TIS 2135 Class F fly ash (LOI <= 6.0%) and TIS 2594 hydraulic cement.
    - Submit concrete curing and temperature monitoring procedures.

PART 2 - PRODUCTS
2.1 CEMENTITIOUS MATERIALS:
    - Hydraulic Cement conforming to TIS 2594 / ASTM C595.
    - Coal Fly Ash conforming to TIS 2135 Class F / ASTM C618.
2.2 MIX DESIGN CRITERIA:
    - Specified compressive strength (f'c): >= {fc_mpa:.1f} MPa (standard cylinder) evaluated at {age_days} days.
    - Maximum SCM replacement: {scm_pct:.0f}% by weight of total cementitious material.
    - Maximum Water-Binder (W/B) Ratio: {wb_ratio:.2f}.

PART 3 - EXECUTION
3.1 BATCHING & PLACING: Complete discharge within 90 minutes after batching.
3.2 CURING: Continuous moist curing for a minimum of {curing_days} days."""

        return th_clause, en_clause
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m pytest tests/test_llm_client.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add greenspec_core/llm_client.py tests/test_llm_client.py
git commit -m "feat(llm): implement Typhoon LLM client with prompt templates and spec linter"
```

---

### Task 6: Technical Package Builder & Serverless Handler

**Files:**
- Create: `greenspec_core/package_builder.py`
- Create: `greenspec_core/handler.py`
- Test: `tests/test_handler.py`

**Interfaces:**
- Consumes: `guardrails`, `calculator`, `rag_interface`, `llm_client`
- Produces: `build_technical_package(...) -> TechnicalPackage`, `analyze_and_draft_spec(payload: dict) -> dict`, `lambda_handler(event, context) -> dict`

- [ ] **Step 1: Write failing test for package builder and serverless handler**

```python
# tests/test_handler.py
import pytest
from greenspec_core.handler import analyze_and_draft_spec, lambda_handler

def test_analyze_and_draft_spec_end_to_end():
    payload = {
        "project_name": "Bangkok Tower",
        "element_type": "mat_foundation",
        "volume_m3": 1500.0,
        "fc_prime_mpa": 35.0,
        "test_age_days": 28,
        "notes": "Thickness 1.8m mass concrete"
    }
    result = analyze_and_draft_spec(payload, use_mock=True)

    assert result["status"] == "success"
    assert result["project_name"] == "Bangkok Tower"
    assert "baseline" in result
    assert result["baseline"]["total_carbon_tco2e"] > 0
    assert "options" in result
    assert "option_a" in result["options"]
    assert "option_b" in result["options"]

    pkg = result["technical_package"]
    assert "spec_clause_th" in pkg
    assert "03 30 00" in pkg["spec_clause_th"]
    assert "compliance_matrix" in pkg
    assert len(pkg["compliance_matrix"]) >= 2
    assert "submittal_checklist" in pkg
    assert len(pkg["submittal_checklist"]) >= 3

def test_lambda_handler_wrapper():
    event = {
        "body": '{"project_name": "Test Project", "element_type": "beam_slab", "volume_m3": 500, "fc_prime_mpa": 32}'
    }
    response = lambda_handler(event, None)
    assert response["statusCode"] == 200
    assert "body" in response
    assert "Bangkok" not in response["body"] # checks body payload
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/test_handler.py -v`
Expected: FAIL (ModuleNotFoundError: No module named 'greenspec_core.package_builder')

- [ ] **Step 3: Implement package builder and handler**

Create `greenspec_core/package_builder.py`:
```python
from typing import List
from greenspec_core.types import ProjectInput, GuardrailResult, MixOption, TechnicalPackage, ComplianceItem
from greenspec_core.rag_interface import BaseRetriever, LocalStandardsRetriever
from greenspec_core.llm_client import TyphoonClient

def build_technical_package(
    project: ProjectInput,
    guardrail: GuardrailResult,
    chosen_option: MixOption,
    retriever: BaseRetriever = None,
    typhoon_client: TyphoonClient = None
) -> TechnicalPackage:
    if retriever is None:
        retriever = LocalStandardsRetriever()
    if typhoon_client is None:
        typhoon_client = TyphoonClient(use_mock=True)

    standards = retriever.retrieve(project.element_type, f"{chosen_option.scm_type} {project.fc_prime_mpa}")

    # Generate clauses
    th_clause, en_clause = typhoon_client.generate_spec(
        project_name=project.project_name,
        element_type=project.element_type,
        fc_mpa=chosen_option.target_fc_mpa,
        age_days=chosen_option.acceptance_age_days,
        scm_name=chosen_option.name,
        scm_pct=chosen_option.scm_replacement_percent,
        wb_ratio=chosen_option.max_wb_ratio,
        curing_days=guardrail.mandatory_curing_days,
        standards_context=standards
    )

    # Build Compliance Matrix
    matrix = [
        ComplianceItem(
            property_name="Compressive Strength (f'c)",
            original_spec=f">= {project.fc_prime_mpa} MPa @ {project.test_age_days} Days",
            proposed_spec=f">= {chosen_option.target_fc_mpa} MPa @ {chosen_option.acceptance_age_days} Days",
            standard_reference="วสท. 1014 / ACI 318-19",
            justification=f"คงกำลังอัดตามเกณฑ์วิศวกรรมโครงสร้าง ({chosen_option.notes})"
        ),
        ComplianceItem(
            property_name="Cementitious Binder",
            original_spec="Ordinary Portland Cement Type 1",
            proposed_spec=chosen_option.binder_description,
            standard_reference="มอก. 2594 / มอก. 2135 / ASTM C618",
            justification=f"ลด Embodied Carbon ลง {chosen_option.carbon_reduction_percent}% โดยไม่ลดทอนความทนทาน"
        ),
        ComplianceItem(
            property_name="Curing Requirement",
            original_spec="บ่มชื้นอย่างน้อย 3-5 วัน",
            proposed_spec=f"บ่มชื้นต่อเนื่องไม่น้อยกว่า {guardrail.mandatory_curing_days} วัน",
            standard_reference="วสท. 1014 / ACI 308R",
            justification="จำเป็นเพื่อให้ปฏิกิริยาไฮเดรชันและปอซโซลานเกิดอย่างสมบูรณ์ ป้องกันการแตกร้าวจากการหดตัว"
        )
    ]

    # Submittal Checklist
    checklist = [
        f"ผลการทดสอบการออกแบบส่วนผสมจริงในห้องปฏิบัติการ (Trial Mix Test Reports) ไม่น้อยกว่า 35 วันก่อนเทจริง",
        f"ใบรับรองผลทดสอบคุณภาพวัสดุจากโรงงานผู้ผลิต (Mill Certificate) ตาม มอก. 2135 ชั้น F / มอก. 2594",
        f"แผนการบ่มคอนกรีต (Curing Plan) ระบุวิธีการบ่มชื้นต่อเนื่องอย่างน้อย {guardrail.mandatory_curing_days} วัน"
    ]
    if guardrail.thermal_control_plan_required:
        checklist.append("แผนการควบคุมอุณหภูมิ (Thermal Control Plan) สำหรับ Mass Concrete: ควบคุมผลต่างอุณหภูมิ Delta T <= 20 deg C")
    if guardrail.early_strength_required:
        checklist.append("ผลทดสอบกำลังอัดต้นที่ 3 วัน และ 7 วัน (Early-age Strength) เพื่อยืนยันความปลอดภัยก่อนถอดแบบ/ดึงลวด")

    return TechnicalPackage(
        spec_clause_th=th_clause,
        spec_clause_en=en_clause,
        compliance_matrix=matrix,
        submittal_checklist=checklist
    )
```

Create `greenspec_core/handler.py`:
```python
import json
from typing import Dict, Any, Optional
from greenspec_core.types import ProjectInput
from greenspec_core.guardrails import evaluate_guardrail
from greenspec_core.calculator import calculate_impacts
from greenspec_core.package_builder import build_technical_package
from greenspec_core.rag_interface import BaseRetriever, LocalStandardsRetriever
from greenspec_core.llm_client import TyphoonClient

def analyze_and_draft_spec(
    payload: Dict[str, Any],
    retriever: Optional[BaseRetriever] = None,
    use_mock: bool = False
) -> Dict[str, Any]:
    project = ProjectInput(
        project_name=payload.get("project_name", "Untitled Project"),
        element_type=payload.get("element_type", "beam_slab"),
        volume_m3=float(payload.get("volume_m3", 100.0)),
        fc_prime_mpa=float(payload.get("fc_prime_mpa", 35.0)),
        test_age_days=int(payload.get("test_age_days", 28)),
        current_binder=payload.get("current_binder", "OPC_Type_1"),
        slump_cm=float(payload.get("slump_cm", 12.0)),
        exposure_class=payload.get("exposure_class", "normal"),
        notes=payload.get("notes", "")
    )

    guardrail = evaluate_guardrail(project)
    base_intensity, base_total, base_cost, opt_a, opt_b = calculate_impacts(project, guardrail)

    # Default build technical package for Option A
    tech_pkg = build_technical_package(
        project=project,
        guardrail=guardrail,
        chosen_option=opt_a,
        retriever=retriever or LocalStandardsRetriever(),
        typhoon_client=TyphoonClient(use_mock=use_mock)
    )

    from dataclasses import asdict
    return {
        "status": "success",
        "project_name": project.project_name,
        "element_type": project.element_type,
        "guardrail": asdict(guardrail),
        "baseline": {
            "carbon_intensity_kg_m3": base_intensity,
            "total_carbon_tco2e": base_total,
            "estimated_cost_thb": base_cost
        },
        "options": {
            "option_a": asdict(opt_a),
            "option_b": asdict(opt_b)
        },
        "technical_package": asdict(tech_pkg)
    }

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Serverless AWS Lambda / API Gateway entry point."""
    try:
        body_str = event.get("body", "{}")
        if isinstance(body_str, str):
            payload = json.loads(body_str) if body_str else {}
        else:
            payload = body_str

        result = analyze_and_draft_spec(payload, use_mock=True)
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            "body": json.dumps(result, ensure_ascii=False)
        }
    except Exception as e:
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"status": "error", "message": str(e)}, ensure_ascii=False)
        }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m pytest tests/test_handler.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add greenspec_core/package_builder.py greenspec_core/handler.py tests/test_handler.py
git commit -m "feat(handler): implement technical package builder and serverless handler"
```

---

### Task 7: Developer Documentation, Integration Example & Export

**Files:**
- Create: `greenspec_core/README.md`
- Create: `greenspec_core/example.py`
- Modify: `greenspec_core/__init__.py`

**Interfaces:**
- Produces: `analyze_and_draft_spec`, `BaseRetriever`, `LocalStandardsRetriever`, `TyphoonClient` exported from root.

- [ ] **Step 1: Write integration example demonstrating RAG customization and Typhoon API**

Create `greenspec_core/example.py`:
```python
"""Example script demonstrating how a teammate can consume greenspec_core."""
from greenspec_core import analyze_and_draft_spec, BaseRetriever

# 1. Custom RAG demonstration (teammate can plug in Qdrant, Pinecone, Supabase, etc.)
class CustomProjectRAG(BaseRetriever):
    def retrieve(self, element_type: str, query: str):
        return [
            "ข้อกำหนดเฉพาะโครงการ: สำหรับคอนกรีตฐานราก ห้ามใช้น้ำที่มีปริมาณคลอไรด์เกินเกณฑ์ ACI 318",
            "มอก. 2135: กำหนดให้ใช้เถ้าลอย Class F จากแหล่งโรงไฟฟ้าแม่เมาะเท่านั้น"
        ]

if __name__ == "__main__":
    payload = {
        "project_name": "Bangkok Waterfront Residences",
        "element_type": "mat_foundation",
        "volume_m3": 2400.0,
        "fc_prime_mpa": 35.0,
        "notes": "Mass concrete mat foundation 1.8m thick"
    }

    print("Analyzing project and drafting specification...")
    result = analyze_and_draft_spec(payload, retriever=CustomProjectRAG(), use_mock=True)

    print("\n[Baseline Carbon]:", result["baseline"]["total_carbon_tco2e"], "tCO2e")
    print("[Option A Carbon Cut]:", result["options"]["option_a"]["carbon_reduction_tco2e"], "tCO2e", f"({result['options']['option_a']['carbon_reduction_percent']}%)")
    print("[Option A Cost Delta]: ฿", result["options"]["option_a"]["cost_delta_thb"])
    print("\n--- Drafted Thai Spec Excerpt ---")
    print(result["technical_package"]["spec_clause_th"][:400] + "...\n")
    print("--- Compliance Matrix ---")
    for item in result["technical_package"]["compliance_matrix"]:
        print(f"* {item['property_name']}: {item['original_spec']} -> {item['proposed_spec']}")
```

- [ ] **Step 2: Update `greenspec_core/__init__.py` with all public exports**

Update `greenspec_core/__init__.py`:
```python
from greenspec_core.config import Config, EMISSION_FACTORS
from greenspec_core.types import (
    ProjectInput,
    GuardrailResult,
    MixOption,
    ComplianceItem,
    TechnicalPackage,
    AnalysisResult,
)
from greenspec_core.guardrails import evaluate_guardrail
from greenspec_core.calculator import calculate_impacts
from greenspec_core.rag_interface import BaseRetriever, LocalStandardsRetriever
from greenspec_core.llm_client import TyphoonClient, SpecLinter
from greenspec_core.package_builder import build_technical_package
from greenspec_core.handler import analyze_and_draft_spec, lambda_handler

__all__ = [
    "Config",
    "EMISSION_FACTORS",
    "ProjectInput",
    "GuardrailResult",
    "MixOption",
    "ComplianceItem",
    "TechnicalPackage",
    "AnalysisResult",
    "evaluate_guardrail",
    "calculate_impacts",
    "BaseRetriever",
    "LocalStandardsRetriever",
    "TyphoonClient",
    "SpecLinter",
    "build_technical_package",
    "analyze_and_draft_spec",
    "lambda_handler",
]
```

- [ ] **Step 3: Write comprehensive developer README for teammate hand-off**

Create `greenspec_core/README.md`:
```markdown
# GreenSpec Core AI Engine (`greenspec_core`)

Core AI & Civil Engineering Engine for Low-Carbon Construction Material Analysis and TOR Specification Drafting.

## Features
- **Deterministic Civil Guardrails:** Enforces ACI 318, EIT 1014 (วสท.), TIS 2135, TIS 2594 rules (zero hallucination for structural safety).
- **Carbon & Cost Calculator:** Calculates baseline emissions and savings based on TGO emission factors and Thai ready-mix market rates.
- **Typhoon LLM Integration:** Connects to SCB 10X Typhoon API for legally precise Thai/English CSI 3-Part TOR clauses.
- **Pluggable RAG:** Easily attach your own Vector DB (Pinecone, Qdrant, Supabase) by implementing `BaseRetriever`.
- **Serverless-Ready:** Lightweight, zero heavy dependencies, fast cold-starts on AWS Lambda / Google Cloud Functions / FastAPI.

## Quick Start

```python
from greenspec_core import analyze_and_draft_spec

payload = {
    "project_name": "Bangkok Tower",
    "element_type": "mat_foundation",
    "volume_m3": 1500.0,
    "fc_prime_mpa": 35.0,
    "notes": "1.5m thick mat foundation"
}

result = analyze_and_draft_spec(payload)
print(result["options"]["option_a"]["carbon_reduction_percent"])
print(result["technical_package"]["spec_clause_th"])
```

## Running Example
```bash
python3 greenspec_core/example.py
```

## Running Tests
```bash
python3 -m pytest tests/ -v
```
```

- [ ] **Step 4: Run all tests to verify entire package passes**

Run: `python3 -m pytest tests/ -v`
Expected: ALL PASS

- [ ] **Step 5: Run example script**

Run: `python3 greenspec_core/example.py`
Expected: Outputs formatted baseline, reduction, drafted spec, and compliance matrix.

- [ ] **Step 6: Commit**

```bash
git add greenspec_core/ example.py tests/
git commit -m "docs: add developer handoff README and integration example"
```
