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
