# Despliegue en Dokploy

| Servidor | IP | Dominio | Aplicación |
|---|---|---|---|
| VPS A | 217.77.9.217 | `evaluacionfutfem.fvf.com.ve` | Frontend (Nginx) |
| VPS B | 217.77.11.254 | `evaluacionfutfemback.fvf.com.ve` | Backend (Express) |
| VPS C | 217.77.9.218 | — | PostgreSQL ([guía](postgres-vps.md)) |

Repositorio: `git@github.com:gerenciaitfvf/evalfutfem.git` (rama `main`).

## 0. DNS

En la zona `fvf.com.ve` cree dos registros **A**:

```
evaluacionfutfem       A   217.77.9.217
evaluacionfutfemback   A   217.77.11.254
```

Sin estos registros Dokploy no puede emitir los certificados de Let's Encrypt.

## 1. Base de datos

Siga [postgres-vps.md](postgres-vps.md) en el VPS C antes de desplegar el backend.

## 2. Backend · VPS B

**Create Application** en Dokploy:

- **Provider:** GitHub → `gerenciaitfvf/evalfutfem`, rama `main`
- **Build Type:** Dockerfile
- **Dockerfile Path:** `backend/Dockerfile`
- **Docker Context Path:** `.` (el repositorio completo: el backend usa la carpeta `shared/`)
- **Domains:** `evaluacionfutfemback.fvf.com.ve`, puerto del contenedor **3000**, HTTPS con Let's Encrypt
- **Advanced → Mounts → File Mount:** contenido de `ca.crt` del VPS C, montado en `/app/certs/pg-ca.crt`

**Environment** (no se guardan en el repositorio):

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://evalfutfem_app:CLAVE_DE_POSTGRES@217.77.9.218:5432/fvf_evalfutfem
DATABASE_SSL=true
DATABASE_SSL_CA=/app/certs/pg-ca.crt
SESSION_SECRET=<salida de: openssl rand -base64 48>
FRONTEND_ORIGIN=https://evaluacionfutfem.fvf.com.ve
TRUST_PROXY=1
ADMIN_INICIAL_USUARIO=wilman.sanchez@fvf.com.ve
ADMIN_INICIAL_NOMBRE=Wilman Sánchez
ADMIN_INICIAL_CLAVE=<clave temporal de 12+ caracteres>
LOG_LEVEL=info
```

Al arrancar, el backend:

1. aplica las migraciones (crea las tablas),
2. carga los permisos, los roles, los 8 clubes con sus escudos y la temporada 2027 abierta (cierra el 6 de noviembre de 2026 a las 11:59 p. m., hora de Venezuela),
3. crea el administrador inicial con `ADMIN_INICIAL_CLAVE`, que deberá cambiarse en el primer ingreso.

Después del primer ingreso puede **borrar `ADMIN_INICIAL_CLAVE`** de Dokploy: el usuario ya existe y no se vuelve a crear.

Verificación: `https://evaluacionfutfemback.fvf.com.ve/api/salud` debe responder `{"ok":true}`.

> Si en el futuro se agregan réplicas, mantenga `TRUST_PROXY` igual al número de proxies delante del backend (Traefik = 1). De eso depende que el bloqueo por intentos vea la IP real.

## 3. Frontend · VPS A

**Create Application** en Dokploy:

- **Provider:** GitHub → `gerenciaitfvf/evalfutfem`, rama `main`
- **Build Type:** Dockerfile
- **Dockerfile Path:** `frontend/Dockerfile`
- **Docker Context Path:** `.`
- **Build Args:** `VITE_API_URL=https://evaluacionfutfemback.fvf.com.ve`
- **Domains:** `evaluacionfutfem.fvf.com.ve`, puerto del contenedor **80**, HTTPS con Let's Encrypt

## 4. Usuarios de los clubes

Opción A, desde el panel: **Configuración › Usuarios › Nuevo usuario** (rol Club). La clave temporal se muestra una sola vez.

Opción B, los 8 de una vez: en Dokploy abra la **terminal del contenedor del backend** y ejecute:

```bash
npm run crear-usuarios-clubes
```

Imprime usuario y clave temporal de cada club que todavía no tenga usuario. Entregue cada clave por un canal seguro: no la mande por el chat grupal. Cada club debe cambiarla en su primer ingreso.

## 5. Comprobaciones después de desplegar

- [ ] `https://evaluacionfutfem.fvf.com.ve` muestra el inicio de sesión
- [ ] El administrador entra, cambia la clave y ve el tablero con los 8 clubes
- [ ] Un club entra, cambia la clave, ve su escudo fijo en el Módulo 0 y el borrador se guarda
- [ ] Desde una IP distinta de 217.77.11.254 no se puede abrir el puerto 5432 del VPS C
- [ ] El respaldo de las 2:30 a. m. aparece en `/var/backups/evalfutfem`
