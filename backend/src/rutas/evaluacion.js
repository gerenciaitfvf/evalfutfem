import { Router } from "express";
import { z } from "zod";
import { avance, mapa, FORM_ID } from "../../../shared/formulario.js";
import { auditar } from "../auditoria.js";
import { query, tx } from "../db.js";
import { HttpError, requireAuth, requireClaveVigente, requirePerm, validar } from "../middleware.js";
import { sanear } from "../respuestas.js";

/* Evaluación del club que inició sesión. El club siempre sale de la sesión, nunca del navegador. */
const r = Router();
r.use(requireAuth, requireClaveVigente, requirePerm("evaluacion.llenar"));

async function evaluacionActual(clubId) {
  const { rows } = await query(
    `SELECT e.id, e.estado, e.respuestas, e.avance, e.enviado_en, e.actualizado_en, e.version_formulario,
            t.id AS temporada_id, t.nombre AS temporada, t.estado AS temporada_estado, t.abre_en, t.cierra_en
       FROM evaluaciones e JOIN temporadas t ON t.id = e.temporada_id
      WHERE e.club_id = $1 AND t.estado <> 'borrador'
      ORDER BY (t.estado = 'abierta') DESC, t.abre_en DESC NULLS LAST
      LIMIT 1`,
    [clubId]
  );
  return rows[0] || null;
}

function editable(ev) {
  const ahora = new Date();
  return (
    ev.estado === "borrador" &&
    ev.temporada_estado === "abierta" &&
    (!ev.abre_en || new Date(ev.abre_en) <= ahora) &&
    (!ev.cierra_en || new Date(ev.cierra_en) >= ahora)
  );
}

r.get("/", async (req, res) => {
  const ev = await evaluacionActual(req.usuario.club_id);
  if (!ev) throw new HttpError(404, "Su club no tiene una evaluación asignada en una temporada abierta.");
  const clubes = await query(
    `SELECT c.id, c.nombre, c.valor_formulario AS valor, c.estado, c.logo IS NOT NULL AS tiene_logo,
            extract(epoch from c.actualizado_en)::bigint AS v
       FROM clubes c JOIN temporada_clubes tc ON tc.club_id=c.id
      WHERE tc.temporada_id=$1 AND c.activo ORDER BY c.nombre`,
    [ev.temporada_id]
  );
  res.json({
    id: ev.id,
    estado: ev.estado,
    editable: editable(ev),
    respuestas: ev.respuestas,
    avance: ev.avance,
    enviadoEn: ev.enviado_en,
    actualizadoEn: ev.actualizado_en,
    temporada: { id: ev.temporada_id, nombre: ev.temporada, estado: ev.temporada_estado, cierraEn: ev.cierra_en },
    club: { id: req.usuario.club_id, nombre: req.usuario.club_nombre, valor: req.usuario.club_valor },
    clubes: clubes.rows.map((c) => ({ id: c.id, nombre: c.nombre, valor: c.valor, estado: c.estado, logo: c.tiene_logo ? `/api/clubes/${c.id}/logo?v=${c.v}` : null })),
  });
});

/* Solo se mandan las respuestas que cambiaron; el servidor las combina con lo guardado.
   Así varias personas del club pueden llenar módulos distintos a la vez sin pisarse. */
const cambiosSchema = z.object({ cambios: z.record(z.string(), z.any()) });

async function combinar(c, ev, cambios, usuario) {
  const { respuestas: limpios, errores } = sanear(cambios, usuario.club_valor);
  if (errores.length) throw new HttpError(400, "Algunas respuestas no son válidas.", { campos: errores });
  const actual = (await c.query("SELECT respuestas, estado FROM evaluaciones WHERE id=$1 FOR UPDATE", [ev.id])).rows[0];
  if (actual.estado !== "borrador") throw new HttpError(409, "La evaluación ya fue enviada.");
  const respuestas = { ...actual.respuestas, ...limpios };
  return { respuestas, av: avance(respuestas) };
}

async function editableActual(req) {
  const ev = await evaluacionActual(req.usuario.club_id);
  if (!ev) throw new HttpError(404, "No hay evaluación abierta.");
  if (!editable(ev)) throw new HttpError(409, ev.estado === "enviada" ? "La evaluación ya fue enviada." : "La temporada no está abierta para respuestas.");
  return ev;
}

r.put("/", validar(cambiosSchema), async (req, res) => {
  const ev = await editableActual(req);
  const out = await tx(async (c) => {
    const { respuestas, av } = await combinar(c, ev, req.valido.cambios, req.usuario);
    const u = await c.query(
      "UPDATE evaluaciones SET respuestas=$2, avance=$3, actualizado_en=now(), actualizado_por=$4 WHERE id=$1 RETURNING actualizado_en",
      [ev.id, respuestas, av, req.usuario.id]
    );
    return { avance: av, actualizadoEn: u.rows[0].actualizado_en };
  });
  res.json({ ok: true, ...out });
});

r.post("/enviar", validar(cambiosSchema), async (req, res) => {
  const ev = await editableActual(req);
  const { enviadoEn, av } = await tx(async (c) => {
    const { respuestas, av } = await combinar(c, ev, req.valido.cambios, req.usuario);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(respuestas.correo || "")) throw new HttpError(400, "Revise el correo institucional del club en el Módulo 0.");
    const u = await c.query(
      `UPDATE evaluaciones SET respuestas=$2, avance=$3, estado='enviada', enviado_en=now(), enviado_por=$4, actualizado_en=now(), actualizado_por=$4
        WHERE id=$1 RETURNING enviado_en`,
      [ev.id, respuestas, av, req.usuario.id]
    );
    await c.query("INSERT INTO evaluaciones_historial(evaluacion_id, evento, respuestas, usuario_id) VALUES ($1,'enviada',$2,$3)", [ev.id, respuestas, req.usuario.id]);
    return { enviadoEn: u.rows[0].enviado_en, av };
  });
  await auditar(req, "evaluacion_enviada", { detalle: { evaluacionId: ev.id, temporada: ev.temporada, avance: av.porcentaje } });
  res.json({ ok: true, enviadoEn });
});

/* Copia de las respuestas en el mismo formato JSON que descargaba el formulario */
r.get("/copia", async (req, res) => {
  const ev = await evaluacionActual(req.usuario.club_id);
  if (!ev) throw new HttpError(404, "No hay evaluación.");
  res.json({ formulario: FORM_ID, version: ev.version_formulario, enviado: ev.enviado_en, respuestas: ev.respuestas, mapa: mapa() });
});

export default r;
