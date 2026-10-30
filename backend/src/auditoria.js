import { query } from "./db.js";

/* Registra un evento de seguridad. Nunca debe recibir claves ni hashes en `detalle`. */
export async function auditar(req, accion, { usuarioId, usuario, detalle } = {}) {
  try {
    await query(
      "INSERT INTO auditoria(usuario_id, usuario, accion, detalle, ip, navegador) VALUES ($1,$2,$3,$4,$5,$6)",
      [
        usuarioId ?? req.usuario?.id ?? null,
        usuario ?? req.usuario?.usuario ?? null,
        accion,
        detalle ? JSON.stringify(detalle) : null,
        req.ip || null,
        (req.get("user-agent") || "").slice(0, 300),
      ]
    );
  } catch (e) {
    req.log?.error({ err: e }, "No se pudo escribir la auditoría");
  }
}
