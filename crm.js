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

  function installProfileStrengthStyles() {
    if (document.getElementById("smvVenueStrengthStyles")) return;
    const style = document.createElement("style");
    style.id = "smvVenueStrengthStyles";
    style.textContent = `
      .smv-profile-strength{margin:16px 0;padding:16px;border:1px solid #d9ebe6;border-radius:16px;background:linear-gradient(145deg,#fbfffe,#f2faf8);box-shadow:0 10px 28px rgba(11,77,67,.055)}
      .smv-strength-head{display:flex;align-items:center;justify-content:space-between;gap:16px}.smv-strength-head h3{margin:0;color:#123f38;font-size:17px}.smv-strength-score{display:inline-flex;align-items:center;justify-content:center;min-width:74px;height:34px;padding:0 10px;border-radius:999px;background:#e7f7f3;color:#087f6c;font-size:12px;font-weight:950}.smv-strength-track{height:8px;margin:12px 0 10px;border-radius:999px;background:#e1eeea;overflow:hidden}.smv-strength-track span{display:block;height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,#15b99f,#d9b63e);transition:width .2s ease}.smv-strength-state{margin:0;color:#58736d;font-size:11px;font-weight:800}.smv-strength-missing{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.smv-strength-missing span{padding:5px 8px;border:1px solid #e3ebe8;border-radius:999px;background:#fff;color:#6e817d;font-size:9px;font-weight:800}.smv-strength-missing span.done{color:#087f6c;background:#effaf7;border-color:#d3eee7}.smv-strength-note{margin-top:9px;color:#78908b;font-size:9px;line-height:1.45;font-weight:650}
    `;
    document.head.appendChild(style);
  }

  function setupVenueProfileStrength() {
    const form = getVenueForm();
    const modal = document.getElementById("venueModal");
    if (!form || !modal || form.dataset.smvStrength === "1") return;
    form.dataset.smvStrength = "1";
    installProfileStrengthStyles();

    const panel = document.createElement("section");
    panel.id = "smvVenueProfileStrength";
    panel.className = "smv-profile-strength";
    panel.innerHTML = `
      <div class="smv-strength-head">
        <div><div class="venue-kicker">PROFILE QUALITY</div><h3>Public Venue Profile Strength</h3></div>
        <strong id="smvStrengthScore" class="smv-strength-score">0%</strong>
      </div>
      <div class="smv-strength-track"><span id="smvStrengthBar"></span></div>
      <p id="smvStrengthState" class="smv-strength-state">Complete the venue details to improve customer confidence.</p>
      <div id="smvStrengthMissing" class="smv-strength-missing"></div>
      <div class="smv-strength-note">This score is only a CRM quality assistant. It does not change verification, ranking, plan or public status.</div>
    `;

    const mediaEditor = form.querySelector(".venue-media-editor");
    if (mediaEditor) mediaEditor.insertAdjacentElement("beforebegin", panel);
    else form.insertBefore(panel, form.firstChild);

    function allFields() {
      return Array.from(form.querySelectorAll("input,select,textarea"));
    }
    function findField(tokens) {
      const fields = allFields();
      return fields.find(function(field){
        const key = `${field.id || ""} ${field.name || ""}`.toLowerCase();
        return tokens.some(token => key.includes(token));
      }) || null;
    }
    function hasValue(tokens) {
      const field = findField(tokens);
      if (!field) return false;
      if (field.type === "checkbox" || field.type === "radio") return field.checked;
      return String(field.value || "").trim().length > 0;
    }
    function hasAnyChecked(tokens) {
      return allFields().some(function(field){
        const key = `${field.id || ""} ${field.name || ""}`.toLowerCase();
        return (field.type === "checkbox" || field.type === "radio") && field.checked && tokens.some(token => key.includes(token));
      });
    }
    function hasCover() {
      const image = form.querySelector(".venue-media-editor img:not([hidden]), #venueCoverPreview img:not([hidden]), img[id*='cover'][src]");
      return Boolean(image && image.getAttribute("src"));
    }
    function galleryImageCount() {
      return form.querySelectorAll("#venueGalleryPreview .venue-gallery-item img").length;
    }
    function galleryVideoCount() {
      return form.querySelectorAll("#venueGalleryPreview .venue-gallery-item video").length;
    }

    const checks = [
      { label:"Venue name", weight:9, ok:()=>hasValue(["venuename","venue_name","name"]) },
      { label:"Venue type", weight:7, ok:()=>hasValue(["venuetype","venue_type"]) },
      { label:"City", weight:7, ok:()=>hasValue(["venuecity","city"]) },
      { label:"Area", weight:6, ok:()=>hasValue(["venuearea","area"]) },
      { label:"Address", weight:5, ok:()=>hasValue(["address"]) },
      { label:"Capacity", weight:8, ok:()=>hasValue(["capacitymax","capacity_max","capacitymin","capacity_min"]) },
      { label:"Price", weight:8, ok:()=>hasValue(["pricemin","price_min","budgetmin","budget_min"]) },
      { label:"Description", weight:8, ok:()=>hasValue(["description"]) },
      { label:"Contact", weight:6, ok:()=>hasValue(["phone","mobile","whatsapp","email"]) },
      { label:"Google Maps", weight:5, ok:()=>hasValue(["googlemap","google_map","maps"]) },
      { label:"Events", weight:6, ok:()=>hasValue(["eventtype","event_type","events"]) || hasAnyChecked(["wedding","birthday","engagement","corporate","party","reception"]) },
      { label:"Facilities", weight:5, ok:()=>hasAnyChecked(["parking","room","catering","decoration","food","veg","nonveg"]) },
      { label:"Cover photo", weight:8, ok:hasCover },
      { label:"Gallery photos", weight:7, ok:()=>galleryImageCount()>=5 },
      { label:"Video", weight:5, ok:()=>galleryVideoCount()>=1 }
    ];

    function updateStrength() {
      let earned = 0;
      const total = checks.reduce((sum, check) => sum + check.weight, 0);
      const missing = [];
      checks.forEach(function(check){
        let ok = false;
        try { ok = Boolean(check.ok()); } catch (_) { ok = false; }
        if (ok) earned += check.weight; else missing.push(check.label);
      });
      const score = Math.max(0, Math.min(100, Math.round(earned / total * 100)));
      const scoreNode = document.getElementById("smvStrengthScore");
      const bar = document.getElementById("smvStrengthBar");
      const state = document.getElementById("smvStrengthState");
      const missingNode = document.getElementById("smvStrengthMissing");
      if (scoreNode) scoreNode.textContent = `${score}%`;
      if (bar) bar.style.width = `${score}%`;
      if (state) state.textContent = score >= 90 ? "Excellent — this profile is customer-ready." : score >= 75 ? "Strong — add the remaining details for a premium profile." : score >= 55 ? "Good start — important discovery information is still missing." : "Needs attention — complete key venue information before promotion.";
      if (missingNode) {
        const topMissing = missing.slice(0, 8);
        const html = topMissing.length ? topMissing.map(label => `<span>+ ${label}</span>`).join("") : '<span class="done">✓ Core profile complete</span>';
        if (missingNode.innerHTML !== html) missingNode.innerHTML = html;
      }
    }

    form.addEventListener("input", updateStrength);
    form.addEventListener("change", updateStrength);

    const modalObserver = new MutationObserver(function(){
      if (!modal.hidden) setTimeout(updateStrength, 120);
    });
    modalObserver.observe(modal, { attributes:true, attributeFilter:["hidden"] });

    const gallery = document.getElementById("venueGalleryPreview");
    if (gallery) {
      const galleryObserver = new MutationObserver(function(){
        setTimeout(updateStrength, 0);
      });
      galleryObserver.observe(gallery, { childList:true, subtree:true });
    }

    updateStrength();
  }

  loadScript("crm-core.js?v=20260901-media-1", function () {
    loadScript("venue-media-manager.js?v=20260904-hd30-1", function () {
      setupVenueDraftProtection();
      setupVenueProfileStrength();
    });
  });
})();
