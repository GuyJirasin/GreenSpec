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
