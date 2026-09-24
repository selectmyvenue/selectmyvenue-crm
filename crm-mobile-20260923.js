/* =========================================================
   SELECT MY VENUE CRM — PHONE UI V3
   Dedicated phone UI. Desktop CRM remains unchanged.
   ========================================================= */
(function(){
  const PHONE='(max-width:760px)';
  const root=document.documentElement;

  function isPhone(){
    return window.matchMedia(PHONE).matches;
  }

  function escapeHTML(value){
    return String(value ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function cleanText(node){
    if(!node)return '';
    return (node.innerText || node.textContent || '')
      .replace(/\s+/g,' ')
      .trim();
  }

  function ensurePhoneHeader(){
    const brand=document.querySelector('.crm-brand');
    if(!brand)return;

    let meta=document.getElementById('smvPhoneBrandMeta');
    if(!meta){
      meta=document.createElement('div');
      meta.id='smvPhoneBrandMeta';
      meta.className='smv-phone-brand-meta';
      meta.innerHTML='<strong>Select My Venue CRM</strong><span id="smvPhoneWelcome">Master CRM</span>';
      brand.appendChild(meta);
    }
    syncWelcome();
  }

  function syncWelcome(){
    const target=document.getElementById('smvPhoneWelcome');
    const staff=document.getElementById('staffName');
    if(!target)return;
    const name=cleanText(staff);
    target.textContent=name && name!=='Employee' ? 'Welcome, '+name : 'Customer enquiry workspace';
  }

  function ensureLeadToolbar(){
    const section=document.querySelector('.leads-section');
    const filter=document.querySelector('.leads-section .filter-bar');
    if(!section || !filter || document.getElementById('smvPhoneLeadToolbar'))return;

    const toolbar=document.createElement('div');
    toolbar.id='smvPhoneLeadToolbar';
    toolbar.className='smv-phone-lead-toolbar';
    toolbar.innerHTML=
      '<div class="smv-phone-lead-title">'+
        '<strong>Customer Enquiries</strong>'+
        '<span><b id="smvPhoneLeadCount">0</b> enquiries</span>'+
      '</div>'+
      '<div class="smv-phone-lead-actions">'+
        '<button type="button" class="smv-phone-add" data-smv-phone-action="add-lead" aria-label="Add enquiry">＋</button>'+
        '<button type="button" class="smv-phone-filter" data-smv-phone-action="filters" aria-expanded="false">'+
          '<span aria-hidden="true">⌄</span><b>Filter</b>'+
        '</button>'+
      '</div>';
    section.insertBefore(toolbar,filter);
  }

  function ensureMobileList(){
    const wrapper=document.querySelector('.table-wrapper');
    if(!wrapper)return null;
    let list=document.getElementById('smvMobileLeadList');
    if(!list){
      list=document.createElement('div');
      list.id='smvMobileLeadList';
      list.className='smv-mobile-lead-list';
      wrapper.parentNode.insertBefore(list,wrapper);
    }
    return list;
  }

  function statusKey(text){
    return String(text || 'new').toLowerCase().replace(/\s+/g,'-');
  }

  function detailItem(label,value){
    const safe=String(value || '').trim();
    if(!safe || safe==='—' || safe==='-')return '';
    return '<div class="smv-mobile-detail-item"><span>'+escapeHTML(label)+'</span><strong>'+escapeHTML(safe)+'</strong></div>';
  }

  function buildCard(row,index){
    const cells=[...row.children].filter(el=>el.tagName==='TD');
    if(cells.length<=1)return '';

    const name=cleanText(cells[0]) || 'Unnamed enquiry';
    const phone=cleanText(cells[1]) || 'No phone';
    const created=cleanText(cells[2]);
    const venueArea=cleanText(cells[3]);
    const source=cleanText(cells[4]);
    const event=cleanText(cells[5]);
    const eventDate=cleanText(cells[6]);
    const guests=cleanText(cells[7]);
    const location=cleanText(cells[8]);
    const status=cleanText(cells[9]) || 'New';
    const comment=cleanText(cells[10]);
    const viewButton=row.querySelector('[data-action="view"],.view-lead-btn');
    const assignButton=row.querySelector('[data-action="assign-venue"],.venue-assign-btn');
    const leadId=(viewButton?.dataset.id || assignButton?.dataset.id || row.dataset.id || ('row-'+index));
    const assignCount=cleanText(assignButton?.querySelector('.venue-assignment-count'));

    const details=[
      detailItem('Venue / Area',venueArea),
      detailItem('Location',location),
      detailItem('Event',event),
      detailItem('Event date',eventDate),
      detailItem('Guests',guests),
      detailItem('Source',source),
      detailItem('Created',created),
      detailItem('Comment',comment)
    ].join('');

    return ''+
      '<article class="smv-mobile-lead-card" data-lead-id="'+escapeHTML(leadId)+'">'+
        '<button type="button" class="smv-mobile-lead-summary" data-smv-card-toggle aria-expanded="false">'+
          '<span class="smv-mobile-lead-person">'+
            '<strong>'+escapeHTML(name)+'</strong>'+
            '<span>'+escapeHTML(phone)+'</span>'+
          '</span>'+
          '<span class="smv-mobile-lead-state">'+
            '<span class="smv-mobile-status" data-status="'+escapeHTML(statusKey(status))+'">'+escapeHTML(status)+'</span>'+
            '<span class="smv-mobile-chevron" aria-hidden="true">⌄</span>'+
          '</span>'+
        '</button>'+
        '<div class="smv-mobile-lead-details" hidden>'+
          '<div class="smv-mobile-detail-grid">'+(details || '<div class="smv-mobile-detail-empty">No additional details available.</div>')+'</div>'+
          '<div class="smv-mobile-card-actions">'+
            (viewButton ? '<button type="button" class="smv-mobile-action secondary" data-smv-proxy="view" data-lead-id="'+escapeHTML(leadId)+'">Details</button>' : '')+
            (assignButton ? '<button type="button" class="smv-mobile-action primary" data-smv-proxy="assign" data-lead-id="'+escapeHTML(leadId)+'">Assign Venue'+(assignCount ? ' · '+escapeHTML(assignCount) : '')+'</button>' : '')+
          '</div>'+
        '</div>'+
      '</article>';
  }

  function renderMobileLeads(){
    const list=ensureMobileList();
    const tbody=document.getElementById('leadsTableBody');
    if(!list || !tbody)return;

    const rows=[...tbody.querySelectorAll(':scope > tr')];
    if(!rows.length){
      list.innerHTML='<div class="smv-mobile-empty">No enquiries found.</div>';
      return;
    }

    const loadingCell=rows[0].querySelector('td[colspan]');
    if(rows.length===1 && loadingCell){
      list.innerHTML='<div class="smv-mobile-empty">'+escapeHTML(cleanText(loadingCell) || 'Loading customer enquiries...')+'</div>';
      return;
    }

    const html=rows.map(buildCard).filter(Boolean).join('');
    list.innerHTML=html || '<div class="smv-mobile-empty">No enquiries match the current filters.</div>';
  }

  function findOriginalRow(leadId){
    const tbody=document.getElementById('leadsTableBody');
    if(!tbody)return null;
    return [...tbody.querySelectorAll(':scope > tr')].find(row=>{
      const button=row.querySelector('[data-action="view"],.view-lead-btn,[data-action="assign-venue"],.venue-assign-btn');
      return String(button?.dataset.id || row.dataset.id || '')===String(leadId);
    }) || null;
  }

  function toggleCard(button){
    const card=button.closest('.smv-mobile-lead-card');
    const details=card?.querySelector('.smv-mobile-lead-details');
    if(!card || !details)return;
    const open=details.hidden;
    details.hidden=!open;
    card.classList.toggle('open',open);
    button.setAttribute('aria-expanded',String(open));
  }

  function ensureMobileNav(){
    let nav=document.getElementById('smvMobileNav');
    if(!nav){
      nav=document.createElement('nav');
      nav.id='smvMobileNav';
      nav.className='smv-mobile-nav';
      nav.setAttribute('aria-label','CRM mobile navigation');
      document.body.appendChild(nav);
    }
    nav.innerHTML=
      '<button type="button" data-smv-mobile="leads"><span>☷</span><b>Enquiries</b></button>'+
      '<button type="button" data-smv-mobile="venues"><span>🏨</span><b>Venues</b></button>'+
      '<button type="button" class="smv-mobile-primary" data-smv-mobile="add"><span>＋</span><b>Add</b></button>'+
      '<button type="button" data-smv-mobile="more"><span>•••</span><b>More</b></button>';
  }

  function ensureMoreMenu(){
    if(document.getElementById('smvMobileMoreMenu'))return;
    const menu=document.createElement('div');
    menu.id='smvMobileMoreMenu';
    menu.className='smv-mobile-more-menu';
    menu.hidden=true;
    menu.innerHTML=
      '<div class="smv-mobile-more-head"><strong>CRM Menu</strong><button type="button" data-smv-more="close" aria-label="Close">×</button></div>'+
      '<button type="button" data-smv-more="leads"><span>☷</span><b>Customer Enquiries</b></button>'+
      '<button type="button" data-smv-more="venues"><span>🏨</span><b>Venue Management</b></button>'+
      '<button type="button" data-smv-more="refresh"><span>↻</span><b>Refresh Data</b></button>'+
      '<button type="button" data-smv-more="password"><span>🔐</span><b>Change Password</b></button>'+
      '<button type="button" data-smv-more="logout" class="danger"><span>↪</span><b>Logout</b></button>';
    document.body.appendChild(menu);
  }

  function venueOpen(){
    const section=document.getElementById('venueManagementSection');
    return !!(section && !section.hidden);
  }

  function syncMobileNav(){
    const nav=document.getElementById('smvMobileNav');
    if(!nav)return;
    const open=venueOpen();
    nav.querySelector('[data-smv-mobile="leads"]')?.classList.toggle('active',!open);
    nav.querySelector('[data-smv-mobile="venues"]')?.classList.toggle('active',open);
    const add=nav.querySelector('[data-smv-mobile="add"] b');
    if(add)add.textContent=open?'Add Venue':'Add';
  }

  function closeMore(){
    const menu=document.getElementById('smvMobileMoreMenu');
    if(menu)menu.hidden=true;
    document.querySelector('[data-smv-mobile="more"]')?.classList.remove('active');
  }

  function toggleMore(){
    const menu=document.getElementById('smvMobileMoreMenu');
    if(!menu)return;
    menu.hidden=!menu.hidden;
    document.querySelector('[data-smv-mobile="more"]')?.classList.toggle('active',!menu.hidden);
  }

  function toggleFilters(){
    const next=!root.classList.contains('smv-phone-filters-open');
    root.classList.toggle('smv-phone-filters-open',next);
    document.querySelector('[data-smv-phone-action="filters"]')?.setAttribute('aria-expanded',String(next));
  }

  function syncLeadCount(){
    const target=document.getElementById('smvPhoneLeadCount');
    const total=document.getElementById('totalCount');
    if(target)target.textContent=cleanText(total) || '0';
  }

  function bindEvents(){
    if(root.dataset.smvPhoneV3Bound==='1')return;
    root.dataset.smvPhoneV3Bound='1';

    document.addEventListener('click',event=>{
      const phoneAction=event.target.closest('[data-smv-phone-action]');
      if(phoneAction){
        if(phoneAction.dataset.smvPhoneAction==='add-lead')document.getElementById('addEnquiryBtn')?.click();
        if(phoneAction.dataset.smvPhoneAction==='filters')toggleFilters();
        return;
      }

      const summary=event.target.closest('[data-smv-card-toggle]');
      if(summary){
        toggleCard(summary);
        return;
      }

      const proxy=event.target.closest('[data-smv-proxy]');
      if(proxy){
        const row=findOriginalRow(proxy.dataset.leadId);
        if(proxy.dataset.smvProxy==='view')row?.querySelector('[data-action="view"],.view-lead-btn')?.click();
        if(proxy.dataset.smvProxy==='assign')row?.querySelector('[data-action="assign-venue"],.venue-assign-btn')?.click();
        return;
      }

      const venueToggle=event.target.closest('.venue-name-details-btn');
      if(venueToggle && isPhone()){
        toggleMobileVenueRow(venueToggle);
        return;
      }

      const navButton=event.target.closest('[data-smv-mobile]');
      if(navButton){
        const action=navButton.dataset.smvMobile;
        if(action==='leads'){
          document.getElementById('backToLeadsBtn')?.click();
          closeMore();
          window.scrollTo({top:0,behavior:'smooth'});
        }else if(action==='venues'){
          document.getElementById('venueManagementBtn')?.click();
          closeMore();
          window.scrollTo({top:0,behavior:'smooth'});
        }else if(action==='add'){
          if(venueOpen())document.getElementById('addVenueBtn')?.click();
          else document.getElementById('addEnquiryBtn')?.click();
        }else if(action==='more'){
          toggleMore();
        }
        setTimeout(syncMobileNav,80);
        return;
      }

      const more=event.target.closest('[data-smv-more]');
      if(more){
        const action=more.dataset.smvMore;
        if(action==='close'){ closeMore(); return; }
        if(action==='leads'){ document.getElementById('backToLeadsBtn')?.click(); closeMore(); return; }
        if(action==='venues'){ document.getElementById('venueManagementBtn')?.click(); closeMore(); return; }
        if(action==='refresh'){
          if(venueOpen())document.getElementById('refreshVenuesBtn')?.click();
          else document.getElementById('refreshBtn')?.click();
          closeMore();
          return;
        }
        if(action==='password'){ window.location.href='change-password.html'; return; }
        if(action==='logout'){ document.getElementById('logoutBtn')?.click(); return; }
      }

      const menu=document.getElementById('smvMobileMoreMenu');
      if(menu && !menu.hidden && !event.target.closest('#smvMobileMoreMenu'))closeMore();
    });
  }

  function observe(){
    const tbody=document.getElementById('leadsTableBody');
    if(tbody && tbody.dataset.smvPhoneV3Watch!=='1'){
      tbody.dataset.smvPhoneV3Watch='1';
      let queued=false;
      new MutationObserver(()=>{
        if(queued)return;
        queued=true;
        requestAnimationFrame(()=>{
          queued=false;
          renderMobileLeads();
        });
      }).observe(tbody,{childList:true,subtree:true,characterData:true});
    }

    const total=document.getElementById('totalCount');
    if(total && total.dataset.smvPhoneV3Watch!=='1'){
      total.dataset.smvPhoneV3Watch='1';
      new MutationObserver(syncLeadCount).observe(total,{childList:true,subtree:true,characterData:true});
    }

    const staff=document.getElementById('staffName');
    if(staff && staff.dataset.smvPhoneV3Watch!=='1'){
      staff.dataset.smvPhoneV3Watch='1';
      new MutationObserver(syncWelcome).observe(staff,{childList:true,subtree:true,characterData:true});
    }

    const venueBody=document.getElementById('venueTableBody');
    if(venueBody && venueBody.dataset.smvPhoneVenueWatch!=='1'){
      venueBody.dataset.smvPhoneVenueWatch='1';
      new MutationObserver(()=>requestAnimationFrame(decorateMobileVenueRows))
        .observe(venueBody,{childList:true,subtree:true});
    }

    const venue=document.getElementById('venueManagementSection');
    if(venue && venue.dataset.smvPhoneV3Watch!=='1'){
      venue.dataset.smvPhoneV3Watch='1';
      new MutationObserver(()=>{
        root.classList.remove('smv-phone-filters-open');
        closeMore();
        syncMobileNav();
      }).observe(venue,{attributes:true,attributeFilter:['hidden']});
    }
  }

  function decorateMobileVenueRows(){
    const body=document.getElementById('venueTableBody');
    if(!body)return;
    [...body.querySelectorAll(':scope > tr')].forEach(row=>{
      if(row.children.length<2)return;
      row.querySelectorAll('.smv-venue-mobile-toggle').forEach(button=>button.remove());
      const name=row.querySelector('.venue-name-cell strong');
      if(name){
        name.classList.remove('smv-venue-name-toggle');
        name.removeAttribute('role');
        name.removeAttribute('tabindex');
        name.removeAttribute('aria-expanded');
        name.removeAttribute('title');
      }
      const details=row.querySelector('.venue-name-details-btn');
      if(!details)return;
      if(isPhone()){
        details.setAttribute('aria-expanded',String(row.classList.contains('smv-mobile-venue-open')));
        details.textContent=row.classList.contains('smv-mobile-venue-open')?'Close':'Details';
      }else{
        row.classList.remove('smv-mobile-venue-open');
        details.setAttribute('aria-expanded','false');
        details.textContent='Details';
      }
    });
  }

  function toggleMobileVenueRow(button){
    if(!isPhone())return;
    const row=button.closest('#venueTableBody > tr');
    if(!row)return;
    const open=!row.classList.contains('smv-mobile-venue-open');
    row.classList.toggle('smv-mobile-venue-open',open);
    button.setAttribute('aria-expanded',String(open));
    button.textContent=open?'Close':'Details';
  }

  function install(){
    root.classList.toggle('smv-phone-crm',isPhone());
    ensurePhoneHeader();
    ensureLeadToolbar();
    ensureMobileList();
    ensureMobileNav();
    ensureMoreMenu();
    syncWelcome();
    syncLeadCount();
    renderMobileLeads();
    decorateMobileVenueRows();
    syncMobileNav();
    bindEvents();
    observe();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();

  const mq=window.matchMedia(PHONE);
  const syncMode=()=>{
    root.classList.toggle('smv-phone-crm',mq.matches);
    if(!mq.matches){
      root.classList.remove('smv-phone-filters-open');
      closeMore();
      decorateMobileVenueRows();
    }else{
      renderMobileLeads();
      decorateMobileVenueRows();
      syncMobileNav();
    }
  };
  if(mq.addEventListener)mq.addEventListener('change',syncMode);
  else mq.addListener(syncMode);
})();