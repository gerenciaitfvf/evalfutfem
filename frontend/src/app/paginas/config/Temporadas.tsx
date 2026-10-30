import { useState, type FormEvent } from "react";
import { api } from "../../../api";
import { Aviso, Boton, Campo, Cargando, claseInput, fechaHora, Insignia, mensajeDe, Modal, Tarjeta, Titulo, useDatos } from "../../ui";

type Temporada = { id: number; nombre: string; version_formulario: string; abre_en: string | null; cierra_en: string | null; estado: "borrador" | "abierta" | "cerrada"; clubes: number[]; enviadas: number };
type Club = { id: number; nombre: string; activo: boolean };

/* Venezuela usa UTC−4 todo el año: las fechas se editan en hora de Caracas */
const aLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - 4 * 3600_000).toISOString().slice(0, 16) : "");
const aIso = (local: string) => (local ? `${local}:00-04:00` : null);

const ESTADOS = { borrador: <Insignia color="gris">Borrador</Insignia>, abierta: <Insignia color="ok">Abierta</Insignia>, cerrada: <Insignia color="no">Cerrada</Insignia> };

function Editor({ t, clubes, onCerrar, onListo }: { t?: Temporada; clubes: Club[]; onCerrar: () => void; onListo: () => void }) {
  const [nombre, setNombre] = useState(t?.nombre || "");
  const [version, setVersion] = useState(t?.version_formulario || "6");
  const [abre, setAbre] = useState(aLocal(t?.abre_en ?? null));
  const [cierra, setCierra] = useState(aLocal(t?.cierra_en ?? null));
  const [estado, setEstado] = useState<Temporada["estado"]>(t?.estado || "borrador");
  const [sel, setSel] = useState<number[]>(t?.clubes || clubes.filter((c) => c.activo).map((c) => c.id));
  const [error, setError] = useState("");

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError("");
    const body = { nombre, versionFormulario: version, abreEn: aIso(abre), cierraEn: aIso(cierra), estado, clubes: sel };
    try {
      if (t) await api(`/configuracion/temporadas/${t.id}`, { method: "PUT", body });
      else await api("/configuracion/temporadas", { body });
      onListo();
    } catch (err) {
      setError(mensajeDe(err));
    }
  }

  return (
    <Modal titulo={t ? `Temporada ${t.nombre}` : "Nueva temporada"} onCerrar={onCerrar} ancho="max-w-2xl">
      <form onSubmit={guardar} className="grid gap-4">
        {error && <Aviso tipo="err">{error}</Aviso>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre">
            <input className={claseInput} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="2028" required />
          </Campo>
          <Campo etiqueta="Versión del formulario">
            <input className={claseInput} value={version} onChange={(e) => setVersion(e.target.value)} required />
          </Campo>
          <Campo etiqueta="Abre (hora de Venezuela)">
            <input type="datetime-local" className={claseInput} value={abre} onChange={(e) => setAbre(e.target.value)} />
          </Campo>
          <Campo etiqueta="Fecha límite (hora de Venezuela)">
            <input type="datetime-local" className={claseInput} value={cierra} onChange={(e) => setCierra(e.target.value)} />
          </Campo>
        </div>
        <Campo etiqueta="Estado" ayuda="Solo puede haber una temporada abierta. Al cerrarla, los clubes ya no pueden editar, pero siguen viendo sus respuestas.">
          <select className={claseInput} value={estado} onChange={(e) => setEstado(e.target.value as Temporada["estado"])}>
            <option value="borrador">Borrador (los clubes no la ven)</option>
            <option value="abierta">Abierta (los clubes pueden responder)</option>
            <option value="cerrada">Cerrada</option>
          </select>
        </Campo>
        <fieldset>
          <legend className="mb-2 font-semibold">Clubes participantes ({sel.length})</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {clubes.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-field px-3 py-2 has-[:checked]:border-lila has-[:checked]:bg-soft">
                <input type="checkbox" className="h-4 w-4 accent-lila" checked={sel.includes(c.id)} onChange={() => setSel((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]))} />
                {c.nombre}
                {!c.activo && <span className="text-xs text-muted">(inactivo)</span>}
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">Al agregar un club se le crea su evaluación vacía. No se puede quitar un club que ya respondió.</p>
        </fieldset>
        <div className="flex gap-2">
          <Boton variante="s" className="flex-1" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" className="flex-1">
            Guardar
          </Boton>
        </div>
      </form>
    </Modal>
  );
}

export function Temporadas() {
  const { datos, error, cargando, recargar } = useDatos<Temporada[]>("/configuracion/temporadas");
  const clubes = useDatos<Club[]>("/configuracion/clubes/lista");
  const [editar, setEditar] = useState<Temporada | "nueva" | null>(null);
  const [ok, setOk] = useState("");

  if (cargando && !datos) return <Cargando />;
  return (
    <div>
      <Titulo kicker="Configuración" acciones={<Boton onClick={() => setEditar("nueva")}>+ Nueva temporada</Boton>}>
        <b>Temporadas</b>
      </Titulo>
      {error && <Aviso tipo="err">{error}</Aviso>}
      {ok && <Aviso>{ok}</Aviso>}
      <div className="grid gap-4 md:grid-cols-2">
        {datos?.map((t) => (
          <Tarjeta key={t.id}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-2xl font-extrabold text-acento">{t.nombre}</h2>
              {ESTADOS[t.estado]}
            </div>
            <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted">Abre</dt>
              <dd>{fechaHora(t.abre_en)}</dd>
              <dt className="text-muted">Fecha límite</dt>
              <dd>{fechaHora(t.cierra_en)}</dd>
              <dt className="text-muted">Clubes</dt>
              <dd>
                {t.clubes.length} · {t.enviadas} enviadas
              </dd>
              <dt className="text-muted">Formulario</dt>
              <dd>versión {t.version_formulario}</dd>
            </dl>
            <Boton chico variante="s" onClick={() => setEditar(t)}>
              Editar
            </Boton>
          </Tarjeta>
        ))}
      </div>
      {editar && clubes.datos && (
        <Editor
          t={editar === "nueva" ? undefined : editar}
          clubes={clubes.datos}
          onCerrar={() => setEditar(null)}
          onListo={() => {
            setEditar(null);
            setOk("Temporada guardada.");
            recargar();
          }}
        />
      )}
    </div>
  );
}
