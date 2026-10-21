const {JSDOM}=require('jsdom');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'dashboard.html'),'utf8');
const dom=new JSDOM(html,{url:'https://crm.selectmyvenue.com/dashboard.html',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
w.alert=()=>{};
w.allLeads=[];
w.allVenueAssignments=[];
w.allVenues=[];
w.indiaDay=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);};
w.getSupabaseClient=()=>null;
// Supply the heading slot the Action Center mounts into; this test focuses on its behaviour, not the dashboard's page layout.
const heading=d.createElement('div');heading.className='page-heading';heading.innerHTML='<div class="heading-actions"></div>';d.body.prepend(heading);
w.eval(fs.readFileSync(path.join(root,'crm-enhancements.js'),'utf8'));
const old=new Date(Date.now()-45*60*1000).toISOString();
w.allLeads=[
 {id:'owner-missing',customer_name:'Unowned active lead',mobile:'9876543210',status:'new',created_at:old,assigned_to:null},
 {id:'owner-present',customer_name:'Owned active lead',mobile:'9876543211',status:'contacted',created_at:old,assigned_to:'staff-1',follow_up_at:new Date(Date.now()+60*60*1000).toISOString()},
 {id:'missing-followup',customer_name:'Lead missing next action',mobile:'9876543212',status:'interested',created_at:old,assigned_to:'staff-1',follow_up_at:null},
 {id:'terminal',customer_name:'Closed lead',status:'closed',created_at:old,assigned_to:null}
];
d.getElementById('smvActionCenterBtn').click();
const body=d.getElementById('smvOpsBody');
assert(body,'Action Center body should render');
assert(body.textContent.includes('No Staff Owner'),'Action Center should show the staff ownership KPI');
assert(body.textContent.includes('Unowned active lead'),'Unowned active leads should appear in the priority queue');
assert(body.textContent.includes('Lead missing next action'),'Active leads missing a follow-up should appear in the priority queue');
assert(!body.textContent.includes('Closed lead'),'Terminal leads should not appear in the active priority queue');
const kpi=[...body.querySelectorAll('.smv-ops-kpi')].find(el=>el.textContent.includes('No Staff Owner'));
assert(kpi,'No Staff Owner KPI should exist');
assert.equal(kpi.querySelector('strong')?.textContent,'1','Only active leads without assigned_to should be counted');
const followUpKpi=[...body.querySelectorAll('.smv-ops-kpi')].find(el=>el.textContent.includes('Missing Follow-up'));
assert(followUpKpi,'Missing Follow-up KPI should exist');
assert.equal(followUpKpi.querySelector('strong')?.textContent,'1','Only active in-progress leads without a scheduled follow-up should be counted');
dom.window.close();
console.log('PASS Action Center highlights active leads without staff ownership (synthetic data only).');
