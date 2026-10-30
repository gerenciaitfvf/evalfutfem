import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { api, ApiError, inicioDe, logoUrl, obtenerSesion, salir, type Sesion } from "../api";
import { mountForm } from "../form/engine.js";
import "../form/form.css";
import "./barra.css";
import { MARKUP } from "./markup";

type Respuestas = Record<string, unknown>;
type Evaluacion = {
  id: number;
  estado: "borrador" | "enviada";
  editable: boolean;
  respuestas: Respuestas;
  enviadoEn: string | null;
  temporada: { id: number; nombre: string; estado: string; cierraEn: string | null };
  club: { id: number; nombre: string; valor: string };
  clubes: { id: number; nombre: string; valor: string; estado: string | null; logo: string | null }[];
};

const VERSION = "6";
const TZ = "America/Caracas";
const fecha = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-VE", { timeZone: TZ, ...o }).format(new Date(iso));

const vacio = (v: unknown): boolean =>
  v == null || v === "" || (Array.isArray(v) ? v.length === 0 : typeof v === "object" && Object.values(v as object).every(vacio));

/* Solo las respuestas que cambiaron desde el último guardado */
function diferencias(actual: Respuestas, guardado: Respuestas) {
  const out: Respuestas = {};
  for (const [k, v] of Object.entries(actual)) {
    if (vacio(v) && vacio(guardado[k])) continue;
    if (JSON.stringify(v) !== JSON.stringify(guardado[k])) out[k] = v;
  }
  return out;
}

function Barra({ sesion, ev }: { sesion: Sesion; ev: Evaluacion | null }) {
  const logo = ev?.clubes.find((c) => c.id === ev.club.id)?.logo;
  return (
    <div className="tb">
      <div className="tb-in">
        <div className="tb-club">
          {logo ? <img src={logoUrl(logo)!} alt="" /> : <span className="tb-ini">{(sesion.club?.nombre || "?").slice(0, 2).toUpperCase()}</span>}
          <div>
            <b>{sesion.club?.nombre}</b>
            {ev && <small>Temporada {ev.temporada.nombre}</small>}
          </div>
        </div>
        <nav>
          <a href="/mi-cuenta">Mi cuenta</a>
          <button type="button" onClick={salir}>Salir</button>
        </nav>
      </div>
    </div>
  );
}

function App() {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [ev, setEv] = useState<Evaluacion | null>(null);
  const [error, setError] = useState("");
  const raiz = useRef<HTMLDivElement>(null);
  const montado = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await obtenerSesion();
        if (!s) return location.assign("/login?volver=/evaluacion/");
        if (inicioDe(s) !== "/evaluacion/") return location.assign(inicioDe(s));
        setSesion(s);
        setEv(await api<Evaluacion>("/evaluacion"));
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo cargar la evaluación.");
      }
    })();
  }, []);

  useEffect(() => {
    if (!ev || !raiz.current || montado.current) return;
    montado.current = true;
    document.documentElement.style.background = "";

    if (ev.temporada.cierraEn) {
      const c = ev.temporada.cierraEn;
      document.getElementById("cvplazo")!.textContent = fecha(c, { day: "numeric", month: "short", year: "numeric" });
      document.getElementById("cvplazod")!.textContent = fecha(c, { weekday: "long" });
      document.getElementById("intplazo")!.textContent = fecha(c, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    const aviso = document.getElementById("roaviso")!;
    if (!ev.editable) {
      aviso.hidden = false;
      aviso.textContent =
        ev.estado === "enviada"
          ? `Su club envió esta evaluación el ${fecha(ev.enviadoEn!, { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}. Puede revisar sus respuestas, pero ya no se pueden modificar. Si necesita corregir algo, escriba a andreina.pelaez@fvf.com.ve.`
          : "La temporada no está abierta para respuestas. Puede revisar lo que su club respondió.";
    }

    let guardado: Respuestas = { ...ev.respuestas };
    let pendiente = false;
    const enviar = async (ruta: string, metodo: string, r: Respuestas) => {
      const cambios = diferencias(r, guardado);
      if (metodo === "PUT" && !Object.keys(cambios).length) return;
      pendiente = true;
      try {
        await api(ruta, { method: metodo, body: { cambios } });
        guardado = { ...guardado, ...cambios };
        pendiente = false;
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) Object.assign(e, { fatal: true });
        throw e;
      }
    };
    const form = mountForm({
      version: VERSION,
      clubes: ev.clubes.map((c) => ({ ...c, logo: logoUrl(c.logo) })),
      club: ev.club,
      respuestas: ev.respuestas,
      readOnly: !ev.editable,
      onSave: (r: Respuestas) => enviar("/evaluacion", "PUT", r),
      onSubmit: (r: Respuestas) => enviar("/evaluacion/enviar", "POST", r),
    });
    // Si cierra la pestaña con cambios sin guardar, se intenta guardar y se avisa
    window.addEventListener("beforeunload", (e) => {
      if (pendiente || Object.keys(diferencias(form.collect() as Respuestas, guardado)).length) {
        form.flush();
        e.preventDefault();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") form.flush();
    });
  }, [ev]);

  if (error)
    return (
      <div className="tb-error">
        <h2>No se pudo abrir la evaluación</h2>
        <p>{error}</p>
        <p>
          <a href="/login">Volver al inicio de sesión</a>
        </p>
      </div>
    );
  if (!sesion || !ev) return <div className="tb-cargando">Cargando…</div>;
  return (
    <>
      <Barra sesion={sesion} ev={ev} />
      <div ref={raiz} dangerouslySetInnerHTML={{ __html: MARKUP }} />
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
