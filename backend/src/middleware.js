import { config } from "./config.js";
import { query } from "./db.js";
import { cargarRol } from "./permisos.js";
import { MAXIMA_MS, cerrarSesion } from "./seguridad/sesiones.js";

export class HttpError extends Error {
  constructor(status, mensaje, extra) {
    super(mensaje);
    this.status = status;
    this.extra = extra;
  }
}

/* CSRF: toda petición que modifica datos debe venir del front (Origin) y traer el
   encabezado propio X-Requested-With, que un formulario de otro sitio no puede enviar. */
export function csrf(req, _res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (origin && origin !== config.FRONTEND_ORIGIN) return next(new HttpError(403, "Origen no permitido."));
  if (req.get("x-requested-with") !== "fvf") return next(new HttpError(403, "Petición no permitida."));
  next();
}

/* Carga el usuario de la sesión y verifica que siga activo y dentro de la duración máxima */
export async function cargarUsuario(req, _res, next) {
  try {
    const id = req.session?.usuarioId;
    if (!id) return next();
    if (Date.now() - (req.session.inicio || 0) > MAXIMA_MS) {
      await cerrarSesion(req);
      return next();
    }
    const { rows } = await query(
      `SELECT u.id, u.usuario, u.nombre, u.rol_id, u.club_id, u.activo, u.debe_cambiar_clave,
              c.nombre AS club_nombre, c.valor_formulario AS club_valor
         FROM usuarios u LEFT JOIN clubes c ON c.id = u.club_id
        WHERE u.id = $1`,
      [id]
    );
    const u = rows[0];
    if (!u || !u.activo) {
      await cerrarSesion(req);
      return next();
    }
    u.rol = await cargarRol(u.rol_id);
    req.usuario = u;
    next();
  } catch (e) {
    next(e);
  }
}

export function requireAuth(req, _res, next) {
  if (!req.usuario) return next(new HttpError(401, "Debe iniciar sesión."));
  next();
}

/* Mientras tenga que cambiar la clave, solo puede usar las rutas de cuenta */
export function requireClaveVigente(req, _res, next) {
  if (req.usuario?.debe_cambiar_clave) return next(new HttpError(403, "Debe cambiar su clave antes de continuar.", { codigo: "CAMBIAR_CLAVE" }));
  next();
}

export const requirePerm = (...permisos) => (req, _res, next) => {
  const tiene = req.usuario?.rol?.permisos || [];
  if (!permisos.every((p) => tiene.includes(p))) return next(new HttpError(403, "No tiene permiso para esta acción."));
  next();
};

export const requireAlguno = (...permisos) => (req, _res, next) => {
  const tiene = req.usuario?.rol?.permisos || [];
  if (!permisos.some((p) => tiene.includes(p))) return next(new HttpError(403, "No tiene permiso para esta acción."));
  next();
};

/* Valida req.body (o query) con un esquema zod */
export const validar = (schema, donde = "body") => (req, _res, next) => {
  const r = schema.safeParse(req[donde] ?? {});
  if (!r.success) return next(new HttpError(400, "Datos inválidos.", { errores: r.error.issues.map((i) => ({ campo: i.path.join("."), mensaje: i.message })) }));
  req.valido = r.data;
  next();
};

export function manejarErrores(err, req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...err.extra });
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "La información enviada es demasiado grande." });
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "JSON inválido." });
  if (err?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "El archivo supera 1 MB." });
  req.log?.error({ err }, "Error no controlado");
  res.status(500).json({ error: "Ocurrió un error interno. Intente de nuevo." });
}
