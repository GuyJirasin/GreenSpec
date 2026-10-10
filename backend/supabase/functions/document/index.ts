import { fixtures } from '../_shared/domain/fixtures.mjs';
import { fixtureBytes } from '../_shared/domain/fixture-bytes.mjs';
import { clients,rpc,json,error,method,sha256,decodeBase64 } from '../_shared/http.ts';
Deno.serve(async(req)=>{
 const early=method(req);if(early)return early;let body:any;
 try{
  body=await req.json();const {user,admin}=await clients(req);
  if(['fixture','begin'].includes(body.operation)&&(!body.request_id||typeof body.request_id!=='string'))throw {code:'INPUT_INCOMPLETE',message:'A stable upload request ID is required.'};
  if(body.operation==='fixture'){
   const fixture=fixtures.find((f:any)=>f.fixture_id===body.fixture_id);if(!fixture)throw {code:'DEMO_SOURCE_UNSUPPORTED',message:'Unknown fixture.'};
   const bytes=decodeBase64(fixtureBytes[fixture.fixture_id]);if(await sha256(bytes)!==fixture.checksum)throw {code:'OUTPUT_INVALID',message:'Fixture bundle checksum mismatch.'};
   const doc=await rpc(user,'gs_mutate',{p_project_id:body.project_id,p_kind:'documents',p_id:null,p_expected_version:null,p_data:{title:fixture.title,type:fixture.type},p_request_id:`${body.request_id}:document`});
   const version=await rpc(user,'gs_begin_upload',{p_project_id:body.project_id,p_document_id:doc.id,p_filename:fixture.filename,p_mime:fixture.mime,p_bytes:bytes.length,p_request_id:body.request_id});
   if(version.upload_state==='READY')return json(version);
   const {error:e}=await admin.storage.from('documents').upload(version.storage_path,bytes,{contentType:fixture.mime,upsert:false});
   if(e&&!String(e.message).includes('already exists'))throw {code:'UPLOAD_FAILED',message:'Fixture file could not be stored.',retryable:true};
   const {data:stored,error:storedError}=await admin.storage.from('documents').download(version.storage_path);
   if(storedError||await sha256(new Uint8Array(await stored.arrayBuffer()))!==fixture.checksum)throw {code:'UPLOAD_FAILED',message:'Stored fixture bytes failed source integrity verification. Retry with a new upload request.'};
   return json(await rpc(admin,'gs_commit_upload',{p_id:version.id,p_checksum:fixture.checksum,p_fixture_id:fixture.fixture_id,p_extraction:fixture.extraction}));
  }
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
  throw {code:'INPUT_INCOMPLETE',message:'Choose begin, commit, cancel or fixture operation.'};
 }catch(e){return error(e,body?.request_id);}
});

