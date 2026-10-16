/* SDAS Fleet Terminal — verified Discord membership preview. Fleet writes remain disabled. */
(async function(){
 const url="https://zfvfpbfkbvudaezichrh.supabase.co";
 const key="sb_publishable_n10yR_G-0OOmFWjHdrb8Yw_8lJfs8io";
 const root=document.createElement("aside");root.id="sdas-auth-preview";
 root.style.cssText="position:fixed;right:12px;top:10px;bottom:auto;z-index:9999;width:fit-content;max-width:min(330px,calc(100vw - 24px));background:linear-gradient(140deg,#123448,#031019);border:1px solid #65dcfb;box-shadow:0 0 24px #22c9ec44;padding:7px 10px;border-radius:10px;color:#d5faff;font:12px system-ui,Arial";
 root.innerHTML='<div id="sdas-auth-state" style="font-size:10px;max-width:280px;margin-bottom:4px">Connecting…</div><div id="sdas-auth-actions" style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap"></div>';
 document.body.append(root);
 const state=root.querySelector("#sdas-auth-state"),actions=root.querySelector("#sdas-auth-actions");
 const button=(label,fn)=>{const b=document.createElement("button");b.textContent=label;b.style.cssText="border:1px solid #81eafa;border-radius:7px;background:#15536b;color:white;padding:6px 10px;cursor:pointer";b.onclick=fn;actions.append(b)};
 try{
 const lib=await import("https://esm.sh/@supabase/supabase-js@2");
 const sb=lib.createClient(url,key,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
 let renderNumber=0;
 const render=async()=>{
  const current=++renderNumber;
  const {data:{user},error}=await sb.auth.getUser();
  if(current!==renderNumber)return;
  actions.replaceChildren();
  if(error||!user){
   state.textContent="SDAS FLEET TERMINAL";
   button("LOGIN WITH DISCORD",async()=>{const r=await sb.auth.signInWithOAuth({provider:"discord",options:{redirectTo:location.origin+location.pathname,scopes:"identify guilds"}});if(r.error)state.textContent=r.error.message;});
   return;
  }
  const name=user.user_metadata?.full_name||user.user_metadata?.name||user.email||"Discord pilot";
  const {data:membership,error:membershipError}=await sb.from("sdas_memberships").select("role").eq("user_id",user.id).maybeSingle();
  if(current!==renderNumber)return;
  if(membershipError){state.textContent="Signed in as "+name+". Membership check failed: "+membershipError.message;}
  else if(membership){state.textContent="PILOT: "+name+" • SDAS "+membership.role;}
  else{state.textContent="PILOT: "+name+" • Verification pending";}
  if(!membership){button("VERIFY SDAS MEMBERSHIP",async()=>{
     actions.replaceChildren();state.textContent="Checking SDAS server membership…";
     const {data:{session}}=await sb.auth.getSession();
     if(!session?.provider_token){state.textContent="Discord guild permission is needed. Sign out and sign in again.";button("SIGN OUT",async()=>{await sb.auth.signOut();await render()});return;}
     try {const res=await fetch(url+"/functions/v1/verify-sdas-discord",{method:"POST",headers:{"Content-Type":"application/json","apikey":key,"Authorization":"Bearer "+session.access_token},body:JSON.stringify({provider_token:session.provider_token})});const json=await res.json();if(!res.ok)throw Error(json.error||"Verification failed");await render();window.dispatchEvent(new Event("sdas-auth-ready"));}
     catch(e){state.textContent="Verification failed: "+e.message;button("TRY AGAIN",render);button("SIGN OUT",async()=>{await sb.auth.signOut();await render()})}
   });}
  button("SIGN OUT",async()=>{await sb.auth.signOut();await render();});
 };
 sb.auth.onAuthStateChange(()=>{setTimeout(render,0)});
 await render();
 }catch(e){state.textContent="Login test unavailable: "+(e.message||String(e));}
})();
