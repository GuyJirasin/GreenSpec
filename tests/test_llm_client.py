# tests/test_llm_client.py
import pytest
from greenspec_core.llm_client import TyphoonClient, SpecLinter

def test_spec_linter_passes_valid_clause():
    valid_th = """
    หมวดที่ 03 30 00 คอนกรีตโครงสร้างหล่อในที่
    ส่วนที่ 1 ทั่วไป: ผู้รับจ้างต้องส่งผลทดสอบ Trial Mix ล่วงหน้าไม่น้อยกว่า 35 วัน ตาม มอก. 213
    ส่วนที่ 2 วัสดุ: ใช้ปูนซีเมนต์ไฮดรอลิก มอก. 2594 ผสมเถ้าลอย มอก. 2135 ชั้น F ไม่เกิน 25% กำลังอัด f'c >= 35 MPa ที่ 28 วัน
    ส่วนที่ 3 การบ่ม: ต้องบ่มชื้นต่อเนื่องไม่น้อยกว่า 7 วัน
    """
    valid, errors = SpecLinter.lint(valid_th, target_fc=35.0, scm_pct=25.0)
    assert valid is True
    assert len(errors) == 0

def test_spec_linter_fails_vague_clause():
    vague_th = "ใช้คอนกรีตสีเขียวผสมเถ้าลอยตามความเหมาะสม"
    valid, errors = SpecLinter.lint(vague_th, target_fc=35.0, scm_pct=25.0)
    assert valid is False
    assert any("มอก." in err or "มาตรฐาน" in err for err in errors)

def test_typhoon_client_mock_mode():
    client = TyphoonClient(api_key="", use_mock=True)
    th_clause, en_clause = client.generate_spec(
        project_name="Metro Park",
        element_type="mat_foundation",
        fc_mpa=35.0,
        age_days=56,
        scm_name="TIS 2135 Fly Ash 25%",
        scm_pct=25.0,
        wb_ratio=0.42,
        curing_days=14,
        standards_context=["มอก. 2135", "ACI 207"]
    )
    assert "03 30 00" in th_clause
    assert "PART 1" in en_clause or "SECTION 03 30 00" in en_clause
