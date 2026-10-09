from abc import ABC, abstractmethod
from typing import List, Optional
from greenspec_core.config import Config

class BaseRetriever(ABC):
    """Abstract interface for RAG context retrieval."""
    @abstractmethod
    def retrieve(self, element_type: str, query: str) -> List[str]:
        """Retrieve relevant standard clauses or knowledge snippets."""
        pass

class LocalStandardsRetriever(BaseRetriever):
    """Default embedded knowledge base for Thai and international concrete standards."""

    STANDARDS_DB = {
        "mass_concrete": [
            "วสท. 1014 / ACI 207.1R: สำหรับคอนกรีตที่มีมิติหนาตั้งแต่ 1.0 เมตรขึ้นไป ต้องควบคุมผลต่างอุณหภูมิระหว่างแกนกลางและผิวคอนกรีต (Delta T) ไม่เกิน 20 องศาเซลเซียส และอุณหภูมิแกนกลางสูงสุดไม่เกิน 70 องศาเซลเซียส",
            "มอก. 2135 / ASTM C618: เถ้าลอยชั้นคุณภาพ F (Class F) มีปริมาณ SiO2 + Al2O3 + Fe2O3 >= 70% และค่า LOI <= 6.0% เหมาะสำหรับงาน Mass Concrete เพื่อลดความร้อนไฮเดรชัน",
            "ACI 318-19 Table 26.4.2.2: ในโครงสร้างหนา อนุญาตให้ใช้ผลทดสอบกำลังอัดที่อายุ 56 วัน หรือ 90 วัน เป็นเกณฑ์ตรวจรับความแข็งแรงของโครงสร้างได้"
        ],
        "pt_slab": [
            "ACI 318-19 Chapter 26 / วสท. 1014: คอนกรีตอัดแรงชนิดดึงทีหลัง (Post-tensioned) ต้องมีกำลังอัดขั้นต่ำก่อนการดึงลวด (Initial Stressing) ไม่น้อยกว่า 18-24 MPa (หรือ 70% ของ f'c)",
            "ACI 232.2R: การใช้เถ้าลอยในแผ่นพื้น Post-tensioned ควรจำกัดสัดส่วนไม่เกิน 15-20% เพื่อไม่ให้กระทบต่อกำหนดเวลาการดึงลวดและการถอดแบบหล่อ (Cycle time)",
            "ASTM C39 / มอก. 213: ต้องเก็บตัวอย่างลูกปูนเพื่อทดสอบกำลังอัดที่ 3 วัน, 7 วัน และ 28 วัน เพื่อยืนยันความปลอดภัยก่อนดึงลวด"
        ],
        "column": [
            "วสท. 1014 / ACI 318-19: สำหรับเสาอาคารสูง อัตราส่วนน้ำต่อวัสดุประสาน (W/B) ต้องไม่เกิน 0.38-0.40 เพื่อให้ได้ค่า Modulus of Elasticity และความทึบน้ำที่ดี",
            "มอก. 2594: ปูนซีเมนต์ไฮดรอลิก สามารถใช้ทดแทนปูนซีเมนต์ปอร์ตแลนด์ประเภท 1 ได้ตามมาตรฐาน มยผ. และ วสท. โดยให้กำลังอัดต้นและปลายเทียบเท่ากัน"
        ],
        "general": [
            "มอก. 2135: เถ้าลอยสำหรับใช้เป็นมวลผสมคอนกรีต ต้องมีใบรับรองผลทดสอบจากผู้ผลิต (Mill Certificate) ตรวจสอบค่าความละเอียดค้างตะแกรง 45 ไมครอน <= 34%",
            "วสท. 1014: การบ่มคอนกรีตผสมเถ้าลอยหรือสแลก ต้องบ่มชื้นอย่างต่อเนื่องไม่น้อยกว่า 7 วันสำหรับโครงสร้างทั่วไป และ 14 วันสำหรับสูตรผสม SCMs สูง"
        ]
    }

    def retrieve(self, element_type: str, query: str) -> List[str]:
        key = "general"
        elem = element_type.lower()
        if "mat" in elem or "footing" in elem or "mass" in elem:
            key = "mass_concrete"
        elif "pt" in elem or "post" in elem:
            key = "pt_slab"
        elif "column" in elem:
            key = "column"

        results = list(self.STANDARDS_DB.get(key, []))
        # Add general curing & mill certificate clauses
        results.extend(self.STANDARDS_DB["general"])
        return results

class SupabaseRetriever(BaseRetriever):
    """Retriever connected to Supabase pgvector or standard table."""

    def __init__(
        self,
        supabase_url: Optional[str] = None,
        supabase_key: Optional[str] = None,
        table_name: str = "civil_standards",
        fallback: Optional[BaseRetriever] = None
    ):
        cfg = Config()
        self.url = supabase_url or cfg.supabase_url
        self.key = supabase_key or cfg.supabase_anon_key or cfg.supabase_service_role_key
        self.table_name = table_name
        self.fallback = fallback or LocalStandardsRetriever()
        self.client = None

        if self.url and self.key:
            try:
                from supabase import create_client
                self.client = create_client(self.url, self.key)
            except Exception:
                self.client = None

    def retrieve(self, element_type: str, query: str) -> List[str]:
        if not self.client:
            return self.fallback.retrieve(element_type, query)

        try:
            # Query table for matching records
            response = self.client.table(self.table_name)\
                .select("clause_text")\
                .ilike("element_type", f"%{element_type}%")\
                .limit(5)\
                .execute()

            if response.data:
                return [row["clause_text"] for row in response.data if "clause_text" in row]
            return self.fallback.retrieve(element_type, query)
        except Exception:
            return self.fallback.retrieve(element_type, query)
