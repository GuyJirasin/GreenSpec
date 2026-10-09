from greenspec_core.types import ProjectInput, GuardrailResult

def evaluate_guardrail(project: ProjectInput) -> GuardrailResult:
    elem = project.element_type.lower()
    fc = project.fc_prime_mpa
    notes = (project.notes or "").lower()

    is_mass_concrete = "mat" in elem or "footing" in elem or "mass" in notes or "1." in notes or "2." in notes
    is_pt = "pt" in elem or "post" in elem or "tension" in notes
    is_column = "column" in elem or "wall" in elem or "shear" in elem

    if is_mass_concrete:
        return GuardrailResult(
            element_type=project.element_type,
            status="Pass",
            risk_rating="Low",
            max_scm_percent=40.0,
            recommended_binder="TIS_2594_Hydraulic_With_FlyAsh",
            allowed_scms=["TIS_2135_FlyAsh_Class_F", "ASTM_C989_Slag"],
            early_strength_required=False,
            recommended_test_age_days=56,
            mandatory_curing_days=14,
            thermal_control_plan_required=True,
            reasons=[
                "ACI 207 / วสท. 1014: องค์อาคารมีความหนา เข้าเกณฑ์ Mass Concrete เสี่ยงต่อ Thermal Cracking",
                "แนะนำการใช้ SCM สูง (25-40%) เพื่อลด Heat of Hydration และควบคุมผลต่างอุณหภูมิ delta T <= 20 deg C",
                "อนุญาตให้ใช้เกณฑ์กำลังอัดที่อายุ 56 วัน (f'c,56) เป็นเกณฑ์ตรวจรับงานเพื่อรองรับการพัฒนากำลังระยะยาว"
            ]
        )

    if is_pt:
        return GuardrailResult(
            element_type=project.element_type,
            status="Needs Review",
            risk_rating="Medium",
            max_scm_percent=20.0,
            recommended_binder="TIS_2594_Hydraulic",
            allowed_scms=["TIS_2135_FlyAsh_Class_F"],
            early_strength_required=True,
            recommended_test_age_days=28,
            mandatory_curing_days=7,
            thermal_control_plan_required=False,
            reasons=[
                "ACI 318 / วสท. 1014: โครงสร้างคอนกรีตอัดแรง (Post-Tensioned) ต้องการ Early-age strength สำหรับดึงลวด (Tendon Stressing)",
                "จำกัดสัดส่วนเถ้าลอย (Fly Ash) ไม่เกิน 20% เพื่อป้องกันกำลังอัดช่วง 3-7 วันขึ้นช้า",
                "ต้องระบุกำลังอัดขั้นต่ำก่อนดึงลวด (มักต้องการ f'c >= 18-24 MPa) ในข้อกำหนด TOR ชัดเจน"
            ]
        )

    if is_column:
        max_scm = 20.0 if fc >= 45.0 else 25.0
        return GuardrailResult(
            element_type=project.element_type,
            status="Pass",
            risk_rating="Low",
            max_scm_percent=max_scm,
            recommended_binder="TIS_2594_Hydraulic",
            allowed_scms=["TIS_2135_FlyAsh_Class_F", "ASTM_C989_Slag"],
            early_strength_required=True,
            recommended_test_age_days=28,
            mandatory_curing_days=7,
            thermal_control_plan_required=False,
            reasons=[
                "เสาและผนังรับแรงเฉือนต้องรับแรงอัดแกนสูงและต้องการ Modulus of Elasticity (Ec) สูง",
                "แนะนำปูนซีเมนต์ไฮดรอลิก มอก. 2594 หรือใช้เถ้าลอยไม่เกิน 20-25% ควบคุม W/B <= 0.38",
                "ต้องใช้สารลดน้ำยิ่งยวด (Superplasticizer) เพื่อคงค่ายุบตัวโดยไม่เพิ่มปริมาณน้ำ"
            ]
        )

    # Normal Beam / Slab / Wall / Pile
    return GuardrailResult(
        element_type=project.element_type,
        status="Pass",
        risk_rating="Low",
        max_scm_percent=30.0,
        recommended_binder="TIS_2594_Hydraulic_With_FlyAsh",
        allowed_scms=["TIS_2135_FlyAsh_Class_F", "ASTM_C989_Slag"],
        early_strength_required=False,
        recommended_test_age_days=28,
        mandatory_curing_days=7,
        thermal_control_plan_required=False,
        reasons=[
            "คอนกรีตโครงสร้างทั่วไป (คาน-พื้น) สามารถแทนที่ด้วยปูนไฮดรอลิก มอก. 2594 หรือเถ้าลอย 20-30% ได้อย่างปลอดภัย",
            "ต้องมีการบ่มชื้นต่อเนื่อง (Moist Curing) อย่างน้อย 7 วัน เพื่อให้ปฏิกิริยาปอซโซลานเกิดสมบูรณ์"
        ]
    )
