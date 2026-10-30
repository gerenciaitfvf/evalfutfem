import { useState } from "react";
import { Link } from "react-router-dom";
import { descargar, logoUrl, puede, type Sesion } from "../../api";
import { Aviso, Boton, Cargando, fechaCorta, fechaHora, Iniciales, Insignia, mensajeDe, Tarjeta, Titulo, useDatos } from "../ui";

type Avance = { modulos: Record<string, { respondidas: number; total: number }>; respondidas: number; total: number; porcentaje: number };
type Fila = {
  clubId: number;
  nombre: string;
  region: string | null;
  logo: string | null;
  estado: "enviada" | "borrador" | "sin_empezar";
  avance: Avance | null;
  enviadoEn: string | null;
  actualizadoEn: string | null;
  usuarios: number;
  ultimoAcceso: string | null;
};
type Datos = { temporada: { id: number; nombre: string; estado: string; cierraEn: string | null }; modulos: { id: string; titulo: string }[]; clubes: Fila[] };

const MODCOLOR: Record<string, string> = { club: "var(--color-m0)", deportivo: "var(--color-m1)", base: "var(--color-m2)", comercial: "var(--color-m3)", marca: "var(--color-m4)", prensa: "var(--color-m5)" };
const ESTADO = {
  enviada: <Insignia color="ok">Enviada</Insignia>,
  borrador: <Insignia color="warn">En borrador</Insignia>,
  sin_empezar: <Insignia color="gris">Sin empezar</Insignia>,
};

/* Anillo de avance, como los pasos del formulario */
function Anillo({ pct, color = "var(--color-fucsia)", tam = 44 }: { pct: number; color?: string; tam?: number }) {
  const C = 2 * Math.PI * 19;
  return (
    <svg viewBox="0 0 46 46" width={tam} height={tam} className="-rotate-90" aria-hidden="true">
      <circle cx="23" cy="23" r="19" fill="none" stroke="var(--color-line)" strokeWidth="4" />
      <circle cx="23" cy="23" r="19" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} />
    </svg>
  );
}

export function Tablero({ sesion }: { sesion: Sesion }) {
  const [temporada, setTemporada] = useState<string>("");
  const temporadas = useDatos<{ id: number; nombre: string; estado: string }[]>("/admin/temporadas");
  const { datos, error, cargando } = useDatos<Datos>("/admin/tablero" + (temporada ? `?temporada=${temporada}` : ""));
  const [errExp, setErrExp] = useState("");
  const [exportando, setExportando] = useState(false);

  if (cargando && !datos) return <Cargando />;
  if (error) return <Aviso tipo="err">{error}</Aviso>;
  if (!datos) return null;
  const { clubes, modulos, temporada: t } = datos;
  const n = (e: Fila["estado"]) => clubes.filter((c) => c.estado === e).length;
  const prom = clubes.length ? Math.round(clubes.reduce((a, c) => a + (c.avance?.porcentaje || 0), 0) / clubes.length) : 0;
  const diasRestantes = t.cierraEn ? Math.ceil((new Date(t.cierraEn).getTime() - Date.now()) / 86_400_000) : null;

  async function exportar() {
    setErrExp("");
    setExportando(true);
    try {
      await descargar(`/admin/exportar?temporada=${t.id}`, `Evaluacion clubes ${t.nombre}.xlsx`);
    } catch (e) {
      setErrExp(mensajeDe(e));
    } finally {
      setExportando(false);
    }
  }

  return (
    <div>
      <Titulo
        kicker={`Temporada ${t.nombre} · ${t.estado === "abierta" ? "abierta" : t.estado}`}
        acciones={
          <>
            {(temporadas.datos?.length || 0) > 1 && (
              <select aria-label="Temporada" className="rounded-xl border-[1.5px] border-line bg-card px-3 py-2" value={temporada || t.id} onChange={(e) => setTemporada(e.target.value)}>
                {temporadas.datos!.map((x) => (
                  <option key={x.id} value={x.id}>
                    Temporada {x.nombre}
                  </option>
                ))}
              </select>
            )}
            {puede(sesion, "respuestas.exportar") && (
              <Boton variante="o" onClick={exportar} disabled={exportando}>
                {exportando ? "Generando…" : "Exportar a Excel"}
              </Boton>
            )}
          </>
        }
      >
        Tablero de <b>clubes</b>
      </Titulo>
      {errExp && <Aviso tipo="err">{errExp}</Aviso>}
      {sesion.rol.codigo !== "admin" && sesion.rol.codigo !== "general" && (
        <Aviso tipo="info">Su rol ({sesion.rol.nombre}) ve y exporta solo las preguntas de su área.</Aviso>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { t: "Enviadas", v: `${n("enviada")} de ${clubes.length}`, c: "text-ok" },
          { t: "En borrador", v: n("borrador"), c: "text-warn" },
          { t: "Sin empezar", v: n("sin_empezar"), c: "text-muted" },
          { t: diasRestantes != null && diasRestantes >= 0 ? `Plazo · ${fechaCorta(t.cierraEn)}` : "Avance promedio", v: diasRestantes != null && diasRestantes >= 0 ? `${diasRestantes} días` : `${prom} %`, c: "text-acento" },
        ].map((k) => (
          <div key={k.t} className="rounded-[18px] border border-line bg-card px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[1.6px] text-muted">{k.t}</div>
            <div className={`font-head text-[28px] font-extrabold ${k.c}`}>{k.v}</div>
          </div>
        ))}
      </div>

      <Tarjeta className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line bg-soft text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3">Club</th>
                <th className="px-2 py-3">Estado</th>
                <th className="px-2 py-3">Avance</th>
                {modulos.map((m) => (
                  <th key={m.id} className="px-1 py-3 text-center font-semibold normal-case tracking-normal" title={m.titulo}>
                    <span className="mx-auto block max-w-[80px] text-[11px] leading-tight">{m.titulo}</span>
                  </th>
                ))}
                <th className="px-3 py-3">Último movimiento</th>
              </tr>
            </thead>
            <tbody>
              {clubes.map((c) => (
                <tr key={c.clubId} className="border-b border-line last:border-0 hover:bg-field">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Iniciales nombre={c.nombre} logo={logoUrl(c.logo)} />
                      <div className="min-w-0">
                        {puede(sesion, "respuestas.ver") ? (
                          <Link to={`/admin/clubes/${c.clubId}?temporada=${t.id}`} className="font-semibold text-ink hover:text-acento hover:underline">
                            {c.nombre}
                          </Link>
                        ) : (
                          <span className="font-semibold">{c.nombre}</span>
                        )}
                        <div className="text-xs text-muted">{c.usuarios ? `Último acceso: ${fechaHora(c.ultimoAcceso)}` : <span className="text-no">Sin usuario</span>}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3">{ESTADO[c.estado]}</td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <Anillo pct={c.avance?.porcentaje || 0} tam={36} />
                      <b className="whitespace-nowrap font-head">{c.avance?.porcentaje || 0} %</b>
                    </div>
                  </td>
                  {modulos.map((m) => {
                    const a = c.avance?.modulos[m.id];
                    const pct = a ? Math.round((a.respondidas / a.total) * 100) : 0;
                    return (
                      <td key={m.id} className="px-1 py-3 text-center" title={a ? `${a.respondidas} de ${a.total} respondidas` : "Sin respuestas"}>
                        <div className="relative mx-auto h-9 w-9">
                          <Anillo pct={pct} color={MODCOLOR[m.id]} tam={36} />
                          <span className="absolute inset-0 grid place-items-center text-[10px] font-bold text-muted">{pct === 100 ? "✓" : pct}</span>
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-xs text-muted">{c.enviadoEn ? `Enviada ${fechaHora(c.enviadoEn)}` : c.actualizadoEn ? `Guardada ${fechaHora(c.actualizadoEn)}` : "—"}</td>
                </tr>
              ))}
              {clubes.length === 0 && (
                <tr>
                  <td colSpan={4 + modulos.length} className="px-4 py-10 text-center text-muted">
                    No hay clubes en esta temporada. Agréguelos en Configuración › Temporadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </div>
  );
}
