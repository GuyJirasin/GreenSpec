// Related product-quality standards, not sources of the prepared impact figures.
const standards = {
  concrete: [
    {number:'213-2560',th:'คอนกรีตผสมเสร็จ',en:'Ready-mixed concrete',url:'https://a.tisi.go.th/t/?n=4271'},
    {number:'2135-2545',th:'เถ้าลอยจากถ่านหินใช้เป็นวัสดุผสมคอนกรีต',en:'Coal fly ash for use in concrete',url:'https://appdb.tisi.go.th/tis_devs/p12/pr.php'},
  ],
  steel: [{number:'24-2559',th:'เหล็กเส้นเสริมคอนกรีต: เหล็กข้ออ้อย',en:'Reinforcing steel: deformed bars',url:'https://a.tisi.go.th/t/?n=24-2559'}],
  masonryA: [{number:'1505-2541',th:'ชิ้นส่วนคอนกรีตมวลเบาแบบมีฟองอากาศ-อบไอน้ำ',en:'Autoclaved aerated concrete elements',url:'https://www.tisi.go.th/data/service/tisistandard/1505-2541.pdf'}],
  masonryB: [{number:'58-2560',th:'คอนกรีตบล็อกกลวงไม่รับน้ำหนัก',en:'Non-loadbearing hollow concrete blocks',url:'https://i.tisi.go.th/e-license/index.php/service/standards'}],
};
export function relatedStandards(scope, option='A') {
  return standards[scope==='masonry'?`masonry${option}`:scope] || [];
}
export function presentPreparedPayload(payload, option='A') {
  return {...payload,
    rationale:payload.rationale?.replace(/^ตัวอย่างสำหรับการสาธิต:\s*/,''),
    related_standards:relatedStandards(payload.work_scope_key,option),
    standards_scope:payload.work_scope_key,
  };
}
