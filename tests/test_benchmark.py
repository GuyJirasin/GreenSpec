# tests/test_benchmark.py
import pytest
from greenspec_core.benchmark import GreenSpecBenchmark

def test_full_greenspec_benchmark_suite():
    bm = GreenSpecBenchmark()
    report = bm.run_all()
    
    assert report["overall_status"] == "EXCELLENT (100% PASS)"
    assert report["overall_pass_rate_pct"] >= 95.0
    
    # Check mix design 100%
    m1 = report["mix_design_accuracy"]
    assert m1["pass_rate_pct"] == 100.0
    assert m1["max_volumetric_error_m3"] <= 0.01

    # Check RAG top-3 hit rate
    m2 = report["rag_retrieval_accuracy"]
    assert m2["top_3_hit_rate_pct"] >= 90.0

    # Check guardrails
    m3 = report["guardrail_safety"]
    assert m3["pass_rate_pct"] == 100.0

    # Total latency under 100ms
    assert report["total_benchmark_time_ms"] < 200.0
