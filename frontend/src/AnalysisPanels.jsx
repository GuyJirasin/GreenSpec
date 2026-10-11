import React from 'react';
import { ArrowRight } from 'lucide-react';
import { money } from './api';
import { useLanguage } from './i18n';
import { totalByScope, impactSummary } from './analysis-display.mjs';

export function ImpactCards({rows, selected, payload}) {
  const {t}=useLanguage(), s=impactSummary(rows,selected,payload);
  const carbon=s.carbon.value, cost=s.cost.value;
  const percent=carbon!=null&&s.carbon.complete&&s.baselineCarbon.complete&&s.baselineCarbon.value>0&&!s.overlaps ? `${money(carbon/s.baselineCarbon.value*100)}%` : '—';
  return <><div className="stats analysis-stats">
    <section className="stat"><small>{t('Selected changes')}</small><strong>{selected.length}</strong><small>{t('One option per recommendation')}</small></section>
    <section className="stat"><small>{t('CO₂ reduction')}</small><strong>{carbon!=null?`${money(carbon)} tCO₂e`:'—'}</strong><small>{percent} · {t('of known baseline')}</small></section>
    <section className="stat"><small>{t(cost<0?'Cost increase':'Cost savings')}</small><strong>{cost!=null?`฿${money(Math.abs(cost))}`:'—'}</strong><small>{t('Estimate from approved choices')}</small></section>
    <section className="stat"><small>{t('Proposed carbon')}</small><strong>{s.proposedCarbon!=null?`${money(s.proposedCarbon)} tCO₂e`:'—'}</strong><small>{t('Known baseline')}: {money(s.baselineCarbon.value)} tCO₂e</small></section>
  </div>{(!s.carbon.complete||!s.cost.complete||!s.baselineCarbon.complete||!s.baselineCost.complete)&&<p className="notice warning">{t('Some estimates are missing. Totals include only known values. Missing values are not counted as zero.')}</p>}{s.overlaps&&<p className="notice warning">{t('More than one change is selected for the same work scope')}</p>}</>;
}

export function HotspotPanels({rows,onView}) {
  const {t}=useLanguage();
  const unique=rows.filter((r,i,a)=>a.findIndex(x=>(x.payload||x).work_scope_key===(r.payload||r).work_scope_key)===i).sort((a,b)=>((b.payload||b).impacts?.baseline_carbon_tco2e??-Infinity)-((a.payload||a).impacts?.baseline_carbon_tco2e??-Infinity));
  const carbon=totalByScope(unique,'baseline_carbon_tco2e'),cost=totalByScope(unique,'baseline_cost_thb');
  const share=(v,total)=>v!=null&&total>0?`${money(v/total*100)}%`:'—';
  return <><div className="page-title"><div><h2>Material hotspots</h2><p>{t('Focus on the largest contributors.')}</p></div></div><div className="grid two hotspot-panels">
    <section className="card"><h3>Baseline carbon contribution</h3>{unique.map(r=>{const p=r.payload||r,v=p.impacts?.baseline_carbon_tco2e;return <div className="hotspot" key={r.id}><div className="section-head"><button className="ghost" onClick={()=>onView(r)}>{p.original_material}<ArrowRight size={16}/></button><b>{share(v,carbon.value)}</b></div><div className="bar"><span style={{width:`${v!=null&&carbon.value>0?Math.max(0,Math.min(100,v/carbon.value*100)):0}%`}}/></div><small>{v==null?t('No source estimate'):`${money(v)} tCO₂e`} · {share(p.impacts?.baseline_cost_thb,cost.value)} {t('of known material cost')}</small></div>})}{!unique.length&&<p>{t('No material estimates are available.')}</p>}</section>
    <section className="card"><h3>Material breakdown</h3><div className="table-wrap"><table><thead><tr><th>{t('Material')}</th><th>{t('Carbon')}</th><th>{t('Cost')}</th><th/></tr></thead><tbody>{unique.map(r=>{const p=r.payload||r;return <tr key={r.id}><td>{p.original_material}</td><td>{share(p.impacts?.baseline_carbon_tco2e,carbon.value)}</td><td>{share(p.impacts?.baseline_cost_thb,cost.value)}</td><td><button className="secondary" onClick={()=>onView(r)}>{t('View')}<ArrowRight size={15}/></button></td></tr>})}</tbody></table></div><p>{t('Known baseline carbon for the scopes found in this analysis. This is not a whole-building total.')}</p>{(!carbon.complete||!cost.complete)&&<p className="notice warning">{t('Some estimates are missing. Totals include only known values. Missing values are not counted as zero.')}</p>}</section>
  </div></>;
}

export function SummaryPanels({rows,selected,payload,reviews,final,onView}) {
  const {t}=useLanguage(),s=impactSummary(rows,selected,payload),reviewOf=r=>reviews.find(x=>x.recommendation_id===r.id);
  const unreviewed=rows.filter(r=>!reviewOf(r)||reviewOf(r).decision==='UNREVIEWED').length;
  return <><div className="page-title"><div><h2>Final analysis summary</h2><p>{t(final?'Final revision saved':'Check every decision before finalizing. A revised document is optional.')}</p></div><span className="badge">{t(final?'Final':'Draft')}</span></div><ImpactCards rows={rows} selected={selected} payload={payload}/><div className="grid two summary-panels">
    <section className="card"><h3>Original vs proposed</h3><div className="table-wrap"><table><thead><tr><th/><th>{t('Original')}</th><th>{t('Proposed')}</th></tr></thead><tbody><tr><td>{t('Material carbon')}</td><td>{s.baselineCarbon.complete?money(s.baselineCarbon.value):'—'} tCO₂e</td><td>{money(s.proposedCarbon)} tCO₂e</td></tr><tr><td>{t('Material cost')}</td><td>{s.baselineCost.complete?`฿${money(s.baselineCost.value)}`:'—'}</td><td>{s.proposedCost==null?'—':`฿${money(s.proposedCost)}`}</td></tr><tr><td>{t('Selected changes')}</td><td>—</td><td>{selected.length}</td></tr></tbody></table></div><small>{t('Known baseline carbon for the scopes found in this analysis. This is not a whole-building total.')}</small></section>
    <section className="card"><h3>Review progress</h3><div className="actions"><span className="badge">{rows.length-unreviewed} / {rows.length} {t('Reviewed')}</span><span className={`badge ${unreviewed?'warning':''}`}>{unreviewed} {t('Not reviewed')}</span></div><p>{t('Review every item first')}</p><div className="notice">{t('Estimates are not an engineering approval or material certification.')}</div></section>
  </div><section className="card"><h3>Decision log</h3><div className="table-wrap"><table><thead><tr><th>{t('Material')}</th><th>{t('Decision')}</th><th>{t('Choice')}</th><th>{t('Wording')}</th><th/></tr></thead><tbody>{rows.map(r=>{const rev=reviewOf(r),decision=rev?.decision||'UNREVIEWED';return <tr key={r.id}><td>{(r.payload||r).original_material}</td><td><span className="badge">{t({APPROVED:'Approved',REJECTED:'Rejected',UNREVIEWED:'Not reviewed'}[decision]||decision)}</span></td><td>{decision==='REJECTED'?t('Keep original'):decision==='APPROVED'?`Option ${rev?.selected_option||'A'}`:'—'}</td><td>{rev?.draft_wording?t('Edited'):t('As proposed')}</td><td><button className="secondary" onClick={()=>onView(r)}>{t('View')}</button></td></tr>})}</tbody></table></div></section><div className="actions stage-actions"><button className="secondary" onClick={()=>window.print()}>{t("Print / save PDF")}</button></div></>;
}
