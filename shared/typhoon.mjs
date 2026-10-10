/**
 * OpenTyphoon LLM Client (TypeScript / ESM)
 * Supports both standard JSON responses and Server-Sent Events (SSE) Streaming.
 */

export class TyphoonClient {
  constructor({ apiKey = "", baseUrl = "https://api.opentyphoon.ai/v1", model = "typhoon-v2.5-30b-a3b-instruct" } = {}) {
    this.apiKey = apiKey || process.env.TYPHOON_API_KEY || "";
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.model = model;
  }

  /**
   * Standard completion returning complete text
   */
  async chat({ messages, temperature = 0.2, maxTokens = 3500 }) {
    if (!this.apiKey) {
      return this._mockResponse(messages);
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
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
    return data.choices?.[0]?.message?.content || "";
  }

  /**
   * Streaming completion returning an async iterator of token chunks (SSE)
   */
  async *chatStream({ messages, temperature = 0.2, maxTokens = 3500 }) {
    if (!this.apiKey) {
      yield this._mockResponse(messages);
      return;
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
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

  _mockResponse(messages) {
    const userMsg = messages[messages.length - 1]?.content || "";
    return `หมวดที่ 03 30 00 งานคอนกรีตโครงสร้างหล่อในที่ (คอนกรีตคาร์บอนต่ำ)
ส่วนที่ 1 - ทั่วไป: ผู้รับจ้างต้องเสนอ Mix Design และผลทดสอบ Trial Mix ล่วงหน้าไม่น้อยกว่า 35 วันก่อนเทจริง
ส่วนที่ 2 - วัสดุ: ปูนซีเมนต์ไฮดรอลิก มอก. 2594 ผสมเถ้าลอย มอก. 2135 ชั้น F
ส่วนที่ 3 - การก่อสร้าง: ต้องเทให้เสร็จภายใน 90 นาที และบ่มชื้นต่อเนื่องไม่น้อยกว่า 14 วัน
---
SECTION 03 30 00 - CAST-IN-PLACE CONCRETE (LOW-CARBON MIX SPECIFICATION)
PART 1 - GENERAL: Submit trial mix reports conforming to ASTM C39 / TIS 213 at least 35 days prior to placement.
PART 2 - PRODUCTS: Hydraulic cement (TIS 2594) with Class F fly ash (TIS 2135).
PART 3 - EXECUTION: Complete discharge within 90 minutes. Moist cure for minimum 14 days.`;
  }
}
