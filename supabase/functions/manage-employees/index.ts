import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
const origin = 'https://crm.selectmyvenue.com';
const headers = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
Deno.serve(async req => {
 const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
 if(req.headers.get('Origin') && req.headers.get('Origin')!==origin) return reply(403,{error:'Origin not allowed'});
 if(req.method==='OPTIONS') return new Response(null,{status:204,headers});
 if(req.method!=='POST') return reply(405,{error:'POST required'});
 const token=(req.headers.get('Authorization')||'').replace(/^Bearer /,'');
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 try {
  const {data:auth,error:authError}=await admin.auth.getUser(token);
  if(authError||!auth.user) return reply(401,{error:'Sign in again'});
  const {data:actor,error:actorError}=await admin.from('staff_profiles').select('role,is_active').eq('user_id',auth.user.id).single();
  if(actorError||actor?.role!=='admin'||!actor.is_active) return reply(403,{error:'Administrator access required'});
  const body=await req.json();
  if(body.action==='list') {
   const {data:rows,error}=await admin.from('staff_profiles').select('user_id,full_name,role,is_active,created_at').eq('role','agent').order('created_at',{ascending:false});
   if(error) throw error;
   const employees=await Promise.all((rows||[]).map(async row=>{
    const {data,error}=await admin.auth.admin.getUserById(row.user_id);
    if(error) throw error;
    return {...row,email:data.user.email,last_sign_in_at:data.user.last_sign_in_at};
   }));
   return reply(200,{employees});
  }
  if(body.action==='create') {
   const name=String(body.full_name||'').trim(),email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
   if(name.length<2||name.length>120||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||password.length<12||password.length>128) return reply(400,{error:'Enter a name, valid email and password of 12–128 characters'});
   // createUser rejects existing emails; never convert existing admin or partner identities.
   const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:name}});
   if(error) return reply(400,{error:error.message});
   const {error:profileError}=await admin.from('staff_profiles').insert({user_id:data.user.id,full_name:name,role:'agent',is_active:true});
   if(profileError) {await admin.auth.admin.deleteUser(data.user.id);throw profileError;}
   return reply(200,{ok:true});
  }
  if(!['activate','deactivate','reset_password'].includes(body.action)) return reply(400,{error:'Unknown action'});
  const {data:employee,error:employeeError}=await admin.from('staff_profiles').select('user_id,role').eq('user_id',body.user_id).single();
  if(employeeError||employee?.role!=='agent'||employee.user_id===auth.user.id) return reply(403,{error:'Only employee accounts can be changed here'});
  if(body.action==='reset_password') {
   const password=String(body.password||'');
   if(password.length<12||password.length>128) return reply(400,{error:'Password must be 12–128 characters'});
   const {error}=await admin.auth.admin.updateUserById(employee.user_id,{password}); if(error) throw error;
  } else {
   const active=body.action==='activate';
   // Database active flag denies existing tokens immediately, even before they expire.
   const {error}=await admin.from('staff_profiles').update({is_active:active}).eq('user_id',employee.user_id).eq('role','agent');if(error) throw error;
  }
  return reply(200,{ok:true});
 } catch(e) {console.error('Employee management:',e instanceof Error?e.message:'Request failed');return reply(400,{error:'Unable to complete request. Check the details and retry.'});}
});
