const {JSDOM}=require('jsdom');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const script=fs.readFileSync(path.join(root,'smv-business-intelligence.js'),'utf8');
const css=fs.readFileSync(path.join(root,'smv-business-intelligence.css'),'utf8');
const html=fs.readFileSync(path.join(root,'dashboard.html'),'utf8');
const enhancements=fs.readFileSync(path.join(root,'crm-enhancements.js'),'utf8');
assert(html.includes('smv-business-intelligence.js'),'dashboard loads Business Intelligence module');
assert(html.includes('smv-business-intelligence.css'),'dashboard loads Business Intelligence styling');
assert(enhancements.includes('.from("lead_followups")'),'Customer 360 timeline includes follow-up records');
for(const milestone of ['Partner viewed enquiry','Partner contacted customer','Partner follow-up due','Partner site visit','Venue booking recorded'])assert(enhancements.includes(milestone),'Customer 360 includes '+milestone+' milestone');
assert(css.includes('#smvBusinessIntelligence[hidden]'),'hidden analytics panel cannot occupy lead workspace');
const nowIso=new Date().toISOString(),pastIso=new Date(Date.now()-48*3600000).toISOString(),yesterdayIso=new Date(Date.now()-86400000).toISOString();
const leads=[
 {id:1,status:'new',assigned_to:'u1',created_at:nowIso,source:'Meta Ads',follow_up_at:yesterdayIso,contact_count:0},
 {id:2,status:'booked',assigned_to:'u1',created_at:nowIso,source:'Website',follow_up_at:null,contact_count:2},
 {id:3,status:'interested',assigned_to:null,created_at:new Date(Date.now()-3*86400000).toISOString(),source:'Meta Ads',follow_up_at:yesterdayIso,contact_count:1}
];
const datasets={
 customer_enquiries:leads,
 crm_activity_log:[{id:1,created_by:'u1',created_at:new Date().toISOString()}],
 staff_profiles:[{user_id:'u1',full_name:'Test Executive',role:'agent',is_active:true}],
 venue_billing_records:[{id:'b1',status:'paid',amount:12000,total_amount:12000,created_at:new Date().toISOString(),plan_name:'Partner'}],
 venues:[{id:'v1',venue_name:'Test Venue',plan_status:'active',plan_expires_at:null}],
 hr_people:[{id:'p1',employment_status:'active'}],
 hr_onboarding_tasks:[],hr_documents:[],hr_activity_log:[],
 lead_followups:[
  {id:1,enquiry_id:1,staff_user_id:'u1',follow_up_at:yesterdayIso,created_at:nowIso},
  {id:2,enquiry_id:2,staff_user_id:'u1',follow_up_at:nowIso,created_at:nowIso}
 ],
 venue_enquiry_assignments:[
  {id:'a1',enquiry_id:101,venue_id:'v1',assignment_status:'assigned',assigned_at:pastIso,first_viewed_at:null,first_contacted_at:null,follow_up_at:null},
  {id:'a2',enquiry_id:102,venue_id:'v2',assignment_status:'viewed',assigned_at:pastIso,first_viewed_at:pastIso,first_contacted_at:null,follow_up_at:null},
  {id:'a3',enquiry_id:103,venue_id:'v3',assignment_status:'contacted',assigned_at:pastIso,first_viewed_at:pastIso,first_contacted_at:pastIso,follow_up_at:yesterdayIso},
  {id:'a4',enquiry_id:104,venue_id:'v4',assignment_status:'booked',assigned_at:pastIso,first_viewed_at:pastIso,first_contacted_at:pastIso,follow_up_at:null,converted_at:nowIso}
 ]
};
function query(table){const q={select(){return q},order(){return q},limit(){return q},eq(){return q},then(resolve){return Promise.resolve({data:datasets[table]||[],error:null}).then(resolve)}};return q;}
const dom=new JSDOM('<!doctype html><html><body><nav class="crm-top-nav"><button id="crmLeadManagementBtn" class="crm-nav-item active">Leads</button><button id="venueManagementBtn" class="crm-nav-item">Venues</button></nav><main class="crm-main"><div id="leadWorkViews"><button data-work-view="overdue">Overdue</button><button data-work-view="unassigned">Unassigned</button><button data-work-view="new">New</button></div></main><section id="venueManagementSection" hidden></section></body></html>',{url:'https://crm.selectmyvenue.com/dashboard.html',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
w.getSupabaseClient=()=>({from:query,rpc:async()=>({data:true,error:null})});
w.openLeadModal=id=>{w.lastOpenedLeadId=String(id);};
w.HTMLElement.prototype.scrollIntoView=function(){};
w.eval(script);
d.dispatchEvent(new w.Event('DOMContentLoaded'));
assert.equal(d.getElementById('smvBusinessIntelligenceBtn'),null,'Business Intelligence is not injected into the header');
assert(w.SMVBusinessIntelligence&&typeof w.SMVBusinessIntelligence.open==='function','Business Intelligence exposes an Account-callable open action');
w.SMVBusinessIntelligence.open();
const panel=d.getElementById('smvBusinessIntelligence');
assert(panel&&!panel.hidden,'BI panel opens without replacing existing lead/venue sections');
const wait=()=>new Promise(r=>setTimeout(r,20));
(async()=>{
 await wait();await wait();
 assert.equal(d.querySelectorAll('#smvBiKpis .smv-bi-kpi').length,6,'six executive KPIs render');
 assert(d.getElementById('smvBiTeam').textContent.includes('Test Executive'),'team analytics renders staff');
 assert(d.getElementById('smvBiTeam').textContent.includes('Conv.'),'team analytics exposes conversion rate');
 assert(d.getElementById('smvBiTeam').textContent.includes('50%'),'team analytics calculates owner conversion from period leads');
 assert(d.getElementById('smvBiTeam').textContent.includes('Follow-ups'),'team analytics includes scheduled follow-up history');
 assert(d.getElementById('smvBiTeam').textContent.includes('Overdue'),'team analytics includes current overdue follow-ups');
 assert(d.getElementById('smvBiPartner').textContent.includes('No view recorded'),'partner response panel exposes missing-view SLA signals');
 assert(d.getElementById('smvBiPartner').textContent.includes('Viewed, no contact'),'partner response panel exposes viewed-without-contact signals');
 assert(d.getElementById('smvBiPartner').textContent.includes('Past-due partner follow-ups'),'partner response panel exposes overdue partner follow-ups');
 assert(d.getElementById('smvBiBilling').textContent.includes('12,000'),'billing totals render from existing ledger');
 assert(d.getElementById('smvBiHr').textContent.includes('Active team'),'HR metrics render when policy allows');
 assert(d.getElementById('smvBiMarketing').textContent.includes('Meta Ads'),'marketing source report renders');
 assert(d.getElementById('smvBiActions').textContent.includes('overdue follow-ups'),'automation action centre detects overdue work');
 const partnerReview=d.querySelector('#smvBiActions [data-bi-action="partnerPending"]');
 assert(partnerReview,'automation action centre offers partner response review');
 partnerReview.click();
 assert.equal(w.lastOpenedLeadId,'101','partner review opens the oldest affected customer enquiry');
 d.getElementById('crmLeadManagementBtn').click();
 assert.equal(panel.hidden,true,'returning to leads hides BI panel');
 assert.equal(d.querySelector('.crm-main').hidden,false,'lead workspace is restored');
 console.log('PASS Business Intelligence navigation, live KPI rendering, team, billing, HR, marketing and safe automation actions');
})().catch(e=>{console.error(e);process.exitCode=1;});
