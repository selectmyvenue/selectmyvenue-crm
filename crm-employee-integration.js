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
 // Fallback reconciliation; live events trigger immediate refreshes in between.
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
