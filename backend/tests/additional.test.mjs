import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup,as,scalar,project,mutate,seedRun,owner,viewer,outsider} from '../../qa/backend.test.mjs';
import {createAnalysis,fixtures} from '../../shared/domain.mjs';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const fixture=fixtures.find(f=>f.fixture_id==='office-spec');
async function source(db,p,key='source'){
 const doc=await as(db,owner,()=>mutate(db,p.id,'documents',{title:fixture.title,type:fixture.type},null,key+'doc'));
 const version=await as(db,owner,()=>scalar(db,'select gs_begin_upload($1,$2,$3,$4,$5,$6) value',[p.id,doc.id,fixture.filename,fixture.mime,fixture.bytes,key]));
 const ready=await scalar(db,'select gs_commit_upload($1,$2,$3,$4) value',[version.id,fixture.checksum,fixture.fixture_id,JSON.stringify(fixture.extraction)]);
 return {...ready,title:doc.title,type:doc.type};
}
async function analyze(db,p,doc,key='analyze',parent=null,feedback={}){
 const run=await as(db,owner,()=>scalar(db,'select gs_begin_analysis($1,$2,$3,$4,$5,$6) value',[p.id,key,'success',[doc.id],parent,JSON.stringify(feedback)]));
 const locked=parent?(await db.query("select lineage_id from recommendations c join reviews v on v.recommendation_id=c.id where c.run_id=$1 and v.locked and v.decision='APPROVED'",[parent])).rows.map(r=>r.lineage_id):[];
 const result=createAnalysis({...run.input_snapshot,run_id:run.id,locked_lineage_ids:locked},[doc]);
 const completed=await scalar(db,'select gs_finish_analysis($1,$2) value',[run.id,JSON.stringify(result)]);return completed;
}
test('registered private upload RLS, verified READY immutability and null optimistic versions',async()=>{
 const db=await setup();try{
  const p=await project(db),other=await project(db);
  await as(db,owner,()=>scalar(db,'select gs_member($1,$2,$3) value',[p.id,'viewer@example.test','viewer']));
  await as(db,outsider,()=>assert.rejects(()=>scalar(db,'select gs_archive($1,true,null) value',[p.id]),/UNAUTHORIZED/));
  await as(db,owner,()=>assert.rejects(()=>scalar(db,'select gs_archive($1,true,null) value',[p.id]),/VERSION_CONFLICT/));
  const doc=await as(db,owner,()=>mutate(db,p.id,'documents',{title:'Draft',type:'SPEC'}));
  const version=await as(db,owner,()=>scalar(db,'select gs_begin_upload($1,$2,$3,$4,$5,$6) value',[p.id,doc.id,fixture.filename,fixture.mime,fixture.bytes,'up']));
  await as(db,owner,()=>db.query("insert into storage.objects(bucket_id,name) values('documents',$1)",[version.storage_path]));
  await as(db,owner,()=>assert.rejects(()=>db.query("insert into storage.objects(bucket_id,name) values('documents',$1)",[`${other.id}/${doc.id}/${crypto.randomUUID()}`]),/row-level security/));
  await as(db,viewer,()=>assert.rejects(()=>db.query("insert into storage.objects(bucket_id,name) values('documents',$1)",[version.storage_path]),/row-level security/));
  await as(db,outsider,async()=>assert.equal((await db.query('select * from storage.objects')).rows.length,0));
  await as(db,owner,()=>assert.rejects(()=>scalar(db,'select gs_commit_upload($1,$2) value',[version.id,fixture.checksum]),/permission denied/));
  await scalar(db,'select gs_commit_upload($1,$2,$3,$4) value',[version.id,fixture.checksum,fixture.fixture_id,JSON.stringify(fixture.extraction)]);
  await assert.rejects(()=>db.query("update document_versions set checksum=$1 where id=$2",['0'.repeat(64),version.id]),/IMMUTABLE_SOURCE/);
  await as(db,owner,async()=>{
   assert.equal((await db.query("update storage.objects set name='tampered' returning *")).rows.length,0);
   assert.equal((await db.query('delete from storage.objects returning *')).rows.length,0);
   await assert.rejects(()=>scalar(db,'select gs_begin_upload($1,$2,$3,$4,$5,$6) value',[p.id,doc.id,'too-big.docx',fixture.mime,26214401,'bad']),/FILE_SIZE_INVALID/);
  });
 }finally{await db.close();}
});
test('Edge function bundled domain is byte-identical to canonical shared source',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../supabase/functions/_shared/domain/checksums.json',import.meta.url),'utf8'));
 for(const [file,checksum] of Object.entries(manifest)){
  const original=await readFile(new URL(`../../shared/${file}`,import.meta.url));const copy=await readFile(new URL(`../supabase/functions/_shared/domain/${file}`,import.meta.url));
  assert.deepEqual(copy,original);assert.equal(createHash('sha256').update(copy).digest('hex'),checksum);
 }
});
test('nonfinite PostgreSQL numeric input cannot be persisted as quantities or actual totals',async()=>{
 const db=await setup();try{
  const p=await project(db),run=await seedRun(db,p.id,{review:'APPROVED'});
  const set=await as(db,owner,()=>scalar(db,'select gs_finalize($1,1,$2) value',[run.run,'finite-final']));
  const item=await scalar(db,'select id value from decision_items where decision_set_id=$1',[set.id]);
  const pkg=(await as(db,owner,()=>scalar(db,'select gs_handoff($1,$2,$3) value',[set.id,[item],'finite-handoff']))).packages[0];
  await as(db,owner,async()=>{
   await assert.rejects(()=>mutate(db,p.id,'implementation_entries',{package_id:pkg.id,kind:'delivery',quantity:'NaN',unit:'m3',notes:'External nonfinite input'}),/implementation_quantity_finite/);
   await assert.rejects(()=>mutate(db,p.id,'procurements',{package_id:pkg.id,status:'APPROVED',ordered_qty:'Infinity',unit:'m3',variance_reason:'External nonfinite input'}),/procurement_quantity_finite/);
   for(const total of ['NaN','Infinity','-Infinity'])await assert.rejects(()=>mutate(db,p.id,'actual_results',{package_id:pkg.id,metric:'cost',unit:'THB',total_value:total,source_description:'Recorded invoice',methodology:'Invoice sum',provenance:'recorded'}),/actual_value_finite|check constraint/);
  });
 }finally{await db.close();}
});
test('actual fixture job persistence, source locks, locked iteration and stale reopened versions',async()=>{
 const db=await setup();try{
  const p=await project(db),doc=await source(db,p);
  const queued=await as(db,owner,()=>scalar(db,'select gs_begin_analysis($1,$2,$3,$4) value',[p.id,'first','success',[doc.id]]));
  await as(db,owner,()=>assert.rejects(()=>scalar(db,'select gs_finish_analysis($1,$2) value',[queued.id,'{}']),/permission denied/));
  await as(db,owner,()=>assert.rejects(()=>scalar(db,'select gs_begin_upload($1,$2,$3,$4,$5,$6) value',[p.id,doc.document_id,fixture.filename,fixture.mime,fixture.bytes,'replace-active']),/JOB_ACTIVE/));
  const result=createAnalysis({...queued.input_snapshot,run_id:queued.id},[doc]);
  const done=await scalar(db,'select gs_finish_analysis($1,$2) value',[queued.id,JSON.stringify(result)]);assert.equal(done.status,'COMPLETED');assert.equal(done.result.recommendations.length,3);
  const reviews=(await db.query('select * from reviews where project_id=$1 order by id',[p.id])).rows;
  const locked=await as(db,owner,()=>mutate(db,p.id,'reviews',{decision:'APPROVED',locked:true},reviews[0]));
  for(const review of reviews.slice(1))await as(db,owner,()=>mutate(db,p.id,'reviews',{decision:'REJECTED'},review));
  const next=await analyze(db,p,doc,'iterate',done.id,{overall:'Confirm supplier evidence'});
  const nextReviews=(await db.query('select v.*,c.lineage_id from reviews v join recommendations c on c.id=v.recommendation_id where c.run_id=$1',[next.id])).rows;
  assert.equal(nextReviews.filter(r=>r.decision==='APPROVED'&&r.locked).length,1);assert.equal(nextReviews.filter(r=>r.decision==='UNREVIEWED').length,2);
  for(const review of nextReviews.filter(r=>r.decision==='UNREVIEWED'))await as(db,owner,()=>mutate(db,p.id,'reviews',{decision:'REJECTED'},review));
  const epoch=await scalar(db,'select review_epoch value from analysis_runs where id=$1',[next.id]);
  await as(db,owner,()=>assert.rejects(()=>scalar(db,'select gs_finalize($1,null,$2) value',[next.id,'null-epoch']),/VERSION_CONFLICT/));
  const set=await as(db,owner,()=>scalar(db,'select gs_finalize($1,$2,$3) value',[next.id,epoch,'final']));
  const replacement=await as(db,owner,()=>scalar(db,'select gs_begin_upload($1,$2,$3,$4,$5,$6) value',[p.id,doc.document_id,fixture.filename,fixture.mime,fixture.bytes,'replacement']));
  await scalar(db,'select gs_commit_upload($1,$2,$3,$4) value',[replacement.id,fixture.checksum,fixture.fixture_id,JSON.stringify(fixture.extraction)]);
  const reopened=await as(db,owner,()=>scalar(db,'select gs_reopen($1,$2) value',[set.id,'reopen']));assert.equal(reopened.stale,true);
 }finally{await db.close();}
});
test('persisted revision stages, separate generated output and explicit excluded approval snapshot',async()=>{
 const db=await setup();try{
  const p=await project(db),doc=await source(db,p);const run=await analyze(db,p,doc);
  const reviews=(await db.query('select * from reviews where project_id=$1',[p.id])).rows;
  for(const review of reviews)await as(db,owner,()=>mutate(db,p.id,'reviews',{decision:'APPROVED'},review));
  const epoch=await scalar(db,'select review_epoch value from analysis_runs where id=$1',[run.id]);
  const set=await as(db,owner,()=>scalar(db,'select gs_finalize($1,$2,$3) value',[run.id,epoch,'final']));
  const revision=await as(db,owner,()=>scalar(db,'select gs_begin_revision($1,$2,$3) value',[set.id,doc.id,'revision']));assert.equal(revision.status,'REQUESTED');
  await as(db,owner,()=>assert.rejects(()=>scalar(db,'select gs_finish_revision($1,$2,$3,$4,$5) value',[revision.id,'READY_FOR_REVIEW',null,'[]','[]']),/permission denied/));
  const unapplied=[{recommendation_id:'not-applied',reason:'Ambiguous source mapping'}];
  const output=await scalar(db,'select gs_finish_revision($1,$2,$3,$4,$5,$6,$7) value',[revision.id,'PARTIAL',`${p.id}/revisions/${revision.id}.docx`,'[]',JSON.stringify(unapplied),'a'.repeat(64),123]);
  assert.ok(output.output_version_id);assert.notEqual(output.output_version_id,doc.id);assert.equal(await scalar(db,'select checksum value from document_versions where id=$1',[doc.id]),fixture.checksum);
  await as(db,owner,()=>assert.rejects(()=>scalar(db,'select gs_approve_revision($1,null,$2) value',[output.id,'[]']),/VERSION_CONFLICT/));
  await as(db,owner,()=>assert.rejects(()=>scalar(db,'select gs_approve_revision($1,$2,$3) value',[output.id,output.row_version,'[]']),/EXCLUSION_REASON_REQUIRED/));
  const exclusion=[{recommendation_id:'not-applied',reason:'Explicitly deferred for manual review'}];
  const approved=await as(db,owner,()=>scalar(db,'select gs_approve_revision($1,$2,$3) value',[output.id,output.row_version,JSON.stringify(exclusion)]));assert.equal(approved.status,'APPROVED');assert.deepEqual(approved.exclusions,exclusion);assert.equal(approved.approved_by,owner);
  const replay=await as(db,owner,()=>scalar(db,'select gs_begin_revision($1,$2,$3) value',[set.id,doc.id,'revision']));assert.equal(replay.id,approved.id);
  const unchanged=await as(db,owner,()=>scalar(db,'select gs_reopen($1,$2) value',[set.id,'unchanged-reopen']));
  const unchangedSet=await as(db,owner,()=>scalar(db,'select gs_finalize($1,$2,$3) value',[unchanged.id,unchanged.review_epoch,'unchanged-final']));
  assert.equal(await scalar(db,'select outdated value from document_revisions where id=$1',[approved.id]),false);
  const changed=await as(db,owner,()=>scalar(db,'select gs_reopen($1,$2) value',[unchangedSet.id,'changed-reopen']));
  const changedReviews=(await db.query('select v.* from reviews v join recommendations c on c.id=v.recommendation_id where c.run_id=$1',[changed.id])).rows;
  for(const review of changedReviews)await as(db,owner,()=>mutate(db,p.id,'reviews',{decision:'REJECTED'},review));
  const changedEpoch=await scalar(db,'select review_epoch value from analysis_runs where id=$1',[changed.id]);
  await as(db,owner,()=>scalar(db,'select gs_finalize($1,$2,$3) value',[changed.id,changedEpoch,'changed-final']));
  assert.equal(await scalar(db,'select outdated value from document_revisions where id=$1',[approved.id]),true);
  const historical=await as(db,owner,()=>scalar(db,'select gs_begin_revision($1,$2,$3) value',[set.id,doc.id,'historical-revision']));assert.equal(historical.outdated,true);
 }finally{await db.close();}
});
