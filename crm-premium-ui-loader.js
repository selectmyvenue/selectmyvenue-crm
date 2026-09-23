(function(){
  const PREMIUM_HREF='crm-premium-ui-20260923.css?v=20260924-location-final-6';
  const MOBILE_QUERY='(max-width:760px)';
  const FINAL_LAYOUT_STYLE_ID='smvLead13ColumnFinalLayout';
  let premiumLink=null;

  function ensureFinalLeadLayout(){
    if(!document.head)return;
    let style=document.getElementById(FINAL_LAYOUT_STYLE_ID);
    if(!style){
      style=document.createElement('style');
      style.id=FINAL_LAYOUT_STYLE_ID;
      style.textContent=`
@media (min-width:1100px){
  body .crm-app .table-wrapper{
    width:100%!important;
    max-width:100%!important;
    overflow-x:hidden!important;
  }
  body .crm-app .leads-table{
    width:100%!important;
    max-width:100%!important;
    min-width:0!important;
    table-layout:fixed!important;
  }
  body .crm-app .leads-table th,
  body .crm-app .leads-table td{
    display:table-cell!important;
    box-sizing:border-box!important;
    padding-left:5px!important;
    padding-right:5px!important;
    position:static!important;
    inset:auto!important;
    left:auto!important;
    right:auto!important;
    z-index:auto!important;
    box-shadow:none!important;
    vertical-align:middle!important;
  }

  /* All 13 customer-enquiry fields fit inside the desktop viewport. */
  body .crm-app .leads-table th:nth-child(1), body .crm-app .leads-table td:nth-child(1){width:8.5%!important}
  body .crm-app .leads-table th:nth-child(2), body .crm-app .leads-table td:nth-child(2){width:7%!important}
  body .crm-app .leads-table th:nth-child(3), body .crm-app .leads-table td:nth-child(3){width:10%!important}
  body .crm-app .leads-table th:nth-child(4), body .crm-app .leads-table td:nth-child(4){width:8%!important}
  body .crm-app .leads-table th:nth-child(5), body .crm-app .leads-table td:nth-child(5){width:6%!important}
  body .crm-app .leads-table th:nth-child(6), body .crm-app .leads-table td:nth-child(6){width:7.5%!important}
  body .crm-app .leads-table th:nth-child(7), body .crm-app .leads-table td:nth-child(7){width:8.5%!important}
  body .crm-app .leads-table th:nth-child(8), body .crm-app .leads-table td:nth-child(8){width:5.5%!important;text-align:center!important}
  body .crm-app .leads-table th:nth-child(9), body .crm-app .leads-table td:nth-child(9){width:10.5%!important}
  body .crm-app .leads-table th:nth-child(10),body .crm-app .leads-table td:nth-child(10){width:8.5%!important;text-align:center!important}
  body .crm-app .leads-table th:nth-child(11),body .crm-app .leads-table td:nth-child(11){width:5%!important;text-align:center!important}
  body .crm-app .leads-table th:nth-child(12),body .crm-app .leads-table td:nth-child(12){width:6%!important;text-align:center!important}
  body .crm-app .leads-table th:nth-child(13),body .crm-app .leads-table td:nth-child(13){width:9%!important;text-align:center!important}

  body .crm-app .leads-table th{
    font-size:9.6px!important;
    letter-spacing:.035em!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:clip!important;
  }
  body .crm-app .leads-table td{
    font-size:11.5px!important;
    line-height:1.25!important;
  }

  /* Compact fields where there is spare width. */
  body .crm-app .leads-table td:nth-child(3),
  body .crm-app .leads-table td:nth-child(4),
  body .crm-app .leads-table td:nth-child(5),
  body .crm-app .leads-table td:nth-child(6),
  body .crm-app .leads-table td:nth-child(7){
    overflow:hidden!important;
    text-overflow:ellipsis!important;
  }

  /* Location gets protected space and may wrap to a second line. */
  body .crm-app .leads-table th:nth-child(9),
  body .crm-app .leads-table td:nth-child(9){
    overflow:visible!important;
    text-overflow:clip!important;
    white-space:normal!important;
    overflow-wrap:anywhere!important;
    word-break:normal!important;
  }

  /* Preserve the existing premium inline status editor exactly as a working field. */
  body .crm-app .leads-table td:nth-child(10){
    overflow:visible!important;
    white-space:nowrap!important;
  }
  body .crm-app .leads-table td:nth-child(10) .crm-status-inline-field{
    display:block!important;
    width:100%!important;
    max-width:100%!important;
    min-width:0!important;
    position:relative!important;
    pointer-events:auto!important;
  }
  body .crm-app .leads-table td:nth-child(10) .crm-status-badge,
  body .crm-app .leads-table td:nth-child(10) .status-badge,
  body .crm-app .leads-table td:nth-child(10) .inline-display{
    max-width:100%!important;
    white-space:nowrap!important;
    position:relative!important;
  }

  /* Comment remains compact: blank = one subtle +, saved = Y + view + edit. */
  body .crm-app .leads-table .comment-add-btn{
    width:27px!important;
    min-width:27px!important;
    max-width:27px!important;
    height:27px!important;
    min-height:27px!important;
    max-height:27px!important;
    padding:0!important;
    border:0!important;
    background:transparent!important;
    color:#91a09c!important;
    font-size:18px!important;
    font-weight:500!important;
    line-height:1!important;
    box-shadow:none!important;
  }
  body .crm-app .leads-table .comment-add-btn:hover{
    color:#08745d!important;
    background:#eef8f5!important;
  }

  /* Details + Assign are always present at the right end, inside their own columns. */
  body .crm-app .leads-table td:nth-child(12),
  body .crm-app .leads-table td:nth-child(13){
    overflow:visible!important;
    white-space:nowrap!important;
  }
  body .crm-app .leads-table td:nth-child(12) .view-lead-btn{
    display:inline-flex!important;
    width:calc(100% - 6px)!important;
    min-width:0!important;
    max-width:92px!important;
    height:31px!important;
    padding:0 5px!important;
    align-items:center!important;
    justify-content:center!important;
    font-size:9.6px!important;
  }
  body .crm-app .leads-table td:nth-child(13) .venue-assign-btn{
    display:inline-flex!important;
    width:calc(100% - 6px)!important;
    min-width:0!important;
    max-width:112px!important;
    height:31px!important;
    padding:0 5px!important;
    align-items:center!important;
    justify-content:center!important;
    gap:3px!important;
    font-size:9.6px!important;
  }
  body .crm-app .leads-table .venue-assignment-count{
    min-width:20px!important;
    height:20px!important;
    padding:0 5px!important;
    font-size:9px!important;
  }
}
`;
      document.head.appendChild(style);
    }else if(document.head.lastElementChild!==style){
      document.head.appendChild(style);
    }
  }

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

    /* Desktop layout override must stay after premium CSS, because premium CSS is re-appended at runtime. */
    ensureFinalLeadLayout();
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