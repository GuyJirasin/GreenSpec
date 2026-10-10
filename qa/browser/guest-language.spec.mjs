import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {fixture} from './fixture.mjs';

const projectUrl='http://127.0.0.1:54321';
const jwt=(id)=>[{alg:'HS256',typ:'JWT'},{sub:id,exp:Math.floor(Date.now()/1000)+3600},'qa-only'].map((x,i)=>i<2?Buffer.from(JSON.stringify(x)).toString('base64url'):x).join('.');

async function guestBackend(page,{failSignups=0,holdSignups=false}={}){
 const ids=[],requests=[];let failures=failSignups,releaseSignup,markSignupStarted;
 const signupStarted=new Promise(resolve=>{markSignupStarted=resolve});
 const signupHeld=holdSignups?new Promise(resolve=>{releaseSignup=resolve}):Promise.resolve();
 await page.route(`${projectUrl}/**`,async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;
  requests.push({method:request.method(),path});
  const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'};
  if(request.method()==='OPTIONS')return route.fulfill({status:200,headers,body:'{}'});
  if(path==='/auth/v1/signup'&&request.method()==='POST'){
   if(failures>0){failures--;return route.fulfill({status:500,headers,body:JSON.stringify({message:'Temporary sign-up failure'})});}
   if(holdSignups){markSignupStarted();await signupHeld;}
   const id=crypto.randomUUID();ids.push(id);const user={id,aud:'authenticated',role:'authenticated',is_anonymous:true,created_at:new Date().toISOString()};
   return route.fulfill({status:200,headers,body:JSON.stringify({access_token:jwt(id),token_type:'bearer',expires_in:3600,refresh_token:`refresh-${id}`,user})});
  }
  if(path==='/auth/v1/user'){
   const bearer=request.headers().authorization||'';const id=bearer.startsWith('Bearer ')?bearer.slice(7):'';
   let sub='';try{sub=JSON.parse(Buffer.from(id.split('.')[1],'base64url').toString()).sub;}catch{}
   return route.fulfill({status:200,headers,body:JSON.stringify({id:sub||ids.at(-1)||'qa-user',aud:'authenticated',role:'authenticated',is_anonymous:true})});
  }
  if(path.startsWith('/auth/v1/'))return route.fulfill({status:200,headers,body:'{}'});
  if(path.startsWith('/rest/v1/'))return route.fulfill({status:200,headers,body:'[]'});
  if(path.startsWith('/storage/v1/'))return route.fulfill({status:200,headers,body:'{}'});
  return route.fulfill({status:200,headers,body:'{}'});
 });
 return {ids,requests,signupStarted,releaseSignup};
}

const switchLanguage=async(page,language)=>page.getByRole('group',{name:'Language / ภาษา'}).getByRole('button',{name:language,exact:true}).click();

test('Thai is the default; English persists, while major headings and sidebar stay English',async({page})=>{
 mkdirSync('screenshots',{recursive:true});await page.setViewportSize({width:360,height:800});await page.goto('/#landing');
 const language=page.getByRole('group',{name:'Language / ภาษา'});
 await expect(language.getByRole('button',{name:'ไทย',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('heading',{level:1})).toContainText('From specification review');
 await expect(page.locator('.lp-login')).toContainText('เข้าใช้งาน');
 await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'screenshots/guest-landing-th-360.png',fullPage:true});
 await switchLanguage(page,'EN');
 await expect(page.locator('.lp-login')).toContainText('Enter app');
 await expect(page.getByText('SPECIFICATIONS FOR A LOWER CARBON BUILT ENVIRONMENT',{exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByRole('group',{name:'Language / ภาษา'}).getByRole('button',{name:'EN',exact:true})).toHaveAttribute('aria-pressed','true');
 const service=await guestBackend(page);
 await page.locator('.lp-login').click();
 await expect(page.getByRole('heading',{name:'Build better. Specify greener.'})).toBeVisible();
 await expect(page.locator('.sidebar').getByRole('link',{name:'Home',exact:true})).toBeVisible();
 await expect(page.locator('.sidebar').getByRole('link',{name:'Projects',exact:true})).toBeVisible();
 const beforeLanguageSwitch=service.requests.length;await switchLanguage(page,'ไทย');
 await expect(page.getByRole('heading',{name:'Build better. Specify greener.'})).toBeVisible();
 await expect(page.locator('.sidebar').getByRole('link',{name:'Home',exact:true})).toBeVisible();
 await page.setViewportSize({width:1280,height:800});await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'screenshots/guest-home-th-1280.png',fullPage:true});
 await switchLanguage(page,'EN');expect(service.requests).toHaveLength(beforeLanguageSwitch);
 await expect(page.getByRole('group',{name:'Language / ภาษา'}).getByRole('button',{name:'EN',exact:true})).toHaveAttribute('aria-pressed','true');
 for(const width of [1280,360]){await page.setViewportSize({width,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
 expect(service.ids).toHaveLength(1);
});

test('all landing entry actions reuse one anonymous identity after reload and revisit',async({page})=>{
 const service=await guestBackend(page);await page.goto('/#landing');
 await page.locator('.lp-login').click();await expect(page.getByRole('heading',{name:'Build better. Specify greener.'})).toBeVisible();
 const firstId=service.ids[0];expect(firstId).toBeTruthy();
 await page.locator('.sidebar-bottom button').click();await expect(page.getByRole('heading',{level:1})).toContainText('From specification review');
 await page.locator('.lp-header-demo').click();await expect(page.getByRole('heading',{name:'Build better. Specify greener.'})).toBeVisible();
 await page.goto('/#landing');await page.locator('.lp-final-demo').click();await expect(page.getByRole('heading',{name:'Build better. Specify greener.'})).toBeVisible();
 await page.reload();await page.goto('/#landing');await page.locator('.lp-final-demo').click();
 await expect(page.getByRole('heading',{name:'Build better. Specify greener.'})).toBeVisible();
 expect(service.ids).toEqual([firstId]);expect(service.requests.filter(r=>r.method==='POST'&&r.path==='/auth/v1/signup')).toHaveLength(1);
});

test('separate browser profiles receive separate anonymous identities',async({browser},testInfo)=>{
 const baseURL=testInfo.project.use.baseURL;const one=await browser.newContext({baseURL}),two=await browser.newContext({baseURL});
 try{
  const p1=await one.newPage(),p2=await two.newPage();const a=await guestBackend(p1),b=await guestBackend(p2);
  await p1.goto('/#landing');await p2.goto('/#landing');await p1.locator('.lp-login').click();await p2.locator('.lp-header-demo').click();
  await expect(p1.getByRole('heading',{name:'Build better. Specify greener.'})).toBeVisible();await expect(p2.getByRole('heading',{name:'Build better. Specify greener.'})).toBeVisible();
  expect(a.ids).toHaveLength(1);expect(b.ids).toHaveLength(1);expect(a.ids[0]).not.toBe(b.ids[0]);
 }finally{await one.close();await two.close();}
});

test('duplicate entry clicks while signup is pending create only one anonymous identity',async({page})=>{
 const service=await guestBackend(page,{holdSignups:true});await page.goto('/#landing');
 await page.locator('.lp-login').click();await service.signupStarted;
 await page.locator('.lp-header-demo').evaluate(button=>button.dispatchEvent(new MouseEvent('click',{bubbles:true})));
 expect(service.requests.filter(r=>r.method==='POST'&&r.path==='/auth/v1/signup')).toHaveLength(1);
 service.releaseSignup();await expect(page.getByRole('heading',{name:'Build better. Specify greener.'})).toBeVisible();
 expect(service.ids).toHaveLength(1);
});

test('failed guest creation stays on landing and can be retried',async({page})=>{
 const service=await guestBackend(page,{failSignups:1});await page.goto('/#landing');await page.locator('.lp-login').click();
 await expect(page.getByRole('alert')).toContainText('Temporary sign-up failure');
 await expect(page.getByRole('heading',{level:1})).toBeVisible();expect(service.ids).toHaveLength(0);
 await page.locator('.lp-login').click();await expect(page.getByRole('heading',{name:'Build better. Specify greener.'})).toBeVisible();expect(service.ids).toHaveLength(1);
});

test('existing signed-in account is reused and a Thai wording stays unchanged in English UI',async({page})=>{
 const f=await fixture(page,{run:true});const thaiSource="เหล็กเสริมต้องเป็นเหล็กมาตรฐานสำหรับปริมาณ 100 ตัน";f.tables.recommendations[0].payload.sources[0].exact_text=thaiSource;
 await page.goto('/#home');await expect(page.getByRole('heading',{name:'Build better. Specify greener.'})).toBeVisible();
 await page.waitForLoadState('networkidle');
 expect(f.requests.filter(r=>r.method==='POST'&&r.path==='/auth/v1/signup')).toHaveLength(0);
 const homeLanguageRequests=f.requests.length;await switchLanguage(page,'ไทย');
 await expect(page.getByRole('heading',{name:'Build better. Specify greener.'})).toBeVisible();
 await expect(page.locator('.sidebar').getByRole('link',{name:'Home',exact:true})).toBeVisible();
 await expect(page.locator('.sidebar').getByRole('link',{name:'Projects',exact:true})).toBeVisible();
 await switchLanguage(page,'EN');expect(f.requests).toHaveLength(homeLanguageRequests);
 await page.goto('/#workspace?project=00000000-0000-4000-8000-000000000010&tab=review&stage=recommendations');
 await expect(page.locator('.recommendation').first()).toBeVisible();await page.waitForLoadState('networkidle');const workspaceLanguageRequests=f.requests.length;
 await switchLanguage(page,'ไทย');await switchLanguage(page,'EN');expect(f.requests).toHaveLength(workspaceLanguageRequests);
 await page.locator('.recommendation').first().getByRole('button',{name:'View details',exact:true}).click();
 await expect(page.getByText(thaiSource,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Approve',exact:true}).first().click();await expect.poll(()=>f.tables.reviews[0].decision).toBe('APPROVED');
 await page.goto(`/#workspace?project=00000000-0000-4000-8000-000000000010&tab=review&stage=revised`);
 await page.getByRole('button',{name:'Unlock to edit',exact:true}).first().click();
 const thai='ใช้คอนกรีตคาร์บอนต่ำตามมาตรฐานโครงการ และให้วิศวกรตรวจสอบก่อนอนุมัติ';
 await page.getByRole('textbox',{name:'Revised requirement',exact:true}).first().fill(thai);await page.getByRole('button',{name:'Save wording',exact:true}).first().click();
 await expect.poll(()=>f.tables.reviews[0].draft_wording).toBe(thai);
 await expect(page.getByRole('textbox',{name:'Revised requirement',exact:true}).first()).toHaveValue(thai);
 expect(f.requests.filter(r=>r.method==='POST'&&r.path==='/auth/v1/signup')).toHaveLength(0);
});

test('two tabs in one browser reuse the same guest even during concurrent entry',async({page})=>{
 const other=await page.context().newPage();
 try {
  const first=await guestBackend(page,{holdSignups:true}),second=await guestBackend(other);
  await page.goto('/#landing');await other.goto('/#landing');
  await page.locator('.lp-login').click();await first.signupStarted;
  await other.locator('.lp-login').click();await expect(other.locator('.lp-login')).toBeDisabled();
  first.releaseSignup();
  await expect(page.getByRole('heading',{name:'Build better. Specify greener.'})).toBeVisible();
  await expect(other.getByRole('heading',{name:'Build better. Specify greener.'})).toBeVisible();
  expect(first.ids).toHaveLength(1);expect(second.ids).toHaveLength(0);
  await expect(other.locator('.user b')).toContainText(first.ids[0].slice(0,6));
 } finally {await other.close();}
});

test('mobile guest entry keeps the pending action visible without header overflow',async({page})=>{
 const service=await guestBackend(page,{holdSignups:true});
 await page.setViewportSize({width:360,height:800});await page.goto('/#landing');
 await page.locator('.lp-login').click();await service.signupStarted;
 await expect(page.locator('.lp-login')).toHaveText('กำลังเปิด…');
 const bounds=await page.locator('.lp-header nav').boundingBox();expect(bounds.x+bounds.width).toBeLessThanOrEqual(361);
 service.releaseSignup();await expect(page.getByRole('heading',{name:'Build better. Specify greener.'})).toBeVisible();
});
