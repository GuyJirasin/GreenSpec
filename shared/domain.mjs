import { fixtures } from './fixtures.mjs';
import { schemaErrors } from './validation.mjs';
export { schemaErrors };
export { fixtures };
export const scenarios = [
 {id:'success',name:'Successful analysis',fixture_ids:['office-spec']},
 {id:'zero',name:'No opportunities',fixture_ids:['zero-spec']},
 {id:'missing',name:'Missing cost and carbon',fixture_ids:['office-spec']},
 {id:'overlap',name:'Overlapping alternatives',fixture_ids:['office-spec']},
 {id:'partial',name:'Partial source failure',fixture_ids:['partial-spec','partial-boq']},
 {id:'job-failure',name:'Retryable job failure',fixture_ids:['office-spec']},
 {id:'malformed',name:'Invalid provider output',fixture_ids:['office-spec']}
];
export class DomainError extends Error {
 constructor(code,message,details=[],retryable=false){super(message);this.name='DomainError';Object.assign(this,{code,details,retryable});}
}
const fail=(code,message,details=[])=>{throw new DomainError(code,message,details);};
const clone=x=>JSON.parse(JSON.stringify(x));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const stable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export function fingerprint(input){let n=2166136261;for(const c of stable(input)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return `v1-${(n>>>0).toString(16).padStart(8,'0')}`;}
export function validateInputs(input,documents){
 const missing=[];
 if(!nonempty(input.context?.name))missing.push('Project name');
 if(!nonempty(input.context?.description))missing.push('Project description');
 if(input.generation_mode!=='simulated')fail('INPUT_INCOMPLETE','Only simulated analysis is enabled.');
 if(!documents?.length)missing.push('At least one selected ready fixture file');
 if(missing.length)fail('INPUT_INCOMPLETE','Complete the analysis inputs.',missing);
 const scenario=scenarios.find(s=>s.id===input.fixture_scenario_id);
 if(!scenario)fail('DEMO_SOURCE_UNSUPPORTED','Choose a known simulation scenario.');
 for(const d of documents){
  const f=fixtures.find(f=>f.fixture_id===d.fixture_id);
  if(!f||!scenario.fixture_ids.includes(d.fixture_id))fail('DEMO_SOURCE_UNSUPPORTED','Selected file is not mapped to this fixture scenario.');
  if(d.checksum!==f.checksum)fail('DEMO_SOURCE_UNSUPPORTED','Fixture checksum does not match the original source.');
  if(d.upload_state!=='READY'||!nonempty(d.title)||!['TOR','BOQ','SPEC','OTHER'].includes(d.type))fail('INPUT_INCOMPLETE','Source file is not ready or metadata is incomplete.');
  if(!nonempty(d.id??d.document_version_id))fail('INPUT_INCOMPLETE','Exact document version ID is required.');
 }
 if(!scenario.fixture_ids.every(id=>documents.some(d=>d.fixture_id===id)))fail('INPUT_INCOMPLETE','The complete selected fixture set is required.');
 return scenario;
}
const templates=[
 {lineage_id:'concrete-structure',work_scope_key:'structure/concrete',original_material:'Ordinary Portland cement concrete C30',proposed_material:'Low carbon concrete C30 with supplementary cementitious material',rationale:'Illustrative same-grade alternative reduces the simulated embodied carbon baseline.',quantity:{value:1000,unit:'m3'},paragraph:3,impacts:{baseline_cost_thb:3000000,selected_cost_thb:2850000,cost_saving_thb:150000,baseline_carbon_tco2e:320,selected_carbon_tco2e:210,carbon_reduction_tco2e:110}},
 {lineage_id:'steel-reinforcement',work_scope_key:'structure/reinforcement',original_material:'Conventional steel reinforcement',proposed_material:'Recycled-content steel reinforcement of equivalent grade',rationale:'Illustrative recycled-content alternative retains the specified strength requirement.',quantity:{value:100,unit:'tonne'},paragraph:4,impacts:{baseline_cost_thb:2500000,selected_cost_thb:2600000,cost_saving_thb:-100000,baseline_carbon_tco2e:200,selected_carbon_tco2e:90,carbon_reduction_tco2e:110}},
 {lineage_id:'partition-board',work_scope_key:'interior/partitions',original_material:'Standard gypsum board',proposed_material:'Recycled-content gypsum board',rationale:'Illustrative board substitution reduces the simulated material footprint.',quantity:{value:2000,unit:'m2'},paragraph:5,impacts:{baseline_cost_thb:400000,selected_cost_thb:360000,cost_saving_thb:40000,baseline_carbon_tco2e:12,selected_carbon_tco2e:8,carbon_reduction_tco2e:4}}
];
export function createAnalysis(input,documents){
 const scenario=validateInputs(input,documents),runId=input.run_id??input.request_id;
 if(!nonempty(runId))fail('INPUT_INCOMPLETE','A stable request ID is required.');
 const doc=documents.find(d=>d.fixture_id===scenario.fixture_ids[0]),fixture=fixtures.find(f=>f.fixture_id===doc.fixture_id);
 const base={contract_version:'1.0',run_id:runId,input_fingerprint:fingerprint(input),generation_mode:'simulated',fixture_scenario_id:scenario.id,status:'completed',recommendations:[],warnings:['SIMULATED: deterministic fixture workflow only; no live AI analysis or verified environmental claim.'],errors:[]};
 if(scenario.id==='job-failure')return {...base,status:'failed',errors:[{code:'JOB_FAILED',message:'Injected retryable simulation job failure.',retryable:true}]};
 if(scenario.id==='zero')return base;
 const list=scenario.id==='partial'?templates.slice(0,1):templates;
 base.recommendations=list.map((t,i)=>{
  const r=clone(t);delete r.paragraph;
  return {...r,id:`${runId}-r${i+1}`,sources:[{document_version_id:doc.id??doc.document_version_id,exact_text:fixture.extraction[t.paragraph-1].exact_text,locator:{kind:'paragraph',paragraph_index:t.paragraph}}],methodology:{source:'GREEN SPEC illustrative fixtures',version:'1.0',basis:`${r.quantity.value} ${r.quantity.unit}; total THB and tCO2e; synthetic comparison values, not an EPD or supplier quote`},missing_data_reasons:[],uncertainty_notes:['Simulation only. Confirm specifications, cost and environmental factors independently before real use.']};
 });
 if(scenario.id==='missing'){
  for(const key of ['baseline_cost_thb','selected_cost_thb','cost_saving_thb'])base.recommendations[1].impacts[key]=null;
  base.recommendations[1].missing_data_reasons.push('Comparable supplier cost is unavailable in this fixture.');
  for(const key of ['baseline_carbon_tco2e','selected_carbon_tco2e','carbon_reduction_tco2e'])base.recommendations[2].impacts[key]=null;
  base.recommendations[2].missing_data_reasons.push('Comparable carbon factors are unavailable in this fixture.');
 }
 if(scenario.id==='overlap'){const alternative=clone(base.recommendations[0]);alternative.id=`${runId}-r4`;alternative.proposed_material='Alternative low carbon concrete C30 mix';base.recommendations.push(alternative);}
 if(scenario.id==='partial'){base.status='partial';base.errors=[{code:'OUTPUT_INVALID',message:'Injected unavailable additional fixture source. Explicit omission is required before finalization.',retryable:false,entity_id:(documents.find(d=>d.fixture_id==='partial-boq')?.id??documents.find(d=>d.fixture_id==='partial-boq')?.document_version_id)}];}
 if(input.operation==='iterate'){
  if(!input.parent_run_id)fail('INPUT_INCOMPLETE','Iteration requires a parent run.');
  const items=input.feedback?.items??[];
  for(const r of base.recommendations){if(!(input.locked_lineage_ids??[]).includes(r.lineage_id)&&(items.some(f=>f.lineage_id===r.lineage_id&&nonempty(f.text??f.reason))||nonempty(input.feedback?.overall))){r.rationale+=' Deterministic feedback variation: request a supplier-specific confirmation before adoption.';r.uncertainty_notes.push('Feedback changed this proposal; review again.');}}
 }
 if(scenario.id==='malformed')base.recommendations[0].sources[0].exact_text='Injected incorrect evidence';
 validateAnalysis(base,documents);
 return base;
}
// Schema-equivalent shape validation plus evidence, precision and finite-number semantic checks.
export function validateAnalysis(result,documents){
 const errors=schemaErrors(result);const e=s=>errors.push(s);
 if(result.contract_version!=='1.0'||!nonempty(result.run_id)||!nonempty(result.input_fingerprint))e('Invalid result envelope');
 if(!['simulated','live'].includes(result.generation_mode)||!['completed','partial','failed'].includes(result.status))e('Invalid mode/status');
 if(result.generation_mode==='simulated'&&!nonempty(result.fixture_scenario_id))e('Simulation scenario missing');
 if(!Array.isArray(result.recommendations)||!Array.isArray(result.warnings)||!Array.isArray(result.errors))e('Result collections missing');
 if(errors.length)fail('OUTPUT_INVALID','Analysis output is invalid.',errors);
 if(result.status==='failed'&&(result.recommendations.length||!result.errors.length))e('Failed result must have errors and no recommendations');
 if(result.status==='partial'&&(!result.recommendations.length||!result.errors.length))e('Partial result must have valid subset and errors');
 const ids=new Set();
 for(const r of result.recommendations){
  for(const k of ['id','lineage_id','work_scope_key','original_material','proposed_material','rationale'])if(!nonempty(r[k]))e(`Missing ${k}`);
  if(ids.has(r.id))e('Duplicate recommendation ID');ids.add(r.id);
  if(!nonempty(r.quantity?.unit)||(r.quantity?.value!==null&&(!finite(r.quantity?.value)||r.quantity.value<=0)))e('Invalid quantity/unit');
  if(!r.methodology||!['source','version','basis'].every(k=>nonempty(r.methodology[k])))e('Missing methodology');
  if(!Array.isArray(r.missing_data_reasons)||!Array.isArray(r.uncertainty_notes))e('Missing uncertainty/reason arrays');
  const keys=['baseline_cost_thb','selected_cost_thb','cost_saving_thb','baseline_carbon_tco2e','selected_carbon_tco2e','carbon_reduction_tco2e'];
  for(const k of keys)if(r.impacts?.[k]!==null&&!finite(r.impacts?.[k]))e(`Nonfinite/missing impact ${k}`);
  for(const k of keys.filter(k=>k.startsWith('baseline')||k.startsWith('selected')))if(finite(r.impacts?.[k])&&r.impacts[k]<0)e(`Negative total ${k}`);
  for(const [b,s,d] of [['baseline_cost_thb','selected_cost_thb','cost_saving_thb'],['baseline_carbon_tco2e','selected_carbon_tco2e','carbon_reduction_tco2e']]){
   const v=r.impacts??{};if(finite(v[b])&&finite(v[s])){if(!finite(v[d])||Math.abs((v[b]-v[s])-v[d])>1e-8*Math.max(1,Math.abs(v[b]),Math.abs(v[s])))e(`Inconsistent ${d}`);}else if(v[d]!==null)e(`Derived ${d} must be null when basis is missing`);
  }
  if((r.quantity?.value===null||keys.some(k=>r.impacts?.[k]===null))&&!r.missing_data_reasons?.length)e('Missing data requires a reason');
  if(!r.sources?.length)e('Source evidence is required');
  for(const s of r.sources??[]){
   const d=documents.find(d=>(d.id??d.document_version_id)===s.document_version_id);const f=fixtures.find(f=>f.fixture_id===d?.fixture_id);
   if(!d||d.upload_state!=='READY'||!f||d.checksum!==f.checksum){e('Source is not an exact ready mapped version');continue;}
   const l=s.locator;
   if(!l||!['paragraph','page','sheet_cell'].includes(l.kind))e('Invalid locator kind');
   if(l?.kind==='paragraph'&&(!Number.isInteger(l.paragraph_index)||l.paragraph_index<1))e('Invalid paragraph locator');
   if(l?.kind==='page'&&(!Number.isInteger(l.page_number)||l.page_number<1))e('Invalid page locator');
   if(l?.kind==='sheet_cell'&&(!nonempty(l.sheet_name)||!/^\$?[A-Z]+\$?[1-9]\d*(?::\$?[A-Z]+\$?[1-9]\d*)?$/.test(l.cell_range)))e('Invalid spreadsheet locator');
   if(!f.extraction.some(x=>x.exact_text===s.exact_text&&stable(x.locator)===stable(l)))e('Exact evidence text/locator does not match fixture content');
  }
 }
 if(errors.length)fail('OUTPUT_INVALID','Analysis output failed contract/evidence validation.',errors);
 return true;
}
export function summarize(recommendations,reviews={}){
 const chosen=recommendations.filter(r=>(reviews[r.id]?.decision??reviews[r.id])==='APPROVED');const unique=[];const seen=new Set();const duplicates=[];
 for(const r of chosen){if(seen.has(r.work_scope_key)){duplicates.push(r.work_scope_key);continue;}seen.add(r.work_scope_key);unique.push(r);}
 const metric=(key)=>{const known=unique.filter(r=>finite(r.impacts[key]));return {subtotal:known.length?known.reduce((n,r)=>n+r.impacts[key],0):unique.length?null:0,known:known.length,total:unique.length,incomplete:known.length<unique.length};};
 return {approved:chosen.length,rejected:recommendations.filter(r=>(reviews[r.id]?.decision??reviews[r.id])==='REJECTED').length,unreviewed:recommendations.filter(r=>!['APPROVED','REJECTED'].includes(reviews[r.id]?.decision??reviews[r.id])).length,unique_scopes:unique.length,duplicate_scopes:[...new Set(duplicates)],cost:metric('cost_saving_thb'),carbon:metric('carbon_reduction_tco2e')};
}
export function finalizeGuard(run,reviews,{stale=false,omitFailures=false,omissionReason=''}={}){
 const summary=summarize(run.recommendations,reviews);const reasons=[];
 if(stale)reasons.push('Source inputs changed; run analysis again.');
 if(!['completed','partial'].includes(run.status))reasons.push('Analysis has not completed.');
 if(summary.unreviewed)reasons.push('Every recommendation needs an approve or reject decision.');
 if(summary.duplicate_scopes.length)reasons.push('Choose one approved alternative per work scope.');
 if(run.status==='partial'&&(!omitFailures||!nonempty(omissionReason)))reasons.push('Resolve failed sources or record explicit omission and reason.');
 return {allowed:reasons.length===0,reasons,summary};
}
export function carryReviews(previous,current,previousReviews){
 const reviews={};for(const r of current){const old=previous.find(x=>x.lineage_id===r.lineage_id&&x.work_scope_key===r.work_scope_key);const review=old&&previousReviews[old.id];
 const content=x=>{const {id,...rest}=x;return rest;};
 reviews[r.id]=review?.decision==='APPROVED'&&review.locked&&stable(content(old))===stable(content(r))?{...review}:{decision:'UNREVIEWED',locked:false};}
 return reviews;
}
export function executionState(pkg){
 const q=pkg.quantity?.value??pkg.snapshot?.quantity?.value;const unit=pkg.quantity?.unit??pkg.snapshot?.quantity?.unit;
 const allEntries=pkg.implementation_entries??[];const entries=allEntries.filter(e=>!allEntries.some(c=>c.corrects_id&&c.corrects_id===e.id));const sum=kind=>entries.filter(e=>e.kind===kind&&e.unit===unit).reduce((n,e)=>n+e.quantity,0);
 const delivered=sum('delivery'),installed=sum('install');const covered=finite(q)&&q>0&&installed>=q;
 const blocking=(pkg.issues??[]).some(i=>i.status!=='RESOLVED'&&i.blocks_verification);
 const latest=[...(pkg.verifications??[])].sort((a,b)=>String(b.verified_at??b.created_at).localeCompare(String(a.verified_at??a.created_at)))[0];
 const pass=latest?.result==='PASS'&&nonempty(latest.verifier_id)&&nonempty(latest.notes)&&(latest.evidence_ids??[]).some(id=>(pkg.evidence_files??[]).some(e=>e.id===id&&e.upload_state==='READY'));
 const complete=covered&&pass&&!blocking;
 const status=pkg.superseded_at?'SUPERSEDED':complete?'COMPLETE':covered?'INSTALLED':finite(q)&&q>0&&delivered>=q?'DELIVERED':pkg.procurement?'PROCUREMENT':'APPROVED';
 return {status,delivered,installed,remaining:finite(q)?Math.max(0,q-installed):null,verification:latest?.result??'PENDING',complete,blocking};
}
export function implementationGuard(pkg,entry){
 const target=entry.corrects_id?(pkg.implementation_entries??[]).find(e=>e.id===entry.corrects_id):null;
 const source=target?{...pkg,implementation_entries:(pkg.implementation_entries??[]).filter(e=>e.id!==target.id)}:pkg;
 const s=executionState(source),q=pkg.quantity?.value??pkg.snapshot?.quantity?.value,unit=pkg.quantity?.unit??pkg.snapshot?.quantity?.unit;
 const reasons=[];if(!['delivery','install'].includes(entry.kind)||!finite(entry.quantity)||entry.quantity<0)reasons.push('Valid nonnegative delivery/install quantity is required.');
 if(entry.unit!==unit)reasons.push('Unit must match the approved package.');
 if(entry.corrects_id&&(!target||target.kind!==entry.kind||(pkg.implementation_entries??[]).some(e=>e.corrects_id===entry.corrects_id)))reasons.push('Correction must target an uncorrected entry of the same kind.');
 if(entry.corrects_id&&!nonempty(entry.notes))reasons.push('Correction requires a reason.');
 if((entry.kind==='install'?s.installed+entry.quantity:s.installed)>(entry.kind==='delivery'?s.delivered+entry.quantity:s.delivered))reasons.push('Installation cannot exceed delivered quantity.');
 if(entry.kind==='delivery'&&finite(q)&&s.delivered+entry.quantity>q&&!nonempty(entry.variance_reason))reasons.push('Overdelivery requires a reason.');
 return {allowed:!reasons.length,reasons};
}
export function procurementGuard(pkg,p){
 const reasons=[];const q=pkg.quantity?.value??pkg.snapshot?.quantity?.value;const unit=pkg.quantity?.unit??pkg.snapshot?.quantity?.unit;
 const order=['APPROVED','RFQ','SUPPLIER_SELECTED','PO_ISSUED','SHIPPING','DELIVERED','ACCEPTED'];const index=order.indexOf(p.status);
 if(index<0)reasons.push('Invalid procurement status');
 if(index>=1&&(!nonempty(p.owner_id)||!finite(p.ordered_qty)||p.ordered_qty<=0))reasons.push('RFQ needs an owner and ordered quantity.');
 if(index>=1&&(p.ordered_qty!==q||p.unit!==unit)&&!nonempty(p.variance_reason))reasons.push('Order variance requires a reason.');
 if(index>=2&&!nonempty(p.supplier_name))reasons.push('Select a supplier.');
 if(index>=3&&!nonempty(p.po_reference))reasons.push('PO reference required.');
 if(index>=4&&!nonempty(p.expected_delivery_at))reasons.push('Expected delivery date required.');
 if(index>=5&&executionState(pkg).delivered<p.ordered_qty)reasons.push('Delivery quantity does not cover the order.');
 if(index>=6&&(!nonempty(p.accepted_by)||!nonempty(p.accepted_at)))reasons.push('Accepting member and date required.');
 return {allowed:!reasons.length,reasons};
}
export function actualCompleteness(actual,metric){return !!actual&&finite(actual.total_value)&&actual.total_value>=0&&actual.unit===(metric==='cost'?'THB':'tCO2e')&&nonempty(actual.source_description)&&nonempty(actual.methodology)&&['simulated','recorded'].includes(actual.provenance);}
export function projectCompletion(packages){const active=packages.filter(p=>!p.superseded_at);return {started:active.length>0,complete:active.length>0&&active.every(p=>executionState(p).complete),total:active.length,completed:active.filter(p=>executionState(p).complete).length};}
export function revisionPlan(items,document){
 const fixture=fixtures.find(f=>f.fixture_id===document.fixture_id);const changes=[],unapplied=[];
 for(const item of items.filter(i=>i.decision==='APPROVED')){const r=item.snapshot??item;const sources=r.sources.filter(s=>s.document_version_id===(document.id??document.document_version_id));
  for(const s of sources){const occurrences=fixture?.extraction.filter(x=>x.exact_text===s.exact_text)??[];
   if(!fixture||!fixture.filename.endsWith('.docx')||s.locator.kind!=='paragraph'||occurrences.length!==1||stable(occurrences[0].locator)!==stable(s.locator)){unapplied.push({recommendation_id:r.id,reason:'Only an exact unambiguous fixture DOCX paragraph can be replaced.'});continue;}
   if(changes.some(c=>c.paragraph_index===s.locator.paragraph_index)){unapplied.push({recommendation_id:r.id,reason:'Multiple approved changes target the same paragraph.'});continue;}
   if(r.final_wording!=null&&!nonempty(r.final_wording))fail('INPUT_INCOMPLETE','Approved wording cannot be empty.');
   changes.push({recommendation_id:r.id,paragraph_index:s.locator.paragraph_index,before:s.exact_text,after:r.final_wording??`${r.proposed_material} for ${r.quantity.value??'the approved quantity'} ${r.quantity.unit}.`});
  }
 }
 return {changes,unapplied,status:unapplied.length?'PARTIAL':'READY_FOR_REVIEW',generation_mode:'simulated'};
}
export function dueNotifications(pkg,now=new Date()){
 const result=[];const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);const add=(kind,target,recipient)=>{if(recipient)result.push({kind,target_id:target,recipient_id:recipient,dedup_key:`${kind}:${target}:${day}`});};
 for(const t of pkg.tasks??[])if(t.status!=='DONE'&&t.due_at&&new Date(t.due_at)<now)add('TASK_OVERDUE',t.id,t.assignee_id??pkg.owner_id);
 const s=executionState(pkg);if(pkg.procurement?.expected_delivery_at&&new Date(pkg.procurement.expected_delivery_at)<now&&s.delivered<pkg.procurement.ordered_qty)add('DELIVERY_LATE',pkg.id,pkg.owner_id);
 if(s.status==='INSTALLED'&&pkg.installed_at&&now-new Date(pkg.installed_at)>86400000)add('VERIFICATION_PENDING',pkg.id,pkg.owner_id);
 for(const i of pkg.issues??[])if(i.status!=='RESOLVED'&&i.blocks_verification&&now-new Date(i.created_at)>86400000)add('BLOCKING_ISSUE',i.id,i.owner_id??pkg.owner_id);
 return result;
}






