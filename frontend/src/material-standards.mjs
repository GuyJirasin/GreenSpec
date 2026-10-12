// Related product-quality standards, not sources of the prepared impact figures.
const standards = {
  concrete: [
    {number:'2594-2556',th:'ปูนซีเมนต์ไฮดรอลิก',en:'Hydraulic cement',url:'https://a.tisi.go.th/t/?n=2594-2556'},
    {number:'2135-2545',th:'เถ้าลอยจากถ่านหินใช้เป็นวัสดุผสมคอนกรีต',en:'Coal fly ash for use in concrete',url:'https://appdb.tisi.go.th/tis_devs/p12/pr.php'},
    {number:'213-2560',th:'คอนกรีตผสมเสร็จ',en:'Ready-mixed concrete',url:'https://a.tisi.go.th/t/?n=4271'},
  ],
  steel: [
    {number:'24-2559',th:'เหล็กเส้นเสริมคอนกรีต: เหล็กข้ออ้อย',en:'Reinforcing steel: deformed bars',url:'https://a.tisi.go.th/t/?n=24-2559'},
    {number:'ISO 14025',th:'ฉลากสิ่งแวดล้อมประเภทที่ 3 (EPD)',en:'Environmental Product Declaration',url:'https://www.environdec.com'}
  ],
  masonryA: [{number:'1505-2541',th:'ชิ้นส่วนคอนกรีตมวลเบาแบบมีฟองอากาศ-อบไอน้ำ',en:'Autoclaved aerated concrete elements',url:'https://www.tisi.go.th/data/service/tisistandard/1505-2541.pdf'}],
  masonryB: [{number:'1505-2541',th:'ชิ้นส่วนคอนกรีตมวลเบาอบไอน้ำ (ฉลากเขียว)',en:'Autoclaved aerated concrete (Green Label)',url:'https://www.tisi.go.th/data/service/tisistandard/1505-2541.pdf'}],
  insulation: [{number:'486-2527',th:'ฉนวนใยแก้วกันความร้อน (มอก. 486)',en:'Glass fiber thermal insulation',url:'https://a.tisi.go.th/t/?n=486-2527'}],
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
