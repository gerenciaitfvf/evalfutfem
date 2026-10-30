/* Cliente de la API. La sesión viaja en una cookie HttpOnly del backend
   (credentials: "include"); el encabezado X-Requested-With es la protección CSRF. */
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  status: number;
  datos: Record<string, unknown>;
  constructor(status: number, mensaje: string, datos: Record<string, unknown> = {}) {
    super(mensaje);
    this.status = status;
    this.datos = datos;
  }
}

export async function api<T = unknown>(ruta: string, opciones: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const headers: Record<string, string> = { "X-Requested-With": "fvf" };
  let body: BodyInit | undefined;
  if (opciones.form) body = opciones.form;
  else if (opciones.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opciones.body);
  }
  let res: Response;
  try {
    res = await fetch(API_URL + "/api" + ruta, { method: opciones.method ?? (body ? "POST" : "GET"), headers, body, credentials: "include" });
  } catch {
    throw new ApiError(0, "No hay conexión con el servidor. Revise su internet.");
  }
  const tipo = res.headers.get("content-type") || "";
  const datos = tipo.includes("application/json") ? await res.json() : null;
  if (!res.ok) {
    if (res.status === 401 && !ruta.startsWith("/auth/")) avisarSesionVencida();
    if (res.status === 403 && datos?.codigo === "CAMBIAR_CLAVE") location.assign("/cambiar-clave");
    throw new ApiError(res.status, datos?.error || `Error ${res.status}`, datos || {});
  }
  return datos as T;
}

/* Descarga un archivo (Excel) respetando la sesión */
export async function descargar(ruta: string, nombre: string) {
  const res = await fetch(API_URL + "/api" + ruta, { credentials: "include", headers: { "X-Requested-With": "fvf" } });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new ApiError(res.status, d.error || "No se pudo descargar.");
  }
  const disp = res.headers.get("content-disposition") || "";
  const m = disp.match(/filename\*=UTF-8''([^;]+)/);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(await res.blob());
  a.download = m ? decodeURIComponent(m[1]) : nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

export const logoUrl = (ruta: string | null | undefined) => (ruta ? API_URL + ruta : null);

function avisarSesionVencida() {
  const volver = encodeURIComponent(location.pathname + location.search);
  location.assign(`/login?vencida=1&volver=${volver}`);
}

export type Sesion = {
  id: number;
  usuario: string;
  nombre: string;
  rol: { codigo: string; nombre: string; permisos: string[] };
  club: { id: number; nombre: string; valor: string } | null;
  debeCambiarClave: boolean;
};

export const obtenerSesion = () =>
  api<Sesion>("/auth/sesion").catch((e) => {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  });

export const salir = async () => {
  await api("/auth/logout", { method: "POST" }).catch(() => {});
  location.assign("/login");
};

/* Pantalla de inicio según el rol */
export const inicioDe = (s: Sesion) =>
  s.debeCambiarClave ? "/cambiar-clave" : s.rol.permisos.includes("evaluacion.llenar") ? "/evaluacion/" : "/admin";

export const puede = (s: Sesion | null | undefined, p: string) => !!s?.rol.permisos.includes(p);
