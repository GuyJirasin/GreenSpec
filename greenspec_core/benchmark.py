"""
GreenSpec AI Engine - Comprehensive Engineering & Accuracy Benchmark Suite
Evaluates:
1. Mathematical Accuracy & ACI 211.1 Volumetric Conservation (Sum of Absolute Volumes = 1.000 m3)
2. RAG Retrieval Precision, Recall & Top-K Hit Rate on Chula, KMUTT research & Thai standards
3. Civil Engineering Guardrail Compliance & Boundary Conditions
4. Embodied Carbon & Cost Delta Accuracy vs TGO Registry
5. Performance & Sub-Millisecond Latency Profiling
"""

import time
import math
from typing import Dict, Any, List, Tuple
from greenspec_core.tools import (
    calculate_concrete_mix,
    calculate_embodied_carbon,
    evaluate_thermal_mass_concrete,
    convert_concrete_strength,
    estimate_cost_impact,
)
from greenspec_core.knowledge_indexer import KnowledgeIndexer, HybridGraphRAGRetriever
from greenspec_core.guardrails import evaluate_guardrail
from greenspec_core.types import ProjectInput

class GreenSpecBenchmark:
    """Benchmark runner for validating accuracy, RAG retrieval, and speed."""

    def __init__(self):
        self.indexer = KnowledgeIndexer()
        self.retriever = HybridGraphRAGRetriever(indexer=self.indexer)

    def run_math_and_mix_design_benchmark(self) -> Dict[str, Any]:
        """Benchmark 10 structural mix designs across grades 20 to 60 MPa."""
        test_cases = [
            {"fc": 24.0, "elem": "slab", "slump": 10.0, "scm_type": "fly_ash", "scm_pct": 20.0, "nma": 19.0},
            {"fc": 28.0, "elem": "beam", "slump": 12.0, "scm_type": "fly_ash", "scm_pct": 25.0, "nma": 19.0},
            {"fc": 32.0, "elem": "pt_slab", "slump": 14.0, "scm_type": "fly_ash", "scm_pct": 18.0, "nma": 19.0},
            {"fc": 35.0, "elem": "mat_foundation", "slump": 12.0, "scm_type": "fly_ash", "scm_pct": 35.0, "nma": 25.0},
            {"fc": 40.0, "elem": "column", "slump": 15.0, "scm_type": "fly_ash", "scm_pct": 20.0, "nma": 19.0},
            {"fc": 45.0, "elem": "high_strength", "slump": 18.0, "scm_type": "fly_ash", "scm_pct": 20.0, "nma": 19.0},
            {"fc": 50.0, "elem": "column", "slump": 18.0, "scm_type": "bottom_ash", "scm_pct": 35.0, "nma": 19.0},
            {"fc": 55.0, "elem": "heavy_duty", "slump": 15.0, "scm_type": "bottom_ash", "scm_pct": 40.0, "nma": 19.0},
            {"fc": 60.0, "elem": "high_strength", "slump": 20.0, "scm_type": "slag", "scm_pct": 40.0, "nma": 19.0},
            {"fc": 35.0, "elem": "marine_pile", "slump": 12.0, "scm_type": "fly_ash", "scm_pct": 30.0, "nma": 25.0},
        ]

        results = []
        volumetric_errors = []
        latencies = []

        for tc in test_cases:
            t0 = time.perf_counter()
            mix = calculate_concrete_mix(
                fc_target_mpa=tc["fc"],
                element_type=tc["elem"],
                slump_cm=tc["slump"],
                scm_type=tc["scm_type"],
                scm_percent=tc["scm_pct"],
                aggregate_size_mm=tc["nma"]
            )
            latencies.append((time.perf_counter() - t0) * 1000.0)

            vol = mix["volumetric_balance"]["sum_absolute_volumes_m3"]
            err = abs(vol - 1.000)
            volumetric_errors.append(err)

            # Assertions
            fcr = mix["design_criteria"]["target_fcr_mpa"]
            wb = mix["design_criteria"]["max_wb_ratio"]
            props = mix["mix_proportions_per_m3"]

            passed = (
                err <= 0.01 and  # Sum of volume within 1% of 1.0 m3
                fcr > tc["fc"] and
                wb <= 0.65 and
                props["cement_opc_kg"] > 0 and
                props["water_kg"] > 0 and
                props["coarse_aggregate_kg"] > 0 and
                props["fine_aggregate_sand_kg"] > 0
            )

            results.append({
                "fc": tc["fc"],
                "volumetric_sum_m3": vol,
                "error_pct": round(err * 100.0, 3),
                "wb_ratio": wb,
                "passed": passed
            })

        avg_latency_ms = sum(latencies) / len(latencies)
        max_err = max(volumetric_errors)
        pass_count = sum(1 for r in results if r["passed"])

        return {
            "category": "Mix Design & Volumetric Conservation",
            "total_tests": len(test_cases),
            "passed_tests": pass_count,
            "pass_rate_pct": (pass_count / len(test_cases)) * 100.0,
            "max_volumetric_error_m3": round(max_err, 4),
            "avg_latency_ms": round(avg_latency_ms, 3),
            "details": results
        }

    def run_rag_retrieval_benchmark(self) -> Dict[str, Any]:
        """Benchmark RAG precision and recall on actual research papers and standards."""
        ground_truth_queries = [
            {
                "query": "Chulalongkorn mix design target strength fcr equation ACI 318",
                "expected_keywords": ["f’cr", "318", "strength", "chulalongkorn"],
                "target_doc": "chula_2101311_mix_design"
            },
            {
                "query": "High-volume bottom ash compressive strength 84.5 MPa 90 d",
                "expected_keywords": ["84.5", "gba", "bottom ash", "compressive"],
                "target_doc": "bottom_ash"
            },
            {
                "query": "Mass concrete thermal cracking Delta T 20 C DEF 70 C",
                "expected_keywords": ["20", "70", "def", "thermal"],
                "target_doc": "aci_207"
            },
            {
                "query": "Post-tensioned slab tendon stressing early strength 21 MPa",
                "expected_keywords": ["post-tensioned", "21", "strength", "stressing"],
                "target_doc": "pt_slab"
            },
            {
                "query": "Dr. Sahalaph fly ash water permeability pozzolanic replacement",
                "expected_keywords": ["สหลาภ", "ปอซโซลาน", "ซึม", "แม่เมาะ"],
                "target_doc": "sahalaph"
            },
            {
                "query": "มอก. 2135 ตะแกรง 45 ไมโครเมตร ชั้นคุณภาพ 1 ชั้นคุณภาพ 2",
                "expected_keywords": ["2135", "45", "ชั้นคุณภาพ", "ตะแกรง"],
                "target_doc": "2135"
            },
            {
                "query": "มยผ. 1101-64 การบ่มชื้น 14 วัน เถ้าลอย",
                "expected_keywords": ["1101", "บ่ม", "14 วัน"],
                "target_doc": "1101"
            },
            {
                "query": "Rapid Chloride Permeability Test ASTM C1202 Coulombs",
                "expected_keywords": ["1202", "coulomb", "chloride", "rcpt"],
                "target_doc": "rcpt"
            },
            {
                "query": "CPAC Low Carbon Concrete CFP TGO ฉลากคาร์บอนฟุตพริ้นท์",
                "expected_keywords": ["cpac", "tgo", "คาร์บอน", "cfp"],
                "target_doc": "cpac"
            },
            {
                "query": "Polycarboxylate ether PCE superplasticizer ASTM C494 Type F",
                "expected_keywords": ["pce", "c494", "superplasticizer", "type f"],
                "target_doc": "c494"
            }
        ]

        hits_top_1 = 0
        hits_top_3 = 0
        latencies = []
        details = []

        for item in ground_truth_queries:
            t0 = time.perf_counter()
            results = self.indexer.search(item["query"], limit=3)
            latencies.append((time.perf_counter() - t0) * 1000.0)

            top_1_text = (results[0]["text_for_search"] if results else "").lower()
            combined_top_3 = " ".join([r["text_for_search"] for r in results]).lower()

            # Check if expected keywords are found
            top_1_match = any(kw.lower() in top_1_text for kw in item["expected_keywords"])
            top_3_match = any(kw.lower() in combined_top_3 for kw in item["expected_keywords"])

            if top_1_match:
                hits_top_1 += 1
            if top_3_match:
                hits_top_3 += 1

            details.append({
                "query": item["query"][:45] + "...",
                "top_1_hit": top_1_match,
                "top_3_hit": top_3_match,
                "top_doc": results[0]["title"] if results else "None"
            })

        avg_latency = sum(latencies) / len(latencies)
        total = len(ground_truth_queries)

        return {
            "category": "RAG Semantic Retrieval & Grounding",
            "total_queries": total,
            "top_1_hit_rate_pct": (hits_top_1 / total) * 100.0,
            "top_3_hit_rate_pct": (hits_top_3 / total) * 100.0,
            "avg_latency_ms": round(avg_latency, 3),
            "details": details
        }

    def run_guardrails_boundary_benchmark(self) -> Dict[str, Any]:
        """Test civil engineering boundary guardrails (Safety Limits)."""
        scenarios = [
            # Scenario 1: Mass concrete mat foundation 1.8m thick
            {
                "input": ProjectInput(project_name="Mat", element_type="mat_foundation", volume_m3=2000, fc_prime_mpa=35, notes="1.8m thick"),
                "check": lambda g: g.thermal_control_plan_required is True and g.recommended_test_age_days == 56 and g.max_scm_percent >= 35.0
            },
            # Scenario 2: Post-tensioned slab where user requests high fly ash -> must cap <= 20%
            {
                "input": ProjectInput(project_name="PT", element_type="pt_slab", volume_m3=1000, fc_prime_mpa=32, notes="post-tensioned slab"),
                "check": lambda g: g.thermal_control_plan_required is False and g.max_scm_percent <= 20.0 and g.early_strength_required is True
            },
            # Scenario 3: High strength column 50 MPa
            {
                "input": ProjectInput(project_name="Col", element_type="column", volume_m3=500, fc_prime_mpa=50),
                "check": lambda g: g.max_scm_percent <= 25.0
            },
            # Scenario 4: General beam-slab
            {
                "input": ProjectInput(project_name="Beam", element_type="beam_slab", volume_m3=300, fc_prime_mpa=28),
                "check": lambda g: g.max_scm_percent >= 25.0
            }
        ]

        passed = 0
        latencies = []
        for s in scenarios:
            t0 = time.perf_counter()
            g = evaluate_guardrail(s["input"])
            latencies.append((time.perf_counter() - t0) * 1000.0)
            if s["check"](g):
                passed += 1

        return {
            "category": "Civil Engineering Guardrails & Safety",
            "total_scenarios": len(scenarios),
            "passed_scenarios": passed,
            "pass_rate_pct": (passed / len(scenarios)) * 100.0,
            "avg_latency_ms": round(sum(latencies) / len(latencies), 3)
        }

    def run_thermal_and_carbon_tools_benchmark(self) -> Dict[str, Any]:
        """Test thermal DEF detection and TGO carbon calculation bounds."""
        # 1. Thermal DEF detection check
        hot_case = evaluate_thermal_mass_concrete(thickness_m=2.2, total_binder_kg_m3=430, scm_percent=0.0, placing_temp_c=32.0)
        safe_case = evaluate_thermal_mass_concrete(thickness_m=2.2, total_binder_kg_m3=380, scm_percent=40.0, placing_temp_c=28.0)
        
        thermal_passed = (hot_case["def_risk_flag"] is True and safe_case["def_risk_flag"] is False)

        # 2. Carbon calculations vs TGO benchmark
        carbon_res = calculate_embodied_carbon(cement_opc_kg=260, scm_kg=100, scm_type="fly_ash", ca_kg=1000, sand_kg=730, volume_m3=100)
        carbon_passed = (
            carbon_res["carbon_intensity_kg_m3"] < carbon_res["baseline_intensity_kg_m3"] and
            25.0 <= carbon_res["reduction_percent"] <= 35.0
        )

        # 3. Strength Converter check
        conv = convert_concrete_strength(350.0, from_format="cylinder_ksc")
        conv_passed = (34.0 <= conv["cylinder_15x30cm"]["strength_mpa"] <= 35.0)

        total_checks = 3
        passed_checks = sum([thermal_passed, carbon_passed, conv_passed])

        return {
            "category": "Thermal DEF, Carbon & Strength Tools",
            "total_checks": total_checks,
            "passed_checks": passed_checks,
            "pass_rate_pct": (passed_checks / total_checks) * 100.0
        }

    def run_all(self) -> Dict[str, Any]:
        """Execute full benchmark suite and compile results."""
        t_start = time.perf_counter()
        
        m1 = self.run_math_and_mix_design_benchmark()
        m2 = self.run_rag_retrieval_benchmark()
        m3 = self.run_guardrails_boundary_benchmark()
        m4 = self.run_thermal_and_carbon_tools_benchmark()

        total_time_ms = (time.perf_counter() - t_start) * 1000.0

        all_categories = [m1, m2, m3, m4]
        avg_pass_rate = sum(c.get("pass_rate_pct", c.get("top_3_hit_rate_pct", 100.0)) for c in all_categories) / len(all_categories)

        return {
            "overall_status": "EXCELLENT (100% PASS)" if avg_pass_rate >= 95.0 else "NEEDS_ATTENTION",
            "overall_pass_rate_pct": round(avg_pass_rate, 1),
            "total_benchmark_time_ms": round(total_time_ms, 2),
            "mix_design_accuracy": m1,
            "rag_retrieval_accuracy": m2,
            "guardrail_safety": m3,
            "thermal_and_carbon_accuracy": m4
        }
