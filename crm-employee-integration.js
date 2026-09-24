'use strict';
window.startEmployeeIntegration=async function(client){
 if(window.smvEmployeeIntegrationStarted)return;window.smvEmployeeIntegrationStarted=true;
 const controls=document.querySelector('.crm-header-actions'),state=document.createElement('span');
 const link=document.createElement('a');link.href='employees.html';link.className='account-password-btn';link.textContent='Employees';controls?.prepend(link);state.style.cssText='font-size:11px;color:#087f74';state.textContent='Connecting live updates…';controls?.prepend(state);
 let pending=false,timer,loading=false,connected=false,lastSync=0;
 const editing=()=>!!document.querySelector('#leadModal:not([hidden]),#addEnquiryModal:not([hidden]),.editing,.crm-floating-overlay,#venueModal:not([hidden]),#venueAssignmentModal:not([hidden]),#smvVenueHistoryModal:not([hidden])');
 function showState(){state.textContent=!navigator.onLine?'Offline · showing saved workspace':pending&&editing()?'Updates waiting · finish editing':loading?'Syncing leads…':connected?'● Live lead updates':'Reconnecting · automatic refresh';}
 async function reload(){pending=true;if(loading||document.hidden||!navigator.onLine||editing()){showState();return;}pending=false;loading=true;showState();try{await window.loadEnquiries?.();lastSync=Date.now();}finally{loading=false;showState();}}
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(reload,600);};window.addEventListener('online',schedule);window.addEventListener('offline',showState);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&(pending||Date.now()-lastSync>90000))schedule();});setInterval(()=>{if(!document.hidden&&(pending||Date.now()-lastSync>90000))reload();},15000);
 try{await client.realtime.setAuth((await client.auth.getSession()).data.session?.access_token);client.channel('master-employee-leads').on('postgres_changes',{event:'*',schema:'public',table:'customer_enquiries'},()=>{pending=true;schedule();}).subscribe(s=>{connected=s==='SUBSCRIBED';showState();});}catch(e){console.warn('Live connection unavailable; automatic refresh remains enabled.',e);}
};

(function(){
 let installed=false,assignedMode=false,selectedNow=new Set(),selectionLeadId='';const clean=v=>v==null?'':String(v).trim(),norm=v=>clean(v).toLowerCase();
 function leads(){try{return Array.isArray(allLeads)?allLeads:[];}catch(_){return[];}}
 function assignments(){try{return Array.isArray(allVenueAssignments)?allVenueAssignments:[];}catch(_){return[];}}
 function assignedIds(){return new Set(assignments().filter(a=>norm(a.assignment_status)!=='cancelled').map(a=>String(a.enquiry_id)));}
 function fmtDate(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?clean(v):d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}
 function notes(l){return [l?.requirements,l?.internal_notes,l?.contact_remark].map(clean).filter(Boolean).join('\n');}
 function extract(l,res){const t=notes(l);for(const re of res){const m=t.match(re);if(m&&clean(m[1]))return clean(m[1]);}return '';}
 function food(l){const s=smvLeadSpec(l);return s.veg&&s.nonveg?'Veg & Non-Veg':s.nonveg?'Non-Veg':s.veg?'Veg':'';}
 function rooms(l){const n=smvLeadSpec(l).rooms;return n?String(n):'';}
 function venueType(l){return clean(l?.venue_type)||extract(l,[/venue\s*type\s*[:\-]\s*([^\n|,]+)/i,/looking\s+for\s+(?:a|an)?\s*([^\n|,]*(?:banquet|farm\s*house|farmhouse|hotel|resort|lawn|party\s*hall|marriage\s*garden|rooftop|restaurant))/i]);}
 function message(l){if(!l)return '';const spec=smvLeadSpec(l);const x=['New Lead from SelectMyVenue.com',''];if(spec.occasion)x.push('Event: '+spec.occasion);if(clean(l.event_date))x.push('Event Date: '+fmtDate(l.event_date));if(spec.guests)x.push('Guests: '+spec.guests);const vt=spec.venueType,f=food(l),r=rooms(l);if(vt)x.push('Venue Type- '+vt);if(f)x.push('Food- '+f);if(r)x.push('Rooms Req- '+r);if(spec.location)x.push('Preferred location: '+spec.location);if(spec.budget)x.push('Budget per person: ₹'+spec.budget);if(spec.totalBudget)x.push('Total event budget: ₹'+spec.totalBudget+' (package quote to confirm)');if(spec.parking)x.push('Parking required');if(spec.lawn)x.push('Outdoor/lawn preferred');if(spec.indoor)x.push('Indoor preferred');if(clean(l.customer_name))x.push('Name- '+clean(l.customer_name));if(clean(l.mobile))x.push('Contact: '+clean(l.mobile));x.push('','Please contact the customer and update us on the status.','','*Select My Venue*','Relevant Enquiries. Better Bookings.');return x.join('\n');}
 function currentAssignmentLead(){try{if(assignmentCurrentLead)return assignmentCurrentLead;}catch(_){}try{if(currentLead)return currentLead;}catch(_){}return null;}
 function fillMessage(){
   const modal=document.getElementById('venueAssignmentModal'),ta=document.getElementById('venueAssignmentNote');
   if(!modal||modal.hidden||!ta)return;
   const l=currentAssignmentLead();if(!l)return;
   const txt=message(l);
   if(ta.dataset.smvLead!==String(l.id)||!ta.value.trim()||ta.value===ta.dataset.smvGenerated){
     ta.value=txt;ta.dataset.smvLead=String(l.id);ta.dataset.smvGenerated=txt;
   }
   ta.rows=10;
   const note=ta.closest('.venue-assignment-note');
   if(note){
     note.classList.add('smv-message-floating');
     const label=note.querySelector('label');
     if(label)label.textContent='WHATSAPP LEAD MESSAGE / INTERNAL NOTE';
     if(!document.getElementById('smvMessageClose')){
       const close=document.createElement('button');
       close.id='smvMessageClose';close.type='button';close.className='smv-message-close';
       close.setAttribute('aria-label','Close message preview');close.textContent='×';
       close.onclick=()=>note.classList.remove('smv-message-open');
       note.prepend(close);
     }
   }
   let tools=document.getElementById('smvMessageTools');
   if(!tools){
     tools=document.createElement('div');
     tools.id='smvMessageTools';tools.className='smv-message-tools';
     tools.innerHTML='<button type="button" id="smvCopyLead">Copy WhatsApp Lead</button><button type="button" id="smvPreviewLead">Preview / Edit</button>';
     const toolbar=document.querySelector('#venueAssignmentModal .venue-assignment-toolbar');
     if(toolbar)toolbar.appendChild(tools);
     else document.getElementById('assignmentRequirementSummary')?.insertAdjacentElement('afterend',tools);
     tools.querySelector('#smvCopyLead').onclick=async()=>{
       const copy=tools.querySelector('#smvCopyLead');
       try{await navigator.clipboard.writeText(ta.value);copy.textContent='Copied ✓';setTimeout(()=>copy.textContent='Copy WhatsApp Lead',1400);}
       catch(_){if(note)note.classList.add('smv-message-open');ta.focus();ta.select();}
     };
     tools.querySelector('#smvPreviewLead').onclick=()=>{
       if(note)note.classList.toggle('smv-message-open');
       if(note?.classList.contains('smv-message-open'))setTimeout(()=>ta.focus(),0);
     };
   }
 }
 function count(key){if(key==='all')return leads().length;if(key==='assigned')return assignedIds().size;return leads().filter(l=>norm(l.status)===key).length;}
 function standardFilter(key){assignedMode=false;const s=document.getElementById('statusFilter');if(s){s.value=key==='all'?'all':key;s.dispatchEvent(new Event('change',{bubbles:true}));}try{applyFilters();}catch(_){}}
 function assignedFilter(){assignedMode=true;const ids=assignedIds();try{filteredLeads=leads().filter(l=>ids.has(String(l.id)));renderLeads();}catch(_){document.querySelectorAll('#leadsTableBody tr[data-lead-id]').forEach(r=>r.hidden=!ids.has(String(r.dataset.leadId)));}}
 function renderCards(){const b=document.getElementById('leadWorkViews');if(!b)return;const defs=[['all','All leads'],['new','New leads'],['interested','Interested'],['converted','Call Back'],['follow-up','Follow-up'],['not-pick','No Pick'],['assigned','Assigned']];b.innerHTML=defs.map(([k,l])=>`<button type="button" data-simple-status="${k}" aria-pressed="${k==='all'}"><span>${l}</span><strong>${count(k)}</strong></button>`).join('');b.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{b.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed','false'));btn.setAttribute('aria-pressed','true');btn.dataset.simpleStatus==='assigned'?assignedFilter():standardFilter(btn.dataset.simpleStatus);});}
 function refreshCards(){document.querySelectorAll('#leadWorkViews [data-simple-status]').forEach(b=>{const n=b.querySelector('strong');if(n)n.textContent=count(b.dataset.simpleStatus);});}
 function smvText(v){return clean(v).toLowerCase();}
 function smvPretty(v){return clean(v).replace(/\b[a-z]/g,c=>c.toUpperCase());}
 function smvTokens(v){return smvText(v).split(/[^a-z0-9]+/).filter(x=>x.length>2);}
 function smvVenueTypeFamily(x){const t=smvText(x);if(/farm\s*house|farmhouse/.test(t))return"farmhouse";if(/banquet|party\s*hall|marriage\s*hall/.test(t))return"banquet";if(/hotel/.test(t))return"hotel";if(/resort/.test(t))return"resort";if(/lawn|garden|marriage\s*garden/.test(t))return"lawn";if(/rooftop/.test(t))return"rooftop";if(/restaurant/.test(t))return"restaurant";return t;}
 function smvRegion(x){const t=smvText(x);if(/gurugram|gurgaon|manesar/.test(t))return"gurgaon";if(/greater noida|greaternoida/.test(t))return"greater noida";if(/\bnoida\b/.test(t))return"noida";if(/faridabad/.test(t))return"faridabad";if(/ghaziabad/.test(t))return"ghaziabad";if(/delhi ncr|ncr/.test(t))return"delhi ncr";if(/delhi/.test(t))return"delhi";return"";}
 function smvGeoNumber(v){const n=Number(v);return Number.isFinite(n)?n:null;}
 function smvMapPoint(url){
   const text=clean(url);if(!text)return null;let m;
   m=text.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);if(m)return{lat:Number(m[1]),lon:Number(m[2]),source:'map'};
   m=text.match(/\/\@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);if(m)return{lat:Number(m[1]),lon:Number(m[2]),source:'map'};
   const pairs=[...text.matchAll(/!2d(-?\d+(?:\.\d+)?)!2d(-?\d+(?:\.\d+)?)/g)];
   if(pairs.length){const x=pairs[pairs.length-1];return{lat:Number(x[2]),lon:Number(x[1]),source:'map'};}
   m=text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);if(m)return{lat:Number(m[1]),lon:Number(m[2]),source:'map'};
   return null;
 }
 function smvLeadPoint(l){const lat=smvGeoNumber(l?.preferred_latitude),lon=smvGeoNumber(l?.preferred_longitude);return lat!==null&&lon!==null?{lat,lon,source:'lead'}:null;}
 function smvVenuePoint(v){const lat=smvGeoNumber(v?.latitude),lon=smvGeoNumber(v?.longitude);if(lat!==null&&lon!==null)return{lat,lon,source:'venue'};return smvMapPoint(v?.google_maps_url);}
 function smvDistanceKm(a,b){if(!a||!b)return null;const r=6371,toRad=d=>d*Math.PI/180,dLat=toRad(b.lat-a.lat),dLon=toRad(b.lon-a.lon),x=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;return 2*r*Math.asin(Math.min(1,Math.sqrt(x)));}
 function smvIsBroadLocation(v){return /^(delhi(?: ncr)?|gurgaon|gurugram|manesar|noida|greater noida|faridabad|ghaziabad)$/i.test(clean(v));}
 function smvGeoQueryForLead(l){
   const area=clean(l?.preferred_area),city=clean(l?.preferred_city||l?.location),raw=area||(!smvIsBroadLocation(city)?city:'');
   if(!raw)return'';return [raw,smvRegion(city)||city,'Delhi NCR'].filter(Boolean).join(', ');
 }
 async function smvGeocode(q){
   const db=typeof getSupabaseClient==='function'?getSupabaseClient():null;if(!db||!q)return null;
   try{const {data,error}=await db.functions.invoke('geocode-location',{body:{q}});if(error||!data?.ok)return null;const lat=smvGeoNumber(data.latitude),lon=smvGeoNumber(data.longitude);return lat!==null&&lon!==null?{lat,lon,display_name:clean(data.display_name)}:null;}catch(e){console.warn('Geocode unavailable',e);return null;}
 }
 const smvGeoVenueAttempted=new Set();let smvGeoLeadBusy=false,smvGeoQueueBusy=false;
 async function smvEnsureLeadGeo(l){
   if(!l||smvLeadPoint(l)||smvGeoLeadBusy)return smvLeadPoint(l);
   const q=smvGeoQueryForLead(l);if(!q)return null;smvGeoLeadBusy=true;
   try{const p=await smvGeocode(q);if(!p)return null;l.preferred_latitude=p.lat;l.preferred_longitude=p.lon;l.preferred_geocoded_at=new Date().toISOString();const db=typeof getSupabaseClient==='function'?getSupabaseClient():null;if(db&&l.id)await db.from('customer_enquiries').update({preferred_latitude:p.lat,preferred_longitude:p.lon,preferred_geocoded_at:l.preferred_geocoded_at}).eq('id',l.id);return p;}finally{smvGeoLeadBusy=false;}
 }
 async function smvEnsureVenueGeo(v){
   if(!v||smvVenuePoint(v)||smvGeoVenueAttempted.has(String(v.id)))return smvVenuePoint(v);
   smvGeoVenueAttempted.add(String(v.id));const parsed=smvMapPoint(v.google_maps_url);let p=parsed;
   if(!p){const q=[v.venue_name,v.area,v.city,v.address].filter(Boolean).join(', ');if(q)p=await smvGeocode(q);}
   if(!p)return null;v.latitude=p.lat;v.longitude=p.lon;const db=typeof getSupabaseClient==='function'?getSupabaseClient():null;if(db&&v.id)await db.from('venues').update({latitude:p.lat,longitude:p.lon}).eq('id',v.id);return p;
 }
 async function smvRefreshAssignmentGeo(){
   if(smvGeoQueueBusy)return;const lead=currentAssignmentLead(),venues=Array.isArray(assignmentVenueRows)?assignmentVenueRows:[];if(!lead||!venues.length)return;smvGeoQueueBusy=true;
   try{
     await smvEnsureLeadGeo(lead);
     for(const v of venues){if(!document.getElementById('venueAssignmentModal')||document.getElementById('venueAssignmentModal').hidden)break;if(smvVenuePoint(v))continue;await smvEnsureVenueGeo(v);try{renderAssignmentVenues();}catch(_){}await new Promise(r=>setTimeout(r,1100));}
     try{renderAssignmentVenues();}catch(_){}
   }finally{smvGeoQueueBusy=false;}
 }
 // COMMENT is internal_notes. Explicit office notes take priority over older intake fields.
 function smvParseNotes(value) {
   const t=smvText(value).replace(/[०-९]/g,c=>String(c.charCodeAt(0)-2406)).replace(/[–—]/g,'-').replace(/(\d),(?=\d{3}\b)/g,'$1');
   const out={};
   const clauses=t.split(/[\n;|,.!?]+(?!\d)/).filter(Boolean);
   const negative=s=>/\b(no|without|not|dont|don't|nahi|nahin|nhi)\b|नहीं/.test(s);
   const numberNear=(s,noun)=>{
     const n='(\\d+(?:\\s*(?:-|to|se)\\s*\\d+)?)';
     const gap='(?:\\s*(?:requirements?|required|reqd|req|needed|need|want|around|about|approx|approximately|minimum|min|at least|of|count|chahiye|chaiye|chaheye|hai|hain|h|ka|ki|ke|total|available|hona|hone|should|be|:|=|-))*\\s*';
     let m=s.match(new RegExp('(?:'+noun+')\\b'+gap+n+'\\b','i'))||s.match(new RegExp('\\b'+n+gap+'(?:'+noun+')\\b','i'));
     return m?Math.max(...m[1].match(/\d+/g).map(Number)):null;
   };
   for(const s of clauses){
     if(/\brooms?\b/.test(s)){
       const roomNeg=/\b(?:no|without)\s+rooms?\b|\brooms?\s+(?:(?:is|are)\s+)?(?:not\s+(?:required|needed)|(?:nahi|nahin|nhi)(?:\s+chahiye)?)|\b(?:don't|dont|do not)\s+(?:need|want|require)\s+(?:\d+\s+)?rooms?\b/.test(s);
       const n=numberNear(s,'rooms?');
       if(roomNeg||/\brooms?\s*[:=-]?\s*\d+\s+(?:nahi|nahin|nhi|not required)\b/.test(s))out.rooms=0;else if(n!==null)out.rooms=n;
     }
     const guests=numberNear(s,'guests?|pax|people|persons?');if(guests!==null)out.guests=guests;
     const event=s.match(/\b(anniversary|birthday|engagement|reception|wedding|marriage|corporate|party)\b/);if(event&&!negative(s.slice(Math.max(0,event.index-12),event.index)))out.occasion=event[1];
     for(const [key,noun] of [['parking','parking'],['lawn','outdoor|lawn|open area'],['indoor','indoor|banquet hall']]){
       const re=new RegExp('\\b(?:'+noun+')\\b','g');let m;
       while((m=re.exec(s))){const before=s.slice(Math.max(0,m.index-24),m.index),after=s.slice(m.index+m[0].length,m.index+m[0].length+28);out[key]=!(/\b(?:no|without|not|avoid)\s*$/.test(before)||/^\s+(?:(?:is|are)\s+)?(?:not\s+(?:required|needed)|nahi|nahin|nhi)/.test(after));}
     }
     if(/\bfood\s*(?:preference)?\s*[:=-]?\s*(?:is\s+)?both\b|\bboth\s+(?:food|veg)\b/.test(s)){out.veg=true;out.nonveg=true;}
     const nv=/\bnon[ -]?veg(?:etarian)?\b/.test(s),v=/\bveg(?:etarian)?\b/.test(s.replace(/\bnon[ -]?veg(?:etarian)?\b/g,''));
     if(nv||v){
       const noNV=/\b(?:no|not|without)\s+non[ -]?veg|non[ -]?veg\s+(?:nahi|nahin|nhi|not required)/.test(s);
       const noV=/\b(?:no|not|without)\s+veg|\bveg\s+(?:nahi|nahin|nhi|not required)/.test(s);
       out.nonveg=nv&&!noNV;out.veg=v&&!noV;
       if(noNV&&!v)out.veg=true;
     }
     const type=s.match(/\b(farm\s*house|farmhouse|banquet|hotel|resort|party hall|marriage hall|rooftop|restaurant|lawn)\b/);
     if(type&&!negative(s.slice(Math.max(0,type.index-12),type.index))&&!/^\s+(?:not required|not needed|nahi|nahin|nhi)/.test(s.slice(type.index+type[0].length))){
       const family=smvVenueTypeFamily(type[1]);
       const lawnAsPreference=family==='lawn'&&/\b(?:outdoor|open\s*area|lawn)\b.{0,28}\b(?:prefer|preferred|preference|chahiye|chaiye|needed|need)\b|\b(?:prefer|preferred|preference)\b.{0,28}\b(?:outdoor|lawn|open\s*area)\b/.test(s);
       // Keep lawn/outdoor as a feature preference unless lawn itself is clearly the venue type.
       if(!lawnAsPreference||!out.venueType)out.venueType=family;
     }
     const city=s.match(/\b(gurgaon|gurugram|manesar|greater noida|noida|faridabad|ghaziabad|delhi(?: ncr)?)\b/);
     if(city&&!negative(s.slice(Math.max(0,city.index-12),city.index))){const sector=s.match(/\bsec(?:tor)?\s*[.-]?\s*(\d+[a-z]?)\b/);const place=(sector?'sector '+sector[1]+' ':'')+city[1];out.location=out.location?[out.location,place].join(' / '):place;}

     // Delhi NCR venue-belt / locality inference from free-form comments.
     // These terms frequently carry more matching value than a broad city dropdown.
     const areaMatchers=[
       ['chattarpur',/\bchh?att?arpur\b/],
       ['gt karnal road',/\b(?:gt|g\.t\.)\s*karnal\s*road\b/],
       ['kapashera',/\bkapas[ -]?hera\b/],
       ['dwarka',/\bdwarka\b/],
       ['alipur',/\balipur\b/],
       ['peeragarhi',/\b(?:peer|pir)[ -]?agarhi\b/],
       ['rohini',/\brohini\b/],
       ['pitampura',/\bpitam[ -]?pura\b/],
       ['paschim vihar',/\bpaschim\s*vihar\b/],
       ['najafgarh',/\bnajafgarh\b/],
       ['vasant kunj',/\bvasant\s*kunj\b/],
       ['aerocity',/\baero\s*city\b|\baerocity\b/],
       ['mahipalpur',/\bmahi?palpur\b/],
       ['dlf phase 1',/\bdlf\s*(?:phase)?\s*1\b/],
       ['dlf phase 2',/\bdlf\s*(?:phase)?\s*2\b/],
       ['dlf phase 3',/\bdlf\s*(?:phase)?\s*3\b/],
       ['dlf phase 4',/\bdlf\s*(?:phase)?\s*4\b/],
       ['dlf phase 5',/\bdlf\s*(?:phase)?\s*5\b/],
       ['golf course road',/\bgolf\s*course\s*road\b/],
       ['sohna road',/\bsohna\s*road\b/],
       ['udyog vihar',/\budyog\s*vihar\b/]
     ];
     const areaHit=areaMatchers.find(([,re])=>re.test(s));
     if(areaHit){
       const area=areaHit[0];
       const citySuffix=city?' '+city[1]:'';
       const place=(area+citySuffix).trim();
       if(!out.location)out.location=place;
       else if(!smvText(out.location).includes(area))out.location=[out.location,place].join(' / ');
     }
     const amount=s.match(/(?:budget|per\s*(?:person|plate|head)|pp)\s*(?:is|of|around|approx|:|=|-)?\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(lacs?|lakhs?|lac|lakh|k|thousand)?\b/)||s.match(/(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(lacs?|lakhs?|k|thousand)?\s*(?:\/\s*|per\s*)(?:person|plate|head|pax)\b/);
     if(amount){const factor=/^la/.test(amount[2]||'')?100000:/^(k|thousand)$/.test(amount[2]||'')?1000:1;const n=Number(amount[1])*factor;if(/per\s*(?:person|plate|head|pax)|\/\s*(?:person|plate|head|pax)|\bpp\b/.test(s))out.budget=n;else out.totalBudget=n;}
   }
   return out;
 }
 function smvLeadSpec(l){
   const inferred=Object.assign({},smvParseNotes(l?.requirements),smvParseNotes(l?.contact_remark),smvParseNotes(l?.internal_notes));
   const food=smvText(l?.food_preference),structured={parking:l?.parking_required===true,lawn:l?.outdoor_preferred===true,indoor:l?.indoor_preferred===true,rooms:Number(l?.rooms_required)||0,venueType:smvText(l?.venue_type_preference),food};
   const hasFood=inferred.veg!==undefined||inferred.nonveg!==undefined;
   const savedLocation=smvText([l?.preferred_city,l?.preferred_area,l?.location].filter(Boolean).join(' '));
   let inferredLocation=smvText(inferred.location);
   const broadLocation=/^(delhi(?: ncr)?|gurgaon|gurugram|manesar|noida|greater noida|faridabad|ghaziabad)$/.test(inferredLocation);
   const inferredSpecific=!!inferredLocation&&!broadLocation;
   // Example: saved city = Delhi, note = Chattarpur. Preserve Chattarpur specificity
   // but inherit Delhi so same-city alternatives are not treated as cross-region failures.
   if(inferredSpecific&&!smvRegion(inferredLocation)&&smvRegion(savedLocation)){
     inferredLocation=(inferredLocation+' '+smvRegion(savedLocation)).trim();
   }
   const location=inferredLocation&&(inferredSpecific||/\/|\bsector\b/.test(inferredLocation)||smvRegion(inferredLocation)!==smvRegion(savedLocation))
     ?inferredLocation
     :(savedLocation||inferredLocation||'');
   return {location,occasion:inferred.occasion||clean(l?.occasion),guests:inferred.guests??(Number(l?.guests)||0),budget:inferred.budget??(Number(l?.budget_per_person)||0),totalBudget:inferred.totalBudget||0,rooms:inferred.rooms??structured.rooms,parking:inferred.parking??structured.parking,lawn:inferred.lawn??structured.lawn,indoor:inferred.indoor??structured.indoor,venueType:inferred.venueType||structured.venueType,veg:hasFood?!!inferred.veg:/\bveg(?:etarian)?\b/.test(food.replace(/non[ -]?veg(?:etarian)?/g,'')),nonveg:hasFood?!!inferred.nonveg:/non[ -]?veg(?:etarian)?/.test(food),notes:notes(l),inferred,structured};
 }
 function smvRequirementConflicts(l){const s=smvLeadSpec(l),n=s.notes||'',out=[];const structuredRooms=Number(l?.rooms_required)||0;if(structuredRooms&&s.inferred.rooms!==undefined&&structuredRooms!==s.inferred.rooms)out.push('Rooms: saved '+structuredRooms+', notes mention '+s.inferred.rooms+' (using notes)');const structuredType=smvText(l?.venue_type_preference);if(structuredType&&s.inferred.venueType&&structuredType!==s.inferred.venueType&&!structuredType.includes(s.inferred.venueType)&&!s.inferred.venueType.includes(structuredType))out.push('Venue type: saved '+l.venue_type_preference+', notes suggest '+s.inferred.venueType);const food=smvText(l?.food_preference);if(food&&s.inferred.nonveg===true&&food==='veg')out.push('Food: saved Veg, notes mention Non-Veg (using notes)');if(s.inferred.guests&&Number(l?.guests)&&s.inferred.guests!==Number(l.guests))out.push('Guests: using '+s.inferred.guests+' from notes');if(s.inferred.location&&smvRegion(l?.location)&&smvRegion(s.inferred.location)!==smvRegion(l?.location))out.push('Location: using '+s.inferred.location+' from notes');if(l?.outdoor_preferred===true&&/\b(indoor only|only indoor)\b/.test(n))out.push('Outdoor preference conflicts with notes');if(l?.indoor_preferred===true&&/\b(outdoor only|only outdoor|lawn only|only lawn)\b/.test(n))out.push('Indoor preference conflicts with notes');return out;}
 function smvLocationMatch(location, venueLocation){
   const normalize=v=>smvText(v).replace(/gurugram/g,'gurgaon').replace(/\bkapas[ -]*hera\b/g,'kapashera').replace(/\bsec(?:tor)?[ .-]*/g,'sector ').replace(/\s+/g,' ').trim();
   const actual=normalize(venueLocation),actualTokens=new Set(actual.split(/[^a-z0-9]+/));
   return normalize(location).split(/\s*(?:\/|\bor\b)\s*/).some(option=>{
     const region=smvRegion(option),venueRegion=smvRegion(actual);
     if(region&&venueRegion&&region!=='delhi ncr'&&region!==venueRegion)return false;
     const words=option.split(/[^a-z0-9]+/).filter(w=>w&&!['delhi','ncr','new','gurgaon','noida','greater','faridabad','ghaziabad','near','road','sector','extension','ext','phase'].includes(w));
     return words.length?words.every(w=>actualTokens.has(w)):!!region&&(region==='delhi ncr'||region===venueRegion);
   });
 }
 function smartMatch(v,l){const spec=smvLeadSpec(l),blob=smvText([v.area,v.city,v.address,v.venue_type,v.food_options,v.facilities,v.description].filter(Boolean).join(" ")),foodSupport=smvVenueFoodSupport(v,blob);let score=0,max=0,reasons=[],warnings=[],hardFail=false,knownWeight=0,relevantWeight=0,criteria=0;const test=(pts,required,knownData,ok,label,hard=false)=>{if(!required)return;criteria++;relevantWeight+=pts;if(!knownData){warnings.push(label+" unknown");return;}knownWeight+=pts;max+=pts;if(ok){score+=pts;reasons.push(label);}else{warnings.push(label+" mismatch");if(hard)hardFail=true;}};const locWords=smvTokens(spec.location).filter(w=>!["delhi","ncr","near","road","new","sector","extension","ext","phase"].includes(w)&&w.length>2),leadRegion=smvRegion(spec.location),venueLocation=smvText([v.venue_name,v.city,v.area,v.address].filter(Boolean).join(" ")),venueRegion=smvRegion(venueLocation),venueLocationTokens=new Set(smvTokens(venueLocation)),specificArea=!!clean(l?.preferred_area)||locWords.length>0,areaMatch=specificArea&&locWords.some(w=>venueLocationTokens.has(w)),venueNameMatch=!!clean(l?.preferred_area)&&smvText(v.venue_name).includes(smvText(l.preferred_area)),sameRegion=leadRegion&&venueRegion&&(leadRegion===venueRegion||leadRegion==="delhi ncr"),locationMatch=smvLocationMatch(spec.location,venueLocation),crossRegion=!!leadRegion&&!!venueRegion&&leadRegion!=="delhi ncr"&&leadRegion!==venueRegion;test(25,!!spec.location,!!venueLocation,!!locationMatch,"Location",crossRegion);if(venueNameMatch){score+=12;max+=12;reasons.push("Requested venue");}else if(specificArea&&areaMatch){score+=8;max+=8;reasons.push("Preferred area");}else if(specificArea&&sameRegion&&!crossRegion){warnings.push("Preferred area alternative");}const leadPoint=smvLeadPoint(l),venuePoint=smvVenuePoint(v),distanceKm=smvDistanceKm(leadPoint,venuePoint);if(specificArea&&distanceKm!==null){criteria++;relevantWeight+=18;knownWeight+=18;max+=18;let pts=0;if(distanceKm<=3)pts=18;else if(distanceKm<=7)pts=15;else if(distanceKm<=12)pts=11;else if(distanceKm<=20)pts=7;else if(distanceKm<=35)pts=3;score+=pts;if(pts>=11)reasons.push("Nearby ≈"+distanceKm.toFixed(1)+" km");else if(pts>0)warnings.push("Distance ≈"+distanceKm.toFixed(1)+" km");else warnings.push("Farther away ≈"+distanceKm.toFixed(1)+" km");}const capMin=Number(v.capacity_min)||0,capMax=Number(v.capacity_max)||0,hasCapacity=!!(capMin||capMax),capacityOk=(!capMin||spec.guests>=capMin)&&(!capMax||spec.guests<=capMax);test(20,!!spec.guests,hasCapacity,capacityOk,"Capacity",true);const wanted=spec.venueType,actual=smvText(v.venue_type),wantedType=smvVenueTypeFamily(wanted),actualType=smvVenueTypeFamily(actual),typeMatch=!!wantedType&&!!actualType&&(wantedType===actualType||wanted.includes(actual)||actual.includes(wanted));test(10,!!wanted,!!actual,typeMatch,"Venue type");const pmin=Number(v.price_min_per_person)||Number(v.budget_min)||0;if(spec.budget){criteria++;relevantWeight+=15;if(!pmin)warnings.push("Price unknown");else{knownWeight+=15;max+=15;if(pmin<=spec.budget){score+=15;reasons.push("Budget");}else{const over=Math.round((pmin-spec.budget)/Math.max(spec.budget,1)*100);if(over<=15){score+=9;warnings.push("Budget slightly higher ("+over+"%)");}else{warnings.push("Budget exceeds by "+over+"%");hardFail=true;}}}}const hasRoomData=(v.room_count!==null&&v.room_count!==undefined&&String(v.room_count).trim()!==''&&Number.isFinite(Number(v.room_count)))||v.rooms_available===false;test(10,!!spec.rooms,hasRoomData,v.rooms_available!==false&&Number(v.room_count)>=spec.rooms,"Rooms",true);test(6,!!spec.parking,v.parking_available!==null&&v.parking_available!==undefined,v.parking_available===true,"Parking");const explicitFood=!!smvText(l?.food_preference)||spec.inferred.veg!==undefined||spec.inferred.nonveg!==undefined;test(5,!!spec.veg,v.food_veg!==null&&v.food_veg!==undefined||foodSupport.veg,foodSupport.veg,"Veg food",explicitFood);test(5,!!spec.nonveg,v.food_non_veg!==null&&v.food_non_veg!==undefined||foodSupport.nonveg,foodSupport.nonveg,"Non-veg food",explicitFood);test(4,!!spec.lawn,v.outdoor_available!==null&&v.outdoor_available!==undefined||/(lawn|outdoor|farmhouse|farm house|open area)/.test(blob),v.outdoor_available===true||/(lawn|outdoor|farmhouse|farm house|open area)/.test(blob),"Outdoor/Lawn");test(4,!!spec.indoor,v.indoor_available!==null&&v.indoor_available!==undefined||/(indoor|banquet|hall|ballroom)/.test(blob),v.indoor_available===true||/(indoor|banquet|hall|ballroom)/.test(blob),"Indoor");const supported=(Array.isArray(v.event_types)?v.event_types:clean(v.event_types).split(/[,;|]/)).map(smvEventFamily).filter(Boolean),event=smvEventFamily(spec.occasion);if(event&&event!=='other'){const known=supported.length>0;test(8,true,known,supported.includes(event)||supported.includes('all')||supported.includes('all occasions'),"Event type",true);}const dataConfidence=relevantWeight?Math.round(knownWeight/relevantWeight*100):0,rawScore=max?Math.round(score/max*100):0;let scorePct=hardFail?0:Math.round(rawScore*(dataConfidence/100));if(!hardFail&&specificArea&&!areaMatch&&distanceKm===null&&sameRegion)scorePct=Math.min(scorePct,72);const insufficient=criteria<2||relevantWeight===0;return{score:insufficient?0:scorePct,rawScore,dataConfidence,criteria,insufficient,hardFail,reasons,warnings:[...new Set(warnings)],spec,areaMatch,specificArea,locationMatch,sameRegion,distanceKm};}
 function smvCompareMatches(a,b){const ad=a.m.distanceKm,bd=b.m.distanceKm;return Number(a.m.hardFail)-Number(b.m.hardFail)||b.m.score-a.m.score||((ad===null)-(bd===null))||((ad??9999)-(bd??9999))||(a.m.spec.rooms ? Number(b.m.reasons.includes("Rooms"))-Number(a.m.reasons.includes("Rooms")) : 0)||clean(a.v.venue_name).localeCompare(clean(b.v.venue_name));}
 // One definition of a reliable match is shared by the assistant and assignment view.
 function smvMatchTier(m) {
   if(m.insufficient)return 'requirements';
   if(m.hardFail)return 'excluded';
   if(m.dataConfidence<45)return 'incomplete';
   if(m.score>=72&&m.dataConfidence>=65&&!m.warnings.some(w=>/mismatch|exceeds/i.test(w)))return 'strong';
   return m.score>=50?'possible':'low';
 }
 function smvShortlist(lead,venues,assigned) {
   if(!lead||['booked','closed','lost','not-interested'].includes(norm(lead.status)))return [];
   const spec=smvLeadSpec(lead);if(!spec.location||!spec.occasion)return [];
   const remaining=Math.max(0,3-assigned.size);if(!remaining)return[];
   const rows=venues.filter(v=>v.venue_status==='approved'&&v.verification_status==='verified'&&!assigned.has(String(v.id)))
     .map(v=>({v,m:smartMatch(v,lead)}))
     .filter(x=>!x.m.hardFail&&!x.m.warnings.some(w=>/budget exceeds/i.test(w)))
     .filter(x=>x.m.locationMatch||x.m.areaMatch||x.m.sameRegion||(x.m.distanceKm!==null&&x.m.distanceKm<=35))
     .sort(smvCompareMatches);
   const strong=rows.filter(x=>['strong','possible'].includes(smvMatchTier(x.m)));
   const pool=strong.length?strong:rows;
   return pool.slice(0,remaining).map(x=>String(x.v.id));
 }
 let smvPreparedKey='';
 function smvPrepareAssignment(){
   const lead=currentAssignmentLead();if(!lead)return;
   const venues=Array.isArray(assignmentVenueRows)?assignmentVenueRows:[];
   const assigned=assignedVenueSet();
   const key=JSON.stringify([lead.id,smvLeadSpec(lead),venues,[...assigned].sort()]);
   if(key===smvPreparedKey)return;
   smvPreparedKey=key;selectedNow.clear();
   smvShortlist(lead,venues,assigned).forEach(id=>selectedNow.add(id));
   let hint=document.getElementById('smvPreparationStatus');
   const summary=ensureAssignmentSummary();
   if(!hint&&summary){hint=document.createElement('div');hint.id='smvPreparationStatus';hint.className='smv-inferred-note';summary.prepend(hint);}
   if(hint)hint.textContent=selectedNow.size
     ?'Prepared '+selectedNow.size+' best venue match'+(selectedNow.size===1?'':'es')+' automatically, prioritising location and recorded requirements. Your Assign click is the only step that saves.'
     :'No safe automatic shortlist is ready yet. Add Venue / Area or another key requirement, then reopen Assign. Nothing has been assigned.';
 }
 function smvPhone(v){
   let number=clean(
     v?.whatsapp_number ||
     v?.whatsapp ||
     v?.contact_mobile ||
     v?.mobile ||
     v?.phone
   ).replace(/\D/g,'');
   if(number.startsWith('00'))number=number.slice(2);
   if(number.length===11&&number.startsWith('0'))number=number.slice(1);
   if(number.length===10)number='91'+number;
   return /^[1-9]\d{7,14}$/.test(number)?number:'';
 }
 function smvWhatsAppUrl(v,messageText){
   const number=smvPhone(v);if(!number)return '';
   return 'https://wa.me/'+number+'?text='+encodeURIComponent(messageText||'');
 }
 function smvOpenWhatsApp(v,messageText){
   const url=smvWhatsAppUrl(v,messageText);if(!url)return false;
   const opened=window.open(url,'_blank');
   if(opened){try{opened.opener=null;}catch(_){}return true;}
   window.location.href=url;
   return true;
 }
 function smvRequirementChecklist(l){
   const s=smvLeadSpec(l),i=s.inferred;
   const broadLocation=/^(delhi(?: ncr)?|gurgaon|gurugram|manesar|noida|greater noida|faridabad|ghaziabad)$/.test(smvText(s.location));
   const items=[
     {label:'Location',ready:!!s.location,question:'Which city and area do you prefer?'}
   ];
   if(s.location&&!smvText(l?.preferred_area)&&broadLocation){
     items.push({label:'Preferred area',ready:false,question:'Which area is preferred, or is the whole city acceptable?'});
   }
   items.push(
     {label:'Guest count',ready:s.guests>0,question:'How many guests are expected?'},
     {label:'Event date',ready:!!clean(l?.event_date),question:'What is the event date?'},
     {label:'Event type',ready:!!s.occasion&&smvEventFamily(s.occasion)!=='other',question:'What type of event is planned?'},
     {label:'Budget',ready:s.budget>0||s.totalBudget>0,question:'What is the per-person or total event budget?'},
     {label:'Food preference',ready:!!(s.veg||s.nonveg),question:'Is the food preference veg, non-veg or both?'},
     {label:'Rooms',ready:i.rooms!==undefined||(l?.rooms_required!==null&&l?.rooms_required!==undefined),question:'Are rooms required? If yes, how many?'}
   );
   return items;
 }
 function smvQuestions(l){
   return smvRequirementChecklist(l).filter(item=>!item.ready).map(item=>item.question);
 }
 function smvEventFamily(v){return smvText(v).replace(/[_-]/g,' ').replace(/\bevents?\b/g,'').replace(/\s+/g,' ').trim();}
 function smvReadiness(v,l){
   const s=smvLeadSpec(l),labels=[clean(l.event_date)?'Date availability: confirm with venue':'Event date: needed'];
   labels.push(s.totalBudget?'Total package quote: pending':s.budget?'Final quote: pending':'Customer budget: needed');
   if(!clean(v.event_types)||Array.isArray(v.event_types)&&!v.event_types.length)labels.push('Event support: confirm with venue');
   return labels;
 }
 let smvQueueKey='',smvQueueLoading=false,smvQueueRows=[];
 async function refreshPreparationQueue(){
   let host=document.getElementById('smvPreparationQueue');
   if(!host){const anchor=document.getElementById('leadWorkViews');if(!anchor)return;host=document.createElement('details');host.id='smvPreparationQueue';host.className='smv-preparation-queue';host.innerHTML='<summary>Automatic preparation</summary><div class="smv-preparation-body"></div>';anchor.insertAdjacentElement('afterend',host);host.addEventListener('click',e=>{const filter=e.target.closest('[data-preparation-filter]');if(filter){host.dataset.filter=filter.dataset.preparationFilter;smvQueueKey='';refreshPreparationQueue();return;}const b=e.target.closest('[data-preparation-lead]');if(!b)return;const id=b.dataset.preparationLead;if(b.dataset.prepareAction==='matches')openVenueAssignmentModal(id);else openLeadModal(id);});}
   if(smvQueueLoading||document.hidden)return;
   const active=leads().filter(l=>!['booked','closed','lost','not-interested'].includes(norm(l.status)));

   smvQueueLoading=true;
   try{const venues=await ensureAssistantVenues();const key=JSON.stringify([active,assignments(),venues]);if(key===smvQueueKey)return;
     smvQueueRows=active.map(l=>{const assigned=new Set(assignments().filter(a=>String(a.enquiry_id)===String(l.id)&&norm(a.assignment_status)!=='cancelled').map(a=>String(a.venue_id)));return {l,q:smvQuestions(l),shortlist:smvShortlist(l,venues,assigned)};});
     const missing=smvQueueRows.filter(r=>r.q.length),ready=smvQueueRows.filter(r=>r.shortlist.length);
     host.querySelector('summary').textContent='Automatic preparation · '+missing.length+' need details · '+ready.length+' have venue suggestions';
     host.querySelector('div').innerHTML='<p>Updates while CRM is open. Suggestions still need your review and final Assign click.</p><p>'+venues.filter(v=>!clean(v.event_types)||Array.isArray(v.event_types)&&!v.event_types.length).length+' approved venues need supported event types entered in Venue Management before automatic shortlisting. Manual review remains available.</p><div class="smv-preparation-filters"><button type="button" data-preparation-filter="all">All active</button><button type="button" data-preparation-filter="details">Needs details</button><button type="button" data-preparation-filter="ready">Venue suggestions</button></div><p>'+escapeHTML(({all:'All active enquiries',details:'Enquiries needing details',ready:'Enquiries with new strong suggestions'})[host.dataset.filter||'all'])+'</p>'+smvQueueRows.filter(r=>host.dataset.filter==='details'?r.q.length:host.dataset.filter==='ready'?r.shortlist.length:true).map(({l,q,shortlist})=>'<div class="smv-preparation-row"><strong>'+escapeHTML(l.customer_name||'Unnamed enquiry')+'</strong><span>'+escapeHTML(q.length?q.join(' • '):'Core details captured')+'</span><span>'+shortlist.length+' new strong suggestions</span><button type="button" data-preparation-lead="'+escapeHTML(l.id)+'">Review details</button><button type="button" data-preparation-lead="'+escapeHTML(l.id)+'" data-prepare-action="matches">Review venues</button></div>').join('');
     smvQueueKey=key;
   }catch(e){host.querySelector('summary').textContent='Automatic preparation unavailable · retrying';}finally{smvQueueLoading=false;}
 }
 function smvCompleteness(l){
   const items=smvRequirementChecklist(l),missing=items.filter(item=>!item.ready);
   const completed=items.length-missing.length;
   return {
     percent:items.length?Math.round(completed/items.length*100):100,
     missing:missing.map(item=>item.label),
     completed,
     total:items.length
   };
 }
 function smvVenueFoodSupport(v,blob){
   const text=smvText([v?.food_options,v?.facilities,v?.description,blob].filter(Boolean).join(' '));
   const nonveg=/\bnon[ -]?veg(?:etarian)?\b/.test(text)&&!/\b(?:no|without)\s+non[ -]?veg|non[ -]?veg\s+(?:not|nahi|nhi)/.test(text);
   const veg=/\bveg(?:etarian)?\b/.test(text.replace(/\bnon[ -]?veg(?:etarian)?\b/g,''));
   return {veg:typeof v?.food_veg==='boolean'?v.food_veg:veg,nonveg:typeof v?.food_non_veg==='boolean'?v.food_non_veg:nonveg};
 }
 let smvAssistantRefreshKey='',smvAssistantRefreshAt=0,smvAssistantRequest=0;
 async function refreshVenueAssistant(){
   const body=document.getElementById('smvAssistantBody'),quality=document.getElementById('smvAssistantQuality');
   if(!body)return;
   const lead=(()=>{try{return currentLead}catch(_){return null}})();
   if(!lead){smvAssistantRequest++;smvAssistantRefreshKey='';if(quality)quality.textContent='';body.innerHTML='<span class="smv-summary-empty">Open a customer enquiry to see recommendations.</span>';return;}
   if(document.getElementById('leadModal')?.hidden||document.hidden)return;
   const spec=smvLeadSpec(lead),key=JSON.stringify([lead.id,spec]);
   if(key===smvAssistantRefreshKey&&Date.now()-smvAssistantRefreshAt<30000)return;
   smvAssistantRefreshKey=key;smvAssistantRefreshAt=Date.now();const request=++smvAssistantRequest;
   const questions=smvQuestions(lead),complete=smvCompleteness(lead),conflicts=smvRequirementConflicts(lead),detected=[];
   for(const [k,label] of [['location','Location'],['occasion','Event'],['venueType','Venue type']]){
     if(spec.inferred[k]!==undefined)detected.push(label+': '+smvPretty(spec.inferred[k]));
   }
   if(spec.inferred.guests!==undefined)detected.push('Guests: '+spec.inferred.guests);
   if(spec.inferred.rooms!==undefined)detected.push('Rooms: '+spec.inferred.rooms);
   if(spec.inferred.veg!==undefined||spec.inferred.nonveg!==undefined)detected.push('Food: '+(food(lead)||'Needs clarification'));
   for(const [k,label] of [['parking','Parking'],['lawn','Outdoor / lawn'],['indoor','Indoor']]){
     if(spec.inferred[k]!==undefined)detected.push(label+': '+(spec.inferred[k]?'Required':'Not required'));
   }
   if(spec.inferred.budget!==undefined)detected.push('Budget: ₹'+spec.inferred.budget+'/person');
   if(spec.inferred.totalBudget!==undefined)detected.push('Total budget: ₹'+spec.inferred.totalBudget);
   const missingText=complete.missing.length
     ?'Still needed: '+complete.missing.join(', ')
     :'Core requirements complete — ready for reliable matching';
   if(quality)quality.innerHTML=
     '<div class="smv-match-quality">'+
       '<div class="smv-match-quality-copy"><b>Enquiry completeness '+complete.percent+'%</b><span>'+escapeHTML(missingText)+'</span></div>'+
       '<div class="smv-match-progress" role="progressbar" aria-label="Enquiry completeness" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+complete.percent+'"><i style="width:'+complete.percent+'%"></i></div>'+
     '</div>'+
     (detected.length?'<div class="smv-inferred-note"><b>Detected from customer notes</b><span>'+escapeHTML(detected.join(' · '))+'</span></div>':'')+
     (questions.length?'<details class="smv-questions"><summary>Details still needed ('+questions.length+')</summary><ul>'+questions.map(q=>'<li>'+escapeHTML(q)+'</li>').join('')+'</ul></details>':'')+
     (conflicts.length?'<div class="smv-conflict-note"><b>Notes differ from saved fields</b><span>'+escapeHTML('Matching uses the note details: '+conflicts.join(' · '))+'</span></div>':'');
   const venues=await ensureAssistantVenues();
   let current=null;try{current=currentLead}catch(_){}
   if(request!==smvAssistantRequest||String(current?.id)!==String(lead.id))return;
   const ranked=venues.map(v=>({v,m:smartMatch(v,lead)})).sort(smvCompareMatches);
   const top=ranked.filter(x=>['strong','possible'].includes(smvMatchTier(x.m))).slice(0,3);
   const excluded=ranked.filter(x=>x.m.hardFail).length;
   body.innerHTML=top.length?top.map(({v,m})=>'<div class="smv-assistant-row"><div><strong>'+escapeHTML(v.venue_name||'Venue')+'</strong><span>'+escapeHTML([v.area,v.city].filter(Boolean).join(', '))+'</span></div><b>'+m.score+'% · '+(smvMatchTier(m)==='strong'?'Strong':'Possible')+'</b></div>').join('')+'<div class="smv-assistant-foot">'+top.length+' matches · '+excluded+' excluded. Assignment requires your click.</div>':'<span class="smv-summary-empty">'+(venues.length?'No reliable match. Review missing requirements or venue details.':'No approved, verified venues available.')+'</span>';
 }

 function recommendation(v,l){const m=smartMatch(v,l);return !m.insufficient&&!m.hardFail&&m.dataConfidence>=60&&m.score>=55;}
 function assignedVenueSet(){const l=currentAssignmentLead();if(!l)return new Set();return new Set(assignments().filter(a=>String(a.enquiry_id)===String(l.id)&&norm(a.assignment_status)!=='cancelled').map(a=>String(a.venue_id)));}
 function venueRowById(id){try{return (assignmentVenueRows||[]).find(v=>String(v.id)===String(id));}catch(_){return null;}}
 function resetSelectionForLead(){const l=currentAssignmentLead(),id=String(l?.id||'');if(id!==selectionLeadId){selectedNow.clear();smvPreparedKey='';selectionLeadId=id;}}
 function resetAssignmentUiState(){selectedNow.clear();smvPreparedKey='';selectionLeadId='';const controls=document.getElementById('smvMatchTierControls');if(controls){controls.dataset.tier='strong';controls.querySelectorAll('[data-tier]').forEach(b=>b.classList.toggle('active',b.dataset.tier==='strong'));}const panel=document.getElementById('smvWhatsAppQueue');if(panel)panel.hidden=true;document.querySelector('.venue-assignment-note.smv-message-floating')?.classList.remove('smv-message-open');}
 function ensureAssignmentSummary(){const modal=document.getElementById('venueAssignmentModal');if(!modal)return null;const card=modal.querySelector('.venue-assignment-card')||modal.firstElementChild;if(!card)return null;let wrap=document.getElementById('smvAssignmentSummary');if(!wrap){wrap=document.createElement('div');wrap.id='smvAssignmentSummary';wrap.className='smv-assignment-summary smv-assignment-summary-top';wrap.innerHTML='<div id="smvAlreadyAssigned"></div><div id="smvSelectedNow"></div>';const header=card.querySelector('.venue-assignment-header,.modal-header');if(header)header.insertAdjacentElement('afterend',wrap);else card.prepend(wrap);}return wrap;}
 function renderAssignmentSummary(){resetSelectionForLead();const wrap=ensureAssignmentSummary();if(!wrap)return;const already=assignedVenueSet();[...already].forEach(id=>selectedNow.delete(id));const assignedBox=wrap.querySelector('#smvAlreadyAssigned'),selectedBox=wrap.querySelector('#smvSelectedNow');const chips=(ids,removable)=>ids.map(id=>{const v=venueRowById(id),name=clean(v?.venue_name)||'Venue',loc=[v?.area,v?.city].filter(Boolean).join(', ');return `<span class="smv-venue-chip ${removable?'smv-selected-chip':'smv-assigned-chip'}" data-venue-id="${escapeHTML(id)}"><b>${escapeHTML(name)}</b>${loc?` <small>· ${escapeHTML(loc)}</small>`:''}${removable?'<button type="button" class="smv-chip-remove" aria-label="Remove selection">×</button>':'<button type="button" class="smv-unassign-btn" aria-label="Unassign venue">Unassign</button>'}</span>`;}).join('');assignedBox.innerHTML=`<div class="smv-summary-title">Already Assigned <strong>${already.size}</strong></div><div class="smv-chip-row">${already.size?chips([...already],false):'<span class="smv-summary-empty">No venue assigned yet.</span>'}</div>`;selectedBox.innerHTML=`<div class="smv-summary-title">Selected Now <strong>${selectedNow.size}</strong></div><div class="smv-chip-row">${selectedNow.size?chips([...selectedNow],true):'<span class="smv-summary-empty">Select venues below — they will appear here instantly.</span>'}</div>`;}
 function activeAssignment(venueId){const l=currentAssignmentLead();if(!l)return null;return assignments().find(a=>String(a.enquiry_id)===String(l.id)&&String(a.venue_id)===String(venueId)&&norm(a.assignment_status)!=='cancelled')||null;}
 async function unassignVenue(venueId,button){const l=currentAssignmentLead(),a=activeAssignment(venueId),v=venueRowById(venueId);if(!l||!a)return;const name=clean(v?.venue_name)||'this venue';if(!window.confirm('Unassign '+name+' from this customer enquiry?'))return;const db=typeof getSupabaseClient==='function'?getSupabaseClient():null;if(!db){alert('CRM connection is not ready. Please refresh and try again.');return;}const old=button?.textContent;if(button){button.disabled=true;button.textContent='Removing…';}try{const {data,error}=await db.from('venue_enquiry_assignments').update({assignment_status:'cancelled'}).eq('id',a.id).select('*').single();if(error)throw error;const local=assignments().find(x=>String(x.id)===String(a.id));if(local)Object.assign(local,data||{assignment_status:'cancelled'});renderAssignmentSummary();try{renderAssignmentVenues();}catch(_){}refreshCards();try{if(assignedMode)assignedFilter();}catch(_){} }catch(e){console.error('Unassign venue error',e);alert(e?.message||'Unable to unassign this venue. No assignment was changed.');}finally{if(button&&button.isConnected){button.disabled=false;button.textContent=old||'Unassign';}}}
 function installVenueAssistant(){const modal=document.getElementById('leadModal');if(!modal||document.getElementById('smvVenueAssistant'))return;const host=document.getElementById('smvAutomationTools')||modal.querySelector('.detail-section-title');if(!host)return;const box=document.createElement('div');box.id='smvVenueAssistant';box.className='smv-venue-assistant';box.innerHTML='<div class="smv-assistant-head"><div><b>Venue Assistant</b><small>Best matches from current details</small></div><button type="button" id="smvAssistantViewAll">View All Matches</button></div><div id="smvAssistantQuality"></div><div id="smvAssistantBody"><span class="smv-summary-empty">Open a customer enquiry to see recommendations.</span></div>';host.insertAdjacentElement('afterend',box);box.querySelector('#smvAssistantViewAll').onclick=()=>{const l=(()=>{try{return currentLead}catch(_){return null}})();if(l)openVenueAssignmentModal(l.id);};}
 let smvAssistantVenueCache=[],smvAssistantVenueCacheAt=0,smvAssistantVenueLoading=null;
 async function ensureAssistantVenues(){let vs=[];try{vs=Array.isArray(assignmentVenueRows)?assignmentVenueRows:[];}catch(_){}if(vs.length)return vs;if(smvAssistantVenueCacheAt&&Date.now()-smvAssistantVenueCacheAt<180000)return smvAssistantVenueCache;if(smvAssistantVenueLoading)return smvAssistantVenueLoading;const db=typeof getSupabaseClient==='function'?getSupabaseClient():null;if(!db)return[];smvAssistantVenueLoading=(async()=>{try{const {data,error}=await db.from('venues').select('*').eq('venue_status','approved').eq('verification_status','verified').order('venue_name',{ascending:true});if(error)throw error;smvAssistantVenueCache=Array.isArray(data)?data:[];smvAssistantVenueCacheAt=Date.now();return smvAssistantVenueCache;}catch(e){console.warn('Venue Assistant could not load venue data',e);return smvAssistantVenueCache;}finally{smvAssistantVenueLoading=null;}})();return smvAssistantVenueLoading;}
 function installAutomationControls(){const modal=document.getElementById('leadModal');if(modal&&!document.getElementById('smvAutomationTools')){const host=modal.querySelector('.detail-section-title');if(host){const tools=document.createElement('div');tools.id='smvAutomationTools';tools.className='smv-automation-tools';tools.innerHTML='<button type="button" id="smvFindMatchesBtn">⚡ Save & Match Venues</button><button type="button" id="smvQuickRequirementsBtn">＋ Add Requirements</button>';host.insertAdjacentElement('afterend',tools);tools.querySelector('#smvFindMatchesBtn').onclick=async()=>{const l=(()=>{try{return currentLead}catch(_){return null}})();const leadId=l?.id;if(!leadId)return;const btn=tools.querySelector('#smvFindMatchesBtn'),oldLabel=btn.textContent;btn.disabled=true;btn.textContent='Saving…';try{const result=typeof saveModalChanges==='function'?await saveModalChanges():null;if(!result?.ok)return;btn.textContent='Finding matches…';await openVenueAssignmentModal(leadId);}catch(e){console.error('Save & Find Best Matches failed',e);alert(e?.message||'Unable to save and find matches.');}finally{btn.disabled=false;btn.textContent=oldLabel;}};tools.querySelector('#smvQuickRequirementsBtn').onclick=()=>{const panel=document.querySelector('#leadModal .smv-customer-requirements');if(panel){panel.open=true;panel.scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('detailPreferredArea')?.focus();}};}}
 }
 function showWhatsAppQueue(targets,messageText){
   let panel=document.getElementById('smvWhatsAppQueue');
   if(!panel){panel=document.createElement('div');panel.id='smvWhatsAppQueue';panel.className='smv-whatsapp-queue';document.body.appendChild(panel);}
   const rows=targets.map((v,i)=>{
     const url=smvWhatsAppUrl(v,messageText);
     return '<a class="smv-wa-link" data-wa-index="'+i+'" href="'+escapeHTML(url)+'"><strong>'+escapeHTML(clean(v.venue_name)||'Venue')+'</strong><span>Open WhatsApp ↗</span></a>';
   }).join('');
   panel.innerHTML='<div class="smv-wa-head"><div><b>Assignments saved ✓</b><span>Tap a venue to open WhatsApp with the lead message ready.</span></div><button type="button" aria-label="Close">×</button></div><div class="smv-wa-list">'+rows+'</div>';
   panel.hidden=false;
   panel.querySelector('.smv-wa-head button').onclick=()=>panel.hidden=true;
   panel.querySelectorAll('.smv-wa-link').forEach(link=>link.addEventListener('click',()=>{
     link.classList.add('smv-wa-opened');
     const label=link.querySelector('span');if(label)label.textContent='Opened ✓';
   }));
 }
 function rearmWhatsAppAssignment(){
   try{window.resetVenueAssignmentSaveState?.();}catch(_){}
   const b=document.getElementById('smvAssignWhatsApp');
   if(b){
     b.disabled=false;
     b.removeAttribute('aria-busy');
     b.textContent='Assign + WhatsApp';
     b.style.pointerEvents='';
   }
 }

 async function handleAssignWhatsAppClick(b){
   if(!b||b.dataset.smvBusy==='1')return;

   /* Always start from the current modal/lead state. This prevents stale selection
      or disabled state from a previous Assign + WhatsApp operation. */
   try{window.resetVenueAssignmentSaveState?.();}catch(_){}
   resetSelectionForLead();

   const l=currentAssignmentLead();
   const checked=[...document.querySelectorAll('#venueAssignmentList .venue-assignment-checkbox:checked:not(:disabled)')]
     .map(x=>String(x.value));
   const ids=[...new Set([...selectedNow].map(String).concat(checked))];

   if(!l||!ids.length){
     alert('Select at least one venue first.');
     rearmWhatsAppAssignment();
     return;
   }

   const targets=ids.map(id=>venueRowById(id)).filter(Boolean);
   if(targets.length!==ids.length){
     alert('One or more selected venues could not be loaded. Please reopen the assignment window and try again.');
     rearmWhatsAppAssignment();
     return;
   }

   const missing=targets.filter(v=>!smvPhone(v));
   if(missing.length){
     alert('WhatsApp/contact number is missing for: '+missing.map(v=>clean(v.venue_name)||'Venue').join(', '));
     rearmWhatsAppAssignment();
     return;
   }

   const messageText=document.getElementById('venueAssignmentNote')?.value||message(l);

   /* Reserve a tab during the actual user click so popup blocking cannot break
      the post-save WhatsApp handoff. */
   let waWindow=null;
   try{
     waWindow=window.open('about:blank','_blank');
     if(waWindow){
       try{
         waWindow.document.title='Opening WhatsApp…';
         waWindow.document.body.innerHTML='<div style="font-family:system-ui;padding:24px;color:#17463d">Saving assignment… WhatsApp will open here.</div>';
       }catch(_){}
     }
   }catch(_){waWindow=null;}

   b.dataset.smvBusy='1';
   b.disabled=true;
   b.setAttribute('aria-busy','true');
   b.textContent='Assigning…';

   try{
     const result=await saveVenueAssignments({source:'whatsapp',keepOpen:true});

     if(!result?.ok){
       if(waWindow&&!waWindow.closed)waWindow.close();
       return;
     }

     const created=new Set((result.created||[]).map(String));
     const shareTargets=targets.filter(v=>created.has(String(v.id)));

     if(!shareTargets.length){
       if(waWindow&&!waWindow.closed)waWindow.close();
       alert('No new venue assignment was created, so WhatsApp was not opened.');
       return;
     }

     const firstUrl=smvWhatsAppUrl(shareTargets[0],messageText);
     if(firstUrl){
       if(waWindow&&!waWindow.closed){
         try{waWindow.location.replace(firstUrl);}
         catch(_){waWindow.location.href=firstUrl;}
       }else{
         window.location.href=firstUrl;
         return;
       }
     }

     if(shareTargets.length>1){
       showWhatsAppQueue(shareTargets.slice(1),messageText);
     }else{
       const oldPanel=document.getElementById('smvWhatsAppQueue');
       if(oldPanel)oldPanel.hidden=true;
     }

     /* Prepare the still-open assignment modal for another operation immediately,
        without a page refresh. */
     selectedNow.clear();
     smvPreparedKey='';
     selectionLeadId=String(currentAssignmentLead()?.id||'');
     try{window.resetVenueAssignmentSaveState?.();}catch(_){}
     try{renderAssignmentVenues();}catch(_){}
     try{renderAssignmentSummary();}catch(_){}
   }
   catch(e){
     if(waWindow&&!waWindow.closed)waWindow.close();
     console.error('Assign + WhatsApp failed',e);
     alert(e?.message||'Assignment was not completed, so WhatsApp was not opened.');
   }
   finally{
     delete b.dataset.smvBusy;
     rearmWhatsAppAssignment();
   }
 }

 function installWhatsAppAssignment(forceFresh=false){
   const actions=document.querySelector('#venueAssignmentModal .venue-assignment-actions');
   if(!actions)return null;

   let b=document.getElementById('smvAssignWhatsApp');

   /* Recreate the button when a new assignment session opens. This guarantees
      a fresh event handler and removes stale disabled/busy DOM state. */
   if(forceFresh&&b){
     b.remove();
     b=null;
   }

   if(!b){
     b=document.createElement('button');
     b.id='smvAssignWhatsApp';
     b.type='button';
     b.className='save-btn smv-whatsapp-assign';
     b.textContent='Assign + WhatsApp';
     actions.appendChild(b);
   }

   if(b.dataset.smvBound!=='1'){
     b.dataset.smvBound='1';
     b.addEventListener('click',event=>{
       event.preventDefault();
       event.stopPropagation();
       handleAssignWhatsAppClick(event.currentTarget);
     });
   }

   rearmWhatsAppAssignment();
   return b;
 }
 function installAssignmentCloseReset(){const modal=document.getElementById('venueAssignmentModal');if(!modal||modal.dataset.smvResetInstalled==='1')return;modal.dataset.smvResetInstalled='1';const close=()=>setTimeout(()=>{if(modal.hidden)resetAssignmentUiState();},0);document.getElementById('closeVenueAssignmentModal')?.addEventListener('click',close);document.getElementById('cancelVenueAssignment')?.addEventListener('click',close);modal.addEventListener('click',e=>{if(e.target===modal)close();});}
 function smvFreshAssignmentLead(){const l=currentAssignmentLead();if(!l)return l;try{const latest=leads().find(x=>String(x.id)===String(l.id));if(latest&&latest!==l)Object.assign(l,latest);else if(latest)Object.assign(l,latest);}catch(_){}return l;}
 function installAssignmentRenderer(){try{renderAssignmentVenues=function(){smvFreshAssignmentLead();setTimeout(()=>smvRefreshAssignmentGeo(),0);const list=document.getElementById('venueAssignmentList'),c=document.getElementById('assignmentVenueCount');if(!list||!assignmentCurrentLead)return;resetSelectionForLead();const already=assignedVenueSet();smvPrepareAssignment();fillMessage();let controls=document.getElementById('smvMatchTierControls');if(!controls){controls=document.createElement('div');controls.id='smvMatchTierControls';controls.className='smv-match-tier-controls';controls.innerHTML='<div class="smv-match-panel-title"><div><b>Smart Venue Matches</b><span>Scores cover recorded requirements only. Confirm date availability and final quote before booking.</span></div><strong id="smvReliableMatchCount">0 reliable</strong></div><div class="smv-match-panel-tabs"><button type="button" data-tier="strong" class="active">★ Best Matches</button><button type="button" data-tier="possible">Possible 55%+</button><button type="button" data-tier="all">All Venues</button><button type="button" data-tier="assigned">Assigned</button><button type="button" data-tier="excluded">Excluded</button></div>';list.parentElement?.insertBefore(controls,list);controls.onclick=e=>{const b=e.target.closest('[data-tier]');if(!b)return;controls.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));controls.dataset.tier=b.dataset.tier;renderAssignmentVenues();};}const hasStrong=(assignmentVenueRows||[]).some(v=>smvMatchTier(smartMatch(v,assignmentCurrentLead))==='strong');
let tier=controls.dataset.tier||'strong';
// Never leave the user on an empty Best Matches view. If no strong venue exists,
// automatically surface the best possible alternatives for review.
if(tier==='strong'&&!hasStrong){
  tier='possible';
  controls.dataset.tier='possible';
  controls.querySelectorAll('[data-tier]').forEach(button=>button.classList.toggle('active',button.dataset.tier==='possible'));
}
let venues=(assignmentVenueRows||[]).filter(v=>{if(!assignmentSearch)return true;const searchable=norm([v.venue_name,v.contact_person,v.city,v.area,v.address,v.venue_type,v.food_options,v.facilities,v.description,v.capacity_min,v.capacity_max,v.price_min_per_person,v.price_max_per_person,v.parking_available===true?'parking':'',v.indoor_available===true?'indoor hall':'',v.outdoor_available===true?'outdoor lawn':'',v.food_veg===true?'veg vegetarian':'',v.food_non_veg===true?'non veg nonvegetarian':'',Number(v.room_count)>0?'room rooms '+Number(v.room_count):''].filter(Boolean).join(' '));const words=norm(assignmentSearch).split(/\s+/).filter(Boolean);return words.every(word=>(word==='room'||word==='rooms')?Number(v.room_count)>0:searchable.includes(word));}).filter(v=>{const isAssigned=already.has(String(v.id));if(tier==='assigned')return isAssigned;if(isAssigned)return true;const m=smartMatch(v,assignmentCurrentLead);if(tier==='strong')return smvMatchTier(m)==='strong'||(!hasStrong&&smvMatchTier(m)==='possible');if(tier==='possible')return ['strong','possible'].includes(smvMatchTier(m));if(tier==='excluded')return m.hardFail;return true;});venues.sort((a,b)=>smvCompareMatches({v:a,m:smartMatch(a,assignmentCurrentLead)},{v:b,m:smartMatch(b,assignmentCurrentLead)}));const reliableCount=(assignmentVenueRows||[]).filter(v=>{const m=smartMatch(v,assignmentCurrentLead);return smvMatchTier(m)==='strong';}).length;const reliableEl=document.getElementById('smvReliableMatchCount');if(reliableEl)reliableEl.textContent=reliableCount+' reliable';if(c){const assignedShown=venues.filter(v=>already.has(String(v.id))).length;c.textContent=`${venues.length} shown${assignedShown?' · '+assignedShown+' already assigned':''}`;}if(!venues.length){
  // Assigned is an intentional filtered view. Never replace it with All Venues.
  if(tier==='assigned'){
    list.innerHTML='<div class="venue-assignment-empty">No venues are currently assigned to this customer enquiry.</div>';
    renderAssignmentSummary();
    return;
  }
  // If even the "possible" tier is empty, show every non-assigned venue rather than a blank board.
  if(!assignmentSearch&&tier!=='all'){
    controls.dataset.tier='all';
    controls.querySelectorAll('[data-tier]').forEach(button=>button.classList.toggle('active',button.dataset.tier==='all'));
    venues=(assignmentVenueRows||[]).filter(v=>!already.has(String(v.id)));
    venues.sort((a,b)=>smvCompareMatches({v:a,m:smartMatch(a,assignmentCurrentLead)},{v:b,m:smartMatch(b,assignmentCurrentLead)}));
  }
}
if(!venues.length){list.innerHTML='<div class="venue-assignment-empty">No approved and verified venues are available.</div>';renderAssignmentSummary();return;}list.innerHTML=venues.map(v=>{const id=String(v.id),assigned=already.has(id)||isVenueAlreadyAssigned(v.id),checked=assigned||selectedNow.has(id),match=smartMatch(v,assignmentCurrentLead),rec=recommendation(v,assignmentCurrentLead),tierLabel=(match.specificArea&&!match.areaMatch&&!match.hardFail?'Location Alternative':({requirements:'Need requirements',excluded:'Excluded',incomplete:'Venue data incomplete',strong:'Strong Match',possible:'Possible Match',low:'Low Match'})[smvMatchTier(match)]),matchChips=match.reasons.slice(0,4).map(x=>'<span class="smv-match-chip smv-match-ok">✓ '+escapeHTML(x)+'</span>').join('')+match.warnings.slice(0,2).map(x=>'<span class="smv-match-chip smv-match-warn">'+escapeHTML(x)+'</span>').join(''),cap=v.capacity_min||v.capacity_max?`${clean(v.capacity_min)||'—'}–${clean(v.capacity_max)||'—'}`:'Capacity not set',price=v.price_min_per_person||v.price_max_per_person?`₹${clean(v.price_min_per_person)||'—'}–₹${clean(v.price_max_per_person)||'—'}/person`:'Price not set',rooms=v.room_count!==null&&v.room_count!==undefined&&String(v.room_count)!==''?`${clean(v.room_count)} room${Number(v.room_count)===1?'':'s'}`:'Rooms not set',location=[v.area,v.city].filter(Boolean).join(' • ')||'Location not set',distanceLabel=match.distanceKm!==null?'≈'+match.distanceKm.toFixed(1)+' km away':'';return `<label class="venue-assignment-item ${assigned?'smv-already-assigned-row':smvMatchTier(match)==='strong'?'smv-premium-match-row':''}"><input type="checkbox" class="venue-assignment-checkbox" value="${escapeHTML(v.id)}" ${checked?'checked':''} ${assigned?'disabled':''}><div class="venue-assignment-item-main"><div class="venue-assignment-item-title"><strong>${escapeHTML(v.venue_name||'Unnamed Venue')}</strong>${assigned?'<span class="smv-assigned-badge">Already Assigned</span>':match.hardFail?'<span class="smv-match-low">Excluded · must-have failed</span>':match.insufficient?'<span class="smv-match-low">Need more requirements</span>':'<span class="'+(smvMatchTier(match)==='strong'?'venue-assignment-recommended':'smv-match-score')+'">'+match.score+'% · '+tierLabel+' · data '+match.dataConfidence+'%</span>'}</div><div class="venue-assignment-item-meta"><span>📍 ${escapeHTML(location)}</span>${distanceLabel?'<span>🧭 '+escapeHTML(distanceLabel)+'</span>':''}<span>👥 ${escapeHTML(cap)}</span>${price!=='Price not set'?'<span>'+escapeHTML(price)+'</span>':''}${rooms!=='Rooms not set'&&Number(v.room_count)>0?'<span>🛏️ '+escapeHTML(rooms)+'</span>':''}<span>${escapeHTML(v.venue_type||'Venue')}</span></div><div class="smv-match-reasons">${matchChips}</div><div class="smv-readiness">${smvReadiness(v,assignmentCurrentLead).map(x=>'<span>'+escapeHTML(x)+'</span>').join('')}</div></div><span class="venue-assignment-item-status">Verified</span></label>`;}).join('');renderAssignmentSummary();};}catch(e){console.warn('Assignment renderer could not be installed',e);}}
 async function openVenueHistory(venue){let modal=document.getElementById('smvVenueHistoryModal');if(!modal){modal=document.createElement('div');modal.id='smvVenueHistoryModal';modal.className='modal-overlay';modal.innerHTML=`<div class="smv-history-card"><div class="smv-history-head"><div><div class="venue-kicker">VENUE ASSIGNMENT HISTORY</div><h2 id="smvHistoryTitle">Venue</h2><p>Track every enquiry assigned to this venue.</p></div><button type="button" id="smvHistoryClose" class="close-modal">×</button></div><div class="smv-history-filters"><select id="smvHistoryRange"><option value="all">All time</option><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="year">This year</option><option value="custom">Custom dates</option></select><input type="date" id="smvHistoryFrom" hidden><input type="date" id="smvHistoryTo" hidden><button type="button" id="smvHistoryApply" class="secondary-btn">Apply</button><strong id="smvHistoryCount">0 assigned</strong></div><div id="smvHistoryBody" class="smv-history-body">Loading…</div></div>`;document.body.appendChild(modal);modal.querySelector('#smvHistoryClose').onclick=()=>{modal.hidden=true;document.body.style.overflow='';};modal.querySelector('#smvHistoryRange').onchange=e=>{const custom=e.target.value==='custom';modal.querySelector('#smvHistoryFrom').hidden=!custom;modal.querySelector('#smvHistoryTo').hidden=!custom;};modal.querySelector('#smvHistoryApply').onclick=()=>loadVenueHistory(modal.dataset.venueId);}
 modal.dataset.venueId=String(venue.id);modal.querySelector('#smvHistoryTitle').textContent=venue.venue_name||'Venue';modal.hidden=false;document.body.style.overflow='hidden';await loadVenueHistory(venue.id);}
 function smvHistoryRange(mode,fromText='',toText='',now=new Date()){
   const offset=330*60000,local=new Date(now.getTime()+offset),y=local.getUTCFullYear(),m=local.getUTCMonth(),d=local.getUTCDate();
   const at=(year,month,day)=>new Date(Date.UTC(year,month,day)-offset);
   const day=at(y,m,d),week=at(y,m,d-(local.getUTCDay()+6)%7),month=at(y,m,1);
   let from=null,to=null;
   if(mode==='today'){from=day;to=at(y,m,d+1)}
   if(mode==='week'){from=week;to=new Date(week.getTime()+7*86400000)}
   if(mode==='month'){from=month;to=at(y,m+1,1)}
   if(mode==='year'){from=at(y,0,1);to=at(y+1,0,1)}
   if(mode==='custom'){if(fromText)from=new Date(fromText+'T00:00:00+05:30');if(toText)to=new Date(new Date(toText+'T00:00:00+05:30').getTime()+86400000)}
   return {from,to,day,week,month};
 }
 async function loadVenueHistory(venueId){const db=typeof getSupabaseClient==='function'?getSupabaseClient():null,modal=document.getElementById('smvVenueHistoryModal'),body=modal?.querySelector('#smvHistoryBody');if(!db||!modal||!body)return;body.textContent='Loading assigned enquiries…';let q=db.from('venue_enquiry_assignments').select('*').eq('venue_id',venueId).neq('assignment_status','cancelled').order('assigned_at',{ascending:false});const mode=modal.querySelector('#smvHistoryRange').value,now=new Date();const bounds=smvHistoryRange(mode,modal.querySelector('#smvHistoryFrom').value,modal.querySelector('#smvHistoryTo').value,now);if(bounds.from)q=q.gte('assigned_at',bounds.from.toISOString());if(bounds.to)q=q.lt('assigned_at',bounds.to.toISOString());const {data:a,error}=await q;if(error){body.textContent='Unable to load assignment history: '+error.message;return;}const rows=a||[];modal.querySelector('#smvHistoryCount').textContent=`${rows.length} assigned`;let summary=modal.querySelector('#smvHistorySummary');if(!summary){summary=document.createElement('div');summary.id='smvHistorySummary';summary.className='smv-history-summary';modal.querySelector('.smv-history-filters')?.insertAdjacentElement('afterend',summary);}try{const {data:allRows}=await db.from('venue_enquiry_assignments').select('assigned_at,assignment_status').eq('venue_id',venueId).neq('assignment_status','cancelled');const all=allRows||[],startDay=bounds.day,startWeek=bounds.week,startMonth=bounds.month,countSince=d=>all.filter(x=>new Date(x.assigned_at)>=d).length;summary.innerHTML='<div><span>Total Assigned</span><b>'+all.length+'</b></div><div><span>This Month</span><b>'+countSince(startMonth)+'</b></div><div><span>This Week</span><b>'+countSince(startWeek)+'</b></div><div><span>Today</span><b>'+countSince(startDay)+'</b></div>';}catch(_){summary.innerHTML='';}if(!rows.length){body.innerHTML='<div class="venue-assignment-empty">No assigned enquiries in this time period.</div>';return;}const ids=[...new Set(rows.map(x=>x.enquiry_id).filter(Boolean))];const {data:ls,error:le}=await db.from('customer_enquiries').select('*').in('id',ids);if(le){body.textContent='Assignments found, but customer details could not be loaded: '+le.message;return;}const map=new Map((ls||[]).map(l=>[String(l.id),l]));body.innerHTML=`<div class="smv-history-table-wrap"><table class="smv-history-table"><thead><tr><th>Assigned</th><th>Customer</th><th>Contact</th><th>Event</th><th>Event Date</th><th>Guests</th><th>Location</th><th>Status</th><th>Requirements / Notes</th></tr></thead><tbody>${rows.map(a=>{const l=map.get(String(a.enquiry_id))||{};return `<tr><td>${escapeHTML(fmtDate(a.assigned_at||a.created_at))}</td><td><strong>${escapeHTML(l.customer_name||'—')}</strong></td><td>${escapeHTML(l.mobile||'—')}<br><small>${escapeHTML(l.email||'')}</small></td><td>${escapeHTML(l.occasion||'—')}</td><td>${escapeHTML(fmtDate(l.event_date))}</td><td>${escapeHTML(l.guests||'—')}</td><td>${escapeHTML(l.location||'—')}</td><td>${escapeHTML(a.assignment_status||l.status||'assigned')}</td><td>${escapeHTML([l.requirements,l.internal_notes,l.contact_remark].filter(Boolean).join(' | ')||'—')}</td></tr>`;}).join('')}</tbody></table></div>`;}
 function venueById(id){try{return (Array.isArray(allVenues)?allVenues:[]).find(v=>String(v.id)===String(id));}catch(_){return null;}}
 function installUnassignClicks(){document.addEventListener('click',e=>{const b=e.target.closest?.('.smv-unassign-btn');if(!b)return;const chip=b.closest('.smv-venue-chip');const id=chip?.dataset.venueId;if(!id)return;e.preventDefault();e.stopPropagation();unassignVenue(id,b);});}
 function installVenueHistoryClicks(){document.addEventListener('click',e=>{const row=e.target.closest?.('#venueTableBody tr');if(!row)return;const cell=e.target.closest('td:first-child');if(!cell||e.target.closest('button,a,input,select'))return;const edit=row.querySelector('[data-venue-id]');const id=edit?.dataset.venueId;if(!id)return;const v=venueById(id);if(v){e.preventDefault();openVenueHistory(v);}});}
 function styles(){const s=document.createElement('style');s.id='smvOpsPatch';s.textContent=`.crm-main>.stats-grid{display:none!important}#leadWorkViews.lead-work-views{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;gap:6px!important;padding:6px 9px!important;margin:0!important}#leadWorkViews button{min-height:43px!important;padding:5px 8px!important;border:1px solid #d6e9e3!important;border-radius:10px!important;background:#fff!important;color:#355b53!important;display:flex!important;align-items:center!important;justify-content:space-between!important;font-size:10.5px!important;font-weight:750!important}#leadWorkViews button strong{font-size:18px!important;color:#08745d!important}#leadWorkViews button[aria-pressed=true]{background:#eef9f5!important;border-color:#92cdbc!important}.venue-assignment-card{width:min(1180px,96vw)!important;max-width:1180px!important;max-height:94vh!important;overflow-y:auto!important}.venue-assignment-list{min-height:160px!important;max-height:32vh!important;overflow:auto!important}.venue-assignment-note textarea,#venueAssignmentNote{width:100%!important;min-height:135px!important;max-height:190px!important;resize:vertical!important;font-size:12px!important;line-height:1.45!important}.venue-assignment-actions{position:sticky!important;bottom:0!important;background:#fff!important;padding-top:8px!important;z-index:4!important}.smv-assignment-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 10px;padding:0 1px}.smv-assignment-summary-top{position:sticky;top:0;z-index:8;background:#fff;padding-top:8px!important;padding-bottom:5px!important;border-bottom:1px solid #e6f0ed}.smv-assignment-summary>div{border:1px solid #d8ebe5;border-radius:10px;padding:8px;background:#f8fcfb;min-width:0}.smv-summary-title{display:flex;justify-content:space-between;align-items:center;color:#456b63;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px}.smv-summary-title strong{background:#e0f4ed;color:#08745d;border-radius:12px;padding:2px 7px;font-size:11px}.smv-chip-row{display:flex;gap:5px;flex-wrap:wrap;max-height:76px;overflow:auto}.smv-venue-chip{display:inline-flex;align-items:center;gap:3px;border-radius:16px;padding:5px 8px;font-size:10.5px;line-height:1.2}.smv-assigned-chip{background:#e9f7f2;border:1px solid #b9e2d5;color:#175f51}.smv-selected-chip{background:#fff5d9;border:1px solid #ead18a;color:#684f08}.smv-venue-chip small{font-size:9px;opacity:.75}.smv-chip-check{font-size:9px;font-weight:800;color:#08745d;margin-left:3px}.smv-chip-remove{border:0;background:transparent;color:#8b6200;font-size:16px;line-height:12px;padding:0 1px;cursor:pointer}.smv-summary-empty{font-size:10px;color:#8ba09b;font-style:italic}.smv-assigned-badge{font-size:8px;font-weight:800;text-transform:uppercase;background:#e2f4ee;color:#08745d;border-radius:10px;padding:3px 6px}.smv-already-assigned-row{background:#f3faf7!important;opacity:.85}#venueTableBody td:first-child{cursor:pointer!important}#venueTableBody td:first-child strong{text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}.smv-history-card{width:min(1380px,97vw);max-height:94vh;overflow:auto;background:#fff;border-radius:18px;padding:18px;box-shadow:0 25px 80px rgba(0,0,0,.25)}.smv-history-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start}.smv-history-head h2{margin:4px 0;color:#075f4d}.smv-history-head p{margin:0;color:#6d817c}.smv-history-filters{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:15px 0;padding:10px;background:#f5fbf9;border:1px solid #d8ebe5;border-radius:12px}.smv-history-filters select,.smv-history-filters input{height:35px;border:1px solid #cfe3dd;border-radius:9px;padding:0 9px;background:#fff}.smv-history-filters strong{margin-left:auto;color:#08745d;font-size:16px}.smv-history-table-wrap{overflow:auto}.smv-history-table{width:100%;min-width:1150px;border-collapse:collapse}.smv-history-table th{background:#f3faf7;color:#52716a;font-size:9px;text-transform:uppercase;letter-spacing:.05em;text-align:left;padding:8px;border-bottom:1px solid #dcebe7}.smv-history-table td{font-size:11px;color:#254a43;padding:9px 8px;border-bottom:1px solid #edf4f2;vertical-align:top;max-width:260px;white-space:normal;word-break:break-word}@media(max-width:1000px){#leadWorkViews.lead-work-views{grid-template-columns:repeat(4,minmax(0,1fr))!important}.smv-assignment-summary{grid-template-columns:1fr}}`;document.head.appendChild(s);}
 window.smvGetAssignmentSelection=()=>[...selectedNow];
 function boot(){if(installed||!document.getElementById('leadWorkViews')||typeof renderAssignmentVenues!=='function'||typeof openVenueAssignmentModal!=='function')return;installed=true;styles();installAssignmentCloseReset();installAssignmentRenderer();installUnassignClicks();installVenueHistoryClicks();installAutomationControls();installVenueAssistant();installWhatsAppAssignment();renderCards();const m=document.getElementById('venueAssignmentModal');if(m)new MutationObserver(()=>{if(!m.hidden)setTimeout(()=>{resetAssignmentUiState();try{window.resetVenueAssignmentSaveState?.();}catch(_){}installWhatsAppAssignment(true);resetSelectionForLead();fillMessage();try{renderAssignmentVenues();}catch(_){}renderAssignmentSummary();},80);else{resetAssignmentUiState();rearmWhatsAppAssignment();}}).observe(m,{attributes:true,attributeFilter:['hidden']});document.addEventListener('change',e=>{if(e.target.matches?.('#venueAssignmentList .venue-assignment-checkbox')){const id=String(e.target.value);if(!e.target.disabled){if(e.target.checked)selectedNow.add(id);else selectedNow.delete(id);}renderAssignmentSummary();}});document.addEventListener('click',e=>{const remove=e.target.closest?.('.smv-chip-remove');if(remove){const chip=remove.closest('.smv-venue-chip'),id=String(chip?.dataset.venueId||'');selectedNow.delete(id);const cb=[...document.querySelectorAll('#venueAssignmentList .venue-assignment-checkbox')].find(x=>String(x.value)===id);if(cb&&!cb.disabled)cb.checked=false;renderAssignmentSummary();return;}if(e.target.closest?.('.venue-assign-btn,#assignAnotherVenueBtn'))setTimeout(fillMessage,150);});setInterval(()=>{refreshCards();fillMessage();refreshVenueAssistant();},1500);setInterval(refreshPreparationQueue,10000);setTimeout(refreshPreparationQueue,2500);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,700));else setTimeout(boot,700);setTimeout(boot,1800);const bootRetry=setInterval(()=>{boot();if(installed)clearInterval(bootRetry);},500);setTimeout(()=>clearInterval(bootRetry),15000);
 window.addEventListener('focus',()=>{installWhatsAppAssignment(false);rearmWhatsAppAssignment();});
 window.addEventListener('pageshow',()=>{installWhatsAppAssignment(false);rearmWhatsAppAssignment();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){installWhatsAppAssignment(false);rearmWhatsAppAssignment();}});
})();

(function(){const KEY='smvVenueDraftV1';let timer,restoring=false;const modal=()=>document.getElementById('venueModal'),form=()=>document.getElementById('venueForm')||modal()?.querySelector('form');function save(){if(restoring||!modal()||modal().hidden)return;const d={};form()?.querySelectorAll('input:not([type=file]),select,textarea').forEach(e=>{if(!e.id&&!e.name)return;d[e.id||e.name]=(e.type==='checkbox'||e.type==='radio')?e.checked:e.value;});try{localStorage.setItem(KEY,JSON.stringify(d));}catch(_){}}function restore(){let d;try{d=JSON.parse(localStorage.getItem(KEY)||'null');}catch(_){}if(!d||document.getElementById('venueId')?.value)return;restoring=true;Object.entries(d).forEach(([k,v])=>{const e=document.getElementById(k);if(!e)return;if(e.type==='checkbox'||e.type==='radio')e.checked=!!v;else if(!e.value)e.value=v;});restoring=false;}document.addEventListener('input',e=>{if(e.target.closest?.('#venueModal')){clearTimeout(timer);timer=setTimeout(save,350);}},true);document.addEventListener('change',e=>{if(e.target.closest?.('#venueModal'))save();},true);document.addEventListener('click',e=>{const m=modal();if(!m||m.hidden)return;if(e.target===m){e.preventDefault();e.stopImmediatePropagation();}},true);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal()&&!modal().hidden){e.preventDefault();e.stopImmediatePropagation();}},true);const watch=()=>{const m=modal();if(m)new MutationObserver(()=>{if(!m.hidden)setTimeout(restore,50);}).observe(m,{attributes:true,attributeFilter:['hidden']});};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',watch):watch();window.addEventListener('beforeunload',save);
})();
