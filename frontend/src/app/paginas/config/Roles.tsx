import { useState, type FormEvent } from "react";
import { api, puede, type Sesion } from "../../../api";
import { Aviso, Boton, Campo, Cargando, claseInput, Insignia, mensajeDe, Modal, Tarjeta, Titulo, useDatos } from "../../ui";

type Alcance = Record<string, "*" | string[]> | null;
type Rol = { id: number; codigo: string; nombre: string; descripcion: string | null; es_sistema: boolean; permisos: string[]; alcance: Alcance; usuarios: number };
type Datos = {
  roles: Rol[];
  permisos: { codigo: string; descripcion: string }[];
  modulos: { id: string; titulo: string; preguntas: { id: string; texto: string }[] }[];
};

function EditorRol({ rol, d, onCerrar, onListo }: { rol?: Rol; d: Datos; onCerrar: () => void; onListo: () => void }) {
  const [codigo, setCodigo] = useState(rol?.codigo || "");
  const [nombre, setNombre] = useState(rol?.nombre || "");
  const [descripcion, setDescripcion] = useState(rol?.descripcion || "");
  const [permisos, setPermisos] = useState<string[]>(rol?.permisos || ["tablero.ver", "respuestas.ver"]);
  const [todo, setTodo] = useState(!rol?.alcance);
  const [alcance, setAlcance] = useState<Record<string, "*" | string[]>>(rol?.alcance || {});
  const [error, setError] = useState("");
  const esSistema = rol?.es_sistema;
  const esClub = rol?.codigo === "club";

  const togglePermiso = (p: string) => setPermisos((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p]));
  const modoModulo = (m: string) => (!alcance[m] ? "nada" : alcance[m] === "*" ? "todo" : "algunas");
  const setModo = (m: string, modo: string) =>
    setAlcance((a) => {
      const n = { ...a };
      if (modo === "nada") delete n[m];
      else if (modo === "todo") n[m] = "*";
      else n[m] = Array.isArray(a[m]) ? a[m] : [];
      return n;
    });
  const togglePregunta = (m: string, q: string) =>
    setAlcance((a) => {
      const l = Array.isArray(a[m]) ? (a[m] as string[]) : [];
      return { ...a, [m]: l.includes(q) ? l.filter((x) => x !== q) : [...l, q] };
    });

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError("");
    const al = todo ? null : Object.fromEntries(Object.entries(alcance).filter(([, v]) => v === "*" || v.length));
    if (al && !Object.keys(al).length) return setError("Elija al menos un módulo o marque «Todo el formulario».");
    try {
      if (rol) await api(`/configuracion/roles/${rol.id}`, { method: "PUT", body: { nombre, descripcion, permisos, alcance: al } });
      else await api("/configuracion/roles", { body: { codigo, nombre, descripcion, permisos, alcance: al } });
      onListo();
    } catch (err) {
      setError(mensajeDe(err));
    }
  }

  return (
    <Modal titulo={rol ? `Rol: ${rol.nombre}` : "Nuevo rol"} onCerrar={onCerrar} ancho="max-w-3xl">
      <form onSubmit={guardar} className="grid gap-5">
        {error && <Aviso tipo="err">{error}</Aviso>}
        {rol && rol.usuarios > 0 && <Aviso tipo="info">Al guardar se cerrarán las sesiones de los {rol.usuarios} usuarios con este rol para aplicar los cambios.</Aviso>}
        <div className="grid gap-4 sm:grid-cols-2">
          {!rol && (
            <Campo etiqueta="Código" ayuda="Minúsculas y guion bajo, por ejemplo «prensa_regional». No se puede cambiar.">
              <input className={claseInput} value={codigo} onChange={(e) => setCodigo(e.target.value.toLowerCase())} required />
            </Campo>
          )}
          <Campo etiqueta="Nombre">
            <input className={claseInput} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </Campo>
          <Campo etiqueta="Descripción">
            <input className={claseInput} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </Campo>
        </div>

        <fieldset disabled={esSistema} className="disabled:opacity-70">
          <legend className="mb-2 font-head text-lg font-bold text-titulo">Permisos</legend>
          {esSistema && <p className="mb-2 text-sm text-muted">Los permisos de los roles del sistema no se pueden cambiar.</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {d.permisos
              .filter((p) => esClub || p.codigo !== "evaluacion.llenar")
              .map((p) => (
                <label key={p.codigo} className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-field p-3 has-[:checked]:border-lila has-[:checked]:bg-soft">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-lila" checked={permisos.includes(p.codigo)} onChange={() => togglePermiso(p.codigo)} />
                  <span>
                    <span className="block text-sm font-semibold">{p.descripcion}</span>
                    <code className="text-xs text-muted">{p.codigo}</code>
                  </span>
                </label>
              ))}
          </div>
        </fieldset>

        {!esClub && rol?.codigo !== "admin" && (
          <fieldset>
            <legend className="mb-2 font-head text-lg font-bold text-titulo">Alcance: qué preguntas ve</legend>
            <label className="mb-3 flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-lila" checked={todo} onChange={(e) => setTodo(e.target.checked)} />
              Todo el formulario
            </label>
            {!todo && (
              <div className="grid gap-3">
                {d.modulos.map((m) => (
                  <div key={m.id} className="rounded-xl border border-line p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <b>{m.titulo}</b>
                      <select className="rounded-lg border border-line bg-field px-2 py-1 text-sm" value={modoModulo(m.id)} onChange={(e) => setModo(m.id, e.target.value)}>
                        <option value="nada">No lo ve</option>
                        <option value="todo">Todo el módulo</option>
                        <option value="algunas">Algunas preguntas</option>
                      </select>
                    </div>
                    {modoModulo(m.id) === "algunas" && (
                      <div className="mt-2 grid max-h-64 gap-1 overflow-y-auto pr-1">
                        {m.preguntas.map((q) => (
                          <label key={q.id} className="flex items-start gap-2 text-sm">
                            <input type="checkbox" className="mt-0.5 h-4 w-4 flex-none accent-lila" checked={(alcance[m.id] as string[]).includes(q.id)} onChange={() => togglePregunta(m.id, q.id)} />
                            {q.texto}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </fieldset>
        )}
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

export function Roles({ sesion }: { sesion: Sesion }) {
  const { datos: d, error, cargando, recargar } = useDatos<Datos>("/configuracion/roles");
  const [editar, setEditar] = useState<Rol | "nuevo" | null>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "err"; t: string } | null>(null);
  const editable = puede(sesion, "roles.gestionar");

  async function borrar(r: Rol) {
    if (!confirm(`¿Borrar el rol «${r.nombre}»?`)) return;
    try {
      await api(`/configuracion/roles/${r.id}`, { method: "DELETE" });
      setMsg({ tipo: "ok", t: "Rol borrado." });
      recargar();
    } catch (e) {
      setMsg({ tipo: "err", t: mensajeDe(e) });
    }
  }

  if (cargando && !d) return <Cargando />;
  if (error) return <Aviso tipo="err">{error}</Aviso>;
  if (!d) return null;
  const permisoTxt = Object.fromEntries(d.permisos.map((p) => [p.codigo, p.descripcion]));
  const modTxt = Object.fromEntries(d.modulos.map((m) => [m.id, m.titulo]));

  return (
    <div>
      <Titulo kicker="Configuración" acciones={editable && <Boton onClick={() => setEditar("nuevo")}>+ Nuevo rol</Boton>}>
        Roles y <b>permisos</b>
      </Titulo>
      {msg && <Aviso tipo={msg.tipo}>{msg.t}</Aviso>}
      <p className="mb-4 max-w-3xl text-muted">
        Cada usuario tiene un rol. El rol define qué puede hacer (permisos) y qué preguntas del formulario puede ver (alcance). Los permisos se verifican siempre en el servidor.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {d.roles.map((r) => (
          <Tarjeta key={r.id}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-titulo">{r.nombre}</h2>
                <div className="text-xs text-muted">
                  <code>{r.codigo}</code> · {r.usuarios} usuario{r.usuarios === 1 ? "" : "s"}
                </div>
              </div>
              {r.es_sistema && <Insignia color="fucsia">Sistema</Insignia>}
            </div>
            {r.descripcion && <p className="mb-3 text-sm text-muted">{r.descripcion}</p>}
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Permisos</div>
            <ul className="mb-3 grid gap-0.5 text-sm">
              {r.permisos.map((p) => (
                <li key={p}>✓ {permisoTxt[p] || p}</li>
              ))}
              {!r.permisos.length && <li className="text-muted">Ninguno</li>}
            </ul>
            {r.codigo !== "club" && (
              <>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Alcance</div>
                <div className="mb-3 text-sm">
                  {!r.alcance
                    ? "Todo el formulario"
                    : Object.entries(r.alcance).map(([m, qs]) => (
                        <span key={m} className="mr-1.5 mb-1.5 inline-block rounded-full border border-line bg-soft px-2.5 py-0.5">
                          {modTxt[m]}
                          {qs === "*" ? "" : ` (${qs.length} preguntas)`}
                        </span>
                      ))}
                </div>
              </>
            )}
            {editable && (
              <div className="flex gap-2">
                <Boton chico variante="s" onClick={() => setEditar(r)}>
                  Editar
                </Boton>
                {!r.es_sistema && (
                  <Boton chico variante="peligro" onClick={() => borrar(r)}>
                    Borrar
                  </Boton>
                )}
              </div>
            )}
          </Tarjeta>
        ))}
      </div>
      {editar && (
        <EditorRol
          rol={editar === "nuevo" ? undefined : editar}
          d={d}
          onCerrar={() => setEditar(null)}
          onListo={() => {
            setEditar(null);
            setMsg({ tipo: "ok", t: "Rol guardado." });
            recargar();
          }}
        />
      )}
    </div>
  );
}
