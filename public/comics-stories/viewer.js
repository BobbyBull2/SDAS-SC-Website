/* SDAS Comics & Stories fullscreen comic reader, isolated from fleet and publishing flows. */
(() => {
  let root,stage,picture,counter,previous,next,zoomLabel,minus,plus,mag,closeBtn;
  let zoom=1, opener=null, nativeFullscreen=false, imageToken=0, panOrigin=null, lastDragAt=0;
  const reader=()=>window.SdasComicsReader;
  const node=(tag,className,content)=>{
    const el=document.createElement(tag);
    if(className)el.className=className;
    if(content!==undefined)el.textContent=content;
    return el;
  };
  const button=(label,className,aria)=>{
    const b=node('button',className,label);
    b.type='button';
    if(aria)b.setAttribute('aria-label',aria);
    return b;
  };
  function init(){
    if(root)return;
    root=node('section','sdas-fullscreen-reader');
    root.id='sdas-fullscreen-reader';
    root.hidden=true;
    root.tabIndex=-1;
    root.setAttribute('role','dialog');
    root.setAttribute('aria-modal','true');
    root.setAttribute('aria-label','Fullscreen comic reader');
    const bar=node('div','sdas-fullscreen-toolbar');
    const heading=node('div','sdas-fullscreen-heading');
    heading.id='sdas-fullscreen-heading';
    counter=node('span','sdas-fullscreen-counter');
    bar.append(heading,counter);
    const controls=node('div','sdas-fullscreen-zoom');
    minus=button('−','sdas-fullscreen-control','Zoom out');
    mag=button('🔍','sdas-fullscreen-control sdas-fullscreen-magnifier','Magnify page');
    zoomLabel=node('output','sdas-zoom-value','100%');
    plus=button('+','sdas-fullscreen-control','Zoom in');
    closeBtn=button('✕','sdas-fullscreen-control sdas-fullscreen-close','Close fullscreen reader');
    controls.append(minus,mag,zoomLabel,plus,closeBtn);
    bar.append(controls);
    stage=node('div','sdas-fullscreen-stage');
    stage.setAttribute('aria-label','Comic page — scroll when magnified');
    picture=node('img','sdas-fullscreen-image');
    picture.alt='Comic page';
    picture.draggable=false;
    stage.append(picture);
    previous=button('❮','sdas-fullscreen-arrow sdas-fullscreen-prev','Previous comic page');
    next=button('❯','sdas-fullscreen-arrow sdas-fullscreen-next','Next comic page');
    const hint=node('div','sdas-fullscreen-hint','Use ← → to turn pages · 🔍 or + / − to zoom · drag/scroll to inspect details · Esc to close');
    root.append(bar,stage,previous,next,hint);
    document.body.append(root);
    minus.addEventListener('click',()=>setZoom(zoom-.25));
    plus.addEventListener('click',()=>setZoom(zoom+.25));
    mag.addEventListener('click',()=>setZoom(zoom===1?2:1));
    picture.addEventListener('click',()=>{
      if(Date.now()-lastDragAt<350)return;
      setZoom(zoom===1?2:1);
    });
    stage.addEventListener('pointerdown',event=>{
      if(zoom<=1||event.pointerType!=='mouse'||event.button!==0)return;
      panOrigin={x:event.clientX,y:event.clientY,left:stage.scrollLeft,top:stage.scrollTop,moved:false};
      stage.setPointerCapture?.(event.pointerId);
    });
    stage.addEventListener('pointermove',event=>{
      if(!panOrigin)return;
      const dx=event.clientX-panOrigin.x,dy=event.clientY-panOrigin.y;
      if(Math.abs(dx)>4||Math.abs(dy)>4)panOrigin.moved=true;
      if(panOrigin.moved){
        stage.scrollLeft=panOrigin.left-dx;
        stage.scrollTop=panOrigin.top-dy;
      }
    });
    stage.addEventListener('pointerup',()=>{
      if(panOrigin?.moved)lastDragAt=Date.now();
      panOrigin=null;
    });
    stage.addEventListener('pointercancel',()=>{panOrigin=null});
    previous.addEventListener('click',()=>move(-1));
    next.addEventListener('click',()=>move(1));
    closeBtn.addEventListener('click',close);
    root.addEventListener('click',event=>{if(event.target===root)close()});
    document.addEventListener('keydown',event=>{
      if(!isOpen())return;
      const target=event.target;
      if(target&&/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))return;
      if(event.key==='Escape'){event.preventDefault();close()}
      else if(event.key==='ArrowLeft'){event.preventDefault();move(-1)}
      else if(event.key==='ArrowRight'){event.preventDefault();move(1)}
      else if(event.key==='+'||event.key==='='){event.preventDefault();setZoom(zoom+.25)}
      else if(event.key==='-'||event.key==='_'){event.preventDefault();setZoom(zoom-.25)}
      else if(event.key==='0'){event.preventDefault();setZoom(1)}
    });
    document.addEventListener('fullscreenchange',()=>{
      if(document.fullscreenElement===root){
        nativeFullscreen=true;
        updateImageSizing();
      }else if(nativeFullscreen&&isOpen()){
        nativeFullscreen=false;
        close();
      }
    });
    window.addEventListener('resize',()=>{if(isOpen())updateImageSizing()});
    picture.addEventListener('load',updateImageSizing);
  }
  function isOpen(){return !!root&&!root.hidden}
  function setZoom(value){
    zoom=Math.min(3,Math.max(1,Math.round(value*4)/4));
    updateImageSizing();
  }
  function updateImageSizing(){
    if(!isOpen())return;
    zoomLabel.textContent=Math.round(zoom*100)+'%';
    minus.disabled=zoom<=1;
    plus.disabled=zoom>=3;
    mag.setAttribute('aria-pressed',String(zoom>1));
    mag.title=zoom===1?'Magnify to 200%':'Return to fit';
    stage.style.cursor=zoom>1?'grab':'default';
    picture.style.cursor=zoom>1?'grab':'zoom-in';
    if(!picture.naturalWidth||!picture.naturalHeight)return;
    const availableW=Math.max(1,stage.clientWidth-20),availableH=Math.max(1,stage.clientHeight-16);
    const fit=Math.min(availableW/picture.naturalWidth,availableH/picture.naturalHeight);
    picture.style.width=Math.round(picture.naturalWidth*fit*zoom)+'px';
    picture.style.height='auto';
    stage.scrollLeft=(stage.scrollWidth-stage.clientWidth)/2;
    stage.scrollTop=(stage.scrollHeight-stage.clientHeight)/2;
  }
  function refreshPage(){
    const state=reader()?.getState();
    if(!state||!state.pages?.length){close();return}
    counter.textContent='Page '+(state.index+1)+' / '+state.pages.length;
    const heading=root.querySelector('#sdas-fullscreen-heading');
    heading.textContent=state.title;
    previous.disabled=state.index===0;
    next.disabled=state.index===state.pages.length-1;
    const url=state.pages[state.index];
    if(picture.getAttribute('src')!==url){
      const token=++imageToken;
      picture.onload=()=>{if(token===imageToken)updateImageSizing()};
      picture.src=url;
    }
    picture.alt=state.title+' — page '+(state.index+1);
    if(picture.complete)updateImageSizing();
  }
  function move(direction){
    const state=reader()?.getState();
    if(!state)return;
    const position=Math.min(state.pages.length-1,Math.max(0,state.index+direction));
    if(position===state.index)return;
    reader().goToPage(position);
    zoom=1;refreshPage();
  }
  function open(){
    const state=reader()?.getState();
    if(!state||!state.pages?.length)return;
    init();
    opener=document.activeElement;
    root.hidden=false;
    document.body.classList.add('sdas-reader-active');
    zoom=1;refreshPage();
    closeBtn.focus({preventScroll:true});
    if(root.requestFullscreen){
      try{const result=root.requestFullscreen({navigationUI:'hide'});if(result&&result.catch)result.catch(()=>{})}
      catch(error){/* CSS fullscreen dialog remains available */ }
    }
  }
  function close(){
    if(!isOpen())return;
    const shouldExit=document.fullscreenElement===root;
    root.hidden=true;
    document.body.classList.remove('sdas-reader-active');
    nativeFullscreen=false;
    zoom=1;
    if(shouldExit&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});
    if(opener?.isConnected)opener.focus({preventScroll:true});
    opener=null;
  }
  window.SdasComicViewer={open,close,isOpen,refreshPage};
})();
