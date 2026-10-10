import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');
const keys = JSON.parse(execFileSync('cmd.exe', ['/d','/s','/c','npx.cmd --no-install supabase projects api-keys --project-ref fegwjlytecobdaeqhbdf --reveal --output json'], {cwd:new URL('../backend/',import.meta.url),encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const url='https://fegwjlytecobdaeqhbdf.supabase.co',pub=keys.find(k=>k.type==='publishable').api_key;
const options={auth:{persistSession:false,autoRefreshToken:false}};
const guest=createClient(url,pub,options),restored=createClient(url,pub,options),unauth=createClient(url,pub,options);
const admin=createClient(url,keys.find(k=>k.name==='service_role').api_key,options);
const check=async(p)=>{const {data,error}=await p;if(error)throw error;return data;};
let account,project;
try {
 const signed=await check(guest.auth.signInAnonymously({options:{data:{purpose:'disposable-guest-verification'}}}));account=signed.user;
 assert.equal(account.is_anonymous,true);assert.ok(signed.session);console.log('PASS real anonymous Auth: unique user and session without email');
 const resumed=await check(restored.auth.setSession({access_token:signed.session.access_token,refresh_token:signed.session.refresh_token}));assert.equal(resumed.user.id,account.id);console.log('PASS restored session uses same guest account');
 project=await check(guest.rpc('gs_create_project',{p_name:'[QA] Guest account verification',p_description:'Synthetic guest verification; archived after test.'}));assert.equal(project.created_by,account.id);
 const own=await check(restored.from('projects').select('id').eq('id',project.id));assert.equal(own.length,1);
 const denied=await unauth.from('projects').select('id').eq('id',project.id);assert.ok(denied.error||denied.data.length===0);
 const blocked=await guest.from('projects').update({name:'forbidden'}).eq('id',project.id);assert.ok(blocked.error);
 console.log('PASS guest project ownership, session persistence and existing RLS/direct-write protection');
} finally {
 if(project)await check(guest.rpc('gs_archive',{p_project_id:project.id,p_archived:true,p_expected_version:project.row_version}));
 if(account)await check(admin.auth.admin.deleteUser(account.id,true));
 console.log('PASS cleanup: synthetic project archived and guest account soft-deleted');
}
