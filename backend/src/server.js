import pino from "pino";
import { crearApp } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db.js";
import { migrar } from "./migrar.js";
import { seed } from "./seed.js";

const logger = pino({ level: config.LOG_LEVEL, redact: ["req.headers.cookie", "*.clave", "*.hash_clave"] });

await migrar(logger);
await seed(logger);

const server = crearApp(logger).listen(config.PORT, () => logger.info(`Backend escuchando en el puerto ${config.PORT}`));

function apagar(signal) {
  logger.info(`${signal}: cerrando`);
  server.close(() => pool.end().then(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", apagar);
process.on("SIGINT", apagar);
