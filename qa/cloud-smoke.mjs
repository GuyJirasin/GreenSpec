import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
const root=process.env.GREEN_SPEC_ROOT || 'C:/Users/Jirasin/Downloads/EGAT/GreenSpec';
const require=createRequire(resolve(root,'frontend/package.json'));
const {createClient}=require('@supabase/supabase-js');
const ref='fegwjlytecobdaeqhbdf',url=`https://${ref}.supabase.co`;
const keys=JSON.parse(execFileSync('cmd.exe',['/d','/s','/c',`npx.cmd --no-install supabase projects api-keys --project-ref ${ref} --reveal --output json`],{cwd:resolve(root,'backend'),encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const publicKey=keys.find(k=>k.type==='publishable').api_key;
const adminKey=keys.find(k=>k.name==='service_role').api_key;
const opts={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(url,adminKey,opts),user=createClient(url,publicKey,opts),anon=createClient(url,publicKey,opts);
const checked=async(p,label)=>{const {data,error}=await p;if(error){let detail;try{detail=await error.context?.json()}catch{}throw new Error(`${label}: ${detail?.message || error.message}`)}return data};
const rpc=(name,args)=>checked(user.rpc(name,args),name);
const invoke=(name,args)=>checked(user.functions.invoke(name,{body:args}),name);
const mutate=(project,kind,data,record)=>rpc('gs_mutate',{p_project_id:project,p_kind:kind,p_id:record?.id??null,p_expected_version:record?.row_version??null,p_data:data,p_request_id:randomUUID()});
if(process.argv.includes('--cleanup-only')){
 const accounts=(await checked(admin.auth.admin.listUsers({page:1,perPage:100}),'list test accounts')).users.filter(u=>u.user_metadata?.purpose==='disposable-cloud-smoke'&&!u.deleted_at);
 for(const testAccount of accounts){
  const link=await checked(admin.auth.admin.generateLink({type:'magiclink',email:testAccount.email}),'recover synthetic test session without sending email');
  await checked(user.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}),'synthetic cleanup session');
  const projects=await checked(user.from('projects').select('*').eq('created_by',testAccount.id).eq('name','[QA] Cloud connection verification'),'synthetic test projects');
  for(const p of projects.filter(p=>!p.archived_at))await rpc('gs_archive',{p_project_id:p.id,p_archived:true,p_expected_version:p.row_version});
  await checked(admin.auth.admin.deleteUser(testAccount.id,true),'soft-delete synthetic test account');
  await user.auth.signOut();
  console.log('PASS cleanup: test project archived and synthetic account soft-deleted');
 }
 process.exit(0);
}
if(process.argv.includes('--backfill-options')){
 const {generateAlternativeOptions}=await import(`file:///${root}/shared/options.mjs`);
 const runs=await checked(admin.from('analysis_runs').select('*').eq('mode','simulated').eq('finalized',false).in('status',['COMPLETED','PARTIAL']),'read draft runs');
 const finalsBefore=await checked(admin.from('decision_items').select('id,snapshot').order('id'),'snapshot preservation baseline');
 let count=0;
 for(const run of runs){
  const p=await checked(admin.from('projects').select('archived_at').eq('id',run.project_id).single(),'draft project');if(p.archived_at)continue;
  const inputs=await checked(admin.from('analysis_inputs').select('document_version_id').eq('run_id',run.id),'draft sources');if(!inputs.length)continue;
  const sources=await checked(admin.from('document_versions').select('provenance,upload_state').in('id',inputs.map(x=>x.document_version_id)),'draft source provenance');if(sources.some(s=>s.provenance!=='fixture'||s.upload_state!=='READY'))continue;
  const recs=await checked(admin.from('recommendations').select('*').eq('run_id',run.id),'draft recommendations');if(!recs.length)continue;
  const reviewsBefore=await checked(admin.from('reviews').select('*').in('recommendation_id',recs.map(r=>r.id)).order('id'),'draft review baseline');
  await checked(admin.rpc('gs_finish_analysis',{p_run_id:run.id,p_result:run.result,p_options:generateAlternativeOptions(recs.map(r=>r.payload))}),'add draft fixture B options');
  const after=await checked(admin.from('analysis_runs').select('*').eq('id',run.id).single(),'draft run preservation');assert.deepEqual(after,run);
  const reviewsAfter=await checked(admin.from('reviews').select('*').in('recommendation_id',recs.map(r=>r.id)).order('id'),'draft review preservation');assert.deepEqual(reviewsAfter,reviewsBefore);
  count++;
 }
 const finalsAfter=await checked(admin.from('decision_items').select('id,snapshot').order('id'),'snapshot preservation verification');assert.deepEqual(finalsAfter,finalsBefore);
 console.log(`PASS safe fixture draft B backfill: ${count} active runs; existing run/review rows and ${finalsBefore.length} finalized snapshots unchanged`);
 process.exit(0);
}
let account,project;
try{
 const password=randomUUID()+'aA9!';
 account=(await checked(admin.auth.admin.createUser({email:`greenspec-qa-${randomUUID()}@example.test`,password,email_confirm:true,user_metadata:{display_name:'GREEN SPEC automated verification',purpose:'disposable-cloud-smoke'}}),'create synthetic test user')).user;
 await checked(user.auth.signInWithPassword({email:account.email,password}),'real Auth password login');
 console.log('PASS Auth: synthetic user password sign-in with publishable key');
 project=await rpc('gs_create_project',{p_name:'[QA] Cloud connection verification',p_description:'Synthetic fixture data only; archived after automated verification.'});
 const anonymous=await anon.from('projects').select('id').eq('id',project.id);assert.ok(anonymous.error || anonymous.data.length===0);
 const direct=await user.from('projects').update({name:'forbidden direct write'}).eq('id',project.id);assert.ok(direct.error);
 console.log('PASS real PostgREST: checked project creation, anonymous denial, direct write denial');
 const version=await invoke('document',{operation:'fixture',project_id:project.id,fixture_id:'office-spec',request_id:randomUUID()});
 assert.equal(version.upload_state,'READY');
 const blob=await checked(user.storage.from('documents').download(version.storage_path),'private source download');
 assert.equal(createHash('sha256').update(Buffer.from(await blob.arrayBuffer())).digest('hex'),version.checksum);
 const forbidden=await anon.storage.from('documents').download(version.storage_path);assert.ok(forbidden.error);
 console.log('PASS document Edge runtime/private Storage: actual DOCX bytes and SHA256, anonymous download denial');
 let run=await invoke('analyze',{project_id:project.id,scenario:'success',document_version_ids:[version.id],request_id:randomUUID()});
 for(let i=0;i<40 && ['QUEUED','PROCESSING'].includes(run.status);i++){await new Promise(r=>setTimeout(r,1000));run=await checked(user.from('analysis_runs').select('*').eq('id',run.id).single(),'poll real persisted job')}
 assert.equal(run.status,'COMPLETED',JSON.stringify(run.errors));
 const recs=await checked(user.from('recommendations').select('*').eq('run_id',run.id),'recommendations');assert.ok(recs.length);
 let reviews=await checked(user.from('reviews').select('*').in('recommendation_id',recs.map(r=>r.id)),'reviews');
 const options=await checked(user.from('recommendation_options').select('*').in('recommendation_id',recs.map(r=>r.id)),'persisted A/B alternatives');assert.equal(options.length,recs.length*2);
 const target=recs.find(r=>r.work_scope_key==='structure/concrete')??recs[0];
 if(process.argv.includes('--performance')){
  const {chromium}=createRequire(resolve(root,'qa/package.json'))('playwright');
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try{
   const page=await browser.newPage();
   await page.goto('http://127.0.0.1:5173/#auth');
   await page.getByLabel('Email',{exact:true}).fill(account.email);await page.getByLabel('Password',{exact:true}).fill(password);
   await page.getByRole('button',{name:'Continue',exact:true}).click();
   await page.getByRole('heading',{name:'Build better. Specify greener.',exact:true}).waitFor();
   await page.evaluate(hash=>{location.hash=hash},`workspace?project=${project.id}&tab=review&run=${run.id}&stage=compare&item=${target.id}`);
   await page.getByRole('button',{name:'Select Option B',exact:true}).waitFor();await page.waitForLoadState('networkidle');
   const traffic=[];page.on('request',req=>{const parsed=new URL(req.url());if(parsed.origin===url&&parsed.pathname.startsWith('/rest/v1/'))traffic.push({method:req.method(),table:parsed.pathname.split('/').at(-1)})});
   await page.getByRole('button',{name:'Select Option B',exact:true}).click();
   await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Select Option A'&&!b.disabled));await page.waitForLoadState('networkidle');
   assert.deepEqual(traffic,[{method:'POST',table:'gs_review_change'},{method:'GET',table:'analysis_runs'}]);
   const count=traffic.length;await page.getByRole('button',{name:'Details',exact:true}).click();await page.getByRole('button',{name:'Compare options',exact:true}).first().click();await page.waitForLoadState('networkidle');assert.equal(traffic.length,count);
   console.log('PASS live frontend request budget: Option B = 2 requests (write + run epoch); Details/Compare navigation = 0 additional reads');
  }finally{await browser.close()}
  reviews=await checked(user.from('reviews').select('*').in('recommendation_id',recs.map(r=>r.id)),'reviews after browser choice');
 }
 const original=reviews.find(v=>v.recommendation_id===target.id);
 const prior=await mutate(project.id,'reviews',{decision:'APPROVED'},original);
 const wording='ใช้คอนกรีต C30 พร้อมข้อมูล A & B <ตามแบบ> และเอกสารจากผู้ผลิต';
 const changed=await rpc('gs_review_change',{p_review_id:prior.id,p_expected_version:prior.row_version,p_selected_option:'B',p_draft_wording:wording,p_request_id:randomUUID()});assert.equal(changed.decision,'UNREVIEWED');assert.equal(changed.draft_wording,wording);
 const pendingRun=await checked(user.from('analysis_runs').select('*').eq('id',run.id).single(),'pending review epoch');
 const blocked=await user.rpc('gs_finalize',{p_run_id:run.id,p_review_epoch:pendingRun.review_epoch,p_request_id:randomUUID()});assert.match(blocked.error?.message??'',/UNRESOLVED_REVIEW/);
 let approvedTarget;
 for(const review of reviews){const saved=await mutate(project.id,'reviews',{decision:'APPROVED',locked:true},review.id===changed.id?changed:review);if(review.id===changed.id)approvedTarget=saved;}
 const locked=await user.rpc('gs_review_change',{p_review_id:approvedTarget.id,p_expected_version:approvedTarget.row_version,p_selected_option:'A',p_draft_wording:null,p_request_id:randomUUID()});assert.match(locked.error?.message??'',/REVIEW_LOCKED/);
 console.log('PASS real A/B choice and Thai wording: changed approval resets; all-review finalize gate and explicit lock guard');
 run=await checked(user.from('analysis_runs').select('*').eq('id',run.id).single(),'review epoch');
 const set=await rpc('gs_finalize',{p_run_id:run.id,p_review_epoch:run.review_epoch,p_request_id:randomUUID(),p_omit_errors:false,p_omission_reason:null});
 const items=await checked(user.from('decision_items').select('id').eq('decision_set_id',set.id).eq('decision','APPROVED'),'finalized approved items');
 const edited=await checked(user.from('decision_items').select('*').eq('decision_set_id',set.id).eq('recommendation_id',target.id).single(),'selected B finalized snapshot');
 const selectedB=options.find(o=>o.recommendation_id===target.id&&o.option_key==='B');assert.equal(edited.snapshot.selected_option,'B');assert.equal(edited.snapshot.final_wording,wording);assert.deepEqual(edited.snapshot.impacts,selectedB.payload.impacts);
 const handoff=await rpc('gs_handoff',{p_decision_set_id:set.id,p_item_ids:items.map(i=>i.id),p_request_id:randomUUID()});assert.equal(handoff.packages.length,items.length);
 console.log('PASS analyze Edge background job: real persisted results/reviews/finalize/approved-only handoff');
 const revisions=await invoke('revision',{decision_set_id:set.id,request_id:randomUUID()});
 assert.ok(revisions.length);assert.ok(revisions.every(r=>!['FAILED','REQUESTED','GENERATING'].includes(r.status)),JSON.stringify(revisions.map(r=>r.status)));
 const generated=await checked(user.storage.from('documents').download(revisions[0].output_path),'actual edited DOCX download');
 const JSZip=createRequire(resolve(root,'shared/package.json'))('jszip');
 const zip=await JSZip.loadAsync(await generated.arrayBuffer());const xml=await zip.file('word/document.xml').async('string');assert.ok(xml.includes('ใช้คอนกรีต C30'));assert.ok(xml.includes('A &amp; B &lt;ตามแบบ&gt;'));
 console.log('PASS real finalized B snapshot and DOCX: user Thai wording and XML escaping preserved; estimates match server B');
 console.log('PASS revision Edge runtime: generated separate revision output');
 const qaRequire=createRequire(resolve(root,'qa/package.json'));
 const {chromium}=qaRequire('playwright');
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:5173/#auth');
  await page.getByLabel('Email',{exact:true}).fill(account.email);
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('heading',{name:'Build better. Specify greener.',exact:true}).waitFor({timeout:30000});
  await page.getByText(project.name,{exact:true}).waitFor({timeout:30000});
  await page.screenshot({path:resolve(root,'qa/cloud-login.png'),fullPage:true});
  console.log('PASS live browser: frontend password login and real cloud project list');
 }finally{await browser.close()}
 console.log('CLOUD_SMOKE_PASS');
}finally{
 if(project){const current=await checked(user.from('projects').select('*').eq('id',project.id).single(),'cleanup project version');await rpc('gs_archive',{p_project_id:project.id,p_archived:true,p_expected_version:current.row_version});console.log('Cleanup: synthetic project archived; source and audit history retained');}
 if(account){await checked(admin.auth.admin.deleteUser(account.id,true),'soft-delete synthetic test account');console.log('Cleanup: synthetic Auth account soft-deleted (no email sent)');}
 await user.auth.signOut();
}






