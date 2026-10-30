import { MODS } from "../../shared/formulario.js";
import { query } from "./db.js";

/* Catálogo fijo de permisos del sistema */
export const PERMISOS = {
  "evaluacion.llenar": "Llenar y enviar la evaluación de su club",
  "tablero.ver": "Ver el tablero de seguimiento de los clubes",
  "respuestas.ver": "Ver las respuestas de los clubes (según su alcance)",
  "respuestas.exportar": "Exportar respuestas a Excel (según su alcance)",
  "evaluacion.reabrir": "Reabrir una evaluación enviada",
  "usuarios.gestionar": "Crear y administrar usuarios, claves y sesiones",
  "roles.gestionar": "Crear y editar roles, permisos y alcances",
  "temporadas.gestionar": "Crear y administrar temporadas",
  "equipos.gestionar": "Crear y administrar los equipos (clubes)",
  "auditoria.ver": "Ver la auditoría de seguridad",
};

/* Permisos y alcance de un rol, con caché corta (se invalida al editar roles) */
const cache = new Map();
export function invalidarCacheRoles() {
  cache.clear();
}

export async function cargarRol(rolId) {
  const hit = cache.get(rolId);
  if (hit && hit.t > Date.now() - 60_000) return hit.v;
  const [r, p, a] = await Promise.all([
    query("SELECT id, codigo, nombre FROM roles WHERE id=$1", [rolId]),
    query("SELECT permiso_codigo FROM rol_permisos WHERE rol_id=$1", [rolId]),
    query("SELECT modulo_id, preguntas FROM rol_alcance WHERE rol_id=$1", [rolId]),
  ]);
  if (!r.rows[0]) return null;
  const v = {
    ...r.rows[0],
    permisos: p.rows.map((x) => x.permiso_codigo),
    // null = ve todo el formulario
    alcance: a.rows.length ? Object.fromEntries(a.rows.map((x) => [x.modulo_id, x.preguntas ?? "*"])) : null,
  };
  cache.set(rolId, { t: Date.now(), v });
  return v;
}

/* Módulos y preguntas visibles para un alcance (misma lógica que el modo revisión del formulario) */
export function modsVisibles(alcance) {
  if (!alcance) return MODS;
  return MODS.filter((m) => alcance[m.id]).map((m) =>
    alcance[m.id] === "*" ? m : { ...m, qs: m.qs.filter((q) => alcance[m.id].includes(q.id) || alcance[m.id].includes(q.id.replace(/_extras$/, ""))) }
  );
}

/* Deja en las respuestas solo las preguntas visibles para el alcance */
export function filtrarRespuestas(respuestas, alcance) {
  if (!alcance) return respuestas;
  const ids = new Set();
  modsVisibles(alcance).forEach((m) => m.qs.forEach((q) => { ids.add(q.id); if (q.type === "kit") ids.add(q.id + "_extras"); }));
  return Object.fromEntries(Object.entries(respuestas || {}).filter(([k]) => ids.has(k)));
}
