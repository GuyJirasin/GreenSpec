# Design Spec: GreenSpec Core AI Engine & Civil Engineering Knowledge Architecture

- **Date:** 2026-10-09
- **Topic:** AI LLM for Drafting Construction TOR & Technical Specifications (Civil Engineering & Low-Carbon Materials)
- **Status:** Approved (Ready for Implementation Planning)
- **Target Component:** Serverless-ready Model & Core Engine (`greenspec_core/`)

---

## 1. Problem Statement & Objectives

Construction Terms of Reference (TOR) and material specifications require rigorous civil engineering precision. When developers seek to reduce embodied carbon through low-carbon concrete and Supplementary Cementitious Materials (SCMs like Fly Ash, Slag, and Hydraulic Cement), they encounter three major friction points:

1. **Structural Risk & Engineering Hesitation:** Structural engineers and project consultants reject vague AI recommendations because improper SCM ratios can compromise early strength in post-tensioned slabs or cause durability issues.
2. **Contractual & Technical Inaccuracy:** Real construction contracts require standard specification formats (e.g., CSI MasterFormat Section 03 30 00 / EIT Standards) containing explicit submittal deadlines, testing standards (ASTM/TIS), and curing requirements.
3. **Traceability & Monetization Flow:** GreenSpec enables developers to analyze BOQs, identify carbon hotspots, generate engineer-approved technical packages, and procure certified low-carbon materials.

**Core Objective:**
Build a high-precision, serverless-ready Python Core AI Engine (`greenspec_core/`) that combines **deterministic civil engineering guardrails** with the **Typhoon LLM API** (and pluggable RAG) to analyze concrete requirements, enforce structural safety 100%, and generate airtight, professional TOR specifications and technical approval packages.

---

## 2. System Architecture

The core engine follows a decoupled hybrid architecture:

```
                  [ Input Payload: BOQ / Concrete Spec ]
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                           greenspec_core                                │
│                                                                         │
│  1. Deterministic Civil Guardrail (`guardrails.py`)                     │
│     - Validates Structural Element (Footing, PT Slab, Column, Beam)     │
│     - Enforces limits: SCM Max %, Minimum Binder, W/B cap, f'c age      │
│     - Eliminates hallucination for structural safety                    │
│                                                                         │
│  2. Carbon & Cost Engine (`calculator.py`)                              │
│     - Computes Baseline vs Option A (Balanced) vs Option B (Max Carbon) │
│     - Applies verified TGO / EPD emission factors and ready-mix costs   │
│                                                                         │
│  3. Pluggable RAG Interface (`rag_interface.py`)                        │
│     - Abstract interface for standards & local context retrieval        │
│     - Built-in fallback knowledge for TIS / EIT / ACI                   │
│                                                                         │
│  4. Typhoon LLM Bridge & Spec Linter (`llm_client.py`)                  │
│     - Prompts Typhoon API (OpenAI-compatible) with strict civil prompt   │
│     - Parameter Infill: LLM uses exact numbers from Guardrail           │
│     - Linter validates: CSI 3-Part clauses, ASTM/TIS citations, Curing  │
│                                                                         │
│  5. Technical Package Builder (`package_builder.py`)                    │
│     - Assembles Complete Approval Package:                              │
│       • TOR Clauses (Thai & English)                                    │
│       • Engineering Compliance Matrix                                   │
│       • QA & Trial Mix Submittal Checklist                              │
│       • Carbon & Cost Impact Summary                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
        [ Output: Serverless-Ready Structured JSON / Handoff API ]
```

---

## 3. Civil Engineering Knowledge Base & Guardrail Rules

### 3.1 Standards Encoded
- **Cement & Binders:**
  - **TIS 15 Part 1:** Ordinary Portland Cement (Type I) and Rapid Hardening (Type III).
  - **TIS 2594 (มอก. 2594):** Hydraulic Cement (10–18% lower clinker factor, drop-in replacement).
  - **TIS 2135 / ASTM C618:** Coal Fly Ash for Concrete (Class F / Class C).
  - **ASTM C989:** Ground Granulated Blast-Furnace Slag (GGBS / Slag Cement).
- **Structural Concrete Codes:**
  - **EIT 1014 (วสท. 1014) / DPT 1101-1106 (มยผ.):** Standard for Structural Concrete.
  - **ACI 318-19 (Chapters 19 & 26):** Durability, W/B ratios, and concrete quality.
  - **ACI 207 / ACI 232.2R / ACI 233R:** Mass concrete thermal control and SCM proportions.

### 3.2 Element-Specific Guardrail Constraints

| Element Type | Structural Behavior & Constraints | Guardrail Rules & SCM Limits | Compliance / Risk Rating |
| :--- | :--- | :--- | :--- |
| **Mass Concrete / Mat Footing** (Thickness $\ge 1.0\text{ m}$) | • Risk of thermal cracking ($\Delta T > 20^\circ\text{C}$, Core $> 70^\circ\text{C}$).<br>• Slow heat dissipation. | • **Encourage High SCM:** Fly Ash 25–40% or Slag 40–50%.<br>• Allow $f'_{c,56}$ (56-day compressive strength acceptance).<br>• Mandatory Thermal Control & Curing Plan. | **Pass / Low Risk** |
| **Post-Tensioned Slabs / Beams** (PT System) | • Requires rapid early strength for tendon stressing ($f'_c \ge 18\text{--}24\text{ MPa}$ at 3–5 days). | • **Cap SCM:** Fly Ash $\le 15\text{--}20\%$.<br>• No high-volume slag without accelerator or Type III mix.<br>• Mandatory 3-day and 7-day strength test requirements. | **Needs Review** (Trigger warning if SCM exceeds 20%) |
| **Columns & Core Walls** (High-Rise) | • High axial loads, modulus of elasticity ($E_c$) critical, early formwork removal. | • Recommend TIS 2594 Hydraulic Cement or Fly Ash $\le 20\%$.<br>• Lock $W/B \le 0.35\text{--}0.40$.<br>• Require high-range water reducers (Superplasticizer). | **Pass / Low Risk** |
| **Suspended Slabs & Normal Beams** | • General structural members, standard 28-day target. | • Fly Ash 20–25% or Slag 30–40%.<br>• Continuous moist curing $\ge 7\text{ days}$. | **Pass / Low Risk** |

---

## 4. Carbon & Cost Estimation Models

### 4.1 Emission Factors (TGO & EPD Baselines)
- Ordinary Portland Cement (OPC Type 1): $830\text{ kgCO}_2\text{e/ton}$
- Hydraulic Cement (TIS 2594): $690\text{ kgCO}_2\text{e/ton}$ ($\approx 17\%$ reduction)
- Coal Fly Ash (TIS 2135 / Mae Moh): $18\text{ kgCO}_2\text{e/ton}$
- Blast Furnace Slag (GGBS): $85\text{ kgCO}_2\text{e/ton}$
- Fine & Coarse Aggregates: $5.0\text{ kgCO}_2\text{e/ton}$
- Water & Admixtures: Baseline constants.

### 4.2 Concrete Mix Archetypes
- **Baseline:** $100\%$ OPC ($350\text{ kg/m}^3$ binder for $35\text{ MPa}$) $\rightarrow \approx 315\text{ kgCO}_2\text{e/m}^3$.
- **Option A (Balanced / Low Risk):** Hydraulic Cement or OPC + 25% Fly Ash $\rightarrow \approx 245\text{ kgCO}_2\text{e/m}^3$ (22% reduction, cost parity or slight saving).
- **Option B (High Reduction / Review):** OPC + 40% Slag or 35% Fly Ash $\rightarrow \approx 205\text{ kgCO}_2\text{e/m}^3$ (35% reduction, requires 56-day testing & special curing).

---

## 5. Precise Specification Drafting (CSI 3-Part & EIT)

The drafted TOR specification will follow standard construction contract architecture:

```
SECTION 03 30 00 - CAST-IN-PLACE CONCRETE (LOW-CARBON STRUCTURAL SPECIFICATION)

PART 1 - GENERAL
1.1 SUMMARY & APPLICABILITY
1.2 SUBMITTAL REQUIREMENTS:
    - Mix Design & Proportions (Submit 35 days prior to casting)
    - Certified Mill Test Reports & Manufacturer Certificate (TIS 2135 Class F / ASTM C618)
    - Trial Mix Test Results (ASTM C39 / TIS 213 at 3, 7, 28, and optional 56 days)
    - Concrete Curing & Thermal Control Plan

PART 2 - PRODUCTS
2.1 BINDING MATERIALS:
    - Hydraulic Cement conforming to TIS 2594
    - Fly Ash conforming to TIS 2135 Class F (LOI <= 6.0%, Fineness <= 34% on 45 um sieve)
2.2 CONCRETE MIX DESIGN & PROPORTIONS:
    - Element: [Element Name]
    - Specified Compressive Strength (f'c): [Target MPa] at [28/56] days
    - Maximum SCM Replacement: [XX]% by weight of total cementitious material
    - Maximum Water-Binder Ratio (W/B): [0.XX]
    - Slump / Slump Flow: [Target] cm

PART 3 - EXECUTION
3.1 BATCHING, TRANSPORTATION & PLACING:
    - Discharge within 90 minutes or 300 revolutions
3.2 CURING & PROTECTION:
    - Minimum continuous moist curing of 7 days (14 days for high SCM mixes)
```

### Spec Verification Linter:
Before finalizing output, `llm_client.py` and `package_builder.py` execute validation checks:
1. Verifies explicit mention of TIS / ASTM standard codes.
2. Verifies exact matching of $f'_c$ and W/B values against guardrail calculations.
3. Checks for curing duration specifications ($\ge 7\text{ days}$).
4. Ensures inclusion of trial mix submittal lead times.

---

## 6. Model Package & Serverless Interface Design

### 6.1 Package Directory Structure
```text
greenspec_core/
├── __init__.py               # Exports: analyze_and_draft_spec, BaseRetriever, GuardrailEngine
├── config.py                 # Typhoon API settings, emission constants, default thresholds
├── guardrails.py             # Deterministic civil engineering rules & element constraint solver
├── calculator.py             # Embodied carbon & ready-mix cost calculations
├── rag_interface.py          # Abstract Base Class BaseRetriever + LocalStandardsRetriever
├── llm_client.py             # Typhoon API client, system prompts & spec linter
├── package_builder.py        # Assembles full Technical Approval Package JSON
├── handler.py                # Serverless functional entrypoint (AWS Lambda / Cloud Functions / FastAPI)
└── tests/
    ├── __init__.py
    ├── test_guardrails.py    # Unit tests for PT slab, Mass concrete, Column rules
    ├── test_calculator.py    # Unit tests for carbon & cost formulas
    ├── test_linter.py        # Unit tests for specification linter
    └── test_handler.py       # Integration tests with mock and live Typhoon API
```

### 6.2 Handler Input / Output Specification

#### Input Payload
```json
{
  "project_name": "Skyline Tower",
  "element_type": "mat_foundation",
  "volume_m3": 1500,
  "fc_prime_mpa": 35,
  "test_age_days": 28,
  "current_binder": "OPC_Type_1",
  "slump_cm": 12,
  "exposure_class": "normal",
  "notes": "Deep foundation 1.8m thick with temperature monitoring required"
}
```

#### Output Payload
```json
{
  "status": "success",
  "project_name": "Skyline Tower",
  "element_type": "mat_foundation",
  "guardrail_status": "Pass",
  "baseline": {
    "carbon_intensity_kg_m3": 315.0,
    "total_carbon_tco2e": 472.5,
    "estimated_cost_thb": 4200000
  },
  "options": {
    "option_a": {
      "name": "Balanced Low-Carbon Mix (TIS 2594 + 25% Fly Ash)",
      "carbon_reduction_tco2e": 105.0,
      "carbon_reduction_percent": 22.2,
      "cost_savings_thb": 126000,
      "risk_rating": "Low",
      "compliance_status": "Pass",
      "test_age_recommended": 56
    },
    "option_b": {
      "name": "Maximum Carbon Reduction Mix (40% Slag / High Fly Ash)",
      "carbon_reduction_tco2e": 165.0,
      "carbon_reduction_percent": 34.9,
      "cost_savings_thb": -84000,
      "risk_rating": "Medium",
      "compliance_status": "Review Required",
      "test_age_recommended": 56
    }
  },
  "technical_package": {
    "spec_clause_th": "หมวดที่ 03 30 00 คอนกรีตโครงสร้าง...",
    "spec_clause_en": "SECTION 03 30 00 CAST-IN-PLACE CONCRETE...",
    "compliance_matrix": [
      {
        "property": "Compressive Strength (f'c)",
        "original": ">= 35 MPa @ 28 Days",
        "proposed": ">= 35 MPa @ 56 Days (Acceptance) / >= 20 MPa @ 7 Days",
        "standard_ref": "วสท. 1014 / ACI 207 Mass Concrete",
        "justification": "ลดความร้อนไฮเดรชันเพื่อป้องกันการแตกร้าวจากอุณหภูมิ"
      }
    ],
    "submittal_checklist": [
      "Trial mix test report (3, 7, 28, 56 days) submitted 35 days in advance",
      "Manufacturer mill certificate conforming to TIS 2135 Class F",
      "Temperature difference monitoring plan (Core-to-surface <= 20 deg C)"
    ]
  }
}
```

---

## 7. Verification & Testing Plan

1. **Guardrail Logic Tests (`test_guardrails.py`):**
   - Assert PT slabs restrict SCM to $\le 20\%$ and mandate 3/7 day early strength checks.
   - Assert mass concrete thick elements automatically suggest 56-day strength and high SCM replacement.
   - Assert column elements lock $W/B \le 0.40$.
2. **Calculator Math Tests (`test_calculator.py`):**
   - Verify carbon calculations against TGO emission factors within $\pm 0.1\%$.
   - Verify cost delta calculations for positive savings and cost increases.
3. **Spec Linter Tests (`test_linter.py`):**
   - Reject drafted clauses that lack ASTM/TIS standards or omit curing duration.
4. **Integration & Serverless Test (`test_handler.py`):**
   - Mock Typhoon API responses for CI testing.
   - Live smoke test with `TYPHOON_API_KEY` to verify Thai phrasing and formatting quality.

---

## 8. Handoff & Extensibility

- **For Frontend / Backend Integrator:**
  - Import as a Python library or deploy via serverless functions (e.g. AWS Lambda with Mangum / Cloud Functions / FastAPI).
- **For RAG Integrator:**
  - Subclass `BaseRetriever` from `greenspec_core.rag_interface` to inject custom vector database queries (Pinecone, Qdrant, Supabase, Chroma, etc.).
