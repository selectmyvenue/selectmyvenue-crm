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
      .venue-table td:nth-child(11),
      .venue-table td:nth-child(11)>div,
      .venue-table .smv-venue-actions-cell,
      .venue-table .venue-actions,
      .venue-table .action-buttons{
        display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;
        flex-wrap:nowrap!important;gap:4px!important;white-space:nowrap!important;width:auto!important;max-width:none!important;
      }
      .venue-table td:nth-child(11) button,
      .venue-table td:nth-child(11) a,
      .venue-table .smv-venue-actions-cell button,
      .venue-table .smv-venue-actions-cell a{
        display:inline-flex!important;flex:0 0 auto!important;width:auto!important;min-width:0!important;max-width:none!important;
        height:25px!important;min-height:25px!important;margin:0!important;padding:0 6px!important;border-radius:8px!important;
        font-size:9.2px!important;line-height:1!important;align-items:center!important;justify-content:center!important;white-space:nowrap!important;
      }
      .venue-table td:nth-child(1) small,.venue-table td small{margin-top:1px!important;line-height:1.05!important}
    `;
    document.head.appendChild(style);
  }

  loadScript("crm-core.js?v=20260901-media-1", function () {
    loadScript("venue-media-manager.js?v=20260904-hd30-1", function () {
      loadScript("crm-hotfix-20260909.js?v=crm-final-layout-2", function () {
        installVenueTablePolish();
      });
    });
  });
})();
