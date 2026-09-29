'use strict';
(async()=>{
 const {client,el,esc,date,day,toast}=SMV;
 const statuses=['new','contacted','follow-up','detail-shared','interested','qualified','site-visit','not-pick','booked','converted','closed','lost','not-interested'];
 const outcomes=['Not Connected','Connected','Not Picked','Busy','Switched Off','Wrong Number','Call Back'];
 const label=s=>s.split('-').map(w=>w[0]?.toUpperCase()+w.slice(1)).join(' ');
 const locations=['','Delhi','Delhi NCR','Gurgaon','Noida','Greater Noida','Faridabad','Ghaziabad'];
 const events=['','Wedding','Engagement','Birthday','Corporate','Anniversary','Party','Other'];
 const venueTypes=['','Banquet Hall','Farmhouse','Hotel','Resort','Lawn','Party Hall','Restaurant'];
 const cityOptions=['','Delhi','Delhi NCR','Gurgaon','Noida','Greater Noida','Faridabad','Ghaziabad'];
 const fields=[
  ['customer_name','Customer name','text'],['mobile','Mobile','tel'],['email','Email','email'],['source','Lead source','text'],
  ['preferred_city','City / region',cityOptions],['preferred_area','Venue / area','text'],['location','Location',locations],['occasion','Event type',events],['venue_type_preference','Venue type',venueTypes],
  ['event_date','Event date','date'],['guests','Guests','number'],['budget_per_person','Budget per person (₹)','number'],['rooms_required','Rooms required','number'],['food_preference','Food preference','text'],
  ['parking_required','Parking required','boolean'],['outdoor_preferred','Outdoor preferred','boolean'],['indoor_preferred','Indoor preferred','boolean'],
  ['call_outcome','Call status',outcomes],['status','Lead status',statuses],['priority','Priority',['low','normal','high','urgent']],['follow_up_at','Follow-up (India time)','datetime-local'],['site_visit_at','Visit date (India time)','datetime-local'],
  ['lost_reason','Lost reason','text'],['lost_reason_other','Other lost reason','text'],['requirements','Customer requirements','textarea'],['internal_notes','Comment','textarea']
 ];
 let rows=[],page=0,total=0,selected=null,profile=null,channel=null,sequence=0,timer,reconnectTimer=null,activeQuickFilter='all';
 const indiaLocal=s=>{if(!s)return '';const d=new Date(new Date(s).getTime()+330*60000);return d.toISOString().slice(0,16);};
 statuses.forEach(s=>el('filterStatus').add(new Option(label(s),s)));
 el('leadFields').innerHTML=fields.map(([key,title,type])=>`<label class="${type==='textarea'||type==='boolean'?'wide':''}">${esc(title)}${Array.isArray(type)?`<select id="field_${key}">${type.map(v=>`<option value="${esc(String(v))}">${esc(label(String(v)))}</option>`).join('')}</select>`:type==='textarea'?`<textarea id="field_${key}" maxlength="10000" rows="3"></textarea>`:type==='boolean'?`<select id="field_${key}"><option value="false">No</option><option value="true">Yes</option></select>`:`<input id="field_${key}" type="${type}" ${type==='number'?'min="0" step="1"':''} ${key==='customer_name'?'required minlength="2" maxlength="120"':''}>`}</label>`).join('');
 function query(count=false){
  let q=client.from('customer_enquiries').select('*',count?{count:'exact',head:true}:{count:'exact'});
  if(el('filterStatus').value)q=q.eq('status',el('filterStatus').value);
  if(activeQuickFilter==='new'||activeQuickFilter==='interested'||activeQuickFilter==='follow-up'||activeQuickFilter==='not-pick')q=q.eq('status',activeQuickFilter);
  if(activeQuickFilter==='call-back')q=q.or('call_outcome.eq.Call Back,status.eq.converted');
  if(activeQuickFilter==='assigned')q=q.not('assigned_to','is',null);
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
   const options=(list,value,labels=true)=>{const vals=[...list];if(value&&!vals.includes(value))vals.unshift(value);return vals.map(v=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(labels?label(v):v)}</option>`).join('');};
   const inlineText=(r,field,value,placeholder='—')=>`<button type="button" class="emp-inline-cell text-button" data-inline-edit="1" data-lead="${r.id}" data-field="${field}"><span class="inline-display">${esc(value??'')||esc(placeholder)}</span></button>`;
   const inlineSelect=(r,field,value,list)=>`<select class="emp-inline-select" data-inline-edit="1" data-id="${r.id}" data-field="${field}">${options(list,value)}</select>`;
   el('leadsBody').innerHTML=rows.length?rows.map(r=>`<tr>
<td><button class="lead-name" data-lead="${r.id}">${esc(r.customer_name)}</button></td>
<td><a href="tel:${esc(String(r.mobile||'').replace(/[^+0-9]/g,''))}">${esc(r.mobile||'—')}</a></td>
<td>${date(r.created_at,true)}</td>
<td>${inlineText(r,'preferred_area',r.preferred_area)}</td>
<td>${esc(r.source||'—')}</td>
<td>${inlineSelect(r,'occasion',r.occasion,events)}</td>
<td><button type="button" class="emp-inline-cell text-button" data-inline-edit="1" data-lead="${r.id}" data-field="event_date"><span class="inline-display">${date(r.event_date)||'—'}</span></button></td>
<td><button type="button" class="emp-inline-cell text-button" data-inline-edit="1" data-lead="${r.id}" data-field="guests"><span class="inline-display">${esc(r.guests??'—')}</span></button></td>
<td>${inlineSelect(r,'location',r.location,locations)}</td>
<td><select class="quick-edit status-quick" data-id="${r.id}" data-field="status">${options(statuses,r.status)}</select></td>
<td><button class="text-button" data-lead="${r.id}">${r.internal_notes?'View / add':'+ Add'}</button></td>
</tr>`).join(''):'<tr><td colspan="11" class="empty">No leads match these filters.</td></tr>';
   el('pageInfo').textContent=total?`Showing ${page*20+1}–${Math.min(page*20+20,total)} of ${total}`:'No results';el('previous').disabled=page===0;el('next').disabled=(page+1)*20>=total;
  }catch(e){toast(e.message||'Unable to load leads');el('leadsBody').innerHTML='<tr><td colspan="11" class="empty">Unable to load leads. Please refresh.</td></tr>';}
  finally{if(seq===sequence)el('refresh').disabled=false;}
 }
 async function stats(){
  const q=()=>client.from('customer_enquiries').select('id,status,call_outcome,assigned_to');
  const {data,error}=await q(); const list=error?[]:(data||[]);
  const counts={all:list.length,new:list.filter(r=>r.status==='new').length,interested:list.filter(r=>r.status==='interested').length,'call-back':list.filter(r=>r.call_outcome==='Call Back'||r.status==='converted').length,'follow-up':list.filter(r=>r.status==='follow-up').length,'not-pick':list.filter(r=>r.status==='not-pick').length,assigned:list.filter(r=>r.assigned_to!=null&&String(r.assigned_to).trim()!=='').length};
  const ids={all:'totalCount',new:'newCount',interested:'interestedCount','call-back':'callBackCount','follow-up':'followUpCount','not-pick':'notPickCount',assigned:'assignedCount'};
  Object.entries(ids).forEach(([key,id])=>el(id).textContent=counts[key]);
  document.querySelectorAll('#employeeFilterCards [data-quick-filter]').forEach(c=>c.classList.toggle('active',c.dataset.quickFilter===activeQuickFilter));
 }
 async function openLead(id){
  const {data,error}=await client.from('customer_enquiries').select('*').eq('id',id).single();if(error){toast(error.message);return;}
  selected=data;el('latestComment').textContent=data.internal_notes?'Latest comment: '+data.internal_notes:'';el('leadTitle').textContent=data.customer_name;el('saveMessage').textContent='';el('conflictNotice').hidden=true;el('saveLead').disabled=false;el('newComment').value='';el('logCall').checked=false;
  for(const [key,,type] of fields){
   const control=el('field_'+key);let value=type==='datetime-local'?indiaLocal(data[key]):data[key]??'';
   if(type==='boolean') value=String(Boolean(data[key]));
   // Preserve existing values even when a lead contains a legacy option.
   if(Array.isArray(type)&&value&&!Array.from(control.options).some(o=>o.value===String(value)))control.add(new Option(String(value),String(value),true,true));
   control.value=String(value);
  }
  el('history').textContent='Loading…';el('leadDialog').showModal();
  const {data:history,error:historyError}=await client.from('crm_activity_log').select('description,created_at,old_value,new_value').eq('lead_id',id).order('created_at',{ascending:false}).limit(30);
  if(String(selected?.id)!==String(id))return;
  el('history').innerHTML=historyError?'Unable to load activity.':history?.length?history.map(h=>`<div class="history-item"><small>${date(h.created_at,true)}</small>${esc(h.description)}${h.new_value?`<details><summary>Changed fields</summary><pre>${esc(h.new_value)}</pre></details>`:''}</div>`).join(''):'No activity recorded by you yet.';
 }
 async function saveEmployeeInline(id,field,value){
  const row=rows.find(r=>String(r.id)===String(id)); if(!row)return;
  let parsed=value;
  if(field==='guests') parsed=value===''?null:Number(value);
  if(field==='event_date') parsed=value||null;
  const previous=row[field]??null;
  if(String(previous??'')===String(parsed??''))return;
  const {error}=await client.rpc('smv_employee_save_lead',{p_id:row.id,p_expected_updated_at:row.updated_at,p_patch:{[field]:parsed},p_comment:'',p_log_call:false});
  if(error){toast(error.message||'Unable to save change');return;}
  toast(label(field.replace(/_/g,' '))+' updated'); await Promise.all([load(),stats()]);
 }
 function startEmployeeInlineEdit(button){
  const id=button.dataset.lead,field=button.dataset.field,row=rows.find(r=>String(r.id)===String(id)); if(!row)return;
  if(field==='occasion'||field==='location')return;
  const display=button.querySelector('.inline-display'); if(!display||button.classList.contains('editing'))return;
  button.classList.add('editing');
  const input=document.createElement('input'); input.className='emp-inline-editor'; input.type=field==='event_date'?'date':field==='guests'?'number':'text'; input.value=field==='event_date'?(row.event_date||''):String(row[field]??''); if(field==='guests'){input.min='0';input.step='1';}
  display.replaceWith(input); input.focus(); input.select?.();
  let done=false; const finish=async(save)=>{if(done)return;done=true;const v=input.value;if(save)await saveEmployeeInline(id,field,v);else{input.replaceWith(display);button.classList.remove('editing');}};
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();finish(true)}else if(e.key==='Escape'){e.preventDefault();finish(false)}}); input.addEventListener('blur',()=>finish(true));
 }
 el('leadsBody').onclick=e=>{const inline=e.target.closest('[data-inline-edit]');if(inline&&inline.tagName!=='SELECT'){startEmployeeInlineEdit(inline);return;}const b=e.target.closest('[data-lead]');if(b)openLead(b.dataset.lead);};
 el('leadsBody').onchange=async e=>{const inline=e.target.closest('[data-inline-edit].emp-inline-select');if(!inline)return;await saveEmployeeInline(inline.dataset.id,inline.dataset.field,inline.value);};
 el('leadsBody').onchange=async e=>{
  const control=e.target.closest('.quick-edit');if(!control)return;
  const row=rows.find(r=>String(r.id)===String(control.dataset.id));if(!row){toast('Lead changed. Refresh and try again.');return;}
  const field=control.dataset.field,value=control.value,previous=row[field]??'';
  if(String(previous)===String(value))return;
  control.disabled=true;
  const patch={[field]:(field==='parking_required'||field==='outdoor_preferred'||field==='indoor_preferred')?value==='true':value};
  if(field==='status'&&String(row.lost_reason_other||'').startsWith('__SMV_STATUS_NOT_PICK__'))patch.lost_reason_other=null;
  const {error}=await client.rpc('smv_employee_save_lead',{p_id:row.id,p_expected_updated_at:row.updated_at,p_patch:patch,p_comment:'',p_log_call:false});
  if(error){control.value=previous;control.disabled=false;toast(error.message||'Unable to save change');return;}
  toast(label(field.replace('_',' '))+' updated');await Promise.all([load(),stats()]);
 };
 el('leadForm').onsubmit=async e=>{
  e.preventDefault();if(!selected)return;el('saveLead').disabled=true;el('saveMessage').textContent='Saving…';
  const patch={};
  for(const [key,,type] of fields){
   const value=el('field_'+key).value;
   const parsed=type==='number'?(value===''?null:Number(value)):type==='datetime-local'?(value?new Date(value+':00+05:30').toISOString():null):type==='boolean'?(value==='true'):(value||(['location','occasion','source'].includes(key)?'':null));
   const original=selected[key]??null;
   if(type==='datetime-local'?indiaLocal(original)!==value:type==='boolean'?Boolean(original)!==parsed:String(original??'')!==String(parsed??''))patch[key]=parsed;
  }
  // Clear the legacy Not Pick marker when an explicit status is selected.
  if(patch.status && String(selected.lost_reason_other||'').startsWith('__SMV_STATUS_NOT_PICK__'))patch.lost_reason_other=null;
  const {error}=await client.rpc('smv_employee_save_lead',{p_id:selected.id,p_expected_updated_at:selected.updated_at,p_patch:patch,p_comment:el('newComment').value,p_log_call:el('logCall').checked});
  if(error){el('saveMessage').textContent=error.message;el('saveLead').disabled=false;return;}
  el('leadDialog').close();selected=null;toast('Lead saved. Master CRM receives this update automatically.');await Promise.all([load(),stats()]);
 };
 const close=()=>{el('leadDialog').close();selected=null;};el('closeLead').onclick=close;el('cancelLead').onclick=close;el('leadDialog').addEventListener('close',()=>selected=null);
 el('filters').onsubmit=e=>e.preventDefault();el('filters').oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{page=0;load();},300);};
 document.querySelectorAll('#employeeFilterCards [data-quick-filter]').forEach(card=>card.addEventListener('click',()=>{activeQuickFilter=card.dataset.quickFilter;page=0;el('filterStatus').value='';load();stats();}));
 el('clearFilters').onclick=()=>{el('filters').reset();activeQuickFilter='all';page=0;load();stats();};el('previous').onclick=()=>{page--;load();};el('next').onclick=()=>{page++;load();};el('refresh').onclick=()=>Promise.all([load(),stats()]);
 function resetView(){profile=null;rows=[];selected=null;el('workspace').hidden=true;el('accountActions').hidden=true;el('loginPanel').hidden=false;el('leadsBody').replaceChildren();el('history').replaceChildren();document.querySelectorAll('dialog[open]').forEach(d=>d.close());clearTimeout(reconnectTimer);reconnectTimer=null;if(channel){client.removeChannel(channel);channel=null;}}
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
  }).subscribe(status=>{
   if(status==='SUBSCRIBED'){
    clearTimeout(reconnectTimer);reconnectTimer=null;
    el('syncState').textContent='● Live updates';
    load();stats();
    return;
   }
   if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){
    el('syncState').textContent='Periodic refresh active';
    clearTimeout(reconnectTimer);
    reconnectTimer=setTimeout(()=>{if(profile&&!document.hidden)start();},5000);
    return;
   }
   el('syncState').textContent='Connecting…';
  });
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
