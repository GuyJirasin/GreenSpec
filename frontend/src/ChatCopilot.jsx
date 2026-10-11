import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Calculator, Flame, Leaf, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useLanguage } from './i18n';

export default function ChatCopilot({ project }) {
  const { language } = useLanguage();
  const th = language !== 'en';
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: th
        ? 'สวัสดีครับ ผมคือ GreenSpec Civil AI Copilot วิศวกรผู้ช่วยด้านคอนกรีตคาร์บอนต่ำ การออกแบบส่วนผสม ACI 211.1 และมาตรฐาน มอก., มยผ. ของไทย คุณสามารถถามเรื่องสเปกคอนกรีต หรือให้ผมเรียก Tool ช่วยคำนวณส่วนผสม คาร์บอน และความร้อนได้เลยครับ'
        : 'Hello! I am GreenSpec Civil AI Copilot, your engineering assistant for low-carbon concrete, ACI 211.1 mix design, and Thai standards (TIS, DPT, EIT). Feel free to ask or have me calculate mix proportions, embodied carbon, or thermal risks!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    { label: th ? 'คำนวณคอนกรีตฐานราก 35 MPa' : 'Mix design for mat foundation 35 MPa', text: th ? 'ช่วยคำนวณสัดส่วนผสมคอนกรีตฐานราก 35 MPa ใช้เถ้าลอย 25% ให้หน่อย' : 'Calculate concrete mix proportions for a 35 MPa mat foundation with 25% fly ash.' },
    { label: th ? 'คำนวณคาร์บอน 1,500 m³' : 'Carbon calc for 1,500 m³', text: th ? 'ช่วยคำนวณ Embodied Carbon คอนกรีตปริมาตร 1500 m3 ใช้ปูน 320 กก. เถ้าลอย 100 กก.' : 'Calculate embodied carbon for 1,500 m3 concrete with 320 kg OPC and 100 kg Fly Ash.' },
    { label: th ? 'ตรวจความร้อนฐานรากหนา 1.8 ม.' : 'Thermal check 1.8m footing', text: th ? 'ตรวจสอบความร้อนคอนกรีตฐานรากหนา 1.8 เมตร ใช้ปูนรวม 400 กก./ลบ.ม. เถ้าลอย 30% เสี่ยงแตกร้าวไหม' : 'Check thermal cracking risk for a 1.8m thick mass concrete mat foundation with 400 kg binder and 30% fly ash.' },
    { label: th ? 'แปลง 280 ksc เป็น MPa' : 'Convert 280 ksc to MPa', text: th ? 'แปลงกำลังอัด 280 ksc cylinder เป็นหน่วย MPa ให้หน่อย' : 'Convert 280 cylinder ksc concrete strength to MPa.' }
  ];

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  async function handleSend(userText) {
    const textToSend = (userText || input).trim();
    if (!textToSend || loading) return;

    const userMsg = { id: crypto.randomUUID(), role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const assistantMsgId = crypto.randomUUID();
    let accumulatedContent = '';
    let toolExecutions = [];

    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', tool_executions: [] }]);

    try {
      const history = messages
        .filter(m => m.id !== 'welcome' && (typeof m.content === 'string' && m.content.trim().length > 0))
        .concat(userMsg)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          stream: true,
          tools: true
        })
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split('\n');
        // Preserve incomplete trailing line in streamBuffer
        streamBuffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payloadStr = trimmed.replace(/^data:\s*/, '').trim();
          if (payloadStr === '[DONE]') break;

          try {
            const data = JSON.parse(payloadStr);
            if (data.type === 'tool_executions' && Array.isArray(data.tool_executions)) {
              toolExecutions = data.tool_executions;
              setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, tool_executions: toolExecutions } : m));
            } else if (data.chunk) {
              accumulatedContent += data.chunk;
              setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: accumulatedContent, tool_executions: toolExecutions } : m));
            } else if (data.error) {
              accumulatedContent += `\n⚠️ ${data.error}`;
              setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: accumulatedContent } : m));
            }
          } catch (e) {
            // ignore partial JSON parse errors
          }
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
        ...m,
        content: th
          ? 'ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI กรุณาลองใหม่อีกครั้ง'
          : 'Sorry, an error occurred while connecting to the AI. Please try again.'
      } : m));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating launcher button */}
      <button
        type="button"
        className="greenspec-copilot-launcher"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open GreenSpec AI Copilot"
        title="GreenSpec Civil AI Copilot"
      >
        {isOpen ? <X size={22} /> : (
          <>
            <Sparkles size={20} className="sparkle-icon" />
            <span className="copilot-btn-text">AI Copilot</span>
          </>
        )}
      </button>

      {/* Copilot Drawer / Popover Window */}
      {isOpen && (
        <aside className="greenspec-copilot-window" aria-label="GreenSpec AI Copilot Chat">
          <header className="greenspec-copilot-header">
            <div className="header-title">
              <div className="avatar-icon">
                <Sparkles size={18} />
              </div>
              <div>
                <strong>Civil AI Copilot</strong>
                <span className="status-badge">ACI 211.1 & TGO Tools Online</span>
              </div>
            </div>
            <button
              type="button"
              className="icon-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close copilot"
            >
              <X size={18} />
            </button>
          </header>

          {/* Quick suggestion chips */}
          <div className="greenspec-copilot-chips">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                type="button"
                className="chip-btn"
                disabled={loading}
                onClick={() => handleSend(q.text)}
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Messages list */}
          <div className="greenspec-copilot-messages">
            {messages.map((m) => (
              <div key={m.id} className={`message-row ${m.role}`}>
                <div className="message-bubble">
                  {/* Text content */}
                  <div className="message-text" style={{ whiteSpace: 'pre-wrap' }}>
                    {m.content}
                  </div>

                  {/* Render interactive tool execution card if any */}
                  {m.tool_executions && m.tool_executions.length > 0 && (
                    <div className="tool-cards-container">
                      {m.tool_executions.map((exec, idx) => (
                        <ToolResultCard key={idx} execution={exec} th={th} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="message-row assistant">
                <div className="message-bubble typing-bubble">
                  <RefreshCw size={14} className="spin-icon" />
                  <span>{th ? 'กำลังคำนวณและประมวลผลทางวิศวกรรม...' : 'Running engineering calculations...'}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <form
            className="greenspec-copilot-inputform"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              placeholder={th ? 'ถามเรื่องสเปกคอนกรีต หรือสั่งให้คำนวณส่วนผสม...' : 'Ask engineering specs or command mix calculations...'}
              value={input}
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="send-btn"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </form>
        </aside>
      )}
    </>
  );
}

// ==================== INTERACTIVE TOOL RESULT CARD ====================

function ToolResultCard({ execution, th }) {
  const { tool, args, result } = execution;

  if (tool === 'calculateConcreteMix' && result?.mix_proportions_per_m3) {
    const p = result.mix_proportions_per_m3;
    return (
      <div className="tool-card mix-card">
        <div className="tool-card-header">
          <Calculator size={15} />
          <strong>{th ? 'ผลคำนวณส่วนผสมคอนกรีต ACI 211.1' : 'ACI 211.1 Concrete Mix Proportions'}</strong>
          <span className="pill">{result.fc_target_mpa} MPa</span>
        </div>
        <div className="mix-grid">
          <div className="mix-item"><span className="label">ปูนซีเมนต์ (OPC)</span><strong>{p.cement_opc_kg} kg</strong></div>
          <div className="mix-item"><span className="label">เถ้าลอย (SCM)</span><strong>{p.scm_kg} kg ({p.scm_percent}%)</strong></div>
          <div className="mix-item"><span className="label">น้ำ (Water)</span><strong>{p.water_kg} kg (W/B {result.max_wb_ratio})</strong></div>
          <div className="mix-item"><span className="label">หินย่อย (Stone)</span><strong>{p.coarse_aggregate_kg} kg</strong></div>
          <div className="mix-item"><span className="label">ทราย (Sand)</span><strong>{p.fine_aggregate_sand_kg} kg</strong></div>
          <div className="mix-item"><span className="label">น้ำยาลดน้ำ (PCE)</span><strong>{p.chemical_admixture_pce_liters} L</strong></div>
        </div>
      </div>
    );
  }

  if (tool === 'calculateEmbodiedCarbon' && result) {
    return (
      <div className="tool-card carbon-card">
        <div className="tool-card-header">
          <Leaf size={15} />
          <strong>{th ? 'การประเมินคาร์บอนฟุตพริ้นท์ (TGO)' : 'TGO Embodied Carbon Assessment'}</strong>
          <span className="pill success">-{result.carbon_reduction_percent}% CO₂</span>
        </div>
        <div className="carbon-metrics">
          <div><span>Baseline:</span> <strong>{result.baseline_carbon_intensity_kgco2e_m3} kgCO₂e/m³</strong></div>
          <div><span>สูตรลดคาร์บอน:</span> <strong>{result.proposed_carbon_intensity_kgco2e_m3} kgCO₂e/m³</strong></div>
          <div><span>ประหยัดได้ทั้งโครงการ:</span> <strong className="highlight">{result.total_carbon_saved_tco2e} tCO₂e</strong></div>
        </div>
      </div>
    );
  }

  if (tool === 'evaluateThermalMassConcrete' && result) {
    return (
      <div className={`tool-card thermal-card ${result.thermal_cracking_risk_flag ? 'warning' : 'safe'}`}>
        <div className="tool-card-header">
          <Flame size={15} />
          <strong>{th ? 'ตรวจสอบความร้อน ACI 207 Mass Concrete' : 'ACI 207 Thermal Mass Concrete Check'}</strong>
          <span className={`pill ${result.thermal_cracking_risk_flag ? 'danger' : 'success'}`}>
            ΔT = {result.estimated_delta_t_c}°C
          </span>
        </div>
        <div className="thermal-details">
          <div>อุณหภูมิแกนกลาง: <strong>{result.estimated_max_core_temp_c}°C</strong></div>
          <div>ความเสี่ยงแตกร้าว: <strong>{result.thermal_cracking_risk_flag ? 'มีความเสี่ยงสูง (เกิน 20°C)' : 'ปลอดภัย'}</strong></div>
          {result.def_risk_flag && <div className="def-alert">⚠️ เสี่ยงเกิด DEF (แกนกลาง &ge; 70°C) ต้องใช้น้ำแข็งช่วยลดอุณหภูมิเท</div>}
        </div>
      </div>
    );
  }

  if (tool === 'convertConcreteStrength' && result) {
    return (
      <div className="tool-card strength-card">
        <div className="tool-card-header">
          <CheckCircle2 size={15} />
          <strong>{th ? 'แปลงกำลังอัด มยผ. 1101-64' : 'DPT 1101-64 Strength Conversion'}</strong>
        </div>
        <div className="strength-grid">
          <div>Cylinder (15x30 cm): <strong>{result.cylinder_15x30cm.strength_mpa} MPa ({result.cylinder_15x30cm.strength_ksc} ksc)</strong></div>
          <div>Cube (15x15 cm): <strong>{result.cube_15x15cm.strength_mpa} MPa ({result.cube_15x15cm.strength_ksc} ksc)</strong></div>
        </div>
      </div>
    );
  }

  return null;
}
