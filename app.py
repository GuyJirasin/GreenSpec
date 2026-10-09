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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
