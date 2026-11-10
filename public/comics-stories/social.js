/* SDAS Comics & Stories shared reactions: isolated UI, no Fleet Manager changes. */
(() => {
  let counts={},mine=new Set(),openId=null;
  const comments=new Map(),drafts=new Map();
  const cloud=()=>window.SdasComicsCloud;
  const getItem=id=>window.SdasComicsGetItem?.(id);
  const el=(tag,className,text)=>{
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  };
  async function refresh(){
    try {
      const stats=await cloud().socialStats();
      counts=stats.counts;mine=new Set(stats.mine);
      mount();
      mountDetail();
      document.querySelectorAll('.entry-social[data-post]').forEach(toolbar=>updateButtons(toolbar));
    }catch(error){console.warn('SDAS reactions could not load:',error)}
  }
  function updateButtons(toolbar){
    const id=toolbar.dataset.post;
    const like=toolbar.querySelector('[data-like]');
    const comment=toolbar.querySelector('[data-comments]');
    if(!like||!comment)return;
    const c=counts[id]||{likes:0,comments:0};
    const liked=mine.has(id);
    like.textContent=(liked?'♥':'♡')+' Like  '+c.likes;
    like.classList.toggle('is-liked',liked);
    like.setAttribute('aria-pressed',String(liked));
    comment.textContent='◌ Comments  '+c.comments;
    comment.setAttribute('aria-expanded',String(openId===id));
  }
  function notify(message){
    const status=document.getElementById('storage-message');
    if(status)status.textContent=message;
  }
  function setupToolbar(toolbar,id,post){
    if(!post.server){
      toolbar.classList.add('placeholder');
      toolbar.textContent='Preview / local draft · Likes and comments available after publishing';
      return;
    }
    toolbar.dataset.post=id;
    const like=el('button','social-action like-action');
    like.type='button';like.dataset.like=id;
    like.addEventListener('click',async()=>{
      if(!cloud().canUpload()){
        notify('Sign in with Discord and verify SDAS Prospect or higher to like a post.');
        return;
      }
      like.disabled=true;
      try{await cloud().setLike(id,mine.has(id));await refresh()}
      catch(error){notify('Like failed: '+(error.message||error))}
      finally{like.disabled=false}
    });
    const open=el('button','social-action comment-action');
    open.type='button';open.dataset.comments=id;
    open.addEventListener('click',()=>toggleComments(id));
    toolbar.append(like,open);
    updateButtons(toolbar);
    if(openId===id)buildComments(toolbar,id);
  }
  function mountDetail(){
    const host=document.getElementById('detail-social');
    if(!host||document.getElementById('detail')?.classList.contains('hidden'))return;
    const post=window.SdasComicsCurrentItem?.();
    if(!post)return;
    const auth=String(!!cloud().canUpload());
    const current=host.querySelector('.entry-social');
    if(host.dataset.post===post.id && host.dataset.auth===auth && current){
      if(post.server)updateButtons(current);
      return;
    }
    host.dataset.post=post.id;
    host.dataset.auth=auth;
    host.replaceChildren();
    host.append(el('h3','detail-social-heading','Crew reactions & discussion'));
    const toolbar=el('div','entry-social');
    host.append(toolbar);
    setupToolbar(toolbar,post.id,post);
  }
  function mount(){
    document.querySelectorAll('#entries button.entry[data-id]').forEach(button=>{
      if(button.parentElement?.classList.contains('entry-shell'))return;
      const id=button.dataset.id,post=getItem(id);
      if(!post)return;
      const shell=el('article','entry-shell');
      button.parentElement.insertBefore(shell,button);
      shell.append(button);
      const toolbar=el('div','entry-social');
      shell.append(toolbar);
      setupToolbar(toolbar,id,post);
    });
  }
  async function toggleComments(id){
    openId=openId===id?null:id;
    mountPanels();
    if(openId===id&&!comments.has(id)){
      try{
        comments.set(id,await cloud().getComments(id));
        mountPanels();
      }catch(error){notify('Could not load comments: '+(error.message||error))}
    }
  }
  function mountPanels(){
    document.querySelectorAll('.entry-social[data-post]').forEach(toolbar=>{
      const id=toolbar.dataset.post;
      const panel=toolbar.querySelector('.entry-comments');
      if(openId!==id&&panel)panel.remove();
      if(openId===id&&!panel)buildComments(toolbar,id);
      updateButtons(toolbar);
    });
  }
  function buildComments(toolbar,id){
    const panel=el('section','entry-comments');
    panel.setAttribute('aria-label','Comments');
    const list=el('div','comment-list');
    const rows=comments.get(id);
    if(!rows){
      list.append(el('p','social-subtle','Loading comments…'));
    }else if(!rows.length){
      list.append(el('p','social-subtle','No comments yet. Be the first.'));
    }else{
      for(const record of rows){
        const item=el('div','comment-row');
        const header=el('div','comment-top');
        header.append(el('strong','',record.author_name));
        header.append(el('time','',new Date(record.created_at).toLocaleString()));
        if(cloud().canModerateComment(record)){
          const remove=el('button','comment-delete','Remove');
          remove.type='button';
          remove.addEventListener('click',async()=>{
            remove.disabled=true;
            try{
              await cloud().deleteComment(record);
              comments.set(id,await cloud().getComments(id));
              panel.remove();buildComments(toolbar,id);await refresh();
            }catch(error){notify('Could not remove comment: '+(error.message||error))}
            finally{remove.disabled=false}
          });
          header.append(remove);
        }
        item.append(header,el('p','',record.body));
        list.append(item);
      }
    }
    panel.append(list);
    if(cloud().canUpload()){
      const form=el('form','comment-form');
      const label=el('label','','Add a comment');label.htmlFor='sdas-comment-'+id;
      const textarea=el('textarea');
      textarea.id='sdas-comment-'+id;
      textarea.placeholder='Keep it respectful, keep it SDAS…';
      textarea.maxLength=1500;textarea.required=true;
      textarea.value=drafts.get(id)||'';
      textarea.addEventListener('input',()=>drafts.set(id,textarea.value));
      const submit=el('button','btn','Post comment');submit.type='submit';
      form.append(label,textarea,submit);
      form.addEventListener('submit',async event=>{
        event.preventDefault();
        submit.disabled=true;
        try{
          await cloud().addComment(id,textarea.value);
          drafts.delete(id);
          comments.set(id,await cloud().getComments(id));
          panel.remove();buildComments(toolbar,id);await refresh();
        }catch(error){notify('Could not save comment: '+(error.message||error))}
        finally{submit.disabled=false}
      });
      panel.append(form);
    }else{
      panel.append(el('p','social-subtle','Log in with Discord as a verified SDAS Prospect or higher to post likes and comments.'));
    }
    toolbar.append(panel);
  }
  window.SdasComicsSocial={mount,mountDetail,refresh};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh()});
  setInterval(()=>{if(!document.hidden)void refresh()},120000);
})();
