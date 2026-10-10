import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getRequestListener } from '@hono/node-server';
import {
  calculateConcreteMix,
  calculateEmbodiedCarbon,
  evaluateThermalMassConcrete,
  convertConcreteStrength,
  estimateCostImpact
} from '../shared/tools.mjs';
import { THAI_CERTIFIED_CATALOG } from '../shared/catalog.mjs';
import { evaluateGuardrail } from '../shared/guardrails.mjs';
import { TyphoonClient } from '../shared/typhoon.mjs';

export const app = new Hono();

// Enable CORS for frontend clients
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));

// Health check endpoints
app.get('/health', (c) => c.json({ status: 'ok', service: 'GreenSpec Hono Engine' }));
app.get('/api/health', (c) => c.json({ status: 'ok', service: 'GreenSpec Hono Engine' }));

// Catalog endpoint
app.get('/api/catalog', (c) => c.json(THAI_CERTIFIED_CATALOG));

// ==================== DETERMINISTIC CIVIL TOOLS ====================

app.post('/api/tools/mix-design', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const result = calculateConcreteMix({
    fcTargetMpa: Number(body.fc_target_mpa ?? 35.0),
    elementType: body.element_type ?? 'beam_slab',
    slumpCm: Number(body.slump_cm ?? 12.0),
    scmType: body.scm_type ?? 'fly_ash',
    scmPercent: Number(body.scm_percent ?? 25.0),
    aggregateSizeMm: Number(body.aggregate_size_mm ?? 19.0),
    sandFinenessModulus: Number(body.sand_fineness_modulus ?? 2.80)
  });
  return c.json(result);
});

app.post('/api/tools/carbon-calc', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const result = calculateEmbodiedCarbon({
    cementOpcKg: Number(body.cement_opc_kg ?? 270.0),
    scmKg: Number(body.scm_kg ?? 90.0),
    scmType: body.scm_type ?? 'fly_ash',
    caKg: Number(body.ca_kg ?? 1020.0),
    sandKg: Number(body.sand_kg ?? 740.0),
    volumeM3: Number(body.volume_m3 ?? 100.0)
  });
  return c.json(result);
});

app.post('/api/tools/thermal-check', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const result = evaluateThermalMassConcrete({
    thicknessM: Number(body.thickness_m ?? 1.5),
    totalBinderKgM3: Number(body.total_binder_kg_m3 ?? 380.0),
    scmPercent: Number(body.scm_percent ?? 30.0),
    scmType: body.scm_type ?? 'fly_ash',
    placingTempC: Number(body.placing_temp_c ?? 30.0)
  });
  return c.json(result);
});

app.get('/api/tools/strength-convert', (c) => {
  const val = Number(c.req.query('value') ?? 280.0);
  const fromFmt = c.req.query('from_format') ?? 'cylinder_ksc';
  const result = convertConcreteStrength({ value: val, fromFormat: fromFmt });
  return c.json(result);
});

app.post('/api/tools/cost-estimate', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const result = estimateCostImpact({
    fcMpa: Number(body.fc_mpa ?? 35.0),
    volumeM3: Number(body.volume_m3 ?? 500.0),
    scmPercent: Number(body.scm_percent ?? 25.0),
    scmType: body.scm_type ?? 'fly_ash'
  });
  return c.json(result);
});

// ==================== FULL SPEC ANALYSIS & TOR DRAFTING ====================

app.post('/api/analyze', async (c) => {
  const payload = await c.req.json().catch(() => ({}));
  const projectName = payload.project_name || 'Bangkok Project';
  const elementType = payload.element_type || 'mat_foundation';
  const volumeM3 = Number(payload.volume_m3 || 1000.0);
  const fcPrimeMpa = Number(payload.fc_prime_mpa || 35.0);
  const testAgeDays = Number(payload.test_age_days || 28);
  const notes = payload.notes || '';

  // 1. Evaluate safety guardrails
  const guardrail = evaluateGuardrail({
    elementType,
    volumeM3,
    fcPrimeMpa,
    testAgeDays,
    notes
  });

  // 2. Compute baseline and proposed impacts
  const scmPctOptA = Math.min(guardrail.max_scm_percent, 30.0);
  const scmPctOptB = Math.min(guardrail.max_scm_percent + 5.0, 40.0);

  const mixA = calculateConcreteMix({ fcTargetMpa: fcPrimeMpa, elementType, scmPercent: scmPctOptA });
  const carbonA = calculateEmbodiedCarbon({
    cementOpcKg: mixA.mix_proportions_per_m3.cement_opc_kg,
    scmKg: mixA.mix_proportions_per_m3.scm_kg,
    volumeM3
  });
  const costA = estimateCostImpact({ fcMpa: fcPrimeMpa, volumeM3, scmPercent: scmPctOptA });

  // 3. Draft technical specification using Typhoon LLM (or mock if offline)
  const typhoon = new TyphoonClient();
  const spec = await typhoon.generateSpecification({
    projectName,
    elementType,
    fcMpa: fcPrimeMpa,
    ageDays: guardrail.recommended_test_age_days,
    scmName: 'เถ้าลอยแม่เมาะ มอก. 2135',
    scmPct: scmPctOptA,
    wbRatio: mixA.max_wb_ratio,
    curingDays: guardrail.mandatory_curing_days,
    standardsContext: [
      'มอก. 2594 ปูนซีเมนต์ไฮดรอลิก',
      'มอก. 2135 เถ้าลอยสำหรับใช้เป็นวัสดุผสมในคอนกรีต',
      'มยผ. 1101-64 มาตรฐานงานคอนกรีตและคอนกรีตเสริมเหล็ก กรมโยธาธิการและผังเมือง',
      'ACI 207.2R Guide to Mass Concrete (Delta T <= 20 deg C)'
    ]
  });

  // 4. Match certified Thai products
  const matched = THAI_CERTIFIED_CATALOG.find(p => p.element_suitability.includes(elementType)) || THAI_CERTIFIED_CATALOG[0];

  return c.json({
    status: 'success',
    project_name: projectName,
    element_type: elementType,
    guardrail,
    baseline: {
      carbon_intensity_kg_m3: carbonA.baseline_carbon_intensity_kgco2e_m3,
      total_carbon_tco2e: carbonA.total_baseline_carbon_tco2e,
      estimated_cost_thb: costA.total_baseline_cost_thb
    },
    options: {
      option_a: {
        name: 'สูตรสมดุล (Balanced Mix Design)',
        scm_replacement_percent: scmPctOptA,
        carbon_reduction_percent: carbonA.carbon_reduction_percent,
        total_carbon_saved_tco2e: carbonA.total_carbon_saved_tco2e,
        total_savings_thb: costA.total_savings_thb,
        max_wb_ratio: mixA.max_wb_ratio,
        acceptance_age_days: guardrail.recommended_test_age_days,
        proportions: mixA.mix_proportions_per_m3
      }
    },
    matched_product: matched,
    technical_package: {
      spec_clause_th: spec.thPart,
      spec_clause_en: spec.enPart,
      submittal_checklist: [
        'ผลการทดสอบ Trial Mix ในห้องปฏิบัติการ ล่วงหน้า 35 วัน ตาม มอก. 213',
        'ใบรับรอง Mill Certificate เถ้าลอย มอก. 2135 ชั้น F และปูนซีเมนต์ไฮดรอลิก มอก. 2594',
        `แผนการบ่มชื้น (Curing Plan) ต่อเนื่องอย่างน้อย ${guardrail.mandatory_curing_days} วัน`
      ]
    }
  });
});

// ==================== STREAMING AI CHAT COPILOT ====================

app.post('/api/chat', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const messages = body.messages || [];
  const stream = body.stream !== false; // default true

  const typhoon = new TyphoonClient();
  const systemPrompt = `คุณคือ GreenSpec Senior Civil AI Copilot วิศวกรผู้เชี่ยวชาญด้านคอนกรีตคาร์บอนต่ำ การออกแบบส่วนผสม ACI 211.1 และมาตรฐาน มอก., มยผ., วสท. ของไทย
ให้ตอบคำถามอย่างกระชับ สุภาพ เป็นมืออาชีพ พร้อมอ้างอิงมาตรฐานที่เกี่ยวข้องเสมอ`;

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  if (!stream) {
    const reply = await typhoon.chat({ messages: fullMessages });
    return c.json({ reply });
  }

  // Server-Sent Events (SSE) Streaming
  // Streams tokens chunk by chunk to prevent Vercel 10s timeouts!
  const textStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of typhoon.chatStream({ messages: fullMessages })) {
          const payload = JSON.stringify({ chunk });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (err) {
        controller.enqueue(encoder.encode(`data: {"error": "${err.message}"}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(textStream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
});

// Vercel Serverless Function compatibility adapter (like AIlaw/src/api/vercel.ts)
const listener = getRequestListener(app.fetch);

export function handleFetch(req) {
  const url = new URL(req.url);
  const matchedPath = req.headers.get('x-matched-path');
  if (matchedPath && matchedPath !== url.pathname) {
    url.pathname = matchedPath;
    return app.fetch(new Request(url.toString(), req));
  }
  return app.fetch(req);
}

export const GET = handleFetch;
export const POST = handleFetch;
export const PUT = handleFetch;
export const DELETE = handleFetch;
export const OPTIONS = handleFetch;

export default function handler(req, res) {
  if (req instanceof Request) {
    return handleFetch(req);
  }
  return listener(req, res);
}
