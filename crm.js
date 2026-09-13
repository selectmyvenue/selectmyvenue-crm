(function () {
  "use strict";

  function addScript(src, onload) {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    if (typeof onload === "function") script.onload = onload;
    script.onerror = function () {
      console.error("Select My Venue CRM: failed to load", src);
    };
    document.head.appendChild(script);
  }

  addScript("crm-base.js?v=20260914-ops-base-1", function () {
    let checks = 0;
    const waitForCore = window.setInterval(function () {
      checks += 1;

      const coreReady =
        typeof window.openLeadModal === "function" &&
        document.getElementById("leadsTableBody") &&
        document.getElementById("venueManagementSection");

      if (coreReady || checks >= 100) {
        window.clearInterval(waitForCore);
        window.setTimeout(function () {
          addScript("crm-enhancements.js?v=20260914-ops-1");
        }, coreReady ? 450 : 0);
      }
    }, 100);
  });
})();
