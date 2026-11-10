/* SDAS Comics & Stories — Supabase-backed live archive, isolated from Fleet Manager tables. */
(() => {
  const URL = 'https://zfvfpbfkbvudaezichrh.supabase.co';
  const KEY = 'sb_publishable_n10yR_G-0OOmFWjHdrb8Yw_8lJfs8io';
  const BUCKET = 'sdas-comics-preview';
  const TABLE = 'sdas_comics_posts';
  let sb, user = null, membership = null, cloudReady = false;
  const allowedTypes = new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp']]);
  const owns = post => Boolean(user && post && (post.ownerId === user.id || isAdmin()));
  const isAdmin = () => Boolean(user && membership && membership.role === 'admin' && membership.discord_rank === 'super_admin' && fresh(membership));
  const fresh = m => Boolean(m && m.last_role_checked_at && Date.now()-Date.parse(m.last_role_checked_at) < 12*3600000 && Date.now() >= Date.parse(m.last_role_checked_at));
  const member = () => Boolean(membership && fresh(membership) && ((membership.role==='admin'&&membership.discord_rank==='super_admin')||(membership.role==='officer'&&membership.discord_rank==='board_member')||(membership.role==='member'&&membership.discord_rank==='patch')||(membership.role==='prospect'&&membership.discord_rank==='prospect')));
  const imageUrl = path => path ? sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null;
  function pathFromUrl(value) {
    if (!value || typeof value !== 'string') return null;
    const prefix = URL+'/storage/v1/object/public/'+BUCKET+'/';
    return value.startsWith(prefix) ? decodeURIComponent(value.slice(prefix.length).split('?')[0]) : null;
  }
  async function init() {
    if (!sb) {
      const lib = await import('https://esm.sh/@supabase/supabase-js@2.57.0');
      sb = lib.createClient(URL, KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      sb.auth.onAuthStateChange(()=>{setTimeout(()=>{refreshAccess().then(()=>window.dispatchEvent(new Event('sdas-comics-auth-changed'))).catch(()=>{});},0)});
    }
    await refreshAccess();
    cloudReady = true;
    return sb;
  }
  async function refreshAccess() {
    if (!sb) return null;
    const {data:{user:current},error} = await sb.auth.getUser();
    user = error ? null : current;
    membership = null;
    if (!user) return null;
    let result = await sb.from('sdas_memberships').select('role,discord_rank,last_role_checked_at').eq('user_id',user.id).maybeSingle();
    membership = result.error ? null : result.data;
    if (!member()) {
      const {data:{session}} = await sb.auth.getSession();
      if (session?.provider_token) {
        try {
          const response=await fetch(URL+'/functions/v1/verify-sdas-discord-comics',{method:'POST',
            headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+session.access_token},
            body:JSON.stringify({provider_token:session.provider_token})});
          if (response.ok) {
            result=await sb.from('sdas_memberships').select('role,discord_rank,last_role_checked_at').eq('user_id',user.id).maybeSingle();
            membership=result.error?null:result.data;
          }
        } catch (error) {console.warn('SDAS Discord role check unavailable:',error)}
      }
    }
    return user;
  }
  function access() {
    return {signedIn:!!user,member:member(),admin:isAdmin(),userId:user?.id||null,
      name:user?.user_metadata?.full_name||user?.user_metadata?.name||'SDAS pilot',role:membership?.role||null,
      ready:cloudReady};
  }
  async function signIn() {
    if (!sb) await init();
    const {error}=await sb.auth.signInWithOAuth({provider:'discord',
      options:{redirectTo:location.origin+location.pathname,scopes:'identify guilds guilds.members.read'}});
    if (error) throw error;
  }
  async function signOut() {
    if (!sb) return;
    const {error}=await sb.auth.signOut();
    if(error)throw error;
    user=null;membership=null;
  }
  async function list() {
    if (!sb) await init();
    const {data,error}=await sb.from(TABLE).select('id,owner_id,kind,title,creator_name,description,body,page_paths,cover_path,thumbnail_path,created_at,updated_at').order('updated_at',{ascending:false}).limit(250);
    if(error)throw error;
    return (data||[]).map(fromRow);
  }
  function fromRow(row) {
    const cover=imageUrl(row.cover_path);
    const pages=row.kind==='comic'?(row.page_paths||[]).map(imageUrl).filter(Boolean):[cover||'/images/preview-orbit.png'];
    return {id:row.id,ownerId:row.owner_id,title:row.title,author:row.creator_name,type:row.kind,
      description:row.description||'',body:row.body||'',pages,cover,
      thumbnail:imageUrl(row.thumbnail_path),createdAt:row.created_at,updatedAt:row.updated_at,server:true,demo:false};
  }
  async function asUpload(value, postId, slot, uploads) {
    if (!value) return null;
    const existing = pathFromUrl(value);
    if (existing) return existing;
    if (!String(value).startsWith('blob:')) {
      if (String(value).startsWith('/images/')) return null; // Site illustration, not user media.
      throw Error('An image must be uploaded again before it can be saved on the server.');
    }
    const response=await fetch(value);
    if(!response.ok)throw Error('Could not read a selected image.');
    const blob=await response.blob();
    const ext=allowedTypes.get(blob.type);
    if(!ext || blob.size===0 || blob.size>8*1024*1024)throw Error('Images must be JPG, PNG, or WebP and no larger than 8 MB.');
    const path=user.id+'/'+postId+'/'+slot+'-'+crypto.randomUUID()+'.'+ext;
    const {error}=await sb.storage.from(BUCKET).upload(path,blob,{contentType:blob.type,upsert:false,cacheControl:'3600'});
    if(error)throw error;
    uploads.push(path);
    return path;
  }
  async function save(post, previous) {
    if (!sb) await init();
    await refreshAccess();
    if(!member()) throw Error('Verified SDAS Prospect or higher access is required. Sign in with Discord and refresh your roles.');
    if(previous?.server && !owns(previous))throw Error('Only the author or an SDAS Super Admin may edit this post.');
    const id=previous?.server?previous.id:crypto.randomUUID();
    const uploads=[];
    try {
      const pagePaths=post.type==='comic'
        ?await Promise.all(post.pages.map((p,i)=>asUpload(p,id,'page-'+String(i+1).padStart(2,'0'),uploads)))
        :[];
      if(post.type==='comic' && pagePaths.some(p=>!p))throw Error('All comic pages must be uploaded images.');
      const cover=post.type==='story'?await asUpload(post.cover,id,'cover',uploads):null;
      const thumbnail=await asUpload(post.thumbnail,id,'thumbnail',uploads);
      const fields={kind:post.type,title:post.title.trim(),creator_name:post.author.trim(),
        description:post.description||'',body:post.type==='story'?(post.body||''):'',
        page_paths:pagePaths,cover_path:cover,thumbnail_path:thumbnail,updated_at:new Date().toISOString()};
      let result;
      if(previous?.server) {
        result=await sb.from(TABLE).update(fields).eq('id',id).select().single();
      } else {
        result=await sb.from(TABLE).insert({...fields,id,owner_id:user.id}).select().single();
      }
      if(result.error)throw result.error;
      return fromRow(result.data);
    } catch(error) {
      if(uploads.length) {
        const cleanup=await sb.storage.from(BUCKET).remove(uploads);
        if(cleanup.error)console.warn('Unreferenced uploads need cleanup:',cleanup.error);
      }
      throw error;
    }
  }
  async function remove(post) {
    await refreshAccess();
    if(!owns(post))throw Error('Only the author or an SDAS Super Admin can remove this post.');
    const {error}=await sb.from(TABLE).delete().eq('id',post.id);
    if(error)throw error;
    // Uploaded media is intentionally retained until safe garbage collection to avoid losing shared assets.
  }

  // Preview social data is shared across devices and governed by table RLS.
  async function socialStats() {
    if(!sb)await init();
    const {data,error}=await sb.from('sdas_comics_social_stats')
      .select('post_id,like_count,comment_count').limit(500);
    if(error)throw error;
    const counts={};
    for(const row of data||[])counts[row.post_id]={likes:Number(row.like_count)||0,comments:Number(row.comment_count)||0};
    const mine=new Set();
    if(user){
      const {data:myLikes,error:likesError}=await sb.from('sdas_comics_likes')
        .select('post_id').eq('user_id',user.id).limit(500);
      if(likesError)throw likesError;
      for(const row of myLikes||[])mine.add(row.post_id);
    }
    return {counts,mine:[...mine]};
  }
  async function getComments(postId) {
    if(!sb)await init();
    const {data,error}=await sb.from('sdas_comics_comments')
      .select('id,post_id,user_id,author_name,body,created_at')
      .eq('post_id',postId).order('created_at',{ascending:true}).limit(200);
    if(error)throw error;
    return data||[];
  }
  async function setLike(postId,liked) {
    await refreshAccess();
    if(!member())throw Error('Discord-verified SDAS Prospect or higher access is required to like posts.');
    const query=liked
      ?sb.from('sdas_comics_likes').delete().eq('post_id',postId).eq('user_id',user.id)
      :sb.from('sdas_comics_likes').insert({post_id:postId,user_id:user.id});
    const {error}=await query;
    if(error)throw error;
  }
  async function addComment(postId,body) {
    await refreshAccess();
    if(!member())throw Error('Discord-verified SDAS Prospect or higher access is required to comment.');
    const message=String(body||'').trim();
    if(!message||message.length>1500)throw Error('Comments must be between 1 and 1,500 characters.');
    const author=String(user.user_metadata?.full_name||user.user_metadata?.name||'SDAS pilot').trim().slice(0,80)||'SDAS pilot';
    const {data,error}=await sb.from('sdas_comics_comments')
      .insert({post_id:postId,user_id:user.id,author_name:author,body:message})
      .select('id,post_id,user_id,author_name,body,created_at').single();
    if(error)throw error;
    return data;
  }
  async function deleteComment(comment) {
    await refreshAccess();
    if(!user || !(user.id===comment.user_id || isAdmin()))throw Error('Only the author or a Super Admin may remove a comment.');
    const {error}=await sb.from('sdas_comics_comments')
      .delete().eq('id',comment.id).eq('post_id',comment.post_id);
    if(error)throw error;
  }
  function canModerateComment(comment) {
    return !!(user&&(user.id===comment.user_id||isAdmin()));
  }
  window.SdasComicsCloud={init,access,refreshAccess,signIn,signOut,list,save,remove,canEdit:owns,canUpload:member,socialStats,getComments,setLike,addComment,deleteComment,canModerateComment};
})();
