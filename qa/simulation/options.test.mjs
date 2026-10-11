import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnalysis,fixtures,validateAnalysis,revisionPlan} from './domain.mjs';
import {proposalOptions,generateAlternativeOptions} from './options.mjs';
const docs=[{...fixtures.find(f=>f.fixture_id==='office-spec'),id:'source-version',upload_state:'READY'}];
const result=()=>createAnalysis({request_id:'options-test',context:{name:'Office',description:'Fixture comparison'},generation_mode:'simulated',fixture_scenario_id:'success'},docs);
test('fixture A/B have distinct tradeoffs and keep exact source/quantity without mutating canonical output',()=>{
 const original=result(),before=structuredClone(original);
 for(const rec of original.recommendations){
  const [a,b]=proposalOptions(rec);
  assert.deepEqual(a.payload,rec);
  assert.deepEqual(b.payload.sources,rec.sources);
  assert.deepEqual(b.payload.quantity,rec.quantity);
  assert.ok(b.payload.impacts.selected_cost_thb>a.payload.impacts.selected_cost_thb);
  assert.ok(b.payload.impacts.selected_carbon_tco2e<a.payload.impacts.selected_carbon_tco2e);
  assert.equal(b.payload.impacts.cost_saving_thb,b.payload.impacts.baseline_cost_thb-b.payload.impacts.selected_cost_thb);
  assert.equal(validateAnalysis({...original,recommendations:[b.payload]},docs),true);
 }
 assert.deepEqual(original,before);
 assert.equal(generateAlternativeOptions(original.recommendations).length,6);
});
test('unknown alternative metrics stay unknown rather than deriving zero or fake figures',()=>{
 const rec=result().recommendations[0];rec.impacts.baseline_cost_thb=null;rec.impacts.selected_cost_thb=null;rec.impacts.cost_saving_thb=null;rec.impacts.baseline_carbon_tco2e=null;rec.impacts.selected_carbon_tco2e=null;rec.impacts.carbon_reduction_tco2e=null;
 const b=proposalOptions(rec)[1].payload;
 assert.equal(b.impacts.cost_saving_thb,null);assert.equal(b.impacts.carbon_reduction_tco2e,null);
});
test('approved edited wording including Thai and XML characters reaches exact DOCX plan; estimates stay unchanged',()=>{
 const rec=proposalOptions(result().recommendations[0])[1].payload,before=structuredClone(rec.impacts);
 const final_wording='ใช้คอนกรีต C30 พร้อมข้อมูล A & B <ตามแบบ> และเอกสารจากผู้ผลิต';
 const plan=revisionPlan([{decision:'APPROVED',snapshot:{...rec,selected_option:'B',final_wording,wording_edited:true}}],docs[0]);
 assert.equal(plan.changes[0].after,final_wording);assert.deepEqual(rec.impacts,before);
});
test('legacy snapshots retain existing revision wording and explicit empty edited text is blocked',()=>{
 const rec=result().recommendations[0];const legacy=revisionPlan([{decision:'APPROVED',snapshot:rec}],docs[0]);assert.match(legacy.changes[0].after,/for 1000 m3/);
 assert.throws(()=>revisionPlan([{decision:'APPROVED',snapshot:{...rec,final_wording:'   '}}],docs[0]),{code:'INPUT_INCOMPLETE'});
});


import JSZip from 'jszip';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {reviseDocx} from './revision.mjs';
test('actual DOCX stores edited Thai text and XML characters while preserving original bytes and every other zip part',async()=>{
 const rec=proposalOptions(result().recommendations[0])[1].payload;
 const wording='ใช้คอนกรีต C30 พร้อมข้อมูล A & B <ตามแบบ> และเอกสารจากผู้ผลิต';
 const source=readFileSync(new URL('fixtures/office-spec.docx',import.meta.url));
 const before=createHash('sha256').update(source).digest('hex');
 const plan=revisionPlan([{decision:'APPROVED',snapshot:{...rec,selected_option:'B',final_wording:wording,wording_edited:true}}],docs[0]);
 const output=await reviseDocx(source,plan,JSZip);
 assert.equal(output.status,'READY_FOR_REVIEW');assert.equal(output.changes[0].after,wording);
 const oldZip=await JSZip.loadAsync(source),newZip=await JSZip.loadAsync(output.bytes);
 const xml=await newZip.file('word/document.xml').async('string');
 assert.ok(xml.includes('A &amp; B &lt;ตามแบบ&gt;'));assert.ok(xml.includes('ใช้คอนกรีต C30'));
 for(const name of Object.keys(oldZip.files).filter(k=>!oldZip.files[k].dir&&k!=='word/document.xml'))assert.deepEqual(await oldZip.file(name).async('uint8array'),await newZip.file(name).async('uint8array'));
 assert.equal(createHash('sha256').update(readFileSync(new URL('fixtures/office-spec.docx',import.meta.url))).digest('hex'),before);
});
