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

## Integrating with Custom RAG
```python
from greenspec_core import BaseRetriever, analyze_and_draft_spec

class MyVectorDBRetriever(BaseRetriever):
    def retrieve(self, element_type: str, query: str):
        # Query your Pinecone / Qdrant / Supabase DB
        return ["ข้อกำหนดเฉพาะโครงการ..."]

result = analyze_and_draft_spec(payload, retriever=MyVectorDBRetriever())
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
