/* SMV AI Venue Discovery — live staff-side matching */
(function(){
"use strict";
const $=s=>document.querySelector(s), esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=v=>String(v||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const dist=(a,b,c,d)=>{const r=n=>n*Math.PI/180,h=Math.sin(r(c-a)/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2;return 12742*Math.asin(Math.sqrt(h));};
let aliases=[],loaded=false,timer,realtimeChannel=null,realtimeRefreshTimer=null,speechRecognition=null,availabilityByVenue=new Map(),availabilityChannel=null,feedbackByVenue=new Map(),outcomeByVenue=new Map();
function extractEventDate(text){
 const s=String(text||"");
 let m=s.match(/\\b(20\\d{2})-(0[1-9]|1[0-2])-([0-2]\\d|3[01])\\b/);
 if(m){const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));if(d.getFullYear()===+m[1]&&d.getMonth()===+m[2]-1&&d.getDate()===+m[3])return m[0];}
 m=s.match(/\\b([0-3]?\\d)[/.-]([01]?\\d)[/.-](20\\d{2})\\b/);
 if(m){const d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));if(d.getFullYear()===+m[3]&&d.getMonth()===+m[2]-1&&d.getDate()===+m[1])return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
 const month=s.match(/\\b([0-3]?\\d)\\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\s+(20\\d{2})\\b/i);
 if(month){const d=new Date(Date.parse(month[1]+" "+month[2]+" "+month[3]));if(!Number.isNaN(d.getTime())&&d.getFullYear()===+month[3]&&d.getDate()===+month[1])return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
 return null;
}
function parse(s){const n=s.toLowerCase(),g=(s.match(/(\d{2,5})\s*(?:guests?|pax|people|persons?)/i)||[])[1],rm=(s.match(/(\d+)\s*rooms?/i)||[])[1];let money=(s.match(/(?:budget[^₹\d]{0,24})?(?:₹|rs\.?\s*)([\d,.]+)\s*(lakh|lac|l|k)?/i)||s.match(/budget[^\d]{0,24}([\d,.]+)\s*(lakh|lac|l|k)?/i)||s.match(/([\d,.]+)\s*(lakh|lac|l|k)\s*(?:total\s*)?budget/i)||[]),budget=null;if(money[1]){budget=Number(money[1].replace(/,/g,""));if(money[2]&&/^l/i.test(money[2]))budget*=100000;else if(money[2]&&/^k$/i.test(money[2]))budget*=1000;}
return {guests:g?+g:null,rooms:rm?+rm:null,budget,eventDate:extractEventDate(s),venueType:/hotel/i.test(n)?"hotel":/restaurant/i.test(n)?"restaurant":/banquet/i.test(n)?"banquet":null,outdoor:/lawn|outdoor|open area/i.test(n),indoor:/indoor|covered/i.test(n),parking:/parking required|parking needed|with parking/i.test(n),veg:(/(?:^|[^a-z])veg(?:etarian)?(?:$|[^a-z])/i.test(n)&&!/(?:^|[^a-z])non[ -]*veg(?:etarian)?(?:$|[^a-z])/i.test(n)),nonVeg:/non[ -]?veg/i.test(n),event:/wedding|shaadi|marriage/i.test(n)?"wedding":/birthday/i.test(n)?"birthday":/engagement|sagai/i.test(n)?"engagement":/corporate/i.test(n)?"corporate":null};}
function locations(){const q=($("#smvAiLocations")?.value||"").split(/,/).map(x=>norm(x)).filter(Boolean);return q.map(x=>aliases.find(a=>{const key=norm(a.alias_key),canonical=norm(a.canonical_label),area=norm(key.split("|").slice(1).join(" "));return key.endsWith("|"+x)||(canonical&&(" "+x+" ").includes(" "+canonical+" "))||(area&&(" "+x+" ").includes(" "+area+" "));})||{alias_key:"manual|"+x,canonical_label:x,latitude:null,longitude:null});}
function phraseMatch(haystack,needle){const h=" "+norm(haystack)+" ",n=" "+norm(needle)+" ";return !!needle&&h.includes(n);}
function locationEvidence(v,loc,radius){
 const ds=[];if(v.latitude!==null&&v.longitude!==null&&Number.isFinite(Number(v.latitude))&&Number.isFinite(Number(v.longitude)))loc.forEach(a=>{if(a.latitude!==null&&a.longitude!==null&&Number.isFinite(Number(a.latitude))&&Number.isFinite(Number(a.longitude)))ds.push(dist(+a.latitude,+a.longitude,+v.latitude,+v.longitude));});
 const d=ds.length?Math.min(...ds):null;
 const exact=loc.some(a=>{const p=String(a.alias_key||"").split("|"),area=norm(p.slice(1).join(" "));return area&&phraseMatch([v.area,v.address].filter(Boolean).join(" "),area);});
 const cityMatch=loc.some(a=>{const p=String(a.alias_key||"").split("|"),city=norm(p[0]),hasArea=!!norm(p.slice(1).join(" "));return !hasArea&&city&&phraseMatch(v.city,city);});
 const near=d!==null&&d<=radius,withinRadius=d!==null?near:exact;
 return {exact,cityMatch,near,d,withinRadius,outsideRadius:d!==null&&d>radius};
}
function score(v,c,loc,radius){
 let points=0,total=0,evidence=0,reasons=[];
 const geo=locationEvidence(v,loc,radius),{exact,cityMatch,near,d}=geo; function add(ok,w,yes,no,known){total+=w;if(known)evidence+=w;if(ok)points+=w;reasons.push(ok?yes:no);}
 if(loc.length)add(exact||near||cityMatch,25,exact?"Exact locality match":near?"Within "+radius+" km":cityMatch?"City-level match — locality not verified":"Location outside radius",d===null&&!exact&&!cityMatch?"Distance unavailable — verify locality":"Outside requested radius or locality not matched",exact||cityMatch||d!==null);
 if(c.guests){let cap=Number(v.capacity_max)||0;add(cap>=c.guests&&cap>0,20,"Capacity fits",cap?"Capacity below requirement":"Capacity not listed",cap>0);}
 if(c.budget&&c.guests){let p=Number(v.price_max_per_person)||0,estimatedTotal=p>0?p*c.guests:null;add(estimatedTotal!==null&&estimatedTotal<=c.budget,20,"Indicative total fits budget","Indicative total may exceed budget / price not listed",p>0);}
 if(c.venueType)add(norm(v.venue_type).includes(norm(c.venueType)),10,"Venue type fits","Venue type differs / not listed",!!v.venue_type);
 if(c.rooms){let n=Number(v.room_count)||0;add(n>=c.rooms,5,"Room count fits",n?"Room count below requirement":"Room count not listed",n>0);}
 if(c.outdoor){const f=v.area_features&&typeof v.area_features==="object"?v.area_features:{}, lawn=f.lawn&&typeof f.lawn==="object"?f.lawn.available:f.lawn, open=f.open_area&&typeof f.open_area==="object"?f.open_area.available:f.open_area;const known=typeof v.outdoor_available==="boolean"||typeof lawn==="boolean"||typeof open==="boolean",ok=v.outdoor_available===true||lawn===true||open===true;add(ok,10,"Outdoor / lawn listed","Outdoor feature not confirmed",known);}
 if(c.indoor){let known=typeof v.indoor_available==="boolean";add(v.indoor_available===true,5,"Indoor space listed","Indoor space not confirmed",known);}
 if(c.parking){let known=typeof v.parking_available==="boolean"||v.parking_capacity!=null;add(v.parking_available===true||Number(v.parking_capacity)>0,5,"Parking listed","Parking not confirmed",known);}
 if(c.veg){let known=typeof v.food_veg==="boolean";add(v.food_veg===true,4,"Vegetarian catering listed","Vegetarian catering not confirmed",known);}
 if(c.nonVeg){let known=typeof v.food_non_veg==="boolean";add(v.food_non_veg===true,4,"Non-vegetarian catering listed","Non-vegetarian catering not confirmed",known);}
 if(c.eventDate)reasons.push("Event-date availability requires venue partner confirmation");
 if(c.event){let known=!!((v.event_types||[]).length||v.description||v.matching_notes),ok=(v.event_types||[]).some(x=>norm(x).includes(norm(c.event)))||norm((v.description||"")+" "+(v.matching_notes||"")).includes(norm(c.event));add(ok,5,"Event suitability listed","Event suitability to confirm",known);}
 const capacityKnown=Number(v.capacity_max)>0,capacityFit=capacityKnown&&Number(v.capacity_max)>=Number(c.guests||0),availabilityStatus=c.eventDate?"confirmation_required":"date_not_provided";
 return {score:total?Math.round(points/total*100):0,confidence:total?Math.round(evidence/total*100):0,exact,cityMatch,near,d,withinRadius:geo.withinRadius,outsideRadius:geo.outsideRadius,reasons,capacityKnown,capacityFit,availabilityStatus,missing:reasons.filter(x=>/not listed|not confirmed|unavailable|verify area|confirmation required/i.test(x))};
}
const compareIds=new Set();
async function loadAvailabilityResponsesForLead(client,lead){
 availabilityByVenue=new Map();
 if(!client||!lead?.id||!lead?.event_date)return;
 try{
  const assignments=await client.from("venue_enquiry_assignments").select("id,venue_id").eq("enquiry_id",lead.id);
  if(assignments.error||!Array.isArray(assignments.data)||!assignments.data.length)return;
  const ids=assignments.data.map(x=>x.id).filter(Boolean),eventDate=String($("#smvAiEventDate")?.value||lead.event_date).slice(0,10);
  if(!ids.length)return;
  const responses=await client.from("venue_partner_availability_responses").select("assignment_id,venue_id,event_date,availability_status,quoted_price,partner_note,confirmed_at").in("assignment_id",ids).eq("event_date",eventDate).order("confirmed_at",{ascending:false});
  if(responses.error){console.info("Partner availability is not connected yet; recommendations remain unconfirmed.");return;}
  for(const row of responses.data||[])if(row.venue_id&&!availabilityByVenue.has(String(row.venue_id)))availabilityByVenue.set(String(row.venue_id),row);
 }catch(error){console.info("Partner availability lookup deferred:",error);}
}
async function loadVenueFeedbackSignals(client){
 feedbackByVenue=new Map();
 if(!client)return;
 try{
  const result=await client.from("venue_match_feedback").select("venue_id,action").limit(5000);
  if(result.error){console.info("Feedback calibration table is not enabled yet.");return;}
  for(const row of result.data||[]){const id=String(row.venue_id),item=feedbackByVenue.get(id)||{positive:0,negative:0};if(row.action==="positive_fit")item.positive++;if(row.action==="negative_fit")item.negative++;feedbackByVenue.set(id,item);}
 }catch(error){console.info("Feedback calibration unavailable:",error);}
}
async function loadVenueOutcomeSignals(client){
 outcomeByVenue=new Map();if(!client)return;
 try{
  const result=await client.from("venue_enquiry_assignments").select("venue_id,assignment_status,converted_at").limit(5000);
  if(result.error)return;
  for(const row of result.data||[]){const id=String(row.venue_id),item=outcomeByVenue.get(id)||{booked:0,lost:0};const status=String(row.assignment_status||"").toLowerCase();if(status==="booked"||row.converted_at)item.booked++;else if(status==="lost"||status==="cancelled")item.lost++;outcomeByVenue.set(id,item);}
 }catch(error){console.info("Historical outcome calibration unavailable:",error);}
}
function outcomeLift(venueId){
 const item=outcomeByVenue.get(String(venueId));if(!item)return 0;
 const n=item.booked+item.lost;if(n<5)return 0;
 return Math.max(-3,Math.min(3,Math.round(((item.booked/n)-.5)*6)));
}
function feedbackLift(venueId){
 const item=feedbackByVenue.get(String(venueId));if(!item)return 0;
 const n=item.positive+item.negative;if(n<3)return 0;
 return Math.max(-5,Math.min(5,Math.round(((item.positive/n)-.5)*10)+outcomeLift(venueId)));
}
async function recordVenueFeedback(venueId,action,matchScore,confidence){
 const client=typeof getSupabaseClient==="function"?getSupabaseClient():null;
 const lead=typeof assignmentCurrentLead!=="undefined"?assignmentCurrentLead:null;
 if(!client||!lead?.id){alert("Open a customer enquiry before recording match feedback.");return;}
 const auth=await client.auth.getUser(),user=auth?.data?.user;
 if(auth?.error||!user?.id){alert("Please sign in again to record matching feedback.");return;}
 const payload={enquiry_id:lead.id,venue_id:venueId,user_id:user.id,action,match_score:matchScore,data_confidence:confidence,requirement_snapshot:{event_date:$("#smvAiEventDate")?.value||lead.event_date||null,guests:+($("#smvAiGuests")?.value||0)||null,budget_total:+($("#smvAiBudget")?.value||0)||null,areas:$("#smvAiLocations")?.value||""}};
 const result=await client.from("venue_match_feedback").insert(payload);
 if(result.error){console.warn("Venue feedback could not be saved:",result.error);alert("Feedback storage will be available after the approved database migration.");return;}
 const item=feedbackByVenue.get(String(venueId))||{positive:0,negative:0};if(action==="positive_fit")item.positive++;else item.negative++;feedbackByVenue.set(String(venueId),item);render();
}
function subscribeAvailabilityResponses(client){
 if(!client||availabilityChannel)return;
 try{availabilityChannel=client.channel("smv-ai-partner-availability").on("postgres_changes",{event:"*",schema:"public",table:"venue_partner_availability_responses"},async()=>{
  const lead=typeof assignmentCurrentLead!=="undefined"?assignmentCurrentLead:null;
  await loadAvailabilityResponsesForLead(client,lead);render();
 }).subscribe();}catch(error){console.warn("Availability live updates unavailable:",error);}
}
function render(){
 const c=parse($("#smvAiRequirement")?.value||""),loc=locations(),radius=+($("#smvAiRadius")?.value||15),t=$("#smvAiType")?.value;
 if(t)c.venueType=t;c.guests=+($("#smvAiGuests")?.value||c.guests||0)||null;c.budget=+($("#smvAiBudget")?.value||c.budget||0)||null;
 c.eventDate=$("#smvAiEventDate")?.value||c.eventDate||extractEventDate($("#smvAiRequirement")?.value||"")||null;c.rooms=+($("#smvAiRooms")?.value||c.rooms||0)||null;c.parking=$("#smvAiParking")?.checked===true||c.parking;c.veg=$("#smvAiVeg")?.checked===true||c.veg;c.nonVeg=$("#smvAiNonVeg")?.checked===true||c.nonVeg;
 const strict=$("#smvAiStrictCapacity")?.checked===true;
 const rows=(typeof assignmentVenueRows!=="undefined"?assignmentVenueRows:[]).filter(v=>v.venue_status==="approved"&&v.verification_status==="verified").map(v=>({v,m:score(v,c,loc,radius),availability:availabilityByVenue.get(String(v.id))||null})).filter(x=>(!loc.length||x.m.withinRadius)&&(!strict||!c.guests||x.m.capacityFit)&&x.availability?.availability_status!=="unavailable").sort((a,b)=>{const rank=x=>x.availability?.availability_status==="available"?0:1;return rank(a)-rank(b)||b.m.score-a.m.score||b.m.confidence-a.m.confidence||(a.m.d??999)-(b.m.d??999);});
 function card(x){const v=x.v,m=x.m,assigned=typeof isVenueAlreadyAssigned==="function"&&isVenueAlreadyAssigned(v.id),availability=availabilityByVenue.get(String(v.id)),availabilityLabel=availability?.availability_status==="available"?"Partner confirmed available":availability?.availability_status==="unavailable"?"Partner confirmed unavailable":availability?.availability_status==="needs_info"?"Partner needs details":"Date not yet confirmed",cap=v.capacity_max?(v.capacity_min||"—")+"–"+v.capacity_max+" guests":"Capacity not listed",price=v.price_min_per_person?"₹"+v.price_min_per_person+"–"+(v.price_max_per_person||"—")+"/person":"Price not listed",where=m.d!==null?"~"+m.d.toFixed(1)+" km straight-line":m.exact?"Exact locality; distance unverified":"Distance unavailable",label=m.score>=80&&m.confidence>=70?"Strong evidence":m.score>=65?"Possible fit":"Needs verification";
 return '<article class="smv-ai-card"><div class="smv-ai-card-top"><div><strong>'+esc(v.venue_name)+'</strong><small>'+esc([v.venue_type,v.area,v.city].filter(Boolean).join(" · "))+'</small></div><b>'+m.score+'%<small> fit</small></b></div><div class="smv-ai-confidence"><span>'+label+'</span><span>Data confidence '+m.confidence+'%'+(m.feedbackLift?' · Team signal '+(m.feedbackLift>0?"+":"")+m.feedbackLift:'')+'</span></div><div class="smv-ai-meta"><span>👥 '+esc(cap)+'</span><span>'+esc(price)+'</span><span>📍 '+esc(where)+'</span><span>🛏 '+(v.room_count?esc(v.room_count)+" rooms":"Rooms n/a")+'</span><span>📅 '+esc(availabilityLabel)+'</span></div><p>'+esc(m.reasons.slice(0,4).join(" · "))+'</p>'+(m.missing.length?'<small class="smv-ai-missing">Verify: '+esc(m.missing.slice(0,3).join(" · "))+'</small>':'')+'<div class="smv-ai-card-actions"><label><input type="checkbox" data-compare-venue="'+esc(v.id)+'" '+(compareIds.has(String(v.id))?"checked":"")+'> Compare</label><button type="button" data-feedback-venue="'+esc(v.id)+'" data-feedback-action="positive_fit">👍 Good fit</button><button type="button" data-feedback-venue="'+esc(v.id)+'" data-feedback-action="negative_fit">👎 Not suitable</button><button type="button" data-suggest-venue="'+esc(v.id)+'" '+(assigned?"disabled":"")+'>'+(assigned?"Already assigned":"＋ Add to shortlist")+'</button></div></article>';}
 rows.forEach(x=>{x.m.feedbackLift=feedbackLift(x.v.id);x.m.rankedScore=Math.max(0,Math.min(100,x.m.score+x.m.feedbackLift));});rows.sort((a,b)=>b.m.rankedScore-a.m.rankedScore||b.m.confidence-a.m.confidence||(a.m.d??999)-(b.m.d??999));const exact=rows.filter(x=>x.m.exact),near=rows.filter(x=>!x.m.exact);
 const unavailableCount=Array.from(availabilityByVenue.values()).filter(x=>x.availability_status==="unavailable").length;$("#smvAiResultCount").textContent=rows.length+" eligible SMV venues · "+rows.filter(x=>x.m.score>=80&&x.m.confidence>=70).length+" strong-evidence fits"+(unavailableCount?" · "+unavailableCount+" confirmed unavailable excluded":"");
 $("#smvAiExactCount").textContent=exact.length;$("#smvAiNearbyCount").textContent=near.length;
 $("#smvAiExact").innerHTML=exact.length?exact.map(card).join(""):'<p class="smv-ai-empty">No exact-area match in the current SMV venue database.</p>';
 $("#smvAiNearby").innerHTML=near.length?near.map(card).join(""):'<p class="smv-ai-empty">No nearby alternative found in this radius.</p>';
 renderComparison(rows);
}
function renderComparison(rows){
 const box=$("#smvAiCompare"),body=$("#smvAiCompareBody");if(!box||!body)return;
 const selected=rows.filter(x=>compareIds.has(String(x.v.id))).slice(0,3);box.hidden=!selected.length;
 $("#smvAiCompareStatus").textContent=selected.length+" of 3 venues selected";
 const fields=[["Match fit",x=>x.m.score+"%"],["Data confidence",x=>x.m.confidence+"%"],["Area",x=>x.v.area||"Not listed"],["Capacity",x=>x.v.capacity_max||"Not listed"],["Price/person",x=>x.v.price_max_per_person?"₹"+x.v.price_max_per_person:"Not listed"],["Rooms",x=>x.v.room_count||"Not listed"],["Distance",x=>x.m.d!==null?x.m.d.toFixed(1)+" km":"Not available"]];
 body.innerHTML='<div class="smv-ai-compare-grid"><div class="smv-ai-compare-labels">'+fields.map(f=>'<strong>'+esc(f[0])+'</strong>').join("")+'</div>'+selected.map(x=>'<div class="smv-ai-compare-col"><b>'+esc(x.v.venue_name)+'</b>'+fields.map(f=>'<span>'+esc(f[1](x))+'</span>').join("")+'</div>').join("")+'</div>';
}
function populateLeadRequirements(q){
 if(!q)return;
 const requirement=$("#smvAiRequirement"),area=$("#smvAiLocations"),guests=$("#smvAiGuests"),budget=$("#smvAiBudget"),date=$("#smvAiEventDate"),rooms=$("#smvAiRooms"),parking=$("#smvAiParking"),veg=$("#smvAiVeg"),nonVeg=$("#smvAiNonVeg");
 if(requirement&&!requirement.value)requirement.value=[q.occasion,q.guests?q.guests+" guests":"",q.preferred_area,q.location,q.requirements,q.contact_remark].filter(Boolean).join(", ");
 if(area&&!area.value)area.value=[q.preferred_area,q.location].filter(Boolean).join(", ");
 if(guests&&!guests.value)guests.value=q.guests||"";
 if(budget&&!budget.value&&q.budget_per_person&&q.guests)budget.value=Math.round(Number(q.budget_per_person)*Number(q.guests));
 if(date&&!date.value)date.value=String(q.event_date||extractEventDate(requirement?.value||"")||"").slice(0,10);
 if(rooms&&!rooms.value)rooms.value=q.rooms_required||"";
 if(parking&&q.parking_required===true)parking.checked=true;
 const food=norm(q.food_preference||"");
 if(veg&&(/veg|vegetarian/.test(food))&&!/non veg|nonvegetarian/.test(food))veg.checked=true;
 if(nonVeg&&/non veg|nonvegetarian/.test(food))nonVeg.checked=true;
 if(q.outdoor_preferred===true&&requirement&&!/outdoor|lawn|open area/i.test(requirement.value))requirement.value+=", outdoor preferred";
 if(q.indoor_preferred===true&&requirement&&!/indoor|covered/i.test(requirement.value))requirement.value+=", indoor preferred";
}
function startLiveVenueUpdates(client){if(!client||realtimeChannel)return;try{realtimeChannel=client.channel("smv-ai-venue-matching-live").on("postgres_changes",{event:"*",schema:"public",table:"venues"},()=>{clearTimeout(realtimeRefreshTimer);realtimeRefreshTimer=setTimeout(async()=>{try{if(typeof loadAssignmentVenueOptions==="function"&&typeof assignmentCurrentLead!=="undefined"&&assignmentCurrentLead)await loadAssignmentVenueOptions();render();}catch(err){console.warn("SMV live venue refresh deferred",err);}},350);}).subscribe();}catch(err){console.warn("SMV realtime subscription unavailable",err);}}
function startVoiceNotes(){const button=$("#smvAiMic"),field=$("#smvAiRequirement"),SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!button||!field)return;if(!SR){button.disabled=true;button.title="Speech recognition is not supported in this browser";return;}button.addEventListener("click",()=>{if(speechRecognition){speechRecognition.stop();speechRecognition=null;button.textContent="🎙 Dictate call notes";return;}speechRecognition=new SR();speechRecognition.lang="en-IN";speechRecognition.continuous=true;speechRecognition.interimResults=true;speechRecognition.onresult=e=>{let text="";for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)text+=e.results[i][0].transcript+" ";if(text){field.value=(field.value+" "+text).trim();field.dispatchEvent(new Event("input",{bubbles:true}));}};speechRecognition.onend=()=>{button.textContent="🎙 Dictate call notes";speechRecognition=null;};speechRecognition.onerror=()=>{button.textContent="🎙 Dictate call notes";speechRecognition=null;};speechRecognition.start();button.textContent="■ Stop dictation";});}
async function init(){if(loaded)return;loaded=true;const c=typeof getSupabaseClient==="function"?getSupabaseClient():null;startLiveVenueUpdates(c);subscribeAvailabilityResponses(c);startVoiceNotes();if(c){const r=await c.from("geo_area_aliases").select("alias_key,canonical_label,latitude,longitude,city_family").limit(500);if(!r.error&&Array.isArray(r.data))aliases=r.data;}const input=$("#smvAiLocations");if(input){let dl=$("#smvAiAreaOptions");if(!dl){dl=document.createElement("datalist");dl.id="smvAiAreaOptions";document.body.appendChild(dl);input.setAttribute("list","smvAiAreaOptions");}const opts=[...new Set(aliases.map(a=>String(a.alias_key||"").split("|").slice(1).join("|").trim()).filter(Boolean))];dl.innerHTML=opts.map(x=>'<option value="'+esc(x)+'"></option>').join("");}if(typeof assignmentCurrentLead!=="undefined"&&assignmentCurrentLead){populateLeadRequirements(assignmentCurrentLead);await loadAvailabilityResponsesForLead(c,assignmentCurrentLead);await loadVenueFeedbackSignals(c);await loadVenueOutcomeSignals(c);}render();}
document.addEventListener("change",e=>{const cb=e.target.closest("[data-compare-venue]");if(cb){const id=String(cb.dataset.compareVenue);if(cb.checked&&compareIds.size>=3){cb.checked=false;return;}if(cb.checked)compareIds.add(id);else compareIds.delete(id);render();}});
document.addEventListener("click",e=>{if(e.target.closest("#smvAiOpen")){e.preventDefault();$("#smvAiDiscovery").hidden=false;const lead=typeof assignmentCurrentLead!=="undefined"?assignmentCurrentLead:null;if(lead){populateLeadRequirements(lead);const client=typeof getSupabaseClient==="function"?getSupabaseClient():null;Promise.all([loadAvailabilityResponsesForLead(client,lead),loadVenueFeedbackSignals(client),loadVenueOutcomeSignals(client)]).then(render);}init();render();}if(e.target.closest("#smvAiClose"))$("#smvAiDiscovery").hidden=true;let feedbackButton=e.target.closest("[data-feedback-venue]");if(feedbackButton){recordVenueFeedback(feedbackButton.dataset.feedbackVenue,feedbackButton.dataset.feedbackAction,Number(feedbackButton.closest(".smv-ai-card")?.querySelector(".smv-ai-card-top>b")?.textContent)||0,Number(feedbackButton.closest(".smv-ai-card")?.querySelector(".smv-ai-confidence span:last-child")?.textContent?.match(/\\d+/)?.[0])||0);return;}let b=e.target.closest("[data-suggest-venue]");if(b){let cb=Array.from(document.querySelectorAll(".venue-assignment-checkbox")).find(x=>x.value===b.dataset.suggestVenue);if(cb){cb.checked=true;cb.dispatchEvent(new Event("change",{bubbles:true}));b.textContent="Added to shortlist";b.disabled=true;}}});
document.addEventListener("input",e=>{if(e.target.closest("#smvAiDiscovery")){if(e.target.id==="smvAiRequirement"){const date=$("#smvAiEventDate"),parsed=extractEventDate(e.target.value);if(date&&parsed&&!date.value)date.value=parsed;}clearTimeout(timer);timer=setTimeout(render,180);}});
document.addEventListener("change",e=>{if(e.target.closest("#smvAiDiscovery")){if(e.target.id==="smvAiEventDate"){const client=typeof getSupabaseClient==="function"?getSupabaseClient():null,lead=typeof assignmentCurrentLead!=="undefined"?assignmentCurrentLead:null;loadAvailabilityResponsesForLead(client,lead).then(render);}else render();}});
const assignmentList=$("#venueAssignmentList");if(assignmentList&&typeof MutationObserver!=="undefined"){new MutationObserver(()=>{if($("#smvAiDiscovery")&&!$("#smvAiDiscovery").hidden)render();}).observe(assignmentList,{childList:true,subtree:true});}
window.smvParseVenueRequirements=parse;window.smvExtractEventDate=extractEventDate;window.smvScoreVenueMatch=score;window.smvPopulateLeadRequirements=populateLeadRequirements;window.smvRenderAiVenueDiscovery=render;window.smvRefreshVenueDiscovery=render;
})();