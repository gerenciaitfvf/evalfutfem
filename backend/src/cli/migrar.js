import { pool } from "../db.js";
import { migrar } from "../migrar.js";
import { seed } from "../seed.js";

/* Aplica migraciones y datos iniciales sin levantar el servidor */
await migrar();
await seed();
await pool.end();
