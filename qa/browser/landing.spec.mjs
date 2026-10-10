import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

for(const width of [1728,360]){
 test(`Figma landing at ${width}px uses local assets and clear entry actions`,async({page})=>{
  const errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>requests.push({url:request.url(),method:request.method()}));
  await page.addInitScript(()=>localStorage.setItem('greenspec-language','en'));
  await page.setViewportSize({width,height:1000});
  await page.goto('/#landing');
  await expect(page.getByRole('heading',{level:1})).toHaveText(/From specification review\s*to approval-ready\s*low-carbon revisions\./);
  for(const title of ['Value for your entire team','Developers','Consultants','Procurement teams','From documents to decision-ready revisions','Built on evidence. Ready for real-world delivery.','Turn your specifications into lower-carbon reality.'])await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await expect(page.locator('.lp-header-demo')).toBeEnabled();
  await expect(page.locator('.lp-login')).toBeVisible();
  await expect(page.getByRole('button',{name:/Start a pilot/}).first()).toBeVisible();
  const how=page.getByRole('link',{name:'See how it works'});
  await expect(how).toHaveAttribute('href',/#/);
  await how.click();
  await expect(page.getByRole('heading',{name:'From documents to decision-ready revisions',exact:true})).toBeInViewport();
  await expect.poll(()=>page.locator('img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0))).toBe(true);
  const images=await page.locator('img').evaluateAll(images=>images.map(image=>({src:image.src,width:image.getBoundingClientRect().width,height:image.getBoundingClientRect().height,visible:image.getBoundingClientRect().width>0,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight})));
  expect(images.length).toBeGreaterThan(5);
  for(const image of images){expect(new URL(image.src).origin).toBe(new URL(page.url()).origin);if(image.visible){expect(image.width).toBeGreaterThan(0);expect(image.height).toBeGreaterThan(0);if(image.src.endsWith('.svg')){expect(Math.abs(image.width-image.naturalWidth)).toBeLessThan(1);expect(Math.abs(image.height-image.naturalHeight)).toBeLessThan(1);}}}
  expect(requests.filter(request=>/figma\.com|unsplash\.com/.test(request.url))).toEqual([]);
  expect(requests.filter(request=>request.method==='POST')).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true); expect(await page.locator('.figma-landing h1,.figma-landing h2,.figma-landing h3,.figma-landing p').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().width>0).every(n=>n.getBoundingClientRect().right<=innerWidth+1&&n.getBoundingClientRect().left>=-1&&n.scrollWidth<=n.clientWidth+1))).toBe(true);
  mkdirSync('screenshots',{recursive:true});
  await page.evaluate(()=>document.fonts.ready); await page.screenshot({path:`screenshots/landing-figma-${width}.png`,fullPage:true});
  expect(errors).toEqual([]);
 });
}
