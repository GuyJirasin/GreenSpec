import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
mkdirSync('screenshots',{recursive:true});
import {fixture,id} from './fixture.mjs';

const route=stage=>`/#workspace?project=${id}&tab=review&stage=${stage}`;
test('Home uses saved projects and only implemented navigation',async({page})=>{
 const f=await fixture(page,{run:true});await page.goto('/#home');
 await expect(page.getByRole('heading',{name:'Build better. Specify greener.'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Recent analysis'})).toBeVisible();
 await expect(page.getByText(f.tables.projects[0].name,{exact:true}).first()).toBeVisible();
 for(const name of ['Suppliers','Knowledge Hub','Materials','Carbon Calculator'])await expect(page.locator('.sidebar').getByRole('link',{name,exact:true})).toHaveCount(0);
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'screenshots/f1-home-desktop.png',fullPage:true});expect(f.errors).toEqual([]);
});
test('Option B and edited source-language wording survive reload, require renewed review and freeze at finalization',async({page})=>{
 const f=await fixture(page,{run:true});await page.goto(route('recommendations'));
 await expect(page.getByRole('heading',{name:'Recommended material changes',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Compare options',exact:true}).first().click();
 await page.getByRole('button',{name:'Select Option B',exact:true}).click();
 await expect.poll(()=>f.tables.reviews[0].selected_option).toBe('B');await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'screenshots/f1-compare-desktop.png',fullPage:true});
 await expect.poll(()=>f.tables.reviews[0].decision).toBe('UNREVIEWED');
 await page.getByRole('button',{name:'Approve',exact:true}).click();await expect.poll(()=>f.tables.reviews[0].decision).toBe('APPROVED');
 await page.goto(route('revised'));await page.getByRole('button',{name:'Unlock to edit',exact:true}).first().click();
 const wording='ใช้คอนกรีตคาร์บอนต่ำเกรด C30 พร้อมเอกสารรับรองจากผู้ผลิต';
 await page.getByRole('textbox',{name:'Revised requirement',exact:true}).first().fill(wording);
 await page.getByRole('button',{name:'Save wording',exact:true}).first().click();
 await expect.poll(()=>f.tables.reviews[0].draft_wording).toBe(wording);
 await page.reload();await expect(page.getByRole('textbox',{name:'Revised requirement',exact:true}).first()).toHaveValue(wording);
 await page.goto(route('summary'));await expect(page.getByRole('button',{name:'Finalize revision',exact:true})).toBeDisabled();
 await page.goto(route('recommendations'));
 await page.getByRole('button',{name:'Approve',exact:true}).first().click();
 await expect.poll(()=>f.tables.reviews[0].decision).toBe('APPROVED');
 await page.goto(route('revised'));
 await page.getByRole('button',{name:'Unlock to edit',exact:true}).first().click();
 const changed=wording+' และให้วิศวกรตรวจสอบก่อนใช้งาน';
 await page.getByRole('textbox',{name:'Revised requirement',exact:true}).first().fill(changed);
 await page.getByRole('button',{name:'Save wording',exact:true}).first().click();
 await expect.poll(()=>f.tables.reviews[0].decision).toBe('UNREVIEWED');
 await page.goto(route('recommendations'));
 await page.getByRole('button',{name:'Approve',exact:true}).first().click();
 for(let index=1;index<f.tables.recommendations.length;index++)await page.locator('.recommendation').nth(index).getByRole('button',{name:'Reject',exact:true}).click();
 await page.goto(route('summary'));page.on('dialog',d=>d.accept());await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'screenshots/f1-summary-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Finalize revision',exact:true}).click();
 await expect.poll(()=>f.tables.decision_sets.length).toBe(1);
 const item=f.tables.decision_items.find(i=>i.decision==='APPROVED');
 expect(item.snapshot.selected_option).toBe('B');expect(item.snapshot.final_wording).toBe(changed);
 expect(item.snapshot.impacts).toEqual(f.tables.recommendation_options.find(o=>o.recommendation_id===item.recommendation_id&&o.option_key==='B').payload.impacts);
 expect(f.tables.packages).toHaveLength(0);
 await page.goto(route('revised'));await expect(page.getByRole('textbox',{name:'Revised requirement',exact:true}).first()).toBeDisabled();
 const immutable=JSON.stringify(item.snapshot);await page.reload();expect(JSON.stringify(item.snapshot)).toBe(immutable);
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'screenshots/f1-revised-final.png',fullPage:true});expect(f.errors).toEqual([]);
});
test('mobile home and compare keep actions inside a narrow screen',async({page})=>{
 const f=await fixture(page,{run:true});await page.setViewportSize({width:360,height:800});
 await page.goto('/#home');await expect(page.getByRole('heading',{name:'Build better. Specify greener.'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.goto(route('compare'));await expect(page.getByRole('button',{name:'Select Option B',exact:true})).toBeVisible();
 await page.locator('.comparison-table').evaluate(table=>{table.parentElement.scrollLeft=table.parentElement.scrollWidth});
 const optionB=page.getByRole('button',{name:'Select Option B',exact:true});const bounds=await optionB.boundingBox();expect(bounds.x+bounds.width).toBeLessThanOrEqual(361);await optionB.click();await expect.poll(()=>f.tables.reviews[0].selected_option).toBe('B');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'screenshots/f1-compare-mobile.png',fullPage:true});expect(f.errors).toEqual([]);
});



test('source evidence stays keyboard accessible and recommendation filters do not hide decisions',async({page})=>{
 const f=await fixture(page,{run:true});await page.goto(route('recommendations'));
 await page.getByRole('button',{name:'View source',exact:true}).first().click();
 const modal=page.getByRole('dialog',{name:'Source reference'});await expect(modal).toBeVisible();
 await expect(modal.getByText('Paragraph 3',{exact:true}).first()).toBeVisible();
 await page.keyboard.press('Shift+Tab');expect(await page.evaluate(()=>Boolean(document.activeElement.closest('[role=dialog]')))).toBe(true);
 await page.keyboard.press('Escape');await expect(modal).not.toBeVisible();
 await page.getByRole('textbox',{name:'Find a material'}).fill('a material that is absent');await expect(page.getByRole('heading',{name:'No matching recommendations'})).toBeVisible();
 await page.getByRole('textbox',{name:'Find a material'}).fill('');await expect(page.locator('.recommendation')).toHaveCount(3);
 await page.locator('.recommendation').first().getByRole('button',{name:'Approve',exact:true}).click();
 await page.getByRole('combobox',{name:'Review status',exact:true}).selectOption('UNREVIEWED');await expect(page.locator('.recommendation')).toHaveCount(2);
 await page.goto(route('summary'));await expect(page.getByRole('button',{name:'Finalize revision',exact:true})).toBeDisabled();expect(f.errors).toEqual([]);
});
test('a conflicting wording save cannot replace server text and recovers only on request',async({page})=>{
 const f=await fixture(page,{run:true});await page.goto(route('recommendations'));
 await page.getByRole('button',{name:'Approve',exact:true}).first().click();await expect.poll(()=>f.tables.reviews[0].decision).toBe('APPROVED');
 await page.goto(route('revised'));await page.getByRole('button',{name:'Unlock to edit',exact:true}).first().click();
 const textarea=page.getByRole('textbox',{name:'Revised requirement',exact:true}).first();await expect(textarea).toBeEnabled();
 const original=await textarea.inputValue();const draft='ข้อความร่างที่ยังไม่ได้บันทึกจากวิศวกร';
 await textarea.fill(draft);f.conflictNext();await page.getByRole('button',{name:'Save wording',exact:true}).first().click();
 await expect(page.getByRole('alert')).toContainText('Someone changed this record');expect(f.tables.reviews[0].draft_wording).toBeNull();
 await page.reload();await expect(page.getByRole('button',{name:'Restore draft',exact:true})).toBeVisible();await expect(textarea).toHaveValue(original);
 await page.getByRole('button',{name:'Restore draft',exact:true}).click();await expect(textarea).toHaveValue(draft);
 await page.getByRole('button',{name:'Save wording',exact:true}).first().click();await expect.poll(()=>f.tables.reviews[0].draft_wording).toBe(draft);
 await expect(page.getByRole('button',{name:'Restore draft',exact:true})).not.toBeVisible();expect(f.errors).toEqual([]);
});





