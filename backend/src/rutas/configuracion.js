import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { MODS, QIDX } from "../../../shared/formulario.js";
import { auditar } from "../auditoria.js";
import { query, tx } from "../db.js";
import { HttpError, requireAlguno, requireAuth, requireClaveVigente, requirePerm, validar } from "../middleware.js";
import { PERMISOS, invalidarCacheRoles } from "../permisos.js";
import { claveTemporal, hashClave } from "../seguridad/claves.js";
import { cerrarSesionesDe, cerrarSesionesDeRol } from "../seguridad/sesiones.js";

/* Zona de Configuración: usuarios, roles y permisos, temporadas, equipos y auditoría */
const r = Router();
r.use(requireAuth, requireClaveVigente);

const id = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, "Identificador inválido.");
  return n;
};
const conflicto = (e, msg) => {
  if (e?.code === "23505") throw new HttpError(409, msg);
  throw e;
};

/* ======================= Usuarios ======================= */
const USUARIO_CLUB = /^[a-z0-9._-]{3,40}$/;

async function rolPorId(rolId) {
  const { rows } = await query("SELECT id, codigo, nombre FROM roles WHERE id=$1", [rolId]);
  if (!rows[0]) throw new HttpError(400, "El rol no existe.");
  return rows[0];
}

/* Nunca puede quedar el sistema sin un administrador activo */
async function adminsActivos(exceptoId) {
  const { rows } = await query(
    "SELECT count(*)::int AS n FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE r.codigo='admin' AND u.activo AND u.id<>$1",
    [exceptoId]
  );
  return rows[0].n;
}

r.get("/usuarios", requirePerm("usuarios.gestionar"), async (_req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.usuario, u.nombre, u.activo, u.debe_cambiar_clave, u.ultimo_acceso, u.creado_en,
            (u.bloqueado_hasta IS NOT NULL AND u.bloqueado_hasta > now()) AS bloqueado,
            r.id AS rol_id, r.codigo AS rol_codigo, r.nombre AS rol, c.id AS club_id, c.nombre AS club,
            (SELECT count(*) FROM sesiones s WHERE s.sess->>'usuarioId' = u.id::text AND s.expire > now())::int AS sesiones
       FROM usuarios u JOIN roles r ON r.id=u.rol_id LEFT JOIN clubes c ON c.id=u.club_id
      ORDER BY r.codigo='club', c.nombre NULLS FIRST, u.nombre`
  );
  res.json(rows);
});

const usuarioBase = {
  nombre: z.string().trim().min(2).max(120),
  rolId: z.number().int().positive(),
  clubId: z.number().int().positive().nullable().optional(),
};

async function validarRolClub(rolId, clubId, usuario) {
  const rol = await rolPorId(rolId);
  if (rol.codigo === "club") {
    if (!clubId) throw new HttpError(400, "Un usuario de club debe tener un club asignado.");
    if (usuario !== undefined && !USUARIO_CLUB.test(usuario)) throw new HttpError(400, "El usuario de un club debe tener de 3 a 40 caracteres: minúsculas, números, punto, guion o guion bajo.");
  } else {
    if (clubId) throw new HttpError(400, "Solo los usuarios con rol Club se asocian a un club.");
    if (usuario !== undefined && !z.string().email().safeParse(usuario).success) throw new HttpError(400, "Los usuarios FVF entran con su correo institucional.");
  }
  return rol;
}

r.post(
  "/usuarios",
  requirePerm("usuarios.gestionar"),
  validar(z.object({ usuario: z.string().trim().toLowerCase().min(3).max(254), ...usuarioBase })),
  async (req, res) => {
    const { usuario, nombre, rolId, clubId } = req.valido;
    const rol = await validarRolClub(rolId, clubId, usuario);
    const clave = claveTemporal();
    const ins = await query(
      `INSERT INTO usuarios(usuario, nombre, hash_clave, rol_id, club_id, debe_cambiar_clave) VALUES ($1,$2,$3,$4,$5,true) RETURNING id`,
      [usuario, nombre, await hashClave(clave), rolId, clubId || null]
    ).catch((e) => conflicto(e, "Ya existe un usuario con ese nombre."));
    await auditar(req, "usuario_creado", { detalle: { id: ins.rows[0].id, usuario, rol: rol.codigo, clubId: clubId || null } });
    // La clave temporal se muestra una sola vez; no se guarda en ningún lado
    res.status(201).json({ id: ins.rows[0].id, claveTemporal: clave });
  }
);

r.patch(
  "/usuarios/:id",
  requirePerm("usuarios.gestionar"),
  validar(z.object({ nombre: usuarioBase.nombre.optional(), rolId: usuarioBase.rolId.optional(), clubId: usuarioBase.clubId, activo: z.boolean().optional() })),
  async (req, res) => {
    const uid = id(req.params.id);
    const { rows } = await query("SELECT u.*, r.codigo AS rol_codigo FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.id=$1", [uid]);
    const u = rows[0];
    if (!u) throw new HttpError(404, "Usuario no encontrado.");
    const b = req.valido;
    const rolId = b.rolId ?? u.rol_id;
    const clubId = b.clubId !== undefined ? b.clubId : u.club_id;
    const activo = b.activo ?? u.activo;
    const rol = await validarRolClub(rolId, clubId);

    if (uid === req.usuario.id && (rolId !== u.rol_id || !activo)) throw new HttpError(400, "No puede cambiar su propio rol ni desactivarse.");
    if (u.rol_codigo === "admin" && u.activo && (rol.codigo !== "admin" || !activo) && (await adminsActivos(uid)) === 0) {
      throw new HttpError(400, "Debe quedar al menos un administrador activo.");
    }

    await query("UPDATE usuarios SET nombre=$2, rol_id=$3, club_id=$4, activo=$5, actualizado_en=now() WHERE id=$1", [uid, b.nombre ?? u.nombre, rolId, clubId || null, activo]);
    const cambios = {};
    if (b.nombre && b.nombre !== u.nombre) cambios.nombre = b.nombre;
    if (rolId !== u.rol_id) cambios.rol = rol.codigo;
    if ((clubId || null) !== u.club_id) cambios.clubId = clubId || null;
    if (activo !== u.activo) cambios.activo = activo;
    // Cambio de rol, club o desactivación: se cierran sus sesiones para aplicar los permisos nuevos
    if (cambios.rol || cambios.clubId !== undefined || cambios.activo === false) await cerrarSesionesDe(uid);
    await auditar(req, "usuario_modificado", { detalle: { id: uid, usuario: u.usuario, cambios } });
    res.json({ ok: true });
  }
);

r.post("/usuarios/:id/restablecer-clave", requirePerm("usuarios.gestionar"), async (req, res) => {
  const uid = id(req.params.id);
  const clave = claveTemporal();
  const { rows } = await query(
    `UPDATE usuarios SET hash_clave=$2, debe_cambiar_clave=true, intentos_fallidos=0, bloqueado_hasta=NULL, actualizado_en=now()
      WHERE id=$1 RETURNING usuario`,
    [uid, await hashClave(clave)]
  );
  if (!rows[0]) throw new HttpError(404, "Usuario no encontrado.");
  await cerrarSesionesDe(uid);
  await auditar(req, "clave_restablecida", { detalle: { id: uid, usuario: rows[0].usuario } });
  await query("INSERT INTO auditoria(usuario_id, usuario, accion, detalle) VALUES ($1,$2,'clave_restablecida',$3)", [uid, rows[0].usuario, JSON.stringify({ por: req.usuario.usuario })]);
  res.json({ claveTemporal: clave });
});

r.post("/usuarios/:id/desbloquear", requirePerm("usuarios.gestionar"), async (req, res) => {
  const uid = id(req.params.id);
  const { rows } = await query("UPDATE usuarios SET intentos_fallidos=0, bloqueado_hasta=NULL WHERE id=$1 RETURNING usuario", [uid]);
  if (!rows[0]) throw new HttpError(404, "Usuario no encontrado.");
  await auditar(req, "usuario_desbloqueado", { detalle: { id: uid, usuario: rows[0].usuario } });
  res.json({ ok: true });
});

r.post("/usuarios/:id/cerrar-sesiones", requirePerm("usuarios.gestionar"), async (req, res) => {
  const uid = id(req.params.id);
  const n = await cerrarSesionesDe(uid, uid === req.usuario.id ? req.sessionID : null);
  await auditar(req, "sesiones_cerradas", { detalle: { id: uid, cerradas: n } });
  res.json({ cerradas: n });
});

/* ======================= Roles y permisos ======================= */
r.get("/roles", requireAlguno("usuarios.gestionar", "roles.gestionar"), async (_req, res) => {
  const { rows } = await query(
    `SELECT r.id, r.codigo, r.nombre, r.descripcion, r.es_sistema,
            coalesce((SELECT array_agg(permiso_codigo ORDER BY permiso_codigo) FROM rol_permisos WHERE rol_id=r.id), '{}') AS permisos,
            coalesce((SELECT json_object_agg(modulo_id, coalesce(to_json(preguntas), '"*"'::json)) FROM rol_alcance WHERE rol_id=r.id), NULL) AS alcance,
            (SELECT count(*) FROM usuarios u WHERE u.rol_id=r.id)::int AS usuarios
       FROM roles r ORDER BY r.es_sistema DESC, r.nombre`
  );
  res.json({
    roles: rows,
    permisos: Object.entries(PERMISOS).map(([codigo, descripcion]) => ({ codigo, descripcion })),
    modulos: MODS.map((m) => ({ id: m.id, titulo: m.titulo, preguntas: m.qs.map((q) => ({ id: q.id, texto: q.t })) })),
  });
});

const alcanceSchema = z
  .record(z.string(), z.union([z.literal("*"), z.array(z.string()).min(1)]))
  .nullable()
  .refine((a) => !a || Object.entries(a).every(([m, qs]) => MODS.some((x) => x.id === m) && (qs === "*" || qs.every((q) => QIDX[q]))), "Módulo o pregunta desconocidos.");
const rolSchema = z.object({
  codigo: z.string().trim().regex(/^[a-z0-9_]{3,40}$/, "Código: minúsculas, números o guion bajo (3 a 40)."),
  nombre: z.string().trim().min(2).max(80),
  descripcion: z.string().trim().max(300).optional().default(""),
  permisos: z.array(z.enum(Object.keys(PERMISOS))),
  alcance: alcanceSchema,
});

async function guardarRol(c, rolId, { permisos, alcance }) {
  await c.query("DELETE FROM rol_permisos WHERE rol_id=$1", [rolId]);
  for (const p of permisos) await c.query("INSERT INTO rol_permisos VALUES ($1,$2)", [rolId, p]);
  await c.query("DELETE FROM rol_alcance WHERE rol_id=$1", [rolId]);
  for (const [m, qs] of Object.entries(alcance || {})) await c.query("INSERT INTO rol_alcance VALUES ($1,$2,$3)", [rolId, m, qs === "*" ? null : qs]);
}

r.post("/roles", requirePerm("roles.gestionar"), validar(rolSchema), async (req, res) => {
  const b = req.valido;
  if (b.permisos.includes("evaluacion.llenar")) throw new HttpError(400, "Solo el rol Club puede llenar evaluaciones.");
  const rolId = await tx(async (c) => {
    const ins = await c.query("INSERT INTO roles(codigo, nombre, descripcion) VALUES ($1,$2,$3) RETURNING id", [b.codigo, b.nombre, b.descripcion]).catch((e) => conflicto(e, "Ya existe un rol con ese código."));
    await guardarRol(c, ins.rows[0].id, b);
    return ins.rows[0].id;
  });
  invalidarCacheRoles();
  await auditar(req, "rol_creado", { detalle: { id: rolId, codigo: b.codigo, permisos: b.permisos, alcance: b.alcance } });
  res.status(201).json({ id: rolId });
});

r.put("/roles/:id", requirePerm("roles.gestionar"), validar(rolSchema.omit({ codigo: true })), async (req, res) => {
  const rolId = id(req.params.id);
  const { rows } = await query("SELECT * FROM roles WHERE id=$1", [rolId]);
  const rol = rows[0];
  if (!rol) throw new HttpError(404, "Rol no encontrado.");
  const b = req.valido;
  // Los roles del sistema mantienen sus permisos: admin todo, club solo llenar
  if (rol.codigo === "admin" && !Object.keys(PERMISOS).filter((p) => p !== "evaluacion.llenar").every((p) => b.permisos.includes(p))) throw new HttpError(400, "El rol Administrador debe conservar todos los permisos.");
  if (rol.codigo === "club" && (b.permisos.join() !== "evaluacion.llenar" || b.alcance)) throw new HttpError(400, "El rol Club solo puede llenar su evaluación.");
  if (rol.codigo !== "club" && b.permisos.includes("evaluacion.llenar")) throw new HttpError(400, "Solo el rol Club puede llenar evaluaciones.");
  if (rol.codigo === "admin" && b.alcance) throw new HttpError(400, "El rol Administrador ve todo el formulario.");
  await tx(async (c) => {
    await c.query("UPDATE roles SET nombre=$2, descripcion=$3 WHERE id=$1", [rolId, b.nombre, b.descripcion]);
    await guardarRol(c, rolId, b);
  });
  invalidarCacheRoles();
  await cerrarSesionesDeRol(rolId);
  await auditar(req, "rol_modificado", { detalle: { id: rolId, codigo: rol.codigo, permisos: b.permisos, alcance: b.alcance } });
  res.json({ ok: true });
});

r.delete("/roles/:id", requirePerm("roles.gestionar"), async (req, res) => {
  const rolId = id(req.params.id);
  const { rows } = await query("SELECT codigo, es_sistema, (SELECT count(*) FROM usuarios WHERE rol_id=$1)::int AS n FROM roles WHERE id=$1", [rolId]);
  if (!rows[0]) throw new HttpError(404, "Rol no encontrado.");
  if (rows[0].es_sistema) throw new HttpError(400, "Los roles del sistema no se pueden borrar.");
  if (rows[0].n) throw new HttpError(400, "El rol tiene usuarios asignados. Cámbielos de rol primero.");
  await query("DELETE FROM roles WHERE id=$1", [rolId]);
  invalidarCacheRoles();
  await auditar(req, "rol_borrado", { detalle: { id: rolId, codigo: rows[0].codigo } });
  res.json({ ok: true });
});

/* ======================= Temporadas ======================= */
const fecha = z.iso.datetime({ offset: true }).nullable().optional();
const temporadaSchema = z.object({
  nombre: z.string().trim().min(2).max(40),
  versionFormulario: z.string().trim().min(1).max(20),
  abreEn: fecha,
  cierraEn: fecha,
  estado: z.enum(["borrador", "abierta", "cerrada"]),
  clubes: z.array(z.number().int().positive()).max(200),
});

r.get("/temporadas", requirePerm("temporadas.gestionar"), async (_req, res) => {
  const { rows } = await query(
    `SELECT t.*, coalesce((SELECT array_agg(club_id) FROM temporada_clubes WHERE temporada_id=t.id), '{}') AS clubes,
            (SELECT count(*) FROM evaluaciones e WHERE e.temporada_id=t.id AND e.estado='enviada')::int AS enviadas
       FROM temporadas t ORDER BY t.abre_en DESC NULLS LAST, t.id DESC`
  );
  res.json(rows);
});

async function sincronizarClubes(c, temporadaId, version, clubes) {
  const actuales = (await c.query("SELECT club_id FROM temporada_clubes WHERE temporada_id=$1", [temporadaId])).rows.map((x) => x.club_id);
  const quitar = actuales.filter((x) => !clubes.includes(x));
  if (quitar.length) {
    const conDatos = await c.query(
      "SELECT c.nombre FROM evaluaciones e JOIN clubes c ON c.id=e.club_id WHERE e.temporada_id=$1 AND e.club_id=ANY($2) AND (e.estado='enviada' OR e.respuestas <> '{}'::jsonb)",
      [temporadaId, quitar]
    );
    if (conDatos.rowCount) throw new HttpError(400, `No se puede quitar a ${conDatos.rows.map((x) => x.nombre).join(", ")}: ya tienen respuestas en esta temporada.`);
    await c.query("DELETE FROM evaluaciones WHERE temporada_id=$1 AND club_id=ANY($2)", [temporadaId, quitar]);
    await c.query("DELETE FROM temporada_clubes WHERE temporada_id=$1 AND club_id=ANY($2)", [temporadaId, quitar]);
  }
  for (const cid of clubes.filter((x) => !actuales.includes(x))) {
    await c.query("INSERT INTO temporada_clubes VALUES ($1,$2)", [temporadaId, cid]);
    await c.query("INSERT INTO evaluaciones(temporada_id, club_id, version_formulario) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [temporadaId, cid, version]);
  }
}

const validarFechas = (b) => {
  if (b.abreEn && b.cierraEn && new Date(b.abreEn) >= new Date(b.cierraEn)) throw new HttpError(400, "La fecha de cierre debe ser posterior a la de apertura.");
};

r.post("/temporadas", requirePerm("temporadas.gestionar"), validar(temporadaSchema), async (req, res) => {
  const b = req.valido;
  validarFechas(b);
  const tid = await tx(async (c) => {
    const ins = await c
      .query("INSERT INTO temporadas(nombre, version_formulario, abre_en, cierra_en, estado) VALUES ($1,$2,$3,$4,$5) RETURNING id", [b.nombre, b.versionFormulario, b.abreEn || null, b.cierraEn || null, b.estado])
      .catch((e) => conflicto(e, e.constraint === "temporadas_una_abierta" ? "Ya hay otra temporada abierta. Ciérrela primero." : "Ya existe una temporada con ese nombre."));
    await sincronizarClubes(c, ins.rows[0].id, b.versionFormulario, b.clubes);
    return ins.rows[0].id;
  });
  await auditar(req, "temporada_creada", { detalle: { id: tid, nombre: b.nombre, estado: b.estado } });
  res.status(201).json({ id: tid });
});

r.put("/temporadas/:id", requirePerm("temporadas.gestionar"), validar(temporadaSchema), async (req, res) => {
  const tid = id(req.params.id);
  const b = req.valido;
  validarFechas(b);
  await tx(async (c) => {
    const u = await c
      .query("UPDATE temporadas SET nombre=$2, version_formulario=$3, abre_en=$4, cierra_en=$5, estado=$6, actualizado_en=now() WHERE id=$1", [tid, b.nombre, b.versionFormulario, b.abreEn || null, b.cierraEn || null, b.estado])
      .catch((e) => conflicto(e, e.constraint === "temporadas_una_abierta" ? "Ya hay otra temporada abierta. Ciérrela primero." : "Ya existe una temporada con ese nombre."));
    if (!u.rowCount) throw new HttpError(404, "Temporada no encontrada.");
    await sincronizarClubes(c, tid, b.versionFormulario, b.clubes);
  });
  await auditar(req, "temporada_modificada", { detalle: { id: tid, nombre: b.nombre, estado: b.estado, clubes: b.clubes.length } });
  res.json({ ok: true });
});

/* ======================= Equipos (clubes) ======================= */
r.get("/clubes", requirePerm("equipos.gestionar"), async (_req, res) => {
  const { rows } = await query(
    `SELECT c.id, c.nombre, c.valor_formulario, c.estado, c.ciudad, c.correo, c.activo, c.logo IS NOT NULL AS tiene_logo,
            extract(epoch from c.actualizado_en)::bigint AS v,
            (SELECT count(*) FROM usuarios u WHERE u.club_id=c.id)::int AS usuarios,
            (SELECT count(*) FROM evaluaciones e WHERE e.club_id=c.id)::int AS evaluaciones
       FROM clubes c ORDER BY c.activo DESC, c.nombre`
  );
  res.json(rows.map(({ tiene_logo, v, ...c }) => ({ ...c, logo: tiene_logo ? `/api/clubes/${c.id}/logo?v=${v}` : null })));
});

/* Lista corta para selectores (usuarios, temporadas) */
r.get("/clubes/lista", requireAlguno("usuarios.gestionar", "temporadas.gestionar", "equipos.gestionar"), async (_req, res) => {
  const { rows } = await query("SELECT id, nombre, activo FROM clubes ORDER BY nombre");
  res.json(rows);
});

const clubSchema = z.object({
  nombre: z.string().trim().min(2).max(80),
  valorFormulario: z.string().trim().min(2).max(80).optional(),
  estado: z.string().trim().max(60).nullable().optional(),
  ciudad: z.string().trim().max(80).nullable().optional(),
  correo: z.string().trim().email().nullable().optional().or(z.literal("").transform(() => null)),
  activo: z.boolean().optional(),
});

r.post("/clubes", requirePerm("equipos.gestionar"), validar(clubSchema), async (req, res) => {
  const b = req.valido;
  const ins = await query(
    "INSERT INTO clubes(nombre, valor_formulario, estado, ciudad, correo, activo) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    [b.nombre, b.valorFormulario || b.nombre, b.estado || null, b.ciudad || null, b.correo || null, b.activo ?? true]
  ).catch((e) => conflicto(e, "Ya existe un club con ese nombre."));
  await auditar(req, "club_creado", { detalle: { id: ins.rows[0].id, nombre: b.nombre } });
  res.status(201).json({ id: ins.rows[0].id });
});

r.put("/clubes/:id", requirePerm("equipos.gestionar"), validar(clubSchema), async (req, res) => {
  const cid = id(req.params.id);
  const b = req.valido;
  const u = await query(
    "UPDATE clubes SET nombre=$2, valor_formulario=$3, estado=$4, ciudad=$5, correo=$6, activo=$7, actualizado_en=now() WHERE id=$1",
    [cid, b.nombre, b.valorFormulario || b.nombre, b.estado || null, b.ciudad || null, b.correo || null, b.activo ?? true]
  ).catch((e) => conflicto(e, "Ya existe un club con ese nombre."));
  if (!u.rowCount) throw new HttpError(404, "Club no encontrado.");
  if (b.activo === false) {
    const us = await query("SELECT id FROM usuarios WHERE club_id=$1", [cid]);
    for (const x of us.rows) await cerrarSesionesDe(x.id);
  }
  await auditar(req, "club_modificado", { detalle: { id: cid, nombre: b.nombre, activo: b.activo } });
  res.json({ ok: true });
});

/* Logo: PNG, JPG o WebP de hasta 1 MB, verificado por su contenido y no por la extensión */
const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024, files: 1 } });
function tipoImagen(b) {
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

r.put("/clubes/:id/logo", requirePerm("equipos.gestionar"), subida.single("logo"), async (req, res) => {
  const cid = id(req.params.id);
  if (!req.file) throw new HttpError(400, "Adjunte una imagen.");
  const tipo = tipoImagen(req.file.buffer);
  if (!tipo) throw new HttpError(400, "El logo debe ser PNG, JPG o WebP.");
  const u = await query("UPDATE clubes SET logo=$2, logo_tipo=$3, actualizado_en=now() WHERE id=$1", [cid, req.file.buffer, tipo]);
  if (!u.rowCount) throw new HttpError(404, "Club no encontrado.");
  await auditar(req, "club_logo", { detalle: { id: cid, bytes: req.file.size } });
  res.json({ ok: true });
});

/* ======================= Auditoría ======================= */
const auditoriaSchema = z.object({
  usuario: z.string().trim().max(254).optional(),
  accion: z.string().trim().max(60).optional(),
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
  pagina: z.coerce.number().int().min(1).max(10_000).default(1),
});

r.get("/auditoria", requirePerm("auditoria.ver"), validar(auditoriaSchema, "query"), async (req, res) => {
  const f = req.valido, where = [], params = [];
  if (f.usuario) { params.push(`%${f.usuario}%`); where.push(`a.usuario ILIKE $${params.length}`); }
  if (f.accion) { params.push(f.accion); where.push(`a.accion = $${params.length}`); }
  if (f.desde) { params.push(f.desde); where.push(`a.creado_en >= $${params.length}::date`); }
  if (f.hasta) { params.push(f.hasta); where.push(`a.creado_en < $${params.length}::date + 1`); }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const POR_PAGINA = 50;
  params.push(POR_PAGINA, (f.pagina - 1) * POR_PAGINA);
  const { rows } = await query(
    `SELECT a.id, a.usuario, a.accion, a.detalle, host(a.ip) AS ip, a.navegador, a.creado_en, count(*) OVER() AS total
       FROM auditoria a ${w} ORDER BY a.creado_en DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const acciones = (await query("SELECT DISTINCT accion FROM auditoria ORDER BY accion")).rows.map((x) => x.accion);
  res.json({ filas: rows.map(({ total, ...x }) => x), total: Number(rows[0]?.total || 0), porPagina: POR_PAGINA, acciones });
});

export default r;
