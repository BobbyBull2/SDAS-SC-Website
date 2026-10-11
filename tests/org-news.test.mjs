import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOrgNews } from '../src/lib/org-news.mjs';
test('accepts labeled demo posts with no live Discord URLs',()=>{
 const feed=parseOrgNews({schemaVersion:1,mode:'demo',items:[{id:'preview-1',title:'Example post',body:'Clearly marked sample'}]});
 assert.equal(feed.mode,'demo');
 assert.equal(feed.items.length,1);
});
test('accepts sanitized official Discord message links',()=>{
 const url='https://discord.com/channels/1518410019249459236/1519105573067686000/1558306913425293354';
 const feed=parseOrgNews({schemaVersion:1,mode:'live',items:[{id:'discord-1558306913425293354',title:'Announcement',body:'A short plaintext summary',discordUrl:url}]});
 assert.equal(feed.items[0].discordUrl,url);
});
test('rejects malicious links, invalid schema, duplicate ids and excessive text',()=>{
 assert.throws(()=>parseOrgNews({schemaVersion:2,mode:'live',items:[]}));
 const feed=parseOrgNews({schemaVersion:1,mode:'live',items:[
   {id:'a',title:'Clean',body:'Good'},
   {id:'a',title:'Duplicate',body:'Ignored'},
   {id:'b',title:'Unsafe link',body:'Ignore',discordUrl:'javascript:alert(1)'},
   {id:'c',title:'Too long',body:'x'.repeat(701)},
 ]});
 assert.deepEqual(feed.items.map(i=>i.id),['a']);
});
