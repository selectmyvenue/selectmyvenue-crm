'use strict';
window.startEmployeeIntegration=async function(client){
 if(window.smvEmployeeIntegrationStarted)return;window.smvEmployeeIntegrationStarted=true;
 const controls=document.querySelector('.crm-header-actions');
 const link=document.createElement('a');link.href='employees.html';link.className='account-password-btn';link.textContent='Employees';controls?.prepend(link);
 const state=document.createElement('span');state.style.cssText='font-size:11px;color:#087f74';state.textContent='Connecting live updates…';controls?.prepend(state);
 let pending=false, timer, loading=false, connected=false, lastSync=0;
 function editing(){return !!document.querySelector('#leadModal:not([hidden]),#addEnquiryModal:not([hidden]),.editing,.crm-floating-overlay,#venueModal:not([hidden]),#venueAssignmentModal:not([hidden])');}
 function showState(){
  state.textContent = !navigator.onLine ? 'Offline · showing saved workspace' : pending && editing() ? 'Updates waiting · finish editing' : loading ? 'Syncing leads…' : connected ? '● Live lead updates' : 'Reconnecting · automatic refresh';
  state.title = lastSync ? 'Last successful refresh: '+new Date(lastSync).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata'})+' IST' : 'Waiting for a successful refresh';
 }
 async function reload(){
  pending=true;
  if(loading || document.hidden || !navigator.onLine || editing()){showState();return;}
  pending=false;loading=true;showState();
  try { await window.loadEnquiries?.(); }
  finally { loading=false;showState();if(pending&&!editing())schedule(); }
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(reload,600);}
 window.addEventListener('crm:sync',event=>{
  if(event.detail.state==='deferred')pending=true;
  if(event.detail.state==='ready'){lastSync=event.detail.at;state.dataset.failed='false';}
  if(event.detail.state==='error'){state.dataset.failed='true';state.textContent='Refresh failed · click Refresh to retry';}
 });
 const renderState=showState;
 showState=function(){renderState();if(state.dataset.failed==='true'&&!loading&&navigator.onLine)state.textContent='Refresh failed · click Refresh to retry';};
 window.addEventListener('online',schedule);
 window.addEventListener('offline',showState);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&(pending||Date.now()-lastSync>90000))schedule();});
 document.addEventListener('focusout',()=>{if(pending)setTimeout(()=>{if(!editing())schedule();},100);});
 setInterval(()=>{if(!document.hidden&&(pending||Date.now()-lastSync>90000))reload();},15000);
 try {
  await client.realtime.setAuth((await client.auth.getSession()).data.session?.access_token);
  client.channel('master-employee-leads').on('postgres_changes',{event:'*',schema:'public',table:'customer_enquiries'},()=>{pending=true;schedule();}).subscribe(status=>{
   connected=status==='SUBSCRIBED';showState();if(connected)schedule();
  });
 } catch(error){console.warn('Live connection unavailable; automatic refresh remains enabled.',error);showState();}
 const modal=document.getElementById('leadModal');
 function showCallSummary(){
  if(!modal || modal.hidden || typeof currentLead==='undefined' || !currentLead)return;
  let summary=document.getElementById('employeeCallSummary');
  if(!summary){summary=document.createElement('section');summary.id='employeeCallSummary';summary.style.cssText='margin:12px 0;padding:14px;border:1px solid #c9e4dc;border-radius:8px;background:#f4fbf8;white-space:pre-wrap';modal.querySelector('.modal-header')?.after(summary);}
  summary.textContent='CALL STATUS: '+(currentLead.call_outcome||'Not Connected')+' · CALL ATTEMPTS: '+(currentLead.contact_count||0)+'\nLATEST CALL COMMENT: '+(currentLead.contact_remark||'No call comment yet');
 }
 if(modal)new MutationObserver(()=>{if(modal.hidden&&pending)reload();else showCallSummary();}).observe(modal,{attributes:true,attributeFilter:['hidden']});
};

/* =========================================================
   MASTER CRM — SIMPLE WORKING LEAD FILTERS + WHATSAPP SHARE
   Additive UI only. Existing database/status/assignment flows stay intact.
   ========================================================= */
(function installSimpleLeadOps(){
 let installed=false;
 const clean=v=>v==null?'':String(v).trim();
 const status=v=>clean(v).toLowerCase();
 function leads(){try{return Array.isArray(allLeads)?allLeads:[];}catch(_){return[];}}
 function formatDate(value){
  if(!value)return '—';
  const d=new Date(value);if(Number.isNaN(d.getTime()))return clean(value)||'—';
  return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
 }
 function extractRequirement(lead,patterns){
  const text=[lead?.requirements,lead?.internal_notes,lead?.contact_remark].map(clean).filter(Boolean).join('\n');
  for(const re of patterns){const m=text.match(re);if(m&&clean(m[1]))return clean(m[1]);}
  return '';
 }
 function foodOf(lead){
  return clean(lead?.food_preference)||extractRequirement(lead,[/food(?:\s*preference)?\s*[:\-]\s*([^\n|,]+)/i,/\b(veg\s*(?:&|and|\/)?\s*non[- ]?veg|non[- ]?veg|veg)\b/i]);
 }
 function roomsOf(lead){
  return clean(lead?.rooms_required)||clean(lead?.rooms)||extractRequirement(lead,[/rooms?(?:\s*(?:req|required))?\s*[:\-]\s*(\d+)/i,/\b(\d+)\s*rooms?\b/i]);
 }
 function whatsappMessage(lead){
  if(!lead)return '';
  const lines=['🔔 New Lead from SelectMyVenue.com',''];
  if(clean(lead.occasion))lines.push('Event: '+clean(lead.occasion));
  if(clean(lead.event_date))lines.push('Event Date: '+formatDate(lead.event_date));
  if(clean(lead.guests))lines.push('Guests: '+clean(lead.guests));
  const food=foodOf(lead);if(food)lines.push('Food- '+food);
  const rooms=roomsOf(lead);if(rooms)lines.push('Rooms Req- '+rooms);
  if(clean(lead.customer_name))lines.push('Name- '+clean(lead.customer_name));
  if(clean(lead.mobile))lines.push('Contact: '+clean(lead.mobile));
  lines.push('','Please contact the customer and update us on the status.','','*Select My Venue*','Relevant Enquiries. Better Bookings.');
  return lines.join('\n');
 }
 function currentAssignmentLead(){
  try{
   if(typeof currentAssignmentLead!=='undefined'&&currentAssignmentLead)return currentAssignmentLead;
  }catch(_){}
  try{if(typeof currentLead!=='undefined'&&currentLead)return currentLead;}catch(_){}
  const summary=document.getElementById('assignmentCustomerSummary')?.textContent||'';
  const phone=(summary.match(/\b\d{10}\b/)||[])[0];
  if(phone)return leads().find(l=>clean(l.mobile).replace(/\D/g,'').endsWith(phone))||null;
  return null;
 }
 function fillAssignmentMessage(){
  const assignmentModal=document.getElementById('venueAssignmentModal');
  const note=document.getElementById('venueAssignmentNote');
  if(!assignmentModal||assignmentModal.hidden||!note)return;
  let lead=null;
  try{if(typeof currentLead!=='undefined'&&currentLead)lead=currentLead;}catch(_){}
  if(!lead){
   const summary=clean(document.getElementById('assignmentCustomerSummary')?.textContent);
   lead=leads().find(l=>summary.includes(clean(l.customer_name))||summary.includes(clean(l.mobile)));
  }
  if(!lead)return;
  const generated=whatsappMessage(lead);
  if(!generated)return;
  if(!note.value.trim()||note.dataset.smvAutoLeadId!==String(lead.id)){
   note.value=generated;
   note.dataset.smvAutoLeadId=String(lead.id);
   note.rows=12;
  }
 }
 function countFor(key){
  const list=leads();
  if(key==='all')return list.length;
  return list.filter(l=>status(l.status)===key).length;
 }
 function applyStatus(key){
  const select=document.getElementById('statusFilter');
  if(!select)return;
  select.value=key==='all'?'all':key;
  select.dispatchEvent(new Event('change',{bubbles:true}));
  try{if(typeof applyFilters==='function')applyFilters();}catch(_){}
 }
 function renderSimpleFilters(){
  const box=document.getElementById('leadWorkViews');if(!box)return;
  const defs=[['all','All leads'],['new','New leads'],['interested','Interested'],['not-interested','Not Interested'],['follow-up','Follow-up'],['not-pick','No Pick']];
  box.innerHTML=defs.map(([key,label])=>`<button type="button" data-simple-status="${key}" aria-pressed="false">${label} <span>${countFor(key)}</span></button>`).join('');
  box.querySelectorAll('[data-simple-status]').forEach(btn=>btn.addEventListener('click',()=>{
   box.querySelectorAll('[data-simple-status]').forEach(b=>b.setAttribute('aria-pressed','false'));
   btn.setAttribute('aria-pressed','true');applyStatus(btn.dataset.simpleStatus);
  }));
 }
 function refreshCounts(){
  const box=document.getElementById('leadWorkViews');if(!box)return;
  box.querySelectorAll('[data-simple-status]').forEach(btn=>{const span=btn.querySelector('span');if(span)span.textContent=String(countFor(btn.dataset.simpleStatus));});
 }
 function boot(){
  if(installed)return;
  if(!document.getElementById('leadWorkViews'))return;
  installed=true;renderSimpleFilters();
  const assignmentModal=document.getElementById('venueAssignmentModal');
  if(assignmentModal)new MutationObserver(()=>{if(!assignmentModal.hidden)setTimeout(fillAssignmentMessage,30);}).observe(assignmentModal,{attributes:true,attributeFilter:['hidden','class','style']});
  document.addEventListener('click',e=>{if(e.target.closest?.('.venue-assign-btn,#assignAnotherVenueBtn'))setTimeout(fillAssignmentMessage,120);});
  const tbody=document.getElementById('leadsTableBody');if(tbody)new MutationObserver(refreshCounts).observe(tbody,{childList:true,subtree:true});
  setInterval(()=>{refreshCounts();fillAssignmentMessage();},1500);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,500));else setTimeout(boot,500);
 setTimeout(boot,1500);
})();
