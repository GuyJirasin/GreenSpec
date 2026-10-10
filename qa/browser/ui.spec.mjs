import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {fixture,id,user,now} from './fixture.mjs';
test('landing entry opens Home with the existing browser account',async({page})=>{
 const f=await fixture(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#landing');
 await expect(page.getByRole('heading',{level:1})).toContainText('low-carbon revisions.');
 await expect(page.getByText(/MVP: analysis uses supported sample files/)).toBeVisible();
 await expect(page.locator('.lp-header-demo')).toBeEnabled();await expect(page.locator('.lp-login')).toBeEnabled();
 mkdirSync('screenshots',{recursive:true});await page.screenshot({path:'screenshots/landing-existing-account-entry.png',fullPage:true});
 await page.locator('.lp-header-demo').focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('heading',{name:'Build better. Specify greener.'})).toBeVisible();
 expect(f.requests.filter(r=>r.method==='POST'&&r.path==='/auth/v1/signup')).toHaveLength(0);expect(errors).toEqual([]);
});
test('task notification opens its authorized package and section, not task UUID as package',async({page})=>{
 const f=await fixture(page,{run:true}),pid='00000000-0000-4000-8000-000000000090',tid='00000000-0000-4000-8000-000000000091';
 f.tables.packages.push({id:pid,project_id:id,origin_decision_item_id:'qa-origin',snapshot:{...f.tables.recommendations[0].payload,generation_mode:'simulated'},owner_id:user,row_version:1,execution_status:'APPROVED',verification_status:'PENDING'});
 f.tables.tasks=[{id:tid,project_id:id,package_id:pid,title:'Task from notification',status:'TODO',row_version:1,assignee_id:user}];f.tables.notifications.push({id:'qa-notification',project_id:id,recipient_id:user,kind:'TASK_OVERDUE',target_id:tid,created_at:now,read_at:null});
 await page.goto('/#projects');await page.getByRole('button',{name:'Notifications'}).click();await expect(page.getByRole('heading',{name:'TASK_OVERDUE'})).toBeVisible();await page.getByRole('button',{name:'Open item'}).click();
 await expect(page).toHaveURL(new RegExp(`package=${pid}`));await expect(page.getByText('Task from notification',{exact:false}).first()).toBeVisible();await expect(page.locator('.drawer')).not.toBeVisible();expect(f.errors).toEqual([]);
});
test('draft setup saves only mutable fields; document without file persists across reload',async({page})=>{
 const f=await fixture(page);await page.goto(`/#workspace?project=${id}&tab=documents`);
 await expect(page.getByRole('heading',{name:'Project details'})).toBeVisible();
 await expect(page.getByRole('button',{name:/Start sample analysis/})).toBeDisabled();
 await page.getByLabel('Project description',{exact:true}).fill('อาคารสำนักTasksตัวอย่างเพื่อทดสอบ workflow');
 // Project context is acknowledged after the specified 800ms autosave debounce.
 await expect(page.getByText('Saved',{exact:true})).toBeVisible();
 expect(f.calls.find(x=>x.name==='gs_mutate').args.p_data).toEqual({name:'โครงการทดสอบ Green Office',description:'อาคารสำนักTasksตัวอย่างเพื่อทดสอบ workflow'});
 await page.getByLabel('Document title',{exact:true}).fill('TOR ฉบับร่าง');await page.getByRole('button',{name:'Add document'}).click();
 await expect(page.getByRole('heading',{name:'TOR ฉบับร่าง'})).toBeVisible();await expect(page.getByText('No file',{exact:true})).toBeVisible();
 expect(f.tables.documents[0].type).toBe('TOR');
 await page.reload();await expect(page.getByRole('heading',{name:'TOR ฉบับร่าง'})).toBeVisible();await expect(page.getByText('No file',{exact:true})).toBeVisible();
 await page.screenshot({path:'screenshots/documents-desktop.png',fullPage:true});expect(f.errors).toEqual([]);
});
test('viewer read-only and mobile 360px navigation keep primary actions accessible',async({page})=>{
 const f=await fixture(page,{role:'viewer'});await page.setViewportSize({width:360,height:800});await page.goto(`/#workspace?project=${id}&tab=documents`);
 await expect(page.getByText(/read-only access/)).toBeVisible();await expect(page.getByRole('button',{name:'Add document'})).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Open menu'}).click();await expect(page.locator('.sidebar').getByRole('link',{name:'Projects'})).toBeVisible();
 await page.locator('.sidebar').getByRole('link',{name:'Projects'}).click();
 await expect(page.getByRole('heading',{name:'Projects'})).toBeVisible();
 await expect(page.locator('.app')).not.toHaveClass(/nav-open/);
 expect(await page.locator('main h1,main h2').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().right<=innerWidth+1&&n.scrollWidth<=n.clientWidth+1))).toBe(true);
 await page.screenshot({path:'screenshots/projects-mobile.png',fullPage:true});expect(f.errors).toEqual([]);expect(f.calls.filter(c=>c.name==='gs_mutate')).toEqual([]);
});
test('failed save does not overwrite; unsaved draft requires explicit recovery after reload',async({page})=>{
 const f=await fixture(page);await page.goto(`/#workspace?project=${id}&tab=documents`);await expect(page.getByLabel('Project description',{exact:true})).toBeVisible();
 f.conflictNext();await page.getByLabel('Project description',{exact:true}).fill('Unacknowledged draft');await expect(page.getByRole('alert')).toContainText('Someone changed this record');
 expect(f.tables.projects[0].description).toBe('');await page.reload();await expect(page.getByRole('button',{name:'Restore draft'})).toBeVisible();await expect(page.getByLabel('Project description',{exact:true})).toHaveValue('');
 await page.getByRole('button',{name:'Restore draft'}).click();await expect(page.getByRole('textbox',{name:'Project description',exact:true})).toHaveValue('Unacknowledged draft');await expect(page.getByText('Saved',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Restore draft'})).not.toBeVisible();expect(f.tables.projects[0].description).toBe('Unacknowledged draft');expect(f.errors).toEqual([]);
});
test('package task Bangkok time, selected estimates versus missing actuals, explicit zero actual save',async({page})=>{
 const f=await fixture(page,{run:true}),pid='00000000-0000-4000-8000-000000000090';
 f.tables.packages.push({id:pid,project_id:id,origin_decision_item_id:'qa-origin',snapshot:{...f.tables.recommendations[0].payload,generation_mode:'simulated'},owner_id:user,row_version:1,execution_status:'APPROVED',verification_status:'PENDING'});
 await page.goto(`/#workspace?project=${id}&tab=execution&package=${pid}`);
 await expect(page.getByRole('heading',{name:'Low carbon concrete C30 with supplementary cementitious material'})).toBeVisible();
 const taskCard=page.locator('section.card').filter({has:page.getByRole('heading',{name:'Tasks',exact:true})});
 await taskCard.getByRole('textbox',{name:'Title',exact:true}).fill('ตรวจสอบใบสั่งซื้อ');
 await taskCard.getByLabel('Set date',{exact:true}).fill('2026-10-10T10:30');
 await taskCard.getByRole('button',{name:'Add record'}).click();
 await expect(taskCard.getByText('ตรวจสอบใบสั่งซื้อ',{exact:false}).first()).toBeVisible();
 expect(f.tables.tasks[0].due_at).toBe('2026-10-10T03:30:00.000Z');
 await page.getByRole('button',{name:'Actual results',exact:true}).click();
 await expect(page.getByText(/Actual carbon savings/)).toBeVisible();
 const costCard=page.locator('section.card').filter({has:page.getByRole('heading',{name:'Actual cost',exact:true})});
 await costCard.getByRole('spinbutton',{name:'Total (zero means an actual zero)',exact:true}).fill('0');
 await costCard.getByRole('textbox',{name:'Source',exact:true}).fill('Invoice reference');await costCard.getByRole('textbox',{name:'Method / baseline',exact:true}).fill('Total invoiced');
 await costCard.getByRole('button',{name:'Save',exact:true}).click();
 await expect(page.getByText('Saved',{exact:true})).toBeVisible();expect(f.tables.actual_results[0].total_value).toBe(0);expect(f.tables.actual_results[0].unit).toBe('THB');expect(f.tables.packages[0].execution_status).toBe('APPROVED');
 await page.screenshot({path:'screenshots/package-actuals-desktop.png',fullPage:true});expect(f.errors).toEqual([]);
});

