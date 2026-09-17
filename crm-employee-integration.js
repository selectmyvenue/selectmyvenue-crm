'use strict';
window.startEmployeeIntegration=async function(client){
 if(window.smvEmployeeIntegrationStarted)return;window.smvEmployeeIntegrationStarted=true;
 const controls=document.querySelector('.crm-header-actions');
 const link=document.createElement('a');link.href='employees.html';link.className='account-password-btn';link.textContent='Employees';controls?.prepend(link);
 const state=document.createElement('span');state.style.cssText='font-size:11px;color:#087f74';state.textContent='Connecting live updates…';controls?.prepend(state);
 await client.realtime.setAuth((await client.auth.getSession()).data.session?.access_token);
 let pending=false,timer;
 function reload(){if(document.querySelector('#leadModal:not([hidden]),#addEnquiryModal:not([hidden])')){pending=true;state.textContent='New updates · refresh after editing';return;}pending=false;window.loadEnquiries?.();}
 client.channel('master-employee-leads').on('postgres_changes',{event:'*',schema:'public',table:'customer_enquiries'},()=>{clearTimeout(timer);timer=setTimeout(reload,400);}).subscribe(status=>{state.textContent=status==='SUBSCRIBED'?'● Live lead updates':'Reconnecting · periodic refresh';if(status==='SUBSCRIBED')reload();});
 setInterval(()=>{if(!document.hidden)reload();},30000);
 const modal=document.getElementById('leadModal');
 function showCallSummary(){
  if(!modal || modal.hidden || typeof currentLead==='undefined' || !currentLead)return;
  let summary=document.getElementById('employeeCallSummary');
  if(!summary){summary=document.createElement('section');summary.id='employeeCallSummary';summary.style.cssText='margin:12px 0;padding:14px;border:1px solid #c9e4dc;border-radius:8px;background:#f4fbf8;white-space:pre-wrap';modal.querySelector('.modal-header')?.after(summary);}
  summary.textContent='CALL STATUS: '+(currentLead.call_outcome||'Not Connected')+' · CALL ATTEMPTS: '+(currentLead.contact_count||0)+'\nLATEST CALL COMMENT: '+(currentLead.contact_remark||'No call comment yet');
 }
 if(modal)new MutationObserver(()=>{if(modal.hidden&&pending)reload();else showCallSummary();}).observe(modal,{attributes:true,attributeFilter:['hidden']});
};
