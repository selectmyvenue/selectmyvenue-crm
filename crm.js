(function () {
  "use strict";

  function addScript(src, onload) {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    if (typeof onload === "function") script.onload = onload;
    script.onerror = () => console.error("Select My Venue CRM: failed to load", src);
    document.head.appendChild(script);
  }

  function installNotPickPersistenceFix() {
    if (document.body?.dataset.smvNotPickPersistence === "1") return;
    if (document.body) document.body.dataset.smvNotPickPersistence = "1";

    const NOT_PICK = "not-pick";
    const MARKER = "__SMV_STATUS_NOT_PICK__";
    const clean = value => value == null ? "" : String(value).trim();

    const hasMarker = value => clean(value).startsWith(MARKER);
    const markerValue = existing => {
      const value = clean(existing);
      if (!value || hasMarker(value)) return MARKER;
      return `${MARKER}|${value}`;
    };
    const restoredLostReason = value => {
      const text = clean(value);
      if (!hasMarker(text)) return value || null;
      const separator = text.indexOf("|");
      return separator >= 0 ? (text.slice(separator + 1) || null) : null;
    };

    function leadList() {
      try { return Array.isArray(allLeads) ? allLeads : []; } catch (_) { return []; }
    }

    function findLead(id) {
      return leadList().find(item => String(item?.id) === String(id)) || null;
    }

    function normalizeLead(lead) {
      if (!lead || typeof lead !== "object") return lead;
      if (hasMarker(lead.lost_reason_other)) lead.status = NOT_PICK;
      return lead;
    }

    function normalizeLoadedLeads() {
      leadList().forEach(normalizeLead);
      try {
        if (typeof currentLead !== "undefined" && currentLead) normalizeLead(currentLead);
      } catch (_) {}
    }

    function repaint() {
      try {
        if (typeof applyFilters === "function") applyFilters();
        else if (typeof renderLeads === "function") renderLeads();
      } catch (_) {}
      try { if (typeof updateStats === "function") updateStats(); } catch (_) {}
    }

    function toast(message, type) {
      try {
        if (typeof showToast === "function") {
          showToast(message, type || "success");
          return;
        }
      } catch (_) {}
      console[type === "error" ? "error" : "log"](message);
    }

    async function updateLeadRow(leadId, payload) {
      let client = null;
      try {
        if (typeof getSupabaseClient === "function") client = getSupabaseClient();
      } catch (_) {}
      if (!client) return { data: null, error: new Error("CRM connection is not ready.") };

      return client
        .from("customer_enquiries")
        .update(payload)
        .eq("id", leadId)
        .select("*")
        .single();
    }

    async function persistStatus(lead, requestedStatus) {
      const desired = clean(requestedStatus) || "new";
      const oldMarker = lead?.lost_reason_other;

      if (desired !== NOT_PICK) {
        const payload = { status: desired };
        if (hasMarker(oldMarker)) payload.lost_reason_other = restoredLostReason(oldMarker);
        const result = await updateLeadRow(lead.id, payload);
        return { ...result, desired, usedFallback: false };
      }

      const direct = await updateLeadRow(lead.id, { status: NOT_PICK });
      if (!direct.error) {
        return { ...direct, desired, usedFallback: false };
      }

      const fallbackMarker = markerValue(oldMarker);
      const fallback = await updateLeadRow(lead.id, {
        status: "contacted",
        lost_reason_other: fallbackMarker
      });

      if (!fallback.error && fallback.data) {
        fallback.data.status = NOT_PICK;
        fallback.data.lost_reason_other = fallbackMarker;
      }

      return {
        ...fallback,
        desired,
        usedFallback: true,
        firstError: direct.error
      };
    }

    try {
      if (typeof getStatusStyle === "function" && !getStatusStyle.__smvNotPickStyle) {
        const originalGetStatusStyle = getStatusStyle;
        getStatusStyle = function (status) {
          if (clean(status).toLowerCase() === NOT_PICK) {
            return {
              background: "#fff3d6",
              color: "#8a5a00",
              border: "#efd18a"
            };
          }
          return originalGetStatusStyle.apply(this, arguments);
        };
        getStatusStyle.__smvNotPickStyle = true;
      }
    } catch (error) {
      console.warn("SMV Not Pick style fix warning:", error);
    }

    try {
      if (typeof loadEnquiries === "function" && !loadEnquiries.__smvNotPickWrapped) {
        const originalLoadEnquiries = loadEnquiries;
        loadEnquiries = async function () {
          const result = await originalLoadEnquiries.apply(this, arguments);
          normalizeLoadedLeads();
          repaint();
          return result;
        };
        loadEnquiries.__smvNotPickWrapped = true;
      }
    } catch (error) {
      console.warn("SMV Not Pick load fix warning:", error);
    }

    try {
      if (typeof saveInlineField === "function" && !saveInlineField.__smvNotPickWrapped) {
        const originalSaveInlineField = saveInlineField;

        saveInlineField = async function (leadId, field, newValue) {
          if (field !== "status") {
            return originalSaveInlineField.apply(this, arguments);
          }

          const lead = findLead(leadId);
          const desired = clean(newValue) || "new";

          if (!lead || (desired !== NOT_PICK && !hasMarker(lead.lost_reason_other))) {
            return originalSaveInlineField.apply(this, arguments);
          }

          const previous = {
            status: lead.status,
            lost_reason_other: lead.lost_reason_other
          };

          try {
            const result = await persistStatus(lead, desired);
            if (result.error) throw result.error;

            if (result.data) Object.assign(lead, result.data);
            lead.status = desired;
            normalizeLead(lead);

            try { if (typeof refreshLeadRow === "function") refreshLeadRow(leadId); } catch (_) {}
            try { if (typeof updateStats === "function") updateStats(); } catch (_) {}

            try {
              if (typeof currentLead !== "undefined" && currentLead && String(currentLead.id) === String(leadId)) {
                currentLead = lead;
                if (typeof populateLeadModal === "function") populateLeadModal(currentLead);
              }
            } catch (_) {}

            toast(desired === NOT_PICK ? "Not Pick saved successfully." : "Saved successfully.");
            return result.data;
          } catch (error) {
            lead.status = previous.status;
            lead.lost_reason_other = previous.lost_reason_other;
            try { if (typeof refreshLeadRow === "function") refreshLeadRow(leadId); } catch (_) {}
            console.error("Not Pick status save error:", error);
            toast(error?.message || "Unable to save status change.", "error");
            return null;
          }
        };

        saveInlineField.__smvNotPickWrapped = true;
      }
    } catch (error) {
      console.warn("SMV Not Pick inline fix warning:", error);
    }

    try {
      if (typeof saveModalChanges === "function" && !saveModalChanges.__smvNotPickWrapped) {
        const originalSaveModalChanges = saveModalChanges;

        saveModalChanges = async function () {
          let lead = null;
          try { if (typeof currentLead !== "undefined") lead = currentLead; } catch (_) {}

          const statusControl = document.getElementById("detailStatus");
          const desired = clean(statusControl?.value || lead?.status || "new");
          const markerPresent = hasMarker(lead?.lost_reason_other);

          if (!lead || (desired !== NOT_PICK && !markerPresent)) {
            return originalSaveModalChanges.apply(this, arguments);
          }

          const leadId = lead.id;
          const previousSelectValue = statusControl?.value || desired;

          if (desired === NOT_PICK && statusControl) {
            statusControl.value = "contacted";
          }

          const result = await originalSaveModalChanges.apply(this, arguments);
          const modal = document.getElementById("leadModal");
          const coreSaveSucceeded = !!modal?.hidden;

          if (!coreSaveSucceeded) {
            if (statusControl) statusControl.value = previousSelectValue;
            return result;
          }

          const savedLead = findLead(leadId) || lead;

          try {
            const statusResult = await persistStatus(savedLead, desired);
            if (statusResult.error) throw statusResult.error;

            if (statusResult.data) Object.assign(savedLead, statusResult.data);
            savedLead.status = desired;
            normalizeLead(savedLead);

            try { if (typeof refreshLeadRow === "function") refreshLeadRow(leadId); } catch (_) {}
            repaint();

            if (desired === NOT_PICK) toast("Enquiry updated — Not Pick saved successfully.");
          } catch (error) {
            console.error("Not Pick modal persistence error:", error);
            toast(
              "The enquiry details were saved, but Not Pick could not be finalized. Please refresh and try the status again.",
              "error"
            );
          }

          return result;
        };

        saveModalChanges.__smvNotPickWrapped = true;
      }
    } catch (error) {
      console.warn("SMV Not Pick modal fix warning:", error);
    }

    normalizeLoadedLeads();
    repaint();
  }

  function installProductionPolish() {
    if (document.body?.dataset.smvProductionPolish === "1") return;
    if (document.body) document.body.dataset.smvProductionPolish = "1";

    installNotPickPersistenceFix();

    const TERMINAL = new Set(["booked", "converted", "closed", "lost", "not-interested"]);
    const TERMINAL_ASSIGNMENT = new Set(["booked", "converted", "closed", "lost", "cancelled"]);

    const txt = value => value == null ? "" : String(value).trim();
    const phone = value => {
      const digits = txt(value).replace(/\D/g, "");
      return digits.length > 10 ? digits.slice(-10) : digits;
    };
    const email = value => {
      const v = txt(value).toLowerCase();
      return v.includes("@") ? v : "";
    };
    const leads = () => {
      try { return Array.isArray(allLeads) ? allLeads : []; } catch (_) { return []; }
    };
    const assignments = () => {
      try { return Array.isArray(allVenueAssignments) ? allVenueAssignments : []; } catch (_) { return []; }
    };

    function isObviousTestLead(lead) {
      if (!lead || typeof lead !== "object") return true;
      const name = txt(lead.customer_name).toLowerCase();
      const source = txt(lead.source).toLowerCase();
      const requirements = txt(lead.requirements).toLowerCase();
      const rawMobile = txt(lead.mobile).toLowerCase();
      const p = phone(lead.mobile);

      if (
        name.includes("<test lead") || name.includes("dummy data") ||
        rawMobile.includes("<test lead") || requirements.includes("<test lead") ||
        /(^|\s|[-_])test($|\s|[-_])/i.test(name) || /^test\b/i.test(name) ||
        /\btest google ads\b/i.test(source)
      ) return true;

      return !!(p && /^(\d)\1{9}$/.test(p));
    }

    function cleanData() {
      const cleanLeads = leads().filter(lead => !isObviousTestLead(lead));
      const ids = new Set(cleanLeads.map(lead => String(lead.id)));
      const cleanAssignments = assignments().filter(item => ids.has(String(item.enquiry_id)));
      return { cleanLeads, cleanAssignments };
    }

    function minutesOld(value) {
      const d = value ? new Date(value) : null;
      if (!d || Number.isNaN(d.getTime())) return null;
      return Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
    }

    function attentionCount() {
      const { cleanLeads, cleanAssignments } = cleanData();
      const attention = new Set();
      const assignedIds = new Set(
        cleanAssignments
          .filter(item => !TERMINAL_ASSIGNMENT.has(txt(item.assignment_status || item.status).toLowerCase()))
          .map(item => String(item.enquiry_id))
      );

      cleanLeads.forEach(lead => {
        const status = txt(lead.status || "new").toLowerCase();
        if (TERMINAL.has(status)) return;
        const id = String(lead.id);
        const age = minutesOld(lead.created_at);
        const follow = lead.follow_up_at ? new Date(lead.follow_up_at) : null;

        if (status === "new" && !lead.last_contacted_at && age !== null && age >= 15) attention.add(id);
        if (follow && !Number.isNaN(follow.getTime()) && follow.getTime() < Date.now()) attention.add(id);
        if (["new", "contacted", "interested", "qualified"].includes(status) && !assignedIds.has(id)) attention.add(id);
      });

      cleanAssignments.forEach(item => {
        const status = txt(item.assignment_status || item.status || "assigned").toLowerCase();
        if (TERMINAL_ASSIGNMENT.has(status) || item.first_contacted_at) return;
        if (!["assigned", "viewed", "new", ""].includes(status)) return;
        const age = minutesOld(item.assigned_at || item.created_at);
        if (age !== null && age >= 1440) attention.add(String(item.enquiry_id));
      });

      return attention.size;
    }

    function updateActionBadge() {
      const badge = document.getElementById("smvActionCenterBadge");
      if (!badge) return;
      const count = attentionCount();
      badge.textContent = String(count);
      badge.classList.toggle("zero", count === 0);
      badge.title = "Live operational items; obvious test/dummy leads are excluded";
    }

    function useCleanDataForActionCenter(event) {
      if (!event.target.closest?.("#smvActionCenterBtn")) return;
      let originalLeads, originalAssignments;
      try {
        originalLeads = allLeads;
        originalAssignments = allVenueAssignments;
      } catch (_) { return; }

      const clean = cleanData();
      allLeads = clean.cleanLeads;
      allVenueAssignments = clean.cleanAssignments;

      queueMicrotask(() => {
        allLeads = originalLeads;
        allVenueAssignments = originalAssignments;
        updateActionBadge();
      });
    }

    function genuineDuplicates(lead) {
      if (!lead || isObviousTestLead(lead)) return [];
      const p = phone(lead.mobile);
      const e = email(lead.email);
      return leads().filter(other => {
        if (!other || String(other.id) === String(lead.id) || isObviousTestLead(other)) return false;
        return (p && p.length >= 10 && phone(other.mobile) === p) || (e && email(other.email) === e);
      });
    }

    function polishDuplicateWarning() {
      const panel = document.getElementById("smvLeadOpsPanel");
      if (!panel) return;
      let lead = null;
      try { if (typeof currentLead !== "undefined") lead = currentLead; } catch (_) {}
      if (!lead) return;

      const warning = panel.querySelector(".smv-detail-warning");
      const dups = genuineDuplicates(lead);
      if (!dups.length) {
        warning?.remove();
        return;
      }
      if (!warning || warning.dataset.smvGenuineCount === String(dups.length)) return;

      warning.dataset.smvGenuineCount = String(dups.length);
      warning.innerHTML = `<strong>Possible duplicate:</strong> ${dups.length} other genuine lead${dups.length === 1 ? "" : "s"} match this phone/email. `;
      dups.slice(0, 3).forEach(item => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "smv-mini-btn";
        button.textContent = `Open ${txt(item.customer_name) || "lead"}`;
        button.addEventListener("click", () => {
          try { window.openLeadModal?.(item.id); } catch (_) {}
          window.setTimeout(polishDuplicateWarning, 180);
        });
        warning.appendChild(button);
      });
    }

    function fixVenueColumns() {
      const body = document.getElementById("venueTableBody");
      if (!body) return;

      body.querySelectorAll("tr").forEach(row => {
        if (row.dataset.smvColumnOrderFixed === "1") return;
        const cells = Array.from(row.children || []);
        if (cells.length !== 11) return;

        const current7 = txt(cells[7]?.textContent).toLowerCase();
        const current9 = txt(cells[9]?.textContent).toLowerCase();
        const looksLikePlan = /launch\s*trial|^partner$|^growth$|^premium$/.test(current7);
        const looksLikeVerification = /verified|pending|rejected/.test(current9);

        if (looksLikePlan && looksLikeVerification) {
          row.insertBefore(cells[9], cells[7]);
        }
        row.dataset.smvColumnOrderFixed = "1";
      });
    }

    try {
      if (typeof renderVenues === "function" && !renderVenues.__smvColumnPolishWrapped) {
        const original = renderVenues;
        renderVenues = function () {
          const result = original.apply(this, arguments);
          window.setTimeout(fixVenueColumns, 0);
          return result;
        };
        renderVenues.__smvColumnPolishWrapped = true;
      }
    } catch (error) {
      console.warn("SMV venue column polish warning:", error);
    }

    const venueBody = document.getElementById("venueTableBody");
    if (venueBody) {
      let queued = false;
      new MutationObserver(() => {
        if (queued) return;
        queued = true;
        window.setTimeout(() => {
          queued = false;
          fixVenueColumns();
        }, 0);
      }).observe(venueBody, { childList: true });
    }

    const style = document.createElement("style");
    style.id = "smvProductionPolishStyles";
    style.textContent = `
      #venueForm .venue-field-check,#venueForm .public-listing-control{display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important;gap:6px!important}
      #venueForm .venue-field-check label,#venueForm .public-listing-control label{display:inline-flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:9px!important;width:auto!important;min-height:28px!important;margin:0!important;padding:0!important;line-height:1.25!important;cursor:pointer!important}
      #venueForm #venueFeatured,#venueForm #venuePublicListing{-webkit-appearance:checkbox!important;appearance:auto!important;width:18px!important;height:18px!important;min-width:18px!important;max-width:18px!important;min-height:18px!important;max-height:18px!important;flex:0 0 18px!important;margin:0!important;padding:0!important;box-shadow:none!important;accent-color:#0b8b73!important}
      #venueForm .public-listing-control small{margin:0!important;padding-left:27px!important;color:#78918b!important;line-height:1.35!important}
    `;
    document.head.appendChild(style);

    document.addEventListener("click", event => {
      useCleanDataForActionCenter(event);
      if (event.target.closest?.(".view-lead-btn,[data-action='view']")) {
        window.setTimeout(polishDuplicateWarning, 260);
      }
    }, true);

    const leadBody = document.getElementById("leadsTableBody");
    if (leadBody) {
      let timer = null;
      new MutationObserver(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(updateActionBadge, 60);
      }).observe(leadBody, { childList: true });
    }

    const leadModal = document.getElementById("leadModal");
    if (leadModal) {
      let modalTimer = null;
      new MutationObserver(() => {
        if (leadModal.hidden) return;
        window.clearTimeout(modalTimer);
        modalTimer = window.setTimeout(polishDuplicateWarning, 220);
      }).observe(leadModal, { attributes: true, attributeFilter: ["hidden"] });
    }

    window.setTimeout(() => {
      fixVenueColumns();
      updateActionBadge();
      polishDuplicateWarning();
    }, 250);
    window.setTimeout(updateActionBadge, 1200);
  }

  addScript("crm-base.js?v=20260914-ops-base-1", function () {
    let checks = 0;
    const waitForCore = window.setInterval(function () {
      checks += 1;
      const ready =
        typeof window.openLeadModal === "function" &&
        document.getElementById("leadsTableBody") &&
        document.getElementById("venueManagementSection");

      if (ready || checks >= 100) {
        window.clearInterval(waitForCore);
        window.setTimeout(function () {
          addScript("crm-enhancements.js?v=20260914-ops-1", function () {
            addScript("crm-room-count.js?v=20260915-room-count-1", function () {
              window.setTimeout(installProductionPolish, 80);
            });
          });
        }, ready ? 450 : 0);
      }
    }, 100);
  });
})();
