import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../api";

/* Componentes base del panel, con el estilo del formulario (lila, fucsia, Prometo/Jost) */

export function useDatos<T>(ruta: string | null) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const recargar = useCallback(async () => {
    if (!ruta) return;
    setCargando(true);
    try {
      setDatos(await api<T>(ruta));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, [ruta]);
  useEffect(() => {
    recargar();
  }, [recargar]);
  return { datos, error, cargando, recargar, setDatos };
}

export const mensajeDe = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : "Ocurrió un error.");

type BotonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "p" | "s" | "o" | "peligro" | "texto"; chico?: boolean };
export function Boton({ variante = "p", chico, className = "", ...p }: BotonProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-[14px] font-head font-bold transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer";
  const tam = chico ? "min-h-9 px-3 text-sm rounded-[10px]" : "min-h-12 px-5 text-base";
  const v = {
    p: "bg-lila text-white hover:bg-lila2",
    s: "bg-card text-ink border-[1.5px] border-line hover:border-lila",
    o: "bg-fucsia text-lila3 hover:brightness-95",
    peligro: "bg-card text-no border-[1.5px] border-no/40 hover:bg-no hover:text-white",
    texto: "text-acento hover:underline px-1 min-h-0",
  }[variante];
  return <button type="button" className={`${base} ${tam} ${v} ${className}`} {...p} />;
}

export function Campo({ etiqueta, ayuda, error, children }: { etiqueta: string; ayuda?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-semibold text-ink">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-sm text-muted">{ayuda}</span>}
      {error && <span className="mt-1 block text-sm text-no">{error}</span>}
    </label>
  );
}

export const claseInput =
  "w-full rounded-xl border-[1.5px] border-line bg-field px-3.5 py-3 text-base text-ink outline-none transition focus:border-lila focus:ring-4 focus:ring-fucsia/20 disabled:opacity-60";

export function Tarjeta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[18px] border border-line bg-card p-4 sm:p-5 ${className}`}>{children}</section>;
}

export function Titulo({ kicker, children, acciones }: { kicker?: string; children: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker && <div className="text-xs font-semibold uppercase tracking-[.14em] text-fucsiad">{kicker}</div>}
        <h1 className="text-[26px] font-light leading-tight text-ink sm:text-[30px] [&_b]:font-extrabold [&_b]:text-acento">{children}</h1>
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

export function Aviso({ tipo = "ok", children }: { tipo?: "ok" | "err" | "info"; children: ReactNode }) {
  const c = { ok: "bg-[#E7F3EA] text-[#1D5B2C] border-[#B9DDBF]", err: "bg-[#FBE9EC] text-[#7A1B2E] border-[#F0C2CB]", info: "bg-soft text-ink border-line" }[tipo];
  return <div className={`my-3 rounded-[14px] border px-4 py-3 ${c}`} role={tipo === "err" ? "alert" : "status"}>{children}</div>;
}

export function Insignia({ color = "lila", children }: { color?: "lila" | "ok" | "warn" | "no" | "gris" | "fucsia"; children: ReactNode }) {
  const c = {
    lila: "bg-soft text-acento border-line",
    ok: "bg-[#E7F3EA] text-[#1D5B2C] border-[#B9DDBF]",
    warn: "bg-[#F7EED5] text-[#7A5A00] border-[#EBD3A6]",
    no: "bg-[#FBE9EC] text-[#7A1B2E] border-[#F0C2CB]",
    gris: "bg-field text-muted border-line",
    fucsia: "bg-[#F4DDF6] text-fucsiad border-[#E9D3F0]",
  }[color];
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${c}`}>{children}</span>;
}

export function Modal({ titulo, onCerrar, children, ancho = "max-w-lg" }: { titulo: string; onCerrar: () => void; children: ReactNode; ancho?: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onCerrar]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-lila3/60 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div role="dialog" aria-modal="true" aria-label={titulo} className={`max-h-[92vh] w-full ${ancho} overflow-y-auto rounded-t-[18px] bg-card p-5 shadow-2xl sm:rounded-[18px]`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-titulo">{titulo}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="cursor-pointer rounded-full px-2 text-2xl leading-none text-muted hover:text-ink">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Cargando() {
  return <div className="py-16 text-center text-muted">Cargando…</div>;
}

/* Muestra una clave temporal UNA sola vez, con botón para copiarla */
export function ClaveTemporal({ usuario, clave, onCerrar }: { usuario: string; clave: string; onCerrar: () => void }) {
  const [copiada, setCopiada] = useState(false);
  return (
    <Modal titulo="Clave temporal" onCerrar={onCerrar}>
      <p className="mb-3 text-muted">
        Entréguela a <b className="text-ink">{usuario}</b> por un canal seguro. Se muestra <b className="text-ink">solo esta vez</b>: el sistema no la guarda y deberá cambiarla en su primer ingreso.
      </p>
      <div className="mb-4 flex items-center gap-2 rounded-xl border-[1.5px] border-dashed border-fucsia bg-soft px-4 py-3">
        <code className="flex-1 select-all font-mono text-lg tracking-wider text-titulo">{clave}</code>
        <Boton
          chico
          variante="s"
          onClick={async () => {
            await navigator.clipboard.writeText(clave).catch(() => {});
            setCopiada(true);
          }}
        >
          {copiada ? "Copiada" : "Copiar"}
        </Boton>
      </div>
      <Boton className="w-full" onClick={onCerrar}>
        Listo
      </Boton>
    </Modal>
  );
}

export const TZ = "America/Caracas";
export const fechaHora = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat("es-VE", { timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)) : "—";
export const fechaCorta = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat("es-VE", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)) : "—";

export function Iniciales({ nombre, logo, tam = 36 }: { nombre: string; logo?: string | null; tam?: number }) {
  const ini = nombre.replace(/\b(FC|de|del|la|el)\b/gi, " ").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
  return logo ? (
    <img src={logo} alt="" style={{ width: tam, height: tam }} className="flex-none rounded-full bg-white object-contain p-0.5 ring-1 ring-line" />
  ) : (
    <span style={{ width: tam, height: tam }} className="grid flex-none place-items-center rounded-full bg-soft text-xs font-bold text-acento ring-1 ring-line">
      {ini || "?"}
    </span>
  );
}
