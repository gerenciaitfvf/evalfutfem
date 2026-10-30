import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { MODS, type Pregunta } from "@shared/formulario.js";
import { api, logoUrl, puede, type Sesion } from "../../api";
import { Aviso, Boton, Cargando, fechaHora, Iniciales, Insignia, mensajeDe, Tarjeta, Titulo, useDatos } from "../ui";

type Ficha = {
  temporada: { id: number; nombre: string; estado: string };
  evaluacionId: number;
  club: { id: number; nombre: string; logo: string | null };
  estado: "borrador" | "enviada";
  enviadoEn: string | null;
  enviadoPor: string | null;
  actualizadoEn: string;
  actualizadoPor: string | null;
  avance: { porcentaje?: number; modulos?: Record<string, { respondidas: number; total: number }> };
  modulosVisibles: { id: string; preguntas: string[] }[];
  respuestas: Record<string, unknown>;
  historial: { evento: string; creado_en: string; usuario: string | null }[];
};

const MODCOLOR = ["var(--color-m0)", "var(--color-m1)", "var(--color-m2)", "var(--color-m3)", "var(--color-m4)", "var(--color-m5)"];
const vacio = (v: unknown): boolean => v == null || v === "" || (Array.isArray(v) ? !v.length : typeof v === "object" && Object.values(v as object).every(vacio));
const Chip = ({ t }: { t: string }) => <span className="mr-1.5 mb-1.5 inline-block rounded-full border border-line bg-soft px-2.5 py-0.5 text-sm">{t}</span>;

/* Muestra una respuesta según el tipo de pregunta */
function Valor({ q, v, extras }: { q: Pregunta; v: unknown; extras?: unknown }) {
  if (vacio(v) && vacio(extras)) return <span className="text-muted italic">Sin respuesta</span>;
  switch (q.type) {
    case "check":
      return <div>{(v as string[]).map((x) => <Chip key={x} t={x} />)}</div>;
    case "kit":
      return (
        <div>
          {((v as string[]) || []).map((x) => <Chip key={x} t={x} />)}
          {((extras as { n: string; v: string }[]) || []).map((x, i) => <Chip key={i} t={`+ ${x.n} (${x.v})`} />)}
        </div>
      );
    case "rank":
      return (
        <ol className="list-decimal pl-5">
          {(v as string[]).map((x) => <li key={x}>{x}</li>)}
        </ol>
      );
    case "scale":
      return (
        <span>
          <b className="font-head text-lg text-acento">{String(v)}</b> de 5 <span className="text-muted">({q.min} → {String(q.max)})</span>
        </span>
      );
    case "grid":
    case "estadio":
    case "numred": {
      const o = v as Record<string, string>;
      return (
        <table className="text-sm">
          <tbody>
            {q.rows!.map((r) => (
              <tr key={r} className="border-b border-line last:border-0">
                <td className="py-1 pr-4 text-muted">{r}</td>
                <td className="py-1 font-semibold">{o[r] || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case "redes": {
      const o = v as Record<string, { usuario?: string; cuenta?: string }>;
      return (
        <table className="text-sm">
          <tbody>
            {Object.entries(o)
              .filter(([, x]) => x?.usuario)
              .map(([red, x]) => (
                <tr key={red}>
                  <td className="py-1 pr-4 text-muted">{red}</td>
                  <td className="py-1 font-semibold">{x.usuario}</td>
                  <td className="py-1 pl-3 text-muted">{x.cuenta}</td>
                </tr>
              ))}
          </tbody>
        </table>
      );
    }
    case "textarea":
      return <p className="whitespace-pre-wrap">{String(v)}</p>;
    default:
      return <span className="font-semibold">{String(v)}</span>;
  }
}

export function FichaClub({ sesion }: { sesion: Sesion }) {
  const { clubId } = useParams();
  const [sp] = useSearchParams();
  const t = sp.get("temporada");
  const { datos: f, error, cargando, recargar } = useDatos<Ficha>(`/admin/evaluaciones/${clubId}${t ? `?temporada=${t}` : ""}`);
  const [soloRespondidas, setSoloRespondidas] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "err"; t: string } | null>(null);

  if (cargando && !f) return <Cargando />;
  if (error) return <Aviso tipo="err">{error}</Aviso>;
  if (!f) return null;

  const visibles = new Map(f.modulosVisibles.map((m) => [m.id, new Set(m.preguntas)]));
  const mods = MODS.map((m, i) => ({ ...m, color: MODCOLOR[i], qs: m.qs.filter((q) => visibles.get(m.id)?.has(q.id)) })).filter((m) => visibles.has(m.id));

  async function reabrir() {
    if (!confirm(`¿Reabrir la evaluación de ${f!.club.nombre}? El club podrá volver a editarla y deberá enviarla de nuevo.`)) return;
    try {
      await api(`/admin/evaluaciones/${f!.evaluacionId}/reabrir`, { method: "POST" });
      setMsg({ tipo: "ok", t: "Evaluación reabierta. El club ya puede editarla." });
      recargar();
    } catch (e) {
      setMsg({ tipo: "err", t: mensajeDe(e) });
    }
  }

  return (
    <div>
      <Link to="/admin" className="mb-3 inline-block text-sm font-semibold text-acento hover:underline">
        ← Tablero de clubes
      </Link>
      <Titulo
        kicker={`Temporada ${f.temporada.nombre}`}
        acciones={
          f.estado === "enviada" && puede(sesion, "evaluacion.reabrir") ? (
            <Boton variante="s" onClick={reabrir}>
              Reabrir evaluación
            </Boton>
          ) : undefined
        }
      >
        <span className="flex items-center gap-3">
          <Iniciales nombre={f.club.nombre} logo={logoUrl(f.club.logo)} tam={48} />
          <b>{f.club.nombre}</b>
        </span>
      </Titulo>
      {msg && <Aviso tipo={msg.tipo}>{msg.t}</Aviso>}

      <Tarjeta className="mb-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {f.estado === "enviada" ? <Insignia color="ok">Enviada</Insignia> : <Insignia color="warn">En borrador</Insignia>}
          <span>
            <span className="text-muted">Avance:</span> <b>{f.avance.porcentaje ?? 0} %</b>
          </span>
          {f.enviadoEn && (
            <span>
              <span className="text-muted">Enviada:</span> {fechaHora(f.enviadoEn)} {f.enviadoPor && `por ${f.enviadoPor}`}
            </span>
          )}
          <span>
            <span className="text-muted">Última modificación:</span> {fechaHora(f.actualizadoEn)}
          </span>
          <label className="ml-auto flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-lila" checked={soloRespondidas} onChange={(e) => setSoloRespondidas(e.target.checked)} />
            Ocultar preguntas sin respuesta
          </label>
        </div>
        {f.historial.length > 0 && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-semibold text-acento">Historial ({f.historial.length})</summary>
            <ul className="mt-2 grid gap-1">
              {f.historial.map((h, i) => (
                <li key={i}>
                  {fechaHora(h.creado_en)} · {h.evento === "enviada" ? "Enviada" : "Reabierta"} {h.usuario && `por ${h.usuario}`}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Tarjeta>

      <nav className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Módulos">
        {mods.map((m) => (
          <a key={m.id} href={`#mod-${m.id}`} className="whitespace-nowrap rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold hover:border-lila" style={{ color: m.color }}>
            {m.titulo}
          </a>
        ))}
      </nav>

      <div className="grid gap-5">
        {mods.map((m) => {
          const a = f.avance.modulos?.[m.id];
          return (
            <Tarjeta key={m.id} className="scroll-mt-4">
              <div id={`mod-${m.id}`} className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-l-4 border-b-line pb-3 pl-3" style={{ borderLeftColor: m.color }}>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[1.6px]" style={{ color: m.color }}>
                    {m.tag}
                  </div>
                  <h2 className="text-xl font-bold">{m.titulo}</h2>
                </div>
                {a && (
                  <span className="text-sm text-muted">
                    {a.respondidas} de {a.total} respondidas
                  </span>
                )}
              </div>
              <dl className="grid gap-4">
                {m.qs
                  .filter((q) => !(q.if && vacio(f.respuestas[q.id])))
                  .filter((q) => !soloRespondidas || !vacio(f.respuestas[q.id]) || !vacio(f.respuestas[q.id + "_extras"]))
                  .map((q) => (
                    <div key={q.id} className="grid gap-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-6">
                      <dt>
                        <div className="font-medium">{q.t}</div>
                        <div className="mt-0.5 text-xs text-muted">{q.pl || m.pl}</div>
                      </dt>
                      <dd>
                        <Valor q={q} v={f.respuestas[q.id]} extras={f.respuestas[q.id + "_extras"]} />
                      </dd>
                    </div>
                  ))}
              </dl>
            </Tarjeta>
          );
        })}
      </div>
    </div>
  );
}
