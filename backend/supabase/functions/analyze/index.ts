import {clients,rpc,json,error,method} from '../_shared/http.ts';
import {createProvider,prepareLive,executeRun} from './orchestrator.mjs';

Deno.serve(async(req)=>{
 const early=method(req);if(early)return early;let body:any;
 try{
  body=await req.json();const {user,admin}=await clients(req);
  const live=body.generation_mode==='live'||body.scenario==='live';
  if(body.generation_mode&&!['live','simulated'].includes(body.generation_mode))throw {code:'INPUT_INCOMPLETE',message:'Unknown analysis mode.'};
  const provider=live?createProvider(Deno.env.get('SERVER_AI_URL'),req.headers.get('Authorization')):null;
  if(live)await prepareLive(body,user,admin,provider);
  const run=await rpc(user,live?'gs_begin_live_analysis':'gs_begin_analysis',{
   p_project_id:body.project_id,p_request_id:body.request_id,p_scenario:live?'live':body.scenario??body.fixture_scenario_id,
   p_document_ids:body.document_version_ids,p_parent_run_id:body.parent_run_id??null,p_feedback:body.feedback??{}
  });
  if(!['QUEUED','PROCESSING'].includes(run.status))return json(run);
  EdgeRuntime.waitUntil(executeRun(run,admin,provider));return json(run,202);
 }catch(e){return error(e,body?.request_id);}
});
