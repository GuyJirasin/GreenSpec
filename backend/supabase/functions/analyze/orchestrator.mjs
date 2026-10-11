import {validateAnalysis} from '../_shared/domain/domain.mjs';

const fault=(code,message,retryable=false)=>Object.assign(new Error(message),{code,retryable});
const rpc=async(client,name,args)=>{const {data,error}=await client.rpc(name,args);if(error)throw error;return data;};
const rows=async(query)=>{const {data,error}=await query;if(error)throw error;return data??[];};
const stable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);

// Destination comes only from a server secret, never from browser input.
// Redirects are rejected so a bearer token cannot be forwarded to another host.
export function createProvider(base,authorization,fetcher=fetch){
 let destination;
 try{destination=new URL(base);}catch{throw fault('AI_NOT_CONFIGURED','Set SERVER_AI_URL to the GreenSpec JavaScript server.');}
 const local=['127.0.0.1','localhost'].includes(destination.hostname);
 if(destination.username||destination.password||destination.search||destination.hash||destination.pathname!=='/'||
   !(destination.protocol==='https:'&&destination.hostname.endsWith('.vercel.app')||local&&destination.protocol==='http:')){
  throw fault('AI_NOT_CONFIGURED','Use the GreenSpec Vercel project URL, or localhost for local testing.');
 }
 if(!authorization?.startsWith('Bearer '))throw fault('UNAUTHORIZED','Your session is required.');
 const deadline=Date.now()+125000;
 return async(path,body)=>{
  const timeout=Math.min(path==='analyze'?110000:45000,deadline-Date.now());
  if(timeout<=0)throw fault('JOB_FAILED','The analysis time limit was reached. Retry with fewer source files.',true);
  let response;
  try{response=await fetcher(new URL(`/api/workflow/${path}`,destination),{
   method:body===undefined?'GET':'POST',redirect:'error',
   headers:{Authorization:authorization,'Content-Type':'application/json'},
   ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(timeout)
  });}catch{throw fault('JOB_FAILED','The GreenSpec AI server could not be reached.',true);}
  let data;try{data=await response.json();}catch{throw fault('OUTPUT_INVALID','The GreenSpec AI server returned an invalid response.');}
  if(!response.ok){
   const allowed=['AI_NOT_CONFIGURED','UNAUTHORIZED','OUTPUT_INVALID','INPUT_INCOMPLETE','FILE_FORMAT_UNSUPPORTED','SOURCE_TEXT_UNAVAILABLE','SOURCE_TOO_LARGE','JOB_FAILED'];
   const code=allowed.includes(data.code)?data.code:'JOB_FAILED';
   throw fault(code,code==='AI_NOT_CONFIGURED'?'Set the server Typhoon key before starting live analysis.':'The GreenSpec AI operation could not finish.',code==='JOB_FAILED');
  }
  return data;
 };
}

export async function prepareLive(body,user,admin,provider){
 if(!Array.isArray(body.document_version_ids)||!body.document_version_ids.length||body.document_version_ids.length>20||
   !body.project_id||typeof body.request_id!=='string'||!body.request_id.trim())throw fault('INPUT_INCOMPLETE','Choose ready source documents and a request ID.');
 await rpc(user,'gs_check_edit',{p_project_id:body.project_id});
 const selected=await rows(user.from('document_versions').select('*').eq('project_id',body.project_id).in('id',body.document_version_ids));
 if(selected.length!==new Set(body.document_version_ids).size||selected.some(d=>d.upload_state!=='READY'||d.fixture_id||d.provenance==='fixture'))throw fault('INPUT_INCOMPLETE','Selected sources are unavailable or not ready.');
 const status=await provider('status');
 if(status.configured!==true)throw fault('AI_NOT_CONFIGURED','Set TYPHOON_API_KEY on the JavaScript server.');
 for(const doc of selected){
  if(doc.extraction?.length)continue;
  const extracted=await provider('extract',{document_version_id:doc.id});
  if(extracted.document_version_id!==doc.id||extracted.checksum!==doc.checksum||!Array.isArray(extracted.extraction)||!extracted.extraction.length)throw fault('OUTPUT_INVALID','Extraction does not match the selected source version.');
  await rpc(admin,'gs_set_extraction',{p_id:doc.id,p_checksum:doc.checksum,p_extraction:extracted.extraction});
 }
}

// Keep locked approved proposals and their A/B wording exactly as reviewed.
// SQL copies their chosen option and edited wording only when payload is unchanged.
export function preserveLocked(output,parents,parentOptions){
 const result=structuredClone(output.result),options=structuredClone(output.options);
 for(const parent of parents){
  const reviews=Array.isArray(parent.reviews)?parent.reviews:[parent.reviews];
  if(!reviews.some(r=>r?.decision==='APPROVED'&&r?.locked))continue;
  const matches=r=>r.lineage_id===parent.lineage_id&&r.work_scope_key===parent.work_scope_key;
  const incoming=result.recommendations.find(matches);
  const payload={...structuredClone(parent.payload),id:incoming?.id??parent.id};
  result.recommendations=result.recommendations.filter(r=>!matches(r));result.recommendations.push(payload);
  for(let i=options.length-1;i>=0;i--)if(matches(options[i].payload))options.splice(i,1);
  const saved=parentOptions.filter(o=>o.recommendation_id===parent.id);
  if(!saved.some(o=>o.option_key==='A'))throw fault('OUTPUT_INVALID','The locked proposal is missing its saved option.');
  for(const opt of saved)options.push({option_key:opt.option_key,payload:{...structuredClone(opt.payload),id:payload.id},default_wording:opt.default_wording});
 }
 return {result,options};
}

export function validateEnvelope(output,run,docs){
 if(!output||!Array.isArray(output.options)||output.result?.run_id!==run.id||output.result?.generation_mode!==run.mode||
   run.mode==='live'&&output.result?.input_fingerprint!==run.input_fingerprint)throw fault('OUTPUT_INVALID','Analysis response does not match this run.');
 validateAnalysis(output.result,docs);
 const keys=new Set();
 for(const opt of output.options){
  const base=output.result.recommendations.find(r=>r.lineage_id===opt.payload?.lineage_id&&r.work_scope_key===opt.payload?.work_scope_key);
  const key=JSON.stringify([opt.payload?.lineage_id,opt.payload?.work_scope_key,opt.option_key]);
  if(!base||!['A','B'].includes(opt.option_key)||keys.has(key)||typeof opt.default_wording!=='string'||!opt.default_wording.trim()||opt.default_wording.length>10000||
   stable(base.sources)!==stable(opt.payload.sources)||stable(base.quantity)!==stable(opt.payload.quantity))throw fault('OUTPUT_INVALID','Invalid proposal options or source references.');
  if(opt.option_key==='A'&&stable({...base,id:null})!==stable({...opt.payload,id:null}))throw fault('OUTPUT_INVALID','Option A differs from the canonical proposal.');
  for(const metric of ['baseline_cost_thb','baseline_carbon_tco2e'])if(opt.payload.impacts?.[metric]!==base.impacts?.[metric])throw fault('OUTPUT_INVALID','Options must compare against the same baseline.');
  keys.add(key);validateAnalysis({...output.result,recommendations:[opt.payload]},docs);
 }
 for(const rec of output.result.recommendations)if(!keys.has(JSON.stringify([rec.lineage_id,rec.work_scope_key,'A'])))throw fault('OUTPUT_INVALID','A proposal is missing Option A.');
 return output;
}

export async function executeRun(run,admin,provider,{schedule=setInterval,cancel=clearInterval}={}){
 if(run.mode!=='live'||typeof provider!=='function')throw fault('INPUT_INCOMPLETE','Only live document analysis is available.');
 // Only the worker that changes QUEUED -> PROCESSING may call the provider.
 const claimed=await rows(admin.from('analysis_runs').update({status:'PROCESSING',heartbeat_at:new Date().toISOString()}).eq('id',run.id).eq('status','QUEUED').select('id'));
 if(!claimed.length)return;
 const heartbeat=schedule(()=>{Promise.resolve(admin.from('analysis_runs').update({heartbeat_at:new Date().toISOString()}).eq('id',run.id).eq('status','PROCESSING')).catch(()=>{});},20000);
 try{
  const inputs=await rows(admin.from('analysis_inputs').select('document_version_id').eq('run_id',run.id));
  const versions=await rows(admin.from('document_versions').select('*').in('id',inputs.map(i=>i.document_version_id)));
  const metadata=await rows(admin.from('documents').select('id,title,type').in('id',versions.map(d=>d.document_id)));
  const docs=versions.map(v=>({...v,...Object.fromEntries(['title','type'].map(k=>[k,metadata.find(d=>d.id===v.document_id)?.[k]]))}));
  const parents=run.parent_run_id?await rows(admin.from('recommendations').select('id,lineage_id,work_scope_key,payload,reviews(decision,locked)').eq('run_id',run.parent_run_id)):[];
  let output;
   output=await provider('analyze',{run_id:run.id});
   // Check provider shape before accessing/preserving its recommendations.
   validateEnvelope(output,run,docs);
   const lockedIds=parents.filter(p=>(Array.isArray(p.reviews)?p.reviews:[p.reviews]).some(r=>r?.locked&&r.decision==='APPROVED')).map(p=>p.id);
   const parentOptions=lockedIds.length?await rows(admin.from('recommendation_options').select('*').in('recommendation_id',lockedIds)):[];
   output=preserveLocked(output,parents,parentOptions);
  validateEnvelope(output,run,docs);
  await rpc(admin,'gs_finish_analysis',{p_run_id:run.id,p_result:output.result,p_options:output.options});
 }catch(e){
  const allowed=['OUTPUT_INVALID','AI_NOT_CONFIGURED','INPUT_INCOMPLETE','UNAUTHORIZED','SOURCE_TEXT_UNAVAILABLE','SOURCE_TOO_LARGE','FILE_FORMAT_UNSUPPORTED'];
  const code=allowed.includes(e?.code)?e.code:'JOB_FAILED';
  await rpc(admin,'gs_finish_analysis',{p_run_id:run.id,p_options:[],p_result:{
   contract_version:'1.0',run_id:run.id,input_fingerprint:run.input_fingerprint,generation_mode:run.mode,
   fixture_scenario_id:null,status:'failed',recommendations:[],warnings:[],
   errors:[{code,message:code==='AI_NOT_CONFIGURED'?'Live AI is not configured.':code==='OUTPUT_INVALID'?'Analysis failed source and contract checks.':'Analysis could not finish.',retryable:code==='JOB_FAILED'}]
  }});
 }finally{cancel(heartbeat);}
}
