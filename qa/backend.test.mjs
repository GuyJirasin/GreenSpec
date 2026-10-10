import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const migrations=process.env.GREEN_SPEC_MIGRATIONS || resolve(root,'backend/supabase/migrations');
const owner='00000000-0000-4000-8000-000000000001',editor='00000000-0000-4000-8000-000000000002',viewer='00000000-0000-4000-8000-000000000003',outsider='00000000-0000-4000-8000-000000000004';
export {setup,as,scalar,project,mutate,seedRun,owner,editor,viewer,outsider};
let key=0;
async function setup(){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,owner uuid,metadata jsonb);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
 grant usage on schema storage to anon,authenticated,service_role;grant select,insert,update,delete on storage.objects to authenticated;
 insert into auth.users(id,email) values('${owner}','owner@example.test'),('${editor}','editor@example.test'),('${viewer}','viewer@example.test'),('${outsider}','outsider@example.test');`);
 for(const f of readdirSync(migrations).filter(f=>f.endsWith('.sql')).sort()){
  // PGlite lacks pgcrypto; migrations use core gen_random_uuid, not cryptographic extension functions.
  const sql=readFileSync(resolve(migrations,f),'utf8').replace(/create extension if not exists pgcrypto;/gi,'');
  try{await db.exec(sql)}catch(e){throw new Error(`Migration ${f}: ${e.message}`,{cause:e});}
 }
 return db;
}
async function as(db,user,fn){await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${user}',false);`);try{return await fn()}finally{await db.exec('reset role');}}
async function scalar(db,sql,args=[]){return (await db.query(sql,args)).rows[0]?.value;}
async function project(db){return as(db,owner,()=>scalar(db,'select gs_create_project($1,$2) value',['Test project','Test context']));}
async function mutate(db,p,kind,data,record=null,request=`qa-${++key}`){return scalar(db,'select gs_mutate($1,$2,$3,$4,$5,$6) value',[p,kind,record?.id??null,record?.row_version??null,JSON.stringify(data),request]);}
async function seedRun(db,p,{status='COMPLETED',scope='structure/concrete',review='UNREVIEWED',parent=null,material='Low carbon concrete'}={}){
 const run=await scalar(db,"insert into analysis_runs(project_id,parent_run_id,input_snapshot,input_fingerprint,scenario,status,request_id) values($1,$2,'{}','fingerprint','success',$3,$4) returning id value",[p,parent,status,`run-${++key}`]);
 const id=crypto.randomUUID();const payload={id,lineage_id:'concrete',work_scope_key:scope,original_material:'Conventional concrete',proposed_material:material,rationale:'Fixture',quantity:{value:10,unit:'m3'},sources:[],methodology:{source:'fixture',version:'1',basis:'simulated'},impacts:{baseline_cost_thb:100,selected_cost_thb:90,cost_saving_thb:10,baseline_carbon_tco2e:20,selected_carbon_tco2e:10,carbon_reduction_tco2e:10},missing_data_reasons:[],uncertainty_notes:[]};
 await db.query('insert into recommendations(id,project_id,run_id,lineage_id,work_scope_key,payload) values($1,$2,$3,$4,$5,$6)',[id,p,run,'concrete',scope,JSON.stringify(payload)]);
 const r=await scalar(db,'insert into reviews(project_id,recommendation_id,decision) values($1,$2,$3) returning to_jsonb(reviews.*) value',[p,id,review]);
 return {run,id,review:r,payload};
}
test('migrations and role access: owner/editor/viewer/nonmember, archive, immutable audit',async()=>{
 const db=await setup();try{
  const p=await project(db);
  await as(db,owner,()=>scalar(db,'select gs_member($1,$2,$3) value',[p.id,'editor@example.test','editor']));
  await as(db,owner,()=>scalar(db,'select gs_member($1,$2,$3) value',[p.id,'viewer@example.test','viewer']));
  for(const member of [owner,editor,viewer])await as(db,member,async()=>assert.equal((await db.query('select * from projects')).rows.length,1));
  await as(db,outsider,async()=>{
   assert.equal((await db.query('select * from projects')).rows.length,0);
   await assert.rejects(()=>mutate(db,p.id,'documents',{title:'Foreign',type:'SPEC'}),/UNAUTHORIZED/);
   await assert.rejects(()=>scalar(db,'select gs_archive($1,true,1) value',[p.id]),/UNAUTHORIZED/);
  });
  await as(db,viewer,()=>assert.rejects(()=>mutate(db,p.id,'documents',{title:'Forbidden',type:'SPEC'}),/UNAUTHORIZED/));
  await as(db,editor,async()=>{
   const doc=await mutate(db,p.id,'documents',{title:'Draft',type:'SPEC'});assert.equal(doc.current_version_id,null);
   await assert.rejects(()=>scalar(db,'select gs_member($1,$2,$3) value',[p.id,'outsider@example.test','owner']),/UNAUTHORIZED/);
   await assert.rejects(()=>db.query('update documents set title=$1 where id=$2',['Direct write',doc.id]),/permission denied/);
  });
  await as(db,owner,()=>assert.rejects(()=>scalar(db,'select gs_member($1,$2,$3,true) value',[p.id,'owner@example.test','owner']),/LAST_OWNER/));
  const archived=await as(db,owner,()=>scalar(db,'select gs_archive($1,true,1) value',[p.id]));
  await as(db,editor,()=>assert.rejects(()=>mutate(db,p.id,'documents',{title:'Archived',type:'SPEC'}),/PROJECT_ARCHIVED/));
  await as(db,owner,()=>scalar(db,'select gs_archive($1,false,$2) value',[p.id,archived.row_version]));
  await assert.rejects(()=>db.exec("update activity_events set event='tamper'"),/IMMUTABLE/);
 }finally{await db.close()}
});
test('optimistic conflicts, request replay, assignment and cross-project denial',async()=>{
 const db=await setup();try{
  const p=await project(db),p2=await project(db);
  await as(db,owner,async()=>{
   const doc=await mutate(db,p.id,'documents',{title:'A',type:'SPEC'},null,'same-key');
   const replay=await mutate(db,p.id,'documents',{title:'B',type:'SPEC'},null,'same-key');assert.equal(doc.id,replay.id);
   assert.equal((await db.query('select * from documents')).rows.length,1);
   const saved=await mutate(db,p.id,'documents',{title:'New'},doc);
   await assert.rejects(()=>mutate(db,p.id,'documents',{title:'Overwrite'},doc),/VERSION_CONFLICT/);
   assert.equal(saved.row_version,2);
   await assert.rejects(()=>mutate(db,p2.id,'documents',{title:'Cross project'},saved),/UNAUTHORIZED/);
   await assert.rejects(()=>mutate(db,p.id,'documents',{project_id:p2.id}),/FIELD_NOT_MUTABLE/);
  });
 }finally{await db.close()}
});
test('finalization guard and immutable snapshot, approved-only idempotent handoff',async()=>{
 const db=await setup();try{
  const p=await project(db);const {run,review}=await seedRun(db,p.id);
  await as(db,owner,()=>assert.rejects(()=>scalar(db,'select gs_finalize($1,1,$2) value',[run,'f1']),/UNRESOLVED_REVIEW/));
  await as(db,owner,()=>mutate(db,p.id,'reviews',{decision:'APPROVED',locked:true},review));
  const epoch=await scalar(db,'select review_epoch value from analysis_runs where id=$1',[run]);
  const set=await as(db,owner,()=>scalar(db,'select gs_finalize($1,$2,$3) value',[run,epoch,'f1']));
  assert.equal(set.summary_snapshot.approved,1);
  await assert.rejects(()=>db.query("update decision_sets set summary_snapshot='{}' where id=$1",[set.id]),/IMMUTABLE/);
  await as(db,owner,()=>assert.rejects(()=>mutate(db,p.id,'reviews',{decision:'REJECTED'},{...review,row_version:2}),/REVIEW_FROZEN/));
  const item=await scalar(db,'select id value from decision_items where decision_set_id=$1',[set.id]);
  const handed=await as(db,owner,()=>scalar(db,'select gs_handoff($1,$2,$3) value',[set.id,[item],'h1']));
  const replay=await as(db,owner,()=>scalar(db,'select gs_handoff($1,$2,$3) value',[set.id,[item],'h2']));
  assert.equal(handed.packages[0].id,replay.packages[0].id);
  assert.equal((await db.query('select * from packages')).rows.length,1);
  await as(db,owner,()=>assert.rejects(()=>scalar(db,'select gs_handoff($1,$2,$3) value',[set.id,[crypto.randomUUID()],'bad']),/HANDOFF_APPROVED_ONLY/));
 }finally{await db.close()}
});
test('execution quantities, task membership, issues and actuals remain independent',async()=>{
 const db=await setup();try{
  const p=await project(db),r=await seedRun(db,p.id,{review:'APPROVED'});
  const set=await as(db,owner,()=>scalar(db,'select gs_finalize($1,1,$2) value',[r.run,'f']));
  const item=await scalar(db,'select id value from decision_items where decision_set_id=$1',[set.id]);
  const pkg=(await as(db,owner,()=>scalar(db,'select gs_handoff($1,$2,$3) value',[set.id,[item],'h']))).packages[0];
  await as(db,owner,async()=>{
   await assert.rejects(()=>mutate(db,p.id,'tasks',{package_id:pkg.id,title:'Bad assignment',assignee_id:outsider,status:'TODO',priority:'normal'}),/ASSIGNEE_NOT_EDITOR/);
   const task=await mutate(db,p.id,'tasks',{package_id:pkg.id,title:'Approve PO',assignee_id:owner,status:'TODO',priority:'normal'});
   const done=await mutate(db,p.id,'tasks',{status:'DONE'},task);assert.ok(done.completed_at);
   await assert.rejects(()=>mutate(db,p.id,'implementation_entries',{package_id:pkg.id,kind:'install',quantity:1,unit:'m3'}),/INSTALLATION_EXCEEDS_DELIVERY/);
   await mutate(db,p.id,'implementation_entries',{package_id:pkg.id,kind:'delivery',quantity:5,unit:'m3'});
   assert.equal(await scalar(db,'select execution_status value from packages where id=$1',[pkg.id]),'APPROVED');
   await mutate(db,p.id,'implementation_entries',{package_id:pkg.id,kind:'install',quantity:5,unit:'m3'});
   await assert.rejects(()=>mutate(db,p.id,'implementation_entries',{package_id:pkg.id,kind:'delivery',quantity:6,unit:'m3'}),/OVERDELIVERY_REASON_REQUIRED/);
   await mutate(db,p.id,'implementation_entries',{package_id:pkg.id,kind:'delivery',quantity:5,unit:'m3'});
   await mutate(db,p.id,'implementation_entries',{package_id:pkg.id,kind:'install',quantity:5,unit:'m3'});
   assert.equal(await scalar(db,'select execution_status value from packages where id=$1',[pkg.id]),'INSTALLED');
   const issue=await mutate(db,p.id,'issues',{package_id:pkg.id,title:'Evidence needed',severity:'critical',status:'OPEN'});
   await assert.rejects(()=>mutate(db,p.id,'issues',{status:'RESOLVED'},issue),/RESOLUTION_REQUIRED/);
   await mutate(db,p.id,'issues',{status:'RESOLVED',resolution:'Inspected'},issue);
   const cost=await mutate(db,p.id,'actual_results',{package_id:pkg.id,metric:'cost',total_value:0,unit:'THB',source_description:'Recorded invoice',methodology:'Total paid',provenance:'recorded'});
   assert.equal(Number(cost.total_value),0);
   await assert.rejects(()=>mutate(db,p.id,'actual_results',{package_id:pkg.id,metric:'carbon',total_value:1,unit:'tCO2e',source_description:'',methodology:'Unknown'}),/ACTUAL_METHOD_SOURCE_REQUIRED/);
  });
 }finally{await db.close()}
});
test('unchanged lineage reuses package; changed started execution creates issue without overwriting',async()=>{
 const db=await setup();try{
  const p=await project(db);const a=await seedRun(db,p.id,{review:'APPROVED'});
  const set=await as(db,owner,()=>scalar(db,'select gs_finalize($1,1,$2) value',[a.run,'fa']));
  const item=await scalar(db,'select id value from decision_items where decision_set_id=$1',[set.id]);
  const pkg=(await as(db,owner,()=>scalar(db,'select gs_handoff($1,$2,$3) value',[set.id,[item],'ha']))).packages[0];
  const b=await seedRun(db,p.id,{review:'APPROVED',parent:a.run});
  const set2=await as(db,owner,()=>scalar(db,'select gs_finalize($1,1,$2) value',[b.run,'fb']));
  const item2=await scalar(db,'select id value from decision_items where decision_set_id=$1',[set2.id]);
  const same=await as(db,owner,()=>scalar(db,'select gs_handoff($1,$2,$3) value',[set2.id,[item2],'hb']));
  assert.equal(same.packages[0].id,pkg.id);
  await as(db,owner,()=>mutate(db,p.id,'tasks',{package_id:pkg.id,title:'Started',assignee_id:owner,status:'IN_PROGRESS',priority:'normal'}));
  const c=await seedRun(db,p.id,{review:'APPROVED',parent:b.run,material:'Changed selected material'});
  const set3=await as(db,owner,()=>scalar(db,'select gs_finalize($1,1,$2) value',[c.run,'fc']));
  const item3=await scalar(db,'select id value from decision_items where decision_set_id=$1',[set3.id]);
  const blocked=await as(db,owner,()=>scalar(db,'select gs_handoff($1,$2,$3,$4) value',[set3.id,[item3],'hc','Reviewed replacement']));
  assert.equal(blocked.code,'EXECUTION_STARTED');
  assert.equal((await db.query('select * from packages')).rows.length,1);
  assert.equal((await db.query('select * from issues where requires_feature1_review')).rows.length,1);
  assert.equal((await db.query('select snapshot from packages')).rows[0].snapshot.proposed_material,'Low carbon concrete');
 }finally{await db.close()}
});
test('partial omission reason, stale inputs, missing reviews, overlap and empty finalization',async()=>{
 const db=await setup();try{
  const p=await project(db),partial=await seedRun(db,p.id,{review:'APPROVED',status:'PARTIAL'});
  await as(db,owner,async()=>{
   await assert.rejects(()=>scalar(db,'select gs_finalize($1,1,$2,true) value',[partial.run,'omit']),/OMISSION_REASON|SOURCE_OMISSION/);
   const s=await scalar(db,'select gs_finalize($1,1,$2,true,$3) value',[partial.run,'omit','Additional fixture source deliberately omitted']);assert.ok(s.summary_snapshot);
  });
  const stale=await seedRun(db,p.id,{review:'APPROVED'});await db.query('update analysis_runs set stale=true where id=$1',[stale.run]);
  await as(db,owner,()=>assert.rejects(()=>scalar(db,'select gs_finalize($1,1,$2) value',[stale.run,'stale']),/INPUT_STALE/));
  const missing=await seedRun(db,p.id);await db.query('delete from reviews where id=$1',[missing.review.id]);
  await as(db,owner,()=>assert.rejects(()=>scalar(db,'select gs_finalize($1,1,$2) value',[missing.run,'missing']),/UNRESOLVED_REVIEW/));
  const empty=await scalar(db,"insert into analysis_runs(project_id,input_snapshot,input_fingerprint,scenario,status,request_id) values($1,'{}','f','zero','COMPLETED','zero') returning id value",[p.id]);
  const final=await as(db,owner,()=>scalar(db,'select gs_finalize($1,1,$2) value',[empty,'zero-final']));assert.equal(final.summary_snapshot.approved,0);
  const out=await as(db,owner,()=>scalar(db,'select gs_handoff($1,$2,$3) value',[final.id,[],'zero-handoff']));assert.deepEqual(out.packages,[]);
 }finally{await db.close()}
});
test('verification evidence, completion without actuals, regression, notifications dedup',async()=>{
 const db=await setup();try{
  const p=await project(db),r=await seedRun(db,p.id,{review:'APPROVED'});
  const s=await as(db,owner,()=>scalar(db,'select gs_finalize($1,1,$2) value',[r.run,'fv']));
  const item=await scalar(db,'select id value from decision_items where decision_set_id=$1',[s.id]);
  const pkg=(await as(db,owner,()=>scalar(db,'select gs_handoff($1,$2,$3) value',[s.id,[item],'hv']))).packages[0];
  await as(db,owner,async()=>{
   await mutate(db,p.id,'implementation_entries',{package_id:pkg.id,kind:'delivery',quantity:10,unit:'m3'});
   await mutate(db,p.id,'implementation_entries',{package_id:pkg.id,kind:'install',quantity:10,unit:'m3'});
   await assert.rejects(()=>scalar(db,'select gs_verify($1,$2,$3,$4) value',[pkg.id,'PASS','Checked',[]]),/EVIDENCE_REQUIRED/);
  });
  const evidence=await scalar(db,"insert into evidence_files(project_id,package_id,storage_path,filename,mime,kind,upload_state,uploaded_by) values($1,$2,'test/path','proof.png','image/png','installation','READY',$3) returning id value",[p.id,pkg.id,owner]);
  await as(db,owner,()=>scalar(db,'select gs_verify($1,$2,$3,$4) value',[pkg.id,'PASS','Checked installed quantity',[evidence]]));
  assert.equal(await scalar(db,'select execution_status value from packages where id=$1',[pkg.id]),'COMPLETE');
  assert.equal((await db.query('select * from actual_results')).rows.length,0);
  await as(db,owner,()=>scalar(db,'select gs_verify($1,$2,$3,$4) value',[pkg.id,'NON_CONFORMANCE','Remediation required',[evidence]]));
  assert.equal(await scalar(db,'select execution_status value from packages where id=$1',[pkg.id]),'INSTALLED');
  await as(db,owner,()=>mutate(db,p.id,'tasks',{package_id:pkg.id,title:'Overdue',assignee_id:owner,due_at:'2020-01-01T00:00:00Z',status:'TODO',priority:'normal'}));
  await as(db,owner,async()=>{await scalar(db,'select gs_evaluate_notifications($1) value',[p.id]);await scalar(db,'select gs_evaluate_notifications($1) value',[p.id]);});
  assert.equal(Number(await scalar(db,"select count(*) value from notifications where kind='TASK_OVERDUE'")),1);
  assert.equal(await scalar(db,"select recipient_id value from notifications where kind='TASK_OVERDUE'"),owner);
 }finally{await db.close()}
});
