# tests/test_rag_interface.py
import pytest
from greenspec_core.rag_interface import BaseRetriever, LocalStandardsRetriever

def test_local_retriever_returns_relevant_standards():
    retriever = LocalStandardsRetriever()
    assert isinstance(retriever, BaseRetriever)

    # Query for mat foundation / mass concrete
    docs = retriever.retrieve(element_type="mat_foundation", query="mass concrete fly ash")
    assert len(docs) > 0
    combined = " ".join(docs)
    assert "วสท." in combined or "ACI 207" in combined
    assert "มอก. 2135" in combined

def test_local_retriever_returns_pt_slab_standards():
    retriever = LocalStandardsRetriever()
    docs = retriever.retrieve(element_type="pt_slab", query="early strength tendon")
    combined = " ".join(docs)
    assert "ACI 318" in combined or "Early-age" in combined
