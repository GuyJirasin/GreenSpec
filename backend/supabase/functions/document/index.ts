import { clients,rpc,json,error,method,sha256 } from '../_shared/http.ts';
Deno.serve(async(req)=>{
 const early=method(req);if(early)return early;let body:any;
 try{
  body=await req.json();const {user,admin}=await clients(req);
  if(body.operation==='begin'&&(!body.request_id||typeof body.request_id!=='string'))throw {code:'INPUT_INCOMPLETE',message:'A stable upload request ID is required.'};
  if(body.operation==='begin')return json(await rpc(user,'gs_begin_upload',{p_project_id:body.project_id,p_document_id:body.document_id??null,p_filename:body.filename,p_mime:body.mime,p_bytes:body.bytes,p_request_id:body.request_id,p_package_id:body.package_id??null,p_evidence_kind:body.evidence_kind??null}));
  if(body.operation==='cancel')return json(await rpc(user,'gs_fail_upload',{p_id:body.version_id??body.evidence_id,p_evidence:!!body.evidence_id}));
  if(body.operation==='commit'){
   const table=body.evidence_id?'evidence_files':'document_versions'; const bucket=body.evidence_id?'evidence':'documents';
   const {data:v,error:e}=await user.from(table).select('*').eq('id',body.version_id??body.evidence_id).eq('project_id',body.project_id).single();
   if(e||!v)throw {code:'UNAUTHORIZED',message:'File not accessible.'};
   await rpc(user,'gs_check_edit',{p_project_id:body.project_id});
   const {data:blob,error:downloadError}=await admin.storage.from(bucket).download(v.storage_path);if(downloadError)throw {code:'UPLOAD_FAILED',message:'Upload not complete.',retryable:true};
   const bytes=new Uint8Array(await blob.arrayBuffer());if(bytes.length>26214400||bytes.length===0||(v.bytes&&bytes.length!==v.bytes))throw {code:'UPLOAD_FAILED',message:'Stored file size does not match upload.'};
   const checksum=await sha256(bytes);if(checksum!==body.checksum)throw {code:'UPLOAD_FAILED',message:'File checksum does not match. Retry upload.'};
   const signature=String.fromCharCode(...bytes.slice(0,5));if((v.mime==='application/pdf'&&!signature.startsWith('%PDF-'))||(v.mime.includes('openxmlformats')&&!signature.startsWith('PK')))throw {code:'UPLOAD_FAILED',message:'File contents do not match its format.'};
   return json(await rpc(admin,'gs_commit_upload',{p_id:v.id,p_checksum:checksum,p_evidence:!!body.evidence_id}));
  }
  throw {code:'INPUT_INCOMPLETE',message:'Choose begin, commit, or cancel operation.'};
 }catch(e){return error(e,body?.request_id);}
});

