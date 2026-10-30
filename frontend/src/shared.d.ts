/* Tipos de la definición compartida del formulario (shared/formulario.js) */
declare module "@shared/formulario.js" {
  export type Pregunta = {
    id: string;
    t: string;
    type: "text" | "email" | "tel" | "textarea" | "number" | "select" | "radio" | "check" | "scale" | "grid" | "rank" | "kit" | "estadio" | "redes" | "numred";
    o?: string[];
    rows?: string[];
    cols?: string[];
    min?: string;
    max?: string | number;
    h?: string;
    pl?: string;
    fi?: string;
    req?: number;
    if?: [string, string];
  };
  export type Modulo = { id: string; pl: string; fi: string; tag: string; titulo: string; quien: string; qs: Pregunta[] };
  export const MODS: Modulo[];
  export const QIDX: Record<string, Pregunta>;
  export const FORM_ID: string;
  export const FORM_VERSION: string;
  export const NOSE: string;
  export const AREAS: Record<string, { nombre: string; resp: string; mods: Record<string, "*" | string[]> | null }>;
  export function mapa(): Record<string, { modulo: string; pilar: string; fifa: string }>;
}
declare module "*/form/engine.js" {
  export function mountForm(host: Record<string, unknown>): { flush: () => Promise<void>; collect: () => Record<string, unknown> };
}
