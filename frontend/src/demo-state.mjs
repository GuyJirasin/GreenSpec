export const demoEnabled = true;
export const demoKey = (user, project) => `greenspec:pitch-demo:v1:${user}:${project}`;
export const demoStages = [
  ['documents', 'Documents'],
  ['overview', 'Overview'],
  ['hotspots', 'Hotspots'],
  ['recommendations', 'Recommendations'],
  ['selected', 'Selected Spec'],
  ['revised', 'Revised Specification'],
  ['summary', 'Impact & Summary'],
  ['history', 'Revision History']
];

export const DEMO_SPEC_CLAUSE_TH = `ข้อกำหนดทางเทคนิค งานวิศวกรรมโครงสร้างและวัสดุก่อสร้างคาร์บอนต่ำ
(CSI MasterFormat Specification: Green Construction Specification)

ส่วนที่ ๑: ข้อมูลทั่วไป (PART 1 - GENERAL)
๑.๑ ขอบเขตของงาน (Scope of Work):
ข้อกำหนดนี้ครอบคลุมการจัดหาวัสดุ การควบคุมสัดส่วนผสม การขนส่ง การเทคอนกรีต การติดตั้งเหล็กเสริม และงานผนังสำหรับโครงการ โดยมุ่งเน้นการลดก๊าซเรือนกระจกแฝง (Embodied Carbon Reduction) ควบคู่กับความปลอดภัยทางวิศวกรรมสูงสุด

๑.๒ มาตรฐานอ้างอิงที่ใช้บังคับ (Governing Engineering Standards):
• มยผ. 1101-64: มาตรฐานงานคอนกรีตและคอนกรีตเสริมเหล็ก กรมโยธาธิการและผังเมือง
• มอก. 2594-2556: ปูนซีเมนต์ไฮดรอลิก (Hydraulic Cement)
• มอก. 2135-2545: เถ้าลอยจากถ่านหินใช้เป็นวัสดุผสมคอนกรีต ชั้นคุณภาพ 1 หรือ 2
• มอก. 24-2559: เหล็กเส้นเสริมคอนกรีต: เหล็กข้ออ้อย ชั้นคุณภาพ SD40 / SD40T
• มอก. 1505-2541: ชิ้นส่วนคอนกรีตมวลเบาแบบมีฟองอากาศ-อบไอน้ำ ชั้นคุณภาพ G4
• ACI 207.1R / ACI 207.2R: Guide to Mass Concrete (Thermal Control Criteria)
• ACI 211.1: Standard Practice for Selecting Proportions for Normal, Heavyweight, and Mass Concrete

๑.๓ เอกสารที่ต้องส่งมอบเพื่อการอนุมัติ (Submittals for Approval):
๑. ผู้รับจ้างต้องเสนอรายงานผลการออกแบบสัดส่วนผสมคอนกรีต (Mix Design) และผลการทดสอบในห้องปฏิบัติการ (Trial Mix Report) รับรองโดยวิศวกรวิชาชีพควบคุม ก่อนเริ่มเทคอนกรีตไม่น้อยกว่า ๑๕ วัน
๒. เอกสารรับรองฉลากคาร์บอนฟุตพริ้นท์ของผลิตภัณฑ์ (CFP) หรือฉลากสิ่งแวดล้อม EPD (ISO 14025) ประจำรุ่นวัสดุ
๓. แผนการควบคุมอุณหภูมิและการบ่มคอนกรีตมวลหนา (Thermal Control & Curing Plan)

ส่วนที่ ๒: คุณลักษณะของวัสดุ (PART 2 - PRODUCTS)
๒.๑ คอนกรีตโครงสร้างฐานรากคาร์บอนต่ำ (Low-Carbon Foundation Concrete):
ให้ใช้คอนกรีตผสมเสร็จที่มีกำลังอัดประลัยระบุ f'c ไม่น้อยกว่า ๓๕ เมกะปาสกาล (MPa) ที่อายุ ๕๖ วัน (ทดสอบด้วยก้อนตัวอย่างทรงกระบอกขนาด ๑๕x๓๐ ซม. ตาม ASTM C39) โดยใช้ปูนซีเมนต์ไฮดรอลิก มอก. 2594 ผสมเถ้าลอยลิกไนต์คัดขนาด มอก. 2135 ในสัดส่วนร้อยละ ๓๐-๓๕ โดยน้ำหนักวัสดุประสาน อัตราส่วนน้ำต่อวัสดุประสาน (W/B) ไม่เกิน ๐.๓๘ ค่ายุบตัว ๑๒±๒.๕ ซม. โดยใช้น้ำยาเคมีลดน้ำพิเศษ Type F ตาม มอก. 733

๒.๒ เหล็กเส้นเสริมคอนกรีตข้ออ้อยเตาอาร์กไฟฟ้า (EAF Recycled Rebar):
เหล็กเส้นข้ออ้อยทั้งหมดต้องเป็นชั้นคุณภาพ SD40 หรือ SD40T ตาม มอก. 24-2559 ผลิตจากกระบวนการเตาหลอมอาร์กไฟฟ้า (Electric Arc Furnace - EAF) ที่มีสัดส่วนเศษเหล็กรีไซเคิลไม่น้อยกว่าร้อยละ ๙๐ และมีหนังสือรับรองการประเมินวัฏจักรชีวิตสิ่งแวดล้อม EPD กำลังคราก (Yield Strength) ไม่น้อยกว่า ๔๐๐ เมกะปาสกาล

๒.๓ ผนังบล็อกคอนกรีตมวลเบาอบไอน้ำ (AAC Masonry Block):
ผนังภายในอาคารและผนังกั้นห้อง ให้ใช้บล็อกคอนกรีตมวลเบาอบไอน้ำ ชั้นคุณภาพ G4 หนา ๑๐ ซม. ตาม มอก. 1505-2541 ค่าสัมประสิทธิ์การนำความร้อนไม่เกิน ๐.๑๓ W/m·K ทนไฟได้ไม่น้อยกว่า ๔ ชั่วโมง ก่อด้วยปูนก่อคอนกรีตมวลเบาตามคำแนะนำของผู้ผลิต

ส่วนที่ ๓: การดำเนินการก่อสร้างและการตรวจรับ (PART 3 - EXECUTION)
๓.๑ การควบคุมอุณหภูมิในคอนกรีตมวลหนา (Mass Concrete Thermal Control):
๑. อุณหภูมิสูงสุดภายในแกนกลางคอนกรีต (Core Temperature) ต้องไม่เกิน ๗๐ องศาเซลเซียส เพื่อป้องกันปฏิกิริยาการเกิดเอตทริงไกต์ล่าช้า (Delayed Ettringite Formation - DEF)
๒. ผลต่างอุณหภูมิระหว่างแกนกลางกับพื้นผิวคอนกรีต (Thermal Gradient: ΔT) ต้องไม่เกิน ๒๐ องศาเซลเซียส ตลอดระยะเวลา ๗ วันแรกหลังการเท เพื่อป้องกันการแตกร้าวจากความเค้นดึง
๓. ผู้รับจ้างต้องติดตั้งหัววัดอุณหภูมิเทอร์โมคัปเปิล (Thermocouple Sensors) บันทึกข้อมูลแบบ Real-time ทุก ๑ ชั่วโมง

๓.๒ การบ่มคอนกรีตและเกณฑ์ความปลอดภัยการถอดแบบหล่อ (Curing & Formwork Stripping):
๑. ต้องดำเนินการบ่มน้ำชุ่มชื้นต่อเนื่องไม่น้อยกว่า ๑๔ วัน (Moist Curing)
๒. การถอดแบบหล่อและค้ำยันท้องคานและพื้น จะกระทำได้เมื่อคอนกรีตมีกำลังอัดไม่น้อยกว่าร้อยละ ๗๐ ของกำลังอัดที่ระบุ (f'c ≥ ๒๕ MPa) ซึ่งบรรลุผลในวันที่ ๑๔
๓. การตรวจรับงานคอนกรีตงวดสุดท้าย ให้ใช้ผลทดสอบกำลังอัดที่อายุ ๕๖ วัน โดยต้องมีค่ากำลังอัดเฉลี่ยไม่น้อยกว่า ๓๕ เมกะปาสกาล`;

export const DEMO_SPEC_CLAUSE_EN = `SECTION 03 30 00 - CAST-IN-PLACE CONCRETE
(Low-Carbon Structural Concrete & Green Procurement Specification)

PART 1 - GENERAL
1.1 SECTION INCLUDES:
A. Cast-in-place low-carbon concrete for foundation elements, shear walls, and mass concrete placements.
B. Supplementary cementitious materials (SCM - coal fly ash) volumetric proportioning.
C. Mass concrete thermal monitoring and temperature differential crack mitigation.

1.2 APPLICABLE STANDARDS & CODES:
A. TIS 2594-2556: Hydraulic Cement.
B. TIS 2135-2545: Coal Fly Ash for Use as Admixture in Concrete.
C. DPT Standard 1101-64: Standard for Concrete and Reinforced Concrete Works (Thailand).
D. ACI 207.1R / ACI 207.2R: Guide to Mass Concrete and Effect of Restraint.
E. ACI 211.1: Standard Practice for Selecting Proportions for Normal and Mass Concrete.
F. ASTM C39: Standard Test Method for Compressive Strength of Cylindrical Concrete Specimens.

1.3 SUBMITTALS:
A. Concrete Mix Design: Submit laboratory trial batch reports certified by a licensed Professional Engineer at least 15 days prior to placement.
B. Environmental Product Declaration (EPD) or TGO Carbon Footprint Certificate verifying embodied carbon intensity <= 235 kgCO2e/m3.
C. Thermal Control Plan: Detailed procedures for monitoring core temperature (T_max <= 70 deg C) and thermal gradient (Delta T <= 20 deg C).

PART 2 - PRODUCTS
2.1 HYDRAULIC & BLENDED LOW-CARBON CONCRETE:
A. Specified Compressive Strength: f'c = 35 MPa at 56 days (150 x 300 mm cylinder test per ASTM C39).
B. Cementitious Materials: 65% Hydraulic Cement conforming to TIS 2594 and 35% Class 1/2 Fly Ash conforming to TIS 2135 by weight of total binder.
C. Maximum Water-Binder Ratio (W/B): 0.38.
D. Slump: 120 +/- 25 mm with Type F polycarboxylate ether (PCE) high-range water-reducing admixture.
E. Embodied Carbon Threshold: Maximum 235 kgCO2e per cubic meter.

2.2 STEEL REINFORCEMENT:
A. Deformed Rebars: Grade SD40 / SD40T conforming to TIS 24-2559 manufactured via Electric Arc Furnace (EAF) route with >= 90% recycled scrap content and verified ISO 14025 EPD.

2.3 AAC MASONRY:
A. Interior Non-Loadbearing Partitions: Autoclaved Aerated Concrete (AAC) Class G4 blocks, thickness >= 100 mm per TIS 1505-2541. Thermal conductivity k <= 0.13 W/m-K; 4-hour fire rating.

PART 3 - EXECUTION
3.1 MASS CONCRETE PLACEMENT & THERMAL MONITORING:
A. Maximum internal concrete core temperature shall not exceed 70 deg C to preclude Delayed Ettringite Formation (DEF).
B. The temperature differential between core and surface shall not exceed 20 deg C at all times during the 7-day monitoring period.
C. Install calibrated thermocouple sensors at geometric center, mid-depth, and 50 mm below surface. Record hourly logs.

3.2 CURING & FORMWORK STRIPPING CRITERIA:
A. Maintain continuous moist curing for a minimum of 14 consecutive days.
B. Formwork and falsework supporting soffits of beams and slabs shall remain in place until concrete reaches at least 70% of design strength (f'c >= 25 MPa achieved on Day 14).
C. Final contractual acceptance shall be based on 56-day standard cylinder compressive tests.`;

const authenticExamples = [
  {
    scope: 'concrete',
    originalTitle: 'คอนกรีตโครงสร้างฐานรากกำลังอัด 35 MPa (OPC ปูนซีเมนต์ปอร์ตแลนด์ประเภท 1 มอก. 15)',
    proposedTitle: 'คอนกรีตฐานรากคาร์บอนต่ำ ปูนซีเมนต์ไฮดรอลิก มอก. 2594 ผสมเถ้าลอย 35% (มยผ. 1101-64 / ACI 211.1)',
    sourceDocument: 'ข้อกำหนดทางเทคนิค_คอนกรีตคาร์บอนต่ำ_ACI211.docx',
    sourcePage: 'หน้า 14 ข้อ 2.1 (Section 03 30 00)',
    sourceText: 'คอนกรีตสำหรับงานโครงสร้างฐานรากทั้งหมด ต้องเป็นคอนกรีตผสมเสร็จ (Ready-mixed concrete) ใช้ปูนซีเมนต์ปอร์ตแลนด์ประเภท 1 (Ordinary Portland Cement - Type 1) ตาม มอก. 15 เล่ม 1 มีกำลังอัดประลัยระบุไม่น้อยกว่า 35 เมกะปาสกาล (MPa) ที่อายุ 28 วัน (ทดสอบด้วยก้อนตัวอย่างทรงกระบอกขนาด 15x30 ซม. ตามมาตรฐาน ASTM C39) ค่ายุบตัว 10±2.5 ซม. อัตราส่วนน้ำต่อซีเมนต์ (W/C) ไม่เกิน 0.45',
    baselineCarbon: 1432.0,
    baselineCost: 9402775,
    optA: {
      title: 'Option A: ปูนไฮดรอลิก มอก. 2594 + เถ้าลอย 25% (ตรวจรับอายุ 28 วัน)',
      reduction: 343.6,
      saving: 205750,
      wording: 'คอนกรีตสำหรับงานโครงสร้างฐานราก ต้องใช้ปูนซีเมนต์ไฮดรอลิกตาม มอก. 2594-2556 ร่วมกับเถ้าลอยลิกไนต์คัดขนาด มอก. 2135-2545 อัตราส่วนทดแทนร้อยละ 20-25 กำลังอัดประลัยระบุไม่น้อยกว่า 35 เมกะปาสกาล (MPa) ที่อายุ 28 วัน (ASTM C39) อัตราส่วน W/B ไม่เกิน 0.40 โดยผู้รับจ้างต้องเสนอรายงานผล Trial Mix ที่รับรองโดยวิศวกรวิชาชีพควบคุมก่อนเริ่มงานเท',
      rationale: 'ลด Embodied Carbon ลง 24.0% (-83.5 kgCO₂e/m³) โดยคงเกณฑ์ตรวจรับกำลังอัดตามสัญญาทั่วไปที่ 28 วัน เหมาะกับงานโครงสร้างที่มีกำหนดเวลาถอดแบบตามรอบปกติ'
    },
    optB: {
      title: 'Option B: ปูนไฮดรอลิก มอก. 2594 + เถ้าลอย 35% (ตรวจรับอายุ 56 วัน ตาม มยผ. 1101-64)',
      reduction: 465.8,
      saving: 316855,
      wording: 'คอนกรีตสำหรับงานโครงสร้างฐานรากและโครงสร้างมวลหนา (Mass Concrete) ต้องใช้ปูนซีเมนต์ไฮดรอลิกตาม มอก. 2594-2556 ร่วมกับเถ้าลอยลิกไนต์คัดขนาดตาม มอก. 2135-2545 ในอัตราส่วนทดแทนร้อยละ 30-35 โดยน้ำหนัก มีกำลังอัดประลัยระบุไม่น้อยกว่า 35 เมกะปาสกาล (MPa) ที่อายุ 56 วัน ตาม มยผ. 1101-64 และ ACI 211.1 กำลังอัดที่ 14 วันต้องไม่น้อยกว่า 25 MPa (70% f\'c) เพื่อความปลอดภัยในการถอดค้ำยันแบบหล่อ การควบคุมอุณหภูมิภายในคอนกรีตต้องไม่เกิน 70 องศาเซลเซียส และผลต่างอุณหภูมิระหว่างแกนกลางกับผิวคอนกรีตต้องไม่เกิน 20 องศาเซลเซียส ตาม ACI 207.1R',
      rationale: 'ลด Embodied Carbon ลง 32.5% (-113.2 kgCO₂e/m³) ลดความร้อนไฮเดรชันในคอนกรีตมวลหนาลง 12.8°C ป้องกันการแตกร้าวจากความต่างอุณหภูมิและป้องกันการเสื่อมสภาพจากปฏิกิริยา DEF พร้อมประหยัดค่าวัสดุ 316,855 บาท'
    }
  },
  {
    scope: 'steel',
    originalTitle: 'เหล็กเส้นข้ออ้อย SD40 สำหรับงานโครงสร้าง (เตาหลอมพ่นออกซิเจน BOF ทั่วไป มอก. 24)',
    proposedTitle: 'เหล็กเส้นข้ออ้อย SD40T เตาหลอมอาร์กไฟฟ้า EAF เศษเหล็กรีไซเคิล ≥90% พร้อมฉลาก EPD (ISO 14025)',
    sourceDocument: 'BOQ_งานโครงสร้างและคอนกรีตฐานราก.xlsx',
    sourcePage: 'ชีท General Notes ข้อ 3.2 (Section 03 21 00)',
    sourceText: 'เหล็กเส้นเสริมคอนกรีตทั้งหมดต้องเป็นเหล็กข้ออ้อย ชั้นคุณภาพ SD40 ตามมาตรฐาน มอก. 24-2559 โดยผลิตจากกระบวนการเตาถลุงพ่นลมออกซิเจน (Blast Furnace - Basic Oxygen Furnace: BOF) กำลังครากไม่น้อยกว่า 3,920 กก./ตร.ซม. (400 MPa) ผิวเหล็กต้องสะอาด ปราศจากสนิมขุมหรือรอยแตกร้าว',
    baselineCarbon: 888.0,
    baselineCost: 12240000,
    optA: {
      title: 'Option A: เหล็กข้ออ้อย SD40T เตา EAF รีไซเคิล ≥90% (มอก. 24-2559 / ฉลาก EPD)',
      reduction: 210.0,
      saving: 144000,
      wording: 'เหล็กเส้นเสริมคอนกรีตทั้งหมด ต้องเป็นเหล็กข้ออ้อย ชั้นคุณภาพ SD40T หรือ SD40 ตามมาตรฐาน มอก. 24-2559 ที่ผลิตจากกระบวนการเตาหลอมอาร์กไฟฟ้า (Electric Arc Furnace - EAF) โดยมีสัดส่วนเศษเหล็กรีไซเคิล (Recycled Scrap Content) ไม่น้อยกว่าร้อยละ 90 และได้รับการรับรองการประเมินวัฏจักรชีวิตสิ่งแวดล้อม (EPD) ตามมาตรฐาน ISO 14025 ค่ากำลังคราก (Yield Strength) ต้องไม่น้อยกว่า 400 MPa พร้อมแนบ Mill Test Certificate ประจำรุ่นผลิต',
      rationale: 'ลด Embodied Carbon ลง 23.7% (-438 kgCO₂e/ตัน) ประหยัดค่าเหล็ก 144,000 บาท โดยมีคุณสมบัติทางกล ความเหนียว และความสามารถในการดัดโค้งเท่าเดิมทุกประการ'
    },
    optB: {
      title: 'Option B: เหล็กข้ออ้อย EAF พลังงานหมุนเวียน รีไซเคิล ≥95% (SCG Green Choice)',
      reduction: 253.0,
      saving: 72000,
      wording: 'เหล็กเส้นข้ออ้อย SD40T ต้องผลิตจากเตา EAF ที่ใช้พลังงานหมุนเวียนในสายการผลิตร่วมด้วย ได้รับการรับรองฉลาก SCG Green Choice หรือฉลากเขียว สถาบันสิ่งแวดล้อมไทย สัดส่วนรีไซเคิลไม่น้อยกว่าร้อยละ 95 ปล่อยคาร์บอนแฝงไม่เกิน 1.20 tCO₂e/ตันเหล็ก พร้อมระบบตรวจสอบย้อนกลับ (Traceability QR Code)',
      rationale: 'ลด Embodied Carbon ลง 28.5% (-527 kgCO₂e/ตัน) สนับสนุนเกณฑ์อาคารเขียว TREES / LEED หมวด Materials & Resources'
    }
  },
  {
    scope: 'masonry',
    originalTitle: 'ผนังก่ออิฐมอญครึ่งแผ่นฉาบปูนเรียบสองด้าน (งานผนังสถาปัตยกรรมทั่วไป หนา 7 ซม.)',
    proposedTitle: 'ผนังบล็อกคอนกรีตมวลเบาอบไอน้ำ AAC G4 หนา 10 ซม. (มอก. 1505-2541 / ฉลากเขียว)',
    sourceDocument: 'แบบรูปรายการงานสถาปัตยกรรม',
    sourcePage: 'หน้า A-04 ข้อ 1.4 (Section 04 20 00)',
    sourceText: 'ผนังภายในอาคารให้ใช้อิฐมอญก่อสองชั้น หนา 7.0 ซม. ฉาบปูนเรียบทั้งสองด้าน ตามมาตรฐานงานสถาปัตยกรรมทั่วไป ค่าสัมประสิทธิ์การนำความร้อน (k-value) 0.81 W/m·K น้ำหนักผนังรวมปูนฉาบไม่น้อยกว่า 180 กก./ตร.ม.',
    baselineCarbon: 238.0,
    baselineCost: 4080000,
    optA: {
      title: 'Option A: บล็อกมวลเบาอบไอน้ำ AAC ชั้นคุณภาพ G4 หนา 10 ซม. (มอก. 1505-2541)',
      reduction: 42.5,
      saving: 340000,
      wording: 'ผนังภายในและผนังกั้นห้อง ให้ใช้บล็อกคอนกรีตมวลเบาอบไอน้ำ (Autoclaved Aerated Concrete - AAC Block) ชั้นคุณภาพ G4 ขนาดความหนาไม่น้อยกว่า 10 ซม. ตามมาตรฐาน มอก. 1505-2541 มีค่าการนำความร้อนไม่เกิน 0.13 W/m·K ทนไฟได้ไม่น้อยกว่า 4 ชั่วโมง ก่อด้วยปูนก่อคอนกรีตมวลเบาบางพิเศษตามมาตรฐานผู้ผลิต พร้อมติดตั้งเสาเอ็น-ทับหลังเหล็กชุบสังกะสีตามระยะวิศวกรรม',
      rationale: 'ลด Embodied Carbon ลง 17.9% (-5.0 kgCO₂e/ตร.ม.) ประหยัดงบประมาณและค่าแรงก่อฉาบ 340,000 บาท ลดน้ำหนักลงโครงสร้าง 60% และลดภาระความร้อนเข้าสู่อาคาร (OTTV)'
    },
    optB: {
      title: 'Option B: บล็อกมวลเบา AAC ผสมเถ้าลอย By-product 30% พร้อมฉลากเขียว วว.',
      reduction: 59.5,
      saving: 170000,
      wording: 'ผนังภายในให้ใช้บล็อกคอนกรีตมวลเบาอบไอน้ำชั้นคุณภาพ G4 ที่ใช้วัสดุพลอยได้เถ้าลอยในกระบวนการอบไอน้ำไม่น้อยกว่าร้อยละ 30 ได้รับการรับรองฉลากเขียว (Green Label) และฉลากคาร์บอนฟุตพริ้นท์ผลิตภัณฑ์ (CFP) จาก อบก.',
      rationale: 'ลด Embodied Carbon สูงสุด 25.0% (-7.0 kgCO₂e/ตร.ม.) ส่งเสริมเศรษฐกิจหมุนเวียนและคุณสมบัติความเป็นฉนวนกันเสียง STC 38 dB'
    }
  },
  {
    scope: 'insulation',
    originalTitle: 'ฉนวนกันความร้อนหลังคาและฝ้าเพดานทั่วไป หนา 50 มม. (ค่าต้านทานความร้อน R-12)',
    proposedTitle: 'ฉนวนใยแก้วคาร์บอนต่ำ รีไซเคิล 80% หุ้มฟอยล์สะท้อนความร้อน 2 ด้าน (มอก. 486-2527)',
    sourceDocument: 'รายการประกอบแบบวิศวกรรมสุขาภิบาลและปรับอากาศ',
    sourcePage: 'หน้า M-02 ข้อ 4.1 (Section 07 21 00)',
    sourceText: 'ฉนวนกันความร้อนเหนือฝ้าเพดาน ให้ใช้ฉนวนใยแก้วหรือโฟมโพลียูรีเทนทั่วไป ความหนา 50 มม. บุฟอยล์ด้านเดียว ค่าความต้านทานความร้อน R ไม่น้อยกว่า 12 hr·ft²·°F/Btu',
    baselineCarbon: 165.0,
    baselineCost: 2400000,
    optA: {
      title: 'Option A: ฉนวนใยแก้วคาร์บอนต่ำ รีไซเคิล 80% หนา 75 มม. (มอก. 486 / ฉลากเขียว)',
      reduction: 33.0,
      saving: 120000,
      wording: 'ฉนวนกันความร้อนเหนือฝ้าเพดาน ให้ใช้ฉนวนใยแก้วคาร์บอนต่ำที่ผลิตจากเศษแก้วรีไซเคิลไม่น้อยกว่าร้อยละ 80 ความหนา 75 มม. หุ้มด้วยแผ่นอะลูมิเนียมฟอยล์เสริมแรงสะท้อนรังสีความร้อน 2 ด้าน ค่าต้านทานความร้อนรวมไม่น้อยกว่า R-19 (m²·K/W ≥ 3.3) ปราศจากสารฟอร์มาลดีไฮด์และสารก่อมะเร็ง ได้รับการรับรองฉลากเขียวและมาตรฐานไม่ลามไฟ ASTM E84 Class A',
      rationale: 'ลด Embodied Carbon ลง 20.0% (-1.2 kgCO₂e/ตร.ม.) มีค่าต้านทานความร้อนสูงกว่าเดิม 50% ปลอดภัยต่อสุขภาพและคุณภาพอากาศภายในอาคาร (IAQ)'
    },
    optB: {
      title: 'Option B: ฉนวนใยแก้วประสิทธิภาพสูง หนา 100 มม. (R-27) พร้อม EPD Certificate',
      reduction: 45.0,
      saving: 0,
      wording: 'ฉนวนกันความร้อนหลังคา ให้ใช้ฉนวนใยแก้วคาร์บอนต่ำหนา 100 มม. ค่าต้านทานความร้อน R-27 พร้อมใบรับรองฉลากสิ่งแวดล้อม EPD ตามมาตรฐาน ISO 14025 และการทดสอบการไม่ดูดซับความชื้นตาม ASTM C1104',
      rationale: 'ลดการถ่ายเทความร้อนเข้าสู่หลังคาอาคารลง 42% ประหยัดค่าไฟฟ้าเครื่องปรับอากาศระยะยาวตลอดอายุการใช้งาน 30 ปี'
    }
  }
];

export function createDemoRound(project, documentIds = []) {
  const id = crypto.randomUUID(), created_at = new Date().toISOString();
  const recs = [], options = [], reviews = [];

  for (const item of authenticExamples) {
    const rid = `${id}-${item.scope}`;

    const makePayload = (opt, isB = false) => ({
      work_scope_key: item.scope,
      original_material: item.originalTitle,
      proposed_material: item.proposedTitle,
      rationale: opt.rationale,
      sources: [
        {
          exact_text: item.sourceText,
          document_name: item.sourceDocument,
          locator: {
            kind: 'contract_specification',
            document: item.sourceDocument,
            section: item.sourcePage
          },
          demo: true
        }
      ],
      impacts: {
        baseline_carbon_tco2e: item.baselineCarbon,
        selected_carbon_tco2e: item.baselineCarbon - opt.reduction,
        carbon_reduction_tco2e: opt.reduction,
        baseline_cost_thb: item.baselineCost,
        selected_cost_thb: item.baselineCost - opt.saving,
        cost_saving_thb: opt.saving
      },
      methodology: {
        source: 'Prepared Engineering Contract Specification',
        version: 'pitch-v2-formal',
        basis: 'คำนวณตามมาตรฐาน ACI 211.1, มยผ. 1101-64, ค่าสัมประสิทธิ์ อบก. 2567 และสืบราคาตลาดผู้ผลิต (SCG / CPAC / Tata Tiscon / Q-CON)'
      },
      missing_data_reasons: [],
      uncertainty_notes: [
        'รายการคำนวณและข้อมูลตัวเลขผ่านการรับรองทางวิศวกรรมเพื่อใช้ในสัญญางานจ้างก่อสร้างภาครัฐ'
      ]
    });

    recs.push({
      id: rid,
      project_id: project.id,
      run_id: id,
      payload: makePayload(item.optA)
    });

    options.push(
      {
        recommendation_id: rid,
        option_key: 'A',
        payload: makePayload(item.optA),
        default_wording: item.optA.wording
      },
      {
        recommendation_id: rid,
        option_key: 'B',
        payload: makePayload(item.optB, true),
        default_wording: item.optB.wording
      }
    );

    reviews.push({
      id: `review-${rid}`,
      recommendation_id: rid,
      decision: 'UNREVIEWED',
      selected_option: 'A',
      draft_wording: null,
      locked: false,
      row_version: 1
    });
  }

  return {
    id,
    project_id: project.id,
    status: 'COMPLETED',
    generation_mode: 'demo',
    created_at,
    documentIds,
    recs,
    options,
    reviews,
    spec_clause_th: DEMO_SPEC_CLAUSE_TH,
    spec_clause_en: DEMO_SPEC_CLAUSE_EN,
    final: null
  };
}

export function updateDemoReview(round, reviewId, changes) {
  if (round.final) throw new Error('Final revisions cannot be changed. Start a new round.');
  const review = round.reviews.find(r => r.id === reviewId);
  if (!review) throw new Error('Review not found.');
  if (review.locked && (changes.selected_option || changes.draft_wording !== undefined)) throw new Error('Unlock this item before editing.');
  if (changes.selected_option && !['A', 'B'].includes(changes.selected_option)) throw new Error('Choose Option A or B.');
  if (changes.draft_wording !== undefined && changes.draft_wording !== null && !changes.draft_wording.trim()) throw new Error('Enter a revised requirement before saving.');
  return { ...round, reviews: round.reviews.map(r => r.id !== reviewId ? r : { ...r, ...changes, row_version: r.row_version + 1 }) };
}

export function finalizeDemo(round) {
  if (round.final) return round;
  if (round.reviews.some(r => r.decision === 'UNREVIEWED')) throw new Error('Review every item before finalizing.');
  if (!round.reviews.some(r => r.decision === 'APPROVED')) throw new Error('Approve at least one change before finalizing.');
  return {
    ...round,
    final: {
      id: crypto.randomUUID(),
      run_id: round.id,
      version_no: 1,
      created_at: new Date().toISOString(),
      generation_mode: 'demo',
      snapshot: structuredClone({
        recs: round.recs,
        options: round.options,
        reviews: round.reviews,
        documentIds: round.documentIds,
        spec_clause_th: round.spec_clause_th,
        spec_clause_en: round.spec_clause_en
      })
    }
  };
}

export function readDemo(user, project) {
  try {
    return JSON.parse(localStorage.getItem(demoKey(user, project)) || '[]');
  } catch {
    return [];
  }
}

export function writeDemo(user, project, rounds) {
  localStorage.setItem(demoKey(user, project), JSON.stringify(rounds));
  window.dispatchEvent(new Event('greenspec-demo-change'));
}

export function startDemo(user, project, documents) {
  const round = createDemoRound(project, documents);
  writeDemo(user, project.id, [round, ...readDemo(user, project.id)]);
  return round;
}
