from pathlib import Path
import subprocess
import shutil

# Reuse the exact tested Fleet preview staging process.
workflow=Path(".github/workflows/preview-fleet-terminal.yml").read_text()
start=workflow.index("      - name: Stage Fleet Terminal and Discord login test")
end=workflow.index("      - name: Validate deployed JavaScript syntax",start)
lines=workflow[start:end].splitlines()
commands="\n".join(line[10:] for line in lines if line.startswith("          "))
homepage=Path("dist/index.html").read_bytes()
subprocess.run(["bash","-e","-c",commands],check=True)
target=Path("dist/SDFM")
target.mkdir(parents=True,exist_ok=True)
for name in ("index.html","auth-preview.js","fleet-design.css","rsi-import.js","fleet-ui-polish.js"):
    shutil.move(str(Path("dist")/name),str(target/name))
shutil.copytree("dist/public/images",target/"public/images",dirs_exist_ok=True)
shutil.rmtree("dist/public")
Path("dist/index.html").write_bytes(homepage)
html=target.joinpath("index.html").read_text()
for name in ("fleet-design.css","fleet-ui-polish.js","rsi-import.js","auth-preview.js"):
    html=html.replace('"/'+name+'"','"/SDFM/'+name+'"')
# Clear the verified state and reload when the user signs out.
auth_path=target/"auth-preview.js"
auth=auth_path.read_text()
auth=auth.replace("await sb.auth.signOut();window.sdasCloudLogout?.();",
                  "await sb.auth.signOut();window.sdasCloudActive=false;location.reload();")
# A single Supabase client owns the Discord redirect, session and provider token.
# The custom stay-signed-in storage adapter is installed by the first script in <head>.
auth_before=''' const lib=await import("https://esm.sh/@supabase/supabase-js@2");
 const sb=lib.createClient(url,key,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});'''
auth_after=''' const sb=await window.sdasFleetSharedClientPromise;'''
assert auth.count(auth_before)==1, "Auth initializer changed"
auth=auth.replace(auth_before,auth_after)
assert 'window.sdasFleetSharedClientPromise' in auth
assert 'window.sdasFleetStartDiscordLogin=startDiscordLogin' in auth
assert 'autoRoleChecks.set(user.id,Date.now())' in auth and 'void verifyRoles();' in auth
assert 'sdas-fleet-verification-needed' in auth and 'isVerified(membership)' in auth
assert 'RETRY ROLE CHECK' in auth and 'RECONNECT DISCORD' in auth
auth_path.write_text(auth)
html=html.replace("PREVIEW BUILD","LIVE FLEET MANAGER")
html=html.replace("LOCAL DEMO CONFIGURATION","FLEET CONFIGURATION")
assert 'src="/SDFM/auth-preview.js"' in html
assert 'href="/SDFM/fleet-design.css"' in html
# Refresh the production stylesheet after the mobile logo-only optical correction.
# Without an asset version, mobile Safari can retain the earlier logo positioning.
html=html.replace('href="/SDFM/fleet-design.css"',
                  'href="/SDFM/fleet-design.css?v=20261020-logo07"')
# Only the authenticated cloud-backed application is visible in production.
# Keep the Discord login controls available while the private data is loading.
gate = """<style id="sdas-production-access">
html:not(.sdas-cloud-verified) #app,
html:not(.sdas-cloud-verified) #nav,
html:not(.sdas-cloud-verified) #sdas-golden-live{display:none!important}
html:not(.sdas-cloud-verified) .shell:after{
content:"Sign in with Discord and verify SDAS membership to access the live fleet.";
display:block;margin:24px auto;max-width:600px;padding:28px;
border:1px solid #3b91a4;border-radius:12px;text-align:center;
background:#071e2a;color:#a9eaf3;font:600 16px/1.5 system-ui}
#pilotSelect{display:none!important}\n#app button[onclick*="resetDemo"]{display:none!important}\n#app button[onclick*="addDemo"]{display:none!important}
</style><script>
(function(){
function check(){document.documentElement.classList.toggle("sdas-cloud-verified",window.sdasCloudActive===true)}
document.addEventListener("DOMContentLoaded",check);
window.addEventListener("sdas-auth-ready",check);
setInterval(check,600);
})();
</script>"""
# Prospect UI is view-only. All database writes remain blocked by RLS as well.
prospect_style="""<style id="sdas-prospect-readonly-style">
html.sdas-prospect-readonly #nav button[data-view="mine"],
html.sdas-prospect-readonly #nav button[data-view="data"],
html.sdas-prospect-readonly #nav button[data-view="import"],
html.sdas-prospect-readonly #nav button[data-view="hangar"],
html.sdas-prospect-readonly #sdas-rsi-import,
html.sdas-prospect-readonly #sdas-golden-live .gactions button:first-child,
html.sdas-prospect-readonly #app button[id*="save"],
html.sdas-prospect-readonly #app button[id*="add"],
html.sdas-prospect-readonly #app button[id*="edit"],
html.sdas-prospect-readonly #app button[id*="delete"],
html.sdas-prospect-readonly #app button[id*="import"],
html.sdas-prospect-readonly #sdas-top-action-edit{display:none!important}
</style><script>
(function(){
  function readonly(){
    if(!window.sdasFleetProspectReadOnly)return;
    for(const b of document.querySelectorAll('button')){
      if(b.closest('#sdas-auth-actions') || /REFRESH|SIGN OUT|SDAS\.SPACE|RECONNECT|VERIFY SDAS ROLES/i.test(b.textContent||''))continue;
      if(/ADD|EDIT|DELETE|REMOVE|SAVE|UPLOAD|IMPORT|RESTORE|RESET|REGISTER|SHARE|MY HANGAR|BACKUP/i.test((b.textContent||'').trim())){
        b.disabled=true;b.style.display='none';
      }
    }
    for(const el of document.querySelectorAll('#nav button')){
      if(/MY HANGAR|DATA\s*\/\s*IMPORT/i.test(el.textContent||'')){el.disabled=true;el.style.display='none'}
    }
    const active=[...document.querySelectorAll('#nav button')].find(b=>b.classList.contains('active'));
    if(active&&/MY HANGAR|DATA\s*\/\s*IMPORT/i.test(active.textContent||''))document.querySelector('#nav button[data-view="home"]')?.click();
  }
  document.addEventListener('DOMContentLoaded',()=>{new MutationObserver(()=>{if(!window.__sdasProspectUiPending){window.__sdasProspectUiPending=true;requestAnimationFrame(()=>{window.__sdasProspectUiPending=false;readonly()})}}).observe(document.body,{childList:true,subtree:true});readonly()});
  window.addEventListener('sdas-auth-ready',readonly);
  window.addEventListener('sdas-cloud-status',readonly);
})();
</script>"""
# Use the homepage's approved reclining astronaut for Fleet browser/bookmark icons.
favicon_tags = '<link rel="icon" type="image/png" sizes="128x128" href="/images/sdas-neon-bookmark.png?v=20261021-neon3d"/><link rel="shortcut icon" type="image/png" href="/images/sdas-neon-bookmark.png?v=20261021-neon3d"/><link rel="apple-touch-icon" sizes="128x128" href="/images/sdas-neon-bookmark.png?v=20261021-neon3d"/>'
html=html.replace("</head>",favicon_tags+gate+prospect_style+"</head>",1)
assert html.count('rel="icon"') == 1 and html.count('rel="apple-touch-icon"') == 1
assert "sdas-production-access" in html
# Load storage selection before the bundled cloud bridge and Discord client.
shutil.copy2("scripts/sdfm-production-login.js",target/"sdfm-production-login.js")
html=html.replace("<head>",'<head><script src="/SDFM/sdfm-production-login.js"></script>',1)
assert 'src="/SDFM/sdfm-production-login.js"' in html
html=html.replace('src="/SDFM/sdfm-production-login.js"', 'src="/SDFM/sdfm-production-login.js?v=20261020-prospect-readonly"')
# The cloud bridge and login area must not separately consume the OAuth callback.
cloud_before='''import("https://esm.sh/@supabase/supabase-js@2").then(async mod=>{
   client=mod.createClient(SUPA,PUB,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});'''
cloud_after='''window.sdasFleetSharedClientPromise.then(async sharedClient=>{
   client=sharedClient;'''
assert html.count(cloud_before)==1, "Cloud bridge initializer changed"
html=html.replace(cloud_before,cloud_after)
assert 'window.sdasFleetSharedClientPromise.then(async sharedClient=>' in html
assert 'mod.createClient(SUPA,PUB' not in html
assert 'sdasFleetRetryCloudLoad' in html, "Fleet connection retry not staged"
assert 'Fleet access requires verification' in html, "Fleet recovery status not staged"
assert 'validMembership(m)' in html, "Production must validate 12-hour role verification"
assert 'client.from("fleet_ships")' in html, "Production fleet source changed"
assert 'client.from("preview_fleet_ships")' not in html, "Preview fleet tables leaked into production"
assert 'sdas-cloud-status' in html, "Fleet status feedback not staged"
# Reference a fresh asset URL so cached 2026-era verification JavaScript is not reused.
assert html.count('src="/SDFM/auth-preview.js"')==1
html=html.replace('src="/SDFM/auth-preview.js"', 'src="/SDFM/auth-preview.js?v=20261021-session-recovery"')
target.joinpath("index.html").write_text(html)
# Pages serves case-sensitive folders; support user-typed lowercase URLs directly.
lowercase = Path("dist/sdfm")
lowercase.mkdir(parents=True,exist_ok=True)
(lowercase/"index.html").write_text(html)

# Cloudflare Pages evaluates _redirects before its SPA fallback.
# Route common user-typed lowercase URLs to the canonical capitalized folder.
redirects = Path("dist/_redirects")
existing = redirects.read_text() if redirects.exists() else ""
rules = [
    "/sdfm /SDFM/ 301",
    "/sdfm/ /SDFM/ 301",
    "/sdfm/index.html /SDFM/ 301",
    "/SDFM /SDFM/ 301",
]
redirects.write_text(existing.rstrip() + ("\\n" if existing.strip() else "") + "\\n".join(rules) + "\\n")
# Prevent browsers from retaining a stale auth script during subsequent releases.
headers=Path("dist/_headers")
existing_headers=headers.read_text() if headers.exists() else ""
fleet_headers="""\n/SDFM/\n  Cache-Control: no-cache, must-revalidate\n/SDFM/index.html\n  Cache-Control: no-cache, must-revalidate\n/SDFM/auth-preview.js\n  Cache-Control: no-cache, must-revalidate\n/SDFM/sdfm-production-login.js\n  Cache-Control: no-cache, must-revalidate\n/sdfm/\n  Cache-Control: no-cache, must-revalidate\n/sdfm/index.html\n  Cache-Control: no-cache, must-revalidate\n"""
assert "/SDFM/auth-preview.js" not in existing_headers, "Review existing auth response headers"
headers.write_text(existing_headers.rstrip()+"\n"+fleet_headers)
print("Lowercase Fleet Manager redirects staged at dist/_redirects")
print("SDFM isolated; homepage preserved")
