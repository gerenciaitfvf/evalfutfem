#!/usr/bin/env python3
"""Extrae del formulario HTML original (docs/*.html) los recursos que usa la app:

  - frontend/public/fonts/*      tipografías Prometo y Jost (antes incrustadas en base64)
  - frontend/public/logos/*      logos FVF y Liga FUTVE Fem
  - backend/seed/logos/*         escudos de los clubes (se cargan en la BD con el seed)
  - frontend/src/form/form.css   CSS original, con las fuentes apuntando a /fonts
  - frontend/src/form/mapa.js    geometría del mapa de Venezuela
  - shared/formulario.js         definición de módulos y preguntas (MODS, AREAS, listas)

Uso: python3 scripts/extraer-formulario.py docs/<formulario>.html
Al publicar una versión nueva del formulario se vuelve a correr y se revisa el diff.
"""
import base64
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")


def write(rel, data):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    (p.write_bytes if isinstance(data, bytes) else p.write_text)(data)
    print("  ", rel)


def slug(s):
    s = s.lower()
    for a, b in zip("áéíóúñ", "aeioun"):
        s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


# ---------- CSS y fuentes ----------
css = "\n".join(re.findall(r"<style>(.*?)</style>", src, flags=re.S))


def font_repl(m):
    fam, weight, mime, b64 = m.group(1), m.group(2), m.group(3), m.group(4)
    ext = mime.split("/")[1]
    name = f"{fam.lower()}-{weight}.{ext}"
    write(f"frontend/public/fonts/{name}", base64.b64decode(b64))
    return m.group(0).split("src:url(")[0] + f"src:url(/fonts/{name})"


css = re.sub(
    r"@font-face\{font-family:'(\w+)';font-weight:(\d+);[^}]*?src:url\(data:(font/\w+);base64,([A-Za-z0-9+/=]+)\)",
    font_repl,
    css,
)
write("frontend/src/form/form.css", "/* CSS original del formulario v7 (extraído por scripts/extraer-formulario.py). No editar a mano. */\n" + css.strip() + "\n")

# ---------- logos ----------
script = re.findall(r"<script>(.*?)</script>", src, flags=re.S)[0]
for var, name in (("LOGO_FVF", "fvf"), ("LOGO_FEM", "liga-futve-fem")):
    b64 = re.search(var + r'="data:image/png;base64,([A-Za-z0-9+/=]+)"', script).group(1)
    write(f"frontend/public/logos/{name}.png", base64.b64decode(b64))

clubes = []
for m in re.finditer(
    r'\{nombre:"([^"]+)", valor:"([^"]+)", estado:"([^"]+)", logo:"data:image/png;base64,([A-Za-z0-9+/=]+)"\}',
    script,
):
    nombre, valor, estado, b64 = m.groups()
    archivo = slug(nombre) + ".png"
    write(f"backend/seed/logos/{archivo}", base64.b64decode(b64))
    clubes.append({"nombre": nombre, "valor": valor, "estado": estado, "logo": archivo})
write("backend/seed/clubes.json", json.dumps(clubes, ensure_ascii=False, indent=2) + "\n")

# ---------- mapa ----------
mapa = re.search(r"^const MAPA = (\{.*\});$", script, flags=re.M).group(1)
write("frontend/src/form/mapa.js", "/* Geometría: VenGeoJSON (estados) simplificada. Extraído del formulario v7. */\nexport const MAPA = " + mapa + ";\n")

# ---------- definición del formulario ----------
form_id = re.search(r'const FORM_ID = "([^"]+)"', script).group(1)
version = re.search(r'const VERSION = "([^"]+)"', script).group(1)
start = script.index("const CLUBES = ")
end = script.index("if(MODE===\"review\"")
defs = script[start:end].strip()
defs = defs.replace("let MODS = [", "export const MODS = [", 1)
defs = re.sub(r"^const (CLUBES|NOSE|NECES|AREAS) =", r"export const \1 =", defs, flags=re.M)
write(
    "shared/formulario.js",
    "/* Definición del formulario de evaluación de clubes (extraído del HTML v7 por\n"
    "   scripts/extraer-formulario.py). La comparten el frontend y el backend. */\n"
    f'export const FORM_ID = "{form_id}";\n'
    f'export const FORM_VERSION = "{version}";\n\n'
    + defs
    + "\n\n/* Índice id de pregunta → pregunta */\n"
    "export const QIDX = {};\n"
    "MODS.forEach((m) => m.qs.forEach((q) => (QIDX[q.id] = q)));\n\n"
    "/* Pilar del Plan Maestro y programa FIFA de cada pregunta */\n"
    "export function mapa() {\n"
    "  const m = {};\n"
    "  MODS.forEach((mod) => mod.qs.forEach((q) => (m[q.id] = { modulo: mod.titulo, pilar: q.pl || mod.pl, fifa: q.fi || mod.fi })));\n"
    "  return m;\n"
    "}\n\n"
    "/* Misma regla que el formulario para saber si una pregunta está respondida */\n"
    "export function answered(q, v) {\n"
    "  if (v == null) return false;\n"
    '  if (q.type === "grid" || q.type === "estadio" || q.type === "numred") return Object.values(v).some(Boolean);\n'
    '  if (q.type === "redes") return Object.values(v).some((o) => o && o.usuario);\n'
    "  return Array.isArray(v) ? v.length > 0 : !!v;\n"
    "}\n\n"
    "/* Avance por módulo y total (las preguntas condicionales no cuentan, igual que en el formulario) */\n"
    "export function avance(r) {\n"
    "  const out = { modulos: {}, respondidas: 0, total: 0 };\n"
    "  MODS.forEach((m) => {\n"
    "    let t = 0, d = 0;\n"
    "    m.qs.forEach((q) => { if (q.if) return; t++; if (answered(q, r[q.id])) d++; });\n"
    "    out.modulos[m.id] = { respondidas: d, total: t };\n"
    "    out.respondidas += d; out.total += t;\n"
    "  });\n"
    "  out.porcentaje = out.total ? Math.round((out.respondidas / out.total) * 100) : 0;\n"
    "  return out;\n"
    "}\n",
)
print("listo")
