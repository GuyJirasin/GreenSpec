import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup,as,scalar,project,mutate,owner,editor,viewer,outsider} from '../../qa/db-helpers.mjs';

const checksum='a'.repeat(64);
const exactText='Specified minimum compressive strength: 35 MPa at 28 days.';
const locator={kind:'page',page_number:2};
const extraction=[{exact_text:exactText,locator}];

async function service(db,fn){
 await db.exec('set role service_role');
 try{return await fn();}finally{await db.exec('reset role');}
}

async function uploadedDocument(db,p){
 const doc=await as(db,owner,()=>mutate(db,p.id,'documents',{title:'Project specification',type:'SPEC'}));
 const version=await as(db,owner,()=>scalar(db,'select gs_begin_upload($1,$2,$3,$4,$5,$6) value',[p.id,doc.id,'project-spec.pdf','application/pdf',4096,'live-upload']));
 const ready=await service(db,()=>scalar(db,'select gs_commit_upload($1,$2,$3,$4) value',[version.id,checksum,null,JSON.stringify([])]));
 return {doc,version:ready};
}

function livePayload(version,runId,{forged=false,fingerprint}={}){
 const source={document_version_id:version.id,exact_text:forged?'35 MPa (forged source text)':exactText,locator};
 return {
  contract_version:'1.0',run_id:runId,input_fingerprint:fingerprint,generation_mode:'live',
  fixture_scenario_id:null,status:'completed',warnings:[],errors:[],
  recommendations:[{
   id:'provider-rec-1',lineage_id:'concrete',work_scope_key:'structure/concrete',
   original_material:'Specified concrete',proposed_material:'Lower-carbon concrete',
   rationale:'Candidate with a verified source excerpt.',quantity:{value:10,unit:'m3'},sources:[source],
   methodology:{source:'Supplier submission and project specification',version:'1',basis:'Evidence-backed estimate'},
   impacts:{baseline_cost_thb:1200,selected_cost_thb:1100,cost_saving_thb:100,baseline_carbon_tco2e:2,selected_carbon_tco2e:1.5,carbon_reduction_tco2e:0.5},
   missing_data_reasons:[],uncertainty_notes:['Confirm final mix design before procurement.']
  }]
 };
}

function optionsFor(result){
 const recommendation=result.recommendations[0];
 return ['A','B'].map(option_key=>({
  option_key,
  payload:{...recommendation,...(option_key==='B'?{proposed_material:'Alternative low-carbon concrete'}:{})},
  default_wording:option_key==='B'?'Use the alternative low-carbon concrete mix.':'Use the specified concrete mix.'
 }));
}

test('live READY arbitrary documents, service-only extraction, authorization, evidence rollback and decision snapshots',async()=>{
 const db=await setup();
 try{
  const p=await project(db);
  await as(db,owner,()=>scalar(db,'select gs_member($1,$2,$3) value',[p.id,'editor@example.test','editor']));
  const {version}=await uploadedDocument(db,p);

  await as(db,owner,()=>assert.rejects(
   ()=>scalar(db,'select gs_begin_live_analysis($1,$2,$3,$4) value',[p.id,'live-run','initial',[version.id]]),
   /DEMO_SOURCE_UNSUPPORTED/
  ));
  await as(db,owner,()=>assert.rejects(
   ()=>scalar(db,'select gs_set_extraction($1,$2,$3) value',[version.id,checksum,JSON.stringify(extraction)]),
   /permission denied/
  ));
  const extracted=await service(db,()=>scalar(db,'select gs_set_extraction($1,$2,$3) value',[version.id,checksum,JSON.stringify(extraction)]));
  assert.deepEqual(extracted.extraction,extraction);
  assert.deepEqual(await scalar(db,'select extraction value from document_versions where id=$1',[version.id]),extraction);
  assert.equal(extracted.fixture_id,null);
  assert.equal(extracted.provenance,'uploaded');
  await service(db,()=>assert.rejects(
   ()=>scalar(db,'select gs_set_extraction($1,$2,$3) value',[version.id,checksum,JSON.stringify([{exact_text:'Different source text',locator}])]),
   /OUTPUT_INVALID/
  ));
  await service(db,()=>assert.rejects(
   ()=>db.query("update document_versions set filename='renamed.pdf' where id=$1",[version.id]),
   /IMMUTABLE_SOURCE/
  ));

  await as(db,viewer,()=>assert.rejects(
   ()=>scalar(db,'select gs_begin_live_analysis($1,$2,$3,$4) value',[p.id,'viewer-run','initial',[version.id]]),
   /UNAUTHORIZED/
  ));
  await as(db,outsider,()=>assert.rejects(
   ()=>scalar(db,'select gs_begin_live_analysis($1,$2,$3,$4) value',[p.id,'outsider-run','initial',[version.id]]),
   /UNAUTHORIZED/
  ));
  const run=await as(db,owner,()=>scalar(db,'select gs_begin_live_analysis($1,$2,$3,$4) value',[p.id,'live-run','initial',[version.id]]));
  assert.equal(run.status,'QUEUED');
  assert.equal(run.mode,'live');
  assert.equal(run.input_snapshot.generation_mode,'live');
  assert.equal(run.input_snapshot.fixture_scenario_id,null);
  assert.equal(run.input_snapshot.document_versions[0].fixture_id,null);
  const memberReplay=await as(db,editor,()=>scalar(db,'select gs_begin_live_analysis($1,$2,$3,$4) value',[p.id,'live-run','initial',[version.id]]));
  assert.equal(memberReplay.id,run.id);

  const forged=livePayload(version,run.id,{forged:true,fingerprint:run.input_fingerprint});
  await as(db,owner,()=>assert.rejects(
   ()=>scalar(db,'select gs_finish_analysis($1,$2,$3) value',[run.id,JSON.stringify(forged),JSON.stringify(optionsFor(forged))]),
   /permission denied/
  ));
  await assert.rejects(
   ()=>service(db,()=>scalar(db,'select gs_finish_analysis($1,$2,$3) value',[run.id,JSON.stringify(forged),JSON.stringify(optionsFor(forged))])),
   /OUTPUT_INVALID/
  );
  assert.equal(await scalar(db,'select status value from analysis_runs where id=$1',[run.id]),'QUEUED');
  assert.equal(await scalar(db,'select count(*)::integer value from recommendations where run_id=$1',[run.id]),0);
  assert.equal(await scalar(db,'select count(*)::integer value from source_references sr join recommendations c on c.id=sr.recommendation_id where c.run_id=$1',[run.id]),0);

  const result=livePayload(version,run.id,{fingerprint:run.input_fingerprint});
  const completed=await service(db,()=>scalar(db,'select gs_finish_analysis($1,$2,$3) value',[run.id,JSON.stringify(result),JSON.stringify(optionsFor(result))]));
  assert.equal(completed.status,'COMPLETED');
  assert.equal(completed.mode,'live');
  assert.equal(completed.result.generation_mode,'live');
  assert.equal(completed.result.recommendations.length,1);
  assert.deepEqual(await scalar(db,"select jsonb_build_object('document_version_id',sr.document_version_id,'exact_text',sr.exact_text,'locator',sr.locator) value from source_references sr join recommendations c on c.id=sr.recommendation_id where c.run_id=$1",[run.id]),{
   document_version_id:version.id,exact_text:exactText,locator
  });
  assert.deepEqual((await db.query("select option_key from recommendation_options where recommendation_id=(select id from recommendations where run_id=$1) order by option_key",[run.id])).rows.map(r=>r.option_key),['A','B']);

  const review=await scalar(db,'select to_jsonb(v) value from reviews v join recommendations c on c.id=v.recommendation_id where c.run_id=$1',[run.id]);
  const changed=await as(db,owner,()=>scalar(db,'select gs_review_change($1,$2,$3,$4,$5) value',[review.id,review.row_version,'B','Manual wording approved for this project.','live-review-edit']));
  assert.equal(changed.selected_option,'B');
  assert.equal(changed.draft_wording,'Manual wording approved for this project.');
  assert.equal(changed.decision,'UNREVIEWED');
  const epoch=await scalar(db,'select review_epoch value from analysis_runs where id=$1',[run.id]);
  await as(db,owner,()=>assert.rejects(()=>scalar(db,'select gs_finalize($1,$2,$3) value',[run.id,epoch,'premature-final']),/UNRESOLVED_REVIEW/));

  const approved=await as(db,owner,()=>mutate(db,p.id,'reviews',{decision:'APPROVED'},changed,'live-review-approve'));
  const approvedEpoch=await scalar(db,'select review_epoch value from analysis_runs where id=$1',[run.id]);
  const finalized=await as(db,owner,()=>scalar(db,'select gs_finalize($1,$2,$3) value',[run.id,approvedEpoch,'live-final']));
  assert.equal(finalized.summary_snapshot.generation_mode,'live');
  assert.equal(finalized.summary_snapshot.approved,1);
  const item=await scalar(db,'select to_jsonb(i) value from decision_items i where decision_set_id=$1',[finalized.id]);
  assert.equal(item.snapshot.generation_mode,'live');
  assert.equal(item.snapshot.selected_option,'B');
  assert.equal(item.snapshot.final_wording,'Manual wording approved for this project.');
  assert.equal(item.decision,'APPROVED');
  const recommendationId=await scalar(db,'select recommendation_id value from decision_items where id=$1',[item.id]);
  await assert.rejects(
   ()=>db.query("update recommendation_options set default_wording='Changed after generation' where recommendation_id=$1 and option_key='B'",[recommendationId]),
   /IMMUTABLE/
  );

  const revision=await as(db,owner,()=>scalar(db,'select gs_begin_revision($1,$2,$3) value',[finalized.id,version.id,'live-revision']));
  assert.equal(revision.mode,'live');
  assert.equal(revision.status,'REQUESTED');

  const reopened=await as(db,owner,()=>scalar(db,'select gs_reopen($1,$2) value',[finalized.id,'live-reopen']));
  assert.equal(reopened.mode,'live');
  assert.equal(reopened.input_snapshot.generation_mode,'live');
  assert.equal(reopened.result.generation_mode,'live');
  const copiedReview=await scalar(db,'select to_jsonb(v) value from reviews v join recommendations c on c.id=v.recommendation_id where c.run_id=$1',[reopened.id]);
  assert.equal(copiedReview.selected_option,'B');
  assert.equal(copiedReview.draft_wording,'Manual wording approved for this project.');
  assert.equal(await scalar(db,'select count(*)::integer value from recommendation_options o join recommendations c on c.id=o.recommendation_id where c.run_id=$1 and o.option_key in (\'A\',\'B\')',[reopened.id]),2);
  assert.equal(approved.decision,'APPROVED');
 }finally{await db.close();}
});
