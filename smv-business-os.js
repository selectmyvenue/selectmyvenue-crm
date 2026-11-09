/* SMV Business OS — compact feature launcher. The lead workspace stays the CRM homepage. */
(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const BI_URL="billing/?v=20261002-renewal-term-8";
function setActive(id){$$(".crm-top-nav .crm-nav-item").forEach(x=>{const active=x.id===id;x.classList.toggle("active",active);if(active)x.setAttribute("aria-current","page");else x.removeAttribute("aria-current");});}
function showLeads(){const hub=$("#smvBusinessOSHub"),bi=$("#smvBusinessIntelligence"),main=$(".crm-main"),venue=$("#venueManagementSection");if(hub)hub.hidden=true;if(bi)bi.hidden=true;if(venue)venue.hidden=true;if(main)main.hidden=false;setActive("crmLeadManagementBtn");}
function openHub(){const main=$(".crm-main"),venue=$("#venueManagementSection"),bi=$("#smvBusinessIntelligence"),hub=$("#smvBusinessOSHub");if(!hub||!main)return;["#smvCustomer360","#smvGrowthQualityCentre","#smvLiveOperations","#smvSmartMatchDesk","#smvPartnerResponseCentre","#smvVenueTrustCentre"].forEach(s=>{const el=$(s);if(el)el.hidden=true;});main.hidden=true;if(venue)venue.hidden=true;if(bi)bi.hidden=true;hub.hidden=false;hub.scrollIntoView({behavior:"smooth",block:"start"});}
function openBI(target){if(window.SMVBusinessIntelligence?.open){window.SMVBusinessIntelligence.open();if(target)window.setTimeout(()=>$("#"+target)?.scrollIntoView({behavior:"smooth",block:"start"}),220);return;}showLeads();}
function openVenues(plan){showLeads();$("#venueManagementBtn")?.click();if(plan)window.setTimeout(()=>$("#venuePlanCenterBtn")?.click(),250);}
function mount(){
 window.SMVBusinessOS={open:openHub,showLeads};
 const closeAccount=()=>{const menu=$("#crmAccountMenu");if(menu)menu.open=false;};
 const accountButton=$("#smvAccountBusinessOSBtn");
 if(accountButton&&!accountButton.dataset.bound){accountButton.dataset.bound="true";accountButton.addEventListener("click",()=>{closeAccount();openHub();});}
 const biButton=$("#smvAccountBusinessIntelligenceBtn");
 if(biButton&&!biButton.dataset.bound){biButton.dataset.bound="true";biButton.addEventListener("click",()=>{closeAccount();openBI();});}
 $("[data-smv-account-action]").forEach(button=>{if(button.dataset.bound)return;button.dataset.bound="true";button.addEventListener("click",()=>{closeAccount();const action=button.dataset.smvAccountAction;
  if(action==="operations"){if(window.SMVLiveOperations?.open)window.SMVLiveOperations.open();else openHub();}
  else if(action==="matching"){if(window.SMVSmartMatchDesk?.open)window.SMVSmartMatchDesk.open();else openHub();}
  else if(action==="customer360"){if(window.SMVCustomer360?.open)window.SMVCustomer360.open();else openHub();}
  else if(action==="partner"){if(window.SMVPartnerResponseCentre?.open)window.SMVPartnerResponseCentre.open();else openHub();}
  else if(action==="trust"){if(window.SMVVenueTrustCentre?.open)window.SMVVenueTrustCentre.open();else openHub();}
  else if(action==="venues"){openVenues(false);}
 });});
 if($("#smvBusinessOSHub"))return;
 const hub=document.createElement("section");hub.id="smvBusinessOSHub";hub.hidden=true;hub.setAttribute("aria-label","SMV Business OS tools");
 hub.innerHTML='<header class="smv-hub-head"><div><div class="smv-hub-kicker">SELECT MY VENUE · MASTER CRM</div><h1>Business <span>OS</span></h1><p>Your operational tools, one tap away. Customer Enquiries remains your home workspace.</p></div><button type="button" class="smv-hub-home" data-hub-action="home">← Back to Enquiries</button></header>'+
 '<div class="smv-hub-grid">'+
 
 '<button type="button" class="smv-hub-card" data-hub-action="ai"><span class="smv-hub-icon">✦</span><strong>AI Venue Discovery</strong><small>Explainable venue matches, confidence and side-by-side comparison</small><em>Open from Assign Venues →</em></button>'+
 '<button type="button" class="smv-hub-card" data-hub-action="venues"><span class="smv-hub-icon">⌂</span><strong>Venue Inventory</strong><small>Partner venues, profile details and listing operations</small><em>Open venue management →</em></button>'+
 '<button type="button" class="smv-hub-card" data-hub-action="plans"><span class="smv-hub-icon">▤</span><strong>Venue Plan Centre</strong><small>Partner plans, trials, expiry and renewal tracking</small><em>Manage plans →</em></button>'+
 '<button type="button" class="smv-hub-card" data-hub-action="bi"><span class="smv-hub-icon">▥</span><strong>Business Intelligence</strong><small>Executive overview across enquiries, team, revenue and operations</small><em>Open control tower →</em></button>'+
 '<button type="button" class="smv-hub-card" data-hub-action="team"><span class="smv-hub-icon">♧</span><strong>Team Analytics</strong><small>Lead ownership, contact activity and conversion performance</small><em>View team report →</em></button>'+
 '<button type="button" class="smv-hub-card" data-hub-action="billing"><span class="smv-hub-icon">₹</span><strong>Billing &amp; Revenue</strong><small>Manual billing ledger, invoices and collections</small><em>Open billing centre →</em></button>'+
 '<button type="button" class="smv-hub-card" data-hub-action="hr"><span class="smv-hub-icon">♙</span><strong>HR &amp; People</strong><small>Hiring, onboarding, employee records and documents</small><em>Open HR portal →</em></button>'+
 '<button type="button" class="smv-hub-card" data-hub-action="marketing"><span class="smv-hub-icon">↗</span><strong>Marketing Intelligence</strong><small>Lead-source attribution and recorded campaign outcomes</small><em>View acquisition report →</em></button>'+
 '<button type="button" class="smv-hub-card" data-hub-action="automation"><span class="smv-hub-icon">⌘</span><strong>Automation Centre</strong><small>Prioritised overdue, unassigned and pending work alerts</small><em>Open action centre →</em></button>'+
 '</div><p class="smv-hub-foot">Some reports use existing CRM records only. External ad spend and ROAS require a connected reporting sync; automated messages and record changes remain human-controlled.</p>';
 document.body.appendChild(hub);
 hub.addEventListener("click",e=>{const b=e.target.closest("[data-hub-action]");if(!b)return;const a=b.dataset.hubAction;
  if(a==="home"){showLeads();$("#leadManagementSection")?.scrollIntoView({behavior:"smooth",block:"start"});return;}
  if(a==="customer"){if(window.SMVCustomer360?.open){window.SMVCustomer360.open();return;}showLeads();return;}
  if(a==="ai"){if(window.SMVSmartMatchDesk?.open){window.SMVSmartMatchDesk.open();return;}showLeads();$("#leadsTableBody")?.scrollIntoView({behavior:"smooth",block:"start"});return;}
  if(a==="venues"){openVenues(false);return;}if(a==="plans"){openVenues(true);return;}
  if(a==="bi"){openBI();return;}if(a==="team"){openBI("smvBiTeam");return;}if(a==="marketing"){openBI("smvBiMarketing");return;}if(a==="automation"){openBI("smvBiActions");return;}
  if(a==="billing"){window.open(BI_URL,"_blank","noopener");return;}if(a==="hr"){window.open("https://crm.selectmyvenue.com/hr/","_blank","noopener");}
 });
}
function addMobileEntry(){
 const menu=$("#smvMobileMoreMenu");if(!menu||menu.querySelector('[data-smv-more="business-os"]'))return;
 const b=document.createElement("button");b.type="button";b.dataset.smvMore="business-os";b.innerHTML='<span>✦</span><b>SMV Business OS</b>';
 const anchor=menu.querySelector('[data-smv-more="venues"]');if(anchor)anchor.after(b);else menu.appendChild(b);
}
function start(){
 mount();addMobileEntry();
 const observer=new MutationObserver(addMobileEntry);observer.observe(document.body,{childList:true,subtree:true});
 document.addEventListener("click",e=>{if(e.target.closest('[data-smv-more="business-os"]')){e.preventDefault();openHub();$("#smvMobileMoreMenu").hidden=true;document.querySelector('[data-smv-mobile="more"]')?.classList.remove("active");}});
 $("#crmLeadManagementBtn")?.addEventListener("click",showLeads);
 $("#venueManagementBtn")?.addEventListener("click",()=>{const hub=$("#smvBusinessOSHub");if(hub)hub.hidden=true;const bi=$("#smvBusinessIntelligence");if(bi)bi.hidden=true;});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();