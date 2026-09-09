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

      /* COMMENT — internal office notes only */
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

      /* Customer comment is read-only and only visible inside Details */
      .smv-customer-comment-block{margin-top:12px!important;border:1px solid #d9ebe6!important;border-radius:13px!important;background:#fbfefd!important;padding:12px 14px!important}
      .smv-customer-comment-block[hidden]{display:none!important}
      .smv-customer-comment-block label{display:block!important;margin:0 0 6px!important;color:#08745d!important;font-size:9px!important;font-weight:900!important;letter-spacing:.09em!important;text-transform:uppercase!important}
      .smv-customer-comment-value{min-height:38px;padding:10px 11px;border:1px solid #e1efeb;border-radius:10px;background:#f4faf8;color:#244f47;font-size:12px;line-height:1.45;white-space:pre-wrap;word-break:break-word}
      .smv-customer-comment-help{display:block;margin-top:5px;color:#7a938d;font-size:9.5px;line-height:1.3}

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

  function getCustomerCommentMeta(lead) {
    if (!lead || typeof lead !== "object") return { text: "", origin: "" };

    const source = cleanText(lead.source);
    const requirements = cleanText(lead.requirements);
    const internalNote = cleanText(lead.internal_notes);
    const contactRemark = cleanText(lead.contact_remark);

    if (requirements) {
      const lines = requirements.split(/\r?\n/);
      for (const line of lines) {
        const match = line.trim().match(/^customer\s+comment\s*:\s*(.*)$/i);
        if (match && cleanText(match[1])) {
          return { text: cleanText(match[1]), origin: "requirements" };
        }
      }
    }

    if (/^website\b/i.test(source) && contactRemark && contactRemark !== internalNote) {
      return { text: contactRemark, origin: "contact_remark" };
    }

    if (
      /^website\b/i.test(source) &&
      !/ai search/i.test(source) &&
      requirements &&
      !looksLikeStructuredRequirement(requirements)
    ) {
      return { text: requirements, origin: "plain_requirements" };
    }

    return { text: "", origin: "" };
  }

  function cleanRequirementsForDetails(lead, meta) {
    const raw = cleanText(lead?.requirements);
    if (!raw) return "";

    const comment = cleanText(meta?.text);
    let lines = raw
      .split(/\r?\n/)
      .filter(line => !/^customer\s+comment\s*:/i.test(line.trim()));

    if (comment) {
      const lower = comment.toLowerCase();
      lines = lines.filter(line => line.trim().toLowerCase() !== lower);
    }

    let cleaned = lines.join("\n").trim();

    if (meta?.origin === "plain_requirements" && cleaned.toLowerCase() === comment.toLowerCase()) {
      cleaned = "";
    }

    return cleaned;
  }

  function prepareLeadCustomerMeta(lead) {
    if (!lead || typeof lead !== "object") return;
    const meta = getCustomerCommentMeta(lead);
    lead._smvCustomerComment = meta.text;
    lead._smvCustomerCommentOrigin = meta.origin;
  }

  function prepareLoadedLeadCustomerMeta() {
    try {
      if (typeof allLeads === "undefined" || !Array.isArray(allLeads)) return;
      allLeads.forEach(prepareLeadCustomerMeta);
    } catch (error) {
      console.warn("SMV CRM customer comment metadata warning:", error);
    }
  }

  function installInternalCommentOnlyBehavior() {
    try {
      if (typeof createCommentCell === "function" && !createCommentCell.__smvInternalOnly) {
        const originalCreateCommentCell = createCommentCell;
        createCommentCell = function (lead) {
          const internalOnly = cleanText(lead?.internal_notes);
          return originalCreateCommentCell.call(this, lead, internalOnly);
        };
        createCommentCell.__smvInternalOnly = true;
      }

      if (typeof editLeadComment === "function" && !editLeadComment.__smvInternalOnly) {
        editLeadComment = function (leadId) {
          const lead = Array.isArray(allLeads)
            ? allLeads.find(item => String(item.id) === String(leadId))
            : null;
          if (!lead) return;
          openCommentEditor(leadId, cleanText(lead.internal_notes), lead.customer_name);
        };
        editLeadComment.__smvInternalOnly = true;
      }
    } catch (error) {
      console.warn("SMV CRM internal comment separation warning:", error);
    }
  }

  function installLeadRenderNormalizer() {
    try {
      if (typeof renderLeads !== "function" || renderLeads.__smvNormalized) return;
      const originalRenderLeads = renderLeads;
      renderLeads = function () {
        prepareLoadedLeadCustomerMeta();
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

  function ensureCustomerCommentBlock(lead) {
    const messageControl = document.getElementById("detailMessage");
    if (!messageControl) return null;

    const messageBlock = messageControl.closest(".detail-block") || messageControl.parentElement;
    if (!messageBlock) return null;

    let block = document.getElementById("smvCustomerCommentBlock");
    if (!block) {
      block = document.createElement("div");
      block.id = "smvCustomerCommentBlock";
      block.className = "detail-block smv-customer-comment-block";
      block.innerHTML = `
        <label>CUSTOMER COMMENT</label>
        <div class="smv-customer-comment-value"></div>
        <small class="smv-customer-comment-help">Submitted by the customer from the website. Read-only; use COMMENT for internal office notes.</small>
      `;
      messageBlock.insertAdjacentElement("afterend", block);
    }

    const meta = getCustomerCommentMeta(lead);
    const value = block.querySelector(".smv-customer-comment-value");
    if (value) value.textContent = meta.text || "";
    block.hidden = !meta.text;
    return block;
  }

  function normalizeOpenLeadFields() {
    let lead = null;
    try {
      if (typeof currentLead !== "undefined") lead = currentLead;
    } catch (_) {}
    if (!lead) return;

    prepareLeadCustomerMeta(lead);
    const meta = getCustomerCommentMeta(lead);

    const messageControl = document.getElementById("detailMessage");
    const remarksControl = document.getElementById("detailRemarks");

    if (messageControl) {
      setControlValue(messageControl, cleanRequirementsForDetails(lead, meta));
    }

    if (remarksControl) {
      setControlValue(remarksControl, cleanText(lead.internal_notes));
      const label = remarksControl.closest(".detail-block")?.querySelector("label");
      if (label) label.textContent = "COMMENT — INTERNAL OFFICE NOTE";
    }

    ensureCustomerCommentBlock(lead);
  }

  function installSaveCustomerCommentPreserver() {
    try {
      if (typeof saveModalChanges !== "function" || saveModalChanges.__smvCustomerPreserver) return;
      const originalSaveModalChanges = saveModalChanges;

      saveModalChanges = async function () {
        let lead = null;
        try {
          if (typeof currentLead !== "undefined") lead = currentLead;
        } catch (_) {}

        if (lead) {
          const meta = getCustomerCommentMeta(lead);
          const messageControl = document.getElementById("detailMessage");

          if (
            messageControl &&
            meta.text &&
            (meta.origin === "requirements" || meta.origin === "plain_requirements")
          ) {
            const visibleMessage = cleanText(messageControl.value);
            const commentLine = `Customer comment: ${meta.text}`;
            const hasTaggedComment = visibleMessage
              .split(/\r?\n/)
              .some(line => line.trim().toLowerCase() === commentLine.toLowerCase());

            if (!hasTaggedComment) {
              messageControl.value = visibleMessage
                ? `${visibleMessage}\n${commentLine}`
                : commentLine;
            }
          }
        }

        return originalSaveModalChanges.apply(this, arguments);
      };

      saveModalChanges.__smvCustomerPreserver = true;
    } catch (error) {
      console.warn("SMV CRM customer comment save safeguard warning:", error);
    }
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
    installInternalCommentOnlyBehavior();
    installLeadRenderNormalizer();
    installSaveCustomerCommentPreserver();

    loadScript("venue-media-manager.js?v=20260904-hd30-1", function () {
      loadScript("crm-hotfix-20260909.js?v=crm-final-layout-3", function () {
        installVenueTablePolish();
        installLeadDetailsWatcher();
        prepareLoadedLeadCustomerMeta();
        watchLeadTable();

        setTimeout(() => {
          prepareLoadedLeadCustomerMeta();
          watchLeadTable();
        }, 250);

        setTimeout(() => {
          prepareLoadedLeadCustomerMeta();
          watchLeadTable();
        }, 900);
      });
    });
  });
})();