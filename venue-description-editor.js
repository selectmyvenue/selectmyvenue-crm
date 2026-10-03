(function () {
  "use strict";
  const headings = new Set(["about","about venue","why stay with us","amenities","facilities and capacity","facilities","services offered","services","products and services offered","services, amenities and more","room & comfort","connectivity & services","venue highlights","key features","features","location","capacity","food","catering","events","event spaces"]);
  const esc = v => String(v == null ? "" : v).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  function sanitize(html){
    if(!html)return "";
    if(window.DOMPurify)return window.DOMPurify.sanitize(html,{USE_PROFILES:{html:true},ALLOWED_TAGS:["p","br","strong","b","em","i","u","s","h2","h3","h4","ul","ol","li","blockquote","a"],ALLOWED_ATTR:["href","target","rel"]});
    const t=document.createElement("template");t.innerHTML=html;
    t.content.querySelectorAll("script,style,iframe,object,embed,form,input,button,svg,math").forEach(n=>n.remove());
    t.content.querySelectorAll("*").forEach(n=>[...n.attributes].forEach(a=>{if(/^on/i.test(a.name)||(a.name==="href"&&/^\s*javascript:/i.test(a.value)))n.removeAttribute(a.name)}));
    return t.innerHTML;
  }
  function heading(line){
    const t=line.trim(), clean=t.replace(/^#{1,3}\s+/,"").replace(/:$/,"").trim();
    return !!clean && clean.length<=80 && (headings.has(clean.toLowerCase())||/^#{1,3}\s+/.test(t)||/^[A-Z][A-Za-z0-9 &/&()'’.-]{2,78}:$/.test(t));
  }
  function plainToHtml(value){
    const blocks=String(value||"").replace(/\r\n?/g,"\n").replace(/\u00a0/g," ").split(/\n\s*\n+/),out=[];
    for(const block of blocks){
      const lines=block.split("\n").map(x=>x.trim()).filter(Boolean);let i=0;
      while(i<lines.length){
        if(heading(lines[i])){out.push("<h3>"+esc(lines[i].replace(/^#{1,3}\s+/,"").replace(/:$/,"").trim())+"</h3>");i++;continue}
        if(/^(?:[-*•▪◦‣·])\s+/.test(lines[i])){
          const a=[];while(i<lines.length&&/^(?:[-*•▪◦‣·])\s+/.test(lines[i])){a.push("<li>"+esc(lines[i].replace(/^(?:[-*•▪◦‣·])\s+/,""))+"</li>");i++}out.push("<ul>"+a.join("")+"</ul>");continue
        }
        if(/^\d{1,2}[.)]\s+/.test(lines[i])){
          const a=[];while(i<lines.length&&/^\d{1,2}[.)]\s+/.test(lines[i])){a.push("<li>"+esc(lines[i].replace(/^\d{1,2}[.)]\s+/,""))+"</li>");i++}out.push("<ol>"+a.join("")+"</ol>");continue
        }
        const a=[];while(i<lines.length&&!heading(lines[i])&&!/^(?:[-*•▪◦‣·])\s+/.test(lines[i])&&!/^\d{1,2}[.)]\s+/.test(lines[i])){a.push(lines[i]);i++}
        out.push(a.length>=3&&a.every(x=>x.length<=150)?"<ul>"+a.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"<p>"+a.map(esc).join("<br>")+"</p>");
      }
    }
    return out.join("");
  }
  function valueToHtml(v){const raw=String(v||"");return !raw.trim()?"":/<(?:p|br|strong|b|em|i|u|s|h[1-6]|ul|ol|li|blockquote|a)\b/i.test(raw)?sanitize(raw):sanitize(plainToHtml(raw))}
  function init(){
    const source=document.getElementById("venueDescription");if(!source||source.dataset.smvRichReady==="1")return;
    const wrap=document.createElement("div");wrap.className="smv-rich-description";
    wrap.innerHTML='<div class="smv-rich-toolbar" role="toolbar"><button type="button" data-cmd="bold"><strong>B</strong></button><button type="button" data-cmd="italic"><em>I</em></button><button type="button" data-block="h3">H</button><button type="button" data-cmd="insertUnorderedList">• List</button><button type="button" data-cmd="insertOrderedList">1. List</button><button type="button" data-cmd="formatBlock" data-value="blockquote">❝</button><span class="smv-rich-toolbar-sep"></span><button type="button" data-cmd="undo">↶</button><button type="button" data-cmd="redo">↷</button><button type="button" data-action="clear">Clear</button></div><div id="venueDescriptionEditor" class="smv-rich-editor" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true"></div><div class="smv-rich-footer"><span>Paste from Word / Google Docs and headings, spacing, bullets and numbering will be kept.</span><span id="venueDescriptionCount">0 words</span></div>';
    source.hidden=true;source.setAttribute("aria-hidden","true");source.insertAdjacentElement("afterend",wrap);
    const editor=wrap.querySelector("#venueDescriptionEditor");
    const refresh=()=>{const t=(editor.innerText||"").replace(/\s+/g," ").trim(),n=t?t.split(" ").length:0;wrap.querySelector("#venueDescriptionCount").textContent=n+" word"+(n===1?"":"s")};
    const clean=()=>{const v=sanitize(editor.innerHTML);if(v!==editor.innerHTML)editor.innerHTML=v;refresh()};
    wrap.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;e.preventDefault();editor.focus();if(b.dataset.action==="clear"){document.execCommand("removeFormat",false);document.execCommand("formatBlock",false,"p")}else if(b.dataset.block){document.execCommand("formatBlock",false,b.dataset.block)}else if(b.dataset.cmd){document.execCommand(b.dataset.cmd,false,b.dataset.value||null)}clean()});
    editor.addEventListener("input",clean);
    editor.addEventListener("paste",e=>{e.preventDefault();const html=e.clipboardData?.getData("text/html"),text=e.clipboardData?.getData("text/plain")||"";document.execCommand("insertHTML",false,html?sanitize(html):plainToHtml(text));clean()});
    window.SMVVenueDescription={init,setValue(v){editor.innerHTML=valueToHtml(v);refresh()},clear(){editor.innerHTML="";refresh()},getHtml(){const v=sanitize(editor.innerHTML).trim();return v||null},getText(){return(editor.innerText||"").trim()}};
    source.dataset.smvRichReady="1";editor.innerHTML=valueToHtml(source.value);refresh();
  }
  window.SMVVenueDescription=window.SMVVenueDescription||{init};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();