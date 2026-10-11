import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup,as,scalar,project,owner} from '../../qa/db-helpers.mjs';
test('live-only migration disables example creation and preserves honest source and option creation',async()=>{
 const db=await setup();try{
  const p=await project(db);
  await as(db,owner,()=>assert.rejects(()=>scalar(db,'select gs_begin_analysis($1,$2,$3,$4,$5,$6) value',[p.id,'test','success',[],null,'{}']),/permission denied/));
  await assert.rejects(()=>db.query("insert into analysis_runs(project_id,input_snapshot,input_fingerprint,scenario,status,request_id,mode) values($1,'{}','test','success','QUEUED','old','simulated')",[p.id]),/LIVE_ANALYSIS_REQUIRED/);
  const rid=await scalar(db,"insert into analysis_runs(project_id,input_snapshot,input_fingerprint,scenario,status,request_id) values($1,'{}','test','live','QUEUED','new') returning id value",[p.id]);
  assert.equal(await scalar(db,'select mode value from analysis_runs where id=$1',[rid]),'live');
  await db.query("insert into recommendations(project_id,run_id,lineage_id,work_scope_key,payload) values($1,$2,'test','test','{}')",[p.id,rid]);
  assert.equal(await scalar(db,'select count(*)::integer value from recommendation_options'),0);
  await assert.rejects(()=>db.query("insert into decision_sets(project_id,run_id,version_no,finalized_by,summary_snapshot) values($1,$2,1,$3,'{\"generation_mode\":\"simulated\"}')",[p.id,rid,owner]),/LIVE_ANALYSIS_REQUIRED/);
 }finally{await db.close();}
});
