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

      /* Customer enquiries — ALL fields preserved and arranged on one desktop screen */
      .table-wrapper{overflow-x:hidden!important}
      .leads-table{width:100%!important;min-width:0!important;table-layout:fixed!important}
      .leads-table th,.leads-table td{padding-left:3px!important;padding-right:3px!important}

      /* CUSTOMER / PHONE / CREATED / EMAIL / SOURCE / EVENT / EVENT DATE / GUESTS / LOCATION / STATUS / COMMENT / DETAILS / ASSIGN */
      .leads-table th:nth-child(1),.leads-table td:nth-child(1){width:7.2%!important}
      .leads-table th:nth-child(2),.leads-table td:nth-child(2){width:7.2%!important}
      .leads-table th:nth-child(3),.leads-table td:nth-child(3){width:10.2%!important}
      .leads-table th:nth-child(4),.leads-table td:nth-child(4){width:10.8%!important}
      .leads-table th:nth-child(5),.leads-table td:nth-child(5){width:7.4%!important}
      .leads-table th:nth-child(6),.leads-table td:nth-child(6){width:7.4%!important}
      .leads-table th:nth-child(7),.leads-table td:nth-child(7){width:8.1%!important}
      .leads-table th:nth-child(8),.leads-table td:nth-child(8){width:4.2%!important;text-align:center!important}
      .leads-table th:nth-child(9),.leads-table td:nth-child(9){width:7.2%!important}
      .leads-table th:nth-child(10),.leads-table td:nth-child(10){width:7.8%!important;text-align:center!important}

      /* COMMENT stays as its own field with indicator + pencil + view icon */
      .leads-table th:nth-child(11),.leads-table td:nth-child(11){width:5.6%!important;display:table-cell!important;visibility:visible!important;overflow:visible!important;text-align:center!important;white-space:nowrap!important}
      .leads-table .crm-comment-cell{display:flex!important;align-items:center!important;justify-content:center!important;gap:3px!important;white-space:nowrap!important}
      .leads-table .comment-icon-btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:28px!important;min-width:28px!important;max-width:28px!important;height:28px!important;min-height:28px!important;padding:0!important;margin:0!important;flex:0 0 28px!important}
      .leads-table .crm-comment-indicator{flex:0 0 auto!important}

      /* DETAILS is a separate field */
      .leads-table th:nth-child(12),.leads-table td:nth-child(12){width:7.1%!important;text-align:center!important;overflow:visible!important;white-space:nowrap!important}
      .leads-table td:nth-child(12){display:table-cell!important}
      .leads-table td:nth-child(12) .view-lead-btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:auto!important;min-width:58px!important;max-width:none!important;height:29px!important;padding:0 7px!important;margin:0!important;font-size:10px!important;white-space:nowrap!important}

      /* ASSIGN is a separate final field */
      .leads-table th:nth-child(13),.leads-table td:nth-child(13){width:9.8%!important;text-align:center!important;overflow:visible!important;white-space:nowrap!important}
      .leads-table td:nth-child(13){display:table-cell!important}
      .leads-table td:nth-child(13) .venue-assign-btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:3px!important;width:auto!important;min-width:72px!important;max-width:none!important;height:29px!important;padding:0 7px!important;margin:0!important;font-size:10px!important;white-space:nowrap!important}

      @media(max-width:1350px){
        .leads-table th,.leads-table td{font-size:10.4px!important;padding-left:2px!important;padding-right:2px!important}
        .leads-table th{font-size:9.2px!important;letter-spacing:.04em!important}
        .leads-table .comment-icon-btn{width:25px!important;min-width:25px!important;max-width:25px!important;height:26px!important;min-height:26px!important;flex-basis:25px!important}
        .leads-table td:nth-child(12) .view-lead-btn{min-width:52px!important;height:27px!important;padding:0 5px!important;font-size:9.4px!important}
        .leads-table td:nth-child(13) .venue-assign-btn{min-width:66px!important;height:27px!important;padding:0 5px!important;font-size:9.4px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function splitLeadActionColumns() {
    const table = document.querySelector(".leads-table");
    if (!table) return;

    const headerRow = table.querySelector("thead tr");
    if (headerRow) {
      const headers = Array.from(headerRow.children);
      if (headers.length === 12) {
        const actionHeader = headers[11];
        actionHeader.textContent = "DETAILS";
        actionHeader.classList.add("details-column");
        const assignHeader = document.createElement("th");
        assignHeader.textContent = "ASSIGN";
        assignHeader.className = "assign-column";
        actionHeader.after(assignHeader);
      } else if (headers.length >= 13) {
        headers[10].textContent = "COMMENT";
        headers[11].textContent = "DETAILS";
        headers[12].textContent = "ASSIGN";
      }
    }

    table.querySelectorAll("tbody tr").forEach(row => {
      const cells = Array.from(row.children);

      if (cells.length === 1 && cells[0].hasAttribute("colspan")) {
        cells[0].setAttribute("colspan", "13");
        return;
      }

      if (cells.length === 12) {
        const actionCell = cells[11];
        const assignBtn = actionCell.querySelector(".venue-assign-btn");
        const detailsBtn = actionCell.querySelector(".view-lead-btn");

        if (assignBtn && detailsBtn) {
          const assignCell = document.createElement("td");
          assignCell.className = "assign-column-cell";
          assignCell.appendChild(assignBtn);
          actionCell.classList.remove("action-column");
          actionCell.classList.add("details-column-cell");
          actionCell.after(assignCell);
        }
      }
    });
  }

  function watchLeadTable() {
    splitLeadActionColumns();
    const tbody = document.getElementById("leadsTableBody");
    if (!tbody || tbody.dataset.smvSplitWatch === "1") return;
    tbody.dataset.smvSplitWatch = "1";
    const observer = new MutationObserver(() => splitLeadActionColumns());
    observer.observe(tbody, { childList: true, subtree: false });
  }

  loadScript("crm-core.js?v=20260901-media-1", function () {
    loadScript("venue-media-manager.js?v=20260904-hd30-1", function () {
      loadScript("crm-hotfix-20260909.js?v=crm-final-layout-3", function () {
        installVenueTablePolish();
        watchLeadTable();
        setTimeout(watchLeadTable, 250);
        setTimeout(watchLeadTable, 900);
      });
    });
  });
})();
