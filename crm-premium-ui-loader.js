(function(){
  const PREMIUM_HREF='crm-premium-ui-20260923.css?v=20261007-header-fit-2';
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

  /* Final header containment: keep the full right control set visible. */
  body .crm-app .crm-header{
    grid-template-columns:400px minmax(500px,1fr) minmax(390px,450px)!important;
    gap:8px!important;padding:0 8px!important;
    height:70px!important;min-height:70px!important;
    overflow:visible!important;box-sizing:border-box!important;
  }
  body .crm-app .crm-header .crm-brand{
    width:100%!important;max-width:400px!important;min-width:0!important;
    display:flex!important;align-items:center!important;gap:8px!important;overflow:visible!important;
  }
  body .crm-app .crm-header .crm-brand-home{
    display:flex!important;flex:0 0 330px!important;width:330px!important;
    min-width:330px!important;max-width:330px!important;align-items:center!important;overflow:visible!important;
  }
  body .crm-app .crm-header .crm-brand .crm-header-logo{
    display:block!important;width:330px!important;min-width:330px!important;max-width:330px!important;
    height:auto!important;max-height:58px!important;flex:0 0 330px!important;
    object-fit:contain!important;object-position:left center!important;margin:0!important;
  }
  body .crm-app .crm-header .crm-brand-text{
    display:block!important;min-width:48px!important;width:48px!important;max-width:48px!important;
    flex:0 0 48px!important;overflow:visible!important;white-space:nowrap!important;text-overflow:clip!important;
  }
  body .crm-app .crm-header .crm-brand-text strong{
    display:block!important;width:auto!important;max-width:none!important;overflow:visible!important;
    text-overflow:clip!important;font-size:17px!important;white-space:nowrap!important;letter-spacing:0!important;
  }
  body .crm-app .crm-header .crm-header-title{min-width:0!important;overflow:visible!important}
  body .crm-app .crm-header .crm-top-nav{
    display:flex!important;max-width:100%!important;min-width:0!important;gap:5px!important;
    justify-content:flex-start!important;flex-wrap:nowrap!important;
  }
  body .crm-app .crm-header .crm-nav-item{
    flex:0 0 auto!important;padding-left:11px!important;padding-right:11px!important;white-space:nowrap!important;
  }
  body .crm-app .crm-header .crm-header-actions{
    width:100%!important;max-width:450px!important;min-width:0!important;display:flex!important;
    align-items:center!important;justify-content:flex-end!important;gap:4px!important;overflow:visible!important;
  }
  @media (min-width:1201px) and (max-width:1500px){
    body .crm-app .crm-header{grid-template-columns:360px minmax(440px,1fr) minmax(350px,390px)!important}
    body .crm-app .crm-header .crm-brand-home,
    body .crm-app .crm-header .crm-brand .crm-header-logo{
      width:285px!important;min-width:285px!important;max-width:285px!important;flex-basis:285px!important;
    }
    body .crm-app .crm-header .crm-brand-text{
      width:48px!important;min-width:48px!important;max-width:48px!important;flex-basis:48px!important;
    }
    body .crm-app .crm-header .crm-brand-text strong{font-size:15px!important}
    body .crm-app .crm-header .crm-nav-item{padding-left:8px!important;padding-right:8px!important;font-size:10.5px!important}
  }
  body .crm-app .crm-header-actions{
    width:100%!important;
    max-width:450px!important;
    min-width:0!important;
    display:flex!important;
    align-items:center!important;
    justify-content:flex-end!important;
    gap:4px!important;
    overflow:visible!important;
  }
  body .crm-app .crm-header-actions .staff-name{
    width:140px!important;
    max-width:140px!important;
    min-width:0!important;
    flex:0 1 140px!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
    white-space:nowrap!important;
  }
  body .crm-app .crm-header-actions .account-password-btn{
    width:115px!important;
    max-width:115px!important;
    min-width:0!important;
    flex:0 1 115px!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
    white-space:nowrap!important;
  }
  body .crm-app .crm-header-actions .logout-btn{
    display:inline-flex!important;
    width:70px!important;
    max-width:70px!important;
    min-width:70px!important;
    flex:0 0 70px!important;
    min-height:32px!important;
    height:32px!important;
    overflow:visible!important;
    white-space:nowrap!important;
  }
  body .crm-app .leads-table th,
  body .crm-app .leads-table td{
    display:table-cell!important;
    box-sizing:border-box!important;
    padding-left:6px!important;
    padding-right:6px!important;
    position:static!important;
    inset:auto!important;
    left:auto!important;
    right:auto!important;
    z-index:auto!important;
    box-shadow:none!important;
    vertical-align:middle!important;
  }

  /* All 13 customer-enquiry fields fit inside the desktop viewport. */
  body .crm-app .leads-table th:nth-child(1), body .crm-app .leads-table td:nth-child(1){width:9%!important}
  body .crm-app .leads-table th:nth-child(2), body .crm-app .leads-table td:nth-child(2){width:10%!important}
  body .crm-app .leads-table th:nth-child(3), body .crm-app .leads-table td:nth-child(3){width:10%!important}
  body .crm-app .leads-table th:nth-child(4), body .crm-app .leads-table td:nth-child(4){width:10%!important}
  body .crm-app .leads-table th:nth-child(5), body .crm-app .leads-table td:nth-child(5){width:6%!important}
  body .crm-app .leads-table th:nth-child(6), body .crm-app .leads-table td:nth-child(6){width:8%!important}
  body .crm-app .leads-table th:nth-child(7), body .crm-app .leads-table td:nth-child(7){width:8.5%!important}
  body .crm-app .leads-table th:nth-child(8), body .crm-app .leads-table td:nth-child(8){width:5.5%!important;text-align:center!important}
  body .crm-app .leads-table th:nth-child(9), body .crm-app .leads-table td:nth-child(9){width:6%!important}
  body .crm-app .leads-table th:nth-child(10),body .crm-app .leads-table td:nth-child(10){width:9%!important;text-align:center!important}
  body .crm-app .leads-table th:nth-child(11),body .crm-app .leads-table td:nth-child(11){width:5%!important;text-align:center!important}
  body .crm-app .leads-table th:nth-child(12),body .crm-app .leads-table td:nth-child(12){width:6%!important;text-align:center!important}
  body .crm-app .leads-table th:nth-child(13),body .crm-app .leads-table td:nth-child(13){width:7%!important;text-align:center!important}

  body .crm-app .leads-table th{
    font-size:9.6px!important;
    letter-spacing:.035em!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:clip!important;
  }
  body .crm-app .leads-table td{
    font-size:11.4px!important;
    line-height:1.24!important;
  }

  /* Content-aware behaviour: readable like an Excel sheet, without hiding useful values. */
  body .crm-app .leads-table td:nth-child(2){
    display:table-cell!important;
    white-space:nowrap!important;
    overflow:visible!important;
    text-overflow:clip!important;
    overflow-wrap:normal!important;
    word-break:normal!important;
    padding-left:10px!important;
    padding-right:10px!important;
  }
  body .crm-app .leads-table td:nth-child(3){white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
  body .crm-app .leads-table td:nth-child(4),
  body .crm-app .leads-table td:nth-child(6),
  body .crm-app .leads-table td:nth-child(9){
    white-space:normal!important;
    overflow:visible!important;
    text-overflow:clip!important;
    overflow-wrap:anywhere!important;
    word-break:normal!important;
    line-height:1.25!important;
  }
  body .crm-app .leads-table td:nth-child(5),
  body .crm-app .leads-table td:nth-child(7){
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
  }
  body .crm-app .leads-table td:nth-child(4) .crm-inline-field,
  body .crm-app .leads-table td:nth-child(4) .inline-display,
  body .crm-app .leads-table td:nth-child(4) .crm-inline-editor,
  body .crm-app .leads-table td:nth-child(9) .crm-inline-field,
  body .crm-app .leads-table td:nth-child(9) .inline-display,
  body .crm-app .leads-table td:nth-child(9) .crm-inline-editor{
    width:100%!important;
    max-width:100%!important;
    min-width:0!important;
    white-space:normal!important;
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
    max-width:104px!important;
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

  /*
   * Preserve the established desktop appearance: premium CSS is appended last
   * on desktop, followed by the final lead-table layout override. On phones,
   * keep stylesheet order static to avoid the repeated mobile refresh flash.
   */
  function ensureDesktopOrder(){
    if(!document.head)return;
    if(!premiumLink){
      premiumLink=document.getElementById('smvPremiumUiRuntime');
      if(!premiumLink){
        premiumLink=document.createElement('link');
        premiumLink.rel='stylesheet';
        premiumLink.id='smvPremiumUiRuntime';
        premiumLink.href=PREMIUM_HREF;
      }
    }
    if(document.head.lastElementChild!==premiumLink){
      document.head.appendChild(premiumLink);
    }
    ensureFinalLeadLayout();
  }

  function boot(){
    if(window.matchMedia(MOBILE_QUERY).matches){
      ensureFinalLeadLayout();
    }else{
      ensureDesktopOrder();
    }
    const mq=window.matchMedia(MOBILE_QUERY);
    const sync=()=>{
      if(mq.matches) ensureFinalLeadLayout();
      else ensureDesktopOrder();
    };
    if(mq.addEventListener)mq.addEventListener('change',sync);
    else mq.addListener(sync);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
