/* Motor del formulario v7 (copiado del HTML original de la FVF).
   Cambios respecto del original, solo los necesarios para la app:
   - las respuestas se guardan y se envían al servidor (host.onSave / host.onSubmit), no en localStorage
   - el club viene de la sesión: se muestra fijo y no se puede cambiar
   - modo de solo lectura cuando la evaluación ya fue enviada o la temporada está cerrada
   - se quitó el modo de revisión interna por área
   Todo lo visual (pasos, mapa, camiseta, estadio, redes, etc.) es idéntico. */
import { MODS, QIDX, NOSE, FORM_ID } from "@shared/formulario.js";
import { MAPA } from "./mapa.js";

export function mountForm(host){
const VERSION = host.version;
const CLUBES_LIGA = host.clubes;
const LOGO_FVF = "/logos/fvf.png", LOGO_FEM = "/logos/liga-futve-fem.png";

/* ===== Motor ===== */
const $ = s => document.querySelector(s);
const form = $("#f"), nav = $("#nav");
let cur = 0;
const KEY = "fvf-"+FORM_ID;
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}

function field(q){
  const n = q.id, ph = q.ph ? ` placeholder="${esc(q.ph)}"` : "";
  switch(q.type){
    case "text": case "email": case "tel": return `<input type="${q.type}" name="${n}"${ph}>`;
    case "number": return `<input type="number" min="0" inputmode="numeric" name="${n}"${ph}>`;
    case "textarea": return `<textarea name="${n}"${ph}></textarea>`;
    case "select": return `<select name="${n}"><option value="">Seleccione…</option>${q.o.map(o=>`<option>${esc(o)}</option>`).join("")}</select>`;
    case "radio": case "check": {
      const ty = q.type==="radio"?"radio":"checkbox";
      return `<div class="opts">${q.o.map(o=>`<label class="opt"><input type="${ty}" name="${n}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join("")}</div>`;
    }
    case "scale": return `<div class="scale">${[1,2,3,4,5].map(v=>`<label><input type="radio" name="${n}" value="${v}">${v}</label>`).join("")}</div><div class="scale-legend"><span>1 · ${esc(q.min)}</span><span>5 · ${esc(q.max)}</span></div>`;
    case "grid": return `<div class="grid"><table><thead><tr><th></th>${q.cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${q.rows.map((r,i)=>`<tr><td>${esc(r)}</td>${q.cols.map(c=>`<td><label class="gc"><input type="radio" name="${n}__${i}" value="${esc(c)}" aria-label="${esc(r)}: ${esc(c)}"><span class="gl">${esc(c)}</span></label></td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    case "kit": return kitHTML(q);
    case "estadio": return estHTML(q);
    case "redes": return redesHTML(q);
    case "numred": return `<div class="redes numred">${q.rows.map((r,i)=>`<div class="rr"><div class="rn">${esc(r)}</div><input type="number" min="0" inputmode="numeric" name="${n}__${i}" placeholder="Seguidores" aria-label="Seguidores en ${esc(r)}"></div>`).join("")}</div>`;
    case "rank": return `<div class="rank" data-rank="${n}"><ol>${q.o.map(o=>`<li data-v="${esc(o)}"><span class="num"></span><span class="txt">${esc(o)}</span><button type="button" data-up aria-label="Subir">↑</button><button type="button" data-down aria-label="Bajar">↓</button></li>`).join("")}</ol></div>`;
  }
}

function build(){
  MODS.forEach((m,i)=>{
    const b = document.createElement("button");
    b.type="button"; b.innerHTML=`<span class="n">${i}</span>${esc(m.titulo)}`;
    b.onclick=()=>go(i); nav.appendChild(b);
    const s = document.createElement("section");
    s.className="mod"; s.dataset.i=i;
    s.innerHTML = `<div class="modhead"><span class="tag">${esc(m.tag)}</span><h2>${esc(m.titulo)}</h2><p>${esc(m.quien)}</p></div>` +
      m.qs.map(q=>`<div class="q${q.if?" cond":""}" data-q="${q.id}"${q.if?` data-if="${esc(q.if[0])}" data-eq="${esc(q.if[1])}"`:""}><label class="t">${esc(q.t)}${q.req?' <span class="req">*</span>':""}</label>${q.h?`<div class="h">${esc(q.h)}</div>`:""}${field(q)}${q.nota?`<div class="h nota">${esc(q.nota)}</div>`:""}</div>`).join("");
    form.appendChild(s);
  });
  form.addEventListener("click",e=>{
    const li = e.target.closest("li"); if(!li) return;
    if(e.target.hasAttribute("data-up") && li.previousElementSibling) li.parentNode.insertBefore(li, li.previousElementSibling);
    if(e.target.hasAttribute("data-down") && li.nextElementSibling) li.parentNode.insertBefore(li.nextElementSibling, li);
    if(e.target.matches("[data-up],[data-down]")){ numberRanks(); li.closest(".rank").dataset.touched="1"; save(); }
  });
  form.addEventListener("change",e=>{
    const t = e.target;
    MODS.forEach(m=>m.qs.forEach(q=>{
      if(q.max && t.name===q.id){
        const c = form.querySelectorAll(`[name="${q.id}"]:checked`);
        if(c.length>q.max){ t.checked=false; flash(`Puede marcar hasta ${q.max} opciones.`,"err"); }
      }
    }));
    conds(); save();
  });
  form.addEventListener("input", save);
  form.addEventListener("change", save); kitWire(); estWire();
  numberRanks();
}
function numberRanks(){ form.querySelectorAll(".rank li").forEach(li=>{ li.querySelector(".num").textContent = [...li.parentNode.children].indexOf(li)+1; }); }
function conds(){
  form.querySelectorAll(".cond").forEach(d=>{
    const v = valueOf(d.dataset.if);
    const on = Array.isArray(v) ? v.includes(d.dataset.eq) : v===d.dataset.eq;
    d.classList.toggle("show", on);
  });
}
function valueOf(name){
  const els = form.querySelectorAll(`[name="${name}"]`); if(!els.length) return "";
  const e0 = els[0];
  if(e0.type==="checkbox") return [...els].filter(e=>e.checked).map(e=>e.value);
  if(e0.type==="radio"){ const c=[...els].find(e=>e.checked); return c?c.value:""; }
  return e0.value.trim();
}
function collect(){
  const r = {};
  MODS.forEach(m=>m.qs.forEach(q=>{
    if(q.type==="grid"||q.type==="estadio"||q.type==="numred"){ const o={}; q.rows.forEach((row,i)=>{ o[row]=valueOf(`${q.id}__${i}`); }); r[q.id]=o; }
    else if(q.type==="redes"){ const o={}; REDES.forEach((rd,i)=>{ o[rd]={usuario:valueOf(`${q.id}__${i}__u`),cuenta:valueOf(`${q.id}__${i}__e`)}; }); r[q.id]=o; }
    else if(q.type==="kit"){ r[q.id]=valueOf(q.id); r[q.id+"_extras"]=(EXTRAS[q.id]||[]).map(x=>({...x})); }
    else if(q.type==="rank"){ const box=form.querySelector(`[data-rank="${q.id}"]`); r[q.id]= box.dataset.touched ? [...box.querySelectorAll("li")].map(li=>li.dataset.v) : []; }
    else r[q.id]=valueOf(q.id);
  }));
  return r;
}
function restore(r){
  MODS.forEach(m=>m.qs.forEach(q=>{
    const v = r[q.id]; if(v==null) return;
    if(q.type==="numred"){ q.rows.forEach((row,i)=>{ const el=form.querySelector(`[name="${q.id}__${i}"]`); if(el&&v[row]) el.value=v[row]; }); return; }
    if(q.type==="grid"||q.type==="estadio"){ q.rows.forEach((row,i)=>{ const x=form.querySelector(`[name="${q.id}__${i}"][value="${CSS.escape(v[row]||"")}"]`); if(x) x.checked=true; }); if(q.type==="estadio") estPaint(q.id,q); }
    else if(q.type==="redes"){ REDES.forEach((rd,i)=>{ const o=v[rd]||{}; [["u","usuario"],["e","cuenta"]].forEach(([k,f])=>{ const el=form.querySelector(`[name="${q.id}__${i}__${k}"]`); if(el&&o[f]) el.value=o[f]; }); }); }
    else if(q.type==="kit"){ v.forEach(val=>{ const x=form.querySelector(`[name="${q.id}"][value="${CSS.escape(val)}"]`); if(x) x.checked=true; }); EXTRAS[q.id]=(r[q.id+"_extras"]||[]); kitPaint(q.id); }
    else if(q.type==="rank"){ if(!v.length) return; const box=form.querySelector(`[data-rank="${q.id}"]`), ol=box.querySelector("ol"); v.forEach(val=>{ const li=[...ol.children].find(l=>l.dataset.v===val); if(li) ol.appendChild(li); }); box.dataset.touched="1"; }
    else if(Array.isArray(v)){ v.forEach(val=>{ const x=form.querySelector(`[name="${q.id}"][value="${CSS.escape(val)}"]`); if(x) x.checked=true; }); }
    else { const els=form.querySelectorAll(`[name="${q.id}"]`); if(!els.length) return; if(els[0].type==="radio"){ const x=[...els].find(e=>e.value===v); if(x) x.checked=true; } else els[0].value=v; }
  }));
  numberRanks(); conds();
}
let tSave, tProg, guardando=null;
const hora = () => new Date().toLocaleTimeString("es-VE",{hour:"numeric",minute:"2-digit"});
function save(){
  clearTimeout(tProg); tProg=setTimeout(progress,300);
  if(host.readOnly) return;
  clearTimeout(tSave); $("#saved").textContent="Guardando…"; tSave=setTimeout(saveNow,900);
}
/* Guarda en el servidor; si falla reintenta cada 5 s sin perder lo escrito */
async function saveNow(){
  clearTimeout(tSave);
  if(host.readOnly) return;
  while(guardando) await guardando;
  guardando=(async()=>{
    try{ await host.onSave(collect()); $("#saved").textContent="Borrador guardado · "+hora(); }
    catch(e){ $("#saved").textContent = e && e.message ? e.message : "No se pudo guardar. Reintentando…"; if(!(e && e.fatal)) tSave=setTimeout(saveNow,5000); }
  })();
  await guardando; guardando=null;
}
function progress(){
  const r = collect(); let total=0, done=0;
  MODS.forEach(m=>m.qs.forEach(q=>{ if(q.if) return; total++; const v=r[q.id];
    const ok = (q.type==="grid"||q.type==="estadio"||q.type==="numred") ? Object.values(v).some(Boolean) : q.type==="redes" ? Object.values(v).some(o=>o.usuario) : Array.isArray(v) ? v.length>0 : !!v; if(ok) done++; }));
  $("#prog").style.width = Math.round(done/total*100)+"%";
  if(typeof afterProgress==="function") afterProgress(r);
}
function go(i,quiet){
  cur=i;
  form.querySelectorAll("section.mod").forEach(s=>s.classList.toggle("on", +s.dataset.i===i));
  nav.querySelectorAll("button").forEach((b,j)=>b.classList.toggle("on", j===i));
  $("#prev").style.visibility = i===0 ? "hidden" : "visible";
  $("#next").textContent = i===MODS.length-1 ? "Enviar evaluación" : "Siguiente";
  $("#next").style.visibility = host.readOnly && i===MODS.length-1 ? "hidden" : "visible";
  $("#next").className = "btn " + (i===MODS.length-1 ? "o" : "p");
  const nb=nav.querySelectorAll("button")[i]; nav.scrollLeft = nb.offsetLeft - nav.clientWidth/2 + nb.offsetWidth/2;
  if(quiet) return;
  const ii=$("#intro"); window.scrollTo({top: ii.offsetTop+ii.offsetHeight, behavior:"smooth"});
}
function flash(t,k){ const m=$("#msg"); m.textContent=t; m.className="msg show "+k; clearTimeout(m._t); m._t=setTimeout(()=>m.className="msg",4500); }
function mapa(){ const m={}; MODS.forEach(mod=>mod.qs.forEach(q=>{ m[q.id]={modulo:mod.titulo, pilar:q.pl||mod.pl, fifa:q.fi||mod.fi}; })); return m; }
function payload(){ return {formulario:FORM_ID, version:VERSION, enviado:new Date().toISOString(), respuestas:collect(), mapa:mapa()}; }
function download(){
  const p = payload(), club = (p.respuestas.club==="Otro (escríbalo abajo)" ? p.respuestas.club_otro : p.respuestas.club) || "club";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:"application/json"}));
  a.download = `Evaluación ${club}.json`; a.click();
}
async function submit(){
  const r = collect();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.correo)){ go(0); flash("Revise el correo institucional del club en el Módulo 0.","err"); return; }
  if(!confirm("Al enviar la evaluación ya no podrá modificarla. ¿Desea enviarla ahora?")) return;
  $("#next").disabled=true; $("#next").textContent="Enviando…";
  clearTimeout(tSave);
  try{
    while(guardando) await guardando;
    await host.onSubmit(collect());
    finish();
  }catch(e){
    flash(e && e.status ? e.message : "No se pudo enviar. Revise su conexión e intente de nuevo; su borrador sigue guardado.","err");
    $("#next").disabled=false; $("#next").textContent="Enviar evaluación";
  }
}
function finish(){
  ["#f","#nav","#foot","#intro"].forEach(s=>$(s).style.display="none");
  document.querySelector(".bar").style.display="none";
  $("#done").style.display="block"; window.scrollTo({top:0});
}
/* ===== Tipos gráficos: camiseta, estadio, redes ===== */
const KIT_ZONAS = ["Pecho","Manga derecha","Manga izquierda","Costados","Short","Medias","Nuca","Espalda superior","Espalda inferior"];
const KIT_EXTRA_OPC = ["Ningún espacio disponible","Debemos consultarlo"];
const EXTRAS = {};
function kitSVG(view){
  const z=(name,shape,tx,ty,lbl)=>`<g class="kz" data-z="${name}">${shape}${tx?`<text x="${tx}" y="${ty}">${lbl||"MARCA"}</text>`:""}</g>`;
  const shirt = `<path class="kbody" d="M92 38 L122 26 Q150 46 178 26 L208 38 L250 70 L230 110 L206 98 L207 212 Q150 220 93 212 L94 98 L70 110 L50 70 Z"/>`
    + `<path class="ktrim" d="M50 70 L70 110 L77 106.5 L57 66.5Z M250 70 L230 110 L223 106.5 L243 66.5Z"/>`
    + `<path class="ktrim" d="M93 204 Q150 212 207 204 L207 212 Q150 220 93 212Z"/>`
    + `<path class="kfold" d="M94 100 Q99 150 95 204 M206 100 Q201 150 205 204"/>`;
  const collarF = `<path class="kcol" d="M122 26 Q150 46 178 26 L171 23 Q150 39 129 23Z"/><path class="ktrim" d="M134 33 L150 52 L166 33 Q150 43 134 33Z"/>`;
  const collarB = `<path class="kcol" d="M122 26 Q150 35 178 26 L173 22 Q150 30 127 22Z"/>`;
  const shorts = `<path class="kshort" d="M98 222 H202 L208 268 H157 L150 250 L143 268 H92 Z"/><path class="ktrim" d="M92.4 262 H143.6 L143 268 H92Z M156.4 262 H207.6 L208 268 H157Z"/>`;
  const socks = `<path class="ksock" d="M106 280 h28 v52 h-28 Z M166 280 h28 v52 h-28 Z"/><path class="ktrim" d="M106 284 h28 v5 h-28Z M166 284 h28 v5 h-28Z"/>`;
  const common = z("Manga derecha",`<polygon points="55,73 89,45 93,96 72,105"/>`,78,80)
    + z("Manga izquierda",`<polygon points="245,73 211,45 207,96 228,105"/>`,222,80)
    + z("Short",`<rect x="104" y="230" width="38" height="22" rx="3"/>`,123,244)
    + z("Medias",`<path d="M109 294 h22 v30 h-22 Z M169 294 h22 v30 h-22 Z"/>`,120,312,"M");
  const front = z("Costados",`<path d="M97 124 h11 v74 h-11 Z M192 124 h11 v74 h-11 Z"/>`)
    + `<image class="kcrest" x="164" y="56" width="24" height="24" style="display:none" preserveAspectRatio="xMidYMid meet"/>`
    + z("Pecho",`<rect x="111" y="90" width="78" height="36" rx="5"/>`,150,111);
  const back = z("Nuca",`<rect x="133" y="34" width="34" height="13" rx="3"/>`,150,43.5,"M")
    + z("Espalda superior",`<rect x="108" y="58" width="84" height="26" rx="4"/>`,150,74)
    + `<text x="150" y="152" class="knum">10</text>`
    + z("Espalda inferior",`<rect x="108" y="172" width="84" height="28" rx="4"/>`,150,189);
  return `<svg class="kv kv-${view}" viewBox="0 0 300 340" role="img" aria-label="Uniforme, vista de ${view}">${shirt}${view==="frente"?collarF:collarB}${shorts}${socks}${view==="frente"?front:back}${common}<text x="150" y="16" class="klbl">${view==="frente"?"FRENTE":"ESPALDA"}</text></svg>`;
}
function kitHTML(q){
  const n=q.id;
  return `<div class="kit" data-kit="${n}">
   <div class="kitlist opts">${KIT_ZONAS.concat(KIT_EXTRA_OPC).map(o=>`<label class="opt"><input type="checkbox" name="${n}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join("")}<div class="kextras"></div></div>
   <div class="kitstage">
     <div class="kitbar"><button type="button" class="kb on" data-kv="frente">Frente</button><button type="button" class="kb" data-kv="espalda">Espalda</button><button type="button" class="kb add" data-kadd>+ Agregar espacio</button></div>
     <div class="kitcanvas" data-view="frente">${kitSVG("frente")}${kitSVG("espalda")}<div class="kxl"></div></div>
     <div class="h">Toque una zona para marcarla. Con «Agregar espacio» cree un recuadro, arrástrelo a su lugar y póngale nombre.</div>
   </div></div>`;
}
function kitPaint(n){
  const box=form.querySelector(`[data-kit="${n}"]`); if(!box) return;
  const on=valueOf(n);
  box.querySelectorAll(".kz").forEach(p=>p.classList.toggle("on", on.includes(p.dataset.z)));
  const view=box.querySelector(".kitcanvas").dataset.view, layer=box.querySelector(".kxl");
  layer.innerHTML=(EXTRAS[n]||[]).map((x,i)=>x.v===view?`<div class="kx" data-i="${i}" style="left:${x.x}%;top:${x.y}%"><span>${esc(x.n)}</span><button type="button" data-kdel="${i}" aria-label="Quitar">×</button></div>`:"").join("");
  box.querySelector(".kextras").innerHTML=(EXTRAS[n]||[]).map(x=>`<div class="opt on-x"><span>+ ${esc(x.n)} <small>(${x.v})</small></span></div>`).join("");
}
function kitWire(){
  form.addEventListener("click",e=>{
    const box=e.target.closest(".kit"); if(!box) return; const n=box.dataset.kit;
    const kz=e.target.closest(".kz");
    if(kz){ const cb=box.querySelector(`input[value="${CSS.escape(kz.dataset.z)}"]`); cb.checked=!cb.checked; cb.dispatchEvent(new Event("change",{bubbles:true})); return; }
    const kv=e.target.closest("[data-kv]");
    if(kv){ box.querySelector(".kitcanvas").dataset.view=kv.dataset.kv; box.querySelectorAll("[data-kv]").forEach(b=>b.classList.toggle("on",b===kv)); kitPaint(n); return; }
    if(e.target.closest("[data-kadd]")){
      const nm=(prompt("Nombre del espacio (por ejemplo: hombro, cuello, número)")||"").trim(); if(!nm) return;
      (EXTRAS[n]=EXTRAS[n]||[]).push({n:nm,v:box.querySelector(".kitcanvas").dataset.view,x:42,y:45}); kitPaint(n); save(); return;
    }
    const del=e.target.closest("[data-kdel]");
    if(del){ const view=box.querySelector(".kitcanvas").dataset.view; EXTRAS[n].splice(+del.dataset.kdel,1); kitPaint(n); save(); }
  });
  form.addEventListener("change",e=>{ const box=e.target.closest(".kit"); if(box) kitPaint(box.dataset.kit); });
  let drag=null;
  form.addEventListener("pointerdown",e=>{
    const kx=e.target.closest(".kx"); if(!kx||e.target.closest("[data-kdel]")) return;
    const box=kx.closest(".kit"); drag={n:box.dataset.kit,i:+kx.dataset.i,el:kx,cv:box.querySelector(".kitcanvas")}; kx.setPointerCapture(e.pointerId); e.preventDefault();
  });
  form.addEventListener("pointermove",e=>{
    if(!drag) return; const r=drag.cv.getBoundingClientRect();
    const x=Math.max(0,Math.min(88,(e.clientX-r.left)/r.width*100-6)), y=Math.max(0,Math.min(94,(e.clientY-r.top)/r.height*100-3));
    drag.el.style.left=x+"%"; drag.el.style.top=y+"%"; EXTRAS[drag.n][drag.i].x=+x.toFixed(1); EXTRAS[drag.n][drag.i].y=+y.toFixed(1);
  });
  form.addEventListener("pointerup",()=>{ if(drag){ drag=null; save(); } });
}

const EST_FORMAS = [
  `<rect x="60" y="208" width="240" height="11" rx="2"/>`,
  `<rect x="60" y="21" width="240" height="11" rx="2"/>`,
  `<rect x="41" y="40" width="11" height="160" rx="2"/>`,
  `<rect x="308" y="40" width="11" height="160" rx="2"/>`,
  `<rect x="266" y="225" width="52" height="13" rx="2"/>`,
  `<rect x="6" y="4" width="62" height="14" rx="2"/>`,
  `<rect x="160" y="4" width="40" height="13" rx="2"/>`,
  `<rect x="228" y="225" width="30" height="13" rx="2"/>`,
  `<rect x="110" y="225" width="100" height="10" rx="2"/>`,
  `<rect x="208" y="4" width="40" height="13" rx="2"/>`,
  `<rect x="164" y="104" width="32" height="32" rx="16"/>`,
  `<rect x="54" y="96" width="10" height="48" rx="2"/>`
];
function estHTML(q){
  const n=q.id;
  let sd=7; const rnd=()=>{ sd=(sd*9301+49297)%233280; return sd/233280; };
  const CC=["#68348B","#E856EF","#AF9757","#C48F9D","#FFFFFF","#8A3A52"];
  let crowd="";
  const band=(x0,x1,y0,y1)=>{ for(let x=x0;x<x1;x+=5.2){ for(let y=y0;y<y1;y+=4.6){ if(rnd()<.45) crowd+=`<circle cx="${(x+rnd()*1.4).toFixed(1)}" cy="${(y+rnd()*1.2).toFixed(1)}" r="1.5" fill="${CC[Math.floor(rnd()*CC.length)]}"/>`; } } };
  band(4,356,3,18); band(4,356,225,243); band(3,32,22,222); band(328,357,22,222);
  let stripes=""; for(let i=0;i<12;i++) stripes+=`<rect x="${60+i*20}" y="40" width="20" height="160" fill="${i%2?"#46995A":"#3E8E4F"}"/>`;
  const field=`<rect width="360" height="245" fill="#2A1238"/><g opacity=".55">${crowd}</g><rect x="34" y="19" width="292" height="204" rx="3" fill="#2F7A41"/>${stripes}<g stroke="#fff" stroke-width="1.4" fill="none" opacity=".9"><rect x="66" y="46" width="228" height="148"/><line x1="180" y1="46" x2="180" y2="194"/><circle cx="180" cy="120" r="20"/><rect x="66" y="88" width="28" height="64"/><rect x="266" y="88" width="28" height="64"/><rect x="66" y="106" width="10" height="28"/><rect x="284" y="106" width="10" height="28"/></g><rect x="61" y="111" width="5" height="18" fill="#fff" opacity=".85"/><rect x="294" y="111" width="5" height="18" fill="#fff" opacity=".85"/>`;
  const zones=q.rows.map((r,i)=>(EST_FORMAS[i]||"").replace(/^<rect/,`<rect class="ez" data-ei="${i}"`)+`<title>${esc(r)}</title>`).join("");
  const brand=`<g pointer-events="none" font-family="Prometo,Jost,sans-serif" font-weight="800" font-size="6" fill="#68348B" opacity=".75" letter-spacing="1.2" text-anchor="middle"><text x="140" y="216">LIGA FUTVE FEM</text><text x="240" y="216">LIGA FUTVE FEM</text><text x="140" y="29">LIGA FUTVE FEM</text><text x="240" y="29">LIGA FUTVE FEM</text></g>`
    + (typeof LOGO_FEM!=="undefined"?`<image href="${LOGO_FEM}" x="171.5" y="107" width="17" height="26" pointer-events="none"/>`:"");
  return `<div class="est" data-est="${n}">
    <div class="estmap"><svg class="estsvg" viewBox="0 0 360 245" role="img" aria-label="Plano del estadio en día de partido de la Liga FUTVE Fem">${field}${zones}${brand}
      <g class="enum">${q.rows.map((r,i)=>{ if(i===10) return ""; const m=(EST_FORMAS[i]||"").match(/x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/); if(!m) return ""; let cx=+m[1]+ +m[3]/2, cy=+m[2]+ +m[4]/2+3; if(i===0||i===1) cx=+m[1]+14; return `<text x="${cx}" y="${cy}">${i+1}</text>`;}).join("")}<text x="198" y="108">11</text></g></svg>
    <div class="elg">${q.cols.map((c,k)=>`<span><i class="sw sw${k}"></i>${esc(c)}</span>`).join("")}</div></div>
    <div class="estlist">${q.rows.map((r,i)=>`<div class="er" data-ri="${i}"><div class="en"><b>${i+1}</b> ${esc(r)}</div><div class="echips">${q.cols.map((c,k)=>`<label class="ec ec${k}"><input type="radio" name="${n}__${i}" value="${esc(c)}"><span>${esc(c)}</span></label>`).join("")}</div></div>`).join("")}</div>
  </div>`;
}
function estPaint(n,q){
  const box=form.querySelector(`[data-est="${n}"]`); if(!box) return;
  q.rows.forEach((r,i)=>{ const v=valueOf(`${n}__${i}`), k=q.cols.indexOf(v); const z=box.querySelector(`.ez[data-ei="${i}"]`); if(z){ z.setAttribute("class","ez"+(k>=0?" st"+k:"")); } });
}
function estWire(){
  form.addEventListener("click",e=>{
    const z=e.target.closest(".ez"); if(!z) return; const box=z.closest(".est");
    const row=box.querySelector(`.er[data-ri="${z.dataset.ei}"]`); box.querySelectorAll(".er").forEach(r=>r.classList.remove("hl")); row.classList.add("hl");
    row.scrollIntoView({block:"nearest",behavior:"smooth"});
  });
  form.addEventListener("change",e=>{ const box=e.target.closest(".est"); if(!box) return; const q=QIDX[box.dataset.est]; estPaint(box.dataset.est,q); });
}

const REDES = ["Instagram","TikTok","Facebook","X","YouTube"];
const SEGUIDORES = ["Menos de 1.000","1.000 a 5.000","5.001 a 20.000","20.001 a 100.000","Más de 100.000"];
const RED_CLS = {Instagram:"ig",TikTok:"tt",Facebook:"fb",X:"x",YouTube:"yt"};
const RED_SVG = {
  Instagram:`<path d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3zM12 16.2a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4z"/><circle cx="17.3" cy="6.8" r="1.1" fill="currentColor" stroke="none"/>`,
  TikTok:`<path d="M13.6 2.5h3.1a4.6 4.6 0 0 0 4.3 4.2v3.2a7.6 7.6 0 0 1-4.3-1.4v6.6a6.2 6.2 0 1 1-6.2-6.2c.3 0 .6 0 .9.1v3.3a3 3 0 1 0 2.2 2.9z"/>`,
  X:`<path d="M3.5 3h5l4.2 5.8L17.6 3h2.7l-6.4 7.4L21 21h-5l-4.6-6.3L5.9 21H3.2l7-8z"/>`,
  Facebook:`<path d="M12 2a10 10 0 0 0-1.6 19.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 12 2z"/>`,
  YouTube:`<path fill-rule="evenodd" d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3z"/>`
};
function netSvg(r){ return `<svg viewBox="0 0 24 24" aria-hidden="true">${RED_SVG[r]}</svg>`; }
function redIco(r){ return `<span class="sico ${RED_CLS[r]}">${netSvg(r)}</span>`; }
function redesHTML(q){
  const n=q.id;
  return `<div class="redes">${REDES.map((r,i)=>`<div class="rr n-${RED_CLS[r]}"><div class="rn">${redIco(r)}${r}</div>
    <input type="text" name="${n}__${i}__u" placeholder="@usuario o «no tenemos»" aria-label="Usuario en ${r}">
    <select name="${n}__${i}__e" aria-label="De quién es la cuenta de ${r}"><option value="">¿De quién es?</option><option>Exclusiva del femenino</option><option>Compartida con el club</option></select></div>`).join("")}</div>`;
}

/* =====================================================================
   CAPA VISUAL v7 · Liga FUTVE Fem
   Solo presentación: cada control escribe en los mismos campos de v6.
   ===================================================================== */
const RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const OTRO = "Otro (escríbalo abajo)";
const MODIDX = {club:0,deportivo:1,base:2,comercial:3,marca:4,prensa:5};
const SVGI = (d,cls) => `<svg viewBox="0 0 24 24" ${cls?`class="${cls}"`:""} aria-hidden="true"><path d="${d}"/></svg>`;
const IC = {
  check:"M5 12.5l4.2 4.2L19 7", cross:"M6 6l12 12M18 6L6 18", plus:"M12 5v14M5 12h14",
  bus:"M6 3h12a2 2 0 0 1 2 2v12H4V5a2 2 0 0 1 2-2zM4 11h16M7 20v-3M17 20v-3M7.5 14.5h.01M16.5 14.5h.01",
  bed:"M3 19V6M3 14h18v5M21 14v-2.5a3 3 0 0 0-3-3h-7V14M7 11.5a1.8 1.8 0 1 0 0-.01",
  drop:"M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11zM9.5 14.5a2.5 2.5 0 0 0 2.5 2.5",
  shoe:"M3 15V8.5l4.5 1 3 3.5 6 .8c2 .3 4 1.4 4.5 3.2H3zM3 17.5h18M6 17.5v2M10.5 17.5v2M15 17.5v2",
  ball:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8l3.6 2.6-1.4 4.2H9.8l-1.4-4.2zM12 8V3.5M15.6 10.6l4.2-1.4M14.2 14.8l2.6 3.6M9.8 14.8l-2.6 3.6M8.4 10.6L4.2 9.2",
  soap:"M9 3h6M12 3v3M8 10a2 2 0 0 1 2-4h4a2 2 0 0 1 2 4v9a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2zM10 13h4",
  medic:"M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z",
  shield:"M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.8 12l2.2 2.2 4.2-4.4",
  gym:"M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11",
  pen:"M4 20l4.5-1L19 8.5 15.5 5 5 15.5zM13.5 7l3.5 3.5",
  camera:"M4 8h3.2l1.8-2.6h6L16.8 8H20v11H4zM12 16.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2z",
  video:"M3 7h12v10H3zM15 10.5l6-3.5v10l-6-3.5",
  phone:"M8 3h8a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 16 21H8a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 8 3zM10.5 8.5l2.6 1.7-2.6 1.7zM10.5 17.5h3",
  palette:"M12 3a9 9 0 0 0 0 18c1.4 0 2-1 2-2s-.9-1.5-.9-2.5S14 15 15 15h2a4 4 0 0 0 4-4c0-4.4-4-8-9-8zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01",
  mega:"M3 10v4h3l8 4.5V5.5L6 10zM17.5 9a4 4 0 0 1 0 6M6 14l1.2 5H9.5",
  film:"M4 4h16v16H4zM8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4",
  reel:"M7.5 3h9v18h-9zM11 9.5v5l4-2.5z",
  mic:"M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21",
  news:"M4 5h13v14H5.5A1.5 1.5 0 0 1 4 17.5zM17 8.5h3v9.5a1.5 1.5 0 0 1-3 0M7 9h7M7 12h7M7 15h4.5",
  live:"M12 12h.01M8.6 8.6a4.8 4.8 0 0 0 0 6.8M15.4 8.6a4.8 4.8 0 0 1 0 6.8M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8",
  signal:"M5 19v-3M9.5 19v-6M14 19v-9M18.5 19V5",
  wifi:"M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0M12 19.5h.01",
  sat:"M10.5 7.5l6 6-3 3-6-6zM15 3.5l5.5 5.5-2.5 2.5L12.5 6zM3.5 15l5.5 5.5M7.5 13.5L5 16M5 21a4 4 0 0 1-2-2",
  modem:"M9 3h6v5H9zM7 8h10v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2zM10.5 12h3"
};
const MOD_GL = {
  club:"M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM12 8v8M8.5 11h7",
  deportivo:"M3 5h18v14H3zM12 5v14M12 9.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8zM3 9h3v6H3M21 9h-3v6h3",
  base:"M7.5 19l3-13h3l3 13zM5 19h14M9.4 13.5h5.2",
  comercial:"M8 3L3 6l2 5 3-1v11h8V10l3 1 2-5-5-3c-1 2-2.5 2.6-4 2.6S9 5 8 3z",
  marca:"M3 10v4h3l8 4.5V5.5L6 10zM17.5 9a4 4 0 0 1 0 6M6 14l1.2 5H9.5",
  prensa:"M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"
};
const NECES_IC = [IC.bus,IC.bed,IC.drop,IC.shoe,IC.ball,IC.soap,IC.medic,IC.shield,IC.gym,IC.plus];
const CHK_IC = {
  necesidades:NECES_IC, central:NECES_IC,
  funciones:[IC.pen,IC.camera,IC.video,IC.phone,IC.palette,IC.mega],
  contenidos:[IC.camera,IC.film,IC.reel,IC.mic,IC.news,IC.live],
  conexion:[IC.signal,IC.wifi,IC.sat,IC.modem]
};
const NOSES = [NOSE,"Prefiero no decirlo","Debo consultarlo con la directiva","No aplica","No se conoce"];
const LVL = {frecuencia:[5,4,3,2,1], anticipacion:[1,2,3,4,0], seg_costo:[1,2,3,4,null,null], asistencia:[1,2,3,4,null]};
const SEM = {"Bueno":0,"Sí":0,"Disponible":0,"Regular":1,"Acceso limitado":1,"Requiere autorización":1,"Malo":2,"No":2,"No disponible":2,"No tiene":3,"No lo tenemos":3,"Debemos consultarlo":4};
const INTENS = {"Poco":1,"Medio":2,"Mucho":3};
const RIBBONS = {
  club:"Identificación", sede:"Sede de local", redes:"Redes del equipo femenino",
  plantel:"Plantel y cuerpo técnico", seguro:"Seguro médico", superficie:"Cancha y formato 2027", arbitraje:"Temporada 2026",
  elegibles:"Registro y Pasaporte Digital", prog5:"Inversión y servicios",
  ninas_7_9:"Jugadoras por edad", escuela:"Captación", entrenadoras:"Mujeres en el club", salvaguarda:"Protección y salud", convocadas:"Selecciones",
  area_comercial:"Patrocinio", uniforme:"Espacios para patrocinadores", necesidades:"Necesidades del equipo",
  gestion_mkt:"Gestión y marca", asistencia:"Público", promocion:"Día de partido", prioridades_mkt:"Prioridades",
  resp_com:"Equipo de prensa", frecuencia:"Contenidos", cob_recursos:"Cobertura", medios_rel:"Medios", voceria:"Vocería y crisis"
};



/* Geometría: VenGeoJSON (estados) simplificada; Guayana Esequiba en gris, Lago de Maracaibo en blanco. */

const qEl = id => form.querySelector(`.q[data-q="${id}"]`);
const norm = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
function answered(q,v){
  if(v==null) return false;
  if(q.type==="grid"||q.type==="estadio"||q.type==="numred") return Object.values(v).some(Boolean);
  if(q.type==="redes") return Object.values(v).some(o=>o.usuario);
  return Array.isArray(v) ? v.length>0 : !!v;
}
function initials(n){ return (String(n||"").replace(/\b(FC|de|del|la|el)\b/gi," ").trim().split(/\s+/).slice(0,2).map(w=>w[0]||"").join("").toUpperCase())||"?"; }
function clubSel(){
  const v=valueOf("club"); if(!v) return null;
  const c=CLUBES_LIGA.find(c=>c.valor===v); if(c) return c;
  if(v===OTRO){ const o=valueOf("club_otro"); return {nombre:o||"Su club", otro:true, logo:null}; }
  return {nombre:v, otro:true, logo:null};
}
function avatar(c){ return c&&c.logo ? `<img src="${c.logo}" alt="">` : `<span class="ini">${esc(initials(c?c.nombre:""))}</span>`; }
function fmtN(v){
  if(v===""||v==null) return "—";
  const n=Math.max(0,Math.floor(+v)); if(!isFinite(n)) return "—";
  const f=x=>String(x<100?Math.round(x*10)/10:Math.round(x)).replace(".",",");
  if(n<1000) return String(n);
  if(n<1e6){ const s=f(n/1000); return s==="1000"?"1 M":s+" mil"; }
  return f(n/1e6)+" M";
}
let toastT;
function toast(t){ const el=$("#toast"); el.querySelector("span").textContent=t; el.classList.add("show"); clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove("show"),2600); }
const fire = (el,ty) => el.dispatchEvent(new Event(ty||"input",{bubbles:true}));

/* ---------- construcción ---------- */
function enhance(){
  /* portada */
  $("#cvmods").textContent = MODS.length;
  $("#cvqs").textContent = MODS.reduce((a,m)=>a+m.qs.length,0);
  $("#cvcrests").innerHTML = CLUBES_LIGA.map(c=>`<span class="cc" title="${esc(c.nombre)}">${c.logo?`<img src="${c.logo}" alt="${esc(c.nombre)}">`:`<span class="ini">${esc(initials(c.nombre))}</span>`}</span>`).join("")+`<span class="ccl">Clubes de la Liga FUTVE Fem 2026</span>`;
  $("#cvgo").onclick = () => go(cur);

  /* pasos */
  nav.querySelectorAll("button").forEach((b,i)=>{
    const m=MODS[i];
    b.style.setProperty("--mc",`var(--m${MODIDX[m.id]})`);
    b.setAttribute("aria-label",`${m.tag.split(" · ")[0]}: ${m.titulo}`);
    b.innerHTML=`<span class="ring"><svg class="r" viewBox="0 0 46 46"><circle class="trk" cx="23" cy="23" r="19"/><circle class="arc" cx="23" cy="23" r="19" stroke-dasharray="119.4" stroke-dashoffset="119.4"/></svg>${SVGI(MOD_GL[m.id],"gl")}<i class="ok">${SVGI(IC.check)}</i></span><span class="lbl">${esc(m.titulo)}</span>`;
  });

  /* cabeceras de módulo */
  form.querySelectorAll("section.mod").forEach((s,i)=>{
    const m=MODS[i]; s.style.setProperty("--mc",`var(--m${MODIDX[m.id]})`);
    const h=s.querySelector(".modhead"), nq=m.qs.filter(q=>!q.if).length;
    h.insertAdjacentHTML("afterbegin",`<span class="mnum">0${MODIDX[m.id]}</span><span class="mgl">${SVGI(MOD_GL[m.id])}</span>`);
    h.insertAdjacentHTML("beforeend",`<span class="mcnt" data-mc="${i}">${nq} preguntas</span>`);
  });

  /* separadores temáticos */
  Object.entries(RIBBONS).forEach(([id,t])=>{ const el=qEl(id); if(el) el.insertAdjacentHTML("beforebegin",`<div class="ribbon">${esc(t)}</div>`); });

  /* pregunta por pregunta */
  MODS.forEach(m=>m.qs.forEach(q=>{
    const el=qEl(q.id); if(!el) return;
    if(q.id==="club") return enhClub(el);
    if(q.id==="ciudad") return enhMap(el);
    if(q.type==="radio") return enhRadio(q,el);
    if(q.type==="check") return enhCheck(q,el);
    if(q.type==="number") return enhNumber(q,el);
    if(q.type==="scale") return el.querySelector(".scale-legend").insertAdjacentHTML("afterend",`<div class="scl" data-scl="${q.id}"><div class="tr"><i></i></div><b>Toque un número</b></div>`);
    if(q.type==="rank") return enhRank(q,el);
    if(q.type==="grid") return enhGrid(q,el);
    if(q.type==="numred") return enhSocial(el);
  }));

  wireV7();
}

function enhClub(el){
  const sel=el.querySelector('select[name="club"]');
  sel.classList.add("vh"); sel.tabIndex=-1; sel.setAttribute("aria-hidden","true");
  const ck=`<span class="ck">${SVGI(IC.check)}</span>`;
  if(![...sel.options].some(o=>o.value===host.club.valor)) sel.insertAdjacentHTML("beforeend",`<option>${esc(host.club.valor)}</option>`);
  const propio = CLUBES_LIGA.filter(c=>c.valor===host.club.valor);
  if(!propio.length) propio.push({nombre:host.club.nombre, valor:host.club.valor, logo:null});
  sel.insertAdjacentHTML("afterend",`<div class="clubs" role="group" aria-label="Su club">${propio.map(c=>`<button type="button" class="club" data-club="${esc(c.valor)}" aria-pressed="false">${ck}<span class="cr${c.logo?"":" otro"}">${c.logo?`<img src="${c.logo}" alt="">`:esc(initials(c.nombre))}</span>${esc(c.nombre)}</button>`).join("")}</div><div class="clubnote" id="clubnote"></div>`);
}

function enhMap(el){
  const inp=el.querySelector('input[name="ciudad"]');
  inp.insertAdjacentHTML("beforebegin",`<div class="mapw" id="mapw"><svg class="map" viewBox="0 0 ${MAPA.w} ${MAPA.h}" role="img" aria-label="Mapa de Venezuela por estados"><path class="eseq" d="${MAPA.eseq}"/>${MAPA.states.map(s=>`<path class="st" data-st="${esc(s.n)}" d="${s.d}" fill-rule="evenodd"><title>${esc(s.n)}</title></path>`).join("")}<path class="lake" d="${MAPA.lake}"/></svg><svg class="mapov" aria-hidden="true"></svg><div class="ficha" id="ficha"></div><div class="maphint" id="maphint"></div></div>`);
  inp.insertAdjacentHTML("afterend",`<button type="button" class="sug" id="sug"></button>`);
}

function enhRadio(q,el){
  const box=el.querySelector(".opts"), labs=[...box.querySelectorAll(".opt")];
  labs.forEach(l=>{ if(NOSES.includes(l.querySelector("input").value)) l.classList.add("nose"); });
  if(q.id==="superficie"){ box.classList.add("surf"); ["nat","sin","var"].forEach((t,i)=>labs[i]&&labs[i].insertAdjacentHTML("afterbegin",`<span class="tex ${t}"></span>`)); return; }
  if(q.id==="dt_licencia"){
    box.classList.add("lic");
    labs.forEach(l=>{ const v=l.querySelector("input").value, mm=v.match(/^CONMEBOL (Pro|A|B|C)$/);
      if(mm){ l.querySelector("span").innerHTML=`<small>CONMEBOL</small><b>${mm[1]}</b>`; if(mm[1]!=="C") l.classList.add("meets"); } else l.classList.add("wide"); });
    box.insertAdjacentHTML("afterend",`<div class="lic-cap"><i></i>Cumplen el mínimo para la Temporada Élite 2027</div>`); return;
  }
  if(q.id==="asistencia") box.insertAdjacentHTML("beforebegin",tribHTML());
  if(q.id==="horario") box.insertAdjacentHTML("beforebegin",dayHTML());
  if(LVL[q.id]){
    box.classList.add("lvl");
    labs.forEach((l,i)=>{ const k=LVL[q.id][i]; if(k==null) return; l.insertAdjacentHTML("beforeend",`<span class="lv">${[1,2,3,4,5].map(j=>`<i class="${j<=k?"f":""}" style="height:${5+j*3}px"></i>`).join("")}</span>`); });
    return;
  }
  const main=q.o.filter(o=>!NOSES.includes(o));
  if(q.id!=="horario" && main.length<=4 && main.every(o=>o.length<=26)){
    box.classList.add("seg");
    labs.forEach(l=>{ const v=l.querySelector("input").value; let ic=null,c="";
      if(/^Sí(?![A-Za-zÁÉÍÓÚáéíóúÑñ])/.test(v)){ ic=IC.check; c="yes"; } else if(/^No\b/.test(v) && !NOSES.includes(v)){ ic=IC.cross; c="nope"; }
      if(ic){ l.classList.add(c); l.insertAdjacentHTML("afterbegin",`<span class="ic">${SVGI(ic)}</span>`); } });
  }
}

function enhCheck(q,el){
  const box=el.querySelector(".opts"), labs=[...box.querySelectorAll(".opt")];
  labs.forEach(l=>{ if(NOSES.includes(l.querySelector("input").value)) l.classList.add("nose"); });
  if(q.id==="cuerpo_tecnico"){ box.classList.add("board"); labs.forEach(l=>l.insertAdjacentHTML("afterbegin",`<span class="tok"><svg viewBox="0 0 18 26"><use href="#pp"/></svg></span>`)); return; }
  const ics=CHK_IC[q.id];
  if(ics){ box.classList.add("icards"); labs.forEach((l,i)=>l.insertAdjacentHTML("afterbegin",`<span class="ico">${SVGI(ics[i]||IC.plus)}</span>`)); if(q.max) box.insertAdjacentHTML("afterend",`<div class="maxc" data-maxc="${q.id}"></div>`); return; }
  box.classList.add("chips");
  labs.forEach(l=>{ if(/^Sub-\d+$/.test(l.querySelector("input").value)) l.classList.add("age"); });
}

const FIGLEG = {
  menores:`<div class="figleg"><span><i style="background:var(--fucsia)"></i>Menores de 18</span><span><i style="background:var(--lila)"></i>Resto del plantel</span></div>`,
  elegibles:`<div class="figleg"><span><i style="border:1.5px dashed var(--oro)"></i>Mínimo de la regla: 8 elegibles</span></div>`
};
const NINAS = [["ninas_16_17","16-17"],["ninas_13_15","13-15"],["ninas_10_12","10-12"],["ninas_7_9","7-9"]];
function enhNumber(q,el){
  const inp=el.querySelector(`input[name="${q.id}"]`);
  const w=document.createElement("div"); w.className="stp";
  inp.parentNode.insertBefore(w,inp);
  w.insertAdjacentHTML("beforeend",`<button type="button" data-step="-1" aria-label="Restar uno">−</button>`); w.appendChild(inp);
  w.insertAdjacentHTML("beforeend",`<button type="button" data-step="1" aria-label="Sumar uno">+</button>`);
  if(q.id.startsWith("ninas_")){
    el.classList.add("compact");
    if(q.id==="ninas_16_17") el.insertAdjacentHTML("afterend",`<div class="pyr" id="pyr"><h4>Sus jugadoras <b>por edad</b></h4>${NINAS.map(([id,l])=>`<div class="row"><span>${l} años</span><div class="b"><i data-pb="${id}" style="width:0"></i></div><b data-pn="${id}">0</b></div>`).join("")}<div class="tot">Total: <b id="pyrt">0</b></div></div>`);
    return;
  }
  w.insertAdjacentHTML("afterend",`<div class="figs" data-figs="${q.id}" aria-hidden="true"></div>${FIGLEG[q.id]||""}`);
}

function enhRank(q,el){
  const box=el.querySelector(".rank");
  box.insertAdjacentHTML("afterbegin",`<div class="rkbar"><span>Toque las tarjetas en orden o use las flechas.</span><button type="button" data-rkreset>Reiniciar</button></div>`);
  if(q.id==="costos") box.insertAdjacentHTML("beforeend",`<div class="stack" data-stack="costos"></div><div class="stackleg" data-stackleg="costos"></div>`);
}

function enhGrid(q,el){
  el.querySelectorAll(".gc").forEach(g=>{
    const v=g.querySelector("input").value;
    if(v in INTENS){ g.classList.add("nd"); g.insertAdjacentHTML("afterbegin",`<span class="lv">${[1,2,3].map(j=>`<i class="${j<=INTENS[v]?"f":""}" style="height:${4+j*3}px"></i>`).join("")}</span>`); }
    else if(v in SEM) g.classList.add("s"+SEM[v]);
  });
}

const NETS = [["Instagram","ig"],["TikTok","tt"],["X","x"],["Facebook","fb"],["YouTube","yt"]];
let netCur = "Instagram";
function enhSocial(el){
  const nr=el.querySelector(".numred");
  nr.querySelectorAll(".rr").forEach(r=>{ const net=r.querySelector(".rn").textContent.trim(); r.dataset.net=net; r.className=`rr n-${RED_CLS[net]}`; r.querySelector(".rn").insertAdjacentHTML("afterbegin",redIco(net)); r.insertAdjacentHTML("beforeend",`<div class="fm" data-fm="${net}"></div>`); const i=r.querySelector("input"); if(net==="YouTube") i.placeholder="Suscriptores"; });
  const wrap=document.createElement("div"); wrap.className="social";
  nr.parentNode.insertBefore(wrap,nr);
  wrap.innerHTML=`<div><div class="ptabs" role="tablist" aria-label="Vista previa por red">${NETS.map(([k,c])=>`<button type="button" role="tab" class="${c} n-${c}" data-net="${k}" aria-label="${k}">${netSvg(k)}</button>`).join("")}</div><div class="phone"><div class="notch"></div><div class="scr" id="pscr"><div class="sb"><span>9:41</span><span></span></div>${NETS.map(([k,c])=>`<div class="pv pv-${c}" data-pv="${k}"></div>`).join("")}</div></div><div class="pcap">Vista previa interna del perfil. Deslice o toque los íconos para cambiar de red.</div></div>`;
  wrap.appendChild(nr);
}

function tribHTML(){
  let s="",k=0;
  for(let r=0;r<6;r++){ for(let c=0;c<25;c++){ const x=10+c*11.2+(r%2)*5.6, y=68-r*10.5; s+=`<circle class="seat" data-k="${k++}" cx="${x.toFixed(1)}" cy="${y}" r="3.8"/>`; } }
  return `<div class="trib" id="trib" aria-hidden="true"><svg viewBox="0 0 300 86"><path d="M2 76 L298 76 L290 8 L10 8 Z" fill="#EDE5F0"/>${s}<rect x="0" y="77" width="300" height="9" rx="2" fill="#3E8E4F"/></svg><div class="cap"><span>Tribuna de local</span><b id="tribv">—</b></div></div>`;
}
const TRIB_ORDER = (()=>{ let sd=11; const rnd=()=>{ sd=(sd*9301+49297)%233280; return sd/233280; }; const a=[]; for(let k=0;k<150;k++){ const r=Math.floor(k/25); a.push([k, r*1.1+rnd()*3.2]); } return a.sort((x,y)=>x[1]-y[1]).map(x=>x[0]); })();
function dayHTML(){
  return `<div class="dayband" aria-hidden="true"><div class="bd"><span class="hl" id="dayhl"></span></div><div class="tk"><span style="left:0">5 a. m.</span><span style="left:26.3%">10 a. m.</span><span style="left:57.9%">4 p. m.</span><span style="left:73.7%">7 p. m.</span><span style="left:100%">12 a. m.</span></div></div>`;
}
const HRS = {"Antes de las 10:00 a. m.":[5,10],"Después de las 4:00 p. m.":[16,24],"Nocturno":[19,24],"Indiferente":[5,24]};

/* ---------- pintura ---------- */
function paintClub(){
  const v=valueOf("club"), known=CLUBES_LIGA.some(c=>c.valor===v);
  form.querySelectorAll("[data-club]").forEach(b=>{ const on=b.dataset.club===v || (b.dataset.club===OTRO && !!v && !known); b.classList.toggle("on",on); b.setAttribute("aria-pressed",on?"true":"false"); });
  const n=$("#clubnote"); if(n) n.textContent = v && v!==OTRO && !known ? `Club registrado: ${v}` : "";
}

let mapKey=null, manualState=null, vbCur=null, fichaT=null;
function stateFromText(t){ const s=norm(t); let best=null,pos=-1; MAPA.states.forEach(st=>{ const i=s.lastIndexOf(norm(st.n)); if(i>pos){ pos=i; best=st.n; } }); return best; }
function mapTarget(){
  const c=clubSel(); if(!c) return {estado:null,club:null,pick:false};
  if(c.estado) return {estado:c.estado,club:c,pick:false};
  return {estado:manualState||stateFromText(valueOf("ciudad")),club:c,pick:true};
}
const EST_LABEL = n => n==="Distrito Capital" ? "Distrito Capital" : "estado "+n;
function paintSug(estado){
  const b=$("#sug"); if(!b) return; const v=valueOf("ciudad");
  const show=!!estado && !norm(v).includes(norm(estado));
  b.classList.toggle("show",show);
  if(estado){ b.dataset.v=EST_LABEL(estado); b.textContent=`Añadir «${EST_LABEL(estado)}» al campo`; }
}
function setVB(vb){ vbCur=vb; $("#mapw svg.map").setAttribute("viewBox",vb.map(x=>x.toFixed(1)).join(" ")); }
function zoomTo(vb,cb){
  const from=vbCur||[0,0,MAPA.w,MAPA.h];
  if(RM){ setVB(vb); cb&&cb(); return; }
  const t0=performance.now(), D=950, ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  cancelAnimationFrame(zoomTo._r);
  const step=now=>{ const p=Math.min(1,(now-t0)/D), e=ease(p); setVB(from.map((a,i)=>a+(vb[i]-a)*e)); if(p<1) zoomTo._r=requestAnimationFrame(step); else cb&&cb(); };
  zoomTo._r=requestAnimationFrame(step);
}
function hideFicha(){ const f=$("#ficha"); if(f) f.classList.remove("show"); const ov=$("#mapw .mapov"); if(ov) ov.innerHTML=""; }
function placeFicha(t){
  const w=$("#mapw"), f=$("#ficha"), ov=w.querySelector(".mapov"); if(!t||!t.estado||!vbCur) return;
  const W=w.clientWidth, H=w.clientHeight; if(!W) return;
  const S=MAPA.states.find(s=>s.n===t.estado);
  const px=(S.lx-vbCur[0])/vbCur[2]*W, py=(S.ly-vbCur[1])/vbCur[3]*H;
  f.innerHTML=`${t.club&&t.club.logo?`<img src="${t.club.logo}" alt="">`:`<span class="fi">${esc(initials(t.club?t.club.nombre:t.estado))}</span>`}<div><span>${esc(t.club?t.club.nombre:"Sede")}</span><b>${esc(t.estado)}</b></div>`;
  const left = px > W/2; const top = py > H*0.45;
  f.style.left = left ? "12px" : "auto"; f.style.right = left ? "auto" : "12px";
  f.style.top = top ? "12px" : "auto"; f.style.bottom = top ? "auto" : "40px";
  requestAnimationFrame(()=>{
    const fr=f.getBoundingClientRect(), wr=w.getBoundingClientRect();
    const fx = left ? fr.right-wr.left : fr.left-wr.left, fy = top ? fr.bottom-wr.top-6 : fr.top-wr.top+6;
    ov.setAttribute("viewBox",`0 0 ${W} ${H}`);
    ov.innerHTML=`<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${fx.toFixed(1)}" y2="${fy.toFixed(1)}"/><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4"/>`;
    f.classList.add("show");
  });
}
function paintMap(){
  const w=$("#mapw"); if(!w) return;
  const t=mapTarget();
  w.classList.toggle("pick",t.pick);
  const hint=$("#maphint"), ht=!t.club?"Elija su club arriba y el mapa marca su estado":(t.pick&&!t.estado?"Toque el estado de su sede":"");
  hint.textContent=ht; hint.style.display=ht?"":"none";
  paintSug(t.estado);
  const key=(t.estado||"")+"|"+(t.club?t.club.nombre:"");
  if(!w.offsetParent){ return; }
  if(key===mapKey){ if(t.estado) placeFicha(t); return; }
  mapKey=key;
  w.querySelectorAll(".st").forEach(p=>p.classList.toggle("sel",p.dataset.st===t.estado));
  hideFicha();
  if(!t.estado){ zoomTo([0,0,MAPA.w,MAPA.h]); return; }
  const S=MAPA.states.find(s=>s.n===t.estado), bb=S.bb;
  let vw=Math.min(MAPA.w,Math.max(bb[2]*3.2,240)), vh=vw*MAPA.h/MAPA.w;
  if(vh<bb[3]*1.7){ vh=Math.min(MAPA.h,bb[3]*1.7); vw=vh*MAPA.w/MAPA.h; }
  let x=bb[0]+bb[2]/2-vw/2, y=bb[1]+bb[3]/2-vh/2;
  x=Math.max(-10,Math.min(MAPA.w-vw+10,x)); y=Math.max(-10,Math.min(MAPA.h-vh+10,y));
  zoomTo([x,y,vw,vh],()=>placeFicha(t));
}

function handleOf(net){ const i=REDES.indexOf(net); let u=valueOf(`redes__${i}__u`); if(!u||/no\s+tenemos/i.test(u)) return ""; u=u.trim().replace(/^https?:\/\/(www\.)?[^/]+\//i,"").replace(/[/?#].*$/,"").trim(); return u ? (u[0]==="@"?u:"@"+u) : ""; }
function follOf(net){ const q=QIDX.seguidores_red; if(!q) return ""; const i=q.rows.indexOf(net); return i<0?"":valueOf(`seguidores_red__${i}`); }
const lastF={};
function pvHTML(net,c){
  const name=esc(c?c.nombre:"Nombre del club"), hh=esc(handleOf(net)||"@usuario"), fv=fmtN(follOf(net)), av=`<div class="av">${avatar(c)}</div>`, g=n=>`<div class="pgrid">${"<i></i>".repeat(n)}</div>`;
  switch(net){
    case "Instagram": return `<div class="hd">${hh}</div><div class="row1"><div class="ring2">${av}</div><div class="num-c"><div><b>—</b><span>publicaciones</span></div><div class="fl"><b>${fv}</b><span>seguidores</span></div><div><b>—</b><span>seguidos</span></div></div></div><div class="bio"><div class="ttl">${name}</div><div class="mu">Equipo femenino · Liga FUTVE Fem</div></div><div class="pbtn"><i>Seguir</i><i>Mensaje</i></div>${g(9)}`;
    case "TikTok": return `${av}<div class="ttl">${hh}</div><div class="num-c"><div><b>—</b><span>Siguiendo</span></div><div class="fl"><b>${fv}</b><span>Seguidores</span></div><div><b>—</b><span>Me gusta</span></div></div><span class="sbtn">Seguir</span>${g(6)}`;
    case "X": return `<div class="ban"></div>${av}<span class="xb">Seguir</span><div class="in"><div class="ttl">${name}</div><div class="mu">${hh}</div><div class="ff"><span><b>—</b> Siguiendo</span><span class="fl"><b>${fv}</b> Seguidores</span></div></div><div class="tabs"><span>Posts</span><span>Respuestas</span><span>Fotos</span></div>${g(6)}`;
    case "Facebook": return `<div class="ban"></div>${av}<div class="in"><div class="ttl">${name}</div><div class="fbf fl"><b>${fv}</b> seguidores</div><div class="fbb"><i>Seguir</i><i>Mensaje</i></div></div>${g(6)}`;
    case "YouTube": return `<div class="ban"></div><div class="row1">${av}<div><div class="ttl">${name}</div><div class="mu">${hh}<br><span class="fl"><b>${fv}</b></span> suscriptores · — videos</div></div></div><div class="yb">Suscribirse</div><div class="tabs"><span>Inicio</span><span>Videos</span><span>Shorts</span></div>${g(3)}`;
  }
}
function paintPhone(){
  const scr=$("#pscr"); if(!scr) return; const c=clubSel();
  NETS.forEach(([k])=>{
    const pv=scr.querySelector(`[data-pv="${k}"]`), f=follOf(k);
    pv.innerHTML=pvHTML(k,c); pv.classList.toggle("on",k===netCur);
    if(lastF[k]!==undefined && lastF[k]!==f){ const fl=pv.querySelector(".fl"); if(fl) fl.classList.add("hot"); }
    lastF[k]=f;
    const fm=form.querySelector(`[data-fm="${k}"]`); if(fm) fm.textContent = f ? `Se lee: ${fmtN(f)}` : "";
  });
  form.querySelectorAll(".ptabs button").forEach(b=>{ const on=b.dataset.net===netCur; b.classList.toggle("on",on); b.setAttribute("aria-selected",on?"true":"false"); });
  form.querySelectorAll(".numred .rr").forEach(r=>r.classList.toggle("act",r.dataset.net===netCur));
}
function paintKitCrest(){ const c=clubSel(); form.querySelectorAll(".kcrest").forEach(im=>{ if(c&&c.logo){ im.setAttribute("href",c.logo); im.style.display=""; } else im.style.display="none"; }); }

const fig = c => `<svg viewBox="0 0 18 26"${c?` class="${c}"`:""}><use href="#pp"/></svg>`;
function paintFigs(){
  form.querySelectorAll("[data-figs]").forEach(box=>{
    const id=box.dataset.figs, n=Math.max(0,parseInt(valueOf(id),10)||0), CAP=40; let out="";
    if(id==="menores"){ const p=Math.max(n,parseInt(valueOf("plantel"),10)||0); for(let i=0;i<Math.min(p,CAP);i++) out+=fig(i<n?"m":""); if(p>CAP) out+=`<span class="more">+${p-CAP}</span>`; }
    else if(id==="elegibles"){ for(let i=0;i<Math.min(Math.max(n,8),CAP);i++) out+=fig(i<n?"":"slot"); if(n>CAP) out+=`<span class="more">+${n-CAP}</span>`; }
    else { for(let i=0;i<Math.min(n,CAP);i++) out+=fig(""); if(n>CAP) out+=`<span class="more">+${n-CAP}</span>`; }
    if(box._k!==out){ box.innerHTML=out; box._k=out; }
  });
  const pyr=$("#pyr");
  if(pyr){ const vals=NINAS.map(([id])=>Math.max(0,parseInt(valueOf(id),10)||0)), mx=Math.max(1,...vals);
    NINAS.forEach(([id],i)=>{ pyr.querySelector(`[data-pb="${id}"]`).style.width=(vals[i]/mx*100)+"%"; pyr.querySelector(`[data-pn="${id}"]`).textContent=vals[i]; });
    $("#pyrt").textContent=vals.reduce((a,b)=>a+b,0); }
}
function paintScales(){
  form.querySelectorAll("[data-scl]").forEach(s=>{ const q=QIDX[s.dataset.scl], v=valueOf(q.id);
    s.querySelector("i").style.width=(v?v*20:0)+"%";
    s.querySelector("b").textContent = !v ? "Toque un número" : v==="1" ? `1 · ${q.min}` : v==="5" ? `5 · ${q.max}` : `${v} de 5`; });
}
const STK=["#4E2369","#68348B","#9B2DA3","#C48F9D","#E3D7C1"];
function paintRanks(initial){
  form.querySelectorAll(".rank").forEach(box=>{
    if(initial && box.dataset.touched) box.querySelectorAll("li").forEach(li=>li.classList.add("pk"));
    const st=box.querySelector("[data-stack]"); if(!st) return;
    const lis=[...box.querySelectorAll("li")], n=lis.length, lg=box.querySelector("[data-stackleg]");
    if(!box.dataset.touched){ st.innerHTML=`<i style="flex-basis:100%;background:var(--line);color:var(--muted);font-family:var(--body);font-weight:500">Ordene para ver el peso de cada costo</i>`; lg.innerHTML=""; return; }
    st.innerHTML=lis.map((li,i)=>`<i style="flex-basis:${((n-i)/(n*(n+1)/2)*100).toFixed(1)}%;background:${STK[i]};${i>2?"color:#2A1238":""}">${i+1}.º</i>`).join("");
    lg.innerHTML=lis.map((li,i)=>`<span><i style="background:${STK[i]}"></i>${i+1}.º ${esc(li.dataset.v)}</span>`).join("");
  });
}
function paintTrib(){
  const t=$("#trib"); if(!t) return; const q=QIDX.asistencia, v=valueOf("asistencia"), idx=q.o.indexOf(v);
  const frac=[.08,.28,.62,.97,0][idx]||0, n=Math.round(frac*150), on=new Set(TRIB_ORDER.slice(0,n));
  t.querySelectorAll(".seat").forEach(s=>{ const k=+s.dataset.k; s.setAttribute("class","seat"+(on.has(k)?" f"+(k%3):"")); });
  $("#tribv").textContent = v ? (idx===4?"Sin dato":v) : "—";
}
function paintDay(){
  const h=$("#dayhl"); if(!h) return; const r=HRS[valueOf("horario")];
  if(!r){ h.style.display="none"; return; }
  h.style.display="block"; h.style.left=((r[0]-5)/19*100)+"%"; h.style.width=((r[1]-r[0])/19*100)+"%";
}
function paintMax(){
  form.querySelectorAll("[data-maxc]").forEach(d=>{ const q=QIDX[d.dataset.maxc], n=valueOf(q.id).length;
    d.innerHTML=`<b>${n} de ${q.max}</b> marcadas`; d.previousElementSibling.classList.toggle("full",n>=q.max); });
}
function paintCur(r){
  const m=MODS[cur]; if(!m) return; let t=0,d=0;
  MODS.forEach(mm=>mm.qs.forEach(q=>{ if(q.if) return; t++; if(answered(q,r[q.id])) d++; }));
  $("#curmod").innerHTML=`<span><b>${esc(m.titulo)}</b> · ${cur+1} de ${MODS.length}</span><span>${Math.round(d/t*100)} % del total</span>`;
}
const modDone={};
function afterProgress(r){
  MODS.forEach((m,i)=>{
    let t=0,d=0; m.qs.forEach(q=>{ if(q.if) return; t++; if(answered(q,r[q.id])) d++; });
    const b=nav.children[i]; if(!b) return;
    const arc=b.querySelector(".arc"); if(arc) arc.style.strokeDashoffset=(119.4*(1-d/t)).toFixed(1);
    const comp=d===t; b.classList.toggle("done",comp);
    const mc=form.querySelector(`.mcnt[data-mc="${i}"]`);
    if(mc){ mc.textContent = d ? `${d} de ${t} respondidas` : `${t} preguntas`; mc.parentNode.classList.toggle("complete",comp); }
    if(comp && modDone[i]===false){ b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); toast(`Módulo «${m.titulo}» completo`); }
    modDone[i]=comp;
  });
  MODS.forEach(m=>m.qs.forEach(q=>{ const el=qEl(q.id); if(el) el.classList.toggle("answered",answered(q,r[q.id])); }));
  paintCur(r);
}
function paintAll(initial){
  paintClub(); paintMap(); paintPhone(); paintKitCrest(); paintFigs(); paintScales(); paintRanks(initial); paintTrib(); paintDay(); paintMax();
  if(initial) afterProgress(collect());
}

/* ---------- eventos ---------- */
function wireV7(){
  form.addEventListener("click",e=>{
    const cb=e.target.closest("[data-club]");
    if(cb){ const sel=form.querySelector('select[name="club"]'); sel.value=cb.dataset.club; manualState=null; fire(sel,"change");
      if(cb.dataset.club===OTRO) setTimeout(()=>{ const o=form.querySelector('[name="club_otro"]'); if(o) o.focus(); },60);
      else { const c=qEl("ciudad"); if(c && !RM) setTimeout(()=>c.scrollIntoView({behavior:"smooth",block:"center"}),350); }
      return; }
    const stp=e.target.closest("[data-step]");
    if(stp){ const inp=stp.parentNode.querySelector("input"); let v=(parseInt(inp.value,10)||0)+ +stp.dataset.step; inp.value=Math.max(0,v); fire(inp); return; }
    const st=e.target.closest(".mapw.pick .st");
    if(st){ manualState=st.dataset.st; paintMap(); return; }
    const sg=e.target.closest("#sug");
    if(sg){ const inp=form.querySelector('[name="ciudad"]'), v=inp.value.trim().replace(/[,\s]+$/,""); inp.value = v ? `${v}, ${sg.dataset.v}` : sg.dataset.v; fire(inp); inp.focus(); if(!v) inp.setSelectionRange(0,0); return; }
    const tab=e.target.closest(".ptabs [data-net]");
    if(tab){ netCur=tab.dataset.net; paintPhone(); return; }
    const rs=e.target.closest("[data-rkreset]");
    if(rs){ rs.closest(".rank").querySelectorAll("li").forEach(li=>li.classList.remove("pk")); return; }
    const ar=e.target.closest(".rank [data-up],.rank [data-down]");
    if(ar){ const box=ar.closest(".rank"); box.querySelectorAll("li").forEach(li=>li.classList.add("pk")); setTimeout(()=>paintRanks(),0); return; }
    const li=e.target.closest(".rank li");
    if(li && !e.target.closest("button") && !li.classList.contains("pk")){
      const ol=li.parentNode, box=li.closest(".rank");
      const ff=[...ol.children].find(x=>!x.classList.contains("pk")); if(ff!==li) ol.insertBefore(li,ff);
      li.classList.add("pk");
      const free=[...ol.children].filter(x=>!x.classList.contains("pk")); if(free.length===1) free[0].classList.add("pk");
      numberRanks(); box.dataset.touched="1"; save(); paintRanks(); return;
    }
    const ez=e.target.closest(".er");
    if(ez && !e.target.closest("label")){ const z=ez.closest(".est").querySelector(`.ez[data-ei="${ez.dataset.ri}"]`); if(z){ z.classList.remove("flash"); void z.getBBox(); z.classList.add("flash"); } }
  });
  form.addEventListener("focusin",e=>{ const r=e.target.closest(".numred .rr"); if(r && r.dataset.net!==netCur){ netCur=r.dataset.net; paintPhone(); } });
  form.addEventListener("input",()=>paintAll());
  form.addEventListener("change",()=>{ paintAll(); });
  let sx=null;
  form.addEventListener("touchstart",e=>{ if(e.target.closest("#pscr")) sx=e.touches[0].clientX; },{passive:true});
  form.addEventListener("touchend",e=>{ if(sx==null) return; const dx=e.changedTouches[0].clientX-sx; sx=null; if(Math.abs(dx)<40) return;
    const i=NETS.findIndex(n=>n[0]===netCur), j=(i+(dx<0?1:-1)+NETS.length)%NETS.length; netCur=NETS[j][0]; paintPhone(); },{passive:true});
  let rt; window.addEventListener("resize",()=>{ clearTimeout(rt); rt=setTimeout(()=>{ const t=mapTarget(); if(t.estado) placeFicha(t); },150); });
}

/* go y finish de v6 se conservan; aquí solo se suma la pintura visual */
const _goV6 = go;
go = function(i,quiet){ _goV6(i,quiet); paintCur(collect()); requestAnimationFrame(()=>paintMap()); };
const _finishV6 = finish;
finish = function(){ _finishV6(); const s=$("#stick"); if(s) s.style.display="none"; };

$("#prev").onclick=()=>go(Math.max(0,cur-1));
$("#next").onclick=()=> cur===MODS.length-1 ? submit() : go(cur+1);
$("#dl2").onclick=download;

if(typeof LOGO_FVF!=="undefined"){ $("#lg1").src=LOGO_FEM; $("#lg2").src=LOGO_FVF; } else { document.querySelector(".logos").style.display="none"; }
build(); enhance();
restore({...(host.respuestas||{}), club:host.club.valor});
MODS.forEach(m=>m.qs.forEach(q=>{ if(q.type==="kit") kitPaint(q.id); if(q.type==="estadio") estPaint(q.id,q); }));
go(0,true); progress(); paintAll(true);
if(host.readOnly){
  form.querySelectorAll("input,select,textarea,button").forEach(el=>{ if(!el.closest(".ptabs,.kitbar")) el.disabled=true; });
  form.classList.add("ro");
}
return { flush: saveNow, collect };
}
