// Display-only calculations. Missing estimates stay unknown; repeated scopes count once.
export function totalByScope(rows, metric, get = r => r.payload || r) {
  const unique = rows.filter((r, i, all) => all.findIndex(x => get(x).work_scope_key === get(r).work_scope_key) === i);
  const values = unique.map(r => get(r).impacts?.[metric]);
  const known = values.filter(v => typeof v === 'number' && Number.isFinite(v));
  return { value: known.length ? known.reduce((s, v) => s + v, 0) : unique.length ? null : 0, known: known.length, total: unique.length, complete: known.length === unique.length };
}
export function impactSummary(rows, selected, getSelected) {
  const baselineCarbon = totalByScope(rows, 'baseline_carbon_tco2e');
  const baselineCost = totalByScope(rows, 'baseline_cost_thb');
  const carbon = totalByScope(selected, 'carbon_reduction_tco2e', getSelected);
  const cost = totalByScope(selected, 'cost_saving_thb', getSelected);
  const overlaps = new Set(selected.map(r => getSelected(r).work_scope_key)).size !== selected.length;
  return { baselineCarbon, baselineCost, carbon, cost, overlaps,
    proposedCarbon: !overlaps && baselineCarbon.complete && carbon.complete ? baselineCarbon.value - carbon.value : null,
    proposedCost: !overlaps && baselineCost.complete && cost.complete ? baselineCost.value - cost.value : null };
}
