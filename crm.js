/* =========================================================
   SELECT MY VENUE — CRM
   COMPLETE CRM.JS
   Source Dropdown + Comments + Status + AI-Style Insights
   ========================================================= */

"use strict";

/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

const CRM_SUPABASE_URL =
    window.SUPABASE_URL ||
    "https://uajqwyoqbbswkfiwosyw.supabase.co";

const CRM_SUPABASE_ANON_KEY =
    window.SUPABASE_ANON_KEY ||
    "sb_publishable_hfiuO4ZRn4VZmEkrN2RV-A_lZX_R3z7";

/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

let supabaseClient = null;

function getSupabaseClient() {

    if (supabaseClient) {
        return supabaseClient;
    }

    if (
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {
        console.error("Supabase library not loaded.");
        showToast("Supabase library is not loaded.", "error");
        return null;
    }

    supabaseClient =
        window.supabase.createClient(
            CRM_SUPABASE_URL,
            CRM_SUPABASE_ANON_KEY,
            {
                auth: {
                    storageKey: "smv-master-crm-auth",
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            }
        );

    return supabaseClient;
}

/* =========================================================
   GLOBAL STATE
   ========================================================= */

let allLeads = [];
let filteredLeads = [];
let currentLead = null;

let currentStatusFilter = "all";
let currentSearch = "";

let toastTimer = null;

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function $(selector, parent = document) {
    return parent.querySelector(selector);
}

function safeValue(value) {
    return (
        value === null ||
        value === undefined
    )
        ? ""
        : String(value);
}

function escapeHTML(value) {

    return safeValue(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =========================================================
   TOAST
   ========================================================= */

function showToast(
    message,
    type = "success"
) {

    let toast =
        document.getElementById("toastMessage");

    if (!toast) {

        toast =
            document.createElement("div");

        toast.id =
            "toastMessage";

        Object.assign(
            toast.style,
            {
                position: "fixed",
                bottom: "24px",
                right: "24px",
                zIndex: "99999",
                padding: "12px 18px",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "700",
                boxShadow:
                    "0 14px 40px rgba(0,0,0,.18)",
                transition:
                    "opacity .25s ease, transform .25s ease"
            }
        );

        document.body.appendChild(toast);
    }

    if (type === "error") {
        toast.style.background = "#b42318";
    }
    else if (type === "warning") {
        toast.style.background = "#a66b00";
    }
    else {
        toast.style.background = "#087f6c";
    }

    toast.textContent = message;
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";

    clearTimeout(toastTimer);

    toastTimer =
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform =
                "translateY(8px)";
        }, 2800);
}

/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function checkCRMAuth() {

    const client =
        getSupabaseClient();

    if (!client) {
        return null;
    }

    try {

        const {
            data,
            error
        } =
            await client.auth.getSession();

        if (error) {

            console.error(
                "Authentication error:",
                error
            );

            return null;
        }

        const session =
            data?.session;

        if (!session) {

            window.location.href =
                "login.html";

            return null;
        }

        /* -------------------------------------------------
           MASTER CRM = STAFF ONLY

           Verify the authenticated user against the existing
           SECURITY DEFINER staff-access function.
        ------------------------------------------------- */

        const { data: isActiveStaff, error: staffError } =
            await client.rpc("smv_is_active_staff");

        if (staffError) {
            console.error("Staff access verification error:", staffError);

            /*
               Do not immediately sign the user out here. A transient
               RPC/schema-cache/network error used to create a login
               loop: login succeeded, dashboard loaded, verification
               failed, session was signed out, and the user was sent
               back to login.
            */
            showToast(
                "Unable to verify CRM access. Please refresh and try again.",
                "error"
            );
            return null;
        }

        const staffAllowed =
            isActiveStaff === true ||
            isActiveStaff === "true" ||
            isActiveStaff === 1 ||
            isActiveStaff === "1";

        if (!staffAllowed) {
            console.warn("Authenticated user is not an active staff member.");
            await client.auth.signOut();
            window.location.href = "login.html?error=staff_only";
            return null;
        }

        updateStaffName(
            session.user
        );

        return session;

    }
    catch (error) {

        console.error(
            "Auth exception:",
            error
        );

        return null;
    }
}

function updateStaffName(user) {

    const element =
        document.getElementById(
            "staffName"
        );

    if (!element || !user) {
        return;
    }

    const metadata =
        user.user_metadata || {};

    element.textContent =
        metadata.full_name ||
        metadata.name ||
        metadata.display_name ||
        user.email ||
        "CRM User";
}

/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutCRM() {

    const client =
        getSupabaseClient();

    if (!client) {
        return;
    }

    try {

        const { error } =
            await client.auth.signOut();

        if (error) {

            console.error(
                "Logout error:",
                error
            );

            showToast(
                "Unable to logout.",
                "error"
            );

            return;
        }

        window.location.href =
            "login.html";

    }
    catch (error) {

        console.error(error);

        showToast(
            "Unable to logout.",
            "error"
        );
    }
}

/* =========================================================
   LOAD ENQUIRIES
   ========================================================= */

async function loadEnquiries() {

    const client =
        getSupabaseClient();

    if (!client) {
        return;
    }

    setTableLoading();

    try {

        const {
            data,
            error
        } =
            await client
                .from("customer_enquiries")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {

            console.error(
                "Supabase load error:",
                error
            );

            renderTableError(
                "Unable to load enquiries."
            );

            showToast(
                error.message ||
                "Unable to load enquiries.",
                "error"
            );

            return;
        }

        allLeads =
            Array.isArray(data)
                ? data
                : [];

        await loadVenueAssignments();

        applyFilters();
        updateStats();

    }
    catch (error) {

        console.error(
            "Load exception:",
            error
        );

        renderTableError(
            "Something went wrong while loading enquiries."
        );

        showToast(
            "Unable to load enquiries.",
            "error"
        );
    }
}

/* =========================================================
   TABLE STATES
   ========================================================= */

function setTableLoading() {

    const tbody =
        document.getElementById(
            "leadsTableBody"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="loading-cell">
                Loading customer enquiries...
            </td>
        </tr>
    `;
}

function renderTableError(message) {

    const tbody =
        document.getElementById(
            "leadsTableBody"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="loading-cell">
                ${escapeHTML(message)}
            </td>
        </tr>
    `;
}

/* =========================================================
   SEARCH + FILTERS
   ========================================================= */

function applyFilters() {

    const search =
        currentSearch
            .trim()
            .toLowerCase();

    filteredLeads =
        allLeads.filter(
            lead => {

                const searchable = [
                    lead.customer_name,
                    lead.mobile,
                    lead.email,
                    lead.source,
                    lead.location,
                    lead.occasion,
                    lead.requirements,
                    lead.internal_notes,
                    lead.status
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                const matchesSearch =
                    !search ||
                    searchable.includes(search);

                const status =
                    safeValue(
                        lead.status || "new"
                    ).toLowerCase();

                const matchesStatus =
                    currentStatusFilter === "all" ||
                    status === currentStatusFilter;

                return (
                    matchesSearch &&
                    matchesStatus
                );
            }
        );

    renderLeads();
}

/* =========================================================
   STATUS STYLING
   ========================================================= */

function getStatusStyle(status) {

    const value =
        safeValue(status)
            .toLowerCase();

    const styles = {

        "new": {
            background: "#e8f0ff",
            color: "#2457a6",
            border: "#c7d8ff"
        },

        "contacted": {
            background: "#e6f7ee",
            color: "#19764a",
            border: "#bde8d0"
        },

        "follow-up": {
            background: "#fff4d6",
            color: "#9a6700",
            border: "#f2d98d"
        },

        "detail-shared": {
            background: "#eeeaff",
            color: "#5a45a5",
            border: "#d9d0fa"
        },

        "interested": {
            background: "#e2f7f5",
            color: "#087b72",
            border: "#b9e8e4"
        },

        "qualified": {
            background: "#e9f5ff",
            color: "#1769aa",
            border: "#c4e2f8"
        },

        "site-visit": {
            background: "#f3eaff",
            color: "#7540a8",
            border: "#dfc8f6"
        },

        "negotiation": {
            background: "#fff0df",
            color: "#a65312",
            border: "#f3d0a7"
        },

        "booked": {
            background: "#e4f8e8",
            color: "#237a36",
            border: "#bce7c4"
        },

        "converted": {
            background: "#dff7ef",
            color: "#08765d",
            border: "#b2e4d5"
        },

        "closed": {
            background: "#edf0f2",
            color: "#4e5963",
            border: "#d7dce0"
        },

        "lost": {
            background: "#ffe7e7",
            color: "#b42318",
            border: "#f5bcbc"
        },

        "not-interested": {
            background: "#ffdede",
            color: "#b42318",
            border: "#efaaaa"
        }
    };

    return (
        styles[value] ||
        styles.new
    );
}

function createStatusBadge(status) {

    const value =
        status || "new";

    const style =
        getStatusStyle(value);

    return `
        <span
            class="crm-status-badge"
            style="
                display:inline-flex;
                align-items:center;
                justify-content:center;
                padding:5px 10px;
                border-radius:999px;
                font-size:11px;
                font-weight:800;
                line-height:1.2;
                white-space:nowrap;
                background:${style.background};
                color:${style.color};
                border:1px solid ${style.border};
            "
        >
            ${escapeHTML(
                formatStatus(value)
            )}
        </span>
    `;
}

/* =========================================================
   SOURCE OPTIONS
   ========================================================= */

function getSourceOptions() {

    return [

        {
            value: "",
            label: "Select Source"
        },

        {
            value: "Website",
            label: "Website"
        },

        {
            value: "WhatsApp",
            label: "WhatsApp"
        },

        {
            value: "Phone Call",
            label: "Phone Call"
        },

        {
            value: "Google Search",
            label: "Google Search"
        },

        {
            value: "Instagram",
            label: "Instagram"
        },

        {
            value: "Facebook",
            label: "Facebook"
        },

        {
            value: "Referral",
            label: "Referral"
        },

        {
            value: "Direct Enquiry",
            label: "Direct Enquiry"
        },

        {
            value: "Venue Partner",
            label: "Venue Partner"
        },

        {
            value: "Email",
            label: "Email"
        },

        {
            value: "Advertisement",
            label: "Advertisement"
        },

        {
            value: "Other",
            label: "Other"
        }
    ];
}

/* =========================================================
   EVENT OPTIONS
   ========================================================= */

function getEventOptions() {

    return [

        {
            value: "",
            label: "Select Event"
        },

        {
            value: "Wedding",
            label: "Wedding"
        },

        {
            value: "Engagement",
            label: "Engagement"
        },

        {
            value: "Birthday",
            label: "Birthday"
        },

        {
            value: "Anniversary",
            label: "Anniversary"
        },

        {
            value: "Corporate Event",
            label: "Corporate Event"
        },

        {
            value: "Reception",
            label: "Reception"
        },

        {
            value: "Party",
            label: "Party"
        },

        {
            value: "Other",
            label: "Other"
        }
    ];
}

/* =========================================================
   STATUS OPTIONS
   ========================================================= */

function getStatusOptions() {
  return [
    { value: "new",           label: "New" },
    { value: "contacted",     label: "Contacted" },
    { value: "follow-up",     label: "Follow-up" },
    { value: "detail-shared", label: "Detail Shared" },
    { value: "interested",    label: "Interested" },
    { value: "qualified",     label: "Qualified" },
    { value: "site-visit",    label: "Site Visit" },
    { value: "negotiation",   label: "Negotiation" },
    { value: "booked",        label: "Booked" },
    { value: "converted",     label: "Converted" },
    { value: "closed",        label: "Closed" },
    { value: "lost",          label: "Lost" },
    { value: "not-interested",label: "Not Interested" }
  ];
}

/* =========================================================
   GENERIC SELECT EDITOR
   ========================================================= */

function createSelectEditor(
    options,
    selectedValue
) {

    const select =
        document.createElement("select");

    select.className =
        "crm-inline-editor";

    options.forEach(
        option => {

            const item =
                document.createElement("option");

            item.value =
                option.value;

            item.textContent =
                option.label;

            if (
                String(option.value) ===
                String(selectedValue)
            ) {
                item.selected = true;
            }

            select.appendChild(item);
        }
    );

    return select;
}

/* =========================================================
   CREATE INLINE FIELD
   ========================================================= */

function createInlineField(
    lead,
    field,
    displayValue,
    type = "text",
    options = null,
    rawValue = null
) {

    const id =
        safeValue(lead.id);

    const value =
        rawValue !== null &&
        rawValue !== undefined
            ? rawValue
            : lead[field];

    const shown =
        displayValue === "" ||
        displayValue === null ||
        displayValue === undefined
            ? "—"
            : displayValue;

    return `
        <div
            class="crm-inline-field"
            data-inline-field="${escapeHTML(field)}"
            data-lead-id="${escapeHTML(id)}"
            data-value="${escapeHTML(
                safeValue(value)
            )}"
            tabindex="0"
            title="Click to edit"
        >
            <span class="inline-display">
                ${escapeHTML(shown)}
            </span>
        </div>
    `;
}

/* =========================================================
   CREATE SOURCE FIELD
   ========================================================= */

function createSourceField(
    lead,
    source
) {

    const id =
        safeValue(lead.id);

    return `
        <div
            class="crm-inline-field crm-source-inline-field"
            data-inline-field="source"
            data-lead-id="${escapeHTML(id)}"
            data-value="${escapeHTML(
                safeValue(source)
            )}"
            tabindex="0"
            title="Click to change source"
        >
            <span class="inline-display">
                ${escapeHTML(
                    source || "—"
                )}
            </span>
        </div>
    `;
}

/* =========================================================
   CREATE STATUS FIELD
   ========================================================= */

function createStatusInlineField(
    lead,
    status
) {

    const id =
        safeValue(lead.id);

    return `
        <div
            class="crm-inline-field crm-status-inline-field"
            data-inline-field="status"
            data-lead-id="${escapeHTML(id)}"
            data-value="${escapeHTML(
                safeValue(status)
            )}"
            tabindex="0"
            title="Click to change status"
        >
            <span class="inline-display">
                ${createStatusBadge(status)}
            </span>
        </div>
    `;
}

/* =========================================================
   COMMENT CELL
   ========================================================= */

function createCommentCell(
    lead,
    comment
) {

    const id =
        safeValue(lead.id);

    const hasComment =
        comment.length > 0;

    return `
        <div
            class="crm-comment-cell"
            data-lead-id="${escapeHTML(id)}"
        >

            ${
                hasComment
                    ? `
                        <span
                            class="crm-comment-indicator"
                            title="Comment exists"
                            aria-label="Comment exists"
                        >
                            Y
                        </span>
                    `
                    : ""
            }

            <button
                type="button"
                class="comment-icon-btn"
                data-comment-action="edit"
                data-id="${escapeHTML(id)}"
                title="Edit comment"
                aria-label="Edit comment"
            >
                ✏️
            </button>

            ${
                hasComment
                    ? `
                        <button
                            type="button"
                            class="comment-icon-btn"
                            data-comment-action="view"
                            data-id="${escapeHTML(id)}"
                            title="View comment"
                            aria-label="View comment"
                        >
                            👁
                        </button>
                    `
                    : ""
            }

        </div>
    `;
}

/* =========================================================
   STAGE 7B.1 — WORLD-CLASS LEAD WORKSPACE HELPERS
   ========================================================= */

function getCustomerInitials(name) {
    const parts = safeValue(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "CU";
    return parts.slice(0,2).map(part => part.charAt(0).toUpperCase()).join("");
}

function getLeadVenueProgressSummary(leadId) {
    const assignments = allVenueAssignments
        .filter(item =>
            String(item.enquiry_id) === String(leadId) &&
            String(item.assignment_status || "").toLowerCase() !== "cancelled"
        )
        .sort((a,b) => new Date(b.updated_at || b.assigned_at || 0) - new Date(a.updated_at || a.assigned_at || 0));

    if (!assignments.length) {
        return `
            <div class="venue-progress-empty">
                <span class="venue-progress-empty-icon">＋</span>
                <div>
                    <strong>Not assigned</strong>
                    <span>Ready for venue matching</span>
                </div>
            </div>`;
    }

    const primary = assignments[0];
    const venue = assignedVenueDetails[String(primary.venue_id)] || {};
    const partner = assignedVenuePartnerProfiles[String(primary.venue_id)] || {};
    const status = safeValue(primary.assignment_status || "assigned").toLowerCase();
    const venueName = venue.venue_name || venue.name || "Assigned Venue";
    const partnerName = partner.full_name || partner.email || "Partner";
    const remaining = assignments.length - 1;

    return `
        <div class="venue-progress-summary">
            <div class="venue-progress-summary-top">
                <span class="venue-progress-icon">🏨</span>
                <strong>${escapeHTML(venueName)}</strong>
                ${remaining > 0 ? `<span class="venue-more-count">+${remaining}</span>` : ""}
            </div>
            <div class="venue-progress-summary-bottom">
                <span class="venue-mini-status venue-mini-status-${escapeHTML(status.replaceAll("_","-"))}">
                    ${escapeHTML(getAssignmentStatusLabel(status))}
                </span>
                <span class="venue-partner-name">${escapeHTML(partnerName)}</span>
            </div>
        </div>`;
}

/* =========================================================
   CREATE LEAD ROW
   ========================================================= */

function createLeadRow(lead) {
    const id = safeValue(lead.id);
    const customerName = lead.customer_name || "Unknown Customer";
    const phone = lead.mobile || "—";
    const createdDate = lead.created_at ? formatDateTime(lead.created_at) : "—";
    const email = lead.email || "—";
    const source = lead.source || "—";
    const occasion = lead.occasion || "—";
    const eventDate = lead.event_date || "";
    const guests = lead.guests ?? "";
    const location = lead.location || "—";
    const status = lead.status || "new";
    const comment = safeValue(lead.internal_notes).trim();
    const ai = getAILeadAnalysis(lead);

    return `
        <tr data-lead-id="${escapeHTML(id)}" class="crm-lead-row">
            <td class="customer-cell customer-command-cell">
                <div class="customer-command">
                    <div class="customer-avatar">${escapeHTML(getCustomerInitials(customerName))}</div>
                    <div class="customer-command-copy">
                        <strong class="customer-command-name">${escapeHTML(customerName)}</strong>
                        <div class="customer-command-contact">
                            <span>☎ ${escapeHTML(phone)}</span>
                            <span class="customer-contact-separator">•</span>
                            <span class="customer-email-inline">
                                ${createInlineField(lead,"email",email,"text")}
                            </span>
                        </div>
                        <div class="customer-source-row">${createSourceField(lead,source)}</div>
                    </div>
                </div>
            </td>

            <td class="event-command-cell">
                <div class="event-command-title">${createInlineField(lead,"occasion",occasion,"select",getEventOptions())}</div>
                <div class="event-command-meta">
                    <span class="event-date-inline">📅 ${createInlineField(lead,"event_date",eventDate ? formatDate(eventDate) : "Date not set","date",null,eventDate)}</span>
                    <span class="guest-inline">👥 ${createInlineField(lead,"guests",guests === "" ? "Guests —" : `${guests} guests`,"number")}</span>
                </div>
            </td>

            <td class="location-command-cell">
                <span class="location-pin">⌖</span>
                ${createInlineField(lead,"location",location,"text")}
            </td>

            <td class="status-command-cell">${createStatusInlineField(lead,status)}</td>

            <td class="venue-progress-command-cell">${getLeadVenueProgressSummary(id)}</td>

            <td class="created-command-cell">
                <span class="created-label">CREATED</span>
                <strong>${escapeHTML(createdDate)}</strong>
            </td>

            <td class="action-column">
                <div class="row-action-stack">
                    <button type="button" class="view-lead-btn" data-action="view" data-id="${escapeHTML(id)}" title="${escapeHTML(ai.recommendation)}">
                        <span class="view-icon">◉</span><span>Open</span>
                    </button>
                    <button type="button" class="venue-assign-btn" data-action="assign-venue" data-id="${escapeHTML(id)}" title="Assign this enquiry to approved and verified venues">
                        <span>🏨</span><span>Assign</span>${getAssignmentCount(id) ? `<span class="venue-assignment-count">${getAssignmentCount(id)}</span>` : ""}
                    </button>
                    <div class="row-comment-actions">${createCommentCell(lead,comment)}</div>
                </div>
            </td>
        </tr>`;
}

/* =========================================================
   RENDER TABLE
   ========================================================= */

function renderLeads() {

    const resultCount = document.getElementById("leadResultCount");
    if (resultCount) {
        const shown = filteredLeads.length;
        const total = allLeads.length;
        resultCount.textContent = shown === total
            ? `${total} live ${total === 1 ? "enquiry" : "enquiries"}`
            : `${shown} of ${total} enquiries`;
    }

    const tbody =
        document.getElementById(
            "leadsTableBody"
        );

    if (!tbody) {
        return;
    }

    if (!filteredLeads.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="crm-empty-inline">
                        <div>⌕</div>
                        <strong>
                            No enquiries found
                        </strong>
                        <span>
                            Try changing your search or filter.
                        </span>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        filteredLeads
            .map(createLeadRow)
            .join("");
}

/* =========================================================
   INLINE EDIT
   ========================================================= */

function startInlineEdit(element) {

    if (!element) {
        return;
    }

    if (
        element.classList.contains(
            "editing"
        )
    ) {
        return;
    }

    const field =
        element.dataset.inlineField;

    const leadId =
        element.dataset.leadId;

    const lead =
        allLeads.find(
            item =>
                String(item.id) ===
                String(leadId)
        );

    if (!lead) {
        return;
    }

    const originalValue =
        lead[field] ?? "";

    const display =
        element.querySelector(
            ".inline-display"
        );

    if (!display) {
        return;
    }

    element.classList.add(
        "editing"
    );

    let editor;

    if (field === "occasion") {

        editor =
            createSelectEditor(
                getEventOptions(),
                originalValue
            );
    }

    else if (field === "source") {

        editor =
            createSelectEditor(
                getSourceOptions(),
                originalValue
            );
    }

    else if (field === "status") {

        editor =
            createSelectEditor(
                getStatusOptions(),
                originalValue || "new"
            );
    }

    else {

        editor =
            document.createElement(
                "input"
            );

        editor.type =
            field === "event_date"
                ? "date"
                : field === "guests"
                    ? "number"
                    : "text";

        editor.value =
            safeValue(
                originalValue
            );

        editor.className =
            "crm-inline-editor";
    }

    editor.style.width =
        "100%";

    editor.style.maxWidth =
        "100%";

    editor.style.boxSizing =
        "border-box";

    editor.style.height =
        "34px";

    display.replaceWith(
        editor
    );

    editor.focus();

    let finished = false;

    async function finish(
        save = true
    ) {

        if (finished) {
            return;
        }

        finished = true;

        const newValue =
            editor.value;

        if (
            save &&
            String(newValue) !==
            String(originalValue)
        ) {

            await saveInlineField(
                leadId,
                field,
                newValue
            );

            return;
        }

        restoreInlineDisplay(
            element,
            lead,
            field
        );
    }

    if (
        editor.tagName ===
        "SELECT"
    ) {

        editor.addEventListener(
            "change",
            () => finish(true)
        );

        editor.addEventListener(
            "blur",
            () => {
                setTimeout(
                    () => finish(true),
                    120
                );
            }
        );

    }
    else {

        editor.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    finish(true);
                }

                if (
                    event.key ===
                    "Escape"
                ) {

                    event.preventDefault();

                    finish(false);
                }
            }
        );

        editor.addEventListener(
            "blur",
            () => finish(true)
        );
    }
}

/* =========================================================
   SAVE INLINE FIELD
   ========================================================= */

async function saveInlineField(
    leadId,
    field,
    newValue
) {

    const client =
        getSupabaseClient();

    if (!client) {
        return;
    }

    const lead =
        allLeads.find(
            item =>
                String(item.id) ===
                String(leadId)
        );

    if (!lead) {
        return;
    }

    const oldValue =
        lead[field];

    let value =
        safeValue(newValue).trim();

    if (
        field === "guests"
    ) {

        value =
            value
                ? Number(value)
                : null;
    }

    if (
        field === "event_date"
    ) {

        value =
            value || null;
    }

    if (
        field === "source" &&
        !value
    ) {
        value = null;
    }

    try {

        const {
            data,
            error
        } =
            await client
                .from(
                    "customer_enquiries"
                )
                .update({
                    [field]: value
                })
                .eq(
                    "id",
                    leadId
                )
                .select("*")
                .single();

        if (error) {
            throw error;
        }

        Object.assign(
            lead,
            data || {
                [field]: value
            }
        );

        refreshLeadRow(
            leadId
        );

        updateStats();

        if (
            currentLead &&
            String(currentLead.id) ===
            String(leadId)
        ) {

            currentLead =
                lead;

            populateLeadModal(
                currentLead
            );
        }

        showToast(
            "Saved successfully."
        );

    }
    catch (error) {

        console.error(
            "Inline save error:",
            error
        );

        lead[field] =
            oldValue;

        refreshLeadRow(
            leadId
        );

        showToast(
            "Unable to save change.",
            "error"
        );
    }
}

/* =========================================================
   RESTORE INLINE DISPLAY
   ========================================================= */

function restoreInlineDisplay(
    element,
    lead,
    field
) {

    if (!element) {
        return;
    }

    const editor =
        element.querySelector(
            ".crm-inline-editor"
        );

    if (!editor) {
        return;
    }

    let value =
        lead[field];

    if (
        field === "status"
    ) {

        const display =
            document.createElement(
                "span"
            );

        display.className =
            "inline-display";

        display.innerHTML =
            createStatusBadge(
                value || "new"
            );

        editor.replaceWith(
            display
        );

        element.classList.remove(
            "editing"
        );

        return;
    }

    if (
        field === "event_date"
    ) {

        value =
            value
                ? formatDate(value)
                : "—";
    }

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        value = "—";
    }

    const display =
        document.createElement(
            "span"
        );

    display.className =
        "inline-display";

    display.textContent =
        value;

    editor.replaceWith(
        display
    );

    element.classList.remove(
        "editing"
    );
}

/* =========================================================
   REFRESH ONE ROW
   ========================================================= */

function refreshLeadRow(
    leadId
) {

    const lead =
        allLeads.find(
            item =>
                String(item.id) ===
                String(leadId)
        );

    if (!lead) {
        return;
    }

    const row =
        document.querySelector(
            `tr[data-lead-id="${CSS.escape(
                String(leadId)
            )}"]`
        );

    if (!row) {

        renderLeads();

        return;
    }

    const temp =
        document.createElement(
            "tbody"
        );

    temp.innerHTML =
        createLeadRow(
            lead
        );

    const newRow =
        temp.firstElementChild;

    if (newRow) {

        row.replaceWith(
            newRow
        );
    }
}

/* =========================================================
   COMMENT EDIT
   ========================================================= */

function editLeadComment(
    leadId
) {

    const lead =
        allLeads.find(
            item =>
                String(item.id) ===
                String(leadId)
        );

    if (!lead) {
        return;
    }

    const comment =
        safeValue(
            lead.internal_notes
        );

    openCommentEditor(
        leadId,
        comment,
        lead.customer_name
    );
}

/* =========================================================
   PREMIUM COMMENT EDITOR
   ========================================================= */

function openCommentEditor(
    leadId,
    comment,
    customerName
) {

    closeFloatingOverlay();

    const overlay =
        document.createElement(
            "div"
        );

    overlay.id =
        "commentEditorOverlay";

    overlay.className =
        "crm-floating-overlay";

    overlay.innerHTML = `
        <div
            class="crm-floating-card"
            style="
                width:min(560px,100%);
                background:#fff;
                border-radius:20px;
                padding:24px;
                box-shadow:
                    0 24px 80px rgba(0,70,60,.20);
            "
        >

            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:12px;
                    margin-bottom:18px;
                "
            >

                <div>

                    <div
                        style="
                            font-size:10px;
                            font-weight:800;
                            letter-spacing:.12em;
                            color:#07816e;
                        "
                    >
                        CRM COMMENT
                    </div>

                    <h3
                        style="
                            margin:5px 0 0;
                            color:#123f3a;
                        "
                    >
                        ${escapeHTML(
                            customerName ||
                            "Customer"
                        )}
                    </h3>

                </div>

                <button
                    type="button"
                    id="closeCommentEditor"
                    style="
                        border:0;
                        background:#effaf7;
                        color:#087f6c;
                        width:34px;
                        height:34px;
                        border-radius:50%;
                        font-size:20px;
                        cursor:pointer;
                    "
                >
                    ×
                </button>

            </div>

            <textarea
                id="crmCommentEditor"
                rows="6"
                style="
                    width:100%;
                    box-sizing:border-box;
                    border:1px solid #cfe7e1;
                    border-radius:14px;
                    padding:14px;
                    resize:vertical;
                    font:inherit;
                    outline:none;
                "
                placeholder="Add internal comment..."
            >${escapeHTML(comment)}</textarea>

            <div
                style="
                    display:flex;
                    justify-content:flex-end;
                    gap:10px;
                    margin-top:15px;
                "
            >

                <button
                    type="button"
                    id="cancelCommentEditor"
                    style="
                        border:1px solid #d4e8e3;
                        background:#fff;
                        color:#12695d;
                        padding:10px 16px;
                        border-radius:10px;
                        cursor:pointer;
                        font-weight:700;
                    "
                >
                    Cancel
                </button>

                <button
                    type="button"
                    id="saveCommentEditor"
                    style="
                        border:0;
                        background:#087f6c;
                        color:#fff;
                        padding:10px 18px;
                        border-radius:10px;
                        cursor:pointer;
                        font-weight:800;
                    "
                >
                    Save Comment
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(
        overlay
    );

    const close =
        () => overlay.remove();

    document
        .getElementById(
            "closeCommentEditor"
        )
        ?.addEventListener(
            "click",
            close
        );

    document
        .getElementById(
            "cancelCommentEditor"
        )
        ?.addEventListener(
            "click",
            close
        );

    document
        .getElementById(
            "saveCommentEditor"
        )
        ?.addEventListener(
            "click",
            async () => {

                const textarea =
                    document.getElementById(
                        "crmCommentEditor"
                    );

                const button =
                    document.getElementById(
                        "saveCommentEditor"
                    );

                if (button) {
                    button.disabled = true;
                    button.textContent =
                        "Saving...";
                }

                const success =
                    await saveComment(
                        leadId,
                        textarea?.value || ""
                    );

                if (success) {
                    close();
                }

                if (button) {
                    button.disabled = false;
                    button.textContent =
                        "Save Comment";
                }
            }
        );

    setTimeout(
        () => {
            document
                .getElementById(
                    "crmCommentEditor"
                )
                ?.focus();
        },
        50
    );
}

/* =========================================================
   VIEW COMMENT
   ========================================================= */

function viewLeadComment(
    leadId
) {

    const lead =
        allLeads.find(
            item =>
                String(item.id) ===
                String(leadId)
        );

    if (!lead) {
        return;
    }

    const comment =
        safeValue(
            lead.internal_notes
        ).trim();

    if (!comment) {
        showToast(
            "No comment available.",
            "warning"
        );
        return;
    }

    closeFloatingOverlay();

    const overlay =
        document.createElement(
            "div"
        );

    overlay.id =
        "commentViewOverlay";

    overlay.className =
        "crm-floating-overlay";

    overlay.innerHTML = `
        <div
            class="crm-floating-card"
            style="
                width:min(520px,100%);
                background:#fff;
                border-radius:20px;
                padding:24px;
                box-shadow:
                    0 24px 80px rgba(0,70,60,.20);
            "
        >

            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:12px;
                    margin-bottom:16px;
                "
            >

                <div>

                    <div
                        style="
                            font-size:10px;
                            font-weight:800;
                            letter-spacing:.12em;
                            color:#07816e;
                        "
                    >
                        INTERNAL COMMENT
                    </div>

                    <h3
                        style="
                            margin:5px 0 0;
                            color:#123f3a;
                        "
                    >
                        ${escapeHTML(
                            lead.customer_name ||
                            "Customer"
                        )}
                    </h3>

                </div>

                <button
                    type="button"
                    id="closeCommentViewer"
                    style="
                        border:0;
                        background:#effaf7;
                        color:#087f6c;
                        width:34px;
                        height:34px;
                        border-radius:50%;
                        font-size:20px;
                        cursor:pointer;
                    "
                >
                    ×
                </button>

            </div>

            <div
                style="
                    padding:16px;
                    border-radius:14px;
                    background:#f4faf8;
                    border:1px solid #d8eee8;
                    color:#263c38;
                    line-height:1.65;
                    white-space:pre-wrap;
                    word-break:break-word;
                "
            >
                ${escapeHTML(comment)}
            </div>

        </div>
    `;

    document.body.appendChild(
        overlay
    );

    const close =
        () => overlay.remove();

    document
        .getElementById(
            "closeCommentViewer"
        )
        ?.addEventListener(
            "click",
            close
        );

    overlay.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                overlay
            ) {
                close();
            }
        }
    );
}

function closeFloatingOverlay() {

    [
        "commentViewOverlay",
        "commentEditorOverlay"
    ].forEach(
        id => {
            document
                .getElementById(id)
                ?.remove();
        }
    );
}

/* =========================================================
   SAVE COMMENT
   ========================================================= */

async function saveComment(
    leadId,
    comment
) {

    const client =
        getSupabaseClient();

    if (!client) {
        return false;
    }

    const lead =
        allLeads.find(
            item =>
                String(item.id) ===
                String(leadId)
        );

    if (!lead) {
        return false;
    }

    const value =
        safeValue(comment).trim();

    try {

        const {
            data,
            error
        } =
            await client
                .from(
                    "customer_enquiries"
                )
                .update({
                    internal_notes:
                        value || null
                })
                .eq(
                    "id",
                    leadId
                )
                .select("*")
                .single();

        if (error) {
            throw error;
        }

        Object.assign(
            lead,
            data || {
                internal_notes:
                    value || null
            }
        );

        refreshLeadRow(
            leadId
        );

        if (
            currentLead &&
            String(currentLead.id) ===
            String(leadId)
        ) {
            currentLead =
                lead;
        }

        showToast(
            "Comment saved successfully."
        );

        return true;

    }
    catch (error) {

        console.error(
            "Comment save error:",
            error
        );

        showToast(
            "Unable to save comment.",
            "error"
        );

        return false;
    }
}

/* =========================================================
   AI-STYLE LEAD ANALYSIS
   LOCAL ONLY
   ========================================================= */

function getAILeadAnalysis(
    lead
) {

    let score = 35;

    const status =
        safeValue(
            lead.status || "new"
        ).toLowerCase();

    const guests =
        Number(
            lead.guests || 0
        );

    const event =
        safeValue(
            lead.occasion
        ).toLowerCase();

    const location =
        safeValue(
            lead.location
        ).trim();

    const hasPhone =
        !!safeValue(
            lead.mobile
        ).trim();

    const hasEmail =
        !!safeValue(
            lead.email
        ).trim();

    const hasDate =
        !!safeValue(
            lead.event_date
        ).trim();

    const hasComment =
        !!safeValue(
            lead.internal_notes
        ).trim();

    if (hasPhone) score += 10;
    if (hasEmail) score += 5;
    if (hasDate) score += 10;
    if (location) score += 8;
    if (guests >= 100) score += 8;
    if (guests >= 300) score += 7;
    if (hasComment) score += 4;

    const highIntentStatuses = [
        "interested",
        "qualified",
        "site-visit",
        "negotiation",
        "booked"
    ];

    const mediumIntentStatuses = [
        "contacted",
        "follow-up",
        "detail-shared"
    ];

    if (
        highIntentStatuses.includes(status)
    ) {
        score += 18;
    }

    if (
        mediumIntentStatuses.includes(status)
    ) {
        score += 8;
    }

    if (
        status === "not-interested" ||
        status === "lost"
    ) {
        score -= 25;
    }

    if (
        event.includes("wedding") ||
        event.includes("corporate")
    ) {
        score += 5;
    }

    score =
        Math.max(
            0,
            Math.min(
                100,
                score
            )
        );

    let level =
        "Low";

    if (score >= 75) {
        level = "High";
    }
    else if (score >= 55) {
        level = "Medium";
    }

    let recommendation =
        "Complete the customer profile and make first contact.";

    if (
        status === "new"
    ) {
        recommendation =
            "Contact this enquiry and understand the customer's exact venue requirement.";
    }
    else if (
        status === "contacted"
    ) {
        recommendation =
            "Schedule a follow-up and confirm venue preferences.";
    }
    else if (
        status === "follow-up"
    ) {
        recommendation =
            "Follow up with the customer and move the lead toward qualification.";
    }
    else if (
        status === "detail-shared"
    ) {
        recommendation =
            "Check customer response to the shared venue details.";
    }
    else if (
        status === "interested"
    ) {
        recommendation =
            "Prioritize this lead and move toward qualification or site visit.";
    }
    else if (
        status === "qualified"
    ) {
        recommendation =
            "Strong opportunity — arrange suitable venue options or a site visit.";
    }
    else if (
        status === "site-visit"
    ) {
        recommendation =
            "Confirm site-visit outcome and move toward negotiation.";
    }
    else if (
        status === "negotiation"
    ) {
        recommendation =
            "High-intent lead — focus on closing requirements and booking.";
    }
    else if (
        status === "booked" ||
        status === "converted"
    ) {
        recommendation =
            "Conversion achieved — maintain customer relationship and record final details.";
    }
    else if (
        status === "closed"
    ) {
        recommendation =
            "Lead is closed. Keep the enquiry history for future reference.";
    }
    else if (
        status === "lost" ||
        status === "not-interested"
    ) {
        recommendation =
            "Low immediate opportunity. Keep the record for future reference.";
    }

    return {
        score,
        level,
        recommendation
    };
}

/* =========================================================
   PREMIUM VIEW DETAILS
   ========================================================= */

function openLeadModal(
    leadId
) {

    const lead =
        allLeads.find(
            item =>
                String(item.id) ===
                String(leadId)
        );

    if (!lead) {

        showToast(
            "Enquiry not found.",
            "error"
        );

        return;
    }

    currentLead =
        lead;

    const modal =
        document.getElementById(
            "leadModal"
        );

    if (!modal) {

        showToast(
            "Lead details panel not found.",
            "error"
        );

        return;
    }

    populateLeadModal(
        lead
    );

    modal.hidden =
        false;

    document.body.style.overflow =
        "hidden";

    applyPremiumModalEnhancement(
        modal,
        lead
    );
}

/* =========================================================
   PREMIUM MODAL ENHANCEMENT
   ========================================================= */

function applyPremiumModalEnhancement(
    modal,
    lead
) {

    const ai =
        getAILeadAnalysis(
            lead
        );

    const existing =
        modal.querySelector(
            "#crmAIInsight"
        );

    if (existing) {
        existing.remove();
    }

    const panel =
        document.createElement(
            "div"
        );

    panel.id =
        "crmAIInsight";

    panel.style.cssText = `
        margin:18px 0 4px;
        padding:15px 17px;
        border:1px solid #cfe9e3;
        border-radius:15px;
        background:
            linear-gradient(
                135deg,
                #f4fffc,
                #eefaf7
            );
        box-shadow:
            0 8px 24px rgba(0,100,85,.06);
    `;

    panel.innerHTML = `
        <div
            style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:12px;
                margin-bottom:8px;
            "
        >

            <div
                style="
                    font-size:10px;
                    letter-spacing:.12em;
                    font-weight:900;
                    color:#087f6c;
                "
            >
                ✦ SMART LEAD INSIGHT
            </div>

            <div
                style="
                    display:flex;
                    align-items:center;
                    gap:7px;
                    font-size:12px;
                    font-weight:800;
                    color:#155e54;
                "
            >
                <span>
                    ${ai.level} Intent
                </span>

                <strong
                    style="
                        padding:4px 8px;
                        border-radius:999px;
                        background:#087f6c;
                        color:#fff;
                        font-size:11px;
                    "
                >
                    ${ai.score}/100
                </strong>
            </div>

        </div>

        <div
            style="
                font-size:13px;
                line-height:1.55;
                color:#31514c;
            "
        >
            ${escapeHTML(
                ai.recommendation
            )}
        </div>
    `;

    const messageField =
        modal.querySelector(
            "#detailMessage"
        );

    if (
        messageField &&
        messageField.parentElement
    ) {

        messageField
            .parentElement
            .after(panel);

    }
    else {

        modal
            .querySelector(
                ".modal-content"
            )
            ?.appendChild(panel);
    }
}

/* =========================================================
   POPULATE MODAL
   ========================================================= */

function populateLeadModal(
    lead
) {

    setText(
        "#detailCustomerName",
        lead.customer_name ||
        "—"
    );

    setText(
        "#detailPhone",
        lead.mobile ||
        "—"
    );

    setControl(
        "#detailEmail",
        lead.email ||
        ""
    );

    setControl(
        "#detailSource",
        lead.source ||
        ""
    );

    setControl(
        "#detailEventType",
        lead.occasion ||
        ""
    );

    setControl(
        "#detailVenue",
        lead.location ||
        ""
    );

    setControl(
        "#detailEventDate",
        lead.event_date ||
        ""
    );

    setControl(
        "#detailGuests",
        lead.guests ??
        ""
    );

    setControl(
        "#detailStatus",
        lead.status ||
        "new"
    );

    setControl(
        "#detailFollowUp",
        convertDateTimeLocal(
            lead.follow_up_at
        )
    );

    setControl(
        "#detailAssignedTo",
        lead.assigned_to ||
        ""
    );

    setControl(
        "#detailMessage",
        lead.requirements ||
        ""
    );

    setControl(
        "#detailRemarks",
        lead.internal_notes ||
        ""
    );

    ensureSourceSelect(
        "#detailSource",
        lead.source
    );

    ensureStatusSelect(
        "#detailStatus",
        lead.status
    );

    ensureEventSelect(
        "#detailEventType",
        lead.occasion
    );

    renderLeadVenueAssignments(lead.id);
}

/* =========================================================
   DYNAMIC MODAL SOURCE SELECT
   ========================================================= */

function ensureSourceSelect(
    selector,
    currentValue
) {

    const element =
        document.querySelector(
            selector
        );

    if (!element) {
        return;
    }

    if (
        element.tagName !==
        "SELECT"
    ) {
        return;
    }

    const options =
        getSourceOptions();

    const current =
        safeValue(currentValue);

    element.innerHTML =
        options
            .map(
                option => `
                    <option
                        value="${escapeHTML(
                            option.value
                        )}"
                    >
                        ${escapeHTML(
                            option.label
                        )}
                    </option>
                `
            )
            .join("");

    element.value =
        current;
}

/* =========================================================
   DYNAMIC STATUS SELECT
   ========================================================= */

function ensureStatusSelect(
    selector,
    currentValue
) {

    const element =
        document.querySelector(
            selector
        );

    if (
        !element ||
        element.tagName !== "SELECT"
    ) {
        return;
    }

    const current =
        safeValue(
            currentValue || "new"
        );

    element.innerHTML =
        getStatusOptions()
            .map(
                option => `
                    <option
                        value="${escapeHTML(
                            option.value
                        )}"
                    >
                        ${escapeHTML(
                            option.label
                        )}
                    </option>
                `
            )
            .join("");

    element.value =
        current;
}

/* =========================================================
   DYNAMIC EVENT SELECT
   ========================================================= */

function ensureEventSelect(
    selector,
    currentValue
) {

    const element =
        document.querySelector(
            selector
        );

    if (
        !element ||
        element.tagName !== "SELECT"
    ) {
        return;
    }

    const current =
        safeValue(currentValue);

    element.innerHTML =
        getEventOptions()
            .map(
                option => `
                    <option
                        value="${escapeHTML(
                            option.value
                        )}"
                    >
                        ${escapeHTML(
                            option.label
                        )}
                    </option>
                `
            )
            .join("");

    element.value =
        current;
}

/* =========================================================
   TEXT HELPER
   ========================================================= */

function setText(
    selector,
    value
) {

    const element =
        document.querySelector(
            selector
        );

    if (!element) {
        return;
    }

    element.textContent =
        safeValue(value) ||
        "—";
}

/* =========================================================
   CONTROL HELPER
   ========================================================= */

function setControl(
    selector,
    value
) {

    const element =
        document.querySelector(
            selector
        );

    if (!element) {
        return;
    }

    element.value =
        safeValue(value);
}

/* =========================================================
   DATE/TIME
   ========================================================= */

function convertDateTimeLocal(
    value
) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }

    const pad =
        number =>
            String(number)
                .padStart(
                    2,
                    "0"
                );

    return (
        date.getFullYear() +
        "-" +
        pad(
            date.getMonth() + 1
        ) +
        "-" +
        pad(
            date.getDate()
        ) +
        "T" +
        pad(
            date.getHours()
        ) +
        ":" +
        pad(
            date.getMinutes()
        )
    );
}

/* =========================================================
   SAVE MODAL
   ========================================================= */

async function saveModalChanges() {

    if (!currentLead) {
        return;
    }

    const client =
        getSupabaseClient();

    if (!client) {
        return;
    }

    const leadId =
        currentLead.id;

    const data = {};

    const email =
        $("#detailEmail");

    const source =
        $("#detailSource");

    const eventType =
        $("#detailEventType");

    const venue =
        $("#detailVenue");

    const eventDate =
        $("#detailEventDate");

    const guests =
        $("#detailGuests");

    const status =
        $("#detailStatus");

    const followUp =
        $("#detailFollowUp");

    const assigned =
        $("#detailAssignedTo");

    const message =
        $("#detailMessage");

    const remarks =
        $("#detailRemarks");

    if (email) {
        data.email =
            email.value.trim() ||
            null;
    }

    if (source) {
        data.source =
            source.value.trim() ||
            null;
    }

    if (eventType) {
        data.occasion =
            eventType.value.trim() ||
            null;
    }

    if (venue) {
        data.location =
            venue.value.trim() ||
            null;
    }

    if (eventDate) {
        data.event_date =
            eventDate.value ||
            null;
    }

    if (guests) {

        data.guests =
            guests.value
                ? Number(
                    guests.value
                )
                : null;
    }

    if (status) {

        data.status =
            status.value ||
            "new";
    }

    if (followUp) {

        data.follow_up_at =
            followUp.value
                ? new Date(
                    followUp.value
                ).toISOString()
                : null;
    }

    if (assigned) {

        const assignedValue =
            assigned.value.trim();

        if (
            assignedValue &&
            isUUID(assignedValue)
        ) {
            data.assigned_to =
                assignedValue;
        }
        else {
            data.assigned_to =
                null;
        }
    }

    if (message) {

        data.requirements =
            message.value.trim() ||
            null;
    }

    if (remarks) {

        data.internal_notes =
            remarks.value.trim() ||
            null;
    }

    try {

        const {
            data: updated,
            error
        } =
            await client
                .from(
                    "customer_enquiries"
                )
                .update(data)
                .eq(
                    "id",
                    leadId
                )
                .select("*")
                .single();

        if (error) {
            throw error;
        }

        Object.assign(
            currentLead,
            updated || data
        );

        const index =
            allLeads.findIndex(
                item =>
                    String(item.id) ===
                    String(leadId)
            );

        if (index >= 0) {

            allLeads[index] =
                currentLead;
        }

        applyFilters();
        updateStats();

        closeLeadModal();

        showToast(
            "Enquiry updated successfully."
        );

    }
    catch (error) {

        console.error(
            "Modal save error:",
            error
        );

        showToast(
            error.message ||
            "Unable to save enquiry.",
            "error"
        );
    }
}

/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeLeadModal() {

    const modal =
        document.getElementById(
            "leadModal"
        );

    if (!modal) {
        return;
    }

    modal.hidden =
        true;

    document.body.style.overflow =
        "";

    currentLead =
        null;
}

/* =========================================================
   CANCEL VIEW / EDIT LEAD MODAL
   ========================================================= */

function setupLeadModalCancel() {

    const button =
        document.getElementById(
            "cancelLeadEdit"
        );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        event => {
            event.preventDefault();
            closeLeadModal();
        }
    );
}

/* =========================================================
   ADD ENQUIRY MODAL
   ========================================================= */

function openAddEnquiryModal() {

    const modal =
        document.getElementById(
            "addEnquiryModal"
        );

    if (!modal) {
        return;
    }

    const source =
        document.getElementById(
            "addSource"
        ) ||
        document.querySelector(
            "#addEnquiryForm select[name='source']"
        );

    if (source) {

        source.innerHTML =
            getSourceOptions()
                .map(
                    option => `
                        <option
                            value="${escapeHTML(
                                option.value
                            )}"
                        >
                            ${escapeHTML(
                                option.label
                            )}
                        </option>
                    `
                )
                .join("");
    }

    const status =
        document.getElementById(
            "addStatus"
        ) ||
        document.querySelector(
            "#addEnquiryForm select[name='status']"
        );

    if (status) {

        status.innerHTML =
            getStatusOptions()
                .map(
                    option => `
                        <option
                            value="${escapeHTML(
                                option.value
                            )}"
                        >
                            ${escapeHTML(
                                option.label
                            )}
                        </option>
                    `
                )
                .join("");
    }

    modal.hidden =
        false;

    document.body.style.overflow =
        "hidden";
}

function closeAddEnquiryModal() {

    const modal =
        document.getElementById(
            "addEnquiryModal"
        );

    if (!modal) {
        return;
    }

    modal.hidden =
        true;

    document.body.style.overflow =
        "";
}

/* =========================================================
   ADD ENQUIRY
   ========================================================= */

async function submitAddEnquiry(
    event
) {

    event.preventDefault();

    const form =
        event.currentTarget;

    const client =
        getSupabaseClient();

    if (!client) {
        return;
    }

    const get =
        name => {

            const element =
                form.querySelector(
                    `[name="${name}"]`
                ) ||
                form.querySelector(
                    `#${name}`
                );

            return element
                ? element.value.trim()
                : "";
        };

    const data = {

        customer_name:
            get("customer_name") ||
            get("customerName") ||
            null,

        mobile:
            get("mobile") ||
            get("phone") ||
            null,

        email:
            get("email") ||
            null,

        source:
            get("source") ||
            "Website",

        occasion:
            get("occasion") ||
            get("eventType") ||
            null,

        location:
            get("location") ||
            get("venue") ||
            null,

        event_date:
            get("event_date") ||
            get("eventDate") ||
            null,

        guests:
            get("guests")
                ? Number(
                    get("guests")
                )
                : null,

        status:
            get("status") ||
            "new",

        follow_up_at:
            get("follow_up_at") ||
            get("followUp")
                ? new Date(
                    get("follow_up_at") ||
                    get("followUp")
                ).toISOString()
                : null,

        assigned_to:
            get("assigned_to") ||
            get("assignedTo") ||
            null,

        requirements:
            get("requirements") ||
            get("message") ||
            null,

        internal_notes:
            get("internal_notes") ||
            get("comment") ||
            null
    };

    if (
        data.assigned_to &&
        !isUUID(
            data.assigned_to
        )
    ) {
        data.assigned_to =
            null;
    }

    if (!data.customer_name) {

        showToast(
            "Please enter customer name.",
            "warning"
        );

        return;
    }

    try {

        const {
            data: created,
            error
        } =
            await client
                .from(
                    "customer_enquiries"
                )
                .insert([
                    data
                ])
                .select("*")
                .single();

        if (error) {
            throw error;
        }

        if (created) {

            allLeads.unshift(
                created
            );
        }

        applyFilters();
        updateStats();

        closeAddEnquiryModal();

        form.reset();

        showToast(
            "Customer enquiry added successfully."
        );

    }
    catch (error) {

        console.error(
            "Create enquiry error:",
            error
        );

        showToast(
            error.message ||
            "Unable to add enquiry.",
            "error"
        );
    }
}

/* =========================================================
   STATS
   ========================================================= */

function updateStats() {

    const total =
        allLeads.length;

    const newCount =
        allLeads.filter(
            lead =>
                String(
                    lead.status ||
                    "new"
                ).toLowerCase() ===
                "new"
        ).length;

    const contactedCount =
        allLeads.filter(
            lead =>
                String(
                    lead.status ||
                    ""
                ).toLowerCase() ===
                "contacted"
        ).length;

    const closedCount =
        allLeads.filter(
            lead => {

                const status =
                    String(
                        lead.status ||
                        ""
                    ).toLowerCase();

                return (
                    status === "closed" ||
                    status === "converted" ||
                    status === "booked"
                );
            }
        ).length;

    setStat(
        "#totalCount",
        total
    );

    setStat(
        "#newCount",
        newCount
    );

    setStat(
        "#contactedCount",
        contactedCount
    );

    setStat(
        "#closedCount",
        closedCount
    );
}

function setStat(
    selector,
    value
) {

    const element =
        document.querySelector(
            selector
        );

    if (element) {
        element.textContent =
            value;
    }
}

/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {

    const input =
        document.getElementById(
            "searchInput"
        );

    if (!input) {
        return;
    }

    input.addEventListener(
        "input",
        event => {

            currentSearch =
                event.target.value;

            applyFilters();
        }
    );
}

/* =========================================================
   STATUS FILTER
   ========================================================= */

function setupFilters() {

    const status =
        document.getElementById(
            "statusFilter"
        );

    if (!status) {
        return;
    }

    status.innerHTML = `
        <option value="all">
            All Status
        </option>
        ${getStatusOptions()
            .map(
                option => `
                    <option
                        value="${escapeHTML(
                            option.value
                        )}"
                    >
                        ${escapeHTML(
                            option.label
                        )}
                    </option>
                `
            )
            .join("")}
    `;

    status.addEventListener(
        "change",
        () => {

            currentStatusFilter =
                status.value ||
                "all";

            applyFilters();
        }
    );
}

/* =========================================================
   STAT CARD FILTERS
   ========================================================= */

function setupStatFilters() {

    const cards =
        document.querySelectorAll(
            ".stat-card"
        );

    cards.forEach(
        card => {

            card.addEventListener(
                "click",
                () => {

                    cards.forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );

                    card.classList.add(
                        "active"
                    );

                    const filter =
                        card.dataset.statusFilter;

                    currentStatusFilter =
                        filter ||
                        "all";

                    const status =
                        document.getElementById(
                            "statusFilter"
                        );

                    if (status) {
                        status.value =
                            currentStatusFilter;
                    }

                    applyFilters();
                }
            );
        }
    );
}

/* =========================================================
   REFRESH
   ========================================================= */

function setupRefresh() {

    const button =
        document.getElementById(
            "refreshBtn"
        );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        async () => {

            button.disabled =
                true;

            const original =
                button.innerHTML;

            button.innerHTML =
                "Refreshing...";

            await loadEnquiries();

            button.disabled =
                false;

            button.innerHTML =
                original;
        }
    );
}

/* =========================================================
   ADD BUTTON
   ========================================================= */

function setupAddButton() {

    const button =
        document.getElementById(
            "addEnquiryBtn"
        );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        openAddEnquiryModal
    );
}

/* =========================================================
   GLOBAL CLICKS
   ========================================================= */

function setupGlobalClicks() {

    document.addEventListener(
        "click",
        event => {

            const commentAction =
                event.target.closest(
                    "[data-comment-action]"
                );

            if (commentAction) {

                const action =
                    commentAction.dataset
                        .commentAction;

                const id =
                    commentAction.dataset.id;

                if (
                    action === "edit"
                ) {

                    editLeadComment(
                        id
                    );

                }
                else if (
                    action === "view"
                ) {

                    viewLeadComment(
                        id
                    );
                }

                return;
            }

            const assignVenue =
                event.target.closest(
                    "[data-action='assign-venue']"
                );

            if (assignVenue) {

                openVenueAssignmentModal(
                    assignVenue.dataset.id
                );

                return;
            }

            const view =
                event.target.closest(
                    "[data-action='view']"
                );

            if (view) {

                openLeadModal(
                    view.dataset.id
                );

                return;
            }

            const inline =
                event.target.closest(
                    ".crm-inline-field"
                );

            if (
                inline &&
                !inline.classList.contains(
                    "editing"
                )
            ) {

                startInlineEdit(
                    inline
                );

                return;
            }

            const close =
                event.target.closest(
                    ".close-modal"
                );

            if (close) {

                if (
                    close.closest(
                        "#leadModal"
                    )
                ) {

                    closeLeadModal();
                    return;
                }

                if (
                    close.closest(
                        "#addEnquiryModal"
                    )
                ) {

                    closeAddEnquiryModal();
                    return;
                }
            }

            if (
                event.target ===
                document.getElementById(
                    "leadModal"
                )
            ) {

                closeLeadModal();
            }

            if (
                event.target ===
                document.getElementById(
                    "addEnquiryModal"
                )
            ) {

                closeAddEnquiryModal();
            }
        }
    );
}

/* =========================================================
   MODAL SAVE BUTTON
   ========================================================= */

function setupModalSave() {

    const button =
        document.querySelector(
            "#saveLeadBtn"
        ) ||
        document.querySelector(
            "[data-save-lead]"
        ) ||
        document.querySelector(
            "#leadModal button[type='submit']"
        );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        event => {

            if (
                button.type !==
                "submit"
            ) {
                event.preventDefault();
            }

            saveModalChanges();
        }
    );
}

/* =========================================================
   ADD FORM
   ========================================================= */

function setupAddForm() {

    const form =
        document.getElementById(
            "addEnquiryForm"
        );

    if (!form) {
        return;
    }

    form.addEventListener(
        "submit",
        submitAddEnquiry
    );

    const source =
        form.querySelector(
            "select[name='source']"
        ) ||
        form.querySelector(
            "#addSource"
        );

    if (source) {

        source.innerHTML =
            getSourceOptions()
                .map(
                    option => `
                        <option
                            value="${escapeHTML(
                                option.value
                            )}"
                        >
                            ${escapeHTML(
                                option.label
                            )}
                        </option>
                    `
                )
                .join("");
    }
}

/* =========================================================
   LOGOUT
   ========================================================= */

function setupLogout() {

    const button =
        document.getElementById(
            "logoutBtn"
        );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        logoutCRM
    );
}

/* =========================================================
   KEYBOARD
   ========================================================= */

function setupKeyboard() {

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }

            const leadModal =
                document.getElementById(
                    "leadModal"
                );

            const addModal =
                document.getElementById(
                    "addEnquiryModal"
                );

            const venueModal =
                document.getElementById(
                    "venueModal"
                );

            if (
                leadModal &&
                !leadModal.hidden
            ) {
                closeLeadModal();
            }

            if (
                addModal &&
                !addModal.hidden
            ) {
                closeAddEnquiryModal();
            }

            if (
                venueModal &&
                !venueModal.hidden
            ) {
                closeVenueModal();
            }

            closeFloatingOverlay();
        }
    );
}

/* =========================================================
   AUTH STATE LISTENER
   ========================================================= */

function setupAuthListener() {

    const client =
        getSupabaseClient();

    if (!client) {
        return;
    }

    client.auth.onAuthStateChange(
        (
            event,
            session
        ) => {

            if (
                event ===
                "SIGNED_OUT"
            ) {

                window.location.href =
                    "login.html";

                return;
            }

            if (session) {

                updateStaffName(
                    session.user
                );
            }
        }
    );
}

/* =========================================================
   FORMAT STATUS
   ========================================================= */

function formatStatus(
    status
) {

    if (!status) {
        return "New";
    }

    return String(status)
        .replace(
            /[-_]/g,
            " "
        )
        .replace(
            /\b\w/g,
            char =>
                char.toUpperCase()
        );
}

/* =========================================================
   FORMAT DATE
   ========================================================= */
function formatDateTime(value) {

    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }

    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }
    );
}

function formatDate(
    value
) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}

/* =========================================================
   UUID VALIDATION
   ========================================================= */

function isUUID(
    value
) {

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(
            safeValue(value)
        );
}


/* =========================================================
   SELECT MY VENUE — VENUE MANAGEMENT
   STAGE 2 — ADDITIVE MODULE
   ---------------------------------------------------------
   Does not replace or modify existing lead-management
   functions. It adds venue CRUD on the new venues table.
   ========================================================= */

let allVenues = [];
let venueSearch = "";
let venueStatusFilter = "all";
let venueVerificationFilter = "all";

/* =========================================================
   STAGE 3 — VENUE ENQUIRY ASSIGNMENTS
   ========================================================= */
let allVenueAssignments = [];
let assignedVenueDetails = {};

/* Stage 7A — Master CRM Partner Progress Visibility */
let assignedVenuePartnerProfiles = {};
let assignmentActivityHistory = {};
let assignmentCurrentLead = null;
let assignmentVenueRows = [];
let assignmentSearch = "";

function setupVenueManagement() {

    const venueBtn = document.getElementById("venueManagementBtn");
    const backBtn = document.getElementById("backToLeadsBtn");
    const addBtn = document.getElementById("addVenueBtn");
    const refreshBtn = document.getElementById("refreshVenuesBtn");
    const closeBtn = document.getElementById("closeVenueModal");
    const cancelBtn = document.getElementById("cancelVenueBtn");
    const form = document.getElementById("venueForm");
    const search = document.getElementById("venueSearchInput");
    const status = document.getElementById("venueStatusFilter");
    const verification = document.getElementById("venueVerificationFilter");
    const table = document.getElementById("venueTableBody");

    if (!venueBtn || !form || !table) {
        return;
    }

    venueBtn.addEventListener("click", openVenueManagement);
    backBtn?.addEventListener("click", showLeadManagement);
    addBtn?.addEventListener("click", () => openVenueModal());
    refreshBtn?.addEventListener("click", loadVenues);
    closeBtn?.addEventListener("click", closeVenueModal);
    cancelBtn?.addEventListener("click", closeVenueModal);

    form.addEventListener("submit", saveVenue);

    search?.addEventListener("input", event => {
        venueSearch = safeValue(event.target.value).trim().toLowerCase();
        renderVenues();
    });

    status?.addEventListener("change", event => {
        venueStatusFilter = event.target.value;
        renderVenues();
    });

    verification?.addEventListener("change", event => {
        venueVerificationFilter = event.target.value;
        renderVenues();
    });

    table.addEventListener("click", handleVenueTableClick);

    document.getElementById("venueModal")?.addEventListener("click", event => {
        if (event.target === event.currentTarget) {
            closeVenueModal();
        }
    });
}

function openVenueManagement() {
    const main = document.querySelector(".crm-main");
    const venueSection = document.getElementById("venueManagementSection");
    const title = document.getElementById("crmPageTitle");

    if (!main || !venueSection) {
        return;
    }

    main.hidden = true;
    venueSection.hidden = false;

    if (title) {
        title.textContent = "Venue Management";
    }

    document.getElementById("venueManagementBtn")?.classList.add("active");

    loadVenues();
}

function showLeadManagement() {
    const main = document.querySelector(".crm-main");
    const venueSection = document.getElementById("venueManagementSection");
    const title = document.getElementById("crmPageTitle");

    if (!main || !venueSection) {
        return;
    }

    venueSection.hidden = true;
    main.hidden = false;

    if (title) {
        title.textContent = "Lead Management";
    }

    document.getElementById("venueManagementBtn")?.classList.remove("active");
}

async function loadVenues() {

    const client = getSupabaseClient();

    if (!client) {
        return;
    }

    const tbody = document.getElementById("venueTableBody");

    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="venue-loading-cell">
                    Loading venues...
                </td>
            </tr>
        `;
    }

    const { data, error } = await client
        .from("venues")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {

        console.error("Venue load error:", error);

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="venue-loading-cell">
                        Unable to load venues.
                    </td>
                </tr>
            `;
        }

        showToast(
            "Unable to load venues: " + error.message,
            "error"
        );

        return;
    }

    allVenues = Array.isArray(data) ? data : [];

    updateVenueStats();
    renderVenues();
}

function updateVenueStats() {

    const total = allVenues.length;

    const approved =
        allVenues.filter(
            venue => safeValue(venue.venue_status) === "approved"
        ).length;

    const pending =
        allVenues.filter(
            venue => safeValue(venue.venue_status) === "pending"
        ).length;

    const verified =
        allVenues.filter(
            venue => safeValue(venue.verification_status) === "verified"
        ).length;

    const values = {
        venueTotalCount: total,
        venueApprovedCount: approved,
        venuePendingCount: pending,
        venueVerifiedCount: verified
    };

    Object.entries(values).forEach(([id, value]) => {

        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    });
}

function getFilteredVenues() {

    return allVenues.filter(venue => {

        const searchable = [
            venue.venue_name,
            venue.contact_person,
            venue.contact_mobile,
            venue.city,
            venue.area,
            venue.venue_type
        ]
            .map(safeValue)
            .join(" ")
            .toLowerCase();

        if (
            venueSearch &&
            !searchable.includes(venueSearch)
        ) {
            return false;
        }

        if (
            venueStatusFilter !== "all" &&
            safeValue(venue.venue_status) !== venueStatusFilter
        ) {
            return false;
        }

        if (
            venueVerificationFilter !== "all" &&
            safeValue(venue.verification_status) !== venueVerificationFilter
        ) {
            return false;
        }

        return true;
    });
}

function renderVenues() {

    const tbody = document.getElementById("venueTableBody");
    const empty = document.getElementById("venueEmptyState");

    if (!tbody) {
        return;
    }

    const venues = getFilteredVenues();

    if (!venues.length) {

        tbody.innerHTML = "";

        if (empty) {
            empty.hidden = false;
        }

        return;
    }

    if (empty) {
        empty.hidden = true;
    }

    tbody.innerHTML = venues.map(venue => {

        const capacity =
            venue.capacity_min || venue.capacity_max
                ? `${escapeHTML(
                    safeValue(venue.capacity_min) || "—"
                )}–${escapeHTML(
                    safeValue(venue.capacity_max) || "—"
                )}`
                : "—";

        const price =
            venue.price_min_per_person ||
            venue.price_max_per_person
                ? `₹${escapeHTML(
                    safeValue(venue.price_min_per_person) || "—"
                )}–₹${escapeHTML(
                    safeValue(venue.price_max_per_person) || "—"
                )}`
                : "—";

        return `
            <tr data-venue-id="${escapeHTML(venue.id)}">

                <td>
                    <div class="venue-name-cell">
                        <strong>${escapeHTML(
                            safeValue(venue.venue_name) || "Unnamed Venue"
                        )}</strong>
                        <small>${escapeHTML(
                            safeValue(venue.contact_person) || "No contact person"
                        )}</small>
                    </div>
                </td>

                <td>
                    <div>${escapeHTML(
                        safeValue(venue.contact_mobile) || "—"
                    )}</div>
                    <small class="venue-muted">${escapeHTML(
                        safeValue(venue.contact_email) || ""
                    )}</small>
                </td>

                <td>
                    <div>${escapeHTML(
                        safeValue(venue.city) || "—"
                    )}</div>
                    <small class="venue-muted">${escapeHTML(
                        safeValue(venue.area) || ""
                    )}</small>
                </td>

                <td>${escapeHTML(
                    safeValue(venue.venue_type) || "—"
                )}</td>

                <td>${capacity}</td>

                <td>${price}</td>

                <td>
                    <span class="venue-pill ${escapeHTML(
                        safeValue(venue.venue_status) || "pending"
                    )}">
                        ${escapeHTML(
                            formatVenueLabel(venue.venue_status)
                        )}
                    </span>
                </td>

                <td>
                    <span class="venue-pill ${escapeHTML(
                        safeValue(venue.verification_status) || "pending"
                    )}">
                        ${escapeHTML(
                            formatVenueLabel(venue.verification_status)
                        )}
                    </span>
                </td>

                <td>
                    <div class="venue-row-actions">
                        <button
                            type="button"
                            class="venue-row-btn"
                            data-venue-action="edit"
                            data-venue-id="${escapeHTML(venue.id)}"
                        >
                            Edit
                        </button>

                        ${
                            safeValue(venue.venue_status) === "approved"
                                ? `
                                    <button
                                        type="button"
                                        class="venue-row-btn"
                                        data-venue-action="deactivate"
                                        data-venue-id="${escapeHTML(venue.id)}"
                                    >
                                        Deactivate
                                    </button>
                                `
                                : `
                                    <button
                                        type="button"
                                        class="venue-row-btn"
                                        data-venue-action="approve"
                                        data-venue-id="${escapeHTML(venue.id)}"
                                    >
                                        Approve
                                    </button>
                                `
                        }

                        ${
                            safeValue(venue.venue_status) === "approved" &&
                            safeValue(venue.verification_status) === "pending"
                                ? `
                                    <button
                                        type="button"
                                        class="venue-row-btn"
                                        data-venue-action="verify"
                                        data-venue-id="${escapeHTML(venue.id)}"
                                    >
                                        Verify
                                    </button>
                                `
                                : ""
                        }

                        ${
                            safeValue(venue.venue_status) !== "rejected" &&
                            safeValue(venue.venue_status) !== "approved"
                                ? `
                                    <button
                                        type="button"
                                        class="venue-row-btn danger"
                                        data-venue-action="reject"
                                        data-venue-id="${escapeHTML(venue.id)}"
                                    >
                                        Reject
                                    </button>
                                `
                                : ""
                        }

                        <button
                            type="button"
                            class="venue-row-btn danger"
                            data-venue-action="delete"
                            data-venue-id="${escapeHTML(venue.id)}"
                        >
                            Delete
                        </button>
                    </div>
                </td>

            </tr>
        `;
    }).join("");
}

function formatVenueLabel(value) {

    if (!value) {
        return "Pending";
    }

    return String(value)
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, char => char.toUpperCase());
}

function openVenueModal(venue = null) {

    const modal = document.getElementById("venueModal");
    const form = document.getElementById("venueForm");

    if (!modal || !form) {
        return;
    }

    form.reset();

    document.getElementById("venueId").value =
        venue?.id || "";

    document.getElementById("venueModalTitle").textContent =
        venue ? "Edit Venue" : "Add New Venue";

    setVenueField("venueName", venue?.venue_name);
    setVenueField("venueType", venue?.venue_type);
    setVenueField("venueDescription", venue?.description);

    setVenueField("venueContactPerson", venue?.contact_person);
    setVenueField("venueMobile", venue?.contact_mobile);
    setVenueField("venueWhatsapp", venue?.whatsapp_number);
    setVenueField("venueEmail", venue?.contact_email);

    setVenueField("venueCity", venue?.city);
    setVenueField("venueArea", venue?.area);
    setVenueField("venueAddress", venue?.address);
    setVenueField("venueState", venue?.state);
    setVenueField("venuePincode", venue?.pincode);
    setVenueField("venueMaps", venue?.google_maps_url);

    setVenueField("venueCapacityMin", venue?.capacity_min);
    setVenueField("venueCapacityMax", venue?.capacity_max);
    setVenueField("venuePriceMin", venue?.price_min_per_person);
    setVenueField("venuePriceMax", venue?.price_max_per_person);

    setVenueField("venueWebsite", venue?.website_url);
    setVenueField("venueInstagram", venue?.instagram_url);
    setVenueField("venueFacebook", venue?.facebook_url);

    setVenueField(
        "venueStatus",
        venue?.venue_status || "pending"
    );

    setVenueField(
        "venueVerification",
        venue?.verification_status || "pending"
    );

    setVenueChecked(
        "venueFoodVeg",
        venue?.food_veg !== false
    );

    setVenueChecked(
        "venueFoodNonVeg",
        venue?.food_non_veg === true
    );

    setVenueChecked(
        "venueParking",
        venue?.parking_available === true
    );

    setVenueChecked(
        "venueRooms",
        venue?.rooms_available === true
    );

    setVenueChecked(
        "venueCatering",
        venue?.catering_available === true
    );

    setVenueChecked(
        "venueDecoration",
        venue?.decoration_available === true
    );

    setVenueChecked(
        "venueFeatured",
        venue?.featured === true
    );

    modal.hidden = false;
}

function setVenueField(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.value =
            value === null ||
            value === undefined
                ? ""
                : value;
    }
}

function setVenueChecked(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.checked = Boolean(value);
    }
}

function closeVenueModal() {

    const modal = document.getElementById("venueModal");

    if (modal) {
        modal.hidden = true;
    }
}

function getVenueFormData() {

    const numberOrNull = id => {

        const value =
            safeValue(
                document.getElementById(id)?.value
            ).trim();

        if (!value) {
            return null;
        }

        const number = Number(value);

        return Number.isFinite(number)
            ? number
            : null;
    };

    const checked = id =>
        Boolean(
            document.getElementById(id)?.checked
        );

    return {

        venue_name:
            safeValue(
                document.getElementById("venueName")?.value
            ).trim(),

        venue_type:
            safeValue(
                document.getElementById("venueType")?.value
            ).trim() || null,

        description:
            safeValue(
                document.getElementById("venueDescription")?.value
            ).trim() || null,

        contact_person:
            safeValue(
                document.getElementById("venueContactPerson")?.value
            ).trim() || null,

        contact_mobile:
            safeValue(
                document.getElementById("venueMobile")?.value
            ).trim() || null,

        whatsapp_number:
            safeValue(
                document.getElementById("venueWhatsapp")?.value
            ).trim() || null,

        contact_email:
            safeValue(
                document.getElementById("venueEmail")?.value
            ).trim() || null,

        city:
            safeValue(
                document.getElementById("venueCity")?.value
            ).trim() || null,

        area:
            safeValue(
                document.getElementById("venueArea")?.value
            ).trim() || null,

        address:
            safeValue(
                document.getElementById("venueAddress")?.value
            ).trim() || null,

        state:
            safeValue(
                document.getElementById("venueState")?.value
            ).trim() || null,

        pincode:
            safeValue(
                document.getElementById("venuePincode")?.value
            ).trim() || null,

        google_maps_url:
            safeValue(
                document.getElementById("venueMaps")?.value
            ).trim() || null,

        capacity_min:
            numberOrNull("venueCapacityMin"),

        capacity_max:
            numberOrNull("venueCapacityMax"),

        price_min_per_person:
            numberOrNull("venuePriceMin"),

        price_max_per_person:
            numberOrNull("venuePriceMax"),

        food_veg:
            checked("venueFoodVeg"),

        food_non_veg:
            checked("venueFoodNonVeg"),

        parking_available:
            checked("venueParking"),

        rooms_available:
            checked("venueRooms"),

        catering_available:
            checked("venueCatering"),

        decoration_available:
            checked("venueDecoration"),

        website_url:
            safeValue(
                document.getElementById("venueWebsite")?.value
            ).trim() || null,

        instagram_url:
            safeValue(
                document.getElementById("venueInstagram")?.value
            ).trim() || null,

        facebook_url:
            safeValue(
                document.getElementById("venueFacebook")?.value
            ).trim() || null,

        venue_status:
            safeValue(
                document.getElementById("venueStatus")?.value
            ) || "pending",

        verification_status:
            safeValue(
                document.getElementById("venueVerification")?.value
            ) || "pending",

        featured:
            checked("venueFeatured")
    };
}

async function saveVenue(event) {

    event.preventDefault();

    const client = getSupabaseClient();

    if (!client) {
        return;
    }

    const id =
        safeValue(
            document.getElementById("venueId")?.value
        ).trim();

    const payload = getVenueFormData();

    if (!payload.venue_name) {

        showToast(
            "Venue name is required.",
            "error"
        );

        document.getElementById("venueName")?.focus();

        return;
    }

    const button =
        document.getElementById("saveVenueBtn");

    if (button) {
        button.disabled = true;
        button.textContent = "Saving...";
    }

    let result;

    if (id) {

        result = await client
            .from("venues")
            .update(payload)
            .eq("id", id)
            .select()
            .single();

    }
    else {

        result = await client
            .from("venues")
            .insert({
                ...payload,
                created_by:
                    (
                        await client.auth.getUser()
                    ).data?.user?.id || null
            })
            .select()
            .single();
    }

    if (button) {
        button.disabled = false;
        button.textContent = "Save Venue";
    }

    if (result.error) {

        console.error(
            "Venue save error:",
            result.error
        );

        showToast(
            "Unable to save venue: " +
            result.error.message,
            "error"
        );

        return;
    }

    closeVenueModal();

    showToast(
        id
            ? "Venue updated successfully."
            : "Venue added successfully.",
        "success"
    );

    await loadVenues();
}

async function handleVenueTableClick(event) {

    const button =
        event.target.closest(
            "[data-venue-action]"
        );

    if (!button) {
        return;
    }

    const id =
        safeValue(
            button.dataset.venueId
        );

    const action =
        safeValue(
            button.dataset.venueAction
        );

    const venue =
        allVenues.find(
            item => String(item.id) === String(id)
        );

    if (!venue) {
        return;
    }

    if (action === "edit") {

        openVenueModal(venue);
        return;
    }

    if (action === "approve") {

        await updateVenueStatus(
            venue,
            "approved",
            venue.verification_status || "pending"
        );

        return;
    }

    if (action === "verify") {

        await updateVenueStatus(
            venue,
            "approved",
            "verified"
        );

        return;
    }

    if (action === "reject") {

        const confirmed =
            window.confirm(
                `Reject "${venue.venue_name}"?\n\nThe venue will remain in the CRM but will not be treated as an approved partner.`
            );

        if (!confirmed) {
            return;
        }

        await updateVenueStatus(
            venue,
            "rejected",
            "rejected"
        );

        return;
    }

    if (action === "deactivate") {

        await updateVenueStatus(
            venue,
            "inactive",
            venue.verification_status
        );

        return;
    }

    if (action === "delete") {

        const confirmed =
            window.confirm(
                `Delete "${venue.venue_name}"?\n\nThis venue record will be permanently removed.`
            );

        if (!confirmed) {
            return;
        }

        await deleteVenue(venue);
    }
}

async function updateVenueStatus(
    venue,
    venueStatus,
    verificationStatus
) {

    const client = getSupabaseClient();

    if (!client) {
        return;
    }

    const { error } =
        await client
            .from("venues")
            .update({
                venue_status: venueStatus,
                verification_status: verificationStatus
            })
            .eq("id", venue.id);

    if (error) {

        console.error(
            "Venue status update error:",
            error
        );

        showToast(
            "Unable to update venue: " +
            error.message,
            "error"
        );

        return;
    }

    let message = "Venue updated successfully.";

    if (venueStatus === "approved" && verificationStatus === "verified") {
        message = "Venue verified and approved.";
    } else if (venueStatus === "approved") {
        message = "Venue approved. Verification is still pending.";
    } else if (venueStatus === "rejected") {
        message = "Venue rejected.";
    } else if (venueStatus === "inactive") {
        message = "Venue deactivated.";
    }

    showToast(message, "success");

    await loadVenues();
}

async function deleteVenue(venue) {

    const client = getSupabaseClient();

    if (!client) {
        return;
    }

    const { error } =
        await client
            .from("venues")
            .delete()
            .eq("id", venue.id);

    if (error) {

        console.error(
            "Venue delete error:",
            error
        );

        showToast(
            "Unable to delete venue: " +
            error.message,
            "error"
        );

        return;
    }

    showToast(
        "Venue deleted.",
        "success"
    );

    await loadVenues();
}


/* =========================================================
   STAGE 3 — INTERNAL VENUE ASSIGNMENT
   ---------------------------------------------------------
   Only approved + verified venues are offered to staff.
   Partner access is intentionally NOT implemented here.
   ========================================================= */

function getAssignmentCount(enquiryId) {
    return allVenueAssignments.filter(
        item =>
            String(item.enquiry_id) === String(enquiryId) &&
            safeValue(item.assignment_status) !== "cancelled"
    ).length;
}

async function loadVenueAssignments() {
    const client = getSupabaseClient();

    if (!client) {
        allVenueAssignments = [];
        assignedVenueDetails = {};
        return;
    }

    try {
        const { data, error } = await client
            .from("venue_enquiry_assignments")
            .select("*")
            .order("assigned_at", { ascending: false });

        if (error) {
            console.warn(
                "Venue assignments are not available yet:",
                error.message
            );
            allVenueAssignments = [];
            assignedVenueDetails = {};
            return;
        }

        allVenueAssignments = Array.isArray(data) ? data : [];
        assignedVenueDetails = {};

        const venueIds = [
            ...new Set(
                allVenueAssignments
                    .map(item => item.venue_id)
                    .filter(Boolean)
                    .map(String)
            )
        ];

        if (venueIds.length) {
            const { data: venues, error: venueError } = await client
                .from("venues")
                .select("id, venue_name, city, area, venue_type")
                .in("id", venueIds);

            if (venueError) {
                console.warn(
                    "Assigned venue details could not be loaded:",
                    venueError.message
                );
            } else {
                (venues || []).forEach(venue => {
                    assignedVenueDetails[String(venue.id)] = venue;
                });
            }
        }

        /* Stage 7A — load partner identities for assigned venues */
        assignedVenuePartnerProfiles = {};

        if (venueIds.length) {
            const { data: partnerProfiles, error: partnerProfileError } = await client
                .from("venue_partner_profiles")
                .select("id,venue_id,user_id,full_name,designation,email,mobile,is_primary,is_active")
                .in("venue_id", venueIds)
                .eq("is_active", true)
                .order("is_primary", { ascending: false });

            if (partnerProfileError) {
                console.warn("Partner profiles could not be loaded:", partnerProfileError.message);
            } else {
                (partnerProfiles || []).forEach(profile => {
                    const key = String(profile.venue_id);
                    if (!assignedVenuePartnerProfiles[key] || profile.is_primary) {
                        assignedVenuePartnerProfiles[key] = profile;
                    }
                });
            }
        }

        /* Stage 7A — load partner activity for the assignment cards/journey */
        assignmentActivityHistory = {};
        const assignmentIds = allVenueAssignments.map(item => item.id).filter(Boolean);

        if (assignmentIds.length) {
            const { data: activities, error: activityError } = await client
                .from("venue_activity_log")
                .select("id,assignment_id,venue_id,user_id,activity_type,description,created_at")
                .in("assignment_id", assignmentIds)
                .order("created_at", { ascending: false });

            if (activityError) {
                console.warn("Partner activity could not be loaded:", activityError.message);
            } else {
                (activities || []).forEach(activity => {
                    const key = String(activity.assignment_id);
                    if (!assignmentActivityHistory[key]) {
                        assignmentActivityHistory[key] = [];
                    }
                    assignmentActivityHistory[key].push(activity);
                });
            }
        }

        if (currentLead) {
            renderLeadVenueAssignments(currentLead.id);
        }
    }
    catch (error) {
        console.warn(
            "Venue assignment load error:",
            error
        );
        allVenueAssignments = [];
        assignedVenueDetails = {};
    }
}

function getAssignmentStatusLabel(status) {
    const labels = {
        assigned: "Assigned",
        viewed: "Viewed",
        contacted: "Contacted",
        detailed_shared: "Details Shared",
        follow_up: "Follow-up",
        site_visit: "Site Visit",
        negotiation: "Negotiation",
        booked: "Booked",
        lost: "Lost",
        cancelled: "Cancelled"
    };

    return labels[safeValue(status)] || "Assigned";
}

function getAssignmentStatusOptions() {
    return [
        { value: "assigned", label: "Assigned" },
        { value: "viewed", label: "Viewed" },
        { value: "contacted", label: "Contacted" },
        { value: "detailed_shared", label: "Details Shared" },
        { value: "follow_up", label: "Follow-up" },
        { value: "site_visit", label: "Site Visit" },
        { value: "negotiation", label: "Negotiation" },
        { value: "booked", label: "Booked" },
        { value: "lost", label: "Lost" },
        { value: "cancelled", label: "Cancelled" }
    ];
}


function getPartnerActivityLabel(type) {
    const labels = {
        assigned: "Assigned",
        viewed: "Viewed",
        contacted: "Contacted",
        detailed_shared: "Details Shared",
        follow_up: "Follow-up",
        follow_up_scheduled: "Follow-up Scheduled",
        follow_up_cleared: "Follow-up Cleared",
        site_visit: "Site Visit",
        negotiation: "Negotiation",
        booked: "Booked",
        lost: "Lost",
        cancelled: "Cancelled",
        call_attempted: "Call Attempted",
        customer_spoke: "Customer Spoke",
        whatsapp_shared: "WhatsApp / Details Shared",
        customer_remark: "Customer Remark",
        site_visit_note: "Site Visit Note",
        negotiation_note: "Negotiation Note",
        general_note: "General Note",
        status_changed: "Status Changed"
    };
    return labels[safeValue(type)] || safeValue(type).replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase()) || "Activity";
}

function getPartnerActivityIcon(type) {
    const icons = {
        assigned: "📥", viewed: "👁", contacted: "📞", detailed_shared: "💬",
        follow_up: "⏰", follow_up_scheduled: "⏰", follow_up_cleared: "✓",
        site_visit: "📍", negotiation: "🤝", booked: "✓", lost: "✕",
        cancelled: "✕", call_attempted: "📞", customer_spoke: "☎",
        whatsapp_shared: "💬", customer_remark: "🗒", site_visit_note: "📍",
        negotiation_note: "🤝", general_note: "✎", status_changed: "↻"
    };
    return icons[safeValue(type)] || "•";
}

function renderPartnerJourney(assignmentId) {
    const activities = assignmentActivityHistory[String(assignmentId)] || [];

    if (!activities.length) {
        return `<div class="partner-journey-empty">No partner activity has been recorded yet.</div>`;
    }

    return `
        <div class="master-partner-journey">
            ${activities.map(activity => `
                <div class="master-partner-journey-item">
                    <div class="master-partner-journey-icon">${getPartnerActivityIcon(activity.activity_type)}</div>
                    <div class="master-partner-journey-content">
                        <strong>${escapeHTML(getPartnerActivityLabel(activity.activity_type))}</strong>
                        ${activity.description ? `<div>${escapeHTML(activity.description)}</div>` : ""}
                        <span>${escapeHTML(activity.created_at ? formatDateTime(activity.created_at) : "—")}</span>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function togglePartnerJourney(assignmentId) {
    const panel = document.querySelector(`[data-partner-journey-panel="${CSS.escape(String(assignmentId))}"]`);
    const button = document.querySelector(`[data-partner-journey-button="${CSS.escape(String(assignmentId))}"]`);
    if (!panel) return;

    const opening = panel.hidden;
    panel.hidden = !opening;
    if (button) button.textContent = opening ? "Hide Partner Journey" : "View Partner Journey";
}

function renderLeadVenueAssignments(enquiryId) {
    const container = document.getElementById("leadVenueAssignments");
    const count = document.getElementById("leadVenueAssignmentCount");

    if (!container) {
        return;
    }

    const assignments = allVenueAssignments.filter(
        item => String(item.enquiry_id) === String(enquiryId)
    );

    const activeAssignments = assignments.filter(
        item => safeValue(item.assignment_status) !== "cancelled"
    );

    if (count) {
        count.textContent = `${activeAssignments.length} active`;
    }

    const assignButton = document.getElementById("assignAnotherVenueBtn");
    if (assignButton) {
        assignButton.disabled = !enquiryId;
        assignButton.onclick = () => openVenueAssignmentModal(enquiryId);
    }

    if (!assignments.length) {
        container.innerHTML = `
            <div class="lead-venue-empty">
                No venues assigned to this enquiry yet.
                Use <strong>Assign Venue</strong> to send this enquiry to a verified partner.
            </div>
        `;
        return;
    }

    container.innerHTML = assignments.map(assignment => {
        const venue = assignedVenueDetails[String(assignment.venue_id)] || {};
        const status = safeValue(assignment.assignment_status) || "assigned";
        const location = [venue.city, venue.area].filter(Boolean).join(" • ") || "Location not set";
        const assignedAt = assignment.assigned_at
            ? formatDateTime(assignment.assigned_at)
            : "—";
        const updatedAt = assignment.updated_at
            ? formatDateTime(assignment.updated_at)
            : null;
        const isCancelled = status === "cancelled";
        const partner = assignedVenuePartnerProfiles[String(assignment.venue_id)] || {};
        const activities = assignmentActivityHistory[String(assignment.id)] || [];
        const latestActivity = activities[0] || null;
        const followUpAt = assignment.follow_up_at ? formatDateTime(assignment.follow_up_at) : "—";
        const partnerNote = safeValue(assignment.partner_note).trim();
        const partnerName = partner.full_name || partner.email || "Partner not linked";
        const lastActivity = latestActivity
            ? `${getPartnerActivityLabel(latestActivity.activity_type)} · ${formatDateTime(latestActivity.created_at)}`
            : (assignment.last_activity_at ? formatDateTime(assignment.last_activity_at) : "No activity yet");

        return `
            <div class="lead-venue-assignment-card ${isCancelled ? "is-cancelled" : ""}" data-assignment-id="${escapeHTML(assignment.id)}">
                <div class="lead-venue-assignment-main">
                    <div class="lead-venue-assignment-title">
                        <strong>🏨 ${escapeHTML(venue.venue_name || "Assigned Venue")}</strong>
                        <span>${escapeHTML(location)}</span>
                    </div>
                    <div class="lead-venue-assignment-meta">
                        <span>Assigned: ${escapeHTML(assignedAt)}</span>
                        ${updatedAt ? `<span>Updated: ${escapeHTML(updatedAt)}</span>` : ""}
                        ${assignment.assignment_note ? `<span>Note: ${escapeHTML(assignment.assignment_note)}</span>` : ""}
                    </div>
                </div>
                <div class="master-partner-progress">
                    <div class="master-partner-progress-title">Partner Progress</div>
                    <div class="master-partner-progress-grid">
                        <div><span>Partner</span><strong>${escapeHTML(partnerName)}</strong></div>
                        <div><span>Current Status</span><strong>${escapeHTML(getAssignmentStatusLabel(status))}</strong></div>
                        <div><span>Follow-up</span><strong>${escapeHTML(followUpAt)}</strong></div>
                        <div><span>Last Activity</span><strong>${escapeHTML(lastActivity)}</strong></div>
                    </div>
                    ${partnerNote ? `
                        <div class="master-partner-note">
                            <span>Partner Follow-up Note</span>
                            <strong>${escapeHTML(partnerNote)}</strong>
                        </div>
                    ` : ""}
                    <button
                        type="button"
                        class="master-partner-journey-btn"
                        data-partner-journey-button="${escapeHTML(assignment.id)}"
                        onclick="togglePartnerJourney('${escapeHTML(assignment.id)}')"
                    >View Partner Journey</button>
                    <div
                        class="master-partner-journey-panel"
                        data-partner-journey-panel="${escapeHTML(assignment.id)}"
                        hidden
                    >
                        ${renderPartnerJourney(assignment.id)}
                    </div>
                </div>
                <div class="lead-venue-assignment-controls">
                    <select
                        class="venue-assignment-status-select"
                        data-assignment-id="${escapeHTML(assignment.id)}"
                        aria-label="Assignment status for ${escapeHTML(venue.venue_name || "venue")}"
                    >
                        ${getAssignmentStatusOptions().map(option => `
                            <option value="${option.value}" ${option.value === status ? "selected" : ""}>${escapeHTML(option.label)}</option>
                        `).join("")}
                    </select>
                    ${!isCancelled ? `
                        <button
                            type="button"
                            class="venue-assignment-remove-btn"
                            data-assignment-action="cancel"
                            data-assignment-id="${escapeHTML(assignment.id)}"
                            title="Cancel this venue assignment"
                        >
                            Remove
                        </button>
                    ` : ""}
                </div>
            </div>
        `;
    }).join("");
}

async function updateVenueAssignmentStatus(assignmentId, status) {
    const client = getSupabaseClient();

    if (!client || !assignmentId) {
        return;
    }

    try {
        const { error } = await client
            .from("venue_enquiry_assignments")
            .update({ assignment_status: status })
            .eq("id", assignmentId);

        if (error) {
            throw error;
        }

        await loadVenueAssignments();
        applyFilters();

        if (currentLead) {
            renderLeadVenueAssignments(currentLead.id);
        }

        showToast(
            `Venue assignment updated to ${getAssignmentStatusLabel(status)}.`,
            "success"
        );
    }
    catch (error) {
        console.error("Venue assignment status update error:", error);
        showToast(
            error.message || "Unable to update venue assignment.",
            "error"
        );
        if (currentLead) {
            renderLeadVenueAssignments(currentLead.id);
        }
    }
}

async function cancelVenueAssignment(assignmentId) {
    return updateVenueAssignmentStatus(assignmentId, "cancelled");
}

function setupVenueAssignment() {
    const modal = document.getElementById("venueAssignmentModal");
    const close = document.getElementById("closeVenueAssignmentModal");
    const cancel = document.getElementById("cancelVenueAssignment");
    const save = document.getElementById("saveVenueAssignment");
    const search = document.getElementById("assignmentVenueSearch");

    if (!modal) {
        return;
    }

    close?.addEventListener("click", closeVenueAssignmentModal);
    cancel?.addEventListener("click", closeVenueAssignmentModal);
    save?.addEventListener("click", saveVenueAssignments);

    search?.addEventListener("input", event => {
        assignmentSearch = safeValue(event.target.value).trim().toLowerCase();
        renderAssignmentVenues();
    });

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closeVenueAssignmentModal();
        }
    });

    document.addEventListener("change", event => {
        const select = event.target.closest(".venue-assignment-status-select");
        if (!select) {
            return;
        }

        updateVenueAssignmentStatus(
            select.dataset.assignmentId,
            select.value
        );
    });

    document.addEventListener("click", event => {
        const removeButton = event.target.closest("[data-assignment-action='cancel']");
        if (!removeButton) {
            return;
        }

        event.preventDefault();
        const ok = window.confirm("Cancel this venue assignment? The assignment history will be retained.");
        if (ok) {
            cancelVenueAssignment(removeButton.dataset.assignmentId);
        }
    });
}

async function openVenueAssignmentModal(enquiryId) {
    const lead = allLeads.find(
        item => String(item.id) === String(enquiryId)
    );

    const modal = document.getElementById("venueAssignmentModal");

    if (!lead || !modal) {
        return;
    }

    assignmentCurrentLead = lead;
    assignmentSearch = "";

    const search = document.getElementById("assignmentVenueSearch");
    if (search) {
        search.value = "";
    }

    setText(
        "#assignmentCustomerSummary",
        `${lead.customer_name || "Customer"} • ${lead.occasion || "Event"}`
    );

    const requirement = [
        lead.location ? `Location: ${lead.location}` : null,
        lead.guests ? `Guests: ${lead.guests}` : null,
        lead.event_date ? `Event date: ${formatDate(lead.event_date)}` : null,
        lead.budget_per_person ? `Budget: ₹${lead.budget_per_person}/person` : null
    ].filter(Boolean).join("  •  ");

    setText(
        "#assignmentRequirementSummary",
        requirement || "Select approved and verified venues to receive this enquiry."
    );

    const list = document.getElementById("venueAssignmentList");
    if (list) {
        list.innerHTML = '<div class="venue-assignment-loading">Loading approved & verified venues...</div>';
    }

    const message = document.getElementById("venueAssignmentMessage");
    if (message) {
        message.textContent = "";
    }

    const note = document.getElementById("venueAssignmentNote");
    if (note) {
        note.value = "";
    }

    modal.hidden = false;
    document.body.style.overflow = "hidden";

    await loadAssignmentVenueOptions();
}

async function loadAssignmentVenueOptions() {
    const client = getSupabaseClient();
    const list = document.getElementById("venueAssignmentList");

    if (!client || !list || !assignmentCurrentLead) {
        return;
    }

    const { data, error } = await client
        .from("venues")
        .select("*")
        .eq("venue_status", "approved")
        .eq("verification_status", "verified")
        .order("venue_name", { ascending: true });

    if (error) {
        console.error("Assignment venue load error:", error);
        list.innerHTML = `<div class="venue-assignment-empty">Unable to load approved and verified venues.</div>`;
        showAssignmentMessage(error.message || "Unable to load venues.", "error");
        return;
    }

    assignmentVenueRows = Array.isArray(data) ? data : [];
    renderAssignmentVenues();
}

function isVenueAlreadyAssigned(venueId) {
    if (!assignmentCurrentLead) {
        return false;
    }

    return allVenueAssignments.some(item =>
        String(item.enquiry_id) === String(assignmentCurrentLead.id) &&
        String(item.venue_id) === String(venueId) &&
        item.assignment_status !== "cancelled"
    );
}

function isRecommendedAssignmentVenue(venue, lead) {
    const venueCity = safeValue(venue.city).toLowerCase();
    const leadLocation = safeValue(lead.location).toLowerCase();
    const venueType = safeValue(venue.venue_type).toLowerCase();
    const occasion = safeValue(lead.occasion).toLowerCase();

    const locationMatch = venueCity && leadLocation && (
        leadLocation.includes(venueCity) ||
        venueCity.includes(leadLocation)
    );

    const guests = Number(lead.guests);
    const maxCapacity = Number(venue.capacity_max);
    const capacityMatch = Number.isFinite(guests) && Number.isFinite(maxCapacity)
        ? maxCapacity >= guests
        : false;

    const typeMatch = (
        occasion.includes("wedding") && venueType.includes("banquet")
    ) || (
        occasion.includes("party") && venueType.includes("party")
    );

    return Boolean(locationMatch || capacityMatch || typeMatch);
}

function renderAssignmentVenues() {
    const list = document.getElementById("venueAssignmentList");
    const count = document.getElementById("assignmentVenueCount");

    if (!list || !assignmentCurrentLead) {
        return;
    }

    const search = assignmentSearch;

    const venues = assignmentVenueRows.filter(venue => {
        if (!search) {
            return true;
        }

        const searchable = [
            venue.venue_name,
            venue.contact_person,
            venue.city,
            venue.area,
            venue.venue_type
        ].map(safeValue).join(" ").toLowerCase();

        return searchable.includes(search);
    });

    if (count) {
        count.textContent = `${venues.length} venue${venues.length === 1 ? "" : "s"}`;
    }

    if (!venues.length) {
        list.innerHTML = '<div class="venue-assignment-empty">No approved and verified venues match this search.</div>';
        return;
    }

    list.innerHTML = venues.map(venue => {
        const assigned = isVenueAlreadyAssigned(venue.id);
        const recommended = isRecommendedAssignmentVenue(venue, assignmentCurrentLead);
        const capacity = venue.capacity_min || venue.capacity_max
            ? `${safeValue(venue.capacity_min) || "—"}–${safeValue(venue.capacity_max) || "—"}`
            : "Capacity not set";
        const price = venue.price_min_per_person || venue.price_max_per_person
            ? `₹${safeValue(venue.price_min_per_person) || "—"}–₹${safeValue(venue.price_max_per_person) || "—"}/person`
            : "Price not set";
        const location = [venue.city, venue.area].filter(Boolean).join(" • ") || "Location not set";

        return `
            <label class="venue-assignment-item">
                <input
                    type="checkbox"
                    class="venue-assignment-checkbox"
                    value="${escapeHTML(venue.id)}"
                    ${assigned ? "checked" : ""}
                >
                <div class="venue-assignment-item-main">
                    <div class="venue-assignment-item-title">
                        <strong>${escapeHTML(venue.venue_name || "Unnamed Venue")}</strong>
                        ${recommended ? '<span class="venue-assignment-recommended">Recommended</span>' : ""}
                    </div>
                    <div class="venue-assignment-item-meta">
                        <span>📍 ${escapeHTML(location)}</span>
                        <span>👥 ${escapeHTML(capacity)}</span>
                        <span>₹ ${escapeHTML(price.replace(/^₹\s*/, ""))}</span>
                        <span>${escapeHTML(venue.venue_type || "Venue")}</span>
                    </div>
                </div>
                <span class="venue-assignment-item-status">Verified</span>
            </label>
        `;
    }).join("");
}

function showAssignmentMessage(message, type = "") {
    const element = document.getElementById("venueAssignmentMessage");
    if (!element) {
        return;
    }

    element.textContent = safeValue(message);
    element.className = `form-message ${type ? `assignment-${type}` : ""}`.trim();
}

async function saveVenueAssignments() {
    const client = getSupabaseClient();
    const saveButton = document.getElementById("saveVenueAssignment");

    if (!client || !assignmentCurrentLead) {
        return;
    }

    const selected = Array.from(
        document.querySelectorAll(
            ".venue-assignment-checkbox:checked"
        )
    ).map(input => input.value);

    if (!selected.length) {
        showAssignmentMessage(
            "Select at least one approved and verified venue.",
            "error"
        );
        return;
    }

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Assigning...";
    }

    try {
        const { data: userData } = await client.auth.getUser();
        const assignedBy = userData?.user?.id || null;
        const note = safeValue(
            document.getElementById("venueAssignmentNote")?.value
        ).trim() || null;

        const rows = selected
            .filter(venueId => !isVenueAlreadyAssigned(venueId))
            .map(venueId => ({
                enquiry_id: assignmentCurrentLead.id,
                venue_id: venueId,
                assignment_status: "assigned",
                assignment_note: note,
                assigned_by: assignedBy
            }));

        if (rows.length) {
            const { error } = await client
                .from("venue_enquiry_assignments")
                .insert(rows);

            if (error) {
                throw error;
            }
        }

        /* Keep a lightweight internal activity record where available. */
        try {
            await client
                .from("crm_activity_log")
                .insert({
                    lead_id: assignmentCurrentLead.id,
                    activity_type: "venue_assigned",
                    description: `Venue assignment: ${selected.length} venue(s) assigned.`,
                    new_value: selected.join(","),
                    created_by: assignedBy
                });
        }
        catch (activityError) {
            console.warn(
                "Assignment activity log was not written:",
                activityError
            );
        }

        await loadVenueAssignments();
        applyFilters();
        closeVenueAssignmentModal();
        if (rows.length > 0) {
            const assignedText =
                `${rows.length} new venue${rows.length === 1 ? "" : "s"} assigned successfully.`;

            const skippedCount = selected.length - rows.length;

            if (skippedCount > 0) {
                showToast(
                    `${assignedText} ${skippedCount} venue${skippedCount === 1 ? " was" : "s were"} already assigned.`,
                    "success"
                );
            } else {
                showToast(
                    assignedText,
                    "success"
                );
            }
        } else {
            const alreadyCount = selected.length;

            showToast(
                `${alreadyCount} venue${alreadyCount === 1 ? " is" : "s are"} already assigned to this enquiry. No new assignment was created.`,
                "info"
            );
        }
    }
    catch (error) {
        console.error("Venue assignment save error:", error);
        showAssignmentMessage(
            error.message || "Unable to assign venues.",
            "error"
        );
    }
    finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Assign Selected Venues";
        }
    }
}

function closeVenueAssignmentModal() {
    const modal = document.getElementById("venueAssignmentModal");

    if (!modal) {
        return;
    }

    modal.hidden = true;
    document.body.style.overflow = "";
    assignmentCurrentLead = null;
    assignmentVenueRows = [];
    assignmentSearch = "";
}

/* =========================================================
   END VENUE MANAGEMENT — STAGE 2
   ========================================================= */


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeCRM() {

    console.log(
        "Select My Venue CRM initializing..."
    );

    const session =
        await checkCRMAuth();

    if (!session) {
        return;
    }

    setupSearch();

    setupFilters();

    setupStatFilters();

    setupRefresh();

    setupAddButton();

    setupGlobalClicks();

    setupAddForm();

    setupModalSave();

    setupLeadModalCancel();

    setupLogout();

    setupKeyboard();

    setupVenueManagement();

    setupVenueAssignment();

    setupAuthListener();

    await loadEnquiries();

    console.log(
        "Select My Venue CRM ready."
    );
}

/* =========================================================
   START
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeCRM
    );

}
else {

    initializeCRM();
}

/* =========================================================
   GLOBAL ACCESS
   ========================================================= */

window.crm = {

    loadEnquiries,

    openLeadModal,

    closeLeadModal,

    openAddEnquiryModal,

    closeAddEnquiryModal,

    saveModalChanges,

    logoutCRM,

    startInlineEdit,

    editLeadComment,

    viewLeadComment,

    saveComment,

    getAILeadAnalysis,

    getSourceOptions,

    getStatusOptions
};

window.loadEnquiries =
    loadEnquiries;

window.openLeadModal =
    openLeadModal;

window.closeLeadModal =
    closeLeadModal;

window.openAddEnquiryModal =
    openAddEnquiryModal;

window.closeAddEnquiryModal =
    closeAddEnquiryModal;

window.saveModalChanges =
    saveModalChanges;

window.logoutCRM =
    logoutCRM;

window.startInlineEdit =
    startInlineEdit;

window.editLeadComment =
    editLeadComment;

window.viewLeadComment =
    viewLeadComment;

window.saveComment =
    saveComment;

console.log(
    "Select My Venue CRM — AI-style CRM engine loaded."
);
