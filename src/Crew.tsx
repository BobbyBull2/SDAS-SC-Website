import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Users, Pause, Play } from 'lucide-react';
import { useCrewMotion } from './useCrewMotion';
const source='https://robertsspaceindustries.com/en/orgs/SDAS/members';
type Member={handle:string;avatar:string|null;profile:string;rank:string|null;roles:string[]};
type Roster={source:string;fetchedAt:string;members:Member[]};
function safeURL(value:unknown,profile=false):boolean {
  if(typeof value!=='string')return false;
  try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&
    (profile?u.hostname==='robertsspaceindustries.com'&&/^\/(en\/)?citizens\/[^/]+$/.test(u.pathname):
      u.hostname==='robertsspaceindustries.com'||u.hostname.endsWith('.robertsspaceindustries.com'))}catch{return false}
}
function Avatar({member}:{member:Member}){
  const [failed,setFailed]=useState(false);
  return member.avatar&&!failed?<img src={member.avatar} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:
    <span className="crew-avatar-missing" aria-label="Avatar unavailable"><Users aria-hidden="true"/></span>;
}
export function Crew(){
  const [roster,setRoster]=useState<Roster|null>(null),[failed,setFailed]=useState(false);
  const motion=useCrewMotion(roster?.members.length||0);
  useEffect(()=>{
    const controller=new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/members.json`,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{
      if(data.schemaVersion!==1||data.source!==source||!Number.isFinite(Date.parse(data.fetchedAt))||!Array.isArray(data.members)||new Set(data.members.map((m:Member)=>m?.handle?.toLowerCase())).size!==data.members.length||
        !data.members.every((m:Member)=>m&&typeof m.handle==='string'&&m.handle.length>0&&safeURL(m.profile,true)&&
          (m.avatar===null||safeURL(m.avatar))&&(m.rank===null||typeof m.rank==='string')&&Array.isArray(m.roles)&&m.roles.every(r=>typeof r==='string')))throw Error();
      
      const shuffled = [...data.members];

      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      setRoster({...data, members: shuffled});

    }).catch(()=>{if(!controller.signal.aborted)setFailed(true)});
    return()=>controller.abort();
  },[]);
  const stale=roster&&Date.now()-Date.parse(roster.fetchedAt)>48*3600000;
  return <section className="section crew" id="crew" aria-labelledby="crew-heading" ref={motion.section}
    onPointerEnter={e=>{if(e.pointerType==='mouse')motion.onMouseEnter()}} onPointerLeave={e=>{if(e.pointerType==='mouse')motion.onMouseLeave()}}
    onFocus={motion.onFocus} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))motion.onBlur()}}>
    <div className="section-heading"><div><p className="eyebrow">GOOD FRIENDS. GREAT COMPANY.</p><h2 id="crew-heading">OUR CREW</h2></div>
      <a href={source} className="button">Meet us on RSI <ExternalLink size={15}/></a></div>
    <div className="crew-toolbar"><p>Different pilots. Same good company.</p><div>{motion.looping&&roster&&roster.members.length>1&&<button className="crew-play" aria-label={motion.playing?'Pause crew scrolling':'Play crew scrolling'} onClick={motion.toggle}>{motion.playing?<Pause size={15}/>:<Play size={15}/>}<span>{motion.playing?'Pause':'Play'}</span></button>}<button aria-label="Previous crew members" onClick={()=>motion.move(-1)}><ChevronLeft/></button><button aria-label="Next crew members" onClick={()=>motion.move(1)}><ChevronRight/></button></div></div>
    {roster&&<div ref={motion.rail} className="crew-rail" data-looping={motion.looping} data-running={motion.running} tabIndex={0}
      aria-label="Public SDAS members, scroll horizontally" onPointerDown={motion.onPointerDown} onWheel={motion.onWheel} onScroll={motion.onScroll}
      onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();motion.move(e.key==='ArrowRight'?1:-1)}}}>
      {(motion.looping?['before','original','after']:['original']).map(copy=><div className="crew-group" key={copy}
        ref={copy==='original'?motion.original:undefined} aria-hidden={copy==='original'?undefined:true} data-copy={copy}>
        {roster.members.map(member=><a className="crew-card" href={member.profile} key={member.handle} tabIndex={copy==='original'?undefined:-1}
          onMouseDown={copy==='original'?undefined:e=>e.preventDefault()}>
          <Avatar member={member}/><h3>{member.handle}</h3>{member.rank&&<p className="crew-rank">{member.rank}</p>}
          {member.roles.length>0&&<p className="crew-roles">{member.roles.join(' · ')}</p>}
          <span className="crew-profile">RSI profile <ExternalLink size={12}/></span></a>)}
      </div>)}
    </div>}
    {failed?<p className="feed-notice">Crew roster temporarily unavailable. Meet our members on RSI using the link above.</p>:!roster?<p className="feed-notice">Loading the crew…</p>:!roster.members.length?<p className="feed-notice">No publicly visible members in this snapshot.</p>:null}
    {roster&&<p className="source-note">{roster.members.length} publicly listed members · {stale?'Last saved roster':'RSI snapshot'} {new Date(roster.fetchedAt).toLocaleDateString()} · Hidden members are not listed.</p>}
  </section>;
}
