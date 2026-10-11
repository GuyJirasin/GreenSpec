import test from 'node:test';
import {TyphoonClient} from '../shared/typhoon.mjs';
// A provider stub exists only inside this isolated contract test process.
TyphoonClient.prototype.generateSpecification=async function(){this.lastGenerationMode='live';return {thPart:'ข้อกำหนดทดสอบ',enPart:'Test specification'};};
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import { Hono } from 'hono';
import { app, handleFetch } from '../server/server.mjs';
import { extractDocument, analyzeSources, registerWorkflow } from '../server/workflow.mjs';
import { validateAnalysis, revisionPlan } from '../shared/domain.mjs';
import { reviseDocx } from '../shared/revision.mjs';

const id='10000000-0000-4000-8000-000000000001';
const source={document_version_id:id,exact_text:'Concrete beam strength 35 MPa; concrete volume 100 m3.',locator:{kind:'paragraph',paragraph_index:2}};
const doc={id,upload_state:'READY',filename:'spec.docx',checksum:'a'.repeat(64),extraction:[{exact_text:source.exact_text,locator:source.locator}]};
const run={id:'20000000-0000-4000-8000-000000000001',input_fingerprint:'test',input_snapshot:{context:{name:'QA'},document_versions:[{id,checksum:doc.checksum}]}};
const items=[{source,quantity_source:source,element_type:'beam_slab',fc_prime_mpa:35,volume_m3:100}];
const dependencies={chat:async()=>JSON.stringify({items}),analyze:async input=>{
 const response=await app.request('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 const output=await response.json();
 // Explicit provider stub for contract tests: no paid provider or live claim.
 output.technical_package.generation_mode='live';return output;
}};

test('uploaded DOCX keeps exact paragraph indexes and XLSX keeps cell locators',async()=>{
 const zip=new JSZip();zip.file('word/document.xml',`<w:document><w:body><w:p/><w:p><w:r><w:t>${source.exact_text}</w:t></w:r></w:p></w:body></w:document>`);
 const extraction=await extractDocument(await zip.generateAsync({type:'nodebuffer'}),'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
 assert.deepEqual(extraction,doc.extraction);
 const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('BOQ');sheet.getCell('C4').value='100 m3';
 const cells=await extractDocument(Buffer.from(await book.xlsx.writeBuffer()),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
 assert.deepEqual(cells,[{exact_text:'100 m3',locator:{kind:'sheet_cell',sheet_name:'BOQ',cell_range:'C4'}}]);
 await assert.rejects(()=>extractDocument(Buffer.from('x'),'text/plain'),e=>e.code==='FILE_FORMAT_UNSUPPORTED');
});

test('grounded live results have distinct A/B, common baseline and source-language wording',async()=>{
 const {result,options}=await analyzeSources(run,[doc],dependencies);
 assert.equal(result.generation_mode,'live');assert.equal(options.length,2);
 assert.notEqual(options[0].default_wording,options[1].default_wording);
 assert.match(options[0].default_wording,/Concrete strength/);
 assert.equal(options[0].payload.impacts.baseline_carbon_tco2e,options[1].payload.impacts.baseline_carbon_tco2e);
 assert.ok(options[1].payload.impacts.selected_carbon_tco2e<options[0].payload.impacts.selected_carbon_tco2e);
 assert.equal(validateAnalysis(result,[doc]),true);
 const forged=structuredClone(result);forged.recommendations[0].sources[0].exact_text='fabricated';
 assert.throws(()=>validateAnalysis(forged,[doc]),e=>e.code==='OUTPUT_INVALID');
});

test('unquoted numbers, unknown sources and mock output fail closed',async()=>{
 for(const edit of [x=>x.fc_prime_mpa=40,x=>x.volume_m3=200,x=>x.source={...source,document_version_id:'wrong'}]){
  const changed=structuredClone(items);edit(changed[0]);
  await assert.rejects(()=>analyzeSources(run,[doc],{...dependencies,chat:async()=>JSON.stringify({items:changed})}),e=>e.code==='OUTPUT_INVALID');
 }
 await assert.rejects(()=>analyzeSources(run,[doc],{...dependencies,analyze:async()=>({technical_package:{generation_mode:'mock'}})}),e=>e.code==='AI_NOT_CONFIGURED');
});

test('live DOCX revision touches approved spec only, preserves quantity source and selected wording',async()=>{
 const {result,options}=await analyzeSources(run,[doc],dependencies);
 const qdoc={...doc,id:'30000000-0000-4000-8000-000000000001',filename:'boq.xlsx'};
 const recommendation=options[1].payload;
 recommendation.sources.push({...source,document_version_id:qdoc.id,locator:{kind:'sheet_cell',sheet_name:'BOQ',cell_range:'A1'}});
 const item={id:'review-1',decision:'APPROVED',snapshot:{...recommendation,generation_mode:'live',final_wording:'Reviewed final concrete clause'}};
 const plan=revisionPlan([item],doc);assert.equal(plan.changes.length,1);
 assert.equal(revisionPlan([item],qdoc).changes.length,0);
 const zip=new JSZip();zip.file('word/document.xml',`<w:document><w:body><w:p></w:p><w:p><w:r><w:t>${source.exact_text}</w:t></w:r></w:p></w:body></w:document>`);
 const output=await reviseDocx(await zip.generateAsync({type:'uint8array'}),plan,JSZip);
 assert.equal(output.generation_mode,'live');
 const text=await (await JSZip.loadAsync(output.bytes)).file('word/document.xml').async('string');
 assert.match(text,/Reviewed final concrete clause/);
});

test('workflow verifies account and project rights and refuses missing Typhoon key',async()=>{
 const api=new Hono();let edited=false;
 registerWorkflow(api,{readerFactory:token=>{
  if(token!=='Bearer test')throw Object.assign(new Error('session required'),{code:'UNAUTHORIZED',status:401});
  return {authenticate:async()=>{},edit:async()=>{edited=true;},row:async()=>({...run,project_id:'project',mode:'live',status:'PROCESSING'})};
 },clientFactory:()=>({apiKey:''})});
 const res=await api.request('/api/workflow/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({run_id:run.id})});assert.equal(res.status,401);
 const keyed=await api.request('/api/workflow/analyze',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer test'},body:JSON.stringify({run_id:run.id})});
 assert.equal(keyed.status,503);assert.equal((await keyed.json()).code,'AI_NOT_CONFIGURED');assert.ok(edited);
});

test('Vercel rewritten health and catalog routes reach Hono handler',async()=>{
 for(const route of ['health','catalog']){
  const res=await handleFetch(new Request(`http://localhost/api?__gs_path=${route}`));assert.equal(res.status,200);await res.json();
 }
});

function onePagePdf(text='') {
 const stream=`BT /F1 12 Tf 40 750 Td (${text}) Tj ET`;
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
 let body='%PDF-1.4\n';const offsets=[0];objects.forEach((obj,i)=>{offsets.push(Buffer.byteLength(body));body+=`${i+1} 0 obj\n${obj}\nendobj\n`;});
 const start=Buffer.byteLength(body);body+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
 return Buffer.from(body);
}
test('PDF worker extracts actual text with page evidence and never invents text from blank PDFs',async()=>{
 const extracted=await extractDocument(onePagePdf('Concrete strength 35 MPa; volume 100 m3.'),'application/pdf');
 assert.equal(extracted.length,1);assert.match(extracted[0].exact_text,/Concrete strength 35 MPa; volume 100 m3/);assert.deepEqual(extracted[0].locator,{kind:'page',page_number:1});
 await assert.rejects(()=>extractDocument(onePagePdf(),'application/pdf'),e=>e.code==='SOURCE_TEXT_UNAVAILABLE');
});
