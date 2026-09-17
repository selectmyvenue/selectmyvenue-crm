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
 const modal=document.getElementById('leadModal');if(modal)new MutationObserver(()=>{if(modal.hidden&&pending)reload();}).observe(modal,{attributes:true,attributeFilter:['hidden']});
};
