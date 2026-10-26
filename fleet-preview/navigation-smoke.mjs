import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.stack || error.message));
page.on('console', msg => {
  if (msg.type() === 'error') errors.push('console: ' + msg.text().slice(0, 350));
});
try {
  // External read-only live-site diagnostic from GitHub's network. Never
  // modifies production, never logs in, and doesn't fail preview smoke tests.
  for(const url of [
    'https://sdas.space/',
    'https://sdas.space/SDFM/',
    'https://sdas-sc-website.pages.dev/SDFM/'
  ]){
    const live=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
      userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1'});
    const failures=[];
    live.on('pageerror',e=>failures.push('JS '+e.message));
    live.on('requestfailed',r=>failures.push('NETWORK '+r.url().slice(0,130)+' '+r.failure()?.errorText));
    live.on('console',m=>{if(m.type()==='error')failures.push('CONSOLE '+m.text().slice(0,180))});
    try{
      const response=await live.goto(url,{waitUntil:'domcontentloaded',timeout:18000});
      await live.waitForTimeout(3500);
      const snapshot=await live.evaluate(()=>({
        url:location.href,title:document.title,text:document.body?.innerText?.slice(0,350)||'',
        bodyChildren:document.body?.children.length||0,
        signin:!!document.getElementById('sdas-live-signin-card'),
        signinVisible:document.getElementById('sdas-live-signin-card')?
          getComputedStyle(document.getElementById('sdas-live-signin-card')).display:null,
        cloudStatus:window.sdasFleetCloudStatus||null,
        scripts:[...document.querySelectorAll('script[src]')].map(s=>s.src).slice(-8)
      }));
      console.log('LIVE_SDFM_DIAGNOSTIC',url,'http',response?.status(),JSON.stringify(snapshot),'errors',JSON.stringify(failures.slice(0,10)));
    }catch(error){
      console.log('LIVE_SDFM_DIAGNOSTIC_ERROR',url,String(error).slice(0,300),'errors',JSON.stringify(failures.slice(0,8)));
    }finally{await live.close();}
  }
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
  // Signed-in/expired-member simulation: a denied read must be a recovery
  // state, not an empty table. Unsigned preview visitors retain demo navigation.
  await page.evaluate(()=>{
    window.sdasFleetLoginState={signedIn:true,verified:false,reason:"Fleet access requires verification"};
    window.dispatchEvent(new Event("sdas-fleet-auth-state"));
  });
  await page.waitForTimeout(100);
  const expiredView=await page.evaluate(()=>({
    blocked:document.documentElement.classList.contains("sdas-preview-verification-needed"),
    appHidden:getComputedStyle(document.querySelector("#app")).display==="none",
    banner:document.querySelector("#sdas-preview-recovery")?.innerText,
    button:document.querySelector("#sdas-preview-recover-button")?.textContent
  }));
  console.log("SESSION_EXPIRED_VIEW",JSON.stringify(expiredView));
  if(!expiredView.blocked||!expiredView.appHidden||
     !expiredView.banner?.includes("Fleet access requires verification")||
     !/REFRESH SDAS ROLES|RECONNECT DISCORD/.test(expiredView.button||""))
     throw Error("Expired verification renders misleading fleet state: "+JSON.stringify(expiredView));
  await page.evaluate(()=>{
    window.sdasFleetLoginState={signedIn:false,verified:false,reason:"Sign in with Discord"};
    window.dispatchEvent(new Event("sdas-fleet-auth-state"));
  });
  const resumed=await page.evaluate(()=>({
    blocked:document.documentElement.classList.contains("sdas-preview-verification-needed"),
    appVisible:getComputedStyle(document.querySelector("#app")).display!=="none"
  }));
  if(resumed.blocked||!resumed.appVisible)
    throw Error("Recovered preview doesn't restore navigation: "+JSON.stringify(resumed));

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
    if (tab === 'data') {
      const dataDOM = await page.evaluate(() => {
        const app=document.getElementById('app'),root=app.querySelector('.layout');
        const brief=el=>{ if(!el)return null;const r=el.getBoundingClientRect();return {
          tag:el.tagName,id:el.id,className:el.className,
          head:el.innerText?.replace(/\\s+/g,' ').slice(0,120),width:Math.round(r.width),
          height:Math.round(r.height),childCount:el.children.length,
          parent:el.parentElement?.tagName+':'+el.parentElement?.className
        }};
        return {appChildren:[...app.children].map(brief),layout:brief(root),
          layoutChildren:[...(root?.children||[])].map(brief),
          rsi:brief(document.getElementById('sdas-rsi-import-host')),
          dataHead:app.innerHTML.slice(0,2300)};
      });
      console.log('IMPORT_LAYOUT_AUDIT',JSON.stringify(dataDOM));
    }
    if (tab === 'data') {
      const cards = await page.evaluate(() => {
        const grid=document.querySelector('#app .sdas-import-columns');
        const panels=[...(grid?.children||[])];
        return {count:panels.length,
          headings:panels.map(e=>e.querySelector('h3')?.textContent?.trim()),
          widths:panels.map(e=>Math.round(e.getBoundingClientRect().width)),
          display:grid?getComputedStyle(grid).display:null,
          demo:document.querySelector('#app')?.innerText.includes('MEMBER PROFILES (DEMO)'),
          hasRsiFile:!!document.querySelector('#sdas-rsi-file'),
          hasBackup:document.querySelector('#app')?.innerText.includes('BACKUP / RESTORE')};
      });
      console.log('IMPORT_CARDS',JSON.stringify(cards));
      if(cards.count!==3||cards.display!=='grid'||cards.demo||!cards.hasRsiFile||!cards.hasBackup||
        Math.max(...cards.widths)-Math.min(...cards.widths)>3)
        throw Error('Data Import three-card layout failed: '+JSON.stringify(cards));
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
  const homeIconDebug = await page.evaluate(() => {
    const button = document.querySelector('#nav button[data-view="home"]');
    if (!button) return null;
    return {html:button.innerHTML.slice(0,1300),
      childNodes:[...button.childNodes].map(n=>({type:n.nodeType,name:n.nodeName,text:n.textContent?.slice(0,150),html:n.outerHTML?.slice(0,280)})),
      before:getComputedStyle(button,'::before').content,
      after:getComputedStyle(button,'::after').content,
      text:button.textContent};
  });
  console.log('HOME_ICON_DEBUG',JSON.stringify(homeIconDebug));
  if(homeIconDebug?.text?.includes('⌂')) throw Error('Legacy home glyph still visible: '+JSON.stringify(homeIconDebug));
  if(headerCheck.logoTop > headerCheck.mastTop + 95) throw Error('SDAS emblem still too low: '+JSON.stringify(headerCheck));
  const titlePosition = await page.evaluate(() => {
    const mast=document.getElementById('sdas-fleet-masthead');
    const title=mast?.querySelector('.fleet-title.fleet-gold');
    const kicker=mast?.querySelector('.fleet-kicker');
    const logo=mast?.querySelector('.fleet-emblem');
    return {titleTop:title?.getBoundingClientRect().top,
      kickerTop:kicker?.getBoundingClientRect().top,
      logoTop:logo?.getBoundingClientRect().top,
      logoBottom:logo?.getBoundingClientRect().bottom};
  });
  console.log('HERO_POSITION',JSON.stringify(titlePosition));
  const wordmark = await page.evaluate(() => {
    const h=document.querySelector('#sdas-fleet-masthead .fleet-title.fleet-gold');
    const and=h?.querySelector('.fleet-and-inline');
    const mast=document.querySelector('#sdas-fleet-masthead');
    const r=h?.getBoundingClientRect(), m=mast?.getBoundingClientRect();
    const a=and?getComputedStyle(and):null;
    return {text:h?.textContent?.replace(/\\s+/g,' ').trim(),parts:h?.querySelectorAll('.fleet-title-part').length,
      white:a?.webkitTextFillColor,ratio:and&&h?parseFloat(a.fontSize)/parseFloat(getComputedStyle(h).fontSize):0,
      right:r?.right,mastRight:m?.right,bottom:r?.bottom,mastBottom:m?.bottom};
  });
  console.log('WORDMARK_CHECK',JSON.stringify(wordmark));
  const kickerAlignment = await page.evaluate(() => {
    const kicker=document.querySelector('#sdas-fleet-masthead .fleet-kicker');
    const word=document.querySelector('#sdas-fleet-masthead .fleet-title.fleet-gold .fleet-title-part');
    return {kickerLeft:kicker?.getBoundingClientRect().left,wordLeft:word?.getBoundingClientRect().left};
  });
  console.log("KICKER_ALIGNMENT",JSON.stringify(kickerAlignment));
  const layoutDebug=await page.evaluate(()=>{
    const mast=document.getElementById("sdas-fleet-masthead"),k=mast?.querySelector(".fleet-kicker"),
      w=mast?.querySelector(".fleet-title.fleet-gold"),part=w?.querySelector(".fleet-title-part");
    const rect=x=>{const r=x?.getBoundingClientRect();return r&&{left:r.left,right:r.right,top:r.top,width:r.width}};
    const style=x=>{const s=getComputedStyle(x);return {left:s.left,right:s.right,top:s.top,bottom:s.bottom,position:s.position,
      transform:s.transform,fontSize:s.fontSize,display:s.display}};
    return {mast:rect(mast),k:rect(k),w:rect(w),part:rect(part),ks:style(k),ws:style(w),
      varValue:mast?.style.getPropertyValue("--fleet-wordmark-left"),kParent:k?.parentElement?.id,
      viewport:innerWidth};
  });
  console.log("KICKER_DEBUG",JSON.stringify(layoutDebug));
  if(Math.abs(kickerAlignment.kickerLeft-kickerAlignment.wordLeft)>5)
    throw Error("Community kicker does not align with SOME: "+JSON.stringify(kickerAlignment));

  if(wordmark.text!=='SOME DUDES and a FLEET MANAGER'||wordmark.parts!==2||
    wordmark.ratio<.45||wordmark.ratio>.55||wordmark.right>wordmark.mastRight+2||
    wordmark.bottom>wordmark.mastBottom+3)throw Error('Wordmark not correctly sized or contained: '+JSON.stringify(wordmark));

  if(titlePosition.titleTop < titlePosition.logoTop + 45)
    throw Error('Title was not lowered as requested: '+JSON.stringify(titlePosition));

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
  await page.locator('#nav [data-view="registry"]').click();
  await page.waitForTimeout(500);
  const registryMobile = await page.evaluate(() => {
    const table=document.querySelector('#app .sdas-registry-mobile');
    const row=table?.querySelector('tbody tr');
    const cell=row?.querySelector('td');
    return {hasTable:!!table, rowDisplay:row?getComputedStyle(row).display:null,
      columns:row?getComputedStyle(row).gridTemplateColumns:null,
      label:cell?.getAttribute('data-label')||null,
      overflow:document.documentElement.scrollWidth>innerWidth+4};
  });
  console.log("REGISTRY_MOBILE",JSON.stringify(registryMobile));
  if(!registryMobile.hasTable||registryMobile.rowDisplay!=='grid'||!registryMobile.label||registryMobile.overflow)
    throw Error("Mobile registry cards not usable: "+JSON.stringify(registryMobile));
  // Inspect real pilot profile markup and font sizes before choosing responsive rules.
  await page.locator('#nav [data-view="pilots"]').click();
  await page.waitForTimeout(400);
  const pilotDOM = await page.evaluate(() => {
    const app=document.getElementById('app');
    const tables=[...app.querySelectorAll('table')].map(t => ({
      cls:t.className,outer:t.outerHTML.slice(0,1900),
      parent:t.parentElement?.outerHTML.slice(0,200),
      style:{width:Math.round(t.getBoundingClientRect().width),minWidth:getComputedStyle(t).minWidth}
    }));
    const btns=[...app.querySelectorAll('button')].map(b=>({text:b.textContent.slice(0,45),cls:b.className})).slice(0,18);
    const headings=[...app.querySelectorAll('h2,h3,h4')].map(h=>({text:h.textContent.slice(0,50),parent:h.parentElement?.className})).slice(0,16);
    return {tables,btns,headings, appHead:app.innerHTML.slice(0,1000)};
  });
  console.log('PILOT_DOM_AUDIT',JSON.stringify(pilotDOM));
  // Also inspect active smallest text treatments (not static font declarations).
  await page.locator('#nav [data-view="home"]').click();
  await page.waitForTimeout(250);
  const fontAudit=await page.evaluate(()=>{
    const root=document.querySelector('#sdas-golden-live');
    return [...root.querySelectorAll('.gbtn,.gmuted,.gtag,.gsmall,.gconnected,th,td,.gfoot,.gstate')]
      .slice(0,22).map(e=>({sel:e.className||e.tagName,text:e.textContent.trim().slice(0,32),
      size:getComputedStyle(e).fontSize,letterSpacing:getComputedStyle(e).letterSpacing}));
  });
  console.log('FONT_AUDIT',JSON.stringify(fontAudit));
  await page.locator('#nav [data-view="pilots"]').click();
  await page.waitForTimeout(400);
  const pilotCards = await page.evaluate(() => {
    const table=document.querySelector('#app .sdas-pilot-ships-mobile');
    const row=table?.querySelector('tbody tr');
    const cells=[...(row?.querySelectorAll('td')||[])];
    return {found:!!table,display:row?getComputedStyle(row).display:null,
      labels:cells.map(c=>c.getAttribute('data-label')),
      widths:cells.map(c=>Math.round(c.getBoundingClientRect().width)),
      wordBreak:cells.map(c=>getComputedStyle(c).wordBreak),
      overflow:document.documentElement.scrollWidth>innerWidth+4};
  });
  console.log('PILOT_MOBILE_CARDS',JSON.stringify(pilotCards));
  if(!pilotCards.found||pilotCards.display!=='grid'||pilotCards.labels[0]!=='SHIP'||
    pilotCards.wordBreak.some(x=>x==='break-all')||pilotCards.overflow)
    throw Error('Pilot Profile mobile layout is broken: '+JSON.stringify(pilotCards));
  await page.locator('#nav [data-view="home"]').click();
  await page.waitForTimeout(400);
  const actionFonts=await page.locator('#sdas-golden-live .gactions .gbtn').evaluateAll(btns=>
    btns.map(b=>parseFloat(getComputedStyle(b).fontSize)));
  console.log('QUICK_ACTION_FONTS',JSON.stringify(actionFonts));
  if(actionFonts.length!==4||actionFonts.some(x=>x<13))
    throw Error('Quick Action labels remain too small: '+JSON.stringify(actionFonts));
  await page.locator('#nav [data-view="data"]').click();
  if(!await page.locator('#app').innerText().then(t=>t.includes('BACKUP / RESTORE')))throw Error('Mobile import tab does not render');
  console.log('BROWSER_ERRORS', JSON.stringify(errors.slice(0, 8)));
} catch(error) {
  console.log('BROWSER_ERRORS', JSON.stringify(errors.slice(0, 12)));
  throw error;
} finally {
  await browser.close();
}
