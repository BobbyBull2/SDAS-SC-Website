import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const auth=readFileSync(new URL('../fleet-preview/auth-preview.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../fleet-preview/fleet-design.css',import.meta.url),'utf8');
const staging=readFileSync(new URL('../scripts/stage-sdfm.py',import.meta.url),'utf8');

test('Fleet login troubleshooting is always visible and lists the correct steps',()=>{
  assert.ok(auth.includes('help.id="sdas-fleet-login-help"'));
  assert.ok(auth.includes('HAVING LOGIN TROUBLE?'));
  for(const label of ['Sign Out','Log In with Discord','Refresh SDAS Roles if needed']) assert.ok(auth.includes('<li>'+label+'</li>'));
  assert.ok(auth.includes('(loginBar||root).insertAdjacentElement("afterend",help)'));
  assert.ok(css.includes('#sdas-fleet-login-help'));
});

test('login help leaves existing auth actions and production staging intact',()=>{
  assert.ok(auth.includes('button("LOGIN WITH DISCORD",startDiscordLogin)'));
  assert.ok(auth.includes('button(membership?"REFRESH SDAS ROLES":"VERIFY SDAS ROLES",verifyRoles)'));
  assert.ok(auth.includes('button("SIGN OUT",async()=>{await sb.auth.signOut()'));
  assert.ok(staging.includes('for name in ("index.html","auth-preview.js","fleet-design.css"'));
});
