(function () {
  "use strict";

  /* =========================================================
     SELECT MY VENUE — OPERATIONS ENHANCEMENTS
     Additive only: no schema changes, no replacement of current CRM flows.
     Heavy data is loaded only when a drawer/modal is opened.
     ========================================================= */

  const ACTIVE_LEAD_STATUSES = new Set([
    "new", "contacted", "follow-up", "interested", "qualified",
    "detail-shared", "site-visit", "negotiation", "not-pick"
  ]);
  const TERMINAL_LEAD_STATUSES = new Set([
    "booked", "closed", "lost", "not-interested"
  ]);
  const TERMINAL_ASSIGNMENT_STATUSES = new Set([
    "booked", "converted", "closed", "lost", "cancelled"
  ]);

  let timelineRequestToken = 0;
  let lastActionSnapshot = null;
  let venueHealthInputTimer = null;

  function safeText(value) {
    return value === null || value === undefined ? "" : String(value).trim();
  }

  function esc(value) {
    return safeText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function leads() {
    try {
      return Array.isArray(allLeads) ? allLeads : [];
    } catch (_) {
      return [];
    }
  }

  function assignments() {
    try {
      return Array.isArray(allVenueAssignments) ? allVenueAssignments : [];
    } catch (_) {
      return [];
    }
  }

  function venues() {
    try {
      return Array.isArray(allVenues) ? allVenues : [];
    } catch (_) {
      return [];
    }
  }

  function currentLeadSafe() {
    try {
      return typeof currentLead !== "undefined" ? currentLead : null;
    } catch (_) {
      return null;
    }
  }

  function client() {
    try {
      return typeof getSupabaseClient === "function" ? getSupabaseClient() : null;
    } catch (_) {
      return null;
    }
  }

  function dateValue(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function isSameLocalDay(a, b) {
    return a && b && indiaDay(a) === indiaDay(b);
  }

  function minutesSince(value) {
    const d = dateValue(value);
    if (!d) return null;
    return Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  }

  function formatAge(minutes) {
    if (minutes === null) return "—";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  }

  function formatDateTime(value) {
    const d = dateValue(value);
    if (!d) return "—";
    return d.toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  function normalizePhone(value) {
    const digits = safeText(value).replace(/\D/g, "");
    if (!digits) return "";
    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  function normalizeEmail(value) {
    const email = safeText(value).toLowerCase();
    return email.includes("@") ? email : "";
  }

  function isTestLead(lead) {
    const text = `${safeText(lead?.customer_name)} ${safeText(lead?.mobile)}`.toLowerCase();
    return text.includes("<test lead") || text.includes("dummy data");
  }

  function statusOf(lead) {
    return safeText(lead?.status || "new").toLowerCase();
  }

  function isActiveLead(lead) {
    const status = statusOf(lead);
    return ACTIVE_LEAD_STATUSES.has(status) || !TERMINAL_LEAD_STATUSES.has(status);
  }

  function duplicateGroups(sourceLeads) {
    const map = new Map();

    sourceLeads.forEach(lead => {
      if (!lead || isTestLead(lead)) return;
      const keys = [];
      const phone = normalizePhone(lead.mobile);
      const email = normalizeEmail(lead.email);
      if (phone.length >= 10) keys.push(`p:${phone}`);
      if (email) keys.push(`e:${email}`);

      keys.forEach(key => {
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(lead);
      });
    });

    const groups = [];
    const seenSets = new Set();
    map.forEach(items => {
      if (items.length < 2) return;
      const ids = items.map(item => String(item.id)).sort().join("|");
      if (seenSets.has(ids)) return;
      seenSets.add(ids);
      groups.push(items.slice().sort((a, b) =>
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
      ));
    });
    return groups;
  }

  function duplicateForLead(lead) {
    if (!lead) return [];
    const phone = normalizePhone(lead.mobile);
    const email = normalizeEmail(lead.email);
    return leads().filter(other => {
      if (!other || String(other.id) === String(lead.id) || isTestLead(other)) return false;
      return (
        (phone && phone.length >= 10 && normalizePhone(other.mobile) === phone) ||
        (email && normalizeEmail(other.email) === email)
      );
    });
  }

  function buildActionSnapshot() {
    const all = leads();
    const now = new Date();
    const active = all.filter(isActiveLead).filter(lead => !isTestLead(lead));
    const leadAssignments = assignments();

    const assignedLeadIds = new Set(
      leadAssignments
        .filter(item => !TERMINAL_ASSIGNMENT_STATUSES.has(safeText(item.assignment_status).toLowerCase()))
        .map(item => String(item.enquiry_id))
    );

    const newUncontacted = active.filter(lead => {
      const status = statusOf(lead);
      const age = minutesSince(lead.created_at);
      return status === "new" && !lead.last_contacted_at && age !== null && age >= 15;
    });

    const followToday = active.filter(lead => {
      const due = dateValue(lead.follow_up_at);
      return due && isSameLocalDay(due, now);
    });

    const overdue = active.filter(lead => {
      const due = dateValue(lead.follow_up_at);
      return due && due.getTime() < now.getTime();
    });

    const siteVisitsToday = active.filter(lead => {
      const visit = dateValue(lead.site_visit_at);
      return visit && isSameLocalDay(visit, now);
    });

    const unassigned = active.filter(lead =>
      ["new", "contacted", "interested", "qualified"].includes(statusOf(lead)) &&
      !assignedLeadIds.has(String(lead.id))
    );

    const noPartnerResponse = leadAssignments.filter(item => {
      const status = safeText(item.assignment_status || item.status || "assigned").toLowerCase();
      if (TERMINAL_ASSIGNMENT_STATUSES.has(status)) return false;
      if (item.first_contacted_at) return false;
      if (!["assigned", "viewed", "new", ""].includes(status)) return false;
      const age = minutesSince(item.assigned_at || item.created_at);
      return age !== null && age >= 1440;
    });

    const dups = duplicateGroups(all);
    const duplicateLeadIds = new Set(dups.flat().map(item => String(item.id)));

    const priorityMap = new Map();
    const addPriority = (lead, level, reason) => {
      if (!lead) return;
      const id = String(lead.id);
      const existing = priorityMap.get(id);
      const score = level === "critical" ? 3 : level === "warning" ? 2 : 1;
      if (!existing || score > existing.score) {
        priorityMap.set(id, { lead, level, reason, score });
      } else if (!existing.reason.includes(reason)) {
        existing.reason += ` · ${reason}`;
      }
    };

    overdue.forEach(lead => addPriority(lead, "critical", "Follow-up overdue"));
    newUncontacted.forEach(lead => addPriority(lead, "critical", `New ${formatAge(minutesSince(lead.created_at))} · not contacted`));
    noPartnerResponse.forEach(item => {
      const lead = all.find(l => String(l.id) === String(item.enquiry_id));
      addPriority(lead, "warning", "Partner no response 24h+");
    });
    unassigned.forEach(lead => addPriority(lead, "warning", "No active venue assignment"));
    followToday.forEach(lead => addPriority(lead, "info", "Follow-up due today"));
    siteVisitsToday.forEach(lead => addPriority(lead, "info", "Site visit today"));

    const priority = Array.from(priorityMap.values())
      .sort((a, b) => b.score - a.score || new Date(a.lead.created_at || 0) - new Date(b.lead.created_at || 0));

    return {
      all,
      active,
      newUncontacted,
      followToday,
      overdue,
      siteVisitsToday,
      unassigned,
      noPartnerResponse,
      duplicates: dups,
      duplicateLeadIds,
      priority,
      totalAttention: priority.filter(item => item.score >= 2).length
    };
  }

  function injectStyles() {
    if (document.getElementById("smvOpsEnhancementStyles")) return;
    const style = document.createElement("style");
    style.id = "smvOpsEnhancementStyles";
    style.textContent = `
      .smv-ops-btn,.smv-export-btn,.smv-profile-health-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:38px;padding:0 12px;border:1px solid #b9ddd5;border-radius:12px;background:#f5fbf9;color:#075f50;font-weight:850;font-size:11px;cursor:pointer;white-space:nowrap}
      .smv-ops-btn:hover,.smv-export-btn:hover,.smv-profile-health-btn:hover{background:#e8f7f2;border-color:#75c4b5}
      .smv-ops-badge{min-width:20px;height:20px;padding:0 6px;display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:#b42318;color:#fff;font-size:9px;font-weight:900}
      .smv-ops-badge.zero{background:#d9ebe6;color:#497168}
      .smv-drawer-backdrop{position:fixed;inset:0;background:rgba(9,31,28,.25);backdrop-filter:blur(2px);z-index:99970;display:none}
      .smv-drawer-backdrop.show{display:block}
      .smv-ops-drawer{position:fixed;top:0;right:0;z-index:99980;width:min(560px,96vw);height:100vh;background:#fff;border-left:1px solid #cfe5df;box-shadow:-28px 0 70px rgba(24,67,58,.18);transform:translateX(105%);transition:transform .22s ease;display:flex;flex-direction:column}
      .smv-ops-drawer.show{transform:translateX(0)}
      .smv-ops-head{padding:18px 20px;border-bottom:1px solid #dcebe7;background:linear-gradient(135deg,#f3fbf8,#fff);display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
      .smv-ops-head h3{margin:3px 0 4px;color:#064f43;font-size:21px}.smv-ops-head p{margin:0;color:#67827c;font-size:11px}.smv-ops-close{width:34px;height:34px;border-radius:10px;border:1px solid #cfe1dc;background:#fff;color:#365f57;cursor:pointer;font-size:20px}
      .smv-ops-body{overflow:auto;padding:16px 18px 28px}
      .smv-ops-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-bottom:16px}
      .smv-ops-kpi{padding:11px 12px;border:1px solid #dbe9e5;border-radius:12px;background:#fbfefd;min-height:76px}.smv-ops-kpi span{display:block;color:#718b84;font-size:8.5px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}.smv-ops-kpi strong{display:block;margin-top:5px;color:#075f50;font-size:22px}.smv-ops-kpi.critical strong{color:#b42318}.smv-ops-kpi.warning strong{color:#a15c00}
      .smv-ops-section{margin-top:17px}.smv-ops-section-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;color:#335f56;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
      .smv-priority-list,.smv-dup-list,.smv-health-list{display:grid;gap:7px}.smv-priority-item,.smv-dup-item,.smv-health-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 11px;border:1px solid #dbe9e5;border-radius:11px;background:#fff}.smv-priority-main,.smv-health-main{min-width:0}.smv-priority-main strong,.smv-health-main strong{display:block;color:#173f38;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.smv-priority-main small,.smv-health-main small{display:block;margin-top:3px;color:#78918b;font-size:9.5px;line-height:1.3}.smv-priority-item.critical{border-left:4px solid #d92d20}.smv-priority-item.warning{border-left:4px solid #e49b2d}.smv-priority-item.info{border-left:4px solid #2a9d8f}
      .smv-open-btn,.smv-mini-btn{flex:0 0 auto;border:1px solid #b8ddd5;background:#f3fbf8;color:#087462;border-radius:9px;padding:6px 9px;font-size:9px;font-weight:850;cursor:pointer}.smv-open-btn:hover,.smv-mini-btn:hover{background:#e2f5ef}
      .smv-empty-mini{padding:17px;border:1px dashed #cfe1dc;border-radius:11px;text-align:center;color:#78918b;font-size:10px;background:#fbfefd}
      .smv-detail-ops{margin:12px 0;border:1px solid #cfe5df;border-radius:14px;background:linear-gradient(135deg,#f7fcfa,#fff);overflow:hidden}.smv-detail-ops-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid #dfede9}.smv-detail-ops-head strong{color:#075f50;font-size:10px;letter-spacing:.08em;text-transform:uppercase}.smv-detail-ops-actions{display:flex;gap:5px;flex-wrap:wrap}.smv-detail-ops-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;padding:10px 12px}.smv-detail-chip{padding:8px;border:1px solid #e0ece9;border-radius:10px;background:#fff;min-width:0}.smv-detail-chip span{display:block;color:#839892;font-size:7.5px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.smv-detail-chip strong{display:block;margin-top:3px;color:#234c44;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.smv-detail-warning{margin:0 12px 10px;padding:9px 10px;border:1px solid #f2c8c3;border-radius:10px;background:#fff7f6;color:#8e2d24;font-size:9.5px;line-height:1.35}.smv-detail-warning button{margin-left:6px}
      .smv-timeline{padding:0 12px 12px}.smv-timeline-title{margin:3px 0 7px;color:#416b62;font-size:9px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}.smv-timeline-list{display:grid;gap:6px;max-height:190px;overflow:auto}.smv-timeline-item{display:grid;grid-template-columns:8px 1fr;gap:8px;align-items:start;padding:6px 0}.smv-timeline-dot{width:8px;height:8px;border-radius:50%;background:#19a58d;margin-top:4px}.smv-timeline-text strong{display:block;color:#31584f;font-size:9.5px}.smv-timeline-text small{display:block;color:#81958f;font-size:8.5px;margin-top:2px}.smv-timeline-loading{padding:9px;color:#7c938d;font-size:9px}
      .smv-venue-health-panel{margin:12px 0 16px;padding:13px;border:1px solid #cfe5df;border-radius:14px;background:linear-gradient(135deg,#f7fcfa,#fff)}.smv-venue-health-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px}.smv-venue-health-head h3{margin:0;color:#075f50;font-size:14px}.smv-venue-health-head p{margin:3px 0 0;color:#78918b;font-size:9.5px}.smv-health-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.smv-health-kpi{padding:9px;border:1px solid #e0ece9;border-radius:10px;background:#fff}.smv-health-kpi span{display:block;color:#7d948e;font-size:7.5px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}.smv-health-kpi strong{display:block;margin-top:4px;color:#174c42;font-size:18px}
      .smv-venue-modal-health{margin:0 0 16px;padding:12px 13px;border:1px solid #cfe5df;border-radius:13px;background:#f7fcfa}.smv-venue-modal-health-top{display:flex;align-items:center;justify-content:space-between;gap:10px}.smv-health-score{font-size:22px;font-weight:900;color:#087462}.smv-health-missing{margin-top:6px;color:#6e8881;font-size:9.5px;line-height:1.45}
      @media(max-width:900px){.smv-ops-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.smv-detail-ops-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.smv-health-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);
  }

  function ensureActionCenterUI() {
    const actions = document.querySelector(".page-heading .heading-actions");
    if (actions && !document.getElementById("smvActionCenterBtn")) {
      const button = document.createElement("button");
      button.type = "button";
      button.id = "smvActionCenterBtn";
      button.className = "smv-ops-btn";
      button.innerHTML = `⚡ Action Center <span id="smvActionCenterBadge" class="smv-ops-badge zero">0</span>`;
      actions.insertBefore(button, actions.firstChild);
      button.addEventListener("click", openActionCenter);
    }

    if (!document.getElementById("smvExportBtn") && actions) {
      const exportBtn = document.createElement("button");
      exportBtn.type = "button";
      exportBtn.id = "smvExportBtn";
      exportBtn.className = "smv-export-btn";
      exportBtn.textContent = "⇩ Export CSV";
      const refresh = document.getElementById("refreshBtn");
      if (refresh) actions.insertBefore(exportBtn, refresh);
      else actions.appendChild(exportBtn);
      exportBtn.addEventListener("click", exportLeadCSV);
    }

    if (!document.getElementById("smvOpsDrawer")) {
      const backdrop = document.createElement("div");
      backdrop.id = "smvOpsBackdrop";
      backdrop.className = "smv-drawer-backdrop";
      const drawer = document.createElement("aside");
      drawer.id = "smvOpsDrawer";
      drawer.className = "smv-ops-drawer";
      drawer.setAttribute("aria-hidden", "true");
      drawer.innerHTML = `
        <div class="smv-ops-head">
          <div><div class="page-kicker">LIVE OPERATIONS</div><h3>Action Center</h3><p>Only items that need attention. No extra database load until you open a lead.</p></div>
          <button type="button" class="smv-ops-close" id="smvOpsClose" aria-label="Close">×</button>
        </div>
        <div class="smv-ops-body" id="smvOpsBody"></div>`;
      document.body.appendChild(backdrop);
      document.body.appendChild(drawer);
      backdrop.addEventListener("click", closeActionCenter);
      drawer.querySelector("#smvOpsClose")?.addEventListener("click", closeActionCenter);
      drawer.addEventListener("click", event => {
        const open = event.target.closest("[data-smv-open-lead]");
        if (open) {
          const id = open.dataset.smvOpenLead;
          closeActionCenter();
          try { window.openLeadModal?.(id); } catch (_) {}
        }
        const openVenue = event.target.closest("[data-smv-edit-venue]");
        if (openVenue) {
          const venue = venues().find(item => String(item.id) === String(openVenue.dataset.smvEditVenue));
          if (venue) {
            closeVenueHealthList();
            try { openVenueModal(venue); } catch (_) {}
          }
        }
      });
    }
  }

  function refreshActionBadge() {
    ensureActionCenterUI();
    lastActionSnapshot = buildActionSnapshot();
    const badge = document.getElementById("smvActionCenterBadge");
    if (!badge) return;
    const count = lastActionSnapshot.totalAttention;
    badge.textContent = String(count);
    badge.classList.toggle("zero", count === 0);
  }

  function kpi(label, value, className, note) {
    return `<div class="smv-ops-kpi ${className || ""}"><span>${esc(label)}</span><strong>${esc(value)}</strong>${note ? `<small style="display:block;margin-top:3px;color:#829790;font-size:8px">${esc(note)}</small>` : ""}</div>`;
  }

  function openActionCenter() {
    ensureActionCenterUI();
    const snap = buildActionSnapshot();
    lastActionSnapshot = snap;
    const body = document.getElementById("smvOpsBody");
    if (!body) return;

    const priorityHtml = snap.priority.length
      ? snap.priority.slice(0, 15).map(item => {
          const lead = item.lead;
          return `<div class="smv-priority-item ${item.level}"><div class="smv-priority-main"><strong>${esc(lead.customer_name || "Unnamed customer")} · ${esc(lead.mobile || "No phone")}</strong><small>${esc(item.reason)} · ${esc(lead.location || lead.occasion || "")}</small></div><button class="smv-open-btn" data-smv-open-lead="${esc(lead.id)}">Open</button></div>`;
        }).join("")
      : `<div class="smv-empty-mini">No urgent lead action is pending right now.</div>`;

    const duplicateHtml = snap.duplicates.length
      ? snap.duplicates.slice(0, 8).map(group => {
          const latest = group[0];
          return `<div class="smv-dup-item"><div class="smv-priority-main"><strong>${esc(latest.customer_name || "Customer")} · ${esc(latest.mobile || latest.email || "")}</strong><small>${group.length} matching leads found. Review before contacting twice.</small></div><button class="smv-open-btn" data-smv-open-lead="${esc(latest.id)}">Review</button></div>`;
        }).join("")
      : `<div class="smv-empty-mini">No likely duplicate customers found.</div>`;

    body.innerHTML = `
      <div class="smv-ops-grid">
        ${kpi("New >15 min", snap.newUncontacted.length, "critical", "Not contacted")}
        ${kpi("Overdue", snap.overdue.length, "critical", "Follow-ups")}
        ${kpi("Due Today", snap.followToday.length, "", "Follow-ups")}
        ${kpi("No Venue", snap.unassigned.length, "warning", "Active leads")}
        ${kpi("Partner >24h", snap.noPartnerResponse.length, "warning", "No response")}
        ${kpi("Duplicates", snap.duplicates.length, "", "Potential groups")}
      </div>
      <div class="smv-ops-section"><div class="smv-ops-section-title"><span>Priority Work Queue</span><span>${snap.priority.length}</span></div><div class="smv-priority-list">${priorityHtml}</div></div>
      <div class="smv-ops-section"><div class="smv-ops-section-title"><span>Site Visits Today</span><span>${snap.siteVisitsToday.length}</span></div>${snap.siteVisitsToday.length ? `<div class="smv-priority-list">${snap.siteVisitsToday.slice(0,8).map(lead => `<div class="smv-priority-item info"><div class="smv-priority-main"><strong>${esc(lead.customer_name || "Customer")}</strong><small>${esc(formatDateTime(lead.site_visit_at))} · ${esc(lead.location || "Location pending")}</small></div><button class="smv-open-btn" data-smv-open-lead="${esc(lead.id)}">Open</button></div>`).join("")}</div>` : `<div class="smv-empty-mini">No site visits scheduled for today.</div>`}</div>
      <div class="smv-ops-section"><div class="smv-ops-section-title"><span>Duplicate Monitor</span><span>${snap.duplicates.length}</span></div><div class="smv-dup-list">${duplicateHtml}</div></div>`;

    document.getElementById("smvOpsBackdrop")?.classList.add("show");
    const drawer = document.getElementById("smvOpsDrawer");
    drawer?.classList.add("show");
    drawer?.setAttribute("aria-hidden", "false");
  }

  function closeActionCenter() {
    document.getElementById("smvOpsBackdrop")?.classList.remove("show");
    const drawer = document.getElementById("smvOpsDrawer");
    drawer?.classList.remove("show");
    drawer?.setAttribute("aria-hidden", "true");
  }

  function csvCell(value) {
    const text = safeText(value).replace(/"/g, '""');
    return `"${text}"`;
  }

  function exportLeadCSV() {
    let rows = [];
    try {
      rows = Array.isArray(filteredLeads) ? filteredLeads : leads();
    } catch (_) {
      rows = leads();
    }
    if (!rows.length) {
      try { showToast("No enquiries available to export.", "warning"); } catch (_) {}
      return;
    }

    const header = ["Created","Customer","Phone","Email","Source","Event","Event Date","Guests","Location","Status","Follow-up","Site Visit","Assigned To","Internal Notes"];
    const csv = [header.map(csvCell).join(",")].concat(rows.map(lead => [
      formatDateTime(lead.created_at), lead.customer_name, lead.mobile, lead.email, lead.source,
      lead.occasion, lead.event_date, lead.guests, lead.location, lead.status,
      formatDateTime(lead.follow_up_at), formatDateTime(lead.site_visit_at), lead.assigned_to,
      lead.internal_notes
    ].map(csvCell).join(","))).join("\r\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `select-my-venue-leads-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function channelForLead(lead) {
    const source = `${safeText(lead?.source)} ${safeText(lead?.requirements)} ${safeText(lead?.internal_notes)}`.toLowerCase();
    if (/meta ads|facebook|instagram|meta lead/.test(source)) return "Meta Ads";
    if (/google|gclid|utm_source\s*[:=]\s*google/.test(source)) return "Google";
    if (/website/.test(source)) return "Website";
    if (/whatsapp/.test(source)) return "WhatsApp";
    if (/phone/.test(source)) return "Phone";
    return safeText(lead?.source) || "Unknown";
  }

  function extractAttribution(lead) {
    const raw = [lead?.requirements, lead?.internal_notes, lead?.contact_remark, lead?.source]
      .map(safeText).filter(Boolean).join("\n");
    const specs = [
      ["Meta Lead ID", /meta\s+lead\s+id\s*:\s*([^\n]+)/i],
      ["Meta Form ID", /meta\s+form\s+id\s*:\s*([^\n]+)/i],
      ["Campaign ID", /meta\s+campaign\s+id\s*:\s*([^\n]+)/i],
      ["Ad Set ID", /meta\s+ad\s*set\s+id\s*:\s*([^\n]+)/i],
      ["Ad ID", /meta\s+ad\s+id\s*:\s*([^\n]+)/i],
      ["GCLID", /gclid\s*[:=]\s*([^\s\n&]+)/i],
      ["UTM Campaign", /utm_campaign\s*[:=]\s*([^\n&]+)/i]
    ];
    return specs.map(([label, regex]) => {
      const match = raw.match(regex);
      return match ? { label, value: safeText(match[1]) } : null;
    }).filter(Boolean);
  }

  function leadSlaLabel(lead) {
    if (!lead) return "—";
    if (lead.first_contacted_at || lead.last_contacted_at || statusOf(lead) !== "new") return "Contacted";
    const age = minutesSince(lead.created_at);
    if (age === null) return "—";
    if (age <= 15) return `Fresh · ${formatAge(age)}`;
    if (age <= 60) return `Attention · ${formatAge(age)}`;
    return `Late · ${formatAge(age)}`;
  }

  function setQuickFollowUp(mode) {
    const input = document.getElementById("detailFollowUp");
    const status = document.getElementById("detailStatus");
    if (!input) return;
    const d = new Date();
    if (mode === "2h") d.setHours(d.getHours() + 2);
    else if (mode === "tomorrow") {
      d.setDate(d.getDate() + 1); d.setHours(11, 0, 0, 0);
    } else if (mode === "3d") {
      d.setDate(d.getDate() + 3); d.setHours(11, 0, 0, 0);
    }
    const pad = n => String(n).padStart(2, "0");
    input.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (status && !TERMINAL_LEAD_STATUSES.has(safeText(status.value).toLowerCase())) status.value = "follow-up";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function copyLeadSummary(lead) {
    if (!lead) return;
    const text = [
      `Customer: ${safeText(lead.customer_name) || "—"}`,
      `Phone: ${safeText(lead.mobile) || "—"}`,
      `Event: ${safeText(lead.occasion) || "—"}`,
      `Date: ${safeText(lead.event_date) || "—"}`,
      `Guests: ${safeText(lead.guests) || "—"}`,
      `Location: ${safeText(lead.location) || "—"}`,
      `Status: ${safeText(lead.status) || "new"}`,
      `Source: ${safeText(lead.source) || "—"}`,
      `Requirement: ${safeText(lead.requirements) || "—"}`
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      try { showToast("Lead summary copied.", "success"); } catch (_) {}
    } catch (_) {
      window.prompt("Copy lead summary:", text);
    }
  }

  function ensureLeadOpsPanel() {
    const modal = document.getElementById("leadModal");
    if (!modal || modal.hidden) return;
    const lead = currentLeadSafe();
    if (!lead) return;

    let panel = document.getElementById("smvLeadOpsPanel");
    const anchor = modal.querySelector(".assigned-venues-title-row");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "smvLeadOpsPanel";
      panel.className = "smv-detail-ops";
      if (anchor) anchor.insertAdjacentElement("beforebegin", panel);
      else modal.querySelector(".modal-actions")?.insertAdjacentElement("beforebegin", panel);
    }

    const dups = duplicateForLead(lead);
    const attrs = extractAttribution(lead);
    const age = formatAge(minutesSince(lead.created_at));
    const assignmentCount = assignments().filter(item => String(item.enquiry_id) === String(lead.id) && !TERMINAL_ASSIGNMENT_STATUSES.has(safeText(item.assignment_status).toLowerCase())).length;

    panel.innerHTML = `
      <div class="smv-detail-ops-head">
        <strong>Operations & Attribution</strong>
        <div class="smv-detail-ops-actions">
          <button type="button" class="smv-mini-btn" data-smv-follow="2h">+2h Follow-up</button>
          <button type="button" class="smv-mini-btn" data-smv-follow="tomorrow">Tomorrow 11am</button>
          <button type="button" class="smv-mini-btn" data-smv-copy-summary>Copy Summary</button>
        </div>
      </div>
      <div class="smv-detail-ops-grid">
        <div class="smv-detail-chip"><span>Channel</span><strong title="${esc(channelForLead(lead))}">${esc(channelForLead(lead))}</strong></div>
        <div class="smv-detail-chip"><span>Lead Age</span><strong>${esc(age)}</strong></div>
        <div class="smv-detail-chip"><span>Response SLA</span><strong>${esc(leadSlaLabel(lead))}</strong></div>
        <div class="smv-detail-chip"><span>Active Venues</span><strong>${assignmentCount}</strong></div>
        ${attrs.slice(0,4).map(item => `<div class="smv-detail-chip"><span>${esc(item.label)}</span><strong title="${esc(item.value)}">${esc(item.value)}</strong></div>`).join("")}
      </div>
      ${dups.length ? `<div class="smv-detail-warning"><strong>Possible duplicate:</strong> ${dups.length} other lead${dups.length === 1 ? "" : "s"} match this phone/email. ${dups.slice(0,3).map(item => `<button type="button" class="smv-mini-btn" data-smv-open-duplicate="${esc(item.id)}">Open ${esc(item.customer_name || "lead")}</button>`).join(" ")}</div>` : ""}
      <div class="smv-timeline"><div class="smv-timeline-title">Unified Activity Timeline</div><div id="smvLeadTimeline" class="smv-timeline-list"><div class="smv-timeline-loading">Loading activity only when needed…</div></div></div>`;

    panel.querySelectorAll("[data-smv-follow]").forEach(btn => btn.addEventListener("click", () => setQuickFollowUp(btn.dataset.smvFollow)));
    panel.querySelector("[data-smv-copy-summary]")?.addEventListener("click", () => copyLeadSummary(lead));
    panel.querySelectorAll("[data-smv-open-duplicate]").forEach(btn => btn.addEventListener("click", () => {
      try { window.openLeadModal?.(btn.dataset.smvOpenDuplicate); } catch (_) {}
    }));

    loadLeadTimeline(lead, ++timelineRequestToken);
  }

  async function loadLeadTimeline(lead, requestToken) {
    const container = document.getElementById("smvLeadTimeline");
    if (!container || !lead) return;

    const events = [{
      at: lead.created_at,
      title: "Enquiry created",
      detail: `${channelForLead(lead)} · ${safeText(lead.source) || "source not recorded"}`
    }];

    const leadAssignments = assignments().filter(item => String(item.enquiry_id) === String(lead.id));
    leadAssignments.forEach(item => {
      events.push({
        at: item.assigned_at || item.created_at,
        title: "Venue assigned",
        detail: `Partner status: ${safeText(item.assignment_status || item.status || "assigned")}`
      });
      try {
        const activityMap = typeof assignmentActivityHistory !== "undefined" ? assignmentActivityHistory : {};
        const activity = Array.isArray(activityMap?.[String(item.id)]) ? activityMap[String(item.id)] : [];
        activity.slice(0, 12).forEach(row => events.push({
          at: row.created_at,
          title: safeText(row.activity_type).replace(/_/g, " ") || "Partner activity",
          detail: safeText(row.description) || "Venue partner updated this lead"
        }));
      } catch (_) {}
    });

    const db = client();
    if (db) {
      try {
        const { data, error } = await db
          .from("crm_activity_log")
          .select("id,activity_type,description,old_value,new_value,created_at")
          .eq("lead_id", lead.id)
          .order("created_at", { ascending: false })
          .limit(25);
        if (!error && Array.isArray(data)) {
          data.forEach(row => events.push({
            at: row.created_at,
            title: safeText(row.activity_type).replace(/_/g, " ") || "CRM activity",
            detail: safeText(row.description) || [row.old_value, row.new_value].filter(Boolean).join(" → ")
          }));
        }
      } catch (error) {
        console.warn("SMV unified timeline load warning:", error);
      }
    }

    if (requestToken !== timelineRequestToken || !document.getElementById("smvLeadTimeline")) return;

    const unique = new Map();
    events.forEach(event => {
      const key = `${safeText(event.at)}|${safeText(event.title)}|${safeText(event.detail)}`;
      if (!unique.has(key)) unique.set(key, event);
    });
    const sorted = Array.from(unique.values())
      .filter(event => event.at)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 30);

    container.innerHTML = sorted.length
      ? sorted.map(event => `<div class="smv-timeline-item"><span class="smv-timeline-dot"></span><div class="smv-timeline-text"><strong>${esc(event.title)}</strong><small>${esc(formatDateTime(event.at))}${event.detail ? ` · ${esc(event.detail)}` : ""}</small></div></div>`).join("")
      : `<div class="smv-empty-mini">No activity recorded yet.</div>`;
  }

  function venueHealth(venue) {
    const checks = [
      ["Venue name", 8, !!safeText(venue?.venue_name)],
      ["Venue type", 7, !!safeText(venue?.venue_type)],
      ["Contact person + mobile", 10, !!safeText(venue?.contact_person) && !!safeText(venue?.contact_mobile)],
      ["Location", 10, !!safeText(venue?.city) && (!!safeText(venue?.area) || !!safeText(venue?.address))],
      ["Capacity range", 10, !!venue?.capacity_min && !!venue?.capacity_max],
      ["Price range", 10, !!venue?.price_min_per_person && !!venue?.price_max_per_person],
      ["Description", 10, safeText(venue?.description).length >= 80],
      ["Google Maps", 7, !!safeText(venue?.google_maps_url)],
      ["Online presence", 6, !!safeText(venue?.website_url || venue?.instagram_url || venue?.facebook_url)],
      ["Cover / media", 10, !!safeText(venue?.cover_image_url || venue?.cover_photo_url || venue?.image_url) || (Array.isArray(venue?.photos) && venue.photos.length > 0)],
      ["Verified + public", 12, safeText(venue?.verification_status).toLowerCase() === "verified" && venue?.public_listing_enabled === true]
    ];
    const score = checks.reduce((sum, [, weight, ok]) => sum + (ok ? weight : 0), 0);
    return {
      score: Math.min(100, score),
      missing: checks.filter(([, , ok]) => !ok).map(([label]) => label)
    };
  }

  function venueHealthFromForm() {
    const val = id => safeText(document.getElementById(id)?.value);
    const checked = id => document.getElementById(id)?.checked === true;
    const checks = [
      ["Venue name", 8, !!val("venueName")],
      ["Venue type", 7, !!val("venueType")],
      ["Contact person + mobile", 10, !!val("venueContactPerson") && !!val("venueMobile")],
      ["Location", 10, !!val("venueCity") && (!!val("venueArea") || !!val("venueAddress"))],
      ["Capacity range", 10, !!val("venueCapacityMin") && !!val("venueCapacityMax")],
      ["Price range", 10, !!val("venuePriceMin") && !!val("venuePriceMax")],
      ["Description", 10, val("venueDescription").length >= 80],
      ["Google Maps", 7, !!val("venueMaps")],
      ["Online presence", 6, !!(val("venueWebsite") || val("venueInstagram") || val("venueFacebook"))],
      ["Cover / media", 10, !!document.querySelector("#venueCoverPreview img, .venue-cover-preview img")],
      ["Verified + public", 12, val("venueVerification").toLowerCase() === "verified" && checked("venuePublicListing")]
    ];
    const score = checks.reduce((sum, [, weight, ok]) => sum + (ok ? weight : 0), 0);
    return { score: Math.min(100, score), missing: checks.filter(([, , ok]) => !ok).map(([label]) => label) };
  }

  function renderVenueHealthPanel() {
    const section = document.getElementById("venueManagementSection");
    const toolbar = section?.querySelector(".venue-toolbar");
    if (!section || !toolbar) return;

    let panel = document.getElementById("smvVenueHealthPanel");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "smvVenueHealthPanel";
      panel.className = "smv-venue-health-panel";
      toolbar.insertAdjacentElement("beforebegin", panel);
    }

    const all = venues();
    const health = all.map(venue => ({ venue, ...venueHealth(venue) }));
    const avg = health.length ? Math.round(health.reduce((sum, item) => sum + item.score, 0) / health.length) : 0;
    const incomplete = health.filter(item => item.score < 80);
    const publicIncomplete = health.filter(item => item.venue.public_listing_enabled === true && item.score < 80);
    const stale = health.filter(item => {
      const age = minutesSince(item.venue.updated_at || item.venue.created_at);
      return age !== null && age > 60 * 24 * 90;
    });

    panel.innerHTML = `
      <div class="smv-venue-health-head"><div><h3>Venue Profile Health</h3><p>Data quality control for better customer matching and stronger public venue profiles.</p></div><button type="button" class="smv-profile-health-btn" id="smvOpenVenueHealth">Review Profiles</button></div>
      <div class="smv-health-kpis">
        <div class="smv-health-kpi"><span>Average completeness</span><strong>${avg}%</strong></div>
        <div class="smv-health-kpi"><span>Below 80%</span><strong>${incomplete.length}</strong></div>
        <div class="smv-health-kpi"><span>Public but incomplete</span><strong>${publicIncomplete.length}</strong></div>
        <div class="smv-health-kpi"><span>Stale 90+ days</span><strong>${stale.length}</strong></div>
      </div>`;
    panel.querySelector("#smvOpenVenueHealth")?.addEventListener("click", () => openVenueHealthList(health));
  }

  function openVenueHealthList(prefetched) {
    ensureActionCenterUI();
    const health = Array.isArray(prefetched) ? prefetched : venues().map(venue => ({ venue, ...venueHealth(venue) }));
    const sorted = health.slice().sort((a, b) => a.score - b.score);
    const body = document.getElementById("smvOpsBody");
    if (!body) return;
    body.innerHTML = `
      <div class="smv-ops-section" style="margin-top:0"><div class="smv-ops-section-title"><span>Venue Profile Health</span><span>${health.length} venues</span></div>
      <div class="smv-health-list">${sorted.length ? sorted.map(item => `<div class="smv-health-item"><div class="smv-health-main"><strong>${esc(item.venue.venue_name || "Unnamed venue")} · ${item.score}%</strong><small>${item.missing.length ? `Missing: ${esc(item.missing.slice(0,5).join(", "))}` : "Profile is complete"}</small></div><button type="button" class="smv-open-btn" data-smv-edit-venue="${esc(item.venue.id)}">Edit</button></div>`).join("") : `<div class="smv-empty-mini">No venues loaded.</div>`}</div></div>`;
    const drawer = document.getElementById("smvOpsDrawer");
    const title = drawer?.querySelector(".smv-ops-head h3");
    const subtitle = drawer?.querySelector(".smv-ops-head p");
    if (title) title.textContent = "Venue Profile Health";
    if (subtitle) subtitle.textContent = "Complete the missing information to improve customer matching and trust.";
    document.getElementById("smvOpsBackdrop")?.classList.add("show");
    drawer?.classList.add("show");
    drawer?.setAttribute("aria-hidden", "false");
  }

  function closeVenueHealthList() {
    closeActionCenter();
    const drawer = document.getElementById("smvOpsDrawer");
    const title = drawer?.querySelector(".smv-ops-head h3");
    const subtitle = drawer?.querySelector(".smv-ops-head p");
    if (title) title.textContent = "Action Center";
    if (subtitle) subtitle.textContent = "Only items that need attention. No extra database load until you open a lead.";
  }

  function renderVenueModalHealth() {
    const form = document.getElementById("venueForm");
    if (!form) return;
    let card = document.getElementById("smvVenueModalHealth");
    if (!card) {
      card = document.createElement("div");
      card.id = "smvVenueModalHealth";
      card.className = "smv-venue-modal-health";
      const firstTitle = form.querySelector(".venue-form-section-title");
      if (firstTitle) firstTitle.insertAdjacentElement("beforebegin", card);
      else form.prepend(card);

      form.addEventListener("input", () => {
        clearTimeout(venueHealthInputTimer);
        venueHealthInputTimer = setTimeout(renderVenueModalHealth, 120);
      });
      form.addEventListener("change", () => {
        clearTimeout(venueHealthInputTimer);
        venueHealthInputTimer = setTimeout(renderVenueModalHealth, 80);
      });
    }
    const health = venueHealthFromForm();
    card.innerHTML = `<div class="smv-venue-modal-health-top"><div><strong style="color:#075f50;font-size:10px;letter-spacing:.07em;text-transform:uppercase">Venue Profile Health</strong><div class="smv-health-missing">${health.missing.length ? `Improve: ${esc(health.missing.join(" · "))}` : "Profile is complete and customer-ready."}</div></div><div class="smv-health-score">${health.score}%</div></div>`;
  }

  function wrapDataRefreshFunctions() {
    try {
      if (typeof loadEnquiries === "function" && !loadEnquiries.__smvOpsWrapped) {
        const original = loadEnquiries;
        loadEnquiries = async function () {
          const result = await original.apply(this, arguments);
          window.setTimeout(refreshActionBadge, 0);
          return result;
        };
        loadEnquiries.__smvOpsWrapped = true;
        window.loadEnquiries = loadEnquiries;
      }
    } catch (error) {
      console.warn("SMV Action Center load wrapper warning:", error);
    }

    try {
      if (typeof renderVenues === "function" && !renderVenues.__smvHealthWrapped) {
        const original = renderVenues;
        renderVenues = function () {
          const result = original.apply(this, arguments);
          window.setTimeout(renderVenueHealthPanel, 0);
          return result;
        };
        renderVenues.__smvHealthWrapped = true;
      }
    } catch (error) {
      console.warn("SMV Venue Health render wrapper warning:", error);
    }

    try {
      if (typeof openVenueModal === "function" && !openVenueModal.__smvHealthWrapped) {
        const original = openVenueModal;
        openVenueModal = function () {
          const result = original.apply(this, arguments);
          window.setTimeout(renderVenueModalHealth, 40);
          return result;
        };
        openVenueModal.__smvHealthWrapped = true;
      }
    } catch (error) {
      console.warn("SMV Venue modal health wrapper warning:", error);
    }
  }

  function installLeadModalWatcher() {
    const modal = document.getElementById("leadModal");
    if (!modal || modal.dataset.smvOpsWatch === "1") return;
    modal.dataset.smvOpsWatch = "1";
    const observer = new MutationObserver(() => {
      if (!modal.hidden) window.setTimeout(ensureLeadOpsPanel, 60);
    });
    observer.observe(modal, { attributes: true, attributeFilter: ["hidden", "class", "style"] });
    document.addEventListener("click", event => {
      if (event.target.closest(".view-lead-btn,[data-action='view']")) {
        window.setTimeout(ensureLeadOpsPanel, 100);
      }
      if (event.target.closest("#venueManagementBtn")) {
        window.setTimeout(renderVenueHealthPanel, 180);
      }
    });
  }

  function install() {
    injectStyles();
    ensureActionCenterUI();
    wrapDataRefreshFunctions();
    installLeadModalWatcher();
    refreshActionBadge();
    window.setTimeout(refreshActionBadge, 700);
    window.setTimeout(renderVenueHealthPanel, 900);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
