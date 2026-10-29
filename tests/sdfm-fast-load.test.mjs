import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const cloud=fs.readFileSync(new URL('../fleet-preview/fleet-cloud-inline.js',import.meta.url),'utf8');
function extract(start,end){
  const a=cloud.indexOf(start), b=cloud.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,'Could not find cloud bridge function '+start);
  return cloud.slice(a,b);
}
const photoFn=extract(' async function hydrateShipPhotos(ownerId,token){',' async function uploadPhoto(ship){');
const loadFn=extract(' async function loadCloud(){',' async function loadCloudOnce(){');

function setupPhoto({photos=[
  {ship_id:'ship-a',object_path:'u/a.jpg'},
  {ship_id:'ship-b',object_path:'u/b.jpg'}
],signError=null,failList=null,token=1}={}){
  const ships=[{id:'ship-a',image:''},{id:'ship-b',image:''}];
  let batchCalls=0,renderCalls=0;
  const client={
    from(table){
      assert.equal(table,'ship_photos');
      return {select(fields){
        assert.equal(fields,'ship_id,object_path');
        return Promise.resolve({data:failList?null:photos,error:failList});
      }};
    },
    storage:{from(bucket){
      assert.equal(bucket,'fleet-photos');
      return {createSignedUrls(paths,ttl){
        batchCalls++;
        assert.equal(ttl,3600);
        assert.deepEqual(Array.from(paths),photos.map(x=>x.object_path));
        return Promise.resolve({error:signError,
          data:photos.map(p=>({path:p.object_path,signedUrl:'https://signed.example/'+p.object_path}))});
      }};
    }}
  };
  const context={client,db:{ships},ready:true,user:{id:'pilot-a'},
    photoLoadSerial:token,busy:false,render:()=>renderCalls++,
    window:{sdasGoldenRefresh:()=>{}},console:{warn(){}}
  };
  const hydrate=vm.runInNewContext(photoFn+'\n hydrateShipPhotos',context);
  return {context,hydrate,ships,metrics:()=>({batchCalls,renderCalls})};
}

test('loads photos as a single optional batch after fleet rendering',async()=>{
  const f=setupPhoto();
  await f.hydrate('pilot-a',1);
  assert.equal(f.metrics().batchCalls,1);
  assert.equal(f.metrics().renderCalls,1);
  assert.ok(f.ships[0].image.endsWith('/a.jpg'));
  assert.ok(f.ships[1].image.endsWith('/b.jpg'));
  const core=extract(' async function loadCloudOnce(){',' // Read and sign optional photo records');
  assert.ok(core.includes('void hydrateShipPhotos(u.id,photoToken);'));
  assert.ok(core.indexOf('window.sdasCloudActive=true;')<core.indexOf('void hydrateShipPhotos(u.id,photoToken);'));
  assert.ok(!core.includes('await hydrateShipPhotos('));
});

test('a photo storage error does not hide or discard loaded ships',async()=>{
  const f=setupPhoto({signError:{message:'photo service offline'}});
  await f.hydrate('pilot-a',1);
  assert.deepEqual(f.ships.map(x=>x.image),['','']);
  assert.equal(f.context.ready,true);
  assert.equal(f.metrics().renderCalls,0);
});

test('stale or logged-out sessions cannot attach previous signed images',async()=>{
  const f=setupPhoto();
  f.context.photoLoadSerial=2;
  await f.hydrate('pilot-a',1);
  assert.equal(f.metrics().renderCalls,0);
  assert.equal(f.ships[0].image,'');
  f.context.photoLoadSerial=1;
  f.context.ready=false;
  await f.hydrate('pilot-a',1);
  assert.equal(f.ships[1].image,'');
});

test('authentication events share a successful in-progress fleet load',async()=>{
  const script=`
let activeLoad=null,reloadRequested=false,ready=true;
let calls=0,release,scheduled=[];
function loadCloudOnce(){
  calls++;return new Promise(resolve=>release=resolve);
}
const setTimeout=fn=>scheduled.push(fn);
${loadFn}
({loadCloud,done:()=>release(),metrics:()=>({calls,pending:scheduled.length})})
`;
  const f=vm.runInNewContext(script);
  const first=f.loadCloud(),second=f.loadCloud(),third=f.loadCloud();
  assert.equal(f.metrics().calls,1);
  f.done();
  await Promise.all([first,second,third]);
  assert.deepEqual(JSON.parse(JSON.stringify(f.metrics())),{calls:1,pending:0});
});

test('schema, security checks and production tables are unchanged',()=>{
  assert.ok(cloud.includes('validMembership(m)'));
  assert.ok(cloud.includes('select("role,discord_rank,last_role_checked_at")'));
  assert.ok(cloud.includes('client.from("fleet_ships")'));
  assert.ok(!cloud.includes('client.from("preview_fleet_ships")'));
  assert.ok(cloud.includes('window.sdasFleetProspectReadOnly'));
});
