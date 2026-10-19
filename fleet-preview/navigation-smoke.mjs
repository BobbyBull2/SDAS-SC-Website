import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.stack || error.message));
page.on('console', msg => {
  if (msg.type() === 'error') errors.push('console: ' + msg.text().slice(0, 350));
});
try {
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.locator('#nav [data-view]').first().waitFor({ timeout: 10000 });
  const snapshot = () => page.evaluate(() => ({
    hasApp:!!document.querySelector('#app'),
    ids:[...document.querySelectorAll('[id]')].slice(0,35).map(e=>e.id),
    children:[...document.body.children].map(e=>e.tagName+':'+(e.id||e.className||'')).slice(0,20),
    appHTML:document.querySelector('#app')?.outerHTML.slice(0,180),
    navParent:document.querySelector('#nav')?.parentElement?.tagName
  }));
  console.log('INITIAL_DOM',JSON.stringify(await snapshot()));
  await page.evaluate(() => {
    const originalRemove = Element.prototype.remove;
    Element.prototype.remove = function(...args) {
      if(this.id === 'app' || this.contains?.(document.getElementById('app'))) {
        console.error('REMOVAL_STACK', this.tagName, this.id, new Error().stack?.slice(0,1300));
      }
      return originalRemove.apply(this,args);
    };
    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function(child) {
      if(child?.id === 'app') console.error('REMOVE_CHILD_STACK', new Error().stack?.slice(0,1300));
      return originalRemoveChild.call(this,child);
    };
  });
  for (const tab of ['data','hangar','registry','pilots','home','data']) {
    await page.locator('#nav [data-view="' + tab + '"]').click();
    await page.waitForTimeout(400);
    const state = await page.evaluate(() => {
      const el = document.querySelector('#app');
      if (!el) return { missing: true };
      const cs = getComputedStyle(el);
      return { text: el.innerText.slice(0, 280), hasBackup:el.innerText.includes('BACKUP / RESTORE'), hasRSI:el.innerText.includes('RSI PLEDGED SHIPS'), markup: el.innerHTML.length, display: cs.display, visible: el.getBoundingClientRect().height, active: document.querySelector('#nav .active')?.getAttribute('data-view') };
    });
    console.log('NAV_TEST', tab, JSON.stringify(state));
    const geometry = await page.evaluate(() => {
      const get = (el) => { if(!el)return null; const r=el.getBoundingClientRect(), cs=getComputedStyle(el);
        return {tag:el.tagName,id:el.id,class:String(el.className||'').slice(0,95),
          w:Math.round(r.width),left:Math.round(r.left),height:Math.round(r.height),
          display:cs.display,maxWidth:cs.maxWidth,grid:cs.gridTemplateColumns};
      };
      const app=document.querySelector('#app');
      return {viewport:innerWidth,root:get(document.querySelector('.shell')),
        nav:get(document.querySelector('#nav')),app:get(app),first:get(app?.firstElementChild),
        children:[...(app?.children||[])].slice(0,6).map(get),
        layout:get(app?.querySelector('.layout')),dash:get(document.querySelector('#sdas-golden-live')),
        panel:get(app?.querySelector('.panel'))};
    });
    console.log('VIEW_GEOMETRY', tab, JSON.stringify(geometry));
    if (geometry.app && geometry.root && Math.abs(geometry.app.w-geometry.root.w)>3) {
      throw Error('Fleet view does not fill shell width on '+tab+': '+JSON.stringify(geometry));
    }
    if (tab==='home' && geometry.dash && geometry.root && Math.abs(geometry.dash.w-geometry.root.w)>3) {
      throw Error('Terminal dashboard width differs from other views: '+JSON.stringify(geometry));
    }
    if (state.missing) console.log('MISSING_APP_DOM', JSON.stringify(await snapshot()));
    if (state.missing || state.active !== tab || !state.visible || state.markup < 50) {
      throw new Error('Navigation failed on ' + tab + ': ' + JSON.stringify(state));
    }
    if (tab === 'data' && (!state.hasBackup || !state.hasRSI)) {
      throw new Error('Data Import view missing BACKUP / RESTORE: ' + JSON.stringify(state));
    }
  }
  // Header guardrail: keep original command onclick handlers after reparenting.
  await page.waitForTimeout(500);
  const headerCheck = await page.evaluate(() => {
    const mast = document.querySelector("#sdas-fleet-masthead");
    const logo = mast?.querySelector(".fleet-emblem");
    const br = mast?.getBoundingClientRect(), lr = logo?.getBoundingClientRect();
    const rail = document.querySelector("#sdas-fleet-header-actions");
    const buttons = [...(rail?.querySelectorAll("button") || [])];
    const text = buttons.map(x => x.textContent.trim().toUpperCase());
    return {headerText: document.querySelector(".header")?.innerText || "",
      text, handlers: buttons.map(b => typeof b.onclick),
      logoTop: lr?.top, mastTop: br?.top, logoBottom: lr?.bottom, mastBottom: br?.bottom,
      shellClass:document.querySelector(".shell")?.className,
      commandCount:document.querySelectorAll("#sdas-fleet-header-actions button").length};
  });
  console.log("HEADER_CHECK", JSON.stringify(headerCheck));
  if(headerCheck.shellClass.includes("sdas-top-action-group"))throw Error("Shell improperly styled as action group");
  if(headerCheck.headerText.includes("PRIVATE FUNCTIONAL PREVIEW"))throw Error("Obsolete preview pill still shown");
  if(headerCheck.commandCount!==2||!headerCheck.text.includes("REFRESH ORG FLEET")||!headerCheck.text.includes("EDIT PILOT NAME")||
      headerCheck.handlers.some(x=>x!=="function"))throw Error("Fleet header actions missing or detached: "+JSON.stringify(headerCheck));
  if(headerCheck.logoTop<headerCheck.mastTop+3||headerCheck.logoBottom>headerCheck.mastBottom+3)
      throw Error("SDAS emblem extends beyond masthead: "+JSON.stringify(headerCheck));
  // Visual inspection artifacts and objective connected-tab geometry checks.
  await page.locator('#nav [data-view="home"]').click();
  await page.waitForTimeout(350);
  const tabs = await page.locator('#nav [data-view]').evaluateAll(elements => elements.map(el => {
    const r=el.getBoundingClientRect(),cs=getComputedStyle(el),line=getComputedStyle(el,'::after');
    return {name:el.dataset.view,left:Math.round(r.left),right:Math.round(r.right),top:Math.round(r.top),bottom:Math.round(r.bottom),clip:cs.clipPath,separator:line.content,active:el.classList.contains('active')};
  }));
  console.log('NAV_GEOMETRY_DESKTOP',JSON.stringify(tabs));
  if(tabs.length!==5||tabs.some((el,i)=>!el.clip.startsWith('polygon(')||i>0&&(el.left-tabs[i-1].right>8||el.left-tabs[i-1].right< -45))) {
    throw Error('Desktop tab rail has gaps or clipping: '+JSON.stringify(tabs));
  }
  // Verify selection has a contained glow, with no colored external filter or
  // gold divider spilling into the next tab. Test every active state.
  for (const name of ['home','hangar','registry','pilots','data']) {
    await page.locator('#nav [data-view="' + name + '"]').click();
    await page.waitForTimeout(260); // Test the settled visual state after any browser style recalc.
    const look=await page.locator('#nav [data-view]').evaluateAll(buttons=>buttons.map(b=>{
      const c=getComputedStyle(b),divider=getComputedStyle(b,'::after');
      return {name:b.dataset.view,active:b.classList.contains('active'),
        color:c.color,filter:c.filter,overflow:c.overflow,transition:c.transition,
        shadow:c.boxShadow,divider:divider.backgroundImage,
        separatorWidth:divider.width};
    }));
    console.log('NAV_STYLE',name,JSON.stringify(look));
    const selected=look.find(x=>x.active);
    if(!selected||selected.name!==name||selected.filter!=='none'||selected.overflow!=='hidden')
      throw Error('Selected tab styling is missing: '+JSON.stringify(look));
    if(look.some(x=>!x.active&&x.color===selected.color))
      throw Error('Inactive tab acquired gold coloring');
    if(look.some(x=>!x.active&&/gold|#e6c0|#e9c5/i.test(x.divider)))
      throw Error('Gold divider would bleed into neighbor');
  }
  await page.locator('#nav [data-view="home"]').click();
  await page.locator('#nav').screenshot({path:'/tmp/fleet-tabs-desktop.png'});
  await page.screenshot({path:'/tmp/fleet-page-desktop.png',fullPage:false});
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(350);
  const mobile=await page.locator('#nav [data-view]').evaluateAll(elements => elements.map(el=>{
    const r=el.getBoundingClientRect();
    return {name:el.dataset.view,left:Math.round(r.left),right:Math.round(r.right),top:Math.round(r.top),bottom:Math.round(r.bottom)};
  }));
  console.log('NAV_GEOMETRY_MOBILE',JSON.stringify(mobile));
  if(mobile.length!==5||mobile.some(x=>x.right>392||x.left<0))throw Error('Mobile tabs overflow viewport');
  await page.locator('#nav').screenshot({path:'/tmp/fleet-tabs-mobile.png'});
  await page.locator('#nav [data-view="data"]').click();
  if(!await page.locator('#app').innerText().then(t=>t.includes('BACKUP / RESTORE')))throw Error('Mobile import tab does not render');
  console.log('BROWSER_ERRORS', JSON.stringify(errors.slice(0, 8)));
} catch(error) {
  console.log('BROWSER_ERRORS', JSON.stringify(errors.slice(0, 12)));
  throw error;
} finally {
  await browser.close();
}
