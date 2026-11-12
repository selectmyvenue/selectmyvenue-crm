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
  const state = { rows: [], aliases: [], target: "", city: "", timer: null, loading: false };

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
    const fromLead=clean(l?.city || l?.location || "");
    const q=norm(query);
    const cityNames=[...new Set(rows.map(v=>clean(v.city)).filter(Boolean))];
    const direct=cityNames.find(c=>norm(c)===q || (q.length>2 && q.includes(norm(c))));
    if (direct) return direct;
    const alias=getAlias(query);
    if (alias?.city_family) {
      const match=cityNames.find(c=>norm(c)===norm(alias.city_family));
      if (match) return match;
    }
    const leadCity=cityNames.find(c=>norm(fromLead).includes(norm(c)) || norm(c).includes(norm(fromLead)));
    if (leadCity) return leadCity;
    const cityMention=cityNames.find(c=>q.includes(norm(c)));
    return cityMention || "";
  }
  function makeGroups(query) {
    const all=venueRows().filter(approved);
    const l=lead()||{};
    const city=detectCity(query,all,l);
    const alias=getAlias(query);
    const targetCoords=alias && Number.isFinite(Number(alias.latitude)) && Number.isFinite(Number(alias.longitude))
      ? [Number(alias.latitude),Number(alias.longitude)] : null;
    const cityRows=city ? all.filter(v=>norm(v.city)===norm(city)) : all;
    const exact=norm(query);
    const groups=new Map();
    cityRows.forEach(v=>{
      const area=clean(v.area || v.locality || v.city || "Area not listed");
      const key=norm(area)||"area not listed";
      if(!groups.has(key)) groups.set(key,{area,venues:[],distances:[]});
      const g=groups.get(key); g.venues.push(v);
      const d=distance(targetCoords,coords(v));
      if(d!==null)g.distances.push(d);
    });
    const list=[...groups.values()].map(g=>{
      const exactArea=norm(g.area)===exact || (exact.length>2 && norm(g.area).includes(exact)) || (exact.length>2 && exact.includes(norm(g.area)));
      const minDistance=g.distances.length?Math.min(...g.distances):null;
      return {...g,exactArea,minDistance};
    });
    list.sort((a,b)=>{
      if(a.exactArea!==b.exactArea)return a.exactArea?-1:1;
      if(a.minDistance!==null && b.minDistance!==null)return a.minDistance-b.minDistance;
      if(a.minDistance!==null)return -1;
      if(b.minDistance!==null)return 1;
      return a.area.localeCompare(b.area);
    });
    return {city,groups:list,total:cityRows.length,allTotal:all.length,hasCoords:!!targetCoords};
  }
  function findCheckbox(id) {
    const list=$("#venueAssignmentList");
    return list && [...list.querySelectorAll(".venue-assignment-checkbox")].find(x=>String(x.value)===String(id));
  }
  function selectedVenues() {
    const list=$("#venueAssignmentList");
    return list ? [...list.querySelectorAll(".venue-assignment-checkbox:checked:not(:disabled)")] : [];
  }
  function syncSelectionPanel() {
    const panel=$("#smvInventorySelectedList"),count=$("#smvInventorySelectedCount");
    if(!panel)return;
    const selected=selectedVenues();
    if(count)count.textContent=String(selected.length);
    if(!selected.length) {
      panel.innerHTML='<span class="slv-selected-empty">No venues selected yet</span>';
    } else {
      panel.innerHTML=selected.map(cb=>{
        const id=String(cb.value),name=clean(cb.dataset.venueName || cb.closest(".venue-assignment-item")?.querySelector(".venue-assignment-item-title strong")?.textContent || cb.dataset.venueLabel || "Selected venue");
        return '<span class="slv-selected-chip"><strong>'+esc(name)+'</strong><button type="button" data-slv-remove="'+esc(id)+'" aria-label="Remove '+esc(name)+'">×</button></span>';
      }).join("");
    }
    try { window.SMVEnterpriseAssignmentCenter?.updateBasket(); } catch (_) {}
    try { window.SMVLiveOperations?.refresh?.(); } catch (_) {}
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
        let bridge=$("#smvInventorySelectionBridge");
        if(!bridge){bridge=document.createElement("div");bridge.id="smvInventorySelectionBridge";bridge.hidden=true;list.appendChild(bridge);}
        bridge.appendChild(cb);
      }
    }
    if(!cb) { showMessage("This venue is not currently available in the approved inventory list. Refresh venues and try again.","warning"); return; }
    if(cb.disabled) { showMessage("This venue cannot be selected. Please refresh the approved inventory.","warning"); return; }
    cb.checked=true;
    cb.dataset.venueName=cb.dataset.venueName || clean(venueRows().find(v=>String(v.id)===String(id))?.venue_name);
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
    const input=$("#smvCallLocationSearch"), root=$("#smvLiveInventoryResults");
    if(!input||!root)return;
    const query=clean(input.value);
    state.target=query;
    if(!query) {
      root.innerHTML='<div class="slv-empty"><strong>Start with the customer’s preferred area</strong><span>Type an area such as Rajouri Garden, Chhatarpur, Sohna Road or a city. SMV inventory areas will appear here.</span></div>';
      $("#smvInventoryMeta").textContent="Ready for live call";
      return;
    }
    const all=venueRows().filter(approved);
    const tokens=norm(query).split(" ").filter(Boolean);
    const directMatches=all.filter(v=>{
      const searchable=norm([v.venue_name,v.contact_person,v.address,v.venue_address,v.full_address,v.area,v.locality,v.city,v.state,v.pincode,v.venue_type].filter(Boolean).join(" "));
      return tokens.length>0 && tokens.every(token=>searchable.includes(token));
    });
    const result=directMatches.length
      ? (()=>{const groups=new Map();directMatches.forEach(v=>{const area=clean(v.area||v.locality||v.city||"Area not listed"),key=norm(area);if(!groups.has(key))groups.set(key,{area,venues:[],distances:[]});groups.get(key).venues.push(v);});return {city:"Matching venue details",groups:[...groups.values()].map(g=>({...g,exactArea:true,minDistance:null})),total:directMatches.length};})()
      : makeGroups(query);
    $("#smvInventoryMeta").textContent=(result.city ? result.city+" inventory" : "SMV inventory") + " · "+result.total+" approved venues · "+result.groups.length+" areas";
    if(!result.groups.length) {
      root.innerHTML='<div class="slv-empty"><strong>No approved venue inventory found</strong><span>Try the city name or a nearby locality. Hidden, unverified and unapproved venues are excluded.</span></div>';
      return;
    }
    root.innerHTML=result.groups.map((g,i)=>{
      const dist=g.minDistance!==null ? '<small class="slv-distance">'+g.minDistance.toFixed(1)+' km approx.</small>' : "";
      const label=g.exactArea ? "Preferred area" : (g.minDistance!==null ? "Nearest alternative" : "Other inventory area");
      return '<section class="slv-area-card '+(g.exactArea?'is-exact':'')+'">'+
        '<button type="button" class="slv-area-head" aria-expanded="'+(i===0?'true':'false')+'" data-slv-toggle="'+i+'">'+
          '<span class="slv-area-marker">'+(g.exactArea?'●':String(i+1).padStart(2,"0"))+'</span>'+
          '<span class="slv-area-title"><strong>'+esc(g.area)+'</strong><small>'+esc(label)+' · '+g.venues.length+' venue'+(g.venues.length===1?'':'s')+'</small></span>'+
          dist+'<span class="slv-chevron">⌄</span></button>'+
        '<div class="slv-area-venues" '+(i===0?'':'hidden')+'>'+g.venues.map(v=>{
          const id=String(v.id),assigned=isAssigned(v.id),addr=clean(v.address || v.venue_address || v.full_address);
          return '<article class="slv-venue-row"><div class="slv-venue-copy"><strong>'+esc(v.venue_name || "Venue")+'</strong><span>'+esc([v.venue_type,v.area,v.city].filter(Boolean).join(" · "))+'</span>'+(addr?'<small>'+esc(addr)+'</small>':'<small>Full address not available in venue record</small>')+'</div>'+
            (assigned?'<span class="slv-assigned">Already assigned</span>':(findCheckbox(id)?.checked?'<button type="button" class="slv-select-btn is-selected" data-slv-select="'+esc(id)+'" disabled>Selected</button>':'<button type="button" class="slv-select-btn" data-slv-select="'+esc(id)+'">＋ Select</button>'))+
            '</article>';
        }).join("")+'</div></section>';
    }).join("");
  }
  function syncFromLead() {
    const input=$("#smvCallLocationSearch"); if(!input)return;
    const next=targetFromLead();
    if(next)input.value=next;
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
      const toggle=e.target.closest("[data-slv-toggle]");
      if(toggle){
        const panel=toggle.parentElement.querySelector(".slv-area-venues");
        const open=panel.hidden; panel.hidden=!open; toggle.setAttribute("aria-expanded",String(open));
      }
      const select=e.target.closest("[data-slv-select]");
      if(select)selectVenue(select.dataset.slvSelect);
      const remove=e.target.closest("[data-slv-remove]");
      if(remove){const cb=findCheckbox(remove.dataset.slvRemove);if(cb){cb.checked=false;cb.dispatchEvent(new Event("change",{bubbles:true}));}syncSelectionPanel();render();}
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
  window.SMVLiveCallInventory={refresh:render,selectVenue};
})();