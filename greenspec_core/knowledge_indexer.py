import os
import re
from typing import List, Dict, Any, Optional
from greenspec_core.rag_interface import BaseRetriever
from greenspec_core.knowledge_graph import CivilKnowledgeGraph

class KnowledgeIndexer:
    """Indexes and searches markdown documents in knowledge_base/ directory."""

    def __init__(self, kb_dir: Optional[str] = None):
        if kb_dir is None:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "knowledge_base"))
            self.kb_dir = base_dir
        else:
            self.kb_dir = kb_dir

        self.chunks: List[Dict[str, Any]] = []
        self._load_and_chunk_documents()

    def _load_and_chunk_documents(self):
        if not os.path.exists(self.kb_dir):
            return

        for root, _, files in os.walk(self.kb_dir):
            for file in files:
                if file.endswith(".md"):
                    file_path = os.path.join(root, file)
                    self._parse_file(file_path, file)

    def _parse_file(self, file_path: str, filename: str):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Extract main title (# Title)
            title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
            main_title = title_match.group(1).strip() if title_match else filename

            # Chunk by sections (## Heading)
            sections = re.split(r"\n(?=##\s+)", content)
            for idx, sec in enumerate(sections):
                sec = sec.strip()
                if not sec:
                    continue

                heading_match = re.search(r"^##\s+(.+)$", sec, re.MULTILINE)
                heading = heading_match.group(1).strip() if heading_match else f"Section {idx+1}"

                self.chunks.append({
                    "id": f"{filename}_{idx}",
                    "file": filename,
                    "title": main_title,
                    "heading": heading,
                    "content": sec,
                    "text_for_search": f"{main_title} {heading} {sec}".lower()
                })
        except Exception:
            pass

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        query_terms = [t.lower() for t in query.split() if len(t) > 1]
        if not query_terms:
            return self.chunks[:limit]

        # Domain query synonym expansion
        if any(w in query.lower() for w in ["mat", "ฐานราก", "mass"]):
            query_terms.extend(["aci 207", "ความร้อน", "delta t", "56 วัน", "มวลหนา"])
        if any(w in query.lower() for w in ["pt", "post", "ดึงลวด"]):
            query_terms.extend(["aci 318", "กำลังอัดต้น", "early", "ไม่เกิน 20%"])

        scored = []
        for chunk in self.chunks:
            haystack = chunk["text_for_search"]
            score = 0
            for term in query_terms:
                if term in haystack:
                    # Title/Heading match has higher weight
                    if term in chunk["title"].lower() or term in chunk["heading"].lower():
                        score += 3
                    else:
                        score += 1

            if score > 0:
                scored.append((score, chunk))

        # Sort descending by relevance score
        scored.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in scored[:limit]]

class HybridGraphRAGRetriever(BaseRetriever):
    """Hybrid RAG combining Deterministic Knowledge Graph with Document Chunks."""

    def __init__(self, indexer: Optional[KnowledgeIndexer] = None, kg: Optional[CivilKnowledgeGraph] = None):
        self.indexer = indexer or KnowledgeIndexer()
        self.kg = kg or CivilKnowledgeGraph()

    def retrieve(self, element_type: str, query: str = "") -> List[str]:
        results = []

        # 1. Knowledge Graph Verified Structural Facts
        graph_facts = self.kg.to_graph_rag_context(element_type).strip()
        results.append(graph_facts)

        # 2. Knowledge Graph Engineering Reasoning Path
        reasoning_chain = self.kg.explain_chain(element_type, "TIS_2135_FlyAsh").strip()
        results.append(f"[GRAPH REASONING CHAIN]\n{reasoning_chain}")

        # 3. Semantic Document Retrieval from Civil Engineering Knowledge Base
        search_query = f"{element_type} {query}"
        matched_chunks = self.indexer.search(search_query, limit=3)

        for chunk in matched_chunks:
            snippet = f"[{chunk['title']} - {chunk['heading']}]\n{chunk['content']}"
            results.append(snippet)

        return results

def sync_knowledge_to_supabase(supabase_client: Any, table_name: str = "civil_standards") -> int:
    """Sync all knowledge base chunks to Supabase table."""
    indexer = KnowledgeIndexer()
    records = []
    for c in indexer.chunks:
        records.append({
            "chunk_id": c["id"],
            "title": c["title"],
            "heading": c["heading"],
            "clause_text": c["content"],
            "file_source": c["file"]
        })

    if not records:
        return 0

    supabase_client.table(table_name).upsert(records).execute()
    return len(records)
