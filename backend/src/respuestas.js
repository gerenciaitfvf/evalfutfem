import { MODS, QIDX } from "../../shared/formulario.js";

/* Opciones fijas de los tipos gráficos (iguales a las del motor del formulario) */
const KIT_OPC = ["Pecho", "Manga derecha", "Manga izquierda", "Costados", "Short", "Medias", "Nuca", "Espalda superior", "Espalda inferior", "Ningún espacio disponible", "Debemos consultarlo"];
export const REDES = ["Instagram", "TikTok", "Facebook", "X", "YouTube"];
const CUENTA_OPC = ["", "Exclusiva del femenino", "Compartida con el club"];

const esTexto = (v, max) => typeof v === "string" && v.length <= max;
const esNumero = (v) => v === "" || (typeof v === "string" && /^\d{1,9}$/.test(v));
const esObj = (v) => v && typeof v === "object" && !Array.isArray(v);

function valida(q, v) {
  switch (q.type) {
    case "text": case "email": case "tel": return esTexto(v, 500);
    case "textarea": return esTexto(v, 5000);
    case "number": return esNumero(v);
    case "select": case "radio": return v === "" || q.o.includes(v);
    case "scale": return v === "" || ["1", "2", "3", "4", "5"].includes(v);
    case "check": return Array.isArray(v) && v.every((x) => q.o.includes(x));
    case "rank": return Array.isArray(v) && v.every((x) => q.o.includes(x)) && new Set(v).size === v.length;
    case "kit": return Array.isArray(v) && v.every((x) => KIT_OPC.includes(x));
    case "grid": case "estadio": return esObj(v) && Object.entries(v).every(([k, x]) => q.rows.includes(k) && (x === "" || q.cols.includes(x)));
    case "numred": return esObj(v) && Object.entries(v).every(([k, x]) => q.rows.includes(k) && esNumero(x));
    case "redes": return esObj(v) && Object.entries(v).every(([k, x]) => REDES.includes(k) && esObj(x) && esTexto(x.usuario ?? "", 200) && CUENTA_OPC.includes(x.cuenta ?? ""));
    default: return false;
  }
}

function validaExtras(v) {
  return Array.isArray(v) && v.length <= 20 && v.every((x) =>
    esObj(x) && esTexto(x.n, 80) && ["frente", "espalda"].includes(x.v) && typeof x.x === "number" && typeof x.y === "number" && x.x >= 0 && x.x <= 100 && x.y >= 0 && x.y <= 100
  );
}

/* Limpia y valida las respuestas que manda el formulario. Devuelve { respuestas, errores }.
   Las claves desconocidas se descartan; el campo «club» lo fija el servidor. */
export function sanear(entrada, clubValor) {
  const out = {}, errores = [];
  for (const [k, v] of Object.entries(entrada || {})) {
    // El club lo pone el servidor desde la sesión; lo que mande el navegador se ignora
    if (k === "club" || k === "club_otro") continue;
    if (k.endsWith("_extras") && QIDX[k.slice(0, -7)]?.type === "kit") {
      if (validaExtras(v)) out[k] = v.map(({ n, v: vista, x, y }) => ({ n, v: vista, x, y }));
      else errores.push(k);
      continue;
    }
    const q = QIDX[k];
    if (!q) continue;
    if (valida(q, v)) out[k] = v;
    else errores.push(k);
  }
  out.club = clubValor;
  return { respuestas: out, errores };
}

/* ---------- Aplanado para Excel: una columna por dato ---------- */
export function columnas(mods) {
  const cols = [];
  for (const m of mods) {
    for (const q of m.qs) {
      const base = { modulo: m.titulo, id: q.id, pregunta: q.t };
      if (q.type === "grid" || q.type === "estadio" || q.type === "numred") {
        q.rows.forEach((row) => cols.push({ ...base, titulo: `${q.t} · ${row}`, get: (r) => r[q.id]?.[row] ?? "" }));
      } else if (q.type === "redes") {
        REDES.forEach((red) => {
          cols.push({ ...base, titulo: `${q.t} · ${red} · usuario`, get: (r) => r[q.id]?.[red]?.usuario ?? "" });
          cols.push({ ...base, titulo: `${q.t} · ${red} · cuenta`, get: (r) => r[q.id]?.[red]?.cuenta ?? "" });
        });
      } else if (q.type === "rank") {
        cols.push({ ...base, titulo: q.t, get: (r) => (r[q.id] || []).map((x, i) => `${i + 1}. ${x}`).join("; ") });
      } else if (q.type === "kit") {
        cols.push({ ...base, titulo: q.t, get: (r) => (r[q.id] || []).join("; ") });
        cols.push({ ...base, titulo: `${q.t} · espacios agregados`, get: (r) => (r[q.id + "_extras"] || []).map((x) => `${x.n} (${x.v})`).join("; ") });
      } else if (q.type === "number" || q.type === "scale") {
        cols.push({ ...base, titulo: q.t, get: (r) => (r[q.id] === "" || r[q.id] == null ? "" : Number(r[q.id])) });
      } else {
        cols.push({ ...base, titulo: q.t, get: (r) => (Array.isArray(r[q.id]) ? r[q.id].join("; ") : r[q.id] ?? "") });
      }
    }
  }
  return cols;
}

export { MODS };
