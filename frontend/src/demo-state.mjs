export const demoEnabled = true;
export const demoKey = (user,project) => `greenspec:pitch-demo:v1:${user}:${project}`;
export const demoStages = [['documents','Documents'],['overview','Overview'],['hotspots','Hotspots'],['recommendations','Recommendations'],['selected','Selected Spec'],['revised','Revised Specification'],['summary','Impact & Summary'],['history','Revision History']];
const examples = [
  ['concrete','คอนกรีตโครงสร้าง 35 MPa ที่อายุ 28 วัน','ใช้คอนกรีตผสมเถ้าลอย',1050,12500000,252,750000,315,500000,'คงกำลังอัด 35 MPa ที่อายุ 28 วัน ใช้เถ้าลอยแทนปูนซีเมนต์ 25% ต้องเสนอ Trial Mix และให้วิศวกรตรวจสอบก่อนใช้งาน','คงกำลังอัด 35 MPa ที่อายุ 56 วัน ใช้เถ้าลอยแทนปูนซีเมนต์ 35% ต้องตรวจสอบกำลังระยะต้น แผนบ่ม และให้วิศวกรอนุมัติ'],
  ['steel','เหล็กเสริมสำหรับโครงสร้าง','เลือกเหล็กเสริมที่มีส่วนผสมรีไซเคิล',750,17500000,150,300000,180,150000,'ใช้เหล็กเสริมที่มีส่วนผสมรีไซเคิล โดยคงชั้นคุณภาพและกำลังครากตามแบบ ต้องส่งใบรับรองและผลทดสอบ','ใช้เหล็กเสริมจากกระบวนการผลิตคาร์บอนต่ำ โดยคงคุณสมบัติตามแบบ ตรวจสอบ EPD และแหล่งผลิตก่อนสั่งซื้อ'],
  ['masonry','ผนังก่อบล็อกคอนกรีต','เปลี่ยนเป็นบล็อกมวลเบา',375,5000000,30,150000,45,-100000,'ใช้บล็อกมวลเบาในผนังที่ไม่รับน้ำหนัก โดยตรวจสอบความหนา การทนไฟ และรายละเอียดรอยต่อกับวิศวกร','ใช้บล็อกที่มีวัสดุรีไซเคิลในผนังที่ไม่รับน้ำหนัก ต้องตรวจสอบกำลัง การดูดซึมน้ำ และความพร้อมของผู้ผลิต'],
  ['insulation','ฉนวนสำหรับเปลือกอาคาร','เลือกฉนวนที่มีคาร์บอนต่ำ',325,15000000,15,-120000,25,-200000,'เลือกฉนวนที่มี EPD และคงค่าการนำความร้อนตามแบบ ต้องตรวจสอบการทนไฟและอายุใช้งาน','เลือกฉนวนจากวัสดุรีไซเคิลที่มี EPD ต้องให้วิศวกรตรวจสอบความชื้น การทนไฟ และการติดตั้งก่อนอนุมัติ'],
];
export function createDemoRound(project,documentIds=[]) {
  const id=crypto.randomUUID(), created_at=new Date().toISOString();
  const recs=[],options=[],reviews=[];
  for(const [scope,original,title,carbon,cost,ca,sa,cb,sb,wa,wb] of examples) {
    const rid=`${id}-${scope}`;
    const make=(reduction,saving)=>({work_scope_key:scope,original_material:original,proposed_material:title,rationale:'ตัวอย่างสำหรับการสาธิต: เปรียบเทียบผลกระทบและตรวจสอบเงื่อนไขทางวิศวกรรมก่อนเลือก',sources:[{exact_text:original,locator:{kind:'demo_example'},demo:true}],impacts:{baseline_carbon_tco2e:carbon,selected_carbon_tco2e:carbon-reduction,carbon_reduction_tco2e:reduction,baseline_cost_thb:cost,selected_cost_thb:cost-saving,cost_saving_thb:saving},methodology:{source:'Prepared demonstration scenario',version:'pitch-1',basis:'Illustrative figures only; not calculated from uploaded files.'},missing_data_reasons:[],uncertainty_notes:['ข้อเสนอและตัวเลขทั้งหมดเตรียมไว้สำหรับการนำเสนอ ไม่ใช่ผลวิเคราะห์หรือการรับรองของโครงการนี้']});
    recs.push({id:rid,project_id:project.id,run_id:id,payload:make(ca,sa)});
    options.push({recommendation_id:rid,option_key:'A',payload:make(ca,sa),default_wording:wa},{recommendation_id:rid,option_key:'B',payload:make(cb,sb),default_wording:wb});
    reviews.push({id:`review-${rid}`,recommendation_id:rid,decision:'UNREVIEWED',selected_option:'A',draft_wording:null,locked:false,row_version:1});
  }
  return {id,project_id:project.id,status:'COMPLETED',generation_mode:'demo',created_at,documentIds,recs,options,reviews,final:null};
}
export function updateDemoReview(round,reviewId,changes) {
  if(round.final)throw new Error('Final revisions cannot be changed. Start a new round.');
  const review=round.reviews.find(r=>r.id===reviewId);
  if(!review)throw new Error('Review not found.');
  if(review.locked&&(changes.selected_option||changes.draft_wording!==undefined))throw new Error('Unlock this item before editing.');
  if(changes.selected_option&&!['A','B'].includes(changes.selected_option))throw new Error('Choose Option A or B.');
  if(changes.draft_wording!==undefined&&changes.draft_wording!==null&&!changes.draft_wording.trim())throw new Error('Enter a revised requirement before saving.');
  return {...round,reviews:round.reviews.map(r=>r.id!==reviewId?r:{...r,...changes,row_version:r.row_version+1})};
}
export function finalizeDemo(round) {
  if(round.final) return round;
  if(round.reviews.some(r=>r.decision==='UNREVIEWED'))throw new Error('Review every item before finalizing.');
  if(!round.reviews.some(r=>r.decision==='APPROVED'))throw new Error('Approve at least one change before finalizing.');
  return {...round,final:{id:crypto.randomUUID(),run_id:round.id,version_no:1,created_at:new Date().toISOString(),generation_mode:'demo',snapshot:structuredClone({recs:round.recs,options:round.options,reviews:round.reviews,documentIds:round.documentIds})}};
}
export function readDemo(user,project) {try{return JSON.parse(localStorage.getItem(demoKey(user,project))||'[]')}catch{return []}}
export function writeDemo(user,project,rounds) {localStorage.setItem(demoKey(user,project),JSON.stringify(rounds));window.dispatchEvent(new Event('greenspec-demo-change'));}
export function startDemo(user,project,documents) {const round=createDemoRound(project,documents);writeDemo(user,project.id,[round,...readDemo(user,project.id)]);return round;}
