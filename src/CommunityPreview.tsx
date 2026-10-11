import { useEffect, useState } from 'react';
import { ArrowUpRight, BookOpen, Boxes, ChartNoAxesCombined, Compass, ExternalLink, Languages, Radio, Shield, Wrench } from 'lucide-react';
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

export function PilotsToolkit(){
  return <section className="section pilots-toolkit" id="toolkit" aria-labelledby="toolkit-heading">
    <div className="section-heading">
      <div><p className="eyebrow">QUICK ACCESS / RESOURCES</p><h2 id="toolkit-heading">PILOT’S TOOLKIT</h2><p className="toolkit-subtitle">Trusted community tools for the ’verse. One stop, six shortcuts.</p></div>
    </div>
    <div className="toolkit-grid">
      {tools.map(({title,description,url,Icon})=><a key={url} href={url} target="_blank" rel="noopener noreferrer" className="toolkit-card" aria-label={'Open '+title+' in a new tab'}>
        <div className="toolkit-icon"><Icon size={27} strokeWidth={1.7}/></div>
        <strong>{title}</strong><span>{description}</span><ExternalLink className="toolkit-link-icon" size={14}/>
      </a>)}
    </div>
    <p className="toolkit-note">Independent community resources. Links open in a new tab.</p>
  </section>;
}

const formatDay=(iso:string)=>new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Chicago'});

export function OrgNewsWire({discordUrl}:{discordUrl:string}){
  const [feed,setFeed]=useState<OrgNewsFeed|null>(null);
  const [error,setError]=useState(false);
  useEffect(()=>{let alive=true;fetch(import.meta.env.BASE_URL+'data/org-news-preview.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Unable to load news preview');return r.json()}).then(payload=>{const parsed=parseOrgNews(payload);if(alive)setFeed(parsed)}).catch(()=>{if(alive)setError(true)});return()=>{alive=false}},[]);
  return <section className="section news-wire" id="news" aria-labelledby="news-heading">
    <div className="section-heading">
      <div><p className="eyebrow">ORGANIZATION / COMMUNICATIONS</p><h2 id="news-heading">SDAS NEWS WIRE</h2><p className="toolkit-subtitle">Org announcements, without the Discord scroll.</p></div>
      <a className="news-discord-button" href={discordUrl} target="_blank" rel="noopener noreferrer"><Radio size={17}/> Visit SDAS Discord <ArrowUpRight size={16}/></a>
    </div>
    {feed?.mode==='demo'&&<p className="news-preview-notice"><Shield size={16}/> REVIEW PREVIEW — Example posts only. No real Discord messages are being published.</p>}
    {error&&<p className="news-preview-notice"><Shield size={16}/> News wire temporarily unavailable. Check SDAS Discord for updates.</p>}
    <div className="news-wire-grid">
      {feed?.items.slice(0,3).map((post,index)=><article className="news-wire-card" key={post.id}>
        <div className="news-wire-card-head"><span className="news-sequence">TRANSMISSION {String(index+1).padStart(2,'0')}</span><span className="news-feed-source">{feed.mode==='demo'?'SAMPLE':'ORG NEWS'}</span></div>
        <h3>{post.title}</h3><p>{post.body}</p>
        <div className="news-wire-card-footer">
          {post.publishedAt?<time dateTime={post.publishedAt}>{formatDay(post.publishedAt)}</time>:<span>{feed.mode==='demo'?'Preview layout':'SDAS announcement'}</span>}
          {post.discordUrl?<a href={post.discordUrl} target="_blank" rel="noopener noreferrer">Read on Discord <ExternalLink size={13}/></a>:<Radio size={17} aria-hidden="true"/>}
        </div>
      </article>)}
    </div>
    {!feed&&!error&&<p className="toolkit-note">Loading news wire preview…</p>}
    <p className="news-wire-footnote">News channel connection and publishing controls will be enabled after Fox approves the design.</p>
  </section>;
}
