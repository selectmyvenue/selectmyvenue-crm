/* Select My Venue — Business OS command-centre foundation.
   Read-only presentation layer. Existing CRM workflows remain the source of truth. */
(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const number=v=>Number.isFinite(+v)?Math.max(0,+v):0;
function queueCount(key){
 const b=$('[data-work-view="'+key+'"]');
 const n=b&&b.querySelector('span');
 return n?number(n.textContent):0;
}
function venueCount(){
 const n=$('#venueTotalCount');
 return n?number((n.textContent||"").replace(/[^0-9]/g,"")):0;
}
function leadCount(){
 const label=$('#leadResultCount');
 const match=label&&(label.textContent||"").match(/([\d,]+)/);
 return match?number(match[1].replace(/,/g,"")):$$('#leadsTableBody tr').filter(x=>!x.querySelector('.empty-state')).length;
}
function build(){
 const main=$('.crm-main'),heading=$('.page-heading');
 if(!main||!heading||$('#smvBusinessOS'))return;
 const section=document.createElement('section');
 section.id='smvBusinessOS';section.setAttribute('aria-label','SMV Business Operating System');
 section.innerHTML='<div class="smv-os-head"><div class="smv-os-brand"><div class="smv-os-eyebrow">SELECT MY VENUE · BUSINESS OPERATING SYSTEM</div><h2 class="smv-os-title">Your business, in one command centre.</h2><p class="smv-os-subtitle">A live operational overview for customer enquiries, venue inventory and team follow-through — built on your existing CRM workflows.</p></div><div class="smv-os-head-actions"><span class="smv-os-live">Connected workspace</span><button class="smv-os-toggle" type="button" aria-expanded="false" aria-controls="smvOsDetails">＋ More overview</button></div></div>'+
 '<div class="smv-os-grid">'+
 '<article class="smv-os-kpi"><div class="smv-os-kpi-label">CUSTOMER ENQUIRIES</div><strong class="smv-os-kpi-value" id="smvOsLeads">—</strong><div class="smv-os-kpi-note">Current lead workspace count</div></article>'+
 '<article class="smv-os-kpi"><div class="smv-os-kpi-label">NEW ENQUIRIES</div><strong class="smv-os-kpi-value" id="smvOsNew">—</strong><div class="smv-os-kpi-note">Awaiting first action</div></article>'+
 '<article class="smv-os-kpi"><div class="smv-os-kpi-label">VENUE INVENTORY</div><strong class="smv-os-kpi-value" id="smvOsVenues">—</strong><div class="smv-os-kpi-note">Venue records in the workspace</div></article>'+
 '<article class="smv-os-kpi"><div class="smv-os-kpi-label">OVERDUE FOLLOW-UPS</div><strong class="smv-os-kpi-value" id="smvOsOverdue">—</strong><div class="smv-os-kpi-note">Needs team attention</div></article></div>'+
 '<div class="smv-os-bottom" id="smvOsDetails" hidden><div class="smv-os-focus"><h3 class="smv-os-block-title">Today’s operating focus</h3><div class="smv-os-focus-list"><div class="smv-os-focus-item"><strong id="smvOsToday">—</strong><span>Follow-ups today</span></div><div class="smv-os-focus-item"><strong id="smvOsUnscheduled">—</strong><span>No follow-up set</span></div><div class="smv-os-focus-item"><strong id="smvOsUnassigned">—</strong><span>Unassigned leads</span></div></div></div>'+
 '<div class="smv-os-actions"><h3 class="smv-os-block-title">Quick actions</h3><div class="smv-os-action-list"><button class="smv-os-action primary" type="button" data-os-action="new">＋ Add enquiry</button><button class="smv-os-action" type="button" data-os-action="venues">Venue inventory</button><button class="smv-os-action" type="button" data-os-action="overdue">Open overdue</button><button class="smv-os-action" type="button" data-os-action="refresh">Refresh data</button></div></div></div>'+
 '<div class="smv-os-foot">Read-only overview · Counts reflect the currently loaded CRM workspace. This panel does not alter customer records, venue assignments, permissions or billing.</div>';
 main.insertBefore(section,heading);\n const toggle=section.querySelector('.smv-os-toggle');toggle?.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'− Less overview':'＋ More overview';const details=section.querySelector('#smvOsDetails');if(details)details.hidden=!open;});
 section.addEventListener('click',e=>{
  const b=e.target.closest('[data-os-action]');if(!b)return;
  const a=b.dataset.osAction;
  if(a==='new')$('#addEnquiryBtn')?.click();
  if(a==='venues')$('#venueManagementBtn')?.click();
  if(a==='overdue'){$('[data-work-view="overdue"]')?.click();$('#leadWorkViews')?.scrollIntoView({behavior:'smooth',block:'center'});}
  if(a==='refresh')window.crm?.loadEnquiries?.();
 });
}
function refresh(){
 const set=(id,v)=>{const e=$('#'+id);if(e)e.textContent=String(v);};
 set('smvOsLeads',leadCount());set('smvOsNew',queueCount('new'));set('smvOsVenues',venueCount());
 set('smvOsOverdue',queueCount('overdue'));set('smvOsToday',queueCount('today'));
 set('smvOsUnscheduled',queueCount('unscheduled'));set('smvOsUnassigned',queueCount('unassigned'));
}
function start(){build();refresh();document.addEventListener('crm:sync',()=>{build();refresh();});document.addEventListener('click',e=>{if(e.target.closest('#refreshBtn'))window.setTimeout(refresh,250);if(e.target.closest('#venueManagementBtn'))window.setTimeout(refresh,500);});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
