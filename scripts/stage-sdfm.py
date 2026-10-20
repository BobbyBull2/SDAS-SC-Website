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
html=html.replace("PREVIEW BUILD","LIVE FLEET MANAGER")
html=html.replace("LOCAL DEMO CONFIGURATION","FLEET CONFIGURATION")
assert 'src="/SDFM/auth-preview.js"' in html
assert 'href="/SDFM/fleet-design.css"' in html
target.joinpath("index.html").write_text(html)
print("SDFM isolated; homepage preserved")
