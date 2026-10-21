import { chromium } from 'playwright';
const url='https://issue-council.robertsspaceindustries.com/projects/STAR-CITIZEN/issues?sort=vote&statuses=confirmed,open,under-investigation';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({locale:'en-US',viewport:{width:1365,height:900},userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'});
 const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForTimeout(9000);
 const result=await page.evaluate(()=>({
  title:document.title,
  sample:document.body.innerText.slice(0,2500),
  issueAnchors:[...document.querySelectorAll('a[href*="/issues/STARC-"]')].slice(0,20).map(a=>({href:a.getAttribute('href'),text:a.closest('article,li,[role=row],tr')?.textContent?.trim().slice(0,260)||a.textContent?.trim().slice(0,200)})),
  internalLinks:[...document.querySelectorAll('a')].slice(0,12).map(a=>a.getAttribute('href'))
 }));
 console.log('ISSUE_PROBE',JSON.stringify({httpStatus:response?.status(),...result}));
}finally{await browser.close();}
