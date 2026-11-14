/* SMV Live Call Venue Inventory Finder
 * Staff-side, read-only inventory discovery. Selection is handed to the existing
 * assignment checkboxes/save flow; this module does not write to Supabase.
 */
(function () {
  "use strict";
  const $ = (s, root=document) => root.querySelector(s);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const clean = v => String(v ?? "").trim();
  const norm = v => clean(v).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const state = { rows: [], aliases: [], target: "", city: "", defaultQuery: "", timer: null, loading: false };
  // Canonical in-memory selection shared by every assignment surface.
  function selectionStore(){
    const w=window;
    if(!w.SMVAssignmentSelection)w.SMVAssignmentSelection={ids:new Set(),names:new Map()};
    const s=w.SMVAssignmentSelection;
    if(!(s.ids instanceof Set))s.ids=new Set(Array.isArray(s.ids)?s.ids.map(String):[]);
    if(!(s.names instanceof Map))s.names=new Map();
    return s;
  }

  function lead() {
    try { return typeof assignmentCurrentLead !== "undefined" ? assignmentCurrentLead : null; }
    catch (_) { return null; }
  }
  function venueRows() {
    try {
      if (typeof assignmentVenueRows !== "undefined" && Array.isArray(assignmentVenueRows)) return assignmentVenueRows;
    } catch (_) {}
    return [];
  }
  function isAssigned(id) {
    try { return typeof isVenueAlreadyAssigned === "function" && isVenueAlreadyAssigned(id); }
    catch (_) { return false; }
  }
  function locationText(v) { return [v.address, v.full_address, v.area, v.city, v.state, v.pincode].filter(Boolean).join(" "); }
  function coords(v) {
    const lat = Number(v.latitude ?? v.lat), lng = Number(v.longitude ?? v.lng ?? v.long);
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat,lng] : null;
  }
  function distance(a,b) {
    if (!a || !b) return null;
    const rad=n=>n*Math.PI/180, dLat=rad(b[0]-a[0]), dLng=rad(b[1]-a[1]);
    const x=Math.sin(dLat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLng/2)**2;
    return 12742*Math.asin(Math.sqrt(x));
  }
  function approved(v) {
    // assignmentVenueRows is populated by CRM's smv_assignment_venues RPC
    // (or its approved+verified fallback) and hidden IDs are already excluded.
    return v && v.id && v.is_hidden !== true && v.hidden_from_assignment !== true;
  }
  function getAlias(query) {
    const q=norm(query);
    return state.aliases.find(a => norm(a.canonical_label)===q || norm(String(a.alias_key||"").split("|").slice(1).join(" "))===q) || null;
  }
  async function loadAliases() {
    let client=null;
    try { client=typeof getSupabaseClient==="function" ? getSupabaseClient() : null; } catch (_) {}
    if (!client) return;
    try {
      const r=await client.from("geo_area_aliases").select("alias_key,canonical_label,latitude,longitude,city_family").limit(1000);
      if (!r.error && Array.isArray(r.data)) state.aliases=r.data;
    } catch (e) { console.info("Live inventory area coordinates unavailable; locality sorting will be used.",e); }
  }
  function targetFromLead() {
    const l=lead()||{};
    return clean(l.preferred_area || $("#customerPreferredArea")?.value || l.location || "");
  }
  function detectCity(query, rows, l) {
    const q=norm(query);
    const cityNames=[...new Set(rows.map(v=>clean(v.city)).filter(Boolean))];
    const direct=cityNames.find(c=>norm(c)===q || (q.length>2 && (q.includes(norm(c)) || norm(c).includes(q))));
    if (direct) return direct;
    const alias=getAlias(query);
    if (alias?.city_family) {
      const match=cityNames.find(c=>norm(c)===norm(alias.city_family));
      if (match) return match;
    }
    // Use the current lead's city as a nearby fallback only for the untouched
    // prefilled area. An arbitrary unmatched keyword must not dump an unrelated city.
    if(q && q===norm(state.defaultQuery)){
      const fromLead=clean(l?.city || l?.location || "");
      const leadCity=cityNames.find(c=>norm(fromLead).includes(norm(c)) || norm(c).includes(norm(fromLead)));
      if(leadCity) return leadCity;
    }
    return "";
  }
  function groupRowsByArea(rows, options={}) {
    const groups=new Map();
    rows.forEach(v=>{
      const area=clean(v.area || v.locality || v.city || "Area not listed");
      const key=norm(area)||"area not listed";
      if(!groups.has(key)) groups.set(key,{area,venues:[],distances:[]});
      const group=groups.get(key);
      group.venues.push(v);
      const d=distance(options.targetCoords,coords(v));
      if(d!==null)group.distances.push(d);
    });
    const list=[...groups.values()].map(group=>({
      ...group,
      minDistance:group.distances.length?Math.min(...group.distances):null
    }));
    list.sort((a,b)=>{
      if(options.exactArea){
        const ae=norm(a.area)===options.exactArea || norm(a.area).includes(options.exactArea);
        const be=norm(b.area)===options.exactArea || norm(b.area).includes(options.exactArea);
        if(ae!==be)return ae?-1:1;
      }
      if(a.minDistance!==null && b.minDistance!==null)return a.minDistance-b.minDistance;
      if(a.minDistance!==null)return -1;
      if(b.minDistance!==null)return 1;
      return a.area.localeCompare(b.area);
    });
    list.forEach(group=>group.venues.sort((x,y)=>clean(x.venue_name).localeCompare(clean(y.venue_name))));
    return list;
  }
  function makeGroups(query) {
    const all=venueRows().filter(approved);
    const l=lead()||{};
    const city=detectCity(query,all,l);
    const alias=getAlias(query);
    if(!city && !alias)return null;
    const targetCoords=alias && Number.isFinite(Number(alias.latitude)) && Number.isFinite(Number(alias.longitude))
      ? [Number(alias.latitude),Number(alias.longitude)] : null;
    const cityRows=city ? all.filter(v=>norm(v.city)===norm(city)) : all;
    if(!cityRows.length)return null;
    return {
      city,
      groups:groupRowsByArea(cityRows,{targetCoords,exactArea:norm(query)}),
      total:cityRows.length,
      allTotal:all.length,
      hasCoords:!!targetCoords,
      nearbyFallback:true
    };
  }
  function venueSearchText(v) {
    const fields=[
      v.venue_name,v.name,v.contact_person,v.contact_name,v.owner_name,v.manager_name,
      v.phone,v.mobile,v.contact_number,v.phone_number,v.whatsapp_number,v.email,v.contact_email,
      v.address,v.full_address,v.venue_address,v.area,v.locality,v.city,v.state,v.pincode,
      v.venue_type,v.type,v.category,v.venue_category,v.capacity_min,v.capacity_max,v.capacity,
      v.max_capacity,v.guest_capacity,v.price_min_per_person,v.price_max_per_person,
      v.website,v.website_url
    ];
    return norm(fields.filter(value=>value!==null&&value!==undefined).join(" "));
  }
  function findCheckbox(id) {
    const modal=$("#venueAssignmentModal"),list=$("#venueAssignmentList");
    const controls=[...(list?.querySelectorAll(".venue-assignment-checkbox")||[]),
      ...(modal?.querySelector("#smvInventorySelectionBridge")?.querySelectorAll(".venue-assignment-checkbox")||[])];
    return controls.find(x=>String(x.value)===String(id) && !x.disabled) || null;
  }
  function selectedVenues() {
    const s=selectionStore();
    return [...s.ids].map(id=>({value:id,dataset:{venueName:s.names.get(id)||""}}));
  }
  function syncSelectionPanel() {
    // The checkbox change event already bubbles to the modal's shared handler.
    // Refresh the single basket directly; never dispatch another change event
    // here, which could recursively re-enter this handler.
    try { window.SMVEnterpriseAssignmentCenter?.updateBasket(); } catch (_) {}
  }
  function selectVenue(id) {
    const list=$("#venueAssignmentList");
    if(isAssigned(id)) { showMessage("This venue is already assigned to this enquiry.","info"); return; }
    let cb=findCheckbox(id);
    if(!cb && list) {
      const venue=venueRows().find(v=>String(v.id)===String(id));
      if(venue) {
        // Keep the existing CRM save pipeline as the single write path even if
        // its searchable legacy list has not rendered this inventory row yet.
        cb=document.createElement("input");
        cb.type="checkbox"; cb.className="venue-assignment-checkbox";
        cb.value=String(id); cb.checked=true;
        cb.dataset.venueName=clean(venue.venue_name);
        cb.dataset.venueLabel=clean(venue.venue_name);
        cb.setAttribute("aria-label","Selected "+clean(venue.venue_name));
        cb.style.position="absolute"; cb.style.width="1px"; cb.style.height="1px";
        cb.style.opacity="0"; cb.style.pointerEvents="none";
        const modal=$("#venueAssignmentModal");
        let bridge=modal?.querySelector("#smvInventorySelectionBridge");
        if(!bridge && modal){bridge=document.createElement("div");bridge.id="smvInventorySelectionBridge";bridge.hidden=true;modal.appendChild(bridge);}
        if(!bridge){showMessage("Unable to prepare the shared selection list. Close and reopen assignment, then try again.","warning");return;}
        bridge.appendChild(cb);
      }
    }
    if(!cb) { showMessage("This venue is not currently available in the approved inventory list. Refresh venues and try again.","warning"); return; }
    if(cb.disabled) { showMessage("This venue cannot be selected. Please refresh the approved inventory.","warning"); return; }
    const venue=venueRows().find(v=>String(v.id)===String(id));
    const store=selectionStore();
    store.ids.add(String(id));
    store.names.set(String(id),clean(venue?.venue_name||cb.dataset.venueName||cb.dataset.venueLabel||"Selected venue"));
    cb.checked=true;
    cb.dataset.venueName=store.names.get(String(id));
    cb.dispatchEvent(new Event("change",{bubbles:true}));
    const btn=$('[data-slv-select="'+CSS.escape(String(id))+'"]');
    if(btn){btn.textContent="Selected";btn.disabled=true;btn.classList.add("is-selected");}
    syncSelectionPanel();
    showMessage("Venue added to Selected Now. Use Assign Selected Venues below to confirm.","success");
  }
  function showMessage(message,type) {
    const el=$("#smvInventoryFeedback"); if(!el)return;
    el.textContent=message; el.dataset.type=type||"info";
  }
  function render() {
    const input=$("#smvCallLocationSearch"),root=$("#smvLiveInventoryResults");
    if(!input||!root)return;
    const query=clean(input.value);
    state.target=query;
    if(!query){
      root.innerHTML='<div class="slv-empty"><strong>Search all SMV venues in one place</strong><span>Enter a locality, city, venue name, venue type, contact number, owner name or address. All matching approved and verified venues will appear here.</span></div>';
      $("#smvInventoryMeta").textContent="Ready to search all SMV inventory";
      return;
    }
    const all=venueRows().filter(approved);
    const tokens=norm(query).split(" ").filter(Boolean);
    const directMatches=all.filter(v=>{
      const searchable=venueSearchText(v);
      return tokens.length>0&&tokens.every(token=>searchable.includes(token));
    });
    let result;
    if(directMatches.length){
      result={
        city:"",
        groups:groupRowsByArea(directMatches),
        total:directMatches.length,
        nearbyFallback:false
      };
    }else{
      result=makeGroups(query);
    }
    if(!result||!result.groups.length){
      $("#smvInventoryMeta").textContent="0 matching venues";
      root.innerHTML='<div class="slv-empty"><strong>No matching approved venue found</strong><span>Try another area, city, venue name, venue type, owner contact, phone number or a shorter keyword.</span></div>';
      return;
    }
    const areaCount=result.groups.length;
    $("#smvInventoryMeta").textContent=result.total+" approved venues · "+areaCount+" area"+(areaCount===1?"":"s")+(result.nearbyFallback?" · nearby city inventory":" · all keyword matches");
    root.innerHTML=result.groups.map(group=>{
      const rows=group.venues.map(v=>{
        const id=String(v.id),assigned=isAssigned(id),store=selectionStore();
        const selected=store.ids.has(id)||!!findCheckbox(id)?.checked;
        const address=clean(v.full_address||v.venue_address||v.address);
        const contactName=clean(v.contact_person||v.contact_name||v.owner_name||v.manager_name);
        const phone=clean(v.phone||v.mobile||v.contact_number||v.phone_number||v.whatsapp_number);
        const email=clean(v.email||v.contact_email);
        const capacity=clean(v.capacity_max||v.max_capacity||v.capacity||"");
        const type=clean(v.venue_type||v.type||v.category||"Venue");
        const location=clean([v.area||v.locality,v.city,v.state].filter(Boolean).join(" · "));
        const price=(v.price_min_per_person||v.price_max_per_person)
          ?"₹"+(v.price_min_per_person||"—")+"–"+(v.price_max_per_person||"—")+"/person":"";
        const contactBits=[
          contactName?'<span>Contact: '+esc(contactName)+'</span>':"",
          phone?'<span>☎ '+esc(phone)+'</span>':"",
          email?'<span>✉ '+esc(email)+'</span>':"",
          capacity?'<span>Capacity: '+esc(capacity)+'</span>':"",
          price?'<span>'+esc(price)+'</span>':""
        ].filter(Boolean).join("");
        const action=assigned
          ?'<span class="slv-assigned">Already assigned to this enquiry</span>'
          :selected
            ?'<button type="button" class="slv-select-btn is-selected" data-slv-select="'+esc(id)+'" disabled>✓ Selected</button>'
            :'<button type="button" class="slv-select-btn" data-slv-select="'+esc(id)+'">＋ Select venue</button>';
        return '<article class="slv-venue-card'+(selected?' is-selected':'')+'">'+
          '<div class="slv-venue-card-main"><div class="slv-venue-card-title"><strong>'+esc(v.venue_name||"Venue")+'</strong><span>'+esc(type)+'</span></div>'+
          '<div class="slv-venue-card-location">'+(location?'📍 '+esc(location):"Location not listed")+'</div>'+
          (address?'<div class="slv-venue-card-address">'+esc(address)+'</div>':'')+
          (contactBits?'<div class="slv-venue-card-details">'+contactBits+'</div>':'')+
          '</div><div class="slv-venue-card-action">'+action+'</div></article>';
      }).join("");
      const distanceText=group.minDistance!==null?" · nearest pin "+group.minDistance.toFixed(1)+" km":"";
      return '<section class="slv-area-section"><div class="slv-area-section-header"><div><strong>'+esc(group.area)+'</strong><small>'+group.venues.length+' venue'+(group.venues.length===1?"":"s")+distanceText+'</small></div></div><div class="slv-venue-results-grid">'+rows+'</div></section>';
    }).join("");
  }
  function syncFromLead() {
    const input=$("#smvCallLocationSearch"); if(!input)return;
    const next=targetFromLead();
    if(next){input.value=next;state.defaultQuery=next;}
    render();
  }
  function boot() {
    const modal=$("#venueAssignmentModal"); if(!modal)return;
    const root=$("#smvLiveInventoryResults");
    if(!root)return;
    const leadArea=$("#customerPreferredArea");
    leadArea?.addEventListener("input",()=>{
      const input=$("#smvCallLocationSearch");
      if(input && !modal.hidden){input.value=leadArea.value;queueRender();}
    });
    $("#smvCallLocationSearch")?.addEventListener("input",queueRender);
    modal.addEventListener("change",e=>{if(e.target.matches(".venue-assignment-checkbox")){syncSelectionPanel();render();}});
    syncSelectionPanel();
    modal.addEventListener("click",e=>{
      const select=e.target.closest("[data-slv-select]");
      if(select)selectVenue(select.dataset.slvSelect);
      const remove=e.target.closest("[data-slv-remove]");
      if(remove){const id=String(remove.dataset.slvRemove),store=selectionStore();store.ids.delete(id);store.names.delete(id);const cb=findCheckbox(id);if(cb){cb.checked=false;cb.dispatchEvent(new Event("change",{bubbles:true}));}syncSelectionPanel();render();}
    });
    const observer=new MutationObserver(()=>{
      if(!modal.hidden){syncFromLead();render();}
    });
    const venueList=$("#venueAssignmentList");
    if(venueList)new MutationObserver(()=>{if(!modal.hidden)render();}).observe(venueList,{childList:true,subtree:true});
    observer.observe(modal,{attributes:true,attributeFilter:["hidden"]});
    modal.addEventListener("transitionend",()=>{if(!modal.hidden)syncFromLead();});
    syncFromLead();
    loadAliases().then(render);
  }
  function queueRender(){clearTimeout(state.timer);state.timer=setTimeout(render,120);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  window.SMVLiveCallInventory={refresh:render,refreshSelection:render,selectVenue,getRows:venueRows};
})();