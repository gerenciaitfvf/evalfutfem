import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { auditar } from "../auditoria.js";
import { query } from "../db.js";
import { HttpError, requireAuth, validar } from "../middleware.js";
import { hashClave, validarPolitica, verificarClave } from "../seguridad/claves.js";
import { cerrarSesionesDe } from "../seguridad/sesiones.js";

const r = Router();
r.use(requireAuth);

r.get("/", async (req, res) => {
  const { rows } = await query(
    "SELECT usuario, nombre, ultimo_acceso, clave_cambiada_en, creado_en FROM usuarios WHERE id=$1",
    [req.usuario.id]
  );
  res.json({ ...rows[0], rol: req.usuario.rol.nombre, club: req.usuario.club_nombre });
});

/* Últimos accesos y cambios de seguridad de la propia cuenta */
r.get("/actividad", async (req, res) => {
  const { rows } = await query(
    `SELECT accion, ip, navegador, creado_en FROM auditoria
      WHERE usuario_id=$1 AND accion IN ('login_ok','login_fallido','login_bloqueado','usuario_bloqueado','clave_cambiada','clave_restablecida','logout')
      ORDER BY creado_en DESC LIMIT 20`,
    [req.usuario.id]
  );
  res.json(rows);
});

const limiteClave = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  keyGenerator: (req) => "clave:" + req.usuario.id,
  message: { error: "Demasiados intentos. Espere unos minutos." },
});

const claveSchema = z.object({
  actual: z.string().min(1).max(256),
  nueva: z.string().min(1).max(256),
  confirmacion: z.string().min(1).max(256),
});

r.post("/clave", limiteClave, validar(claveSchema), async (req, res, next) => {
  try {
    const { actual, nueva, confirmacion } = req.valido;
    const { rows } = await query("SELECT hash_clave FROM usuarios WHERE id=$1", [req.usuario.id]);
    if (!(await verificarClave(rows[0].hash_clave, actual))) {
      await auditar(req, "clave_cambio_fallido");
      throw new HttpError(400, "La clave actual no es correcta.");
    }
    if (nueva !== confirmacion) throw new HttpError(400, "La confirmación no coincide con la clave nueva.");
    if (nueva === actual) throw new HttpError(400, "La clave nueva debe ser distinta de la actual.");
    const errores = validarPolitica(nueva, { usuario: req.usuario.usuario });
    if (errores.length) throw new HttpError(400, errores.join(" "), { errores: errores.map((m) => ({ campo: "nueva", mensaje: m })) });

    await query(
      "UPDATE usuarios SET hash_clave=$2, debe_cambiar_clave=false, clave_cambiada_en=now(), actualizado_en=now() WHERE id=$1",
      [req.usuario.id, await hashClave(nueva)]
    );
    const cerradas = await cerrarSesionesDe(req.usuario.id, req.sessionID);
    await auditar(req, "clave_cambiada", { detalle: { sesionesCerradas: cerradas } });
    res.json({ ok: true, sesionesCerradas: cerradas });
  } catch (e) {
    next(e);
  }
});

export default r;
