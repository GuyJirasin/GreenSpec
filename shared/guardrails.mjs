/**
 * Civil Engineering Safety Guardrails (TypeScript / ESM)
 * Enforces structural safety, thermal cracking prevention, and SCM limits.
 */

export function evaluateGuardrail({
  elementType = "beam_slab",
  volumeM3 = 100.0,
  fcPrimeMpa = 35.0,
  testAgeDays = 28,
  slumpCm = 12.0,
  exposureClass = "normal",
  notes = ""
} = {}) {
  const notesLower = (notes || "").toLowerCase();
  const isMat = elementType === "mat_foundation" || notesLower.includes("mass") || notesLower.includes("หนา") || volumeM3 >= 500.0;
  const isPt = elementType === "pt_slab" || elementType === "post_tension" || notesLower.includes("post-tension") || notesLower.includes("ดึงลวด");
  const isColumn = elementType === "column" || elementType === "เสา";

  let maxScmPercent = 35.0;
  let mandatoryCuringDays = 7;
  let recommendedTestAgeDays = testAgeDays;
  let thermalControlPlanRequired = false;
  let earlyStrengthRequired = false;
  const warnings = [];

  if (isMat) {
    thermalControlPlanRequired = true;
    maxScmPercent = 40.0;
    mandatoryCuringDays = 14;
    recommendedTestAgeDays = Math.max(testAgeDays, 56);
    warnings.push("คอนกรีตมวลหนา (Mass Concrete): ต้องควบคุมความต่างอุณหภูมิ Delta T <= 20 deg C และขยายอายุตรวจรับเป็น 56 วัน");
  }

  if (isPt) {
    earlyStrengthRequired = true;
    maxScmPercent = Math.min(maxScmPercent, 20.0);
    warnings.push("โครงสร้างพื้นดึงลวด (Post-Tensioned): จำกัด SCM ไม่เกิน 20% เพื่อรักษา Early Strength f'ci >= 18 MPa ที่ 3-7 วัน");
  }

  if (isColumn && fcPrimeMpa >= 40.0) {
    maxScmPercent = Math.min(maxScmPercent, 25.0);
    warnings.push("เสาอาคารกำลังอัดสูง: จำกัด SCM ไม่เกิน 25% เพื่อรักษาค่า Elastic Modulus และลดการคืบ (Creep)");
  }

  if (exposureClass === "marine" || notesLower.includes("ทะเล") || notesLower.includes("เค็ม")) {
    mandatoryCuringDays = 14;
    warnings.push("สภาวะแวดล้อมติดทะเล: ต้องใช้อัตราส่วน W/B <= 0.40 และบ่มชื้นอย่างน้อย 14 วัน เพื่อป้องกันการกัดกร่อนจากคลอไรด์");
  }

  return {
    element_type: elementType,
    max_scm_percent: maxScmPercent,
    mandatory_curing_days: mandatoryCuringDays,
    recommended_test_age_days: recommendedTestAgeDays,
    thermal_control_plan_required: thermalControlPlanRequired,
    early_strength_required: earlyStrengthRequired,
    engineering_warnings: warnings
  };
}
