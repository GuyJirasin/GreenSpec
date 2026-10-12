import React,{useState,useEffect} from 'react';
import {X,Download,Check,Plus,Eye,Printer,FileText,FileSpreadsheet} from 'lucide-react';
import F1Screens from './F1Screens';
import {presentPreparedPayload} from './material-standards.mjs';
import {exportFile,stamp} from './api';
import {useLanguage} from './i18n';
import {readDemo,writeDemo,updateDemoReview,finalizeDemo} from './demo-state.mjs';
import DocumentDiffModal from './DocumentDiffModal';
import {exportFormalDocx,openFormalPrintWindow} from './formal-document-generator.mjs';
import {exportFormalExcel} from './formal-excel-generator.mjs';

export default function DemoReview({project,user,runId,stage,onStage,canEdit,FormComponent,onDocuments}) {
  const {language}=useLanguage(),th=language!=='en';
  const [rounds,setRounds]=useState(()=>readDemo(user,project.id)),[error,setError]=useState(''),[source,setSource]=useState(null);
  const [showDiffModal,setShowDiffModal]=useState(false);
  useEffect(()=>{const sync=()=>setRounds(readDemo(user,project.id));window.addEventListener('greenspec-demo-change',sync);window.addEventListener('storage',sync);return()=>{window.removeEventListener('greenspec-demo-change',sync);window.removeEventListener('storage',sync)}},[user,project.id]);
  useEffect(()=>{if(!source)return;const close=e=>{if(e.key==='Escape')setSource(null)};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[source]);
  const round=rounds.find(r=>r.id===runId)||rounds[0];
  function change(next) {try{writeDemo(user,project.id,rounds.map(r=>r.id===round.id?next:r));setError('');return next;}catch{setError(th?'บันทึกไม่สำเร็จ กรุณาตรวจสอบพื้นที่จัดเก็บของเบราว์เซอร์':'Could not save. Check browser storage.');}}
  function edit(id,changes){if(!canEdit)return;try{return change(updateDemoReview(round,id,changes))}catch(e){setError(e.message)}}
  function finish(){if(!canEdit)return;try{change(finalizeDemo(round))}catch(e){setError(e.message)}}
  function specification(){
    const lines=[
      '================================================================================',
      `GREEN SPEC — REVISED TECHNICAL SPECIFICATION (ข้อกำหนดทางเทคนิคฉบับแก้ไข)`,
      `โครงการ: ${project.name}`,
      `วันที่รับรอง: ${new Intl.DateTimeFormat('th-TH', { dateStyle: 'long' }).format(new Date())}`,
      'มาตรฐานอ้างอิง: มยผ. 1101-64 / มอก. 2594 / มอก. 2135 / ACI 207 / CSI MasterFormat',
      '================================================================================',
      ''
    ];
    let idx=1;
    for(const r of round.recs){
      const rev=round.reviews.find(v=>v.recommendation_id===r.id);
      if(rev?.decision==='APPROVED'){
        const option=round.options.find(o=>o.recommendation_id===r.id&&o.option_key===rev.selected_option);
        lines.push(`มาตรา ${idx}. ${option?.payload?.proposed_material||r.payload?.proposed_material}`);
        lines.push(`[สถานะ: ได้รับความเห็นชอบจากคณะกรรมการ (Option ${rev.selected_option})]`);
        lines.push(`ข้อกำหนดทางเทคนิค:`);
        lines.push(rev.draft_wording||option?.default_wording||'');
        lines.push(`เหตุผลทางวิศวกรรม: ${option?.payload?.rationale||''}`);
        lines.push('--------------------------------------------------------------------------------');
        lines.push('');
        idx++;
      }
    }
    return lines.join('\n');
  }
  if(!round)return <section className="card"><h2>Start your analysis</h2><p>{th?'อัปโหลดเอกสาร แล้วกดวิเคราะห์เพื่อเริ่มต้น':'Upload a document, then start your analysis.'}</p><button onClick={onDocuments}>{th?'ไปหน้าเอกสาร':'Go to Documents'}</button></section>;
  const remaining=round.reviews.filter(r=>r.decision==='UNREVIEWED').length,approved=round.reviews.filter(r=>r.decision==='APPROVED').length;
  return <>
    <div className="demo-round-toolbar">
      <label>{th?'รอบการวิเคราะห์':'Analysis round'} <select value={round.id} onChange={e=>onStage('overview',null,e.target.value)}>{rounds.map((r,i)=><option value={r.id} key={r.id}>{stamp(r.created_at)} · {r.final?'Final':'Draft'}</option>)}</select></label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          className="secondary"
          style={{ fontSize: '12px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setShowDiffModal(true)}
        >
          <Eye size={14} />
          {th ? 'ดูเปรียบเทียบเอกสาร (Diff Preview)' : 'Diff Preview'}
        </button>
        <span className="badge">{th?'ตรวจทานแล้ว':'Reviewed'} {round.reviews.length-remaining}/{round.reviews.length}</span>
      </div>
    </div>
    {round.generation_mode === 'live' && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: '#e6f4ea', border: '1px solid #137333', borderRadius: '8px', marginBottom: '14px', color: '#137333', fontSize: '13px', fontWeight: 600 }}>
        <span>⚡</span>
        <span>{th ? `วิเคราะห์สดโดย OpenTyphoon (${round.model || 'typhoon-v2.5-30b-a3b-instruct'})` : `Live Analysis by OpenTyphoon (${round.model || 'typhoon-v2.5-30b-a3b-instruct'})`}</span>
      </div>
    )}
    {(round.spec_clause_th || round.spec_clause_en) && (
      <details style={{ background: '#f8fdf9', border: '1px solid #c2e7cc', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#0d652d', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📄</span>
          <span>{th ? 'ข้อกำหนด TOR ที่ร่างโดย OpenTyphoon AI (คลิกเพื่อเปิดดูฉบับเต็ม)' : 'Technical Specifications Drafted by OpenTyphoon AI (Click to inspect)'}</span>
        </summary>
        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {round.spec_clause_th && (
            <div style={{ background: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#137333' }}>🇹🇭 ข้อกำหนดภาษาไทย (CSI 3-Part)</h4>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px', fontFamily: 'inherit', color: '#333', maxHeight: '280px', overflowY: 'auto' }}>
                {round.spec_clause_th}
              </pre>
            </div>
          )}
          {round.spec_clause_en && (
            <div style={{ background: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#137333' }}>🇬🇧 English Specification (CSI MasterFormat 03 30 00)</h4>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px', fontFamily: 'inherit', color: '#333', maxHeight: '280px', overflowY: 'auto' }}>
                {round.spec_clause_en}
              </pre>
            </div>
          )}
        </div>
      </details>
    )}
    {error&&<p className="error" role="alert">{error}</p>}
    <F1Screens {...{project,stage,FormComponent}} run={round} recs={round.recs.map(r=>({...r,payload:presentPreparedPayload(r.payload)}))} options={round.options.map(o=>({...o,payload:presentPreparedPayload(o.payload,o.option_key)}))} reviews={round.reviews} final={round.final} canEdit={canEdit&&!round.final} onStage={onStage} onSource={s=>setSource(s)} onDecision={(r,decision,locked,reason)=>edit(round.reviews.find(v=>v.recommendation_id===r.id).id,{decision,locked,...(reason===undefined?{}:{reason})})} onChange={(review,option,wording)=>edit(review.id,{selected_option:option,draft_wording:wording,decision:'UNREVIEWED',locked:false})} historyRuns={rounds} decisionSets={rounds.filter(r=>r.final).map(r=>r.final)} onRun={id=>onStage('overview',null,id)}/>
    {source&&(
      <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setSource(null)}>
        <section className="modal" role="dialog" aria-modal="true" aria-label="Contract Source Excerpt" style={{ maxWidth: '640px' }}>
          <button autoFocus className="icon close" aria-label="Close" onClick={()=>setSource(null)}><X/></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <FileText size={20} color="#059669" />
            <h2 style={{ margin: 0, fontSize: '18px' }}>{th ? 'ข้อความอ้างอิงจากเอกสารสัญญาต้นฉบับ' : 'Contract Source Excerpt'}</h2>
          </div>
          {source.document_name && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '4px', fontSize: '12px', color: '#065f46', fontWeight: 600, margin: '8px 0 12px 0' }}>
              <span>📑 {source.document_name}</span>
              {source.locator?.section && <span>· {source.locator.section}</span>}
            </div>
          )}
          <blockquote style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '14px', background: '#f8fafc', borderLeft: '4px solid #059669', padding: '14px 16px', borderRadius: '0 6px 6px 0', color: '#1e293b', margin: '12px 0' }}>
            {source.exact_text}
          </blockquote>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button className="secondary" onClick={()=>setSource(null)}>{th ? 'ปิดหน้าต่าง' : 'Close'}</button>
          </div>
        </section>
      </div>
    )}
    <DocumentDiffModal
      isOpen={showDiffModal}
      project={project}
      round={round}
      canEdit={canEdit}
      onClose={()=>setShowDiffModal(false)}
    />
  </>;
}

