import json
import urllib.request
import urllib.error
from typing import List, Tuple
from greenspec_core.config import Config

class SpecLinter:
    """Verifies that drafted specification text contains required civil engineering clauses."""
    @staticmethod
    def lint(spec_text: str, target_fc: float, scm_pct: float) -> Tuple[bool, List[str]]:
        errors = []
        text_lower = spec_text.lower()

        # 1. Standard Citations check
        has_std = any(std in spec_text for std in ["มอก.", "วสท.", "aci", "astm", "tis", "มยผ."])
        if not has_std:
            errors.append("ขาดการอ้างอิงมาตรฐานวิศวกรรม (มอก. / วสท. / ACI / ASTM)")

        # 2. Trial Mix / Submittal check
        has_trial = any(kw in text_lower for kw in ["trial mix", "ทดสอบผสม", "submittal", "35 วัน", "28 วัน"])
        if not has_trial:
            errors.append("ขาดข้อกำหนดการส่งผลทดสอบ Trial Mix ล่วงหน้าก่อนเทจริง")

        # 3. Curing duration check
        has_curing = any(kw in text_lower for kw in ["บ่ม", "curing", "7 วัน", "14 วัน"])
        if not has_curing:
            errors.append("ขาดข้อกำหนดระยะเวลาและวิธีการบ่มคอนกรีต (Curing)")

        return len(errors) == 0, errors

class TyphoonClient:
    """Typhoon LLM API Client (OpenAI-compatible) with strict civil prompt templates."""

    def __init__(self, api_key: str = "", base_url: str = "", model: str = "", use_mock: bool = False):
        cfg = Config()
        self.api_key = api_key or cfg.typhoon_api_key
        self.base_url = (base_url or cfg.typhoon_base_url).rstrip("/")
        self.model = model or cfg.typhoon_model
        self.use_mock = use_mock or not bool(self.api_key)

    def generate_spec(
        self,
        project_name: str,
        element_type: str,
        fc_mpa: float,
        age_days: int,
        scm_name: str,
        scm_pct: float,
        wb_ratio: float,
        curing_days: int,
        standards_context: List[str]
    ) -> Tuple[str, str]:
        if self.use_mock:
            return self._mock_generate(project_name, element_type, fc_mpa, age_days, scm_name, scm_pct, wb_ratio, curing_days)

        prompt = self._build_prompt(project_name, element_type, fc_mpa, age_days, scm_name, scm_pct, wb_ratio, curing_days, standards_context)
        try:
            req_data = json.dumps({
                "model": self.model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "คุณคือ Senior Structural & Materials Engineer ผู้เชี่ยวชาญการร่างข้อกำหนด TOR "
                            "ตามมาตรฐาน วสท. 1014, ACI 318 และ CSI MasterFormat 03 30 00. "
                            "ห้ามแก้ไขตัวเลขสเปคที่ได้รับ ให้คงค่า f'c, % SCM, W/B และอายุทดสอบตามที่กำหนดไว้ 100% "
                            "จงร่างข้อกำหนดทั้งภาษาไทย (Thai) และภาษาอังกฤษ (English) ในรูปแบบ 3-Part Specification อย่างเคร่งครัด "
                            "คั่นระหว่างภาษาไทยและภาษาอังกฤษด้วยเครื่องหมาย ---"
                        )
                    },
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2,
                "max_tokens": 4000
            }).encode("utf-8")

            req = urllib.request.Request(
                f"{self.base_url}/chat/completions",
                data=req_data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}"
                }
            )
            with urllib.request.urlopen(req, timeout=45) as resp:
                resp_json = json.loads(resp.read().decode("utf-8"))
                content = resp_json["choices"][0]["message"]["content"]
                return self._parse_llm_output(content)
        except Exception:
            # Fallback to deterministic mock template on API failure
            return self._mock_generate(project_name, element_type, fc_mpa, age_days, scm_name, scm_pct, wb_ratio, curing_days)

    def _build_prompt(self, project_name, element_type, fc_mpa, age_days, scm_name, scm_pct, wb_ratio, curing_days, standards_context):
        context_str = "\n".join(f"- {s}" for s in standards_context)
        return f"""
โครงการ: {project_name}
ชิ้นส่วนโครงสร้าง: {element_type}
กำลังอัดระบุ f'c: {fc_mpa} MPa (Cylinder)
อายุตรวจรับกำลังอัด: {age_days} วัน
สูตรผสมที่ผ่านการตรวจสอบ: {scm_name} (สัดส่วน {scm_pct}%)
อัตราส่วนน้ำต่อวัสดุประสาน (W/B) สูงสุด: {wb_ratio}
ระยะเวลาบ่มชื้นขั้นต่ำ: {curing_days} วัน

มาตรฐานอ้างอิง:
{context_str}

กรุณาร่างข้อกำหนด TOR ในหมวด SECTION 03 30 00 - CAST-IN-PLACE CONCRETE แบ่งเป็น 2 ส่วนชัดเจน:
1. ข้อกำหนดภาษาไทย (CSI 3-Part: ทั่วไป, วัสดุ, การดำเนินการก่อสร้าง)
2. Specification ภาษาอังกฤษ (PART 1 - GENERAL, PART 2 - PRODUCTS, PART 3 - EXECUTION)
"""

    def _parse_llm_output(self, content: str) -> Tuple[str, str]:
        split_markers = [
            "2. Specification ภาษาอังกฤษ",
            "Specification ภาษาอังกฤษ",
            "Specification in English",
            "English Specification",
            "PART 1 - GENERAL",
            "PART 1: GENERAL",
            "PART 1 – GENERAL"
        ]
        for marker in split_markers:
            if marker in content:
                idx = content.find(marker)
                th_part = content[:idx].strip()
                en_part = content[idx:].strip()
                if len(th_part) > 100:
                    return th_part, en_part

        parts = content.split("\n---\n")
        if len(parts) >= 2 and len(parts[0]) > 200:
            return parts[0].strip(), parts[1].strip()

        return content.strip(), content.strip()

    def _mock_generate(self, project_name, element_type, fc_mpa, age_days, scm_name, scm_pct, wb_ratio, curing_days) -> Tuple[str, str]:
        th_clause = f"""หมวดที่ 03 30 00 งานคอนกรีตโครงสร้างหล่อในที่ (คอนกรีตคาร์บอนต่ำ)
โครงการ: {project_name} | องค์อาคาร: {element_type}

ส่วนที่ 1 - ข้อกำหนดทั่วไป (GENERAL)
1.1 การส่งเอกสารอนุมัติ (Submittals):
    - ผู้รับจ้างต้องเสนอผลการออกแบบส่วนผสม (Mix Design) และผลการทดสอบส่วนผสมในห้องปฏิบัติการ (Trial Mix Test Results) ล่วงหน้าไม่น้อยกว่า 35 วันก่อนเริ่มการเทคอนกรีต ตามเกณฑ์ มอก. 213
    - แนบใบรับรองคุณภาพจากโรงงานผู้ผลิต (Mill Certificate) ของเถ้าลอยตาม มอก. 2135 ชั้นคุณภาพ F และปูนซีเมนต์ไฮดรอลิก มอก. 2594
    - แผนงานการบ่มคอนกรีต (Curing Plan) และแผนควบคุมอุณหภูมิ (Thermal Control Plan กรณีคอนกรีตหนา)

ส่วนที่ 2 - วัสดุและส่วนผสม (PRODUCTS)
2.1 วัสดุประสาน:
    - ปูนซีเมนต์ไฮดรอลิกตาม มอก. 2594 หรือปูนซีเมนต์ปอร์ตแลนด์ตาม มอก. 15
    - เถ้าลอยถ่านหินตาม มอก. 2135 ชั้นคุณภาพ F (LOI <= 6.0%, ความละเอียดค้างตะแกรง 45 ไมครอน <= 34%)
2.2 สัดส่วนผสมและคุณสมบัติทางวิศวกรรม:
    - กำลังอัดประลัยระบุ f'c ไม่น้อยกว่า {fc_mpa:.1f} MPa (ทดสอบด้วยแท่งทรงกระบอก Cylinder) ที่อายุ {age_days} วัน
    - การแทนที่ด้วย {scm_name} สัดส่วนไม่เกิน {scm_pct:.0f}% โดยน้ำหนักของวัสดุประสานรวม
    - อัตราส่วนน้ำต่อวัสดุประสาน (W/B) สูงสุดไม่เกิน {wb_ratio:.2f}

ส่วนที่ 3 - การดำเนินการก่อสร้าง (EXECUTION)
3.1 การลำเลียงและเท: ต้องเทคอนกรีตให้เสร็จสิ้นภายใน 90 นาที หรือไม่เกิน 300 รอบหมุนโม่
3.2 การบ่มคอนกรีต: ต้องดำเนินการบ่มชื้นต่อเนื่องอย่างเคร่งครัดไม่น้อยกว่า {curing_days} วัน"""

        en_clause = f"""SECTION 03 30 00 - CAST-IN-PLACE CONCRETE (LOW-CARBON MIX SPECIFICATION)
Project: {project_name} | Structural Element: {element_type}

PART 1 - GENERAL
1.1 SUBMITTAL REQUIREMENTS:
    - Submit mix design proportions and laboratory trial batch test reports conforming to ASTM C39 / TIS 213 at least 35 days prior to concrete placement.
    - Submit manufacturer mill test certificates for TIS 2135 Class F fly ash (LOI <= 6.0%) and TIS 2594 hydraulic cement.
    - Submit concrete curing and temperature monitoring procedures.

PART 2 - PRODUCTS
2.1 CEMENTITIOUS MATERIALS:
    - Hydraulic Cement conforming to TIS 2594 / ASTM C595.
    - Coal Fly Ash conforming to TIS 2135 Class F / ASTM C618.
2.2 MIX DESIGN CRITERIA:
    - Specified compressive strength (f'c): >= {fc_mpa:.1f} MPa (standard cylinder) evaluated at {age_days} days.
    - Maximum SCM replacement: {scm_pct:.0f}% by weight of total cementitious material.
    - Maximum Water-Binder (W/B) Ratio: {wb_ratio:.2f}.

PART 3 - EXECUTION
3.1 BATCHING & PLACING: Complete discharge within 90 minutes after batching.
3.2 CURING: Continuous moist curing for a minimum of {curing_days} days."""

        return th_clause, en_clause
