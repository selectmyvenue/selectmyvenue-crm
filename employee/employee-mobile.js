(function(){
  'use strict';
  const MQ='(max-width:760px)';
  const root=document.documentElement;
  const byId=id=>document.getElementById(id);
  const isPhone=()=>window.matchMedia(MQ).matches;

  function enforceEmployeePhoneLogout(){
    if(!isPhone())return;
    const actions=byId('accountActions');
    const button=byId('logout');
    const header=document.querySelector('.employee-page>header');
    if(!actions||!button||!header||actions.hidden)return;
    button.hidden=false;
    button.removeAttribute('hidden');
    button.style.setProperty('display','inline-flex','important');
    button.style.setProperty('visibility','visible','important');
    button.style.setProperty('opacity','1','important');
    button.style.setProperty('width','72px','important');
    button.style.setProperty('min-width','72px','important');
    button.style.setProperty('max-width','72px','important');
    button.style.setProperty('height','36px','important');
    button.style.setProperty('min-height','36px','important');
    button.style.setProperty('align-items','center','important');
    button.style.setProperty('justify-content','center','important');
    button.style.setProperty('overflow','visible','important');
    actions.style.setProperty('display','flex','important');
    actions.style.setProperty('width','76px','important');
    actions.style.setProperty('max-width','76px','important');
    actions.style.setProperty('overflow','visible','important');
    actions.style.setProperty('justify-content','flex-end','important');
    header.style.setProperty('grid-template-columns','minmax(0,1fr) auto','important');
    header.style.setProperty('overflow','visible','important');
  }

  function ensureNav(){
    let nav=byId('empMobileNav');
    if(!nav){
      nav=document.createElement('nav');
      nav.id='empMobileNav';
      nav.className='emp-mobile-nav';
      nav.setAttribute('aria-label','Employee CRM navigation');
      nav.innerHTML=
        '<button type="button" data-emp-nav="leads" class="active"><span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="3" stroke="currentColor" stroke-width="1.8"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span><b>Enquiries</b></button>'+
        '<button type="button" data-emp-nav="filters"><span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span><b>Filters</b></button>'+
        '<button type="button" data-emp-nav="refresh"><span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M20 11a8 8 0 0 0-14-4L4 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 5v4h4M4 13a8 8 0 0 0 14 4l2-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M20 19v-4h-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span><b>Refresh</b></button>'+
        '<button type="button" data-emp-nav="more"><span aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></span><b>More</b></button>';
      document.body.appendChild(nav);
    }
    let menu=byId('empMobileMore');
    if(!menu){
      menu=document.createElement('div');
      menu.id='empMobileMore';
      menu.className='emp-mobile-more';
      menu.hidden=true;
      menu.innerHTML=
        '<button type="button" data-emp-more="password">🔐 Change password</button>'+
        '<button type="button" data-emp-more="logout" class="danger">↪ Logout</button>';
      document.body.appendChild(menu);
    }
  }

  function addQuickActions(row){
    if(!isPhone()||!row||row.children.length<14)return;
    const first=row.children[0], mobileCell=row.children[1];
    if(!first||first.querySelector('.emp-lead-actions'))return;
    const mobile=(mobileCell?.textContent||'').replace(/[^+0-9]/g,'');
    if(!mobile)return;
    const actions=document.createElement('span');
    actions.className='emp-lead-actions';
    actions.innerHTML='<a class="call emp-3d-icon phone" href="tel:'+mobile+'" aria-label="Call customer" title="Call customer">'+
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7.1 3.5 4.8 4.7c-.8.4-1.2 1.3-1 2.2 1.5 6.1 5.2 10.8 11.3 12.3.9.2 1.8-.2 2.2-1l1.2-2.3-3.1-1.7-1.5 1.4c-2.1-.9-4-2.8-4.9-4.9l1.4-1.5-1.7-3.1Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg></a>'+
      '<a class="whatsapp emp-3d-icon" href="https://wa.me/'+mobile.replace(/^\+/,'')+'" target="_blank" rel="noopener" aria-label="WhatsApp customer" title="WhatsApp customer">'+
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.4a8.6 8.6 0 0 0-7.5 12.8L3.2 20.7l4.7-1.2A8.6 8.6 0 1 0 12 3.4Z" stroke="currentColor" stroke-width="1.7"/><path d="M8.5 8.2c.3-.4.7-.4 1-.1l1.1 1.1c.3.3.3.6 0 1l-.5.6c.7 1.2 1.5 2 2.7 2.7l.6-.5c.3-.3.7-.3 1 0l1.1 1.1c.3.3.3.7-.1 1-1 .8-2.1.6-3.1.1-2.4-1.2-4.3-3.1-5.5-5.5-.5-1-.7-2.1.1-3.1Z" fill="currentColor"/></svg></a>';
    first.appendChild(actions);
  }

  function labels(){
    const table=document.querySelector('#workspace table');
    const body=byId('leadsBody');
    if(!table||!body)return;
    if(!isPhone()){
      body.querySelectorAll('.emp-mobile-toggle,.emp-lead-actions').forEach(x=>x.remove());
      body.querySelectorAll('.emp-mobile-open').forEach(row=>row.classList.remove('emp-mobile-open'));
      return;
    }
    const heads=[...table.querySelectorAll('thead th')].map(x=>(x.textContent||'').trim());
    [...body.querySelectorAll(':scope>tr')].forEach(row=>{
      const cells=[...row.children];
      if(cells.length===1)return;
      cells.forEach((cell,i)=>cell.dataset.empLabel=heads[i]||'');
      const first=cells[0];
      if(first&&!first.querySelector('.emp-mobile-toggle')){
        const b=document.createElement('button');
        b.type='button';b.className='emp-mobile-toggle';b.textContent='More';
        b.setAttribute('aria-expanded','false');first.appendChild(b);
      }
      addQuickActions(row);
    });
  }

  function toggleRow(button){
    const row=button.closest('#leadsBody>tr');
    if(!row)return;
    const open=!row.classList.contains('emp-mobile-open');
    row.classList.toggle('emp-mobile-open',open);
    button.textContent=open?'Less':'More';
    button.setAttribute('aria-expanded',String(open));
  }

  function setActive(key){
    document.querySelectorAll('[data-emp-nav]').forEach(x=>x.classList.toggle('active',x.dataset.empNav===key));
  }
  function closeMore(){const m=byId('empMobileMore');if(m)m.hidden=true;}

  function bind(){
    if(root.dataset.empPhoneBound==='1')return;
    root.dataset.empPhoneBound='1';
    document.addEventListener('click',e=>{
      const toggle=e.target.closest('.emp-mobile-toggle');
      if(toggle){e.preventDefault();e.stopPropagation();toggleRow(toggle);return;}
      const n=e.target.closest('[data-emp-nav]');
      if(n){
        const a=n.dataset.empNav;setActive(a);
        if(a==='leads'){
          document.body.classList.remove('emp-phone-filters-open');closeMore();
          window.scrollTo({top:0,behavior:'smooth'});
        }else if(a==='filters'){
          document.body.classList.toggle('emp-phone-filters-open');closeMore();
          setTimeout(()=>byId('filters')?.scrollIntoView({behavior:'smooth',block:'start'}),30);
        }else if(a==='refresh'){
          byId('refresh')?.click();closeMore();
        }else if(a==='more'){
          const m=byId('empMobileMore');if(m)m.hidden=!m.hidden;
        }
        return;
      }
      const m=e.target.closest('[data-emp-more]');
      if(m){
        if(m.dataset.empMore==='password')byId('passwordButton')?.click();
        if(m.dataset.empMore==='logout')byId('logout')?.click();
        closeMore();
      }
    });
  }

  function observe(){
    const body=byId('leadsBody');
    if(body&&body.dataset.empPhoneWatch!=='1'){
      body.dataset.empPhoneWatch='1';
      new MutationObserver(()=>requestAnimationFrame(labels)).observe(body,{childList:true,subtree:true});
    }
  }

  function install(){
    root.classList.toggle('emp-phone-crm',isPhone());
    ensureNav();labels();bind();observe();
    enforceEmployeePhoneLogout();
    [50,250,700,1500].forEach(ms=>setTimeout(enforceEmployeePhoneLogout,ms));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();

  const mq=window.matchMedia(MQ);
  const sync=()=>{
    root.classList.toggle('emp-phone-crm',mq.matches);
    enforceEmployeePhoneLogout();
    labels();
    if(!mq.matches){closeMore();document.body.classList.remove('emp-phone-filters-open');}
  };
  if(mq.addEventListener)mq.addEventListener('change',sync);else mq.addListener(sync);
})();