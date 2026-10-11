import { useEffect, useRef, useState, type RefObject } from 'react';
import { ArrowUpRight, BookOpen, Boxes, ChartNoAxesCombined, ChevronLeft, ChevronRight, Compass, ExternalLink, Languages, Radio, Shield, Wrench } from 'lucide-react';
import { parseOrgNews, type OrgNewsFeed } from './lib/org-news.mjs';
import './community-preview.css';

const tools = [
  {title:'UEX',description:'Trade • Market Data',url:'https://uexcorp.space/',Icon:ChartNoAxesCombined},
  {title:'Erkul',description:'Ship Loadouts',url:'https://erkul.games/',Icon:Wrench},
  {title:'SC Craft Tools',description:'Crafting & Blueprints',url:'https://sc-craft.tools/',Icon:Boxes},
  {title:'SC Trade Tools',description:'Routes & Commodities',url:'https://sc-trade.tools/',Icon:Compass},
  {title:'Star Citizen Wiki',description:'Guides & Reference',url:'https://starcitizen.tools/',Icon:BookOpen},
  {title:'StarStrings',description:'Community Text Project',url:'https://github.com/MrKraken/StarStrings',Icon:Languages},
];

// Native overflow scrolling provides touch swipe, trackpad, mouse wheel and keyboard access.
// These buttons let mouse users page through exactly one visible card at a time.
function RailArrows({rail,title}:{rail:RefObject<HTMLDivElement|null>;title:string}){
  const move=(direction:number)=>{
    const viewport=rail.current;
    if(!viewport)return;
    const card=viewport.firstElementChild as HTMLElement | null;
    const gap=parseFloat(getComputedStyle(viewport).columnGap)||0;
    const step=(card?.getBoundingClientRect().width||viewport.clientWidth*0.7)+gap;
    viewport.scrollBy({left:direction*step,behavior:'smooth'});
  };
  return <div className="preview-rail-controls" role="group" aria-label={title+' carousel controls'}>
    <button type="button" aria-label={'Previous '+title} onClick={()=>move(-1)}><ChevronLeft size={19}/></button>
    <button type="button" aria-label={'Next '+title} onClick={()=>move(1)}><ChevronRight size={19}/></button>
  </div>;
}

export function PilotsToolkit(){
  const rail=useRef<HTMLDivElement>(null);
  return <section className="section pilots-toolkit" id="toolkit" aria-labelledby="toolkit-heading">
    <div className="section-heading">
      <div><p className="eyebrow">QUICK ACCESS / RESOURCES</p><h2 id="toolkit-heading">PILOT’S TOOLKIT</h2><p className="toolkit-subtitle">Trusted community tools for the ’verse. One stop, six shortcuts.</p></div>
      <RailArrows rail={rail} title="Pilot's Toolkit"/>
    </div>
    <div className="toolkit-grid preview-scroll-rail" ref={rail} role="region" tabIndex={0} aria-label="Pilot's Toolkit links, scroll horizontally">
      {tools.map(({title,description,url,Icon})=><a key={url} href={url} target="_blank" rel="noopener noreferrer" className="toolkit-card" aria-label={'Open '+title+' in a new tab'}>
        <div className="toolkit-icon"><Icon size={27} strokeWidth={1.7}/></div>
        <strong>{title}</strong><span>{description}</span><ExternalLink className="toolkit-link-icon" size={14}/>
      </a>)}
    </div>
    <p className="toolkit-note">Swipe or use the arrows to explore tools. External resources open in a new tab.</p>
  </section>;
}

const formatDay=(iso:string)=>new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Chicago'});

export function OrgNewsWire({discordUrl}:{discordUrl:string}){
  const [feed,setFeed]=useState<OrgNewsFeed|null>(null);
  const [error,setError]=useState(false);
  const rail=useRef<HTMLDivElement>(null);
  useEffect(()=>{let alive=true;const liveUrl='https://raw.githubusercontent.com/BobbyBull2/SDAS-SC-Calendar/main/org-news/feed.json';const fallbackUrl=import.meta.env.BASE_URL+'data/org-news-preview.json';const read=async(url:string)=>{const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('News feed unavailable');return parseOrgNews(await response.json())};const update=async()=>{try{const published=await read(liveUrl);if(published.mode!=='live')throw Error('Feed not yet published');if(alive){setFeed(published);setError(false)}}catch{try{const demo=await read(fallbackUrl);if(alive){setFeed(demo);setError(false)}}catch{if(alive){setError(true);setFeed(null)}}}};void update();const timer=setInterval(()=>{if(!document.hidden)void update()},600000);return()=>{alive=false;clearInterval(timer)}},[]);
  return <section className="section news-wire" id="news" aria-labelledby="news-heading">
    <div className="section-heading">
      <div><p className="eyebrow">ORGANIZATION / COMMUNICATIONS</p><h2 id="news-heading">SDAS NEWS WIRE</h2><p className="toolkit-subtitle">Org announcements, without the Discord scroll.</p></div>
      <div className="news-wire-actions">
        <a className="news-discord-button" href={discordUrl} target="_blank" rel="noopener noreferrer"><Radio size={17}/> Visit SDAS Discord <ArrowUpRight size={16}/></a>
        <RailArrows rail={rail} title="SDAS News Wire"/>
      </div>
    </div>
    {feed?.mode==='demo'&&<p className="news-preview-notice"><Shield size={16}/> REVIEW PREVIEW — Example posts only. No real Discord messages are being published.</p>}
    {error&&<p className="news-preview-notice"><Shield size={16}/> News wire temporarily unavailable. Check SDAS Discord for updates.</p>}
    <div className="news-wire-grid preview-scroll-rail" ref={rail} role="region" tabIndex={0} aria-label="SDAS News Wire, scroll horizontally">
      {feed?.items.slice(0,12).map((post,index)=><article className="news-wire-card" key={post.id}>
        <div className="news-wire-card-head"><span className="news-sequence">TRANSMISSION {String(index+1).padStart(2,'0')}</span><span className="news-feed-source">{feed.mode==='demo'?'SAMPLE':'ORG NEWS'}</span></div>
        <h3>{post.title}</h3><p>{post.body}</p>
        <div className="news-wire-card-footer">
          {post.publishedAt?<time dateTime={post.publishedAt}>{formatDay(post.publishedAt)}</time>:<span>{feed.mode==='demo'?'Preview layout':'SDAS announcement'}</span>}
          {post.discordUrl?<a href={post.discordUrl} target="_blank" rel="noopener noreferrer">Read on Discord <ExternalLink size={13}/></a>:<Radio size={17} aria-hidden="true"/>}
        </div>
      </article>)}
    </div>
    {feed?.mode==='live'&&!feed.items.length&&<p className="toolkit-note">No recent public announcements. Check the SDAS Discord for the latest org news.</p>}{!feed&&!error&&<p className="toolkit-note">Loading news wire preview…</p>}
    <p className="news-wire-footnote">Swipe or use the arrows to browse announcements. Live Discord publishing comes after Fox approves the design.</p>
  </section>;
}
