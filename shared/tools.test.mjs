import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateConcreteMix,
  calculateEmbodiedCarbon,
  evaluateThermalMassConcrete,
  convertConcreteStrength,
  estimateCostImpact
} from './tools.mjs';

test('calculateConcreteMix - Volumetric Conservation is exact', () => {
  const result = calculateConcreteMix({
    fcTargetMpa: 35.0,
    elementType: 'mat_foundation',
    scmType: 'fly_ash',
    scmPercent: 35.0
  });

  assert.equal(result.volumetric_check.volumetric_balance_conserved, true);
  assert.ok(Math.abs(result.volumetric_check.sum_absolute_volumes_m3 - 1.000) <= 0.005);
  assert.ok(result.mix_proportions_per_m3.cement_opc_kg > 0);
  assert.ok(result.mix_proportions_per_m3.scm_kg > 0);
  assert.ok(result.mix_proportions_per_m3.fine_aggregate_sand_kg > 0);
});

test('calculateEmbodiedCarbon - TGO emissions reduction', () => {
  const result = calculateEmbodiedCarbon({
    cementOpcKg: 260.0,
    scmKg: 140.0,
    scmType: 'fly_ash',
    volumeM3: 500.0
  });

  assert.ok(result.carbon_reduction_percent > 20.0);
  assert.ok(result.total_carbon_saved_tco2e > 0);
  assert.equal(result.tgo_verified, true);
});

test('evaluateThermalMassConcrete - ACI 207 DEF detection', () => {
  const safe = evaluateThermalMassConcrete({
    thicknessM: 0.5,
    totalBinderKgM3: 320.0,
    scmPercent: 30.0,
    placingTempC: 28.0
  });
  assert.equal(safe.is_mass_concrete, false);
  assert.equal(safe.def_risk_flag, false);

  const risk = evaluateThermalMassConcrete({
    thicknessM: 2.2,
    totalBinderKgM3: 450.0,
    scmPercent: 0.0,
    scmType: 'opc',
    placingTempC: 32.0
  });
  assert.equal(risk.is_mass_concrete, true);
  assert.equal(risk.def_risk_flag, true); // Core temp >= 70 deg C
  assert.ok(risk.mitigation_actions.length >= 2);
});

test('convertConcreteStrength - DPT 1101-64 cylinder vs cube', () => {
  const conv = convertConcreteStrength({ value: 280.0, fromFormat: 'cylinder_ksc' });
  assert.ok(conv.cylinder_15x30cm.strength_mpa > 27.0);
  assert.ok(conv.cube_15x15cm.strength_mpa > conv.cylinder_15x30cm.strength_mpa);
  assert.equal(conv.conversion_factor, 0.83);
});

test('estimateCostImpact - Thai ready-mix cost delta', () => {
  const cost = estimateCostImpact({ fcMpa: 35.0, volumeM3: 1000.0, scmPercent: 30.0 });
  assert.ok(cost.total_savings_thb > 0);
  assert.ok(cost.proposed_cost_thb_m3 < cost.baseline_cost_thb_m3);
});
