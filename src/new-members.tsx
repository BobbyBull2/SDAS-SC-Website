import React from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, ChevronRight, ExternalLink, Menu, MessageCircle, UserRound, UserRoundPlus, X } from 'lucide-react';
import '@fontsource/black-ops-one/latin-400.css';
import '@fontsource/barlow-condensed/latin-400.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/barlow/latin-400.css';
import '../src/style.css';
import './new-members.css';
import config from '../content/site.json';

const home = '../';
const nav = [
  {text:'HOME',url:home},
  {text:'ABOUT',url:home+'#about'},
  {text:'CALENDAR',url:home+'#calendar'},
  {text:'SCREENSHOTS',url:home+'#screenshots'},
  {text:'TOOLKIT',url:home+'#toolkit'},
  {text:'NEWS',url:home+'#news'},
];

function WelcomeHeader(){
  const [open,setOpen] = React.useState(false);
  return <header className="welcome-header">
    <div className="welcome-nav">
      <a href={home} className="welcome-brand" aria-label="SDAS home">
        <img src="../images/sdas-brand-logo.webp" width="225" height="67" alt="SDAS: Some Dudes and a Spaceship" />
      </a>
      <button className="welcome-mobile-menu" type="button" aria-label={open?'Close menu':'Open menu'} aria-controls="welcome-navigation" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?<X size={21}/>:<Menu size={21}/>}</button>
      <nav id="welcome-navigation" className={open?'is-open':''} aria-label="Website navigation">{nav.map(item=><a href={item.url} key={item.text}>{item.text}</a>)}</nav>
      <a href={config.org} className="welcome-header-join" target="_blank" rel="noopener noreferrer">JOIN SDAS <ExternalLink size={16}/></a>
    </div>
  </header>;
}

const steps = [
  {num:'01',title:'Join the org',detail:'Request to join SDAS on RSI.',url:config.org,Icon:UserRound},
  {num:'02',title:'Meet the crew',detail:'Hop into Discord and say hello.',url:config.discord,Icon:MessageCircle},
  {num:'03',title:'Pick a flight',detail:'Browse the calendar and join an event that sounds fun.',url:home+'#calendar',Icon:CalendarDays},
];

function NewMembersPage(){
  return <div className="welcome-page">
    <a className="welcome-skip" href="#welcome-main">Skip to content</a>
    <div className="welcome-review-banner">FOX REVIEW PREVIEW · NOT THE LIVE SDAS WEBSITE</div>
    <WelcomeHeader/>
    <main className="welcome-main" id="welcome-main">
      <section className="welcome-hero" aria-labelledby="welcome-heading">
        <p className="welcome-eyebrow">GUIDES / GET STARTED</p>
        <h1 id="welcome-heading">NEW TO SDAS?</h1>
        <p className="welcome-lead">Welcome aboard. Find your crew and enjoy the ’verse at your own pace.</p>
        <p className="welcome-life">Life comes first. Join a flight whenever you can.</p>
        <div className="welcome-hero-actions">
          <a className="welcome-action is-primary" href={config.org} target="_blank" rel="noopener noreferrer"><UserRoundPlus size={26}/> <span>JOIN SDAS ON RSI</span><ExternalLink size={19}/></a>
          <a className="welcome-action" href={config.discord} target="_blank" rel="noopener noreferrer"><MessageCircle size={25}/><span>JOIN OUR DISCORD</span><ExternalLink size={19}/></a>
        </div>
      </section>
      <section className="welcome-steps" aria-labelledby="welcome-steps-heading">
        <p className="welcome-eyebrow">GET STARTED</p>
        <h2 id="welcome-steps-heading">YOUR FIRST FLIGHT</h2>
        <div className="welcome-steps-grid">{steps.map(({num,title,detail,url,Icon})=>
          <a className="welcome-step" key={num} href={url} {...(url.startsWith('https:')?{target:'_blank',rel:'noopener noreferrer'}:{})}>
            <span className="welcome-step-number">{num}</span>
            <Icon size={34} strokeWidth={1.65} aria-hidden="true"/>
            <span className="welcome-step-content"><strong>{title}</strong><span>{detail}</span></span>
            <ChevronRight className="welcome-step-arrow" size={18} aria-hidden="true"/>
          </a>
        )}</div>
      </section>
      <div className="welcome-footnote"><Check size={18} aria-hidden="true"/><span>No attendance requirements. No pressure. Just good company in the ’verse.</span></div>
      <div className="welcome-return"><a href={home}><ArrowLeft size={16}/> Back to SDAS homepage</a><a href={config.org} target="_blank" rel="noopener noreferrer">OUR RSI ORG PAGE <ArrowUpRight size={15}/></a></div>
    </main>
    <footer className="welcome-footer"><span>Some Dudes and a Spaceship · Good friends, wherever you fly.</span><span>Independent Star Citizen fan community. Not affiliated with CIG.</span></footer>
  </div>;
}
createRoot(document.getElementById('root')!).render(<NewMembersPage/>);
