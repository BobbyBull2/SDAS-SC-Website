/* RSI hangar file importer: never requests RSI credentials or sessions. */
(()=>{
const EXT="https://chromewebstore.google.com/detail/star-citizen-hangar-xplor/hmiiohicemghafoicmmlfklnngmcinnm";
const normal=s=>String(s??"").trim();
const pick=(o,keys)=>{for(const k of keys){if(o&&o[k]!=null&&o[k]!=="")return o[k]}return ""};
function rowsFromJson(value){
 if(Array.isArray(value))return value;
 for(const k of ["ships","hangar","items","pledges","data","inventory","results"]){
  const v=value?.[k];if(Array.isArray(v))return v;
  if(v&&typeof v==="object")for(const nested of ["ships","items","pledges"])if(Array.isArray(v[nested]))return v[nested];
 }
 throw Error("No supported ship list found. Export a ships JSON or CSV file.");
}
function csv(text){
 const rows=[],row=[];let field="",quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];
  if(c==='"'&&quoted&&n==='"'){field+='"';i++;continue}
  if(c==='"'){quoted=!quoted;continue}
  if(!quoted&&(c===','||c==='\n'||c==='\r')){row.push(field);field="";if(c!==','){if(row.some(x=>x.trim()))rows.push(row.splice(0));if(c==='\r'&&n==='\n')i++;}continue}
  field+=c;
 }
 row.push(field);if(row.some(x=>x.trim()))rows.push(row);
 if(rows.length<2)throw Error("CSV does not contain a header and ship rows.");
 const headers=rows.shift().map(h=>h.trim().toLowerCase().replace(/[^a-z0-9]+/g,"_"));
 return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""])));
}
function translate(raw){
 const o=raw?.ship||raw?.item||raw; if(!o||typeof o!=="object")return null;
 let name=pick(o,["ship_name","shipName","model_name","modelName","ship","name","model","title","item_name","product_name"]);
 if(typeof name==="object")name=pick(name,["name","model","title"]);
 name=normal(name);
 if(!name||/^package|upgrade|ccu|paint|hangar|insurance$/i.test(name))return null;
 const type=normal(pick(o,["type","category","item_type","kind"])).toLowerCase();
 if(/paint|ccu|upgrade|insurance|subscription|flair/.test(type)&&!/ship|vehicle/.test(type))return null;
 const qty=Math.max(1,Math.min(50,parseInt(pick(o,["quantity","qty","count","units"]),10)||1));
 const id=normal(pick(o,["pledge_id","pledgeId","hangar_id","hangarId","serial","id","sku"]));
 const nickname=normal(pick(o,["nickname","custom_name","customName"]));
 return {name,nickname,qty,id,insurance:normal(pick(o,["insurance","insurance_type","insuranceType"])),pledge:normal(pick(o,["pledge","package","package_name"]))};
}
let pending=[];
function ensure(){
 if(document.getElementById("sdas-rsi-import"))return;
 const heads=[...document.querySelectorAll("h1,h2,h3,h4,[role=heading]")];
 const heading=heads.find(n=>/data\\s*import/i.test(normal(n.textContent)));
 const cloudAnchor=document.getElementById("cloudBanner");
 if(!heading&&!cloudAnchor&&!document.querySelector(".header"))return;
 const panel=document.createElement("section");panel.id="sdas-rsi-import";
 panel.style.cssText="background:linear-gradient(135deg,#091d2a,#102b39);border:1px solid #57baca;border-radius:12px;padding:18px;margin:18px 0;color:#d5f5ff;max-width:920px";
 panel.innerHTML='<h3 style="font-size:17px;letter-spacing:.08em;color:#8be8f5;margin:0 0 12px">RSI PLEDGED SHIPS // IMPORT</h3><p style="font-size:13px;line-height:1.6">Export your ships from the RSI My Hangar page using a trusted browser extension, then import its JSON or CSV file here. No RSI password or session token is ever requested.</p><p style="font-size:12px;margin:10px 0"><a id="sdas-rsi-ext" target="_blank" rel="noopener noreferrer" style="color:#7bddf3;text-decoration:underline">Install Hangar XPLORer — export-capable version (Chrome) ↗</a> · <a href="https://robertsspaceindustries.com/account/pledges" target="_blank" rel="noopener noreferrer" style="color:#7bddf3;text-decoration:underline">Open RSI My Hangar ↗</a></p><div style="border-left:2px solid #57baca;padding:8px 12px;margin:12px 0;background:#0b2330"><strong style="color:#8be8f5;font-size:12px">HOW TO IMPORT</strong><ol style="font-size:12px;line-height:1.9;margin:7px 0;padding-left:20px"><li>On a desktop browser, install Hangar XPLORer using the extension link above.</li><li>Sign in to RSI, open My Hangar, and use your hangar exporter to save a JSON or CSV file.</li><li>Return to Fleet Terminal → Data Import, then choose the exported file below.</li><li>Review the detected ships and select IMPORT PLEDGED SHIPS.</li></ol></div><label style="display:block;margin:12px 0 6px;font-size:12px">Choose a hangar export (.json or .csv)</label><input id="sdas-rsi-file" type="file" accept=".json,.csv,text/csv,application/json" style="max-width:100%;font-size:12px"><div id="sdas-rsi-message" role="status" style="margin-top:12px;font-size:12px"></div><div id="sdas-rsi-preview" style="margin-top:8px"></div><button id="sdas-rsi-confirm" type="button" disabled style="display:none;background:#12495e;color:#b0f3ff;border:1px solid #56c6d9;padding:10px 15px;border-radius:8px;margin-top:12px;cursor:pointer">IMPORT PLEDGED SHIPS</button><p style="font-size:11px;opacity:.8;margin-top:12px">New imports are private by default. Review the preview before saving. Some extension export formats may require further mapping.</p>';
 if(cloudAnchor)cloudAnchor.insertAdjacentElement("afterend",panel);
 else if(heading)heading.insertAdjacentElement("afterend",panel);
 else document.querySelector(".header").insertAdjacentElement("afterend",panel);
 const jump=document.createElement("button");jump.type="button";jump.textContent="RSI HANGAR IMPORT";
 jump.style.cssText="background:#123b4f;border:1px solid #66d4e5;color:#c8faff;border-radius:8px;padding:9px 13px;cursor:pointer;margin:8px 0;font:600 12px system-ui,Arial;letter-spacing:.05em";
 jump.addEventListener("click",()=>panel.scrollIntoView({behavior:"smooth",block:"start"}));
 if(cloudAnchor)cloudAnchor.insertAdjacentElement("beforebegin",jump);else panel.insertAdjacentElement("beforebegin",jump);
 panel.querySelector("#sdas-rsi-ext").href=EXT;
 const msg=panel.querySelector("#sdas-rsi-message"),preview=panel.querySelector("#sdas-rsi-preview"),confirm=panel.querySelector("#sdas-rsi-confirm");
 panel.querySelector("#sdas-rsi-file").addEventListener("change",async e=>{
  pending=[];confirm.disabled=true;confirm.style.display="none";preview.replaceChildren();
  const file=e.target.files?.[0];if(!file)return;
  try{
   if(file.size>8*1024*1024)throw Error("File exceeds 8 MB. Export ship rows only.");
   const t=await file.text(),records=file.name.toLowerCase().endsWith(".csv")?csv(t):rowsFromJson(JSON.parse(t));
   pending=records.map(translate).filter(Boolean);
   if(!pending.length)throw Error("No recognizable ships found. Check the export format.");
   msg.textContent=pending.length+" ship records found ("+pending.reduce((a,s)=>a+s.qty,0)+" total ships). Nothing saved yet.";
   preview.textContent=pending.slice(0,15).map(s=>s.qty+" × "+s.name+(s.nickname?" — "+s.nickname:"")).join(" · ")+(pending.length>15?" …":"");
   confirm.disabled=false;confirm.style.display="inline-flex";
  }catch(err){msg.textContent="Import preview failed: "+err.message;}
 });
 confirm.onclick=async()=>{
  if(!pending.length)return;
  if(!window.sdasImportRsiHangar){msg.textContent="Sign in and verify SDAS membership to import into the cloud.";return;}
  confirm.disabled=true;
  try{const n=await window.sdasImportRsiHangar(pending);msg.textContent=n+" new pledged ship(s) added. Existing matches were skipped.";pending=[];confirm.style.display="none";}
  catch(e){msg.textContent="Import failed: "+e.message;confirm.disabled=false;}
 };
}
let pendingScan=false;
const watch=new MutationObserver(()=>{if(pendingScan)return;pendingScan=true;requestAnimationFrame(()=>{pendingScan=false;ensure()})});
watch.observe(document.body,{childList:true,subtree:true});
ensure();
})();