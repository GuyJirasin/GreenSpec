import { generateAlternativeOptions } from '../_shared/domain/options.mjs';
import { createAnalysis, validateAnalysis } from '../_shared/domain/domain.mjs';
import { clients,rpc,json,error,method } from '../_shared/http.ts';
Deno.serve(async(req)=>{
 const early=method(req);if(early)return early;let body:any;
 try {
  body=await req.json(); const {user,admin}=await clients(req);
  const run=await rpc(user,'gs_begin_analysis',{p_project_id:body.project_id,p_request_id:body.request_id,p_scenario:body.scenario??body.fixture_scenario_id,p_document_ids:body.document_version_ids,p_parent_run_id:body.parent_run_id??null,p_feedback:body.feedback??{}});
  if(!['QUEUED','PROCESSING'].includes(run.status))return json(run);
  const work=async()=>{
   try {
    const {data:inputs,error:e}=await admin.from('analysis_inputs').select('document_version_id').eq('run_id',run.id);if(e)throw e;
    const ids=inputs.map((i:any)=>i.document_version_id);
    const {data:versions,error:vError}=await admin.from('document_versions').select('*').in('id',ids);if(vError)throw vError;
    const {data:metadata,error:mError}=await admin.from('documents').select('id,title,type').in('id',versions.map((v:any)=>v.document_id));if(mError)throw mError;
    const docs=versions.map((v:any)=>{const d=metadata.find((d:any)=>d.id===v.document_id);return {...v,title:d?.title,type:d?.type};});
    const input={...run.input_snapshot,run_id:run.id};
    if(run.parent_run_id){const {data:old}=await admin.from('recommendations').select('lineage_id,reviews(decision,locked)').eq('run_id',run.parent_run_id);input.locked_lineage_ids=(old??[]).filter((r:any)=>(Array.isArray(r.reviews)?r.reviews:[r.reviews]).some((v:any)=>v?.decision==='APPROVED'&&v?.locked)).map((r:any)=>r.lineage_id);}
    const {error:statusError}=await admin.from('analysis_runs').update({status:'PROCESSING',heartbeat_at:new Date().toISOString()}).eq('id',run.id).eq('status','QUEUED');if(statusError)throw statusError;
    const result=createAnalysis(input,docs);validateAnalysis(result,docs);
    await rpc(admin,'gs_finish_analysis',{p_run_id:run.id,p_result:result,p_options:generateAlternativeOptions(result.recommendations)});
   } catch(e:any) {
    const code=e.code&&String(e.code).length!==5?e.code:'JOB_FAILED';
    await rpc(admin,'gs_finish_analysis',{p_run_id:run.id,p_result:{contract_version:'1.0',run_id:run.id,input_fingerprint:run.input_fingerprint,generation_mode:'simulated',fixture_scenario_id:run.scenario,status:'failed',recommendations:[],warnings:[],errors:[{code,message:code==='OUTPUT_INVALID'?'Simulation output failed source/contract checks.':code==='DEMO_SOURCE_UNSUPPORTED'?'Selected sources do not match this scenario.':'Simulation job failed.',retryable:code==='JOB_FAILED'}]}});
   }
  };
  EdgeRuntime.waitUntil(work());return json(run,202);
 }catch(e){return error(e,body?.request_id);}
});



