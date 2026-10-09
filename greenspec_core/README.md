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

# Run with mock or configure TYPHOON_API_KEY
result = analyze_and_draft_spec(payload, use_mock=True)

print("Baseline:", result["baseline"]["total_carbon_tco2e"], "tCO2e")
print("Option A reduction:", result["options"]["option_a"]["carbon_reduction_percent"], "%")
print("Drafted Thai TOR:\n", result["technical_package"]["spec_clause_th"])
```

## Running Example
```bash
python3 greenspec_core/example.py
```

## Running Tests
```bash
python3 -m pytest tests/ -v
```

## Environment Variables (`.env`)

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

```env
# Typhoon API (SCB 10X Thai LLM)
TYPHOON_API_KEY=your_key_here
TYPHOON_BASE_URL=https://api.opentyphoon.ai/v1
TYPHOON_MODEL=typhoon-v1.5-instruct

# Supabase (Database & Vector RAG)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Integrating with Supabase RAG
```python
from greenspec_core import SupabaseRetriever, analyze_and_draft_spec

# Automatically uses SUPABASE_URL and keys from .env
retriever = SupabaseRetriever()

result = analyze_and_draft_spec(payload, retriever=retriever)
```

## Serverless Deployment
- **AWS Lambda:** Use `greenspec_core.lambda_handler` directly as your Lambda handler.
- **FastAPI:**
```python
from fastapi import FastAPI
from greenspec_core import analyze_and_draft_spec

app = FastAPI()

@app.post("/analyze")
def analyze(payload: dict):
    return analyze_and_draft_spec(payload)
```
