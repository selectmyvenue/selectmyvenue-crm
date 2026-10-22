(function () {
  "use strict";
  const FEATURE = "smvVenueAreaCapacity";
  const AREAS = [
    { key: "lawn", label: "Lawn", checkbox: "smvAreaLawn", capacity: "smvAreaLawnCapacity" },
    { key: "open_area", label: "Open area", checkbox: "smvAreaOpen", capacity: "smvAreaOpenCapacity" },
    { key: "outdoor_space", label: "Outdoor space", checkbox: "smvAreaOutdoor", capacity: "smvAreaOutdoorCapacity" }
  ];
  let schemaReady = false;
  let installed = false;

  const el = id => document.getElementById(id);
  const value = id => String(el(id)?.value || "").trim();
  const numberOrNull = id => {
    const raw = value(id);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
  };
  const checked = id => Boolean(el(id)?.checked);
  const escapeHTML = input => String(input ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  function installFields() {
    const form = el("venueForm");
    if (!form || el("smvVenueAreaFeatures")) return Boolean(form && el("smvVenueAreaFeatures"));
    const anchor = el("venueOutdoor")?.closest(".venue-check-grid") ||
      el("venueOutdoor")?.parentElement?.parentElement;
    const section = document.createElement("section");
    section.id = "smvVenueAreaFeatures";
    section.className = "smv-area-features";
    section.innerHTML = `
      <div class="smv-area-heading">
        <strong>LAWN &amp; OPEN AREA DETAILS</strong>
        <span>Select only facilities available at this venue and add the guest capacity for each.</span>
      </div>
      <div class="smv-area-grid">
        ${AREAS.map(area => `
          <div class="smv-area-card" data-area="${area.key}">
            <label class="smv-area-toggle"><input type="checkbox" id="${area.checkbox}"> <span>${area.label} available</span></label>
            <label class="smv-area-cap-label" for="${area.capacity}">Guest capacity</label>
            <input type="number" id="${area.capacity}" min="0" step="1" inputmode="numeric" placeholder="e.g. 200" disabled>
          </div>`).join("")}
      </div>
      <small class="smv-area-schema-note" role="status">Area capacity fields become editable after the database migration is applied. Existing venue details remain editable.</small>
    `;
    if (anchor?.parentElement) anchor.insertAdjacentElement("afterend", section);
    else form.querySelector(".smv-match-details")?.insertAdjacentElement("afterend", section);
    AREAS.forEach(area => {
      const cb = el(area.checkbox), input = el(area.capacity);
      cb?.addEventListener("change", () => { if (!cb.checked) input.value = ""; syncInputs(); });
      input?.addEventListener("input", syncInputs);
    });
    syncInputs();
    return true;
  }

  function syncInputs() {
    AREAS.forEach(area => {
      const cb = el(area.checkbox), input = el(area.capacity);
      if (cb && input) {
        input.disabled = !schemaReady || !cb.checked;
        input.closest(".smv-area-card")?.classList.toggle("is-disabled", input.disabled);
      }
    });
    const note = document.querySelector(".smv-area-schema-note");
    if (note) note.textContent = schemaReady
      ? "Add the confirmed capacity for each selected area. Leave capacity blank if it has not been confirmed."
      : "Area capacity fields are waiting for the database migration. Other venue details can still be saved.";
  }

  async function detectSchema() {
    try {
      const client = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;
      if (!client) return;
      const { error } = await client.from("venues").select("area_features").limit(1);
      schemaReady = !error;
    } catch (_) { schemaReady = false; }
    syncInputs();
  }

  function normalizeFeatures(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return raw;
  }
  function readFeatures(venue) {
    const features = normalizeFeatures(venue?.area_features);
    AREAS.forEach(area => {
      const item = features[area.key] || {};
      if (el(area.checkbox)) el(area.checkbox).checked = item.available === true;
      if (el(area.capacity)) el(area.capacity).value = item.capacity == null ? "" : String(item.capacity);
    });
    syncInputs();
  }
  function buildFeatures() {
    const result = {};
    AREAS.forEach(area => {
      result[area.key] = {
        available: checked(area.checkbox),
        capacity: checked(area.checkbox) ? numberOrNull(area.capacity) : null
      };
    });
    return result;
  }

  function patchFormData() {
    if (typeof window.getVenueFormData !== "function" || window.getVenueFormData.__smvAreaFeaturesWrapped) return;
    const original = window.getVenueFormData;
    window.getVenueFormData = function () {
      const payload = original.apply(this, arguments) || {};
      if (schemaReady) payload.area_features = buildFeatures();
      return payload;
    };
    window.getVenueFormData.__smvAreaFeaturesWrapped = true;
  }

  function patchModal() {
    if (typeof window.openVenueModal !== "function" || window.openVenueModal.__smvAreaFeaturesWrapped) return;
    const original = window.openVenueModal;
    window.openVenueModal = function (venue) {
      const result = original.apply(this, arguments);
      readFeatures(venue || {});
      return result;
    };
    window.openVenueModal.__smvAreaFeaturesWrapped = true;
  }

  function renderRooms(venue) {
    const n = Number(venue?.room_count || 0);
    return n > 0 ? `${escapeHTML(n)} rooms` : (venue?.rooms_available === true ? "Available" : "—");
  }
  function renderAreas(venue) {
    const features = normalizeFeatures(venue?.area_features);
    const items = AREAS.filter(a => features[a.key]?.available === true).map(a => {
      const n = Number(features[a.key]?.capacity);
      return `${escapeHTML(a.label)}${Number.isFinite(n) && n > 0 ? ` · ${escapeHTML(n)} guests` : ""}`;
    });
    if (!items.length && venue?.outdoor_available === true) items.push("Outdoor / lawn · capacity not set");
    return items.length ? items.map(item => `<span class="smv-area-pill">${item}</span>`).join("") : '<span class="venue-muted">—</span>';
  }

  function patchTable() {
    const table = document.querySelector("#venueManagementSection .venue-table");
    if (!table || table.dataset.smvAreaCapacityHeaders === "1") return;
    const headerRow = table.querySelector("thead tr");
    if (!headerRow) return;
    const capacityHeader = Array.from(headerRow.cells).find(cell => /capacity/i.test(cell.textContent));
    const priceHeader = Array.from(headerRow.cells).find(cell => /price/i.test(cell.textContent));
    if (!capacityHeader || !priceHeader) return;
    const roomHeader = document.createElement("th");
    roomHeader.textContent = "ROOMS";
    const areaHeader = document.createElement("th");
    areaHeader.textContent = "LAWN / OPEN AREA";
    capacityHeader.insertAdjacentElement("afterend", roomHeader);
    roomHeader.insertAdjacentElement("afterend", areaHeader);
    table.dataset.smvAreaCapacityHeaders = "1";
    if (typeof window.renderVenues === "function" && !window.renderVenues.__smvAreaCapacityWrapped) {
      const original = window.renderVenues;
      window.renderVenues = function () {
        const result = original.apply(this, arguments);
        const rows = document.querySelectorAll("#venueTableBody tr[data-venue-id]");
        rows.forEach(row => {
          if (row.dataset.smvAreaCapacityRendered === "1") return;
          const id = row.dataset.venueId;
          const venue = (typeof window.venues === "function" ? window.venues() : [])
            .find(item => String(item.id) === String(id));
          if (!venue) return;
          const cells = Array.from(row.cells);
          const baseCapacityCell = cells.find((cell, index) => index === 4);
          const priceCell = cells.find((cell, index) => index === 5);
          if (!baseCapacityCell || !priceCell) return;
          const roomCell = document.createElement("td");
          roomCell.className = "smv-room-list-cell";
          roomCell.textContent = renderRooms(venue);
          const areaCell = document.createElement("td");
          areaCell.className = "smv-area-list-cell";
          areaCell.innerHTML = renderAreas(venue);
          priceCell.insertAdjacentElement("beforebegin", roomCell);
          roomCell.insertAdjacentElement("afterend", areaCell);
          row.dataset.smvAreaCapacityRendered = "1";
        });
        return result;
      };
      window.renderVenues.__smvAreaCapacityWrapped = true;
      window.renderVenues();
    }
  }

  function start() {
    if (installed) return;
    if (!el("venueManagementSection") || !el("venueForm")) return;
    installed = true;
    installFields();
    patchFormData();
    patchModal();
    patchTable();
    detectSchema();
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts++;
    start();
    patchFormData();
    patchModal();
    patchTable();
    if (installed && typeof window.renderVenues === "function" || attempts > 100) window.clearInterval(timer);
  }, 250);
})();
