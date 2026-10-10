import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

for(const width of [1728,360]){
 test(`Figma landing at ${width}px uses local assets and working actions`,async({page})=>{
  const errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>requests.push({url:request.url(),method:request.method()}));
  await page.setViewportSize({width,height:1000});
  await page.goto('/#landing');
  await expect(page.getByRole('heading',{level:1})).toHaveText(/From specification review\s*to approval-ready\s*low-carbon revisions\./);
  for(const title of ['Value for your entire team','Developers','Consultants','Procurement teams','From documents to decision-ready revisions','Built on evidence. Ready for real-world delivery.','Turn your specifications into lower-carbon reality.'])await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  const demos=page.getByRole('link',{name:/Request a demo/});
  expect(await demos.count()).toBeGreaterThanOrEqual(2);
  for(const demo of await demos.all())await expect(demo).toHaveAttribute('href',/^mailto:team@example.test/);
  await expect(page.getByRole('button',{name:/Start a pilot/}).first()).toBeVisible();
  const how=page.getByRole('link',{name:'See how it works'});
  await expect(how).toHaveAttribute('href',/#/);
  await how.click();
  await expect(page.getByRole('heading',{name:'From documents to decision-ready revisions',exact:true})).toBeInViewport();
  // Every shipped image must finish loading; its source stays on this app's origin.
  await expect.poll(()=>page.locator('img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0))).toBe(true);
  const images=await page.locator('img').evaluateAll(images=>images.map(image=>({src:image.src,width:image.getBoundingClientRect().width,height:image.getBoundingClientRect().height,visible:image.getBoundingClientRect().width>0,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight})));
  expect(images.length).toBeGreaterThan(5);
  for(const image of images){expect(new URL(image.src).origin).toBe(new URL(page.url()).origin);if(image.visible){expect(image.width).toBeGreaterThan(0);expect(image.height).toBeGreaterThan(0);if(image.src.endsWith('.svg')){expect(Math.abs(image.width-image.naturalWidth)).toBeLessThan(1);expect(Math.abs(image.height-image.naturalHeight)).toBeLessThan(1);}}}
  expect(requests.filter(request=>/figma\.com|unsplash\.com/.test(request.url))).toEqual([]);
  expect(requests.filter(request=>request.method==='POST')).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true); expect(await page.locator('.figma-landing h1,.figma-landing h2,.figma-landing h3,.figma-landing p').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().width>0).every(n=>n.getBoundingClientRect().right<=innerWidth+1&&n.getBoundingClientRect().left>=-1&&n.scrollWidth<=n.clientWidth+1))).toBe(true);
  mkdirSync('screenshots',{recursive:true});
  await page.evaluate(()=>document.fonts.ready); await page.screenshot({path:`screenshots/landing-figma-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:/Start a pilot/}).first().click(); await expect(page.getByLabel('Email',{exact:true})).toBeVisible(); await page.goto('/#landing'); await page.getByRole('button',{name:'Log in',exact:true}).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Email',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Password',{exact:true})).toBeVisible();
  expect(errors).toEqual([]);
 });
}

test('demo without configured contact opens an honest dialog and sends nothing',async({page})=>{
 const writes=[];let contactRemoved=false;
 page.on('request',request=>{if(request.method()==='POST')writes.push(request.url());});
 await page.route('**/src/LandingPage.jsx',async route=>{
  const response=await route.fetch(),source=await response.text();
  const changed=source.replace(/("VITE_CONTACT_EMAIL"\s*:\s*)"team@example\.test"/g,'$1""');
  contactRemoved=changed!==source;
  await route.fulfill({response,body:changed});
 });
 await page.goto('/#landing');
 expect(contactRemoved).toBe(true);
 await page.getByRole('button',{name:'Request a demo',exact:true}).first().click();
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 await expect(dialog).toContainText('The team has not added contact details yet.');
 await expect(page.getByRole('link',{name:/Request a demo/})).toHaveCount(0);
 await dialog.getByRole('button',{name:'Close',exact:true}).focus();await page.keyboard.press('Enter');await expect(dialog).not.toBeVisible();
 await page.getByRole('button',{name:'Request a demo',exact:true}).first().click();
 await dialog.getByRole('button',{name:'Start a pilot',exact:true}).click();
 await expect(page.getByLabel('Email',{exact:true})).toBeVisible();expect(writes).toEqual([]);
});