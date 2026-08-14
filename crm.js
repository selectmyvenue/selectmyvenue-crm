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
            CRM_SUPABASE_ANON_KEY
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
            <td colspan="12" class="loading-cell">
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
            <td colspan="12" class="loading-cell">
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

        {
            value: "new",
            label: "New"
        },

        {
            value: "contacted",
            label: "Contacted"
        },

        {
            value: "follow-up",
            label: "Follow-up"
        },

        {
            value: "detail-shared",
            label: "Detail Shared"
        },

        {
            value: "interested",
            label: "Interested"
        },

        {
            value: "qualified",
            label: "Qualified"
        },

        {
            value: "site-visit",
            label: "Site Visit"
        },

        {
            value: "negotiation",
            label: "Negotiation"
        },

        {
            value: "booked",
            label: "Booked"
        },

        {
            value: "converted",
            label: "Converted"
        },

        {
            value: "closed",
            label: "Closed"
        },

        {
            value: "lost",
            label: "Lost"
        },

        {
            value: "not-interested",
            label: "Not Interested"
        }
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
   CREATE LEAD ROW
   ========================================================= */

function createLeadRow(lead) {

    const id =
        safeValue(lead.id);

    const customerName =
        lead.customer_name ||
        "Unknown Customer";

    const phone =
    lead.mobile ||
    "—";

const createdDate =
    lead.created_at
        ? formatDateTime(lead.created_at)
        : "—";

const email =
    lead.email ||
    "—";
   
    const source =
        lead.source ||
        "—";

    const occasion =
        lead.occasion ||
        "—";

    const eventDate =
        lead.event_date ||
        "";

    const guests =
        lead.guests ??
        "";

    const location =
        lead.location ||
        "—";

    const status =
        lead.status ||
        "new";

    const comment =
        safeValue(
            lead.internal_notes
        ).trim();

    const ai =
        getAILeadAnalysis(lead);

    return `
        <tr
            data-lead-id="${escapeHTML(id)}"
            class="crm-lead-row"
        >

            <td class="customer-cell">
                <strong>
                    ${escapeHTML(customerName)}
                </strong>
            </td>

            <td class="phone-cell">
    ${escapeHTML(phone)}
</td>

<td class="created-date-cell">
    ${escapeHTML(createdDate)}
</td>

<td>
    ${createInlineField(
        lead,
        "email",
        email,
        "text"
    )}
</td>

            <td>
                ${createSourceField(
                    lead,
                    source
                )}
            </td>

            <td>
                ${createInlineField(
                    lead,
                    "occasion",
                    occasion,
                    "select",
                    getEventOptions()
                )}
            </td>

            <td>
                ${createInlineField(
                    lead,
                    "event_date",
                    eventDate
                        ? formatDate(eventDate)
                        : "—",
                    "date",
                    null,
                    eventDate
                )}
            </td>

            <td>
                ${createInlineField(
                    lead,
                    "guests",
                    guests === ""
                        ? "—"
                        : guests,
                    "number"
                )}
            </td>

            <td>
                ${createInlineField(
                    lead,
                    "location",
                    location,
                    "text"
                )}
            </td>

            <td>
                ${createStatusInlineField(
                    lead,
                    status
                )}
            </td>

            <td>
                ${createCommentCell(
                    lead,
                    comment
                )}
            </td>

            <td class="action-column">

                <button
                    type="button"
                    class="view-lead-btn"
                    data-action="view"
                    data-id="${escapeHTML(id)}"
                    title="${escapeHTML(
                        ai.recommendation
                    )}"
                >
                    <span class="view-icon">◉</span>
                    <span>View Details</span>
                </button>

            </td>

        </tr>
    `;
}

/* =========================================================
   RENDER TABLE
   ========================================================= */

function renderLeads() {

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
                <td colspan="12">
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

    setupLogout();

    setupKeyboard();

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
