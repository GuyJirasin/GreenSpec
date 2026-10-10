import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup,as,scalar,project,mutate,seedRun,owner,viewer,outsider} from '../../qa/backend.test.mjs';
const change=(db,r,key,opt='B',wording=null,version=r.row_version)=>scalar(db,'select gs_review_change($1,$2,$3,$4,$5) value',[r.id,version,opt,wording,key]);
async function alternate(db,p,run){const payload={...run.payload,proposed_material:'Alternative concrete',impacts:{...run.payload.impacts,cost_saving_thb:5,selected_cost_thb:95,carbon_reduction_tco2e:12,selected_carbon_tco2e:8}};await db.query('insert into recommendation_options(project_id,recommendation_id,option_key,payload,default_wording) values($1,$2,$3,$4,$5)',[p.id,run.id,'B',JSON.stringify(payload),'Alternative concrete for 10 m3.']);return payload;}
test('choice edit authorization, lock, optimistic conflicts, replay and mandatory re-review',async()=>{
 const db=await setup();try{
 const p=await project(db),run=await seedRun(db,p.id,{review:'APPROVED'});await db.query('update analysis_runs set input_snapshot=$1 where id=$2',[JSON.stringify({context:{name:p.name,description:p.description}}),run.run]);await alternate(db,p,run);
 await as(db,owner,()=>scalar(db,'select gs_member($1,$2,$3) value',[p.id,'viewer@example.test','viewer']));
 await as(db,viewer,()=>assert.rejects(()=>change(db,run.review,'viewer'),/UNAUTHORIZED/));
 await as(db,outsider,async()=>{assert.equal((await db.query('select * from recommendation_options')).rows.length,0);await assert.rejects(()=>change(db,run.review,'outside'),/UNAUTHORIZED/);});
 await as(db,owner,async()=>{
 await assert.rejects(()=>db.query("update reviews set selected_option='B'"),/permission denied/);
 await assert.rejects(()=>scalar(db,'select gs_finish_analysis($1,$2,$3) value',[run.run,'{}','[]']),/permission denied/);
 await assert.rejects(()=>change(db,run.review,'null','B',null,null),/VERSION_CONFLICT/);
 let locked=await mutate(db,p.id,'reviews',{locked:true},run.review,'lock');
 await assert.rejects(()=>change(db,locked,'locked'),/REVIEW_LOCKED/);
 await assert.rejects(()=>mutate(db,p.id,'reviews',{decision:'REJECTED',locked:false},locked,'bypass'),/REVIEW_LOCKED/);
 const unlocked=await mutate(db,p.id,'reviews',{locked:false},locked,'unlock');
 const edited=await change(db,unlocked,'edit','B','ใช้คอนกรีตคาร์บอนต่ำ พร้อมเอกสารรับรองผู้ผลิต');assert.equal(edited.decision,'UNREVIEWED');assert.equal(edited.selected_option,'B');assert.equal(edited.draft_wording,'ใช้คอนกรีตคาร์บอนต่ำ พร้อมเอกสารรับรองผู้ผลิต');
 assert.deepEqual(await change(db,unlocked,'edit','A','ignored'),edited);
 await assert.rejects(()=>change(db,unlocked,'stale'),/VERSION_CONFLICT/);
 await assert.rejects(()=>change(db,edited,'empty','B','  '),/WORDING_INVALID/);
 const epoch=await scalar(db,'select review_epoch value from analysis_runs where id=$1',[run.run]);
 await assert.rejects(()=>scalar(db,'select gs_finalize($1,$2,$3) value',[run.run,epoch,'unreviewed']),/UNRESOLVED_REVIEW/);
 const approved=await mutate(db,p.id,'reviews',{decision:'APPROVED'},edited,'approve');
 const current=await scalar(db,'select review_epoch value from analysis_runs where id=$1',[run.run]);
 const set=await scalar(db,'select gs_finalize($1,$2,$3) value',[run.run,current,'final']);
 const item=await scalar(db,'select to_jsonb(i) value from decision_items i where decision_set_id=$1',[set.id]);
 assert.equal(item.snapshot.proposed_material,'Alternative concrete');assert.equal(item.snapshot.final_wording,'ใช้คอนกรีตคาร์บอนต่ำ พร้อมเอกสารรับรองผู้ผลิต');assert.equal(item.snapshot.wording_edited,true);assert.equal(set.summary_snapshot.cost_saving_thb,5);assert.equal(set.summary_snapshot.carbon_reduction_tco2e,12);
 assert.match(item.snapshot.estimate_note,/not been used/);
 await assert.rejects(()=>change(db,approved,'frozen','A',null),/REVIEW_FROZEN/);
 const pkg=(await scalar(db,'select gs_handoff($1,$2,$3) value',[set.id,[item.id],'handoff'])).packages[0];assert.equal(pkg.snapshot.final_wording,'ใช้คอนกรีตคาร์บอนต่ำ พร้อมเอกสารรับรองผู้ผลิต');
 const reopened=await scalar(db,'select gs_reopen($1,$2) value',[set.id,'reopen']);
 const copied=await scalar(db,'select to_jsonb(v) value from reviews v join recommendations c on c.id=v.recommendation_id where c.run_id=$1',[reopened.id]);assert.equal(copied.selected_option,'B');assert.equal(copied.draft_wording,'ใช้คอนกรีตคาร์บอนต่ำ พร้อมเอกสารรับรองผู้ผลิต');assert.equal(copied.locked,false);
 const set2=await scalar(db,'select gs_finalize($1,$2,$3) value',[reopened.id,reopened.review_epoch,'refinal']);assert.equal(await scalar(db,'select gs_decision_equivalent($1,$2) value',[set.id,set2.id]).catch(()=>null),null); // private helper is not browser callable
 const item2=await scalar(db,'select id value from decision_items where decision_set_id=$1',[set2.id]);assert.equal((await scalar(db,'select gs_handoff($1,$2,$3) value',[set2.id,[item2],'rehand'])).packages[0].id,pkg.id);
 });
 await assert.rejects(()=>db.exec('update recommendation_options set default_wording=\'tampered\''),/IMMUTABLE/);
 }finally{await db.close();}
});
test('service-generated choices keep canonical source and quantity; invalid options roll back',async()=>{
 const db=await setup();try{
 const p=await project(db);const template=await seedRun(db,p.id);
 const id=await scalar(db,"insert into analysis_runs(project_id,input_snapshot,input_fingerprint,scenario,status,request_id) values($1,'{}','f','success','QUEUED','worker') returning id value",[p.id]);
 const payload={...template.payload,id:'source-id'};const result={contract_version:'1.0',run_id:id,generation_mode:'simulated',status:'completed',recommendations:[payload],warnings:[],errors:[]};
 const bad=[{option_key:'B',payload:{...payload,quantity:{value:99,unit:'m3'}},default_wording:'Bad'}];
 await assert.rejects(()=>scalar(db,'select gs_finish_analysis($1,$2,$3) value',[id,JSON.stringify(result),JSON.stringify(bad)]),/OUTPUT_INVALID/);
 assert.equal(await scalar(db,'select status value from analysis_runs where id=$1',[id]),'QUEUED');
 const opts=[{option_key:'B',payload:{...payload,proposed_material:'Other mix'},default_wording:'Other mix for 10 m3.'}];
 await scalar(db,'select gs_finish_analysis($1,$2) value',[id,JSON.stringify(result)]);
 const beforeBackfill=await scalar(db,'select to_jsonb(r) value from analysis_runs r where id=$1',[id]);
 const beforeReview=await scalar(db,'select to_jsonb(v) value from reviews v join recommendations c on c.id=v.recommendation_id where c.run_id=$1',[id]);
 await scalar(db,'select gs_finish_analysis($1,$2,$3) value',[id,JSON.stringify(result),JSON.stringify(opts)]);
 assert.deepEqual(await scalar(db,'select to_jsonb(r) value from analysis_runs r where id=$1',[id]),beforeBackfill);
 assert.deepEqual(await scalar(db,'select to_jsonb(v) value from reviews v join recommendations c on c.id=v.recommendation_id where c.run_id=$1',[id]),beforeReview);
 const rows=(await db.query('select o.* from recommendation_options o join recommendations c on c.id=o.recommendation_id where c.run_id=$1',[id])).rows;assert.equal(rows.length,2);assert.equal(rows.find(r=>r.option_key==='B').payload.proposed_material,'Other mix');
 const historical=await seedRun(db,p.id,{review:'APPROVED'});const finalized=await as(db,owner,()=>scalar(db,'select gs_finalize($1,1,$2) value',[historical.run,'history-final']));
 const frozen=await scalar(db,'select snapshot value from decision_items where decision_set_id=$1',[finalized.id]);
 await scalar(db,'select gs_finish_analysis($1,$2,$3) value',[historical.run,'{}',JSON.stringify([{option_key:'B',payload:historical.payload,default_wording:'Should not be added'}])]);
 assert.equal(await scalar(db,'select count(*)::integer value from recommendation_options where recommendation_id=$1',[historical.id]),1);
 assert.deepEqual(await scalar(db,'select snapshot value from decision_items where decision_set_id=$1',[finalized.id]),frozen);
 }finally{await db.close();}
});



test('unchanged parent carries locked B and custom wording; changed proposal needs fresh review',async()=>{
 const db=await setup();try{
 const p=await project(db),parent=await seedRun(db,p.id);await alternate(db,p,parent);
 const edited=await as(db,owner,()=>change(db,parent.review,'parent-edit','B','ข้อความฉบับปรับปรุง'));
 await as(db,owner,()=>mutate(db,p.id,'reviews',{decision:'APPROVED',locked:true},edited,'parent-approved'));
 for(const changed of [false,true]){
 const id=await scalar(db,"insert into analysis_runs(project_id,parent_run_id,input_snapshot,input_fingerprint,scenario,status,request_id) values($1,$2,'{}','f','success','QUEUED',$3) returning id value",[p.id,parent.run,changed?'changed':'same']);
 const rec={...parent.payload,id:'worker-rec',...(changed?{proposed_material:'Changed proposal'}:{})};
 const result={contract_version:'1.0',run_id:id,generation_mode:'simulated',status:'completed',recommendations:[rec],warnings:[],errors:[]};
 await scalar(db,'select gs_finish_analysis($1,$2) value',[id,JSON.stringify(result)]);
 const review=await scalar(db,'select to_jsonb(v) value from reviews v join recommendations c on c.id=v.recommendation_id where c.run_id=$1',[id]);
 assert.equal(review.decision,changed?'UNREVIEWED':'APPROVED');assert.equal(review.locked,!changed);assert.equal(review.selected_option,changed?'A':'B');assert.equal(review.draft_wording,changed?null:'ข้อความฉบับปรับปรุง');
 }
 }finally{await db.close();}
});


