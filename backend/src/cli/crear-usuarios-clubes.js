import { pool, query } from "../db.js";
import { claveTemporal, hashClave } from "../seguridad/claves.js";

/* Crea un usuario por cada club activo que aún no tenga uno y muestra su clave temporal
   UNA sola vez en la consola. Cada club debe cambiarla en su primer ingreso.
   Uso: npm run crear-usuarios-clubes */
const slug = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");

const { rows } = await query(
  "SELECT c.id, c.nombre FROM clubes c WHERE c.activo AND NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.club_id=c.id) ORDER BY c.nombre"
);
const rol = (await query("SELECT id FROM roles WHERE codigo='club'")).rows[0].id;
if (!rows.length) console.log("Todos los clubes activos ya tienen usuario.");
for (const c of rows) {
  const usuario = slug(c.nombre).slice(0, 40);
  const clave = claveTemporal();
  await query(
    "INSERT INTO usuarios(usuario, nombre, hash_clave, rol_id, club_id, debe_cambiar_clave) VALUES ($1,$2,$3,$4,$5,true)",
    [usuario, c.nombre, await hashClave(clave), rol, c.id]
  );
  await query("INSERT INTO auditoria(usuario, accion, detalle) VALUES ('cli', 'usuario_creado', $1)", [JSON.stringify({ usuario, clubId: c.id })]);
  console.log(`${c.nombre.padEnd(28)} usuario: ${usuario.padEnd(24)} clave temporal: ${clave}`);
}
await pool.end();
