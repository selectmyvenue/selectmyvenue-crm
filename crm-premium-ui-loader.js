(function(){
  const PREMIUM_HREF='crm-premium-ui-20260923.css?v=20260924-location-final-6';
  const MOBILE_QUERY='(max-width:760px)';
  let premiumLink=null;

  function getMobileLink(){
    return [...document.head.querySelectorAll('link[rel="stylesheet"]')]
      .find(link => /crm-mobile-20260923\.css/i.test(link.getAttribute('href') || '')) || null;
  }

  function ensureOrder(){
    if(!document.head)return;

    if(!premiumLink){
      premiumLink=document.getElementById('smvPremiumUiRuntime');
      if(!premiumLink){
        premiumLink=document.createElement('link');
        premiumLink.rel='stylesheet';
        premiumLink.id='smvPremiumUiRuntime';
        premiumLink.href=PREMIUM_HREF;
        document.head.appendChild(premiumLink);
      }
    }

    const isPhone=window.matchMedia(MOBILE_QUERY).matches;
    const mobileLink=getMobileLink();

    if(isPhone && mobileLink){
      if(premiumLink.nextElementSibling!==mobileLink || document.head.lastElementChild!==mobileLink){
        document.head.appendChild(premiumLink);
        document.head.appendChild(mobileLink);
      }
    }else{
      if(document.head.lastElementChild!==premiumLink){
        document.head.appendChild(premiumLink);
      }
    }
  }

  function boot(){
    ensureOrder();
    [150,400,900,1800].forEach(ms=>setTimeout(ensureOrder,ms));

    const observer=new MutationObserver(()=>setTimeout(ensureOrder,0));
    observer.observe(document.head,{childList:true});
    setTimeout(()=>observer.disconnect(),12000);

    const mq=window.matchMedia(MOBILE_QUERY);
    const sync=()=>setTimeout(ensureOrder,0);
    if(mq.addEventListener)mq.addEventListener('change',sync);
    else mq.addListener(sync);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();