# tests/test_knowledge_graph.py
import pytest
from greenspec_core.knowledge_graph import CivilKnowledgeGraph

def test_knowledge_graph_initialization():
    kg = CivilKnowledgeGraph()
    assert len(kg.nodes) >= 15
    assert len(kg.edges) >= 20

def test_mat_foundation_graph_traversal():
    kg = CivilKnowledgeGraph()
    subgraph = kg.get_element_subgraph("mat_foundation")

    # Verify structural relationships
    standards = subgraph["standards"]
    assert any("ACI 207" in s or "วสท." in s for s in standards)

    constraints = subgraph["constraints"]
    assert any("Thermal" in c or "Delta T" in c for c in constraints)

    materials = subgraph["allowed_materials"]
    assert any("เถ้าลอย" in m or "Fly Ash" in m for m in materials)

    products = subgraph["recommended_products"]
    assert len(products) >= 2
    assert any("CPAC" in p["brand"] for p in products)

def test_pt_slab_restriction_traversal():
    kg = CivilKnowledgeGraph()
    subgraph = kg.get_element_subgraph("pt_slab")

    constraints = subgraph["constraints"]
    assert any("Early" in c or "ดึงลวด" in c or "กำลังอัดต้น" in c for c in constraints)
    assert any("จำกัด" in c or "ไม่เกิน 20%" in c for c in constraints)

def test_graph_reasoning_explanation_path():
    kg = CivilKnowledgeGraph()
    explanation = kg.explain_chain(element_type="mat_foundation", target_material="TIS_2135_FlyAsh")
    assert "Mass Concrete" in explanation or "ความหนา" in explanation
    assert "ACI 207" in explanation
    assert "ลดความร้อน" in explanation
