/* Cloud bridge: inserted into the legacy script for access to its existing UI functions. */
(function(){
 const SUPA="https://zfvfpbfkbvudaezichrh.supabase.co";
 const PUB="sb_publishable_n10yR_G-0OOmFWjHdrb8Yw_8lJfs8io";
 let client=null,user=null,ready=false,busy=false,again=false,known=new Set(),booting=false;
 const legacy=clone(db);
 const label=document.createElement("div");label.id="cloudBanner";
 label.style.cssText="position:relative;z-index:2;border:1px solid #4dbbcc;background:#092e40;padding:10px 15px;margin:10px 0;border-radius:10px;color:#c7f4ff";
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
    client.from("fleet_ships").select("*").order("created_at",{ascending:true}),
    client.from("ship_loadouts").select("ship_id,components,name"),
    client.from("ship_photos").select("ship_id,object_path")
   ]);
   for(const res of [profiles,ships,loadouts,photos])if(res.error)throw res.error;
   const photoMap={};
   for(const p of photos.data||[]){const {data:sign}=await client.storage.from("fleet-photos").createSignedUrl(p.object_path,3600);if(sign?.signedUrl)photoMap[p.ship_id]=sign.signedUrl;}
   db={members:(profiles.data||[]).map(p=>({id:p.user_id,name:p.display_name,handle:p.rsi_handle||"",role:"Member"})),ships:(ships.data||[]).map(s=>fromRow(s,photoMap))};
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
   const b=await fetch(ship.image).then(r=>r.blob());
   if(b.size>2097152)throw Error("Screenshot too large after compression (2 MB max).");
   const path=user.id+"/"+ship.id+"/"+Date.now()+".jpg";
   const up=await client.storage.from("fleet-photos").upload(path,b,{contentType:"image/jpeg",upsert:false});
   if(up.error)throw up.error;
   const old=await client.from("ship_photos").select("id,object_path").eq("ship_id",ship.id);
   if(old.error)throw old.error;
   const ins=await client.from("ship_photos").insert({ship_id:ship.id,object_path:path});
   if(ins.error)throw ins.error;
   for(const x of old.data||[]){await client.from("ship_photos").delete().eq("id",x.id);await client.storage.from("fleet-photos").remove([x.object_path]);}
   const {data:sign}=await client.storage.from("fleet-photos").createSignedUrl(path,3600);
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
   for(const id of removed){const r=await client.from("fleet_ships").delete().eq("id",id).eq("owner_id",user.id);if(r.error)throw r.error;}
   for(const s of owned){
     const r=await client.from("fleet_ships").upsert(summary(s),{onConflict:"id"});if(r.error)throw r.error;
     const l=await client.from("ship_loadouts").upsert({ship_id:s.id,name:"Current",components:s.loadout||{}},{onConflict:"ship_id,name"});if(l.error)throw l.error;
     if(s.image?.startsWith("data:image/"))await uploadPhoto(s);
   }
   known=ids;status("Saved to Supabase • "+owned.length+" personal ships. Other members can see org-shared ships.");
  }catch(e){status("Save failed: "+e.message+". Please export a JSON backup before leaving.");}
  finally{busy=false;if(again){again=false;sync();}}
 }
 window.sdasCloudQueueSave=()=>{if(ready)sync()};
 window.addEventListener("sdas-auth-ready",()=>{loadCloud()});
 const back=document.createElement("button");back.textContent="IMPORT MY EXISTING LOCAL SHIPS";back.className="btn";back.style.margin="8px 0";label.after(back);
 back.onclick=async()=>{
   if(!ready)return alert("Verify SDAS login first.");
   const records=legacy.ships.filter(s=>s.owner==="bobby");
   if(!records.length)return alert("No local Bobby demo ships to import.");
   if(!confirm("Import "+records.length+" local Bobby ships into YOUR cloud hangar? They may include demo examples. Existing cloud ships will be kept."))return;
   for(const s of records){db.ships.push({...clone(s),id:crypto.randomUUID(),owner:user.id,visibility:"private"});}
   render();sync();back.disabled=true;back.textContent="LOCAL IMPORT REQUESTED";
 };
 import("https://esm.sh/@supabase/supabase-js@2").then(async mod=>{
   client=mod.createClient(SUPA,PUB,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
   await loadCloud();
   client.auth.onAuthStateChange(()=>{setTimeout(()=>{if(!ready)loadCloud()},400)});
 }).catch(e=>status("Connection module unavailable: "+e.message));
})();
