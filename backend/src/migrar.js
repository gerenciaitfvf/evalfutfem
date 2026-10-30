import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");

/* Aplica en orden los archivos migrations/NNN_*.sql que falten. Cada uno en su transacción. */
export async function migrar(log = console) {
  const client = await pool.connect();
  try {
    // Evita que dos instancias migren a la vez
    await client.query("SELECT pg_advisory_lock(727001)");
    await client.query("CREATE TABLE IF NOT EXISTS migraciones (nombre text PRIMARY KEY, aplicada_en timestamptz NOT NULL DEFAULT now())");
    const hechas = new Set((await client.query("SELECT nombre FROM migraciones")).rows.map((r) => r.nombre));
    const archivos = fs.readdirSync(DIR).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
    for (const f of archivos) {
      if (hechas.has(f)) continue;
      const sql = fs.readFileSync(path.join(DIR, f), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO migraciones(nombre) VALUES ($1)", [f]);
        await client.query("COMMIT");
        log.info(`Migración aplicada: ${f}`);
      } catch (e) {
        await client.query("ROLLBACK");
        throw new Error(`Falló la migración ${f}: ${e.message}`);
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(727001)").catch(() => {});
    client.release();
  }
}
