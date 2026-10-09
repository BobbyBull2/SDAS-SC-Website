import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseMembers, collectMembers, syncMembers } from '../scripts/members.mjs';
const card=(id,hidden=false)=>`<li class="member-item org-visibility-${hidden?'H':'V'}"><a class="membercard" href="/citizens/Test${id}"><span class="thumb"><img src="https://cdn.robertsspaceindustries.com/avatar.png"></span><span class="nick">Test${id}</span><span class="rank">Test rank</span><ul class="rolelist"><li>Test role</li></ul></a></li>`;
const html=(cards,total)=>`<span class="js-totalrows">${total} members</span><ul id="members-data">${cards}</ul>`;
const response=text=>({ok:true,status:200,text:async()=>text});
test('only visible member identities are parsed, with exact public metadata',()=>{
  const parsed=parseMembers(html(card(1)+card(2,true),2));
  assert.equal(parsed.hidden,1); assert.equal(parsed.members.length,1);
  assert.equal(parsed.members[0].handle,'Test1'); assert.equal(parsed.members[0].rank,'Test rank');
  assert.deepEqual(parsed.members[0].roles,['Test role']);
  assert.throws(()=>parseMembers('<html>Access denied</html>'));
  assert.throws(()=>parseMembers(html(card(1).replace('/citizens/Test1','https://evil.example'),1)));
});
test('server-side sync paginates and excludes hidden entries',async()=>{
  const urls=[];
  const result=await collectMembers(async url=>{
    urls.push(url);
    return response(url.endsWith('robots.txt')?'User-agent: *\nDisallow: /media/':url.includes('page=2')?html(card(33,true),33):html(Array.from({length:32},(_,i)=>card(i)).join(''),33));
  },async()=>{});
  assert.equal(result.pagesFetched,2);assert.equal(result.members.length,32);assert.equal(result.hiddenMembers,1);
  assert.ok(urls.some(u=>u.includes('page=2')));
});
test('blocked, repeated, and partial retrieval preserve last-known-good file',async()=>{
  const root=await mkdtemp(join(tmpdir(),'sdas-roster-test-')),out=join(root,'members.json');
  try{
    await writeFile(out,'last known good');
    for(const request of [
      async()=>({ok:false,status:403,text:async()=>''}),
      async url=>response(url.endsWith('robots.txt')?'User-agent: *\nDisallow: /en/orgs/':html(card(1),1)),
      async url=>response(url.endsWith('robots.txt')?'User-agent: *':html(card(1),33))
    ]){await assert.rejects(syncMembers(out,request,async()=>{}));assert.equal(await readFile(out,'utf8'),'last known good');}
  }finally{await rm(root,{recursive:true,force:true});}
});
