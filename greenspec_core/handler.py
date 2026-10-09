import json
from typing import Dict, Any, Optional
from greenspec_core.types import ProjectInput
from greenspec_core.guardrails import evaluate_guardrail
from greenspec_core.calculator import calculate_impacts
from greenspec_core.package_builder import build_technical_package
from greenspec_core.rag_interface import BaseRetriever, LocalStandardsRetriever
from greenspec_core.llm_client import TyphoonClient
from greenspec_core.matcher import match_products

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
    matched = match_products(project, guardrail)

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
        "matched_products": matched,
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
