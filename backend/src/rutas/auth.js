import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { auditar } from "../auditoria.js";
import { query } from "../db.js";
import { HttpError, requireAuth, validar } from "../middleware.js";
import { cargarRol } from "../permisos.js";
import { hashClave, necesitaRehash, verificarClave } from "../seguridad/claves.js";
import { abrirSesion, cerrarSesion } from "../seguridad/sesiones.js";

export const MAX_FALLOS = 5;
export const BLOQUEO_MIN = 15;
// Mismo mensaje para clave errada, usuario inexistente o bloqueado: no revela qué usuarios existen
const GENERICO = `Usuario o clave incorrectos. Tras ${MAX_FALLOS} intentos fallidos el usuario se bloquea ${BLOQUEO_MIN} minutos.`;

const r = Router();

const porIp = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Demasiados intentos desde esta conexión. Espere unos minutos." },
});
const porUsuario = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req) => "u:" + String(req.body?.usuario || "").trim().toLowerCase(),
  message: { error: "Demasiados intentos para este usuario. Espere unos minutos." },
});

export function datosSesion(u) {
  return {
    id: u.id,
    usuario: u.usuario,
    nombre: u.nombre,
    rol: { codigo: u.rol.codigo, nombre: u.rol.nombre, permisos: u.rol.permisos },
    club: u.club_id ? { id: u.club_id, nombre: u.club_nombre, valor: u.club_valor } : null,
    debeCambiarClave: u.debe_cambiar_clave,
  };
}

const loginSchema = z.object({
  usuario: z.string().trim().min(1).max(254),
  clave: z.string().min(1).max(256),
});

r.post("/login", porIp, porUsuario, validar(loginSchema), async (req, res, next) => {
  try {
    const { usuario, clave } = req.valido;
    const { rows } = await query(
      "SELECT id, usuario, hash_clave, activo, intentos_fallidos, bloqueado_hasta FROM usuarios WHERE usuario=$1",
      [usuario]
    );
    const u = rows[0];
    // Siempre se verifica (aunque el usuario no exista o esté bloqueado) para que el tiempo de respuesta no delate nada
    const ok = await verificarClave(u?.hash_clave, clave);

    if (u?.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()) {
      await auditar(req, "login_bloqueado", { usuarioId: u.id, usuario });
      throw new HttpError(401, GENERICO);
    }

    if (!u || !ok || !u.activo) {
      if (u) {
        const fallos = u.intentos_fallidos + 1;
        if (fallos >= MAX_FALLOS) {
          await query(`UPDATE usuarios SET intentos_fallidos=0, bloqueado_hasta=now() + interval '${BLOQUEO_MIN} minutes' WHERE id=$1`, [u.id]);
          await auditar(req, "usuario_bloqueado", { usuarioId: u.id, usuario, detalle: { fallos } });
        } else {
          await query("UPDATE usuarios SET intentos_fallidos=$2 WHERE id=$1", [u.id, fallos]);
        }
      }
      await auditar(req, "login_fallido", { usuarioId: u?.id ?? null, usuario, detalle: u && !u.activo ? { motivo: "inactivo" } : undefined });
      throw new HttpError(401, GENERICO);
    }

    const rehash = necesitaRehash(u.hash_clave) ? await hashClave(clave) : null;
    await query(
      "UPDATE usuarios SET intentos_fallidos=0, bloqueado_hasta=NULL, ultimo_acceso=now(), hash_clave=COALESCE($2, hash_clave) WHERE id=$1",
      [u.id, rehash]
    );
    const full = (
      await query(
        `SELECT u.*, c.nombre AS club_nombre, c.valor_formulario AS club_valor
           FROM usuarios u LEFT JOIN clubes c ON c.id=u.club_id WHERE u.id=$1`,
        [u.id]
      )
    ).rows[0];
    if (full.club_id) {
      const club = await query("SELECT activo FROM clubes WHERE id=$1", [full.club_id]);
      if (!club.rows[0]?.activo) {
        await auditar(req, "login_fallido", { usuarioId: u.id, usuario, detalle: { motivo: "club inactivo" } });
        throw new HttpError(401, GENERICO);
      }
    }
    await abrirSesion(req, full);
    req.usuario = { ...full, rol: await cargarRol(full.rol_id) };
    await auditar(req, "login_ok");
    res.json(datosSesion(req.usuario));
  } catch (e) {
    next(e);
  }
});

r.get("/sesion", requireAuth, (req, res) => res.json(datosSesion(req.usuario)));

r.post("/logout", async (req, res) => {
  if (req.usuario) await auditar(req, "logout");
  await cerrarSesion(req);
  res.clearCookie("fvf.sid");
  res.json({ ok: true });
});

export default r;
