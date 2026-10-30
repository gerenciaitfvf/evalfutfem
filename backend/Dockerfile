# Backend Express · se construye con el repositorio completo como contexto
# (Dokploy: Build path "/", Dockerfile "backend/Dockerfile")
# Debian slim (glibc). Las herramientas de compilación (para argon2) quedan solo en esta etapa.
FROM node:20-bookworm-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/backend/node_modules backend/node_modules
COPY shared shared
COPY backend/package.json backend/
COPY backend/src backend/src
COPY backend/migrations backend/migrations
COPY backend/seed backend/seed
USER node
WORKDIR /app/backend
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/api/salud').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
