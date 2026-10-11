import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server/server.mjs';

test('Hono API - /health endpoint', async () => {
  const res = await app.request('/health');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
});

test('Hono API - /api/catalog endpoint', async () => {
  const res = await app.request('/api/catalog');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(data, []);
});

test('Hono API - /api/tools/mix-design endpoint', async () => {
  const res = await app.request('/api/tools/mix-design', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fc_target_mpa: 35.0, scm_percent: 30.0 })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.volumetric_check.volumetric_balance_conserved, true);
  assert.ok(data.mix_proportions_per_m3.cement_opc_kg > 0);
});

test('Hono API - /api/tools/strength-convert endpoint', async () => {
  const res = await app.request('/api/tools/strength-convert?value=280&from_format=cylinder_ksc');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.cylinder_15x30cm.strength_mpa > 27.0);
});









test('AI endpoints fail honestly without a configured provider',async()=>{
 const saved=process.env.TYPHOON_API_KEY;delete process.env.TYPHOON_API_KEY;
 try {for(const [url,body] of [['/api/analyze',{volume_m3:100,fc_prime_mpa:35}],['/api/chat',{stream:false,messages:[]}]]) {const response=await app.request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(response.status,503);assert.equal((await response.json()).code,'AI_NOT_CONFIGURED');}}finally{if(saved!==undefined)process.env.TYPHOON_API_KEY=saved;}
});

test('unverified pricing cannot return fabricated savings',async()=>{const response=await app.request('/api/tools/cost-estimate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({volume_m3:100})});assert.equal(response.status,422);assert.equal((await response.json()).code,'PRICING_NOT_CONFIGURED');});
