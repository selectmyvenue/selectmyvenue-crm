'use strict';
(async()=>{
 const {client,el,esc,date,day,toast}=SMV;
 const statuses=['new','contacted','follow-up','detail-shared','interested','qualified','site-visit','negotiation','booked','converted','closed','lost','not-interested'];
 const outcomes=['Not Connected','Connected','Not Picked','Busy','Switched Off','Wrong Number','Call Back'];
 const label=s=>s.split('-').map(w=>w[0]?.toUpperCase()+w.slice(1)).join(' ');
 const locations=['Delhi NCR','Delhi','Gurugram','Gurgaon','Noida','Greater Noida','Faridabad','Ghaziabad','Dwarka','Chhatarpur','GT Karnal Road','Kapashera','Peeragarhi','Alipur','Other'];
 const events=['Wedding','Engagement','Reception','Birthday','Corporate Event','Party','Anniversary','Other'];
 const fields=[['customer_name','Customer name','text'],['mobile','Mobile','tel'],['email','Email','email'],['location','Location',locations],['occasion','Event type',events],['event_date','Event date','date'],['guests','Guests','number'],['budget_per_person','Budget per person (₹)','number'],['food_preference','Food preference','text'],['call_outcome','Call status',outcomes],['status','Lead status',statuses],['priority','Priority',['low','normal','high','urgent']],['follow_up_at','Follow-up (India time)','datetime-local'],['site_visit_at','Visit date (India time)','datetime-local'],['lost_reason','Lost reason','text'],['lost_reason_other','Other lost reason','text'],['requirements','Customer requirements','textarea']];
 let rows=[],page=0,total=0,selected=null,profile=null,channel=null,sequence=0,timer;
 const indiaLocal=s=>{if(!s)return '';const d=new Date(new Date(s).getTime()+330*60000);return d.toISOString().slice(0,16);};
 statuses.forEach(s=>el('filterStatus').add(new Option(label(s),s)));
 el('leadFields').innerHTML=fields.map(([key,title,type])=>`<label class="${type==='textarea'?'wide':''}">${esc(title)}${Array.isArray(type)?`<select id="field_${key}">${type.map(v=>`<option value="${esc(v)}">${esc(label(v))}</option>`).join('')}</select>`:type==='textarea'?`<textarea id="field_${key}" maxlength="10000" rows="3"></textarea>`:`<input id="field_${key}" type="${type}" ${type==='number'?'min="0" step="1"':''} ${key==='customer_name'?'required minlength="2" maxlength="120"':''}>`}</label>`).join('');
 function query(count=false){
  let q=client.from('customer_enquiries').select('*',count?{count:'exact',head:true}:{count:'exact'});
  if(el('filterStatus').value)q=q.eq('status',el('filterStatus').value);
  const search=el('search').value.trim().replace(/[^\p{L}\p{N}\s+@.-]/gu,'');
  if(search)q=q.or(`customer_name.ilike.%${search}%,mobile.ilike.%${search}%`);
  if(el('createdFrom').value)q=q.gte('created_at',el('createdFrom').value+'T00:00:00+05:30');
  if(el('createdTo').value)q=q.lte('created_at',el('createdTo').value+'T23:59:59.999999+05:30');
  for(const [id,key] of [['visitDate','site_visit_at'],['followDate','follow_up_at']])if(el(id).value)q=q.gte(key,el(id).value+'T00:00:00+05:30').lte(key,el(id).value+'T23:59:59.999999+05:30');
  return q;
 }
 async function load(){
  const seq=++sequence;
  el('refresh').disabled=true;
  try {
   const {data,error,count}=await query().order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*20,page*20+19);
   if(seq!==sequence)return;if(error)throw error;rows=data||[];total=count||0;
   if(page>0 && page*20>=total){page=Math.max(0,Math.ceil(total/20)-1);return load();}
   el('resultCount').textContent=`${total.toLocaleString('en-IN')} matching leads`;
   el('leadsBody').innerHTML=rows.length?rows.map(r=>`<tr><td><button class="lead-name" data-lead="${r.id}">${esc(r.customer_name)}</button></td><td><a href="tel:${esc(String(r.mobile||'').replace(/[^+0-9]/g,''))}">${esc(r.mobile||'—')}</a></td><td>${esc(r.location||'—')}</td><td>${esc(r.occasion||'—')}</td><td>${date(r.event_date)}</td><td>${esc(r.guests??'—')}</td><td><span class="pill">${esc(String(r.lost_reason_other||'').startsWith('__SMV_STATUS_NOT_PICK__')?'Not Picked':r.call_outcome)}</span></td><td><span class="pill ${['booked','converted'].includes(r.status)?'good':['lost','not-interested'].includes(r.status)?'bad':r.status==='follow-up'?'warm':''}">${esc(label(r.status))}</span></td><td><button class="text-button" data-lead="${r.id}">${r.contact_remark?'View / add':'+ Add'}</button></td><td>${esc(r.source)}</td><td>${date(r.site_visit_at)}</td><td>${date(r.follow_up_at,true)}</td><td>${date(r.created_at,true)}</td><td><button class="text-button" data-lead="${r.id}">View / edit</button></td></tr>`).join(''):'<tr><td colspan="14" class="empty">No leads match these filters.</td></tr>';
   el('pageInfo').textContent=total?`Showing ${page*20+1}–${Math.min(page*20+20,total)} of ${total}`:'No results';el('previous').disabled=page===0;el('next').disabled=(page+1)*20>=total;
  }catch(e){toast(e.message||'Unable to load leads');el('leadsBody').innerHTML='<tr><td colspan="14" class="empty">Unable to load leads. Please refresh.</td></tr>';}
  finally{if(seq===sequence)el('refresh').disabled=false;}
 }
 async function stats(){
  const today=day(new Date()),start=today+'T00:00:00+05:30',end=today+'T23:59:59.999999+05:30';
  const q=()=>client.from('customer_enquiries').select('id',{head:true,count:'exact'});
  const active=()=>q().not('status','in','(booked,converted,closed,lost,not-interested)');
  const result=await Promise.all([q(),q().eq('status','new'),active().gte('follow_up_at',start).lte('follow_up_at',end),active().lt('follow_up_at',start)]);
  ['totalCount','newCount','todayCount','overdueCount'].forEach((id,i)=>el(id).textContent=result[i].error?'—':result[i].count);
 }
 async function openLead(id){
  const {data,error}=await client.from('customer_enquiries').select('*').eq('id',id).single();if(error){toast(error.message);return;}
  selected=data;el('latestComment').textContent=data.contact_remark?'Latest call comment: '+data.contact_remark:'';el('leadTitle').textContent=data.customer_name;el('saveMessage').textContent='';el('conflictNotice').hidden=true;el('saveLead').disabled=false;el('newComment').value='';el('logCall').checked=false;
  for(const [key,,type] of fields){
   const control=el('field_'+key);const value=type==='datetime-local'?indiaLocal(data[key]):data[key]??'';
   // Preserve existing free-text location/event values while offering a clean dropdown for future updates.
   if(Array.isArray(type)&&value&&!Array.from(control.options).some(o=>o.value===String(value)))control.add(new Option(String(value),String(value),true,true));
   control.value=value;
  }
  el('history').textContent='Loading…';el('leadDialog').showModal();
  const {data:history,error:historyError}=await client.from('crm_activity_log').select('description,created_at,old_value,new_value').eq('lead_id',id).order('created_at',{ascending:false}).limit(30);
  if(String(selected?.id)!==String(id))return;
  el('history').innerHTML=historyError?'Unable to load activity.':history?.length?history.map(h=>`<div class="history-item"><small>${date(h.created_at,true)}</small>${esc(h.description)}${h.new_value?`<details><summary>Changed fields</summary><pre>${esc(h.new_value)}</pre></details>`:''}</div>`).join(''):'No activity recorded by you yet.';
 }
 el('leadsBody').onclick=e=>{const b=e.target.closest('[data-lead]');if(b)openLead(b.dataset.lead);};
 el('leadForm').onsubmit=async e=>{
  e.preventDefault();if(!selected)return;el('saveLead').disabled=true;el('saveMessage').textContent='Saving…';
  const patch={};
  for(const [key,,type] of fields){const value=el('field_'+key).value;const parsed=type==='number'?(value===''?null:Number(value)):type==='datetime-local'?(value?new Date(value+':00+05:30').toISOString():null):(value||(['location','occasion'].includes(key)?'':null));const original=selected[key]??null;
   if(type==='datetime-local'?indiaLocal(original)!==value: String(original??'')!==String(parsed??''))patch[key]=parsed;
  }
  // Clear the legacy Not Pick marker when an explicit status is selected.
  if(patch.status && String(selected.lost_reason_other||'').startsWith('__SMV_STATUS_NOT_PICK__'))patch.lost_reason_other=null;
  const {error}=await client.rpc('smv_employee_save_lead',{p_id:selected.id,p_expected_updated_at:selected.updated_at,p_patch:patch,p_comment:el('newComment').value,p_log_call:el('logCall').checked});
  if(error){el('saveMessage').textContent=error.message;el('saveLead').disabled=false;return;}
  el('leadDialog').close();selected=null;toast('Lead saved. Master CRM receives this update automatically.');await Promise.all([load(),stats()]);
 };
 const close=()=>{el('leadDialog').close();selected=null;};el('closeLead').onclick=close;el('cancelLead').onclick=close;el('leadDialog').addEventListener('close',()=>selected=null);
 el('filters').onsubmit=e=>e.preventDefault();el('filters').oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{page=0;load();},300);};
 el('clearFilters').onclick=()=>{el('filters').reset();page=0;load();};el('previous').onclick=()=>{page--;load();};el('next').onclick=()=>{page++;load();};el('refresh').onclick=()=>Promise.all([load(),stats()]);
 function resetView(){profile=null;rows=[];selected=null;el('workspace').hidden=true;el('accountActions').hidden=true;el('loginPanel').hidden=false;el('leadsBody').replaceChildren();el('history').replaceChildren();document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(channel){client.removeChannel(channel);channel=null;}}
 async function start(){
  const {data:{user},error}=await client.auth.getUser();if(error||!user){resetView();return;}
  const {data,error:pError}=await client.from('staff_profiles').select('full_name,role,is_active').eq('user_id',user.id).single();
  if(pError||!data?.is_active||!['agent','admin'].includes(data.role)){resetView();await client.auth.signOut();el('loginMessage').textContent='Employee access is inactive or unavailable. Contact your administrator.';return;}
  profile=data;el('welcome').textContent=`Welcome, ${data.full_name}`;el('loginPanel').hidden=true;el('workspace').hidden=false;el('accountActions').hidden=false;el('loginPassword').value='';
  if(channel)client.removeChannel(channel);
  await client.realtime.setAuth((await client.auth.getSession()).data.session?.access_token);
  channel=client.channel('employee-leads').on('postgres_changes',{event:'*',schema:'public',table:'customer_enquiries'},payload=>{
   if(selected && String(payload.new?.id||payload.old?.id)===String(selected.id)){el('conflictNotice').hidden=false;}
   clearTimeout(timer);timer=setTimeout(()=>Promise.all([load(),stats()]),350);
  }).subscribe(status=>{el('syncState').textContent=status==='SUBSCRIBED'?'● Live updates':'Reconnecting · periodic refresh';if(status==='SUBSCRIBED'){load();stats();}});
  await Promise.all([load(),stats()]);
 }
 el('loginForm').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;el('loginMessage').textContent='Signing in…';try{const {error}=await client.auth.signInWithPassword({email:el('loginEmail').value.trim(),password:el('loginPassword').value});if(error)throw error;await start();}catch(e){el('loginMessage').textContent=e.message;}finally{b.disabled=false;}};
 el('logout').onclick=async()=>{await client.auth.signOut();resetView();};
 el('passwordButton').onclick=()=>{el('passwordForm').reset();el('passwordMessage').textContent='';el('passwordDialog').showModal();};el('closePassword').onclick=()=>el('passwordDialog').close();
 el('passwordForm').onsubmit=async e=>{e.preventDefault();if(el('newPassword').value!==el('confirmPassword').value){el('passwordMessage').textContent='Passwords do not match';return;}const b=e.target.querySelector('[type=submit]');b.disabled=true;const {error}=await client.auth.updateUser({password:el('newPassword').value});b.disabled=false;if(error)el('passwordMessage').textContent=error.message;else{el('passwordDialog').close();e.target.reset();toast('Password updated');}};
 client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')resetView();});
 // Recheck active access and refresh after reconnect, even if websocket delivery stops.
 setInterval(async()=>{if(profile && !document.hidden){const {data}=await client.rpc('is_crm_staff');if(data!==true){resetView();await client.auth.signOut();el('loginMessage').textContent='Access ended. Contact your administrator.';}else{load();stats();}}},30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&profile)start();});await start();
})();
