import pytest
from greenspec_core.exam_benchmark import BENCHMARK_EXAM_QUESTIONS, CivilExamBenchmarkRunner

def test_benchmark_exam_questions_integrity():
    assert len(BENCHMARK_EXAM_QUESTIONS) == 15
    for q in BENCHMARK_EXAM_QUESTIONS:
        assert "id" in q
        assert "question" in q
        assert "options" in q
        assert len(q["options"]) == 4
        assert q["correct_answer"] in ["A", "B", "C", "D"]
        assert "standard_ref" in q
        assert "explanation" in q

def test_civil_exam_benchmark_runner():
    runner = CivilExamBenchmarkRunner()
    results = runner.run_benchmark()
    assert results["total_questions"] == 15
    assert results["rag_coverage_rate_percent"] >= 80.0
    assert results["avg_latency_ms"] < 200.0  # sub-200ms per retrieval
