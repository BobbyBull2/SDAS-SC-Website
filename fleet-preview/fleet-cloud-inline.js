/* Cloud bridge: inserted into the legacy script for access to its existing UI functions. */
(function(){
 // This bridge may be embedded by an older preview and a deployment wrapper.
 // Initialize once so it cannot create duplicate buttons, listeners or cloud clients.
 if(window.__sdasFleetCloudBridgeInstalled)return;
 window.__sdasFleetCloudBridgeInstalled=true;
 const SUPA="https://zfvfpbfkbvudaezichrh.supabase.co";
 const PUB="sb_publishable_n10yR_G-0OOmFWjHdrb8Yw_8lJfs8io";
 let client=null,user=null,ready=false,busy=false,again=false,known=new Set(),booting=false;
 const legacy=clone(db);
 const label=document.createElement("div");label.id="cloudBanner";
 label.style.cssText="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";label.setAttribute("role","status");label.setAttribute("aria-live","polite");
 label.textContent="FLEET CLOUD // Demo records remain local until verified login.";
 document.querySelector(".header")?.after(label);
 const status=t=>{label.textContent="FLEET CLOUD // "+t};
 const summary=s=>({id:s.id,owner_id:user.id,model_name:String(s.name||"Unknown ship").slice(0,150),nickname:s.nickname||null,ownership:({"Pledged":"pledged","aUEC":"auec","Loaner":"loaner","Other":"other"})[s.origin]||"other",role:s.role||null,paint:s.paint||null,notes:s.notes||null,org_visible:s.visibility==="org",show_loadout:s.visibility==="org"});
 const fromRow=(r,photos)=>({id:r.id,owner:r.owner_id,name:r.model_name,nickname:r.nickname||"",origin:({"pledged":"Pledged","auec":"aUEC","loaner":"Loaner","other":"Other"})[r.ownership]||"Other",role:r.role||"Other",visibility:r.org_visible?"org":"private",paint:r.paint||"",notes:r.notes||"",image:photos[r.id]||"",loadout:{}});
 async function loadCloud(){
  const {data:{user:u}}=await client.auth.getUser();if(!u)return;
  const {data:m}=await client.from("sdas_memberships").select("role").eq("user_id",u.id).maybeSingle();
  if(!m){status("Sign in and verify SDAS membership to load shared fleets.");return;}
  user=u;booting=true;
  try{
   const [profiles,ships,loadouts,photos]=await Promise.all([
    client.from("pilot_profiles").select("user_id,display_name,rsi_handle"),
    client.from("preview_fleet_ships").select("*").order("created_at",{ascending:true}),
    client.from("preview_ship_loadouts").select("ship_id,components,name"),
    client.from("preview_ship_photos").select("ship_id,object_path")
   ]);
   for(const res of [profiles,ships,loadouts,photos])if(res.error)throw res.error;
   const photoMap={};
   for(const p of photos.data||[]){const {data:sign}=await client.storage.from("fleet-preview-photos").createSignedUrl(p.object_path,3600);if(sign?.signedUrl)photoMap[p.ship_id]=sign.signedUrl;}
   db={members:(profiles.data||[]).map(p=>({id:p.user_id,name:p.display_name,handle:p.rsi_handle||"",role:"Member"})),ships:(ships.data||[]).map(s=>fromRow(s,photoMap))};
   // Other ship owners may not have a visible pilot_profiles row due to missing
   // profile setup or read permissions. Keep their ships visible and show a
   // truthful, readable fallback instead of the legacy 'Unknown member' label.
   for(const ownerId of new Set(db.ships.map(s=>s.owner).filter(Boolean))){
     if(!db.members.some(m=>String(m.id)===String(ownerId)))
       db.members.push({id:ownerId,name:"Pilot profile unavailable",handle:"",role:"Member"});
   }
   if(!db.members.find(m=>m.id===u.id))db.members.push({id:u.id,name:u.user_metadata?.full_name||"Pilot",handle:"",role:"Member"});
   for(const l of loadouts.data||[]){const ship=db.ships.find(s=>s.id===l.ship_id);if(ship)ship.loadout=l.components||{};}
   current=u.id;known=new Set(db.ships.filter(s=>s.owner===current).map(s=>s.id));ready=true;
   const selector=document.querySelector("#pilotSelect");selector.value=current;selector.disabled=true;selector.style.display="none";
   const demoOptions=document.querySelector("#pilotSelect");if(demoOptions?.parentElement)demoOptions.parentElement.style.opacity=".5";
   window.sdasCloudActive=true;
   selected=null;render();
   status("Connected as "+who(current).name+" • "+known.size+" owned vessels • shared registry live. Changes sync to Supabase.");
  }catch(e){status("Could not load fleet: "+e.message+" (local demo retained)");}
  finally{booting=false;}
 }
 async function uploadPhoto(ship){
   if(!ship.image?.startsWith("data:image/"))return;
   const source=await fetch(ship.image).then(r=>r.blob());
   const picture=await createImageBitmap(source);
   const ratio=Math.min(1,1600/Math.max(picture.width,picture.height));
   const canvas=document.createElement("canvas");
   canvas.width=Math.round(picture.width*ratio);canvas.height=Math.round(picture.height*ratio);
   canvas.getContext("2d").drawImage(picture,0,0,canvas.width,canvas.height);picture.close();
   const b=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",.75));
   if(!b||b.size>2097152)throw Error("Image exceeds 2 MB after compression.");
   const path=user.id+"/preview/"+ship.id+"/"+Date.now()+".jpg";
   const up=await client.storage.from("fleet-preview-photos").upload(path,b,{contentType:"image/jpeg",upsert:false});
   if(up.error)throw up.error;
   const old=await client.from("preview_ship_photos").select("id,object_path").eq("ship_id",ship.id);
   if(old.error)throw old.error;
   const ins=await client.from("preview_ship_photos").insert({ship_id:ship.id,object_path:path});
   if(ins.error)throw ins.error;
   for(const x of old.data||[]){await client.from("preview_ship_photos").delete().eq("id",x.id);await client.storage.from("fleet-preview-photos").remove([x.object_path]);}
   const {data:sign}=await client.storage.from("fleet-preview-photos").createSignedUrl(path,3600);
   if(sign?.signedUrl)ship.image=sign.signedUrl;
 }
 async function sync(){
  if(!ready||!user||booting)return;
  if(busy){again=true;return;}
  busy=true;status("Saving fleet…");
  try{
   const owned=db.ships.filter(s=>s.owner===user.id);
   const ids=new Set(owned.map(s=>s.id));
   const removed=[...known].filter(id=>!ids.has(id));
   for(const id of removed){const r=await client.from("preview_fleet_ships").delete().eq("id",id).eq("owner_id",user.id);if(r.error)throw r.error;}
   for(const s of owned){
     const r=await client.from("preview_fleet_ships").upsert(summary(s),{onConflict:"id"});if(r.error)throw r.error;
     const l=await client.from("preview_ship_loadouts").upsert({ship_id:s.id,name:"Current",components:s.loadout||{}},{onConflict:"ship_id,name"});if(l.error)throw l.error;
     if(s.image?.startsWith("data:image/"))await uploadPhoto(s);
   }
   known=ids;status("Saved to Supabase • "+owned.length+" personal ships. Other members can see org-shared ships.");
  }catch(e){status("Save failed: "+e.message+". Please export a JSON backup before leaving.");}
  finally{busy=false;if(again){again=false;sync();}}
 }
 window.sdasImportRsiHangar=async records=>{
  if(!ready||!user||busy)throw Error("Cloud hangar must be connected and idle.");
  const existing=new Set(db.ships.filter(s=>s.owner===user.id).map(s=>String(s.name||"").trim().toLowerCase()+"|"+String(s.nickname||"").trim().toLowerCase()));
  let added=0;
  for(const row of records){
    const name=String(row.name||"").trim().slice(0,150);if(!name)continue;
    const nickname=String(row.nickname||"").trim().slice(0,100);
    const fingerprint=name.toLowerCase()+"|"+nickname.toLowerCase();
    const qty=Math.max(1,Math.min(50,Number(row.qty)||1));
    for(let i=0;i<qty;i++){
      if(existing.has(fingerprint)&&qty===1)continue;
      db.ships.push({id:crypto.randomUUID(),owner:user.id,name,nickname,origin:"Pledged",role:"Other",visibility:"private",paint:"",notes:"RSI hangar import"+(row.insurance?" | Insurance: "+row.insurance:""),image:"",loadout:{}});
      existing.add(fingerprint);added++;
    }
  }
  if(added){render();await sync();}
  return added;
 };
 window.sdasImportAsopShips=async records=>{
  if(!ready||!user||busy)throw Error("Cloud hangar must be connected and idle.");
  const existing=new Set(db.ships.filter(s=>s.owner===user.id&&s.origin==="aUEC").map(s=>String(s.name||"").trim().toLowerCase()));
  let added=0;
  for(const row of records){
    const name=String(row.name||"").trim().slice(0,150);
    if(name.length<3||existing.has(name.toLowerCase()))continue;
    db.ships.push({id:crypto.randomUUID(),owner:user.id,name,nickname:"",origin:"aUEC",role:"Other",visibility:"private",paint:"",notes:"ASOP screenshot import (owner-confirmed aUEC)",image:"",loadout:{}});
    existing.add(name.toLowerCase());added++;
  }
  if(added){render();await sync();}
  return added;
 };
 // Remove duplicate legacy cloud commands only when they share the same command strip.
 // Retain the first actual control and its listener; don't touch controls in other views.
 const commandLabels=new Set(["IMPORT MY EXISTING LOCAL SHIPS","REFRESH ORG FLEET","EDIT PILOT NAME"]);
 function dedupeCloudCommands(){
   const controls=[...document.querySelectorAll("button")].filter(b=>commandLabels.has((b.textContent||"").trim().toUpperCase()) && !b.closest("#sdas-golden-live"));
   const groups=new Map();
   for(const b of controls){
     const group=b.closest(".header")||b.parentElement;
     if(!group)continue;
     const key=(b.textContent||"").trim().toUpperCase();
     if(!groups.has(group))groups.set(group,new Set());
     const seen=groups.get(group);
     if(seen.has(key))b.remove();else seen.add(key);
   }
 }
 const nameButton=document.createElement("button");
 nameButton.type="button";nameButton.className="btn";nameButton.style.margin="8px";nameButton.textContent="EDIT PILOT NAME";label.after(nameButton);
 nameButton.onclick=async()=>{
  if(!ready||!user)return alert("Sign in and verify SDAS membership first.");
  const me=db.members.find(m=>m.id===user.id);
  const next=prompt("Choose your SDAS pilot display name (3–40 characters):",me?.name||"");
  if(next===null)return;
  const name=next.trim();
  if(name.length<3||name.length>40)return alert("Display name must be 3–40 characters.");
  const {error}=await client.from("pilot_profiles").update({display_name:name}).eq("user_id",user.id);
  if(error)return alert("Could not update display name: "+error.message);
  if(me)me.name=name;
  render();status("Pilot display name updated to "+name+". Discord sign-in is unchanged.");
 };
 window.sdasCloudQueueSave=()=>{if(ready)sync()};
 window.addEventListener("sdas-auth-ready",()=>{loadCloud()});
 const back=document.createElement("button");back.textContent="IMPORT MY EXISTING LOCAL SHIPS";back.className="btn";back.style.margin="8px 0";label.after(back);
 const refresh=document.createElement("button");refresh.textContent="REFRESH ORG FLEET";refresh.className="btn";refresh.style.margin="8px";back.after(refresh);
 refresh.onclick=async()=>{if(!ready||busy)return;await loadCloud();};
 dedupeCloudCommands();
 back.onclick=async()=>{
   if(!ready)return alert("Verify SDAS login first.");
   const records=legacy.ships.filter(s=>s.owner==="bobby");
   if(!records.length)return alert("No local Bobby demo ships to import.");
   if(!confirm("Import "+records.length+" local Bobby ships into YOUR cloud hangar? They may include demo examples. Existing cloud ships will be kept."))return;
   const existing=new Set(db.ships.filter(s=>s.owner===user.id).map(s=>String(s.name).toLowerCase()+"|"+String(s.nickname||"").toLowerCase()));
   for(const s of records){const fingerprint=String(s.name).toLowerCase()+"|"+String(s.nickname||"").toLowerCase();if(existing.has(fingerprint))continue;db.ships.push({...clone(s),id:crypto.randomUUID(),owner:user.id,visibility:"private"});existing.add(fingerprint);}
   render();sync();back.disabled=true;back.textContent="LOCAL IMPORT REQUESTED";
 };

 // Golden ratio live dashboard. Ship names/counts come exclusively from verified fleet data.
 (function(){
 const style=document.createElement("style");style.id="sdas-golden-live-css";
 style.textContent=`
 #sdas-golden-live{display:grid;grid-template-columns:minmax(0,1.618fr) minmax(290px,1fr);gap:15px;width:100%;margin:14px 0 28px;color:#d7eaf2;font:13px 'Barlow',Arial,sans-serif}
 #sdas-golden-live *{box-sizing:border-box}
 #sdas-golden-live .gbox{background:linear-gradient(145deg,#07202bec,#03131dec);border:1px solid #4bc6dc;border-radius:18px;box-shadow:inset 0 1px #91e9f725,0 8px 28px #0009;min-width:0;overflow:hidden}
 #sdas-golden-live .gmain{padding:21px 21px 14px;border-radius:33px 18px 29px 18px}
 #sdas-golden-live h2,#sdas-golden-live h3{font-family:'Audiowide',sans-serif;font-weight:400;letter-spacing:.085em;text-transform:uppercase;margin:0 0 12px}
 #sdas-golden-live h2{font-size:clamp(20px,2vw,33px);color:#e8f4fa}
 #sdas-golden-live h2 span{color:#e3c489}
 #sdas-golden-live h3{font-size:15px;color:#e6f3f8}
 #sdas-golden-live .gmuted{color:#9ec6d4;font-size:12px;line-height:1.6}
 #sdas-golden-live .ghead{display:flex;align-items:start;justify-content:space-between;gap:12px;margin-bottom:15px}
 #sdas-golden-live .gtag{font-size:10px;letter-spacing:.17em;color:#69cce3;margin-bottom:8px}
 #sdas-golden-live .gconnected{color:#83e8b2;font-size:11px;white-space:nowrap}
 #sdas-golden-live .gconnected:before{content:"";display:inline-block;vertical-align:middle;margin-right:8px;border-radius:50%;background:#59edaa;width:8px;height:8px;box-shadow:0 0 9px #59edaa9a}
 #sdas-golden-live .gtablewrap{overflow-x:auto}
 #sdas-golden-live table{border-collapse:collapse;width:100%;min-width:560px;font-size:12px}
 #sdas-golden-live th{color:#8ebbcf;text-align:left;letter-spacing:.12em;font-size:10px;font-weight:600;padding:14px 8px;border-bottom:1px solid #32667b}
 #sdas-golden-live td{padding:10px 8px;border-bottom:1px solid #194457a8;color:#d4e6ea}
 #sdas-golden-live .gship{font-weight:600;color:#f2f6f7}
 #sdas-golden-live .gsmall{font-size:10px;color:#81bcce}
 #sdas-golden-live .gship-img{width:58px;height:38px;object-fit:cover;border-radius:5px;border:1px solid #2c6878;margin-right:8px;vertical-align:middle}
 #sdas-golden-live .gbtn{padding:8px 12px;background:#082b3e;border:1px solid #378ba2;border-radius:8px;color:#b7ebf4;cursor:pointer;min-width:0}
 #sdas-golden-live .gbtn:hover{color:#ebc57b;border-color:#ebc57b}
 #sdas-golden-live .gfoot{display:flex;justify-content:space-between;align-items:center;gap:8px;border-top:1px solid #24576c;margin-top:11px;padding-top:13px;color:#9cbecc;font-size:11px}
 #sdas-golden-live .gside{display:flex;flex-direction:column;gap:12px}
 #sdas-golden-live .gside .gbox{padding:19px 20px;flex:1;position:relative}
 #sdas-golden-live .gside .gbox:after{content:"";position:absolute;pointer-events:none;top:-40px;right:-40px;width:95px;height:95px;border:1px solid #e3c48948;border-radius:50%}
 #sdas-golden-live .gside .gbox:nth-child(2){border-color:#af945e}
 #sdas-golden-live .gsync{display:flex;align-items:center;gap:18px}
 #sdas-golden-live .gorb{width:78px;height:78px;border-radius:50%;border:4px solid #4bd6a1;box-shadow:0 0 15px #4bd6a15d,inset 0 0 12px #4bd6a12b;display:grid;place-items:center;color:#83f6c5;font-size:30px;flex:none}
 #sdas-golden-live .gstate{color:#75ecaa;letter-spacing:.15em;text-transform:uppercase;font-weight:bold;font-size:16px;margin:4px 0}
 #sdas-golden-live .gactions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
 #sdas-golden-live .gactions button{min-height:55px;font-size:11px}
 #sdas-golden-live .gactions button:first-child{color:#e8ca82;border-color:#debd6b}
 #sdas-golden-live .grole{display:flex;gap:12px;align-items:center;line-height:1.6}
 #sdas-golden-live .gshield{border:1px solid #47b6cf;border-radius:8px;padding:12px;color:#70d8eb;font-size:22px}
 @media(max-width:970px){#sdas-golden-live{grid-template-columns:1fr}#sdas-golden-live .gside{display:grid;grid-template-columns:1fr 1fr}#sdas-golden-live .gside .gbox:last-child{grid-column:1/-1}}
 @media(max-width:650px){#sdas-golden-live .gside{display:flex}#sdas-golden-live .gmain{padding:14px 12px}#sdas-golden-live .ghead{flex-direction:column}}
 `;document.head.append(style);
 const e=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n};
 const add=(p,...nodes)=>{p.append(...nodes);return p};
 const realButton=(name,pattern)=>{const b=e("button","gbtn",name);b.type="button";b.onclick=()=>{
  const options=[...document.querySelectorAll("button")].filter(x=>!x.closest("#sdas-golden-live")&&pattern.test((x.textContent||"").trim())&&!x.disabled);
  (options.find(x=>x.offsetParent!==null)||options[0])?.click();
 };return b;};
 let last="";
 let hiddenOriginal=null;
 function draw(){
  // The legacy app replaces #app contents on tab switches. Never conceal non-terminal views.
  const active=[...document.querySelectorAll("#nav button,.nav button")].find(b=>b.classList.contains("active"));
  const currentTab=(active?.textContent||"").trim().toUpperCase();
  const terminalTab=!currentTab||/^(TERMINAL|⌂ TERMINAL|< TERMINAL)/.test(currentTab)||currentTab.endsWith(" TERMINAL");
  if(!terminalTab){
    if(hiddenOriginal?.isConnected)hiddenOriginal.style.display="";
    hiddenOriginal=null;
    document.getElementById("sdas-golden-live")?.remove();
    last="";
    return;
  }
  const heading=[...document.querySelectorAll("h1,h2,h3")].find(x=>/ACCESS FLEET TERMINAL/i.test(x.textContent||""));
  if(!heading){
    if(hiddenOriginal?.isConnected)hiddenOriginal.style.display="";
    hiddenOriginal=null;
    document.getElementById("sdas-golden-live")?.remove();
    last="";
    return;
  }
  const original=heading.closest(".hero,.welcome,.terminal-intro,section,article,.panel")||heading.parentElement?.parentElement;
  if(!original||!original.parentElement)return;
  if(hiddenOriginal&&hiddenOriginal!==original&&hiddenOriginal.isConnected)hiddenOriginal.style.display="";
  hiddenOriginal=original;
  const owned=ready&&user?db.ships.filter(x=>x.owner===user.id):[];
  const org=ready&&user?db.ships.filter(x=>x.visibility==="org"):[];
  const role=document.querySelector("#sdas-auth-state")?.textContent?.trim()||"Discord role verification required";
  const digest=JSON.stringify([!!ready,user?.id,owned.map(x=>[x.id,x.name,x.role,x.visibility]),org.length,role]);
  const existing=document.getElementById("sdas-golden-live");
  if(existing&&digest===last){original.style.display="none";return;}
  last=digest;existing?.remove();
  const root=e("section");root.id="sdas-golden-live";root.setAttribute("aria-label","Fleet overview");
  const main=e("div","gbox gmain"),head=e("div","ghead"),intro=e("div");
  intro.append(e("div","gtag","SDAS // SECURE FLEET OPERATIONS"));
  const title=e("h2");title.append("FLEET ",e("span","","OVERVIEW"));intro.append(title);
  intro.append(e("div","gmuted",ready?"Connected as "+(db.members.find(x=>x.id===user.id)?.name||"SDAS pilot")+" • "+owned.length+" owned vessels • shared registry live":"Sign in with Discord to view your verified fleet"));
  add(head,intro,e("div","gconnected",ready?"FLEET CLOUD ONLINE":"SIGN-IN REQUIRED"));main.append(head);
  const wrap=e("div","gtablewrap"),tbl=e("table"),hr=e("tr");
  ["SHIP NAME","MANUFACTURER","ROLE","OWNERSHIP","SHARED","OPEN"].forEach(t=>hr.append(e("th","",t)));
  tbl.append(add(e("thead"),hr));const body=e("tbody");
  if(!owned.length){const tr=e("tr"),td=e("td","",ready?"No personal vessels have been added yet.":"Your ships appear after Discord sign-in.");td.colSpan=6;tr.append(td);body.append(tr);}
  for(const s of owned){
    const tr=e("tr"),td=e("td","gship");
    // Overview is a text-only quick reference: show the model name, never a nickname or photograph.
    td.textContent=s.name||"Unnamed ship";tr.append(td);
    const manufacturer=/^(RSI|Drake|Anvil|Aegis|MISC|Origin|Argo|Crusader|Mirai|Esperia|Tumbril|Gatac|Banu)\b/i.exec(s.name||"")?.[1]||"—";
    [manufacturer,s.role||"—",s.origin||"—",s.visibility==="org"?"Org shared":"Private"].forEach(t=>tr.append(e("td","",t)));
    tr.append(add(e("td"),realButton("MY HANGAR →",/^MY HANGAR$/i)));body.append(tr);
  }
  tbl.append(body);wrap.append(tbl);main.append(wrap);
  add(main,add(e("div","gfoot"),e("span","",owned.length+" personal • "+org.length+" org-shared vessels"),realButton("OPEN MY HANGAR →",/^MY HANGAR$/i)));
  const aside=e("aside","gside"),sync=e("section","gbox");
  add(sync,e("h3","","SYNC STATUS"),add(e("div","gsync"),e("div","gorb",ready?"☁":"↻"),add(e("div"),e("div","gtag","FLEET CLOUD"),e("div","gstate",ready?"CONNECTED":"OFFLINE"),e("div","gmuted",ready?owned.length+" personal vessels loaded":"Verify your Discord membership"))));
  const action=e("section","gbox");action.append(e("h3","","QUICK ACTIONS"));
  add(action,add(e("div","gactions"),realButton("↓ IMPORT",/^DATA\s*\/\s*IMPORT$/i),realButton("↻ REFRESH FLEET",/^REFRESH ORG FLEET$/i),realButton("♙ REFRESH ROLES",/^(REFRESH|VERIFY) SDAS ROLES$/i),realButton("⇥ SIGN OUT",/^SIGN OUT$/i)));
  const access=e("section","gbox");access.append(e("h3","","ROLE ACCESS"));
  access.append(add(e("div","grole"),e("div","gshield","♢"),e("div","",role)));
  add(aside,sync,action,access);add(root,main,aside);
  original.insertAdjacentElement("beforebegin",root);original.style.display="none";
 }
 let pending=false;
 const refresh=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;draw()})};
 const init=()=>{new MutationObserver(refresh).observe(document.body,{childList:true,subtree:true});document.addEventListener("click",refresh,true);refresh()};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
 window.sdasGoldenRefresh=refresh;
 })();
 import("https://esm.sh/@supabase/supabase-js@2").then(async mod=>{
   client=mod.createClient(SUPA,PUB,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
   await loadCloud();
   client.auth.onAuthStateChange(()=>{setTimeout(()=>{if(!ready)loadCloud()},400)});
 }).catch(e=>status("Connection module unavailable: "+e.message));
})();
