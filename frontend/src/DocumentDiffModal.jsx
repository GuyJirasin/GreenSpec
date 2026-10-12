import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Eye, Layers, FileText, Check, Printer } from 'lucide-react';
import { useLanguage } from './i18n';
import { exportFile } from './api';
import { exportFormalDocx, openFormalPrintWindow } from './formal-document-generator.mjs';
import ThaiGarudaEmblem from './ThaiGarudaEmblem.jsx';
import './diff-viewer.css';

export default function DocumentDiffModal({
  isOpen,
  onClose,
  project,
  document,
  round,
  canEdit
}) {
  const { language } = useLanguage();
  const th = language !== 'en';

  const [activeBbox, setActiveBbox] = useState(0);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'clean' | 'revised'
  const [syncScroll, setSyncScroll] = useState(true);

  const leftScrollRef = useRef(null);
  const rightScrollRef = useRef(null);
  const isScrollingRef = useRef(null);

  // Synchronized scrolling handler
  useEffect(() => {
    if (!isOpen || !syncScroll) return;

    const left = leftScrollRef.current;
    const right = rightScrollRef.current;
    if (!left || !right) return;

    const handleLeftScroll = () => {
      if (isScrollingRef.current === 'right') return;
      isScrollingRef.current = 'left';
      const percentage = left.scrollTop / (left.scrollHeight - left.clientHeight || 1);
      right.scrollTop = percentage * (right.scrollHeight - right.clientHeight);
      setTimeout(() => { if (isScrollingRef.current === 'left') isScrollingRef.current = null; }, 50);
    };

    const handleRightScroll = () => {
      if (isScrollingRef.current === 'left') return;
      isScrollingRef.current = 'right';
      const percentage = right.scrollTop / (right.scrollHeight - right.clientHeight || 1);
      left.scrollTop = percentage * (left.scrollHeight - left.clientHeight);
      setTimeout(() => { if (isScrollingRef.current === 'right') isScrollingRef.current = null; }, 50);
    };

    left.addEventListener('scroll', handleLeftScroll);
    right.addEventListener('scroll', handleRightScroll);

    return () => {
      left.removeEventListener('scroll', handleLeftScroll);
      right.removeEventListener('scroll', handleRightScroll);
    };
  }, [isOpen, syncScroll, viewMode]);

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const projectName = project?.name || 'โครงการก่อสร้างอาคารและโครงสร้างพื้นฐาน';
  const thaiDate = new Intl.DateTimeFormat('th-TH', { dateStyle: 'long' }).format(new Date());
  const yearBe = new Date().getFullYear() + 543;
  const docNo = `GS-TOR-${yearBe}/${String(project?.id || '01').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}`;

  // Active recommendations or realistic high-impact clauses
  const concreteRev = round?.reviews?.find(r => r.recommendation_id?.endsWith('-concrete'));
  const concreteOptB = round?.options?.find(o => o.recommendation_id?.endsWith('-concrete') && o.option_key === (concreteRev?.selected_option || 'B'));
  const liveSpecTh = round?.spec_clause_th || round?.payload?.spec_clause_th;

  const diffClauses = [
    {
      id: 'clause-1',
      title: th ? 'มาตรา 2.1 คอนกรีตฐานราก' : 'Clause 2.1: Foundation Concrete',
      section: 'หมวดที่ 2 คุณลักษณะของวัสดุ · ข้อ 2.1 คอนกรีตโครงสร้าง',
      original: {
        text: 'คอนกรีตโครงสร้างต้องมีกำลังอัดระบุ f\'c ไม่น้อยกว่า 35 MPa ที่อายุ 28 วัน (ทดสอบด้วยแท่งตัวอย่างทรงกระบอก 150x300 มม. ตาม มยผ. 1101-64) โดยใช้ปูนซีเมนต์ปอร์ตแลนด์ประเภท 1 ทั้งหมด 100% ห้ามใช้วัสดุผสมเพิ่มหรือวัสดุทดแทนโดยไม่ได้รับอนุญาต',
        label: th ? 'ฉบับร่างเดิม (ถูกแทนที่)' : 'Superseded Clause',
        note: th ? 'เกณฑ์เดิม: ปูนซีเมนต์ปอร์ตแลนด์ มอก. 15 (Embodied Carbon สูง)' : 'Baseline: Portland Cement Type 1'
      },
      revised: {
        text: concreteOptB?.default_wording || liveSpecTh || 'ให้ใช้ปูนซีเมนต์ไฮดรอลิกตามมาตรฐาน มอก. 2594 ผสมร่วมกับเถ้าลอยตามมาตรฐาน มอก. 2135 ชั้นคุณภาพ 1 หรือ 2 สัดส่วนการแทนที่ร้อยละ 35 โดยน้ำหนักของวัสดุประสานรวม ควบคุมอัตราส่วนน้ำต่อวัสดุประสาน (W/B) ไม่เกิน 0.40 คงกำลังอัดระบุ f\'c ไม่น้อยกว่า 35 MPa ที่อายุ 56 วัน และควบคุมอุณหภูมิความร้อนสะสม ΔT ≤ 20°C (ACI 207.2R) พร้อมบ่มชื้นต่อเนื่องไม่น้อยกว่า 14 วัน',
        label: th ? 'ฉบับแก้ไขเพิ่มเติม: Rev. 1.0' : 'Approved Revision: Rev. 1.0',
        note: th ? 'เกณฑ์บังคับ: มอก. 2594-2556, มอก. 2135-2545, ACI 207.2R | ค่าประเมินลดคาร์บอน: -32% Embodied CO₂e' : 'Standards: TIS 2594, TIS 2135, ACI 207.2R | -32% CO₂e'
      }
    },
    {
      id: 'clause-2',
      title: th ? 'มาตรา 2.2 เหล็กข้ออ้อย' : 'Clause 2.2: Structural Steel Rebar',
      section: 'หมวดที่ 2 คุณลักษณะของวัสดุ · ข้อ 2.2 เหล็กเสริมโครงสร้าง',
      original: {
        text: 'เหล็กเสริมคอนกรีตต้องเป็นเหล็กข้ออ้อยชั้นคุณภาพ SD40 ตามมาตรฐาน มอก. 24-2559 ขนาดตามที่ระบุในแบบก่อสร้าง ไม่ได้ระบุกระบวนการผลิตหรือการสำแดงสิ่งแวดล้อม',
        label: th ? 'ฉบับร่างเดิม (ถูกแทนที่)' : 'Superseded Clause',
        note: th ? 'เกณฑ์เดิม: มอก. 24-2559 (ไม่กำหนดสัดส่วนรีไซเคิลหรือเอกสาร EPD)' : 'Baseline: Standard Rebar'
      },
      revised: {
        text: 'เหล็กข้ออ้อยชั้นคุณภาพ SD40 หรือ SD50 ตามมาตรฐาน มอก. 24-2559 ต้องผลิตด้วยกระบวนการเตาหลอมอาร์กไฟฟ้า (Electric Arc Furnace - EAF) ที่มีสัดส่วนเศษเหล็กรีไซเคิลไม่น้อยกว่าร้อยละ 90 และผู้ผลิตต้องมีเอกสารสำแดงผลิตภัณฑ์สิ่งแวดล้อม (Environmental Product Declaration - EPD) ตาม ISO 14025',
        label: th ? 'ฉบับแก้ไขเพิ่มเติม: Rev. 1.0' : 'Approved Revision: Rev. 1.0',
        note: th ? 'เกณฑ์บังคับ: มอก. 24-2559, ISO 14025 (EPD) | ค่าประเมินลดคาร์บอน: -45% Embodied CO₂e' : 'Standards: TIS 24, ISO 14025 | -45% CO₂e'
      }
    },
    {
      id: 'clause-3',
      title: th ? 'มาตรา 2.3 ผนังมวลเบา' : 'Clause 2.3: Eco-Masonry Wall',
      section: 'หมวดที่ 2 คุณลักษณะของวัสดุ · ข้อ 2.3 งานผนังก่อ',
      original: {
        text: 'ผนังภายในอาคารให้ใช้อิฐมอญก่อสองชั้น หนา 7.0 ซม. ฉาบปูนเรียบทั้งสองด้าน ตามมาตรฐานงานสถาปัตยกรรมทั่วไป',
        label: th ? 'ฉบับร่างเดิม (ถูกแทนที่)' : 'Superseded Clause',
        note: th ? 'เกณฑ์เดิม: อิฐมอญก่อทั่วไป (ค่าการนำความร้อนสูง)' : 'Baseline: Clay Brick Masonry'
      },
      revised: {
        text: 'ผนังภายในให้ใช้บล็อกคอนกรีตมวลเบาอบไอน้ำ (Autoclaved Aerated Concrete - AAC Block) ชั้นคุณภาพ G4 หนา 10 ซม. ตามมาตรฐาน มอก. 1505-2541 ซึ่งมีค่าสัมประสิทธิ์การนำความร้อนต่ำ ช่วยลดภาระการทำความเย็นของระบบปรับอากาศในอาคาร',
        label: th ? 'ฉบับแก้ไขเพิ่มเติม: Rev. 1.0' : 'Approved Revision: Rev. 1.0',
        note: th ? 'เกณฑ์บังคับ: มอก. 1505-2541 | ค่าประเมินลดคาร์บอน: -18% Embodied CO₂e' : 'Standards: TIS 1505 | -18% CO₂e'
      }
    }
  ];

  function jumpToBbox(index) {
    setActiveBbox(index);
    const targetId = diffClauses[index]?.id;
    if (!targetId) return;

    const leftEl = leftScrollRef.current?.querySelector(`[data-bbox-id="${targetId}"]`);
    const rightEl = rightScrollRef.current?.querySelector(`[data-bbox-id="${targetId}"]`);

    if (leftEl) leftEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (rightEl) rightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function jumpToPage(pageNum) {
    const leftPage = leftScrollRef.current?.querySelector(`[data-page="${pageNum}"]`);
    const rightPage = rightScrollRef.current?.querySelector(`[data-page="${pageNum}"]`);
    if (leftPage) leftPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (rightPage) rightPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const greenItems = diffClauses.map(c => ({
    section: c.section,
    title: c.title,
    standard: c.revised.note,
    carbonDelta: '-32% CO₂',
    originalSnippet: c.original.text,
    revisedText: c.revised.text
  }));

  function handleExportDiffJson() {
    exportFile(`diff-report-${project?.name || 'project'}.json`, {
      project_name: project?.name,
      document_title: document?.title || document?.filename,
      generated_at: new Date().toISOString(),
      clauses: diffClauses
    });
  }

  async function handleExportDocx() {
    await exportFormalDocx({ project, document, round, greenItems });
  }

  function handlePrintPdf() {
    openFormalPrintWindow({ project, document, round, greenItems });
  }

  return (
    <div className="diff-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="diff-modal" role="dialog" aria-modal="true" aria-label="Specification Diff Viewer">
        
        {/* Top Reviewer Header */}
        <header className="diff-modal-header">
          <div className="diff-modal-title-group">
            <h2>
              <Eye size={18} color="#10b981" />
              <span>{th ? 'การตรวจทานเปรียบเทียบข้อกำหนด (Specification Diff Review)' : 'Specification Diff Review'}</span>
            </h2>
            <span className="diff-doc-tag">{docNo}</span>
          </div>

          <div className="diff-stats-bar">
            <span className="diff-stat-chip green">
              <span>{th ? '3 จุดแก้ไขเพิ่มเติม' : '3 Clause Amendments'}</span>
            </span>
            <span className="diff-stat-chip blue">
              <span>{th ? 'ประเมินลดคาร์บอนแฝง -32%' : '-32% Embodied CO₂'}</span>
            </span>
            <button type="button" className="icon close" onClick={onClose} aria-label="Close modal">
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Sub-toolbar: Jump Chips & Layout Modes */}
        <div className="diff-sub-toolbar">
          <div className="diff-jump-chips">
            <span className="diff-jump-label">{th ? 'กระโดดไปยังมาตรา:' : 'Clauses:'}</span>
            {diffClauses.map((clause, idx) => (
              <button
                key={clause.id}
                type="button"
                className={`diff-jump-btn ${activeBbox === idx ? 'active' : ''}`}
                onClick={() => jumpToBbox(idx)}
              >
                <span>{clause.title}</span>
              </button>
            ))}

            <span className="diff-jump-label" style={{ marginLeft: '8px' }}>{th ? 'หน้า:' : 'Page:'}</span>
            {[1, 2, 3].map(page => (
              <button
                key={page}
                type="button"
                className="diff-jump-btn"
                style={{ padding: '4px 8px', minWidth: '28px' }}
                onClick={() => jumpToPage(page)}
              >
                <span>{page}</span>
              </button>
            ))}
          </div>

          <div className="diff-view-controls">
            <label className="diff-sync-toggle">
              <input
                type="checkbox"
                checked={syncScroll}
                onChange={(e) => setSyncScroll(e.target.checked)}
              />
              <span>{th ? 'เลื่อนเอกสารพร้อมกัน' : 'Synchronized Scroll'}</span>
            </label>
            <div className="view-mode-tabs" style={{ display: 'inline-flex', gap: '4px' }}>
              <button
                type="button"
                className={viewMode === 'split' ? 'active' : ''}
                style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}
                onClick={() => setViewMode('split')}
              >
                {th ? 'เปรียบเทียบเคียงข้าง (Side-by-Side)' : 'Side-by-Side'}
              </button>
              <button
                type="button"
                className={viewMode === 'clean' ? 'active' : ''}
                style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}
                onClick={() => setViewMode('clean')}
              >
                {th ? 'ร่างสัญญาฉบับปรับปรุง (Clean TOR)' : 'Clean TOR'}
              </button>
              <button
                type="button"
                className={viewMode === 'revised' ? 'active' : ''}
                style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}
                onClick={() => setViewMode('revised')}
              >
                {th ? 'เฉพาะจุดแก้ไข (Revisions Only)' : 'Revisions Only'}
              </button>
            </div>
          </div>
        </div>

        {/* Body Panes: Drafting Workspace */}
        <div className={`diff-modal-body ${viewMode !== 'split' ? 'single-pane' : ''}`}>
          
          {/* Left: Original Specification Sheet (Shown in Split Mode) */}
          {viewMode === 'split' && (
            <div className="diff-pane-column">
              <div className="diff-pane-header original">
                <span>ร่างข้อกำหนดเดิม (ก่อนการแก้ไขเพิ่มเติม)</span>
                <span style={{ fontFamily: 'monospace' }}>BASELINE DRAFT</span>
              </div>
              <div className="diff-scroll-viewport" ref={leftScrollRef}>
                <div className="a4-pages-container">
                  
                  {/* LEFT PAGE 1: หมวดที่ 1 ทั่วไป + มาตรา 2.1 คอนกรีตเดิม */}
                  <div className="a4-document-page page-1" data-page="1">
                    <div className="sheet-running-header">
                      <span>เอกสารแนบท้ายประกาศ · ฉบับร่างเดิม</span>
                      <span>หน้า 1 จาก 3</span>
                    </div>

                    <div className="sheet-garuda-block">
                      <ThaiGarudaEmblem height={46} color="#000000" />
                    </div>
                    <p className="sheet-doc-subnotice">(เอกสารแนบท้ายประกาศจัดซื้อจัดจ้างด้วยวิธีประกวดราคาอิเล็กทรอนิกส์)</p>

                    <div className="sheet-doc-title">
                      <h1>ร่างขอบเขตของงานและรายการคุณลักษณะเฉพาะทางเทคนิค (TOR)</h1>
                      <h2>งานจ้างก่อสร้าง: {projectName}</h2>
                      <p>หมวดที่ 03 30 00: งานคอนกรีตโครงสร้างหล่อในที่ (ฉบับร่างเดิม)</p>
                    </div>

                    <table className="sheet-meta-table">
                      <colgroup>
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '32%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '32%' }} />
                      </colgroup>
                      <tbody>
                        <tr>
                          <td className="label">เลขที่เอกสาร:</td>
                          <td>{docNo}</td>
                          <td className="label">วันที่จัดทำ:</td>
                          <td>{thaiDate}</td>
                        </tr>
                        <tr>
                          <td className="label">โครงการ:</td>
                          <td>{projectName}</td>
                          <td className="label">สถานะ:</td>
                          <td style={{ color: '#b45309', fontWeight: 600 }}>ฉบับร่างเดิม (Baseline Draft)</td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="sheet-section-h1">หมวดที่ 1: ข้อกำหนดทั่วไป (Part 1 - General Requirements)</div>
                    <p className="sheet-p">
                      1.1 ขอบเขตของงาน: ผู้รับจ้างจะต้องจัดหา จัดเตรียมเครื่องจักร แรงงาน และวัสดุอุปกรณ์ทั้งหมดเพื่อดำเนินการก่อสร้างงานคอนกรีตโครงสร้างของโครงการให้แล้วเสร็จตามแบบรูปรายการ
                    </p>
                    <p className="sheet-p">
                      1.2 มาตรฐานอ้างอิง: วัสดุก่อสร้างทั้งหมดที่นำมาใช้ต้องเป็นของใหม่และเป็นไปตามมาตรฐานผลิตภัณฑ์อุตสาหกรรม (มอก.) ขั้นพื้นฐาน
                    </p>

                    <div className="sheet-section-h1">หมวดที่ 2: คุณลักษณะของวัสดุและผลิตภัณฑ์ (Part 2 - Materials & Products)</div>
                    
                    {/* Clause 2.1 */}
                    <div data-bbox-id={diffClauses[0].id}>
                      <div style={{ fontWeight: 600, marginTop: '10px', marginBottom: '4px', fontSize: '13.5px', color: '#1e293b' }}>
                        {diffClauses[0].section}
                      </div>
                      
                      <div className={`spec-diff-box original ${activeBbox === 0 ? 'active' : ''}`}>
                        <div className="spec-diff-label-strip">
                          <span>[{diffClauses[0].original.label}]</span>
                          <span>ระบุเดิม</span>
                        </div>
                        <div className="spec-diff-content">
                          <del style={{ textDecoration: 'none', color: '#92400e' }}>
                            {diffClauses[0].original.text}
                          </del>
                        </div>
                        <div className="spec-diff-meta-footer">
                          <span>{diffClauses[0].original.note}</span>
                        </div>
                      </div>
                    </div>

                    <div className="sheet-running-footer">
                      <span>{projectName} · ฉบับร่างเดิม</span>
                      <span>หน้า 1 จาก 3</span>
                    </div>
                  </div>

                  <div className="a4-page-separator"><span>แผ่นที่ 1 (Page 1/3)</span></div>

                  {/* LEFT PAGE 2: มาตรา 2.2 เหล็ก, 2.3 ผนัง + หมวดที่ 3 การก่อสร้าง */}
                  <div className="a4-document-page page-2" data-page="2">
                    <div className="sheet-running-header">
                      <span>เอกสารแนบท้ายประกาศ · ฉบับร่างเดิม</span>
                      <span>หน้า 2 จาก 3</span>
                    </div>

                    <div className="sheet-section-h1" style={{ marginTop: 0 }}>
                      หมวดที่ 2: คุณลักษณะของวัสดุและผลิตภัณฑ์ (ต่อ)
                    </div>

                    {/* Clause 2.2 */}
                    <div data-bbox-id={diffClauses[1].id}>
                      <div style={{ fontWeight: 600, marginTop: '10px', marginBottom: '4px', fontSize: '13.5px', color: '#1e293b' }}>
                        {diffClauses[1].section}
                      </div>
                      
                      <div className={`spec-diff-box original ${activeBbox === 1 ? 'active' : ''}`}>
                        <div className="spec-diff-label-strip">
                          <span>[{diffClauses[1].original.label}]</span>
                          <span>ระบุเดิม</span>
                        </div>
                        <div className="spec-diff-content">
                          <del style={{ textDecoration: 'none', color: '#92400e' }}>
                            {diffClauses[1].original.text}
                          </del>
                        </div>
                        <div className="spec-diff-meta-footer">
                          <span>{diffClauses[1].original.note}</span>
                        </div>
                      </div>
                    </div>

                    {/* Clause 2.3 */}
                    <div data-bbox-id={diffClauses[2].id}>
                      <div style={{ fontWeight: 600, marginTop: '10px', marginBottom: '4px', fontSize: '13.5px', color: '#1e293b' }}>
                        {diffClauses[2].section}
                      </div>
                      
                      <div className={`spec-diff-box original ${activeBbox === 2 ? 'active' : ''}`}>
                        <div className="spec-diff-label-strip">
                          <span>[{diffClauses[2].original.label}]</span>
                          <span>ระบุเดิม</span>
                        </div>
                        <div className="spec-diff-content">
                          <del style={{ textDecoration: 'none', color: '#92400e' }}>
                            {diffClauses[2].original.text}
                          </del>
                        </div>
                        <div className="spec-diff-meta-footer">
                          <span>{diffClauses[2].original.note}</span>
                        </div>
                      </div>
                    </div>

                    <div className="sheet-section-h1">หมวดที่ 3: การดำเนินงานก่อสร้าง (Part 3 - Execution)</div>
                    <p className="sheet-p">
                      3.1 การตรวจสอบและควบคุมงานเป็นไปตามที่วิศวกรผู้ควบคุมงานกำหนดไว้ในเอกสารสัญญาทุกประการ
                    </p>
                    <p className="sheet-p">
                      3.2 การบ่มคอนกรีตต้องบ่มชื้นอย่างต่อเนื่องไม่น้อยกว่า 7 วันหลังการเท
                    </p>

                    <div className="sheet-running-footer">
                      <span>{projectName} · ฉบับร่างเดิม</span>
                      <span>หน้า 2 จาก 3</span>
                    </div>
                  </div>

                  <div className="a4-page-separator"><span>แผ่นที่ 2 (Page 2/3)</span></div>

                  {/* LEFT PAGE 3: หมวดที่ 4 การตรวจรับ + หมวดที่ 5 ลงนาม */}
                  <div className="a4-document-page page-3" data-page="3">
                    <div className="sheet-running-header">
                      <span>เอกสารแนบท้ายประกาศ · ฉบับร่างเดิม</span>
                      <span>หน้า 3 จาก 3</span>
                    </div>

                    <div className="sheet-section-h1" style={{ marginTop: 0 }}>
                      หมวดที่ 4: การตรวจรับพัสดุและการส่งมอบงาน (Part 4 - Inspection)
                    </div>
                    <ol style={{ paddingLeft: '1.25cm', margin: '6px 0 16px 0', fontSize: '14px', lineHeight: '1.65' }}>
                      <li>รายงานผลการทดสอบกำลังอัดลูกปูนคอนกรีตรูปทรงกระบอกที่อายุ 28 วัน จากห้องปฏิบัติการ</li>
                      <li>ใบส่งของและเอกสารตรวจรับวัสดุหน้างานก่อสร้าง</li>
                    </ol>

                    <div className="sheet-sign-block">
                      <div className="sheet-section-h1" style={{ textAlign: 'center', marginBottom: '6px' }}>
                        หมวดที่ 5: การพิจารณาและลงนามของคณะกรรมการกำหนดร่างขอบเขตของงาน
                      </div>
                      <p className="sheet-p" style={{ textIndent: 0, textAlign: 'center', fontSize: '13px', color: '#4b5563' }}>
                        คณะกรรมการกำหนดร่างขอบเขตของงาน ได้ตรวจสอบและพิจารณาข้อกำหนดฉบับร่างเดิมนี้แล้ว จึงได้ลงลายมือชื่อไว้เป็นหลักฐาน
                      </p>
                      
                      <div className="sheet-sign-grid">
                        <div>
                          <div className="sheet-sign-line">(ลงชื่อ) ................................................................<br/>( ................................................................ )<br/>ประธานกรรมการกำหนดร่าง TOR</div>
                        </div>
                        <div>
                          <div className="sheet-sign-line">(ลงชื่อ) ................................................................<br/>( ................................................................ )<br/>กรรมการ (วิศวกรโยธา)</div>
                        </div>
                        <div>
                          <div className="sheet-sign-line">(ลงชื่อ) ................................................................<br/>( ................................................................ )<br/>กรรมการ</div>
                        </div>
                        <div>
                          <div className="sheet-sign-line">(ลงชื่อ) ................................................................<br/>( ................................................................ )<br/>กรรมการและเลขานุการ</div>
                        </div>
                      </div>
                    </div>

                    <div className="sheet-running-footer">
                      <span>{projectName} · ฉบับร่างเดิม</span>
                      <span>หน้า 3 จาก 3</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* Right: Revised Green Specification Sheet (Shown in Split, Clean, and Revised Modes) */}
          <div className="diff-pane-column">
            <div className="diff-pane-header revised">
              <span>ร่างข้อกำหนดฉบับแก้ไขเพิ่มเติม (Approved Green Revision)</span>
              <span style={{ fontFamily: 'monospace' }}>REV. 1.0 (APPROVED)</span>
            </div>
            <div className="diff-scroll-viewport" ref={rightScrollRef}>
              <div className="a4-pages-container">

                {/* RIGHT PAGE 1: หมวดที่ 1 ทั่วไป + มาตรา 2.1 คอนกรีตคาร์บอนต่ำ */}
                <div className="a4-document-page page-1" data-page="1">
                  <div className="sheet-running-header">
                    <span>เอกสารแนบท้ายประกาศ · ฉบับแก้ไขเพิ่มเติม Rev. 1.0</span>
                    <span>หน้า 1 จาก 3</span>
                  </div>

                  <div className="sheet-garuda-block">
                    <ThaiGarudaEmblem height={46} color="#000000" />
                  </div>
                  <p className="sheet-doc-subnotice">(เอกสารแนบท้ายประกาศจัดซื้อจัดจ้างด้วยวิธีประกวดราคาอิเล็กทรอนิกส์)</p>

                  <div className="sheet-doc-title">
                    <h1>ร่างขอบเขตของงานและรายการคุณลักษณะเฉพาะทางเทคนิค (TOR)</h1>
                    <h2>งานจ้างก่อสร้าง: {projectName}</h2>
                    <p>หมวดที่ 03 30 00: งานคอนกรีตโครงสร้างหล่อในที่และวัสดุก่อสร้างคาร์บอนต่ำ</p>
                  </div>

                  <table className="sheet-meta-table">
                    <colgroup>
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '32%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '32%' }} />
                    </colgroup>
                    <tbody>
                      <tr>
                        <td className="label">เลขที่เอกสาร:</td>
                        <td><strong>{docNo}</strong></td>
                        <td className="label">วันที่จัดทำ:</td>
                        <td>{thaiDate}</td>
                      </tr>
                      <tr>
                        <td className="label">โครงการ:</td>
                        <td>{projectName}</td>
                        <td className="label">สถานะ:</td>
                        <td style={{ color: '#047857', fontWeight: 600 }}>ฉบับปรับปรุงเพื่อการจัดซื้อจัดจ้าง (Approved Revision)</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="sheet-section-h1">หมวดที่ 1: ข้อกำหนดทั่วไป (Part 1 - General Requirements)</div>
                  <p className="sheet-p">
                    1.1 ขอบเขตของงาน: ข้อกำหนดนี้ครอบคลุมการจัดหา การออกแบบส่วนผสม การผสม การลำเลียง การเท การตกแต่งผิว 
                    ตลอดจนการบ่มคอนกรีตโครงสร้างคาร์บอนต่ำ (Low-Carbon Concrete) และการใช้วัสดุก่อสร้างที่ผ่านการรับรองมาตรฐานด้านสิ่งแวดล้อม 
                    สำหรับงานฐานราก เสา คาน และพื้นโครงสร้างของโครงการ
                  </p>

                  <div className="sheet-subhead">1.2 มาตรฐานอ้างอิงทางวิศวกรรม:</div>
                  <ul className="sheet-standards-list">
                    <li>• มยผ. 1101-64 / วสท. 1014-43: มาตรฐานงานคอนกรีตและคอนกรีตเสริมเหล็ก กรมโยธาธิการและผังเมือง</li>
                    <li>• มอก. 2594-2556 / มอก. 213-2560: ปูนซีเมนต์ไฮดรอลิก</li>
                    <li>• มอก. 2135-2545: เถ้าลอยสำหรับใช้เป็นวัสดุผสมคอนกรีต ชั้นคุณภาพ 1 หรือชั้นคุณภาพ 2</li>
                    <li>• มอก. 24-2559: เหล็กเส้นเสริมคอนกรีต: เหล็กข้ออ้อย ชั้นคุณภาพ SD40 หรือ SD50</li>
                    <li>• มอก. 1505-2541: คอนกรีตมวลเบาอบไอน้ำสำหรับงานผนังก่อ ชั้นคุณภาพ G4</li>
                    <li>• ACI 207.1R-05 & ACI 207.2R: Guide to Mass Concrete (การควบคุมอุณหภูมิคอนกรีตมวลหนา)</li>
                    <li>• ประกาศองค์การบริหารจัดการก๊าซเรือนกระจก (องค์การมหาชน): แนวทางการประเมินคาร์บอนฟุตพริ้นท์ของผลิตภัณฑ์</li>
                  </ul>

                  <p className="sheet-p">
                    1.3 การเสนอเอกสารเพื่อขออนุมัติ: ผู้รับจ้างต้องเสนอรายการคำนวณและสัดส่วนการผสมคอนกรีต (Mix Design) 
                    พร้อมผลทดสอบกำลังอัดจากห้องปฏิบัติการที่ได้รับการรับรองมาตรฐาน ISO/IEC 17025 ล่วงหน้าก่อนเริ่มงานเทคอนกรีตไม่น้อยกว่า 30 วัน 
                    และต้องแนบใบรับรองคุณภาพวัสดุ (Mill Test Certificate) สำหรับปูนซีเมนต์ไฮดรอลิก เถ้าลอย และเหล็กเสริมทุกชุด
                  </p>

                  <div className="sheet-section-h1">หมวดที่ 2: คุณลักษณะของวัสดุและผลิตภัณฑ์ (Part 2 - Materials & Products)</div>
                  
                  {/* Clause 2.1 */}
                  <div data-bbox-id={diffClauses[0].id}>
                    <div style={{ fontWeight: 600, marginTop: '10px', marginBottom: '4px', fontSize: '13.5px', color: '#064e3b' }}>
                      {diffClauses[0].section}
                    </div>

                    <div className={`spec-diff-box revised ${activeBbox === 0 ? 'active' : ''}`}>
                      <div className="spec-diff-label-strip">
                        <span>[{diffClauses[0].revised.label}]</span>
                        <span style={{ color: '#047857' }}>ผ่านการอนุมัติทางวิศวกรรม</span>
                      </div>
                      <div className="spec-diff-content">
                        <ins style={{ textDecoration: 'none', color: '#064e3b', fontWeight: 500 }}>
                          {diffClauses[0].revised.text}
                        </ins>
                      </div>
                      <div className="spec-diff-meta-footer">
                        <span>{diffClauses[0].revised.note}</span>
                      </div>
                    </div>
                  </div>

                  <div className="sheet-running-footer">
                    <span>{projectName} · ฉบับแก้ไขเพิ่มเติม</span>
                    <span>หน้า 1 จาก 3</span>
                  </div>
                </div>

                <div className="a4-page-separator"><span>แผ่นที่ 1 (Page 1/3)</span></div>

                {/* RIGHT PAGE 2: มาตรา 2.2 เหล็ก, 2.3 ผนัง + หมวดที่ 3 ควบคุมอุณหภูมิการเทและการบ่ม */}
                <div className="a4-document-page page-2" data-page="2">
                  <div className="sheet-running-header">
                    <span>เอกสารแนบท้ายประกาศ · ฉบับแก้ไขเพิ่มเติม Rev. 1.0</span>
                    <span>หน้า 2 จาก 3</span>
                  </div>

                  <div className="sheet-section-h1" style={{ marginTop: 0 }}>
                    หมวดที่ 2: คุณลักษณะของวัสดุและผลิตภัณฑ์ (ต่อ)
                  </div>

                  {/* Clause 2.2 */}
                  <div data-bbox-id={diffClauses[1].id}>
                    <div style={{ fontWeight: 600, marginTop: '10px', marginBottom: '4px', fontSize: '13.5px', color: '#064e3b' }}>
                      {diffClauses[1].section}
                    </div>

                    <div className={`spec-diff-box revised ${activeBbox === 1 ? 'active' : ''}`}>
                      <div className="spec-diff-label-strip">
                        <span>[{diffClauses[1].revised.label}]</span>
                        <span style={{ color: '#047857' }}>ผ่านการอนุมัติทางวิศวกรรม</span>
                      </div>
                      <div className="spec-diff-content">
                        <ins style={{ textDecoration: 'none', color: '#064e3b', fontWeight: 500 }}>
                          {diffClauses[1].revised.text}
                        </ins>
                      </div>
                      <div className="spec-diff-meta-footer">
                        <span>{diffClauses[1].revised.note}</span>
                      </div>
                    </div>
                  </div>

                  {/* Clause 2.3 */}
                  <div data-bbox-id={diffClauses[2].id}>
                    <div style={{ fontWeight: 600, marginTop: '10px', marginBottom: '4px', fontSize: '13.5px', color: '#064e3b' }}>
                      {diffClauses[2].section}
                    </div>

                    <div className={`spec-diff-box revised ${activeBbox === 2 ? 'active' : ''}`}>
                      <div className="spec-diff-label-strip">
                        <span>[{diffClauses[2].revised.label}]</span>
                        <span style={{ color: '#047857' }}>ผ่านการอนุมัติทางวิศวกรรม</span>
                      </div>
                      <div className="spec-diff-content">
                        <ins style={{ textDecoration: 'none', color: '#064e3b', fontWeight: 500 }}>
                          {diffClauses[2].revised.text}
                        </ins>
                      </div>
                      <div className="spec-diff-meta-footer">
                        <span>{diffClauses[2].revised.note}</span>
                      </div>
                    </div>
                  </div>

                  <div className="sheet-section-h1">หมวดที่ 3: การดำเนินงานก่อสร้างและการควบคุมคุณภาพ (Part 3 - Execution)</div>
                  <p className="sheet-p">
                    3.1 การเทคอนกรีตโครงสร้างมวลหนา (Mass Concrete): สำหรับโครงสร้างที่มีมิติความหนาตั้งแต่ 1.00 เมตรขึ้นไป 
                    ผู้รับจ้างต้องควบคุมอุณหภูมิสูงสุดภายในก้อนคอนกรีตไม่เกิน 70 องศาเซลเซียส และผลต่างของอุณหภูมิระหว่างแกนกลางกับผิวภายนอก (ΔT) 
                    ต้องไม่เกิน 20 องศาเซลเซียส ตามแนวทางมาตรฐาน ACI 207.1R เพื่อป้องกันการแตกร้าวและการเสื่อมสภาพแบบ Delayed Ettringite Formation (DEF) 
                    โดยต้องติดตั้งหัววัดอุณหภูมิ (Thermocouple) และบันทึกข้อมูลต่อเนื่องตลอด 7 วันแรก
                  </p>
                  <p className="sheet-p">
                    3.2 การบ่มคอนกรีต: ต้องดำเนินการบ่มชื้นอย่างต่อเนื่องทันทีหลังผิวหน้าคอนกรีตก่อตัว โดยใช้วิธีฉีดพ่นน้ำ คลุมด้วยกระสอบเปียกชื้น 
                    หรือวัสดุกักเก็บความชื้นที่มีประสิทธิภาพ เป็นเวลาไม่น้อยกว่า 14 วัน สำหรับคอนกรีตผสมเถ้าลอย
                  </p>

                  <div className="sheet-running-footer">
                    <span>{projectName} · ฉบับแก้ไขเพิ่มเติม</span>
                    <span>หน้า 2 จาก 3</span>
                  </div>
                </div>

                <div className="a4-page-separator"><span>แผ่นที่ 2 (Page 2/3)</span></div>

                {/* RIGHT PAGE 3: หมวดที่ 4 การตรวจรับพัสดุ + หมวดที่ 5 การลงนามคณะกรรมการ */}
                <div className="a4-document-page page-3" data-page="3">
                  <div className="sheet-running-header">
                    <span>เอกสารแนบท้ายประกาศ · ฉบับแก้ไขเพิ่มเติม Rev. 1.0</span>
                    <span>หน้า 3 จาก 3</span>
                  </div>

                  <div className="sheet-section-h1" style={{ marginTop: 0 }}>
                    หมวดที่ 4: การตรวจรับพัสดุและการส่งมอบงาน (Part 4 - Quality Handover & Compliance)
                  </div>
                  <ol style={{ paddingLeft: '1.25cm', margin: '6px 0 16px 0', fontSize: '14px', lineHeight: '1.65' }}>
                    <li>รายงานผลการทดสอบกำลังอัดลูกปูนคอนกรีตรูปทรงกระบอกที่อายุ 7, 28 และ 56 วัน จากสถาบันที่ได้มาตรฐาน ISO/IEC 17025</li>
                    <li>ใบรับรองคุณภาพวัสดุ (Mill Certificate) และใบส่งของระบุสัดส่วนการผสมเถ้าลอย มอก. 2135 ครบทุกเที่ยวการเท</li>
                    <li>บันทึกผลการตรวจวัดอุณหภูมิคอนกรีตฐานรากด้วย Thermocouple ตลอดระยะเวลาการบ่มควบคุม 7 วันแรก</li>
                    <li>รายงานการประเมินการลดก๊าซเรือนกระจก (Embodied Carbon Verification Report) เทียบเคียงเกณฑ์ อบก.</li>
                  </ol>

                  <div className="sheet-sign-block">
                    <div className="sheet-section-h1" style={{ textAlign: 'center', marginBottom: '6px' }}>
                      หมวดที่ 5: การพิจารณาและลงนามของคณะกรรมการกำหนดร่างขอบเขตของงาน
                    </div>
                    <p className="sheet-p" style={{ textIndent: 0, textAlign: 'center', fontSize: '13px', color: '#4b5563' }}>
                      คณะกรรมการกำหนดร่างขอบเขตของงานและราคากลาง ได้ตรวจสอบและพิจารณาข้อกำหนดเฉพาะทางเทคนิคฉบับแก้ไขเพิ่มเติมนี้แล้ว 
                      เห็นว่ามีความถูกต้อง ครบถ้วนตามมาตรฐานวิศวกรรมโยธาและระเบียบการจัดซื้อจัดจ้างภาครัฐ จึงได้ลงลายมือชื่อไว้เป็นหลักฐาน
                    </p>
                    
                    <div className="sheet-sign-grid">
                      <div>
                        <div className="sheet-sign-line">(ลงชื่อ) ................................................................<br/>( ................................................................ )<br/>ประธานกรรมการกำหนดร่าง TOR</div>
                      </div>
                      <div>
                        <div className="sheet-sign-line">(ลงชื่อ) ................................................................<br/>( ................................................................ )<br/>กรรมการ (วิศวกรโยธาชำนาญการ)</div>
                      </div>
                      <div>
                        <div className="sheet-sign-line">(ลงชื่อ) ................................................................<br/>( ................................................................ )<br/>กรรมการ (ผู้เชี่ยวชาญด้านวิศวกรรมสิ่งแวดล้อม)</div>
                      </div>
                      <div>
                        <div className="sheet-sign-line">(ลงชื่อ) ................................................................<br/>( ................................................................ )<br/>กรรมการและเลขานุการ</div>
                      </div>
                    </div>
                  </div>

                  <div className="sheet-running-footer">
                    <span>{projectName} · ฉบับแก้ไขเพิ่มเติม</span>
                    <span>หน้า 3 จาก 3</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <footer className="diff-modal-footer">
          <div className="diff-footer-stats">
            <Check size={16} color="#10b981" />
            <span>{th ? 'ตรวจทานครบทั้ง 3 มาตรา พร้อมส่งออกเพื่อแนบท้ายสัญญา' : 'All clauses reviewed. Ready for contract attachment.'}</span>
          </div>

          <div className="diff-footer-buttons">
            <button type="button" className="secondary" onClick={handleExportDiffJson}>
              <Download size={14} />
              <span>{th ? 'รายงานเปรียบเทียบ (JSON)' : 'Diff Report (JSON)'}</span>
            </button>
            <button type="button" className="secondary" onClick={handlePrintPdf}>
              <Printer size={14} />
              <span>{th ? 'พิมพ์ / บันทึก PDF ทางการ' : 'Print / Save as PDF'}</span>
            </button>
            <button type="button" className="primary" onClick={handleExportDocx}>
              <FileText size={14} />
              <span>{th ? 'ดาวน์โหลด DOCX ทางการ' : 'Export Word DOCX'}</span>
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}
