import { useState, type FormEvent } from "react";
import { api, logoUrl } from "../../../api";
import { Aviso, Boton, Campo, Cargando, claseInput, Iniciales, Insignia, mensajeDe, Modal, Tarjeta, Titulo, useDatos } from "../../ui";

type Club = { id: number; nombre: string; valor_formulario: string; estado: string | null; ciudad: string | null; correo: string | null; activo: boolean; logo: string | null; usuarios: number; evaluaciones: number };

const ESTADOS_VE = ["Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar", "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital", "Falcón", "Guárico", "La Guaira", "Lara", "Mérida", "Miranda", "Monagas", "Nueva Esparta", "Portuguesa", "Sucre", "Táchira", "Trujillo", "Yaracuy", "Zulia"];

function Editor({ c, onCerrar, onListo }: { c?: Club; onCerrar: () => void; onListo: () => void }) {
  const [nombre, setNombre] = useState(c?.nombre || "");
  const [valor, setValor] = useState(c?.valor_formulario || "");
  const [estado, setEstado] = useState(c?.estado || "");
  const [ciudad, setCiudad] = useState(c?.ciudad || "");
  const [correo, setCorreo] = useState(c?.correo || "");
  const [activo, setActivo] = useState(c?.activo ?? true);
  const [logo, setLogo] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (logo && logo.size > 1024 * 1024) return setError("El logo supera 1 MB.");
    setGuardando(true);
    try {
      const body = { nombre, valorFormulario: valor || nombre, estado: estado || null, ciudad: ciudad || null, correo: correo || null, activo };
      let id = c?.id;
      if (c) await api(`/configuracion/clubes/${c.id}`, { method: "PUT", body });
      else id = (await api<{ id: number }>("/configuracion/clubes", { body })).id;
      if (logo) {
        const fd = new FormData();
        fd.append("logo", logo);
        await api(`/configuracion/clubes/${id}/logo`, { method: "PUT", form: fd });
      }
      onListo();
    } catch (err) {
      setError(mensajeDe(err));
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={c ? c.nombre : "Nuevo equipo"} onCerrar={onCerrar} ancho="max-w-2xl">
      <form onSubmit={guardar} className="grid gap-4">
        {error && <Aviso tipo="err">{error}</Aviso>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre">
            <input className={claseInput} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </Campo>
          <Campo etiqueta="Nombre en el formulario" ayuda="Texto que se guarda en la respuesta «club». Si lo deja vacío se usa el nombre.">
            <input className={claseInput} value={valor} onChange={(e) => setValor(e.target.value)} />
          </Campo>
          <Campo etiqueta="Estado (sede)" ayuda="Marca la sede en el mapa del formulario.">
            <select className={claseInput} value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">—</option>
              {ESTADOS_VE.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Ciudad">
            <input className={claseInput} value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
          </Campo>
          <Campo etiqueta="Correo institucional">
            <input type="email" className={claseInput} value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </Campo>
          <Campo etiqueta="Escudo" ayuda="PNG, JPG o WebP de hasta 1 MB, idealmente con fondo transparente.">
            <div className="flex items-center gap-3">
              <Iniciales nombre={nombre || "?"} logo={logo ? URL.createObjectURL(logo) : logoUrl(c?.logo)} tam={44} />
              <input type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" onChange={(e) => setLogo(e.target.files?.[0] || null)} />
            </div>
          </Campo>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-lila" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          Activo (si lo desactiva, sus usuarios no podrán entrar)
        </label>
        <div className="flex gap-2">
          <Boton variante="s" className="flex-1" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" className="flex-1" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}

export function Equipos() {
  const { datos, error, cargando, recargar } = useDatos<Club[]>("/configuracion/clubes");
  const [editar, setEditar] = useState<Club | "nuevo" | null>(null);
  const [ok, setOk] = useState("");
  if (cargando && !datos) return <Cargando />;
  return (
    <div>
      <Titulo kicker="Configuración" acciones={<Boton onClick={() => setEditar("nuevo")}>+ Nuevo equipo</Boton>}>
        <b>Equipos</b>
      </Titulo>
      {error && <Aviso tipo="err">{error}</Aviso>}
      {ok && <Aviso>{ok}</Aviso>}
      <p className="mb-4 max-w-3xl text-muted">Un club con evaluaciones no se borra: se desactiva. Para que responda en una temporada, agréguelo en Temporadas y créele un usuario en Usuarios.</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {datos?.map((c) => (
          <Tarjeta key={c.id} className={c.activo ? "" : "opacity-60"}>
            <div className="flex items-start gap-3">
              <Iniciales nombre={c.nombre} logo={logoUrl(c.logo)} tam={52} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="truncate text-lg font-bold">{c.nombre}</h2>
                  {!c.activo && <Insignia color="gris">Inactivo</Insignia>}
                </div>
                <div className="text-sm text-muted">{[c.ciudad, c.estado].filter(Boolean).join(", ") || "Sin sede"}</div>
                <div className="mt-1 text-xs text-muted">
                  {c.usuarios} usuario{c.usuarios === 1 ? "" : "s"} · {c.evaluaciones} evaluación{c.evaluaciones === 1 ? "" : "es"}
                </div>
              </div>
            </div>
            <Boton chico variante="s" className="mt-3" onClick={() => setEditar(c)}>
              Editar
            </Boton>
          </Tarjeta>
        ))}
      </div>
      {editar && (
        <Editor
          c={editar === "nuevo" ? undefined : editar}
          onCerrar={() => setEditar(null)}
          onListo={() => {
            setEditar(null);
            setOk("Equipo guardado.");
            recargar();
          }}
        />
      )}
    </div>
  );
}
