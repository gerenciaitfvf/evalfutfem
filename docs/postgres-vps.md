# PostgreSQL en el VPS C (217.77.9.218 · Ubuntu 26.04)

Base de datos: `fvf_evalfutfem` · Usuario de la app: `evalfutfem_app` (sin privilegios de superusuario).
Solo el backend (VPS B, **217.77.11.254**) puede conectarse, por SSL.

Los comandos asumen una sesión con `sudo`. `PGVER` es la versión que instale Ubuntu (`ls /etc/postgresql`).

## 1. Instalar

```bash
sudo apt update && sudo apt install -y postgresql
PGVER=$(ls /etc/postgresql | sort -V | tail -1); echo $PGVER
```

## 2. Usuario y base de datos

Genere una clave larga y guárdela en el gestor de claves de la FVF (va luego en Dokploy):

```bash
openssl rand -base64 36 | tr -d '/+=' | cut -c1-40
```

```bash
sudo -u postgres psql <<'SQL'
\set clave '''PEGUE_AQUI_LA_CLAVE'''
SET password_encryption = 'scram-sha-256';
CREATE ROLE evalfutfem_app LOGIN PASSWORD :clave NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE DATABASE fvf_evalfutfem OWNER evalfutfem_app ENCODING 'UTF8' TEMPLATE template0;
REVOKE ALL ON DATABASE fvf_evalfutfem FROM PUBLIC;
\c fvf_evalfutfem
CREATE EXTENSION IF NOT EXISTS citext;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO evalfutfem_app;
SQL
```

Las tablas las crea el backend solo, con sus migraciones, la primera vez que arranca.

## 3. Certificado SSL propio (para que el backend verifique el servidor)

Se crea una CA propia y un certificado para la IP 217.77.9.218:

```bash
sudo mkdir -p /etc/postgresql/ssl && cd /etc/postgresql/ssl
sudo openssl req -x509 -newkey rsa:4096 -nodes -days 3650 -subj "/CN=FVF evalfutfem CA" -keyout ca.key -out ca.crt
sudo openssl req -newkey rsa:2048 -nodes -subj "/CN=217.77.9.218" -keyout server.key -out server.csr
printf "subjectAltName=IP:217.77.9.218\n" | sudo tee san.ext >/dev/null
sudo openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 825 -extfile san.ext -out server.crt
sudo chown postgres:postgres server.key server.crt && sudo chmod 600 server.key ca.key
```

El archivo **`ca.crt`** (público, no secreto) se copia al backend en Dokploy (paso de despliegue). `ca.key` no sale de este servidor.

## 4. postgresql.conf

```bash
sudo tee /etc/postgresql/$PGVER/main/conf.d/evalfutfem.conf >/dev/null <<'CONF'
listen_addresses = 'localhost,217.77.9.218'
password_encryption = 'scram-sha-256'
ssl = on
ssl_cert_file = '/etc/postgresql/ssl/server.crt'
ssl_key_file = '/etc/postgresql/ssl/server.key'
ssl_min_protocol_version = 'TLSv1.2'
log_connections = on
log_disconnections = on
CONF
```

## 5. pg_hba.conf: solo el backend y solo por SSL

Agregue al final de `/etc/postgresql/$PGVER/main/pg_hba.conf`:

```
# Evaluación de clubes · backend en VPS B
hostssl  fvf_evalfutfem  evalfutfem_app  217.77.11.254/32  scram-sha-256
```

Revise que **no** exista ninguna línea `host ... 0.0.0.0/0` ni `all all` abierta a internet. Luego:

```bash
sudo systemctl restart postgresql
sudo -u postgres psql -c "select pg_reload_conf();"
```

## 6. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow from 217.77.11.254 to any port 5432 proto tcp
sudo ufw enable
sudo ufw status numbered
```

El puerto 5432 **nunca** debe quedar abierto a todo internet. El VPS A (frontend) no necesita acceso.

## 7. Probar desde el VPS B

```bash
psql "postgres://evalfutfem_app:CLAVE@217.77.9.218:5432/fvf_evalfutfem?sslmode=verify-full&sslrootcert=/ruta/ca.crt" -c "select 1"
```

Desde cualquier otra IP la conexión debe ser rechazada.

## 8. Respaldo diario (14 días)

```bash
sudo mkdir -p /var/backups/evalfutfem && sudo chown postgres:postgres /var/backups/evalfutfem && sudo chmod 700 /var/backups/evalfutfem
sudo tee /etc/cron.d/evalfutfem-backup >/dev/null <<'CRON'
# Respaldo diario a las 2:30 a. m. (hora del servidor); se guardan 14 días
30 2 * * * postgres pg_dump -Fc fvf_evalfutfem > /var/backups/evalfutfem/fvf_evalfutfem_$(date +\%F).dump && find /var/backups/evalfutfem -name '*.dump' -mtime +14 -delete
CRON
```

Recomendado: copiar esos archivos fuera del VPS (otro servidor o almacenamiento de la FVF).

Restaurar un respaldo:

```bash
sudo -u postgres pg_restore --clean --if-exists -d fvf_evalfutfem /var/backups/evalfutfem/fvf_evalfutfem_AAAA-MM-DD.dump
```
