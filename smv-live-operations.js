/* SMV Live Operations Desk — read-only live work queue, safely isolated from Enquiries DOM. */
(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const closed=new Set(["booked","converted","lost","closed","cancelled","not-interested"]);
let mounted=false,busy=false,channel=null,last=null;
const fmt=n=>new Intl.NumberFormat("en-IN").format(Number(n)||0);
function nav(id){document.querySelectorAll(".crm-top-nav .crm-nav-item").forEach(x=>{const a=x.id===id;x.classList.toggle("active",a);if(a)x.setAttribute("aria-current","page");else x.removeAttribute("aria-current");});}
function hideOthers(){[".crm-main","#venueManagementSection","#smvBusinessOSHub","#smvBusinessIntelligence","#smvGrowthQualityCentre"].forEach(s=>{const e=$(s);if(e)e.hidden=true;});}
function open(){mount();hideOthers();$("#smvLiveOperations").hidden=false;nav("smvBusinessOSHubBtn");$("#smvLiveOperations").scrollIntoView({behavior:"smooth",block:"start"});refresh();subscribe();}
function back(){const s=$("#smvLiveOperations");if(s)s.hidden=true;window.SMVBusinessOS?.open?.();if(!window.SMVBusinessOS?.open){const h=$("#smvBusinessOSHub");if(h){h.hidden=false;nav("smvBusinessOSHubBtn");}}}
function goLeads(id){const s=$("#smvLiveOperations");if(s)s.hidden=true;const main=$(".crm-main");if(main)main.hidden=false;const hub=$("#smvBusinessOSHub");if(hub)hub.hidden=true;nav("crmLeadManagementBtn");if(id&&typeof window.openLeadModal==="function")window.openLeadModal(String(id));else $("#leadManagementSection")?.scrollIntoView({behavior:"smooth",block:"start"});}
function goVenues(){const s=$("#smvLiveOperations");if(s)s.hidden=true;$("#venueManagementBtn")?.click();}
function mount(){
 if(mounted)return;
 const hub=$("#smvBusinessOSHub");if(!hub)return;
 const grid=$(".smv-hub-grid",hub);
 if(grid&&!$("#smvLiveOperationsCard")){
  const c=document.createElement("button");c.type="button";c.id="smvLiveOperationsCard";c.className="smv-hub-card smv-live-ops-launcher";
  c.innerHTML='<span class="smv-hub-icon">◉</span><strong>Live Operations Desk</strong><small>Live follow-ups, uncontacted leads, venue supply and real-time activity signals</small><em>Open live work queue →</em>';
  c.addEventListener("click",open);grid.appendChild(c);
 }
 if(!$("#smvLiveOperations")){
  const section=document.createElement("section");section.id="smvLiveOperations";section.hidden=true;section.setAttribute("aria-label","SMV Live Operations Desk");
  section.innerHTML='<header class="smv-live-head"><div><div class="smv-live-kicker">SMV · REAL-TIME OPERATIONS</div><h1>Live <span>Operations Desk</span></h1><p>One live view of customer follow-ups, venue supply and partner activity. Existing enquiries remain in their original workspace.</p></div><div class="smv-live-actions"><button type="button" data-live="refresh">↻ Refresh now</button><button type="button" data-live="hub">← Business OS</button></div></header>'+
  '<div id="smvLiveStatus" class="smv-live-status" role="status">Connect to your authorised CRM session to load live operations.</div>'+
  '<div id="smvLiveKpis" class="smv-live-kpis"></div>'+
  '<div class="smv-live-grid"><article class="smv-live-panel"><h2>Follow-up control</h2><p>Open enquiries with overdue or due-today callbacks.</p><div id="smvLiveFollowups"></div></article>'+
  '<article class="smv-live-panel"><h2>First-response watch</h2><p>Open enquiries with no recorded contact.</p><div id="smvLiveFirstResponse"></div></article>'+
  '<article class="smv-live-panel"><h2>Venue supply pulse</h2><p>Approved and verified inventory visible to this account.</p><div id="smvLiveSupply"></div><button type="button" data-live="venues" class="smv-live-secondary">Open Venue Management</button></article>'+
  '<article class="smv-live-panel"><h2>Partner assignment pulse</h2><p>Response timestamps recorded against venue assignments.</p><div id="smvLivePartner"></div></article></div>'+
  '<footer class="smv-live-foot">Live refresh uses Supabase Realtime where the project publication and account policies allow it. Manual refresh remains available. This desk is read-only: no customer status, assignment, follow-up, venue or partner record is changed.</footer>';
  document.body.appendChild(section);
  section.addEventListener("click",e=>{const lead=e.target.closest("[data-live-lead]");if(lead){goLeads(lead.dataset.liveLead);return;}const b=e.target.closest("[data-live]");if(!b)return;switch(b.dataset.live){case"refresh":refresh();break;case"hub":back();break;case"venues":goVenues();break;}});
 }
 mounted=true;
}
function rows(items,empty,kind){return items.length?'<div class="smv-live-list">'+items.slice(0,8).map(x=>'<article><div><strong>'+esc(x.title)+'</strong><small>'+esc(x.meta)+'</small></div><button type="button" data-live-lead="'+esc(x.id)+'">'+(kind==="follow"?"Open follow-up":"Open enquiry")+' →</button></article>').join("")+'</div>':'<div class="smv-live-empty">'+esc(empty)+'</div>';}
function render(d){
 const now=Date.now(),active=d.leads.filter(l=>!closed.has(String(l.status||"").toLowerCase()));
 const overdue=active.filter(l=>l.follow_up_at&&new Date(l.follow_up_at).getTime()<now);
 const today=active.filter(l=>{if(!l.follow_up_at)return false;const t=new Date(l.follow_up_at);const n=new Date();return t.toDateString()===n.toDateString();});
 const untouched=active.filter(l=>!Number(l.contact_count||0)&&!l.last_contacted_at&&l.created_at&&now-new Date(l.created_at).getTime()>4*60*60*1000);
 const verified=d.venues.filter(v=>String(v.venue_status||"").toLowerCase()==="approved"&&String(v.verification_status||"").toLowerCase()==="verified");
 const cards=[["Open pipeline",active.length,"Existing open enquiries"],["Overdue follow-ups",overdue.length,"Callback time has passed"],["Due today",today.length,"Scheduled for today"],["First-response watch",untouched.length,"No recorded contact after 4 hours"],["Verified venues",verified.length,"Approved + verified records"],["Partner assignments",d.assignments.length,"Visible assignment records"]];
 $("#smvLiveKpis").innerHTML=cards.map(x=>'<article><span>'+esc(x[0])+'</span><strong>'+fmt(x[1])+'</strong><small>'+esc(x[2])+'</small></article>').join("");
 $("#smvLiveFollowups").innerHTML=rows(overdue.map(l=>({id:l.id,title:l.location||"Area not recorded",meta:(l.occasion||"Event n/a")+" · Due "+new Date(l.follow_up_at).toLocaleString("en-IN")})).concat(today.filter(l=>!overdue.includes(l)).map(l=>({id:l.id,title:l.location||"Area not recorded",meta:(l.occasion||"Event n/a")+" · Today "+new Date(l.follow_up_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}))),"No overdue or due-today follow-ups in the loaded records.","follow");
 $("#smvLiveFirstResponse").innerHTML=rows(untouched.map(l=>({id:l.id,title:l.location||"Area not recorded",meta:(l.occasion||"Event not recorded")+" · Received "+(l.created_at?new Date(l.created_at).toLocaleString("en-IN"):"date unavailable")})),"No first-response alerts detected.","lead");
 const cities={};verified.forEach(v=>{const k=v.city||"City not recorded";cities[k]=(cities[k]||0)+1;});
 $("#smvLiveSupply").innerHTML=Object.keys(cities).length?'<div class="smv-live-stats">'+Object.entries(cities).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<div><span>'+esc(k)+'</span><strong>'+fmt(v)+'</strong></div>').join("")+'</div>':'<div class="smv-live-empty">No approved + verified venue records are visible.</div>';
 const viewed=d.assignments.filter(a=>a.first_viewed_at).length,contacted=d.assignments.filter(a=>a.first_contacted_at).length,visits=d.assignments.filter(a=>a.site_visit_at).length;
 $("#smvLivePartner").innerHTML='<div class="smv-live-stats"><div><span>Viewed</span><strong>'+fmt(viewed)+'</strong></div><div><span>Contacted</span><strong>'+fmt(contacted)+'</strong></div><div><span>Site visits</span><strong>'+fmt(visits)+'</strong></div></div><p class="smv-live-note">Only recorded timestamps are counted. A missing timestamp is not proof of partner inactivity.</p>';
}
async function refresh(){
 if(busy)return;const status=$("#smvLiveStatus"),db=window.getSupabaseClient?.();if(!db){if(status)status.textContent="CRM database client is not ready. Reload the workspace or try again.";return;}
 busy=true;if(status)status.textContent="Refreshing authorised live operations data…";
 try{
  const [lr,vr,ar]=await Promise.all([
   db.from("customer_enquiries").select("id,location,occasion,status,created_at,follow_up_at,contact_count,last_contacted_at").order("created_at",{ascending:false}).limit(5000),
   db.from("venues").select("id,venue_name,city,venue_status,verification_status").limit(3000),
   db.from("venue_enquiry_assignments").select("id,enquiry_id,venue_id,assignment_status,assigned_at,first_viewed_at,first_contacted_at,follow_up_at,site_visit_at").order("assigned_at",{ascending:false}).limit(5000)
  ]);
  for(const r of [lr,vr,ar])if(r.error)throw r.error;
  last={leads:lr.data||[],venues:vr.data||[],assignments:ar.data||[]};render(last);
  if(status)status.textContent="Data refreshed "+new Date().toLocaleTimeString("en-IN")+" · "+fmt(last.leads.length)+" enquiries · "+fmt(last.venues.length)+" venues · "+(channel?"Realtime subscription active (if enabled)":"Manual refresh available");
 }catch(e){console.error("SMV Live Operations refresh failed",e);if(status)status.textContent="Live operations could not refresh: "+(e?.message||"connection or access issue")+". Existing records are unchanged.";}
 finally{busy=false;}
}
function subscribe(){
 if(channel)return;const db=window.getSupabaseClient?.();if(!db?.channel)return;
 try{
  channel=db.channel("smv-live-operations-"+Math.random().toString(36).slice(2));
  ["customer_enquiries","venues","venue_enquiry_assignments","lead_followups","crm_activity_log"].forEach(table=>channel.on("postgres_changes",{event:"*",schema:"public",table},()=>{if(!$("#smvLiveOperations")?.hidden)refresh();}));
  channel.subscribe(state=>{const s=$("#smvLiveStatus");if(s&&state==="SUBSCRIBED")s.textContent="Realtime subscription connected · authorised data only. Manual refresh remains available.";if(s&&["CHANNEL_ERROR","TIMED_OUT","CLOSED"].includes(state))s.textContent="Realtime is unavailable for one or more tables. Manual refresh remains available.";});
 }catch(e){channel=null;console.warn("SMV realtime subscription unavailable",e);}
}
function start(){mount();$("#crmLeadManagementBtn")?.addEventListener("click",()=>{const s=$("#smvLiveOperations");if(s)s.hidden=true;});$("#venueManagementBtn")?.addEventListener("click",()=>{const s=$("#smvLiveOperations");if(s)s.hidden=true;});}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
window.SMVLiveOperations={open,refresh};
})();