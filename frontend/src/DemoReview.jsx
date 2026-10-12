import React,{useState,useEffect} from 'react';
import {X,Download,Check,Plus,Eye,Printer,FileText} from 'lucide-react';
import F1Screens from './F1Screens';
import {presentPreparedPayload} from './material-standards.mjs';
import {exportFile,stamp} from './api';
import {useLanguage} from './i18n';
import {readDemo,writeDemo,updateDemoReview,finalizeDemo} from './demo-state.mjs';
import DocumentDiffModal from './DocumentDiffModal';
import {exportFormalDocx,openFormalPrintWindow} from './formal-document-generator.mjs';

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
  function specification(){const lines=['GREEN SPEC — SPECIFICATION','Prepared example, not analysis of uploaded files.',project.name,''];for(const r of round.recs){const rev=round.reviews.find(v=>v.recommendation_id===r.id);if(rev.decision==='APPROVED'){const option=round.options.find(o=>o.recommendation_id===r.id&&o.option_key===rev.selected_option);lines.push(option.payload.proposed_material,rev.draft_wording||option.default_wording,'')}}return lines.join('\n')}
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
    {stage==='summary'&&<section className="card demo-finalize"><h3>{round.final?'Final revision':'Review & finalize'}</h3><p>{round.final?(th?'บันทึกฉบับสุดท้ายแล้ว การแก้ไขต้องเริ่มรอบใหม่':'This revision is saved. Start a new round to make changes.'):(th?`เหลือ ${remaining} รายการที่ต้องตรวจทาน เลือกอนุมัติอย่างน้อย 1 รายการก่อน Finalize`:`Review ${remaining} remaining items and approve at least one change before finalizing.`)}</p><div className="actions"><button className="secondary" onClick={()=>setShowDiffModal(true)}><Eye size={16}/>{th?'ดูเปรียบเทียบเอกสาร':'Inspect Diff'}</button><button className="secondary" onClick={()=>exportFile('greenspec-analysis.json',{demo:true,notice:'Prepared example; not analysis of uploaded files.',project:{id:project.id,name:project.name},round})}><Download size={16}/>{th?'ข้อมูลผลวิเคราะห์ (JSON)':'Analysis JSON'}</button><button className="secondary" disabled={!approved} onClick={()=>openFormalPrintWindow({project,round,greenItems:round.recs.map(r=>{const rev=round.reviews.find(v=>v.recommendation_id===r.id);const opt=round.options.find(o=>o.recommendation_id===r.id&&o.option_key===rev?.selected_option);return{section:r.payload?.element_type||'ข้อกำหนด',title:opt?.payload?.proposed_material||r.payload?.title||'วัสดุคาร์บอนต่ำ',standard:opt?.payload?.standard_ref||'มอก. 2135-2545',carbonDelta:'-32% CO₂',originalSnippet:r.payload?.baseline_text,revisedText:rev?.draft_wording||opt?.default_wording};})})}><Printer size={16}/>{th?'พิมพ์ / PDF ทางการ':'Formal PDF'}</button><button className="primary" disabled={!approved} onClick={()=>exportFormalDocx({project,round,greenItems:round.recs.map(r=>{const rev=round.reviews.find(v=>v.recommendation_id===r.id);const opt=round.options.find(o=>o.recommendation_id===r.id&&o.option_key===rev?.selected_option);return{section:r.payload?.element_type||'ข้อกำหนด',title:opt?.payload?.proposed_material||r.payload?.title||'วัสดุคาร์บอนต่ำ',standard:opt?.payload?.standard_ref||'มอก. 2135-2545',carbonDelta:'-32% CO₂',originalSnippet:r.payload?.baseline_text,revisedText:rev?.draft_wording||opt?.default_wording};})})}><FileText size={16}/>{th?'ดาวน์โหลด DOCX ทางการ':'Formal DOCX'}</button>{!round.final&&<button disabled={!canEdit||remaining>0||!approved} onClick={finish}><Check size={16}/>Finalize</button>}<button className="secondary" onClick={onDocuments}><Plus size={16}/>{th?'เริ่มรอบใหม่':'New round'}</button></div></section>}
    {source&&<div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setSource(null)}><section className="modal" role="dialog" aria-modal="true" aria-label="Reference text"><button autoFocus className="icon close" aria-label="Close" onClick={()=>setSource(null)}><X/></button><h2>Reference text</h2><p className="notice">{th?'ข้อความตัวอย่างที่เตรียมไว้ ไม่ได้ดึงจากไฟล์ที่อัปโหลด':'Prepared example text. This was not extracted from your uploaded file.'}</p><blockquote>{source.exact_text}</blockquote><button onClick={()=>setSource(null)}>{th?'ปิด':'Close'}</button></section></div>}
    <DocumentDiffModal
      isOpen={showDiffModal}
      project={project}
      round={round}
      canEdit={canEdit}
      onClose={()=>setShowDiffModal(false)}
    />
  </>;
}

