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

async function crmFetch(input, options = {}) {
    const controller = new AbortController();
    const originalSignal = options.signal;
    const abort = () => controller.abort();
    if (originalSignal?.aborted) abort();
    else originalSignal?.addEventListener('abort', abort, {once:true});
    const timer = setTimeout(abort, 25000);
    try { return await fetch(input, {...options, signal:controller.signal}); }
    finally { clearTimeout(timer); originalSignal?.removeEventListener('abort', abort); }
}

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
                global: { fetch: crmFetch },
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
                    "opacity .25s ease, transform .25s ease",
                pointerEvents: "none"
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

    toast.style.pointerEvents = "none";
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

let enquiryLoadPromise = null;
let enquiriesLoaded = false;
let assignmentRefreshAt = 0;
let assignmentRefreshPromise = null;

// Keep the last successful workspace visible and coalesce simultaneous refreshes.
function loadEnquiries() {
    if (enquiryLoadPromise) return enquiryLoadPromise;
    enquiryLoadPromise = performEnquiryLoad().finally(() => { enquiryLoadPromise = null; });
    return enquiryLoadPromise;
}
async function performEnquiryLoad() {
    const client = getSupabaseClient();
    if (!client) return false;
    if (!enquiriesLoaded) setTableLoading();
    window.dispatchEvent(new CustomEvent('crm:sync', {detail:{state:'loading'}}));
    try {
        const data = [];
        for (let offset = 0; ; offset += 1000) {
            const result = await client.from("customer_enquiries").select("*")
                .order("created_at", { ascending: false }).order("id", { ascending: false })
                .range(offset, offset + 999);
            if (result.error) throw result.error;
            data.push(...(result.data || []));
            if ((result.data || []).length < 1000) break;
        }
        // An editor may have opened while the request was in flight.
        if (enquiriesLoaded && document.querySelector('#leadModal:not([hidden]),#addEnquiryModal:not([hidden]),.editing,.crm-floating-overlay')) {
            window.dispatchEvent(new CustomEvent('crm:sync', {detail:{state:'deferred'}}));
            return false;
        }
        allLeads = data;
        enquiriesLoaded = true;
        applyFilters();
        updateStats();
        // Venue history must never delay displaying customer enquiries.
        if (!assignmentRefreshPromise && Date.now() - assignmentRefreshAt > 60000) {
            assignmentRefreshPromise = loadVenueAssignments().finally(() => {
                assignmentRefreshAt = Date.now();
                assignmentRefreshPromise = null;
            });
        }
        window.dispatchEvent(new CustomEvent('crm:sync', {detail:{state:'ready',at:Date.now()}}));
        return true;
    } catch (error) {
        console.error('Enquiry refresh failed:', error);
        if (!enquiriesLoaded) renderTableError('Unable to load enquiries. Check your connection and use Refresh.');
        window.dispatchEvent(new CustomEvent('crm:sync', {detail:{state:'error'}}));
        showToast('Refresh failed. Your last loaded leads are still available. Use Refresh to retry.', 'error');
        return false;
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
                    lead.preferred_area,
                    lead.preferred_city,
                    lead.source,
                    lead.location,
                    lead.occasion,
                    lead.requirements,
                    lead.contact_remark,
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

    filteredLeads = filteredLeads.filter(lead => matchesWorkView(lead, currentWorkView));
    if (['overdue','today','unscheduled'].includes(currentWorkView)) {
        filteredLeads.sort((a,b) => (Date.parse(a.follow_up_at) || Infinity) - (Date.parse(b.follow_up_at) || Infinity));
    }
    const filterKey = [currentSearch, currentStatusFilter, currentWorkView].join('|');
    if (filterKey !== leadPageFilterKey) { leadPage = 1; leadPageFilterKey = filterKey; }
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
   LOCATION OPTIONS
   ========================================================= */

function getLocationOptions() {
    return [
        { value: "", label: "Select Location" },
        { value: "Delhi", label: "Delhi" },
        { value: "Delhi NCR", label: "Delhi NCR" },
        { value: "Gurgaon", label: "Gurgaon" },
        { value: "Noida", label: "Noida" },
        { value: "Greater Noida", label: "Greater Noida" },
        { value: "Faridabad", label: "Faridabad" },
        { value: "Ghaziabad", label: "Ghaziabad" }
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
    { value: "not-pick",      label: "Not Pick" },
    { value: "booked",        label: "Booked" },
    { value: "converted",     label: "Call Back" },
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

    if (selectedValue && !options.some(option => String(option.value) === String(selectedValue))) {
        const legacy = document.createElement("option");
        legacy.value = selectedValue;
        legacy.textContent = formatStatus(selectedValue) + " (existing)";
        legacy.selected = true;
        legacy.disabled = true;
        select.appendChild(legacy);
    }

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

    if (!hasComment) {
        return `
            <div class="crm-comment-cell crm-comment-empty" data-lead-id="${escapeHTML(id)}">
                <button
                    type="button"
                    class="comment-add-btn"
                    data-comment-action="edit"
                    data-id="${escapeHTML(id)}"
                    title="Add comment"
                    aria-label="Add comment"
                >＋</button>
            </div>
        `;
    }

    return `
        <div class="crm-comment-cell crm-comment-has-value" data-lead-id="${escapeHTML(id)}">
            <span class="crm-comment-yes" title="Comment saved" aria-label="Comment saved">Y</span>
            <button
                type="button"
                class="comment-icon-btn comment-view-icon"
                data-comment-action="view"
                data-id="${escapeHTML(id)}"
                title="View comment"
                aria-label="View comment"
            ><span aria-hidden="true">◉</span></button>
            <button
                type="button"
                class="comment-icon-btn comment-edit-icon"
                data-comment-action="edit"
                data-id="${escapeHTML(id)}"
                title="Edit comment"
                aria-label="Edit comment"
            ><span aria-hidden="true">✎</span></button>
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

const preferredArea =
    lead.preferred_area ||
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
        safeValue(lead.internal_notes || lead.contact_remark).trim();

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

<td class="preferred-area-cell">
    ${createInlineField(
        lead,
        "preferred_area",
        preferredArea,
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
                    "select",
                    [
                        {value:"Delhi",label:"Delhi"},
                        {value:"Delhi NCR",label:"Delhi NCR"},
                        {value:"Gurgaon",label:"Gurgaon"},
                        {value:"Noida",label:"Noida"},
                        {value:"Greater Noida",label:"Greater Noida"},
                        {value:"Faridabad",label:"Faridabad"},
                        {value:"Ghaziabad",label:"Ghaziabad"}
                    ]
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
                    <span>Details</span>
                </button>

                <button
                    type="button"
                    class="venue-assign-btn"
                    data-action="assign-venue"
                    data-id="${escapeHTML(id)}"
                    title="Assign this enquiry to approved and verified venues"
                >
                    <span class="assign-icon" aria-hidden="true">＋</span>
                    <span>Assign</span>
                    ${getAssignmentCount(id) ? `<span class="venue-assignment-count">${getAssignmentCount(id)}</span>` : ""}
                </button>

            </td>

        </tr>
    `;
}

/* =========================================================
   RENDER TABLE
   ========================================================= */

let currentWorkView = 'all';
let leadPage = 1;
let leadPageFilterKey = '';
const leadPageSize = 50;
const terminalLeadStatuses = new Set(['booked','closed','lost','not-interested']);
const indiaDayFormatter = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'});
function indiaDay(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : indiaDayFormatter.format(date);
}
function matchesWorkView(lead, view, now = new Date()) {
    if (view === 'all') return true;
    if (terminalLeadStatuses.has(String(lead.status).toLowerCase())) return false;
    const due = Date.parse(lead.follow_up_at);
    if (view === 'today') return !!lead.follow_up_at && indiaDay(lead.follow_up_at) === indiaDay(now);
    if (view === 'overdue') return Number.isFinite(due) && due < now.getTime();
    if (view === 'unscheduled') return !lead.follow_up_at;
    if (view === 'unassigned') return !lead.assigned_to;
    if (view === 'new') return lead.status === 'new';
    return true;
}
function setupWorkViews() {
    const toolbar = document.getElementById('leadWorkViews');
    if (!toolbar || toolbar.dataset.ready) return;
    toolbar.dataset.ready = 'true';
    toolbar.addEventListener('click', event => {
        const button = event.target.closest('[data-work-view]');
        if (!button) return;
        currentWorkView = button.dataset.workView;
        applyFilters();
    });
    document.getElementById('leadPreviousPage')?.addEventListener('click', () => { leadPage--; renderLeads(); });
    document.getElementById('leadNextPage')?.addEventListener('click', () => { leadPage++; renderLeads(); });
}
function renderLeads() {
    setupWorkViews();
    const pages = Math.max(1, Math.ceil(filteredLeads.length / leadPageSize));
    leadPage = Math.max(1, Math.min(leadPage, pages));
    document.querySelectorAll('[data-work-view]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.workView === currentWorkView));
        const count = allLeads.filter(lead => matchesWorkView(lead, button.dataset.workView)).length;
        button.querySelector('span').textContent = count;
    });
    const pageLabel = document.getElementById('leadPageLabel');
    if (pageLabel) pageLabel.textContent = filteredLeads.length ? `${(leadPage-1)*leadPageSize+1}–${Math.min(leadPage*leadPageSize, filteredLeads.length)} of ${filteredLeads.length} matching leads` : 'No matching leads';
    const previous = document.getElementById('leadPreviousPage');
    const next = document.getElementById('leadNextPage');
    if (previous) previous.disabled = leadPage === 1;
    if (next) next.disabled = leadPage === pages;


    const resultCount = document.getElementById("leadResultCount");
    if (resultCount) {
        const shown = filteredLeads.length;
        const total = allLeads.length;

        resultCount.textContent =
            shown === total
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
            .slice((leadPage - 1) * leadPageSize, leadPage * leadPageSize)
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

    else if (field === "location") {

        editor =
            createSelectEditor(
                getLocationOptions(),
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
                .update(
                    (field === "preferred_area" || field === "location")
                        ? {
                            [field]: value,
                            preferred_latitude: null,
                            preferred_longitude: null,
                            preferred_geocoded_at: null
                          }
                        : {
                            [field]: value
                          }
                )
                .eq("updated_at", lead.updated_at)
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
        safeValue(lead.internal_notes || lead.contact_remark);

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

    /* Non-blocking draggable comment editor: keep all enquiry rows visible and usable. */
    overlay.classList.add("smv-comment-nonblocking");
    const card=overlay.querySelector(".crm-floating-card");
    const dragHandle=card?.querySelector("div");
    if(card&&dragHandle){
        dragHandle.classList.add("smv-comment-drag-handle");
        dragHandle.title="Drag comment box";
        let dragging=false,dx=0,dy=0;
        dragHandle.addEventListener("mousedown",event=>{
            if(event.target.closest("button,input,textarea,select,a"))return;
            const rect=card.getBoundingClientRect();
            dragging=true;dx=event.clientX-rect.left;dy=event.clientY-rect.top;
            card.style.position="fixed";card.style.left=rect.left+"px";card.style.top=rect.top+"px";card.style.margin="0";
            card.classList.add("smv-dragging");event.preventDefault();
        });
        document.addEventListener("mousemove",event=>{
            if(!dragging)return;
            const left=Math.max(0,Math.min(window.innerWidth-card.offsetWidth,event.clientX-dx));
            const top=Math.max(55,Math.min(window.innerHeight-100,event.clientY-dy));
            card.style.left=left+"px";card.style.top=top+"px";
        });
        document.addEventListener("mouseup",()=>{if(dragging){dragging=false;card.classList.remove("smv-dragging");}});
    }

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
        safeValue(lead.internal_notes || lead.contact_remark).trim();

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
                .eq("updated_at", lead.updated_at)
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
            "Comment not saved. Refresh and reopen the lead; another team member may have updated it.",
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

    const hasPreferredArea =
        !!safeValue(
            lead.preferred_area
        ).trim();

    const hasDate =
        !!safeValue(
            lead.event_date
        ).trim();

    const hasComment =
        !!safeValue(lead.internal_notes || lead.contact_remark).trim();

    if (hasPhone) score += 10;
    if (hasPreferredArea) score += 7;
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
        status === "booked"
    ) {
        recommendation =
            "Conversion achieved — maintain customer relationship and record final details.";
    }
    else if (status === "converted") {
        recommendation = "Call back the customer and schedule the next follow-up.";
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

    // Open the drawer first so an optional enhancement/history failure can never
    // make the Details button appear unresponsive.
    modal.hidden = false;
    document.body.style.overflow = "auto";

    try {
        populateLeadModal(lead);
    }
    catch (error) {
        console.error("Lead details populate error:", error);
        setText("#detailCustomerName", lead.customer_name || "—");
        setText("#detailPhone", lead.mobile || "—");
        showToast("Lead opened. Some optional details could not be prepared.", "warning");
    }

    try {
        applyPremiumModalEnhancement(modal, lead);
    }
    catch (error) {
        console.warn("Lead premium insight could not load:", error);
    }

    return lead;
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
        "#detailSource",
        lead.source ||
        ""
    );

    setControl(
        "#detailEventType",
        lead.occasion ||
        ""
    );

    const detailVenueControl = document.querySelector("#detailVenue");
    if (detailVenueControl?.tagName === "SELECT") {
        const currentLocation = safeValue(lead.location).trim();
        if (currentLocation && !Array.from(detailVenueControl.options).some(option => option.value === currentLocation)) {
            const legacyLocation = new Option(currentLocation + " (existing)", currentLocation);
            legacyLocation.dataset.legacy = "true";
            detailVenueControl.add(legacyLocation);
        }
    }
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
        lead.contact_remark ||
        ""
    );
    setControl("#detailPreferredCity", lead.preferred_city || "");
    setControl("#detailPreferredArea", lead.preferred_area || "");
    setControl("#detailVenueTypePref", lead.venue_type_preference || "");
    setControl("#detailBudget", lead.budget_per_person ?? "");
    setControl("#detailRoomsRequired", lead.rooms_required ?? "");
    setControl("#detailFoodPref", lead.food_preference || "");
    const setReqCheck=(id,value)=>{const el=document.getElementById(id);if(el)el.checked=value===true;};
    setReqCheck("detailParkingRequired",lead.parking_required);
    setReqCheck("detailOutdoorPreferred",lead.outdoor_preferred);
    setReqCheck("detailIndoorPreferred",lead.indoor_preferred);


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

    if (!getStatusOptions().some(option => option.value === current)) {
        const legacy = document.createElement("option");
        legacy.value = current;
        legacy.textContent = formatStatus(current) + " (existing)";
        legacy.disabled = true;
        element.appendChild(legacy);
    }

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

    if (element.tagName === 'SELECT' && selector === '#detailAssignedTo' && value && !Array.from(element.options).some(option => option.value === String(value))) {
        element.add(new Option('Previously assigned employee', String(value)));
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

    if (assigned && !assigned.disabled) {

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

    const reqVal=id=>safeValue(document.getElementById(id)?.value).trim();
    const reqChecked=id=>Boolean(document.getElementById(id)?.checked);
    data.preferred_city=reqVal("detailPreferredCity")||null;
    data.preferred_area=reqVal("detailPreferredArea")||null;
    data.venue_type_preference=reqVal("detailVenueTypePref")||null;
    data.budget_per_person=reqVal("detailBudget")?Number(reqVal("detailBudget")):null;
    data.rooms_required=reqVal("detailRoomsRequired")?Number(reqVal("detailRoomsRequired")):null;
    data.food_preference=reqVal("detailFoodPref")||null;
    data.parking_required=reqChecked("detailParkingRequired");
    data.outdoor_preferred=reqChecked("detailOutdoorPreferred");
    data.indoor_preferred=reqChecked("detailIndoorPreferred");
    data.requirements_structured={city:data.preferred_city,area:data.preferred_area,venue_type:data.venue_type_preference,budget_per_person:data.budget_per_person,rooms:data.rooms_required,food:data.food_preference,parking:data.parking_required,outdoor:data.outdoor_preferred,indoor:data.indoor_preferred};

    const previousGeoKey = [safeValue(currentLead.preferred_area).trim(), safeValue(currentLead.preferred_city || currentLead.location).trim()].join("|").toLowerCase();
    const nextGeoKey = [safeValue(data.preferred_area).trim(), safeValue(data.preferred_city || data.location).trim()].join("|").toLowerCase();
    if (previousGeoKey !== nextGeoKey) {
        data.preferred_latitude = null;
        data.preferred_longitude = null;
        data.preferred_geocoded_at = null;
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
                .eq("updated_at", currentLead.updated_at)
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

        const savedLead = currentLead;

        closeLeadModal();

        showToast(
            "Enquiry updated successfully."
        );

        // Smart assignment workflow: immediately open the full-screen match board
        // after saved enquiry details/comments are committed. Matching is prepared
        // automatically, but the final venue assignment still requires a staff click.
        if (window.SMV_AUTO_MATCH_AFTER_SAVE !== false && savedLead?.id) {
            window.setTimeout(() => {
                try {
                    openVenueAssignmentModal(savedLead.id);
                } catch (matchError) {
                    console.warn("Automatic venue match board could not open:", matchError);
                }
            }, 120);
        }

        return { ok: true, lead: savedLead, leadId };

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
        return { ok: false, error, leadId };
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

async function submitAddEnquiry(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.dataset.saving === 'true') return;
    form.dataset.saving = 'true';
    const button = form.querySelector('[type="submit"]');
    if (button) button.disabled = true;
    try { return await performAddEnquiry(event); }
    finally { delete form.dataset.saving; if (button) button.disabled = false; }
}
async function performAddEnquiry(
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

        preferred_area:
            get("preferred_area") ||
            get("customerPreferredArea") ||
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

        if (window.SMV_AUTO_MATCH_AFTER_SAVE !== false && created?.id) {
            window.setTimeout(() => {
                try {
                    openVenueAssignmentModal(created.id);
                } catch (matchError) {
                    console.warn("Automatic venue match board could not open for new enquiry:", matchError);
                }
            }, 120);
        }

        return { ok: true, lead: created, leadId: created?.id };

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
        return { ok: false, error };
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
        async event => {

            if (
                button.type !==
                "submit"
            ) {
                event.preventDefault();
            }

            if (button.disabled) return;
            button.disabled = true;
            const label = button.textContent;
            button.textContent = 'Saving…';
            try { await saveModalChanges(); }
            finally { button.disabled = false; button.textContent = label; }
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
   LEAD DETAILS DRAG
   ========================================================= */

function setupLeadDetailsDrag() {

    const modal =
        document.getElementById(
            "leadModal"
        );

    const card =
        modal?.querySelector(
            ".lead-modal-card"
        );

    const handle =
        card?.querySelector(
            ".modal-header"
        );

    if (
        !modal ||
        !card ||
        !handle ||
        card.dataset.smvCoreDragReady === "1"
    ) {
        return;
    }

    card.dataset.smvCoreDragReady =
        "1";

    handle.classList.add(
        "smv-core-drag-handle"
    );

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    handle.addEventListener(
        "mousedown",
        event => {

            if (
                event.button !== 0 ||
                event.target.closest(
                    "button,input,select,textarea,a"
                )
            ) {
                return;
            }

            const rect =
                card.getBoundingClientRect();

            dragging = true;
            offsetX =
                event.clientX - rect.left;
            offsetY =
                event.clientY - rect.top;

            card.style.setProperty(
                "position",
                "fixed",
                "important"
            );

            card.style.setProperty(
                "left",
                rect.left + "px",
                "important"
            );

            card.style.setProperty(
                "top",
                rect.top + "px",
                "important"
            );

            card.style.setProperty(
                "right",
                "auto",
                "important"
            );

            card.style.setProperty(
                "bottom",
                "auto",
                "important"
            );

            card.style.setProperty(
                "margin",
                "0",
                "important"
            );

            card.classList.add(
                "smv-dragging"
            );

            event.preventDefault();
        }
    );

    document.addEventListener(
        "mousemove",
        event => {

            if (!dragging) {
                return;
            }

            const maxLeft =
                Math.max(
                    0,
                    window.innerWidth -
                    card.offsetWidth
                );

            const maxTop =
                Math.max(
                    56,
                    window.innerHeight -
                    Math.min(
                        card.offsetHeight,
                        140
                    )
                );

            const left =
                Math.max(
                    0,
                    Math.min(
                        maxLeft,
                        event.clientX -
                        offsetX
                    )
                );

            const top =
                Math.max(
                    56,
                    Math.min(
                        maxTop,
                        event.clientY -
                        offsetY
                    )
                );

            card.style.setProperty(
                "left",
                left + "px",
                "important"
            );

            card.style.setProperty(
                "top",
                top + "px",
                "important"
            );

            card.style.setProperty(
                "right",
                "auto",
                "important"
            );

            card.style.setProperty(
                "bottom",
                "auto",
                "important"
            );
        }
    );

    document.addEventListener(
        "mouseup",
        () => {

            if (!dragging) {
                return;
            }

            dragging = false;

            card.classList.remove(
                "smv-dragging"
            );
        }
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

            const addModal =
                document.getElementById(
                    "addEnquiryModal"
                );

            const venueModal =
                document.getElementById(
                    "venueModal"
                );

            /* Protect important data-entry forms from accidental ESC. */
            if (
                (addModal && !addModal.hidden) ||
                (venueModal && !venueModal.hidden)
            ) {
                return;
            }

            const leadModal =
                document.getElementById(
                    "leadModal"
                );

            const assignmentModal =
                document.getElementById(
                    "venueAssignmentModal"
                );

            const historyModal =
                document.getElementById(
                    "smvVenueHistoryModal"
                );

            const whatsappQueue =
                document.getElementById(
                    "smvWhatsAppQueue"
                );

            const actionDrawer =
                document.getElementById(
                    "smvOpsDrawer"
                );

            let handled = false;

            if (
                document.getElementById("commentEditorOverlay") ||
                document.getElementById("commentViewOverlay")
            ) {
                closeFloatingOverlay();
                handled = true;
            }
            else if (
                assignmentModal &&
                !assignmentModal.hidden
            ) {
                closeVenueAssignmentModal();
                handled = true;
            }
            else if (
                historyModal &&
                !historyModal.hidden
            ) {
                historyModal.hidden = true;
                document.body.style.overflow = "";
                handled = true;
            }
            else if (
                whatsappQueue &&
                !whatsappQueue.hidden
            ) {
                whatsappQueue.hidden = true;
                handled = true;
            }
            else if (
                actionDrawer &&
                actionDrawer.getAttribute("aria-hidden") === "false"
            ) {
                document.getElementById("smvOpsBackdrop")?.classList.remove("show");
                actionDrawer.classList.remove("show");
                actionDrawer.setAttribute("aria-hidden", "true");
                handled = true;
            }
            else if (
                leadModal &&
                !leadModal.hidden
            ) {
                closeLeadModal();
                handled = true;
            }

            if (handled) {
                event.preventDefault();
                event.stopPropagation();
            }
        },
        true
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

    if (String(status).toLowerCase() === "converted") {
        return "Call Back";
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
let venuePlanFilter = "all";
let stage8SchemaReady = false;
let stage8Plans = [];
let stage8ActivePartnerCount = 0;
let currentVenuePartnerProfile = null;
let currentVenueCoverImageUrl = "";
let pendingVenueCoverImageFile = null;
let pendingVenueCoverPreviewUrl = "";
let pendingVenueCoverRemoval = false;
let venueSaveInFlight = false;

function resetVenueSaveState() {
    venueSaveInFlight = false;

    const button = document.getElementById("saveVenueBtn");

    if (button) {
        button.disabled = false;
        button.removeAttribute("aria-busy");
        delete button.dataset.smvSaving;
        button.textContent = "Save Venue";
    }

    const form = document.getElementById("venueForm");

    if (form) {
        form.removeAttribute("aria-busy");
        delete form.dataset.smvSavingVenueId;
    }
}

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
    const plan = document.getElementById("venuePlanFilter");
    const table = document.getElementById("venueTableBody");
    const partnerInviteButton = document.getElementById("sendPartnerInviteBtn");
    const coverImageInput = document.getElementById("venueCoverImage");
    const replaceCoverButton = document.getElementById("replaceVenueCoverBtn");
    const removeCoverButton = document.getElementById("removeVenueCoverBtn");

    if (!venueBtn || !form || !table) {
        return;
    }

    /* Venue data uses text columns in Supabase. Handle validation here so the browser
       never silently blocks Save because an off-screen URL/email field is imperfect. */
    form.noValidate = true;

    venueBtn.addEventListener("click", openVenueManagement);
    backBtn?.addEventListener("click", showLeadManagement);
    addBtn?.addEventListener("click", () => openVenueModal());
    refreshBtn?.addEventListener("click", loadVenues);
    closeBtn?.addEventListener("click", closeVenueModal);
    cancelBtn?.addEventListener("click", closeVenueModal);

    form.addEventListener("submit", saveVenue);

    /* Save Venue is handled at document capture phase so no later wrapper,
       modal re-render, or stale submit state can swallow the second click. */
    if (document.documentElement.dataset.smvVenueSaveDelegated !== "1") {
        document.documentElement.dataset.smvVenueSaveDelegated = "1";

        document.addEventListener("click", event => {
            const saveButton = event.target.closest?.("#saveVenueBtn");

            if (!saveButton) {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();

            const venueModal = document.getElementById("venueModal");

            if (!venueModal || venueModal.hidden) {
                return;
            }

            /* A stale disabled state must never make the next venue unclickable. */
            if (saveButton.disabled) {
                saveButton.disabled = false;
            }

            saveVenue(event);
        }, true);
    }

    partnerInviteButton?.addEventListener("click", sendPartnerInvite);
    coverImageInput?.addEventListener("change", handleVenueCoverSelection);
    replaceCoverButton?.addEventListener("click", () => coverImageInput?.click());
    removeCoverButton?.addEventListener("click", handleVenueCoverRemoval);

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

    plan?.addEventListener("change", event => {
        venuePlanFilter = event.target.value;
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

    loadStage8Capabilities()
        .finally(loadVenues);
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
                        <td colspan="11" class="venue-loading-cell">
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
                    <td colspan="11" class="venue-loading-cell">
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
    await loadStage8Analytics();
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

    const publicVenues =
        allVenues.filter(
            venue => venue.public_listing_enabled === true
        ).length;

    const values = {
        venueTotalCount: total,
        venueApprovedCount: approved,
        venuePendingCount: pending,
        venueVerifiedCount: verified,
        venuePublicCount: publicVenues,
        venuePartnerCount: stage8ActivePartnerCount
    };

    Object.entries(values).forEach(([id, value]) => {

        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    });
}

async function loadStage8Capabilities() {
    const client = getSupabaseClient();
    const state = document.getElementById("stage8SchemaState");

    if (!client) {
        return false;
    }

    /* Safe lifecycle maintenance only: this RPC never hides a venue or changes
       listing/verification. It only marks an expired launch-trial status. */
    try {
        await client.rpc("smv_refresh_trial_statuses");
    } catch (error) {
        console.warn("Trial status refresh skipped:", error);
    }

    const { data: plans, error: planError } =
        await client
            .from("venue_plans")
            .select("plan_code,plan_name,description,display_order,features,is_active")
            .eq("is_active", true)
            .order("display_order", { ascending: true });

    stage8SchemaReady = !planError;
    stage8Plans = stage8SchemaReady && Array.isArray(plans)
        ? plans
        : [];

    if (stage8SchemaReady) {
        const { data: partnerRows, error: partnerError } =
            await client
                .from("venue_partner_profiles")
                .select("venue_id")
                .eq("is_active", true);

        stage8ActivePartnerCount = partnerError
            ? 0
            : new Set((partnerRows || []).map(row => row.venue_id).filter(Boolean)).size;
    } else {
        stage8ActivePartnerCount = 0;
        console.info(
            "Growth & Insights database setup is not active yet:",
            planError?.message || "venue_plans unavailable"
        );
    }

    if (state) {
        state.textContent = stage8SchemaReady
            ? "Growth tools connected"
            : "Growth setup pending";
        state.classList.toggle("pending", !stage8SchemaReady);
    }

    populateVenuePlanOptions();
    setStage8FormAvailability();
    updateVenueStats();

    return stage8SchemaReady;
}

function populateVenuePlanOptions() {
    if (!stage8Plans.length) {
        return;
    }

    const options = stage8Plans
        .map(plan => `
            <option value="${escapeHTML(plan.plan_code)}">
                ${escapeHTML(plan.plan_name)}
            </option>
        `)
        .join("");

    const formSelect = document.getElementById("venuePlan");
    const filterSelect = document.getElementById("venuePlanFilter");

    if (formSelect) {
        const selected = formSelect.value;
        formSelect.innerHTML = options;
        if (selected) {
            formSelect.value = selected;
        }
    }

    if (filterSelect) {
        const selected = filterSelect.value || "all";
        filterSelect.innerHTML = `
            <option value="all">All Plans</option>
            ${options}
        `;
        filterSelect.value = selected;
    }
}

function setStage8FormAvailability() {
    const ids = [
        "venuePlan",
        "venuePlanStatus",
        "venuePlanStartedAt",
        "venuePlanExpiresAt",
        "venuePublicListing"
    ];

    ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.disabled = !stage8SchemaReady;
        }
    });

    const notice = document.getElementById("stage8FormNotice");
    if (notice) {
        notice.hidden = stage8SchemaReady;
    }
}

function formatResponseMinutes(value) {
    const minutes = Number(value);

    if (!Number.isFinite(minutes) || minutes <= 0) {
        return "—";
    }

    if (minutes < 60) {
        return `${Math.round(minutes)} min`;
    }

    if (minutes < 1440) {
        return `${(minutes / 60).toFixed(minutes < 600 ? 1 : 0)} hr`;
    }

    return `${(minutes / 1440).toFixed(1)} day`;
}

function getLocalNetworkAnalytics() {
    const total = allVenueAssignments.length;
    const respondedStatuses = new Set([
        "contacted",
        "detailed_shared",
        "detail-shared",
        "follow_up",
        "follow-up",
        "site_visit",
        "site-visit",
        "negotiation",
        "booked",
        "converted"
    ]);
    const terminal = new Set(["booked", "converted", "lost", "cancelled"]);
    const now = Date.now();

    const responded = allVenueAssignments.filter(item =>
        item.first_contacted_at ||
        respondedStatuses.has(safeValue(item.assignment_status).toLowerCase())
    ).length;

    const bookings = allVenueAssignments.filter(item =>
        ["booked", "converted"].includes(
            safeValue(item.assignment_status).toLowerCase()
        )
    ).length;

    const unresponded = allVenueAssignments.filter(item => {
        const status = safeValue(item.assignment_status).toLowerCase();
        const assignedAt = new Date(item.assigned_at).getTime();
        return (
            !terminal.has(status) &&
            !item.first_contacted_at &&
            Number.isFinite(assignedAt) &&
            now - assignedAt > 24 * 60 * 60 * 1000
        );
    }).length;

    const responseTimes = allVenueAssignments
        .map(item => {
            const assignedAt = new Date(item.assigned_at).getTime();
            const contactedAt = new Date(item.first_contacted_at).getTime();
            return (
                Number.isFinite(assignedAt) &&
                Number.isFinite(contactedAt) &&
                contactedAt >= assignedAt
            )
                ? (contactedAt - assignedAt) / 60000
                : null;
        })
        .filter(value => value !== null);

    return {
        total_assignments: total,
        responded,
        bookings,
        unresponded_24h: unresponded,
        response_rate: total ? (responded / total) * 100 : 0,
        conversion_rate: total ? (bookings / total) * 100 : 0,
        avg_response_minutes: responseTimes.length
            ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length
            : 0
    };
}

async function loadStage8Analytics() {
    const client = getSupabaseClient();
    let analytics = getLocalNetworkAnalytics();

    if (client && stage8SchemaReady) {
        const { data, error } = await client.rpc("smv_admin_analytics");

        if (!error && data) {
            analytics = data;
        } else if (error) {
            console.warn("Growth analytics RPC fallback:", error.message);
        }
    }

    const values = {
        networkAssignments: analytics.total_assignments || 0,
        networkResponseRate: `${Number(analytics.response_rate || 0).toFixed(1)}%`,
        networkResponseTime: formatResponseMinutes(analytics.avg_response_minutes),
        networkBookings: analytics.bookings || 0,
        networkConversionRate: `${Number(analytics.conversion_rate || 0).toFixed(1)}%`,
        networkUnresponded: analytics.unresponded_24h || 0
    };

    Object.entries(values).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });

    renderPlanDistribution();
}

function renderPlanDistribution() {
    const container = document.getElementById("planDistribution");
    if (!container) {
        return;
    }

    const planCodes = stage8Plans.length
        ? stage8Plans.map(plan => plan.plan_code)
        : ["launch_trial", "partner", "growth", "premium"];

    container.innerHTML = planCodes
        .map(code => {
            const count = allVenues.filter(
                venue => safeValue(venue.partner_plan || "launch_trial") === code
            ).length;

            return `
                <span class="plan-distribution-pill">
                    ${escapeHTML(formatVenuePlan(code))}
                    <strong>${count}</strong>
                </span>
            `;
        })
        .join("");
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

        if (
            venuePlanFilter !== "all" &&
            safeValue(venue.partner_plan || "launch_trial") !== venuePlanFilter
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
                            safeValue(venue.owner_name || venue.contact_person) || "No owner/contact person"
                        )}</small>
                        <button
                            type="button"
                            class="venue-name-details-btn"
                            data-venue-id="${escapeHTML(venue.id)}"
                        >
                            Details
                        </button>
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
                    <span class="venue-plan-pill">
                        ${escapeHTML(formatVenuePlan(venue.partner_plan))}
                    </span>
                </td>

                <td>
                    <span class="venue-public-pill ${venue.public_listing_enabled === true ? "live" : "hidden"}">
                        ${venue.public_listing_enabled === true ? "Live" : "Hidden"}
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

function formatVenuePlan(value) {
    const labels = {
        launch_trial: "Launch Trial",
        partner: "Partner",
        growth: "Growth",
        premium: "Premium"
    };

    return labels[safeValue(value)] || formatVenueLabel(value || "launch_trial");
}

function toDateInputValue(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toISOString().slice(0, 10);
}

function renderVenueEventTypes(values) {
    const host = document.getElementById('venueEventTypes');
    if (!host) return;
    const saved = (Array.isArray(values) ? values : String(values || '').split(',')).map(v => String(v).trim()).filter(Boolean);
    const options = ['Wedding', 'Engagement', 'Birthday', 'Anniversary', 'Reception', 'Corporate Event', 'Party', 'Other'];
    const key = v => v.toLowerCase().replace(/\s+/g, ' ').trim();
    for (const value of saved) if (!options.some(x => key(x) === key(value))) options.push(value);
    host.replaceChildren();
    for (const value of options) {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = 'venueEventTypes';
        input.value = value;
        input.checked = saved.some(x => key(x) === key(value));
        label.append(input, document.createTextNode(' ' + value));
        host.append(label);
    }
}
function selectedVenueEventTypes() {
    return Array.from(document.querySelectorAll('#venueEventTypes input:checked')).map(input => input.value);
}

function openVenueModal(venue = null) {

    const modal = document.getElementById("venueModal");
    const form = document.getElementById("venueForm");

    if (!modal || !form) {
        return;
    }

    setVenueDetailsMode(false);
    resetVenueSaveState();
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

    setVenueField(
        "venuePlan",
        venue?.partner_plan || "launch_trial"
    );

    setVenueField(
        "venuePlanStatus",
        venue?.plan_status || "trialing"
    );

    setVenueField(
        "venuePlanStartedAt",
        toDateInputValue(venue?.plan_started_at)
    );

    setVenueField(
        "venuePlanExpiresAt",
        toDateInputValue(venue?.plan_expires_at)
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
    setVenueField("venueRoomCount", venue?.room_count);
    setVenueField("venueParkingCapacity", venue?.parking_capacity);
    renderVenueEventTypes(venue?.event_types);
    setVenueField("venueFacilities", Array.isArray(venue?.facilities) ? venue.facilities.join(", ") : venue?.facilities);
    setVenueField("venueMatchingNotes", venue?.matching_notes);
    setVenueChecked("venueIndoor", venue?.indoor_available === true);
    setVenueChecked("venueOutdoor", venue?.outdoor_available === true);
    setVenueChecked("venueAlcohol", venue?.alcohol_allowed === true);
    setVenueChecked("venueOutsideCatering", venue?.outside_catering_allowed === true);


    setVenueChecked(
        "venueFeatured",
        venue?.featured === true
    );

    setVenueChecked(
        "venuePublicListing",
        venue?.public_listing_enabled === true
    );

    resetVenueCoverEditor(venue);

    resetPartnerAccessPanel(venue);

    if (venue?.id) {
        loadVenuePartnerAccess(venue.id);
    }

    setStage8FormAvailability();

    modal.hidden = false;
}

function setVenueDetailsMode(enabled) {
    const modal = document.getElementById("venueModal");
    const form = document.getElementById("venueForm");
    const cancelButton = document.getElementById("cancelVenueBtn");
    const saveButton = document.getElementById("saveVenueBtn");

    if (!modal || !form) {
        return;
    }

    modal.classList.toggle("venue-readonly-mode", Boolean(enabled));

    form.querySelectorAll("input,select,textarea,button").forEach(control => {
        if (control.id === "cancelVenueBtn") {
            return;
        }

        if (enabled) {
            control.dataset.smvPreviousDisabled = control.disabled ? "1" : "0";
            control.disabled = true;
        }
        else if (control.dataset.smvPreviousDisabled !== undefined) {
            control.disabled = control.dataset.smvPreviousDisabled === "1";
            delete control.dataset.smvPreviousDisabled;
        }
    });

    if (saveButton) {
        saveButton.hidden = Boolean(enabled);
    }

    if (cancelButton) {
        cancelButton.textContent = enabled ? "Close" : "Cancel";
    }
}

function openVenueDetails(venue) {
    if (!venue) {
        return;
    }

    openVenueModal(venue);
    setVenueDetailsMode(true);

    const title = document.getElementById("venueModalTitle");
    if (title) {
        title.textContent = "Venue Details";
    }
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

    resetVenueSaveState();
    currentVenuePartnerProfile = null;
    clearPendingVenueCoverPreview();
    pendingVenueCoverImageFile = null;
    pendingVenueCoverRemoval = false;
}

function clearPendingVenueCoverPreview() {
    if (pendingVenueCoverPreviewUrl) {
        URL.revokeObjectURL(pendingVenueCoverPreviewUrl);
        pendingVenueCoverPreviewUrl = "";
    }
}

function setVenueMediaStatus(message = "", type = "") {
    const element = document.getElementById("venueCoverUploadStatus");

    if (!element) {
        return;
    }

    element.textContent = message;
    element.className = `venue-media-status${type ? ` ${type}` : ""}`;
}

function renderVenueCoverPreview(url, venueName = "Venue") {
    const preview = document.getElementById("venueCoverPreview");
    const image = document.getElementById("venueCoverPreviewImage");
    const label = document.getElementById("venueCoverPreviewLabel");

    if (!preview || !image || !label) {
        return;
    }

    const safeUrl = safeValue(url).trim();

    if (!safeUrl) {
        image.hidden = true;
        image.removeAttribute("src");
        image.alt = "Venue cover preview";
        preview.classList.add("is-empty");
        label.hidden = false;
        label.textContent = "No cover image added";
        return;
    }

    image.src = safeUrl;
    image.alt = `${safeValue(venueName).trim() || "Venue"} cover image`;
    image.hidden = false;
    preview.classList.remove("is-empty");
    label.hidden = true;
}

function updateVenueMediaActions() {
    const replaceButton = document.getElementById("replaceVenueCoverBtn");
    const removeButton = document.getElementById("removeVenueCoverBtn");

    if (replaceButton) {
        replaceButton.textContent = pendingVenueCoverImageFile
            ? "Choose Different Image"
            : currentVenueCoverImageUrl && !pendingVenueCoverRemoval
                ? "Replace Cover Image"
                : "Add Cover Image";
    }

    if (!removeButton) {
        return;
    }

    removeButton.hidden = !(
        pendingVenueCoverImageFile ||
        currentVenueCoverImageUrl ||
        pendingVenueCoverRemoval
    );
    removeButton.classList.toggle("is-undo", pendingVenueCoverRemoval);
    removeButton.classList.toggle("danger", !pendingVenueCoverRemoval);
    removeButton.textContent = pendingVenueCoverRemoval
        ? "Undo Removal"
        : pendingVenueCoverImageFile
            ? "Clear Selected Image"
            : "Remove Cover Image";
}

function resetVenueCoverEditor(venue = null) {
    clearPendingVenueCoverPreview();
    pendingVenueCoverImageFile = null;
    pendingVenueCoverRemoval = false;
    currentVenueCoverImageUrl = safeValue(venue?.cover_image_url).trim();

    const input = document.getElementById("venueCoverImage");
    if (input) {
        input.value = "";
    }

    renderVenueCoverPreview(
        currentVenueCoverImageUrl,
        venue?.venue_name || "Venue"
    );

    setVenueMediaStatus(
        currentVenueCoverImageUrl
            ? "Current cover image is live on the public venue profile."
            : "Choose an image to add a visual public profile."
    );
    updateVenueMediaActions();
}

function handleVenueCoverRemoval() {
    const input = document.getElementById("venueCoverImage");

    if (pendingVenueCoverImageFile) {
        clearPendingVenueCoverPreview();
        pendingVenueCoverImageFile = null;
        if (input) {
            input.value = "";
        }
        renderVenueCoverPreview(
            currentVenueCoverImageUrl,
            document.getElementById("venueName")?.value || "Venue"
        );
        setVenueMediaStatus(
            currentVenueCoverImageUrl
                ? "Selected replacement cleared. The current cover will remain."
                : "Selected image cleared."
        );
        updateVenueMediaActions();
        return;
    }

    if (pendingVenueCoverRemoval) {
        pendingVenueCoverRemoval = false;
        renderVenueCoverPreview(
            currentVenueCoverImageUrl,
            document.getElementById("venueName")?.value || "Venue"
        );
        setVenueMediaStatus("Cover image removal cancelled.");
        updateVenueMediaActions();
        return;
    }

    if (!currentVenueCoverImageUrl) {
        return;
    }

    pendingVenueCoverRemoval = true;
    renderVenueCoverPreview("", document.getElementById("venueName")?.value || "Venue");
    setVenueMediaStatus(
        "Cover image will be removed from the public venue profile when you save the venue.",
        "error"
    );
    updateVenueMediaActions();
}

function handleVenueCoverSelection(event) {
    const input = event.currentTarget;
    const file = input?.files?.[0] || null;

    clearPendingVenueCoverPreview();
    pendingVenueCoverImageFile = null;
    pendingVenueCoverRemoval = false;

    if (!file) {
        renderVenueCoverPreview(
            currentVenueCoverImageUrl,
            document.getElementById("venueName")?.value || "Venue"
        );
        setVenueMediaStatus(
            currentVenueCoverImageUrl
                ? "Current cover image will remain unchanged."
                : "Choose an image to add a visual public profile."
        );
        updateVenueMediaActions();
        return;
    }

    const allowedTypes = new Set([
        "image/jpeg",
        "image/png",
        "image/webp"
    ]);

    if (!allowedTypes.has(file.type)) {
        input.value = "";
        renderVenueCoverPreview(currentVenueCoverImageUrl);
        setVenueMediaStatus("Please choose a JPG, PNG or WebP image.", "error");
        updateVenueMediaActions();
        return;
    }

    if (file.size > 6 * 1024 * 1024) {
        input.value = "";
        renderVenueCoverPreview(currentVenueCoverImageUrl);
        setVenueMediaStatus("The cover image must be 6 MB or smaller.", "error");
        updateVenueMediaActions();
        return;
    }

    pendingVenueCoverImageFile = file;
    pendingVenueCoverRemoval = false;
    pendingVenueCoverPreviewUrl = URL.createObjectURL(file);

    renderVenueCoverPreview(
        pendingVenueCoverPreviewUrl,
        document.getElementById("venueName")?.value || "Venue"
    );

    setVenueMediaStatus(
        "Image ready. It will upload when you save the venue.",
        "success"
    );
    updateVenueMediaActions();
}

function setPartnerAccessMessage(message, type = "") {
    const element = document.getElementById("partnerAccessMessage");

    if (!element) {
        return;
    }

    element.textContent = message;
    element.className = "partner-access-message" + (type ? ` ${type}` : "");
}

function setPartnerAccessStatus(message, type = "pending") {
    const element = document.getElementById("partnerAccessStatus");

    if (!element) {
        return;
    }

    element.textContent = message;
    element.className = "partner-access-status" + (type ? ` ${type}` : "");
}

function resetPartnerAccessPanel(venue = null) {
    currentVenuePartnerProfile = null;

    setVenueField("partnerAccessName", venue?.contact_person);
    setVenueField("partnerAccessEmail", venue?.contact_email);
    setVenueField("partnerAccessMobile", venue?.contact_mobile);
    setVenueField("partnerAccessWhatsapp", venue?.whatsapp_number);

    const button = document.getElementById("sendPartnerInviteBtn");

    if (button) {
        button.disabled = !venue?.id;
        button.textContent = "Send Partner Invite";
    }

    if (venue?.id) {
        setPartnerAccessStatus("Checking access…", "pending");
        setPartnerAccessMessage("Checking whether this venue already has a Partner CRM login.");
    } else {
        setPartnerAccessStatus("Save venue first", "pending");
        setPartnerAccessMessage("Add and save the venue before creating Partner CRM access.");
    }
}

async function loadVenuePartnerAccess(venueId) {
    const client = getSupabaseClient();

    if (!client || !venueId) {
        return;
    }

    const { data, error } = await client
        .from("venue_partner_profiles")
        .select("id,venue_id,user_id,full_name,email,mobile,whatsapp_number,is_primary,is_active")
        .eq("venue_id", venueId)
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("Partner access check failed:", error);
        setPartnerAccessStatus("Unable to check", "error");
        setPartnerAccessMessage(
            "Partner access could not be checked. Refresh the CRM and try again.",
            "error"
        );
        return;
    }

    currentVenuePartnerProfile = data || null;

    if (data) {
        setVenueField("partnerAccessName", data.full_name);
        setVenueField("partnerAccessEmail", data.email);
        setVenueField("partnerAccessMobile", data.mobile);
        setVenueField("partnerAccessWhatsapp", data.whatsapp_number);
        setPartnerAccessStatus("Partner linked", "");
        setPartnerAccessMessage(
            `${data.email || "Partner account"} is linked to this venue. Use the button to resend a secure access email.`,
            "success"
        );

        const button = document.getElementById("sendPartnerInviteBtn");
        if (button) {
            button.disabled = false;
            button.textContent = "Resend Access Email";
        }
    } else {
        setPartnerAccessStatus("Ready to invite", "pending");
        setPartnerAccessMessage(
            "Enter the authorised partner details and send the secure invitation."
        );
    }
}

async function sendPartnerInvite() {
    const client = getSupabaseClient();
    const venueId = safeValue(document.getElementById("venueId")?.value).trim();
    const fullName = safeValue(document.getElementById("partnerAccessName")?.value).trim();
    const email = safeValue(document.getElementById("partnerAccessEmail")?.value).trim().toLowerCase();
    const mobile = safeValue(document.getElementById("partnerAccessMobile")?.value).trim();
    const whatsappNumber = safeValue(document.getElementById("partnerAccessWhatsapp")?.value).trim();
    const button = document.getElementById("sendPartnerInviteBtn");

    if (!client || !venueId) {
        setPartnerAccessMessage("Save the venue before creating Partner CRM access.", "error");
        return;
    }

    if (fullName.length < 2) {
        setPartnerAccessMessage("Enter the partner's full name.", "error");
        document.getElementById("partnerAccessName")?.focus();
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setPartnerAccessMessage("Enter a valid partner login email.", "error");
        document.getElementById("partnerAccessEmail")?.focus();
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = currentVenuePartnerProfile
            ? "Sending access email…"
            : "Creating partner access…";
    }

    setPartnerAccessStatus("Processing…", "pending");
    setPartnerAccessMessage("Securely creating and linking the Partner CRM account.");

    try {
        const { data, error } = await client.functions.invoke(
            "hyper-service",
            {
                body: {
                    venue_id: venueId,
                    full_name: fullName,
                    email,
                    mobile: mobile || null,
                    whatsapp_number: whatsappNumber || mobile || null
                }
            }
        );

        if (error) {
            let message = error.message || "Unable to create Partner CRM access.";

            try {
                const errorBody = await error.context?.json();
                message = errorBody?.error || message;
            }
            catch (contextError) {
                console.warn("Partner invite error body unavailable:", contextError);
            }

            throw new Error(message);
        }

        if (!data?.ok) {
            throw new Error(data?.error || "Unable to create Partner CRM access.");
        }

        const emailMessage = data.email_sent
            ? `A secure ${data.email_mode === "invite" ? "invitation" : "password access"} email was sent to ${email}.`
            : `The account was linked, but the email could not be sent. Ask the partner to use Forgot Password.`;

        setPartnerAccessStatus("Partner linked", "");
        setPartnerAccessMessage(emailMessage, data.email_sent ? "success" : "error");
        showToast(
            data.email_sent
                ? "Partner CRM access created and email sent."
                : "Partner linked. Access email needs to be resent.",
            data.email_sent ? "success" : "warning"
        );

        await loadVenuePartnerAccess(venueId);
    }
    catch (error) {
        console.error("Partner invite failed:", error);
        setPartnerAccessStatus("Invite failed", "error");
        setPartnerAccessMessage(
            error.message || "Unable to create Partner CRM access.",
            "error"
        );
        showToast(
            error.message || "Unable to create Partner CRM access.",
            "error"
        );
    }
    finally {
        if (button) {
            button.disabled = false;
            button.textContent = currentVenuePartnerProfile
                ? "Resend Access Email"
                : "Send Partner Invite";
        }
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

    const stage8Fields = stage8SchemaReady
        ? {
            partner_plan:
                safeValue(
                    document.getElementById("venuePlan")?.value
                ) || "launch_trial",

            plan_status:
                safeValue(
                    document.getElementById("venuePlanStatus")?.value
                ) || "trialing",

            plan_started_at:
                safeValue(
                    document.getElementById("venuePlanStartedAt")?.value
                ) || null,

            plan_expires_at:
                safeValue(
                    document.getElementById("venuePlanExpiresAt")?.value
                ) || null,

            public_listing_enabled:
                checked("venuePublicListing")
        }
        : {};

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

        room_count: numberOrNull("venueRoomCount"),
        parking_capacity: numberOrNull("venueParkingCapacity"),
        event_types: selectedVenueEventTypes(),
        facilities: safeValue(document.getElementById("venueFacilities")?.value).split(",").map(v=>v.trim()).filter(Boolean),
        matching_notes: safeValue(document.getElementById("venueMatchingNotes")?.value).trim() || null,
        indoor_available: checked("venueIndoor"),
        outdoor_available: checked("venueOutdoor"),
        alcohol_allowed: checked("venueAlcohol"),
        outside_catering_allowed: checked("venueOutsideCatering"),

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
            checked("venueFeatured"),

        ...stage8Fields
    };
}

function venueCoverExtension(file) {
    const byType = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp"
    };

    return byType[file?.type] || "jpg";
}

function venueCoverStoragePath(url) {
    const marker = "/storage/v1/object/public/venue-media/";
    const value = safeValue(url).trim();
    const index = value.indexOf(marker);

    if (index < 0) {
        return "";
    }

    try {
        return decodeURIComponent(value.slice(index + marker.length));
    } catch (_) {
        return value.slice(index + marker.length);
    }
}

async function deleteVenueCoverStorageObject(url) {
    const client = getSupabaseClient();
    const path = venueCoverStoragePath(url);

    if (!client || !path) {
        return;
    }

    const { error } = await client.storage
        .from("venue-media")
        .remove([path]);

    if (error) {
        console.warn("Unable to remove previous venue cover object:", error);
    }
}

async function uploadVenueCoverImage(venueId, file) {
    const client = getSupabaseClient();

    if (!client || !venueId || !file) {
        throw new Error("Venue image upload is not ready.");
    }

    const path = `${venueId}/cover-${Date.now()}.${venueCoverExtension(file)}`;

    const { error: uploadError } = await client.storage
        .from("venue-media")
        .upload(path, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false
        });

    if (uploadError) {
        throw uploadError;
    }

    const { data: publicUrlData } = client.storage
        .from("venue-media")
        .getPublicUrl(path);

    const publicUrl = safeValue(publicUrlData?.publicUrl).trim();

    if (!publicUrl) {
        throw new Error("The uploaded image URL could not be created.");
    }

    const { error: updateError } = await client
        .from("venues")
        .update({ cover_image_url: publicUrl })
        .eq("id", venueId);

    if (updateError) {
        await client.storage.from("venue-media").remove([path]);
        throw updateError;
    }

    if (currentVenueCoverImageUrl && currentVenueCoverImageUrl !== publicUrl) {
        await deleteVenueCoverStorageObject(currentVenueCoverImageUrl);
    }

    return publicUrl;
}

async function removeVenueCoverImage(venueId, currentUrl) {
    const client = getSupabaseClient();

    if (!client || !venueId) {
        throw new Error("Venue image removal is not ready.");
    }

    const { error } = await client
        .from("venues")
        .update({ cover_image_url: null })
        .eq("id", venueId);

    if (error) {
        throw error;
    }

    await deleteVenueCoverStorageObject(currentUrl);
}

function prepareSavedVenueForPartnerAccess(venue) {
    if (!venue?.id) {
        return;
    }

    document.getElementById("venueId").value = venue.id;
    document.getElementById("venueModalTitle").textContent = "Edit Venue";

    const inviteButton = document.getElementById("sendPartnerInviteBtn");
    if (inviteButton) {
        inviteButton.disabled = false;
        inviteButton.textContent = "Send Partner Invite";
    }

    setPartnerAccessStatus("Ready to invite", "pending");
    setPartnerAccessMessage(
        "Venue saved. You can now send the secure Partner CRM invitation."
    );
}

function validateVenuePayload(payload) {
    const fail = (message, id) => {
        showToast(message, "error");
        const field = document.getElementById(id);
        if (field) {
            field.focus();
            field.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return false;
    };

    if (!payload.venue_name) return fail("Venue name is required.", "venueName");

    const email = safeValue(payload.contact_email).trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return fail("Please enter a valid venue email, or leave it blank.", "venueEmail");
    }

    const urlChecks = [
        ["google_maps_url", "venueMaps", "Google Maps URL"],
        ["website_url", "venueWebsite", "Website URL"],
        ["instagram_url", "venueInstagram", "Instagram URL"],
        ["facebook_url", "venueFacebook", "Facebook URL"]
    ];
    for (const [key, id, label] of urlChecks) {
        const value = safeValue(payload[key]).trim();
        if (value && !/^https?:\/\//i.test(value)) {
            return fail(label + " must start with http:// or https://", id);
        }
    }

    if (
        Number.isFinite(Number(payload.capacity_min)) &&
        Number.isFinite(Number(payload.capacity_max)) &&
        payload.capacity_min !== null &&
        payload.capacity_max !== null &&
        Number(payload.capacity_min) > Number(payload.capacity_max)
    ) {
        return fail("Minimum capacity cannot be higher than maximum capacity.", "venueCapacityMin");
    }

    if (
        Number.isFinite(Number(payload.price_min_per_person)) &&
        Number.isFinite(Number(payload.price_max_per_person)) &&
        payload.price_min_per_person !== null &&
        payload.price_max_per_person !== null &&
        Number(payload.price_min_per_person) > Number(payload.price_max_per_person)
    ) {
        return fail("Minimum price cannot be higher than maximum price.", "venuePriceMin");
    }

    if (
        payload.public_listing_enabled === true &&
        (
            payload.venue_status !== "approved" ||
            payload.verification_status !== "verified"
        )
    ) {
        return fail("A public venue must be both approved and verified.", "venuePublicListing");
    }

    return true;
}

async function saveVenue(event) {

    event.preventDefault();
    event.stopPropagation();

    if (venueSaveInFlight) {
        console.warn("Venue save ignored because another save is still marked in progress.");
        return;
    }

    const client = getSupabaseClient();

    if (!client) {
        return;
    }

    const id =
        safeValue(
            document.getElementById("venueId")?.value
        ).trim();

    const payload = getVenueFormData();
    const existingVenue = id
        ? allVenues.find(item => String(item.id) === String(id))
        : null;

    /* A changed Maps link must invalidate old coordinates so nearest-venue
       automation cannot keep using stale geography. */
    if (
        existingVenue &&
        safeValue(existingVenue.google_maps_url).trim() !==
        safeValue(payload.google_maps_url).trim()
    ) {
        payload.latitude = null;
        payload.longitude = null;
    }

    if (!validateVenuePayload(payload)) {
        return;
    }

    const button =
        document.getElementById("saveVenueBtn");

    venueSaveInFlight = true;

    const form = document.getElementById("venueForm");
    if (form) {
        form.setAttribute("aria-busy", "true");
        form.dataset.smvSavingVenueId = id || "new";
    }

    if (button) {
        button.disabled = false;
        button.setAttribute("aria-busy", "true");
        button.dataset.smvSaving = "1";
        button.textContent = "Saving...";
    }

    let result;

    try {
        if (id) {
            result = await client
                .from("venues")
                .update(payload)
                .eq("id", id)
                .select()
                .single();
        }
        else {
            const userResult = await client.auth.getUser();
            result = await client
                .from("venues")
                .insert({
                    ...payload,
                    created_by:
                        userResult.data?.user?.id || null
                })
                .select()
                .single();
        }
    }
    catch (saveError) {
        console.error("Venue save request failed:", saveError);
        showToast(
            "Unable to save venue: " +
            (saveError?.message || "Please try again."),
            "error"
        );
        resetVenueSaveState();
        return;
    }

    if (result?.error) {
        console.error(
            "Venue save error:",
            result.error
        );

        showToast(
            "Unable to save venue: " +
            result.error.message,
            "error"
        );

        resetVenueSaveState();
        return;
    }

    const savedVenue = result.data;
    let coverMediaError = null;

    if (pendingVenueCoverImageFile) {
        if (button) {
            button.textContent = "Uploading image...";
        }

        setVenueMediaStatus("Uploading cover image...");

        try {
            const publicUrl = await uploadVenueCoverImage(
                savedVenue.id,
                pendingVenueCoverImageFile
            );

            savedVenue.cover_image_url = publicUrl;
            currentVenueCoverImageUrl = publicUrl;
            pendingVenueCoverImageFile = null;
            pendingVenueCoverRemoval = false;
            clearPendingVenueCoverPreview();

            const input = document.getElementById("venueCoverImage");
            if (input) {
                input.value = "";
            }

            renderVenueCoverPreview(publicUrl, savedVenue.venue_name);
            setVenueMediaStatus("Cover image uploaded successfully.", "success");
            updateVenueMediaActions();
        } catch (error) {
            coverMediaError = error;
            console.error("Venue cover upload error:", error);
            setVenueMediaStatus(
                error.message || "Unable to upload the cover image.",
                "error"
            );
        }
    } else if (pendingVenueCoverRemoval && currentVenueCoverImageUrl) {
        if (button) {
            button.textContent = "Removing image...";
        }

        setVenueMediaStatus("Removing cover image...");

        try {
            await removeVenueCoverImage(savedVenue.id, currentVenueCoverImageUrl);
            savedVenue.cover_image_url = null;
            currentVenueCoverImageUrl = "";
            pendingVenueCoverRemoval = false;
            renderVenueCoverPreview("", savedVenue.venue_name);
            setVenueMediaStatus("Cover image removed successfully.", "success");
            updateVenueMediaActions();
        } catch (error) {
            coverMediaError = error;
            console.error("Venue cover removal error:", error);
            setVenueMediaStatus(
                error.message || "Unable to remove the cover image.",
                "error"
            );
        }
    }

    /* Reflect the successful database write immediately. A secondary list refresh
       must never make the first Save appear to fail. */
    const localIndex = allVenues.findIndex(item => String(item.id) === String(savedVenue.id));
    if (localIndex >= 0) {
        allVenues[localIndex] = { ...allVenues[localIndex], ...savedVenue };
    }
    else {
        allVenues.unshift(savedVenue);
    }

    /* Immediately turn a newly added/changed Maps link into coordinates in the
       background. The Save itself is already complete and is never blocked by geocoding. */
    if (safeValue(savedVenue.google_maps_url).trim() && typeof window.smvGeocodeVenueRecord === "function") {
        Promise.resolve(window.smvGeocodeVenueRecord(savedVenue))
            .then(point => {
                if (!point) return;
                const target = allVenues.find(item => String(item.id) === String(savedVenue.id));
                if (target) {
                    target.latitude = point.lat;
                    target.longitude = point.lon;
                }
            })
            .catch(error => console.warn("Venue coordinate enrichment failed:", error));
    }

    try {
        updateVenueStats();
        renderVenues();
    }
    catch (uiError) {
        console.warn("Venue saved, but the list refresh hit a UI error:", uiError);
    }
    finally {
        /* A successful database save must never leave the next venue locked,
           even if a secondary UI refresh fails. */
        resetVenueSaveState();
    }

    if (!id) {
        prepareSavedVenueForPartnerAccess(savedVenue);
    }

    if (coverMediaError) {
        showToast(
            "Venue details were saved, but the cover image change could not be completed. Please try the image again.",
            "error"
        );
        /* Details are already saved, so do not force a page refresh. */
        loadVenues().catch(error => console.warn("Venue background refresh failed:", error));
        return;
    }

    if (id) {
        closeVenueModal();
        showToast(
            savedVenue.cover_image_url
                ? "Venue and cover image updated successfully."
                : "Venue updated successfully.",
            "success"
        );
    }
    else {
        showToast(
            savedVenue.cover_image_url
                ? "Venue and cover image added. Partner access is now ready."
                : "Venue added. Partner access is now ready.",
            "success"
        );
    }

    /* Reconcile from Supabase in the background; saving no longer waits on analytics/list refresh. */
    loadVenues().catch(error => console.warn("Venue background refresh failed:", error));
}

async function handleVenueTableClick(event) {

    const detailsButton = event.target.closest(".venue-name-details-btn");

    if (detailsButton) {
        const id = safeValue(detailsButton.dataset.venueId);
        const venue = allVenues.find(
            item => String(item.id) === String(id)
        );

        if (!venue) {
            return;
        }

        /* Phone keeps its compact inline expansion. */
        if (window.matchMedia("(max-width:760px)").matches) {
            return;
        }

        openVenueDetails(venue);
        return;
    }

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

        resetVenueSaveState();
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

    const updatePayload = {
        venue_status: venueStatus,
        verification_status: verificationStatus
    };

    if (stage8SchemaReady && venueStatus !== "approved") {
        updatePayload.public_listing_enabled = false;
    }

    const { error } =
        await client
            .from("venues")
            .update(updatePayload)
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

        await loadStage8Analytics();
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
        if (assignmentSearch) {
            const controls = document.getElementById("smvMatchTierControls");
            if (controls) {
                controls.dataset.tier = "all";
                controls.querySelectorAll("[data-tier]").forEach(button => {
                    button.classList.toggle("active", button.dataset.tier === "all");
                });
            }
        }
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
    resetVenueAssignmentSaveState();

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
        lead.preferred_area ? `Venue / Area: ${lead.preferred_area}` : null,
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

let assignmentSaveInFlight = false;
function resetVenueAssignmentSaveState() {
    assignmentSaveInFlight = false;

    const saveButton = document.getElementById("saveVenueAssignment");
    if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Assign Selected Venues";
    }

    const whatsappButton = document.getElementById("smvAssignWhatsApp");
    if (whatsappButton) {
        whatsappButton.disabled = false;
        whatsappButton.textContent = "Assign + WhatsApp";
    }
}
window.resetVenueAssignmentSaveState = resetVenueAssignmentSaveState;

async function saveVenueAssignments(options = {}) {
    if (assignmentSaveInFlight) return { ok: false, busy: true };
    const leadToAssign = assignmentCurrentLead;
    const client = getSupabaseClient();
    const saveButton = document.getElementById("saveVenueAssignment");

    if (!client || !leadToAssign) {
        return;
    }

    const visibleSelected = Array.from(
        document.querySelectorAll(
            ".venue-assignment-checkbox:checked:not(:disabled)"
        )
    ).map(input => input.value);

    const smartSelected =
        typeof window.smvGetAssignmentSelection === "function"
            ? window.smvGetAssignmentSelection()
            : [];

    /* UI checkboxes are the final source of truth for staff intent.
       Merge them with the smart shortlist so either path remains reliable. */
    const manualSelectionTouched =
        typeof window.smvAssignmentSelectionTouched === "boolean"
            ? window.smvAssignmentSelectionTouched
            : false;

    /* When staff has manually changed the checklist, the checklist becomes
       the source of truth. Otherwise the automatic shortlist is preserved. */
    const selected = [
        ...new Set(
            (
                manualSelectionTouched
                    ? visibleSelected
                    : [
                        ...visibleSelected,
                        ...(Array.isArray(smartSelected) ? smartSelected : [])
                    ]
            ).map(String)
        )
    ];

    if (!selected.length && !manualSelectionTouched) {
        showAssignmentMessage(
            "Select at least one approved and verified venue.",
            "error"
        );
        return;
    }

    assignmentSaveInFlight = true;
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

        const selectedUnique = [...new Set(selected.map(String))];
        const { data: latestAssignments, error: latestAssignmentError } = await client
            .from("venue_enquiry_assignments")
            .select("id,venue_id,assignment_status")
            .eq("enquiry_id", leadToAssign.id)
            .in("venue_id", selectedUnique);

        if (latestAssignmentError) {
            throw latestAssignmentError;
        }

        const latest = Array.isArray(latestAssignments)
            ? latestAssignments
            : [];

        const activeVenueIds = new Set(
            latest
                .filter(item => safeValue(item.assignment_status) !== "cancelled")
                .map(item => String(item.venue_id))
        );

        const cancelledByVenue = new Map(
            latest
                .filter(item => safeValue(item.assignment_status) === "cancelled")
                .map(item => [String(item.venue_id), item])
        );

        const nowIso = new Date().toISOString();
        const reactivatedVenueIds = [];
        const cancelledToReactivate = selectedUnique.filter(
            venueId =>
                !activeVenueIds.has(String(venueId)) &&
                cancelledByVenue.has(String(venueId))
        );

        /* UNIQUE(enquiry_id, venue_id) means a cancelled venue must be reactivated,
           not inserted again. This is the normal re-assignment path. */
        for (const venueId of cancelledToReactivate) {
            const existing = cancelledByVenue.get(String(venueId));

            const { error: reactivateError } = await client
                .from("venue_enquiry_assignments")
                .update({
                    assignment_status: "assigned",
                    assignment_note: note,
                    assigned_by: assignedBy,
                    assigned_at: nowIso,
                    updated_at: nowIso,
                    first_viewed_at: null,
                    first_contacted_at: null,
                    last_activity_at: null,
                    partner_note: null,
                    site_visit_at: null,
                    follow_up_at: null,
                    converted_at: null,
                    lost_reason: null
                })
                .eq("id", existing.id);

            if (reactivateError) {
                throw reactivateError;
            }

            reactivatedVenueIds.push(String(venueId));
        }

        /* Manual checklist mode also supports true unassignment:
           any currently-active assignment that staff explicitly unchecked is
           cancelled, while the assignment history is retained. */
        const activeForLead = allVenueAssignments.filter(
            item =>
                String(item.enquiry_id) === String(leadToAssign.id) &&
                safeValue(item.assignment_status) !== "cancelled"
        );
        const selectedSet = new Set(selectedUnique.map(String));
        const deselectedAssignments = manualSelectionTouched
            ? activeForLead.filter(item => !selectedSet.has(String(item.venue_id)))
            : [];

        for (const assignment of deselectedAssignments) {
            const { error: cancelError } = await client
                .from("venue_enquiry_assignments")
                .update({
                    assignment_status: "cancelled",
                    updated_at: nowIso,
                    last_activity_at: nowIso
                })
                .eq("id", assignment.id);

            if (cancelError) {
                throw cancelError;
            }
        }

        const rows = selectedUnique
            .filter(
                venueId =>
                    !activeVenueIds.has(String(venueId)) &&
                    !cancelledByVenue.has(String(venueId))
            )
            .map(venueId => ({
                enquiry_id: leadToAssign.id,
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

        const createdVenueIds = [
            ...reactivatedVenueIds,
            ...rows.map(row => String(row.venue_id))
        ];

        /* Keep a lightweight internal activity record where available. */
        try {
            await client
                .from("crm_activity_log")
                .insert({
                    lead_id: leadToAssign.id,
                    activity_type: "venue_assigned",
                    description:
                        `Venue assignment: ${rows.length} new, ${reactivatedVenueIds.length} reactivated.`,
                    new_value: createdVenueIds.join(","),
                    created_by: assignedBy
                });
        }
        catch (activityError) {
            console.warn(
                "Assignment activity log was not written:",
                activityError
            );
        }

        const savedLead = leadToAssign;
        await loadVenueAssignments();
        applyFilters();

        if (
            options.keepOpen === true &&
            String(assignmentCurrentLead?.id) === String(leadToAssign.id)
        ) {
            try {
                renderAssignmentVenues();
            }
            catch (renderError) {
                console.warn("Assignment view refresh skipped:", renderError);
            }
        }
        else if (
            String(assignmentCurrentLead?.id) === String(leadToAssign.id)
        ) {
            closeVenueAssignmentModal();
        }

        if (createdVenueIds.length > 0) {
            const parts = [];

            if (rows.length) {
                parts.push(
                    `${rows.length} new venue${rows.length === 1 ? "" : "s"} assigned`
                );
            }

            if (reactivatedVenueIds.length) {
                parts.push(
                    `${reactivatedVenueIds.length} venue${reactivatedVenueIds.length === 1 ? "" : "s"} re-assigned`
                );
            }

            const alreadyCount =
                selectedUnique.length -
                createdVenueIds.length;

            showToast(
                `${parts.join(" and ")} successfully.` +
                (
                    alreadyCount > 0
                        ? ` ${alreadyCount} already active.`
                        : ""
                ),
                "success"
            );
        }
        else {
            const alreadyCount = selectedUnique.length;

            showToast(
                `${alreadyCount} venue${alreadyCount === 1 ? " is" : "s are"} already assigned to this enquiry. No new assignment was created.`,
                "info"
            );
        }

        return {
            ok: true,
            selected,
            created: createdVenueIds,
            reactivated: reactivatedVenueIds,
            lead: savedLead
        };
    }
    catch (error) {
        console.error("Venue assignment save error:", error);
        showAssignmentMessage(
            error.message || "Unable to assign venues.",
            "error"
        );
        return { ok: false, error };
    }
    finally {
        resetVenueAssignmentSaveState();
    }
}

function closeVenueAssignmentModal() {
    resetVenueAssignmentSaveState();

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

async function loadStaffOptions() {
    const controls = ['detailAssignedTo','newAssignedTo'].map(id => document.getElementById(id)).filter(Boolean);
    try {
        const {data,error} = await getSupabaseClient().from('staff_profiles').select('user_id,full_name,role,is_active').eq('is_active',true).order('full_name');
        if (error) throw error;
        controls.forEach(control => {
            const previous = control.value;
            control.replaceChildren(new Option('Unassigned', ''));
            (data || []).forEach(staff => control.add(new Option((staff.full_name || 'Unnamed employee') + (staff.role === 'admin' ? ' (admin)' : ''), staff.user_id)));
            if (previous && !Array.from(control.options).some(option => option.value === previous)) control.add(new Option('Previously assigned employee', previous));
            control.value = previous;
            control.disabled = false;
        });
    } catch (error) {
        controls.forEach(control => {control.disabled=true;control.title='Employee list unavailable. Reload the page to retry. Existing assignment is preserved.';});
        console.warn('Unable to load employee names:',error);
    }
}

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

    setupLeadDetailsDrag();

    setupVenueManagement();

    setupVenueAssignment();

    setupAuthListener();

    // Load lead workspace independently of optional venue capabilities.
    loadStage8Capabilities().catch(error => console.warn('Venue capabilities unavailable:', error));
    loadStaffOptions();
    await loadEnquiries();

    await window.startEmployeeIntegration?.(getSupabaseClient());

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
