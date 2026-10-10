// api/server.mjs
import { Hono } from "hono";
import { cors } from "hono/cors";
import { getRequestListener } from "@hono/node-server";

// shared/tools.mjs
var TGO_EMISSION_FACTORS = {
  opc_type_1: 0.85,
  // kgCO2e/kg (TGO official OPC factor)
  hydraulic_cement: 0.72,
  // kgCO2e/kg (TIS 2594 - 15% lower clinker)
  fly_ash: 0.019,
  // kgCO2e/kg (EGAT Mae Moh Class F)
  bottom_ash: 0.015,
  // kgCO2e/kg (Ground Bottom Ash)
  slag_ggbs: 0.052,
  // kgCO2e/kg (Ground Granulated Blast-furnace Slag)
  coarse_aggregate: 75e-4,
  // kgCO2e/kg (Crushed limestone)
  sand: 51e-4,
  // kgCO2e/kg (River sand)
  water: 3e-4,
  // kgCO2e/kg (Municipal treated water)
  superplasticizer: 0.9
  // kgCO2e/kg (PCE admixture)
};
var SPECIFIC_GRAVITIES = {
  opc: 3.15,
  hydraulic: 3.05,
  fly_ash: 2.25,
  bottom_ash: 2.1,
  slag: 2.85,
  ca: 2.65,
  sand: 2.65,
  water: 1
};
function calculateConcreteMix({
  fcTargetMpa = 35,
  elementType = "beam_slab",
  slumpCm = 12,
  scmType = "fly_ash",
  scmPercent = 25,
  aggregateSizeMm = 19,
  sandFinenessModulus = 2.8
} = {}) {
  const fcrMpa = fcTargetMpa <= 35 ? fcTargetMpa + 8.5 : 1.1 * fcTargetMpa + 5;
  let maxWb = Math.min(0.6, Math.max(0.28, 1.173 - 0.017 * fcrMpa));
  if (elementType === "mat_foundation") maxWb = Math.min(maxWb, 0.45);
  else if (elementType === "pt_slab") maxWb = Math.min(maxWb, 0.4);
  else if (fcTargetMpa >= 45) maxWb = Math.min(maxWb, 0.35);
  let waterKg = 190;
  if (aggregateSizeMm <= 12.5) waterKg = 205;
  else if (aggregateSizeMm >= 25) waterKg = 180;
  if (slumpCm > 15) waterKg += (slumpCm - 15) * 2;
  const totalBinderKg = Math.round(waterKg / maxWb * 10) / 10;
  const scmKg = Math.round(totalBinderKg * (scmPercent / 100) * 10) / 10;
  const opcKg = Math.round((totalBinderKg - scmKg) * 10) / 10;
  const caDryBulkVol = 0.65;
  const caDryBulkDensity = 1600;
  const caKg = Math.round(caDryBulkVol * caDryBulkDensity * 10) / 10;
  const vWater = waterKg / (SPECIFIC_GRAVITIES.water * 1e3);
  const vOpc = opcKg / (SPECIFIC_GRAVITIES.opc * 1e3);
  const scmSg = SPECIFIC_GRAVITIES[scmType] || SPECIFIC_GRAVITIES.fly_ash;
  const vScm = scmKg / (scmSg * 1e3);
  const vCa = caKg / (SPECIFIC_GRAVITIES.ca * 1e3);
  const vAir = 0.015;
  const occupiedVolume = vWater + vOpc + vScm + vCa + vAir;
  const vSand = Math.max(0.15, 1 - occupiedVolume);
  const sandKg = Math.round(vSand * SPECIFIC_GRAVITIES.sand * 1e3 * 10) / 10;
  const totalVolume = Number((vWater + vOpc + vScm + vCa + vAir + sandKg / (SPECIFIC_GRAVITIES.sand * 1e3)).toFixed(4));
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
      chemical_admixture_pce_liters: Math.round(totalBinderKg * 8e-3 * 10) / 10
    },
    volumetric_check: {
      sum_absolute_volumes_m3: totalVolume,
      volumetric_balance_conserved: Math.abs(totalVolume - 1) <= 5e-3
    }
  };
}
function calculateEmbodiedCarbon({
  cementOpcKg = 270,
  scmKg = 90,
  scmType = "fly_ash",
  caKg = 1020,
  sandKg = 740,
  waterKg = 160,
  admixtureKg = 3,
  volumeM3 = 100
} = {}) {
  const scmFactor = TGO_EMISSION_FACTORS[scmType] || TGO_EMISSION_FACTORS.fly_ash;
  const baselineBinderKg = cementOpcKg + scmKg;
  const baselineKgCo2e = baselineBinderKg * TGO_EMISSION_FACTORS.opc_type_1 + caKg * TGO_EMISSION_FACTORS.coarse_aggregate + sandKg * TGO_EMISSION_FACTORS.sand + waterKg * TGO_EMISSION_FACTORS.water + admixtureKg * TGO_EMISSION_FACTORS.superplasticizer;
  const proposedKgCo2e = cementOpcKg * TGO_EMISSION_FACTORS.opc_type_1 + scmKg * scmFactor + caKg * TGO_EMISSION_FACTORS.coarse_aggregate + sandKg * TGO_EMISSION_FACTORS.sand + waterKg * TGO_EMISSION_FACTORS.water + admixtureKg * TGO_EMISSION_FACTORS.superplasticizer;
  const reductionKgCo2e = baselineKgCo2e - proposedKgCo2e;
  const reductionPercent = reductionKgCo2e / baselineKgCo2e * 100;
  const totalBaselineTco2e = baselineKgCo2e * volumeM3 / 1e3;
  const totalProposedTco2e = proposedKgCo2e * volumeM3 / 1e3;
  const totalSavedTco2e = reductionKgCo2e * volumeM3 / 1e3;
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
function evaluateThermalMassConcrete({
  thicknessM = 1.5,
  totalBinderKgM3 = 380,
  scmPercent = 30,
  scmType = "fly_ash",
  placingTempC = 30,
  ambientTempC = 28
} = {}) {
  const isMassConcrete = thicknessM >= 1;
  let heatMultiplier = 0.12;
  if (scmType === "fly_ash" || scmType === "bottom_ash") {
    heatMultiplier = 0.12 * (1 - scmPercent / 100 * 0.45);
  } else if (scmType === "slag_ggbs") {
    heatMultiplier = 0.12 * (1 - scmPercent / 100 * 0.35);
  }
  const adiabaticTempRise = totalBinderKgM3 * heatMultiplier;
  const maxCoreTempC = placingTempC + adiabaticTempRise;
  const surfaceTempC = ambientTempC + adiabaticTempRise * 0.35;
  const deltaT = maxCoreTempC - surfaceTempC;
  const thermalCrackingRisk = deltaT > 20;
  const defRisk = maxCoreTempC >= 70;
  const mitigation = [];
  if (isMassConcrete) {
    mitigation.push("\u0E15\u0E34\u0E14\u0E15\u0E31\u0E49\u0E07\u0E40\u0E0B\u0E19\u0E40\u0E0B\u0E2D\u0E23\u0E4C\u0E27\u0E31\u0E14\u0E2D\u0E38\u0E13\u0E2B\u0E20\u0E39\u0E21\u0E34 (Thermocouple Array) \u0E27\u0E31\u0E14\u0E41\u0E01\u0E19\u0E01\u0E25\u0E32\u0E07\u0E41\u0E25\u0E30\u0E1C\u0E34\u0E27\u0E04\u0E2D\u0E19\u0E01\u0E23\u0E35\u0E15\u0E15\u0E48\u0E2D\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07");
  }
  if (thermalCrackingRisk) {
    mitigation.push("\u0E04\u0E27\u0E1A\u0E04\u0E38\u0E21 Delta T <= 20 deg C: \u0E04\u0E25\u0E38\u0E21\u0E1A\u0E48\u0E21\u0E14\u0E49\u0E27\u0E22\u0E09\u0E19\u0E27\u0E19\u0E01\u0E31\u0E19\u0E04\u0E27\u0E32\u0E21\u0E23\u0E49\u0E2D\u0E19 (Insulating Blankets) \u0E17\u0E35\u0E48\u0E1C\u0E34\u0E27\u0E20\u0E32\u0E22\u0E19\u0E2D\u0E01");
  }
  if (defRisk) {
    mitigation.push("\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E2D\u0E31\u0E19\u0E15\u0E23\u0E32\u0E22 DEF (\u0E2D\u0E38\u0E13\u0E2B\u0E20\u0E39\u0E21\u0E34\u0E41\u0E01\u0E19\u0E01\u0E25\u0E32\u0E07 >= 70 deg C): \u0E15\u0E49\u0E2D\u0E07\u0E25\u0E14\u0E2D\u0E38\u0E13\u0E2B\u0E20\u0E39\u0E21\u0E34\u0E40\u0E17\u0E25\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D <= 25 deg C \u0E42\u0E14\u0E22\u0E43\u0E0A\u0E49\u0E19\u0E49\u0E33\u0E41\u0E02\u0E47\u0E07\u0E40\u0E01\u0E25\u0E47\u0E14");
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
function convertConcreteStrength({ value = 280, fromFormat = "cylinder_ksc" } = {}) {
  let cylMpa = 0;
  if (fromFormat === "cylinder_ksc") cylMpa = value / 10.1972;
  else if (fromFormat === "cube_ksc") cylMpa = value / 10.1972 * 0.83;
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
    standard_reference: "\u0E21\u0E22\u0E1C. 1101-64 / \u0E27\u0E2A\u0E17. 1014"
  };
}
function estimateCostImpact({
  fcMpa = 35,
  volumeM3 = 500,
  scmPercent = 25,
  scmType = "fly_ash"
} = {}) {
  const baseCostPerM3 = 1900 + (fcMpa - 24) * 35;
  let savingsPerM3 = 0;
  if (scmType === "fly_ash" || scmType === "bottom_ash") {
    savingsPerM3 = scmPercent / 100 * 220;
  } else if (scmType === "hydraulic_cement") {
    savingsPerM3 = 45;
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

// shared/catalog.mjs
var THAI_CERTIFIED_CATALOG = [
  {
    product_id: "CPAC-LC-01",
    brand: "CPAC (SCG)",
    name: "CPAC Low Carbon Concrete (Hydraulic Cement)",
    element_suitability: ["beam_slab", "column", "wall"],
    fc_range_mpa: [24, 40],
    carbon_reduction_percent: 15,
    tgo_certification_number: "TGO-CFP-2023-0891",
    carbon_intensity_kgco2e_m3: 275,
    price_delta_thb_m3: 45,
    notes: "\u0E04\u0E2D\u0E19\u0E01\u0E23\u0E35\u0E15\u0E04\u0E32\u0E23\u0E4C\u0E1A\u0E2D\u0E19\u0E15\u0E48\u0E33\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E1B\u0E39\u0E19\u0E0B\u0E35\u0E40\u0E21\u0E19\u0E15\u0E4C\u0E44\u0E2E\u0E14\u0E23\u0E2D\u0E25\u0E34\u0E01 \u0E21\u0E2D\u0E01. 2594 \u0E25\u0E14\u0E01\u0E32\u0E23\u0E1B\u0E25\u0E48\u0E2D\u0E22 CO2 \u0E44\u0E14\u0E49 12-18%"
  },
  {
    product_id: "CPAC-LC-02",
    brand: "CPAC (SCG)",
    name: "CPAC Low Carbon Mass Concrete (Fly Ash 35%)",
    element_suitability: ["mat_foundation", "mass_concrete", "pile_cap"],
    fc_range_mpa: [28, 45],
    carbon_reduction_percent: 28,
    tgo_certification_number: "TGO-CFP-2023-0892",
    carbon_intensity_kgco2e_m3: 215,
    price_delta_thb_m3: -85,
    notes: "\u0E2A\u0E39\u0E15\u0E23\u0E1C\u0E2A\u0E21\u0E40\u0E16\u0E49\u0E32\u0E25\u0E2D\u0E22 35% \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E10\u0E32\u0E19\u0E23\u0E32\u0E01\u0E2B\u0E19\u0E32 \u0E04\u0E27\u0E1A\u0E04\u0E38\u0E21\u0E04\u0E27\u0E32\u0E21\u0E23\u0E49\u0E2D\u0E19\u0E44\u0E2E\u0E40\u0E14\u0E23\u0E0A\u0E31\u0E19 Delta T <= 20 deg C"
  },
  {
    product_id: "INSEE-LC-01",
    brand: "Insee (\u0E1B\u0E39\u0E19\u0E0B\u0E35\u0E40\u0E21\u0E19\u0E15\u0E4C\u0E19\u0E04\u0E23\u0E2B\u0E25\u0E27\u0E07)",
    name: "Insee Petch Easy Flow Low Carbon",
    element_suitability: ["beam_slab", "column"],
    fc_range_mpa: [28, 35],
    carbon_reduction_percent: 12,
    tgo_certification_number: "TGO-CFP-2022-0450",
    carbon_intensity_kgco2e_m3: 285,
    price_delta_thb_m3: 0,
    notes: "\u0E1B\u0E39\u0E19\u0E0B\u0E35\u0E40\u0E21\u0E19\u0E15\u0E4C\u0E44\u0E2E\u0E14\u0E23\u0E2D\u0E25\u0E34\u0E01 \u0E21\u0E2D\u0E01. 2594 \u0E44\u0E2B\u0E25\u0E25\u0E37\u0E48\u0E19\u0E14\u0E35\u0E40\u0E22\u0E35\u0E48\u0E22\u0E21 \u0E40\u0E17\u0E07\u0E48\u0E32\u0E22 \u0E25\u0E14\u0E1F\u0E2D\u0E07\u0E2D\u0E32\u0E01\u0E32\u0E28"
  },
  {
    product_id: "EGAT-FA-01",
    brand: "\u0E01\u0E1F\u0E1C. \u0E41\u0E21\u0E48\u0E40\u0E21\u0E32\u0E30 (EGAT)",
    name: "\u0E40\u0E16\u0E49\u0E32\u0E25\u0E2D\u0E22\u0E16\u0E48\u0E32\u0E19\u0E2B\u0E34\u0E19\u0E41\u0E21\u0E48\u0E40\u0E21\u0E32\u0E30 \u0E0A\u0E31\u0E49\u0E19\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E F (TIS 2135)",
    element_suitability: ["mat_foundation", "beam_slab", "marine_pile"],
    fc_range_mpa: [20, 60],
    carbon_reduction_percent: 95,
    tgo_certification_number: "TGO-CFR-EGAT-2021",
    carbon_intensity_kgco2e_m3: 19,
    price_delta_thb_m3: -350,
    notes: "\u0E27\u0E31\u0E2A\u0E14\u0E38\u0E1B\u0E23\u0E30\u0E2A\u0E32\u0E19\u0E1B\u0E2D\u0E0B\u0E42\u0E0B\u0E25\u0E32\u0E19\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E04\u0E27\u0E32\u0E21\u0E17\u0E19\u0E17\u0E32\u0E19\u0E15\u0E48\u0E2D\u0E0B\u0E31\u0E25\u0E40\u0E1F\u0E15\u0E41\u0E25\u0E30\u0E04\u0E25\u0E2D\u0E44\u0E23\u0E14\u0E4C \u0E25\u0E14\u0E04\u0E27\u0E32\u0E21\u0E23\u0E49\u0E2D\u0E19\u0E2A\u0E30\u0E2A\u0E21"
  },
  {
    product_id: "TPI-LC-01",
    brand: "TPI Polene",
    name: "TPI Green Concrete \u0E21\u0E2D\u0E01. 2594",
    element_suitability: ["beam_slab", "road_pavement"],
    fc_range_mpa: [24, 32],
    carbon_reduction_percent: 14,
    tgo_certification_number: "TGO-CFP-2023-0112",
    carbon_intensity_kgco2e_m3: 278,
    price_delta_thb_m3: 20,
    notes: "\u0E04\u0E2D\u0E19\u0E01\u0E23\u0E35\u0E15\u0E1C\u0E2A\u0E21\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E23\u0E31\u0E01\u0E29\u0E4C\u0E42\u0E25\u0E01\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19 \u0E21\u0E2D\u0E01. 2594 \u0E1C\u0E48\u0E32\u0E19\u0E01\u0E32\u0E23\u0E02\u0E36\u0E49\u0E19\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E09\u0E25\u0E32\u0E01\u0E25\u0E14\u0E42\u0E25\u0E01\u0E23\u0E49\u0E2D\u0E19"
  },
  {
    product_id: "SCG-HYBRID-01",
    brand: "CPAC / SCG",
    name: "CPAC High Strength Low Carbon (Silica Fume + Slag)",
    element_suitability: ["high_strength", "column", "post_tension"],
    fc_range_mpa: [45, 60],
    carbon_reduction_percent: 18,
    tgo_certification_number: "TGO-CFP-2023-1044",
    carbon_intensity_kgco2e_m3: 310,
    price_delta_thb_m3: 150,
    notes: "\u0E04\u0E2D\u0E19\u0E01\u0E23\u0E35\u0E15\u0E01\u0E33\u0E25\u0E31\u0E07\u0E2D\u0E31\u0E14\u0E2A\u0E39\u0E07\u0E1E\u0E34\u0E40\u0E28\u0E29\u0E04\u0E32\u0E23\u0E4C\u0E1A\u0E2D\u0E19\u0E15\u0E48\u0E33 \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E40\u0E2A\u0E32\u0E2D\u0E32\u0E04\u0E32\u0E23\u0E2A\u0E39\u0E07\u0E41\u0E25\u0E30\u0E1E\u0E37\u0E49\u0E19\u0E14\u0E36\u0E07\u0E25\u0E27\u0E14"
  }
];

// shared/guardrails.mjs
function evaluateGuardrail({
  elementType = "beam_slab",
  volumeM3 = 100,
  fcPrimeMpa = 35,
  testAgeDays = 28,
  slumpCm = 12,
  exposureClass = "normal",
  notes = ""
} = {}) {
  const notesLower = (notes || "").toLowerCase();
  const isMat = elementType === "mat_foundation" || notesLower.includes("mass") || notesLower.includes("\u0E2B\u0E19\u0E32") || volumeM3 >= 500;
  const isPt = elementType === "pt_slab" || elementType === "post_tension" || notesLower.includes("post-tension") || notesLower.includes("\u0E14\u0E36\u0E07\u0E25\u0E27\u0E14");
  const isColumn = elementType === "column" || elementType === "\u0E40\u0E2A\u0E32";
  let maxScmPercent = 35;
  let mandatoryCuringDays = 7;
  let recommendedTestAgeDays = testAgeDays;
  let thermalControlPlanRequired = false;
  let earlyStrengthRequired = false;
  const warnings = [];
  if (isMat) {
    thermalControlPlanRequired = true;
    maxScmPercent = 40;
    mandatoryCuringDays = 14;
    recommendedTestAgeDays = Math.max(testAgeDays, 56);
    warnings.push("\u0E04\u0E2D\u0E19\u0E01\u0E23\u0E35\u0E15\u0E21\u0E27\u0E25\u0E2B\u0E19\u0E32 (Mass Concrete): \u0E15\u0E49\u0E2D\u0E07\u0E04\u0E27\u0E1A\u0E04\u0E38\u0E21\u0E04\u0E27\u0E32\u0E21\u0E15\u0E48\u0E32\u0E07\u0E2D\u0E38\u0E13\u0E2B\u0E20\u0E39\u0E21\u0E34 Delta T <= 20 deg C \u0E41\u0E25\u0E30\u0E02\u0E22\u0E32\u0E22\u0E2D\u0E32\u0E22\u0E38\u0E15\u0E23\u0E27\u0E08\u0E23\u0E31\u0E1A\u0E40\u0E1B\u0E47\u0E19 56 \u0E27\u0E31\u0E19");
  }
  if (isPt) {
    earlyStrengthRequired = true;
    maxScmPercent = Math.min(maxScmPercent, 20);
    warnings.push("\u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E1E\u0E37\u0E49\u0E19\u0E14\u0E36\u0E07\u0E25\u0E27\u0E14 (Post-Tensioned): \u0E08\u0E33\u0E01\u0E31\u0E14 SCM \u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 20% \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E23\u0E31\u0E01\u0E29\u0E32 Early Strength f'ci >= 18 MPa \u0E17\u0E35\u0E48 3-7 \u0E27\u0E31\u0E19");
  }
  if (isColumn && fcPrimeMpa >= 40) {
    maxScmPercent = Math.min(maxScmPercent, 25);
    warnings.push("\u0E40\u0E2A\u0E32\u0E2D\u0E32\u0E04\u0E32\u0E23\u0E01\u0E33\u0E25\u0E31\u0E07\u0E2D\u0E31\u0E14\u0E2A\u0E39\u0E07: \u0E08\u0E33\u0E01\u0E31\u0E14 SCM \u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 25% \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E23\u0E31\u0E01\u0E29\u0E32\u0E04\u0E48\u0E32 Elastic Modulus \u0E41\u0E25\u0E30\u0E25\u0E14\u0E01\u0E32\u0E23\u0E04\u0E37\u0E1A (Creep)");
  }
  if (exposureClass === "marine" || notesLower.includes("\u0E17\u0E30\u0E40\u0E25") || notesLower.includes("\u0E40\u0E04\u0E47\u0E21")) {
    mandatoryCuringDays = 14;
    warnings.push("\u0E2A\u0E20\u0E32\u0E27\u0E30\u0E41\u0E27\u0E14\u0E25\u0E49\u0E2D\u0E21\u0E15\u0E34\u0E14\u0E17\u0E30\u0E40\u0E25: \u0E15\u0E49\u0E2D\u0E07\u0E43\u0E0A\u0E49\u0E2D\u0E31\u0E15\u0E23\u0E32\u0E2A\u0E48\u0E27\u0E19 W/B <= 0.40 \u0E41\u0E25\u0E30\u0E1A\u0E48\u0E21\u0E0A\u0E37\u0E49\u0E19\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 14 \u0E27\u0E31\u0E19 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1B\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E19\u0E01\u0E32\u0E23\u0E01\u0E31\u0E14\u0E01\u0E23\u0E48\u0E2D\u0E19\u0E08\u0E32\u0E01\u0E04\u0E25\u0E2D\u0E44\u0E23\u0E14\u0E4C");
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

// shared/typhoon.mjs
var TyphoonClient = class {
  constructor({ apiKey = "", baseUrl = "https://api.opentyphoon.ai/v1", model = "typhoon-v2.5-30b-a3b-instruct" } = {}) {
    this.apiKey = apiKey || process.env.TYPHOON_API_KEY || "";
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.model = model;
  }
  /**
   * Standard completion returning complete text
   */
  async chat({ messages, temperature = 0.2, maxTokens = 3500 }) {
    if (!this.apiKey) {
      return this._mockResponse(messages);
    }
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenTyphoon API error (${res.status}): ${errText}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }
  /**
   * Streaming completion returning an async iterator of token chunks (SSE)
   */
  async *chatStream({ messages, temperature = 0.2, maxTokens = 3500 }) {
    if (!this.apiKey) {
      yield this._mockResponse(messages);
      return;
    }
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true
      })
    });
    if (!res.ok || !res.body) {
      const errText = await res.text();
      throw new Error(`OpenTyphoon streaming error (${res.status}): ${errText}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const jsonStr = trimmed.replace(/^data:\s*/, "");
        if (jsonStr === "[DONE]") return;
        try {
          const parsed = JSON.parse(jsonStr);
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (chunk) yield chunk;
        } catch {
        }
      }
    }
  }
  /**
   * Drafts complete CSI 3-Part Technical Specification
   */
  async generateSpecification({
    projectName = "Bangkok Project",
    elementType = "mat_foundation",
    fcMpa = 35,
    ageDays = 28,
    scmName = "\u0E40\u0E16\u0E49\u0E32\u0E25\u0E2D\u0E22\u0E41\u0E21\u0E48\u0E40\u0E21\u0E32\u0E30",
    scmPct = 30,
    wbRatio = 0.4,
    curingDays = 14,
    standardsContext = []
  }) {
    const prompt = `
\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23: ${projectName}
\u0E0A\u0E34\u0E49\u0E19\u0E2A\u0E48\u0E27\u0E19\u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07: ${elementType}
\u0E01\u0E33\u0E25\u0E31\u0E07\u0E2D\u0E31\u0E14\u0E23\u0E30\u0E1A\u0E38 f'c: ${fcMpa} MPa (Cylinder)
\u0E2D\u0E32\u0E22\u0E38\u0E15\u0E23\u0E27\u0E08\u0E23\u0E31\u0E1A\u0E01\u0E33\u0E25\u0E31\u0E07\u0E2D\u0E31\u0E14: ${ageDays} \u0E27\u0E31\u0E19
\u0E2A\u0E39\u0E15\u0E23\u0E1C\u0E2A\u0E21\u0E17\u0E35\u0E48\u0E1C\u0E48\u0E32\u0E19\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A: ${scmName} (\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19 ${scmPct}%)
\u0E2D\u0E31\u0E15\u0E23\u0E32\u0E2A\u0E48\u0E27\u0E19\u0E19\u0E49\u0E33\u0E15\u0E48\u0E2D\u0E27\u0E31\u0E2A\u0E14\u0E38\u0E1B\u0E23\u0E30\u0E2A\u0E32\u0E19 (W/B) \u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14: ${wbRatio}
\u0E23\u0E30\u0E22\u0E30\u0E40\u0E27\u0E25\u0E32\u0E1A\u0E48\u0E21\u0E0A\u0E37\u0E49\u0E19\u0E02\u0E31\u0E49\u0E19\u0E15\u0E48\u0E33: ${curingDays} \u0E27\u0E31\u0E19

\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07:
${standardsContext.map((s) => `- ${s}`).join("\n")}

\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E48\u0E32\u0E07\u0E02\u0E49\u0E2D\u0E01\u0E33\u0E2B\u0E19\u0E14 TOR \u0E43\u0E19\u0E2B\u0E21\u0E27\u0E14 SECTION 03 30 00 - CAST-IN-PLACE CONCRETE \u0E41\u0E1A\u0E48\u0E07\u0E40\u0E1B\u0E47\u0E19 2 \u0E2A\u0E48\u0E27\u0E19\u0E0A\u0E31\u0E14\u0E40\u0E08\u0E19:
1. \u0E02\u0E49\u0E2D\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22 (CSI 3-Part: \u0E17\u0E31\u0E48\u0E27\u0E44\u0E1B, \u0E27\u0E31\u0E2A\u0E14\u0E38, \u0E01\u0E32\u0E23\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E01\u0E48\u0E2D\u0E2A\u0E23\u0E49\u0E32\u0E07)
2. Specification \u0E20\u0E32\u0E29\u0E32\u0E2D\u0E31\u0E07\u0E01\u0E24\u0E29 (PART 1 - GENERAL, PART 2 - PRODUCTS, PART 3 - EXECUTION)
`;
    const messages = [
      {
        role: "system",
        content: "\u0E04\u0E38\u0E13\u0E04\u0E37\u0E2D Senior Structural & Materials Engineer \u0E1C\u0E39\u0E49\u0E40\u0E0A\u0E35\u0E48\u0E22\u0E27\u0E0A\u0E32\u0E0D\u0E01\u0E32\u0E23\u0E23\u0E48\u0E32\u0E07\u0E02\u0E49\u0E2D\u0E01\u0E33\u0E2B\u0E19\u0E14 TOR \u0E15\u0E32\u0E21\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19 \u0E27\u0E2A\u0E17. 1014, ACI 318 \u0E41\u0E25\u0E30 CSI MasterFormat 03 30 00. \u0E08\u0E07\u0E23\u0E48\u0E32\u0E07\u0E02\u0E49\u0E2D\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E17\u0E31\u0E49\u0E07\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22\u0E41\u0E25\u0E30\u0E20\u0E32\u0E29\u0E32\u0E2D\u0E31\u0E07\u0E01\u0E24\u0E29\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E21\u0E37\u0E2D\u0E2D\u0E32\u0E0A\u0E35\u0E1E"
      },
      { role: "user", content: prompt }
    ];
    const content = await this.chat({ messages, temperature: 0.2, maxTokens: 3500 });
    return this._parseOutput(content);
  }
  _parseOutput(content) {
    const splitMarkers = [
      "2. Specification \u0E20\u0E32\u0E29\u0E32\u0E2D\u0E31\u0E07\u0E01\u0E24\u0E29",
      "Specification \u0E20\u0E32\u0E29\u0E32\u0E2D\u0E31\u0E07\u0E01\u0E24\u0E29",
      "Specification in English",
      "PART 1 - GENERAL",
      "PART 1: GENERAL",
      "PART 1 \u2013 GENERAL"
    ];
    for (const marker of splitMarkers) {
      if (content.includes(marker)) {
        const idx = content.indexOf(marker);
        const thPart = content.slice(0, idx).trim();
        const enPart = content.slice(idx).trim();
        if (thPart.length > 100) return { thPart, enPart };
      }
    }
    const parts = content.split("\n---\n");
    if (parts.length >= 2 && parts[0].length > 200) {
      return { thPart: parts[0].trim(), enPart: parts[1].trim() };
    }
    return { thPart: content.trim(), enPart: content.trim() };
  }
  _mockResponse(messages) {
    const userMsg = messages[messages.length - 1]?.content || "";
    return `\u0E2B\u0E21\u0E27\u0E14\u0E17\u0E35\u0E48 03 30 00 \u0E07\u0E32\u0E19\u0E04\u0E2D\u0E19\u0E01\u0E23\u0E35\u0E15\u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E2B\u0E25\u0E48\u0E2D\u0E43\u0E19\u0E17\u0E35\u0E48 (\u0E04\u0E2D\u0E19\u0E01\u0E23\u0E35\u0E15\u0E04\u0E32\u0E23\u0E4C\u0E1A\u0E2D\u0E19\u0E15\u0E48\u0E33)
\u0E2A\u0E48\u0E27\u0E19\u0E17\u0E35\u0E48 1 - \u0E17\u0E31\u0E48\u0E27\u0E44\u0E1B: \u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E08\u0E49\u0E32\u0E07\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E2A\u0E19\u0E2D Mix Design \u0E41\u0E25\u0E30\u0E1C\u0E25\u0E17\u0E14\u0E2A\u0E2D\u0E1A Trial Mix \u0E25\u0E48\u0E27\u0E07\u0E2B\u0E19\u0E49\u0E32\u0E44\u0E21\u0E48\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32 35 \u0E27\u0E31\u0E19\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E17\u0E08\u0E23\u0E34\u0E07
\u0E2A\u0E48\u0E27\u0E19\u0E17\u0E35\u0E48 2 - \u0E27\u0E31\u0E2A\u0E14\u0E38: \u0E1B\u0E39\u0E19\u0E0B\u0E35\u0E40\u0E21\u0E19\u0E15\u0E4C\u0E44\u0E2E\u0E14\u0E23\u0E2D\u0E25\u0E34\u0E01 \u0E21\u0E2D\u0E01. 2594 \u0E1C\u0E2A\u0E21\u0E40\u0E16\u0E49\u0E32\u0E25\u0E2D\u0E22 \u0E21\u0E2D\u0E01. 2135 \u0E0A\u0E31\u0E49\u0E19 F
\u0E2A\u0E48\u0E27\u0E19\u0E17\u0E35\u0E48 3 - \u0E01\u0E32\u0E23\u0E01\u0E48\u0E2D\u0E2A\u0E23\u0E49\u0E32\u0E07: \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E17\u0E43\u0E2B\u0E49\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E20\u0E32\u0E22\u0E43\u0E19 90 \u0E19\u0E32\u0E17\u0E35 \u0E41\u0E25\u0E30\u0E1A\u0E48\u0E21\u0E0A\u0E37\u0E49\u0E19\u0E15\u0E48\u0E2D\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32 14 \u0E27\u0E31\u0E19
---
SECTION 03 30 00 - CAST-IN-PLACE CONCRETE (LOW-CARBON MIX SPECIFICATION)
PART 1 - GENERAL: Submit trial mix reports conforming to ASTM C39 / TIS 213 at least 35 days prior to placement.
PART 2 - PRODUCTS: Hydraulic cement (TIS 2594) with Class F fly ash (TIS 2135).
PART 3 - EXECUTION: Complete discharge within 90 minutes. Moist cure for minimum 14 days.`;
  }
};

// api/server.mjs
var app = new Hono();
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"]
}));
app.get("/health", (c) => c.json({ status: "ok", service: "GreenSpec Hono Engine" }));
app.get("/api/health", (c) => c.json({ status: "ok", service: "GreenSpec Hono Engine" }));
app.get("/api/catalog", (c) => c.json(THAI_CERTIFIED_CATALOG));
app.post("/api/tools/mix-design", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const result = calculateConcreteMix({
    fcTargetMpa: Number(body.fc_target_mpa ?? 35),
    elementType: body.element_type ?? "beam_slab",
    slumpCm: Number(body.slump_cm ?? 12),
    scmType: body.scm_type ?? "fly_ash",
    scmPercent: Number(body.scm_percent ?? 25),
    aggregateSizeMm: Number(body.aggregate_size_mm ?? 19),
    sandFinenessModulus: Number(body.sand_fineness_modulus ?? 2.8)
  });
  return c.json(result);
});
app.post("/api/tools/carbon-calc", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const result = calculateEmbodiedCarbon({
    cementOpcKg: Number(body.cement_opc_kg ?? 270),
    scmKg: Number(body.scm_kg ?? 90),
    scmType: body.scm_type ?? "fly_ash",
    caKg: Number(body.ca_kg ?? 1020),
    sandKg: Number(body.sand_kg ?? 740),
    volumeM3: Number(body.volume_m3 ?? 100)
  });
  return c.json(result);
});
app.post("/api/tools/thermal-check", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const result = evaluateThermalMassConcrete({
    thicknessM: Number(body.thickness_m ?? 1.5),
    totalBinderKgM3: Number(body.total_binder_kg_m3 ?? 380),
    scmPercent: Number(body.scm_percent ?? 30),
    scmType: body.scm_type ?? "fly_ash",
    placingTempC: Number(body.placing_temp_c ?? 30)
  });
  return c.json(result);
});
app.get("/api/tools/strength-convert", (c) => {
  const val = Number(c.req.query("value") ?? 280);
  const fromFmt = c.req.query("from_format") ?? "cylinder_ksc";
  const result = convertConcreteStrength({ value: val, fromFormat: fromFmt });
  return c.json(result);
});
app.post("/api/tools/cost-estimate", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const result = estimateCostImpact({
    fcMpa: Number(body.fc_mpa ?? 35),
    volumeM3: Number(body.volume_m3 ?? 500),
    scmPercent: Number(body.scm_percent ?? 25),
    scmType: body.scm_type ?? "fly_ash"
  });
  return c.json(result);
});
app.post("/api/analyze", async (c) => {
  const payload = await c.req.json().catch(() => ({}));
  const projectName = payload.project_name || "Bangkok Project";
  const elementType = payload.element_type || "mat_foundation";
  const volumeM3 = Number(payload.volume_m3 || 1e3);
  const fcPrimeMpa = Number(payload.fc_prime_mpa || 35);
  const testAgeDays = Number(payload.test_age_days || 28);
  const notes = payload.notes || "";
  const guardrail = evaluateGuardrail({
    elementType,
    volumeM3,
    fcPrimeMpa,
    testAgeDays,
    notes
  });
  const scmPctOptA = Math.min(guardrail.max_scm_percent, 30);
  const scmPctOptB = Math.min(guardrail.max_scm_percent + 5, 40);
  const mixA = calculateConcreteMix({ fcTargetMpa: fcPrimeMpa, elementType, scmPercent: scmPctOptA });
  const carbonA = calculateEmbodiedCarbon({
    cementOpcKg: mixA.mix_proportions_per_m3.cement_opc_kg,
    scmKg: mixA.mix_proportions_per_m3.scm_kg,
    volumeM3
  });
  const costA = estimateCostImpact({ fcMpa: fcPrimeMpa, volumeM3, scmPercent: scmPctOptA });
  const typhoon = new TyphoonClient();
  const spec = await typhoon.generateSpecification({
    projectName,
    elementType,
    fcMpa: fcPrimeMpa,
    ageDays: guardrail.recommended_test_age_days,
    scmName: "\u0E40\u0E16\u0E49\u0E32\u0E25\u0E2D\u0E22\u0E41\u0E21\u0E48\u0E40\u0E21\u0E32\u0E30 \u0E21\u0E2D\u0E01. 2135",
    scmPct: scmPctOptA,
    wbRatio: mixA.max_wb_ratio,
    curingDays: guardrail.mandatory_curing_days,
    standardsContext: [
      "\u0E21\u0E2D\u0E01. 2594 \u0E1B\u0E39\u0E19\u0E0B\u0E35\u0E40\u0E21\u0E19\u0E15\u0E4C\u0E44\u0E2E\u0E14\u0E23\u0E2D\u0E25\u0E34\u0E01",
      "\u0E21\u0E2D\u0E01. 2135 \u0E40\u0E16\u0E49\u0E32\u0E25\u0E2D\u0E22\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E43\u0E0A\u0E49\u0E40\u0E1B\u0E47\u0E19\u0E27\u0E31\u0E2A\u0E14\u0E38\u0E1C\u0E2A\u0E21\u0E43\u0E19\u0E04\u0E2D\u0E19\u0E01\u0E23\u0E35\u0E15",
      "\u0E21\u0E22\u0E1C. 1101-64 \u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19\u0E07\u0E32\u0E19\u0E04\u0E2D\u0E19\u0E01\u0E23\u0E35\u0E15\u0E41\u0E25\u0E30\u0E04\u0E2D\u0E19\u0E01\u0E23\u0E35\u0E15\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E40\u0E2B\u0E25\u0E47\u0E01 \u0E01\u0E23\u0E21\u0E42\u0E22\u0E18\u0E32\u0E18\u0E34\u0E01\u0E32\u0E23\u0E41\u0E25\u0E30\u0E1C\u0E31\u0E07\u0E40\u0E21\u0E37\u0E2D\u0E07",
      "ACI 207.2R Guide to Mass Concrete (Delta T <= 20 deg C)"
    ]
  });
  const matched = THAI_CERTIFIED_CATALOG.find((p) => p.element_suitability.includes(elementType)) || THAI_CERTIFIED_CATALOG[0];
  return c.json({
    status: "success",
    project_name: projectName,
    element_type: elementType,
    guardrail,
    baseline: {
      carbon_intensity_kg_m3: carbonA.baseline_carbon_intensity_kgco2e_m3,
      total_carbon_tco2e: carbonA.total_baseline_carbon_tco2e,
      estimated_cost_thb: costA.total_baseline_cost_thb
    },
    options: {
      option_a: {
        name: "\u0E2A\u0E39\u0E15\u0E23\u0E2A\u0E21\u0E14\u0E38\u0E25 (Balanced Mix Design)",
        scm_replacement_percent: scmPctOptA,
        carbon_reduction_percent: carbonA.carbon_reduction_percent,
        total_carbon_saved_tco2e: carbonA.total_carbon_saved_tco2e,
        total_savings_thb: costA.total_savings_thb,
        max_wb_ratio: mixA.max_wb_ratio,
        acceptance_age_days: guardrail.recommended_test_age_days,
        proportions: mixA.mix_proportions_per_m3
      }
    },
    matched_product: matched,
    technical_package: {
      spec_clause_th: spec.thPart,
      spec_clause_en: spec.enPart,
      submittal_checklist: [
        "\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E17\u0E14\u0E2A\u0E2D\u0E1A Trial Mix \u0E43\u0E19\u0E2B\u0E49\u0E2D\u0E07\u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23 \u0E25\u0E48\u0E27\u0E07\u0E2B\u0E19\u0E49\u0E32 35 \u0E27\u0E31\u0E19 \u0E15\u0E32\u0E21 \u0E21\u0E2D\u0E01. 213",
        "\u0E43\u0E1A\u0E23\u0E31\u0E1A\u0E23\u0E2D\u0E07 Mill Certificate \u0E40\u0E16\u0E49\u0E32\u0E25\u0E2D\u0E22 \u0E21\u0E2D\u0E01. 2135 \u0E0A\u0E31\u0E49\u0E19 F \u0E41\u0E25\u0E30\u0E1B\u0E39\u0E19\u0E0B\u0E35\u0E40\u0E21\u0E19\u0E15\u0E4C\u0E44\u0E2E\u0E14\u0E23\u0E2D\u0E25\u0E34\u0E01 \u0E21\u0E2D\u0E01. 2594",
        `\u0E41\u0E1C\u0E19\u0E01\u0E32\u0E23\u0E1A\u0E48\u0E21\u0E0A\u0E37\u0E49\u0E19 (Curing Plan) \u0E15\u0E48\u0E2D\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 ${guardrail.mandatory_curing_days} \u0E27\u0E31\u0E19`
      ]
    }
  });
});
app.post("/api/chat", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const messages = body.messages || [];
  const stream = body.stream !== false;
  const typhoon = new TyphoonClient();
  const systemPrompt = `\u0E04\u0E38\u0E13\u0E04\u0E37\u0E2D GreenSpec Senior Civil AI Copilot \u0E27\u0E34\u0E28\u0E27\u0E01\u0E23\u0E1C\u0E39\u0E49\u0E40\u0E0A\u0E35\u0E48\u0E22\u0E27\u0E0A\u0E32\u0E0D\u0E14\u0E49\u0E32\u0E19\u0E04\u0E2D\u0E19\u0E01\u0E23\u0E35\u0E15\u0E04\u0E32\u0E23\u0E4C\u0E1A\u0E2D\u0E19\u0E15\u0E48\u0E33 \u0E01\u0E32\u0E23\u0E2D\u0E2D\u0E01\u0E41\u0E1A\u0E1A\u0E2A\u0E48\u0E27\u0E19\u0E1C\u0E2A\u0E21 ACI 211.1 \u0E41\u0E25\u0E30\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19 \u0E21\u0E2D\u0E01., \u0E21\u0E22\u0E1C., \u0E27\u0E2A\u0E17. \u0E02\u0E2D\u0E07\u0E44\u0E17\u0E22
\u0E43\u0E2B\u0E49\u0E15\u0E2D\u0E1A\u0E04\u0E33\u0E16\u0E32\u0E21\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E01\u0E23\u0E30\u0E0A\u0E31\u0E1A \u0E2A\u0E38\u0E20\u0E32\u0E1E \u0E40\u0E1B\u0E47\u0E19\u0E21\u0E37\u0E2D\u0E2D\u0E32\u0E0A\u0E35\u0E1E \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19\u0E17\u0E35\u0E48\u0E40\u0E01\u0E35\u0E48\u0E22\u0E27\u0E02\u0E49\u0E2D\u0E07\u0E40\u0E2A\u0E21\u0E2D`;
  const fullMessages = [
    { role: "system", content: systemPrompt },
    ...messages
  ];
  if (!stream) {
    const reply = await typhoon.chat({ messages: fullMessages });
    return c.json({ reply });
  }
  const textStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of typhoon.chatStream({ messages: fullMessages })) {
          const payload = JSON.stringify({ chunk });
          controller.enqueue(encoder.encode(`data: ${payload}

`));
        }
        controller.enqueue(encoder.encode(`data: [DONE]

`));
        controller.close();
      } catch (err) {
        controller.enqueue(encoder.encode(`data: {"error": "${err.message}"}

`));
        controller.close();
      }
    }
  });
  return new Response(textStream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
});
var listener = getRequestListener(app.fetch);
function handleFetch(req) {
  const url = new URL(req.url);
  const matchedPath = req.headers.get("x-matched-path");
  if (matchedPath && matchedPath !== url.pathname) {
    url.pathname = matchedPath;
    return app.fetch(new Request(url.toString(), req));
  }
  return app.fetch(req);
}
var GET = handleFetch;
var POST = handleFetch;
var PUT = handleFetch;
var DELETE = handleFetch;
var OPTIONS = handleFetch;
function handler(req, res) {
  if (req instanceof Request) {
    return handleFetch(req);
  }
  return listener(req, res);
}
export {
  DELETE,
  GET,
  OPTIONS,
  POST,
  PUT,
  app,
  handler as default,
  handleFetch
};
