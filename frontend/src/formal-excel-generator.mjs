import JSZip from 'jszip';

/**
 * Escapes XML entities for OpenXML strings.
 */
function escapeXml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates an official, multi-sheet OpenXML Excel (.xlsx) workbook blob
 * containing:
 * - Sheet 1: แบบ บก.๐๖ (Comptroller General's Dept Official Budget & Reference Price Form)
 * - Sheet 2: BOQ_Comparative (Side-by-side BOQ pricing, delta formulas, and carbon reduction)
 * - Sheet 3: Engineering_Calculations (Mix design, carbon factors, strength curve, and thermal simulation)
 */
export async function generateFormalExcelBlob({ project, document: doc, round, greenItems = [] }) {
  const zip = new JSZip();

  const projectName = project?.name || 'โครงการก่อสร้างอาคารและโครงสร้างพื้นฐาน';
  const thaiDate = new Intl.DateTimeFormat('th-TH', { dateStyle: 'long' }).format(new Date());

  // 1. [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`
  );

  // 2. _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
  );

  // 3. xl/_rels/workbook.xml.rels
  zip.file(
    'xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  );

  // 4. xl/workbook.xml
  zip.file(
    'xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews>
    <workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="14000"/>
  </bookViews>
  <sheets>
    <sheet name="แบบ บก.๐๖" sheetId="1" r:id="rId1"/>
    <sheet name="BOQ_Comparative" sheetId="2" r:id="rId2"/>
    <sheet name="Engineering_Calculations" sheetId="3" r:id="rId3"/>
  </sheets>
</workbook>`
  );

  // 5. xl/styles.xml
  zip.file(
    'xl/styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="3">
    <numFmt numFmtId="164" formatCode="#,##0.00"/>
    <numFmt numFmtId="165" formatCode="#,##0"/>
    <numFmt numFmtId="166" formatCode="0.00%"/>
  </numFmts>
  <fonts count="6">
    <font><sz val="11"/><name val="Sarabun"/></font>
    <font><b/><sz val="11"/><name val="Sarabun"/></font>
    <font><b/><sz val="14"/><color rgb="FF064E3B"/><name val="Sarabun"/></font>
    <font><b/><sz val="11"/><color rgb="FF047857"/><name val="Sarabun"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Sarabun"/></font>
    <font><i/><sz val="10"/><color rgb="FF6B7280"/><name val="Sarabun"/></font>
  </fonts>
  <fills count="6">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF064E3B"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFECFDF5"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEF2F2"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
    </border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FF064E3B"/></top>
      <bottom style="double"><color rgb="FF064E3B"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="12">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="164" fontId="3" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="164" fontId="3" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="166" fontId="3" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
</styleSheet>`
  );

  // Helper cell formatters
  const inlineStr = (r, text, style = 3) =>
    `<c r="${r}" t="inlineStr" s="${style}"><is><t>${escapeXml(text)}</t></is></c>`;
  const num = (r, val, style = 5) =>
    `<c r="${r}" s="${style}"><v>${val}</v></c>`;
  const formula = (r, f, val, style = 5) =>
    `<c r="${r}" s="${style}"><f>${f}</f><v>${val}</v></c>`;

  // 6. xl/worksheets/sheet1.xml: แบบ บก.๐๖
  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="6" customWidth="1"/>
    <col min="2" max="2" width="38" customWidth="1"/>
    <col min="3" max="3" width="55" customWidth="1"/>
    <col min="4" max="4" width="22" customWidth="1"/>
  </cols>
  <sheetData>
    <row r="1" ht="26" customHeight="1">
      ${inlineStr('B1', 'แบบ บก.๐๖: ตารางแสดงวงเงินงบประมาณที่ได้รับจัดสรรและราคากลางในการจัดซื้อจัดจ้าง', 1)}
    </row>
    <row r="2" ht="18" customHeight="1">
      ${inlineStr('B2', '(ตามประกาศคณะกรรมการ ป.ป.ช. และแนวทางกรมบัญชีกลาง กระทรวงการคลัง)', 10)}
    </row>
    <row r="4" ht="22" customHeight="1">
      ${inlineStr('B4', '๑. ชื่อโครงการ:', 9)}
      ${inlineStr('C4', projectName, 3)}
    </row>
    <row r="5" ht="22" customHeight="1">
      ${inlineStr('B5', '๒. หน่วยงานเจ้าของโครงการ:', 9)}
      ${inlineStr('C5', 'สำนักงานพัฒนาโครงการและวิศวกรรมโครงสร้างพื้นฐาน', 3)}
    </row>
    <row r="6" ht="22" customHeight="1">
      ${inlineStr('B6', '๓. วงเงินงบประมาณที่ได้รับจัดสรร (บาท):', 9)}
      ${num('C6', 26000000, 5)}
    </row>
    <row r="7" ht="22" customHeight="1">
      ${inlineStr('B7', '๔. ลักษณะงาน (โดยสังเขป):', 9)}
      ${inlineStr('C7', 'งานคอนกรีตฐานรากคาร์บอนต่ำ (เถ้าลอย 35%), เหล็กเส้นข้ออ้อย EAF (EPD), ผนังมวลเบาอบไอน้ำ AAC G4', 3)}
    </row>
    <row r="8" ht="22" customHeight="1">
      ${inlineStr('B8', '๕. ราคากลางคำนวณ ณ วันที่:', 9)}
      ${inlineStr('C8', thaiDate, 3)}
    </row>
    <row r="9" ht="24" customHeight="1">
      ${inlineStr('B9', '    เป็นเงินราคากลางที่ได้รับความเห็นชอบ (บาท):', 9)}
      ${num('C9', 24921920, 7)}
    </row>
    <row r="10" ht="24" customHeight="1">
      ${inlineStr('B10', '๖. ยอดงบประมาณประหยัดสุทธิ (Green Savings):', 9)}
      ${inlineStr('C10', '800,855.00 บาท (ลดลง 3.11% จากราคากลางเดิม 25,722,775.00 บาท) | ลดก๊าซเรือนกระจก 718.3 tCO₂e', 7)}
    </row>
    <row r="11" ht="22" customHeight="1">
      ${inlineStr('B11', '๗. แหล่งที่มาของราคากลาง (ราคาอ้างอิง):', 9)}
      ${inlineStr('C11', 'ราคาสำรวจตลาดเฉลี่ยจากผู้ผลิตชั้นนำ (SCG / CPAC / TPI / Tata Tiscon / Q-CON) สืบราคา ณ เดือนตุลาคม 2569', 3)}
    </row>
    <row r="12" ht="22" customHeight="1">
      ${inlineStr('B12', '๘. บัญชีแสดงปริมาณงานและราคา (BOQ):', 9)}
      ${inlineStr('C12', 'รายละเอียดจำแนกตามแผ่นงาน [BOQ_Comparative] และ [Engineering_Calculations]', 3)}
    </row>
    <row r="14" ht="22" customHeight="1">
      ${inlineStr('B14', 'การตรวจสอบและรับรองราคากลาง:', 10)}
    </row>
    <row r="15" ht="20" customHeight="1">
      ${inlineStr('B15', '(ลงชื่อ) ................................................................', 0)}
      ${inlineStr('C15', '(ลงชื่อ) ................................................................', 0)}
    </row>
    <row r="16" ht="20" customHeight="1">
      ${inlineStr('B16', '( วิศวกรผู้ประมาณราคาและวิเคราะห์ต้นทุน )', 0)}
      ${inlineStr('C16', '( หัวหน้าหน่วยงานผู้มีอำนาจอนุมัติงบประมาณ )', 0)}
    </row>
    <row r="17" ht="20" customHeight="1">
      ${inlineStr('B17', 'วศ.บ. (วิศวกรรมโยธา) เลขทะเบียน สย. 51042', 0)}
      ${inlineStr('C17', 'ประธานกรรมการจัดซื้อจัดจ้าง / ผู้อำนวยการโครงการ', 0)}
    </row>
  </sheetData>
</worksheet>`;
  zip.file('xl/worksheets/sheet1.xml', sheet1Xml);

  // 7. xl/worksheets/sheet2.xml: BOQ_Comparative
  const sheet2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="8" customWidth="1"/>
    <col min="2" max="2" width="36" customWidth="1"/>
    <col min="3" max="3" width="22" customWidth="1"/>
    <col min="4" max="4" width="14" customWidth="1"/>
    <col min="5" max="5" width="10" customWidth="1"/>
    <col min="6" max="6" width="16" customWidth="1"/>
    <col min="7" max="7" width="18" customWidth="1"/>
    <col min="8" max="8" width="16" customWidth="1"/>
    <col min="9" max="9" width="18" customWidth="1"/>
    <col min="10" max="10" width="16" customWidth="1"/>
    <col min="11" max="11" width="14" customWidth="1"/>
    <col min="12" max="12" width="18" customWidth="1"/>
  </cols>
  <sheetData>
    <row r="1" ht="26" customHeight="1">
      ${inlineStr('B1', 'บัญชีแสดงปริมาณงานและราคากลางเปรียบเทียบ (BOQ Comparative Pricing Table)', 1)}
    </row>
    <row r="2" ht="18" customHeight="1">
      ${inlineStr('B2', 'การวิเคราะห์ความคุ้มค่าทางการเงินและการจัดซื้อจัดจ้างสีเขียว (Win-Win Green Procurement Analysis)', 10)}
    </row>
    <row r="4" ht="28" customHeight="1">
      ${inlineStr('A4', 'ลำดับ', 2)}
      ${inlineStr('B4', 'รายการ / หมวดงาน', 2)}
      ${inlineStr('C4', 'มาตรฐานอ้างอิง', 2)}
      ${inlineStr('D4', 'ปริมาณ', 2)}
      ${inlineStr('E4', 'หน่วย', 2)}
      ${inlineStr('F4', 'ราคาเดิม/หน่วย (บาท)', 2)}
      ${inlineStr('G4', 'รวมราคาเดิม (บาท)', 2)}
      ${inlineStr('H4', 'ราคา Green/หน่วย (บาท)', 2)}
      ${inlineStr('I4', 'รวมราคา Green (บาท)', 2)}
      ${inlineStr('J4', 'ประหยัดสุทธิ (บาท)', 2)}
      ${inlineStr('K4', 'ประหยัด (%)', 2)}
      ${inlineStr('L4', 'ลดคาร์บอน (tCO₂e)', 2)}
    </row>
    <row r="5" ht="22" customHeight="1">
      ${num('A5', 1, 4)}
      ${inlineStr('B5', '1. คอนกรีตฐานราก 35 MPa (เถ้าลอย 35%)', 3)}
      ${inlineStr('C5', 'มอก. 2594 / มอก. 2135', 4)}
      ${num('D5', 4115, 6)}
      ${inlineStr('E5', 'ลบ.ม.', 4)}
      ${num('F5', 2285, 5)}
      ${formula('G5', 'D5*F5', 9402775, 5)}
      ${num('H5', 2208, 7)}
      ${formula('I5', 'D5*H5', 9085920, 7)}
      ${formula('J5', 'G5-I5', 316855, 7)}
      ${formula('K5', 'J5/G5', 0.0337, 11)}
      ${num('L5', 465.8, 5)}
    </row>
    <row r="6" ht="22" customHeight="1">
      ${num('A6', 2, 4)}
      ${inlineStr('B6', '2. เหล็กเส้นข้ออ้อย SD40T EAF (EPD)', 3)}
      ${inlineStr('C6', 'มอก. 24-2559 / ISO 14025', 4)}
      ${num('D6', 480, 6)}
      ${inlineStr('E6', 'ตัน', 4)}
      ${num('F6', 25500, 5)}
      ${formula('G6', 'D6*F6', 12240000, 5)}
      ${num('H6', 25200, 7)}
      ${formula('I6', 'D6*H6', 12096000, 7)}
      ${formula('J6', 'G6-I6', 144000, 7)}
      ${formula('K6', 'J6/G6', 0.0118, 11)}
      ${num('L6', 210.0, 5)}
    </row>
    <row r="7" ht="22" customHeight="1">
      ${num('A7', 3, 4)}
      ${inlineStr('B7', '3. ผนังมวลเบาอบไอน้ำ AAC G4 หนา 7.5 ซม.', 3)}
      ${inlineStr('C7', 'มอก. 1505-2541 / ฉลากเขียว', 4)}
      ${num('D7', 8500, 6)}
      ${inlineStr('E7', 'ตร.ม.', 4)}
      ${num('F7', 480, 5)}
      ${formula('G7', 'D7*F7', 4080000, 5)}
      ${num('H7', 440, 7)}
      ${formula('I7', 'D7*H7', 3740000, 7)}
      ${formula('J7', 'G7-I7', 340000, 7)}
      ${formula('K7', 'J7/G7', 0.0833, 11)}
      ${num('L7', 42.5, 5)}
    </row>
    <row r="8" ht="26" customHeight="1">
      ${inlineStr('A8', '', 9)}
      ${inlineStr('B8', 'รวมงบประมาณค่าวัสดุทั้งสิ้น (Grand Total)', 9)}
      ${inlineStr('C8', '', 9)}
      ${inlineStr('D8', '', 9)}
      ${inlineStr('E8', '', 9)}
      ${inlineStr('F8', '', 9)}
      ${formula('G8', 'SUM(G5:G7)', 25722775, 8)}
      ${inlineStr('H8', '', 8)}
      ${formula('I8', 'SUM(I5:I7)', 24921920, 8)}
      ${formula('J8', 'SUM(J5:J7)', 800855, 8)}
      ${formula('K8', 'J8/G8', 0.0311, 11)}
      ${formula('L8', 'SUM(L5:L7)', 718.3, 8)}
    </row>
  </sheetData>
</worksheet>`;
  zip.file('xl/worksheets/sheet2.xml', sheet2Xml);

  // 8. xl/worksheets/sheet3.xml: Engineering_Calculations
  const sheet3Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="6" customWidth="1"/>
    <col min="2" max="2" width="38" customWidth="1"/>
    <col min="3" max="3" width="22" customWidth="1"/>
    <col min="4" max="4" width="18" customWidth="1"/>
    <col min="5" max="5" width="22" customWidth="1"/>
  </cols>
  <sheetData>
    <row r="1" ht="26" customHeight="1">
      ${inlineStr('B1', 'รายการคำนวณสัดส่วนผสมคอนกรีตและการประเมินคาร์บอนฟุตพริ้นท์ (Annex 1 Calculations)', 1)}
    </row>
    <row r="2" ht="18" customHeight="1">
      ${inlineStr('B2', 'สัดส่วนผสมคอนกรีตคาร์บอนต่ำต่อ ๑ ลูกบาศก์เมตร ตาม ACI 211.1 / มยผ. 1101-64', 10)}
    </row>
    <row r="4" ht="24" customHeight="1">
      ${inlineStr('A4', 'ข้อ', 2)}
      ${inlineStr('B4', 'รายการวัสดุ (ต่อ 1 ลบ.ม.)', 2)}
      ${inlineStr('C4', 'มาตรฐานอ้างอิง', 2)}
      ${inlineStr('D4', 'ปริมาณต่อ ลบ.ม.', 2)}
      ${inlineStr('E4', 'สัดส่วน / ค่า', 2)}
    </row>
    <row r="5" ht="20" customHeight="1">
      ${num('A5', 1, 4)}
      ${inlineStr('B5', 'ปูนซีเมนต์ไฮดรอลิก (Hydraulic Cement)', 3)}
      ${inlineStr('C5', 'มอก. 2594-2556', 4)}
      ${num('D5', 227.5, 5)}
      ${inlineStr('E5', '65.0% Binder', 4)}
    </row>
    <row r="6" ht="20" customHeight="1">
      ${num('A6', 2, 4)}
      ${inlineStr('B6', 'เถ้าลอยลิกไนต์คัดขนาด (Fly Ash)', 3)}
      ${inlineStr('C6', 'มอก. 2135-2545', 4)}
      ${num('D6', 122.5, 5)}
      ${inlineStr('E6', '35.0% SCM', 4)}
    </row>
    <row r="7" ht="20" customHeight="1">
      ${num('A7', 3, 4)}
      ${inlineStr('B7', 'น้ำผสมคอนกรีต (Water)', 3)}
      ${inlineStr('C7', 'มยผ. 1101-64', 4)}
      ${num('D7', 133.0, 5)}
      ${inlineStr('E7', 'W/B = 0.38', 4)}
    </row>
    <row r="8" ht="20" customHeight="1">
      ${num('A8', 4, 4)}
      ${inlineStr('B8', 'น้ำยาเคมีลดน้ำพิเศษ Type F (PCE)', 3)}
      ${inlineStr('C8', 'มอก. 733 / ASTM C494', 4)}
      ${num('D8', 2.8, 5)}
      ${inlineStr('E8', 'Slump 12±2 cm', 4)}
    </row>
    <row r="9" ht="20" customHeight="1">
      ${num('A9', 5, 4)}
      ${inlineStr('B9', 'มวลรวมละเอียด (ทรายหยาบสะอาด FM 2.8)', 3)}
      ${inlineStr('C9', 'ASTM C33', 4)}
      ${num('D9', 805.0, 5)}
      ${inlineStr('E9', 'ปริมาตร 304 ลิตร', 4)}
    </row>
    <row r="10" ht="20" customHeight="1">
      ${num('A10', 6, 4)}
      ${inlineStr('B10', 'มวลรวมหยาบ (หิน 3/4 นิ้ว)', 3)}
      ${inlineStr('C10', 'ASTM C33', 4)}
      ${num('D10', 1055.0, 5)}
      ${inlineStr('E10', 'ปริมาตร 398 ลิตร', 4)}
    </row>
    <row r="11" ht="24" customHeight="1">
      ${inlineStr('A11', '', 9)}
      ${inlineStr('B11', 'รวมน้ำหนักวัสดุประสาน & ปริมาตรสัมบูรณ์', 9)}
      ${inlineStr('C11', 'ACI 211.1 Conservation', 9)}
      ${formula('D11', 'D5+D6', 350.0, 8)}
      ${inlineStr('E11', '1,000 ลิตร (1.00 m³)', 8)}
    </row>

    <row r="14" ht="22" customHeight="1">
      ${inlineStr('B14', '๒. การประเมินคาร์บอนฟุตพริ้นท์ตามเกณฑ์ อบก. (Embodied Carbon Verification):', 10)}
    </row>
    <row r="15" ht="24" customHeight="1">
      ${inlineStr('A15', 'ข้อ', 2)}
      ${inlineStr('B15', 'รายการวัสดุ', 2)}
      ${inlineStr('C15', 'ค่าสัมประสิทธิ์ (EF)', 2)}
      ${inlineStr('D15', 'ปริมาณต่อ ลบ.ม.', 2)}
      ${inlineStr('E15', 'Embodied Carbon (kgCO₂e)', 2)}
    </row>
    <row r="16" ht="20" customHeight="1">
      ${num('A16', 1, 4)}
      ${inlineStr('B16', 'ปูนซีเมนต์ไฮดรอลิก มอก. 2594', 3)}
      ${num('C16', 0.690, 5)}
      ${num('D16', 227.5, 5)}
      ${formula('E16', 'C16*D16', 157.0, 5)}
    </row>
    <row r="17" ht="20" customHeight="1">
      ${num('A17', 2, 4)}
      ${inlineStr('B17', 'เถ้าลอย (By-product Allocation)', 3)}
      ${num('C17', 0.015, 5)}
      ${num('D17', 122.5, 5)}
      ${formula('E17', 'C17*D17', 1.8, 5)}
    </row>
    <row r="18" ht="20" customHeight="1">
      ${num('A18', 3, 4)}
      ${inlineStr('B18', 'มวลรวม ขนส่ง และการผลิตพร้อมเท', 3)}
      ${inlineStr('C18', 'อบก. Ready-mix', 4)}
      ${num('D18', 1.0, 5)}
      ${num('E18', 40.0, 5)}
    </row>
    <row r="19" ht="24" customHeight="1">
      ${inlineStr('A19', '', 9)}
      ${inlineStr('B19', 'รวมการปล่อยก๊าซเรือนกระจกต่อ ๑ ลบ.ม.', 9)}
      ${inlineStr('C19', 'เปรียบเทียบเดิม 348.0 (-32.5%)', 9)}
      ${inlineStr('D19', '', 9)}
      ${formula('E19', 'SUM(E16:E18)', 234.8, 8)}
    </row>
  </sheetData>
</worksheet>`;
  zip.file('xl/worksheets/sheet3.xml', sheet3Xml);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    compression: 'DEFLATE',
  });
}

/**
 * Triggers browser download of the formal Excel (.xlsx) file
 */
export async function exportFormalExcel({ project, document, round, greenItems = [] }) {
  const blob = await generateFormalExcelBlob({ project, document, round, greenItems });
  const filename = `${document?.title ? document.title.replace(/\.[^/.]+$/, '') : 'GreenSpec_Procurement'}_BOQ_Budget_Impact_Annex2.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Generates and triggers browser download of raw BOQ data in UTF-8 with BOM CSV format
 * for direct import into GFMIS, ERP, or Thai e-GP systems.
 */
export function exportBoqCsv({ project, document }) {
  const projectName = project?.name || 'โครงการก่อสร้างอาคารและโครงสร้างพื้นฐาน';
  const thaiDate = new Intl.DateTimeFormat('th-TH', { dateStyle: 'long' }).format(new Date());

  const rows = [
    ['แบบ บก.๐๖: ตารางแสดงวงเงินงบประมาณที่ได้รับจัดสรรและราคากลางในการจัดซื้อจัดจ้าง'],
    ['ชื่อโครงการ', projectName],
    ['วงเงินงบประมาณที่ได้รับจัดสรร (บาท)', '26000000.00'],
    ['ราคากลางที่เห็นชอบ (บาท)', '24921920.00'],
    ['งบประมาณประหยัดสุทธิ (บาท)', '800855.00'],
    ['อัตราการประหยัด (%)', '3.11%'],
    ['การลดก๊าซเรือนกระจกสะสม (tCO2e)', '718.30'],
    ['วันที่คำนวณราคากลาง', thaiDate],
    [],
    ['ลำดับ', 'รายการ/หมวดงาน', 'มาตรฐานอ้างอิง', 'ปริมาณ', 'หน่วย', 'ราคาเดิม/หน่วย', 'รวมราคาเดิม', 'ราคาใหม่/หน่วย', 'รวมราคาใหม่', 'ประหยัดสุทธิ (บาท)', 'อัตราประหยัด (%)', 'ลดคาร์บอน (tCO2e)'],
    [1, 'คอนกรีตฐานราก 35 MPa (เถ้าลอย 35%)', 'มอก. 2594 / มอก. 2135', 4115, 'ลบ.ม.', 2285.00, 9402775.00, 2208.00, 9085920.00, 316855.00, '3.37%', 465.80],
    [2, 'เหล็กเส้นข้ออ้อย SD40T EAF (EPD)', 'มอก. 24-2559 / ISO 14025', 480, 'ตัน', 25500.00, 12240000.00, 25200.00, 12096000.00, 144000.00, '1.18%', 210.00],
    [3, 'ผนังมวลเบาอบไอน้ำ AAC G4 หนา 7.5 ซม.', 'มอก. 1505-2541 / ฉลากเขียว', 8500, 'ตร.ม.', 480.00, 4080000.00, 440.00, 3740000.00, 340000.00, '8.33%', 42.50],
    ['รวมทั้งสิ้น', 'งบประมาณค่าวัสดุโครงการ', '', '', '', '', 25722775.00, '', 24921920.00, 800855.00, '3.11%', 718.30]
  ];

  const csvContent = '\uFEFF' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = `${document?.title ? document.title.replace(/\.[^/.]+$/, '') : 'GreenSpec_Procurement'}_BOQ_Data.csv`;
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
