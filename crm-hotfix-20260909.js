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
    if(/^website/i.test(text))return text.split("|")[0].trim().slice(0,42);
    return text.slice(0,42);
  }

  function installStyles(){
    if(document.getElementById("smvCrmSourceHotfixStyles"))return;
    const style=document.createElement("style");
    style.id="smvCrmSourceHotfixStyles";
    style.textContent=`
      :root{--smv-crm-font:12.5px;--smv-crm-small:11px;--smv-crm-table:12px}
      html,body,.crm-app{font-size:var(--smv-crm-font)!important;overflow-x:hidden!important}
      body{line-height:1.4!important}
      .crm-header{min-height:64px!important;height:auto!important;padding:7px 12px!important;gap:12px!important;align-items:center!important;overflow:hidden!important}
      .crm-brand{gap:10px!important;min-width:0!important;flex:0 1 auto!important}
      .crm-header-logo{width:235px!important;max-width:235px!important;height:auto!important;max-height:74px!important;object-fit:contain!important}
      .crm-brand-text strong,.crm-header-title,#crmPageTitle{font-size:24px!important;line-height:1.05!important;letter-spacing:.01em!important;white-space:nowrap!important}
      .crm-header-title{gap:8px!important;min-width:0!important;flex-wrap:wrap!important}
      .venue-nav-btn,.account-password-btn,.logout-btn,.primary-btn,.secondary-btn{font-size:12px!important;padding:10px 15px!important;border-radius:13px!important;line-height:1.15!important;white-space:nowrap!important}
      .staff-name{font-size:11.5px!important;padding:9px 13px!important;max-width:210px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
      .crm-header-actions{gap:8px!important;min-width:0!important}
      .page-heading,.venue-page-heading{padding:22px 12px 16px!important;gap:16px!important}
      .page-kicker,.venue-kicker{font-size:10px!important;letter-spacing:.24em!important;line-height:1.25!important}
      .page-heading h1,.venue-page-heading h1{font-size:clamp(30px,3vw,44px)!important;line-height:1.03!important;margin:8px 0 6px!important}
      .page-heading p,.venue-page-heading p{font-size:14px!important;line-height:1.45!important;margin:0!important;max-width:760px!important}
      .command-health{font-size:11px!important;gap:7px!important;margin-top:9px!important;flex-wrap:wrap!important}
      .stats-grid,.venue-stats-grid,.stage8-venue-stats,.network-kpi-grid{gap:12px!important;margin:10px 8px 14px!important}
      .stat-card,.venue-stat-card,.network-kpi{min-height:82px!important;padding:15px 18px!important;border-radius:18px!important;gap:13px!important}
      .stat-icon{width:48px!important;height:48px!important;font-size:22px!important;border-radius:14px!important}
      .stat-content span,.venue-stat-card span,.network-kpi span{font-size:10px!important;letter-spacing:.16em!important;line-height:1.2!important}
      .stat-content strong,.venue-stat-card strong,.network-kpi strong{font-size:31px!important;line-height:1!important}
      .leads-section,.venue-management-section,.network-insights{margin:0 8px 16px!important;border-radius:18px!important}
      .filter-bar,.venue-toolbar{padding:13px 16px!important;gap:10px!important}
      .search-box input,.venue-search-input,.venue-filter-select,#statusFilter{height:46px!important;font-size:14px!important;border-radius:13px!important}
      .table-wrapper{overflow-x:auto!important;max-width:100%!important;-webkit-overflow-scrolling:touch!important}
      .leads-table{table-layout:fixed!important;width:100%!important;min-width:1180px!important;border-collapse:collapse!important}
      .leads-table th,.leads-table td{vertical-align:middle!important;line-height:1.28!important;font-size:var(--smv-crm-table)!important;box-sizing:border-box!important;padding:11px 10px!important;min-height:auto!important}
      .leads-table th{font-size:11px!important;letter-spacing:.12em!important;white-space:nowrap!important}
      .leads-table td{overflow:hidden!important;text-overflow:ellipsis!important}
      .leads-table th:nth-child(1),.leads-table td:nth-child(1){width:120px!important}
      .leads-table th:nth-child(2),.leads-table td:nth-child(2){width:100px!important}
      .leads-table th:nth-child(3),.leads-table td:nth-child(3){width:120px!important}
      .leads-table th:nth-child(4),.leads-table td:nth-child(4){width:100px!important}
      .leads-table th:nth-child(5),.leads-table td:nth-child(5){width:160px!important;max-width:160px!important}
      .leads-table th:nth-child(6),.leads-table td:nth-child(6){width:105px!important}
      .leads-table th:nth-child(7),.leads-table td:nth-child(7){width:105px!important}
      .leads-table th:nth-child(8),.leads-table td:nth-child(8){width:70px!important;text-align:center!important}
      .leads-table th:nth-child(9),.leads-table td:nth-child(9){width:115px!important}
      .leads-table th:nth-child(10),.leads-table td:nth-child(10){width:92px!important;text-align:center!important}
      .leads-table th:nth-child(11),.leads-table td:nth-child(11){width:78px!important;text-align:center!important}
      .leads-table th:nth-child(12),.leads-table td:nth-child(12){width:75px!important;text-align:center!important}
      .leads-table td:nth-child(1),.leads-table td:nth-child(2){font-size:12px!important;font-weight:800!important}
      .leads-table td:nth-child(3),.leads-table td:nth-child(4),.leads-table td:nth-child(6),.leads-table td:nth-child(7),.leads-table td:nth-child(8),.leads-table td:nth-child(9){font-size:12px!important;font-weight:650!important}
      .leads-table td:nth-child(5){white-space:nowrap!important;color:#17443d!important;font-weight:800!important}
      .status-badge,.lead-status-badge{font-size:11px!important;padding:6px 10px!important;border-radius:999px!important;white-space:nowrap!important}
      .action-btn,.comment-btn{width:38px!important;height:38px!important;border-radius:12px!important;font-size:14px!important;padding:0!important}
      .smv-compact-source{display:inline-flex!important;align-items:center!important;max-width:100%!important;padding:6px 9px!important;border-radius:999px!important;background:#eefbf7!important;border:1px solid #cfeee7!important;color:#087f71!important;font-size:11px!important;font-weight:900!important;line-height:1.15!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .venue-table,.venue-list-table{font-size:12px!important;table-layout:fixed!important;width:100%!important}
      .venue-table th,.venue-table td,.venue-list-table th,.venue-list-table td{font-size:12px!important;padding:10px!important;line-height:1.3!important;vertical-align:middle!important}
      .venue-modal,.lead-modal,.modal-content{font-size:13px!important}
      .venue-form-grid,.form-grid{gap:12px!important}
      .venue-form-grid input,.venue-form-grid select,.venue-form-grid textarea,.form-grid input,.form-grid select,.form-grid textarea{font-size:13px!important;min-height:40px!important;padding:10px 12px!important}
      @media(max-width:1200px){.crm-header-logo{width:205px!important}.crm-brand-text strong,.crm-header-title,#crmPageTitle{font-size:20px!important}.leads-table{min-width:1160px!important}.leads-table th,.leads-table td{padding:9px 8px!important;font-size:11.5px!important}.smv-compact-source{font-size:10.5px!important}}
      @media(max-width:800px){:root{--smv-crm-font:12px;--smv-crm-table:11.5px}.crm-header{align-items:flex-start!important}.crm-header-logo{width:170px!important;max-height:58px!important}.page-heading h1,.venue-page-heading h1{font-size:30px!important}.stat-card,.venue-stat-card{min-height:74px!important;padding:12px!important}.leads-table{min-width:1120px!important}}
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

  function start(){
    installStyles();
    compactTableSources();
    const tbody=document.getElementById("leadsTableBody");
    if(tbody){
      const observer=new MutationObserver(()=>setTimeout(compactTableSources,30));
      observer.observe(tbody,{childList:true,subtree:true,characterData:true});
    }
    setInterval(compactTableSources,1200);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();
})();
