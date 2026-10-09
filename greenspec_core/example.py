"""Example script demonstrating how a teammate can consume greenspec_core."""
import os
import sys

# Ensure root directory is on sys.path for direct execution
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

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
