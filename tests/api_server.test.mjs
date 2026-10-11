import test from 'node:test';
import assert from 'node:assert/strict';
import { app, executeCivilTool } from '../server/server.mjs';

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

test('Hono API - /api/extract-requirements detects missing volume and flags NEEDS_INPUT', async () => {
  const res = await app.request('/api/extract-requirements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'งานคอนกรีตฐานราก กำลังอัด 35 MPa ใช้ปูนซีเมนต์ไฮดรอลิก' })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'success');
  assert.equal(data.total_found, 1);
  assert.equal(data.items[0].element_type, 'mat_foundation');
  assert.equal(data.items[0].fc_prime_mpa, 35);
  assert.equal(data.items[0].status, 'NEEDS_INPUT');
  assert.ok(data.items[0].missing_fields.includes('volume_m3'));
});

test('Hono API - /api/extract-requirements returns READY when all required fields exist', async () => {
  const res = await app.request('/api/extract-requirements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'คอนกรีตเสาโครงสร้าง กำลังอัด 40 MPa ปริมาตร 850 m3' })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'success');
  assert.equal(data.all_ready, true);
  assert.equal(data.items[0].element_type, 'column');
  assert.equal(data.items[0].fc_prime_mpa, 40);
  assert.equal(data.items[0].volume_m3, 850);
  assert.equal(data.items[0].status, 'READY');
});

test('AI endpoints fail honestly without a configured provider',async()=>{
 const saved=process.env.TYPHOON_API_KEY;delete process.env.TYPHOON_API_KEY;
 try {for(const [url,body] of [['/api/analyze',{volume_m3:100,fc_prime_mpa:35}],['/api/chat',{stream:false,messages:[]}]]) {const response=await app.request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(response.status,503);assert.equal((await response.json()).code,'AI_NOT_CONFIGURED');}}finally{if(saved!==undefined)process.env.TYPHOON_API_KEY=saved;}
});

test('unverified pricing cannot return fabricated savings',async()=>{const response=await app.request('/api/tools/cost-estimate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({volume_m3:100})});assert.equal(response.status,422);assert.equal((await response.json()).code,'PRICING_NOT_CONFIGURED');});

test('executeCivilTool safely sanitizes invalid and NaN arguments', async () => {
  const mix = await executeCivilTool('calculateConcreteMix', { fcTargetMpa: 'invalid', slumpCm: -5 });
  assert.equal(mix.fc_target_mpa, 35);
  assert.ok(mix.mix_proportions_per_m3.cement_opc_kg > 0);

  const carbon = await executeCivilTool('calculateEmbodiedCarbon', { cementOpcKg: null, volumeM3: 'abc' });
  assert.ok(carbon.proposed_carbon_intensity_kgco2e_m3 > 0);

  const thermal = await executeCivilTool('evaluateThermalMassConcrete', { thicknessM: 'huge' });
  assert.ok(thermal.estimated_max_core_temp_c > 0);

  const strength = await executeCivilTool('convertConcreteStrength', { value: undefined });
  assert.ok(strength.cylinder_15x30cm.strength_mpa > 20);
});

test('executeCivilTool rejects unknown tools', async () => {
  await assert.rejects(
    async () => executeCivilTool('nonExistentTool', {}),
    { message: /Unknown civil tool/ }
  );
});

test('Hono API - /api/analyze allows guest calls without 401 UNAUTHORIZED', async () => {
  const req = new Request('http://localhost/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_name: 'Test Project',
      element_type: 'mat_foundation',
      fc_prime_mpa: 35,
      volume_m3: 500,
      scm_type: 'fly_ash'
    })
  });
  const res = await app.fetch(req);
  assert.notStrictEqual(res.status, 401);
});

