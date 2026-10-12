import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { generateFormalExcelBlob } from './formal-excel-generator.mjs';

test('generateFormalExcelBlob produces valid multi-sheet OpenXML spreadsheet', async () => {
  const blob = await generateFormalExcelBlob({
    project: { name: 'โครงการก่อสร้างอาคารและโครงสร้างพื้นฐานเฉลิมพระเกียรติ' },
    document: { title: 'TOR_Main_Contract.pdf' },
    round: { id: 'r1' },
    greenItems: []
  });

  assert.ok(blob, 'Blob must be created');
  assert.equal(blob.type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  const arrayBuffer = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Check required OPC XML structures
  assert.ok(zip.file('[Content_Types].xml'), '[Content_Types].xml must exist');
  assert.ok(zip.file('_rels/.rels'), '_rels/.rels must exist');
  assert.ok(zip.file('xl/workbook.xml'), 'xl/workbook.xml must exist');
  assert.ok(zip.file('xl/styles.xml'), 'xl/styles.xml must exist');
  assert.ok(zip.file('xl/worksheets/sheet1.xml'), 'sheet1.xml (แบบ บก.๐๖) must exist');
  assert.ok(zip.file('xl/worksheets/sheet2.xml'), 'sheet2.xml (BOQ Comparative) must exist');
  assert.ok(zip.file('xl/worksheets/sheet3.xml'), 'sheet3.xml (Engineering Calculations) must exist');

  // Verify Sheet 1 contents (แบบ บก.๐๖)
  const sheet1Xml = await zip.file('xl/worksheets/sheet1.xml').async('string');
  assert.match(sheet1Xml, /แบบ บก\.๐๖/);
  assert.match(sheet1Xml, /26000000/);
  assert.match(sheet1Xml, /24921920/);
  assert.match(sheet1Xml, /800,855\.00/);

  // Verify Sheet 2 contents (BOQ Comparison & Formulas)
  const sheet2Xml = await zip.file('xl/worksheets/sheet2.xml').async('string');
  assert.match(sheet2Xml, /คอนกรีตฐานราก 35 MPa/);
  assert.match(sheet2Xml, /เหล็กเส้นข้ออ้อย SD40T EAF/);
  assert.match(sheet2Xml, /ผนังมวลเบาอบไอน้ำ AAC G4/);
  assert.match(sheet2Xml, /D5\*F5/); // formula
  assert.match(sheet2Xml, /G5-I5/); // delta formula
  assert.match(sheet2Xml, /SUM\(G5:G7\)/); // total formula
  assert.match(sheet2Xml, /SUM\(J5:J7\)/); // net savings formula
  assert.match(sheet2Xml, /718\.3/); // carbon reduction

  // Verify Sheet 3 contents (Mix Design & Carbon Math)
  const sheet3Xml = await zip.file('xl/worksheets/sheet3.xml').async('string');
  assert.match(sheet3Xml, /ปูนซีเมนต์ไฮดรอลิก/);
  assert.match(sheet3Xml, /เถ้าลอยลิกไนต์คัดขนาด/);
  assert.match(sheet3Xml, /1,000 ลิตร/);
  assert.match(sheet3Xml, /234\.8/);
});
