/* SMV Partner Response Centre — Master-side read-only monitor of existing partner replies.
   Uses existing assignments and availability response tables. No enquiry/assignment writes. */
(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s),esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>new Intl.NumberFormat("en-IN").format(Number(n)||0),closed=new Set(["booked","converted","lost","closed","cancelled","not interested"]);
let mounted=false,busy=false,assignments=[],responses=[],filter="all",channels=[];
const norm=s=>String(s||"").toLowerCase().trim();
function setNav(){document.querySelectorAll(".crm-top-nav .crm-nav-item").forEach(x=>{const on=x.id==="smvBusinessOSHubBtn";x.classList.toggle("active",on);if(on)x.setAttribute("aria-current","page");else x.removeAttribute("aria-current");});}
function mount(){
 if(mounted)return;const hub=$("#smvBusinessOSHub");if(!hub)return;
 const grid=$(".smv-hub-grid",hub);
 if(grid&&!$("#smvPartnerResponseCard")){const c=document.createElement("button");c.type="button";c.id="smvPartnerResponseCard";c.className="smv-hub-card smv-response-launcher";c.innerHTML='<span class="smv-hub-icon">↔</span><strong>Partner Response Centre</strong><small>Track venue availability, quotations, response delays and partner activity</small><em>Open response centre →</em>';c.addEventListener("click",open);grid.appendChild(c);}
 if(!$("#smvPartnerResponseCentre")){const s=document.createElement("section");s.id="smvPartnerResponseCentre";s.hidden=true;s.innerHTML=
 '<header class="smv-prc-head"><div><div class="smv-prc-kicker">SMV · PARTNER OPERATIONS</div><h1>Partner Response <span>Centre</span></h1><p>One live view of partner replies to enquiries already assigned by your team.</p></div><div><button type="button" data-prc="refresh">↻ Refresh</button> <button type="button" data-prc="back">← Business OS</button></div></header>'+
 '<div id="smvPrcStatus" class="smv-prc-status" role="status">Waiting for your authorised CRM session…</div>'+
 '<div class="smv-prc-kpis" id="smvPrcKpis"></div>'+
 '<div class="smv-prc-toolbar"><input id="smvPrcSearch" type="search" placeholder="Search customer, venue, area or event…"><select id="smvPrcFilter" aria-label="Filter partner responses"><option value="all">All assignments</option><option value="responded">Partner responded</option><option value="available">Available</option><option value="unavailable">Unavailable</option><option value="needs_info">Needs information</option><option value="waiting">Awaiting partner</option><option value="overdue">No reply · over 24 hours</option></select><select id="smvPrcSort" aria-label="Sort partner responses"><option value="newest">Newest assignment</option><option value="oldest">Oldest assignment</option><option value="quote-high">Highest quote</option><option value="quote-low">Lowest quote</option></select></div>'+
 '<div class="smv-prc-table-wrap"><table class="smv-prc-table"><thead><tr><th>Customer / Event</th><th>Venue / Area</th><th>Assigned</th><th>Partner response</th><th>Quote</th><th>Partner note</th><th>Next step</th></tr></thead><tbody id="smvPrcRows"><tr><td colspan="7">Loading partner activity…</td></tr></tbody></table></div>'+
 '<p class="smv-prc-foot">This is a monitoring workspace. Partner availability and quotes are displayed exactly as recorded. A partner reply is not a confirmed booking. Customer Enquiries and assignment records are not edited here.</p>';
 document.body.appendChild(s);
 s.addEventListener("click",e=>{const lead=e.target.closest("[data-open-enquiry]");if(lead){const id=lead.dataset.openEnquiry;close();if(typeof window.openLeadModal==="function")window.openLeadModal(id);else document.querySelector(".crm-main")?.scrollIntoView({behavior:"smooth"});return;}const b=e.target.closest("[data-prc]");if(!b)return;if(b.dataset.prc==="back")back();if(b.dataset.prc==="refresh")load(true);});
 $("#smvPrcFilter").addEventListener("change",e=>{filter=e.target.value;render();});
 $("#smvPrcSearch").addEventListener("input",render);
 $("#smvPrcSort").addEventListener("change",render);
 }
 mounted=true;
}
function open(){mount();[".crm-main","#venueManagementSection","#smvBusinessIntelligence","#smvGrowthQualityCentre","#smvLiveOperations","#smvSmartMatchDesk","#smvBusinessOSHub"].forEach(s=>{const e=$(s);if(e)e.hidden=true;});const s=$("#smvPartnerResponseCentre");if(s)s.hidden=false;setNav();s?.scrollIntoView({behavior:"smooth",block:"start"});load();}
function close(){const s=$("#smvPartnerResponseCentre");if(s)s.hidden=true;const hub=$("#smvBusinessOSHub");if(hub){hub.hidden=false;setNav();}}
function back(){close();}
function responseState(a,r){if(r)return norm(r.availability_status);const viewed=!!a.first_viewed_at;return viewed?"waiting":"waiting";}
function render(){
 const q=norm($("#smvPrcSearch")?.value),sort=$("#smvPrcSort")?.value||"newest";
 let rows=assignments.map(a=>({a,r:responses.find(x=>String(x.assignment_id)===String(a.id))||null}));
 const state=x=>responseState(x.a,x.r);
 rows=rows.filter(x=>{const s=state(x);if(filter==="responded"&&!x.r)return false;if(["available","unavailable","needs_info"].includes(filter)&&s!==filter)return false;if(filter==="waiting"&&x.r)return false;if(filter==="overdue"&&(x.r||Date.now()-new Date(x.a.assigned_at||x.a.created_at).getTime()<86400000))return false;if(q){const e=x.a.customer_enquiries||{},v=x.a.venues||{},hay=norm([e.customer_name,e.mobile,e.occasion,e.location,v.venue_name,v.city,v.area].join(" "));if(!hay.includes(q))return false;}return true;});
 rows.sort((x,y)=>sort==="oldest"?new Date(x.a.assigned_at)-new Date(y.a.assigned_at):sort==="quote-high"?(Number(y.r?.quoted_price)||0)-(Number(x.r?.quoted_price)||0):sort==="quote-low"?(Number(x.r?.quoted_price)||0)-(Number(y.r?.quoted_price)||0):new Date(y.a.assigned_at)-new Date(x.a.assigned_at));
 const available=responses.filter(x=>x.availability_status==="available").length,unavailable=responses.filter(x=>x.availability_status==="unavailable").length,needs=responses.filter(x=>x.availability_status==="needs_info").length,waiting=assignments.length-responses.length;
 $("#smvPrcKpis").innerHTML=[["Assigned",assignments.length],["Available",available],["Unavailable",unavailable],["Needs information",needs],["Awaiting response",waiting]].map(([k,v])=>'<div><small>'+k+'</small><strong>'+fmt(v)+'</strong></div>').join("");
 $("#smvPrcRows").innerHTML=rows.length?rows.map(({a,r})=>{const e=a.customer_enquiries||{},v=a.venues||{},st=r?norm(r.availability_status):"waiting",age=Math.max(0,Math.floor((Date.now()-new Date(a.assigned_at||a.created_at).getTime())/3600000));const badge=st==="available"?"good":st==="unavailable"?"bad":st==="needs_info"?"warn":"pending";return '<tr><td><strong>'+esc(e.customer_name||"Customer")+'</strong><small>'+esc([e.occasion,e.event_date,e.guests?fmt(e.guests)+" guests":null,e.location].filter(Boolean).join(" · "))+'</small><button class="smv-prc-link" type="button" data-open-enquiry="'+esc(a.enquiry_id)+'">Open enquiry →</button></td><td><strong>'+esc(v.venue_name||"Venue")+'</strong><small>'+esc([v.area,v.city].filter(Boolean).join(", "))+'</small></td><td>'+esc(a.assigned_at?new Date(a.assigned_at).toLocaleString("en-IN"):"—")+'</td><td><span class="smv-prc-badge '+badge+'">'+(r?esc(r.availability_status.replace("_"," ")):"Awaiting reply")+'</span><small>'+(r&&r.confirmed_at?"Replied "+new Date(r.confirmed_at).toLocaleString("en-IN"):age+"h since assignment")+'</small></td><td>'+(r&&r.quoted_price!=null?"₹"+fmt(r.quoted_price):"—")+'</td><td class="smv-prc-note">'+esc(r?.partner_note||a.partner_note||"No note recorded")+'</td><td>'+(r?.availability_status==="available"?"Review quote & confirm with customer":r?.availability_status==="unavailable"?"Consider another matched venue":r?.availability_status==="needs_info"?"Clarify missing details":age>=24?"Follow up with venue":"Await partner response")+'</td></tr>';}).join(""):'<tr><td colspan="7" class="smv-prc-empty">No assignments match this filter.</td></tr>';
}
async function load(){
 if(busy)return;const status=$("#smvPrcStatus"),db=window.getSupabaseClient?.();if(!db){status.textContent="CRM connection not ready. Refresh the workspace and try again.";return;}
 busy=true;status.textContent="Loading assignment and partner response records…";
 try{
 const [ar,rr]=await Promise.all([
 db.from("venue_enquiry_assignments").select("id,enquiry_id,venue_id,assignment_status,assigned_at,created_at,first_viewed_at,first_contacted_at,last_activity_at,partner_note,customer_enquiries(id,customer_name,mobile,occasion,event_date,guests,location),venues(id,venue_name,city,area)").order("assigned_at",{ascending:false}).limit(1500),
 db.from("venue_partner_availability_responses").select("id,assignment_id,venue_id,availability_status,quoted_price,partner_note,confirmed_at,updated_at").order("confirmed_at",{ascending:false}).limit(1500)
 ]);
 if(ar.error)throw ar.error;if(rr.error)throw rr.error;
 assignments=ar.data||[];responses=rr.data||[];
 status.textContent="Updated "+new Date().toLocaleTimeString("en-IN")+" · "+fmt(assignments.length)+" assignments · "+fmt(responses.length)+" partner replies. Read-only monitoring.";
 render();subscribe(db);
 }catch(e){console.error("SMV Partner Response Centre load failed",e);status.textContent="Partner response data could not load: "+(e?.message||"access or connection issue")+". Existing CRM records were not changed.";}
 finally{busy=false;}
}
function subscribe(db){
 if(channels.length)return;
 try{const ch=db.channel("smv-partner-response-centre").on("postgres_changes",{event:"*",schema:"public",table:"venue_enquiry_assignments"},()=>load()).on("postgres_changes",{event:"*",schema:"public",table:"venue_partner_availability_responses"},()=>load()).subscribe(s=>{const el=$("#smvPrcStatus");if(el&&s==="CHANNEL_ERROR")el.textContent+=" Realtime unavailable; use Refresh to update.";});channels.push(ch);}catch(e){console.warn("Partner response realtime unavailable",e);}
}
function start(){mount();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
window.SMVPartnerResponseCentre={open,refresh:load};
})();