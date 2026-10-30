import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { inicioDe, obtenerSesion, puede, type Sesion } from "../api";
import "./index.css";
import { Cargando } from "./ui";
import { Login } from "./paginas/Login";
import { CambiarClave } from "./paginas/CambiarClave";
import { MiCuenta } from "./paginas/MiCuenta";
import { Layout } from "./paginas/Layout";
import { Tablero } from "./paginas/Tablero";
import { FichaClub } from "./paginas/FichaClub";
import { Usuarios } from "./paginas/config/Usuarios";
import { Roles } from "./paginas/config/Roles";
import { Temporadas } from "./paginas/config/Temporadas";
import { Equipos } from "./paginas/config/Equipos";
import { Auditoria } from "./paginas/config/Auditoria";

function App() {
  const [sesion, setSesion] = useState<Sesion | null | undefined>(undefined);
  useEffect(() => {
    obtenerSesion().then(setSesion).catch(() => setSesion(null));
  }, []);
  if (sesion === undefined) return <Cargando />;

  const conSesion = (el: React.ReactElement) => (sesion ? el : <Navigate to={`/login?volver=${encodeURIComponent(location.pathname)}`} replace />);
  const conPermiso = (p: string | string[], el: React.ReactElement) => conSesion([p].flat().some((x) => puede(sesion, x)) ? el : <Navigate to={sesion ? inicioDe(sesion) : "/login"} replace />);
  const esClub = puede(sesion, "evaluacion.llenar");

  return (
    <Routes>
      <Route path="/login" element={<Login onSesion={setSesion} />} />
      <Route path="/cambiar-clave" element={conSesion(<CambiarClave sesion={sesion!} onSesion={setSesion} />)} />
      <Route element={conSesion(<Layout sesion={sesion!} />)}>
        <Route path="/mi-cuenta" element={<MiCuenta sesion={sesion!} />} />
        {!esClub && (
          <>
            <Route path="/admin" element={conPermiso("tablero.ver", <Tablero sesion={sesion!} />)} />
            <Route path="/admin/clubes/:clubId" element={conPermiso("respuestas.ver", <FichaClub sesion={sesion!} />)} />
            <Route path="/admin/configuracion/usuarios" element={conPermiso("usuarios.gestionar", <Usuarios sesion={sesion!} />)} />
            <Route path="/admin/configuracion/roles" element={conPermiso(["usuarios.gestionar", "roles.gestionar"], <Roles sesion={sesion!} />)} />
            <Route path="/admin/configuracion/temporadas" element={conPermiso("temporadas.gestionar", <Temporadas />)} />
            <Route path="/admin/configuracion/equipos" element={conPermiso("equipos.gestionar", <Equipos />)} />
            <Route path="/admin/configuracion/auditoria" element={conPermiso("auditoria.ver", <Auditoria />)} />
          </>
        )}
      </Route>
      <Route path="*" element={sesion ? <IrAInicio sesion={sesion} /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}

/* La evaluación es otra página (no es parte del router) */
function IrAInicio({ sesion }: { sesion: Sesion }) {
  const destino = inicioDe(sesion);
  useEffect(() => {
    if (destino.startsWith("/evaluacion")) location.assign(destino);
  }, [destino]);
  return destino.startsWith("/evaluacion") ? <Cargando /> : <Navigate to={destino} replace />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
