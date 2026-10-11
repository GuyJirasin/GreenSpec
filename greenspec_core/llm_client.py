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

    def __init__(self, api_key: str = "", base_url: str = "", model: str = ""):
        cfg = Config()
        self.api_key = api_key or cfg.typhoon_api_key
        self.base_url = (base_url or cfg.typhoon_base_url).rstrip("/")
        self.model = model or cfg.typhoon_model
        if not self.api_key:
            raise RuntimeError('TYPHOON_API_KEY is not configured.')

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
        except Exception as exc:
            raise RuntimeError('Typhoon specification generation failed. No fallback result is available.') from exc

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
