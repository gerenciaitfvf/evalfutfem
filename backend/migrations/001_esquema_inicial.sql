-- Esquema inicial · Evaluación de clubes · Fútbol femenino

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE clubes (
  id               serial PRIMARY KEY,
  nombre           text NOT NULL UNIQUE,
  valor_formulario text NOT NULL UNIQUE,          -- texto exacto que guarda el campo «club» del formulario
  estado           text,                          -- estado de Venezuela (mapa del formulario)
  ciudad           text,
  correo           citext,
  logo             bytea,
  logo_tipo        text CHECK (logo_tipo IN ('image/png','image/jpeg','image/webp')),
  activo           boolean NOT NULL DEFAULT true,
  creado_en        timestamptz NOT NULL DEFAULT now(),
  actualizado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE permisos (
  codigo      text PRIMARY KEY,
  descripcion text NOT NULL
);

CREATE TABLE roles (
  id          serial PRIMARY KEY,
  codigo      text NOT NULL UNIQUE,
  nombre      text NOT NULL,
  descripcion text,
  es_sistema  boolean NOT NULL DEFAULT false,     -- admin y club no se pueden borrar
  creado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rol_permisos (
  rol_id         int  NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permiso_codigo text NOT NULL REFERENCES permisos(codigo) ON DELETE CASCADE,
  PRIMARY KEY (rol_id, permiso_codigo)
);

-- Qué módulos y preguntas del formulario ve un rol. Sin filas = todo el formulario.
-- preguntas NULL = todo el módulo.
CREATE TABLE rol_alcance (
  rol_id    int  NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  modulo_id text NOT NULL,
  preguntas text[],
  PRIMARY KEY (rol_id, modulo_id)
);

CREATE TABLE usuarios (
  id                 serial PRIMARY KEY,
  usuario            citext NOT NULL UNIQUE,      -- correo para usuarios FVF, nombre corto para clubes
  nombre             text NOT NULL,
  hash_clave         text NOT NULL,               -- argon2id (nunca la clave)
  rol_id             int  NOT NULL REFERENCES roles(id),
  club_id            int  REFERENCES clubes(id),
  activo             boolean NOT NULL DEFAULT true,
  debe_cambiar_clave boolean NOT NULL DEFAULT true,
  intentos_fallidos  int  NOT NULL DEFAULT 0,
  bloqueado_hasta    timestamptz,
  clave_cambiada_en  timestamptz,
  ultimo_acceso      timestamptz,
  creado_en          timestamptz NOT NULL DEFAULT now(),
  actualizado_en     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX usuarios_club_idx ON usuarios(club_id);

CREATE TABLE temporadas (
  id                 serial PRIMARY KEY,
  nombre             text NOT NULL UNIQUE,
  version_formulario text NOT NULL,
  abre_en            timestamptz,
  cierra_en          timestamptz,
  estado             text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','abierta','cerrada')),
  creado_en          timestamptz NOT NULL DEFAULT now(),
  actualizado_en     timestamptz NOT NULL DEFAULT now()
);
-- Solo una temporada abierta a la vez
CREATE UNIQUE INDEX temporadas_una_abierta ON temporadas((true)) WHERE estado = 'abierta';

CREATE TABLE temporada_clubes (
  temporada_id int NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,
  club_id      int NOT NULL REFERENCES clubes(id),
  PRIMARY KEY (temporada_id, club_id)
);

CREATE TABLE evaluaciones (
  id                 serial PRIMARY KEY,
  temporada_id       int  NOT NULL REFERENCES temporadas(id),
  club_id            int  NOT NULL REFERENCES clubes(id),
  version_formulario text NOT NULL,
  estado             text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','enviada')),
  respuestas         jsonb NOT NULL DEFAULT '{}'::jsonb,
  avance             jsonb NOT NULL DEFAULT '{}'::jsonb,
  enviado_en         timestamptz,
  enviado_por        int REFERENCES usuarios(id),
  actualizado_en     timestamptz NOT NULL DEFAULT now(),
  actualizado_por    int REFERENCES usuarios(id),
  UNIQUE (temporada_id, club_id)
);

CREATE TABLE evaluaciones_historial (
  id            bigserial PRIMARY KEY,
  evaluacion_id int  NOT NULL REFERENCES evaluaciones(id) ON DELETE CASCADE,
  evento        text NOT NULL CHECK (evento IN ('enviada','reabierta')),
  respuestas    jsonb NOT NULL,
  usuario_id    int REFERENCES usuarios(id),
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auditoria (
  id         bigserial PRIMARY KEY,
  usuario_id int REFERENCES usuarios(id),
  usuario    text,                                -- lo que se escribió (también en intentos fallidos)
  accion     text NOT NULL,
  detalle    jsonb,
  ip         inet,
  navegador  text,
  creado_en  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auditoria_fecha_idx ON auditoria(creado_en DESC);
CREATE INDEX auditoria_usuario_idx ON auditoria(usuario_id, creado_en DESC);
CREATE INDEX auditoria_accion_idx ON auditoria(accion, creado_en DESC);

-- Sesiones (formato de connect-pg-simple)
CREATE TABLE sesiones (
  sid    varchar NOT NULL PRIMARY KEY,
  sess   json NOT NULL,
  expire timestamp(6) NOT NULL
);
CREATE INDEX sesiones_expire_idx ON sesiones(expire);
CREATE INDEX sesiones_usuario_idx ON sesiones(((sess->>'usuarioId')));
