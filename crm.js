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

  loadScript("crm-core.js?v=20260901-media-1", function () {
    loadScript("venue-media-manager.js?v=20260901-media-1");
  });
})();
