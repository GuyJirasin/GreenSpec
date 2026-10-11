import test from 'node:test';
import assert from 'node:assert/strict';
import {createProvider,executeRun} from '../supabase/functions/analyze/orchestrator.mjs';
const token='Bearer test-only';
test('provider refuses foreign destinations and maps missing AI configuration honestly',async()=>{
 for(const base of [undefined,'https://example.com','https://user:password@owned.vercel.app','https://owned.vercel.app/other'])assert.throws(()=>createProvider(base,token),{code:'AI_NOT_CONFIGURED'});
 let request;const provider=createProvider('https://owned.vercel.app',token,async(url,options)=>{request={url,options};return new Response(JSON.stringify({code:'AI_NOT_CONFIGURED'}),{status:503});});
 await assert.rejects(()=>provider('status'),{code:'AI_NOT_CONFIGURED'});assert.equal(request.options.redirect,'error');assert.equal(request.options.headers.Authorization,token);
});
test('worker refuses simulated runs before claiming or persisting anything',async()=>{
 let touched=false;await assert.rejects(()=>executeRun({id:'test',mode:'simulated'},{from(){touched=true;}},async()=>{}),{code:'INPUT_INCOMPLETE'});assert.equal(touched,false);
});
test('provider outage persists failure with no recommendations or generated alternatives',async()=>{
 const events=[];
 const db={from(table){const q={select(){return q;},eq(){return q;},in(){return q;},update(){return q;},then(resolve){return Promise.resolve({data:table==='analysis_runs'?[{id:'live'}]:[],error:null}).then(resolve);}};return q;},async rpc(name,args){events.push({name,args});return {data:{},error:null};}};
 let cancelled=false;await executeRun({id:'live',mode:'live',input_fingerprint:'fp'},db,async()=>{throw Object.assign(new Error('private provider error'),{code:'AI_NOT_CONFIGURED'});},{schedule:()=>123,cancel:()=>{cancelled=true;}});
 const saved=events.find(e=>e.name==='gs_finish_analysis').args;assert.equal(saved.p_result.status,'failed');assert.deepEqual(saved.p_result.recommendations,[]);assert.deepEqual(saved.p_options,[]);assert.equal(saved.p_result.generation_mode,'live');assert.equal(saved.p_result.errors[0].code,'AI_NOT_CONFIGURED');assert.ok(cancelled);assert.ok(!JSON.stringify(saved).includes('private provider error'));
});
