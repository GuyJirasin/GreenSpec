import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, ArrowRight, Calculator, FileText, CheckCircle2 } from 'lucide-react';
import { useLanguage } from './i18n';

export default function ReviewFillInModal({ isOpen, onClose, extractedItems = [], onConfirm, loading }) {
  const { language } = useLanguage();
  const th = language !== 'en';

  const [items, setItems] = useState(() => {
    return extractedItems.map(item => ({
      ...item,
      fc_prime_mpa: item.fc_prime_mpa || 35,
      volume_m3: item.volume_m3 || 500,
      element_type: item.element_type || 'mat_foundation',
      scm_type: item.scm_type || 'fly_ash'
    }));
  });

  useEffect(() => {
    if (extractedItems && extractedItems.length > 0) {
      setItems(extractedItems.map(item => ({
        ...item,
        fc_prime_mpa: item.fc_prime_mpa || 35,
        volume_m3: item.volume_m3 || 500,
        element_type: item.element_type || 'mat_foundation',
        scm_type: item.scm_type || 'fly_ash'
      })));
    }
  }, [extractedItems]);

  if (!isOpen) return null;

  function updateItem(index, field, value) {
    setItems(prev => prev.map((it, idx) => idx === index ? { ...it, [field]: value } : it));
  }

  function handleConvertKsc(index) {
    const current = items[index].fc_prime_mpa;
    // If user entered a ksc value (e.g. 280, 350)
    if (current > 150) {
      const mpa = Math.round((current / 10.1972) * 10) / 10;
      updateItem(index, 'fc_prime_mpa', mpa);
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal greenspec-fillin-modal" role="dialog" aria-modal="true" aria-label="Review & Fill-in">
        <header className="modal-header">
          <div className="header-info">
            <div className="badge-tag">{th ? 'ขั้นตอนที่ 1 จาก 2: ตรวจสอบและระบุข้อมูล' : 'Step 1 of 2: Review & Fill-in'}</div>
            <h2>{th ? 'ตรวจสอบข้อมูลก่อนส่งเข้าเครื่องคำนวณวิศวกรรม' : 'Verify Inputs Before Engineering Calculation'}</h2>
            <p className="subtitle">
              {th
                ? 'ระบบตรวจพบรายการคอนกรีตจากเอกสาร กรุณาตรวจสอบหรือเติมตัวเลขที่ขาดก่อนส่งคำนวณ Mix Design และ Embodied Carbon'
                : 'Concrete requirements detected from document. Please review or fill in missing parameters before running mix design and carbon calculations.'}
            </p>
          </div>
          <button type="button" className="icon close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </header>

        <div className="fillin-items-list">
          {items.map((item, idx) => {
            const hasMissing = item.missing_fields && item.missing_fields.length > 0;
            return (
              <div key={item.id || idx} className={`fillin-card ${hasMissing ? 'has-missing' : ''}`}>
                <div className="card-top">
                  <span className="item-num">#{idx + 1}</span>
                  <div className="item-quote">
                    <FileText size={14} />
                    <span>{item.quote || (th ? 'ข้อความจากเอกสาร' : 'Document quote')}</span>
                  </div>
                  {hasMissing && (
                    <span className="warning-pill">
                      <AlertTriangle size={13} />
                      {th ? `ต้องระบุเพิ่ม: ${item.missing_fields.join(', ')}` : `Needs: ${item.missing_fields.join(', ')}`}
                    </span>
                  )}
                </div>

                <div className="fields-grid">
                  {/* Element Type */}
                  <div className="field-group">
                    <label>{th ? 'ประเภทโครงสร้าง' : 'Element Type'}</label>
                    <select
                      value={item.element_type}
                      onChange={(e) => updateItem(idx, 'element_type', e.target.value)}
                    >
                      <option value="mat_foundation">{th ? 'ฐานรากหนา (Mat Foundation)' : 'Mat Foundation'}</option>
                      <option value="beam_slab">{th ? 'คาน / พื้น (Beam & Slab)' : 'Beam & Slab'}</option>
                      <option value="column">{th ? 'เสา (Column)' : 'Column'}</option>
                      <option value="pt_slab">{th ? 'พื้นโพสเทนชัน (PT Slab)' : 'Post-Tensioned Slab'}</option>
                    </select>
                  </div>

                  {/* Compressive Strength MPa */}
                  <div className="field-group">
                    <div className="label-with-action">
                      <label>{th ? "กำลังอัด f'c (MPa Cylinder)" : "Strength f'c (MPa)"}</label>
                      {item.fc_prime_mpa > 150 && (
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => handleConvertKsc(idx)}
                        >
                          {th ? `แปลง ${item.fc_prime_mpa} ksc -> MPa` : `Convert ${item.fc_prime_mpa} ksc`}
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min="10"
                      max="150"
                      step="1"
                      value={item.fc_prime_mpa || ''}
                      onChange={(e) => updateItem(idx, 'fc_prime_mpa', parseFloat(e.target.value) || '')}
                    />
                  </div>

                  {/* Volume m3 */}
                  <div className="field-group">
                    <label>{th ? 'ปริมาตรคอนกรีต (ลบ.ม.)' : 'Volume (m³)'}</label>
                    <div className="input-with-chips">
                      <input
                        type="number"
                        min="1"
                        max="1000000"
                        step="10"
                        placeholder="ระบุปริมาตร..."
                        value={item.volume_m3 || ''}
                        onChange={(e) => updateItem(idx, 'volume_m3', parseFloat(e.target.value) || '')}
                      />
                      <div className="quick-volume-chips">
                        {[200, 500, 1000, 1500].map(v => (
                          <button
                            key={v}
                            type="button"
                            className="vol-chip"
                            onClick={() => updateItem(idx, 'volume_m3', v)}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* SCM Type */}
                  <div className="field-group">
                    <label>{th ? 'วัสดุทดแทน (SCM)' : 'SCM Type'}</label>
                    <select
                      value={item.scm_type}
                      onChange={(e) => updateItem(idx, 'scm_type', e.target.value)}
                    >
                      <option value="fly_ash">{th ? 'เถ้าลอยแม่เมาะ (Fly Ash มอก. 2135)' : 'Fly Ash (TIS 2135)'}</option>
                      <option value="hydraulic_cement">{th ? 'ปูนไฮดรอลิก (มอก. 2594)' : 'Hydraulic Cement (TIS 2594)'}</option>
                      <option value="slag_ggbs">{th ? 'สแลกเตาถลุง (GGBS)' : 'Blast Furnace Slag (GGBS)'}</option>
                      <option value="bottom_ash">{th ? 'เถ้าหนักบดละเอียด (Bottom Ash)' : 'Bottom Ash'}</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="modal-footer">
          <button type="button" className="secondary" onClick={onClose} disabled={loading}>
            {th ? 'ยกเลิก' : 'Cancel'}
          </button>
          <button
            type="button"
            className="primary confirm-btn"
            disabled={loading || items.length === 0 || items.some(i => !i.fc_prime_mpa || !i.volume_m3 || !i.element_type)}
            onClick={() => onConfirm(items)}
          >
            {loading ? (
              <span>{th ? 'กำลังคำนวณและร่างข้อกำหนด...' : 'Calculating & drafting...'}</span>
            ) : (
              <>
                <span>{th ? 'ยืนยันและเริ่มคำนวณส่วนผสมจริง' : 'Confirm & Run Calculation'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
