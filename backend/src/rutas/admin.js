import { Router } from "express";
import ExcelJS from "exceljs";
import { mapa, MODS } from "../../../shared/formulario.js";
import { auditar } from "../auditoria.js";
import { query, tx } from "../db.js";
import { HttpError, requireAuth, requireClaveVigente, requirePerm } from "../middleware.js";
import { filtrarRespuestas, modsVisibles } from "../permisos.js";
import { columnas } from "../respuestas.js";

/* Seguimiento, respuestas y exportación para el equipo FVF */
const r = Router();
r.use(requireAuth, requireClaveVigente);

const idParam = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, "Identificador inválido.");
  return n;
};

/* Temporada pedida, o la abierta, o la más reciente */
async function temporada(id) {
  const { rows } = id
    ? await query("SELECT * FROM temporadas WHERE id=$1", [idParam(id)])
    : await query("SELECT * FROM temporadas ORDER BY (estado='abierta') DESC, abre_en DESC NULLS LAST, id DESC LIMIT 1");
  if (!rows[0]) throw new HttpError(404, "No hay temporadas.");
  return rows[0];
}

const alcanceDe = (req) => req.usuario.rol.alcance;

r.get("/temporadas", requirePerm("tablero.ver"), async (_req, res) => {
  const { rows } = await query("SELECT id, nombre, estado, abre_en, cierra_en FROM temporadas ORDER BY abre_en DESC NULLS LAST, id DESC");
  res.json(rows);
});

r.get("/tablero", requirePerm("tablero.ver"), async (req, res) => {
  const t = await temporada(req.query.temporada);
  const { rows } = await query(
    `SELECT c.id AS club_id, c.nombre, c.estado AS region, c.logo IS NOT NULL AS tiene_logo,
            extract(epoch from c.actualizado_en)::bigint AS v,
            e.id AS evaluacion_id, e.estado, e.avance, e.enviado_en, e.actualizado_en,
            (SELECT count(*) FROM usuarios u WHERE u.club_id=c.id AND u.activo)::int AS usuarios,
            (SELECT max(u.ultimo_acceso) FROM usuarios u WHERE u.club_id=c.id) AS ultimo_acceso
       FROM temporada_clubes tc
       JOIN clubes c ON c.id=tc.club_id
       LEFT JOIN evaluaciones e ON e.temporada_id=tc.temporada_id AND e.club_id=c.id
      WHERE tc.temporada_id=$1
      ORDER BY c.nombre`,
    [t.id]
  );
  const clubes = rows.map((x) => ({
    clubId: x.club_id,
    nombre: x.nombre,
    region: x.region,
    logo: x.tiene_logo ? `/api/clubes/${x.club_id}/logo?v=${x.v}` : null,
    evaluacionId: x.evaluacion_id,
    estado: x.estado === "enviada" ? "enviada" : x.avance?.respondidas ? "borrador" : "sin_empezar",
    avance: x.avance?.total ? x.avance : null,
    enviadoEn: x.enviado_en,
    actualizadoEn: x.avance?.respondidas ? x.actualizado_en : null,
    usuarios: x.usuarios,
    ultimoAcceso: x.ultimo_acceso,
  }));
  res.json({
    temporada: { id: t.id, nombre: t.nombre, estado: t.estado, abreEn: t.abre_en, cierraEn: t.cierra_en },
    modulos: MODS.map((m) => ({ id: m.id, titulo: m.titulo })),
    clubes,
  });
});

/* Ficha de un club: solo las preguntas del alcance del rol */
r.get("/evaluaciones/:clubId", requirePerm("respuestas.ver"), async (req, res) => {
  const t = await temporada(req.query.temporada);
  const clubId = idParam(req.params.clubId);
  const { rows } = await query(
    `SELECT e.*, c.nombre AS club, c.logo IS NOT NULL AS tiene_logo, extract(epoch from c.actualizado_en)::bigint AS v,
            ue.nombre AS enviado_por_nombre, ua.nombre AS actualizado_por_nombre
       FROM evaluaciones e JOIN clubes c ON c.id=e.club_id
       LEFT JOIN usuarios ue ON ue.id=e.enviado_por
       LEFT JOIN usuarios ua ON ua.id=e.actualizado_por
      WHERE e.temporada_id=$1 AND e.club_id=$2`,
    [t.id, clubId]
  );
  const e = rows[0];
  if (!e) throw new HttpError(404, "Ese club no participa en la temporada.");
  const hist = await query(
    `SELECT h.evento, h.creado_en, u.nombre AS usuario FROM evaluaciones_historial h
       LEFT JOIN usuarios u ON u.id=h.usuario_id WHERE h.evaluacion_id=$1 ORDER BY h.creado_en DESC`,
    [e.id]
  );
  res.json({
    temporada: { id: t.id, nombre: t.nombre, estado: t.estado },
    evaluacionId: e.id,
    club: { id: clubId, nombre: e.club, logo: e.tiene_logo ? `/api/clubes/${clubId}/logo?v=${e.v}` : null },
    estado: e.estado,
    versionFormulario: e.version_formulario,
    enviadoEn: e.enviado_en,
    enviadoPor: e.enviado_por_nombre,
    actualizadoEn: e.actualizado_en,
    actualizadoPor: e.actualizado_por_nombre,
    avance: e.avance,
    modulosVisibles: modsVisibles(alcanceDe(req)).map((m) => ({ id: m.id, preguntas: m.qs.map((q) => q.id) })),
    respuestas: filtrarRespuestas(e.respuestas, alcanceDe(req)),
    historial: hist.rows,
  });
});

r.post("/evaluaciones/:id/reabrir", requirePerm("evaluacion.reabrir"), async (req, res) => {
  const id = idParam(req.params.id);
  await tx(async (c) => {
    const u = await c.query(
      "UPDATE evaluaciones SET estado='borrador', enviado_en=NULL, enviado_por=NULL, actualizado_en=now(), actualizado_por=$2 WHERE id=$1 AND estado='enviada' RETURNING respuestas",
      [id, req.usuario.id]
    );
    if (!u.rows[0]) throw new HttpError(409, "La evaluación no está enviada.");
    await c.query("INSERT INTO evaluaciones_historial(evaluacion_id, evento, respuestas, usuario_id) VALUES ($1,'reabierta',$2,$3)", [id, u.rows[0].respuestas, req.usuario.id]);
  });
  await auditar(req, "evaluacion_reabierta", { detalle: { evaluacionId: id } });
  res.json({ ok: true });
});

/* Excel: una fila por club y una columna por dato, respetando el alcance del rol */
r.get("/exportar", requirePerm("respuestas.exportar"), async (req, res) => {
  const t = await temporada(req.query.temporada);
  const mods = modsVisibles(alcanceDe(req));
  const cols = columnas(mods);
  const { rows } = await query(
    `SELECT c.nombre, e.estado, e.avance, e.enviado_en, e.actualizado_en, e.respuestas
       FROM temporada_clubes tc JOIN clubes c ON c.id=tc.club_id
       LEFT JOIN evaluaciones e ON e.temporada_id=tc.temporada_id AND e.club_id=c.id
      WHERE tc.temporada_id=$1 ORDER BY c.nombre`,
    [t.id]
  );

  const wb = new ExcelJS.Workbook();
  wb.creator = "FVF · Evaluación de clubes";
  wb.created = new Date();
  const LILA = "FF4E2369";
  const cabecera = (ws) => {
    const h = ws.getRow(1);
    h.font = { bold: true, color: { argb: "FFFFFFFF" } };
    h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LILA } };
    h.alignment = { vertical: "middle", wrapText: true };
    h.height = 48;
    ws.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];
  };

  const ws = wb.addWorksheet("Respuestas");
  ws.columns = [
    { header: "Club", key: "club", width: 26 },
    { header: "Estado", key: "estado", width: 12 },
    { header: "Avance %", key: "avance", width: 10 },
    { header: "Enviado", key: "enviado", width: 18 },
    ...cols.map((c, i) => ({ header: `${c.modulo} · ${c.titulo}`, key: "c" + i, width: 28 })),
  ];
  for (const x of rows) {
    const r0 = x.respuestas || {};
    const fila = { club: x.nombre, estado: x.estado || "—", avance: x.avance?.porcentaje ?? 0, enviado: x.enviado_en ? new Date(x.enviado_en) : "" };
    cols.forEach((c, i) => (fila["c" + i] = c.get(r0)));
    ws.addRow(fila);
  }
  cabecera(ws);

  const wp = wb.addWorksheet("Preguntas");
  const m = mapa();
  wp.columns = [
    { header: "Id", key: "id", width: 18 },
    { header: "Módulo", key: "modulo", width: 26 },
    { header: "Pregunta", key: "pregunta", width: 70 },
    { header: "Pilar del Plan Maestro", key: "pilar", width: 40 },
    { header: "Programa FIFA", key: "fifa", width: 34 },
  ];
  mods.forEach((mod) => mod.qs.forEach((q) => wp.addRow({ id: q.id, modulo: mod.titulo, pregunta: q.t, pilar: m[q.id].pilar, fifa: m[q.id].fifa })));
  cabecera(wp);

  const wsg = wb.addWorksheet("Seguimiento");
  wsg.columns = [
    { header: "Club", key: "club", width: 26 },
    { header: "Estado", key: "estado", width: 12 },
    { header: "Avance %", key: "avance", width: 10 },
    ...MODS.map((mm) => ({ header: mm.titulo, key: mm.id, width: 16 })),
    { header: "Última actualización", key: "act", width: 20 },
    { header: "Enviado", key: "env", width: 20 },
  ];
  for (const x of rows) {
    const f = { club: x.nombre, estado: x.estado || "—", avance: x.avance?.porcentaje ?? 0, act: x.actualizado_en ? new Date(x.actualizado_en) : "", env: x.enviado_en ? new Date(x.enviado_en) : "" };
    MODS.forEach((mm) => { const a = x.avance?.modulos?.[mm.id]; f[mm.id] = a ? `${a.respondidas} de ${a.total}` : ""; });
    wsg.addRow(f);
  }
  cabecera(wsg);

  await auditar(req, "exportacion_excel", { detalle: { temporada: t.nombre, rol: req.usuario.rol.codigo } });
  const nombre = `Evaluacion clubes femenino ${t.nombre}${alcanceDe(req) ? " - " + req.usuario.rol.nombre : ""}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${nombre.replace(/[^\w .-]/g, "")}"; filename*=UTF-8''${encodeURIComponent(nombre)}`);
  res.setHeader("Cache-Control", "no-store");
  await wb.xlsx.write(res);
  res.end();
});

export default r;
