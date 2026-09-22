(function(){
  const HREF='crm-premium-ui-20260923.css?v=20260923-readable-1';
  let link=null;
  function putLast(){
    if(!document.head)return;
    if(!link){
      link=document.createElement('link');
      link.rel='stylesheet';
      link.id='smvPremiumUiRuntime';
      link.href=HREF;
    }
    const styleNodes=[...document.head.querySelectorAll('style,link[rel="stylesheet"]')];
    if(link.parentNode!==document.head || styleNodes[styleNodes.length-1]!==link){
      document.head.appendChild(link);
    }
  }

  function installDetailsFailsafe(){
    if(document.documentElement.dataset.smvDetailsFailsafe==='1')return;
    document.documentElement.dataset.smvDetailsFailsafe='1';
    document.addEventListener('click',function(event){
      const button=event.target.closest?.('.view-lead-btn[data-id]');
      if(!button)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const id=button.dataset.id;
      const modal=document.getElementById('leadModal');
      if(modal)modal.hidden=false;
      try{
        const fn=window.crm?.openLeadModal||window.openLeadModal;
        if(typeof fn==='function')fn(id);
      }catch(error){
        console.error('Lead Details failsafe error:',error);
      }
      if(modal)modal.hidden=false;
    },true);
  }

  function boot(){
    putLast();
    installDetailsFailsafe();
    setTimeout(putLast,300);
    setTimeout(putLast,900);
    setTimeout(putLast,1800);
    const obs=new MutationObserver(records=>{
      const relevant=records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.tagName==='STYLE'||(n.tagName==='LINK'&&n.rel==='stylesheet'))));
      if(relevant) setTimeout(putLast,0);
    });
    obs.observe(document.head,{childList:true});
    setTimeout(()=>obs.disconnect(),12000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();