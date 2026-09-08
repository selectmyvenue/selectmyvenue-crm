(function () {
  "use strict";

  function compactSource(raw) {
    const text = String(raw || "").replace(/\s+/g, " ").trim();
    if (!text) return "—";
    if (/venue profile/i.test(text)) return "Website - Venue";
    if (/wedding/i.test(text)) return "Website - Wedding";
    if (/party/i.test(text)) return "Website - Party";
    if (/corporate/i.test(text)) return "Website - Corporate";
    if (/delhi ncr|delhi-ncr/i.test(text)) return "Website - Delhi NCR";
    if (/quick enquiry/i.test(text)) return "Website - Quick";
    if (/main enquiry|home/i.test(text)) return "Website - Home";
    if (/whatsapp/i.test(text)) return "WhatsApp";
    if (/^website/i.test(text)) return text.split("|")[0].trim().slice(0, 22);
    return text.slice(0, 22);
  }

  function installStyles() {
    const old = document.getElementById("smvCrmSourceHotfixStyles");
    if (old) old.remove();

    const style = document.createElement("style");
    style.id = "smvCrmSourceHotfixStyles";
    style.textContent = `
      :root{--smv-crm-font:11.5px;--smv-crm-cell:11px;--smv-crm-head:9.8px;--smv-green:#08745d;--smv-deep:#063b33;--smv-soft:#f6fcfa;--smv-line:#e4f0ec}
      html,body,.crm-app{font-size:var(--smv-crm-font)!important;overflow-x:hidden!important;color:#173c35!important}
      body{line-height:1.32!important;background:#f7fcfa!important}
      .crm-app{background:linear-gradient(135deg,#f8fdfb 0%,#f1fbf7 52%,#fbfefd 100%)!important}

      /* Top area: smaller, premium, less wasted space */
      .crm-header{min-height:54px!important;padding:5px 10px!important;gap:10px!important;grid-template-columns:minmax(200px,.78fr) auto minmax(230px,.78fr)!important;align-items:center!important;overflow:hidden!important;background:rgba(255,255,255,.96)!important;border-bottom:1px solid #dceee8!important;box-shadow:0 5px 16px rgba(7,95,77,.06)!important}
      .crm-brand{gap:8px!important;min-width:0!important}.crm-header-logo{width:188px!important;max-width:188px!important;max-height:54px!important;height:auto!important;object-fit:contain!important;object-position:left center!important}.crm-brand-text strong{font-size:19px!important;line-height:1.05!important;white-space:nowrap!important;color:#075f4d!important;letter-spacing:-.02em!important}
      .crm-header-title,#crmPageTitle{font-size:16px!important;line-height:1.05!important;white-space:nowrap!important;color:#075f4d!important}.crm-header-title{gap:7px!important;flex-wrap:nowrap!important;align-items:center!important;justify-content:center!important}.crm-header-actions{gap:6px!important;justify-content:flex-end!important;align-items:center!important;overflow:hidden!important}.staff-name{font-size:10.5px!important;padding:7px 10px!important;max-width:180px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}.venue-nav-btn,.account-password-btn,.logout-btn,.primary-btn,.secondary-btn{font-size:10.8px!important;line-height:1!important;min-height:31px!important;padding:7px 10px!important;border-radius:11px!important;font-weight:800!important;white-space:nowrap!important}

      .page-heading,.venue-page-heading{padding:12px 10px 8px!important;margin:0!important;gap:10px!important;align-items:flex-end!important}.page-kicker,.venue-kicker{font-size:8.6px!important;line-height:1.1!important;letter-spacing:.18em!important;color:#5f766f!important}.page-heading h1,.venue-page-heading h1{font-size:clamp(23px,2.05vw,31px)!important;line-height:1.02!important;margin:4px 0 2px!important;letter-spacing:-.035em!important;color:#063b33!important}.page-heading p,.venue-page-heading p{font-size:11.8px!important;line-height:1.3!important;margin:0!important;max-width:680px!important;color:#617872!important}.command-health{font-size:9.8px!important;margin-top:5px!important;gap:5px!important}.heading-actions,.venue-heading-actions{gap:6px!important;flex-wrap:wrap!important}

      .stats-grid,.venue-stats-grid,.stage8-venue-stats,.network-kpi-grid{gap:8px!important;margin:6px 8px 10px!important}.stats-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}.stage8-venue-stats,.network-kpi-grid{grid-template-columns:repeat(6,minmax(0,1fr))!important}.stat-card,.venue-stat-card,.network-kpi{min-height:56px!important;padding:9px 12px!important;border-radius:14px!important;gap:9px!important;border:1px solid #dceee8!important;background:rgba(255,255,255,.94)!important;box-shadow:0 6px 18px rgba(8,95,77,.055)!important}.stat-icon{width:35px!important;height:35px!important;font-size:16px!important;border-radius:11px!important}.stat-content span,.venue-stat-card span,.network-kpi span{font-size:8.6px!important;letter-spacing:.12em!important;line-height:1.08!important;color:#657b75!important}.stat-content strong,.venue-stat-card strong,.network-kpi strong{font-size:22px!important;line-height:1!important;color:#075f4d!important}.network-kpi small{font-size:9.2px!important;line-height:1.1!important}

      .leads-section,.venue-management-section,.network-insights{margin:0 8px 12px!important;border-radius:15px!important;overflow:hidden!important;background:rgba(255,255,255,.82)!important;border:1px solid #d9eee8!important;box-shadow:0 9px 24px rgba(8,95,77,.055)!important}.network-insights{padding:10px 12px!important}.network-insights-head{margin-bottom:8px!important}.network-insights-head h2{font-size:19px!important;margin:2px 0!important;line-height:1.08!important;color:#063b33!important}.network-insights-head p{font-size:10.8px!important;margin:0!important;color:#607973!important}.plan-distribution{padding:8px 0 0!important;margin-top:8px!important;gap:8px!important;border-top:1px solid #edf5f2!important}.plan-distribution span,.plan-distribution button,.plan-pill{font-size:9.8px!important;padding:5px 9px!important;border-radius:999px!important}

      .filter-bar{display:grid!important;grid-template-columns:minmax(420px,1fr) 145px 128px!important;align-items:center!important;gap:8px!important;padding:9px 12px!important;background:#f8fdfb!important;border-bottom:1px solid #e1f0eb!important}.venue-toolbar{display:grid!important;grid-template-columns:minmax(420px,1fr) 165px 185px 165px!important;align-items:center!important;gap:8px!important;padding:9px 12px!important;margin:6px 0 10px!important;background:#f8fdfb!important;border:1px solid #e0f0eb!important;border-radius:14px!important}.search-box{min-height:38px!important;position:relative!important}.search-icon{left:12px!important;top:50%!important;transform:translateY(-50%)!important}.search-box input{padding-left:36px!important}.search-box input,.venue-search-input,.venue-filter-select,#statusFilter{height:38px!important;min-height:38px!important;font-size:11.8px!important;border-radius:11px!important;padding-top:0!important;padding-bottom:0!important;color:#173c35!important;background:#fff!important;border:1px solid #d8e9e4!important}.filter-workspace-note{font-size:9.8px!important;white-space:nowrap!important;justify-content:flex-end!important}

      /* Shared table system: Excel-like, clean, no heavy lines */
      .table-wrapper,.venue-table-wrapper{overflow-x:auto!important;max-width:100%!important;-webkit-overflow-scrolling:touch!important;background:#fff!important;border-radius:0 0 15px 15px!important}.leads-table,.venue-table{width:100%!important;table-layout:fixed!important;border-collapse:separate!important;border-spacing:0!important;background:#fff!important;color:#173c35!important}.leads-table th,.leads-table td,.venue-table th,.venue-table td{box-sizing:border-box!important;vertical-align:middle!important;overflow:hidden!important;text-overflow:ellipsis!important;line-height:1.18!important}.leads-table th,.venue-table th{font-size:var(--smv-crm-head)!important;letter-spacing:.075em!important;font-weight:850!important;white-space:nowrap!important;color:#5e736d!important;background:#f4faf8!important;border-bottom:1px solid #deede8!important}.leads-table td,.venue-table td{font-size:var(--smv-crm-cell)!important;font-weight:520!important;color:#173c35!important;border-bottom:1px solid #eef5f2!important}.leads-table tbody tr:hover,.venue-table tbody tr:hover{background:#fbfffd!important}

      /* Customer enquiry table: all columns visible, Details button full */
      .leads-table{min-width:1160px!important}.leads-table th,.leads-table td{padding:7px 8px!important;height:46px!important}.leads-table th:nth-child(1),.leads-table td:nth-child(1){width:8.5%!important}.leads-table th:nth-child(2),.leads-table td:nth-child(2){width:8%!important}.leads-table th:nth-child(3),.leads-table td:nth-child(3){width:10.5%!important}.leads-table th:nth-child(4),.leads-table td:nth-child(4){width:14.5%!important;white-space:nowrap!important}.leads-table th:nth-child(5),.leads-table td:nth-child(5){width:9%!important;white-space:nowrap!important}.leads-table th:nth-child(6),.leads-table td:nth-child(6){width:8.5%!important}.leads-table th:nth-child(7),.leads-table td:nth-child(7){width:8.5%!important}.leads-table th:nth-child(8),.leads-table td:nth-child(8){width:5%!important;text-align:center!important}.leads-table th:nth-child(9),.leads-table td:nth-child(9){width:9%!important}.leads-table th:nth-child(10),.leads-table td:nth-child(10){width:8%!important;text-align:center!important}.leads-table th:nth-child(11),.leads-table td:nth-child(11){width:4.5%!important;text-align:center!important;overflow:visible!important}.leads-table th:nth-child(12),.leads-table td:nth-child(12){width:5.5%!important;text-align:center!important;overflow:visible!important}.leads-table td:nth-child(1){font-weight:720!important;color:#063c33!important}.leads-table td:nth-child(2),.leads-table td:nth-child(3),.leads-table td:nth-child(4),.leads-table td:nth-child(6),.leads-table td:nth-child(7),.leads-table td:nth-child(8),.leads-table td:nth-child(9){font-weight:560!important}.leads-table td:nth-child(4){direction:ltr!important}.leads-table th:nth-child(11){font-size:0!important}.leads-table th:nth-child(11)::after{content:'COMMENT';font-size:9.5px!important}.leads-table th:nth-child(12){font-size:0!important}.leads-table th:nth-child(12)::after{content:'ACTION';font-size:9.5px!important}
      .smv-compact-source{display:inline-block!important;max-width:100%!important;padding:4px 6px!important;border-radius:999px!important;background:#eefbf7!important;border:1px solid #cfeee7!important;color:#087f71!important;font-size:9.3px!important;font-weight:850!important;line-height:1.05!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;vertical-align:middle!important}.status-badge,.lead-status-badge{font-size:9.7px!important;padding:5px 7px!important;border-radius:999px!important;white-space:nowrap!important;line-height:1!important}.action-btn,.comment-btn,.leads-table button{height:28px!important;min-height:28px!important;max-height:28px!important;border-radius:9px!important;font-size:10.2px!important;line-height:1!important;padding:0 7px!important;min-width:28px!important;max-width:68px!important;white-space:nowrap!important}.leads-table td:nth-child(12) button,.leads-table td:nth-child(12) a{min-width:56px!important;max-width:68px!important;background:#08745d!important;color:#fff!important;border-color:#08745d!important}

      /* Venue table: actions always horizontal */
      .venue-table{min-width:1230px!important}.venue-table th,.venue-table td{padding:7px 8px!important;height:52px!important}.venue-table th:nth-child(1),.venue-table td:nth-child(1){width:13%!important}.venue-table th:nth-child(2),.venue-table td:nth-child(2){width:8%!important}.venue-table th:nth-child(3),.venue-table td:nth-child(3){width:12%!important}.venue-table th:nth-child(4),.venue-table td:nth-child(4){width:8%!important}.venue-table th:nth-child(5),.venue-table td:nth-child(5){width:7%!important}.venue-table th:nth-child(6),.venue-table td:nth-child(6){width:7%!important}.venue-table th:nth-child(7),.venue-table td:nth-child(7){width:8%!important;text-align:center!important}.venue-table th:nth-child(8),.venue-table td:nth-child(8){width:9%!important;text-align:center!important}.venue-table th:nth-child(9),.venue-table td:nth-child(9){width:7%!important;text-align:center!important}.venue-table th:nth-child(10),.venue-table td:nth-child(10){width:7%!important;text-align:center!important}.venue-table th:nth-child(11),.venue-table td:nth-child(11){width:14%!important;text-align:left!important;overflow:visible!important;white-space:nowrap!important}.venue-table td:nth-child(1){font-weight:720!important;color:#063c33!important}.venue-table td:nth-child(1) small,.venue-table td small{font-size:9.2px!important;line-height:1.1!important;margin-top:2px!important;color:#60766f!important;font-weight:520!important;display:block!important}.venue-table td:nth-child(3),.venue-table td:nth-child(4),.venue-table td:nth-child(5),.venue-table td:nth-child(6){white-space:normal!important}.venue-table .status-pill,.venue-table .plan-pill,.venue-table .verification-pill,.venue-table td:nth-child(7) span,.venue-table td:nth-child(8) span,.venue-table td:nth-child(9) span,.venue-table td:nth-child(10) span{font-size:8.8px!important;padding:4px 7px!important;border-radius:999px!important;line-height:1!important;white-space:nowrap!important;font-weight:850!important}.venue-table td:nth-child(11),.venue-table .smv-venue-actions-cell{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:5px!important;flex-wrap:nowrap!important}.venue-table td:nth-child(11) button,.venue-table td:nth-child(11) a,.smv-venue-actions-cell button,.smv-venue-actions-cell a{height:27px!important;min-height:27px!important;max-height:27px!important;margin:0!important;padding:0 7px!important;border-radius:8px!important;font-size:9.8px!important;line-height:1!important;font-weight:800!important;white-space:nowrap!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;box-shadow:none!important}.venue-table td:nth-child(11) button:first-child{min-width:38px!important}.venue-table td:nth-child(11) button:nth-child(2){min-width:70px!important}.venue-table td:nth-child(11) button:nth-child(3){min-width:48px!important}

      .modal-overlay,.venue-modal-card,.modal-card{font-size:12px!important}.venue-modal-card{max-width:min(1060px,96vw)!important}.modal-header{padding:14px 16px!important}.modal-header h2{font-size:23px!important;margin:3px 0!important}.venue-form{padding:14px 16px!important}.venue-form-grid,.form-grid{gap:10px!important}.venue-field label,.form-field label{font-size:9.8px!important;letter-spacing:.12em!important}.venue-form-grid input,.venue-form-grid select,.venue-form-grid textarea,.form-grid input,.form-grid select,.form-grid textarea{font-size:12px!important;min-height:37px!important;padding:8px 10px!important;border-radius:10px!important}

      @media(max-width:1280px){.crm-header{grid-template-columns:1fr!important}.crm-header-logo{width:170px!important;max-height:50px!important}.crm-brand-text strong,.crm-header-title,#crmPageTitle{font-size:17px!important}.leads-table{min-width:1180px!important}.venue-table{min-width:1230px!important}.filter-bar,.venue-toolbar{grid-template-columns:1fr!important}.filter-workspace-note{justify-content:flex-start!important}}
      @media(max-width:800px){:root{--smv-crm-font:11.3px;--smv-crm-cell:10.8px}.crm-header{align-items:flex-start!important}.crm-header-logo{width:155px!important;max-height:48px!important}.page-heading h1,.venue-page-heading h1{font-size:26px!important}.stat-card,.venue-stat-card{min-height:62px!important;padding:9px!important}.stats-grid,.stage8-venue-stats,.network-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.leads-table{min-width:1160px!important}.venue-table{min-width:1230px!important}}
    `;
    document.head.appendChild(style);
  }

  function compactTableSources() {
    document.querySelectorAll("#leadsTableBody tr").forEach(row => {
      const cell = row.children && row.children[4];
      if (!cell) return;
      const raw = cell.dataset.smvSourceRaw || (cell.textContent || "").trim();
      if (!raw || raw === "—") return;
      const short = compactSource(raw);
      cell.dataset.smvSourceRaw = raw;
      cell.title = raw;
      cell.innerHTML = "<span class='smv-compact-source'></span>";
      const span = cell.querySelector(".smv-compact-source");
      if (span) span.textContent = short;
    });
  }

  function addCellTitles() {
    document.querySelectorAll(".leads-table td,.venue-table td").forEach(cell => {
      if (!cell.title && cell.textContent) cell.title = cell.textContent.replace(/\s+/g, " ").trim();
    });
  }

  function start() {
    installStyles();
    compactTableSources();
    addCellTitles();
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => {
        compactTableSources();
        addCellTitles();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
