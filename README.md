# GREEN SPEC

Working frontend demo for **Feature 1: AI Green Spec Analysis**.

The application is in [`demo/`](./demo). It uses React, Tailwind CSS and Vite, with the white / dark-green / mint navigation theme from the original UI reference.

## Run locally

Requires Node.js **22.18+** (or a newer supported LTS version).

```sh
cd demo
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://127.0.0.1:5173`.

```sh
npm run build
npm run preview
```

The production build is written to `demo/dist`. Vite uses relative asset paths so the build can be hosted in a subdirectory. This React version runs through Vite or a static HTTP server; it is not a standalone HTML file.

## Demo workflow

1. Open the sample analysis, or create a project with **New analysis**.
2. Add local files or choose **Use sample documents**. Set document types and optimization priority.
3. Start the simulated analysis and review its processing steps.
4. Explore baseline carbon / cost and material hotspots.
5. Filter and sort recommendations. Inspect existing / proposed wording, references, performance, risk, confidence and sample compliance checks.
6. Compare Original, Option A and Option B. Approve, reject with a reason, comment / request adjustment, or save for review. Both approval and rejection lock the current decision; explicitly unlock to edit. Rejected items are still regenerated when requesting a new revision; approved locks are preserved.
7. Review the revision summary: approved, rejected and unresolved items, source references, combined CO₂ and cost impacts. Intentionally unresolved items may remain unchanged.
8. Request another revision with round-level feedback. Processing returns to recommendation review; locked approvals are preserved. Inspect immutable previous rounds in Revision History.
9. Accept the revision, then optionally generate a sample text specification or finish without a document. Both paths preserve the approved change set.
10. Review final impact, download approved changes (`.json`), view / print the final summary, return to the dashboard, or view the local Project Management handoff.

Use the left sidebar **Demo scenario** selector before analyzing to exercise successful, failed, missing-information and no-recommendation states. **Reset demo** restores the sample project.

## System Architecture & Components

GreenSpec is built as a **Hybrid Neuro-Symbolic Platform** combining a deterministic physics/engineering calculation engine with a full-text RAG pipeline and OpenTyphoon LLM.

```text
GreenSpec/
├── app.py                     # FastAPI REST API & Tool Endpoints
├── api/                       # Vercel Serverless Function (api/analyze.py)
├── greenspec_core/            # Decoupled Core AI & Engineering Engine
│   ├── tools.py               # Deterministic Engineering Tools (ACI 211.1, TGO, ACI 207)
│   ├── knowledge_graph.py     # Civil Engineering Knowledge Graph (14 nodes, 21 edges)
│   ├── knowledge_indexer.py   # Hybrid Graph-RAG (Graph reasoning + 235 semantic chunks)
│   ├── guardrails.py          # Safety Guardrails (Mass Concrete, PT Slabs, Columns)
│   ├── catalog.py             # Thai Certified Concrete & SCM Catalog (CPAC, Insee, EGAT)
│   ├── matcher.py             # Product Matching Algorithm
│   ├── calculator.py          # Impact Calculator (Baseline, Opt A, Opt B)
│   ├── llm_client.py          # OpenTyphoon LLM API Client (CSI 3-Part Bilingual Drafter)
│   ├── package_builder.py     # Technical Package Builder (Clauses, Compliance, Checklists)
│   ├── benchmark.py           # Internal Accuracy & Performance Benchmark Suite
│   └── exam_benchmark.py      # Standardized Civil Exam Benchmark (COE Thailand & ACI)
├── knowledge_base/            # Peer-Reviewed Literature & Thai Standards
│   ├── full_texts/            # 117 pages / 345k characters verbatim from Chula, KMUTT, etc.
│   ├── standards/             # TIS 15, TIS 2594, TIS 2135, DPT 1101-64, EIT 1014
│   └── research/              # High-volume pozzolans, bottom ash, durability research
├── demo/                      # React + Vite + Tailwind Frontend Application
│   └── src/                   # Interactive Dashboard, Review Flow & Spec Generator
├── docs/                      # Documentation & Benchmark Reports
│   ├── BENCHMARK_REPORT.md    # 5-Suite Benchmark Report (100% Pass, Exam Suite)
│   └── exam_benchmark_results.json # Itemized Civil Exam Benchmark Results
└── tests/                     # Automated Test Suite (36 passing tests)
```

## Running the Backend API

Start the FastAPI server locally:

```sh
# Install python dependencies
pip install fastapi uvicorn pymupdf pytest

# Run API server (port 8000)
python3 -m uvicorn app:app --reload --port 8000
```

Available API Endpoints:
* `POST /api/analyze` - Full specification analysis, safety guardrails, carbon/cost optimization, and bilingual TOR drafting.
* `GET /api/catalog` - List of certified low-carbon concrete and SCM materials in Thailand.
* `POST /api/tools/mix-design` - Deterministic ACI 211.1 mix design proportioning.
* `POST /api/tools/carbon-calc` - TGO-verified embodied carbon footprint calculator.
* `POST /api/tools/thermal-check` - Mass concrete thermal cracking ($\Delta T \le 20^\circ\text{C}$) and DEF risk evaluator.
* `GET /api/tools/strength-convert` - DPT 1101-64 Cylinder ($15\times 30\text{ cm}$) vs Cube ($15\times 15\text{ cm}$) converter.
* `POST /api/tools/cost-estimate` - Ready-mix concrete cost impact estimator.
* Interactive OpenAPI Swagger docs: `http://localhost:8000/docs`

## Running Automated Tests & Benchmark

```sh
# Run all 36 unit and integration tests
PYTHONPATH=. pytest -v tests/

# Run comprehensive engineering benchmark suite
python3 -m greenspec_core.benchmark
```

Benchmark highlights:
* **Volumetric Conservation:** Sum of absolute volumes = $1.000\text{ m}^3$ (Error: 0.000%).
* **Council of Engineers Exam Benchmark:** 93.3% on pure LLM vs 100.0% on GreenSpec Hybrid Engine.
* **Engine Latency:** 20.55 ms total processing time.
* See full report in [`docs/BENCHMARK_REPORT.md`](./docs/BENCHMARK_REPORT.md).

## Running the Frontend Demo

```sh
cd demo
npm ci
npm run dev
```

Open `http://127.0.0.1:5173` to explore the interactive review flow.
