/* SMV Enterprise Venue Assignment Control Center
 * Staff-side orchestration only. Uses existing assignment records and current AI evidence.
 * No database writes are performed by this file.
 */
(function(){
"use strict";
const $=s=>document.querySelector(s);
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let ranked=[],refreshTimer=null,sorting=false,assignmentChannel=null,subscribedLeadId=null;
function lead(){try{return typeof assignmentCurrentLead!=="undefined"?assignmentCurrentLead:null;}catch(_){return null;}}
function assigned(venueId){try{return typeof isVenueAlreadyAssigned==="function"&&isVenueAlreadyAssigned(venueId);}catch(_){return false;}}
function reactivation(venueId){try{return typeof allVenueAssignments!=="undefined"&&allVenueAssignments.some(row=>String(row.venue_id)===String(venueId)&&row.assignment_status==="cancelled");}catch(_){return false;}}
function getRows(){return ranked;}
function updateBasket(){
 const list=$("#venueAssignmentList"),items=$("#smvAcBasketItems"),count=$("#smvAcSelected"),summary=$("#smvAcBasketSummary"),hint=$("#smvAcSelectedHint");
 if(!list||!items)return;
 const selected=Array.from(list.querySelectorAll(".venue-assignment-checkbox:checked:not(:disabled)"));
 if(count)count.textContent=String(selected.length);
 if(summary)summary.textContent=selected.length?selected.length+" venue"+(selected.length===1?"":"s")+" selected":"No venues selected";
 if(hint)hint.textContent=selected.length?"Review before assignment":"Ready for review";
 const rowsById=new Map(ranked.map(r=>[String(r.venue.id),r]));
 items.innerHTML=selected.length?selected.slice(0,10).map(cb=>{
  const row=rowsById.get(String(cb.value)),name=row?.venue?.venue_name||cb.closest(".venue-assignment-item")?.querySelector(".venue-assignment-item-title strong")?.textContent||"Selected venue";
  const state=assigned(cb.value)?"Already active":reactivation(cb.value)?"Reactivation":"New assignment";
  return '<span class="smv-assignment-basket-chip">'+safe(name)+' <em>'+safe(state)+'</em></span>';
 }).join("")+(selected.length>10?'<span class="smv-assignment-basket-chip">+'+(selected.length-10)+' more</span>':""):"Select venues from the ranked list or AI discovery.";
}
function updateKpis(){
 const rows=ranked,eligible=$("#smvAcEligible"),strong=$("#smvAcStrong"),available=$("#smvAcAvailable");
 if(eligible)eligible.textContent=String(rows.length);
 if(strong)strong.textContent=String(rows.filter(r=>r.match.score>=80&&r.match.confidence>=70&&r.gate.eligible).length);
 if(available)available.textContent=String(rows.filter(r=>r.availability?.availability_status==="available").length);
}
function renderRanks(){
 const list=$("#venueAssignmentList");if(!list||!ranked.length)return;
 const byId=new Map(ranked.map(r=>[String(r.venue.id),r]));
 const nodes=Array.from(list.querySelectorAll(".venue-assignment-item"));
 nodes.sort((a,b)=>{
  const x=byId.get(String(a.querySelector(".venue-assignment-checkbox")?.value)),y=byId.get(String(b.querySelector(".venue-assignment-checkbox")?.value));
  if(!x||!y)return 0;
  return (Number(y.gate.eligible)-Number(x.gate.eligible))||(y.match.score-x.match.score)||(y.match.confidence-x.match.confidence)||((x.match.d??999)-(y.match.d??999));
 });
 const currentOrder=Array.from(list.querySelectorAll(".venue-assignment-item"));
 const needsReorder=currentOrder.length===nodes.length&&currentOrder.some((node,index)=>node!==nodes[index]);
 sorting=true;
 nodes.forEach((node,index)=>{
  const cb=node.querySelector(".venue-assignment-checkbox"),row=byId.get(String(cb?.value)),main=node.querySelector(".venue-assignment-item-main"),title=node.querySelector(".venue-assignment-item-title");
  if(!row||!main||!title)return;
  node.classList.toggle("smv-ranked-first",index===0);
  let badge=title.querySelector(".smv-enterprise-match");
  if(!badge){badge=document.createElement("span");badge.className="smv-enterprise-match";title.appendChild(badge);}
  const m=row.match,known=m.confidence>=70,hardBlocked=row.gate.blockers.some(reason=>/below requirement|exceeds stated budget|explicitly unavailable/i.test(reason)),reviewRequired=!row.gate.eligible&&!hardBlocked,blocked=hardBlocked;
  badge.className="smv-enterprise-match"+(blocked?" blocked":(!known||reviewRequired)?" review":"");
  const fit=m.score>=80?"Strong fit":m.score>=65?"Potential fit":m.score>0?"Review fit":"Add requirements";
  badge.textContent=fit+" · "+m.score+"%";
  const detail=document.createElement("small");detail.textContent=" · "+m.confidence+"% data confidence";
  badge.appendChild(detail);
  let availability=title.querySelector(".smv-assignment-availability");
  if(!availability){availability=document.createElement("span");availability.className="smv-enterprise-match smv-assignment-availability";title.appendChild(availability);}
  const status=row.availability?.availability_status;
  availability.textContent=status==="available"?"Partner available":status==="unavailable"?"Partner unavailable":status==="needs_info"?"Partner needs details":m.availabilityStatus==="date_not_provided"?"Event date needed":"Awaiting partner";
  availability.classList.toggle("review",status!=="available");
  availability.classList.toggle("blocked",status==="unavailable");
  if(row.gate.blockers.length){node.dataset.smvReview=row.gate.blockers.join("; ");badge.title=(blocked?"Mismatch: ":"Review required: ")+row.gate.blockers.join("; ");}
  else{delete node.dataset.smvReview;badge.title=m.reasons.slice(0,5).join("; ");}
  if(needsReorder)list.appendChild(node);
 });
 sorting=false;
}
async function refresh(){
 const modal=$("#venueAssignmentModal");if(!modal||modal.hidden)return;
 const current=lead();if(!current)return;
 const id=String(current.id||"");if(!id)return;
 await startAssignmentRealtime(id);
 try{
  if(typeof window.smvPrepareAssignmentCenter!=="function")return;
  ranked=await window.smvPrepareAssignmentCenter(current);
  if(id!==String(lead()?.id||""))return;
  updateKpis();renderRanks();updateBasket();
 }catch(error){console.warn("SMV assignment ranking refresh skipped",error);}
}
function scheduleRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(refresh,160);}
async function stopAssignmentRealtime(){
 const old=assignmentChannel;assignmentChannel=null;subscribedLeadId=null;
 if(old){try{await old.unsubscribe();}catch(error){console.warn("SMV assignment realtime unsubscribe skipped",error);}}
}
async function startAssignmentRealtime(enquiryId){
 const id=String(enquiryId||"");if(!id||subscribedLeadId===id)return;
 await stopAssignmentRealtime();
 let client=null;try{client=typeof getSupabaseClient==="function"?getSupabaseClient():null;}catch(_){}
 const state=$("#smvAcLiveState");
 if(!client?.channel){if(state)state.textContent="Manual refresh fallback";return;}
 try{
  const channel=client.channel("smv-assignment-center-"+id)
   .on("postgres_changes",{event:"*",schema:"public",table:"venue_enquiry_assignments",filter:"enquiry_id=eq."+id},async()=>{
    try{if(typeof loadVenueAssignments==="function")await loadVenueAssignments();}catch(error){console.warn("SMV assignment live refresh skipped",error);}
    const list=$("#venueAssignmentList");
    list?.querySelectorAll(".venue-assignment-checkbox").forEach(cb=>{if(assigned(cb.value))cb.checked=true;});
    updateBasket();scheduleRefresh();
   })
   .subscribe(status=>{
    if(state)state.textContent=status==="SUBSCRIBED"?"Live assignment updates":"Manual refresh fallback";
   });
  assignmentChannel=channel;subscribedLeadId=id;
 }catch(error){if(state)state.textContent="Manual refresh fallback";console.warn("SMV assignment realtime unavailable",error);}
}
function confirmAssignment(event){
 const button=event.target.closest("#saveVenueAssignment");if(!button)return;
 const list=$("#venueAssignmentList"),selected=Array.from(list?.querySelectorAll(".venue-assignment-checkbox:checked:not(:disabled)")||[]);
 if(!selected.length)return;
 const names=selected.map(cb=>cb.closest(".venue-assignment-item")?.querySelector(".venue-assignment-item-title strong")?.textContent||"Venue");
 const preview=names.slice(0,8).map((n,i)=>(i+1)+". "+n).join("\n");
 const extra=names.length>8?"\n…and "+(names.length-8)+" more":"";
 const message="Confirm assignment for "+names.length+" venue"+(names.length===1?"":"s")+"?\n\n"+preview+extra+"\n\nThis will save assignments to the selected customer enquiry. Existing active assignments will be preserved.";
 if(!window.confirm(message)){event.preventDefault();event.stopImmediatePropagation();return;}
}
function boot(){
 const modal=$("#venueAssignmentModal"),list=$("#venueAssignmentList");if(!modal||!list)return;
 modal.addEventListener("change",event=>{if(event.target.matches(".venue-assignment-checkbox"))updateBasket();});
 document.addEventListener("click",confirmAssignment,true);
 const observer=new MutationObserver(()=>{if(modal.hidden)stopAssignmentRealtime();else if(!sorting)scheduleRefresh();});
 observer.observe(modal,{attributes:true,attributeFilter:["hidden"]});
 modal.addEventListener("transitionend",()=>{if(modal.hidden)stopAssignmentRealtime();});
 observer.observe(list,{childList:true});
 document.addEventListener("change",event=>{if(event.target.closest("#smvAiDiscovery"))scheduleRefresh();});
 document.addEventListener("input",event=>{if(event.target.closest("#smvAiDiscovery"))scheduleRefresh();});
 const aiOpen=$("#smvAiOpen");aiOpen?.addEventListener("click",scheduleRefresh);
 const search=$("#assignmentVenueSearch");search?.addEventListener("input",()=>setTimeout(()=>{renderRanks();updateBasket();},80));
 if(!modal.hidden)scheduleRefresh();
 const close=$("#closeVenueAssignmentModal");close?.addEventListener("click",()=>stopAssignmentRealtime());
 const cancel=$("#cancelVenueAssignment");cancel?.addEventListener("click",()=>stopAssignmentRealtime());
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
window.SMVEnterpriseAssignmentCenter={refresh,updateBasket,getRankedRows:getRows};
})();