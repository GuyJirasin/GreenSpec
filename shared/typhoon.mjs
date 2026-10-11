/**
 * OpenTyphoon LLM Client (TypeScript / ESM)
 * Supports both standard JSON responses and Server-Sent Events (SSE) Streaming.
 */

export const CIVIL_ENGINEERING_TOOLS = [
  {
    type: "function",
    function: {
      name: "calculateConcreteMix",
      description: "คำนวณสัดส่วนผสมคอนกรีตตามมาตรฐาน ACI 211.1 (น้ำหนัก ปูนซีเมนต์, เถ้าลอย SCM, หิน, ทราย, น้ำ, น้ำยาลดน้ำ ต่อ 1 ลบ.ม.)",
      parameters: {
        type: "object",
        properties: {
          fcTargetMpa: { type: "number", description: "กำลังอัดระบุ f'c (Cylinder) ในหน่วย MPa เช่น 28, 35, 40" },
          elementType: { type: "string", enum: ["beam_slab", "column", "mat_foundation", "pt_slab"], description: "ประเภทชิ้นส่วนโครงสร้าง" },
          scmType: { type: "string", enum: ["fly_ash", "bottom_ash", "slag_ggbs", "hydraulic_cement"], description: "ชนิดวัสดุประสานทดแทน (SCM)" },
          scmPercent: { type: "number", description: "ร้อยละการแทนที่ด้วย SCM เช่น 20, 25, 30, 35%" },
          slumpCm: { type: "number", description: "ค่ายุบตัว (cm) เช่น 10, 12, 15" }
        },
        required: ["fcTargetMpa", "elementType"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculateEmbodiedCarbon",
      description: "คำนวณ Embodied Carbon ของคอนกรีตตามค่า อบก. (TGO) เปรียบเทียบกับสูตรลดคาร์บอน",
      parameters: {
        type: "object",
        properties: {
          cementOpcKg: { type: "number", description: "น้ำหนักปูนซีเมนต์ OPC (กก./ลบ.ม.)" },
          scmKg: { type: "number", description: "น้ำหนัก SCM เช่น เถ้าลอย (กก./ลบ.ม.)" },
          scmType: { type: "string", enum: ["fly_ash", "bottom_ash", "slag_ggbs", "hydraulic_cement"] },
          volumeM3: { type: "number", description: "ปริมาตรคอนกรีตรวมทั้งโครงการ (ลบ.ม.)" }
        },
        required: ["cementOpcKg", "volumeM3"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "evaluateThermalMassConcrete",
      description: "ตรวจสอบความร้อนสะสมและความเสี่ยงแตกร้าวในคอนกรีตหลาใหญ่ (Mass Concrete) และ DEF ตาม ACI 207",
      parameters: {
        type: "object",
        properties: {
          thicknessM: { type: "number", description: "ความหนาของโครงสร้าง (เมตร)" },
          totalBinderKgM3: { type: "number", description: "ปริมาณวัสดุประสานรวม (กก./ลบ.ม.)" },
          scmPercent: { type: "number", description: "ร้อยละ SCM" },
          scmType: { type: "string", enum: ["fly_ash", "bottom_ash", "slag_ggbs"] },
          placingTempC: { type: "number", description: "อุณหภูมิขณะเท (°C)" }
        },
        required: ["thicknessM"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "convertConcreteStrength",
      description: "แปลงหน่วยกำลังอัดคอนกรีตระหว่าง Cylinder และ Cube ทั้ง ksc และ MPa ตาม มยผ. 1101-64",
      parameters: {
        type: "object",
        properties: {
          value: { type: "number", description: "ค่ากำลังอัด เช่น 280, 350, 35" },
          fromFormat: { type: "string", enum: ["cylinder_ksc", "cube_ksc", "cylinder_mpa", "cube_mpa"] }
        },
        required: ["value", "fromFormat"]
      }
    }
  }
];

export class TyphoonClient {
  constructor({ apiKey = "", baseUrl = "https://api.opentyphoon.ai/v1", model = "typhoon-v2.5-30b-a3b-instruct" } = {}) {
    this.apiKey = apiKey || process.env.TYPHOON_API_KEY || "";
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.baseUrl = (process.env.TYPHOON_BASE_URL || this.baseUrl).replace(/\/$/, "");
    this.model = process.env.TYPHOON_MODEL || model;
    this.lastGenerationMode = null;
  }

  /**
   * Standard completion returning complete text
   */
  async chat({ messages, temperature = 0.2, maxTokens = 3500 }) {
    if (!this.apiKey) throw Object.assign(new Error('Set TYPHOON_API_KEY before using AI analysis.'), {code:'AI_NOT_CONFIGURED'});

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenTyphoon API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    this.lastGenerationMode = "live";
    return data.choices?.[0]?.message?.content || "";
  }

  /**
   * Completion with Tool Calling (Function Calling)
   */
  async chatWithTools({ messages, tools = CIVIL_ENGINEERING_TOOLS, toolHandler, temperature = 0.2, maxTokens = 3500 }) {
    if (!this.apiKey) throw Object.assign(new Error('Set TYPHOON_API_KEY before using AI analysis.'), {code:'AI_NOT_CONFIGURED'});

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        tools: tools && tools.length > 0 ? tools : undefined,
        temperature,
        max_tokens: maxTokens,
        stream: false
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenTyphoon API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    this.lastGenerationMode = "live";
    const choice = data.choices?.[0];
    const message = choice?.message || {};
    const toolExecutions = [];

    if (message.tool_calls && message.tool_calls.length > 0 && toolHandler) {
      const updatedMessages = [...messages, message];
      for (const call of message.tool_calls) {
        let args = {};
        try { args = JSON.parse(call.function?.arguments || "{}"); } catch {}
        let result;
        try {
          result = await toolHandler(call.function?.name, args);
        } catch (toolErr) {
          result = { error: toolErr.message };
        }
        toolExecutions.push({
          tool: call.function?.name,
          args,
          result
        });
        updatedMessages.push({
          role: "tool",
          name: call.function?.name,
          tool_call_id: call.id,
          content: JSON.stringify(result)
        });
      }

      // Second turn: LLM synthesizes natural language response using tool results
      const finalReply = await this.chat({ messages: updatedMessages, temperature, maxTokens });
      return {
        reply: finalReply,
        tool_executions: toolExecutions
      };
    }

    return {
      reply: message.content || "",
      tool_executions: []
    };
  }


  /**
   * Streaming completion returning an async iterator of token chunks (SSE)
   */
  async *chatStream({ messages, temperature = 0.2, maxTokens = 3500 }) {
    if (!this.apiKey) throw Object.assign(new Error('Set TYPHOON_API_KEY before using AI analysis.'), {code:'AI_NOT_CONFIGURED'});

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true
      })
    });

    if (!res.ok || !res.body) {
      const errText = await res.text();
      throw new Error(`OpenTyphoon streaming error (${res.status}): ${errText}`);
    }

    this.lastGenerationMode = "live";
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const jsonStr = trimmed.replace(/^data:\s*/, "");
        if (jsonStr === "[DONE]") return;

        try {
          const parsed = JSON.parse(jsonStr);
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (chunk) yield chunk;
        } catch {
          // ignore keep-alive or partial JSON
        }
      }
    }
  }

  /**
   * Drafts complete CSI 3-Part Technical Specification
   */
  async generateSpecification({
    projectName = "Bangkok Project",
    elementType = "mat_foundation",
    fcMpa = 35.0,
    ageDays = 28,
    scmName = "เถ้าลอยแม่เมาะ",
    scmPct = 30.0,
    wbRatio = 0.40,
    curingDays = 14,
    standardsContext = []
  }) {
    const prompt = `
โครงการ: ${projectName}
ชิ้นส่วนโครงสร้าง: ${elementType}
กำลังอัดระบุ f'c: ${fcMpa} MPa (Cylinder)
อายุตรวจรับกำลังอัด: ${ageDays} วัน
สูตรผสมที่ผ่านการตรวจสอบ: ${scmName} (สัดส่วน ${scmPct}%)
อัตราส่วนน้ำต่อวัสดุประสาน (W/B) สูงสุด: ${wbRatio}
ระยะเวลาบ่มชื้นขั้นต่ำ: ${curingDays} วัน

มาตรฐานอ้างอิง:
${standardsContext.map(s => `- ${s}`).join("\n")}

กรุณาร่างข้อกำหนด TOR ในหมวด SECTION 03 30 00 - CAST-IN-PLACE CONCRETE แบ่งเป็น 2 ส่วนชัดเจน:
1. ข้อกำหนดภาษาไทย (CSI 3-Part: ทั่วไป, วัสดุ, การดำเนินการก่อสร้าง)
2. Specification ภาษาอังกฤษ (PART 1 - GENERAL, PART 2 - PRODUCTS, PART 3 - EXECUTION)
`;

    const messages = [
      {
        role: "system",
        content: "คุณคือ Senior Structural & Materials Engineer ผู้เชี่ยวชาญการร่างข้อกำหนด TOR ตามมาตรฐาน วสท. 1014, ACI 318 และ CSI MasterFormat 03 30 00. จงร่างข้อกำหนดทั้งภาษาไทยและภาษาอังกฤษอย่างมืออาชีพ"
      },
      { role: "user", content: prompt }
    ];

    const content = await this.chat({ messages, temperature: 0.2, maxTokens: 3500 });
    return this._parseOutput(content);
  }

  _parseOutput(content) {
    const splitMarkers = [
      "2. Specification ภาษาอังกฤษ",
      "Specification ภาษาอังกฤษ",
      "Specification in English",
      "PART 1 - GENERAL",
      "PART 1: GENERAL",
      "PART 1 – GENERAL"
    ];

    for (const marker of splitMarkers) {
      if (content.includes(marker)) {
        const idx = content.indexOf(marker);
        const thPart = content.slice(0, idx).trim();
        const enPart = content.slice(idx).trim();
        if (thPart.length > 100) return { thPart, enPart };
      }
    }

    const parts = content.split("\n---\n");
    if (parts.length >= 2 && parts[0].length > 200) {
      return { thPart: parts[0].trim(), enPart: parts[1].trim() };
    }

    return { thPart: content.trim(), enPart: content.trim() };
  }

}
