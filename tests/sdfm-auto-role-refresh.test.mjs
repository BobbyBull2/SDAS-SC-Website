import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const auth=readFileSync(new URL('../fleet-preview/auth-preview.js',import.meta.url),'utf8');
const login=readFileSync(new URL('../scripts/sdfm-production-login.js',import.meta.url),'utf8');
const cloud=readFileSync(new URL('../fleet-preview/fleet-cloud-inline.js',import.meta.url),'utf8');
const from=auth.indexOf(' const autoRoleChecks=new Map();');
const to=auth.indexOf(' document.addEventListener("visibilitychange"',from);
assert.ok(from>=0 && to>from);

function setup({fresh=true,token='discord-provider-token',verified=true}={}){
  const membership={role:'member',discord_rank:'patch',last_role_checked_at:new Date().toISOString()};
  let requests=0,release,buttons=[],events=[];
  const window={sdasFleetFreshRoleRefreshPending:fresh,sdasCloudActive:false,
    sdasFleetSetFreshRoleRefreshPending(value){this.sdasFleetFreshRoleRefreshPending=value;},
    dispatchEvent(e){events.push(e.type)}
  };
  const state={textContent:''};
  const context={window,state,actions:{replaceChildren(){buttons=[]}},
    button(label,fn){buttons.push({label,fn})},startDiscordLogin:async()=>{},
    announceLoginState(signedIn,verified,checkingRoles=false){window.sdasFleetLoginState={signedIn,verified,checkingRoles}},
    sb:{auth:{getUser:async()=>({data:{user:{id:'pilot-a',user_metadata:{name:'Pilot'}}}}),
      getSession:async()=>({data:{session:{provider_token:token,access_token:'session-token'}}})},
      from(){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:membership,error:null})}}},
    fetch:async()=>{requests++;await new Promise(r=>{release=r});return {ok:verified,json:async()=>({verified,error:'Role verification rejected'})}},
    Event:class{constructor(type){this.type=type}},Date,url:'https://test.invalid',key:'public-test-key'
  };
  const render=vm.runInNewContext('let renderNumber=0;'+auth.slice(from,to)+'\nrender',context);
  return {render,window,state,metrics:()=>({requests,buttons:buttons.map(b=>b.label),events:[...events]}),release:()=>release?.()};
}
const settle=()=>new Promise(r=>setImmediate(r));

test('fresh Discord login refreshes even a previously valid rank and deduplicates concurrent renders',async()=>{
  const f=setup();
  await f.render();await settle();
  assert.equal(f.metrics().requests,1);
  assert.equal(f.window.sdasFleetLoginState.checkingRoles,true);
  assert.equal(f.window.sdasFleetFreshRoleRefreshPending,true);
  assert.ok(!f.metrics().events.includes('sdas-auth-ready'));
  await f.render();await settle();
  assert.equal(f.metrics().requests,1);
  f.release();await settle();await settle();
  assert.equal(f.window.sdasFleetFreshRoleRefreshPending,false);
  assert.equal(f.window.sdasFleetLoginState.verified,true);
  assert.ok(f.metrics().buttons.includes('REFRESH SDAS ROLES'));
  assert.ok(f.metrics().events.includes('sdas-auth-ready'));
  await f.render();await settle();assert.equal(f.metrics().requests,1);
});
test('a restored session with a valid rank does not reverify unnecessarily',async()=>{
  const f=setup({fresh:false});
  await f.render();await settle();
  assert.equal(f.metrics().requests,0);
  assert.equal(f.window.sdasFleetLoginState.verified,true);
});
test('failed fresh role verification retains the pending gate and recovery controls',async()=>{
  const f=setup({verified:false});
  await f.render();await settle();f.release();await settle();await settle();
  assert.equal(f.window.sdasFleetFreshRoleRefreshPending,true);
  assert.equal(f.window.sdasFleetLoginState.verified,false);
  assert.equal(f.window.sdasFleetLoginState.checkingRoles,false);
  assert.ok(f.metrics().buttons.includes('RETRY ROLE CHECK'));
  assert.ok(f.metrics().buttons.includes('SIGN OUT'));
  assert.ok(!f.metrics().events.includes('sdas-auth-ready'));
});
test('missing Discord provider token offers reconnect rather than granting cached rank',async()=>{
  const f=setup({token:null});
  await f.render();await settle();
  assert.equal(f.metrics().requests,0);
  assert.equal(f.window.sdasFleetFreshRoleRefreshPending,true);
  assert.equal(f.window.sdasFleetLoginState.verified,false);
  assert.ok(f.metrics().buttons.includes('RECONNECT DISCORD'));
});
test('production captures OAuth return before client initialization and gates fleet reads',()=>{
  assert.ok(login.indexOf('callbackHash.has("access_token")')<login.indexOf('window.sdasFleetSharedClientPromise = import'));
  assert.match(login,/callbackQuery\.has\("code"\)/);
  assert.match(login,/sessionStorage\.setItem\(roleRefreshKey/);
  assert.match(cloud,/if\(window\.sdasFleetFreshRoleRefreshPending\)\{requireVerification/);
  assert.match(cloud,/if\(window\.sdasFleetFreshRoleRefreshPending\|\|checkError\|\|!validMembership\(confirmed\)\)/);
});
