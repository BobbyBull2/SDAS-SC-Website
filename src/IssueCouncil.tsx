import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, ExternalLink, LockKeyhole, Plus, Search, ShieldCheck, X } from 'lucide-react';
import './issue-council.css';
import { cigKnownIssues, cigKnownIssuesSource, cigKnownIssuesSourceUpdated } from './cig-known-issues';

// Issue Council URLs are user navigation only. CIG reports are never created or
// promoted by this app; visitors act on the official RSI Issue Council.
const IC_ROOT='https://issue-council.robertsspaceindustries.com/projects/STAR-CITIZEN';
const SUPABASE_URL='https://zfvfpbfkbvudaezichrh.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_n10yR_G-0OOmFWjHdrb8Yw_8lJfs8io';
const MEMBER_ROLES=['admin','officer','member'];
type Report={id:string;issue_code:string;title:string;issue_url:string;display_name:string;is_anonymous:boolean;created_at:string};
const isReportCode=(code:string)=>/^STARC-[0-9]{1,10}$/.test(code);
function officialCode(input:string){
  const value=input.trim();
  if(isReportCode(value.toUpperCase()))return value.toUpperCase();
  try {
    const url=new URL(value);
    if(url.origin!=='https://issue-council.robertsspaceindustries.com')return '';
    const match=url.pathname.match(/^\/projects\/STAR-CITIZEN\/issues\/(STARC-[0-9]{1,10})\/?$/i);
    return match?match[1].toUpperCase():'';
  }catch{return '';}
}
function officialUrl(code:string){return IC_ROOT+'/issues/'+code;}
function searchUrl(query:string){const q=query.trim();return IC_ROOT+'/issues'+(q?'?search='+encodeURIComponent(q)+'&limit=50':'');}
export function IssueCouncil(){
 const rail=useRef<HTMLDivElement>(null);
 const [reports,setReports]=useState<Report[]>([]);
 const [loading,setLoading]=useState(true);
 const [feedError,setFeedError]=useState('');
 const [search,setSearch]=useState('');
 const [showForm,setShowForm]=useState(false);
 const [reportInput,setReportInput]=useState('');
 const [title,setTitle]=useState('');
 const [pilot,setPilot]=useState('');
 const [anonymous,setAnonymous]=useState(true);
 const [message,setMessage]=useState('');
 const [saving,setSaving]=useState(false);
 const [sb,setSb]=useState<any>(null);
 const [session,setSession]=useState<any>(null);
 const [memberRole,setMemberRole]=useState('');
 const [authNote,setAuthNote]=useState('');
 const canAdd=MEMBER_ROLES.includes(memberRole);
 const canModerate=memberRole==='admin';
 const code=officialCode(reportInput);
 const readReports=async(client:any)=>{
   const {data,error}=await client.from('preview_sdas_issues').select('id,issue_code,title,issue_url,display_name,is_anonymous,created_at').order('created_at',{ascending:false}).limit(100);
   if(error)throw error;
   setReports(data||[]);setFeedError('');
 };
 const readAuth=async(client:any)=>{
   const {data:{session:current}}=await client.auth.getSession();
   setSession(current);
   if(!current?.user){setMemberRole('');setAuthNote('Sign in with Discord to submit an SDAS issue.');return;}
   const {data:m,error}=await client.from('sdas_memberships').select('role,discord_rank,last_role_checked_at').eq('user_id',current.user.id).maybeSingle();
   if(error){setMemberRole('');setAuthNote('Role lookup unavailable. Refresh SDAS roles and try again.');return;}
   const ranks:{[key:string]:string}={admin:'super_admin',officer:'board_member',member:'patch',prospect:'prospect'};
   const fresh=!!m?.last_role_checked_at&&Date.now()-new Date(m.last_role_checked_at).getTime()<12*60*60*1000;
   const trusted=!!m?.role&&m.discord_rank===ranks[m.role]&&fresh;
   setMemberRole(trusted?m.role:'');
   setAuthNote(!trusted?'Discord membership needs verification.':m.role==='prospect'?'Prospect — read only':m.role==='admin'?'Super Admin — issue administrator':m.role==='officer'?'Board Member — submissions enabled':'Patch — submissions enabled');
 };
 useEffect(()=>{
   let alive=true;
   let unsubscribe:undefined|(()=>void);
   (async()=>{
     try {
       const moduleUrl='https://esm.sh/@supabase/supabase-js@2.57.0';
       const lib:any=await import(/* @vite-ignore */ moduleUrl);
       if(!alive)return;
       const client=lib.createClient(SUPABASE_URL,PUBLISHABLE_KEY,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true,storageKey:'sdas-issue-preview-auth'}});
       setSb(client);
       const {data:listener}=client.auth.onAuthStateChange(()=>{setTimeout(()=>{if(alive)void readAuth(client);},0);});
       unsubscribe=()=>listener.subscription.unsubscribe();
       await Promise.all([readReports(client),readAuth(client)]);
     } catch(e){if(alive){setFeedError('The preview issue board is temporarily unavailable.');setAuthNote('Discord sign-in is temporarily unavailable.');}}
     finally{if(alive)setLoading(false);}
   })();
   return()=>{alive=false;unsubscribe?.();};
 },[]);
 const login=async()=>{
   if(!sb)return;
   setAuthNote('Opening Discord authentication…');
   const {error}=await sb.auth.signInWithOAuth({provider:'discord',options:{redirectTo:location.origin+location.pathname+location.hash,scopes:'identify guilds guilds.members.read'}});
   if(error)setAuthNote(error.message);
 };
 const verify=async()=>{
   if(!sb)return;
   setAuthNote('Checking Discord roles…');
   const {data:{session:current}}=await sb.auth.getSession();
   if(!current?.provider_token){setAuthNote('Discord permission is missing or expired. Reconnect Discord.');return;}
   try{
     const response=await fetch(SUPABASE_URL+'/functions/v1/verify-sdas-discord-issues-preview',{
       method:'POST',headers:{'Content-Type':'application/json','apikey':PUBLISHABLE_KEY,'Authorization':'Bearer '+current.access_token},
       body:JSON.stringify({provider_token:current.provider_token})
     });
     const result=await response.json().catch(()=>({}));
     if(!response.ok)throw Error(result.error||'Role verification unavailable.');
     await readAuth(sb);
   }catch(e){setAuthNote(e instanceof Error?e.message:'Could not verify roles.');}
 };
 const submit=async(event:React.FormEvent)=>{
   event.preventDefault();setMessage('');
   if(!sb||!session?.user||!canAdd){setMessage('Verified Patch membership or higher is required.');return;}
   if(!code){setMessage('Enter an official STAR-CITIZEN Issue Council link or STARC number.');return;}
   const nice=title.trim();
   const shown=anonymous?'Anonymous':pilot.trim();
   if(nice.length<8||nice.length>160){setMessage('Please enter a descriptive issue title (8–160 characters).');return;}
   if(!anonymous&&(!shown||shown.length>60)){setMessage('Add a pilot name of 1–60 characters or choose Anonymous.');return;}
   if(reports.some(i=>i.issue_code===code)){setMessage('This issue is already on the SDAS board.');return;}
   setSaving(true);
   try{
     const {error}=await sb.from('preview_sdas_issues').insert({issue_code:code,issue_url:officialUrl(code),title:nice,submitted_by:session.user.id,display_name:shown,is_anonymous:anonymous});
     if(error)throw error;
     await readReports(sb);setShowForm(false);setReportInput('');setTitle('');setMessage('Issue added to the SDAS preview priority board.');
     rail.current?.scrollTo({left:0,behavior:'smooth'});
   }catch(e:any){setMessage(e?.code==='23505'?'That Issue Council report has already been submitted.':(e?.message||'Could not add issue. Refresh Discord roles and try again.'));}
   finally{setSaving(false);}
 };
 const remove=async(id:string)=>{
   if(!sb||!canModerate||!window.confirm('Remove this issue from the preview board?'))return;
   const {error}=await sb.from('preview_sdas_issues').delete().eq('id',id);
   if(error){setMessage('Unable to remove this issue.');return;}
   await readReports(sb);setMessage('Issue removed from preview.');
 };
 const sdaspool=reports.filter(i=>(i.title+' '+i.issue_code+' '+i.display_name).toLowerCase().includes(search.trim().toLowerCase()));
 const cigpool=cigKnownIssues.filter(i=>!reports.some(r=>r.issue_code===i.issue_code)&&
   (i.title+' '+i.issue_code).toLowerCase().includes(search.trim().toLowerCase()));
 // Member submissions always win priority. The official known-issues fallback
 // fills unclaimed featured slots only; slots 6–10 remain available for Dudes.
 const featured=[...sdaspool.slice(0,5),...cigpool].slice(0,5);
 const queued=sdaspool.slice(5,10);
 const slots=Array.from({length:10},(_,i)=>i<5?(featured[i]||null):(queued[i-5]||null));

 return <section className="section issue-council" id="issue-council" aria-labelledby="sdas-issues-heading">
  <div className="section-heading issue-heading">
   <div><p className="eyebrow">COMMUNITY OPERATIONS / CIG ISSUE COUNCIL</p><h2 id="sdas-issues-heading">SDAS TOP 5 ISSUES</h2><p className="toolkit-subtitle">Our crew's bugs take priority. Help fix the 'verse — one report at a time.</p></div>
   <div className="issue-nav-arrows"><button type="button" aria-label="Previous issues" onClick={()=>rail.current?.scrollBy({left:-650,behavior:'smooth'})}><ChevronLeft/></button><button type="button" aria-label="Next issues" onClick={()=>rail.current?.scrollBy({left:650,behavior:'smooth'})}><ChevronRight/></button></div>
  </div>
  <div className="issue-toolbar">
    <form onSubmit={e=>{e.preventDefault();window.open(searchUrl(search),'_blank','noopener,noreferrer');}} className="issue-search" role="search" aria-label="Search Issue Council"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search SDAS reports or all CIG issues" aria-label="Search issue reports"/><button type="submit">SEARCH CIG <ArrowUpRight size={14}/></button></form>
    <a className="issue-external" href={IC_ROOT+'/issues'} target="_blank" rel="noopener noreferrer">BROWSE ALL <ExternalLink size={14}/></a>
    <a className="issue-external" href={IC_ROOT} target="_blank" rel="noopener noreferrer">CREATE ON CIG <ExternalLink size={14}/></a>
    <button className="issue-primary" type="button" onClick={()=>setShowForm(v=>!v)}><Plus size={16}/> ADD YOUR ISSUE</button>
  </div>
  <div className="issue-card-rail" ref={rail} tabIndex={0} aria-label="SDAS issues, horizontal scrolling">
   {slots.map((issue,i)=>issue?<article className={'issue-card '+(i<5?'issue-featured':'')} key={issue.issue_code}>
    <div className="issue-card-top"><span>#{String(i+1).padStart(2,'0')}</span><strong>{'id' in issue?(i<5?'SDAS PRIORITY':'SDAS QUEUE'):'CIG KNOWN ISSUE'}</strong></div>
    <span className="issue-card-code">{issue.issue_code}</span><h3>{issue.title}</h3>
    <p className="issue-added">{'id' in issue ? <>ADDED BY: {issue.is_anonymous?'Anonymous':issue.display_name}</> : 'SOURCE: OFFICIAL CIG KNOWN ISSUES'}</p>
    <p className="issue-card-note">Official CIG status and votes: view on RSI</p>
    <a href={issue.issue_url} target="_blank" rel="noopener noreferrer" className="issue-card-button">VIEW &amp; PROMOTE <ArrowUpRight size={16}/></a>
    {'id' in issue&&canModerate&&<button className="issue-remove" onClick={()=>void remove(issue.id)} type="button" aria-label={'Remove '+issue.issue_code}>Remove from preview</button>}
   </article>:<article className="issue-card issue-empty" key={'empty-'+i}>
    <div className="issue-card-top"><span>#{String(i+1).padStart(2,'0')}</span><strong>{i<5?'OPEN PRIORITY':'AVAILABLE SLOT'}</strong></div>
    <span className="issue-empty-icon"><Plus size={27}/></span>
    <h3>{i<5?'HELP SET OUR PRIORITIES':'YOUR ISSUE COULD BE HERE'}</h3>
    <p className="issue-card-note">{i<5?'SDAS members get first priority. Discover active issues on CIG while this slot is open.':'Submit an official Issue Council report to join the SDAS queue.'}</p>
    <button type="button" className="issue-card-button" onClick={()=>setShowForm(true)}>ADD AN ISSUE <Plus size={15}/></button>
   </article>)}
  </div>
  {loading&&<p className="feed-notice">Loading SDAS Issue Council preview…</p>}
  {feedError&&<p className="feed-notice" role="alert">{feedError}</p>}
  {message&&<p className="issue-message" role="status">{message}</p>}
  <div className="issue-meta"><span><ShieldCheck size={15}/> {reports.length} member-submitted issue{reports.length===1?'':'s'} · SDAS entries ranked newest first</span><span>Featured fallback: <a href={cigKnownIssuesSource} target="_blank" rel="noopener noreferrer">CIG Known Issues</a> (updated {cigKnownIssuesSourceUpdated}) • Not vote-ranked</span></div>
  {showForm&&<div className="issue-submit-panel">
    <div className="issue-panel-header"><div><p className="eyebrow">SDAS / BUG OPERATIONS</p><h3>ADD AN ISSUE COUNCIL REPORT</h3></div><button type="button" aria-label="Close issue form" onClick={()=>setShowForm(false)}><X/></button></div>
    <div className="issue-auth">
      <span><LockKeyhole size={16}/>{authNote||'Checking Discord membership…'}</span>
      {!session?<button type="button" onClick={()=>void login()}>LOGIN WITH DISCORD</button>:<div className="issue-auth-buttons"><button type="button" onClick={()=>void verify()}>REFRESH SDAS ROLES</button><button type="button" onClick={()=>void login()}>RECONNECT DISCORD</button></div>}
    </div>
    <form className="issue-add-form" onSubmit={submit}>
      <label>Official RSI Issue Council URL or STARC number<input required value={reportInput} onChange={e=>setReportInput(e.target.value)} placeholder="STARC-123456 or https://issue-council.robertsspaceindustries.com/…"/></label>
      <label>Title of the reported bug<input required minLength={8} maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Describe what is broken"/></label>
      <label>Pilot name (displayed publicly)<input maxLength={60} value={pilot} onChange={e=>setPilot(e.target.value)} disabled={anonymous} placeholder="Your Discord or RSI callsign"/></label>
      <label className="issue-anonymous"><input type="checkbox" checked={anonymous} onChange={e=>setAnonymous(e.target.checked)}/> List my submission as Anonymous</label>
      <div className="issue-form-bottom"><p>Only verified Patch, Board Member and Super Admin roles can submit. Prospects can browse. Add a report on CIG first; do not submit duplicates.</p><button className="issue-primary" type="submit" disabled={!canAdd||!code||saving}>{saving?'ADDING…':'ADD TO SDAS TOP 5'} <Plus size={14}/></button></div>
      {message&&<p className="issue-message" role="status">{message}</p>}
    </form>
  </div>}
  <p className="issue-disclaimer">SDAS prioritizes member reports only; we do not submit bugs or cast CIG votes on your behalf. On RSI, contribute only if you experienced the bug. Otherwise, select <strong>Please Fix</strong>. To create a new bug report, search for an existing one first.</p>
 </section>;
}
