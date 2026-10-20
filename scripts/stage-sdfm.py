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
# Production clients share one storage adapter and a single Discord OAuth launcher.
auth=auth.replace(
 'persistSession:true,autoRefreshToken:true',
 'persistSession:true,autoRefreshToken:true,storage:window.sdasFleetAuthStorage'
)
auth=auth.replace(
 'button("LOGIN WITH DISCORD",async()=>{const r=await sb.auth.signInWithOAuth({provider:"discord",options:{redirectTo:location.origin+location.pathname,scopes:"identify guilds guilds.members.read"}});if(r.error)state.textContent=r.error.message;});',
 'window.sdasFleetStartDiscordLogin=async()=>{const r=await sb.auth.signInWithOAuth({provider:"discord",options:{redirectTo:location.origin+location.pathname,scopes:"identify guilds guilds.members.read"}});if(r.error){state.textContent=r.error.message;throw r.error;}};button("LOGIN WITH DISCORD",window.sdasFleetStartDiscordLogin);'
)
assert 'storage:window.sdasFleetAuthStorage' in auth
assert 'window.sdasFleetStartDiscordLogin=async' in auth
# Every new Discord login should verify SDAS membership before displaying the fleet.
assert 'autoRoleChecks.add(user.id)' in auth
assert 'void verifyRoles();' in auth
assert 'RETRY ROLE CHECK' in auth
assert 'Discord login succeeded, but SDFM needs a fresh Discord authorization' in auth
auth_path.write_text(auth)
html=html.replace("PREVIEW BUILD","LIVE FLEET MANAGER")
html=html.replace("LOCAL DEMO CONFIGURATION","FLEET CONFIGURATION")
assert 'src="/SDFM/auth-preview.js"' in html
assert 'href="/SDFM/fleet-design.css"' in html
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
html=html.replace("</head>",gate+"</head>",1)
assert "sdas-production-access" in html
# Load storage selection before the bundled cloud bridge and Discord client.
shutil.copy2("scripts/sdfm-production-login.js",target/"sdfm-production-login.js")
html=html.replace("<head>",'<head><script src="/SDFM/sdfm-production-login.js"></script>',1)
assert 'src="/SDFM/sdfm-production-login.js"' in html
# The legacy cloud bridge is embedded in the staged HTML, so it must use the same adapter.
html=html.replace(
 'persistSession:true,autoRefreshToken:true',
 'persistSession:true,autoRefreshToken:true,storage:window.sdasFleetAuthStorage'
)
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
print("Lowercase Fleet Manager redirects staged at dist/_redirects")
print("SDFM isolated; homepage preserved")
