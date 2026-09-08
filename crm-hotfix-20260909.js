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
    if(/^website/i.test(text))return text.split("|")[0].trim().slice(0,32);
    return text.slice(0,32);
  }

  function installStyles(){
    const old=document.getElementById("smvCrmSourceHotfixStyles");
    if(old)old.remove();
    const style=document.createElement("style");
    style.id="smvCrmSourceHotfixStyles";
    style.textContent=`
      :root{--smv-crm-font:11.5px;--smv-crm-table:11px;--smv-crm-small:10px}
      html,body,.crm-app{font-size:var(--smv-crm-font)!important;overflow-x:hidden!important}
      body{line-height:1.32!important;background:#f7fcfa!important;color:#153b34!important}
      .crm-app{background:linear-gradient(135deg,#f8fdfb 0%,#f1fbf7 48%,#fbfefd 100%)!important}

      .crm-header{min-height:54px!important;height:auto!important;padding:5px 10px!important;gap:10px!important;align-items:center!important;overflow:hidden!important;grid-template-columns:minmax(205px,.72fr) auto minmax(220px,.72fr)!important;border-bottom:1px solid #dceee8!important;box-shadow:0 5px 16px rgba(7,95,77,.06)!important}
      .crm-brand{gap:8px!important;min-width:0!important;align-items:center!important}
      .crm-header-logo{width:190px!important;max-width:190px!important;height:auto!important;max-height:54px!important;object-fit:contain!important;object-position:left center!important}
      .crm-brand-text strong{font-size:19px!important;line-height:1.05!important;letter-spacing:-.02em!important;white-space:nowrap!important;color:#075f4d!important}
      .crm-header-title,#crmPageTitle{font-size:17px!important;line-height:1.05!important;letter-spacing:-.01em!important;white-space:nowrap!important;color:#075f4d!important}
      .crm-header-title{gap:7px!important;min-width:0!important;flex-wrap:nowrap!important;align-items:center!important;justify-content:center!important}
      .crm-header-actions{gap:6px!important;min-width:0!important;justify-content:flex-end!important;align-items:center!important;overflow:hidden!important}
      .venue-nav-btn,.account-password-btn,.logout-btn,.primary-btn,.secondary-btn{font-size:11px!important;padding:7px 10px!important;border-radius:11px!important;line-height:1.05!important;white-space:nowrap!important;min-height:32px!important;font-weight:800!important}
      .staff-name{font-size:10.5px!important;padding:7px 10px!important;max-width:180px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;border-radius:999px!important}

      .page-heading,.venue-page-heading{padding:12px 10px 8px!important;gap:10px!important;margin:0!important;align-items:flex-end!important}
      .page-kicker,.venue-kicker{font-size:8.8px!important;letter-spacing:.19em!important;line-height:1.1!important;color:#5a766f!important}
      .page-heading h1,.venue-page-heading h1{font-size:clamp(24px,2.15vw,32px)!important;line-height:1.02!important;margin:4px 0 2px!important;letter-spacing:-.035em!important;font-weight:850!important;color:#073b34!important}
      .page-heading p,.venue-page-heading p{font-size:12px!important;line-height:1.32!important;margin:0!important;max-width:680px!important;color:#5b746f!important}
      .command-health{font-size:10px!important;gap:5px!important;margin-top:5px!important;flex-wrap:wrap!important}
      .heading-actions,.venue-heading-actions{gap:6px!important;flex-wrap:wrap!important}

      .stats-grid,.venue-stats-grid,.stage8-venue-stats,.network-kpi-grid{gap:8px!important;margin:6px 8px 10px!important;grid-auto-rows:auto!important}
      .stats-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}
      .stage8-venue-stats,.network-kpi-grid{grid-template-columns:repeat(6,minmax(0,1fr))!important}
      .stat-card,.venue-stat-card,.network-kpi{min-height:58px!important;padding:10px 12px!important;border-radius:14px!important;gap:9px!important;box-shadow:0 6px 18px rgba(8,95,77,.055)!important;border:1px solid #dceee8!important;background:rgba(255,255,255,.94)!important}
      .stat-icon{width:36px!important;height:36px!important;font-size:17px!important;border-radius:12px!important}
      .stat-content span,.venue-stat-card span,.network-kpi span{font-size:8.8px!important;letter-spacing:.13em!important;line-height:1.1!important;color:#647a74!important}
      .stat-content strong,.venue-stat-card strong,.network-kpi strong{font-size:23px!important;line-height:1!important;color:#075f4d!important}
      .network-kpi small{font-size:9.5px!important;line-height:1.15!important}

      .leads-section,.venue-management-section,.network-insights{margin:0 8px 12px!important;border-radius:15px!important;box-shadow:0 9px 24px rgba(8,95,77,.055)!important;border:1px solid #d9eee8!important;overflow:hidden!important;background:rgba(255,255,255,.78)!important}
      .venue-management-section{padding:0 8px 12px!important;background:linear-gradient(180deg,#fbfffd,#f8fcfa)!important}
      .network-insights{padding:10px 12px!important}
      .network-insights-head{margin-bottom:8px!important}
      .network-insights-head h2{font-size:20px!important;margin:2px 0!important;line-height:1.1!important;color:#073b34!important}.network-insights-head p{font-size:11px!important;margin:0!important;color:#607973!important}
      .plan-distribution{padding:8px 0 0!important;margin-top:8px!important;gap:8px!important;border-top:1px solid #edf5f2!important}.plan-distribution span,.plan-distribution button,.plan-pill{font-size:10px!important;padding:6px 10px!important;border-radius:999px!important}

      .filter-bar{display:grid!important;grid-template-columns:minmax(420px,1fr) 150px minmax(150px,auto)!important;padding:9px 12px!important;gap:8px!important;align-items:center!important;background:#f8fdfb!important;border-bottom:1px solid #e1f0eb!important}
      .venue-toolbar{display:grid!important;grid-template-columns:minmax(420px,1fr) 170px 190px 170px!important;padding:9px 12px!important;gap:8px!important;align-items:center!important;background:#f8fdfb!important;border:1px solid #e0f0eb!important;border-radius:14px!important;margin:6px 0 10px!important}
      .search-box input,.venue-search-input,.venue-filter-select,#statusFilter{height:38px!important;font-size:12px!important;border-radius:11px!important;padding:0 11px!important;color:#173c35!important;background:#fff!important;border:1px solid #d8e9e4!important}
      .search-box{min-height:38px!important}.filter-workspace-note{font-size:10px!important;white-space:nowrap!important}

      .table-wrapper,.venue-table-wrapper{overflow-x:auto!important;max-width:100%!important;-webkit-overflow-scrolling:touch!important;background:#fff!important;border-radius:0 0 15px 15px!important}
      .leads-table,.venue-table{border-collapse:separate!important;border-spacing:0!important;background:#fff!important;color:#173c35!important}
      .leads-table{table-layout:fixed!important;width:100%!important;min-width:1260px!important}
      .leads-table th,.leads-table td{vertical-align:middle!important;line-height:1.18!important;font-size:var(--smv-crm-table)!important;box-sizing:border-box!important;padding:7px 8px!important;min-height:auto!important;height:auto!important;overflow:hidden!important;text-overflow:ellipsis!important;font-weight:560!important}
      .leads-table th{font-size:10px!important;letter-spacing:.085em!important;white-space:nowrap!important;color:#62766f!important;background:#f4faf7!important;font-weight:850!important;border-bottom:1px solid #deede8!important}
      .leads-table tbody tr{height:48px!important;min-height:48px!important;border-bottom:1px solid #f1f6f4!important;box-shadow:inset 0 -1px #eef5f2!important}
      .leads-table tbody tr:hover{background:#fbfffd!important}
      .leads-table th:nth-child(1),.leads-table td:nth-child(1){width:9%!important}
      .leads-table th:nth-child(2),.leads-table td:nth-child(2){width:8%!important}
      .leads-table th:nth-child(3),.leads-table td:nth-child(3){width:10%!important}
      .leads-table th:nth-child(4),.leads-table td:nth-child(4){width:15%!important;max-width:15%!important;white-space:nowrap!important}
      .leads-table th:nth-child(5),.leads-table td:nth-child(5){width:9%!important;max-width:9%!important;white-space:nowrap!important}
      .leads-table th:nth-child(6),.leads-table td:nth-child(6){width:9%!important}
      .leads-table th:nth-child(7),.leads-table td:nth-child(7){width:9%!important}
      .leads-table th:nth-child(8),.leads-table td:nth-child(8){width:5%!important;text-align:center!important}
      .leads-table th:nth-child(9),.leads-table td:nth-child(9){width:10%!important;max-width:10%!important}
      .leads-table th:nth-child(10),.leads-table td:nth-child(10){width:7%!important;text-align:center!important}
      .leads-table th:nth-child(11),.leads-table td:nth-child(11){width:5%!important;text-align:center!important}
      .leads-table th:nth-child(12),.leads-table td:nth-child(12){width:4%!important;text-align:center!important}
      .leads-table td:nth-child(1){font-weight:760!important;color:#063c33!important}.leads-table td:nth-child(2){font-weight:650!important}.leads-table td:nth-child(4){direction:ltr!important}.leads-table td:nth-child(5){color:#17443d!important;font-weight:800!important}
      .smv-compact-source{display:inline-block!important;max-width:100%!important;padding:4px 6px!important;border-radius:999px!important;background:#eefbf7!important;border:1px solid #cfeee7!important;color:#087f71!important;font-size:9.6px!important;font-weight:850!important;line-height:1.05!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;vertical-align:middle!important}
      .status-badge,.lead-status-badge{font-size:10px!important;padding:4px 7px!important;border-radius:999px!important;white-space:nowrap!important;line-height:1!important}
      .action-btn,.comment-btn,.leads-table button{min-width:0!important;max-width:52px!important;min-height:28px!important;height:28px!important;border-radius:9px!important;font-size:11px!important;padding:0 7px!important;line-height:1!important}

      .venue-table{table-layout:fixed!important;width:100%!important;min-width:1320px!important}
      .venue-table th,.venue-table td{font-size:10.8px!important;line-height:1.16!important;padding:7px 9px!important;vertical-align:middle!important;box-sizing:border-box!important;overflow:hidden!important;text-overflow:ellipsis!important;font-weight:560!important}
      .venue-table th{font-size:9.6px!important;letter-spacing:.08em!important;color:#60766f!important;background:#f4faf8!important;white-space:nowrap!important;border-bottom:1px solid #dfeee9!important;font-weight:850!important}
      .venue-table tbody tr{height:56px!important;min-height:56px!important;box-shadow:inset 0 -1px #eef5f2!important;transition:background .18s ease!important}
      .venue-table tbody tr:hover{background:#fbfffd!important}
      .venue-table th:nth-child(1),.venue-table td:nth-child(1){width:13%!important}
      .venue-table th:nth-child(2),.venue-table td:nth-child(2){width:8%!important}
      .venue-table th:nth-child(3),.venue-table td:nth-child(3){width:12%!important}
      .venue-table th:nth-child(4),.venue-table td:nth-child(4){width:8%!important}
      .venue-table th:nth-child(5),.venue-table td:nth-child(5){width:7%!important}
      .venue-table th:nth-child(6),.venue-table td:nth-child(6){width:7%!important}
      .venue-table th:nth-child(7),.venue-table td:nth-child(7){width:8%!important;text-align:center!important}
      .venue-table th:nth-child(8),.venue-table td:nth-child(8){width:9%!important;text-align:center!important}
      .venue-table th:nth-child(9),.venue-table td:nth-child(9){width:7%!important;text-align:center!important}
      .venue-table th:nth-child(10),.venue-table td:nth-child(10){width:7%!important;text-align:center!important}
      .venue-table th:nth-child(11),.venue-table td:nth-child(11){width:14%!important;text-align:left!important;white-space:nowrap!important;overflow:visible!important}
      .venue-table td:nth-child(1){font-weight:740!important;color:#053b34!important}.venue-table td:nth-child(1) small,.venue-table td small{font-size:9.4px!important;line-height:1.08!important;color:#60766f!important;display:block!important;margin-top:2px!important;font-weight:520!important}
      .venue-table td:nth-child(3),.venue-table td:nth-child(4),.venue-table td:nth-child(5),.venue-table td:nth-child(6){white-space:normal!important;color:#173c35!important}
      .venue-table td:nth-child(7) span,.venue-table td:nth-child(8) span,.venue-table td:nth-child(9) span,.venue-table td:nth-child(10) span,.venue-table .status-pill,.venue-table .plan-pill,.venue-table .verification-pill{font-size:9px!important;padding:4px 7px!important;border-radius:999px!important;line-height:1!important;white-space:nowrap!important;font-weight:850!important}
      .venue-table td:nth-child(11),.venue-table .smv-venue-actions-cell{display:flex!important;align-items:center!important;gap:5px!important;flex-wrap:nowrap!important;justify-content:flex-start!important;min-width:0!important}
      .venue-table td:nth-child(11) button,.venue-table td:nth-child(11) a,.smv-venue-actions-cell button,.smv-venue-actions-cell a{height:27px!important;min-height:27px!important;padding:0 7px!important;border-radius:8px!important;font-size:10px!important;line-height:1!important;margin:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;white-space:nowrap!important;font-weight:800!important;box-shadow:none!important}
      .venue-table td:nth-child(11) button:first-child{min-width:38px!important}.venue-table td:nth-child(11) button:nth-child(2){min-width:72px!important}.venue-table td:nth-child(11) button:nth-child(3){min-width:48px!important}

      .modal-overlay,.venue-modal-card,.modal-card{font-size:12px!important}.venue-modal-card{max-width:min(1060px,96vw)!important}.modal-header{padding:14px 16px!important}.modal-header h2{font-size:22px!important;margin:2px 0!important}.venue-form{padding:14px 16px!important}.venue-form-grid,.form-grid{gap:9px!important}.venue-field label,.form-field label{font-size:9.5px!important;letter-spacing:.12em!important}.venue-form-grid input,.venue-form-grid select,.venue-form-grid textarea,.form-grid input,.form-grid select,.form-grid textarea{font-size:12px!important;min-height:36px!important;padding:8px 10px!important;border-radius:10px!important}

      @media(max-width:1360px){.stage8-venue-stats,.network-kpi-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}.venue-toolbar{grid-template-columns:minmax(340px,1fr) 155px 170px 155px!important}.crm-header-logo{width:175px!important;max-height:50px!important}.leads-table{min-width:1240px!important}.venue-table{min-width:1300px!important}}
      @media(max-width:980px){.crm-header{grid-template-columns:1fr!important;align-items:flex-start!important}.crm-header-title{justify-content:flex-start!important}.filter-bar,.venue-toolbar{grid-template-columns:1fr!important}.stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.stage8-venue-stats,.network-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.page-heading h1,.venue-page-heading h1{font-size:25px!important}.leads-table{min-width:1220px!important}.venue-table{min-width:1280px!important}}
      @media(max-width:640px){:root{--smv-crm-font:11.4px;--smv-crm-table:10.8px}.crm-header-logo{width:155px!important;max-height:46px!important}.stat-card,.venue-stat-card,.network-kpi{min-height:56px!important;padding:9px!important}.leads-table{min-width:1200px!important}.venue-table{min-width:1260px!important}}
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

  function decorateTables(){
    document.querySelectorAll("#leadsTableBody td,#venueTableBody td").forEach(cell=>{
      if(!cell.title){
        const text=String(cell.textContent||"").replace(/\s+/g," ").trim();
        if(text)cell.title=text;
      }
    });
    document.querySelectorAll("#venueTableBody tr").forEach(row=>{
      const cell=row.children&&row.children[10];
      if(cell)cell.classList.add("smv-venue-actions-cell");
    });
  }

  function start(){
    installStyles();
    compactTableSources();
    decorateTables();
    ["leadsTableBody","venueTableBody"].forEach(id=>{
      const tbody=document.getElementById(id);
      if(tbody){
        const observer=new MutationObserver(()=>setTimeout(()=>{compactTableSources();decorateTables();},35));
        observer.observe(tbody,{childList:true,subtree:true,characterData:true});
      }
    });
    setInterval(()=>{compactTableSources();decorateTables();},1200);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();
})();
