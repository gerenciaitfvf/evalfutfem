import session from "express-session";
import connectPg from "connect-pg-simple";
import { config, isProd } from "../config.js";
import { pool, query } from "../db.js";

const PgStore = connectPg(session);

/* Inactividad máxima por tipo de usuario y duración absoluta de la sesión */
export const INACTIVIDAD_MS = { fvf: 30 * 60_000, club: 2 * 60 * 60_000 };
export const MAXIMA_MS = 12 * 60 * 60_000;

export const sesiones = session({
  name: "fvf.sid",
  secret: config.SESSION_SECRET,
  store: new PgStore({ pool, tableName: "sesiones", pruneSessionInterval: 15 * 60 }),
  resave: false,
  saveUninitialized: false,
  rolling: true, // cada petición renueva el plazo de inactividad
  proxy: isProd,
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax", // front y back son el mismo sitio (fvf.com.ve)
    maxAge: INACTIVIDAD_MS.fvf,
  },
});

/* Inicia sesión regenerando el identificador (evita la fijación de sesión) */
export function abrirSesion(req, usuario) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.usuarioId = usuario.id;
      req.session.inicio = Date.now();
      req.session.cookie.maxAge = usuario.club_id ? INACTIVIDAD_MS.club : INACTIVIDAD_MS.fvf;
      req.session.save((e) => (e ? reject(e) : resolve()));
    });
  });
}

export function cerrarSesion(req) {
  return new Promise((resolve) => req.session.destroy(() => resolve()));
}

/* Cierra todas las sesiones de un usuario (cambio de clave, rol, desactivación…).
   `exceptoSid` permite conservar la sesión actual. */
export async function cerrarSesionesDe(usuarioId, exceptoSid = null) {
  const r = await query("DELETE FROM sesiones WHERE sess->>'usuarioId' = $1 AND sid IS DISTINCT FROM $2", [String(usuarioId), exceptoSid]);
  return r.rowCount;
}

export async function cerrarSesionesDeRol(rolId) {
  await query(
    "DELETE FROM sesiones WHERE (sess->>'usuarioId')::int IN (SELECT id FROM usuarios WHERE rol_id=$1)",
    [rolId]
  );
}
