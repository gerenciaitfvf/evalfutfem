# syntax=docker/dockerfile:1
# Frontend React + Vite servido con Nginx · contexto = repositorio completo
# (Dokploy: Build path "/", Dockerfile "frontend/Dockerfile", build arg VITE_API_URL)
FROM node:20-alpine AS build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY shared /app/shared
COPY frontend ./
ARG VITE_API_URL=https://evaluacionfutfemback.fvf.com.ve
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
# El origen del backend se inserta en la CSP al arrancar (envsubst de la imagen oficial)
ARG VITE_API_URL=https://evaluacionfutfemback.fvf.com.ve
ENV API_ORIGIN=$VITE_API_URL
COPY frontend/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY frontend/nginx/seguridad.conf /etc/nginx/templates-snippets/seguridad.conf.template
RUN mkdir -p /etc/nginx/snippets
# La imagen oficial solo procesa /etc/nginx/templates; el snippet se procesa aquí al arrancar
COPY <<'SH' /docker-entrypoint.d/15-snippets.sh
#!/bin/sh
envsubst '${API_ORIGIN}' < /etc/nginx/templates-snippets/seguridad.conf.template > /etc/nginx/snippets/seguridad.conf
SH
RUN chmod +x /docker-entrypoint.d/15-snippets.sh
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
