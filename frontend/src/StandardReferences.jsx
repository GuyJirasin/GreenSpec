import React from 'react';
import {useLanguage} from './i18n';

export default function StandardReferences({payload}) {
  const {language}=useLanguage(),th=language!=='en';
  if(!payload.related_standards)return null;
  const scope=payload.standards_scope;
  const note=scope==='insulation'
    ? (th?'ต้องระบุชนิดฉนวนก่อนเลือก มอก. ที่เกี่ยวข้อง':'Choose the insulation type before selecting a TIS standard.')
    : scope==='steel'
      ? (th?'ใช้กับเหล็กข้ออ้อย ต้องตรวจสอบชนิดและชั้นคุณภาพตามแบบ':'Applies to deformed bars. Check the bar type and grade against the design.')
      : scope==='masonry' && payload.related_standards[0]?.number==='58-2560'
        ? (th?'ใช้เมื่อเลือกบล็อกกลวงไม่รับน้ำหนัก ต้องตรวจสอบชนิดบล็อกที่เสนอ':'Applies to non-loadbearing hollow blocks. Check the proposed block type.')
        : null;
  return <div className="standard-references">
    <strong>{th?'มาตรฐานที่เกี่ยวข้อง (สมอ.)':'Related standards (TISI)'}</strong>
    {payload.related_standards.length>0&&<ul>{payload.related_standards.map(s=><li key={s.number}><a href={s.url} target="_blank" rel="noopener noreferrer">{th?'มอก.':'TIS'} {s.number} · {th?s.th:s.en} ↗</a></li>)}</ul>}
    {note&&<p>{note}</p>}
    {payload.related_standards.length>0&&<small>{th?'อ้างอิงคุณภาพวัสดุ ไม่ใช่ที่มาของตัวเลขคาร์บอน ต้นทุน หรือการรับรองข้อเสนอนี้':'Material quality references; not sources of carbon or cost figures, or approval of this proposal.'}</small>}
  </div>;
}
