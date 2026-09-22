(function(){
  const HREF='crm-premium-ui-20260923.css?v=20260923-details-force-1';
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

  function forceLeadDrawer(modal){
    if(!modal)return;
    const card=modal.querySelector('.lead-modal-card');
    modal.hidden=false;
    modal.style.setProperty('position','fixed','important');
    modal.style.setProperty('inset','0','important');
    modal.style.setProperty('left','0','important');
    modal.style.setProperty('right','0','important');
    modal.style.setProperty('top','0','important');
    modal.style.setProperty('bottom','0','important');
    modal.style.setProperty('width','100vw','important');
    modal.style.setProperty('height','100vh','important');
    modal.style.setProperty('overflow','visible','important');
    modal.style.setProperty('z-index','20000','important');
    modal.style.setProperty('pointer-events','none','important');
    modal.style.setProperty('background','rgba(3,32,29,.12)','important');
    if(card){
      card.dataset.smvFreeDrag='1';
      card.style.setProperty('position','fixed','important');
      card.style.setProperty('top','68px','important');
      card.style.setProperty('right','12px','important');
      card.style.setProperty('left','auto','important');
      card.style.setProperty('bottom','auto','important');
      card.style.setProperty('width','min(1120px, calc(100vw - 24px))','important');
      card.style.setProperty('min-width','0','important');
      card.style.setProperty('max-width','1120px','important');
      card.style.setProperty('height','calc(100vh - 80px)','important');
      card.style.setProperty('min-height','0','important');
      card.style.setProperty('max-height','calc(100vh - 80px)','important');
      card.style.setProperty('overflow','auto','important');
      card.style.setProperty('resize','none','important');
      card.style.setProperty('pointer-events','auto','important');
      card.style.setProperty('margin','0','important');
      card.style.setProperty('z-index','20001','important');
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
      forceLeadDrawer(modal);
      try{
        const fn=window.crm?.openLeadModal||window.openLeadModal;
        if(typeof fn==='function')fn(id);
      }catch(error){
        console.error('Lead Details failsafe error:',error);
      }
      forceLeadDrawer(modal);
      setTimeout(()=>forceLeadDrawer(modal),0);
      setTimeout(()=>forceLeadDrawer(modal),120);
    },true);

    const modal=document.getElementById('leadModal');
    if(modal){
      new MutationObserver(()=>{
        if(!modal.hidden)forceLeadDrawer(modal);
      }).observe(modal,{attributes:true,attributeFilter:['hidden']});
    }
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