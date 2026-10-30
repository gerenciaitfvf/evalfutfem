import { z } from "zod";

// El valor por defecto va antes de transform: así también se convierte a booleano
const bool = (porDefecto) =>
  z
    .enum(["true", "false", "1", "0"])
    .default(porDefecto)
    .transform((v) => v === "true" || v === "1");

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().min(1),
  // SSL hacia Postgres: obligatorio en producción
  DATABASE_SSL: bool("false"),
  // Ruta a la CA del servidor Postgres; si no se da, se cifra pero no se verifica el certificado
  DATABASE_SSL_CA: z.string().optional(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET debe tener al menos 32 caracteres"),
  FRONTEND_ORIGIN: z.string().url(),
  // Número de proxies delante del backend (Traefik de Dokploy = 1)
  TRUST_PROXY: z.coerce.number().int().default(1),
  ADMIN_INICIAL_USUARIO: z.string().email().optional(),
  ADMIN_INICIAL_NOMBRE: z.string().default("Administrador FVF"),
  ADMIN_INICIAL_CLAVE: z.string().optional(),
  LOG_LEVEL: z.string().default("info"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Configuración inválida:", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  process.exit(1);
}

export const config = parsed.data;
export const isProd = config.NODE_ENV === "production";

if (isProd && !config.DATABASE_SSL) {
  console.error("En producción la conexión a Postgres debe usar SSL (DATABASE_SSL=true).");
  process.exit(1);
}
