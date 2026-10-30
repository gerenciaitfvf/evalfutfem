import crypto from "node:crypto";
import argon2 from "argon2";

/* argon2id con los parámetros mínimos que recomienda OWASP (19 MiB, 2 iteraciones) */
const OPCIONES = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };

export const hashClave = (clave) => argon2.hash(clave, OPCIONES);

/* Hash de relleno: si el usuario no existe se verifica contra este, para que la
   respuesta tarde lo mismo y no se pueda averiguar qué usuarios existen. */
let dummy;
export async function verificarClave(hash, clave) {
  if (!hash) {
    dummy ??= await hashClave(crypto.randomBytes(16).toString("hex"));
    await argon2.verify(dummy, clave).catch(() => false);
    return false;
  }
  try {
    return await argon2.verify(hash, clave);
  } catch {
    return false;
  }
}

export const necesitaRehash = (hash) => argon2.needsRehash(hash, OPCIONES);

/* Claves más comunes (en general y en el contexto del fútbol venezolano) */
const COMUNES = new Set(
  `123456789012 1234567890 12345678 123456789 1234567 123456 qwertyuiop qwerty123456 qwerty password passw0rd
  password123 password1234 contraseña contrasena contraseña123 contrasena123 clave123456 micontraseña
  administrador admin12345678 adminadmin administrator iloveyou abcdefghijkl abc123456789 aaaaaaaaaaaa
  111111111111 000000000000 123123123123 987654321098 1q2w3e4r5t6y 1qaz2wsx3edc zxcvbnmasdfg asdfghjklñ
  futbolfemenino futbol123456 futbolfemenino2027 futvefem ligafutvefem ligafutve futve2027 vinotinto
  vinotinto123 vinotinto2027 venezuela venezuela123 venezuela2027 fvf123456789 fvf2027 federacion
  federacionvenezolana caracasfc caracas123456 carabobofc metropolitanos deportivolaguaira ucvfc adiffem
  maritimolaguaira academiapuertocabello temporada2027 evaluacion2027 bienvenido bienvenida bienvenido123
  cambiarclave cambiame123 cambiar123456 teamovida teamo123456 princesa123 superman batman123 dragon123
  monkey123456 football soccer123456 letmein12345 welcome12345`.split(/\s+/).filter(Boolean)
);

/* Política (NIST 800-63B): longitud mínima, sin reglas de composición, sin claves comunes. */
export function validarPolitica(clave, { usuario } = {}) {
  const errores = [];
  if (typeof clave !== "string" || clave.length < 12) errores.push("Debe tener al menos 12 caracteres.");
  if (typeof clave === "string" && clave.length > 128) errores.push("No puede tener más de 128 caracteres.");
  if (typeof clave === "string") {
    const c = clave.toLowerCase();
    const base = c.replace(/[\d\W_]+$/u, "");
    if (COMUNES.has(c) || COMUNES.has(base)) errores.push("Es una clave demasiado común. Elija otra.");
    if (/^(.)\1+$/.test(clave)) errores.push("No puede ser un solo carácter repetido.");
    if (usuario) {
      const u = String(usuario).toLowerCase().split("@")[0];
      if (u.length >= 4 && c.includes(u)) errores.push("No puede contener su nombre de usuario.");
    }
  }
  return errores;
}

/* Clave temporal legible: 16 caracteres sin ambiguos (0/O, 1/l/I), en grupos de 4 */
const ALFABETO = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function claveTemporal() {
  const chars = Array.from({ length: 16 }, () => ALFABETO[crypto.randomInt(ALFABETO.length)]);
  return chars.join("").match(/.{4}/g).join("-");
}
