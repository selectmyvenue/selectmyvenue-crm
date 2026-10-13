(function () {
"use strict";
var client = null, venues = [], plans = [], prices = [], selectedId = "", busy = false;
var TYPE = "crm_plan_expiry_3d", KEY = "smv_plan_alert_seen_", uid = "", alerts = [];
var PLAN_NAMES = { launch_trial: "Launch Trial", partner: "Partner", growth: "Growth", premium: "Premium" };
function el(id) { return document.getElementById(id); }
function esc(v) { return String(v == null ? "" : v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
function planName(v) { return PLAN_NAMES[String(v || "").toLowerCase()] || String(v || "Plan").replace(/[-_]/g," "); }
function niceStatus(v) { return String(v || "—").replace(/[-_]/g," ").replace(/\b\w/g,function(c){return c.toUpperCase();}); }
function dateValue(v) { return v ? String(v).slice(0,10) : ""; }
function dayStart(v) { if(!v) return null; var d=new Date(dateValue(v)+"T00:00:00"); return isNaN(d.getTime())?null:d; }
function dayDiff(v) { var d=dayStart(v); if(!d)return null; var t=new Date(); t.setHours(0,0,0,0); return Math.round((d-t)/86400000); }
function niceDate(v) { var d=dayStart(v); return d ? d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "Not set"; }
function money(amount,currency) { var n=Number(amount); if(!Number.isFinite(n)) return "Price not configured"; try{return new Intl.NumberFormat("en-IN",{style:"currency",currency:currency||"INR",maximumFractionDigits:0}).format(n);}catch(e){return (currency||"INR")+" "+n.toLocaleString("en-IN");} }
function setMessage(message,kind) { var m=el("smvPlanCenterMessage"); if(m){m.textContent=message||"";m.className="smv-pc-message"+(kind?" "+kind:"");} }
function getClient() { try { return window.getSupabaseClient ? window.getSupabaseClient() : null; } catch(e) { return null; } }
function currentVenueList() { return venues.slice().sort(function(a,b){return String(a.venue_name||"").localeCompare(String(b.venue_name||""));}); }
function injectStyles() {
 if(el("smvPlanCenterStyles")) return;
 var s=document.createElement("style");s.id="smvPlanCenterStyles";
 s.textContent = [
 "#venuePlanCenterBtn{display:inline-flex!important;align-items:center;gap:7px;cursor:pointer;position:relative;z-index:5;pointer-events:auto}.smv-plan-center-btn.is-active{background:#0b806b!important;color:#fff!important}",
 "#smvPlanCenterPanel{width:100%;margin:14px 0 20px;position:relative;z-index:1;color:#193f38}#smvPlanCenterPanel[hidden]{display:none!important}.smv-pc-topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px 24px;background:linear-gradient(120deg,#073f36,#0b806b);border-radius:18px 18px 0 0;color:#fff}.smv-pc-topbar h2{margin:5px 0;font-size:24px;color:#fff;letter-spacing:-.03em}.smv-pc-topbar p{margin:0;color:#d6eee7;font-size:12px}.smv-pc-kicker{font-size:9px;letter-spacing:.14em;font-weight:900;color:#16816d;text-transform:uppercase}.smv-pc-topbar .smv-pc-kicker{color:#a8e2d3}.smv-pc-topbar #smvPlanCenterBack{background:#fff;color:#075d4e;border-color:#fff;white-space:nowrap}",
 ".smv-pc-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:14px;background:#f4faf7;border:1px solid #dcebe5;border-top:0}.smv-pc-kpi{background:#fff;border:1px solid #dcebe5;border-radius:12px;padding:13px 15px}.smv-pc-kpi span{display:block;color:#708a82;font-size:10px;font-weight:800}.smv-pc-kpi strong{display:block;margin-top:5px;color:#0a715d;font-size:23px;line-height:1.2}",
 ".smv-pc-layout{display:grid;grid-template-columns:minmax(300px,.85fr) minmax(440px,1.15fr);gap:14px;margin-top:14px;align-items:start}.smv-pc-list-card,.smv-pc-editor-card,.smv-pc-catalog-card{background:#fff;border:1px solid #dbe9e4;border-radius:16px;box-shadow:0 6px 22px rgba(10,72,58,.045);overflow:hidden}.smv-pc-list-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 17px;border-bottom:1px solid #e8f0ed}.smv-pc-list-head h3,.smv-pc-editor-heading h3,.smv-pc-catalog-card h3{margin:0;color:#153e36;font-size:15px}.smv-pc-list-head p,.smv-pc-editor-heading p,.smv-pc-catalog-card p{margin:4px 0 0;color:#748b84;font-size:11px;line-height:1.45}.smv-pc-filters{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:11px;border-bottom:1px solid #edf3f0}.smv-pc-filters input{grid-column:1/-1}.smv-pc-filters input,.smv-pc-filters select,.smv-pc-form-grid input,.smv-pc-form-grid select{width:100%;min-width:0;height:38px;border:1px solid #d5e5df;border-radius:9px;background:#fff;padding:0 10px;color:#254a42;font:inherit;font-size:12px;box-sizing:border-box}.smv-pc-venue-list{max-height:550px;overflow:auto}.smv-pc-venue-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 14px;border-bottom:1px solid #eef4f1;cursor:pointer;background:#fff;transition:background .15s}.smv-pc-venue-row:hover{background:#f5fbf8}.smv-pc-venue-row.selected{background:#eaf7f2;box-shadow:inset 3px 0 #078568}.smv-pc-venue-main{min-width:0}.smv-pc-venue-name{font-size:12px;font-weight:900;color:#173f38;overflow-wrap:anywhere}.smv-pc-venue-meta{font-size:10px;color:#718980;margin-top:4px}.smv-pc-venue-badges{display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0}.smv-pc-plan-chip{display:inline-flex;border-radius:999px;background:#e8f7f1;color:#08745d;font-size:9px;font-weight:900;padding:5px 8px;white-space:nowrap}.smv-pc-days{font-size:10px;font-weight:900;color:#647d75;white-space:nowrap}.smv-pc-days.warn{color:#a96300}.smv-pc-days.danger{color:#b42318}.smv-pc-empty{padding:25px 14px;text-align:center;color:#7a918a;font-size:12px}",
 ".smv-pc-editor-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:17px 18px;background:#f7fbf9;border-bottom:1px solid #e4efea}.smv-pc-editor-heading h3{margin-top:4px;font-size:18px}.smv-pc-status{display:inline-flex;padding:6px 9px;border-radius:999px;background:#e8f7f1;color:#08745d;font-size:9px;font-weight:900;white-space:nowrap}.smv-pc-status.expired,.smv-pc-status.paused{background:#fff0ef;color:#b42318}.smv-pc-current-plan{display:grid;grid-template-columns:1fr auto;gap:3px 10px;margin:15px 16px 5px;padding:13px;border:1px solid #d7ebe3;border-radius:12px;background:#f5fbf8}.smv-pc-current-plan span{font-size:10px;color:#6e8980;font-weight:800}.smv-pc-current-plan strong{font-size:15px;color:#08745d;text-align:right}.smv-pc-current-plan small{grid-column:1/-1;color:#6c867e;font-size:10px}.smv-pc-editor-card form{padding-bottom:4px}.smv-pc-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px 16px}.smv-pc-form-grid label{display:flex;flex-direction:column;gap:6px;color:#47675e;font-size:10px;font-weight:850}.smv-pc-toggle-label span{display:flex;align-items:center;gap:8px;min-height:38px;padding:0 10px;border:1px solid #d5e5df;border-radius:9px;background:#fbfefd;color:#2e5d50;font-size:11px}.smv-pc-toggle-label input{width:16px;height:16px;accent-color:#087f68}.smv-pc-plan-note{margin:0 16px;padding:11px 12px;border-radius:10px;background:#f7faf9;border:1px solid #e2ede8;color:#647e75;font-size:10px;line-height:1.6}.smv-pc-form-actions{display:flex;justify-content:flex-end;gap:8px;padding:13px 16px 0}.smv-pc-form-actions button{min-height:38px}.smv-pc-message{min-height:17px;margin:8px 16px 12px;font-size:11px;color:#08745d}.smv-pc-message.error{color:#b42318}.smv-pc-message.success{color:#08745d}.smv-pc-message:empty{display:none}",
 ".smv-pc-catalog-card{margin-top:14px;padding:17px}.smv-pc-catalog-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:13px}.smv-pc-plan-card{border:1px solid #dcebe5;border-radius:12px;padding:13px;background:#fbfefd;min-width:0}.smv-pc-plan-card h4{margin:0;color:#173f38;font-size:13px}.smv-pc-plan-card p{margin:6px 0 9px;min-height:30px}.smv-pc-price{font-size:16px;font-weight:950;color:#08745d}.smv-pc-terms{font-size:10px;color:#688279;line-height:1.7;margin-top:6px}.smv-pc-feature-list{margin:8px 0 0;padding-left:16px;color:#668078;font-size:10px;line-height:1.6}",
 ".smv-crm-notification-bell{position:relative;display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid rgba(255,255,255,.2);border-radius:9px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;font-size:16px}.smv-crm-notification-badge{position:absolute;top:-5px;right:-5px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#d92d20;color:#fff;font-size:9px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #123f3a}.smv-crm-notification-badge[hidden]{display:none!important}.smv-plan-alert-overlay{position:fixed;inset:0;z-index:9000;background:rgba(7,31,27,.48);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:18px}.smv-plan-alert-overlay[hidden]{display:none!important}.smv-plan-alert-card{width:min(700px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 25px 80px rgba(0,40,32,.25);border:1px solid #d4e8e1}.smv-plan-alert-head{position:relative;padding:20px 58px 20px 22px;background:#0b806b;color:#fff}.smv-plan-alert-head h3{margin:4px 0;font-size:20px;color:#fff}.smv-plan-alert-head p{margin:0;font-size:12px;color:#e1f4ed}.smv-plan-alert-close{position:absolute;top:10px;right:12px;width:36px;height:36px;border:0;border-radius:9px;background:rgba(255,255,255,.14);color:#fff;font-size:24px;cursor:pointer}.smv-plan-alert-body{padding:14px}.smv-plan-alert-item{border:1px solid #dcebe6;border-radius:12px;padding:12px;margin-bottom:8px}.smv-plan-alert-item strong{color:#173f38}.smv-plan-alert-meta{font-size:11px;color:#708880;margin-top:4px}.smv-plan-alert-actions{display:flex;justify-content:flex-end;margin-top:8px}.smv-plan-alert-actions a{font-size:11px;font-weight:850;color:#08745d;text-decoration:none}",
 "@media(max-width:1050px){.smv-pc-layout{grid-template-columns:1fr}.smv-pc-venue-list{max-height:360px}.smv-pc-catalog-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){.smv-pc-topbar{align-items:flex-start;flex-direction:column;padding:18px}.smv-pc-topbar h2{font-size:20px}.smv-pc-kpis{grid-template-columns:repeat(2,minmax(0,1fr));padding:9px;gap:7px}.smv-pc-kpi{padding:10px}.smv-pc-kpi strong{font-size:20px}.smv-pc-form-grid{grid-template-columns:1fr;gap:10px}.smv-pc-catalog-grid{grid-template-columns:1fr}.smv-pc-list-head{align-items:flex-start}.smv-pc-form-actions{flex-wrap:wrap}.smv-pc-form-actions button{flex:1}.smv-pc-filters{grid-template-columns:1fr}.smv-pc-filters input{grid-column:auto}}"
 ].join("\n");
 document.head.appendChild(s);
}
function updateKpis() {
 var all=venues, active=all.filter(function(v){return ["active","trialing"].indexOf(String(v.plan_status||"").toLowerCase())>=0;}).length;
 var expiring=all.filter(function(v){var d=dayDiff(v.plan_expires_at);return d!==null&&d>=0&&d<=7&&["active","trialing"].indexOf(String(v.plan_status||"").toLowerCase())>=0;}).length;
 var expired=all.filter(function(v){return String(v.plan_status||"").toLowerCase()==="expired"||(dayDiff(v.plan_expires_at)!==null&&dayDiff(v.plan_expires_at)<0);}).length;
 var s=el("smvPlanCenterSummary");if(s)s.innerHTML='<div class="smv-pc-kpi"><span>Total partner venues</span><strong>'+all.length+'</strong></div><div class="smv-pc-kpi"><span>Active / trialing</span><strong>'+active+'</strong></div><div class="smv-pc-kpi"><span>Expiring in 7 days</span><strong>'+expiring+'</strong></div><div class="smv-pc-kpi"><span>Expired</span><strong>'+expired+'</strong></div>';
}
function filteredVenues() {
 var q=(el("smvPlanCenterSearch")?.value||"").trim().toLowerCase(),p=el("smvPlanCenterFilter")?.value||"all",s=el("smvPlanCenterStatusFilter")?.value||"all";
 return currentVenueList().filter(function(v){
  var hay=[v.venue_name,v.city,v.area,planName(v.partner_plan)].join(" ").toLowerCase();
  return (!q||hay.indexOf(q)>=0)&&(p==="all"||String(v.partner_plan||"launch_trial")===p)&&(s==="all"||String(v.plan_status||"trialing").toLowerCase()===s);
 });
}
function renderList() {
 var host=el("smvPlanCenterVenueList");if(!host)return;
 var list=filteredVenues();
 if(!list.length){host.innerHTML='<div class="smv-pc-empty">No venues match these filters.</div>';return;}
 host.innerHTML=list.map(function(v){
  var d=dayDiff(v.plan_expires_at),txt=d===null?"Expiry not set":d<0?"Expired "+Math.abs(d)+"d ago":d===0?"Expires today":d+"d left",cls=d!==null&&d<0?"danger":d!==null&&d<=7?"warn":"";
  return '<button type="button" class="smv-pc-venue-row'+(String(v.id)===String(selectedId)?" selected":"")+'" data-pc-venue="'+esc(v.id)+'"><span class="smv-pc-venue-main"><span class="smv-pc-venue-name">'+esc(v.venue_name||"Unnamed venue")+'</span><span class="smv-pc-venue-meta">'+esc([v.area,v.city].filter(Boolean).join(", ")||"Location not set")+' · '+esc(niceStatus(v.plan_status||"trialing"))+'</span></span><span class="smv-pc-venue-badges"><span class="smv-pc-plan-chip">'+esc(planName(v.partner_plan||"launch_trial"))+'</span><span class="smv-pc-days '+cls+'">'+esc(txt)+'</span></span></button>';
 }).join("");
}
function selectedVenue() { return venues.find(function(v){return String(v.id)===String(selectedId);})||null; }
function fillEditor(v) {
 var form=el("smvPlanCenterForm");if(!form)return;
 form.reset();setMessage("","");
 if(!v){
  selectedId="";el("smvPlanCenterVenueId").value="";el("smvPlanCenterEditorTitle").textContent="Select a venue";el("smvPlanCenterEditorSubtitle").textContent="Plan settings will appear here.";el("smvPlanCenterCurrentStatus").textContent="No selection";el("smvPlanCenterCurrentPlan").innerHTML="<span>Current plan</span><strong>—</strong><small>Select a venue from the list.</small>";el("smvPlanCenterPlanNote").textContent="Select a venue to review or change its assigned plan.";form.querySelectorAll("input,select,button").forEach(function(x){if(x.id!=="smvPlanCenterCancel")x.disabled=true;});renderList();return;
 }
 form.querySelectorAll("input,select,button").forEach(function(x){x.disabled=false;});
 selectedId=String(v.id);el("smvPlanCenterVenueId").value=selectedId;
 el("smvPlanCenterEditorTitle").textContent=v.venue_name||"Unnamed venue";
 el("smvPlanCenterEditorSubtitle").textContent=[v.area,v.city,v.contact_person].filter(Boolean).join(" · ")||"Venue partner";
 var st=el("smvPlanCenterCurrentStatus");st.textContent=niceStatus(v.plan_status||"trialing");st.className="smv-pc-status "+String(v.plan_status||"").toLowerCase();
 var d=dayDiff(v.plan_expires_at),daysText=d===null?"Expiry date not set":d<0?"Expired "+Math.abs(d)+" days ago":d===0?"Expires today":d+" days remaining";
 el("smvPlanCenterCurrentPlan").innerHTML="<span>Current plan</span><strong>"+esc(planName(v.partner_plan||"launch_trial"))+"</strong><small>Started "+esc(niceDate(v.plan_started_at))+" · Expires "+esc(niceDate(v.plan_expires_at))+" · "+esc(daysText)+"</small>";
 el("smvPlanCenterPlan").value=PLAN_NAMES[v.partner_plan]?v.partner_plan:"launch_trial";
 el("smvPlanCenterPlanStatus").value=["trialing","active","expired","paused"].indexOf(String(v.plan_status||"trialing").toLowerCase())>=0?String(v.plan_status||"trialing").toLowerCase():"active";
 el("smvPlanCenterStart").value=dateValue(v.plan_started_at);el("smvPlanCenterExpiry").value=dateValue(v.plan_expires_at);
 el("smvPlanCenterTerm").value=v.plan_term_months==null?"":String(v.plan_term_months);
 el("smvPlanCenterNotifications").checked=v.plan_notifications_enabled!==false;
 el("smvPlanCenterListing").checked=v.public_listing_enabled===true;
 renderPlanNote();renderList();
}
function renderPlanNote() {
 var code=el("smvPlanCenterPlan")?.value||"launch_trial",p=plans.find(function(x){return x.plan_code===code;});
 var pp=prices.filter(function(x){return x.plan_code===code&&x.is_active!==false;}).sort(function(a,b){return Number(a.term_months)-Number(b.term_months);});
 var text=(p&&p.description?p.description+" ":"");
 if(pp.length)text+="Available terms: "+pp.map(function(x){return Number(x.term_months)+" month"+(Number(x.term_months)===1?"":"s")+" — "+money(x.standard_amount,x.currency);}).join(" · ")+". ";
 if(!pp.length)text+="No active price/term is configured for this plan. ";
 text+="Expiry date can be edited manually below; saving here updates only this venue's assigned plan.";
 var n=el("smvPlanCenterPlanNote");if(n)n.textContent=text;
}
function renderCatalog() {
 var host=el("smvPlanCenterCatalog");if(!host)return;
 var codes=["launch_trial","partner","growth","premium"];
 host.innerHTML=codes.map(function(code){
  var p=plans.find(function(x){return x.plan_code===code;})||{plan_code:code,plan_name:planName(code),description:"Plan description not configured",features:[]};
  var pp=prices.filter(function(x){return x.plan_code===code&&x.is_active!==false;}).sort(function(a,b){return Number(a.term_months)-Number(b.term_months);});
  var features=Array.isArray(p.features)?p.features:(p.features&&typeof p.features==="object"?Object.keys(p.features).filter(function(k){return p.features[k];}):[]);
  return '<article class="smv-pc-plan-card"><h4>'+esc(p.plan_name||planName(code))+'</h4><p>'+esc(p.description||"Plan description not configured.")+'</p><div class="smv-pc-price">'+(pp.length?esc(money(pp[0].standard_amount,pp[0].currency)):"Price not configured")+'</div><div class="smv-pc-terms">'+(pp.length?pp.map(function(x){return esc(x.term_months+" month"+(Number(x.term_months)===1?"":"s")+": "+money(x.standard_amount,x.currency));}).join("<br>"):"No active terms configured")+'</div>'+(features.length?'<ul class="smv-pc-feature-list">'+features.slice(0,5).map(function(x){return "<li>"+esc(typeof x==="string"?x:x.label||x.name||JSON.stringify(x))+"</li>";}).join("")+'</ul>':"")+'</article>';
 }).join("");
}
async function loadData() {
 client=getClient();
 var host=el("smvPlanCenterVenueList");if(host)host.innerHTML='<div class="smv-pc-empty">Loading venue plans…</div>';
 if(!client){if(host)host.innerHTML='<div class="smv-pc-empty">CRM database connection is not ready. Refresh and try again.</div>';return;}
 var result=await client.from("venues").select("*").order("venue_name",{ascending:true});
 if(result.error){if(host)host.innerHTML='<div class="smv-pc-empty">Could not load venues: '+esc(result.error.message)+'</div>';return;}
 venues=Array.isArray(result.data)?result.data:[];
 window.SMVAllVenues=venues;
 updateKpis();renderList();
 var current=selectedVenue();if(current)fillEditor(current);else if(venues.length)fillEditor(venues[0]);else fillEditor(null);
 var pr=await Promise.all([
  client.from("venue_plans").select("plan_code,plan_name,description,features,is_active,display_order").order("display_order",{ascending:true}),
  client.from("venue_plan_prices").select("plan_code,term_months,standard_amount,currency,is_active").order("term_months",{ascending:true})
 ]);
 plans=pr[0].error?[]:(pr[0].data||[]).filter(function(x){return x.is_active!==false;});
 prices=pr[1].error?[]:(pr[1].data||[]);
 renderCatalog();renderPlanNote();
}
async function savePlan(e) {
 if(e){e.preventDefault();e.stopPropagation();}
 if(busy)return;
 var v=selectedVenue();if(!v){setMessage("Select a venue before saving.","error");return;}
 var start=el("smvPlanCenterStart").value||null,expiry=el("smvPlanCenterExpiry").value||null,term=el("smvPlanCenterTerm").value;
 var payload={
  partner_plan:el("smvPlanCenterPlan").value,
  plan_status:el("smvPlanCenterPlanStatus").value,
  plan_started_at:start,
  plan_expires_at:expiry,
  plan_term_months:term===""?null:Number(term),
  plan_notifications_enabled:el("smvPlanCenterNotifications").checked,
  public_listing_enabled:el("smvPlanCenterListing").checked
 };
 if(payload.plan_term_months!==null&&(!Number.isInteger(payload.plan_term_months)||payload.plan_term_months<1||payload.plan_term_months>120)){setMessage("Term must be between 1 and 120 months, or leave it blank for a custom period.","error");return;}
 busy=true;var btn=el("smvPlanCenterSave");if(btn){btn.disabled=true;btn.textContent="Saving…";}setMessage("Saving plan changes…","");
 try{
  client=getClient();if(!client)throw new Error("CRM database connection is not ready.");
  var res=await client.from("venues").update(payload).eq("id",v.id).select("*").single();
  if(res.error)throw res.error;
  venues=venues.map(function(x){return String(x.id)===String(v.id)?Object.assign({},x,res.data||payload):x;});
  window.SMVAllVenues=venues;fillEditor(selectedVenue());updateKpis();renderList();
  setMessage("Plan changes saved successfully for "+(v.venue_name||"this venue")+".","success");
 }catch(err){setMessage("Could not save plan changes: "+(err&&err.message?err.message:"Unknown error"),"error");}
 finally{busy=false;if(btn){btn.disabled=false;btn.textContent="Save plan changes";}}
}
function closeCenter() {
 var p=el("smvPlanCenterPanel");if(p){p.hidden=true;p.style.display="none";}
 [".venue-primary-stats",".venue-toolbar",".venue-table-wrapper","#venueEmptyState",".venue-secondary-insights"].forEach(function(q){document.querySelectorAll("#venueManagementSection "+q).forEach(function(x){x.hidden=false;});});
 el("venuePlanCenterBtn")?.classList.remove("is-active");
}
function openCenter() {
 injectStyles();
 var p=el("smvPlanCenterPanel");if(!p)return;
 p.hidden=false;p.style.display="block";
 [".venue-primary-stats",".venue-toolbar",".venue-table-wrapper","#venueEmptyState",".venue-secondary-insights"].forEach(function(q){document.querySelectorAll("#venueManagementSection "+q).forEach(function(x){x.hidden=true;});});
 el("venuePlanCenterBtn")?.classList.add("is-active");
 loadData().catch(function(err){setMessage("Unable to load plan center: "+(err&&err.message||"Unknown error"),"error");});
}
function init() {
 injectStyles();
 el("smvPlanCenterBack")?.addEventListener("click",closeCenter);
 el("smvPlanCenterRefresh")?.addEventListener("click",function(){loadData();});
 el("smvPlanCenterSearch")?.addEventListener("input",renderList);
 el("smvPlanCenterFilter")?.addEventListener("change",renderList);
 el("smvPlanCenterStatusFilter")?.addEventListener("change",renderList);
 el("smvPlanCenterVenueList")?.addEventListener("click",function(e){var b=e.target.closest("[data-pc-venue]");if(!b)return;var v=venues.find(function(x){return String(x.id)===String(b.dataset.pcVenue);});if(v)fillEditor(v);});
 el("smvPlanCenterPlan")?.addEventListener("change",renderPlanNote);
 el("smvPlanCenterForm")?.addEventListener("submit",savePlan);
 el("smvPlanCenterCancel")?.addEventListener("click",function(){fillEditor(selectedVenue());});
 // The static button uses a direct inline handler so opening does not depend on delegated click order.
 addBell();
}
function addBell() {
 var a=document.querySelector(".crm-header-actions");if(!a||el("smvPlanNotificationBell"))return;
 var b=document.createElement("button");b.type="button";b.id="smvPlanNotificationBell";b.className="smv-crm-notification-bell";b.title="Venue plan renewal alerts";b.setAttribute("aria-label","Venue plan renewal alerts");b.innerHTML='🔔<span id="smvPlanNotificationBadge" class="smv-crm-notification-badge" hidden>0</span>';a.insertBefore(b,a.firstElementChild);b.addEventListener("click",function(){showAlerts();});
}
function showAlerts() {
 var due=alerts.slice(),ov=el("smvPlanAlertOverlay");
 if(!ov){ov=document.createElement("div");ov.id="smvPlanAlertOverlay";ov.className="smv-plan-alert-overlay";ov.hidden=true;ov.innerHTML='<div class="smv-plan-alert-card"><div class="smv-plan-alert-head"><button type="button" class="smv-plan-alert-close" id="smvPlanAlertClose">×</button><div class="smv-pc-kicker" style="color:#c4eadf">RENEWAL FOLLOW-UP</div><h3>Venue plan alerts</h3><p>Plans expiring in the next 3 days.</p></div><div class="smv-plan-alert-body" id="smvPlanAlertBody"></div></div>';document.body.appendChild(ov);ov.addEventListener("click",function(e){if(e.target===ov)ov.hidden=true;});ov.querySelector("#smvPlanAlertClose").addEventListener("click",function(){ov.hidden=true;});}
 var body=el("smvPlanAlertBody");
 body.innerHTML=due.length?due.map(function(v){var d=dayDiff(v.plan_expires_at),phone=String(v.contact_mobile||"").replace(/\D/g,"");return '<div class="smv-plan-alert-item"><strong>'+esc(v.venue_name)+'</strong><div class="smv-plan-alert-meta">'+esc(planName(v.partner_plan))+' · Expires '+esc(niceDate(v.plan_expires_at))+' · '+esc(d===0?"today":d+" day(s)")+'</div><div class="smv-plan-alert-actions">'+(phone?'<a href="tel:'+esc(phone)+'">Call venue</a>':"")+'</div></div>';}).join(""):'<div class="smv-pc-empty">No venue plan is currently due for renewal.</div>';
 ov.hidden=false;ov.style.display="flex";
}
async function refreshAlerts() {
 try{
  client=getClient();if(!client)return;
  var r=await client.from("venues").select("id,venue_name,partner_plan,plan_status,plan_started_at,plan_expires_at,contact_mobile,plan_notifications_enabled");
  if(r.error)return;
  alerts=(r.data||[]).map(function(v){v.days=dayDiff(v.plan_expires_at);return v;}).filter(function(v){return v.plan_notifications_enabled!==false&&["active","trialing"].indexOf(String(v.plan_status||"").toLowerCase())>=0&&v.days!==null&&v.days>=0&&v.days<=3;}).sort(function(a,b){return a.days-b.days;});
  var badge=el("smvPlanNotificationBadge");if(badge){badge.textContent=String(alerts.length);badge.hidden=!alerts.length;}
  if(!uid&&client.auth){var au=await client.auth.getUser();uid=au.data&&au.data.user?au.data.user.id:"";}
 }catch(e){}
}
window.SMVPlanCenter={open:openCenter,close:closeCenter,refresh:loadData,save:savePlan};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
setTimeout(refreshAlerts,1200);setInterval(refreshAlerts,300000);
})();