/* SMV Smart Match Desk V3 — deterministic, explainable, read-only matching workspace.
   No writes to customer_enquiries, venue assignments or partner data. */
(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=v=>String(v||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const closed=new Set(["booked","converted","lost","closed","cancelled","not interested"]);
let mounted=false,loading=false,leads=[],venues=[],selected=null,results=[],channel=null;
function scoreVenue(lead,venue){
 const reasons=[],warnings=[],blockers=[];let points=0,max=0,known=0;
 const add=(ok,weight,yes,no,isKnown=true)=>{max+=weight;if(isKnown)known+=weight;if(ok)points+=weight;reasons.push(ok?yes:no);};
 const area=norm(lead.location),venueArea=norm([venue.area,venue.city,venue.address].filter(Boolean).join(" "));
 const loc=!!area&&!!venueArea&&(venueArea.includes(area)||area.includes(norm(venue.area))||area.includes(norm(venue.city)));
 add(loc,25,loc?"Locality text matches":"Area/city differs or is not recorded",!!area&&!!venueArea);
 const guests=Number(lead.guests)||0,cap=Number(venue.capacity_max)||0,capKnown=cap>0,capFit=guests>0&&cap>=guests;
 add(capFit,25, "Listed capacity fits",capKnown?"Listed maximum capacity is below guest count":"Capacity not recorded",capKnown&&guests>0);
 const pp=Number(venue.price_max_per_person)||0,bpp=Number(lead.budget_per_person)||0;
 const priceKnown=pp>0&&bpp>0,priceFit=priceKnown&&pp<=bpp;
 add(priceFit,20,"Listed per-person price ceiling fits","Price not recorded or may exceed per-person budget",priceKnown);
 const event=norm(lead.occasion),types=Array.isArray(venue.event_types)?venue.event_types.map(norm):[];
 const eventKnown=types.length>0||!!venue.description||!!venue.matching_notes;
 const eventFit=!!event&&((types.some(t=>t.includes(event)||event.includes(t)))||norm((venue.description||"")+" "+(venue.matching_notes||"")).includes(event));
 add(eventFit,10,"Event suitability appears in venue profile","Event suitability needs confirmation",eventKnown);
 const food=norm(lead.food_preference),foodKnown=!!food,foodFit=!food||norm((venue.food_options||"")+" "+(venue.description||"")).includes(food);
 add(foodFit,5, "Food preference appears compatible","Food preference not confirmed",foodKnown&&!!venue.food_options);
 const verified=norm(venue.venue_status)==="approved"&&norm(venue.verification_status)==="verified";
 if(!verified)blockers.push("Venue is not both approved and verified");
 if(guests&&capKnown&&!capFit)blockers.push("Capacity below guest requirement");
 if(bpp&&pp&&pp>bpp)blockers.push("Per-person price ceiling exceeds budget");
 if(lead.event_date)warnings.push("Event-date availability requires partner confirmation");
 if(!capKnown)warnings.push("Capacity is missing");
 if(!priceKnown)warnings.push("Per-person pricing is missing");
 if(!loc)warnings.push("Locality is not an exact text match");
 const score=max?Math.round(points/max*100):0,confidence=max?Math.round(known/max*100):0;
 return {score,confidence,verified,eligible:blockers.length===0,reasons,warnings,blockers,capacity:capKnown?cap:null,capacityFit:capFit,pricePerPerson:pp||null,priceFit,locationFit:loc,availability:"confirmation_required"};
}
function rank(lead,items){return items.map(v=>({venue:v,match:scoreVenue(lead,v)})).sort((a,b)=>(Number(b.match.eligible)-Number(a.match.eligible))||(b.match.score-a.match.score)||(b.match.confidence-a.match.confidence));}
function fmt(n){return new Intl.NumberFormat("en-IN").format(Number(n)||0);}
function setNav(){document.querySelectorAll(".crm-top-nav .crm-nav-item").forEach(x=>{const a=x.id==="smvBusinessOSHubBtn";x.classList.toggle("active",a);if(a)x.setAttribute("aria-current","page");else x.removeAttribute("aria-current");});}
function openHub(){const sec=$("#smvSmartMatchDesk");if(sec)sec.hidden=true;window.SMVBusinessOS?.open?.();const hub=$("#smvBusinessOSHub");if(hub)hub.hidden=false;setNav();}
function open(){mount();[".crm-main","#venueManagementSection","#smvBusinessOSHub","#smvBusinessIntelligence","#smvGrowthQualityCentre","#smvLiveOperations"].forEach(s=>{const e=$(s);if(e)e.hidden=true;});$("#smvSmartMatchDesk").hidden=false;setNav();$("#smvSmartMatchDesk").scrollIntoView({behavior:"smooth",block:"start"});load();}
function back(){const s=$("#smvSmartMatchDesk");if(s)s.hidden=true;const h=$("#smvBusinessOSHub");if(h){h.hidden=false;setNav();h.scrollIntoView({behavior:"smooth",block:"start"});}}
function mount(){
 if(mounted)return;const hub=$("#smvBusinessOSHub");if(!hub)return;
 const grid=$(".smv-hub-grid",hub);
 if(grid&&!$("#smvSmartMatchCard")){const c=document.createElement("button");c.type="button";c.id="smvSmartMatchCard";c.className="smv-hub-card smv-smart-match-launcher";c.innerHTML='<span class="smv-hub-icon">✦</span><strong>Smart Match Desk V3</strong><small>Explainable venue ranking, hard-fit checks, data confidence and availability verification</small><em>Open matching workspace →</em>';c.addEventListener("click",open);grid.appendChild(c);}
 if(!$("#smvSmartMatchDesk")){const s=document.createElement("section");s.id="smvSmartMatchDesk";s.hidden=true;s.setAttribute("aria-label","SMV Smart Match Desk");s.innerHTML=
 '<header class="smv-match-head"><div><div class="smv-match-kicker">SMV · INTELLIGENT VENUE DISCOVERY</div><h1>Smart Match <span>Desk V3</span></h1><p>Rank approved and verified venues against real customer requirements. Every recommendation explains its evidence and unknowns.</p></div><div><button type="button" data-match="refresh">↻ Refresh data</button> <button type="button" data-match="back">← Business OS</button></div></header>'+
 '<div id="smvMatchStatus" class="smv-match-status" role="status">Connect to your authorised CRM session to load matching data.</div>'+
 '<div class="smv-match-layout"><aside class="smv-match-panel"><h2>Customer requirement</h2><label for="smvMatchLead">Select open customer enquiry</label><select id="smvMatchLead"><option value="">Choose enquiry…</option></select><div id="smvMatchBrief" class="smv-match-brief">Select an enquiry to see its recorded requirements.</div><p class="smv-match-note">This workspace reads existing enquiry fields. It does not edit customer records.</p></aside>'+
 '<main class="smv-match-panel"><div class="smv-match-results-head"><div><h2>Recommended venues</h2><p id="smvMatchCount">Select an enquiry to calculate matches.</p></div><label><input type="checkbox" id="smvMatchStrict" checked> Require listed capacity fit</label></div><div id="smvMatchResults" class="smv-match-results"><div class="smv-match-empty">Choose an enquiry to calculate recommendations.</div></div></main></div>'+
 '<footer class="smv-match-foot">Match scores are rule-based indicators, not guarantees. Only approved + verified venues are included. Missing prices, capacity, facilities and event-date availability must be confirmed with the venue. No automatic assignment, customer message or booking is made.</footer>';
 document.body.appendChild(s);
 s.addEventListener("click",e=>{const leadBtn=e.target.closest("[data-open-lead]");if(leadBtn){const id=leadBtn.dataset.openLead;const section=$("#smvSmartMatchDesk"),main=$(".crm-main"),hub=$("#smvBusinessOSHub"),venue=$("#venueManagementSection");if(section)section.hidden=true;if(hub)hub.hidden=true;if(venue)venue.hidden=true;if(main)main.hidden=false;document.querySelectorAll(".crm-top-nav .crm-nav-item").forEach(x=>{const active=x.id==="crmLeadManagementBtn";x.classList.toggle("active",active);if(active)x.setAttribute("aria-current","page");else x.removeAttribute("aria-current");});if(typeof window.openLeadModal==="function")window.openLeadModal(String(id));else $("#leadManagementSection")?.scrollIntoView({behavior:"smooth",block:"start"});return;}const b=e.target.closest("[data-match]");if(!b)return;if(b.dataset.match==="back")back();if(b.dataset.match==="refresh")load(true);});
 $("#smvMatchLead")?.addEventListener("change",e=>{selected=leads.find(x=>String(x.id)===e.target.value)||null;render();});
 $("#smvMatchStrict")?.addEventListener("change",render);
 }
 mounted=true;
}
function render(){
 const brief=$("#smvMatchBrief"),out=$("#smvMatchResults"),count=$("#smvMatchCount");if(!selected){brief.textContent="Select an enquiry to see its recorded requirements.";out.innerHTML='<div class="smv-match-empty">Choose an enquiry to calculate recommendations.</div>';count.textContent="Select an enquiry to calculate matches.";return;}
 const facts=[["Event",selected.occasion],["Date",selected.event_date],["Guests",selected.guests],["Area",selected.location],["Budget/person",selected.budget_per_person?"₹"+fmt(selected.budget_per_person):null],["Food",selected.food_preference]];
 brief.innerHTML='<div class="smv-match-facts">'+facts.map(([k,v])=>'<div><small>'+esc(k)+'</small><strong>'+esc(v||"Not recorded")+'</strong></div>').join("")+'</div>';
 const strict=$("#smvMatchStrict")?.checked!==false;
 results=rank(selected,venues).filter(x=>x.match.eligible&&(!strict||!selected.guests||x.match.capacityFit));
 const excluded=venues.length-results.length;
 count.textContent=fmt(results.length)+" eligible matches · "+fmt(excluded)+" excluded or not eligible · "+fmt(venues.length)+" venues reviewed";
 if(!results.length){out.innerHTML='<div class="smv-match-empty">No eligible venue match found. Review the customer requirements or add verified venue inventory. Do not relax a hard requirement without confirming it with the customer.</div>';return;}
 out.innerHTML=results.slice(0,30).map(({venue:v,match:m},i)=>'<article class="smv-match-card"><header><div><strong>'+esc(v.venue_name||"Unnamed venue")+'</strong><small>'+esc([v.venue_type,v.area,v.city].filter(Boolean).join(" · "))+'</small></div><div class="smv-match-score"><b>'+m.score+'%</b><small>fit · '+m.confidence+'% data confidence</small></div></header><div class="smv-match-tags"><span>Capacity '+(m.capacity?fmt(m.capacity):"not recorded")+'</span><span>Price '+(m.pricePerPerson?"₹"+fmt(m.pricePerPerson)+"/person":"not recorded")+'</span><span>Availability needs partner confirmation</span></div><div class="smv-match-explain"><b>Why this match</b><p>'+esc(m.reasons.filter(x=>!x.startsWith("Price not")&&!x.startsWith("Food preference not")).join(" · "))+'</p></div>'+(m.warnings.length?'<div class="smv-match-warning"><b>Verify before sharing</b><p>'+esc(m.warnings.join(" · "))+'</p></div>':"")+'<div class="smv-match-card-foot"><span>Rank #'+(i+1)+' · approved &amp; verified inventory</span><button type="button" data-open-lead="'+esc(selected.id)+'">Open customer enquiry →</button></div></article>').join("");
}
async function load(force){
 if(loading)return;const status=$("#smvMatchStatus"),db=window.getSupabaseClient?.();if(!db){if(status)status.textContent="CRM connection is not ready. Reload the workspace and retry.";return;}
 loading=true;if(status)status.textContent="Loading authorised enquiries and verified venue inventory…";
 try{
 const [lr,vr]=await Promise.all([
 db.from("customer_enquiries").select("id,location,occasion,guests,budget_per_person,food_preference,event_date,status,created_at").order("created_at",{ascending:false}).limit(3000),
 db.from("venues").select("id,venue_name,city,area,address,venue_type,capacity_min,capacity_max,price_min_per_person,price_max_per_person,venue_status,verification_status,event_types,description,matching_notes,food_options").limit(3000)
 ]);
 if(lr.error)throw lr.error;if(vr.error)throw vr.error;
 leads=(lr.data||[]).filter(l=>!closed.has(norm(l.status)));venues=(vr.data||[]).filter(v=>norm(v.venue_status)==="approved"&&norm(v.verification_status)==="verified");
 const select=$("#smvMatchLead"),prior=selected?.id;select.innerHTML='<option value="">Choose enquiry…</option>'+leads.map(l=>'<option value="'+esc(l.id)+'">'+esc([l.location,l.occasion,l.guests?l.guests+" guests":null,l.created_at?new Date(l.created_at).toLocaleDateString("en-IN"):null].filter(Boolean).join(" · "))+'</option>').join("");
 if(prior&&leads.some(l=>String(l.id)===String(prior)))select.value=String(prior);else if(leads.length===1)select.value=String(leads[0].id);
 selected=leads.find(l=>String(l.id)===select.value)||null;render();
 if(status)status.textContent="Refreshed "+new Date().toLocaleTimeString("en-IN")+" · "+fmt(leads.length)+" open enquiries · "+fmt(venues.length)+" approved + verified venues. Read-only matching.";
 }catch(e){console.error("SMV Smart Match Desk load failed",e);if(status)status.textContent="Matching data could not load: "+(e?.message||"connection or access issue")+". No CRM records were changed.";}
 finally{loading=false;}
}
function start(){mount();$("#crmLeadManagementBtn")?.addEventListener("click",()=>{const s=$("#smvSmartMatchDesk");if(s)s.hidden=true;});}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
window.SMVSmartMatchDesk={open,refresh:()=>load(true),scoreVenue,rank};
})();