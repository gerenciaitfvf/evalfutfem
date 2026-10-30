import fs from "node:fs";
import pg from "pg";
import { config } from "./config.js";

function ssl() {
  if (!config.DATABASE_SSL) return false;
  if (config.DATABASE_SSL_CA) return { ca: fs.readFileSync(config.DATABASE_SSL_CA, "utf8"), rejectUnauthorized: true };
  return { rejectUnauthorized: false };
}

export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  ssl: ssl(),
  max: 10,
  idleTimeoutMillis: 30_000,
});

export const query = (text, params) => pool.query(text, params);

/* Ejecuta fn(client) dentro de una transacción */
export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
