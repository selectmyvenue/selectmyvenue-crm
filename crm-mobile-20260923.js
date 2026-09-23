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