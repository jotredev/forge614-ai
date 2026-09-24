// The technical words that appear in the panels, each explained in plain
// terms: what it is, what it looks like (only when a real example helps),
// and what it does here. The panel marks the first time each word shows up
// and opens this explanation on hover, focus or tap. Written to be read by
// someone who has never programmed: literal words and an example, not a
// second metaphor to decode.
//
// Examples marked "algo así" are illustrative: they show the shape of the
// thing, not a real message from a node.

export type Term = {
  name: string;
  // The forms of the word that get marked in the text.
  aliases: string[];
  what: string;
  look?: string;
  here: string;
};

export const TERMS: Term[] = [
  {
    name: "stdin",
    aliases: ["stdin"],
    what: "Lo que le «tecleas» a un programa. Cuando escribes en la terminal, tus letras le llegan por ahí.",
    look: "Escribes hola y el programa recibe hola.",
    here: "Otro programa también puede «teclearle» cosas, sin que nadie esté sentado. Así Atlas le pasa la tarea a cada worker.",
  },
  {
    name: "JSON",
    aliases: ["JSON"],
    what: "Una forma de escribir datos con orden, para que cualquier programa los lea. Es como un formulario donde cada dato lleva su etiqueta.",
    look: 'Algo así: {"tarea": "revisar la carpeta src"}',
    here: "Así se pasan datos los nodos, por ejemplo la tarea de Atlas a un worker.",
  },
  {
    name: "NDJSON",
    aliases: ["NDJSON"],
    what: "Lo mismo que JSON, pero en mensajes cortos, uno por línea, en lugar de un solo mensaje grande al final.",
    look: 'Algo así, tres líneas seguidas:\n{"avance": 10}\n{"avance": 50}\n{"avance": 100}',
    here: "Así un worker va avisando cuánto lleva mientras trabaja.",
  },
  {
    name: "MCP",
    aliases: ["MCP"],
    what: "Un estándar para que una IA use herramientas de otros programas. Sirve para que cualquier IA compatible se conecte de la misma forma, sin programar algo a la medida de cada una.",
    look: "Algo así: la IA pide «busca lo que sepamos de este proyecto» y Engram le responde.",
    here: "Por MCP las IAs leen y escriben en la memoria de Engram.",
  },
  {
    name: "SDK",
    aliases: ["SDK"],
    what: "Un paquete de funciones ya hechas para que un programa use algo sin programarlo desde cero.",
    look: "En vez de abrir el archivo de memoria y leerlo a mano, el programa le pide a Engram «guarda esto» con una función lista.",
    here: "Atlas usa el SDK de Engram: es la puerta oficial, y así no se mete a su base de datos por atrás.",
  },
  {
    name: "SQLite",
    aliases: ["SQLite"],
    what: "Una base de datos que vive en un solo archivo de tu computadora, sin necesitar un servidor aparte.",
    look: "Piensa en una hoja de cálculo muy grande y ordenada, guardada en un archivo.",
    here: "Engram guarda sus recuerdos en un archivo así.",
  },
  {
    name: "FTS5",
    aliases: ["FTS5"],
    what: "El buscador de texto de SQLite: encuentra recuerdos por las palabras que contienen, como Ctrl+F pero sobre toda la memoria.",
    look: "Buscas «migración» y aparecen todos los recuerdos que la mencionan.",
    here: "Es lo que hace rápidas las búsquedas de Engram.",
  },
  {
    name: "PostgreSQL",
    aliases: ["PostgreSQL"],
    what: "Una base de datos más grande, que vive en un servidor y no en tu computadora.",
    look: "Es como guardar una copia de tu hoja de cálculo en la nube.",
    here: "Engram puede copiar ahí sus recuerdos como respaldo. Es opcional.",
  },
  {
    name: "token",
    aliases: ["token", "tokens"],
    what: "La unidad con la que las IAs cuentan y cobran el texto. Un token es más o menos un pedazo de palabra.",
    look: "Una palabra corta suele ser 1 o 2 tokens.",
    here: "Más tokens gastados significa más costo. Los workers todavía no informan cuántos usan.",
  },
  {
    name: "huella",
    aliases: ["huella", "huellas"],
    what: "Un código calculado a partir de un archivo. Si el archivo cambia aunque sea una coma, el código cambia.",
    look: "Algo así: a3f9…c21",
    here: "Sirve para comprobar que nadie alteró un archivo antes de instalarlo o de usarlo.",
  },
  {
    name: "CI",
    aliases: ["CI"],
    what: "Una revisión automática que corre en un servidor cada vez que alguien sube un cambio al repositorio.",
    look: "Subes un cambio y, minutos después, ves ✓ o ✗ sin haber corrido nada tú.",
    here: "Sentinel es una de las revisiones que se ejecutan ahí.",
  },
  {
    name: "bun verify",
    aliases: ["bun verify"],
    what: "El comando de un repositorio que corre sus pruebas y verificaciones.",
    look: "Lo escribes en la terminal y te dice si todo está en orden.",
    here: "Sentinel forma parte de esa revisión.",
  },
  {
    name: "repositorio",
    aliases: ["repositorio", "repositorios"],
    what: "La carpeta de un proyecto de programación, con todo el historial de sus cambios.",
    look: "Como una carpeta compartida que recuerda cada versión anterior de cada archivo.",
    here: "Forge614 trabaja sobre el proyecto que la persona prepara.",
  },
  {
    name: "worker",
    aliases: ["worker", "workers"],
    what: "Un programa que hace una tarea que ya viene decidida, y solo esa.",
    look: "Como un obrero al que le dan una orden por escrito y la cumple.",
    here: "Atlas los usa para analizar el proyecto por partes.",
  },
  {
    name: "contrato",
    aliases: ["contrato"],
    what: "El acuerdo escrito de cómo se hablan dos programas: qué se manda, en qué forma y qué se responde.",
    look: "Como el formato de un formulario que los dos aceptan.",
    here: "Por eso un nodo puede cambiar por dentro sin romper a los demás.",
  },
  {
    name: "aislado",
    aliases: ["aislado", "aislamiento"],
    what: "Trabajar en su propio espacio, sin poder tocar ni mezclarse con lo que hacen los demás.",
    here: "Cada worker hace su tarea por separado.",
  },
  {
    name: "estado propio",
    aliases: ["estado propio"],
    what: "Lo que un programa recuerda entre una vez y otra.",
    look: "Una calculadora con memoria tiene estado; una sin memoria, no.",
    here: "Un worker no lo tiene: cada tarea empieza de cero.",
  },
  {
    name: "acta",
    aliases: ["acta", "actas"],
    what: "Un documento breve y numerado que deja por escrito algo que se decidió o se comprobó.",
    here: "En este repositorio las actas guardan las decisiones del ecosistema, como la 0007 sobre Sentinel. Y el acta de Sentinel guarda el resultado de una revisión.",
  },
  {
    name: "Plan/Apply",
    aliases: ["Plan/Apply"],
    what: "Cambiar en dos pasos: primero un plan que solo se lee y, si se aprueba, se aplica.",
    look: "Como una cotización: la ves y decides antes de pagar.",
    here: "Así Engines nunca cambia una IA sin que la persona lo vea antes.",
  },
  {
    name: "puertos y adaptadores",
    aliases: ["puertos y adaptadores"],
    what: "Una forma de organizar un programa: una parte central que no cambia y una pieza «traductora» por cada cosa externa.",
    look: "Como el adaptador de enchufe de un viaje: el aparato es el mismo, cambia la pieza según el país.",
    here: "Engines tiene un adaptador por cada IA.",
  },
];

const byAlias = new Map<string, Term>();
for (const term of TERMS) for (const alias of term.aliases) byAlias.set(alias, term);

export function termFor(alias: string): Term | undefined {
  return byAlias.get(alias);
}

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
// A whole word: not glued to letters, digits, "_" or "/", so "CI" is not
// found inside "oficial". Longer forms come first, so "actas" wins over "acta".
const PATTERN = new RegExp(
  `(?<![\\p{L}\\p{N}_/])(${[...byAlias.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escape)
    .join("|")})(?![\\p{L}\\p{N}_/])`,
  "gu",
);

export type Piece = string | { text: string; term: Term };

// Splits plain text into pieces: ordinary text and the words that have an
// explanation, in order.
export function splitTerms(text: string): Piece[] {
  const pieces: Piece[] = [];
  let last = 0;
  for (const match of text.matchAll(PATTERN)) {
    const at = match.index ?? 0;
    if (at > last) pieces.push(text.slice(last, at));
    pieces.push({ text: match[0], term: byAlias.get(match[0])! });
    last = at + match[0].length;
  }
  if (last < text.length) pieces.push(text.slice(last));
  return pieces;
}
