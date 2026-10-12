import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMarkdownBlocks,
  parseInlineMarkdown,
  sanitizeUrl
} from './markdown-parser.mjs';

test('parseMarkdownBlocks extracts headings, code blocks, lists, blockquotes, and tables', () => {
  const md = `# ข้อกำหนดทางวิศวกรรมคอนกรีต

สเปกฐานรากคอนกรีตคาร์บอนต่ำสำหรับโครงการ GreenSpec:

### ส่วนผสมหลัก
- ปูนซีเมนต์ไฮดรอลิก มอก. 2594
- เถ้าลอยคัดขนาด (Fly Ash Class F) มอก. 2135
* น้ำยาผสมคอนกรีตลดน้ำประเภท F (PCE)

1. กำลังอัดเป้าหมาย 35 MPa ที่ 28 วัน
2. อัตราส่วนน้ำต่อวัสดุประสานไม่เกิน 0.45

> ข้อควรระวัง: โครงสร้างหนาเกิน 1.0 เมตร ต้องจำกัดอุณหภูมิแกนกลางไม่เกิน 70°C

| วัสดุ | ปริมาณ (กก./ลบ.ม.) | สัดส่วน (%) |
| :--- | :---: | ---: |
| ปูนซีเมนต์ไฮดรอลิก | 300 | 75% |
| เถ้าลอย | 100 | 25% |

\`\`\`python
def check_carbon(cement_kg, scm_kg):
    return (cement_kg * 0.82) + (scm_kg * 0.02)
\`\`\`

---
`;

  const blocks = parseMarkdownBlocks(md);

  assert.equal(blocks[0].type, 'heading');
  assert.equal(blocks[0].level, 1);
  assert.equal(blocks[0].text, 'ข้อกำหนดทางวิศวกรรมคอนกรีต');

  assert.equal(blocks[1].type, 'paragraph');
  assert.match(blocks[1].text, /สเปกฐานรากคอนกรีตคาร์บอนต่ำ/);

  assert.equal(blocks[2].type, 'heading');
  assert.equal(blocks[2].level, 3);
  assert.equal(blocks[2].text, 'ส่วนผสมหลัก');

  assert.equal(blocks[3].type, 'list');
  assert.equal(blocks[3].ordered, false);
  assert.equal(blocks[3].items.length, 3);
  assert.match(blocks[3].items[0], /ปูนซีเมนต์ไฮดรอลิก/);

  assert.equal(blocks[4].type, 'list');
  assert.equal(blocks[4].ordered, true);
  assert.equal(blocks[4].items.length, 2);
  assert.match(blocks[4].items[0], /35 MPa/);

  assert.equal(blocks[5].type, 'blockquote');
  assert.match(blocks[5].text, /ข้อควรระวัง/);

  assert.equal(blocks[6].type, 'table');
  assert.deepEqual(blocks[6].headers, ['วัสดุ', 'ปริมาณ (กก./ลบ.ม.)', 'สัดส่วน (%)']);
  assert.deepEqual(blocks[6].aligns, ['left', 'center', 'right']);
  assert.equal(blocks[6].rows.length, 2);
  assert.deepEqual(blocks[6].rows[0], ['ปูนซีเมนต์ไฮดรอลิก', '300', '75%']);

  assert.equal(blocks[7].type, 'code_block');
  assert.equal(blocks[7].lang, 'python');
  assert.match(blocks[7].code, /def check_carbon/);
  assert.equal(blocks[7].closed, true);

  assert.equal(blocks[8].type, 'hr');
});

test('parseMarkdownBlocks gracefully handles unclosed code blocks during streaming', () => {
  const streamingMd = `กำลังพิมพ์โค้ด...
\`\`\`sql
SELECT mix_id, fc_target_mpa FROM concrete_mixes WHERE carbon_reduction >= 20;`;

  const blocks = parseMarkdownBlocks(streamingMd);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, 'paragraph');
  assert.equal(blocks[1].type, 'code_block');
  assert.equal(blocks[1].lang, 'sql');
  assert.equal(blocks[1].closed, false);
  assert.match(blocks[1].code, /SELECT mix_id/);
});

test('parseInlineMarkdown correctly tokenizes inline code, bold, italic, links, and linebreaks', () => {
  const text = 'คอนกรีตกำลังอัด **35 MPa** ใช้ `W/B = 0.42` ตามมาตรฐาน *ACI 211.1* และ [มยผ. 1101-64](https://dpt.go.th)\nข้อควรระวัง!';
  const tokens = parseInlineMarkdown(text);

  const boldToken = tokens.find(t => t.type === 'bold');
  assert.ok(boldToken);
  assert.equal(boldToken.value, '35 MPa');

  const codeToken = tokens.find(t => t.type === 'code');
  assert.ok(codeToken);
  assert.equal(codeToken.value, 'W/B = 0.42');

  const italicToken = tokens.find(t => t.type === 'italic');
  assert.ok(italicToken);
  assert.equal(italicToken.value, 'ACI 211.1');

  const linkToken = tokens.find(t => t.type === 'link');
  assert.ok(linkToken);
  assert.equal(linkToken.text, 'มยผ. 1101-64');
  assert.equal(linkToken.href, 'https://dpt.go.th');

  const brToken = tokens.find(t => t.type === 'br');
  assert.ok(brToken);
});

test('sanitizeUrl protects against malicious javascript: URIs', () => {
  assert.equal(sanitizeUrl('https://example.com'), 'https://example.com');
  assert.equal(sanitizeUrl('http://localhost:3000'), 'http://localhost:3000');
  assert.equal(sanitizeUrl('/docs/specs'), '/docs/specs');
  assert.equal(sanitizeUrl('javascript:alert(1)'), '#');
  assert.equal(sanitizeUrl('data:text/html,<script>alert(1)</script>'), '#');
  assert.equal(sanitizeUrl(null), '#');
});
