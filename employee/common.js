'use strict';
window.SMV={
 client:window.supabase.createClient('https://uajqwyoqbbswkfiwosyw.supabase.co','sb_publishable_hfiuO4ZRn4VZmEkrN2RV-A_lZX_R3z7',{auth:{storageKey:document.body.dataset.mode==='admin'?'smv-master-crm-auth':'smv-employee-crm-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}),
 el:id=>document.getElementById(id),
 esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 date:(s,time=false)=>s?new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',...(time?{hour:'2-digit',minute:'2-digit'}:{})}).format(new Date(s)):'—',
 day:s=>s?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s)):'',
 toast:s=>{const e=document.getElementById('message');e.textContent=s;clearTimeout(window.SMV.toastTimer);window.SMV.toastTimer=setTimeout(()=>e.textContent='',6500);}
};
