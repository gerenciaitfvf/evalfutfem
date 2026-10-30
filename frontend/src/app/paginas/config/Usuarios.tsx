import { useMemo, useState, type FormEvent } from "react";
import { api, type Sesion } from "../../../api";
import { Aviso, Boton, Campo, Cargando, claseInput, ClaveTemporal, fechaHora, Insignia, mensajeDe, Modal, Tarjeta, Titulo, useDatos } from "../../ui";

type Usuario = {
  id: number;
  usuario: string;
  nombre: string;
  activo: boolean;
  bloqueado: boolean;
  debe_cambiar_clave: boolean;
  ultimo_acceso: string | null;
  rol_id: number;
  rol_codigo: string;
  rol: string;
  club_id: number | null;
  club: string | null;
  sesiones: number;
};
type Rol = { id: number; codigo: string; nombre: string };
type Club = { id: number; nombre: string; activo: boolean };

function FormUsuario({ u, roles, clubes, onListo, onCerrar }: { u?: Usuario; roles: Rol[]; clubes: Club[]; onListo: (clave?: { usuario: string; clave: string }) => void; onCerrar: () => void }) {
  const [usuario, setUsuario] = useState(u?.usuario || "");
  const [nombre, setNombre] = useState(u?.nombre || "");
  const [rolId, setRolId] = useState<number>(u?.rol_id || roles.find((r) => r.codigo === "club")?.id || roles[0]?.id);
  const [clubId, setClubId] = useState<number | null>(u?.club_id ?? null);
  const [error, setError] = useState("");
  const esClub = roles.find((r) => r.id === rolId)?.codigo === "club";

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (u) {
        await api(`/configuracion/usuarios/${u.id}`, { method: "PATCH", body: { nombre, rolId, clubId: esClub ? clubId : null } });
        onListo();
      } else {
        const r = await api<{ claveTemporal: string }>("/configuracion/usuarios", { body: { usuario, nombre, rolId, clubId: esClub ? clubId : null } });
        onListo({ usuario, clave: r.claveTemporal });
      }
    } catch (err) {
      setError(mensajeDe(err));
    }
  }

  return (
    <Modal titulo={u ? `Editar ${u.usuario}` : "Nuevo usuario"} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="grid gap-4">
        {error && <Aviso tipo="err">{error}</Aviso>}
        <Campo etiqueta="Rol">
          <select className={claseInput} value={rolId} onChange={(e) => setRolId(Number(e.target.value))}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </Campo>
        {esClub && (
          <Campo etiqueta="Club">
            <select className={claseInput} value={clubId ?? ""} onChange={(e) => setClubId(e.target.value ? Number(e.target.value) : null)} required>
              <option value="">Seleccione…</option>
              {clubes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                  {c.activo ? "" : " (inactivo)"}
                </option>
              ))}
            </select>
          </Campo>
        )}
        {!u && (
          <Campo etiqueta="Usuario" ayuda={esClub ? "Nombre corto en minúsculas, por ejemplo «caracasfc»." : "Correo institucional, por ejemplo nombre.apellido@fvf.com.ve."}>
            <input className={claseInput} value={usuario} onChange={(e) => setUsuario(e.target.value.toLowerCase().trim())} autoCapitalize="none" spellCheck={false} required />
          </Campo>
        )}
        <Campo etiqueta="Nombre" ayuda={esClub ? "Nombre del club o de la persona responsable." : undefined}>
          <input className={claseInput} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </Campo>
        {!u && <p className="text-sm text-muted">Al crearlo se genera una clave temporal que verá una sola vez. El usuario deberá cambiarla en su primer ingreso.</p>}
        <div className="flex gap-2">
          <Boton variante="s" className="flex-1" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" className="flex-1">
            {u ? "Guardar" : "Crear usuario"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}

export function Usuarios({ sesion }: { sesion: Sesion }) {
  const lista = useDatos<Usuario[]>("/configuracion/usuarios");
  const roles = useDatos<{ roles: Rol[] }>("/configuracion/roles");
  const clubes = useDatos<Club[]>("/configuracion/clubes/lista");
  const [filtro, setFiltro] = useState("");
  const [rolF, setRolF] = useState("");
  const [editar, setEditar] = useState<Usuario | "nuevo" | null>(null);
  const [clave, setClave] = useState<{ usuario: string; clave: string } | null>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "err"; t: string } | null>(null);

  const filas = useMemo(
    () =>
      (lista.datos || []).filter(
        (u) => (!rolF || u.rol_codigo === rolF) && (!filtro || `${u.usuario} ${u.nombre} ${u.club || ""}`.toLowerCase().includes(filtro.toLowerCase()))
      ),
    [lista.datos, filtro, rolF]
  );

  async function accion(u: Usuario, tipo: "restablecer" | "desbloquear" | "sesiones" | "activar" | "desactivar") {
    const preguntas = {
      restablecer: `¿Restablecer la clave de ${u.usuario}? Se generará una clave temporal y se cerrarán sus sesiones.`,
      desactivar: `¿Desactivar a ${u.usuario}? No podrá entrar y se cerrarán sus sesiones.`,
      sesiones: `¿Cerrar todas las sesiones de ${u.usuario}?`,
    } as Record<string, string>;
    if (preguntas[tipo] && !confirm(preguntas[tipo])) return;
    setMsg(null);
    try {
      if (tipo === "restablecer") {
        const r = await api<{ claveTemporal: string }>(`/configuracion/usuarios/${u.id}/restablecer-clave`, { method: "POST" });
        setClave({ usuario: u.usuario, clave: r.claveTemporal });
      } else if (tipo === "desbloquear") {
        await api(`/configuracion/usuarios/${u.id}/desbloquear`, { method: "POST" });
        setMsg({ tipo: "ok", t: `${u.usuario} desbloqueado.` });
      } else if (tipo === "sesiones") {
        const r = await api<{ cerradas: number }>(`/configuracion/usuarios/${u.id}/cerrar-sesiones`, { method: "POST" });
        setMsg({ tipo: "ok", t: `Se cerraron ${r.cerradas} sesiones de ${u.usuario}.` });
      } else {
        await api(`/configuracion/usuarios/${u.id}`, { method: "PATCH", body: { activo: tipo === "activar" } });
        setMsg({ tipo: "ok", t: `${u.usuario} ${tipo === "activar" ? "activado" : "desactivado"}.` });
      }
      lista.recargar();
    } catch (e) {
      setMsg({ tipo: "err", t: mensajeDe(e) });
    }
  }

  if (lista.cargando && !lista.datos) return <Cargando />;
  return (
    <div>
      <Titulo kicker="Configuración" acciones={<Boton onClick={() => setEditar("nuevo")}>+ Nuevo usuario</Boton>}>
        <b>Usuarios</b>
      </Titulo>
      {lista.error && <Aviso tipo="err">{lista.error}</Aviso>}
      {msg && <Aviso tipo={msg.tipo}>{msg.t}</Aviso>}
      <div className="mb-4 flex flex-wrap gap-2">
        <input className={`${claseInput} max-w-xs !py-2`} placeholder="Buscar por usuario, nombre o club" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        <select className={`${claseInput} max-w-[220px] !py-2`} value={rolF} onChange={(e) => setRolF(e.target.value)} aria-label="Filtrar por rol">
          <option value="">Todos los roles</option>
          {roles.datos?.roles.map((r) => (
            <option key={r.id} value={r.codigo}>
              {r.nombre}
            </option>
          ))}
        </select>
      </div>
      <Tarjeta className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-line bg-soft text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3">Usuario</th>
                <th className="px-3 py-3">Rol</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Último acceso</th>
                <th className="px-3 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((u) => (
                <tr key={u.id} className={`border-b border-line last:border-0 ${u.activo ? "" : "opacity-60"}`}>
                  <td className="px-4 py-3">
                    <div className="font-semibold break-all">{u.usuario}</div>
                    <div className="text-xs text-muted">
                      {u.nombre}
                      {u.club && u.club !== u.nombre ? ` · ${u.club}` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-3">{u.rol}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.activo ? <Insignia color="ok">Activo</Insignia> : <Insignia color="gris">Inactivo</Insignia>}
                      {u.bloqueado && <Insignia color="no">Bloqueado</Insignia>}
                      {u.debe_cambiar_clave && <Insignia color="warn">Clave temporal</Insignia>}
                      {u.sesiones > 0 && <Insignia color="lila">{u.sesiones} sesión{u.sesiones > 1 ? "es" : ""}</Insignia>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted">{fechaHora(u.ultimo_acceso)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Boton chico variante="s" onClick={() => setEditar(u)}>
                        Editar
                      </Boton>
                      <Boton chico variante="s" onClick={() => accion(u, "restablecer")}>
                        Restablecer clave
                      </Boton>
                      {u.bloqueado && (
                        <Boton chico variante="s" onClick={() => accion(u, "desbloquear")}>
                          Desbloquear
                        </Boton>
                      )}
                      {u.sesiones > 0 && (
                        <Boton chico variante="s" onClick={() => accion(u, "sesiones")}>
                          Cerrar sesiones
                        </Boton>
                      )}
                      {u.id !== sesion.id &&
                        (u.activo ? (
                          <Boton chico variante="peligro" onClick={() => accion(u, "desactivar")}>
                            Desactivar
                          </Boton>
                        ) : (
                          <Boton chico variante="s" onClick={() => accion(u, "activar")}>
                            Activar
                          </Boton>
                        ))}
                    </div>
                  </td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    No hay usuarios con ese filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      {editar && roles.datos && clubes.datos && (
        <FormUsuario
          u={editar === "nuevo" ? undefined : editar}
          roles={roles.datos.roles}
          clubes={clubes.datos}
          onCerrar={() => setEditar(null)}
          onListo={(c) => {
            setEditar(null);
            if (c) setClave(c);
            else setMsg({ tipo: "ok", t: "Usuario actualizado." });
            lista.recargar();
          }}
        />
      )}
      {clave && <ClaveTemporal usuario={clave.usuario} clave={clave.clave} onCerrar={() => setClave(null)} />}
    </div>
  );
}
