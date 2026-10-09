from typing import List, Optional
from greenspec_core.types import ProjectInput, GuardrailResult, MixOption, TechnicalPackage, ComplianceItem
from greenspec_core.rag_interface import BaseRetriever, LocalStandardsRetriever
from greenspec_core.llm_client import TyphoonClient

def build_technical_package(
    project: ProjectInput,
    guardrail: GuardrailResult,
    chosen_option: MixOption,
    retriever: Optional[BaseRetriever] = None,
    typhoon_client: Optional[TyphoonClient] = None
) -> TechnicalPackage:
    if retriever is None:
        retriever = LocalStandardsRetriever()
    if typhoon_client is None:
        typhoon_client = TyphoonClient(use_mock=True)

    standards = retriever.retrieve(project.element_type, f"{chosen_option.scm_type} {project.fc_prime_mpa}")

    # Generate clauses
    th_clause, en_clause = typhoon_client.generate_spec(
        project_name=project.project_name,
        element_type=project.element_type,
        fc_mpa=chosen_option.target_fc_mpa,
        age_days=chosen_option.acceptance_age_days,
        scm_name=chosen_option.name,
        scm_pct=chosen_option.scm_replacement_percent,
        wb_ratio=chosen_option.max_wb_ratio,
        curing_days=guardrail.mandatory_curing_days,
        standards_context=standards
    )

    # Build Compliance Matrix
    matrix = [
        ComplianceItem(
            property_name="Compressive Strength (f'c)",
            original_spec=f">= {project.fc_prime_mpa} MPa @ {project.test_age_days} Days",
            proposed_spec=f">= {chosen_option.target_fc_mpa} MPa @ {chosen_option.acceptance_age_days} Days",
            standard_reference="วสท. 1014 / ACI 318-19",
            justification=f"คงกำลังอัดตามเกณฑ์วิศวกรรมโครงสร้าง ({chosen_option.notes})"
        ),
        ComplianceItem(
            property_name="Cementitious Binder",
            original_spec="Ordinary Portland Cement Type 1",
            proposed_spec=chosen_option.binder_description,
            standard_reference="มอก. 2594 / มอก. 2135 / ASTM C618",
            justification=f"ลด Embodied Carbon ลง {chosen_option.carbon_reduction_percent}% โดยไม่ลดทอนความทนทาน"
        ),
        ComplianceItem(
            property_name="Curing Requirement",
            original_spec="บ่มชื้นอย่างน้อย 3-5 วัน",
            proposed_spec=f"บ่มชื้นต่อเนื่องไม่น้อยกว่า {guardrail.mandatory_curing_days} วัน",
            standard_reference="วสท. 1014 / ACI 308R",
            justification="จำเป็นเพื่อให้ปฏิกิริยาไฮเดรชันและปอซโซลานเกิดอย่างสมบูรณ์ ป้องกันการแตกร้าวจากการหดตัว"
        )
    ]

    # Submittal Checklist
    checklist = [
        "ผลการทดสอบการออกแบบส่วนผสมจริงในห้องปฏิบัติการ (Trial Mix Test Reports) ไม่น้อยกว่า 35 วันก่อนเทจริง",
        "ใบรับรองผลทดสอบคุณภาพวัสดุจากโรงงานผู้ผลิต (Mill Certificate) ตาม มอก. 2135 ชั้น F / มอก. 2594",
        f"แผนการบ่มคอนกรีต (Curing Plan) ระบุวิธีการบ่มชื้นต่อเนื่องอย่างน้อย {guardrail.mandatory_curing_days} วัน"
    ]
    if guardrail.thermal_control_plan_required:
        checklist.append("แผนการควบคุมอุณหภูมิ (Thermal Control Plan) สำหรับ Mass Concrete: ควบคุมผลต่างอุณหภูมิ Delta T <= 20 deg C")
    if guardrail.early_strength_required:
        checklist.append("ผลทดสอบกำลังอัดต้นที่ 3 วัน และ 7 วัน (Early-age Strength) เพื่อยืนยันความปลอดภัยก่อนถอดแบบ/ดึงลวด")

    return TechnicalPackage(
        spec_clause_th=th_clause,
        spec_clause_en=en_clause,
        compliance_matrix=matrix,
        submittal_checklist=checklist
    )
