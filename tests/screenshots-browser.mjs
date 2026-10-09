import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const fixtureImage=await readFile('public/images/preview-orbit.png');
const images=Array.from({length:5},(_,i)=>({id:`123-${i+1}`,sha256:'a'.repeat(64),file:`images/123-${i+1}-${'a'.repeat(64)}.webp`,width:1920,height:1080,approval:'provisional',verifiedApproverIds:[]}));
const manifest={schemaVersion:1,guildId:'1518410019249459236',channelId:'1519105573067686000',emojiId:'1557915851922083880',publicationApproved:false,completeHistory:true,images};
const errors=[];
await mkdir('previews',{recursive:true});
for(const width of [1440,768,390,320]){
 const page=await browser.newPage({viewport:{width,height:950},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__sdas_preview__/manifest.json',r=>r.fulfill({json:manifest}));
 await page.route('**/__sdas_preview__/images/*',r=>r.fulfill({contentType:'image/png',body:fixtureImage}));
 await page.goto('http://127.0.0.1:5174/#home',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('.thumbnails button').count(),5);
 assert.match(await page.locator('.preview-label').innerText(),/PROVISIONAL/);
 await page.getByRole('button',{name:'Show preview 5',exact:true}).click();
 await page.getByRole('button',{name:'Next screenshot',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Show preview 1',exact:true}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'Previous screenshot',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Show preview 5',exact:true}).getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const feature=await page.locator('.active-slide').boundingBox(), thumbs=await page.locator('.thumbnails').boundingBox();
 assert.ok(thumbs.y>=feature.y+feature.height);
 assert.ok(Math.abs(feature.width-thumbs.width)<3);
 assert.ok(await page.locator('.featured-image').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0)));
 await page.locator('#screenshots').screenshot({path:`previews/screenshots-fixture-${width}.png`});
 await page.close();
}
// More than one history page must not make carousel controls overflow.
const many=await browser.newPage({viewport:{width:320,height:950},reducedMotion:'reduce'});
const manyImages=Array.from({length:50},(_,i)=>({...images[0],id:`456-${i+1}`,file:`images/456-${i+1}-${'a'.repeat(64)}.webp`}));
await many.route('**/__sdas_preview__/manifest.json',r=>r.fulfill({json:{...manifest,images:manyImages}}));
await many.route('**/__sdas_preview__/images/*',r=>r.fulfill({contentType:'image/png',body:fixtureImage}));
await many.goto('http://127.0.0.1:5174/',{waitUntil:'networkidle'});
assert.equal(await many.locator('.thumbnails button').count(),50);
assert.equal(await many.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await many.close();
for(const broken of ['missing','invalid','empty','image']){
 const page=await browser.newPage({reducedMotion:'reduce'});
 await page.route('**/__sdas_preview__/manifest.json',r=>broken==='missing'?r.fulfill({status:404}):r.fulfill({json:broken==='invalid'?{}:broken==='empty'?{...manifest,images:[]}:manifest}));
 await page.route('**/__sdas_preview__/images/*',r=>r.fulfill({status:404}));
 await page.goto('http://127.0.0.1:5174/',{waitUntil:'networkidle'});
 assert.equal(await page.locator('.thumbnails button').count(),2);
 assert.match(await page.locator('.preview-label').innerText(),/AI CONCEPT ART/);
 await page.close();
}
// Production must not accept a provisional manifest, even if a file is provided.
const page=await browser.newPage();
await page.route('**/screenshot-gallery/manifest.json',r=>r.fulfill({json:manifest}));
await page.goto('http://127.0.0.1:5175/',{waitUntil:'networkidle'});
assert.equal(await page.locator('.thumbnails button').count(),2);
assert.match(await page.locator('.preview-label').innerText(),/AI CONCEPT ART/);
assert.equal(await page.locator('img[src*="__sdas_preview__"]').count(),0);
assert.deepEqual(errors,[]);
await browser.close();
console.log('PASS: 5-image synthetic manifest at desktop/tablet/phone widths, navigation/wrap, layout, missing/invalid/empty/broken-image fallbacks, production provisional rejection. Not real Discord images.');
