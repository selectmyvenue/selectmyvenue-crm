(function () {
  "use strict";

  function loadScript(src, done) {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = done || null;
    script.onerror = function () {
      console.error("Select My Venue CRM: failed to load", src);
    };
    document.head.appendChild(script);
  }

  function installVenueTablePolish() {
    const old = document.getElementById("smvVenueTablePolish");
    if (old) old.remove();
    const style = document.createElement("style");
    style.id = "smvVenueTablePolish";
    style.textContent = `
      /* Venue Management — compact rows + single-line actions */
      .venue-table{min-width:1180px!important;table-layout:fixed!important}
      .venue-table th,.venue-table td{padding:5px 7px!important;height:46px!important;min-height:46px!important;line-height:1.12!important}
      .venue-table th:nth-child(1),.venue-table td:nth-child(1){width:13%!important}
      .venue-table th:nth-child(2),.venue-table td:nth-child(2){width:7%!important}
      .venue-table th:nth-child(3),.venue-table td:nth-child(3){width:12%!important}
      .venue-table th:nth-child(4),.venue-table td:nth-child(4){width:8%!important}
      .venue-table th:nth-child(5),.venue-table td:nth-child(5){width:7%!important}
      .venue-table th:nth-child(6),.venue-table td:nth-child(6){width:8%!important}
      .venue-table th:nth-child(7),.venue-table td:nth-child(7){width:8%!important}
      .venue-table th:nth-child(8),.venue-table td:nth-child(8){width:9%!important}
      .venue-table th:nth-child(9),.venue-table td:nth-child(9){width:7%!important}
      .venue-table th:nth-child(10),.venue-table td:nth-child(10){width:7%!important}
      .venue-table th:nth-child(11),.venue-table td:nth-child(11){width:14%!important;overflow:visible!important;white-space:nowrap!important}
      .venue-table td:nth-child(11),.venue-table td:nth-child(11)>div,.venue-table .smv-venue-actions-cell,.venue-table .venue-actions,.venue-table .action-buttons{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:nowrap!important;gap:4px!important;white-space:nowrap!important;width:auto!important;max-width:none!important}
      .venue-table td:nth-child(11) button,.venue-table td:nth-child(11) a,.venue-table .smv-venue-actions-cell button,.venue-table .smv-venue-actions-cell a{display:inline-flex!important;flex:0 0 auto!important;width:auto!important;min-width:0!important;max-width:none!important;height:25px!important;min-height:25px!important;margin:0!important;padding:0 6px!important;border-radius:8px!important;font-size:9.7px!important;line-height:1!important;align-items:center!important;justify-content:center!important;white-space:nowrap!important}
      .venue-table td:nth-child(1) small,.venue-table td small{margin-top:1px!important;line-height:1.05!important}

      /* Very slight typography increase */
      :root{--smv-crm-font:12px!important;--smv-crm-cell:11.5px!important;--smv-crm-head:10.2px!important}
      html,body,.crm-app{font-size:12px!important}
      .leads-table td,.venue-table td{font-size:11.5px!important;font-weight:540!important}
      .leads-table th,.venue-table th{font-size:10.2px!important}
      .page-heading p,.venue-page-heading p{font-size:12.2px!important}
      .command-health,.filter-workspace-note{font-size:10.2px!important}
      .search-box input,.venue-search-input,.venue-filter-select,#statusFilter{font-size:12px!important}
      .status-badge,.lead-status-badge{font-size:10px!important}
      .smv-compact-source{font-size:9.7px!important}
      .action-btn,.comment-btn,.leads-table button{font-size:10.5px!important}
      .venue-table td:nth-child(1) small,.venue-table td small{font-size:9.6px!important}
      .venue-table .status-pill,.venue-table .plan-pill,.venue-table .verification-pill,.venue-table td:nth-child(7) span,.venue-table td:nth-child(8) span,.venue-table td:nth-child(9) span,.venue-table td:nth-child(10) span{font-size:9.2px!important}

      /* Tighten only vertical air below CRM header */
      .page-heading,.venue-page-heading{padding-top:5px!important;padding-bottom:6px!important}
      .stats-grid,.venue-stats-grid,.stage8-venue-stats,.network-kpi-grid{margin-top:3px!important}

      /* Customer enquiries — fit every field on one desktop screen, no left/right scroll */
      .table-wrapper{overflow-x:hidden!important}
      .leads-table{width:100%!important;min-width:0!important;table-layout:fixed!important}
      .leads-table th,.leads-table td{padding-left:5px!important;padding-right:5px!important}
      .leads-table th:nth-child(1),.leads-table td:nth-child(1){width:8%!important}
      .leads-table th:nth-child(2),.leads-table td:nth-child(2){width:8%!important}
      .leads-table th:nth-child(3),.leads-table td:nth-child(3){width:10.5%!important}
      .leads-table th:nth-child(4),.leads-table td:nth-child(4){width:14%!important}
      .leads-table th:nth-child(5),.leads-table td:nth-child(5){width:8.5%!important}
      .leads-table th:nth-child(6),.leads-table td:nth-child(6){width:8.5%!important}
      .leads-table th:nth-child(7),.leads-table td:nth-child(7){width:8.5%!important}
      .leads-table th:nth-child(8),.leads-table td:nth-child(8){width:4.5%!important}
      .leads-table th:nth-child(9),.leads-table td:nth-child(9){width:9.5%!important}
      .leads-table th:nth-child(10),.leads-table td:nth-child(10){width:8%!important}
      .leads-table th:nth-child(11),.leads-table td:nth-child(11){width:4.5%!important}
      .leads-table th:nth-child(12),.leads-table td:nth-child(12){width:7.5%!important;overflow:visible!important;white-space:nowrap!important}
      .leads-table td:nth-child(12),.leads-table td:nth-child(12)>div{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:4px!important;flex-wrap:nowrap!important;white-space:nowrap!important}
      .leads-table td:nth-child(12) button,.leads-table td:nth-child(12) a{flex:0 0 auto!important;min-width:0!important;max-width:none!important;width:auto!important;height:29px!important;padding:0 8px!important;font-size:10.2px!important;white-space:nowrap!important}
      @media(max-width:1350px){
        .leads-table th,.leads-table td{font-size:10.7px!important;padding-left:4px!important;padding-right:4px!important}
        .leads-table th{font-size:9.5px!important}
        .leads-table td:nth-child(12) button,.leads-table td:nth-child(12) a{padding:0 6px!important;font-size:9.7px!important}
      }
    `;
    document.head.appendChild(style);
  }

  loadScript("crm-core.js?v=20260901-media-1", function () {
    loadScript("venue-media-manager.js?v=20260904-hd30-1", function () {
      loadScript("crm-hotfix-20260909.js?v=crm-final-layout-3", function () {
        installVenueTablePolish();
      });
    });
  });
})();
