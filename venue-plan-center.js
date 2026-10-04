(function(){
"use strict";
var TYPE="crm_plan_expiry_3d", KEY="smv_plan_alert_seen_", client=null, uid="", alerts=[];

function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function dOnly(v){return v?String(v).slice(0,10):"";}
function today(){var d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
function days(v){var d=new Date(dOnly(v)+"T00:00:00"),t=today();return isNaN(d)?null:Math.round((d-t)/86400000);}
function date(v){if(!v)return "—";var d=new Date(dOnly(v)+"T00:00:00");return isNaN(d)?String(v):d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});}
function plan(v){return ({launch_trial:"Launch Trial",partner:"Partner",growth:"Growth",premium:"Premium"})[v]||String(v||"Plan").replace(/[-_]/g," ");}
function status(v){return String(v||"—").replace(/[-_]/g," ").replace(/\b\w/g,function(c){return c.toUpperCase();});}

function styles(){
 if(document.getElementById("smvPlanCenterStyles"))return;
 var s=document.createElement("style");s.id="smvPlanCenterStyles";
 s.textContent=[
 ".smv-plan-center-btn{display:inline-flex!important;align-items:center!important;gap:7px!important}.smv-plan-center-btn.is-active{background:#0b806b!important;color:#fff!important;border-color:#0b806b!important}",
 "#smvPlanCenterPanel{margin-top:14px}.smv-plan-center-shell{background:#fff;border:1px solid #d7e9e3;border-radius:18px;box-shadow:0 12px 35px rgba(0,65,55,.07);overflow:hidden}",
 ".smv-plan-center-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 22px;border-bottom:1px solid #e3efeb;background:#f5fbf8}.smv-plan-center-kicker{font-size:9px;font-weight:900;letter-spacing:.12em;color:#08745d;text-transform:uppercase}",
 ".smv-plan-center-head h2{margin:3px 0 4px;font-size:22px;color:#173f38}.smv-plan-center-head p{margin:0;color:#718b85;font-size:12px}",
 ".smv-plan-center-summary{display:flex;gap:8px;flex-wrap:wrap}.smv-plan-summary-pill{padding:7px 10px;border-radius:10px;background:#fff;border:1px solid #d7e9e3;font-size:10px;font-weight:800;color:#48665f}.smv-plan-summary-pill strong{font-size:14px;color:#173f38;margin-left:4px}",
 ".smv-plan-center-tools{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid #edf4f1}.smv-plan-center-tools input,.smv-plan-center-tools select{height:38px;border:1px solid #d7e7e2;border-radius:9px;padding:0 10px;background:#fff;color:#244f47;font-size:12px}.smv-plan-center-tools input{flex:1;min-width:180px}",
 ".smv-plan-center-table-wrap{overflow:auto}.smv-plan-center-table{width:100%;min-width:760px;border-collapse:collapse}.smv-plan-center-table th{padding:10px 12px;background:#f8fbfa;color:#728a84;font-size:9px;letter-spacing:.08em;text-align:left;white-space:nowrap}.smv-plan-center-table td{padding:12px;border-top:1px solid #edf3f1;color:#294d46;font-size:11.5px}.smv-plan-center-table td strong{color:#173f38;font-size:12px}",
 ".smv-plan-chip{display:inline-flex;padding:5px 8px;border-radius:999px;background:#edf8f4;color:#08745d;font-size:9px;font-weight:900;white-space:nowrap}.smv-plan-status{font-weight:850;font-size:10px}.smv-plan-status.expired{color:#b42318}.smv-plan-status.active,.smv-plan-status.trialing{color:#08745d}.smv-plan-days{font-weight:900}.smv-plan-days.warn{color:#b76a00}.smv-plan-days.danger{color:#b42318}.smv-plan-center-empty{padding:34px;text-align:center;color:#718b85;font-size:12px}.smv-plan-back-btn{margin-left:auto}",
 ".smv-crm-notification-bell{position:relative;display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid rgba(255,255,255,.2);border-radius:9px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;font-size:16px}.smv-crm-notification-badge{position:absolute;top:-5px;right:-5px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#d92d20;color:#fff;font-size:9px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #123f3a}.smv-crm-notification-badge[hidden]{display:none!important}",
 ".smv-plan-alert-overlay{position:fixed;inset:0;z-index:9000;background:rgba(7,31,27,.48);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:18px}.smv-plan-alert-card{width:min(720px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:20px;box-shadow:0 25px 80px rgba(0,40,32,.25);border:1px solid #d4e8e1}.smv-plan-alert-head{position:relative;padding:20px 58px 20px 22px;background:#0b806b;color:#fff}.smv-plan-alert-head .kicker{font-size:9px;font-weight:900;letter-spacing:.12em;opacity:.8}.smv-plan-alert-head h2{margin:4px 0 2px;font-size:22px}.smv-plan-alert-head p{margin:0;font-size:12px;opacity:.88}.smv-plan-alert-body{padding:14px}.smv-plan-alert-item{border:1px solid #dcebe6;border-radius:13px;padding:13px 14px;margin-bottom:9px;background:#fbfefd}.smv-plan-alert-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.smv-plan-alert-name{font-size:13px;font-weight:900;color:#173f38}.smv-plan-alert-meta{margin-top:4px;font-size:11px;color:#6f8982}.smv-plan-alert-days{font-size:13px;font-weight:950;color:#b76a00;white-space:nowrap}.smv-plan-alert-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:9px}.smv-plan-alert-actions a,.smv-plan-alert-actions button{height:32px;padding:0 10px;border-radius:8px;border:1px solid #cfe3dc;background:#fff;color:#245c52;font-size:10px;font-weight:850;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}.smv-plan-alert-actions .primary{background:#0b806b;color:#fff;border-color:#0b806b}.smv-plan-alert-close{position:absolute;top:12px;right:14px;z-index:5;float:none;width:36px;height:36px;padding:0;border:0;border-radius:9px;background:rgba(0,0,0,.08);color:#fff;font-size:24px;line-height:36px;text-align:center;cursor:pointer;pointer-events:auto;touch-action:manipulation}.smv-plan-alert-close:hover{background:rgba(0,0,0,.18)}@media(max-width:760px){.smv-plan-center-head{align-items:flex-start;flex-direction:column}.smv-plan-center-tools{flex-wrap:wrap}.smv-plan-center-tools input,.smv-plan-center-tools select{min-width:0;flex:1 1 45%}.smv-plan-back-btn{margin-left:0}.smv-plan-alert-card{width:100%;border-radius:16px}}"
 ].join("");document.head.appendChild(s);
}

function rows(venues){return (venues||[]).map(function(v){v=Object.assign({},v,{days:days(v.plan_expires_at)});return v;}).sort(function(a,b){return (a.days==null?99999:a.days)-(b.days==null?99999:b.days);});}
function venues(){try{if(Array.isArray(window.allVenues))return window.allVenues;if(Array.isArray(window.SMVAllVenues))return window.SMVAllVenues;}catch(e){}return[];}
function render(){
 var body=document.getElementById("smvPlanCenterBody");if(!body)return;
 var list=rows(venues()),q=(document.getElementById("smvPlanCenterSearch")||{}).value||"",p=(document.getElementById("smvPlanCenterFilter")||{}).value||"all",s=(document.getElementById("smvPlanCenterStatus")||{}).value||"all";q=q.toLowerCase().trim();
 list=list.filter(function(v){return(!q||String(v.venue_name||"").toLowerCase().indexOf(q)>=0||plan(v.partner_plan).toLowerCase().indexOf(q)>=0)&&(p==="all"||String(v.partner_plan||"launch_trial")===p)&&(s==="all"||String(v.plan_status||"").toLowerCase()===s);});
 var all=rows(venues()),active=all.filter(function(v){return["active","trialing"].indexOf(String(v.plan_status||"").toLowerCase())>=0;}).length,exp=all.filter(function(v){return v.days!=null&&v.days>=0&&v.days<=3;}).length,expired=all.filter(function(v){return String(v.plan_status||"").toLowerCase()==="expired";}).length;
 var sum=document.getElementById("smvPlanCenterSummary");if(sum)sum.innerHTML='<span class="smv-plan-summary-pill">TOTAL <strong>'+all.length+'</strong></span><span class="smv-plan-summary-pill">ACTIVE <strong>'+active+'</strong></span><span class="smv-plan-summary-pill">EXPIRING ≤3D <strong>'+exp+'</strong></span><span class="smv-plan-summary-pill">EXPIRED <strong>'+expired+'</strong></span>';
 if(!list.length){body.innerHTML='<tr><td colspan="7" class="smv-plan-center-empty">No plan records match this filter.</td></tr>';return;}
 body.innerHTML=list.map(function(v){var d=v.days,txt=d==null?"—":d<0?"Expired "+Math.abs(d)+"d ago":d===0?"Expires today":d+" day"+(d===1?"":"s")+" left",cl=d!=null&&d<=1?"danger":d!=null&&d<=3?"warn":"",rem=d!=null&&d>=0&&d<=3?"CALL NOW":d!=null&&d<0?"Renewal needed":"—";return'<tr><td><strong>'+esc(v.venue_name||"Unnamed Venue")+'</strong></td><td><span class="smv-plan-chip">'+esc(plan(v.partner_plan||"launch_trial"))+'</span></td><td><span class="smv-plan-status '+esc(String(v.plan_status||"").toLowerCase())+'">'+esc(status(v.plan_status||"—"))+'</span></td><td>'+esc(date(v.plan_started_at))+'</td><td>'+esc(date(v.plan_expires_at))+'</td><td><span class="smv-plan-days '+cl+'">'+esc(txt)+'</span></td><td><strong>'+esc(rem)+'</strong></td></tr>';}).join("");
}
function toggle(show){
 var sec=document.getElementById("venueManagementSection"),panel=document.getElementById("smvPlanCenterPanel"),btn=document.getElementById("venuePlanCenterBtn");if(!sec||!panel)return;
 [".venue-primary-stats",".venue-toolbar",".venue-table-wrapper","#venueEmptyState",".venue-secondary-insights"].forEach(function(sel){sec.querySelectorAll(sel).forEach(function(el){el.hidden=!!show;});});
 panel.hidden=!show;if(btn)btn.classList.toggle("is-active",!!show);if(show)render();
}
function build(){
 var sec=document.getElementById("venueManagementSection"),ha=sec&&sec.querySelector(".venue-heading-actions");if(!sec||!ha)return;
 var btn=document.getElementById("venuePlanCenterBtn");if(!btn){btn=document.createElement("button");btn.type="button";btn.id="venuePlanCenterBtn";btn.className="secondary-btn smv-plan-center-btn";btn.textContent="📋 Plan Center";ha.insertBefore(btn,ha.lastElementChild||null);btn.onclick=function(){toggle(true);};}
 var panel=document.getElementById("smvPlanCenterPanel");if(!panel){panel=document.createElement("div");panel.id="smvPlanCenterPanel";panel.hidden=true;panel.innerHTML='<div class="smv-plan-center-shell"><div class="smv-plan-center-head"><div><div class="smv-plan-center-kicker">PARTNER PLAN CONTROL</div><h2>All Venue Plans</h2><p>Plan name, status, start date, expiry date and renewal urgency — nothing else.</p></div><div class="smv-plan-center-summary" id="smvPlanCenterSummary"></div></div><div class="smv-plan-center-tools"><input id="smvPlanCenterSearch" type="search" placeholder="Search venue or plan..."><select id="smvPlanCenterFilter"><option value="all">All Plans</option><option value="launch_trial">Launch Trial</option><option value="partner">Partner</option><option value="growth">Growth</option><option value="premium">Premium</option></select><select id="smvPlanCenterStatus"><option value="all">All Status</option><option value="active">Active</option><option value="trialing">Trialing</option><option value="expired">Expired</option></select><button type="button" id="smvPlanCenterRefresh" class="secondary-btn">↻ Refresh</button><button type="button" id="smvPlanCenterBack" class="secondary-btn smv-plan-back-btn">← Venue List</button></div><div class="smv-plan-center-table-wrap"><table class="smv-plan-center-table"><thead><tr><th>VENUE</th><th>PLAN</th><th>STATUS</th><th>START DATE</th><th>EXPIRY DATE</th><th>DAYS LEFT</th><th>REMINDER</th></tr></thead><tbody id="smvPlanCenterBody"></tbody></table></div></div>';sec.appendChild(panel);
 document.getElementById("smvPlanCenterBack").onclick=function(){toggle(false);};document.getElementById("smvPlanCenterRefresh").onclick=function(){try{window.loadVenues&&window.loadVenues();}catch(e){}setTimeout(render,500);};document.getElementById("smvPlanCenterSearch").oninput=render;document.getElementById("smvPlanCenterFilter").onchange=render;document.getElementById("smvPlanCenterStatus").onchange=render;}
}
function bell(){
 var a=document.querySelector(".crm-header-actions");if(!a||document.getElementById("smvPlanNotificationBell"))return;
 var b=document.createElement("button");b.type="button";b.id="smvPlanNotificationBell";b.className="smv-crm-notification-bell";b.title="Venue plan renewal alerts";b.innerHTML='🔔<span id="smvPlanNotificationBadge" class="smv-crm-notification-badge" hidden>0</span>';a.insertBefore(b,a.firstElementChild);b.onclick=function(){popup(alerts);};
}
function popup(list){
 var ov=document.getElementById("smvPlanAlertOverlay");if(!ov){ov=document.createElement("div");ov.id="smvPlanAlertOverlay";ov.className="smv-plan-alert-overlay";ov.hidden=true;ov.innerHTML='<div class="smv-plan-alert-card"><div class="smv-plan-alert-head"><button type="button" class="smv-plan-alert-close" id="smvPlanAlertClose">×</button><div class="kicker">ACTION REQUIRED</div><h2>Venue Plan Renewal</h2><p>These venues are within 3 days of plan expiry. Please call them for renewal.</p></div><div class="smv-plan-alert-body" id="smvPlanAlertBody"></div></div>';document.body.appendChild(ov);ov.onclick=function(e){if(e.target===ov)ov.hidden=true;}; }
 var body=document.getElementById("smvPlanAlertBody");if(!list.length){body.innerHTML='<div class="smv-plan-center-empty">No venue plan is currently due for renewal.</div>';ov.hidden=false;return;}
 body.innerHTML=list.map(function(a,i){var d=a.days,txt=d===0?"Expires today":d+" day"+(d===1?"":"s")+" left",phone=String(a.contact_mobile||"").replace(/\D/g,"");return'<div class="smv-plan-alert-item"><div class="smv-plan-alert-row"><div><div class="smv-plan-alert-name">'+esc(a.venue_name)+'</div><div class="smv-plan-alert-meta">'+esc(plan(a.partner_plan))+' · Expiry: <strong>'+esc(date(a.plan_expires_at))+'</strong></div></div><div class="smv-plan-alert-days">'+esc(txt)+'</div></div><div class="smv-plan-alert-actions">'+(phone?'<a class="primary" href="tel:'+esc(phone)+'">☎ Call Venue</a>':"")+'<button type="button" data-dismiss="'+i+'">Dismiss</button></div></div>';}).join("");
 body.querySelectorAll("[data-dismiss]").forEach(function(x){x.onclick=function(){var a=list[Number(x.dataset.dismiss)];if(a&&a.venue_id)try{sessionStorage.setItem(KEY+a.venue_id+"_"+dOnly(a.plan_expires_at),"1");}catch(e){}refresh(false);ov.hidden=true;};});
 ov.hidden=false;
}
function refresh(auto){
 if(!client)return Promise.resolve([]);
 return client.from("venues").select("id,venue_name,partner_plan,plan_status,plan_started_at,plan_expires_at,contact_mobile").then(function(r){
  var due=(r.data||[]).map(function(v){v.days=days(v.plan_expires_at);return v;}).filter(function(v){return["active","trialing"].indexOf(String(v.plan_status||"").toLowerCase())>=0&&v.days!=null&&v.days>=0&&v.days<=3;});
  return client.from("venue_notifications").select("id,venue_id").eq("user_id",uid).eq("notification_type",TYPE).eq("is_read",false).then(function(n){
   var ids={};(n.data||[]).forEach(function(x){ids[String(x.venue_id)]=x.id;});due.forEach(function(v){v.notification_id=ids[String(v.id)]||"";});
   alerts=due.sort(function(a,b){return a.days-b.days;});var badge=document.getElementById("smvPlanNotificationBadge");if(badge){badge.textContent=String(alerts.length);badge.hidden=!alerts.length;}
   if(auto&&alerts.length){var a=alerts[0],k=KEY+a.venue_id+"_"+dOnly(a.plan_expires_at),seen=false;try{seen=sessionStorage.getItem(k)==="1";}catch(e){}if(!seen){try{sessionStorage.setItem(k,"1");}catch(e){}popup(alerts);}}
   return alerts;
  });
 }).catch(function(){return[];});
}
function init(){
 styles();bell();build();
 if(!window.__smvPlanAlertCloseDelegation){
  window.__smvPlanAlertCloseDelegation=true;
  document.addEventListener("click",function(e){
   var t=e.target&&e.target.closest?e.target.closest("#smvPlanAlertClose"):null;
   if(!t)return;
   var ov=document.getElementById("smvPlanAlertOverlay");
   if(!ov)return;
   e.preventDefault();e.stopPropagation();
   ov.hidden=true;
  },true);
  document.addEventListener("pointerup",function(e){
   var t=e.target&&e.target.closest?e.target.closest("#smvPlanAlertClose"):null;
   if(!t)return;
   var ov=document.getElementById("smvPlanAlertOverlay");
   if(ov)ov.hidden=true;
  },true);
 }
 var tries=0,t=setInterval(function(){tries++;try{client=window.getSupabaseClient&&window.getSupabaseClient();}catch(e){}if(client){clearInterval(t);client.auth.getUser().then(function(r){uid=r.data&&r.data.user?r.data.user.id:"";return refresh(true);});}if(tries>80)clearInterval(t);},100);
 var tb=document.getElementById("venueTableBody");if(tb)new MutationObserver(function(){if(!document.getElementById("smvPlanCenterPanel")||document.getElementById("smvPlanCenterPanel").hidden)return;render();}).observe(tb,{childList:true});
 setInterval(function(){if(client)refresh(false);},300000);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
window.SMVPlanCenter={open:function(){toggle(true);},close:function(){toggle(false);},refresh:function(){return refresh(false);}};
})();