(function () {
  "use strict";

  const VENUE_DRAFT_KEY = "smv_master_crm_new_venue_draft_v1";

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

  function getVenueForm() {
    return document.getElementById("venueForm");
  }

  function saveVenueDraft() {
    const form = getVenueForm();
    const venueId = document.getElementById("venueId")?.value || "";
    if (!form || venueId) return;

    const draft = {};
    form.querySelectorAll("input, select, textarea").forEach(function (field) {
      if (!field.id || field.type === "file" || field.id === "venueId") return;
      if (field.type === "checkbox" || field.type === "radio") {
        draft[field.id] = { checked: field.checked };
      } else {
        draft[field.id] = { value: field.value };
      }
    });

    try {
      localStorage.setItem(VENUE_DRAFT_KEY, JSON.stringify(draft));
    } catch (error) {
      console.warn("Unable to autosave venue draft:", error);
    }
  }

  function restoreVenueDraft() {
    const form = getVenueForm();
    const venueId = document.getElementById("venueId")?.value || "";
    if (!form || venueId) return;

    let draft = null;
    try {
      draft = JSON.parse(localStorage.getItem(VENUE_DRAFT_KEY) || "null");
    } catch (_) {
      draft = null;
    }
    if (!draft || typeof draft !== "object") return;

    Object.keys(draft).forEach(function (id) {
      const field = document.getElementById(id);
      if (!field) return;
      const saved = draft[id] || {};
      if (field.type === "checkbox" || field.type === "radio") {
        field.checked = Boolean(saved.checked);
      } else if (Object.prototype.hasOwnProperty.call(saved, "value")) {
        field.value = saved.value == null ? "" : saved.value;
      }
      field.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function clearVenueDraftAfterSuccessfulNewSave() {
    let checks = 0;
    const timer = setInterval(function () {
      checks += 1;
      const venueId = document.getElementById("venueId")?.value || "";
      if (venueId) {
        try { localStorage.removeItem(VENUE_DRAFT_KEY); } catch (_) {}
        clearInterval(timer);
      } else if (checks >= 60) {
        clearInterval(timer);
      }
    }, 500);
  }

  function setupVenueDraftProtection() {
    const form = getVenueForm();
    const modal = document.getElementById("venueModal");
    const addButton = document.getElementById("addVenueBtn");
    if (!form || !modal || !addButton || form.dataset.smvDraftProtection === "1") return;

    form.dataset.smvDraftProtection = "1";

    form.addEventListener("input", saveVenueDraft);
    form.addEventListener("change", saveVenueDraft);

    addButton.addEventListener("click", function () {
      setTimeout(restoreVenueDraft, 0);
    });

    form.addEventListener("submit", function () {
      const wasNewVenue = !(document.getElementById("venueId")?.value || "");
      saveVenueDraft();
      if (wasNewVenue) clearVenueDraftAfterSuccessfulNewSave();
    });

    modal.addEventListener("click", function (event) {
      if (event.target === modal && !modal.hidden) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);

    window.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !modal.hidden) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  }

  loadScript("crm-core.js?v=20260901-media-1", function () {
    loadScript("venue-media-manager.js?v=20260901-media-1", function () {
      setupVenueDraftProtection();
    });
  });
})();
