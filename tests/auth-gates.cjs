const {JSDOM}=require('jsdom');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'dashboard.html'),'utf8');
const source=fs.readFileSync(path.join(root,'crm-core.js'),'utf8');
const core=source.slice(0,source.indexOf('/* =========================================================\n   START'));
const quiet=()=>{};
(async()=>{
 const dom=new JSDOM(html,{url:'https://crm.selectmyvenue.com/dashboard.html',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 w.console.warn=quiet;w.console.error=quiet;
 w.eval(core+'\nwindow.__authGateTest={setClient(client){supabaseClient=client},check:checkCRMAuth};');
 const api=w.__authGateTest;
 let signOutCalls=0,rpcResult={data:true,error:null};
 const session={access_token:'synthetic-token',user:{id:'synthetic-staff',email:'staff@example.invalid',user_metadata:{full_name:'Synthetic Staff'}}};
 const client={
  auth:{getSession:async()=>({data:{session},error:null}),signOut:async()=>{signOutCalls++;return {error:null}}},
  rpc:async name=>{assert.equal(name,'smv_is_active_staff');return rpcResult;}
 };
 api.setClient(client);
 assert.equal(await api.check(),session);
 assert.equal(w.document.getElementById('staffName').textContent,'Synthetic Staff');
 assert.equal(signOutCalls,0);
 console.log('PASS master CRM accepts a session only after active-staff RPC approval');

 rpcResult={data:false,error:null};
 assert.equal(await api.check(),null);
 assert.equal(signOutCalls,1,'A signed-in non-staff user must be signed out');
 console.log('PASS master CRM denies a signed-in user when active-staff verification returns false');

 signOutCalls=0;rpcResult={data:null,error:{message:'synthetic network failure'}};
 assert.equal(await api.check(),null);
 assert.equal(signOutCalls,0,'A transient verification error must not force sign-out/login loop');
 assert(w.document.body.textContent.includes('Unable to verify CRM access'));
 console.log('PASS master CRM preserves session on transient staff-verification error and surfaces a retry message');

 dom.window.close();
})().catch(error=>{console.error(error);process.exitCode=1;});
