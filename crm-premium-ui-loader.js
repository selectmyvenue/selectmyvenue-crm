(function(){
  const HREF='crm-premium-ui-20260923.css?v=20260923-premium-3';
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
  function boot(){
    putLast();
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