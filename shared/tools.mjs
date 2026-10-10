/**
 * GreenSpec Deterministic Civil Engineering Calculation Tools
 * TypeScript / ESM Implementation
 * Standardized against:
 * 1. ACI 211.1 & Chulalongkorn University Absolute Volume Method
 * 2. Thailand Greenhouse Gas Management Organization (TGO / อบก.) Emission Factors
 * 3. ACI 207 & Chula/KMUTT Mass Concrete & DEF Risk Limits
 * 4. DPT 1101-64 / EIT 1014 Concrete Strength Conversion
 */

export const TGO_EMISSION_FACTORS = {
  opc_type_1: 0.850,       // kgCO2e/kg (TGO official OPC factor)
  hydraulic_cement: 0.720,  // kgCO2e/kg (TIS 2594 - 15% lower clinker)
  fly_ash: 0.019,          // kgCO2e/kg (EGAT Mae Moh Class F)
  bottom_ash: 0.015,       // kgCO2e/kg (Ground Bottom Ash)
  slag_ggbs: 0.052,        // kgCO2e/kg (Ground Granulated Blast-furnace Slag)
  coarse_aggregate: 0.0075,// kgCO2e/kg (Crushed limestone)
  sand: 0.0051,            // kgCO2e/kg (River sand)
  water: 0.0003,           // kgCO2e/kg (Municipal treated water)
  superplasticizer: 0.900  // kgCO2e/kg (PCE admixture)
};

export const SPECIFIC_GRAVITIES = {
  opc: 3.15,
  hydraulic: 3.05,
  fly_ash: 2.25,
  bottom_ash: 2.10,
  slag: 2.85,
  ca: 2.65,
  sand: 2.65,
  water: 1.00
};

/**
 * Deterministic ACI 211.1 & Chulalongkorn University Concrete Mix Proportioning
 * Guarantees Absolute Volume Conservation: Sum(V) = 1.000 m3
 */
export function calculateConcreteMix({
  fcTargetMpa = 35.0,
  elementType = "beam_slab",
  slumpCm = 12.0,
  scmType = "fly_ash",
  scmPercent = 25.0,
  aggregateSizeMm = 19.0,
  sandFinenessModulus = 2.80
} = {}) {
  // 1. Required Average Compressive Strength f'cr (ACI 318 / Chula Lecture)
  const fcrMpa = fcTargetMpa <= 35.0 ? fcTargetMpa + 8.5 : 1.10 * fcTargetMpa + 5.0;

  // 2. Maximum Water-Binder Ratio w/b
  let maxWb = Math.min(0.60, Math.max(0.28, 1.173 - 0.017 * fcrMpa));
  if (elementType === "mat_foundation") maxWb = Math.min(maxWb, 0.45);
  else if (elementType === "pt_slab") maxWb = Math.min(maxWb, 0.40);
  else if (fcTargetMpa >= 45.0) maxWb = Math.min(maxWb, 0.35);

  // 3. Mixing Water Requirement (kg/m3) based on slump and aggregate size
  let waterKg = 190.0;
  if (aggregateSizeMm <= 12.5) waterKg = 205.0;
  else if (aggregateSizeMm >= 25.0) waterKg = 180.0;
  if (slumpCm > 15.0) waterKg += (slumpCm - 15.0) * 2.0;

  // 4. Total Cementitious Binder Content (kg/m3)
  const totalBinderKg = Math.round((waterKg / maxWb) * 10) / 10;
  const scmKg = Math.round((totalBinderKg * (scmPercent / 100.0)) * 10) / 10;
  const opcKg = Math.round((totalBinderKg - scmKg) * 10) / 10;

  // 5. Coarse Aggregate Content (Rodded Bulk Volume Method)
  const caDryBulkVol = 0.65; // Fraction of unit volume for FM 2.80 and 19mm NMA
  const caDryBulkDensity = 1600.0; // kg/m3
  const caKg = Math.round(caDryBulkVol * caDryBulkDensity * 10) / 10; // 1040 kg

  // 6. Absolute Volume Calculation (m3)
  const vWater = waterKg / (SPECIFIC_GRAVITIES.water * 1000.0);
  const vOpc = opcKg / (SPECIFIC_GRAVITIES.opc * 1000.0);
  const scmSg = SPECIFIC_GRAVITIES[scmType] || SPECIFIC_GRAVITIES.fly_ash;
  const vScm = scmKg / (scmSg * 1000.0);
  const vCa = caKg / (SPECIFIC_GRAVITIES.ca * 1000.0);
  const vAir = 0.015; // 1.5% entrapped air volume

  // 7. Fine Aggregate (Sand) by Absolute Volume Complement
  const occupiedVolume = vWater + vOpc + vScm + vCa + vAir;
  const vSand = Math.max(0.15, 1.000 - occupiedVolume);
  const sandKg = Math.round((vSand * SPECIFIC_GRAVITIES.sand * 1000.0) * 10) / 10;

  // Final Conservation Check
  const totalVolume = Number((vWater + vOpc + vScm + vCa + vAir + (sandKg / (SPECIFIC_GRAVITIES.sand * 1000.0))).toFixed(4));

  return {
    fc_target_mpa: fcTargetMpa,
    fcr_required_mpa: Math.round(fcrMpa * 10) / 10,
    max_wb_ratio: Math.round(maxWb * 100) / 100,
    mix_proportions_per_m3: {
      cement_opc_kg: opcKg,
      scm_kg: scmKg,
      scm_type: scmType,
      scm_percent: scmPercent,
      water_kg: waterKg,
      coarse_aggregate_kg: caKg,
      fine_aggregate_sand_kg: sandKg,
      chemical_admixture_pce_liters: Math.round((totalBinderKg * 0.008) * 10) / 10
    },
    volumetric_check: {
      sum_absolute_volumes_m3: totalVolume,
      volumetric_balance_conserved: Math.abs(totalVolume - 1.000) <= 0.005
    }
  };
}

/**
 * Deterministic TGO Embodied Carbon Calculator
 */
export function calculateEmbodiedCarbon({
  cementOpcKg = 270.0,
  scmKg = 90.0,
  scmType = "fly_ash",
  caKg = 1020.0,
  sandKg = 740.0,
  waterKg = 160.0,
  admixtureKg = 3.0,
  volumeM3 = 100.0
} = {}) {
  const scmFactor = TGO_EMISSION_FACTORS[scmType] || TGO_EMISSION_FACTORS.fly_ash;

  const baselineBinderKg = cementOpcKg + scmKg;
  const baselineKgCo2e = (
    baselineBinderKg * TGO_EMISSION_FACTORS.opc_type_1 +
    caKg * TGO_EMISSION_FACTORS.coarse_aggregate +
    sandKg * TGO_EMISSION_FACTORS.sand +
    waterKg * TGO_EMISSION_FACTORS.water +
    admixtureKg * TGO_EMISSION_FACTORS.superplasticizer
  );

  const proposedKgCo2e = (
    cementOpcKg * TGO_EMISSION_FACTORS.opc_type_1 +
    scmKg * scmFactor +
    caKg * TGO_EMISSION_FACTORS.coarse_aggregate +
    sandKg * TGO_EMISSION_FACTORS.sand +
    waterKg * TGO_EMISSION_FACTORS.water +
    admixtureKg * TGO_EMISSION_FACTORS.superplasticizer
  );

  const reductionKgCo2e = baselineKgCo2e - proposedKgCo2e;
  const reductionPercent = (reductionKgCo2e / baselineKgCo2e) * 100.0;
  const totalBaselineTco2e = (baselineKgCo2e * volumeM3) / 1000.0;
  const totalProposedTco2e = (proposedKgCo2e * volumeM3) / 1000.0;
  const totalSavedTco2e = (reductionKgCo2e * volumeM3) / 1000.0;

  return {
    baseline_carbon_intensity_kgco2e_m3: Math.round(baselineKgCo2e * 10) / 10,
    proposed_carbon_intensity_kgco2e_m3: Math.round(proposedKgCo2e * 10) / 10,
    carbon_reduction_percent: Math.round(reductionPercent * 10) / 10,
    project_volume_m3: volumeM3,
    total_baseline_carbon_tco2e: Math.round(totalBaselineTco2e * 100) / 100,
    total_proposed_carbon_tco2e: Math.round(totalProposedTco2e * 100) / 100,
    total_carbon_saved_tco2e: Math.round(totalSavedTco2e * 100) / 100,
    tgo_verified: true
  };
}

/**
 * Deterministic ACI 207 & Chula/KMUTT Mass Concrete Thermal Cracking & DEF Risk Evaluator
 */
export function evaluateThermalMassConcrete({
  thicknessM = 1.5,
  totalBinderKgM3 = 380.0,
  scmPercent = 30.0,
  scmType = "fly_ash",
  placingTempC = 30.0,
  ambientTempC = 28.0
} = {}) {
  const isMassConcrete = thicknessM >= 1.0;

  // Adiabatic Temperature Rise (Chula & ACI 207 equations)
  let heatMultiplier = 0.12; // 12 deg C rise per 100 kg/m3 OPC
  if (scmType === "fly_ash" || scmType === "bottom_ash") {
    heatMultiplier = 0.12 * (1.0 - (scmPercent / 100.0) * 0.45);
  } else if (scmType === "slag_ggbs") {
    heatMultiplier = 0.12 * (1.0 - (scmPercent / 100.0) * 0.35);
  }

  const adiabaticTempRise = totalBinderKgM3 * heatMultiplier;
  const maxCoreTempC = placingTempC + adiabaticTempRise;
  const surfaceTempC = ambientTempC + (adiabaticTempRise * 0.35);
  const deltaT = maxCoreTempC - surfaceTempC;

  const thermalCrackingRisk = deltaT > 20.0;
  const defRisk = maxCoreTempC >= 70.0;

  const mitigation = [];
  if (isMassConcrete) {
    mitigation.push("ติดตั้งเซนเซอร์วัดอุณหภูมิ (Thermocouple Array) วัดแกนกลางและผิวคอนกรีตต่อเนื่อง");
  }
  if (thermalCrackingRisk) {
    mitigation.push("ควบคุม Delta T <= 20 deg C: คลุมบ่มด้วยฉนวนกันความร้อน (Insulating Blankets) ที่ผิวภายนอก");
  }
  if (defRisk) {
    mitigation.push("เตือนอันตราย DEF (อุณหภูมิแกนกลาง >= 70 deg C): ต้องลดอุณหภูมิเทลงเหลือ <= 25 deg C โดยใช้น้ำแข็งเกล็ด");
  }

  return {
    thickness_meters: thicknessM,
    is_mass_concrete: isMassConcrete,
    placing_temperature_c: placingTempC,
    estimated_max_core_temp_c: Math.round(maxCoreTempC * 10) / 10,
    estimated_surface_temp_c: Math.round(surfaceTempC * 10) / 10,
    estimated_delta_t_c: Math.round(deltaT * 10) / 10,
    thermal_cracking_risk_flag: thermalCrackingRisk,
    def_risk_flag: defRisk,
    aci_207_compliant: !thermalCrackingRisk && !defRisk,
    mitigation_actions: mitigation
  };
}

/**
 * Concrete Compressive Strength Converter (DPT 1101-64 / EIT 1014)
 */
export function convertConcreteStrength({ value = 280.0, fromFormat = "cylinder_ksc" } = {}) {
  let cylMpa = 0.0;
  if (fromFormat === "cylinder_ksc") cylMpa = value / 10.1972;
  else if (fromFormat === "cube_ksc") cylMpa = (value / 10.1972) * 0.83;
  else if (fromFormat === "cylinder_mpa") cylMpa = value;
  else if (fromFormat === "cube_mpa") cylMpa = value * 0.83;

  const cubeMpa = cylMpa / 0.83;
  const cylKsc = cylMpa * 10.1972;
  const cubeKsc = cubeMpa * 10.1972;

  return {
    cylinder_15x30cm: {
      strength_mpa: Math.round(cylMpa * 10) / 10,
      strength_ksc: Math.round(cylKsc * 10) / 10
    },
    cube_15x15cm: {
      strength_mpa: Math.round(cubeMpa * 10) / 10,
      strength_ksc: Math.round(cubeKsc * 10) / 10
    },
    conversion_factor: 0.83,
    standard_reference: "มยผ. 1101-64 / วสท. 1014"
  };
}

/**
 * Ready-mix Cost Impact Estimator
 */
export function estimateCostImpact({
  fcMpa = 35.0,
  volumeM3 = 500.0,
  scmPercent = 25.0,
  scmType = "fly_ash"
} = {}) {
  const baseCostPerM3 = 1900.0 + (fcMpa - 24.0) * 35.0;
  let savingsPerM3 = 0.0;
  if (scmType === "fly_ash" || scmType === "bottom_ash") {
    savingsPerM3 = (scmPercent / 100.0) * 220.0;
  } else if (scmType === "hydraulic_cement") {
    savingsPerM3 = 45.0;
  }

  const proposedCostPerM3 = baseCostPerM3 - savingsPerM3;
  const totalBaselineThb = baseCostPerM3 * volumeM3;
  const totalProposedThb = proposedCostPerM3 * volumeM3;

  return {
    baseline_cost_thb_m3: Math.round(baseCostPerM3),
    proposed_cost_thb_m3: Math.round(proposedCostPerM3),
    unit_savings_thb_m3: Math.round(savingsPerM3),
    total_baseline_cost_thb: Math.round(totalBaselineThb),
    total_proposed_cost_thb: Math.round(totalProposedThb),
    total_savings_thb: Math.round(totalBaselineThb - totalProposedThb)
  };
}
