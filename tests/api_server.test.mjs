import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../api/server.mjs';

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
  assert.ok(data.length >= 5);
  assert.ok(data.some(p => p.brand.includes('CPAC')));
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

test('Hono API - /api/analyze endpoint with mock fallback', async () => {
  const res = await app.request('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_name: 'Riverside Tower',
      element_type: 'mat_foundation',
      volume_m3: 1500,
      fc_prime_mpa: 35
    })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'success');
  assert.ok(data.options.option_a.carbon_reduction_percent > 15.0);
  assert.ok(data.technical_package.spec_clause_th.length > 50);
});

test('Hono API - /api/chat non-streaming endpoint', async () => {
  const res = await app.request('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'ขอคำแนะนำเรื่องปูนซีเมนต์ไฮดรอลิก' }],
      stream: false
    })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.reply.length > 20);
});
