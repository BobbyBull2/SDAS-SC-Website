import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
await mkdir('previews',{recursive:true});
const checks=[];
for(const [name,width,height] of [['desktop',1440,1000],['tablet',768,1024],['mobile',390,844],['small-mobile',320,740]]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5174/#home',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 const picture=page.locator('.hero-art img');
 assert.match(await picture.getAttribute('src'),/sdas-friends-sunset-portrait\.jpg$/);
 assert.deepEqual(await picture.evaluate(e=>[e.naturalWidth,e.naturalHeight]),[1024,1536]);
 assert.equal(await picture.evaluate(e=>e.complete),true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const style=await picture.evaluate(e=>({fit:getComputedStyle(e).objectFit,mask:getComputedStyle(e.parentElement).maskImage}));
 assert.notEqual(style.mask,'none');
 if(width<=540){
   const box=await picture.boundingBox();assert.ok(Math.abs(box.width/box.height-1024/1536)<0.01);assert.equal(style.fit,'contain');
 }
 const heading=await page.locator('.hero h1').boundingBox();
 assert.ok(heading.x>=0&&heading.x+heading.width<=width+1);
 assert.equal(await page.locator('.hero-compass,.activities').count(),0);
 assert.match(await page.locator('.brand-slogan').innerText(),/Good Friends/i);
 assert.deepEqual(errors,[]);
 await page.locator('.hero').screenshot({path:`previews/hero-sunset-${name}.png`});
 await page.screenshot({path:`previews/home-sunset-${name}.png`,fullPage:true});
 checks.push(`${name}: supplied image loaded, no horizontal overflow, heading in bounds, edge gradient retained${width<=540?', full source proportions visible':''}`);
 await page.close();
}
await writeFile('previews/hero-verification.json',JSON.stringify({checks},null,2));
console.log(JSON.stringify({checks},null,2));
await browser.close();
