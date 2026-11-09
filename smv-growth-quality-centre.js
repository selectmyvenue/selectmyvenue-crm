/* SMV Growth & Quality Centre — additive, read-only operational intelligence.
   It mounts beside existing CRM workspaces and never edits/reorders the Enquiries DOM. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const norm = v => String(v || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const nfmt = v => new Intl.NumberFormat("en-IN").format(Number(v) || 0);
  let mounted = false, loading = false, cache = null;

  function setNavActive() {
    document.querySelectorAll(".crm-top-nav .crm-nav-item").forEach(x => {
      const active = x.id === "smvBusinessOSHubBtn";
      x.classList.toggle("active", active);
      if (active) x.setAttribute("aria-current", "page");
      else x.removeAttribute("aria-current");
    });
  }
  function showHub() {
    const section = $("#smvGrowthQualityCentre");
    const hub = $("#smvBusinessOSHub");
    const main = $(".crm-main"), venues = $("#venueManagementSection"), bi = $("#smvBusinessIntelligence");
    if (section) section.hidden = true;
    if (main) main.hidden = true;
    if (venues) venues.hidden = true;
    if (bi) bi.hidden = true;
    if (hub) hub.hidden = false;
    setNavActive();
    hub?.scrollIntoView({behavior:"smooth", block:"start"});
  }
  function showLeads() {
    const section = $("#smvGrowthQualityCentre"), hub = $("#smvBusinessOSHub"), bi = $("#smvBusinessIntelligence");
    if (section) section.hidden = true;
    if (hub) hub.hidden = true;
    if (bi) bi.hidden = true;
    const venues = $("#venueManagementSection");
    if (venues) venues.hidden = true;
    const main = $(".crm-main");
    if (main) main.hidden = false;
    document.querySelectorAll(".crm-top-nav .crm-nav-item").forEach(x => {
      const active = x.id === "crmLeadManagementBtn";
      x.classList.toggle("active", active);
      if (active) x.setAttribute("aria-current", "page");
      else x.removeAttribute("aria-current");
    });
    $("#leadManagementSection")?.scrollIntoView({behavior:"smooth", block:"start"});
  }
  function open() {
    const section = $("#smvGrowthQualityCentre");
    if (!section) return;
    const main = $(".crm-main"), venues = $("#venueManagementSection"), hub = $("#smvBusinessOSHub"), bi = $("#smvBusinessIntelligence");
    if (main) main.hidden = true;
    if (venues) venues.hidden = true;
    if (hub) hub.hidden = true;
    if (bi) bi.hidden = true;
    section.hidden = false;
    setNavActive();
    section.scrollIntoView({behavior:"smooth", block:"start"});
    load(false);
  }
  function mount() {
    if (mounted) return;
    const hub = $("#smvBusinessOSHub");
    if (!hub) return;
    const grid = $(".smv-hub-grid", hub);
    if (grid && !$("#smvGrowthQualityCard")) {
      const card = document.createElement("button");
      card.type = "button";
      card.id = "smvGrowthQualityCard";
      card.className = "smv-hub-card smv-growth-quality-launcher";
      card.innerHTML = '<span class="smv-hub-icon">⌁</span><strong>Growth &amp; Quality Centre</strong><small>Demand gaps, lead completeness, venue trust and partner response health</small><em>Open growth intelligence →</em>';
      card.addEventListener("click", open);
      grid.appendChild(card);
    }
    if (!$("#smvGrowthQualityCentre")) {
      const section = document.createElement("section");
      section.id = "smvGrowthQualityCentre";
      section.hidden = true;
      section.setAttribute("aria-label", "SMV Growth and Quality Centre");
      section.innerHTML =
        '<header class="smv-gq-head"><div><div class="smv-gq-kicker">SELECT MY VENUE · OPERATING INTELLIGENCE</div><h1>Growth <span>&amp; Quality Centre</span></h1><p>Find demand gaps, improve enquiry quality, strengthen venue trust and monitor partner response — without changing source records.</p></div><div class="smv-gq-actions"><button type="button" data-gq="refresh">↻ Refresh analysis</button><button type="button" data-gq="hub">← Business OS</button></div></header>' +
        '<div id="smvGqStatus" class="smv-gq-status" role="status">Ready to analyse authorised CRM data.</div>' +
        '<div id="smvGqKpis" class="smv-gq-kpis"></div>' +
        '<div class="smv-gq-grid">' +
          '<article class="smv-gq-panel smv-gq-wide"><div class="smv-gq-panel-head"><div><h2>Locality demand vs. venue supply</h2><p>Areas with enquiry demand but limited approved and verified venue inventory.</p></div><span>DEMAND INTELLIGENCE</span></div><div id="smvGqDemand"></div></article>' +
          '<article class="smv-gq-panel"><div class="smv-gq-panel-head"><div><h2>Lead quality review</h2><p>Missing details that can reduce matching accuracy or delay a callback.</p></div><span>LEAD COMPLETENESS</span></div><div id="smvGqLeads"></div></article>' +
          '<article class="smv-gq-panel"><div class="smv-gq-panel-head"><div><h2>Venue trust &amp; listing quality</h2><p>Profile gaps to verify before promoting a venue as a strong match.</p></div><span>INVENTORY QUALITY</span></div><div id="smvGqVenues"></div></article>' +
          '<article class="smv-gq-panel"><div class="smv-gq-panel-head"><div><h2>Partner response health</h2><p>Timestamp-based follow-up signals from venue assignments.</p></div><span>PARTNER NETWORK</span></div><div id="smvGqPartners"></div></article>' +
          '<article class="smv-gq-panel"><div class="smv-gq-panel-head"><div><h2>Customer journey snapshot</h2><p>Current enquiry status distribution from the existing CRM.</p></div><span>CUSTOMER JOURNEY</span></div><div id="smvGqJourney"></div></article>' +
        '</div><p class="smv-gq-foot">Read-only analysis. No enquiry, venue, partner, employee, billing or permission records are created, updated or deleted. Counts depend on the signed-in account’s existing access policies.</p>';
      document.body.appendChild(section);
      section.addEventListener("click", e => {
        const lead = e.target.closest("[data-gq-lead]");
        if (lead) {
          const id = lead.dataset.gqLead;
          showLeads();
          if (id && typeof window.openLeadModal === "function") window.openLeadModal(String(id));
          else $('[data-work-view="new"]')?.click();
          return;
        }
        const b = e.target.closest("[data-gq]");
        if (!b) return;
        if (b.dataset.gq === "hub") showHub();
        if (b.dataset.gq === "refresh") load(true);
        if (b.dataset.gq === "venues") {
          const section = $("#smvGrowthQualityCentre");
          if (section) section.hidden = true;
          $("#smvBusinessOSHub") && ($("#smvBusinessOSHub").hidden = true);
          const main = $(".crm-main"), venues = $("#venueManagementSection");
          if (main) main.hidden = true;
          if (venues) venues.hidden = false;
          document.querySelectorAll(".crm-top-nav .crm-nav-item").forEach(x => {
            const active = x.id === "venueManagementBtn";
            x.classList.toggle("active", active);
            if (active) x.setAttribute("aria-current", "page");
            else x.removeAttribute("aria-current");
          });
          $("#venueManagementSection")?.scrollIntoView({behavior:"smooth", block:"start"});
        }
      });
    }
    mounted = true;
  }
  function groupBy(rows, keyFn) {
    const map = new Map();
    rows.forEach(row => {
      const key = keyFn(row);
      if (!key) return;
      const old = map.get(key) || {key, count:0, rows:[]};
      old.count++; old.rows.push(row); map.set(key, old);
    });
    return Array.from(map.values());
  }
  function isVerified(v) {
    return norm(v.venue_status) === "approved" && norm(v.verification_status) === "verified";
  }
  function missingLeadFields(l) {
    const missing = [];
    if (!String(l.location || "").trim()) missing.push("area");
    if (!String(l.occasion || "").trim()) missing.push("event type");
    if (!(Number(l.guests) > 0)) missing.push("guest count");
    if (!(Number(l.budget_per_person) > 0)) missing.push("per-person budget");
    if (!l.event_date) missing.push("event date");
    if (!String(l.mobile || "").trim()) missing.push("mobile");
    return missing;
  }
  function render(d) {
    const verified = d.venues.filter(isVerified);
    const activeLeads = d.leads.filter(l => !["booked","converted","lost","closed","cancelled","not-interested"].includes(norm(l.status)));
    const incomplete = activeLeads.map(l => ({lead:l, missing:missingLeadFields(l)})).filter(x => x.missing.length);
    const qualityGaps = d.venues.map(v => {
      const missing = [];
      if (!v.verification_status || norm(v.verification_status) !== "verified") missing.push("verification");
      if (!(Number(v.capacity_max) > 0)) missing.push("capacity");
      if (!(Number(v.price_min_per_person) > 0 || Number(v.price_max_per_person) > 0)) missing.push("pricing");
      if (!String(v.area || "").trim() && !String(v.city || "").trim()) missing.push("location");
      return {venue:v, missing};
    }).filter(x => x.missing.length);
    const assignedByLead = groupBy(d.assignments, x => String(x.enquiry_id));
    const pending = d.assignments.filter(a => {
      const status = norm(a.assignment_status);
      if (["booked","converted","closed","lost","cancelled"].includes(status)) return false;
      const assigned = new Date(a.assigned_at || "").getTime();
      const viewed = !!a.first_viewed_at || ["viewed","contacted","detailed shared","follow up","site visit","negotiation"].includes(status);
      const contacted = !!a.first_contacted_at || ["contacted","detailed shared","follow up","site visit","negotiation"].includes(status);
      const viewedAt = new Date(a.first_viewed_at || "").getTime();
      if (!viewed && Number.isFinite(assigned) && Date.now() - assigned >= 86400000) return true;
      if (viewed && !contacted && Number.isFinite(viewedAt) && Date.now() - viewedAt >= 86400000) return true;
      return false;
    });
    const demand = groupBy(d.leads, l => norm(l.location)).map(g => {
      const label = g.rows[0]?.location || g.key;
      const stock = verified.filter(v => norm([v.area,v.city].filter(Boolean).join(" ")) === g.key || norm(v.area) === g.key || norm(v.city) === g.key).length;
      const guests = g.rows.map(x => Number(x.guests)||0).filter(Boolean);
      const avgGuests = guests.length ? Math.round(guests.reduce((a,b)=>a+b,0)/guests.length) : null;
      return {label, demand:g.count, stock, avgGuests, gap:Math.max(0,g.count-stock)};
    }).sort((a,b)=>b.gap-a.gap || b.demand-a.demand).slice(0,12);
    const journey = groupBy(d.leads, l => norm(l.status) || "unknown").sort((a,b)=>b.count-a.count);
    const cards = [
      ["Total enquiries", d.leads.length, "Existing customer records"],
      ["Open pipeline", activeLeads.length, "Not marked as closed or converted"],
      ["Incomplete active leads", incomplete.length, "Need details verified"],
      ["Verified venues", verified.length, "Approved + verified status"],
      ["Venue profile gaps", qualityGaps.length, "Need profile review"],
      ["Partner response flags", pending.length, "Timestamp signals older than 24 hours"]
    ];
    $("#smvGqKpis").innerHTML = cards.map(x => '<article><span>'+esc(x[0])+'</span><strong>'+nfmt(x[1])+'</strong><small>'+esc(x[2])+'</small></article>').join("");
    $("#smvGqDemand").innerHTML = demand.length
      ? '<div class="smv-gq-table-wrap"><table><thead><tr><th>Area recorded on enquiry</th><th>Enquiries</th><th>Verified venues</th><th>Avg. guests</th><th>Opportunity</th></tr></thead><tbody>'+demand.map(x=>'<tr><td><strong>'+esc(x.label)+'</strong></td><td>'+nfmt(x.demand)+'</td><td>'+nfmt(x.stock)+'</td><td>'+(x.avgGuests?nfmt(x.avgGuests):"—")+'</td><td><b class="'+(x.gap?"smv-gq-warning":"")+'">'+(x.gap?nfmt(x.gap)+" demand gap":"Inventory present")+'</b></td></tr>').join("")+'</tbody></table></div><p class="smv-gq-note">This is an area-level opportunity signal, not a guarantee that a venue is suitable. Matching still depends on capacity, budget, event and date requirements.</p>'
      : '<div class="smv-gq-empty">No enquiry locality data is available in this account.</div>';
    $("#smvGqLeads").innerHTML = incomplete.length
      ? '<div class="smv-gq-list">'+incomplete.slice(0,12).map(x=>'<article><div><strong>'+esc(x.lead.location||"Area not recorded")+' · '+esc(x.lead.occasion||"Event not recorded")+'</strong><small>'+esc(x.missing.join(" · "))+'</small></div><button type="button" data-gq-lead="'+esc(x.lead.id)+'">Review enquiry</button></article>').join("")+'</div><p class="smv-gq-note">Showing up to 12 active enquiries with missing matching or contact details.</p>'
      : '<div class="smv-gq-empty">No incomplete active enquiries were detected in the loaded records.</div>';
    $("#smvGqVenues").innerHTML = qualityGaps.length
      ? '<div class="smv-gq-list">'+qualityGaps.slice(0,12).map(x=>'<article><div><strong>'+esc(x.venue.venue_name||"Unnamed venue")+'</strong><small>'+esc(x.missing.join(" · "))+'</small></div><span class="smv-gq-muted">'+esc(x.venue.area||x.venue.city||"Location n/a")+'</span></article>').join("")+'</div><button type="button" class="smv-gq-secondary" data-gq="venues">Open Venue Management</button><p class="smv-gq-note">A missing field means “not recorded in the loaded profile”, not that the venue lacks the facility.</p>'
      : '<div class="smv-gq-empty">No venue profile gaps were detected in the loaded records.</div>';
    $("#smvGqPartners").innerHTML = '<div class="smv-gq-statline"><strong>'+nfmt(pending.length)+'</strong><span>assignments flagged for review</span></div><div class="smv-gq-mini">'+
      '<span>'+nfmt(d.assignments.filter(a=>!!a.first_viewed_at).length)+' with view timestamp</span><span>'+nfmt(d.assignments.filter(a=>!!a.first_contacted_at).length)+' with contact timestamp</span><span>'+nfmt(d.assignments.filter(a=>!!a.site_visit_at).length)+' with site visit timestamp</span></div>'+
      '<p class="smv-gq-note">Flags use assignment/view/contact timestamps and known status values. Missing timestamps are not proof of inactivity.</p>';
    $("#smvGqJourney").innerHTML = journey.length
      ? '<div class="smv-gq-bars">'+journey.map(x=>'<div><span>'+esc(x.key.replace(/-/g," "))+'</span><i><b style="width:'+Math.max(2,Math.round(x.count/Math.max(1,d.leads.length)*100))+'%"></b></i><strong>'+nfmt(x.count)+'</strong></div>').join("")+'</div>'
      : '<div class="smv-gq-empty">No journey records available.</div>';
  }
  async function load(force) {
    if (loading || (cache && !force)) { if (cache) render(cache); return; }
    const status = $("#smvGqStatus"), db = window.getSupabaseClient?.();
    if (!db) { if(status) status.textContent = "CRM connection is not ready. Please return to Business OS and retry."; return; }
    loading = true; if(status) status.textContent = "Loading authorised operational data…";
    try {
      const [leads, venues, assignments] = await Promise.all([
        db.from("customer_enquiries").select("id,location,occasion,guests,budget_per_person,event_date,food_preference,mobile,created_at,status,assigned_to,source,follow_up_at,contact_count,last_contacted_at").order("created_at",{ascending:false}).limit(5000),
        db.from("venues").select("id,venue_name,city,area,venue_type,capacity_min,capacity_max,price_min_per_person,price_max_per_person,venue_status,verification_status,plan_status,plan_expires_at,updated_at").limit(3000),
        db.from("venue_enquiry_assignments").select("id,enquiry_id,venue_id,assignment_status,assigned_at,first_viewed_at,first_contacted_at,follow_up_at,site_visit_at,converted_at").order("assigned_at",{ascending:false}).limit(5000)
      ]);
      for (const r of [leads, venues, assignments]) if (r.error) throw r.error;
      cache = {leads:leads.data||[],venues:venues.data||[],assignments:assignments.data||[]};
      render(cache);
      if(status) status.textContent = "Live analysis · "+nfmt(cache.leads.length)+" enquiries · "+nfmt(cache.venues.length)+" venues · refreshed "+new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
    } catch (error) {
      console.error("SMV Growth & Quality Centre load failed", error);
      if(status) status.textContent = "Analysis could not load: "+(error?.message||"access or connection issue")+". Existing CRM records are unchanged.";
    } finally { loading = false; }
  }
  function start() {
    mount();
    const hub = $("#smvBusinessOSHub");
    if (hub && !hub.dataset.smvGqWired) {
      hub.dataset.smvGqWired = "1";
      $("#smvGrowthQualityCard")?.addEventListener("click", open);
    }
    $("#crmLeadManagementBtn")?.addEventListener("click", showLeads);
    $("#smvBusinessOSHubBtn")?.addEventListener("click", () => { const p = $("#smvGrowthQualityCentre"); if (p) p.hidden = true; });
    $("#smvBusinessIntelligenceBtn")?.addEventListener("click", () => { const p = $("#smvGrowthQualityCentre"); if (p) p.hidden = true; });
    $("#venueManagementBtn")?.addEventListener("click", () => { const p = $("#smvGrowthQualityCentre"); if (p) p.hidden = true; });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
  window.SMVGrowthQualityCentre = {open, refresh: () => load(true), showBusinessOS: showHub};
})();