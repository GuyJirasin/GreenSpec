import {test,expect} from '@playwright/test';
import {fixture,id} from './fixture.mjs';
const route=stage=>`/#workspace?project=${id}&tab=review&stage=${stage}`;
test('five redesigned screens are readable on desktop and mobile without page overflow',async({page})=>{
 const f=await fixture(page,{run:true});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:950});
  for(const [stage,heading] of [['documents','Project documents'],['hotspots','Material hotspots'],['recommendations','Recommendations'],['selected','Selected recommendations'],['summary','Final analysis summary']]){
   if(stage==='selected'&&f.tables.reviews[0].decision!=='APPROVED'){await page.locator('.recommendation').first().getByRole('button',{name:'Approve',exact:true}).click();await expect.poll(()=>f.tables.reviews[0].decision).toBe('APPROVED');}
   await page.goto(stage==='documents'?`/#workspace?project=${id}&tab=documents`:route(stage));
   await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:`screenshots/redesign-${stage}-${width}.png`,fullPage:true});
  }
 }
 expect(f.errors).toEqual([]);
});
test('hotspot opens the correct material filter and filters do not request backend data',async({page})=>{
 const f=await fixture(page,{run:true});await page.goto(route('hotspots'));await page.waitForLoadState('networkidle');const start=f.requests.length;
 await page.locator('.hotspot').first().getByRole('button').click();await expect(page.locator('.recommendation')).toHaveCount(1);
 await page.getByRole('button',{name:'Clear filters'}).click();await expect(page.locator('.recommendation')).toHaveCount(3);
 await page.getByRole('combobox',{name:'Cost impact',exact:true}).selectOption('increase');await expect(page.locator('.recommendation')).toHaveCount(1);
 expect(f.requests.slice(start)).toEqual([]);expect(f.errors).toEqual([]);
});
test('remove restores an unreviewed item, clears selected count and blocks finalize',async({page})=>{
 const f=await fixture(page,{run:true});await page.goto(route('recommendations'));
 await page.locator('.recommendation').first().getByRole('button',{name:'Approve',exact:true}).click();
 await expect.poll(()=>f.tables.reviews[0].decision).toBe('APPROVED');
 await page.getByRole('button',{name:'Selected Spec (1)',exact:true}).click();
 await page.getByRole('button',{name:'Remove',exact:true}).click();await expect.poll(()=>f.tables.reviews[0].decision).toBe('UNREVIEWED');
 await expect(page.getByRole('heading',{name:'No selected changes yet'})).toBeVisible();
 await page.getByRole('button',{name:'Impact & Summary',exact:true}).click();await expect(page.getByRole('button',{name:'Finalize revision'})).toBeDisabled();expect(f.errors).toEqual([]);
});
test('browse uploads a new file through existing document API; unsupported types create no records',async({page})=>{
 const f=await fixture(page,{run:true});let version;
 await page.route('http://127.0.0.1:54321/functions/v1/document',async route=>{
  const args=route.request().postDataJSON();
  if(args.operation==='begin')version={id:crypto.randomUUID(),project_id:id,document_id:args.document_id,filename:args.filename,storage_path:`${id}/test.pdf`,upload_state:'UPLOADING',version_no:1,checksum:null};
  if(args.operation==='commit'){Object.assign(version,{upload_state:'READY',checksum:args.checksum});f.tables.document_versions.push(version);f.tables.documents.find(d=>d.id===version.document_id).current_version_id=version.id;}
  await route.fulfill({json:version});
 });
 await page.route('http://127.0.0.1:54321/storage/v1/object/**',route=>route.fulfill({json:{Key:'test.pdf'}}));
 await page.goto(`/#workspace?project=${id}&tab=documents`);
 await page.getByLabel('Browse files',{exact:true}).setInputFiles({name:'my-spec.pdf',mimeType:'application/pdf',buffer:Buffer.from('synthetic upload test')});
 await expect.poll(()=>f.tables.document_versions.length).toBe(2);await expect(page.locator('.document').filter({hasText:'my-spec.pdf'})).toContainText('Ready');
 const count=f.tables.documents.length;
 await page.getByLabel('Browse files',{exact:true}).setInputFiles({name:'unsupported.ifc',mimeType:'text/plain',buffer:Buffer.from('unsupported')});
 await expect(page.getByRole('alert')).toContainText('Supports only PDF, DOCX and XLSX');expect(f.tables.documents.length).toBe(count);expect(f.errors).toEqual([]);
});
