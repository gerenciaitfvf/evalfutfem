import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AREAS, FORM_VERSION } from "../../shared/formulario.js";
import { config } from "./config.js";
import { tx } from "./db.js";
import { PERMISOS } from "./permisos.js";
import { hashClave, validarPolitica } from "./seguridad/claves.js";

const SEED_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "seed");

const LECTURA = ["tablero.ver", "respuestas.ver", "respuestas.exportar"];
const ADMIN = Object.keys(PERMISOS).filter((p) => p !== "evaluacion.llenar");

/* Roles iniciales. Los de área toman su alcance de AREAS (el mismo reparto del formulario). */
const ROLES = [
  { codigo: "admin", nombre: "Administrador", descripcion: "Acceso total a la administración", es_sistema: true, permisos: ADMIN },
  { codigo: "club", nombre: "Club", descripcion: "Llena y envía la evaluación de su club", es_sistema: true, permisos: ["evaluacion.llenar"] },
  ...Object.entries(AREAS).map(([codigo, a]) => ({
    codigo,
    nombre: codigo === "general" ? "General (lectura)" : a.nombre,
    descripcion: `Responsables: ${a.resp}`,
    es_sistema: false,
    permisos: LECTURA,
    alcance: a.mods,
  })),
];

/* Idempotente: se puede correr en cada arranque sin pisar lo que se haya editado en el panel. */
export async function seed(log = console) {
  await tx(async (c) => {
    for (const [codigo, descripcion] of Object.entries(PERMISOS)) {
      await c.query(
        "INSERT INTO permisos(codigo, descripcion) VALUES ($1,$2) ON CONFLICT (codigo) DO UPDATE SET descripcion=EXCLUDED.descripcion",
        [codigo, descripcion]
      );
    }

    for (const r of ROLES) {
      const ins = await c.query(
        "INSERT INTO roles(codigo, nombre, descripcion, es_sistema) VALUES ($1,$2,$3,$4) ON CONFLICT (codigo) DO NOTHING RETURNING id",
        [r.codigo, r.nombre, r.descripcion, r.es_sistema]
      );
      const nuevo = ins.rows[0];
      const rolId = nuevo ? nuevo.id : (await c.query("SELECT id FROM roles WHERE codigo=$1", [r.codigo])).rows[0].id;
      // El rol admin siempre conserva todos sus permisos, para que nadie quede fuera
      if (nuevo || r.codigo === "admin") {
        for (const p of r.permisos) {
          await c.query("INSERT INTO rol_permisos VALUES ($1,$2) ON CONFLICT DO NOTHING", [rolId, p]);
        }
      }
      if (nuevo && r.alcance) {
        for (const [mod, qs] of Object.entries(r.alcance)) {
          await c.query("INSERT INTO rol_alcance VALUES ($1,$2,$3)", [rolId, mod, qs === "*" ? null : qs]);
        }
      }
      if (nuevo) log.info(`Rol creado: ${r.codigo}`);
    }

    const clubes = JSON.parse(fs.readFileSync(path.join(SEED_DIR, "clubes.json"), "utf8"));
    for (const cl of clubes) {
      const logo = fs.readFileSync(path.join(SEED_DIR, "logos", cl.logo));
      const ins = await c.query(
        `INSERT INTO clubes(nombre, valor_formulario, estado, logo, logo_tipo) VALUES ($1,$2,$3,$4,'image/png')
         ON CONFLICT (nombre) DO NOTHING RETURNING id`,
        [cl.nombre, cl.valor, cl.estado, logo]
      );
      if (ins.rows[0]) log.info(`Club creado: ${cl.nombre}`);
    }

    const { rowCount } = await c.query("SELECT 1 FROM temporadas LIMIT 1");
    if (!rowCount) {
      const t = await c.query(
        `INSERT INTO temporadas(nombre, version_formulario, abre_en, cierra_en, estado)
         VALUES ('2027', $1, now(), '2026-11-06 23:59:59-04', 'abierta') RETURNING id`,
        [FORM_VERSION]
      );
      await c.query("INSERT INTO temporada_clubes SELECT $1, id FROM clubes WHERE activo", [t.rows[0].id]);
      await c.query(
        `INSERT INTO evaluaciones(temporada_id, club_id, version_formulario)
         SELECT $1, club_id, $2 FROM temporada_clubes WHERE temporada_id=$1`,
        [t.rows[0].id, FORM_VERSION]
      );
      log.info("Temporada 2027 creada y abierta");
    }

    if (config.ADMIN_INICIAL_USUARIO) {
      const existe = await c.query("SELECT 1 FROM usuarios WHERE usuario=$1", [config.ADMIN_INICIAL_USUARIO]);
      if (!existe.rowCount) {
        const clave = config.ADMIN_INICIAL_CLAVE;
        const errores = clave ? validarPolitica(clave, { usuario: config.ADMIN_INICIAL_USUARIO }) : ["falta ADMIN_INICIAL_CLAVE"];
        if (errores.length) {
          log.warn(`No se creó el administrador inicial: ${errores.join(" ")}`);
        } else {
          await c.query(
            `INSERT INTO usuarios(usuario, nombre, hash_clave, rol_id, debe_cambiar_clave)
             VALUES ($1,$2,$3,(SELECT id FROM roles WHERE codigo='admin'), true)`,
            [config.ADMIN_INICIAL_USUARIO, config.ADMIN_INICIAL_NOMBRE, await hashClave(clave)]
          );
          log.info(`Administrador inicial creado: ${config.ADMIN_INICIAL_USUARIO}`);
        }
      }
    }
  });
}
