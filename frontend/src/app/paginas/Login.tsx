import { useState, type FormEvent } from "react";
import { api, inicioDe, type Sesion } from "../../api";
import { Aviso, mensajeDe } from "../ui";

/* Solo se permite volver a rutas internas (evita redirecciones abiertas) */
const destinoSeguro = (v: string | null) => (v && /^\/(?!\/)[\w\-/.?=&%]*$/.test(v) && !v.startsWith("/login") ? v : null);

export function Aros() {
  return (
    <svg className="aros" viewBox="0 0 560 560" aria-hidden="true">
      <g fill="none" stroke="#E856EF" strokeWidth="2">
        <circle cx="280" cy="280" r="270" strokeOpacity=".18" />
        <circle cx="280" cy="280" r="222" strokeOpacity=".22" />
        <circle cx="280" cy="280" r="174" strokeOpacity=".26" strokeDasharray="220 40" />
        <circle cx="280" cy="280" r="126" strokeOpacity=".3" />
        <circle cx="280" cy="280" r="78" strokeOpacity=".34" strokeDasharray="120 30" />
      </g>
    </svg>
  );
}

export function Login({ onSesion }: { onSesion: (s: Sesion) => void }) {
  const params = new URLSearchParams(location.search);
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const s = await api<Sesion>("/auth/login", { body: { usuario: usuario.trim(), clave } });
      setClave("");
      onSesion(s);
      const volver = destinoSeguro(params.get("volver"));
      const destino = s.debeCambiarClave ? "/cambiar-clave" : volver && (volver.startsWith("/evaluacion") === s.rol.permisos.includes("evaluacion.llenar") || volver === "/mi-cuenta") ? volver : inicioDe(s);
      location.assign(destino);
    } catch (err) {
      setError(mensajeDe(err));
      setEnviando(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-lila2 text-white">
      <Aros />
      <div className="relative mx-auto grid min-h-screen max-w-[880px] content-center gap-8 px-4 py-8 sm:px-6 md:grid-cols-[1.1fr_1fr] md:items-center">
        <div>
          <div className="flex items-center gap-3.5">
            <img src="/logos/liga-futve-fem.png" alt="Liga FUTVE Fem" className="h-[76px] w-auto sm:h-24" />
            <span className="h-[52px] w-px bg-white/35" />
            <img src="/logos/fvf.png" alt="Federación Venezolana de Fútbol" className="h-[62px] w-auto sm:h-[78px]" />
          </div>
          <div className="mt-6 mb-2 text-xs font-semibold uppercase tracking-[2.4px] text-oro">Liga FUTVE Fem · Evaluación de clubes</div>
          <h1 className="m-0 text-[34px] font-light leading-[1.05] tracking-[-.3px] sm:text-[44px]">
            Evaluación de clubes <b className="block font-extrabold">Fútbol <em className="not-italic text-fucsia">femenino</em></b>
          </h1>
          <p className="mt-2.5 text-sm text-[#E8DCEF]">Federación Venezolana de Fútbol</p>
          <div className="mt-5 max-w-[560px] border-l-4 border-fucsia bg-white/[.07] px-3.5 py-3 text-[17px] leading-snug">
            Sus respuestas son la base del <b>Master Plan del fútbol femenino</b>.
          </div>
        </div>

        <form onSubmit={entrar} className="rounded-[18px] bg-card p-5 text-ink shadow-2xl sm:p-6" noValidate>
          <h2 className="mb-1 text-[22px] font-light">
            Iniciar <b className="font-extrabold text-acento">sesión</b>
          </h2>
          <p className="mb-4 text-sm text-muted">Clubes: usen el usuario y la clave que les entregó la FVF. Equipo FVF: su correo institucional.</p>
          {params.get("vencida") && !error && <Aviso tipo="info">Su sesión venció por inactividad. Vuelva a entrar; sus respuestas quedaron guardadas.</Aviso>}
          {error && <Aviso tipo="err">{error}</Aviso>}
          <label className="mb-3 block">
            <span className="mb-1 block font-semibold">Usuario</span>
            <input
              className="w-full rounded-xl border-[1.5px] border-line bg-field px-3.5 py-3 text-base outline-none focus:border-lila focus:ring-4 focus:ring-fucsia/20"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={254}
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
            />
          </label>
          <label className="mb-4 block">
            <span className="mb-1 block font-semibold">Clave</span>
            <div className="flex rounded-xl border-[1.5px] border-line bg-field focus-within:border-lila focus-within:ring-4 focus-within:ring-fucsia/20">
              <input
                className="w-full bg-transparent px-3.5 py-3 text-base outline-none"
                type={ver ? "text" : "password"}
                autoComplete="current-password"
                required
                maxLength={256}
                value={clave}
                onChange={(e) => setClave(e.target.value)}
              />
              <button type="button" className="cursor-pointer px-3 text-sm font-semibold text-acento" onClick={() => setVer(!ver)} aria-label={ver ? "Ocultar clave" : "Mostrar clave"}>
                {ver ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </label>
          <button
            type="submit"
            disabled={enviando || !usuario || !clave}
            className="inline-flex min-h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-[14px] bg-fucsia px-6 font-head text-lg font-extrabold text-lila3 disabled:opacity-60"
          >
            {enviando ? "Entrando…" : "Entrar"}
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
          <p className="mt-4 text-sm text-muted">
            ¿Olvidó su clave? Escriba a <a className="font-semibold text-acento" href="mailto:andreina.pelaez@fvf.com.ve">andreina.pelaez@fvf.com.ve</a> para que se la restablezcan.
          </p>
        </form>
      </div>
    </div>
  );
}
