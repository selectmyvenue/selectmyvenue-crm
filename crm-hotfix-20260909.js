(function(){
  "use strict";

  function compactSource(raw){
    const text=String(raw||"").replace(/\s+/g," ").trim();
    if(!text)return "—";
    const venueMatch=text.match(/(?:Venue|Interested venue)\s*:\s*([^|\n]+)/i);
    if(venueMatch&&venueMatch[1])return "Website - Venue: "+venueMatch[1].trim().slice(0,55);
    if(/venue profile/i.test(text))return "Website - Venue profile";
    if(/wedding/i.test(text))return "Website - Wedding page";
    if(/party/i.test(text))return "Website - Party page";
    if(/corporate/i.test(text))return "Website - Corporate page";
    if(/delhi ncr|delhi-ncr/i.test(text))return "Website - Delhi NCR page";
    if(/quick enquiry/i.test(text))return "Website - Quick enquiry";
    if(/main enquiry|home/i.test(text))return "Website - Home page";
    if(/^website/i.test(text))return text.split("|")[0].trim().slice(0,70);
    return text.slice(0,70);
  }

  function installStyles(){
    if(document.getElementById("smvCrmSourceHotfixStyles"))return;
    const style=document.createElement("style");
    style.id="smvCrmSourceHotfixStyles";
    style.textContent=`
      .table-wrapper{overflow-x:auto!important;max-width:100%!important}
      .leads-table{table-layout:fixed!important;width:100%!important;min-width:1220px!important}
      .leads-table th,.leads-table td{vertical-align:middle!important;line-height:1.35!important;font-size:13px!important;box-sizing:border-box!important}
      .leads-table th:nth-child(1),.leads-table td:nth-child(1){width:130px!important}
      .leads-table th:nth-child(2),.leads-table td:nth-child(2){width:110px!important}
      .leads-table th:nth-child(3),.leads-table td:nth-child(3){width:130px!important}
      .leads-table th:nth-child(4),.leads-table td:nth-child(4){width:150px!important}
      .leads-table th:nth-child(5),.leads-table td:nth-child(5){width:180px!important;max-width:180px!important}
      .leads-table th:nth-child(6),.leads-table td:nth-child(6){width:120px!important}
      .leads-table th:nth-child(7),.leads-table td:nth-child(7){width:105px!important}
      .leads-table th:nth-child(8),.leads-table td:nth-child(8){width:75px!important;text-align:center!important}
      .leads-table th:nth-child(9),.leads-table td:nth-child(9){width:130px!important}
      .leads-table th:nth-child(10),.leads-table td:nth-child(10){width:105px!important;text-align:center!important}
      .leads-table th:nth-child(11),.leads-table td:nth-child(11){width:90px!important;text-align:center!important}
      .leads-table th:nth-child(12),.leads-table td:nth-child(12){width:76px!important;text-align:center!important}
      .leads-table td:nth-child(5){white-space:normal!important;overflow:hidden!important;overflow-wrap:normal!important;word-break:normal!important;color:#17443d!important;font-weight:800!important}
      .smv-compact-source{display:inline-flex!important;align-items:center!important;max-width:100%!important;padding:6px 9px!important;border-radius:999px!important;background:#eefbf7!important;border:1px solid #cfeee7!important;color:#087f71!important;font-size:11.5px!important;font-weight:900!important;line-height:1.2!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      @media(max-width:900px){.leads-table{min-width:1180px!important}.leads-table th,.leads-table td{font-size:12.5px!important}.smv-compact-source{font-size:11px!important}}
    `;
    document.head.appendChild(style);
  }

  function compactTableSources(){
    const rows=document.querySelectorAll("#leadsTableBody tr");
    rows.forEach(row=>{
      const cell=row.children&&row.children[4];
      if(!cell||cell.dataset.smvSourceCompactDone==="1")return;
      const raw=cell.textContent||"";
      const short=compactSource(raw);
      cell.dataset.smvSourceCompactDone="1";
      cell.title=raw.trim();
      cell.innerHTML="<span class='smv-compact-source'></span>";
      const span=cell.querySelector("span");
      if(span)span.textContent=short;
    });
  }

  function start(){
    installStyles();
    compactTableSources();
    const tbody=document.getElementById("leadsTableBody");
    if(tbody){
      const observer=new MutationObserver(()=>setTimeout(compactTableSources,30));
      observer.observe(tbody,{childList:true,subtree:true,characterData:true});
    }
    setInterval(compactTableSources,1200);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();
})();
