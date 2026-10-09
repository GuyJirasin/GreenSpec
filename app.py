import os
import sys
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure root directory is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from greenspec_core import analyze_and_draft_spec, get_catalog

app = FastAPI(
    title="GreenSpec AI Engine API",
    description="Civil Engineering & Low-Carbon Spec Analysis API for Construction TOR Drafting",
    version="1.0.0"
)

# Enable CORS for frontend integrations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    project_name: str = Field(default="Bangkok Office Project", examples=["Bangkok Waterfront Tower"])
    element_type: str = Field(default="mat_foundation", examples=["mat_foundation"])
    volume_m3: float = Field(default=1000.0, examples=[1500.0])
    fc_prime_mpa: float = Field(default=35.0, examples=[35.0])
    test_age_days: int = Field(default=28, examples=[28])
    current_binder: str = Field(default="OPC_Type_1", examples=["OPC_Type_1"])
    slump_cm: float = Field(default=12.0, examples=[12.0])
    exposure_class: str = Field(default="normal", examples=["normal"])
    notes: Optional[str] = Field(default="", examples=["1.5m thick mass concrete mat foundation"])

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "GreenSpec AI Engine",
        "endpoints": {
            "analyze": "POST /api/analyze",
            "catalog": "GET /api/catalog",
            "docs": "/docs"
        }
    }

@app.get("/api/catalog")
def list_catalog():
    """List certified low-carbon ready-mix concrete and SCM materials in Thailand."""
    return [p.to_dict() for p in get_catalog()]

@app.post("/api/analyze")
def analyze(req: AnalyzeRequest):
    """Analyze concrete requirements, apply civil guardrails, calculate carbon/cost, match products, and draft TOR."""
    try:
        payload = req.model_dump()
        result = analyze_and_draft_spec(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== CIVIL ENGINEERING CALCULATION TOOLS ====================
from greenspec_core import (
    calculate_concrete_mix,
    calculate_embodied_carbon,
    evaluate_thermal_mass_concrete,
    convert_concrete_strength,
    estimate_cost_impact,
)

class MixDesignRequest(BaseModel):
    fc_target_mpa: float = Field(default=35.0, description="Specified compressive strength in MPa")
    element_type: str = Field(default="beam_slab", description="Structural element type")
    slump_cm: float = Field(default=12.0, description="Target slump in cm")
    scm_type: str = Field(default="fly_ash", description="SCM type: fly_ash, bottom_ash, slag, hydraulic")
    scm_percent: float = Field(default=25.0, description="SCM replacement percentage (0-60%)")
    aggregate_size_mm: float = Field(default=19.0, description="Nominal maximum aggregate size in mm")
    sand_fineness_modulus: float = Field(default=2.80, description="Fineness modulus of sand")

class CarbonCalcRequest(BaseModel):
    cement_opc_kg: float = Field(default=270.0)
    scm_kg: float = Field(default=90.0)
    scm_type: str = Field(default="fly_ash")
    ca_kg: float = Field(default=1020.0)
    sand_kg: float = Field(default=740.0)
    volume_m3: float = Field(default=100.0)

class ThermalCheckRequest(BaseModel):
    thickness_m: float = Field(default=1.5, description="Least dimension of concrete element in meters")
    total_binder_kg_m3: float = Field(default=380.0)
    scm_percent: float = Field(default=30.0)
    scm_type: str = Field(default="fly_ash")
    placing_temp_c: float = Field(default=30.0)

class CostEstimateRequest(BaseModel):
    fc_mpa: float = Field(default=35.0)
    volume_m3: float = Field(default=500.0)
    scm_percent: float = Field(default=25.0)
    scm_type: str = Field(default="fly_ash")

@app.post("/api/tools/mix-design")
def tool_mix_design(req: MixDesignRequest):
    """Deterministic ACI 211.1 & Chulalongkorn University Concrete Mix Proportioning Tool."""
    return calculate_concrete_mix(
        fc_target_mpa=req.fc_target_mpa,
        element_type=req.element_type,
        slump_cm=req.slump_cm,
        scm_type=req.scm_type,
        scm_percent=req.scm_percent,
        aggregate_size_mm=req.aggregate_size_mm,
        sand_fineness_modulus=req.sand_fineness_modulus
    )

@app.post("/api/tools/carbon-calc")
def tool_carbon_calc(req: CarbonCalcRequest):
    """Deterministic TGO-certified embodied carbon & GHG reduction calculator."""
    return calculate_embodied_carbon(
        cement_opc_kg=req.cement_opc_kg,
        scm_kg=req.scm_kg,
        scm_type=req.scm_type,
        ca_kg=req.ca_kg,
        sand_kg=req.sand_kg,
        volume_m3=req.volume_m3
    )

@app.post("/api/tools/thermal-check")
def tool_thermal_check(req: ThermalCheckRequest):
    """Deterministic ACI 207 & Chula/KMUTT Mass Concrete Thermal Cracking & DEF Risk Evaluator."""
    return evaluate_thermal_mass_concrete(
        thickness_m=req.thickness_m,
        total_binder_kg_m3=req.total_binder_kg_m3,
        scm_percent=req.scm_percent,
        scm_type=req.scm_type,
        placing_temp_c=req.placing_temp_c
    )

@app.get("/api/tools/strength-convert")
def tool_strength_convert(value: float, from_format: str = "cylinder_ksc"):
    """Deterministic Cylinder (15x30 cm) vs Cube (15x15 cm) and MPa vs KSC converter per DPT 1101-64."""
    return convert_concrete_strength(strength_value=value, from_format=from_format)

@app.post("/api/tools/cost-estimate")
def tool_cost_estimate(req: CostEstimateRequest):
    """Deterministic Thai ready-mix cost savings & budget delta estimator."""
    return estimate_cost_impact(
        fc_mpa=req.fc_mpa,
        volume_m3=req.volume_m3,
        scm_percent=req.scm_percent,
        scm_type=req.scm_type
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
