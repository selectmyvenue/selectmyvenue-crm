(function () {
  "use strict";

  function installVenueRoomCountFeature() {
    if (document.body?.dataset.smvVenueRoomCount === "1") return true;

    const form = document.getElementById("venueForm");
    const roomsCheckbox = document.getElementById("venueRooms");

    if (!form || !roomsCheckbox) return false;

    if (document.body) document.body.dataset.smvVenueRoomCount = "1";

    let field = document.getElementById("venueRoomCountField");
    let input = document.getElementById("venueRoomCount");

    if (!field) {
      field = document.createElement("div");
      field.id = "venueRoomCountField";
      field.className = "smv-room-count-field";
      field.innerHTML = `
        <label for="venueRoomCount">NUMBER OF ROOMS</label>
        <input
          type="number"
          id="venueRoomCount"
          min="0"
          step="1"
          inputmode="numeric"
          placeholder="e.g. 25"
        >
        <small>Total rooms at the property. Leave blank if the exact number is not confirmed.</small>
      `;

      const checkGrid = roomsCheckbox.closest(".venue-check-grid");
      if (checkGrid) {
        checkGrid.insertAdjacentElement("afterend", field);
      } else {
        roomsCheckbox.closest("label")?.insertAdjacentElement("afterend", field);
      }

      input = document.getElementById("venueRoomCount");
    }

    if (!input) return false;

    const helper = field.querySelector("small");
    const READY_HELPER = "Total rooms at the property. Leave blank if the exact number is not confirmed.";
    const PENDING_HELPER = "Number of rooms is waiting for the database update. Existing venue saves remain available.";
    let roomCountSchemaReady = false;

    function normalizedCount() {
      const raw = String(input.value || "").trim();
      if (!raw) return null;
      const number = Number(raw);
      if (!Number.isFinite(number) || number < 0) return null;
      return Math.floor(number);
    }

    function syncRoomCountState() {
      const count = normalizedCount();
      if (roomCountSchemaReady && count !== null && count > 0) {
        roomsCheckbox.checked = true;
      }
      input.disabled = !roomCountSchemaReady || !roomsCheckbox.checked;
      field.classList.toggle("is-disabled", input.disabled);
      field.classList.toggle("schema-pending", !roomCountSchemaReady);
    }

    async function detectRoomCountSchema() {
      let client = null;
      try {
        if (typeof getSupabaseClient === "function") client = getSupabaseClient();
      } catch (_) {}

      if (!client) {
        roomCountSchemaReady = false;
        if (helper) helper.textContent = PENDING_HELPER;
        syncRoomCountState();
        return;
      }

      try {
        const { error } = await client
          .from("venues")
          .select("room_count")
          .limit(1);

        roomCountSchemaReady = !error;
        if (helper) helper.textContent = roomCountSchemaReady ? READY_HELPER : PENDING_HELPER;
        if (error) console.info("SMV room-count schema is not active yet:", error.message);
      } catch (error) {
        roomCountSchemaReady = false;
        if (helper) helper.textContent = PENDING_HELPER;
        console.info("SMV room-count schema check warning:", error);
      }

      syncRoomCountState();
    }

    roomsCheckbox.addEventListener("change", syncRoomCountState);
    input.addEventListener("input", syncRoomCountState);

    try {
      if (typeof getVenueFormData === "function" && !getVenueFormData.__smvRoomCountWrapped) {
        const originalGetVenueFormData = getVenueFormData;

        getVenueFormData = function () {
          const payload = originalGetVenueFormData.apply(this, arguments) || {};

          // Do not send an unknown column before the migration is live. This
          // preserves the existing Add/Edit Venue flow even during rollout.
          if (roomCountSchemaReady) {
            const count = normalizedCount();
            payload.room_count = roomsCheckbox.checked && count !== null && count > 0
              ? count
              : null;

            if (payload.room_count > 0) {
              payload.rooms_available = true;
            }
          }

          return payload;
        };

        getVenueFormData.__smvRoomCountWrapped = true;
      }
    } catch (error) {
      console.warn("SMV room-count form wrapper warning:", error);
    }

    try {
      if (typeof openVenueModal === "function" && !openVenueModal.__smvRoomCountWrapped) {
        const originalOpenVenueModal = openVenueModal;

        openVenueModal = function (venue) {
          const result = originalOpenVenueModal.apply(this, arguments);
          const roomCountInput = document.getElementById("venueRoomCount");
          const roomCheck = document.getElementById("venueRooms");
          const count = Number(venue?.room_count || 0);

          if (roomCountInput) {
            roomCountInput.value = Number.isFinite(count) && count > 0
              ? String(Math.floor(count))
              : "";
          }

          if (roomCheck && count > 0) {
            roomCheck.checked = true;
          }

          syncRoomCountState();
          return result;
        };

        openVenueModal.__smvRoomCountWrapped = true;
      }
    } catch (error) {
      console.warn("SMV room-count modal wrapper warning:", error);
    }

    const style = document.createElement("style");
    style.id = "smvVenueRoomCountStyles";
    style.textContent = `
      #venueForm .smv-room-count-field{
        margin-top:12px!important;
        padding:14px 15px!important;
        border:1px solid #d8e9e5!important;
        border-radius:13px!important;
        background:linear-gradient(135deg,#f8fcfb,#ffffff)!important;
      }
      #venueForm .smv-room-count-field label{
        display:block!important;
        margin:0 0 7px!important;
        color:#315e56!important;
        font-size:10px!important;
        font-weight:900!important;
        letter-spacing:.08em!important;
      }
      #venueForm .smv-room-count-field input{
        width:100%!important;
        min-height:42px!important;
        box-sizing:border-box!important;
        padding:0 12px!important;
        border:1px solid #cfe2dd!important;
        border-radius:10px!important;
        background:#fff!important;
        color:#163d36!important;
        font:inherit!important;
        font-size:13px!important;
        font-weight:750!important;
        outline:none!important;
      }
      #venueForm .smv-room-count-field input:focus{
        border-color:#15917c!important;
        box-shadow:0 0 0 3px rgba(21,145,124,.10)!important;
      }
      #venueForm .smv-room-count-field small{
        display:block!important;
        margin-top:7px!important;
        color:#78918b!important;
        font-size:10px!important;
        line-height:1.4!important;
      }
      #venueForm .smv-room-count-field.is-disabled{opacity:.62!important}
      #venueForm .smv-room-count-field.schema-pending{border-style:dashed!important}
    `;
    document.head.appendChild(style);

    syncRoomCountState();
    detectRoomCountSchema();
    return true;
  }

  let checks = 0;
  const timer = window.setInterval(function () {
    checks += 1;
    const ready =
      typeof getVenueFormData === "function" &&
      typeof openVenueModal === "function" &&
      document.getElementById("venueForm") &&
      document.getElementById("venueRooms");

    if (ready) {
      window.clearInterval(timer);
      installVenueRoomCountFeature();
      return;
    }

    if (checks >= 100) {
      window.clearInterval(timer);
      console.warn("Select My Venue CRM: room-count feature could not initialize.");
    }
  }, 100);
})();
