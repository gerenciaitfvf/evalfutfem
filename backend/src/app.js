import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { config } from "./config.js";
import { query } from "./db.js";
import { cargarUsuario, csrf, HttpError, manejarErrores } from "./middleware.js";
import admin from "./rutas/admin.js";
import auth from "./rutas/auth.js";
import configuracion from "./rutas/configuracion.js";
import cuenta from "./rutas/cuenta.js";
import evaluacion from "./rutas/evaluacion.js";
import { sesiones } from "./seguridad/sesiones.js";

export function crearApp(logger) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.TRUST_PROXY);

  app.use(
    pinoHttp({
      logger,
      // Nunca se registran cookies ni cuerpos (podrían llevar claves)
      serializers: { req: (r) => ({ method: r.method, url: r.url }), res: (r) => ({ statusCode: r.statusCode }) },
      autoLogging: { ignore: (req) => req.url === "/api/salud" },
    })
  );
  app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
  app.use(
    cors({
      origin: config.FRONTEND_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "X-Requested-With"],
      maxAge: 600,
    })
  );
  app.use(express.json({ limit: "512kb" }));
  app.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  app.get("/api/salud", async (_req, res) => {
    await query("SELECT 1");
    res.json({ ok: true });
  });

  /* Escudos de los clubes: son públicos, se pueden cachear */
  app.get("/api/clubes/:id/logo", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(400, "Identificador inválido.");
    const { rows } = await query("SELECT logo, logo_tipo FROM clubes WHERE id=$1 AND logo IS NOT NULL", [id]);
    if (!rows[0]) throw new HttpError(404, "Sin logo.");
    res.set("Content-Type", rows[0].logo_tipo);
    res.set("Cache-Control", "public, max-age=86400");
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    res.send(rows[0].logo);
  });

  app.use("/api", sesiones, csrf, cargarUsuario);
  app.use("/api/auth", auth);
  app.use("/api/cuenta", cuenta);
  app.use("/api/evaluacion", evaluacion);
  app.use("/api/admin", admin);
  app.use("/api/configuracion", configuracion);

  app.use((_req, _res, next) => next(new HttpError(404, "Ruta no encontrada.")));
  app.use(manejarErrores);
  return app;
}
