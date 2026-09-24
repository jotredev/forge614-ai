import {
  APPLY_LEAVES,
  ATLAS_CARD_AT,
  ATLAS_ENGINES_ASK_LEAVES,
  ATLAS_LOOKUP_LEAVES,
  ATLAS_PROGRESS_LEAVES,
  ATLAS_REPORT_LEAVES,
  ATLAS_START_LEAVES,
  ATLAS_STORED_AT,
  COPY_LEAVES,
  CYCLE,
  ENGINES_ASK_LEAVES,
  LINE_STARTS,
  PREVIEW_ASK_LEAVES,
  PREVIEW_REPLY_LEAVES,
  SAVE_LEAVES,
  TASK_LEAVES,
  TRAVEL,
  WORKER_COUNT,
} from "./timeline";

// The story of one cycle as a list of processes, each with what it is for and
// the steps it goes through, in plain words. Every moment comes from the same
// constants that time the animation, so this can never drift out of step with
// what is drawn. The process card, the highlight of the nodes taking part and
// the light on the cables all read from here.

// Who takes part: the nodes of the map, "workers" for the three of them
// together, and "cloud" for the PostgreSQL copy.
export type Party = "shell" | "engram" | "engines" | "atlas" | "sentinel" | "workers" | "cloud";

export type Palette = Record<Party, { name: string; color: string }>;

export type Step = {
  // One sentence, who does what.
  text: string;
  // The one who acts, for its color.
  by: Party;
  // Second of the cycle it starts. It lasts until the next step starts, or
  // until the process ends.
  from: number;
};

export type Chapter = {
  id: string;
  name: string;
  // What the process is for, in one line.
  goal: string;
  from: number; // second of the cycle it starts
  to: number; // second of the cycle it ends
  // Every node taking part, in the order they act.
  parties: Party[];
  steps: Step[];
};

// Terminal lines, by position in the session (see timeline.ts).
const PREPARE_LINE = 3;
const CONFIRM_LINE = 6;
const CONTEXT_LINE = 8;
const STATUS_OUTPUT_LINE = 1;

const at = (line: number): number => LINE_STARTS[line]!;

const workerRounds: Step[] = [];
for (let i = 0; i < WORKER_COUNT; i++) {
  workerRounds.push({
    text: `Tarea ${i + 1} de ${WORKER_COUNT}: un worker analiza, Sentinel revisa`,
    by: "workers",
    from: i === 0 ? ATLAS_PROGRESS_LEAVES : TASK_LEAVES[i]!,
  });
}

export const CHAPTERS: Chapter[] = [
  {
    id: "status",
    name: "Revisar el estado",
    goal: "Comprobar que Engram y Engines estén listos.",
    from: 0,
    to: at(PREPARE_LINE),
    parties: ["shell", "engram", "engines"],
    steps: [
      { text: "La persona pide el estado en la terminal", by: "shell", from: 0 },
      { text: "Engram y Engines contestan que están listos", by: "engram", from: at(STATUS_OUTPUT_LINE) },
    ],
  },
  {
    id: "prepare",
    name: "Preparar el proyecto",
    goal: "Dejar el proyecto listo: buscar sus recuerdos y las IAs instaladas.",
    from: at(PREPARE_LINE),
    to: PREVIEW_ASK_LEAVES,
    parties: ["shell", "engram", "engines"],
    steps: [
      { text: "La persona pide preparar el proyecto", by: "shell", from: at(PREPARE_LINE) },
      { text: "Engram busca los recuerdos y Engines las IAs instaladas", by: "engines", from: ENGINES_ASK_LEAVES },
    ],
  },
  {
    id: "preview",
    name: "Vista previa del cambio",
    goal: "Mostrar qué cambiaría, sin tocar nada.",
    from: PREVIEW_ASK_LEAVES,
    to: at(CONFIRM_LINE),
    parties: ["shell", "engines"],
    steps: [
      { text: "Shell le pide a Engines qué cambiaría", by: "shell", from: PREVIEW_ASK_LEAVES },
      { text: "Engines prepara la vista previa, solo para leer", by: "engines", from: PREVIEW_ASK_LEAVES + TRAVEL },
      { text: "Shell se la muestra a la persona", by: "shell", from: PREVIEW_REPLY_LEAVES },
    ],
  },
  {
    id: "apply",
    name: "Aplicar el cambio",
    goal: "Hacer solo el cambio que la persona aprobó.",
    from: at(CONFIRM_LINE),
    to: at(CONTEXT_LINE),
    parties: ["shell", "engines"],
    steps: [
      { text: "La persona confirma en la terminal", by: "shell", from: at(CONFIRM_LINE) },
      { text: "Shell le ordena a Engines aplicar el cambio", by: "shell", from: APPLY_LEAVES },
      { text: "Engines aplica el cambio y avisa", by: "engines", from: APPLY_LEAVES + TRAVEL },
    ],
  },
  {
    id: "context",
    name: "Contextualizar el proyecto",
    goal: "Recorrer el proyecto por primera vez, para que las IAs lo conozcan.",
    from: at(CONTEXT_LINE),
    to: ATLAS_PROGRESS_LEAVES,
    parties: ["shell", "atlas", "engines", "engram"],
    steps: [
      { text: "Shell pregunta si contextualizar y la persona acepta", by: "shell", from: at(CONTEXT_LINE) },
      { text: "Shell le ordena a Atlas que empiece", by: "shell", from: ATLAS_START_LEAVES },
      { text: "Atlas le pregunta a Engines qué IAs puede usar", by: "atlas", from: ATLAS_ENGINES_ASK_LEAVES },
      { text: "Atlas le pregunta a Engram si ya había avance", by: "atlas", from: ATLAS_LOOKUP_LEAVES },
    ],
  },
  {
    id: "analyze",
    name: "Analizar y revisar",
    goal: "Repartir el análisis entre los workers y revisar cada informe.",
    from: ATLAS_PROGRESS_LEAVES,
    to: ATLAS_CARD_AT,
    parties: ["atlas", "workers", "sentinel"],
    steps: workerRounds,
  },
  {
    id: "knowledge",
    name: "Guardar el conocimiento",
    goal: "Dejar en la memoria lo que Atlas ya revisó.",
    from: ATLAS_CARD_AT,
    to: SAVE_LEAVES,
    parties: ["atlas", "engram", "cloud", "shell"],
    steps: [
      { text: "Atlas guarda el conocimiento revisado en Engram", by: "atlas", from: ATLAS_CARD_AT },
      { text: "Engram lo copia a la nube (PostgreSQL)", by: "engram", from: ATLAS_STORED_AT },
      { text: "Atlas le entrega su reporte final a Shell", by: "atlas", from: ATLAS_REPORT_LEAVES },
    ],
  },
  {
    id: "save",
    name: "Guardar lo hecho",
    goal: "Anotar en la memoria todo lo que se hizo.",
    from: SAVE_LEAVES,
    // (The rest after the copy to the cloud is part of this last process.)
    to: CYCLE,
    parties: ["shell", "engram", "cloud"],
    steps: [
      { text: "Shell le manda a Engram lo que hizo, y Engram lo guarda", by: "shell", from: SAVE_LEAVES },
      { text: "Engram lo copia a la nube (PostgreSQL)", by: "engram", from: COPY_LEAVES },
    ],
  },
];

export type Where = {
  index: number;
  chapter: Chapter;
  progress: number;
  // The step being done now.
  step: number;
};

const wrap = (seconds: number): number => ((seconds % CYCLE) + CYCLE) % CYCLE;

// The process a second of the clock falls in, how far through it is, and
// which of its steps is under way.
export function chapterAt(seconds: number): Where {
  const t = wrap(seconds);
  let index = CHAPTERS.length - 1;
  for (let i = 0; i < CHAPTERS.length; i++) {
    if (t < CHAPTERS[i]!.to) {
      index = i;
      break;
    }
  }
  const chapter = CHAPTERS[index]!;
  const span = Math.max(1e-6, chapter.to - chapter.from);
  let step = 0;
  chapter.steps.forEach((s, i) => {
    if (t >= s.from) step = i;
  });
  return { index, chapter, progress: Math.min(1, Math.max(0, (t - chapter.from) / span)), step };
}

// Where "previous" and "next" go: the start of the process before or after.
// Within the first second of a process, "previous" goes to the one before.
export function stepFrom(seconds: number, direction: -1 | 1): number {
  const t = wrap(seconds);
  const { index, chapter } = chapterAt(t);
  if (direction === 1) return CHAPTERS[(index + 1) % CHAPTERS.length]!.from;
  if (t - chapter.from > 1) return chapter.from;
  return CHAPTERS[(index + CHAPTERS.length - 1) % CHAPTERS.length]!.from;
}
