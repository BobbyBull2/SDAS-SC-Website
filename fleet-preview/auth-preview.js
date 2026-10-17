/* SDAS Fleet Terminal — verified Discord membership preview. Fleet writes remain disabled. */
(async function(){
 const url="https://zfvfpbfkbvudaezichrh.supabase.co";
 const key="sb_publishable_n10yR_G-0OOmFWjHdrb8Yw_8lJfs8io";
 const root=document.createElement("div");root.id="sdas-auth-preview";
 root.style.cssText="display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;vertical-align:middle;max-width:100%;color:#b8eefa;font:12px system-ui,Arial";
 root.innerHTML='<div id="sdas-auth-actions" style="display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap"></div><span id="sdas-auth-state" style="font-size:10px;color:#9bcbd5;max-width:200px"></span>';
 const anchor=document.querySelector("#pilotSelect");
 if(anchor){anchor.insertAdjacentElement("afterend",root);}
 else {const header=document.querySelector(".header")||document.querySelector("header");if(header)header.append(root);else document.body.prepend(root);}
 const state=root.querySelector("#sdas-auth-state"),actions=root.querySelector("#sdas-auth-actions");
 const discordIcon='<svg aria-hidden="true" viewBox="0 0 127.14 96.36" width="18" height="14" style="fill:currentColor;flex:none"><path d="M104.4 8.65A102.73 102.73 0 0 0 79.25.77a71.8 71.8 0 0 0-3.2 6.58 95.2 95.2 0 0 0-28.96 0A71.8 71.8 0 0 0 43.9.77a102.73 102.73 0 0 0-25.15 7.88C2.85 32.25-1.45 55.26.71 77.94a103.18 103.18 0 0 0 31.04 15.67 75.2 75.2 0 0 0 6.65-10.8 66.79 66.79 0 0 1-10.46-5.05c.88-.64 1.74-1.3 2.57-1.98a73.73 73.73 0 0 0 63.12 0c.84.68 1.7 1.34 2.57 1.98a66.79 66.79 0 0 1-10.46 5.05 75.2 75.2 0 0 0 6.65 10.8 103.18 103.18 0 0 0 31.04-15.67c2.54-26.29-4.33-49.08-18.99-69.29ZM42.45 64.06c-6 0-10.94-5.5-10.94-12.25s4.83-12.25 10.94-12.25 11.05 5.55 10.94 12.25-4.83 12.25-10.94 12.25Zm42.24 0c-6 0-10.94-5.5-10.94-12.25s4.83-12.25 10.94-12.25 11.05 5.55 10.94 12.25-4.83 12.25-10.94 12.25Z"/></svg>';
 const button=(label,fn)=>{const b=document.createElement("button");b.type="button";b.style.cssText="display:inline-flex;align-items:center;gap:7px;border:1px solid #61cde2;border-radius:7px;background:linear-gradient(135deg,#134257,#081e2c);color:#a7edfb;padding:8px 11px;cursor:pointer;letter-spacing:.05em;font:600 11px system-ui,Arial";if(label==="LOGIN WITH DISCORD"){b.innerHTML=discordIcon+"<span>LOGIN WITH DISCORD</span>";}else{b.textContent=label;}b.onclick=fn;actions.append(b)};
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
   state.textContent="";
   button("LOGIN WITH DISCORD",async()=>{const r=await sb.auth.signInWithOAuth({provider:"discord",options:{redirectTo:location.origin+location.pathname,scopes:"identify guilds guilds.members.read"}});if(r.error)state.textContent=r.error.message;});
   return;
  }
  const name=user.user_metadata?.full_name||user.user_metadata?.name||user.email||"Discord pilot";
  const {data:membership,error:membershipError}=await sb.from("sdas_memberships").select("role").eq("user_id",user.id).maybeSingle();
  if(current!==renderNumber)return;
  if(membershipError){state.textContent="Signed in as "+name+". Membership check failed: "+membershipError.message;}
  else if(membership){state.textContent=name+" • SDAS "+membership.role.toUpperCase();}
  else{state.textContent="PILOT: "+name+" • Verification pending";}
  const verifyRoles=async()=>{
    actions.replaceChildren();state.textContent="Checking SDAS Discord roles…";
    const {data:{session}}=await sb.auth.getSession();
    if(!session?.provider_token){
      state.textContent="Reconnect Discord to grant permission to view SDAS roles.";
      button("SIGN OUT / RECONNECT",async()=>{await sb.auth.signOut();window.sdasCloudLogout?.();await render();});
      return;
    }
    try{
      const res=await fetch(url+"/functions/v1/verify-sdas-discord",{method:"POST",
        headers:{"Content-Type":"application/json","apikey":key,"Authorization":"Bearer "+session.access_token},
        body:JSON.stringify({provider_token:session.provider_token})});
      const json=await res.json();
      if(!res.ok)throw Error(json.error||"Role verification failed");
      await render();
      window.dispatchEvent(new Event("sdas-auth-ready"));
    }catch(e){
      state.textContent="Role access: "+e.message;
      button("RETRY ROLE CHECK",verifyRoles);
      button("SIGN OUT / RECONNECT",async()=>{await sb.auth.signOut();window.sdasCloudLogout?.();await render();});
    }
  };
  button(membership?"REFRESH SDAS ROLES":"VERIFY SDAS ROLES",verifyRoles);
  button("SIGN OUT",async()=>{await sb.auth.signOut();window.sdasCloudLogout?.();await render();});
 };
 sb.auth.onAuthStateChange(()=>{setTimeout(render,0)});
 await render();
 }catch(e){state.textContent="Login test unavailable: "+(e.message||String(e));}
})();
