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

      /* Customer enquiries — ALL fields preserved and fitted on one desktop screen */
      .table-wrapper{overflow-x:hidden!important}
      .leads-table{width:100%!important;min-width:0!important;table-layout:fixed!important}
      .leads-table th,.leads-table td{padding-left:3px!important;padding-right:3px!important}

      /* CUSTOMER / PHONE / CREATED / EMAIL / SOURCE / EVENT / EVENT DATE / GUESTS / LOCATION / STATUS / COMMENT / DETAILS / ASSIGN */
      .leads-table th:nth-child(1),.leads-table td:nth-child(1){width:6.7%!important}
      .leads-table th:nth-child(2),.leads-table td:nth-child(2){width:6.8%!important}
      .leads-table th:nth-child(3),.leads-table td:nth-child(3){width:9.6%!important}
      .leads-table th:nth-child(4),.leads-table td:nth-child(4){width:10.2%!important}
      .leads-table th:nth-child(5),.leads-table td:nth-child(5){width:7.0%!important}
      .leads-table th:nth-child(6),.leads-table td:nth-child(6){width:7.0%!important}
      .leads-table th:nth-child(7),.leads-table td:nth-child(7){width:7.7%!important}
      .leads-table th:nth-child(8),.leads-table td:nth-child(8){width:4.0%!important;text-align:center!important}
      .leads-table th:nth-child(9),.leads-table td:nth-child(9){width:6.9%!important}
      .leads-table th:nth-child(10),.leads-table td:nth-child(10){width:7.3%!important;text-align:center!important}

      /* COMMENT — keep all original controls visible: indicator + pencil + view */
      .leads-table th:nth-child(11),.leads-table td:nth-child(11){width:8.4%!important;display:table-cell!important;visibility:visible!important;overflow:visible!important;text-align:center!important;white-space:nowrap!important}
      .leads-table td:nth-child(11)>div,.leads-table .crm-comment-cell,.leads-table .comment-actions,.leads-table .comment-controls{display:flex!important;align-items:center!important;justify-content:center!important;gap:3px!important;flex-wrap:nowrap!important;white-space:nowrap!important;overflow:visible!important}
      .leads-table td:nth-child(11) button,.leads-table td:nth-child(11) a,.leads-table .comment-icon-btn,.leads-table .comment-btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:27px!important;min-width:27px!important;max-width:27px!important;height:27px!important;min-height:27px!important;max-height:27px!important;padding:0!important;margin:0!important;flex:0 0 27px!important;border-radius:8px!important}
      .leads-table .crm-comment-indicator{flex:0 0 auto!important;display:inline-flex!important}

      /* DETAILS — separate named field */
      .leads-table th:nth-child(12),.leads-table td:nth-child(12){width:6.6%!important;text-align:center!important;overflow:visible!important;white-space:nowrap!important}
      .leads-table td:nth-child(12){display:table-cell!important}
      .leads-table td:nth-child(12) .view-lead-btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:auto!important;min-width:56px!important;max-width:none!important;height:29px!important;padding:0 6px!important;margin:0!important;font-size:9.8px!important;white-space:nowrap!important}

      /* ASSIGN — separate final field */
      .leads-table th:nth-child(13),.leads-table td:nth-child(13){width:11.8%!important;text-align:center!important;overflow:visible!important;white-space:nowrap!important}
      .leads-table td:nth-child(13){display:table-cell!important}
      .leads-table td:nth-child(13) .venue-assign-btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:3px!important;width:auto!important;min-width:70px!important;max-width:none!important;height:29px!important;padding:0 7px!important;margin:0!important;font-size:9.8px!important;white-space:nowrap!important}

      /* Lead source drilldown */
      .smv-source-open{cursor:pointer!important;user-select:none!important;box-shadow:0 0 0 1px rgba(8,127,113,.08)!important}
      .smv-source-open:hover{background:#dcf8f1!important;border-color:#9fdfd2!important;color:#056451!important}
      .smv-full-source-note{display:block;margin-top:7px;padding:7px 9px;border:1px solid #cfe8e1;border-radius:9px;background:#f4fbf8;color:#335f56;font-size:10px;line-height:1.35;font-weight:650;word-break:break-word}
      .smv-full-source-note b{display:block;margin-bottom:2px;color:#08745d;font-size:8px;letter-spacing:.09em;text-transform:uppercase}
      .smv-full-source-note.is-highlighted{border-color:#73cdbc;box-shadow:0 0 0 3px rgba(8,127,113,.08)}

      @media(max-width:1350px){
        .leads-table th,.leads-table td{font-size:10.3px!important;padding-left:2px!important;padding-right:2px!important}
        .leads-table th{font-size:9.1px!important;letter-spacing:.035em!important}
        .leads-table td:nth-child(11) button,.leads-table td:nth-child(11) a,.leads-table .comment-icon-btn,.leads-table .comment-btn{width:24px!important;min-width:24px!important;max-width:24px!important;height:25px!important;min-height:25px!important;max-height:25px!important;flex-basis:24px!important}
        .leads-table td:nth-child(12) .view-lead-btn{min-width:50px!important;height:27px!important;padding:0 4px!important;font-size:9.2px!important}
        .leads-table td:nth-child(13) .venue-assign-btn{min-width:64px!important;height:27px!important;padding:0 5px!important;font-size:9.2px!important}
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
        headers[10].textContent = "COMMENT";
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

  function cleanText(value) {
    return String(value == null ? "" : value).trim();
  }

  function looksLikeStructuredRequirement(text) {
    return /^(quick enquiry source|interested venue|venue id|submitted page|search page|guests|budget\/person|event|location|food|ai plan|venue type|style)\s*:/im.test(text || "");
  }

  function normalizeLeadCommentRecord(lead) {
    if (!lead || typeof lead !== "object") return;

    const source = cleanText(lead.source);
    const rawRequirements = cleanText(lead.requirements);
    const savedComment = cleanText(lead.internal_notes || lead.contact_remark);

    if (!rawRequirements) return;

    const lines = rawRequirements.split(/\r?\n/);
    const kept = [];
    let extractedComment = "";

    lines.forEach(line => {
      const value = line.trim();
      const match = value.match(/^customer\s+comment\s*:\s*(.*)$/i);
      if (match) {
        if (!extractedComment) extractedComment = cleanText(match[1]);
        return;
      }
      kept.push(line);
    });

    let comment = savedComment || extractedComment;
    let message = kept.join("\n").trim();

    if (comment && message) {
      const commentLower = comment.toLowerCase();
      message = message
        .split(/\r?\n/)
        .filter(line => line.trim().toLowerCase() !== commentLower)
        .join("\n")
        .trim();
    }

    const isWebsite = /^website\b/i.test(source);
    const isAiSearch = /ai search/i.test(source);

    if (
      !comment &&
      isWebsite &&
      !isAiSearch &&
      message &&
      !looksLikeStructuredRequirement(message)
    ) {
      comment = message;
      message = "";
    }

    if (comment && !lead.internal_notes && !lead.contact_remark) {
      lead.contact_remark = comment;
    }

    if (message !== rawRequirements) {
      lead.requirements = message;
    }
  }

  function normalizeLoadedLeadComments() {
    try {
      if (typeof allLeads === "undefined" || !Array.isArray(allLeads)) return;
      allLeads.forEach(normalizeLeadCommentRecord);
    } catch (error) {
      console.warn("SMV CRM comment normalization warning:", error);
    }
  }

  function installLeadRenderNormalizer() {
    try {
      if (typeof renderLeads !== "function" || renderLeads.__smvNormalized) return;
      const originalRenderLeads = renderLeads;
      renderLeads = function () {
        normalizeLoadedLeadComments();
        const result = originalRenderLeads.apply(this, arguments);
        window.setTimeout(decorateLeadSources, 0);
        window.setTimeout(decorateLeadSources, 80);
        return result;
      };
      renderLeads.__smvNormalized = true;
    } catch (error) {
      console.warn("SMV CRM render normalization warning:", error);
    }
  }

  function decorateLeadSources() {
    document.querySelectorAll("#leadsTableBody tr").forEach(row => {
      const cell = row.children && row.children[4];
      if (!cell) return;

      const raw = cleanText(
        cell.dataset.smvSourceRaw ||
        cell.getAttribute("title") ||
        cell.textContent
      );
      if (!raw || raw === "—") return;

      const span = cell.querySelector(".smv-compact-source");
      if (!span) return;

      cell.dataset.smvSourceRaw = raw;
      cell.title = raw;

      if (/^website\b/i.test(raw)) {
        if (span.textContent !== "Website") span.textContent = "Website";
        span.classList.add("smv-source-open");
        span.setAttribute("role", "button");
        span.setAttribute("tabindex", "0");
        span.setAttribute("aria-label", "Website lead. Open details to view the full source.");
        span.title = "Click to view full lead source";

        if (span.dataset.smvSourceBound !== "1") {
          span.dataset.smvSourceBound = "1";
          const openDetails = event => {
            if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
            event.preventDefault();
            event.stopPropagation();
            const detailsBtn = row.querySelector(".view-lead-btn");
            if (detailsBtn) {
              detailsBtn.click();
              window.setTimeout(() => syncLeadDetailsUX(true), 40);
              window.setTimeout(() => syncLeadDetailsUX(true), 140);
            }
          };
          span.addEventListener("click", openDetails);
          span.addEventListener("keydown", openDetails);
        }
      }
    });
  }

  function getControlValue(control) {
    if (!control) return "";
    return cleanText("value" in control ? control.value : control.textContent);
  }

  function setControlValue(control, value) {
    if (!control) return;
    if ("value" in control) control.value = value;
    else control.textContent = value;
  }

  function ensureFullSourceNote() {
    const sourceControl = document.getElementById("detailSource");
    if (!sourceControl) return null;

    const sourceCard = sourceControl.closest(".info-card") || sourceControl.parentElement;
    if (!sourceCard) return null;

    let note = sourceCard.querySelector(".smv-full-source-note");
    if (!note) {
      note = document.createElement("div");
      note.className = "smv-full-source-note";
      note.innerHTML = "<b>Full Lead Source</b><span></span>";
      sourceControl.insertAdjacentElement("afterend", note);
    }

    const raw = getControlValue(sourceControl) || "Not available";
    const text = note.querySelector("span");
    if (text) text.textContent = raw;
    return note;
  }

  function normalizeOpenLeadFields() {
    const sourceControl = document.getElementById("detailSource");
    const messageControl = document.getElementById("detailMessage");
    const remarksControl = document.getElementById("detailRemarks");
    if (!messageControl || !remarksControl) return;

    const source = getControlValue(sourceControl);
    const rawMessage = getControlValue(messageControl);
    const rawRemark = getControlValue(remarksControl);
    if (!rawMessage) return;

    const lines = rawMessage.split(/\r?\n/);
    const kept = [];
    let extracted = "";

    lines.forEach(line => {
      const value = line.trim();
      const match = value.match(/^customer\s+comment\s*:\s*(.*)$/i);
      if (match) {
        if (!extracted) extracted = cleanText(match[1]);
        return;
      }
      kept.push(line);
    });

    let comment = rawRemark || extracted;
    let message = kept.join("\n").trim();

    if (comment && message) {
      const lower = comment.toLowerCase();
      message = message
        .split(/\r?\n/)
        .filter(line => line.trim().toLowerCase() !== lower)
        .join("\n")
        .trim();
    }

    if (
      !comment &&
      /^website\b/i.test(source) &&
      !/ai search/i.test(source) &&
      message &&
      !looksLikeStructuredRequirement(message)
    ) {
      comment = message;
      message = "";
    }

    if (message !== rawMessage) setControlValue(messageControl, message);
    if (comment && comment !== rawRemark) setControlValue(remarksControl, comment);
  }

  function syncLeadDetailsUX(highlightSource) {
    const modal = document.getElementById("leadModal");
    if (!modal || modal.hidden) return;

    normalizeOpenLeadFields();
    const note = ensureFullSourceNote();

    if (note && highlightSource) {
      note.classList.add("is-highlighted");
      note.scrollIntoView({ behavior: "smooth", block: "nearest" });
      window.setTimeout(() => note.classList.remove("is-highlighted"), 1600);
    }
  }

  function installLeadDetailsWatcher() {
    const modal = document.getElementById("leadModal");
    if (!modal || modal.dataset.smvDetailsWatch === "1") return;
    modal.dataset.smvDetailsWatch = "1";

    const observer = new MutationObserver(() => {
      if (!modal.hidden) {
        window.setTimeout(() => syncLeadDetailsUX(false), 0);
        window.setTimeout(() => syncLeadDetailsUX(false), 80);
      }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ["hidden", "class", "style"] });

    document.addEventListener("click", event => {
      if (event.target.closest(".view-lead-btn")) {
        window.setTimeout(() => syncLeadDetailsUX(false), 30);
        window.setTimeout(() => syncLeadDetailsUX(false), 120);
      }
    });
  }

  function watchLeadTable() {
    splitLeadActionColumns();
    decorateLeadSources();
    const tbody = document.getElementById("leadsTableBody");
    if (!tbody || tbody.dataset.smvSplitWatch === "1") return;
    tbody.dataset.smvSplitWatch = "1";
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      window.setTimeout(() => {
        queued = false;
        splitLeadActionColumns();
        decorateLeadSources();
      }, 0);
    });
    observer.observe(tbody, { childList: true, subtree: true });
  }

  loadScript("crm-core.js?v=20260909-customer-comment-1", function () {
    installLeadRenderNormalizer();
    loadScript("venue-media-manager.js?v=20260904-hd30-1", function () {
      loadScript("crm-hotfix-20260909.js?v=crm-final-layout-3", function () {
        installVenueTablePolish();
        installLeadDetailsWatcher();
        normalizeLoadedLeadComments();
        watchLeadTable();
        setTimeout(() => {
          normalizeLoadedLeadComments();
          watchLeadTable();
        }, 250);
        setTimeout(() => {
          normalizeLoadedLeadComments();
          watchLeadTable();
        }, 900);
      });
    });
  });
})();