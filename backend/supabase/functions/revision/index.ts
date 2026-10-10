import JSZip from 'npm:jszip@3.10.1';
import { revisionPlan } from '../_shared/domain/domain.mjs';
import { reviseDocx } from '../_shared/domain/revision.mjs';
import { clients,rpc,json,error,method,sha256 } from '../_shared/http.ts';
Deno.serve(async(req)=>{
 const early=method(req);if(early)return early;let body:any;
 try{
  body=await req.json();const {user,admin,actor}=await clients(req);
  const {data:set,error:e}=await user.from('decision_sets').select('*').eq('id',body.decision_set_id).single();if(e||!set)throw {code:'UNAUTHORIZED',message:'Finalized decision set is unavailable.'};
  const {data:items}=await user.from('decision_items').select('*').eq('decision_set_id',set.id).eq('decision','APPROVED');
  const {data:project}=await user.from('projects').select('*').eq('id',set.project_id).single();
  const {data:member}=await user.from('project_members').select('role').eq('project_id',set.project_id).eq('user_id',actor.id).single();
  if(project?.archived_at||!['owner','editor'].includes(member?.role))throw {code:'UNAUTHORIZED',message:'Editing access to an active project is required.'};
  const sourceIds=[...new Set((items??[]).flatMap((i:any)=>i.snapshot.sources.map((s:any)=>s.document_version_id)))];
  if(!sourceIds.length)return json([]);
  const {data:docs}=await user.from('document_versions').select('*').in('id',sourceIds);
  const results=[];
  for(const doc of docs??[]){
   const prior=await rpc(user,'gs_begin_revision',{p_decision_set_id:set.id,p_source_version_id:doc.id,p_request_id:body.request_id});if(!['REQUESTED','GENERATING'].includes(prior.status)){results.push(prior);continue;}
   const {data:claimed,error:claimError}=await admin.from('document_revisions').update({status:'GENERATING'}).eq('id',prior.id).eq('status','REQUESTED').select('id');if(claimError)throw claimError;if(!claimed?.length){results.push(prior);continue;}
   try {
   if(doc.provenance!=='fixture'||!doc.fixture_id)throw {code:'DEMO_SOURCE_UNSUPPORTED',message:'Arbitrary files cannot be rewritten by simulation.'};
   const plan=revisionPlan(items,doc);
   const {data:blob,error:downloadError}=await admin.storage.from('documents').download(doc.storage_path);if(downloadError)throw {code:'UPLOAD_FAILED',message:'Source file is unavailable.',retryable:true};
   const source=new Uint8Array(await blob.arrayBuffer());if(await sha256(source)!==doc.checksum)throw {code:'OUTPUT_INVALID',message:'Original source integrity check failed.'};
   const output=doc.mime.includes('wordprocessingml')?await reviseDocx(source,plan,JSZip):{...plan,bytes:null};
   const path=output.bytes?`${set.project_id}/revisions/${prior.id}.docx`:null;
   if(path){const {error:uploadError}=await admin.storage.from('documents').upload(path,output.bytes,{contentType:doc.mime,upsert:false});if(uploadError&&!String(uploadError.message).includes('already exists'))throw {code:'UPLOAD_FAILED',message:'Generated revision could not be stored.',retryable:true};}
   results.push(await rpc(admin,'gs_finish_revision',{p_revision_id:prior.id,p_status:output.status,p_output_path:path,p_changes:output.changes,p_unapplied:output.unapplied,p_checksum:output.bytes?await sha256(output.bytes):null,p_bytes:output.bytes?.length??null}));
   }catch(e){await rpc(admin,'gs_finish_revision',{p_revision_id:prior.id,p_status:'FAILED',p_output_path:null,p_changes:[],p_unapplied:[{reason:'Revision generation failed; regenerate with a new request.'}]});throw e;}
  }
  return json(results);
 }catch(e){return error(e,body?.request_id);}
});

