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

import { registerWorkflow, createReader } from './workflow.mjs';

export const app = new Hono();
app.onError((error,c)=>{
  if (error.code !== 'AI_NOT_CONFIGURED') console.error('[API Error]:', error.message || error);
  return c.json({code:error.code==='AI_NOT_CONFIGURED'?'AI_NOT_CONFIGURED':'JOB_FAILED',message:error.code==='AI_NOT_CONFIGURED'?'AI service is not configured.':error.message || 'AI request could not finish.'},error.code==='AI_NOT_CONFIGURED'?503:502);
});
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

app.post('/api/tools/cost-estimate', c => c.json({code:'PRICING_NOT_CONFIGURED',message:'Verified baseline and supplier prices are required. Cost estimates are unavailable.'},422));

// ==================== FULL SPEC ANALYSIS & TOR DRAFTING ====================

app.post('/api/analyze', async (c) => {
  const payload = await c.req.json().catch(() => null);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return c.json({ status: 'error', error: 'Request body must be a JSON object.' }, 400);
  }
  const numeric = (key, fallback, { min = 0, max = Infinity } = {}) => {
    const value = payload[key] === undefined ? fallback : payload[key];
    if (typeof value === 'boolean' || value === null || value === '' || !Number.isFinite(Number(value))) return null;
    const parsed = Number(value);
    return parsed < min || parsed > max ? null : parsed;
  };
  const volumeM3 = numeric('volume_m3', undefined, { min: Number.EPSILON, max: 1_000_000 });
  const fcPrimeMpa = numeric('fc_prime_mpa', undefined, { min: 1, max: 150 });
  const testAgeDays = numeric('test_age_days', 28, { min: 1, max: 3650 });
  const slumpCm = numeric('slump_cm', 12, { min: 0, max: 30 });
  const projectName = typeof payload.project_name === 'string' && payload.project_name.trim() ? payload.project_name.trim() : 'Bangkok Project';
  const elementType = typeof payload.element_type === 'string' && payload.element_type.trim() ? payload.element_type.trim() : 'mat_foundation';
  const notes = typeof payload.notes === 'string' ? payload.notes : '';
  const exposureClass = payload.exposure_class ?? 'normal';
  if ([volumeM3, fcPrimeMpa, testAgeDays, slumpCm].some(value => value === null) || !['normal', 'marine'].includes(exposureClass) || typeof payload.notes !== 'undefined' && typeof payload.notes !== 'string') {
    return c.json({ status: 'error', error: 'Invalid analysis input: numeric values must be finite and within supported ranges; exposure_class must be normal or marine.' }, 400);
  }

  // 1. Evaluate safety guardrails
  const guardrail = evaluateGuardrail({
    elementType,
    volumeM3,
    fcPrimeMpa,
    testAgeDays,
    slumpCm,
    exposureClass,
    notes
  });

  // 2. Compute baseline and proposed impacts
  const scmPctOptA = Math.round(Math.min(25, guardrail.max_scm_percent * 0.7) * 10) / 10;
  const scmPctOptB = Math.round(Math.min(35, guardrail.max_scm_percent) * 10) / 10;
  const scmType = payload.scm_type ?? 'fly_ash';
  if (!['fly_ash', 'bottom_ash', 'slag_ggbs', 'hydraulic_cement'].includes(scmType)) {
    return c.json({ status: 'error', error: 'Unsupported scm_type.' }, 400);
  }
  const buildOption = (scmPercent) => {
    const mix = calculateConcreteMix({ fcTargetMpa: fcPrimeMpa, elementType, slumpCm, scmType, scmPercent });
    const carbon = calculateEmbodiedCarbon({
      cementOpcKg: mix.mix_proportions_per_m3.cement_opc_kg,
      scmKg: mix.mix_proportions_per_m3.scm_kg,
      scmType,
      caKg: mix.mix_proportions_per_m3.coarse_aggregate_kg,
      sandKg: mix.mix_proportions_per_m3.fine_aggregate_sand_kg,
      waterKg: mix.mix_proportions_per_m3.water_kg,
      volumeM3
    });
    const cost = {total_baseline_cost_thb:null,total_savings_thb:null,reason:'Verified project and supplier prices are not available.'};
    return { mix, carbon, cost };
  };
  const optionA = buildOption(scmPctOptA);
  const optionB = buildOption(scmPctOptB);

  // 3. Draft technical specification using Typhoon LLM with a configured live provider
  const typhoon = new TyphoonClient();
  const spec = await typhoon.generateSpecification({
    projectName,
    elementType,
    fcMpa: fcPrimeMpa,
    ageDays: guardrail.recommended_test_age_days,
    scmName: scmType,
    scmPct: scmPctOptA,
    wbRatio: optionA.mix.max_wb_ratio,
    curingDays: guardrail.mandatory_curing_days,
    standardsContext: [
      'มอก. 2594 ปูนซีเมนต์ไฮดรอลิก',
      'มอก. 2135 เถ้าลอยสำหรับใช้เป็นวัสดุผสมในคอนกรีต',
      'มยผ. 1101-64 มาตรฐานงานคอนกรีตและคอนกรีตเสริมเหล็ก กรมโยธาธิการและผังเมือง',
      'ACI 207.2R Guide to Mass Concrete (Delta T <= 20 deg C)'
    ]
  });

  // 4. Match certified Thai products
  const scmTerms = {
    fly_ash: /fly ash|เถ้าลอย/i,
    bottom_ash: /bottom ash|เถ้าหนัก/i,
    slag_ggbs: /slag|ตะกรัน/i,
    hydraulic_cement: /hydraulic cement|ปูนซีเมนต์ไฮดรอลิก/i
  }[scmType];
  const matchedProducts = THAI_CERTIFIED_CATALOG.filter(product =>
    product.element_suitability.includes(elementType) &&
    fcPrimeMpa >= product.fc_range_mpa[0] && fcPrimeMpa <= product.fc_range_mpa[1] &&
    scmTerms.test(`${product.name} ${product.notes}`)
  );
  const checklist = [
    'Submit trial mix results for the selected proportions before placement.',
    `Verify certified material documentation for ${scmType} and cement.`,
    `Maintain moist curing for at least ${guardrail.mandatory_curing_days} days.`
  ];
  if (guardrail.thermal_control_plan_required) checklist.push('Submit a thermal control plan with core and surface temperature monitoring and Delta T <= 20 deg C.');
  if (guardrail.early_strength_required) checklist.push('Submit early-age strength results demonstrating the required release strength before stressing.');
  const complianceMatrix = [
    { requirement: 'Specified compressive strength', criterion: `${fcPrimeMpa} MPa at ${guardrail.recommended_test_age_days} days`, status: 'design_input' },
    { requirement: 'SCM replacement limit', criterion: `<= ${guardrail.max_scm_percent}%`, status: scmPctOptB <= guardrail.max_scm_percent ? 'compliant' : 'review_required' },
    { requirement: 'Moist curing', criterion: `>= ${guardrail.mandatory_curing_days} days`, status: 'checklist_required' }
  ];
  if (guardrail.thermal_control_plan_required) complianceMatrix.push({ requirement: 'Mass concrete thermal control', criterion: 'Delta T <= 20 deg C', status: 'plan_and_monitor' });
  if (guardrail.early_strength_required) complianceMatrix.push({ requirement: 'Early strength before stressing', criterion: 'Verify project release strength at 3-7 days', status: 'test_required' });

  return c.json({
    status: 'success',
    project_name: projectName,
    element_type: elementType,
    guardrail,
    baseline: {
      carbon_intensity_kg_m3: optionA.carbon.baseline_carbon_intensity_kgco2e_m3,
      total_carbon_tco2e: optionA.carbon.total_baseline_carbon_tco2e,
      estimated_cost_thb: optionA.cost.total_baseline_cost_thb
    },
    options: {
      option_a: {
        name: 'สูตรสมดุล (Balanced Mix Design)',
        scm_replacement_percent: scmPctOptA,
        carbon_reduction_percent: optionA.carbon.carbon_reduction_percent,
        total_carbon_saved_tco2e: optionA.carbon.total_carbon_saved_tco2e,
        total_savings_thb: optionA.cost.total_savings_thb,
        max_wb_ratio: optionA.mix.max_wb_ratio,
        acceptance_age_days: guardrail.recommended_test_age_days,
        proportions: optionA.mix.mix_proportions_per_m3,
        cost: optionA.cost,
        carbon: optionA.carbon
      },
      option_b: {
        name: 'สูตรลดคาร์บอนสูง (Higher SCM Mix)',
        scm_replacement_percent: scmPctOptB,
        carbon_reduction_percent: optionB.carbon.carbon_reduction_percent,
        total_carbon_saved_tco2e: optionB.carbon.total_carbon_saved_tco2e,
        total_savings_thb: optionB.cost.total_savings_thb,
        max_wb_ratio: optionB.mix.max_wb_ratio,
        acceptance_age_days: guardrail.recommended_test_age_days,
        proportions: optionB.mix.mix_proportions_per_m3,
        cost: optionB.cost,
        carbon: optionB.carbon
      }
    },
    matched_product: matchedProducts[0] ?? null,
    matched_products: matchedProducts,
    generation_mode: typhoon.lastGenerationMode,
    model: typhoon.model || 'typhoon-v2.5-30b-a3b-instruct',
    technical_package: {
      generation_mode: typhoon.lastGenerationMode,
      model: typhoon.model || 'typhoon-v2.5-30b-a3b-instruct',
      spec_clause_th: spec.thPart,
      spec_clause_en: spec.enPart,
      submittal_checklist: checklist,
      compliance_matrix: complianceMatrix
    }
  });
});

// ==================== STREAMING AI CHAT COPILOT WITH TOOL CALLING ====================

export async function executeCivilTool(name, args = {}) {
  const num = (v, fallback, min = 0) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= min ? n : fallback;
  };

  if (name === 'calculateConcreteMix') {
    return calculateConcreteMix({
      fcTargetMpa: num(args.fcTargetMpa, 35, 1),
      elementType: typeof args.elementType === 'string' ? args.elementType : 'beam_slab',
      slumpCm: num(args.slumpCm, 12, 1),
      scmType: typeof args.scmType === 'string' ? args.scmType : 'fly_ash',
      scmPercent: num(args.scmPercent, 25, 0)
    });
  }
  if (name === 'calculateEmbodiedCarbon') {
    return calculateEmbodiedCarbon({
      cementOpcKg: num(args.cementOpcKg, 270, 0),
      scmKg: num(args.scmKg, 90, 0),
      scmType: typeof args.scmType === 'string' ? args.scmType : 'fly_ash',
      volumeM3: num(args.volumeM3, 100, 0.1)
    });
  }
  if (name === 'evaluateThermalMassConcrete') {
    return evaluateThermalMassConcrete({
      thicknessM: num(args.thicknessM, 1.5, 0.1),
      totalBinderKgM3: num(args.totalBinderKgM3, 380, 50),
      scmPercent: num(args.scmPercent, 30, 0),
      scmType: typeof args.scmType === 'string' ? args.scmType : 'fly_ash',
      placingTempC: num(args.placingTempC, 30, 0)
    });
  }
  if (name === 'convertConcreteStrength') {
    return convertConcreteStrength({
      value: num(args.value, 280, 1),
      fromFormat: typeof args.fromFormat === 'string' ? args.fromFormat : 'cylinder_ksc'
    });
  }
  throw new Error(`Unknown civil tool: ${name}`);
}

export function extractRequirementsDeterministic(text) {
  const items = [];
  const mpaRegex = /(?:f'?c\s*=?\s*|กำลังอัด\s*(?:ระบุ\s*)?)?(\d+(?:\.\d+)?)\s*(?:MPa|เมกะปาสคาล)/i;
  const kscRegex = /(?:f'?c\s*=?\s*|กำลังอัด\s*(?:ระบุ\s*)?)?(\d+(?:\.\d+)?)\s*(?:ksc|กก\.\/ตร\.ซม\.)/i;
  const volRegex = /(?:ปริมาตร\s*|จำนวน\s*|volume\s*)?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:m3|m³|ลบ\.ม\.|ลูกบาศก์เมตร)/i;

  let currentElem = null;
  if (/ฐานราก|mat|footing|foundation/i.test(text)) currentElem = 'mat_foundation';
  else if (/เสา|column/i.test(text)) currentElem = 'column';
  else if (/โพสเทนชัน|post-?tension|pt\s*slab/i.test(text)) currentElem = 'pt_slab';
  else if (/คาน|พื้น|beam|slab/i.test(text)) currentElem = 'beam_slab';

  let mpaVal = null;
  const mpaMatch = text.match(mpaRegex);
  if (mpaMatch) {
    mpaVal = parseFloat(mpaMatch[1]);
  } else {
    const kscMatch = text.match(kscRegex);
    if (kscMatch) {
      mpaVal = Math.round((parseFloat(kscMatch[1]) / 10.1972) * 10) / 10;
    }
  }

  let volVal = null;
  const volMatch = text.match(volRegex);
  if (volMatch) {
    volVal = parseFloat(volMatch[1].replace(/,/g, ''));
  }

  if (mpaVal || volVal || currentElem || /คอนกรีต|concrete/i.test(text)) {
    items.push({
      element_type: currentElem,
      fc_prime_mpa: mpaVal,
      volume_m3: volVal,
      quote: text.slice(0, 150)
    });
  }

  return items;
}

// ==================== TWO-STEP WORKFLOW: EXTRACT REQUIREMENTS ====================

app.post('/api/extract-requirements', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const extractions = Array.isArray(body.extractions) ? body.extractions : [];

  const combinedText = text || extractions.map(e => e.exact_text || '').join('\n');
  if (!combinedText) {
    return c.json({ status: 'error', error: 'Text or extractions are required.' }, 400);
  }

  const typhoon = new TyphoonClient();
  let items = [];

  if (typhoon.apiKey) {
    try {
      const resp = await typhoon.chat({
        messages: [
          { role: 'system', content: 'You are a civil engineering parser. Extract concrete requirements as JSON {"items":[{"element_type":"mat_foundation|beam_slab|column|pt_slab","fc_prime_mpa":number,"volume_m3":number,"quote":"..."}]}. If field is missing, set to null.' },
          { role: 'user', content: combinedText }
        ],
        maxTokens: 2500
      });
      const parsed = JSON.parse(resp.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, ''));
      items = parsed.items || [];
    } catch {
      items = extractRequirementsDeterministic(combinedText);
    }
  } else {
    items = extractRequirementsDeterministic(combinedText);
  }

  const validatedItems = items.map((item, index) => {
    const missing = [];
    if (!item.element_type || !['mat_foundation', 'beam_slab', 'column', 'pt_slab'].includes(item.element_type)) {
      missing.push('element_type');
    }
    if (!Number.isFinite(item.fc_prime_mpa) || item.fc_prime_mpa <= 0) {
      missing.push('fc_prime_mpa');
    }
    if (!Number.isFinite(item.volume_m3) || item.volume_m3 <= 0) {
      missing.push('volume_m3');
    }

    return {
      id: `req-${index + 1}`,
      element_type: item.element_type || null,
      fc_prime_mpa: item.fc_prime_mpa || null,
      volume_m3: item.volume_m3 || null,
      slump_cm: item.slump_cm || 12,
      scm_type: item.scm_type || 'fly_ash',
      quote: item.quote || item.original_text || combinedText.slice(0, 100),
      missing_fields: missing,
      status: missing.length === 0 ? 'READY' : 'NEEDS_INPUT'
    };
  });

  return c.json({
    status: 'success',
    total_found: validatedItems.length,
    all_ready: validatedItems.every(i => i.status === 'READY'),
    items: validatedItems
  });
});

app.post('/api/chat', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const messages = body.messages || [];
  const stream = body.stream !== false; // default true
  const useTools = body.tools !== false;

  const typhoon = new TyphoonClient();
  const systemPrompt = `คุณคือ GreenSpec Senior Civil AI Copilot วิศวกรผู้เชี่ยวชาญด้านคอนกรีตคาร์บอนต่ำ การออกแบบส่วนผสม ACI 211.1 และมาตรฐาน มอก., มยผ., วสท. ของไทย
คุณมีเครื่องมือคำนวณวิศวกรรม (Civil Engineering Tools) เช่น calculateConcreteMix, calculateEmbodiedCarbon, evaluateThermalMassConcrete, convertConcreteStrength
เมื่อผู้ใช้ถามให้คำนวณหรือตรวจสอบส่วนผสมคอนกรีต จงเรียกใช้เครื่องมือที่เหมาะสมเสมอ
หากผู้ใช้ระบุข้อมูลไม่ครบถ้วน (เช่น ขาดกำลังอัด f'c หรือประเภทโครงสร้าง) ให้ถามข้อมูลเพิ่มอย่างสุภาพก่อนเรียกเครื่องมือ`;

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  if (!stream) {
    if (useTools && typhoon.apiKey) {
      try {
        const result = await typhoon.chatWithTools({
          messages: fullMessages,
          toolHandler: executeCivilTool
        });
        return c.json(result);
      } catch (err) {
        if (err.code === 'AI_NOT_CONFIGURED') throw err;
      }
    }
    const reply = await typhoon.chat({ messages: fullMessages });
    return c.json({ reply, tool_executions: [] });
  }

  // Server-Sent Events (SSE) Streaming
  const textStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        let toolExecutions = [];
        let finalReply = '';

        if (useTools && typhoon.apiKey) {
          try {
            const toolResult = await typhoon.chatWithTools({
              messages: fullMessages,
              toolHandler: executeCivilTool
            });
            toolExecutions = toolResult.tool_executions || [];
            finalReply = toolResult.reply || '';
          } catch (toolErr) {
            // If tool calling fails or no tools invoked, fallback to direct streaming
          }
        }

        if (toolExecutions.length > 0 || finalReply) {
          if (toolExecutions.length > 0) {
            // Emit tool executions payload first
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tool_executions', tool_executions: toolExecutions })}\n\n`));
          }
          
          // Stream the synthetic/summary text
          const chunkSize = 25;
          for (let i = 0; i < finalReply.length; i += chunkSize) {
            const chunk = finalReply.slice(i, i + chunkSize);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }
        } else {
          // Standard real-time token stream
          for await (const chunk of typhoon.chatStream({ messages: fullMessages })) {
            const payload = JSON.stringify({ chunk });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({error:"AI request could not finish.",code:err.code??"JOB_FAILED"})}\n\n`));
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

registerWorkflow(app);

// Vercel Serverless Function compatibility adapter (like AIlaw/src/api/vercel.ts)
const listener = getRequestListener(handleFetch);

export function handleFetch(req) {
  const url = new URL(req.url);
  const routed = url.searchParams.get('__gs_path');
  url.searchParams.delete('__gs_path');
  const matchedPath = routed ? '/api/' + routed : req.headers.get('x-matched-path');
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
