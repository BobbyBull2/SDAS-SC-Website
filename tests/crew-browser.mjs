import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const roster=JSON.parse(await readFile('public/data/members.json','utf8'));
const browser=await chromium.launch({headless:true});
const errors=[];
for(const width of [1440,768,390,320]){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce',hasTouch:true});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5174/#home',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('.brand-emblem img').count(),2);
 assert.equal(await page.locator('.hero-compass,.activities').count(),0);
 assert.equal(await page.locator('.hero-philosophy').count(),1);
 assert.equal(await page.locator('[data-copy=original] .crew-card').count(),roster.members.length);
 assert.deepEqual(await page.locator('[data-copy=original] .crew-card').evaluateAll(es=>es.map(e=>e.href)),roster.members.map(m=>m.profile));
 assert.deepEqual(await page.locator('[data-copy=original] .crew-card h3').allTextContents(),roster.members.map(m=>m.handle));
 await page.locator('#crew').scrollIntoViewIfNeeded();
 const rail=page.locator('.crew-rail');
 await page.getByRole('button',{name:'Next crew members',exact:true}).click();
 assert.ok(await rail.evaluate(e=>e.scrollLeft)>0);
 await page.getByRole('button',{name:'Previous crew members',exact:true}).click();
 assert.equal(await rail.evaluate(e=>e.scrollLeft),0);
 await rail.focus();await page.keyboard.press('ArrowRight');
 assert.ok(await rail.evaluate(e=>e.scrollLeft)>0);
 await rail.evaluate(e=>e.scrollLeft=0);
 await rail.hover();await page.mouse.wheel(220,0);
 await page.waitForFunction(()=>document.querySelector('.crew-rail').scrollLeft>0);
 await rail.evaluate(e=>e.scrollLeft=0);
 // Chromium native touch scrolling, rather than a synthetic JS swipe handler.
 const box=await rail.boundingBox();
 const cdp=await page.context().newCDPSession(page);
 const x=Math.min(box.x+box.width-25,350),y=box.y+70;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let delta=20;delta<=120;delta+=20)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-delta,y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>document.querySelector('.crew-rail').scrollLeft>0);
 await rail.evaluate(e=>e.scrollLeft=0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('#crew').screenshot({path:`previews/crew-${width}.png`});
 await page.locator('header').screenshot({path:`previews/brand-${width}.png`});
 await page.close();
}
for(const scenario of ['failed','stale','empty']){
 const page=await browser.newPage();
 await page.route('**/data/members.json',r=>scenario==='failed'?r.fulfill({status:503}):r.fulfill({json:{...roster,fetchedAt:'2020-01-01T00:00:00Z',members:scenario==='empty'?[]:roster.members}}));
 await page.goto('http://localhost:5174/',{waitUntil:'networkidle'});
 assert.match(await page.locator('#crew').innerText(),scenario==='failed'?/temporarily unavailable/:scenario==='stale'?/Last saved roster/:/No publicly visible/);
 await page.close();
}
const prod=await browser.newPage();
await prod.goto('http://127.0.0.1:5175/',{waitUntil:'networkidle'});
assert.equal(await prod.locator('[data-copy=original] .crew-card').count(),roster.members.length);
assert.equal(await prod.locator('.brand-emblem img').count(),2);
assert.deepEqual(errors,[]);
await browser.close();
console.log(`PASS: ${roster.members.length} real public RSI members, exact profiles/handles, emblem, philosophy, responsive crew arrows/keyboard/wheel/native touch, stale/failure/empty states, production smoke test.`);
