import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// Dos páginas: la app (login, Mi cuenta, panel FVF) con Tailwind, y el formulario
// de evaluación, que usa solo el CSS original del formulario para verse idéntico.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@shared": fileURLToPath(new URL("../shared", import.meta.url)) },
  },
  server: {
    port: 5173,
    fs: { allow: [".."] },
  },
  build: {
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL("index.html", import.meta.url)),
        evaluacion: fileURLToPath(new URL("evaluacion/index.html", import.meta.url)),
      },
    },
  },
});
