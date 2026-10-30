import { useState } from "react";
import { Aviso, Boton, Cargando, claseInput, fechaHora, Tarjeta, Titulo, useDatos } from "../../ui";

type Fila = { id: number; usuario: string | null; accion: string; detalle: Record<string, unknown> | null; ip: string | null; navegador: string; creado_en: string };
type Datos = { filas: Fila[]; total: number; porPagina: number; acciones: string[] };

const NOMBRES: Record<string, string> = {
  login_ok: "Inicio de sesión",
  login_fallido: "Inicio de sesión fallido",
  login_bloqueado: "Intento con usuario bloqueado",
  usuario_bloqueado: "Usuario bloqueado por intentos",
  usuario_desbloqueado: "Usuario desbloqueado",
  logout: "Cierre de sesión",
  clave_cambiada: "Cambio de clave",
  clave_cambio_fallido: "Cambio de clave fallido",
  clave_restablecida: "Clave restablecida",
  usuario_creado: "Usuario creado",
  usuario_modificado: "Usuario modificado",
  sesiones_cerradas: "Sesiones cerradas",
  rol_creado: "Rol creado",
  rol_modificado: "Rol modificado",
  rol_borrado: "Rol borrado",
  temporada_creada: "Temporada creada",
  temporada_modificada: "Temporada modificada",
  club_creado: "Equipo creado",
  club_modificado: "Equipo modificado",
  club_logo: "Escudo actualizado",
  evaluacion_enviada: "Evaluación enviada",
  evaluacion_reabierta: "Evaluación reabierta",
  exportacion_excel: "Exportación a Excel",
};
const ALERTA = /fallido|bloque/;

export function Auditoria() {
  const [f, setF] = useState({ usuario: "", accion: "", desde: "", hasta: "" });
  const [aplicado, setAplicado] = useState(f);
  const [pagina, setPagina] = useState(1);
  const qs = new URLSearchParams(Object.entries({ ...aplicado, pagina: String(pagina) }).filter(([, v]) => v)).toString();
  const { datos, error, cargando } = useDatos<Datos>(`/configuracion/auditoria?${qs}`);
  const paginas = datos ? Math.max(1, Math.ceil(datos.total / datos.porPagina)) : 1;

  return (
    <div>
      <Titulo kicker="Configuración">
        <b>Auditoría</b> de seguridad
      </Titulo>
      <form
        className="mb-4 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPagina(1);
          setAplicado(f);
        }}
      >
        <input className={`${claseInput} max-w-[240px] !py-2`} placeholder="Usuario" value={f.usuario} onChange={(e) => setF({ ...f, usuario: e.target.value })} />
        <select className={`${claseInput} max-w-[240px] !py-2`} value={f.accion} onChange={(e) => setF({ ...f, accion: e.target.value })} aria-label="Acción">
          <option value="">Todas las acciones</option>
          {datos?.acciones.map((a) => (
            <option key={a} value={a}>
              {NOMBRES[a] || a}
            </option>
          ))}
        </select>
        <label className="text-sm">
          Desde
          <input type="date" className={`${claseInput} !py-2`} value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} />
        </label>
        <label className="text-sm">
          Hasta
          <input type="date" className={`${claseInput} !py-2`} value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} />
        </label>
        <Boton type="submit" chico className="min-h-11">
          Filtrar
        </Boton>
      </form>
      {error && <Aviso tipo="err">{error}</Aviso>}
      {cargando && !datos ? (
        <Cargando />
      ) : (
        <Tarjeta className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line bg-soft text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-3 py-3">Usuario</th>
                  <th className="px-3 py-3">Acción</th>
                  <th className="px-3 py-3">Detalle</th>
                  <th className="px-3 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {datos?.filas.map((a) => (
                  <tr key={a.id} className="border-b border-line align-top last:border-0">
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted">{fechaHora(a.creado_en)}</td>
                    <td className="px-3 py-2.5 break-all">{a.usuario || "—"}</td>
                    <td className={`px-3 py-2.5 font-semibold ${ALERTA.test(a.accion) ? "text-no" : ""}`}>{NOMBRES[a.accion] || a.accion}</td>
                    <td className="max-w-[320px] px-3 py-2.5 text-xs text-muted">
                      {a.detalle && (
                        <code className="break-words">
                          {Object.entries(a.detalle)
                            .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
                            .join(" · ")}
                        </code>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-muted" title={a.navegador}>
                      {a.ip || "—"}
                    </td>
                  </tr>
                ))}
                {datos?.filas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted">
                      Sin registros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Tarjeta>
      )}
      {datos && paginas > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-muted">
            {datos.total} registros · página {pagina} de {paginas}
          </span>
          <div className="flex gap-2">
            <Boton chico variante="s" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>
              Anterior
            </Boton>
            <Boton chico variante="s" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>
              Siguiente
            </Boton>
          </div>
        </div>
      )}
    </div>
  );
}
