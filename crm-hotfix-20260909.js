(function(){
  "use strict";

  function compactSource(raw){
    const text=String(raw||"").replace(/\s+/g," ").trim();
    if(!text)return "—";
    if(/venue profile/i.test(text))return "Website - Venue profile";
    if(/wedding/i.test(text))return "Website - Wedding page";
    if(/party/i.test(text))return "Website - Party page";
    if(/corporate/i.test(text))return "Website - Corporate page";
    if(/delhi ncr|delhi-ncr/i.test(text))return "Website - Delhi NCR page";
    if(/quick enquiry/i.test(text))return "Website - Quick enquiry";
    if(/main enquiry|home/i.test(text))return "Website - Home page";
    const venueMatch=text.match(/(?:Venue|Interested venue)\s*:\s*([^|\n]+)/i);
    if(venueMatch&&venueMatch[1])return "Website - Venue";
    if(/^website/i.test(text))return text.split("|")[0].trim().slice(0,34);
    return text.slice(0,34);
  }

  function installStyles(){
    const old=document.getElementById("smvCrmSourceHotfixStyles");
    if(old)old.remove();
    const style=document.createElement("style");
    style.id="smvCrmSourceHotfixStyles";
    style.textContent=`
      :root{--smv-crm-font:12px;--smv-crm-table:11.5px;--smv-crm-small:10.5px}
      html,body,.crm-app{font-size:var(--smv-crm-font)!important;overflow-x:hidden!important}
      body{line-height:1.35!important;background:#f7fcfa!important}
      .crm-app{background:linear-gradient(135deg,#f7fcfa 0%,#f1fbf7 52%,#fbfefd 100%)!important}

      .crm-header{min-height:58px!important;height:auto!important;padding:6px 10px!important;gap:10px!important;align-items:center!important;overflow:hidden!important;grid-template-columns:minmax(220px,.82fr) auto minmax(240px,.74fr)!important}
      .crm-brand{gap:9px!important;min-width:0!important}
      .crm-header-logo{width:210px!important;max-width:210px!important;height:auto!important;max-height:60px!important;object-fit:contain!important;object-position:left center!important}
      .crm-brand-text strong,.crm-header-title,#crmPageTitle{font-size:22px!important;line-height:1.05!important;letter-spacing:-.02em!important;white-space:nowrap!important}
      .crm-header-title{gap:8px!important;min-width:0!important;flex-wrap:wrap!important}
      .crm-header-actions{gap:7px!important;min-width:0!important;justify-content:flex-end!important}
      .venue-nav-btn,.account-password-btn,.logout-btn,.primary-btn,.secondary-btn{font-size:11.5px!important;padding:8px 12px!important;border-radius:12px!important;line-height:1.1!important;white-space:nowrap!important;min-height:34px!important}
      .staff-name{font-size:11px!important;padding:8px 11px!important;max-width:190px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}

      .page-heading,.venue-page-heading{padding:16px 10px 12px!important;gap:12px!important;margin:0!important}
      .page-kicker,.venue-kicker{font-size:9.5px!important;letter-spacing:.20em!important;line-height:1.2!important}
      .page-heading h1,.venue-page-heading h1{font-size:clamp(26px,2.4vw,36px)!important;line-height:1.02!important;margin:6px 0 4px!important;letter-spacing:-.03em!important}
      .page-heading p,.venue-page-heading p{font-size:13px!important;line-height:1.38!important;margin:0!important;max-width:720px!important}
      .command-health{font-size:10.5px!important;gap:6px!important;margin-top:7px!important;flex-wrap:wrap!important}
      .heading-actions,.venue-heading-actions{gap:7px!important;flex-wrap:wrap!important}

      .stats-grid,.venue-stats-grid,.stage8-venue-stats,.network-kpi-grid{gap:10px!important;margin:8px 8px 12px!important;grid-auto-rows:auto!important}
      .stat-card,.venue-stat-card,.network-kpi{min-height:70px!important;padding:12px 14px!important;border-radius:16px!important;gap:10px!important;box-shadow:0 8px 22px rgba(8,95,77,.07)!important}
      .stat-icon{width:42px!important;height:42px!important;font-size:19px!important;border-radius:13px!important}
      .stat-content span,.venue-stat-card span,.network-kpi span{font-size:9.5px!important;letter-spacing:.14em!important;line-height:1.15!important}
      .stat-content strong,.venue-stat-card strong,.network-kpi strong{font-size:27px!important;line-height:1!important}

      .leads-section,.venue-management-section,.network-insights{margin:0 8px 14px!important;border-radius:16px!important;box-shadow:0 10px 28px rgba(8,95,77,.06)!important;border:1px solid #d9eee8!important;overflow:hidden!important}
      .network-insights{padding:14px!important}
      .network-insights-head h2{font-size:22px!important;margin:4px 0!important}.network-insights-head p{font-size:12px!important;margin:0!important}
      .filter-bar,.venue-toolbar{padding:10px 13px!important;gap:8px!important;align-items:center!important}
      .search-box input,.venue-search-input,.venue-filter-select,#statusFilter{height:40px!important;font-size:12.5px!important;border-radius:12px!important;padding:0 12px!important}
      .search-box{min-height:40px!important}.filter-workspace-note{font-size:10.5px!important;white-space:nowrap!important}

      .table-wrapper,.venue-table-wrapper{overflow-x:auto!important;max-width:100%!important;-webkit-overflow-scrolling:touch!important;background:#fff!important}
      .leads-table{table-layout:fixed!important;width:100%!important;min-width:1260px!important;border-collapse:collapse!important;border-spacing:0!important}
      .leads-table th,.leads-table td{vertical-align:middle!important;line-height:1.23!important;font-size:var(--smv-crm-table)!important;box-sizing:border-box!important;padding:8px 8px!important;min-height:auto!important;height:auto!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .leads-table th{font-size:10.5px!important;letter-spacing:.10em!important;white-space:nowrap!important;color:#5d706b!important;background:#f3faf7!important}
      .leads-table tbody tr{height:54px!important;min-height:54px!important;border-bottom:1px solid #edf4f1!important}
      .leads-table tbody tr:hover{background:#fbfffd!important}
      .leads-table th:nth-child(1),.leads-table td:nth-child(1){width:115px!important}
      .leads-table th:nth-child(2),.leads-table td:nth-child(2){width:100px!important}
      .leads-table th:nth-child(3),.leads-table td:nth-child(3){width:115px!important}
      .leads-table th:nth-child(4),.leads-table td:nth-child(4){width:190px!important;max-width:190px!important;white-space:nowrap!important}
      .leads-table th:nth-child(5),.leads-table td:nth-child(5){width:125px!important;max-width:125px!important;white-space:nowrap!important}
      .leads-table th:nth-child(6),.leads-table td:nth-child(6){width:108px!important}
      .leads-table th:nth-child(7),.leads-table td:nth-child(7){width:102px!important}
      .leads-table th:nth-child(8),.leads-table td:nth-child(8){width:62px!important;text-align:center!important}
      .leads-table th:nth-child(9),.leads-table td:nth-child(9){width:118px!important;max-width:118px!important}
      .leads-table th:nth-child(10),.leads-table td:nth-child(10){width:86px!important;text-align:center!important}
      .leads-table th:nth-child(11),.leads-table td:nth-child(11){width:72px!important;text-align:center!important}
      .leads-table th:nth-child(12),.leads-table td:nth-child(12){width:67px!important;text-align:center!important}
      .leads-table td:nth-child(1),.leads-table td:nth-child(2){font-size:11.5px!important;font-weight:800!important;color:#063c33!important}
      .leads-table td:nth-child(3),.leads-table td:nth-child(4),.leads-table td:nth-child(6),.leads-table td:nth-child(7),.leads-table td:nth-child(8),.leads-table td:nth-child(9){font-size:11.5px!important;font-weight:620!important;color:#183f38!important}
      .leads-table td:nth-child(4){direction:ltr!important}.leads-table td:nth-child(5){color:#17443d!important;font-weight:800!important}
      .smv-compact-source{display:inline-block!important;max-width:112px!important;padding:5px 7px!important;border-radius:999px!important;background:#eefbf7!important;border:1px solid #cfeee7!important;color:#087f71!important;font-size:10.2px!important;font-weight:900!important;line-height:1.05!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;vertical-align:middle!important}
      .status-badge,.lead-status-badge{font-size:10.5px!important;padding:5px 8px!important;border-radius:999px!important;white-space:nowrap!important}
      .action-btn,.comment-btn,.leads-table button{min-width:0!important;max-width:58px!important;min-height:30px!important;height:30px!important;border-radius:10px!important;font-size:12px!important;padding:0 8px!important;line-height:1!important}

      .venue-management-section{padding:0 10px 14px!important;background:linear-gradient(180deg,#fbfffd,#f8fcfa)!important}
      .venue-toolbar{background:#f7fcfa!important;border:1px solid #e0f0eb!important;border-radius:16px!important;margin:6px 8px 10px!important}
      .venue-table{table-layout:fixed!important;width:100%!important;min-width:1230px!important;border-collapse:collapse!important;border-spacing:0!important;background:#fff!important}
      .venue-table th,.venue-table td{font-size:11.5px!important;line-height:1.22!important;padding:9px 10px!important;vertical-align:middle!important;box-sizing:border-box!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .venue-table th{font-size:10.2px!important;letter-spacing:.10em!important;color:#5e716c!important;background:#f4faf8!important;white-space:nowrap!important;border-bottom:1px solid #dfeee9!important}
      .venue-table tbody tr{height:64px!important;min-height:64px!important;border-bottom:1px solid #edf4f1!important;transition:background .18s ease!important}
      .venue-table tbody tr:hover{background:#fbfffd!important}
      .venue-table th:nth-child(1),.venue-table td:nth-child(1){width:155px!important}
      .venue-table th:nth-child(2),.venue-table td:nth-child(2){width:115px!important}
      .venue-table th:nth-child(3),.venue-table td:nth-child(3){width:145px!important}
      .venue-table th:nth-child(4),.venue-table td:nth-child(4){width:105px!important}
      .venue-table th:nth-child(5),.venue-table td:nth-child(5){width:85px!important}
      .venue-table th:nth-child(6),.venue-table td:nth-child(6){width:105px!important}
      .venue-table th:nth-child(7),.venue-table td:nth-child(7){width:90px!important;text-align:center!important}
      .venue-table th:nth-child(8),.venue-table td:nth-child(8){width:115px!important;text-align:center!important}
      .venue-table th:nth-child(9),.venue-table td:nth-child(9){width:88px!important;text-align:center!important}
      .venue-table th:nth-child(10),.venue-table td:nth-child(10){width:82px!important;text-align:center!important}
      .venue-table th:nth-child(11),.venue-table td:nth-child(11){width:145px!important;text-align:left!important;white-space:normal!important}
      .venue-table td:nth-child(1){font-weight:850!important;color:#053b34!important}.venue-table td:nth-child(1) small,.venue-table td small{font-size:10px!important;line-height:1.2!important;color:#5f716d!important;display:block!important;margin-top:3px!important}
      .venue-table td:nth-child(3),.venue-table td:nth-child(4),.venue-table td:nth-child(5),.venue-table td:nth-child(6){white-space:normal!important;color:#163f38!important}
      .venue-table td:nth-child(7) span,.venue-table td:nth-child(8) span,.venue-table td:nth-child(9) span,.venue-table td:nth-child(10) span,.venue-table .status-pill,.venue-table .plan-pill,.venue-table .verification-pill{font-size:9.8px!important;padding:5px 8px!important;border-radius:999px!important;line-height:1!important;white-space:nowrap!important}
      .venue-table td:nth-child(11){display:flex!important;align-items:center!important;gap:5px!important;flex-wrap:wrap!important;justify-content:flex-start!important}
      .venue-table td:nth-child(11) button,.venue-table td:nth-child(11) a{height:28px!important;min-height:28px!important;padding:0 9px!important;border-radius:9px!important;font-size:10.5px!important;line-height:1!important;margin:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;white-space:nowrap!important}
      .venue-table td:nth-child(11) button:nth-child(2){min-width:78px!important}.venue-table td:nth-child(11) button:nth-child(3){min-width:55px!important}

      .modal-overlay,.venue-modal-card,.modal-card{font-size:12.5px!important}.venue-modal-card{max-width:min(1080px,96vw)!important}.modal-header{padding:16px 18px!important}.modal-header h2{font-size:24px!important;margin:3px 0!important}.venue-form{padding:16px 18px!important}.venue-form-grid,.form-grid{gap:10px!important}.venue-field label,.form-field label{font-size:10px!important;letter-spacing:.13em!important}.venue-form-grid input,.venue-form-grid select,.venue-form-grid textarea,.form-grid input,.form-grid select,.form-grid textarea{font-size:12.5px!important;min-height:38px!important;padding:9px 11px!important;border-radius:11px!important}

      @media(max-width:1200px){.crm-header{grid-template-columns:1fr!important}.crm-header-logo{width:190px!important;max-height:55px!important}.crm-brand-text strong,.crm-header-title,#crmPageTitle{font-size:19px!important}.leads-table{min-width:1230px!important}.venue-table{min-width:1210px!important}.leads-table th,.leads-table td,.venue-table th,.venue-table td{padding:8px 7px!important;font-size:11px!important}.smv-compact-source{font-size:9.8px!important;max-width:105px!important}}
      @media(max-width:800px){:root{--smv-crm-font:11.8px;--smv-crm-table:11px}.crm-header{align-items:flex-start!important}.crm-header-logo{width:165px!important;max-height:52px!important}.page-heading h1,.venue-page-heading h1{font-size:27px!important}.stat-card,.venue-stat-card{min-height:66px!important;padding:10px!important}.leads-table{min-width:1220px!important}.venue-table{min-width:1200px!important}}
    `;
    document.head.appendChild(style);
  }

  function compactTableSources(){
    const rows=document.querySelectorAll("#leadsTableBody tr");
    rows.forEach(row=>{
      const cell=row.children&&row.children[4];
      if(!cell)return;
      const current=cell.textContent||"";
      if(cell.dataset.smvSourceRaw){
        const span=cell.querySelector(".smv-compact-source");
        if(span)span.textContent=compactSource(cell.dataset.smvSourceRaw);
        return;
      }
      const raw=current;
      const short=compactSource(raw);
      cell.dataset.smvSourceRaw=raw.trim();
      cell.title=raw.trim();
      cell.innerHTML="<span class='smv-compact-source'></span>";
      const span=cell.querySelector("span");
      if(span)span.textContent=short;
    });
  }

  function addTableTitles(){
    document.querySelectorAll("#leadsTableBody td,#venueTableBody td").forEach(td=>{
      if(td.title||td.querySelector("button,select,input,textarea"))return;
      const text=(td.textContent||"").replace(/\s+/g," ").trim();
      if(text)td.title=text;
    });
  }

  function start(){
    installStyles();
    compactTableSources();
    addTableTitles();
    const watchTargets=[document.getElementById("leadsTableBody"),document.getElementById("venueTableBody")].filter(Boolean);
    watchTargets.forEach(target=>{
      const observer=new MutationObserver(()=>setTimeout(()=>{compactTableSources();addTableTitles();},30));
      observer.observe(target,{childList:true,subtree:true,characterData:true});
    });
    setInterval(()=>{compactTableSources();addTableTitles();},1200);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();
})();
