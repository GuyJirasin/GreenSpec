import {test,expect} from '@playwright/test';
import {fixture,id,user,now} from './fixture.mjs';
const route=(stage='recommendations',project=id)=>`/#workspace?project=${project}&tab=review&stage=${stage}`;
const executionTables=['tasks','milestones','procurements','implementation_entries','issues','evidence_files','verifications','actual_results','comments'];
const load=async(page,f)=>{await page.goto(route());await expect(page.locator('.recommendation')).toHaveCount(3);await page.waitForLoadState('networkidle');};
const reads=requests=>requests.filter(r=>r.method==='GET'&&r.path.startsWith('/rest/v1/'));

test('Feature 1 loads its own data; stage navigation, source, search and filters use cached rows',async({page})=>{
 const f=await fixture(page,{run:true});await load(page,f);
 expect(reads(f.requests).filter(r=>executionTables.includes(r.table))).toEqual([]);
 const start=f.requests.length;
 await page.getByRole('textbox',{name:'Find a material'}).fill('concrete');
 await expect(page.locator('.recommendation')).toHaveCount(1);
 await page.getByRole('button',{name:'View source',exact:true}).click();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Compare options',exact:true}).click();
 await expect(page.getByRole('button',{name:'Select Option B',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Back to recommendations'}).click();
 await page.getByRole('textbox',{name:'Find a material'}).fill('');
 await page.getByRole('combobox',{name:'Review status',exact:true}).selectOption('UNREVIEWED');
 await page.getByRole('button',{name:'Review revision summary',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Revision Summary',exact:true})).toBeVisible();
 expect(f.requests.slice(start)).toEqual([]);expect(f.errors).toEqual([]);
});

test('a review save uses one write and a run refresh; slow acknowledgement blocks only that item',async({page})=>{
 const f=await fixture(page,{run:true});await load(page,f);const start=f.requests.length;
 const delayed=f.holdNext(r=>r.table==='gs_mutate'&&r.args?.p_id===f.tables.reviews[0].id);
 const first=page.locator('.recommendation').first(),second=page.locator('.recommendation').nth(1);
 await first.getByRole('button',{name:'Approve',exact:true}).click();await delayed.reached;
 expect(f.tables.reviews[0].decision).toBe('UNREVIEWED');
 await expect(first.getByRole('button',{name:'Approve',exact:true})).toBeDisabled();
 await expect(second.getByRole('button',{name:'Approve',exact:true})).toBeEnabled();
 await second.getByRole('button',{name:'Approve',exact:true}).click();
 await expect.poll(()=>f.tables.reviews[1].decision).toBe('APPROVED');
 expect(f.tables.reviews[0].decision).toBe('UNREVIEWED');
 delayed.release();await expect.poll(()=>f.tables.reviews[0].decision).toBe('APPROVED');
 await expect(first.getByRole('button',{name:'Unlock to edit',exact:true})).toBeEnabled();await page.waitForLoadState('networkidle');
 const changed=f.requests.slice(start);expect(changed.filter(r=>r.table==='gs_mutate')).toHaveLength(2);
 expect(reads(changed).every(r=>r.table==='analysis_runs')).toBe(true);
 expect(changed).toHaveLength(4);expect(f.errors).toEqual([]);
});

test('choosing B patches server-confirmed choice without reloading immutable options or unrelated data',async({page})=>{
 const f=await fixture(page,{run:true});await load(page,f);await page.getByRole('button',{name:'Compare options',exact:true}).first().click();
 const start=f.requests.length,delayed=f.holdNext(r=>r.table==='gs_review_change');
 await page.getByRole('button',{name:'Select Option B',exact:true}).click();await delayed.reached;
 expect(f.tables.reviews[0].selected_option).toBe('A');
 await expect(page.getByRole('button',{name:'Select Option B',exact:true})).toBeDisabled();
 delayed.release();await expect.poll(()=>f.tables.reviews[0].selected_option).toBe('B');
 await expect(page.locator('.comparison-table th').filter({hasText:'Option B'})).toContainText('Selected');await expect.poll(()=>reads(f.requests.slice(start)).map(r=>r.table)).toEqual(['analysis_runs']);await page.waitForLoadState('networkidle');
 const changed=f.requests.slice(start);expect(changed.filter(r=>r.table==='gs_review_change')).toHaveLength(1);
 expect(reads(changed).map(r=>r.table)).toEqual(['analysis_runs']);expect(changed).toHaveLength(2);expect(f.errors).toEqual([]);
});

test('a pending review cannot finalize and duplicate clicks never queue a second write',async({page})=>{
 const f=await fixture(page,{run:true});f.tables.reviews.slice(1).forEach(r=>Object.assign(r,{decision:'APPROVED',locked:true}));await load(page,f);
 const delayed=f.holdNext(r=>r.table==='gs_mutate');const button=page.locator('.recommendation').first().getByRole('button',{name:'Approve',exact:true});
 await button.click();await delayed.reached;await button.evaluate(b=>{b.click();b.click()});
 await page.getByRole('button',{name:'Review revision summary',exact:true}).click();
 await expect(page.getByRole('button',{name:'Finalize revision',exact:true})).toBeDisabled();
 expect(f.calls.filter(c=>c.name==='gs_mutate')).toHaveLength(0); // request has not yet reached simulated server
 expect(f.requests.filter(r=>r.table==='gs_mutate')).toHaveLength(1);
 delayed.release();await expect(page.getByRole('button',{name:'Finalize revision',exact:true})).toBeEnabled();
 expect(f.calls.filter(c=>c.name==='gs_mutate')).toHaveLength(1);expect(f.errors).toEqual([]);
});

test('an in-flight save updates its original project cache without replacing the newly opened project',async({page})=>{
 const f=await fixture(page,{run:true}),other='00000000-0000-4000-8000-000000000099';
 f.tables.projects.push({id:other,name:'Second project only',description:'',created_by:user,row_version:1,created_at:now,updated_at:now,archived_at:null});
 f.tables.project_members.push({project_id:other,user_id:user,role:'owner'});
 await load(page,f);const delayed=f.holdNext(r=>r.table==='gs_mutate');
 await page.locator('.recommendation').first().getByRole('button',{name:'Approve',exact:true}).click();await delayed.reached;
 await page.evaluate(hash=>{location.hash=hash},`workspace?project=${other}&tab=documents`);
 await expect(page.getByRole('textbox',{name:'Project name',exact:true})).toHaveValue('Second project only');
 delayed.release();await expect.poll(()=>f.tables.reviews[0].decision).toBe('APPROVED');await page.waitForLoadState('networkidle');
 await expect(page.getByRole('textbox',{name:'Project name',exact:true})).toHaveValue('Second project only');
 const start=f.requests.length;await page.evaluate(hash=>{location.hash=hash},route().slice(2));
 await expect(page.locator('.recommendation').first().getByRole('button',{name:'Unlock to edit',exact:true})).toBeVisible();
 expect(f.requests.slice(start)).toEqual([]);expect(f.errors).toEqual([]);
});

test('polling queries only the active analysis and stops after its terminal result is loaded',async({page})=>{
 const f=await fixture(page,{run:true});f.tables.analysis_runs[0].status='PROCESSING';await page.goto(route('overview'));await page.waitForLoadState('networkidle');
 const start=f.requests.length;
 await expect.poll(()=>reads(f.requests.slice(start)).length,{timeout:7000}).toBeGreaterThan(0);
 const polls=reads(f.requests.slice(start));expect(polls.every(r=>r.table==='analysis_runs')).toBe(true);
 for(const request of polls)expect(new URL(request.url).searchParams.get('id')).toContain(f.tables.analysis_runs[0].id);
 f.tables.analysis_runs[0].status='COMPLETED';
 await expect(page.getByRole('heading',{name:'Project overview',exact:true})).toBeVisible();
 await expect.poll(()=>f.requests.slice(start).some(r=>r.table==='recommendations'),{timeout:7000}).toBe(true);
 await page.waitForLoadState('networkidle');const done=f.requests.length;await page.waitForTimeout(2500);expect(f.requests.length).toBe(done);
 expect(reads(f.requests.slice(start)).filter(r=>executionTables.includes(r.table))).toEqual([]);expect(f.errors).toEqual([]);
});

test('a committed review stays saved if its run-version refresh fails; finalize waits for recovery',async({page})=>{
 const f=await fixture(page,{run:true});f.tables.reviews.slice(1).forEach(r=>Object.assign(r,{decision:'APPROVED',locked:true}));await load(page,f);
 f.failNext(r=>r.method==='GET'&&r.table==='analysis_runs');
 await page.locator('.recommendation').first().getByRole('button',{name:'Approve',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Your change was saved');
 await expect(page.locator('.recommendation').first().getByRole('button',{name:'Unlock to edit',exact:true})).toBeVisible();
 expect(f.tables.reviews[0].decision).toBe('APPROVED');await expect(page.getByText('Not saved',{exact:true})).not.toBeVisible();
 await page.getByRole('button',{name:'Review revision summary',exact:true}).click();await expect(page.getByRole('button',{name:'Finalize revision',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Load latest data',exact:true}).click();await expect(page.getByRole('button',{name:'Finalize revision',exact:true})).toBeEnabled();
 expect(f.calls.filter(c=>c.name==='gs_mutate')).toHaveLength(1);expect(f.errors).toEqual([]);
});

test('an older background read cannot overwrite a later acknowledged review',async({page})=>{
 const f=await fixture(page,{run:true});await load(page,f);await page.getByRole('button',{name:'Compare options',exact:true}).first().click();
 f.conflictNext();await page.getByRole('button',{name:'Select Option B',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Someone changed this record');
 await page.getByRole('button',{name:'Back to recommendations'}).click();
 const delayed=f.holdNext(r=>r.method==='GET'&&r.table==='reviews');
 await page.getByRole('button',{name:'Load latest data',exact:true}).click();await delayed.reached;
 await page.locator('.recommendation').first().getByRole('button',{name:'Approve',exact:true}).click();
 await expect(page.locator('.recommendation').first().getByRole('button',{name:'Unlock to edit',exact:true})).toBeVisible();
 delayed.release();await page.waitForLoadState('networkidle');
 await expect(page.locator('.recommendation').first().getByRole('button',{name:'Unlock to edit',exact:true})).toBeVisible();
 expect(f.tables.reviews[0].decision).toBe('APPROVED');expect(f.errors).toEqual([]);
});

test('signing out during a read clears user cache and a new user cannot inherit its delayed data',async({page})=>{
 const f=await fixture(page,{run:true}),oldName=f.tables.projects[0].name;
 const delayed=f.holdNext(r=>r.method==='GET'&&r.table==='analysis_runs');
 await page.goto('/#home');await delayed.reached;
 // Simulate session revocation; the MVP return action intentionally retains its session.
 await page.evaluate(async()=>{const {db}=await import('/src/api.js');await db.auth.signOut();});
 await expect(page.locator('.lp-login')).toBeVisible();
 f.signInAs('00000000-0000-4000-8000-000000000098','second@example.test');
 for(const rows of Object.values(f.tables))rows.splice(0);
 await page.evaluate(async()=>{const {db}=await import('/src/api.js');await db.auth.signInWithPassword({email:'second@example.test',password:'synthetic-test-only'});});
 await expect(page.getByRole('heading',{name:'Build better. Specify greener.'})).toBeVisible();await expect(page.getByRole('heading',{name:'No analysis yet'})).toBeVisible();
 delayed.release();await page.waitForLoadState('networkidle');
 await expect(page.getByText(oldName,{exact:true})).not.toBeVisible();await expect(page.getByRole('heading',{name:'No analysis yet'})).toBeVisible();
 expect(f.errors).toEqual([]);
});

test('terminal polling retries missing result data before marking the analysis ready',async({page})=>{
 const f=await fixture(page,{run:true});f.tables.analysis_runs[0].status='PROCESSING';await page.goto(route('overview'));await page.waitForLoadState('networkidle');
 f.failNext(r=>r.method==='GET'&&r.table==='recommendations','Temporary result download failed');f.tables.analysis_runs[0].status='COMPLETED';
 await expect(page.getByRole('alert')).toContainText('Temporary result download failed');
 await expect(page.getByRole('heading',{name:'Analysing the sample files',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Project overview',exact:true})).toBeVisible({timeout:7000});await expect(page.getByRole('alert')).not.toBeVisible();
 await page.getByRole('button',{name:'Review recommendations',exact:true}).click();await expect(page.locator('.recommendation')).toHaveCount(3);
 expect(f.requests.filter(r=>r.method==='GET'&&r.table==='recommendations').length).toBeGreaterThanOrEqual(3);
 expect(f.errors).toEqual([]);
});


