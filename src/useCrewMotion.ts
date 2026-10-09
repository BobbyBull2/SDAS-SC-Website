import { useEffect, useRef, useState } from 'react';

/** Native scrolling with a central accessible roster and two visual copies.
 * Only animate while onscreen, visible, unpaused, and motion is permitted.
 */
export function useCrewMotion(memberCount:number) {
  const rail=useRef<HTMLDivElement>(null);
  const original=useRef<HTMLDivElement>(null);
  const section=useRef<HTMLElement>(null);
  const cycle=useRef(0);
  const resumeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [overflow,setOverflow]=useState(false);
  const [onscreen,setOnscreen]=useState(false);
  const [visible,setVisible]=useState(!document.hidden);
  const [hovered,setHovered]=useState(false);
  const [focused,setFocused]=useState(false);
  const [interacting,setInteracting]=useState(false);
  const [cooling,setCooling]=useState(false);
  const [playing,setPlaying]=useState(true);
  const looping=!reduced&&overflow&&memberCount>1;

  const pauseBriefly=()=>{
    setCooling(true);
    if(resumeTimer.current)clearTimeout(resumeTimer.current);
    resumeTimer.current=setTimeout(()=>{resumeTimer.current=null;setCooling(false)},2500);
  };
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const change=()=>setReduced(media.matches);
    const visibility=()=>setVisible(!document.hidden);
    media.addEventListener('change',change);
    document.addEventListener('visibilitychange',visibility);
    return()=>{media.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);if(resumeTimer.current)clearTimeout(resumeTimer.current)};
  },[]);
  useEffect(()=>{
    if(!section.current)return;
    const observer=new IntersectionObserver(entries=>setOnscreen(entries[0].isIntersecting),{threshold:0.05});
    observer.observe(section.current);
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const element=rail.current,group=original.current;
    if(!element||!group)return;
    const measure=()=>{
      const previous=cycle.current;
      const offset=previous?(element.scrollLeft%previous):0;
      cycle.current=group.getBoundingClientRect().width;
      setOverflow(cycle.current>element.clientWidth+1);
      element.scrollLeft=(looping?cycle.current:0)+offset;
    };
    const observer=new ResizeObserver(measure);
    observer.observe(element);observer.observe(group);measure();
    return()=>observer.disconnect();
  },[memberCount,looping]);
  // Release outside the rail or after native touch scrolling takes over.
  useEffect(()=>{
    if(!interacting)return;
    const release=()=>{setInteracting(false);pauseBriefly()};
    window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
    return()=>{window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release)};
  },[interacting]);

  const normalize=()=>{
    const element=rail.current,width=cycle.current;
    if(!element||!looping||!width)return;
    if(element.scrollLeft<width||element.scrollLeft>=2*width){
      element.scrollLeft=width+((element.scrollLeft-width)%width+width)%width;
    }
  };
  const running=looping&&playing&&onscreen&&visible&&!hovered&&!focused&&!interacting&&!cooling;
  useEffect(()=>{
    if(!running||!rail.current)return;
    let frame=0,last:number|undefined,position=rail.current.scrollLeft,lastWritten=position;
    const step=(now:number)=>{
      const element=rail.current,width=cycle.current;
      if(!element||!width)return;
      // Rebase after resize, native scroll, or scroll-boundary normalization.
      if(Math.abs(element.scrollLeft-lastWritten)>1)position=element.scrollLeft;
      if(last!==undefined){
        // Keep fractional progress rather than losing low-speed subpixels.
        position+=Math.min(now-last,64)*0.022; // relaxed 22 CSS pixels/second
        if(position>=2*width)position-=width;
        element.scrollLeft=position;
        lastWritten=element.scrollLeft;
      }
      last=now;frame=requestAnimationFrame(step);
    };
    frame=requestAnimationFrame(step);
    return()=>cancelAnimationFrame(frame);
  },[running,memberCount]);
  const move=(direction:number)=>{
    pauseBriefly();
    rail.current?.scrollBy({left:direction*rail.current.clientWidth*.75,behavior:reduced?'instant':'smooth'});
  };
  return {rail,original,section,looping,reduced,playing,running,move,
    toggle:()=>setPlaying(value=>!value),
    onMouseEnter:()=>setHovered(true),onMouseLeave:()=>setHovered(false),
    onFocus:()=>setFocused(true),onBlur:()=>setFocused(false),
    onPointerDown:()=>{setInteracting(true);pauseBriefly()},onWheel:pauseBriefly,
    onScroll:()=>{normalize();if(resumeTimer.current)pauseBriefly()},
  };
}
