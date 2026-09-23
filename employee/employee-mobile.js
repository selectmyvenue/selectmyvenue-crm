(function(){
  const MQ='(max-width:760px)';
  const root=document.documentElement;
  const byId=id=>document.getElementById(id);
  const isPhone=()=>matchMedia(MQ).matches;

  function ensureNav(){
    let nav=byId('empMobileNav');
    if(!nav){
      nav=document.createElement('nav');
      nav.id='empMobileNav';
      nav.className='emp-mobile-nav';
      nav.innerHTML=
        '<button type="button" data-emp-nav="leads" class="active"><span>☷</span><b>Enquiries</b></button>'+
        '<button type="button" data-emp-nav="filters"><span>⌕</span><b>Filters</b></button>'+
        '<button type="button" data-emp-nav="refresh"><span>↻</span><b>Refresh</b></button>'+
        '<button type="button" data-emp-nav="more"><span>•••</span><b>More</b></button>';
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

  function labels(){
    const table=document.querySelector('#workspace table');
    const body=byId('leadsBody');
    if(!table||!body)return;
    const heads=[...table.querySelectorAll('thead th')].map(x=>(x.textContent||'').trim());
    [...body.querySelectorAll(':scope>tr')].forEach(row=>{
      const cells=[...row.children];
      if(cells.length===1)return;
      cells.forEach((cell,i)=>cell.dataset.empLabel=heads[i]||'');
      const first=cells[0];
      if(first&&!first.querySelector('.emp-mobile-toggle')){
        const b=document.createElement('button');
        b.type='button';
        b.className='emp-mobile-toggle';
        b.textContent='More';
        b.setAttribute('aria-expanded','false');
        first.appendChild(b);
      }
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

  function closeMore(){
    const m=byId('empMobileMore');
    if(m)m.hidden=true;
  }

  function bind(){
    if(root.dataset.empPhoneBound==='1')return;
    root.dataset.empPhoneBound='1';
    document.addEventListener('click',e=>{
      const toggle=e.target.closest('.emp-mobile-toggle');
      if(toggle){e.preventDefault();e.stopPropagation();toggleRow(toggle);return;}
      const n=e.target.closest('[data-emp-nav]');
      if(n){
        const a=n.dataset.empNav;
        if(a==='leads'){document.body.classList.remove('emp-phone-filters-open');closeMore();scrollTo({top:0,behavior:'smooth'});}
        if(a==='filters'){document.body.classList.toggle('emp-phone-filters-open');closeMore();setTimeout(()=>byId('filters')?.scrollIntoView({behavior:'smooth',block:'start'}),30);}
        if(a==='refresh'){byId('refresh')?.click();closeMore();}
        if(a==='more'){const m=byId('empMobileMore');if(m)m.hidden=!m.hidden;}
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
    ensureNav();
    labels();
    bind();
    observe();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  const mq=matchMedia(MQ);
  const sync=()=>root.classList.toggle('emp-phone-crm',mq.matches);
  if(mq.addEventListener)mq.addEventListener('change',sync);else mq.addListener(sync);
})();