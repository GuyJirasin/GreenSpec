// Controlled fixture alternatives. Never derive alternatives for arbitrary uploads.
const copy = value => JSON.parse(JSON.stringify(value));
const known = value => typeof value === 'number' && Number.isFinite(value);
const rounded = value => Math.round(value * 100) / 100;
export function defaultWording(recommendation) {
  return `${recommendation.proposed_material} for ${recommendation.quantity?.value ?? 'the approved quantity'} ${recommendation.quantity?.unit ?? ''}.`;
}
export function proposalOptions(recommendation) {
  const a = copy(recommendation);
  const b = copy(recommendation);
  const names = {
    'concrete-structure': 'Lower-carbon concrete C30 with a higher supplementary cementitious content',
    'steel-reinforcement': 'Steel reinforcement with a higher recycled content of equivalent grade',
    'partition-board': 'Gypsum board with a higher recycled content',
  };
  b.proposed_material = names[b.lineage_id] ?? `${b.proposed_material} — lower-carbon fixture option`;
  b.rationale = 'Illustrative lower-carbon alternative with a higher cost. Check product data and project requirements before real use.';
  const impacts = b.impacts;
  if (known(impacts.baseline_cost_thb) && known(impacts.selected_cost_thb)) {
    impacts.selected_cost_thb = rounded(Math.max(impacts.baseline_cost_thb * 1.06, impacts.selected_cost_thb * 1.02));
    impacts.cost_saving_thb = rounded(impacts.baseline_cost_thb - impacts.selected_cost_thb);
  } else {
    impacts.selected_cost_thb = null;
    impacts.cost_saving_thb = null;
  }
  if (known(impacts.baseline_carbon_tco2e) && known(impacts.selected_carbon_tco2e)) {
    const saving = Math.max(0, impacts.baseline_carbon_tco2e - impacts.selected_carbon_tco2e);
    impacts.selected_carbon_tco2e = rounded(Math.max(0, impacts.baseline_carbon_tco2e - saving * 1.25));
    impacts.carbon_reduction_tco2e = rounded(impacts.baseline_carbon_tco2e - impacts.selected_carbon_tco2e);
  } else {
    impacts.selected_carbon_tco2e = null;
    impacts.carbon_reduction_tco2e = null;
  }
  b.methodology = {...b.methodology, basis: `${b.methodology?.basis ?? ''}; Option B: controlled synthetic comparison, higher cost and 25% more estimated carbon saving; not a product quote or certification`};
  b.uncertainty_notes = [...(b.uncertainty_notes ?? []), 'Option B is fixture data only. Confirm material performance and availability.'];
  return [
    {option_key: 'A', payload: a, default_wording: defaultWording(a)},
    {option_key: 'B', payload: b, default_wording: defaultWording(b)},
  ];
}
export function generateAlternativeOptions(recommendations) {
  return recommendations.flatMap(proposalOptions);
}

