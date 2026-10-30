# Evaluación de clubes · Fútbol femenino (FVF)

App para que los clubes de la Liga FUTVE Fem llenen la evaluación que alimenta el Plan Maestro del fútbol femenino, y para que el equipo de la FVF la siga, la consulte y la exporte.

- **Clubes:** entran con usuario y clave, llenan el formulario (idéntico al HTML v7 original) con guardado automático en el servidor y lo envían.
- **Equipo FVF:** tablero de avance por club y módulo, ficha de respuestas por club, exportación a Excel, y la zona de Configuración (usuarios, roles y permisos, temporadas, equipos, auditoría).

## Estructura

```
shared/      Definición del formulario (módulos y preguntas), la usan front y back
frontend/    React + Vite + Tailwind
  src/app/          login, Mi cuenta, panel FVF y Configuración (Tailwind con los colores del formulario)
  src/evaluacion/   página del formulario
  src/form/         motor y CSS originales del formulario v7 (extraídos del HTML)
backend/     Node.js + Express + PostgreSQL
  migrations/       esquema SQL (se aplica solo al arrancar)
  seed/             8 clubes con sus escudos
docs/        formulario original, guía de Postgres y de Dokploy
scripts/     extraer-formulario.py (regenera shared/ y los recursos desde el HTML)
```

## Desarrollo local

Requisitos: Node 20.19+, Docker.

Postgres local (puerto 5433):

```bash
docker compose -f docker-compose.dev.yml up -d
```

Backend (puerto 3100 en local):

```bash
cp backend/.env.example backend/.env
```

Edite `backend/.env` (`SESSION_SECRET`, `ADMIN_INICIAL_CLAVE` y `PORT=3100`), y luego:

```bash
npm --prefix backend install
```

```bash
npm --prefix backend run dev
```

Frontend (puerto 5173):

```bash
cp frontend/.env.example frontend/.env
```

```bash
npm --prefix frontend install
```

```bash
npm --prefix frontend run dev
```

Usuarios de prueba para los 8 clubes (imprime las claves temporales):

```bash
npm --prefix backend run crear-usuarios-clubes
```

Pruebas del backend:

```bash
npm --prefix backend test
```

## Seguridad (resumen)

- Claves con hash **argon2id** (nunca se guardan ni se pueden ver); política de 12+ caracteres sin claves comunes; clave temporal obligatoria de cambiar.
- Bloqueo de 15 minutos tras 5 intentos fallidos, límite por IP y por usuario, mismo mensaje de error para no revelar usuarios.
- Sesiones en Postgres con cookie `HttpOnly` + `Secure` + `SameSite=Lax`; ID regenerado al entrar; 30 min de inactividad (FVF) o 2 h (clubes), 12 h máximo; se cierran al cambiar clave, rol o al desactivar.
- CSRF: origen verificado y encabezado propio en toda escritura. CORS solo para el dominio del front.
- Roles y permisos verificados en el servidor; el club sale siempre de la sesión; cada área ve solo sus preguntas.
- Respuestas validadas contra la definición del formulario; auditoría de accesos y acciones administrativas.
- Postgres solo accesible desde el VPS del backend, por SSL.

## Despliegue

Ver [docs/despliegue-dokploy.md](docs/despliegue-dokploy.md) y [docs/postgres-vps.md](docs/postgres-vps.md).

## Si cambia el formulario

1. Ponga el HTML nuevo en `docs/`.
2. Corra `python3 scripts/extraer-formulario.py docs/<archivo>.html`.
3. Revise el diff de `shared/formulario.js` y `frontend/src/form/form.css`.
4. Si cambió el motor (JavaScript), aplique los cambios en `frontend/src/form/engine.js`, conservando los ajustes marcados al inicio de ese archivo.
