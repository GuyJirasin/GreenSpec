# tests/test_knowledge_indexer.py
import pytest
from greenspec_core.knowledge_indexer import KnowledgeIndexer, HybridGraphRAGRetriever
from greenspec_core.rag_interface import BaseRetriever

def test_knowledge_indexer_loads_all_documents():
    indexer = KnowledgeIndexer()
    assert len(indexer.chunks) >= 50
    titles = [c["title"] for c in indexer.chunks]
    assert any("มยผ." in t or "1101" in t for t in titles)
    assert any("2135" in t or "เถ้าลอย" in t for t in titles)
    assert any("CPAC" in t for t in titles)
    assert any("ACI 207" in t for t in titles)
    assert any("ACI 211" in t or "การออกแบบส่วนผสม" in t for t in titles)
    assert any("ทางหลวง" in t or "DOH" in t for t in titles)
    assert any("ASTM C618" in t for t in titles)

def test_semantic_search_retrieves_relevant_chunks():
    indexer = KnowledgeIndexer()
    results = indexer.search("ฐานรากหนา mass concrete ควบคุมอุณหภูมิ delta T", limit=3)
    assert len(results) >= 1
    combined = " ".join([r["content"] for r in results])
    assert "ACI 207" in combined or "ความร้อน" in combined or "70" in combined

def test_hybrid_graph_rag_retriever_combines_graph_and_text():
    retriever = HybridGraphRAGRetriever()
    assert isinstance(retriever, BaseRetriever)

    docs = retriever.retrieve(element_type="mat_foundation", query="เถ้าลอย คุมความร้อน")
    assert len(docs) >= 3
    combined = " ".join(docs)

    # Must contain both Knowledge Graph facts and document text
    assert "KNOWLEDGE GRAPH VERIFIED FACTS" in combined
    assert "มอก. 2135" in combined
    assert "ACI 207" in combined
