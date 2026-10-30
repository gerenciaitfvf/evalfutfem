import { NavLink, Outlet } from "react-router-dom";
import { puede, salir, type Sesion } from "../../api";

const CONFIG = [
  { to: "/admin/configuracion/usuarios", t: "Usuarios", p: "usuarios.gestionar" },
  { to: "/admin/configuracion/roles", t: "Roles y permisos", p: ["usuarios.gestionar", "roles.gestionar"] },
  { to: "/admin/configuracion/temporadas", t: "Temporadas", p: "temporadas.gestionar" },
  { to: "/admin/configuracion/equipos", t: "Equipos", p: "equipos.gestionar" },
  { to: "/admin/configuracion/auditoria", t: "Auditoría", p: "auditoria.ver" },
];

const enlace = ({ isActive }: { isActive: boolean }) =>
  `block whitespace-nowrap rounded-xl px-3 py-2 text-[15px] font-medium transition ${isActive ? "bg-soft font-semibold text-acento" : "text-ink hover:bg-soft"}`;

export function Layout({ sesion }: { sesion: Sesion }) {
  const esClub = puede(sesion, "evaluacion.llenar");
  const config = CONFIG.filter((c) => [c.p].flat().some((p) => puede(sesion, p)));
  return (
    <div className="min-h-screen">
      <header className="relative overflow-hidden bg-lila2 text-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-2.5">
          <a href={esClub ? "/evaluacion/" : "/admin"} className="flex min-w-0 items-center gap-3">
            <img src="/logos/liga-futve-fem.png" alt="Liga FUTVE Fem" className="h-10 w-auto" />
            <span className="h-8 w-px bg-white/35" />
            <img src="/logos/fvf.png" alt="FVF" className="h-8 w-auto" />
            <span className="hidden min-w-0 sm:block">
              <span className="block text-[11px] font-semibold uppercase tracking-[1.8px] text-oro">{esClub ? sesion.club?.nombre : "Panel FVF"}</span>
              <span className="block truncate font-head text-[15px] font-bold">Evaluación de clubes · Fútbol femenino</span>
            </span>
          </a>
          <div className="flex flex-none items-center gap-2">
            <NavLink to="/mi-cuenta" className="hidden rounded-full border border-white/30 px-3 py-1.5 text-sm hover:border-fucsia hover:bg-fucsia/20 sm:block">
              {sesion.nombre}
            </NavLink>
            <button type="button" onClick={salir} className="cursor-pointer rounded-full border border-white/30 px-3 py-1.5 text-sm hover:border-fucsia hover:bg-fucsia/20">
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1200px] gap-5 px-4 py-5 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Navegación" className="flex gap-1 overflow-x-auto pb-1 lg:sticky lg:top-4 lg:block lg:self-start lg:overflow-visible">
          {esClub ? (
            <a href="/evaluacion/" className={enlace({ isActive: false })}>
              ← Volver a la evaluación
            </a>
          ) : (
            puede(sesion, "tablero.ver") && (
              <NavLink to="/admin" end className={enlace}>
                Tablero de clubes
              </NavLink>
            )
          )}
          <NavLink to="/mi-cuenta" className={enlace}>
            Mi cuenta
          </NavLink>
          {config.length > 0 && (
            <>
              <div className="hidden px-3 pt-5 pb-1 text-[11px] font-semibold uppercase tracking-[1.8px] text-muted lg:block">Configuración</div>
              <span className="mx-1 w-px flex-none bg-line lg:hidden" />
              {config.map((c) => (
                <NavLink key={c.to} to={c.to} className={enlace}>
                  {c.t}
                </NavLink>
              ))}
            </>
          )}
        </nav>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
