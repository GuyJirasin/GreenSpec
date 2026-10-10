import {fixtures} from '../../shared/fixtures.mjs';
import {createAnalysis} from '../../shared/domain.mjs';
import {proposalOptions} from '../../shared/options.mjs';
export const id='00000000-0000-4000-8000-000000000010',user='00000000-0000-4000-8000-000000000001';
export const now=new Date().toISOString();
export async function fixture(page,{role='owner',project=true,run=false}={}){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const token=[{alg:'HS256',typ:'JWT'},{sub:user,exp:Math.floor(Date.now()/1000)+3600},'test'].map((x,i)=>i<2?Buffer.from(JSON.stringify(x)).toString('base64url'):x).join('.');
 await page.addInitScript(({token,user})=>localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:token,refresh_token:'test-only',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:user,email:'owner@example.test',aud:'authenticated',role:'authenticated'}})),{token,user});
 const tables={projects:project?[{id,name:'โครงการทดสอบ Green Office',description:'',created_by:user,row_version:1,updated_at:now,created_at:now,archived_at:null}]:[],project_members:project?[{project_id:id,user_id:user,role}]:[],documents:[],document_versions:[],analysis_runs:[],recommendations:[],recommendation_options:[],reviews:[],decision_sets:[],decision_items:[],packages:[],notifications:[]};
 if(run){
  const f=fixtures.find(f=>f.fixture_id==='office-spec'),rid='00000000-0000-4000-8000-000000000020',vid='00000000-0000-4000-8000-000000000031',did='00000000-0000-4000-8000-000000000030';
  tables.projects[0].description='Controlled fixture project';tables.documents.push({id:did,project_id:id,title:f.title,type:f.type,current_version_id:vid,row_version:1});
  const version={id:vid,document_id:did,project_id:id,filename:f.filename,title:f.title,type:f.type,fixture_id:f.fixture_id,checksum:f.checksum,extraction:f.extraction,upload_state:'READY',provenance:'fixture',version_no:1,storage_path:`${id}/${did}/${vid}`};tables.document_versions.push(version);
  const input={contract_version:'1.0',project_id:id,request_id:rid,run_id:rid,context:{name:tables.projects[0].name,description:tables.projects[0].description},generation_mode:'simulated',fixture_scenario_id:'success',document_versions:[version],operation:'initial'};
  const result=createAnalysis(input,[version]);tables.analysis_runs.push({id:rid,project_id:id,status:'COMPLETED',scenario:'success',review_epoch:1,input_snapshot:input,result,created_at:now,request_id:rid,stale:false});
  result.recommendations.forEach((payload,i)=>{const recid=`00000000-0000-4000-8000-${String(50+i).padStart(12,'0')}`;tables.recommendation_options.push(...proposalOptions({...payload,id:recid}).map(o=>({...o,recommendation_id:recid,project_id:id,run_id:rid})));tables.recommendations.push({id:recid,project_id:id,run_id:rid,payload:{...payload,id:recid},lineage_id:payload.lineage_id,work_scope_key:payload.work_scope_key});tables.reviews.push({id:`00000000-0000-4000-8000-${String(60+i).padStart(12,'0')}`,project_id:id,recommendation_id:recid,decision:'UNREVIEWED',reason:'',locked:false,selected_option:'A',draft_wording:null,row_version:1});});
 }
 const calls=[],requests=[],gates=[];let conflict=false,authIdentity={id:user,email:'owner@example.test'};
 const signInAs=(id,email)=>{authIdentity={id,email};};
 const failNext=(match,message='Test connection failed')=>gates.push({match,wait:Promise.resolve(),entered:()=>{},failure:message});
 const holdNext=(match)=>{let release,entered;const reached=new Promise(resolve=>{entered=resolve});const wait=new Promise(resolve=>{release=resolve});gates.push({match,wait,entered});return {reached,release};};
 await page.route('http://127.0.0.1:54321/**',async route=>{
  const req=route.request(),url=new URL(req.url());let value;
  const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'};
  if(req.method()==='OPTIONS')return route.fulfill({status:200,headers,body:'{}'});
  const entry={method:req.method(),path:url.pathname,url:req.url(),table:url.pathname.split('/').at(-1),args:req.method()==='POST'?req.postDataJSON():null};requests.push(entry);
  const readSnapshot=entry.method==='GET'&&tables[entry.table]?structuredClone(tables[entry.table]):null;
  const gateIndex=gates.findIndex(g=>g.match(entry));const gate=gateIndex>=0?gates.splice(gateIndex,1)[0]:null;
  if(gate){gate.entered(entry);await gate.wait;if(gate.failure)return route.fulfill({status:500,headers,body:JSON.stringify({message:gate.failure})});}
  if(url.pathname.startsWith('/rest/v1/rpc/')){
   const name=url.pathname.split('/').at(-1),args=req.postDataJSON();calls.push({name,args});
   if(name==='gs_mutate'){
    if(conflict){conflict=false;return route.fulfill({status:409,headers,body:JSON.stringify({code:'P0001',message:'VERSION_CONFLICT',details:'Latest row version changed'})});}
    const allowed={projects:['name','description'],documents:['title','type','retired_at'],reviews:['decision','reason','locked']};
    if(allowed[args.p_kind]&&Object.keys(args.p_data).some(k=>!allowed[args.p_kind].includes(k)))return route.fulfill({status:400,headers,body:JSON.stringify({code:'P0001',message:'FIELD_NOT_MUTABLE',details:null,hint:null})});
    if(role==='viewer')return route.fulfill({status:400,headers,body:JSON.stringify({message:'UNAUTHORIZED'})});
    let row=(tables[args.p_kind]??=[]).find(x=>x.id===args.p_id);
    if(row){Object.assign(row,args.p_data);row.row_version++;}else{row={id:crypto.randomUUID(),project_id:args.p_project_id,...args.p_data,row_version:1,current_version_id:null};(tables[args.p_kind]??=[]).push(row);}if(args.p_kind==='reviews')tables.analysis_runs[0].review_epoch++;value=row;
   }else if(name==='gs_review_change'){
    const row=tables.reviews.find(r=>r.id===args.p_review_id);
    if(role==='viewer')return route.fulfill({status:403,headers,body:JSON.stringify({message:'UNAUTHORIZED'})});
    if(!row||row.row_version!==args.p_expected_version||conflict){conflict=false;return route.fulfill({status:409,headers,body:JSON.stringify({message:'VERSION_CONFLICT'})});}
    if(row.locked)return route.fulfill({status:400,headers,body:JSON.stringify({message:'REVIEW_LOCKED'})});
    if(!tables.recommendation_options.some(o=>o.recommendation_id===row.recommendation_id&&o.option_key===args.p_selected_option))return route.fulfill({status:400,headers,body:JSON.stringify({message:'OPTION_NOT_FOUND'})});
    if(row.selected_option!==args.p_selected_option||row.draft_wording!==args.p_draft_wording){Object.assign(row,{selected_option:args.p_selected_option,draft_wording:args.p_draft_wording,decision:'UNREVIEWED',locked:false});row.row_version++;tables.analysis_runs[0].review_epoch++;}
    value=row;
   }else if(name==='gs_create_project'){value={id:crypto.randomUUID(),name:args.p_name,description:args.p_description,row_version:1,created_by:user,created_at:now,updated_at:now};tables.projects.push(value);tables.project_members.push({project_id:value.id,user_id:user,role:'owner'});}
   else if(name==='gs_finalize'){
    if(tables.reviews.some(r=>r.decision==='UNREVIEWED'))return route.fulfill({status:400,headers,body:JSON.stringify({message:'REVIEW_INCOMPLETE'})});
    value={id:crypto.randomUUID(),project_id:id,run_id:args.p_run_id,version_no:1,finalized_by:user,finalized_at:now,summary_snapshot:{generation_mode:'simulated'}};tables.decision_sets.push(value);tables.analysis_runs[0].finalized=true;
    tables.recommendations.forEach(rec=>{const review=tables.reviews.find(r=>r.recommendation_id===rec.id),option=tables.recommendation_options.find(o=>o.recommendation_id===rec.id&&o.option_key===review.selected_option);
     tables.decision_items.push({id:crypto.randomUUID(),project_id:id,decision_set_id:value.id,recommendation_id:rec.id,decision:review.decision,snapshot:{...(option?.payload??rec.payload),generation_mode:'simulated',selected_option:review.selected_option,final_wording:review.draft_wording??option?.default_wording??rec.payload.proposed_material,wording_edited:review.draft_wording!==null}});
    });
   }else if(name==='gs_handoff'){const items=tables.decision_items.filter(i=>args.p_item_ids.includes(i.id));for(const item of items){if(!tables.packages.some(p=>p.origin_decision_item_id===item.id))tables.packages.push({id:crypto.randomUUID(),project_id:id,origin_decision_item_id:item.id,snapshot:item.snapshot,owner_id:user,row_version:1,execution_status:'APPROVED',verification_status:'PENDING'});}value={packages:tables.packages};}
   else if(name==='gs_list_members')value=tables.project_members.map(m=>({...m,email:'owner@example.test'}));
   else value={};
  }else if(url.pathname.startsWith('/rest/v1/')){
   const table=url.pathname.split('/').at(-1);value=readSnapshot??[...(tables[table]??[])];for(const [k,v] of url.searchParams){if(v.startsWith('eq.'))value=value.filter(row=>String(row[k])===v.slice(3));}if(req.headers()['accept']?.includes('vnd.pgrst.object'))value=value[0]??null;
  }else if(url.pathname.startsWith('/auth/v1/token')){const nextToken=[{alg:'HS256',typ:'JWT'},{sub:authIdentity.id,exp:Math.floor(Date.now()/1000)+3600},'test'].map((x,i)=>i<2?Buffer.from(JSON.stringify(x)).toString('base64url'):x).join('.');value={access_token:nextToken,refresh_token:'test-only',expires_in:3600,token_type:'bearer',user:{...authIdentity,aud:'authenticated',role:'authenticated'}};}
  else if(url.pathname.startsWith('/auth/v1/'))value=authIdentity;
  else value={};
  return route.fulfill({status:200,headers,body:JSON.stringify(value)});
 });
 return {tables,calls,requests,holdNext,failNext,signInAs,errors,conflictNext:()=>{conflict=true;}};
}


