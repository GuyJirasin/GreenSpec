import JSZip from 'jszip';

/**
 * Escapes special XML characters for Word OpenXML.
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
 * Generates OpenXML paragraph (<w:p>)
 */
function createParagraph(text, {
  bold = false,
  size = 32, // 16pt (32 half-points)
  color = '000000',
  align = 'left',
  spaceBefore = 100,
  spaceAfter = 100,
  italic = false,
  indent = 0,
} = {}) {
  const alignXml = align !== 'left' ? `<w:jc w:val="${align}"/>` : '';
  const spacingXml = `<w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="360" w:lineRule="auto"/>`;
  const indXml = indent > 0 ? `<w:ind w:firstLine="${indent}"/>` : '';
  
  const rPr = [
    bold ? '<w:b/>' : '',
    italic ? '<w:i/>' : '',
    `<w:sz w:val="${size}"/>`,
    `<w:szCs w:val="${size}"/>`,
    `<w:color w:val="${color}"/>`,
    '<w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New" w:cs="TH Sarabun New"/>',
  ].filter(Boolean).join('');

  const lines = String(text || '').split('\n');
  const runs = lines.map((line, idx) => {
    const br = idx > 0 ? '<w:br/>' : '';
    return `${br}<w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>`;
  }).join('');

  return `<w:p><w:pPr>${alignXml}${spacingXml}${indXml}</w:pPr>${runs}</w:p>`;
}

/**
 * Generates an OpenXML Table Cell (<w:tc>)
 */
function createTableCell(content, {
  width = 2400,
  bgColor = null,
  bold = false,
  size = 28,
  align = 'left',
  borderColor = 'CCCCCC',
} = {}) {
  const shdXml = bgColor ? `<w:shd w:val="clear" w:color="auto" w:fill="${bgColor}"/>` : '';
  const bordersXml = `<w:tcBorders>
    <w:top w:val="single" w:sz="4" w:space="0" w:color="${borderColor}"/>
    <w:left w:val="single" w:sz="4" w:space="0" w:color="${borderColor}"/>
    <w:bottom w:val="single" w:sz="4" w:space="0" w:color="${borderColor}"/>
    <w:right w:val="single" w:sz="4" w:space="0" w:color="${borderColor}"/>
  </w:tcBorders>`;
  const tcPr = `<w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${shdXml}${bordersXml}<w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="160" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tcMar></w:tcPr>`;
  const p = createParagraph(content, { bold, size, align, spaceBefore: 40, spaceAfter: 40 });
  return `<w:tc>${tcPr}${p}</w:tc>`;
}

/**
 * Builds standard OpenXML Word Document (.docx) as a Blob
 * strictly following Thai government/engineering specification conventions.
 */
export async function generateFormalDocxBlob({ project, document, round, greenItems = [] }) {
  const zip = new JSZip();

  const projectName = project?.name || 'โครงการก่อสร้างอาคารและโครงสร้างพื้นฐาน';
  const thaiDate = new Intl.DateTimeFormat('th-TH', { dateStyle: 'long' }).format(new Date());
  const yearBe = new Date().getFullYear() + 543;
  const docNo = `GS-TOR-${yearBe}/${String(project?.id || '01').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}`;

  // 1. [Content_Types].xml
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

  // 2. _rels/.rels
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  // 3. word/_rels/document.xml.rels
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  // 4. word/styles.xml
  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="TH Sarabun New" w:eastAsia="TH Sarabun New" w:hAnsi="TH Sarabun New" w:cs="TH Sarabun New"/>
        <w:sz w:val="32"/>
        <w:szCs w:val="32"/>
        <w:lang w:val="th-TH"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="360" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`);

  // Construct Word Document XML Body
  const paragraphs = [];

  // Official Header - Thai Government Document Style
  paragraphs.push(createParagraph('เอกสารแนบท้ายประกาศประกวดราคา', {
    bold: true,
    size: 28,
    align: 'right',
    spaceBefore: 0,
    spaceAfter: 100,
  }));

  paragraphs.push(createParagraph('ร่างขอบเขตของงานและรายการคุณลักษณะเฉพาะทางเทคนิค (Terms of Reference : TOR)', {
    bold: true,
    size: 36, // 18pt
    align: 'center',
    spaceBefore: 100,
    spaceAfter: 80,
  }));

  paragraphs.push(createParagraph(`งานจ้างก่อสร้าง: ${projectName}`, {
    bold: true,
    size: 32, // 16pt
    align: 'center',
    spaceBefore: 0,
    spaceAfter: 60,
  }));

  paragraphs.push(createParagraph(`หมวดที่ 03 30 00: งานคอนกรีตโครงสร้างหล่อในที่และวัสดุก่อสร้างคาร์บอนต่ำ`, {
    bold: true,
    size: 28,
    align: 'center',
    spaceBefore: 0,
    spaceAfter: 200,
  }));

  // Document Identification Grid
  const metaRows = [
    ['เลขที่เอกสารอ้างอิง:', docNo, 'วันที่จัดทำ:', thaiDate],
    ['โครงการ:', projectName, 'สถานะเอกสาร:', 'ฉบับปรับปรุงข้อกำหนดเพื่อการจัดซื้อจัดจ้าง (Approved Revision)'],
  ];

  let metaTableXml = '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="6" w:color="000000"/><w:bottom w:val="single" w:sz="6" w:color="000000"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="single" w:sz="4" w:color="E5E7EB"/><w:insideV w:val="none"/></w:tblBorders></w:tblPr>';
  for (const row of metaRows) {
    metaTableXml += `<w:tr>
      ${createTableCell(row[0], { width: 2200, bold: true, size: 26, bgColor: 'F9FAFB' })}
      ${createTableCell(row[1], { width: 2480, size: 26 })}
      ${createTableCell(row[2], { width: 2200, bold: true, size: 26, bgColor: 'F9FAFB' })}
      ${createTableCell(row[3], { width: 2480, size: 26, bold: true })}
    </w:tr>`;
  }
  metaTableXml += '</w:tbl>';
  paragraphs.push(metaTableXml);
  paragraphs.push(createParagraph('', { spaceBefore: 120, spaceAfter: 120 }));

  // Part 1: General
  paragraphs.push(createParagraph('หมวดที่ 1: ข้อกำหนดทั่วไป (Part 1 - General Requirements)', {
    bold: true,
    size: 32,
    spaceBefore: 200,
    spaceAfter: 100,
  }));

  paragraphs.push(createParagraph(
    '1.1 ขอบเขตของงาน: ข้อกำหนดนี้ครอบคลุมการจัดหา การออกแบบส่วนผสม การผสม การลำเลียง การเท การตกแต่งผิว ' +
    'ตลอดจนการบ่มคอนกรีตโครงสร้างคาร์บอนต่ำ (Low-Carbon Concrete) และการใช้วัสดุก่อสร้างที่ผ่านการรับรองมาตรฐานด้านสิ่งแวดล้อม ' +
    'สำหรับงานฐานราก เสา คาน และพื้นโครงสร้างของโครงการ',
    { size: 30, spaceBefore: 60, spaceAfter: 60, indent: 720 }
  ));

  paragraphs.push(createParagraph('1.2 มาตรฐานอ้างอิงทางวิศวกรรม (Governing Engineering Standards):', {
    bold: true,
    size: 30,
    spaceBefore: 80,
    spaceAfter: 60,
  }));

  const stdList = [
    '• มยผ. 1101-64 / วสท. 1014-43: มาตรฐานงานคอนกรีตและคอนกรีตเสริมเหล็ก กรมโยธาธิการและผังเมือง',
    '• มอก. 2594-2556 / มอก. 213-2560: ปูนซีเมนต์ไฮดรอลิก',
    '• มอก. 2135-2545: เถ้าลอยสำหรับใช้เป็นวัสดุผสมคอนกรีต ชั้นคุณภาพ 1 หรือชั้นคุณภาพ 2',
    '• มอก. 24-2559: เหล็กเส้นเสริมคอนกรีต: เหล็กข้ออ้อย (มอก. ชั้นคุณภาพ SD40 หรือ SD50)',
    '• มอก. 1505-2541: คอนกรีตมวลเบาอบไอน้ำสำหรับงานผนังก่อ (ชั้นคุณภาพ G4)',
    '• ACI 207.1R-05 & ACI 207.2R: Guide to Mass Concrete (การควบคุมอุณหภูมิคอนกรีตมวลหนาเพื่อป้องกันการแตกร้าวและการเสื่อมสภาพ DEF)',
    '• ประกาศองค์การบริหารจัดการก๊าซเรือนกระจก (องค์การมหาชน): แนวทางการประเมินคาร์บอนฟุตพริ้นท์ของผลิตภัณฑ์ (CFP)',
  ];
  for (const std of stdList) {
    paragraphs.push(createParagraph(std, { size: 28, spaceBefore: 40, spaceAfter: 40, indent: 720 }));
  }

  paragraphs.push(createParagraph(
    '1.3 การเสนอเอกสารเพื่อขออนุมัติ (Submittals): ผู้รับจ้างต้องเสนอรายการคำนวณและสัดส่วนการผสมคอนกรีต (Mix Design) ' +
    'พร้อมผลทดสอบกำลังอัดจากห้องปฏิบัติการที่ได้รับการรับรองมาตรฐาน ISO/IEC 17025 ล่วงหน้าก่อนเริ่มงานเทคอนกรีตไม่น้อยกว่า 30 วัน ' +
    'และต้องแนบใบรับรองคุณภาพวัสดุ (Mill Test Certificate) สำหรับปูนซีเมนต์ไฮดรอลิก เถ้าลอย และเหล็กเสริมทุกชุด',
    { size: 30, spaceBefore: 60, spaceAfter: 120, indent: 720 }
  ));

  // Part 2: Materials & Products (With Approved Revisions)
  paragraphs.push(createParagraph('หมวดที่ 2: คุณลักษณะของวัสดุและผลิตภัณฑ์ (Part 2 - Materials & Products)', {
    bold: true,
    size: 32,
    spaceBefore: 200,
    spaceAfter: 100,
  }));

  paragraphs.push(createParagraph(
    '2.1 ปูนซีเมนต์และวัสดุประสานเสริม (Cementitious Materials): ให้ใช้ปูนซีเมนต์ไฮดรอลิกตามมาตรฐาน มอก. 2594 หรือ มอก. 213 ' +
    'ผสมร่วมกับเถ้าลอยตามมาตรฐาน มอก. 2135 ชั้นคุณภาพ 1 หรือ 2 สัดส่วนการแทนที่ร้อยละ 25 ถึง 35 โดยน้ำหนักของวัสดุประสานรวม ' +
    'เถ้าลอยต้องมีค่าปริมาณส่วนสูญเสียเนื่องจากการเผา (LOI) ไม่เกินร้อยละ 3.0',
    { size: 30, spaceBefore: 60, spaceAfter: 60, indent: 720 }
  ));

  paragraphs.push(createParagraph(
    '2.2 คุณสมบัติของคอนกรีตโครงสร้างฐานราก: กำลังอัดประลัยระบุ f\'c ไม่น้อยกว่า 35 เมกะปาสกาล (ทรงกระบอก 150x300 มม. ที่อายุ 56 วัน) ' +
    'อัตราส่วนน้ำต่อวัสดุประสาน (W/B Ratio) ไม่เกิน 0.40 โดยน้ำหนัก และค่ายุบตัว 10.0 ± 2.5 เซนติเมตร',
    { size: 30, spaceBefore: 60, spaceAfter: 60, indent: 720 }
  ));

  paragraphs.push(createParagraph(
    '2.3 เหล็กเสริมโครงสร้าง: เหล็กข้ออ้อยชั้นคุณภาพ SD40 หรือ SD50 ตามมาตรฐาน มอก. 24-2559 ' +
    'ผลิตด้วยกระบวนการเตาหลอมอาร์กไฟฟ้า (Electric Arc Furnace - EAF) ที่มีสัดส่วนเศษเหล็กรีไซเคิลไม่น้อยกว่าร้อยละ 90 ' +
    'และมีเอกสารสำแดงผลิตภัณฑ์สิ่งแวดล้อม (Environmental Product Declaration - EPD) ตาม ISO 14025',
    { size: 30, spaceBefore: 60, spaceAfter: 60, indent: 720 }
  ));

  paragraphs.push(createParagraph(
    '2.4 ผนังก่อภายใน: ให้ใช้บล็อกคอนกรีตมวลเบาอบไอน้ำ (AAC Block) หนา 10 เซนติเมตร ตามมาตรฐาน มอก. 1505-2541 ชั้นคุณภาพ G4',
    { size: 30, spaceBefore: 60, spaceAfter: 120, indent: 720 }
  ));

  // Comparative Revision Schedule Table
  paragraphs.push(createParagraph('ตารางเปรียบเทียบข้อกำหนดเดิมและข้อกำหนดฉบับแก้ไขเพิ่มเติม (Comparative Schedule)', {
    bold: true,
    size: 30,
    spaceBefore: 140,
    spaceAfter: 80,
  }));

  let compTableXml = '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="6" w:color="000000"/><w:bottom w:val="single" w:sz="6" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:color="CCCCCC"/><w:insideV w:val="single" w:sz="4" w:color="CCCCCC"/></w:tblBorders></w:tblPr>';
  compTableXml += `<w:tr>
    ${createTableCell('หมวดงาน', { width: 1800, bold: true, size: 26, bgColor: 'F3F4F6', align: 'center' })}
    ${createTableCell('ข้อกำหนดเดิม (ก่อนแก้ไข)', { width: 3400, bold: true, size: 26, bgColor: 'F3F4F6', align: 'center' })}
    ${createTableCell('ข้อกำหนดฉบับแก้ไขเพิ่มเติม (Approved Revision)', { width: 4160, bold: true, size: 26, bgColor: 'F3F4F6', align: 'center' })}
  </w:tr>`;

  for (const item of greenItems) {
    const origSummary = item.originalSnippet || 'ใช้ปูนซีเมนต์ปอร์ตแลนด์ประเภท 1 (มอก. 15) ทั้งหมด 100% ไม่กำหนดการใช้วัสดุประสานทดแทน';
    const revisedSummary = `${item.revisedText}\n(มาตรฐานอ้างอิง: ${item.standard})`;
    compTableXml += `<w:tr>
      ${createTableCell(item.section, { width: 1800, bold: true, size: 24, align: 'center' })}
      ${createTableCell(origSummary, { width: 3400, size: 24 })}
      ${createTableCell(revisedSummary, { width: 4160, size: 24, bold: false })}
    </w:tr>`;
  }
  compTableXml += '</w:tbl>';
  paragraphs.push(compTableXml);
  paragraphs.push(createParagraph('', { spaceBefore: 120, spaceAfter: 120 }));

  // Part 3: Execution
  paragraphs.push(createParagraph('หมวดที่ 3: การดำเนินงานก่อสร้างและการควบคุมคุณภาพ (Part 3 - Execution)', {
    bold: true,
    size: 32,
    spaceBefore: 200,
    spaceAfter: 100,
  }));

  paragraphs.push(createParagraph(
    '3.1 การเทคอนกรีตโครงสร้างมวลหนา (Mass Concrete): สำหรับโครงสร้างที่มีมิติความหนาตั้งแต่ 1.00 เมตรขึ้นไป ' +
    'ผู้รับจ้างต้องควบคุมอุณหภูมิสูงสุดภายในก้อนคอนกรีตไม่เกิน 70 องศาเซลเซียส และผลต่างของอุณหภูมิระหว่างแกนกลางกับผิวภายนอก (ΔT) ' +
    'ต้องไม่เกิน 20 องศาเซลเซียส ตามแนวทางมาตรฐาน ACI 207.1R เพื่อป้องกันการแตกร้าวและการเสื่อมสภาพแบบ Delayed Ettringite Formation (DEF) ' +
    'โดยต้องติดตั้งหัววัดอุณหภูมิ (Thermocouple) และบันทึกข้อมูลต่อเนื่องตลอด 7 วันแรก',
    { size: 30, spaceBefore: 60, spaceAfter: 60, indent: 720 }
  ));

  paragraphs.push(createParagraph(
    '3.2 การบ่มคอนกรีต: ต้องดำเนินการบ่มชื้นอย่างต่อเนื่องทันทีหลังผิวหน้าคอนกรีตก่อตัว โดยใช้วิธีฉีดพ่นน้ำ คลุมด้วยกระสอบเปียกชื้น ' +
    'หรือวัสดุกักเก็บความชื้นที่มีประสิทธิภาพ เป็นเวลาไม่น้อยกว่า 14 วัน สำหรับคอนกรีตผสมเถ้าลอย',
    { size: 30, spaceBefore: 60, spaceAfter: 120, indent: 720 }
  ));

  // Part 4: Quality & Handover
  paragraphs.push(createParagraph('หมวดที่ 4: การตรวจรับพัสดุและการส่งมอบงาน (Part 4 - Quality Handover)', {
    bold: true,
    size: 32,
    spaceBefore: 200,
    spaceAfter: 100,
  }));

  const qcList = [
    '4.1 รายงานผลการทดสอบกำลังอัดลูกปูนคอนกรีตรูปทรงกระบอก (Compressive Strength Test Report) ที่อายุ 7, 28 และ 56 วัน จากสถาบันที่ได้มาตรฐาน ISO/IEC 17025',
    '4.2 ใบรับรองคุณภาพวัสดุ (Mill Certificate) และใบส่งของ (Delivery Note) ระบุสัดส่วนการผสมเถ้าลอย มอก. 2135 ครบทุกเที่ยวการเท',
    '4.3 บันทึกผลการตรวจวัดอุณหภูมิคอนกรีตฐานรากด้วย Thermocouple ตลอดระยะเวลาการบ่มควบคุม',
    '4.4 รายงานการประเมินการลดก๊าซเรือนกระจก (Embodied Carbon Verification Report) เทียบเคียงเกณฑ์ อบก. ยืนยันการลดคาร์บอนไม่น้อยกว่าร้อยละ 30',
  ];
  for (const qc of qcList) {
    paragraphs.push(createParagraph(qc, { size: 30, spaceBefore: 40, spaceAfter: 40, indent: 720 }));
  }

  // Part 5: Committee Sign-off
  paragraphs.push(createParagraph('หมวดที่ 5: การพิจารณาและลงนามของคณะกรรมการกำหนดร่างขอบเขตของงาน', {
    bold: true,
    size: 32,
    spaceBefore: 240,
    spaceAfter: 100,
  }));

  paragraphs.push(createParagraph(
    'คณะกรรมการกำหนดร่างขอบเขตของงานและราคากลาง ได้ตรวจสอบและพิจารณาข้อกำหนดเฉพาะทางเทคนิคฉบับแก้ไขเพิ่มเติมนี้แล้ว ' +
    'เห็นว่ามีความถูกต้อง ครบถ้วนตามมาตรฐานวิศวกรรมโยธาและระเบียบการจัดซื้อจัดจ้างภาครัฐ จึงได้ลงลายมือชื่อไว้เป็นหลักฐาน',
    { size: 30, spaceBefore: 60, spaceAfter: 200, indent: 720 }
  ));

  let signTableXml = '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="none"/><w:bottom w:val="none"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders></w:tblPr>';
  signTableXml += `<w:tr>
    ${createTableCell('(ลงชื่อ)................................................................\n(................................................................)\nประธานกรรมการกำหนดร่าง TOR\nวันที่ ..... / ..... / .........', { width: 4680, align: 'center', size: 26 })}
    ${createTableCell('(ลงชื่อ)................................................................\n(................................................................)\nกรรมการ (วิศวกรโยธา)\nวันที่ ..... / ..... / .........', { width: 4680, align: 'center', size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('(ลงชื่อ)................................................................\n(................................................................)\nกรรมการ (ผู้เชี่ยวชาญด้านวิศวกรรมสิ่งแวดล้อม)\nวันที่ ..... / ..... / .........', { width: 4680, align: 'center', size: 26 })}
    ${createTableCell('(ลงชื่อ)................................................................\n(................................................................)\nกรรมการและเลขานุการ\nวันที่ ..... / ..... / .........', { width: 4680, align: 'center', size: 26 })}
  </w:tr>`;
  signTableXml += '</w:tbl>';
  paragraphs.push(signTableXml);

  // --- PAGE 4: Annex 1 - Engineering Mix Design & Carbon Calculations ---
  paragraphs.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
  
  paragraphs.push(createParagraph('เอกสารแนบท้าย ๑: รายการคำนวณสัดส่วนผสมคอนกรีตและการประเมินคาร์บอนฟุตพริ้นท์', {
    bold: true,
    size: 34,
    spaceBefore: 200,
    spaceAfter: 80,
    align: 'center',
  }));
  paragraphs.push(createParagraph('การออกแบบสัดส่วนผสมคอนกรีตคาร์บอนต่ำ (ปูนไฮดรอลิก มอก. 2594 + เถ้าลอย มอก. 2135 ร้อยละ 35) ตาม ACI 211.1 / มยผ. 1101-64', {
    italic: true,
    size: 26,
    color: '4B5563',
    spaceBefore: 0,
    spaceAfter: 160,
    align: 'center',
  }));

  paragraphs.push(createParagraph('๑. รายการสัดส่วนผสมคอนกรีตคาร์บอนต่ำต่อ ๑ ลูกบาศก์เมตร (Low-Carbon Mix Design - 1 m³):', {
    bold: true,
    size: 30,
    spaceBefore: 120,
    spaceAfter: 80,
  }));

  let mixTableXml = '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="6" w:color="94A3B8"/><w:bottom w:val="single" w:sz="6" w:color="94A3B8"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="single" w:sz="4" w:color="E2E8F0"/><w:insideV w:val="none"/></w:tblBorders></w:tblPr>';
  mixTableXml += `<w:tr>
    ${createTableCell('รายการวัสดุ', { width: 3744, bgColor: 'F1F5F9', bold: true, align: 'center', size: 26 })}
    ${createTableCell('มาตรฐานอ้างอิง', { width: 1872, bgColor: 'F1F5F9', bold: true, align: 'center', size: 26 })}
    ${createTableCell('ปริมาณต่อ ลบ.ม.', { width: 1872, bgColor: 'F1F5F9', bold: true, align: 'center', size: 26 })}
    ${createTableCell('สัดส่วน / ค่า', { width: 1872, bgColor: 'F1F5F9', bold: true, align: 'center', size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('ปูนซีเมนต์ไฮดรอลิก (Hydraulic Cement)', { width: 3744, size: 26 })}
    ${createTableCell('มอก. 2594-2556', { width: 1872, align: 'center', size: 26 })}
    ${createTableCell('227.5 กก.', { width: 1872, align: 'right', size: 26 })}
    ${createTableCell('65.0%', { width: 1872, align: 'center', size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('เถ้าลอยลิกไนต์คัดขนาด (Fly Ash)', { width: 3744, size: 26 })}
    ${createTableCell('มอก. 2135-2545', { width: 1872, align: 'center', size: 26 })}
    ${createTableCell('122.5 กก.', { width: 1872, align: 'right', size: 26 })}
    ${createTableCell('35.0%', { width: 1872, align: 'center', size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('น้ำผสมคอนกรีต (W/B = 0.38)', { width: 3744, size: 26 })}
    ${createTableCell('มยผ. 1101-64', { width: 1872, align: 'center', size: 26 })}
    ${createTableCell('133.0 ลิตร', { width: 1872, align: 'right', size: 26 })}
    ${createTableCell('W/B 0.38', { width: 1872, align: 'center', size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('น้ำยาเคมีลดน้ำพิเศษ Type F', { width: 3744, size: 26 })}
    ${createTableCell('มอก. 733 / ASTM C494', { width: 1872, align: 'center', size: 26 })}
    ${createTableCell('2.8 ลิตร', { width: 1872, align: 'right', size: 26 })}
    ${createTableCell('Slump 12±2 cm', { width: 1872, align: 'center', size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('มวลรวมละเอียด (ทรายหยาบ FM 2.8)', { width: 3744, size: 26 })}
    ${createTableCell('ASTM C33', { width: 1872, align: 'center', size: 26 })}
    ${createTableCell('805.0 กก.', { width: 1872, align: 'right', size: 26 })}
    ${createTableCell('ปริมาตร 304 L', { width: 1872, align: 'center', size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('มวลรวมหยาบ (หินเบอร์ 3/4 นิ้ว)', { width: 3744, size: 26 })}
    ${createTableCell('ASTM C33', { width: 1872, align: 'center', size: 26 })}
    ${createTableCell('1,055.0 กก.', { width: 1872, align: 'right', size: 26 })}
    ${createTableCell('ปริมาตร 398 L', { width: 1872, align: 'center', size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('รวมวัสดุประสาน & ปริมาตรสัมบูรณ์รวม', { width: 5616, bgColor: 'F8FAFC', bold: true, size: 26 })}
    ${createTableCell('350.0 กก./ลบ.ม.', { width: 1872, bgColor: 'F8FAFC', bold: true, align: 'right', size: 26 })}
    ${createTableCell('1,000 ลิตร (1.00 m³)', { width: 1872, bgColor: 'F8FAFC', bold: true, align: 'center', size: 26 })}
  </w:tr>`;
  mixTableXml += '</w:tbl>';
  paragraphs.push(mixTableXml);

  paragraphs.push(createParagraph('๒. การประเมินคาร์บอนฟุตพริ้นท์ตามเกณฑ์ อบก. (Embodied Carbon Verification):', {
    bold: true,
    size: 30,
    spaceBefore: 140,
    spaceAfter: 80,
  }));

  let carbonTableXml = '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="6" w:color="94A3B8"/><w:bottom w:val="single" w:sz="6" w:color="94A3B8"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="single" w:sz="4" w:color="E2E8F0"/><w:insideV w:val="none"/></w:tblBorders></w:tblPr>';
  carbonTableXml += `<w:tr>
    ${createTableCell('รายการวัสดุ', { width: 3744, bgColor: 'F1F5F9', bold: true, align: 'center', size: 26 })}
    ${createTableCell('ค่าสัมประสิทธิ์ (EF)', { width: 2000, bgColor: 'F1F5F9', bold: true, align: 'center', size: 26 })}
    ${createTableCell('ปริมาณต่อ ลบ.ม.', { width: 1800, bgColor: 'F1F5F9', bold: true, align: 'center', size: 26 })}
    ${createTableCell('Embodied Carbon', { width: 1816, bgColor: 'F1F5F9', bold: true, align: 'center', size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('ปูนซีเมนต์ไฮดรอลิก (มอก. 2594)', { width: 3744, size: 26 })}
    ${createTableCell('0.690 kgCO₂e/kg', { width: 2000, align: 'center', size: 26 })}
    ${createTableCell('227.5 kg', { width: 1800, align: 'right', size: 26 })}
    ${createTableCell('157.0 kgCO₂e', { width: 1816, align: 'right', size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('เถ้าลอย (By-product Allocation)', { width: 3744, size: 26 })}
    ${createTableCell('0.015 kgCO₂e/kg', { width: 2000, align: 'center', size: 26 })}
    ${createTableCell('122.5 kg', { width: 1800, align: 'right', size: 26 })}
    ${createTableCell('1.8 kgCO₂e', { width: 1816, align: 'right', size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('มวลรวม ขนส่ง และกระบวนการผสม', { width: 3744, size: 26 })}
    ${createTableCell('อบก. Ready-mix', { width: 2000, align: 'center', size: 26 })}
    ${createTableCell('1.0 m³', { width: 1800, align: 'right', size: 26 })}
    ${createTableCell('40.0 kgCO₂e', { width: 1816, align: 'right', size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('รวมคาร์บอนต่อ ๑ ลบ.ม. (ฉบับปรับปรุง)', { width: 7544, bgColor: 'ECFDF5', bold: true, size: 26 })}
    ${createTableCell('234.8 kgCO₂e/m³', { width: 1816, bgColor: 'ECFDF5', bold: true, color: '047857', align: 'right', size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('เปรียบเทียบสูตรเดิม (348.0 kgCO₂e/m³)', { width: 7544, bgColor: 'F8FAFC', bold: true, size: 26 })}
    ${createTableCell('ลดลง 32.5% (-113.2 kg)', { width: 1816, bgColor: 'F8FAFC', bold: true, color: '059669', align: 'right', size: 26 })}
  </w:tr>`;
  carbonTableXml += '</w:tbl>';
  paragraphs.push(carbonTableXml);

  paragraphs.push(createParagraph('๓. การพัฒนากำลังอัดและเกณฑ์ความปลอดภัยการถอดแบบหล่อ (Strength Development & Formwork Stripping Safety - ACI 209 / มยผ. 1101-64):', {
    bold: true,
    size: 30,
    spaceBefore: 140,
    spaceAfter: 80,
  }));

  let strengthTableXml = '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="6" w:color="94A3B8"/><w:bottom w:val="single" w:sz="6" w:color="94A3B8"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="single" w:sz="4" w:color="E2E8F0"/><w:insideV w:val="none"/></w:tblBorders></w:tblPr>';
  strengthTableXml += `<w:tr>
    ${createTableCell('อายุทดสอบ', { width: 1560, bgColor: 'F1F5F9', bold: true, align: 'center', size: 26 })}
    ${createTableCell('สูตรเดิม OPC 100% (MPa)', { width: 2340, bgColor: 'F1F5F9', bold: true, align: 'center', size: 26 })}
    ${createTableCell('Green Mix เถ้าลอย 35% (MPa)', { width: 2600, bgColor: 'F1F5F9', bold: true, align: 'center', size: 26 })}
    ${createTableCell('เกณฑ์การปฏิบัติงาน / ตรวจรับ', { width: 2860, bgColor: 'F1F5F9', bold: true, align: 'center', size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('3 วัน', { width: 1560, align: 'center', size: 26 })}
    ${createTableCell('17.5 MPa (50%)', { width: 2340, align: 'center', size: 26 })}
    ${createTableCell('13.3 MPa (38%)', { width: 2600, align: 'center', size: 26 })}
    ${createTableCell('ถอดแบบหล่อแนวดิ่ง เสา/ผนัง (≥10 MPa ผ่าน)', { width: 2860, size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('7 วัน', { width: 1560, align: 'center', size: 26 })}
    ${createTableCell('24.5 MPa (70%)', { width: 2340, align: 'center', size: 26 })}
    ${createTableCell('20.3 MPa (58%)', { width: 2600, align: 'center', size: 26 })}
    ${createTableCell('ระยะบ่มน้ำชุ่มชื้นต่อเนื่องขั้นต่ำ', { width: 2860, size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('14 วัน', { width: 1560, align: 'center', size: 26, bgColor: 'ECFDF5' })}
    ${createTableCell('29.8 MPa (85%)', { width: 2340, align: 'center', size: 26, bgColor: 'ECFDF5' })}
    ${createTableCell('25.9 MPa (74%)', { width: 2600, align: 'center', size: 26, bgColor: 'ECFDF5', bold: true, color: '047857' })}
    ${createTableCell('★ ถอดค้ำยัน/แบบหล่อท้องคานและพื้น (≥70% ผ่าน)', { width: 2860, size: 26, bgColor: 'ECFDF5', bold: true, color: '047857' })}
  </w:tr>
  <w:tr>
    ${createTableCell('28 วัน', { width: 1560, align: 'center', size: 26 })}
    ${createTableCell('35.0 MPa (100%)', { width: 2340, align: 'center', size: 26 })}
    ${createTableCell('30.8 MPa (88%)', { width: 2600, align: 'center', size: 26 })}
    ${createTableCell('เกณฑ์ตรวจรับคอนกรีตทั่วไป', { width: 2860, size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('56 วัน', { width: 1560, align: 'center', size: 26, bgColor: 'F0FDF4' })}
    ${createTableCell('36.8 MPa (105%)', { width: 2340, align: 'center', size: 26, bgColor: 'F0FDF4' })}
    ${createTableCell('36.4 MPa (104%)', { width: 2600, align: 'center', size: 26, bgColor: 'F0FDF4', bold: true, color: '047857' })}
    ${createTableCell('★ เกณฑ์ตรวจรับงานตามสัญญา TOR (≥35 MPa ผ่าน)', { width: 2860, size: 26, bgColor: 'F0FDF4', bold: true, color: '047857' })}
  </w:tr>`;
  strengthTableXml += '</w:tbl>';
  paragraphs.push(strengthTableXml);

  paragraphs.push(createParagraph('๔. การจำลองการแพร่กระจายความร้อนคอนกรีตมวลหนา รายชั่วโมง (ACI 207 Hourly Mass Concrete Thermal Simulation):', {
    bold: true,
    size: 30,
    spaceBefore: 140,
    spaceAfter: 80,
  }));

  let thermalTableXml = '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="6" w:color="94A3B8"/><w:bottom w:val="single" w:sz="6" w:color="94A3B8"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="single" w:sz="4" w:color="E2E8F0"/><w:insideV w:val="none"/></w:tblBorders></w:tblPr>';
  thermalTableXml += `<w:tr>
    ${createTableCell('เวลา (ชม. / วัน)', { width: 1872, bgColor: 'F1F5F9', bold: true, align: 'center', size: 26 })}
    ${createTableCell('สูตรเดิม (Unmitigated)\nT_core / T_surf / ΔT', { width: 3744, bgColor: 'F1F5F9', bold: true, align: 'center', size: 26 })}
    ${createTableCell('Green Mix (Mitigated)\nT_core / T_surf / ΔT', { width: 3744, bgColor: 'F1F5F9', bold: true, align: 'center', size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('0 ชม. (เริ่มเท)', { width: 1872, align: 'center', size: 26 })}
    ${createTableCell('32.0°C / 28.0°C / ΔT 4.0°C', { width: 3744, align: 'center', size: 26 })}
    ${createTableCell('30.0°C / 28.0°C / ΔT 2.0°C (ปลอดภัย)', { width: 3744, align: 'center', size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('24 ชม. (1 วัน)', { width: 1872, align: 'center', size: 26 })}
    ${createTableCell('62.2°C / 38.9°C / ΔT 23.3°C (เสี่ยง)', { width: 3744, align: 'center', size: 26, color: 'DC2626' })}
    ${createTableCell('44.9°C / 37.8°C / ΔT 7.1°C (ปลอดภัย)', { width: 3744, align: 'center', size: 26, color: '047857' })}
  </w:tr>
  <w:tr>
    ${createTableCell('48 ชม. (พีคสูงสุด)', { width: 1872, align: 'center', size: 26, bgColor: 'FEF2F2' })}
    ${createTableCell('74.0°C / 45.5°C / ΔT 28.5°C\n[ตกเกณฑ์ DEF และแตกร้าว]', { width: 3744, align: 'center', size: 26, bgColor: 'FEF2F2', bold: true, color: 'B91C1C' })}
    ${createTableCell('57.5°C / 44.0°C / ΔT 13.5°C\n[ผ่านเกณฑ์ ACI 207 ปลอดภัย]', { width: 3744, align: 'center', size: 26, bgColor: 'ECFDF5', bold: true, color: '047857' })}
  </w:tr>
  <w:tr>
    ${createTableCell('72 ชม. (3 วัน)', { width: 1872, align: 'center', size: 26 })}
    ${createTableCell('70.6°C / 43.8°C / ΔT 26.8°C', { width: 3744, align: 'center', size: 26, color: 'DC2626' })}
    ${createTableCell('61.2°C / 46.4°C / ΔT 14.8°C (พีคผ่าน)', { width: 3744, align: 'center', size: 26, bold: true, color: '047857' })}
  </w:tr>
  <w:tr>
    ${createTableCell('168 ชม. (7 วัน)', { width: 1872, align: 'center', size: 26 })}
    ${createTableCell('54.7°C / 36.5°C / ΔT 18.2°C', { width: 3744, align: 'center', size: 26 })}
    ${createTableCell('48.0°C / 39.6°C / ΔT 8.4°C (ปลอดภัย)', { width: 3744, align: 'center', size: 26, color: '047857' })}
  </w:tr>`;
  thermalTableXml += '</w:tbl>';
  paragraphs.push(thermalTableXml);

  paragraphs.push(createParagraph(
    'สรุปผลการประเมินทางวิศวกรรม: กำลังอัดที่ 56 วัน f\'c = 36.4 MPa (ผ่านเกณฑ์สัญญา ≥35 MPa) | ' +
    'ถอดแบบหล่อท้องคาน/พื้นได้ในวันที่ 14 (กำลังอัด 74% ≥ 70%) | ' +
    'การควบคุมความร้อนคอนกรีตมวลหนา ACI 207: T_max = 61.2°C (<70°C ปลอดภัย DEF) และ ΔT_max = 14.8°C (≤20°C ไม่แตกร้าว) | ' +
    'ลดก๊าซเรือนกระจกสะสม 465.8 ตันคาร์บอน (tCO₂e) ตลอดปริมาณงาน 4,115 ลบ.ม.',
    { bold: true, size: 26, color: '064E3B', spaceBefore: 80, spaceAfter: 180, indent: 360 }
  ));

  let peTableXml = '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="6" w:color="94A3B8"/><w:bottom w:val="single" w:sz="6" w:color="94A3B8"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders></w:tblPr>';
  peTableXml += `<w:tr>
    ${createTableCell('(ลงชื่อ)................................................................\n(วิศวกรผู้ออกแบบส่วนผสมคอนกรีต)\nวศ.บ. (วิศวกรรมโยธา) เลขทะเบียน สย. 48291', { width: 4680, align: 'center', size: 26 })}
    ${createTableCell('(ลงชื่อ)................................................................\n(วิศวกรผู้เชี่ยวชาญการประเมินคาร์บอน)\nวท.ม. (การจัดการสิ่งแวดล้อม) เลขทะเบียน อบก. EP-2567-08', { width: 4680, align: 'center', size: 26 })}
  </w:tr>`;
  peTableXml += '</w:tbl>';
  paragraphs.push(peTableXml);

  // --- PAGE 5: Annex 2 - Procurement Budget & Reference Pricing (แบบ บก.๐๖) ---
  paragraphs.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');

  paragraphs.push(createParagraph('เอกสารแนบท้าย ๒: ตารางแสดงวงเงินงบประมาณที่ได้รับจัดสรรและราคากลาง (แบบ บก.๐๖)', {
    bold: true,
    size: 34,
    spaceBefore: 200,
    spaceAfter: 80,
    align: 'center',
  }));
  paragraphs.push(createParagraph('การวิเคราะห์ความคุ้มค่าทางการเงินและการประหยัดงบประมาณ (Cost & Budget Impact Analysis)', {
    italic: true,
    size: 26,
    color: '4B5563',
    spaceBefore: 0,
    spaceAfter: 160,
    align: 'center',
  }));

  // Budget Metadata Block
  let bgMetaTableXml = '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="6" w:color="94A3B8"/><w:bottom w:val="single" w:sz="6" w:color="94A3B8"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="single" w:sz="4" w:color="E2E8F0"/><w:insideV w:val="none"/></w:tblBorders></w:tblPr>';
  bgMetaTableXml += `<w:tr>
    ${createTableCell('วงเงินงบประมาณที่ได้รับจัดสรร:', { width: 2800, bold: true, size: 26 })}
    ${createTableCell('26,000,000.00 บาท', { width: 2800, bold: true, color: '0F172A', size: 26 })}
    ${createTableCell('ราคากลางคำนวณ ณ วันที่:', { width: 1880, bold: true, size: 26 })}
    ${createTableCell(thaiDate, { width: 1880, size: 26 })}
  </w:tr>
  <w:tr>
    ${createTableCell('แหล่งที่มาของราคากลาง:', { width: 2800, bold: true, size: 26 })}
    ${createTableCell('ราคาสำรวจตลาดเฉลี่ยจากผู้ผลิตชั้นนำ (SCG / CPAC / TPI / Tata Tiscon / Q-CON) สืบราคา ณ เดือนตุลาคม 2569', { width: 6560, size: 26 })}
  </w:tr>`;
  bgMetaTableXml += '</w:tbl>';
  paragraphs.push(bgMetaTableXml);

  paragraphs.push(createParagraph('ตารางเปรียบเทียบปริมาณวัสดุและราคากลาง (BOQ Pricing Comparison):', {
    bold: true,
    size: 30,
    spaceBefore: 140,
    spaceAfter: 80,
  }));

  let boqTableXml = '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="6" w:color="94A3B8"/><w:bottom w:val="single" w:sz="6" w:color="94A3B8"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="single" w:sz="4" w:color="E2E8F0"/><w:insideV w:val="none"/></w:tblBorders></w:tblPr>';
  boqTableXml += `<w:tr>
    ${createTableCell('รายการ / หมวดงาน', { width: 2800, bgColor: 'F1F5F9', bold: true, align: 'center', size: 24 })}
    ${createTableCell('ปริมาณ', { width: 1200, bgColor: 'F1F5F9', bold: true, align: 'center', size: 24 })}
    ${createTableCell('เดิม (บาท)', { width: 1300, bgColor: 'F1F5F9', bold: true, align: 'center', size: 24 })}
    ${createTableCell('รวมเดิม (บาท)', { width: 1360, bgColor: 'F1F5F9', bold: true, align: 'center', size: 24 })}
    ${createTableCell('Green (บาท)', { width: 1300, bgColor: 'ECFDF5', bold: true, align: 'center', color: '047857', size: 24 })}
    ${createTableCell('รวมใหม่ (บาท)', { width: 1400, bgColor: 'ECFDF5', bold: true, align: 'center', color: '047857', size: 24 })}
  </w:tr>
  <w:tr>
    ${createTableCell('1. คอนกรีตฐานราก (เถ้าลอย 35%)', { width: 2800, size: 24 })}
    ${createTableCell('4,115 m³', { width: 1200, align: 'center', size: 24 })}
    ${createTableCell('2,285.00', { width: 1300, align: 'right', size: 24 })}
    ${createTableCell('9,402,775', { width: 1360, align: 'right', size: 24 })}
    ${createTableCell('2,208.00', { width: 1300, align: 'right', color: '047857', size: 24 })}
    ${createTableCell('9,085,920', { width: 1400, align: 'right', bold: true, color: '047857', size: 24 })}
  </w:tr>
  <w:tr>
    ${createTableCell('2. เหล็กเส้นข้ออ้อย EAF (EPD)', { width: 2800, size: 24 })}
    ${createTableCell('480 ตัน', { width: 1200, align: 'center', size: 24 })}
    ${createTableCell('25,500.00', { width: 1300, align: 'right', size: 24 })}
    ${createTableCell('12,240,000', { width: 1360, align: 'right', size: 24 })}
    ${createTableCell('25,200.00', { width: 1300, align: 'right', color: '047857', size: 24 })}
    ${createTableCell('12,096,000', { width: 1400, align: 'right', bold: true, color: '047857', size: 24 })}
  </w:tr>
  <w:tr>
    ${createTableCell('3. ผนังมวลเบาอบไอน้ำ AAC G4', { width: 2800, size: 24 })}
    ${createTableCell('8,500 m²', { width: 1200, align: 'center', size: 24 })}
    ${createTableCell('480.00', { width: 1300, align: 'right', size: 24 })}
    ${createTableCell('4,080,000', { width: 1360, align: 'right', size: 24 })}
    ${createTableCell('440.00', { width: 1300, align: 'right', color: '047857', size: 24 })}
    ${createTableCell('3,740,000', { width: 1400, align: 'right', bold: true, color: '047857', size: 24 })}
  </w:tr>
  <w:tr>
    ${createTableCell('รวมงบประมาณค่าวัสดุทั้งสิ้น', { width: 5300, bgColor: 'F8FAFC', bold: true, size: 24 })}
    ${createTableCell('25,722,775', { width: 1360, bgColor: 'F8FAFC', bold: true, align: 'right', size: 24 })}
    ${createTableCell('ประหยัด 3.11%', { width: 1300, bgColor: 'ECFDF5', bold: true, align: 'center', color: '047857', size: 24 })}
    ${createTableCell('24,921,920', { width: 1400, bgColor: 'ECFDF5', bold: true, align: 'right', color: '047857', size: 24 })}
  </w:tr>`;
  boqTableXml += '</w:tbl>';
  paragraphs.push(boqTableXml);

  paragraphs.push(createParagraph(
    'สรุปความคุ้มค่าทางการเงินและการจัดซื้อจัดจ้างสีเขียว (Win-Win Green Procurement): ' +
    'ยอดงบประมาณประหยัดสุทธิทั้งโครงการ 800,855.00 บาท (ลดลง 3.11% ต่ำกว่าราคากลางเดิม) | ' +
    'ลดการปล่อยก๊าซเรือนกระจกสะสมรวม 718.3 ตันคาร์บอน (tCO₂e) | ' +
    'ไม่มีต้นทุนส่วนเพิ่ม (Zero Green Premium) พร้อมได้รับสิทธิประโยชน์ทางภาษีและการรับรองอาคารเขียว',
    { bold: true, size: 26, color: '064E3B', spaceBefore: 80, spaceAfter: 180, indent: 360 }
  ));

  let costSignTableXml = '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="6" w:color="94A3B8"/><w:bottom w:val="single" w:sz="6" w:color="94A3B8"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders></w:tblPr>';
  costSignTableXml += `<w:tr>
    ${createTableCell('(ลงชื่อ)................................................................\n(วิศวกรผู้ประมาณราคาและวิเคราะห์ต้นทุน)\nวศ.บ. (วิศวกรรมโยธา) เลขทะเบียน สย. 51042', { width: 4680, align: 'center', size: 26 })}
    ${createTableCell('(ลงชื่อ)................................................................\n(หัวหน้าหน่วยงานผู้มีอำนาจอนุมัติงบประมาณ)\nประธานกรรมการจัดซื้อจัดจ้าง / ผู้อำนวยการโครงการ', { width: 4680, align: 'center', size: 26 })}
  </w:tr>`;
  costSignTableXml += '</w:tbl>';
  paragraphs.push(costSignTableXml);

  // 5. word/document.xml
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${paragraphs.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1700" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  zip.file('word/document.xml', documentXml);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });
}

/**
 * Triggers browser download of the formal Word DOCX file
 */
export async function exportFormalDocx({ project, document, round, greenItems = [] }) {
  const blob = await generateFormalDocxBlob({ project, document, round, greenItems });
  const filename = `${document?.title ? document.title.replace(/\.[^/.]+$/, '') : 'TOR_Specification'}_Approved_Revision.docx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Generates an official, print-ready formal document HTML representation
 * completely styled to authentic Thai government / engineering standards.
 * ZERO emojis, genuine Thai typography and numbering.
 */
export function getFormalHtmlContent({ project, document: doc, round, greenItems = [] }) {
  const projectName = project?.name || 'โครงการก่อสร้างอาคารและโครงสร้างพื้นฐาน';
  const thaiDate = new Intl.DateTimeFormat('th-TH', { dateStyle: 'long' }).format(new Date());
  const yearBe = new Date().getFullYear() + 543;
  const docNo = `GS-TOR-${yearBe}/${String(project?.id || '01').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}`;

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>${docNo} - ${projectName} (ร่างข้อกำหนด TOR ฉบับปรับปรุง)</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
    
    @page {
      size: A4 portrait;
      margin: 25mm 20mm 20mm 25mm;
      @bottom-right {
        content: "หน้า " counter(page) " จาก " counter(pages);
        font-family: 'Sarabun', sans-serif;
        font-size: 11pt;
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Sarabun', 'TH Sarabun New', sans-serif;
      font-size: 16pt;
      line-height: 1.65;
      color: #000000;
      background: #f1f5f9;
      margin: 0;
      padding: 24px 0;
    }

    .document-page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 25mm 20mm 20mm 25mm;
      background: #ffffff;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    }

    .doc-top-ref {
      text-align: right;
      font-size: 13pt;
      font-weight: 600;
      margin-bottom: 12px;
      color: #374151;
    }

    .doc-header {
      text-align: center;
      margin-bottom: 24px;
      border-bottom: 1.5px solid #000000;
      padding-bottom: 16px;
    }

    .doc-title {
      font-size: 19pt;
      font-weight: 700;
      color: #000000;
      margin: 0 0 6px 0;
      line-height: 1.35;
    }

    .doc-subtitle {
      font-size: 16pt;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 4px 0;
    }

    .doc-category {
      font-size: 14pt;
      font-weight: 500;
      color: #4b5563;
      margin: 0;
    }

    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 13.5pt;
    }

    .meta-table td {
      padding: 6px 10px;
      border: 1px solid #d1d5db;
    }

    .meta-table .label {
      font-weight: 600;
      background: #f9fafb;
      color: #111827;
      width: 22%;
    }

    .section-h1 {
      font-size: 16pt;
      font-weight: 700;
      color: #000000;
      margin: 22px 0 10px 0;
    }

    .clause-p {
      text-indent: 1.25cm;
      text-align: justify;
      margin: 0 0 10px 0;
      font-size: 15.5pt;
    }

    .standards-list {
      padding-left: 1.25cm;
      margin: 6px 0 14px 0;
      font-size: 15pt;
      line-height: 1.7;
    }

    .content-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 24px 0;
      font-size: 13pt;
    }

    .content-table th, .content-table td {
      border: 1px solid #9ca3af;
      padding: 8px 10px;
      vertical-align: top;
    }

    .content-table th {
      background: #f3f4f6;
      color: #000000;
      font-weight: 700;
      text-align: center;
    }

    .content-table .baseline-text {
      color: #6b7280;
    }

    .content-table .revised-text {
      color: #000000;
      font-weight: 500;
    }

    .signatures-block {
      margin-top: 36px;
      page-break-inside: avoid;
    }

    .sign-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 36px 24px;
      margin-top: 24px;
      text-align: center;
      font-size: 13.5pt;
    }

    .sign-item {
      padding: 8px;
    }

    .sign-line {
      margin-top: 36px;
      border-top: 1px dotted #374151;
      padding-top: 6px;
      line-height: 1.5;
    }

    .print-bar {
      position: sticky;
      top: 0;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      z-index: 100;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
    }

    .btn-print {
      background: #059669;
      color: white;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13.5px;
      cursor: pointer;
    }

    .btn-print:hover {
      background: #047857;
    }

    @media print {
      body {
        background: transparent;
        padding: 0;
      }
      .print-bar {
        display: none !important;
      }
      .document-page {
        box-shadow: none;
        padding: 0;
        margin: 0;
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div>
      <strong>GreenSpec Technical Document Review:</strong> ${docNo} — ${projectName}
    </div>
    <div>
      <button class="btn-print" onclick="window.print()">
        พิมพ์หรือบันทึกเป็น PDF (Print / Save as PDF)
      </button>
    </div>
  </div>

  <div class="document-page">
    <div class="doc-top-ref">เอกสารแนบท้ายประกาศ</div>

    <div class="doc-header">
      <h1 class="doc-title">ร่างขอบเขตของงานและรายการคุณลักษณะเฉพาะทางเทคนิค (TOR)</h1>
      <h2 class="doc-subtitle">งานจ้างก่อสร้าง: ${projectName}</h2>
      <p class="doc-category">หมวดที่ 03 30 00: งานคอนกรีตโครงสร้างหล่อในที่และวัสดุก่อสร้างคาร์บอนต่ำ</p>
    </div>

    <table class="meta-table">
      <tr>
        <td class="label">เลขที่เอกสาร:</td>
        <td><strong>${docNo}</strong></td>
        <td class="label">วันที่จัดทำ:</td>
        <td>${thaiDate}</td>
      </tr>
      <tr>
        <td class="label">โครงการ:</td>
        <td>${projectName}</td>
        <td class="label">สถานะ:</td>
        <td>ฉบับปรับปรุงข้อกำหนดเพื่อการจัดซื้อจัดจ้าง (Approved Revision)</td>
      </tr>
    </table>

    <div class="section-h1">หมวดที่ 1: ข้อกำหนดทั่วไป (Part 1 - General Requirements)</div>
    <p class="clause-p">
      1.1 ขอบเขตของงาน: ข้อกำหนดนี้ครอบคลุมการจัดหา การออกแบบส่วนผสม การผสม การลำเลียง การเท การตกแต่งผิว 
      ตลอดจนการบ่มคอนกรีตโครงสร้างคาร์บอนต่ำ (Low-Carbon Concrete) และการใช้วัสดุก่อสร้างที่ผ่านการรับรองมาตรฐานด้านสิ่งแวดล้อม 
      สำหรับงานฐานราก เสา คาน และพื้นโครงสร้างของโครงการ
    </p>

    <div style="font-size: 15.5pt; font-weight: 600; margin: 12px 0 6px 0;">1.2 มาตรฐานอ้างอิงทางวิศวกรรม:</div>
    <ul class="standards-list" style="list-style-type: none;">
      <li>• มยผ. 1101-64 / วสท. 1014-43: มาตรฐานงานคอนกรีตและคอนกรีตเสริมเหล็ก กรมโยธาธิการและผังเมือง</li>
      <li>• มอก. 2594-2556 / มอก. 213-2560: ปูนซีเมนต์ไฮดรอลิก</li>
      <li>• มอก. 2135-2545: เถ้าลอยสำหรับใช้เป็นวัสดุผสมคอนกรีต ชั้นคุณภาพ 1 หรือชั้นคุณภาพ 2</li>
      <li>• มอก. 24-2559: เหล็กเส้นเสริมคอนกรีต: เหล็กข้ออ้อย ชั้นคุณภาพ SD40 หรือ SD50</li>
      <li>• มอก. 1505-2541: คอนกรีตมวลเบาอบไอน้ำสำหรับงานผนังก่อ ชั้นคุณภาพ G4</li>
      <li>• ACI 207.1R-05 & ACI 207.2R: Guide to Mass Concrete (การควบคุมอุณหภูมิคอนกรีตมวลหนา)</li>
      <li>• แนวทางการประเมินคาร์บอนฟุตพริ้นท์ของผลิตภัณฑ์ (CFP) องค์การบริหารจัดการก๊าซเรือนกระจก (อบก.)</li>
    </ul>

    <p class="clause-p">
      1.3 การเสนอเอกสารเพื่อขออนุมัติ: ผู้รับจ้างต้องเสนอรายการคำนวณและสัดส่วนการผสมคอนกรีต (Mix Design) 
      พร้อมผลทดสอบกำลังอัดจากห้องปฏิบัติการที่ได้รับการรับรองมาตรฐาน ISO/IEC 17025 ล่วงหน้าก่อนเริ่มงานเทคอนกรีตไม่น้อยกว่า 30 วัน 
      และต้องแนบใบรับรองคุณภาพวัสดุ (Mill Test Certificate) สำหรับปูนซีเมนต์ไฮดรอลิก เถ้าลอย และเหล็กเสริมทุกชุด
    </p>

    <div class="section-h1">หมวดที่ 2: คุณลักษณะของวัสดุและผลิตภัณฑ์ (Part 2 - Materials & Products)</div>
    <p class="clause-p">
      2.1 ปูนซีเมนต์และวัสดุประสานเสริม: ให้ใช้ปูนซีเมนต์ไฮดรอลิกตามมาตรฐาน มอก. 2594 หรือ มอก. 213 
      ผสมร่วมกับเถ้าลอยตามมาตรฐาน มอก. 2135 ชั้นคุณภาพ 1 หรือ 2 สัดส่วนการแทนที่ร้อยละ 25 ถึง 35 โดยน้ำหนักของวัสดุประสานรวม 
      เถ้าลอยต้องมีค่าปริมาณส่วนสูญเสียเนื่องจากการเผา (LOI) ไม่เกินร้อยละ 3.0
    </p>
    <p class="clause-p">
      2.2 คุณสมบัติของคอนกรีตโครงสร้างฐานราก: กำลังอัดประลัยระบุ f'c ไม่น้อยกว่า 35 เมกะปาสกาล (ทรงกระบอก 150x300 มม. ที่อายุ 56 วัน) 
      อัตราส่วนน้ำต่อวัสดุประสาน (W/B Ratio) ไม่เกิน 0.40 โดยน้ำหนัก และค่ายุบตัว 10.0 ± 2.5 เซนติเมตร
    </p>
    <p class="clause-p">
      2.3 เหล็กเสริมโครงสร้าง: เหล็กข้ออ้อยชั้นคุณภาพ SD40 หรือ SD50 ตามมาตรฐาน มอก. 24-2559 
      ผลิตด้วยกระบวนการเตาหลอมอาร์กไฟฟ้า (EAF) ที่มีสัดส่วนเศษเหล็กรีไซเคิลไม่น้อยกว่าร้อยละ 90 
      และมีเอกสารสำแดงผลิตภัณฑ์สิ่งแวดล้อม (Environmental Product Declaration - EPD) ตาม ISO 14025
    </p>
    <p class="clause-p">
      2.4 ผนังก่อภายใน: ให้ใช้บล็อกคอนกรีตมวลเบาอบไอน้ำ (AAC Block) หนา 10 เซนติเมตร ตามมาตรฐาน มอก. 1505-2541 ชั้นคุณภาพ G4
    </p>

    <div style="font-size: 15.5pt; font-weight: 600; margin: 16px 0 8px 0;">ตารางเปรียบเทียบข้อกำหนดเดิมและข้อกำหนดฉบับแก้ไขเพิ่มเติม:</div>
    <table class="content-table">
      <thead>
        <tr>
          <th style="width: 22%;">หมวดงาน</th>
          <th style="width: 38%;">ข้อกำหนดเดิม (ก่อนแก้ไข)</th>
          <th style="width: 40%;">ข้อกำหนดฉบับแก้ไขเพิ่มเติม (Approved Revision)</th>
        </tr>
      </thead>
      <tbody>
        ${greenItems.map(item => `
          <tr>
            <td style="text-align: center;"><strong>${escapeXml(item.section)}</strong><br/><small style="color: #4b5563;">${escapeXml(item.title)}</small></td>
            <td class="baseline-text">${escapeXml(item.originalSnippet || 'ใช้ปูนซีเมนต์ปอร์ตแลนด์ประเภท 1 (มอก. 15) ทั้งหมด 100% ไม่กำหนดการใช้วัสดุประสานทดแทน')}</td>
            <td class="revised-text">
              ${escapeXml(item.revisedText)}
              <div style="font-size: 11pt; color: #374151; margin-top: 4px;">
                (มาตรฐานอ้างอิง: ${escapeXml(item.standard)})
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="section-h1">หมวดที่ 3: การดำเนินงานก่อสร้างและการควบคุมคุณภาพ (Part 3 - Execution)</div>
    <p class="clause-p">
      3.1 การเทคอนกรีตโครงสร้างมวลหนา (Mass Concrete): สำหรับโครงสร้างที่มีมิติความหนาตั้งแต่ 1.00 เมตรขึ้นไป 
      ผู้รับจ้างต้องควบคุมอุณหภูมิสูงสุดภายในก้อนคอนกรีตไม่เกิน 70 องศาเซลเซียส และผลต่างของอุณหภูมิระหว่างแกนกลางกับผิวภายนอก (ΔT) 
      ต้องไม่เกิน 20 องศาเซลเซียส ตามแนวทางมาตรฐาน ACI 207.1R เพื่อป้องกันการแตกร้าวและการเสื่อมสภาพแบบ Delayed Ettringite Formation (DEF) 
      โดยต้องติดตั้งหัววัดอุณหภูมิ (Thermocouple) และบันทึกข้อมูลต่อเนื่องตลอด 7 วันแรก
    </p>
    <p class="clause-p">
      3.2 การบ่มคอนกรีต: ต้องดำเนินการบ่มชื้นอย่างต่อเนื่องทันทีหลังผิวหน้าคอนกรีตก่อตัว โดยใช้วิธีฉีดพ่นน้ำ คลุมด้วยกระสอบเปียกชื้น 
      หรือวัสดุกักเก็บความชื้นที่มีประสิทธิภาพ เป็นเวลาไม่น้อยกว่า 14 วัน สำหรับคอนกรีตผสมเถ้าลอย
    </p>

    <div class="section-h1">หมวดที่ 4: การตรวจรับพัสดุและการส่งมอบงาน (Part 4 - Quality Handover)</div>
    <ol style="padding-left: 1.25cm; margin: 6px 0 14px 0; font-size: 15pt; line-height: 1.7;">
      <li>รายงานผลการทดสอบกำลังอัดลูกปูนคอนกรีตรูปทรงกระบอกที่อายุ 7, 28 และ 56 วัน จากสถาบันที่ได้มาตรฐาน ISO/IEC 17025</li>
      <li>ใบรับรองคุณภาพวัสดุ (Mill Certificate) และใบส่งของระบุสัดส่วนการผสมเถ้าลอย มอก. 2135 ครบทุกเที่ยวการเท</li>
      <li>บันทึกผลการตรวจวัดอุณหภูมิคอนกรีตฐานรากด้วย Thermocouple ตลอดระยะเวลาการบ่มควบคุม</li>
      <li>รายงานการประเมินการลดก๊าซเรือนกระจก (Embodied Carbon Verification Report) เทียบเคียงเกณฑ์ อบก.</li>
    </ol>

    <div class="signatures-block">
      <div class="section-h1">หมวดที่ 5: การพิจารณาและลงนามของคณะกรรมการกำหนดร่างขอบเขตของงาน</div>
      <p class="clause-p">
        คณะกรรมการกำหนดร่างขอบเขตของงานและราคากลาง ได้ตรวจสอบและพิจารณาข้อกำหนดเฉพาะทางเทคนิคฉบับแก้ไขเพิ่มเติมนี้แล้ว 
        เห็นว่ามีความถูกต้อง ครบถ้วนตามมาตรฐานวิศวกรรมโยธาและระเบียบการจัดซื้อจัดจ้างภาครัฐ จึงได้ลงลายมือชื่อไว้เป็นหลักฐาน
      </p>
      
      <div class="sign-grid">
        <div class="sign-item">
          <div class="sign-line">(ลงชื่อ) ................................................................<br/>( ................................................................ )<br/>ประธานกรรมการกำหนดร่าง TOR</div>
        </div>
        <div class="sign-item">
          <div class="sign-line">(ลงชื่อ) ................................................................<br/>( ................................................................ )<br/>กรรมการ (วิศวกรโยธา)</div>
        </div>
        <div class="sign-item">
          <div class="sign-line">(ลงชื่อ) ................................................................<br/>( ................................................................ )<br/>กรรมการ (ผู้เชี่ยวชาญด้านวิศวกรรมสิ่งแวดล้อม)</div>
        </div>
        <div class="sign-item">
          <div class="sign-line">(ลงชื่อ) ................................................................<br/>( ................................................................ )<br/>กรรมการและเลขานุการ</div>
        </div>
      </div>
    </div>
  </div>

  <!-- PAGE 4: เอกสารแนบท้าย ๑ รายการคำนวณสัดส่วนผสมคอนกรีตและการควบคุมความร้อน -->
  <div class="document-page" style="page-break-before: always; margin-top: 24px;">
    <div class="doc-top-ref">เอกสารแนบท้าย ๑ · หน้า 4 จาก 5</div>
    <div class="doc-header" style="border-bottom: 2px solid #059669;">
      <h1 class="doc-title" style="font-size: 17pt; color: #064e3b;">เอกสารแนบท้าย ๑: รายการคำนวณสัดส่วนผสมคอนกรีตคาร์บอนต่ำและการควบคุมความร้อน</h1>
      <div class="doc-subtitle" style="font-size: 13.5pt;">การออกแบบสัดส่วนผสมคอนกรีต (ปูนไฮดรอลิก มอก. 2594 + เถ้าลอย มอก. 2135 ร้อยละ 35) ตาม มยผ. 1101-64 / ACI 211.1</div>
    </div>

    <div class="section-h1" style="font-size: 15pt; margin-top: 14px;">๑. รายการสัดส่วนผสมคอนกรีตคาร์บอนต่ำต่อ ๑ ลูกบาศก์เมตร (Low-Carbon Mix Design - 1 m³):</div>
    <table class="content-table" style="font-size: 12pt; margin-bottom: 14px;">
      <thead>
        <tr>
          <th style="width: 38%;">รายการวัสดุ</th>
          <th style="width: 22%;">มาตรฐานอ้างอิง</th>
          <th style="width: 20%;">ปริมาณต่อ ลบ.ม.</th>
          <th style="width: 20%;">สัดส่วน / ค่า</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>ปูนซีเมนต์ไฮดรอลิก (Hydraulic Cement)</td>
          <td style="text-align: center;">มอก. 2594-2556</td>
          <td style="text-align: right;">227.5 กก.</td>
          <td style="text-align: center;">65.0%</td>
        </tr>
        <tr>
          <td>เถ้าลอยลิกไนต์คัดขนาด (Fly Ash Class 1/2)</td>
          <td style="text-align: center;">มอก. 2135-2545</td>
          <td style="text-align: right;">122.5 กก.</td>
          <td style="text-align: center;">35.0%</td>
        </tr>
        <tr>
          <td>น้ำผสมคอนกรีต (W/B = 0.38)</td>
          <td style="text-align: center;">มยผ. 1101-64</td>
          <td style="text-align: right;">133.0 ลิตร</td>
          <td style="text-align: center;">W/B 0.38</td>
        </tr>
        <tr>
          <td>น้ำยาเคมีลดน้ำพิเศษ Type F</td>
          <td style="text-align: center;">มอก. 733 / ASTM C494</td>
          <td style="text-align: right;">2.8 ลิตร</td>
          <td style="text-align: center;">Slump 12±2 cm</td>
        </tr>
        <tr>
          <td>มวลรวมละเอียด (ทรายหยาบสะอาด FM 2.8)</td>
          <td style="text-align: center;">ASTM C33</td>
          <td style="text-align: right;">805.0 กก.</td>
          <td style="text-align: center;">ปริมาตร 304 L</td>
        </tr>
        <tr>
          <td>มวลรวมหยาบ (หิน 3/4 นิ้ว)</td>
          <td style="text-align: center;">ASTM C33</td>
          <td style="text-align: right;">1,055.0 กก.</td>
          <td style="text-align: center;">ปริมาตร 398 L</td>
        </tr>
        <tr style="background: #f8fafc; font-weight: 700;">
          <td colspan="2">รวมน้ำหนักวัสดุประสานรวม (Total Binder) & ปริมาตรสัมบูรณ์</td>
          <td style="text-align: right;">350.0 กก./ลบ.ม.</td>
          <td style="text-align: center; color: #047857;">1,000 ลิตร (1.00 m³)</td>
        </tr>
      </tbody>
    </table>

    <div class="section-h1" style="font-size: 15pt; margin-top: 14px;">๒. การประเมินคาร์บอนฟุตพริ้นท์ตามเกณฑ์ อบก. (Embodied Carbon Verification):</div>
    <table class="content-table" style="font-size: 12pt; margin-bottom: 14px;">
      <thead>
        <tr>
          <th style="width: 40%;">รายการวัสดุ</th>
          <th style="width: 22%;">ค่าสัมประสิทธิ์ (EF)</th>
          <th style="width: 18%;">ปริมาณต่อ ลบ.ม.</th>
          <th style="width: 20%;">Embodied Carbon</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>ปูนซีเมนต์ไฮดรอลิก (มอก. 2594)</td>
          <td style="text-align: center;">0.690 kgCO₂e/kg</td>
          <td style="text-align: right;">227.5 kg</td>
          <td style="text-align: right;">157.0 kgCO₂e</td>
        </tr>
        <tr>
          <td>เถ้าลอย (By-product Allocation)</td>
          <td style="text-align: center;">0.015 kgCO₂e/kg</td>
          <td style="text-align: right;">122.5 kg</td>
          <td style="text-align: right;">1.8 kgCO₂e</td>
        </tr>
        <tr>
          <td>มวลรวม ขนส่ง และกระบวนการผสม</td>
          <td style="text-align: center;">อบก. Ready-mix</td>
          <td style="text-align: right;">1.0 m³</td>
          <td style="text-align: right;">40.0 kgCO₂e</td>
        </tr>
        <tr style="background: #ecfdf5; font-weight: 700;">
          <td colspan="3">รวมการปล่อยก๊าซเรือนกระจกต่อ ๑ ลบ.ม. (Approved Intensity)</td>
          <td style="text-align: right; color: #047857;">234.8 kgCO₂e/m³</td>
        </tr>
        <tr style="background: #f8fafc; font-weight: 700;">
          <td colspan="3">เปรียบเทียบสูตรเดิม Baseline (348.0 kgCO₂e/m³)</td>
          <td style="text-align: right; color: #059669;">ลดลง 32.5% (-113.2 kg)</td>
        </tr>
      </tbody>
    </table>

    <div class="section-h1" style="font-size: 15pt; margin-top: 14px;">๓. การพัฒนากำลังอัดและเกณฑ์ความปลอดภัยการถอดแบบหล่อ (Strength Development & Formwork Stripping Safety):</div>
    <table class="content-table" style="font-size: 12pt; margin-bottom: 14px;">
      <thead>
        <tr>
          <th style="width: 15%;">อายุทดสอบ</th>
          <th style="width: 25%;">สูตรเดิม OPC 100% (MPa)</th>
          <th style="width: 25%;">Green Mix เถ้าลอย 35% (MPa)</th>
          <th style="width: 35%;">เกณฑ์การปฏิบัติงาน / ตรวจรับ</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align: center;">3 วัน</td>
          <td style="text-align: center;">17.5 MPa (50%)</td>
          <td style="text-align: center;">13.3 MPa (38%)</td>
          <td>ถอดแบบหล่อแนวดิ่ง เสา/ผนัง (≥10 MPa ผ่าน)</td>
        </tr>
        <tr>
          <td style="text-align: center;">7 วัน</td>
          <td style="text-align: center;">24.5 MPa (70%)</td>
          <td style="text-align: center;">20.3 MPa (58%)</td>
          <td>ระยะบ่มน้ำชุ่มชื้นต่อเนื่องขั้นต่ำ</td>
        </tr>
        <tr style="background: #ecfdf5; font-weight: 600;">
          <td style="text-align: center;">14 วัน</td>
          <td style="text-align: center;">29.8 MPa (85%)</td>
          <td style="text-align: center; color: #047857;">25.9 MPa (74%)</td>
          <td style="color: #047857;">★ ถอดค้ำยัน/แบบหล่อท้องคานและพื้น (≥70% ผ่าน)</td>
        </tr>
        <tr>
          <td style="text-align: center;">28 วัน</td>
          <td style="text-align: center;">35.0 MPa (100%)</td>
          <td style="text-align: center;">30.8 MPa (88%)</td>
          <td>เกณฑ์ตรวจรับคอนกรีตทั่วไป</td>
        </tr>
        <tr style="background: #f0fdf4; font-weight: 700;">
          <td style="text-align: center;">56 วัน</td>
          <td style="text-align: center;">36.8 MPa (105%)</td>
          <td style="text-align: center; color: #047857;">36.4 MPa (104%)</td>
          <td style="color: #047857;">★ เกณฑ์ตรวจรับงานตามสัญญา TOR (≥35 MPa ผ่าน)</td>
        </tr>
      </tbody>
    </table>

    <div class="section-h1" style="font-size: 15pt; margin-top: 14px;">๔. การจำลองการแพร่กระจายความร้อนคอนกรีตมวลหนา รายชั่วโมง (ACI 207 Hourly Mass Concrete Thermal Simulation):</div>
    <table class="content-table" style="font-size: 11.5pt; margin-bottom: 14px;">
      <thead>
        <tr>
          <th style="width: 20%;">เวลา (ชม. / วัน)</th>
          <th style="width: 40%;">สูตรเดิม (Unmitigated Baseline)<br/>T_core / T_surf / ΔT</th>
          <th style="width: 40%;">Green Mix (Mitigated Control)<br/>T_core / T_surf / ΔT</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align: center;">0 ชม. (เริ่มเท)</td>
          <td style="text-align: center;">32.0°C / 28.0°C / ΔT 4.0°C</td>
          <td style="text-align: center; color: #047857;">30.0°C / 28.0°C / ΔT 2.0°C (ปลอดภัย)</td>
        </tr>
        <tr>
          <td style="text-align: center;">24 ชม. (1 วัน)</td>
          <td style="text-align: center; color: #dc2626;">62.2°C / 38.9°C / ΔT 23.3°C (เสี่ยง)</td>
          <td style="text-align: center; color: #047857;">44.9°C / 37.8°C / ΔT 7.1°C (ปลอดภัย)</td>
        </tr>
        <tr style="background: #fef2f2;">
          <td style="text-align: center; font-weight: 700;">48 ชม. (พีคสูงสุด)</td>
          <td style="text-align: center; font-weight: 700; color: #b91c1c;">
            74.0°C / 45.5°C / ΔT 28.5°C<br/>
            <small style="color: #991b1b;">[ตกเกณฑ์ DEF และเสี่ยงแตกร้าวรุนแรง]</small>
          </td>
          <td style="text-align: center; font-weight: 700; background: #ecfdf5; color: #047857;">
            57.5°C / 44.0°C / ΔT 13.5°C<br/>
            <small style="color: #065f46;">[ผ่านเกณฑ์ ACI 207 ปลอดภัย 100%]</small>
          </td>
        </tr>
        <tr>
          <td style="text-align: center;">72 ชม. (3 วัน)</td>
          <td style="text-align: center; color: #dc2626;">70.6°C / 43.8°C / ΔT 26.8°C</td>
          <td style="text-align: center; font-weight: 600; color: #047857;">61.2°C / 46.4°C / ΔT 14.8°C (พีคปลอดภัย)</td>
        </tr>
        <tr>
          <td style="text-align: center;">168 ชม. (7 วัน)</td>
          <td style="text-align: center;">54.7°C / 36.5°C / ΔT 18.2°C</td>
          <td style="text-align: center; color: #047857;">48.0°C / 39.6°C / ΔT 8.4°C (ปลอดภัย)</td>
        </tr>
      </tbody>
    </table>

    <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-size: 13pt; line-height: 1.6;">
      <strong>สรุปผลการประเมินทางวิศวกรรมและการลดก๊าซเรือนกระจก:</strong><br/>
      • อัตราการลดคาร์บอนต่อ ลบ.ม.: <strong>ลดลง 32.5%</strong> (-113.2 kgCO₂e/m³)<br/>
      • ปริมาณการลดก๊าซเรือนกระจกสะสมทั้งโครงการ (4,115 ลบ.ม.): <strong>ลดลง 465.8 ตันคาร์บอน (tCO₂e)</strong><br/>
      • กำลังอัดที่ 56 วัน: <strong>f'c = 36.4 MPa</strong> (ผ่านเกณฑ์สัญญา TOR ≥ 35 MPa)<br/>
      • ถอดแบบหล่อท้องคาน/พื้น: <strong>วันที่ 14</strong> (กำลังอัด 25.9 MPa ≥ 70% ปลอดภัย)<br/>
      • เกณฑ์ความร้อนคอนกรีตมวลหนา ACI 207: <strong>T_max = 61.2°C (&lt; 70°C ปลอดภัย DEF)</strong> และ <strong>ΔT_max = 14.8°C (≤ 20°C ไม่แตกร้าว)</strong>
    </div>

    <div style="border-top: 1.5px solid #000000; margin-top: 24px; padding-top: 14px; page-break-inside: avoid;">
      <div style="text-align: center; font-weight: 700; font-size: 14pt; margin-bottom: 8px;">
        การรับรองรายการคำนวณและการทดสอบทางวิศวกรรม (Engineering Certification)
      </div>
      <div class="sign-grid" style="margin-top: 14px;">
        <div class="sign-item">
          (ลงชื่อ) ................................................................<br/>
          ( วิศวกรผู้ออกแบบส่วนผสมคอนกรีต )<br/>
          วศ.บ. (วิศวกรรมโยธา) เลขทะเบียน สย. 48291
        </div>
        <div class="sign-item">
          (ลงชื่อ) ................................................................<br/>
          ( วิศวกรผู้เชี่ยวชาญการประเมินคาร์บอน )<br/>
          วท.ม. (การจัดการสิ่งแวดล้อม) เลขทะเบียน อบก. EP-2567-08
        </div>
      </div>
    </div>
  </div>

  <!-- PAGE 5: เอกสารแนบท้าย ๒ ตารางแสดงวงเงินงบประมาณและราคากลาง (แบบ บก.๐๖) -->
  <div class="document-page" style="page-break-before: always; margin-top: 24px;">
    <div class="doc-top-ref">เอกสารแนบท้าย ๒ · หน้า 5 จาก 5</div>
    <div class="doc-header" style="border-bottom: 2px solid #059669;">
      <h1 class="doc-title" style="font-size: 17pt; color: #064e3b;">เอกสารแนบท้าย ๒: ตารางแสดงวงเงินงบประมาณที่ได้รับจัดสรรและราคากลาง (แบบ บก.๐๖)</h1>
      <div class="doc-subtitle" style="font-size: 13.5pt;">การวิเคราะห์ความคุ้มค่าทางการเงินและการประหยัดงบประมาณ (Cost & Budget Impact Analysis)</div>
    </div>

    <table class="meta-table" style="margin-top: 14px; font-size: 12.5pt;">
      <tr>
        <td class="meta-label" style="width: 28%;">วงเงินงบประมาณที่ได้รับจัดสรร:</td>
        <td style="width: 32%; font-weight: 700;">26,000,000.00 บาท</td>
        <td class="meta-label" style="width: 20%;">ราคากลางคำนวณ ณ วันที่:</td>
        <td style="width: 20%;">${thaiDate}</td>
      </tr>
      <tr>
        <td class="meta-label">แหล่งที่มาของราคากลาง:</td>
        <td colspan="3">ราคาสำรวจตลาดเฉลี่ยจากผู้ผลิตชั้นนำ (SCG / CPAC / TPI / Tata Tiscon / Q-CON) สืบราคา ณ เดือนตุลาคม 2569</td>
      </tr>
    </table>

    <div class="section-h1" style="font-size: 15pt; margin-top: 14px;">ตารางเปรียบเทียบปริมาณวัสดุและราคากลาง (BOQ Pricing Comparison):</div>
    <table class="content-table" style="font-size: 11.5pt; margin-bottom: 14px;">
      <thead>
        <tr>
          <th style="width: 30%;">รายการ / หมวดงาน</th>
          <th style="width: 12%;">ปริมาณ</th>
          <th style="width: 14%;">เดิม (บาท)</th>
          <th style="width: 15%;">รวมเดิม (บาท)</th>
          <th style="width: 14%;">Green Spec</th>
          <th style="width: 15%;">รวมใหม่ (บาท)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1. คอนกรีตฐานราก (เถ้าลอย 35%)</td>
          <td style="text-align: center;">4,115 m³</td>
          <td style="text-align: right;">2,285.00</td>
          <td style="text-align: right;">9,402,775</td>
          <td style="text-align: right; color: #047857;">2,208.00</td>
          <td style="text-align: right; font-weight: 600; color: #047857;">9,085,920</td>
        </tr>
        <tr>
          <td>2. เหล็กเส้นข้ออ้อย EAF (EPD)</td>
          <td style="text-align: center;">480 ตัน</td>
          <td style="text-align: right;">25,500.00</td>
          <td style="text-align: right;">12,240,000</td>
          <td style="text-align: right; color: #047857;">25,200.00</td>
          <td style="text-align: right; font-weight: 600; color: #047857;">12,096,000</td>
        </tr>
        <tr>
          <td>3. ผนังมวลเบาอบไอน้ำ AAC G4</td>
          <td style="text-align: center;">8,500 m²</td>
          <td style="text-align: right;">480.00</td>
          <td style="text-align: right;">4,080,000</td>
          <td style="text-align: right; color: #047857;">440.00</td>
          <td style="text-align: right; font-weight: 600; color: #047857;">3,740,000</td>
        </tr>
        <tr style="background: #f8fafc; font-weight: 700;">
          <td colspan="3">รวมงบประมาณค่าวัสดุทั้งสิ้น</td>
          <td style="text-align: right;">25,722,775</td>
          <td style="text-align: center; color: #047857;">ประหยัด 3.11%</td>
          <td style="text-align: right; color: #047857;">24,921,920</td>
        </tr>
      </tbody>
    </table>

    <div style="background: #ecfdf5; border: 1.5px solid #10b981; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-size: 13pt; line-height: 1.6;">
      <strong>สรุปความคุ้มค่าทางการเงินและการจัดซื้อจัดจ้างสีเขียว (Win-Win Green Procurement):</strong><br/>
      • ยอดงบประมาณประหยัดสุทธิทั้งโครงการ: <strong>800,855.00 บาท</strong> (ประหยัด 3.11% ต่ำกว่าราคากลางเดิม)<br/>
      • การลดก๊าซเรือนกระจกสะสมรวม: <strong>718.3 ตันคาร์บอน (tCO₂e)</strong> (คอนกรีต 465.8 t + เหล็ก 210.0 t + ผนัง 42.5 t)<br/>
      • ผลประโยชน์ทางเศรษฐศาสตร์: <strong>ไม่มีต้นทุนส่วนเพิ่ม (Zero Green Premium)</strong> การใช้วัสดุคาร์บอนต่ำที่ได้รับ มอก. ช่วยลดต้นทุนเม็ดปูนและค่าแรงก่อฉาบได้จริง พร้อมได้รับสิทธิประโยชน์ทางภาษีและเกณฑ์อาคารเขียว
    </div>

    <div style="border-top: 1.5px solid #000000; margin-top: 24px; padding-top: 14px; page-break-inside: avoid;">
      <div style="text-align: center; font-weight: 700; font-size: 14pt; margin-bottom: 8px;">
        การตรวจสอบและรับรองราคากลาง (Procurement Cost Verification)
      </div>
      <div class="sign-grid" style="margin-top: 14px;">
        <div class="sign-item">
          (ลงชื่อ) ................................................................<br/>
          ( วิศวกรผู้ประมาณราคาและวิเคราะห์ต้นทุน )<br/>
          วศ.บ. (วิศวกรรมโยธา) เลขทะเบียน สย. 51042
        </div>
        <div class="sign-item">
          (ลงชื่อ) ................................................................<br/>
          ( หัวหน้าหน่วยงานผู้มีอำนาจอนุมัติงบประมาณ )<br/>
          ประธานกรรมการจัดซื้อจัดจ้าง / ผู้อำนวยการโครงการ
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Opens a dedicated popup print window containing the official formatted document
 */
export function openFormalPrintWindow({ project, document: doc, round, greenItems = [] }) {
  const html = getFormalHtmlContent({ project, document: doc, round, greenItems });
  const printWindow = window.open('', '_blank', 'width=1000,height=950,scrollbars=yes');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
    };
  } else {
    alert('กรุณาอนุญาตป๊อปอัป (Popup) เพื่อเปิดหน้าเอกสารทางการสำหรับพิมพ์หรือบันทึกเป็น PDF');
  }
}
