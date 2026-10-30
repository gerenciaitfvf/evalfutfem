import { inicioDe, salir, type Sesion } from "../../api";
import { Aros } from "./Login";
import { FormClave } from "./MiCuenta";

/* Primer ingreso o clave restablecida: no se puede usar el sistema hasta cambiarla */
export function CambiarClave({ sesion, onSesion }: { sesion: Sesion; onSesion: (s: Sesion) => void }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-lila2">
      <Aros />
      <div className="relative mx-auto grid min-h-screen max-w-lg content-center px-4 py-8">
        <div className="rounded-[18px] bg-card p-5 shadow-2xl sm:p-6">
          <div className="mb-1 text-xs font-semibold uppercase tracking-[2.4px] text-fucsiad">{sesion.club?.nombre || "Equipo FVF"}</div>
          <h1 className="mb-2 text-[24px] font-light">
            Cree su <b className="font-extrabold text-acento">clave personal</b>
          </h1>
          <p className="mb-4 text-sm text-muted">
            {sesion.debeCambiarClave
              ? "Está usando una clave temporal. Antes de continuar, elija una clave propia: escriba la temporal en «Clave actual»."
              : "Su clave ya está al día."}
          </p>
          <FormClave
            onListo={() => {
              const s = { ...sesion, debeCambiarClave: false };
              onSesion(s);
              setTimeout(() => location.assign(inicioDe(s)), 900);
            }}
          />
          <button type="button" onClick={salir} className="mt-4 w-full cursor-pointer text-center text-sm font-semibold text-acento hover:underline">
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}
