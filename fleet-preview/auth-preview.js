/* SDAS Fleet Terminal — verified Discord membership preview. Fleet writes remain disabled. */
(async function(){

// SDAS-style site masthead, kept independent from Discord auth.
(function(){
 if(document.getElementById("sdas-fleet-masthead"))return;
 const css=document.createElement("style");
 css.id="sdas-fleet-masthead-css";
 css.textContent=`
 #sdas-fleet-masthead{position:relative;isolation:isolate;box-sizing:border-box;width:100%;min-height:290px;padding:32px 100px 30px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:0;text-align:center;background:linear-gradient(90deg,#061118e8 0%,#061118a8 48%,#0611188c 100%),url("https://raw.githubusercontent.com/BobbyBull2/SDAS-SC-Website/preview/fleet-terminal-v2/public/images/preview-hangar.png") center 46%/cover no-repeat,#061118;border-bottom:0;color:#e9ecec;overflow:hidden;-webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 67%,transparent 100%);mask-image:linear-gradient(to bottom,#000 0%,#000 67%,transparent 100%)}
 #sdas-fleet-masthead,#sdas-fleet-masthead *{box-sizing:border-box}
 #sdas-fleet-masthead{margin-bottom:-12px}
 body:has(#sdas-fleet-masthead){background-color:#061118}

 #sdas-fleet-masthead .fleet-kicker{font:600 11px 'Barlow Condensed','Arial Narrow',sans-serif;letter-spacing:3.7px;color:#9cbbc1;display:flex;align-items:center;gap:12px;margin:0 0 17px}
 #sdas-fleet-masthead .fleet-kicker:before{content:"";display:block;width:36px;height:1px;background:#43e7df}
 #sdas-fleet-masthead .fleet-title{font-family:'Audiowide',sans-serif;font-size:clamp(30px,4.4vw,69px);line-height:1.1;letter-spacing:-.015em;font-weight:400;display:block;white-space:nowrap;text-shadow:3px 5px 0 #02090c}
 #sdas-fleet-masthead .fleet-and{margin:13px 0 11px;font:600 clamp(15px,1.4vw,23px) 'Barlow Condensed',sans-serif;letter-spacing:9px;color:#e5e7e6}
 #sdas-fleet-masthead .fleet-gold{color:#e3c489;font-size:clamp(27px,4vw,63px)}
 #sdas-fleet-masthead .fleet-emblem{position:absolute;left:24px;top:18px;width:230px;height:78px;display:flex;align-items:center;justify-content:flex-start;z-index:2}
 #sdas-fleet-masthead .fleet-emblem img{display:block;width:100%;height:100%;object-fit:contain;object-position:left center}
 @media(max-width:760px){#sdas-fleet-masthead{min-height:225px;padding:65px 12px 25px}#sdas-fleet-masthead .fleet-emblem{top:12px;left:15px;width:140px;height:48px}#sdas-fleet-masthead .fleet-title{font-size:clamp(20px,5.5vw,42px);white-space:normal}#sdas-fleet-masthead .fleet-gold{font-size:clamp(19px,5vw,39px)}#sdas-fleet-masthead .fleet-kicker{font-size:9px;letter-spacing:2px}#sdas-fleet-masthead .fleet-and{letter-spacing:5px}}
 `;
 document.head.append(css);
 const font=document.createElement("link");font.rel="stylesheet";font.href="https://fonts.googleapis.com/css2?family=Audiowide&family=Barlow+Condensed:wght@600&display=swap";document.head.append(font);
 const mast=document.createElement("section");mast.id="sdas-fleet-masthead";mast.setAttribute("aria-label","Some Dudes and a Fleet Manager");
 const emblem=document.createElement("a");emblem.className="fleet-emblem";emblem.href="https://sdas.space/";emblem.title="Back to SDAS.space";
 const logo=document.createElement("img");logo.alt="SDAS astronaut emblem";logo.src="data:image/webp;base64,UklGRqgLAABXRUJQVlA4IJwLAABQMwCdASpAAU0APuVcqE8pJKQiKLl+ISAciWI7fQ9Cb5PMoH9FW3G/WD1AeeB6Of8Tvh/oAdL9Xv/6jw984XxWXX4K6k3yv8aRIMAj1/u6IAvrjxJ+IBwRdAD9J+hhnt+pfYS/YPriekOmDe1ZdIXDArHjddwlEPzrSdpnthbN/0gcaRxf83bYuLMBTFdET5DDs0HfOFuRgHJ0qwKUv++tNkHnZc+5EhCn94T4XKovFw14vMK+LZozHxoLbz25LIHgZ4EC1qypAfo+1LBp2KvLREB4prCzZnbky4ioP95DgtOOD5wsHe1j3wZRF9ppkt2JaQBIqNjymk1CUNA/moowlYeEbVzqaT+Gux8Rrh4zxgu5WRsLGwN5+SUF8i71RdfABfb4qomPlt3LytFz5252FnC3YqY2T6jzajIj07th5KKCDxwZl4Jsj6/x17TokzKlr9yauBWSJMuhVRuEAYA07UJmLeZASXH2ew0u8uDmCFGXD4SUfleEcXz5OScsja2+C0b8Bb1pR73v4dO7+EcWnUKVzRhsgHOEOcWkYM+wfzhJAAD+3TRW/55YiCnylPXFxw+2KFHRltXmk38qOAX/ZVPXirY9IvZ+fNpL7QciA5ChydZMwaDYdYbwj4HAef/pCH8ETOrcObD7i9mOhN6B+iMeZTTIQm2ZM9ZAUtxxmDpNbWDoXJsGbCyPaVQOmEdjyqVmor2SWxoh9lpqUKdU8SRhGNWPkZ5XXRazAyhVRBG+0pmvDrDdJDD1ZGSXUrgxNHBvYhX8WVl3aTmEIPtxC8HFiMKrLcVICdBZGkPQMkcdq+/GxRRq9sUVezT3ArdqEC4FBxbnbykReVpe4uAuQF6np/Qgn/K4k/6ew+T9fl62PFCAme+KqvdejOzzl5xeULbymsuodWu/aiMG4vmm21FOvlBGiYbfTRtcFszUjhcm+FMhsEylgsO+2xHr32NMAJ/sjusesbjc2GSfmVyFTLyx9fT+Fz/JM2X9lZIX099ZBBbpUR3M3P5vtxTPAbphuRf2HnZWxSzOfcRbrmmXe6F7Ffj2qGlfyXeEqLuxMwNnjf0gznzpVjDcBcprI3nL7ROH336dbm8VuQyR06AopV6HsLocAhL3U5ilQqxzPNegemjVKLngdR88E/li5u6iHEfyAkyxS42e/E0iKV3mzA1+ZONgdpDQXXwPr11Lj2vSf1WaOdPZGMpKSeWYGmIXdEktTsVP8Yf0RUH6li8/lQy8Zedmb7hJr6Q9LpqB16CV2mSsucK2+OASmBt/tEWzKpgEWCp1V3tHGha2WnSkFJK+/lMe1ZKLHG5wTP0ojAX/NZcW+7ZdpzOUtFMcz/s4TyLx/6yIVDjww7XWKV4NVhAPdWjV9YNc5McErvBKzAEDSjImwFmlMDYoY4ULRIUKNBwk+iTGINIqvv+LAI/+vGhvn+8ZaLETPwLP6tv6aedby8ZTPVXJfWZClWnLMsYUq8Ha778jRwWypBBBnOL9X1DvbtxAkvJw7p9u3b9FtZpp10juK3U//taP93ZxRFdVOKv8nz5ob5sIsnrItRNV/uswH2FL7S00LJ3HNDGyPXs+qKqUQnNVRvRvlfZP8HJjNspSGdl+IpI51GpO7KYTp5cd6HKAP2vv6yNmnBvMzhQ4magljxME3frfTLGnW2rhpD6PMgG/DQCfv3dQHgLZl/b1asJLHbMihTCMBoKw1LwbJLzfhn96D3AxzdVy4rDB6D1+CfW9Z2DC8olLObsHsYzbL1QGmVuZQ2gdoqFIu/PwypGEQzY4O/6CJxMuZb7aOka+59u3cqcZvuoL2ImEwBidELXYGMCFn5SgJcu3S3d68JzlgU33jacNtwcoMjjGEWqYdO8c50JzIcPLbiDq449LwvMRAuiEp+CZ3jQHlpY+JRCZSGCDMh7dlDJhKw+ry8zAn0QY7Z6liSQJAlhhAtqD0CAk75M9SPRJyB9L7jnmaLJ8AVf7AmU2Fqc/pudy720dKbsQsKwNkQdSipCnwYAJ/GvQ3wb1D7YIOZqgKn6eEdpFnsd+aNyTAXO1FpcydtVZ69/H/QRMh3d3PzI+pglpwDo7NNC3RanVAN0Lu1MGdn/XX53RfEmEF8j72YcrYar5GBH3C7IHgQm8TqA4yV7WvY4y36daT8uuDL0RANTMRE5cLcihECLomwbn/3dG3YR/nFFWVzML6cw9CvR8+UGN9L39O3RBm6Rbxh7aCN2/DWEcnoW5C6nTvgmCfkzqIHsK5KrYGt22nCr4r2yQeAHywnwvtB26LvOpTsnq1zZZpjMT/lfLWYnWr7Q/9OYdz63EGLCQVudslddt56RZyN8jemNyRwcfKpBHz6LuS+wexgglumTmW2sQZkgS9juxDqTRQ+WvtEG1wrGLfPZjKr/L+z1gH5ytiCt7/GB9KyYUiw0babsI3l4k0utRy1Eige5AvjKPYKzWNWuPeiNIGL7rCE6hvScVrUXS/Eg1ma9SRCkxNfKVvK7S1NmOIObxrNqAQ/m2zL9/qpApgmzlQb5p6h4fB+0CAUKVHxgtAGlFXTunCd0aCqMBwfL6ke1//bS0SxIx/nreDkNybRbVkQrzEFMhDbdy/9M8jBzA4ttnJJmJx6uo4kVgGdKsou2vhIpX38oYs4cm0l5brPnzcCqsOIAziwd6XdtDA22ndtnGO6MH2NU5/XNnNLAdbTxPG6g8ogk+6O1QJ1mhvKJx7WcmYxxDpAGWggycqEAWXWfT1KjpeJZnjstpPOzJv8z87RTCDrU3TvVGEe8IrkqheXKDsdwk1hDbjItWYZr5KuLPd+dFgTq0i038aZUfsxaBtpsg2VH6aaYz3NY4kviwg4Jn/gkemo8ts2tpgqicItBDMFCoC0nFoXpu6ipPeVNT7v+1BhCNMnEkJITNjaBHDSl7z69W772M/3cRTYFdXSQA68EK2/wNLoPAGJ/MTzbC5vG/neEHX7DMsvXpEdTYWNSWZ7xHImXnWI3CpM1FrdsSLTiEmxLulC/PB8LyVGeXiCHeM5rcn4MzeKZcI+QAGZ0AOlA9E4aEX7UZeaibqm2gE+R93bofYOyY0U6rbqzbNTfN7nUAvRMUWDrMmqn877jQ5K2E5QGF8PD2wx8rIzNje5OggNu/GZWpu3zYf8U6eJNI3aC+M/y0392+jM/XSyKEFBgBlPwO8FzqFkCH5PTHlPQNA7YLWiy3RGnCbeysXdggzQYomUIAxrfR7J774uDMogOv+Pz6OcH/GvHDxcnkf2pPPHMpvXM+eAd0Y9TGns/H9L6eBfA1qTCv9MMV/fw6HXj8AKJ87hj7wUGYRJMf4HXrFa/Vi88XpTiyY9NxZB481dInM0JsDvXiSM0bV8KoehJdQ57fm8mEjdSzudPqnuXu2HID8NNA88aVixTB7KSu8mSQYUG/cS+spEz0K01M7b5qr8flSJPcTKn7bXL7Nv7lxtONFYbS4Z3YZMeG9uGtxZvN6/Z2L//1Q5fIyeeaAkBAJt3v2TQNQrdZitF6Di6Wo0TQAEJutfvnmNGA6p0kOfJmaC+nDjZNDpquW2Z4df8v7HLEtxvVCcRFHIKTxcsf233eGjkeQty7TP61N7l7ULNibImhnamoLl7/Z4MxYzFsPUQMNoQ/Plbwqeut0Z9cPEm5YSsJbfz3DxWI3Gb+hyikz5xrYZrZpR8lZXLxzEoc1ExdssQhNyiHcNAV5xfLwOBPbLMNTNbujMictygD0MbJLpvgR+hyw8dTwedkZ4EWdV6t/p49+iKUiRd3Jrtz6SROAVonsbkHp3004s7YjEb+NyFA3SVX3ECnZ27/lm3eq9f8sLKlHfXddnKHzbGZ9X4ncKe/auZKN/epD58btqEy2UeCoped6z7byVjOUlTFLkfA12srN9Rk90Oxoia1sJxDH7BVc6HsMRO0govfI1DbIfDPM9xV6RglyxVM60Yr/DTlgisMrtZEmZwTpIoNexWHGVwAAA==";emblem.append(logo);
 // Reuse the approved existing SDAS reclining-astronaut + wordmark artwork from the old masthead.
 // This avoids substituting the small alternative logo or any unapproved artwork.
 const candidates=[...document.querySelectorAll("img")].filter(img=>img!==logo&&!img.closest("#sdas-fleet-masthead"));
 const approved=candidates.find(img=>/sdas|logo|banner|fox|recliner/i.test((img.getAttribute("src")||"")+" "+(img.alt||""))&&(img.naturalWidth>=450||img.getBoundingClientRect().width>=300));
 if(approved){
   const wrapper=approved.parentElement;
   logo.remove();emblem.append(approved);
   approved.removeAttribute("width");approved.removeAttribute("height");
   approved.style.cssText="display:block;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;object-position:left center";
   if(wrapper&&wrapper!==document.body&&!wrapper.querySelector("img")&&!wrapper.querySelector("button")&&!wrapper.querySelector("input")) {
     wrapper.style.display="none";
   }
 }
 // Suppress leftover old fleet masthead text/large artwork but keep authentication controls intact.
 for(const el of document.querySelectorAll("h1,h2,.site-title,.brand-title,.hero-title")){
   if(!el.closest("#sdas-fleet-masthead")&&/some dudes\s*(and a\s*)?fleet manager/i.test(el.textContent||""))el.style.display="none";
 }
 const oldArtwork=[...document.querySelectorAll("img")].filter(img=>!img.closest("#sdas-fleet-masthead")&&/sdas|logo|banner|fox/i.test((img.getAttribute("src")||"")+" "+(img.alt||""))&&img.getBoundingClientRect().width>300);
 oldArtwork.forEach(img=>img.style.display="none");
 const oldHeader=document.querySelector(".header")||document.querySelector("header");
 if(oldHeader){oldHeader.style.minHeight="0";oldHeader.style.height="auto";oldHeader.style.background="transparent";oldHeader.style.paddingTop="10px";oldHeader.style.paddingBottom="10px";oldHeader.style.borderBottom="0";}
 const kicker=document.createElement("div");kicker.className="fleet-kicker";kicker.textContent="A STAR CITIZEN COMMUNITY";
 const line1=document.createElement("div");line1.className="fleet-title";line1.textContent="SOME DUDES";
 const and=document.createElement("div");and.className="fleet-and";and.textContent="AND A";
 const line2=document.createElement("div");line2.className="fleet-title fleet-gold";line2.textContent="FLEET MANAGER";
 mast.append(emblem,kicker,line1,and,line2);
 const header=document.querySelector(".header")||document.querySelector("header");
 if(header)header.parentNode.insertBefore(mast,header);
 else document.body.prepend(mast);
 document.title="Some Dudes and a Fleet Manager";
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
