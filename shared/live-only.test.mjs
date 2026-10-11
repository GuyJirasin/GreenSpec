import test from 'node:test';
import assert from 'node:assert/strict';
import {TyphoonClient} from './typhoon.mjs';
import {THAI_CERTIFIED_CATALOG} from './catalog.mjs';
import {validateAnalysis} from './domain.mjs';
import {analysisSchema} from './schema.mjs';
import {readFileSync} from 'node:fs';
test('missing provider key rejects chat and streaming without fabricated output',async()=>{
 const saved=process.env.TYPHOON_API_KEY;delete process.env.TYPHOON_API_KEY;
 try {const client=new TyphoonClient();await assert.rejects(()=>client.chat({messages:[]}),{code:'AI_NOT_CONFIGURED'});await assert.rejects(async()=>{for await(const chunk of client.chatStream({messages:[]}))assert.fail(chunk);},{code:'AI_NOT_CONFIGURED'});assert.equal(client.lastGenerationMode,null);}
 finally {if(saved!==undefined)process.env.TYPHOON_API_KEY=saved;}
});
test('provider outage never falls back to generated example text',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('{}',{status:503});
 try{const client=new TyphoonClient({apiKey:'test-only'});await assert.rejects(()=>client.chat({messages:[]}));assert.equal(client.lastGenerationMode,null);}finally{globalThis.fetch=original;}
});
test('simulated envelopes are rejected and JSON contract matches runtime',()=>{
 assert.deepEqual(JSON.parse(readFileSync(new URL('./analysis_contract_v1.schema.json',import.meta.url))),analysisSchema);
 assert.throws(()=>validateAnalysis({contract_version:'1.0',run_id:'test',input_fingerprint:'test',generation_mode:'simulated',fixture_scenario_id:'success',status:'completed',recommendations:[],warnings:[],errors:[]},[]),{code:'OUTPUT_INVALID'});
 assert.deepEqual(THAI_CERTIFIED_CATALOG,[]);
});
