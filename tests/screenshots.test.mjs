import test from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest } from '../src/lib/screenshot-manifest.mjs';
const item = {id:'123-456',sha256:'a'.repeat(64),file:`images/123-456-${'a'.repeat(64)}.webp`,width:1920,height:1080,approval:'provisional',verifiedApproverIds:[]};
const manifest = () => ({schemaVersion:1,guildId:'1518410019249459236',channelId:'1519105573067686000',emojiId:'1557915851922083880',completeHistory:true,publicationApproved:false,images:[structuredClone(item)]});
test('provisional bundles are local-only; publication and identity are separate gates',()=>{
  const data=manifest();
  assert.equal(validateManifest(data,true).images.length,1);
  assert.throws(()=>validateManifest(data));
  data.publicationApproved=true;
  assert.throws(()=>validateManifest(data));
  data.images[0].approval='officer-verified';
  assert.throws(()=>validateManifest(data));
  data.images[0].verifiedApproverIds=['789'];
  assert.equal(validateManifest(data).images.length,1);
});
test('malformed, remote, traversing, duplicate, and wrong-source manifests rejected',()=>{
  for(const mutate of [
    d=>d.images[0].file='https://cdn.discordapp.com/a.png',
    d=>d.images[0].file='../secret.webp',
    d=>d.images.push(d.images[0]),
    d=>d.emojiId='999',d=>d.completeHistory=false,d=>d.images[0].width=0,
    d=>d.images[0].verifiedApproverIds=['spoofed-name']
  ]) { const data=manifest(); mutate(data); assert.throws(()=>validateManifest(data,true)); }
  assert.equal(validateManifest({...manifest(),images:[]},true).images.length,0);
});
