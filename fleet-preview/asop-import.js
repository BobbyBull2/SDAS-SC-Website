/* ASOP screenshot importer — preview-only. OCR executes in the pilot's browser. */
(()=>{
"use strict";
let rows=[],busy=false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function clean(line){
 return String(line).replace(/[|[]{}]/g," ").replace(/\s+/g," ").trim()
   .replace(/^(?:\d+\s*[.)-]\s*|SHIP\s+NAME\s*:?\s*)/i,"")
   .replace(/\s+(?:CLAIM|RETRIEVE|DELIVER|STORE|DESTROYED|UNKNOWN|READY|STORED|AT\s+.*)$/i,"").trim();
}
const noise=/^(ASOP|FLEET|SHIP|FILTER|SEARCH|SELECT|LOCATION|STATUS|RETRIEVE|CLAIM|STORED|DELIVER|OWNED|RENTED|VEHICLES|HANGAR|SCROLL|PAGE|CLOSE|BACK|EXIT|ALL\s+SHIPS|YOUR\s+SHIPS|MANUFACTURER|MODEL|DESTINATION|AVAILABLE|UNKNOWN|CALL|REMAINING|CURRENT|\d+|\d+\s*MIN)$/i;
function detect(text){
 return [...new Set(text.split(/\r?\n/).map(clean).filter(s=>s.length>=4&&s.length<=90&&!noise.test(s)&&/[A-Za-z]{3}/.test(s)&&!/^\d+[.,:]|^[^a-z]+$/i.test(s)))];
}
function ensure(){
 const app=document.getElementById("app");
 const active=[...document.querySelectorAll("#nav button")].find(b=>b.classList.contains("active"));
 if(!app||!/DATA\s*\/\s*IMPORT/i.test(active?.textContent||"")||!/BACKUP\s*\/\s*RESTORE/i.test(app.textContent||""))return;
 if(document.getElementById("sdas-asop-import"))return;
 const host=document.createElement("section");host.id="sdas-asop-import";
 host.style.cssText="background:linear-gradient(135deg,#091e29,#102633);border:1px solid #cba85c;border-radius:12px;padding:18px;margin:24px auto 18px;color:#e8f5f5;width:100%;max-width:920px;box-sizing:border-box;clear:both";
 host.innerHTML='<h3 style="font-size:18px;color:#f0d394;margin:0 0 8px">ASOP SCREENSHOT IMPORT <span style="font-size:11px;border:1px solid #cba85c;border-radius:5px;padding:3px 6px">TEST PREVIEW</span></h3><p style="font-size:13px;line-height:1.6">Upload screenshots of your in-game ASOP ship list. Text recognition happens in this browser; screenshots are not sent to SDFM storage. Review every name before importing. An ASOP list can include pledged, loaner or rented ships, so only select ships you actually purchased with aUEC.</p><label style="display:block;margin:12px 0 6px">ASOP screenshots (PNG, JPEG, WEBP; up to 6 images)</label><input id="asop-files" type="file" accept="image/png,image/jpeg,image/webp" multiple><div id="asop-status" role="status" style="margin:12px 0;font-size:13px" aria-live="polite">Nothing uploaded yet.</div><div id="asop-preview"></div><button type="button" id="asop-import" disabled style="margin:12px 0;padding:10px 16px;background:#70582a;color:#fff;border:1px solid #d4b66d;border-radius:8px">IMPORT CONFIRMED aUEC SHIPS</button><p style="font-size:12px;opacity:.8">Uncheck pledged, rented, temporary and loaner ships. Names are editable. Nothing is saved until you confirm.</p>';
 // Keep the existing three-card Data / Import layout above this full-width panel.
 // Appending after the layout avoids changing the original card grid or its handlers.
 const layout=app.querySelector(".layout");
 if(layout)layout.after(host);else app.append(host);
 const picker=host.querySelector("#asop-files"),status=host.querySelector("#asop-status"),review=host.querySelector("#asop-preview"),save=host.querySelector("#asop-import");
 const refresh=()=>{
   review.replaceChildren();
   rows.forEach((r,i)=>{
     const line=document.createElement("div");line.style.cssText="display:flex;align-items:center;gap:9px;margin:7px 0;flex-wrap:wrap";
     const check=document.createElement("input");check.type="checkbox";check.checked=r.selected;check.setAttribute("aria-label","Import ship "+(i+1));check.onchange=()=>{r.selected=check.checked;refreshButton()};
     const input=document.createElement("input");input.value=r.name;input.setAttribute("aria-label","Ship model "+(i+1));input.style.cssText="flex:1;min-width:210px;background:#0b2634;color:#fff;border:1px solid #597688;padding:7px";
     input.onchange=()=>{r.name=input.value.trim();refreshButton()};
     const remove=document.createElement("button");remove.textContent="Remove";remove.type="button";remove.onclick=()=>{rows.splice(i,1);refresh()};
     line.append(check,input,remove);review.append(line);
   });
   const add=document.createElement("button");add.type="button";add.textContent="+ ADD MISSING SHIP";add.onclick=()=>{rows.push({name:"",selected:true});refresh();review.querySelectorAll('input[type="text"]').item(rows.length-1)?.focus()};review.append(add);
   refreshButton();
 };
 const refreshButton=()=>save.disabled=busy||!rows.some(r=>r.selected&&r.name.length>=3);
 picker.onchange=async()=>{
   if(busy)return;
   const files=[...picker.files||[]];rows=[];review.replaceChildren();refreshButton();if(!files.length)return;
   if(files.length>6){status.textContent="Select no more than 6 screenshots.";return;}
   if(files.some(f=>f.size>8*1024*1024||!["image/png","image/jpeg","image/webp"].includes(f.type))){status.textContent="Only PNG, JPEG or WEBP screenshots under 8 MB each are allowed.";return;}
   busy=true;refreshButton();
   let worker;
   try{
     status.textContent="Loading on-device text recognition…";
     const lib=await import("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js");
     worker=await lib.createWorker("eng");
     const all=[];
     for(let i=0;i<files.length;i++){
       status.textContent="Reading screenshot "+(i+1)+" of "+files.length+"…";
       const url=URL.createObjectURL(files[i]);
       try{const result=await worker.recognize(url);all.push(...detect(result.data.text));}
       finally{URL.revokeObjectURL(url);}
     }
     rows=[...new Set(all.map(x=>x.toLowerCase()))].map(k=>({name:all.find(x=>x.toLowerCase()===k),selected:false}));
     status.textContent=rows.length+" candidate lines detected. Check only aUEC-owned ships, correct names, and remove UI text. Nothing saved.";
     if(!rows.length){rows=[{name:"",selected:false}];status.textContent="No readable names detected. Add ship names manually below.";}
     refresh();
   }catch(e){
     status.textContent="Screenshot recognition unavailable ("+e.message+"). You can still add ships manually for testing.";
     rows=[{name:"",selected:false}];refresh();
   }finally{if(worker)await worker.terminate();busy=false;refreshButton();}
 };
 save.onclick=async()=>{
   if(busy)return;
   const chosen=rows.filter(r=>r.selected&&r.name.trim().length>=3).map(r=>({name:r.name.trim(),qty:1}));
   if(!chosen.length)return;
   if(!window.sdasImportAsopShips){status.textContent="Sign in and verify your Discord membership before importing.";return;}
   if(!confirm("Add "+chosen.length+" selected ship records as aUEC-purchased? Check that none are pledged, rented or loaners."))return;
   busy=true;refreshButton();
   try{const count=await window.sdasImportAsopShips(chosen);status.textContent=count+" aUEC ship(s) saved. Existing aUEC model matches were skipped.";rows=[];refresh();}
   catch(e){status.textContent="Import failed: "+e.message;}
   finally{busy=false;refreshButton();}
 };
}
let queued=false;
new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;ensure()})}).observe(document.body,{subtree:true,childList:true});
ensure();
})();