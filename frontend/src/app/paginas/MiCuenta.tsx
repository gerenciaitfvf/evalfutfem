import { useState, type FormEvent } from "react";
import { api, type Sesion } from "../../api";
import { Aviso, Boton, Campo, claseInput, fechaHora, mensajeDe, Tarjeta, Titulo, useDatos } from "../ui";

/* Formulario de cambio de clave (Mi cuenta y primer ingreso) */
export function FormClave({ onListo }: { onListo?: () => void }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [conf, setConf] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [enviando, setEnviando] = useState(false);

  const largo = nueva.length >= 12;
  const coincide = !!nueva && nueva === conf;
  const distinta = !!nueva && nueva !== actual;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    setEnviando(true);
    try {
      const r = await api<{ sesionesCerradas: number }>("/cuenta/clave", { body: { actual, nueva, confirmacion: conf } });
      setActual("");
      setNueva("");
      setConf("");
      setOk(r.sesionesCerradas ? `Clave cambiada. Se cerraron ${r.sesionesCerradas} sesiones abiertas en otros equipos.` : "Clave cambiada.");
      onListo?.();
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setEnviando(false);
    }
  }

  const item = (cumple: boolean, t: string) => (
    <li className={cumple ? "text-ok" : "text-muted"}>
      <span aria-hidden="true">{cumple ? "✓" : "•"}</span> {t}
    </li>
  );

  return (
    <form onSubmit={guardar} className="grid gap-4" noValidate>
      {error && <Aviso tipo="err">{error}</Aviso>}
      {ok && <Aviso>{ok}</Aviso>}
      <Campo etiqueta="Clave actual">
        <input className={claseInput} type={ver ? "text" : "password"} autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} maxLength={256} required />
      </Campo>
      <Campo etiqueta="Clave nueva">
        <input className={claseInput} type={ver ? "text" : "password"} autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} maxLength={128} required />
      </Campo>
      <Campo etiqueta="Repita la clave nueva">
        <input className={claseInput} type={ver ? "text" : "password"} autoComplete="new-password" value={conf} onChange={(e) => setConf(e.target.value)} maxLength={128} required />
      </Campo>
      <ul className="grid gap-1 text-sm">
        {item(largo, "Al menos 12 caracteres. Sirve una frase fácil de recordar, por ejemplo «mi club juega los sábados».")}
        {item(coincide, "Las dos claves nuevas coinciden")}
        {item(distinta, "Es distinta de la actual")}
        <li className="text-muted">• No puede ser una clave común ni contener su usuario.</li>
      </ul>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} className="h-4 w-4 accent-lila" /> Mostrar las claves
      </label>
      <Boton type="submit" disabled={enviando || !actual || !largo || !coincide || !distinta}>
        {enviando ? "Guardando…" : "Cambiar clave"}
      </Boton>
    </form>
  );
}

const ACCIONES: Record<string, string> = {
  login_ok: "Inicio de sesión",
  login_fallido: "Intento fallido",
  login_bloqueado: "Intento con usuario bloqueado",
  usuario_bloqueado: "Usuario bloqueado por intentos",
  clave_cambiada: "Cambio de clave",
  clave_restablecida: "Clave restablecida por la FVF",
  logout: "Cierre de sesión",
};

type Cuenta = { usuario: string; nombre: string; rol: string; club: string | null; ultimo_acceso: string; clave_cambiada_en: string | null };
type Actividad = { accion: string; ip: string; navegador: string; creado_en: string }[];

export function MiCuenta({ sesion }: { sesion: Sesion }) {
  const cuenta = useDatos<Cuenta>("/cuenta");
  const act = useDatos<Actividad>("/cuenta/actividad");
  return (
    <div className="mx-auto max-w-4xl">
      <Titulo kicker="Mi cuenta">
        Hola, <b>{sesion.nombre}</b>
      </Titulo>
      <div className="grid gap-5 md:grid-cols-[1fr_1.1fr]">
        <div className="grid content-start gap-5">
          <Tarjeta>
            <h2 className="mb-3 text-lg font-bold text-titulo">Mis datos</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Usuario</dt>
              <dd className="font-semibold break-all">{sesion.usuario}</dd>
              <dt className="text-muted">Rol</dt>
              <dd className="font-semibold">{sesion.rol.nombre}</dd>
              {sesion.club && (
                <>
                  <dt className="text-muted">Club</dt>
                  <dd className="font-semibold">{sesion.club.nombre}</dd>
                </>
              )}
              <dt className="text-muted">Clave cambiada</dt>
              <dd>{fechaHora(cuenta.datos?.clave_cambiada_en)}</dd>
            </dl>
          </Tarjeta>
          <Tarjeta>
            <h2 className="mb-1 text-lg font-bold text-titulo">Actividad reciente</h2>
            <p className="mb-3 text-sm text-muted">Si ve un acceso que no reconoce, cambie su clave y avise a la FVF.</p>
            <ul className="grid gap-2 text-sm">
              {act.datos?.map((a, i) => (
                <li key={i} className="flex justify-between gap-3 border-t border-line pt-2 first:border-0 first:pt-0">
                  <span className={a.accion.includes("fallido") || a.accion.includes("bloque") ? "text-no" : ""}>{ACCIONES[a.accion] || a.accion}</span>
                  <span className="text-right text-muted">
                    {fechaHora(a.creado_en)}
                    <br />
                    <small>{a.ip}</small>
                  </span>
                </li>
              ))}
              {act.datos?.length === 0 && <li className="text-muted">Sin actividad registrada.</li>}
            </ul>
          </Tarjeta>
        </div>
        <Tarjeta className="content-start">
          <h2 className="mb-1 text-lg font-bold text-titulo">Cambiar mi clave</h2>
          <p className="mb-4 text-sm text-muted">La clave se guarda cifrada con un hash (argon2id): nadie, ni la FVF, puede verla. Al cambiarla se cierran sus sesiones en otros equipos.</p>
          <FormClave onListo={() => act.recargar()} />
        </Tarjeta>
      </div>
    </div>
  );
}
