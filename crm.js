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

  function installProductionPolish() {
    if (document.body?.dataset.smvProductionPolish === "1") return;
    if (document.body) document.body.dataset.smvProductionPolish = "1";

    const TERMINAL = new Set(["booked", "converted", "closed", "lost", "not-interested"]);
    const TERMINAL_ASSIGNMENT = new Set(["booked", "converted", "closed", "lost", "cancelled"]);

    function text(value) {
      return value === null || value === undefined ? "" : String(value).trim();
    }

    function phone(value) {
      const digits = text(value).replace(/\D/g, "");
      if (!digits) return "";
      return digits.length > 10 ? digits.slice(-10) : digits;
    }

    function email(value) {
      const valueText = text(value).toLowerCase();
      return valueText.includes("@") ? valueText : "";
    }

    function isObviousTestLead(lead) {
      if (!lead || typeof lead !== "object") return true;

      const name = text(lead.customer_name).toLowerCase();
      const source = text(lead.source).toLowerCase();
      const requirements = text(lead.requirements).toLowerCase();
      const mobileRaw = text(lead.mobile).toLowerCase();
      const normalizedPhone = phone(lead.mobile);

      if (
        name.includes("<test lead") ||
        name.includes("dummy data") ||
        mobileRaw.includes("<test lead") ||
        requirements.includes("<test lead") ||
        /(^|\s|[-_])test($|\s|[-_])/i.test(name) ||
        /^test\b/i.test(name) ||
        /\btest google ads\b/i.test(source)
      ) {
        return true;
      }

      if (normalizedPhone && /^(\d)\1{9}$/.test(normalizedPhone)) {
        return true;
      }

      return false;
    }

    function currentLeadList() {
      try {
        return Array.isArray(allLeads) ? allLeads : [];
      } catch (_) {
        return [];
      }
    }

    function currentAssignmentList() {
      try {
        return Array.isArray(allVenueAssignments) ? allVenueAssignments : [];
      } catch (_) {
        return [];
      }
    }

    function isActiveLead(lead) {
      const status = text(lead?.status || "new").toLowerCase();
      return !TERMINAL.has(status);
    }

    function minutesOld(value) {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
    }

    function cleanOperationalData() {
      const cleanLeads = currentLeadList().filter(lead => !isObviousTestLead(lead));
      const ids = new Set(cleanLeads.map(lead => String(lead.id)));
      const cleanAssignments = currentAssignmentList().filter(item => ids.has(String(item.enquiry_id)));
      return { cleanLeads, cleanAssignments };
    }

    function calculateAttentionCount() {
      const { cleanLeads, cleanAssignments } = cleanOperationalData();
      const active = cleanLeads.filter(isActiveLead);
      const now = Date.now();
      const attention = new Set();

      const assignedIds = new Set(
        cleanAssignments
          .filter(item => !TERMINAL_ASSIGNMENT.has(text(item.assignment_status || item.status).toLowerCase()))
          .map(item => String(item.enquiry_id))
      );

      active.forEach(lead => {
        const id = String(lead.id);
        const status = text(lead.status || "new").toLowerCase();
        const age = minutesOld(lead.created_at);
        const follow = lead.follow_up_at ? new Date(lead.follow_up_at) : null;

        if (status === "new" && !lead.last_contacted_at && age !== null && age >= 15) {
          attention.add(id);
        }

        if (follow && !Number.isNaN(follow.getTime()) && follow.getTime() < now) {
          attention.add(id);
        }

        if (["new", "contacted", "interested", "qualified"].includes(status) && !assignedIds.has(id)) {
          attention.add(id);
        }
      });

      cleanAssignments.forEach(item => {
        const status = text(item.assignment_status || item.status || "assigned").toLowerCase();
        if (TERMINAL_ASSIGNMENT.has(status) || item.first_contacted_at) return;
        if (!["assigned", "viewed", "new", ""].includes(status)) return;
        const age = minutesOld(item.assigned_at || item.created_at);
        if (age !== null && age >= 1440) attention.add(String(item.enquiry_id));
      });

      return attention.size;
    }

    function updateFilteredActionBadge() {
      const badge = document.getElementById("smvActionCenterBadge");
      if (!badge) return;
      const count = calculateAttentionCount();
      badge.textContent = String(count);
      badge.classList.toggle("zero", count === 0);
      badge.title = "Live operational items; obvious test/dummy leads are excluded";
    }

    function withCleanActionCenterData(event) {
      if (!event.target.closest?.("#smvActionCenterBtn")) return;

      let originalLeads;
      let originalAssignments;
      try {
        originalLeads = allLeads;
        originalAssignments = allVenueAssignments;
      } catch (_) {
        return;
      }

      const { cleanLeads, cleanAssignments } = cleanOperationalData();
      allLeads = cleanLeads;
      allVenueAssignments = cleanAssignments;

      queueMicrotask(() => {
        allLeads = originalLeads;
        allVenueAssignments = originalAssignments;
        updateFilteredActionBadge();
      });
    }

    document.addEventListener("click", withCleanActionCenterData, true);

    function genuineDuplicatesFor(lead) {
      if (!lead || isObviousTestLead(lead)) return [];
      const leadPhone = phone(lead.mobile);
      const leadEmail = email(lead.email);
      return currentLeadList().filter(other => {
        if (!other || String(other.id) === String(lead.id) || isObviousTestLead(other)) return false;
        const samePhone = leadPhone && leadPhone.length >= 10 && phone(other.mobile) === leadPhone;
        const sameEmail = leadEmail && email(other.email) === leadEmail;
        return samePhone || sameEmail;
      });
    }

    function polishLeadDuplicateWarning() {
      const panel = document.getElementById("smvLeadOpsPanel");
      if (!panel) return;

      let lead = null;
      try {
        if (typeof currentLead !== "undefined") lead = currentLead;
      } catch (_) {}
      if (!lead) return;

      const oldWarning = panel.querySelector(".smv-detail-warning");
      const duplicates = genuineDuplicatesFor(lead);

      if (!duplicates.length) {
        oldWarning?.remove();
        return;
      }

      if (!oldWarning) return;
      oldWarning.innerHTML = `<strong>Possible duplicate:</strong> ${duplicates.length} other genuine lead${duplicates.length === 1 ? "" : "s"} match this phone/email. `;
      duplicates.slice(0, 3).forEach(item => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "smv-mini-btn";
        button.textContent = `Open ${text(item.customer_name) || "lead"}`;
        button.addEventListener("click", () => {
          try { window.openLeadModal?.(item.id); } catch (_) {}
        });
        oldWarning.appendChild(button);
      });
    }

    function fixVenueTableColumnOrder() {
      const body = document.getElementById("venueTableBody");
      if (!body) return;

      body.querySelectorAll("tr").forEach(row => {
        if (row.dataset.smvColumnOrderFixed === "1") return;
        const cells = Array.from(row.children || []);
        if (cells.length !== 11) return;

        // Existing row renderer outputs Status, Plan, Public, Verification.
        // Header expects Status, Verification, Plan, Public.
        const verificationCell = cells[9];
        const planCell = cells[7];
        if (verificationCell && planCell) {
          row.insertBefore(verificationCell, planCell);
          row.dataset.smvColumnOrderFixed = "1";
        }
      });
    }

    try {
      if (typeof renderVenues === "function" && !renderVenues.__smvColumnPolishWrapped) {
        const originalRenderVenues = renderVenues;
        renderVenues = function () {
          const result = originalRenderVenues.apply(this, arguments);
          window.setTimeout(fixVenueTableColumnOrder, 0);
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
      const venueObserver = new MutationObserver(() => {
        if (queued) return;
        queued = true;
        window.setTimeout(() => {
          queued = false;
          fixVenueTableColumnOrder();
        }, 0);
      });
      venueObserver.observe(venueBody, { childList: true });
    }

    const styles = document.createElement("style");
    styles.id = "smvProductionPolishStyles";
    styles.textContent = `
      /* Venue form checkboxes: compact, aligned and native-accessible */
      #venueForm .venue-field-check,
      #venueForm .public-listing-control{
        display:flex!important;
        flex-direction:column!important;
        align-items:flex-start!important;
        justify-content:flex-start!important;
        gap:6px!important;
      }
      #venueForm .venue-field-check label,
      #venueForm .public-listing-control label{
        display:inline-flex!important;
        flex-direction:row!important;
        align-items:center!important;
        justify-content:flex-start!important;
        gap:9px!important;
        width:auto!important;
        min-height:28px!important;
        margin:0!important;
        padding:0!important;
        white-space:normal!important;
        line-height:1.25!important;
        cursor:pointer!important;
      }
      #venueForm #venueFeatured,
      #venueForm #venuePublicListing{
        appearance:auto!important;
        -webkit-appearance:checkbox!important;
        width:18px!important;
        height:18px!important;
        min-width:18px!important;
        max-width:18px!important;
        min-height:18px!important;
        max-height:18px!important;
        flex:0 0 18px!important;
        margin:0!important;
        padding:0!important;
        border-radius:4px!important;
        box-shadow:none!important;
        accent-color:#0b8b73!important;
      }
      #venueForm .public-listing-control small{
        margin:0!important;
        padding-left:27px!important;
        color:#78918b!important;
        line-height:1.35!important;
      }
    `;
    document.head.appendChild(styles);

    const leadBody = document.getElementById("leadsTableBody");
    if (leadBody) {
      let timer = null;
      const leadObserver = new MutationObserver(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(updateFilteredActionBadge, 60);
      });
      leadObserver.observe(leadBody, { childList: true, subtree: false });
    }

    const leadModal = document.getElementById("leadModal");
    if (leadModal) {
      let duplicateTimer = null;
      const modalObserver = new MutationObserver(() => {
        window.clearTimeout(duplicateTimer);
        duplicateTimer = window.setTimeout(polishLeadDuplicateWarning, 120);
      });
      modalObserver.observe(leadModal, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
    }

    window.setTimeout(() => {
      fixVenueTableColumnOrder();
      updateFilteredActionBadge();
      polishLeadDuplicateWarning();
    }, 250);
    window.setTimeout(updateFilteredActionBadge, 1200);
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
          addScript("crm-enhancements.js?v=20260914-ops-1", function () {
            window.setTimeout(installProductionPolish, 80);
          });
        }, coreReady ? 450 : 0);
      }
    }, 100);
  });
})();
