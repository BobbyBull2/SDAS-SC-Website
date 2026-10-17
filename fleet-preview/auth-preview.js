/* SDAS Fleet Terminal — verified Discord membership preview. Fleet writes remain disabled. */
(async function(){

// Branding matches the SDAS.space display treatment; no authentication changes.
(function(){
 const font=document.createElement('link');font.rel='stylesheet';font.href='https://fonts.googleapis.com/css2?family=Audiowide&display=swap';document.head.append(font);
 const css=document.createElement("style");css.id="sdas-fleet-brand-style";
 css.textContent=`
 #sdas-fleet-brand{max-width:1100px;margin:22px auto 25px;padding:12px 20px;text-align:center;line-height:1.04;text-transform:uppercase;user-select:none}
 #sdas-fleet-brand .fleet-kicker{display:flex;align-items:center;justify-content:center;gap:15px;color:#a8d5da;font:600 12px 'Rajdhani',sans-serif;letter-spacing:.42em;margin-bottom:18px}
 #sdas-fleet-brand .fleet-kicker:before{content:"";height:1px;width:38px;background:#57bec9}
 #sdas-fleet-brand .fleet-line{display:block;font-family:'Audiowide','Nasalization','Orbitron',sans-serif;font-weight:700;letter-spacing:.02em;white-space:nowrap}
 #sdas-fleet-brand .fleet-first{color:#e4e6e4;font-size:clamp(30px,7.7vw,88px);text-shadow:5px 6px 0 #030b0f}
 #sdas-fleet-brand .fleet-middle{color:#f1f1ec;font-size:clamp(13px,2.2vw,25px);letter-spacing:.48em;margin:12px 0}
 #sdas-fleet-brand .fleet-last{color:#e5c587;font-size:clamp(27px,6.5vw,76px);text-shadow:5px 6px 0 #030b0f}

 /* SDAS-style restrained navbar logo and centered main heading */
 #sdas-fleet-brand{width:min(100%,1120px);max-width:1120px;box-sizing:border-box;margin:32px auto 38px;padding:20px 24px 28px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(180deg,#08141b 0%,#061016 100%);border-top:1px solid #23565d;border-bottom:1px solid #23565d;clear:both}
 #sdas-fleet-brand .fleet-first{font-size:clamp(28px,6.4vw,78px)}
 #sdas-fleet-brand .fleet-last{font-size:clamp(25px,5.4vw,65px)}
 #sdas-fleet-brand .fleet-kicker{justify-content:center}
 #sdas-fleet-nav-emblem{position:absolute;top:12px;left:18px;z-index:10;display:flex;align-items:center;justify-content:center;width:54px;height:54px;padding:3px;border:1px solid #6f6443;background:#040b0f;text-decoration:none}
 #sdas-fleet-nav-emblem img{width:47px;height:47px;object-fit:contain;display:block}
 body:has(#sdas-fleet-nav-emblem) .header,body:has(#sdas-fleet-nav-emblem) header{position:relative}
 body:has(#sdas-fleet-nav-emblem) .header{padding-left:max(76px,6vw)}
  @media(max-width:540px){#sdas-fleet-brand{padding:8px 10px}#sdas-fleet-brand .fleet-kicker{font-size:9px;letter-spacing:.21em}#sdas-fleet-brand .fleet-middle{margin:9px 0}}
 `;
 document.head.append(css);
 const oldTitle="Some Dudes Fleet Manager",newTitle="Some Dudes and a Fleet Manager";
 document.title=(document.title||oldTitle).replace(/Some Dudes (?:and a )?Fleet Manager/gi,newTitle);
 const nodes=[...document.querySelectorAll("h1,h2,.brand-title,.site-title,.hero-title")];
 const target=nodes.find(el=>/some dudes(?: and a)? fleet manager/i.test(el.textContent||""));
 if(target){target.textContent="";target.style.display="none";}
 const brand=document.createElement("div");brand.id="sdas-fleet-brand";brand.setAttribute("role","heading");brand.setAttribute("aria-level","1");
 brand.setAttribute("aria-label",newTitle);
 brand.innerHTML='<div class="fleet-kicker">A STAR CITIZEN COMMUNITY</div><span class="fleet-line fleet-first">SOME DUDES</span><span class="fleet-line fleet-middle">AND A</span><span class="fleet-line fleet-last">FLEET MANAGER</span>';
 const header=document.querySelector(".header")||document.querySelector("header");
 // The same approved compact SDAS emblem used by the primary site.
 const emblem=document.createElement("a");emblem.id="sdas-fleet-nav-emblem";emblem.href="https://sdas.space/";emblem.title="Some Dudes and a Spaceship";emblem.setAttribute("aria-label","SDAS home");
 const logo=document.createElement("img");logo.src="../images/sdas-fox-approved-logo.webp";logo.alt="SDAS astronaut emblem";emblem.append(logo);
 (header||document.body).prepend(emblem);
 // Prevent an oversized copy of the logo dominating the Fleet Manager header.
 const nearbyImages=[...document.querySelectorAll("img")].filter(img=>img!==logo&&/sdas.*(logo|emblem)|astronaut.*(logo|emblem)|fox-approved-logo/i.test((img.alt||"")+" "+(img.getAttribute("src")||"")));
 for(const img of nearbyImages){if(!img.closest("#sdas-fleet-brand")&&img.getBoundingClientRect().width>110&&img.getBoundingClientRect().top<600){img.style.maxWidth="54px";img.style.maxHeight="54px";img.style.objectFit="contain";}}
 if(target){target.insertAdjacentElement("afterend",brand);}
 else if(header){header.insertAdjacentElement("afterend",brand);}
 else document.body.prepend(brand);
})();

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
  else if(membership){state.textContent=name+" • "+({admin:"Super Admin",officer:"Board Member",member:"Patch"}[membership.role]||"Restricted")+" access";}
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
