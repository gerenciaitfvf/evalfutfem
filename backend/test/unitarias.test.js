import assert from "node:assert/strict";
import { test } from "node:test";
import { avance } from "../../shared/formulario.js";
import { filtrarRespuestas, modsVisibles } from "../src/permisos.js";
import { sanear } from "../src/respuestas.js";
import { claveTemporal, hashClave, validarPolitica, verificarClave } from "../src/seguridad/claves.js";

test("política de claves", () => {
  assert.deepEqual(validarPolitica("una frase larga y segura"), []);
  assert.ok(validarPolitica("corta").length);
  assert.ok(validarPolitica("vinotinto2027").some((e) => e.includes("común")));
  assert.ok(validarPolitica("Vinotinto2027!!").some((e) => e.includes("común")));
  assert.ok(validarPolitica("caracasfc es mi clave", { usuario: "caracasfc" }).some((e) => e.includes("usuario")));
  assert.ok(validarPolitica("aaaaaaaaaaaaaa").length);
});

test("hash argon2id y clave temporal", async () => {
  const h = await hashClave("una frase larga y segura");
  assert.match(h, /^\$argon2id\$/);
  assert.equal(await verificarClave(h, "una frase larga y segura"), true);
  assert.equal(await verificarClave(h, "otra"), false);
  assert.equal(await verificarClave(null, "x"), false);
  assert.match(claveTemporal(), /^[A-Za-z2-9]{4}(-[A-Za-z2-9]{4}){3}$/);
});

test("sanear: fija el club, descarta claves desconocidas y rechaza valores inválidos", () => {
  const { respuestas, errores } = sanear({ club: "Otro club", inventado: 1, plantel: "25", dt_licencia: "CONMEBOL B", categorias: ["Sub-15"] }, "UCV FC");
  assert.equal(respuestas.club, "UCV FC");
  assert.equal(respuestas.inventado, undefined);
  assert.deepEqual(errores, []);
  assert.deepEqual(sanear({ dt_licencia: "<script>" }, "X").errores, ["dt_licencia"]);
  assert.deepEqual(sanear({ plantel: "-3" }, "X").errores, ["plantel"]);
  assert.deepEqual(sanear({ categorias: ["Sub-99"] }, "X").errores, ["categorias"]);
  assert.deepEqual(sanear({ redes: { Instagram: { usuario: "@a", cuenta: "Hackeo" } } }, "X").errores, ["redes"]);
});

test("alcance por rol filtra preguntas", () => {
  const alcance = { club: ["redes", "web"], prensa: "*" };
  const mods = modsVisibles(alcance);
  assert.deepEqual(mods.map((m) => m.id), ["club", "prensa"]);
  assert.deepEqual(mods[0].qs.map((q) => q.id), ["redes", "web"]);
  const r = filtrarRespuestas({ web: "x", plantel: "3", correo: "a@b.c" }, alcance);
  assert.deepEqual(r, { web: "x" });
  assert.deepEqual(filtrarRespuestas({ a: 1 }, null), { a: 1 });
});

test("avance ignora preguntas condicionales", () => {
  const a = avance({ club: "UCV FC", club_otro: "x" });
  assert.equal(a.modulos.club.respondidas, 1);
  assert.equal(a.total, 125);
});
