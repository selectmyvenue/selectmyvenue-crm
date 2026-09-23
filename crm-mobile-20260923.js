(function(){
  const MOBILE='(max-width:760px)';

  function labelTable(table){
    if(!table)return;
    const headers=[...table.querySelectorAll('thead th')].map(th=>(th.textContent||'').trim());
    table.querySelectorAll('tbody tr').forEach(row=>{
      const cells=[...row.children];
      if(cells.length===1&&cells[0].hasAttribute('colspan'))return;
      cells.forEach((cell,index)=>{
        const label=headers[index]||'';
        if(label)cell.dataset.smvLabel=label;
      });
    });
  }

  function labelAll(){
    labelTable(document.querySelector('.leads-table'));
    labelTable(document.querySelector('.venue-table'));
  }

  function ensureMobileNav(){
    if(document.getElementById('smvMobileNav'))return;
    const nav=document.createElement('nav');
    nav.id='smvMobileNav';
    nav.className='smv-mobile-nav';
    nav.setAttribute('aria-label','CRM mobile navigation');
    nav.innerHTML=
      '<button type="button" data-smv-mobile="leads"><span>☷</span>Leads</button>'+
      '<button type="button" data-smv-mobile="venues"><span>🏨</span>Venues</button>'+
      '<button type="button" class="smv-mobile-primary" data-smv-mobile="add"><span>＋</span><b>Add</b></button>';
    document.body.appendChild(nav);

    nav.addEventListener('click',event=>{
      const button=event.target.closest('[data-smv-mobile]');
      if(!button)return;
      const action=button.dataset.smvMobile;
      const venueSection=document.getElementById('venueManagementSection');
      const venueOpen=venueSection&&!venueSection.hidden;

      if(action==='leads'){
        document.getElementById('backToLeadsBtn')?.click();
        window.scrollTo({top:0,behavior:'smooth'});
      }
      if(action==='venues'){
        document.getElementById('venueManagementBtn')?.click();
        window.scrollTo({top:0,behavior:'smooth'});
      }
      if(action==='add'){
        if(venueOpen)document.getElementById('addVenueBtn')?.click();
        else document.getElementById('addEnquiryBtn')?.click();
      }
      setTimeout(syncMobileNav,80);
    });
  }

  function syncMobileNav(){
    const nav=document.getElementById('smvMobileNav');
    if(!nav)return;
    const venueSection=document.getElementById('venueManagementSection');
    const venueOpen=venueSection&&!venueSection.hidden;
    nav.querySelector('[data-smv-mobile="leads"]')?.classList.toggle('active',!venueOpen);
    nav.querySelector('[data-smv-mobile="venues"]')?.classList.toggle('active',venueOpen);
    const add=nav.querySelector('[data-smv-mobile="add"] b');
    if(add)add.textContent=venueOpen?'Add Venue':'Add Lead';
  }

  function watchRows(){
    ['leadsTableBody','venueTableBody'].forEach(id=>{
      const body=document.getElementById(id);
      if(!body||body.dataset.smvMobileWatch==='1')return;
      body.dataset.smvMobileWatch='1';
      new MutationObserver(()=>requestAnimationFrame(labelAll))
        .observe(body,{childList:true,subtree:true});
    });
  }

  function watchViews(){
    const venue=document.getElementById('venueManagementSection');
    if(venue&&venue.dataset.smvMobileViewWatch!=='1'){
      venue.dataset.smvMobileViewWatch='1';
      new MutationObserver(syncMobileNav)
        .observe(venue,{attributes:true,attributeFilter:['hidden']});
    }
  }

  function install(){
    ensureMobileNav();
    labelAll();
    watchRows();
    watchViews();
    syncMobileNav();
    document.documentElement.classList.toggle('smv-phone-crm',matchMedia(MOBILE).matches);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();

  const mq=matchMedia(MOBILE);
  const onChange=()=>document.documentElement.classList.toggle('smv-phone-crm',mq.matches);
  if(mq.addEventListener)mq.addEventListener('change',onChange);
  else mq.addListener(onChange);
})();

/* =========================================================
   SMV MOBILE APP UI V2 — 2026-09-23
   Phone-first master CRM inspired by a compact lead app.
   Desktop behaviour is untouched.
   ========================================================= */
(function(){
  const MOBILE='(max-width:760px)';
  const root=document.documentElement;

  function isPhone(){
    return window.matchMedia(MOBILE).matches;
  }

  function ensureWelcome(){
    const brandText=document.querySelector('.crm-brand-text');
    if(!brandText)return null;
    let welcome=document.getElementById('smvPhoneWelcome');
    if(!welcome){
      welcome=document.createElement('span');
      welcome.id='smvPhoneWelcome';
      welcome.className='smv-phone-welcome';
      brandText.appendChild(welcome);
    }
    return welcome;
  }

  function syncWelcome(){
    const welcome=ensureWelcome();
    const staff=document.getElementById('staffName');
    if(!welcome)return;
    const name=(staff?.textContent||'').trim();
    welcome.textContent=name&&name!=='Employee'?'Welcome, '+name:'Master CRM';
  }

  function ensureLeadToolbar(){
    const section=document.querySelector('.leads-section');
    const filter=document.querySelector('.leads-section .filter-bar');
    if(!section||!filter)return;
    if(document.getElementById('smvPhoneLeadToolbar'))return;

    const toolbar=document.createElement('div');
    toolbar.id='smvPhoneLeadToolbar';
    toolbar.className='smv-phone-lead-toolbar';
    toolbar.innerHTML=
      '<div class="smv-phone-lead-title">'+
        '<strong>Customer Enquiries</strong>'+
        '<span>Total <b id="smvPhoneLeadCount">0</b> enquiries</span>'+
      '</div>'+
      '<div class="smv-phone-lead-actions">'+
        '<button type="button" class="smv-phone-add" data-smv-phone-action="add-lead" aria-label="Add enquiry">＋</button>'+
        '<button type="button" class="smv-phone-filter" data-smv-phone-action="filters" aria-expanded="false"><span>⌄</span> Filter</button>'+
      '</div>';
    section.insertBefore(toolbar,filter);
  }

  function ensureMoreMenu(){
    if(document.getElementById('smvMobileMoreMenu'))return;
    const menu=document.createElement('div');
    menu.id='smvMobileMoreMenu';
    menu.className='smv-mobile-more-menu';
    menu.hidden=true;
    menu.innerHTML=
      '<div class="smv-mobile-more-head"><strong>CRM Menu</strong><button type="button" data-smv-more="close" aria-label="Close menu">×</button></div>'+
      '<button type="button" data-smv-more="leads"><span>☷</span><b>Customer Enquiries</b></button>'+
      '<button type="button" data-smv-more="venues"><span>🏨</span><b>Venue Management</b></button>'+
      '<button type="button" data-smv-more="refresh"><span>↻</span><b>Refresh Data</b></button>'+
      '<button type="button" data-smv-more="password"><span>🔐</span><b>Change Password</b></button>'+
      '<button type="button" data-smv-more="logout" class="danger"><span>↪</span><b>Logout</b></button>';
    document.body.appendChild(menu);
  }

  function upgradeMobileNav(){
    const nav=document.getElementById('smvMobileNav');
    if(!nav||nav.dataset.smvV2==='1')return;
    nav.dataset.smvV2='1';
    nav.innerHTML=
      '<button type="button" data-smv-mobile="leads"><span>☷</span><b>Enquiries</b></button>'+
      '<button type="button" data-smv-mobile="venues"><span>🏨</span><b>Venues</b></button>'+
      '<button type="button" class="smv-mobile-primary" data-smv-mobile="add"><span>＋</span><b>Add</b></button>'+
      '<button type="button" data-smv-mobile="more"><span>•••</span><b>More</b></button>';
  }

  function labelTable(table){
    if(!table)return;
    const headers=[...table.querySelectorAll('thead th')].map(th=>(th.textContent||'').trim());
    table.querySelectorAll('tbody tr').forEach(row=>{
      const cells=[...row.children].filter(el=>el.tagName==='TD');
      if(cells.length===1&&cells[0].hasAttribute('colspan'))return;
      cells.forEach((cell,index)=>{
        const label=headers[index]||'';
        if(label)cell.dataset.smvLabel=label;
      });
    });
  }

  function decorateLeadRows(){
    const table=document.querySelector('.leads-table');
    if(!table)return;
    labelTable(table);
    table.querySelectorAll('tbody tr').forEach(row=>{
      const cells=[...row.children].filter(el=>el.tagName==='TD');
      if(cells.length<=1)return;
      row.classList.add('smv-phone-lead-row');
      if(!row.hasAttribute('aria-expanded'))row.setAttribute('aria-expanded','false');
      const first=cells[0];
      if(first&&!first.querySelector('.smv-lead-expand')){
        const button=document.createElement('button');
        button.type='button';
        button.className='smv-lead-expand';
        button.setAttribute('aria-label','Expand enquiry details');
        button.setAttribute('aria-expanded','false');
        button.innerHTML='<span aria-hidden="true">⌄</span>';
        first.appendChild(button);
      }
    });
  }

  function decorateVenueRows(){
    labelTable(document.querySelector('.venue-table'));
  }

  function setLeadExpanded(row,expanded){
    if(!row)return;
    row.classList.toggle('smv-expanded',expanded);
    row.setAttribute('aria-expanded',String(expanded));
    const button=row.querySelector('.smv-lead-expand');
    if(button){
      button.setAttribute('aria-expanded',String(expanded));
      button.setAttribute('aria-label',expanded?'Collapse enquiry details':'Expand enquiry details');
    }
  }

  function syncLeadCount(){
    const target=document.getElementById('smvPhoneLeadCount');
    const source=document.getElementById('totalCount');
    if(target&&source)target.textContent=(source.textContent||'0').trim()||'0';
  }

  function venueOpen(){
    const section=document.getElementById('venueManagementSection');
    return !!(section&&!section.hidden);
  }

  function closeMore(){
    const menu=document.getElementById('smvMobileMoreMenu');
    if(menu)menu.hidden=true;
    document.getElementById('smvMobileNav')?.querySelector('[data-smv-mobile="more"]')?.classList.remove('active');
  }

  function toggleMore(){
    ensureMoreMenu();
    const menu=document.getElementById('smvMobileMoreMenu');
    if(!menu)return;
    menu.hidden=!menu.hidden;
    document.getElementById('smvMobileNav')?.querySelector('[data-smv-mobile="more"]')?.classList.toggle('active',!menu.hidden);
  }

  function syncMobileNavV2(){
    upgradeMobileNav();
    const nav=document.getElementById('smvMobileNav');
    if(!nav)return;
    const open=venueOpen();
    nav.querySelector('[data-smv-mobile="leads"]')?.classList.toggle('active',!open);
    nav.querySelector('[data-smv-mobile="venues"]')?.classList.toggle('active',open);
    const addLabel=nav.querySelector('[data-smv-mobile="add"] b');
    if(addLabel)addLabel.textContent=open?'Add Venue':'Add';
  }

  function toggleFilters(){
    const next=!root.classList.contains('smv-phone-filters-open');
    root.classList.toggle('smv-phone-filters-open',next);
    const button=document.querySelector('[data-smv-phone-action="filters"]');
    if(button)button.setAttribute('aria-expanded',String(next));
  }

  function handleMoreAction(action){
    if(action==='close'){closeMore();return;}
    if(action==='leads'){
      document.getElementById('backToLeadsBtn')?.click();
      closeMore();
      window.scrollTo({top:0,behavior:'smooth'});
      return;
    }
    if(action==='venues'){
      document.getElementById('venueManagementBtn')?.click();
      closeMore();
      window.scrollTo({top:0,behavior:'smooth'});
      return;
    }
    if(action==='refresh'){
      if(venueOpen())document.getElementById('refreshVenuesBtn')?.click();
      else document.getElementById('refreshBtn')?.click();
      closeMore();
      return;
    }
    if(action==='password'){
      window.location.href='change-password.html';
      return;
    }
    if(action==='logout'){
      document.getElementById('logoutBtn')?.click();
    }
  }

  function bindEvents(){
    if(document.documentElement.dataset.smvMobileV2Bound==='1')return;
    document.documentElement.dataset.smvMobileV2Bound='1';

    document.addEventListener('click',event=>{
      const phoneAction=event.target.closest('[data-smv-phone-action]');
      if(phoneAction){
        const action=phoneAction.dataset.smvPhoneAction;
        if(action==='add-lead')document.getElementById('addEnquiryBtn')?.click();
        if(action==='filters')toggleFilters();
        return;
      }

      const moreAction=event.target.closest('[data-smv-more]');
      if(moreAction){
        handleMoreAction(moreAction.dataset.smvMore);
        return;
      }

      const mobileMore=event.target.closest('[data-smv-mobile="more"]');
      if(mobileMore){
        event.preventDefault();
        toggleMore();
        return;
      }

      const toggle=event.target.closest('.smv-lead-expand');
      if(toggle){
        event.preventDefault();
        event.stopPropagation();
        const row=toggle.closest('.smv-phone-lead-row');
        setLeadExpanded(row,!row?.classList.contains('smv-expanded'));
        return;
      }

      if(isPhone()){
        const row=event.target.closest('.smv-phone-lead-row');
        const cell=event.target.closest('td');
        if(row&&cell&&!event.target.closest('button,a,input,select,textarea,label')){
          const cells=[...row.children].filter(el=>el.tagName==='TD');
          const index=cells.indexOf(cell);
          if(index===0||index===1||index===9){
            setLeadExpanded(row,!row.classList.contains('smv-expanded'));
          }
        }
      }

      const menu=document.getElementById('smvMobileMoreMenu');
      if(menu&&!menu.hidden&&!event.target.closest('#smvMobileMoreMenu')&&!event.target.closest('[data-smv-mobile="more"]')){
        closeMore();
      }
    });
  }

  function observe(){
    const leadBody=document.getElementById('leadsTableBody');
    if(leadBody&&leadBody.dataset.smvV2Watch!=='1'){
      leadBody.dataset.smvV2Watch='1';
      new MutationObserver(()=>{
        requestAnimationFrame(()=>{
          decorateLeadRows();
          syncLeadCount();
        });
      }).observe(leadBody,{childList:true,subtree:true});
    }

    const venueBody=document.getElementById('venueTableBody');
    if(venueBody&&venueBody.dataset.smvV2Watch!=='1'){
      venueBody.dataset.smvV2Watch='1';
      new MutationObserver(()=>requestAnimationFrame(decorateVenueRows))
        .observe(venueBody,{childList:true,subtree:true});
    }

    const total=document.getElementById('totalCount');
    if(total&&total.dataset.smvV2Watch!=='1'){
      total.dataset.smvV2Watch='1';
      new MutationObserver(syncLeadCount).observe(total,{childList:true,subtree:true,characterData:true});
    }

    const staff=document.getElementById('staffName');
    if(staff&&staff.dataset.smvV2Watch!=='1'){
      staff.dataset.smvV2Watch='1';
      new MutationObserver(syncWelcome).observe(staff,{childList:true,subtree:true,characterData:true});
    }

    const venue=document.getElementById('venueManagementSection');
    if(venue&&venue.dataset.smvV2Watch!=='1'){
      venue.dataset.smvV2Watch='1';
      new MutationObserver(()=>{
        root.classList.remove('smv-phone-filters-open');
        closeMore();
        syncMobileNavV2();
      }).observe(venue,{attributes:true,attributeFilter:['hidden']});
    }
  }

  function install(){
    ensureLeadToolbar();
    ensureMoreMenu();
    upgradeMobileNav();
    syncWelcome();
    decorateLeadRows();
    decorateVenueRows();
    syncLeadCount();
    syncMobileNavV2();
    bindEvents();
    observe();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();

  window.addEventListener('resize',()=>{
    if(!isPhone()){
      root.classList.remove('smv-phone-filters-open');
      closeMore();
    }
  });
})();
