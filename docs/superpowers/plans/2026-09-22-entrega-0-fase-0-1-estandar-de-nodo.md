# Entrega 0 · Fase 0.1 — Estándar de Nodo Forge614: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir en `forge614-ai` la fuente de verdad del Estándar de Nodo (`standard/`): norma bilingüe, reglas como paquetes con validadores, pack de nodo, plantillas de instalación/CI/contrato, esquemas, matriz de soporte y empaquetado versionado, con el propio repositorio cumpliendo el estándar.

**Architecture:** `forge614-ai` adopta desde el primer commit la arquitectura limpia por capas del estándar (`src/modules` puro → `src/app` casos de uso → `src/infrastructure` I/O → `src/interfaces/cli`). Los esquemas viven en `modules` como Zod y se exportan a JSON Schema; los validadores de cada regla son módulos puros que reciben un árbol de archivos en memoria y devuelven hallazgos; `app` los orquesta y `interfaces/cli` los expone (`verify`, `standard:render`, `standard:pack`). Este código es la semilla del verificador `forge614-sentinel check` de la fase 0.2: en esa fase se mueve a su propio repositorio sin cambiar contratos.

**Tech Stack:** TypeScript 5.9 `strict`, Bun 1.3.x (`bun test`, `bun build`), Zod 4 (`z.toJSONSchema`), empaquetado ustar+gzip escrito en TypeScript (sin `tar`/`gzip` del sistema, para bytes idénticos en los tres SO), `bash -n` y `pwsh` (si existe) para validar sintaxis de instaladores.

**Status:** completed

**Spec:** `docs/superpowers/specs/2026-09-22-entrega-0-estandar-de-nodo-design.md` (aprobada 2026-09-22) y actas `docs/decisions/0001`–`0019`.

## Global Constraints

- Idioma: prosa de documentación en español con par en inglés (`.en.md` o `docs/en/`); código, identificadores, claves JSON y nombres de archivo en inglés (spec §4.8, acta 0016).
- Prohibido mencionar productos externos en código, docs, contratos y mensajes de commit; lista en `standard/forbidden-mentions.json` (acta 0012).
- Nombres de paquetes: `origen-tipo-nombre`, regex `^([a-z0-9]+)-(rule|skill|mcp|plugin|policy|pack)-([a-z0-9]+(?:-[a-z0-9]+)*)$` (acta 0016).
- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`; sin `any`, sin `@ts-ignore`, sin `as` sobre datos externos (spec §4.3).
- Zod `.strict()` en toda frontera; campos desconocidos son error (spec §4.3).
- Contratos de máquina: datos en stdout como un solo JSON con `schemaVersion`; errores en stderr `{schemaVersion, code, error}`; exit `0` éxito, `1` error, `2` entrada inválida; `--help`/`--version` nunca leen stdin (acta 0013).
- Capas: `interfaces → app → (modules, infrastructure)`, `infrastructure → modules`; `modules` solo importa `node:crypto` y `node:util` (spec §4.2).
- Tests junto al código (`x.ts` + `x.test.ts`); integración en `__tests__/`; `bun test` sin binarios externos ni red (spec §4.2).
- Tres sistemas operativos en toda plantilla de release: macOS arm64/x64, Linux arm64/x64, Windows x64 (acta 0018).
- Git es de solo lectura para agentes: cada paso de commit se escribe para que lo ejecute una persona (spec §4.9).
- Ninguna dependencia de Node ni Python en los instaladores (spec §4.6).
- Todo elemento de diseño nombra su patrón canónico; una analogía nunca lo sustituye (acta 0014).

---

## Estructura de archivos

```
forge614-ai/
├── package.json · tsconfig.json · bun.lock · .gitignore
├── forge614.node.json                      puntero al estándar (se apunta a sí mismo)
├── README.md · README.en.md · LICENSE · SECURITY.md · CHANGELOG.md
├── src/
│   ├── modules/
│   │   ├── standard/
│   │   │   ├── package-name.ts             regex y parser origen-tipo-nombre
│   │   │   ├── schemas/
│   │   │   │   ├── node-pointer.ts         forge614.node.json
│   │   │   │   ├── rule-manifest.ts        manifest.json de regla
│   │   │   │   ├── pack.ts                 pack.json
│   │   │   │   ├── support-matrix.ts       support-matrix.json
│   │   │   │   ├── error-envelope.ts       {schemaVersion, code, error}
│   │   │   │   ├── ndjson-event.ts         {schemaVersion, event}
│   │   │   │   └── index.ts
│   │   │   ├── file-tree.ts                árbol de archivos en memoria (entrada de validadores)
│   │   │   ├── finding.ts                  tipo Finding y helpers
│   │   │   └── template.ts                 renderTemplate puro
│   │   └── validators/                     un archivo por regla con validate(tree): Finding[]
│   │       ├── package-naming.ts
│   │       ├── forbidden-mentions.ts
│   │       ├── bilingual-docs.ts
│   │       ├── decision-records.ts
│   │       └── agent-checklist-impact.ts
│   ├── infrastructure/
│   │   ├── fs-tree.ts                      leer un directorio a FileTree
│   │   ├── process.ts                      ejecutar comandos (typecheck, test, bash -n)
│   │   └── hashing.ts                      sha256 de archivos
│   ├── app/
│   │   ├── run-validators.ts               ejecuta todos los validadores sobre un árbol
│   │   ├── render-templates.ts             renderiza standard/templates para un nodo
│   │   ├── generate-json-schemas.ts        Zod → standard/schemas/*.schema.json
│   │   ├── build-notion-map.ts             huellas de docs
│   │   └── pack-standard.ts                tar + SHA256SUMS
│   └── interfaces/cli/
│       ├── verify.ts                       bun run verify
│       ├── standard-render.ts              bun run standard:render
│       ├── standard-pack.ts                bun run standard:pack
│       ├── schemas-generate.ts             bun run schemas:generate
│       ├── notion-map-build.ts             bun run notion-map:build
│       └── output.ts                       printJson / printError (acta 0013)
├── tests/architecture/import-rules.test.ts
├── standard/
│   ├── VERSION
│   ├── STANDARD.md · STANDARD.en.md
│   ├── FORGE614_ECOSYSTEM_CONTRACT.md · FORGE614_ECOSYSTEM_CONTRACT.en.md
│   ├── forbidden-mentions.json
│   ├── support-matrix.json
│   ├── schemas/*.schema.json               generados
│   ├── rules/forge614-rule-<slug>/{RULE.md, RULE.en.md, manifest.json}
│   ├── packs/forge614-pack-ecosystem-node/pack.json
│   ├── procedures/new-agent-checklist.md   ya existe
│   └── templates/{install.sh, install.ps1, verify.yml, release.yml, CONTRACT.md, README.md, decision.md, plan.md}
└── docs/
    ├── es/00..04 · en/00..04 · notion-map.json
    ├── decisions/ (existente) · audits/ (existente) · superpowers/
```

Los validadores viven en `src/modules/validators/` (no dentro de cada carpeta de regla) para que sean puros, testeables y compilables en un solo binario; cada `manifest.json` de regla los referencia por id (`"validator": "package-naming"`). El empaquetado copia el código compilado del verificador junto al estándar en la fase 0.2.

---

### Task 1: Bootstrap del repositorio y prueba de arquitectura

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `forge614.node.json`, `LICENSE`, `SECURITY.md`, `CHANGELOG.md`, `README.md`, `README.en.md`
- Create: `tests/architecture/import-rules.test.ts`
- Create: `src/modules/standard/finding.ts`, `src/modules/standard/messages/{types.ts, es.ts, en.ts, render.ts}`, `src/modules/standard/messages/render.test.ts` (catálogo tipado de mensajes: patrón de la spec §4.8)

**Interfaces:**
- Produces: scripts `bun run typecheck`, `bun test`; layout de capas verificado por `tests/architecture/import-rules.test.ts`; tipo `Finding` y catálogo de mensajes (`src/modules/standard/finding.ts`, `src/modules/standard/messages/`):
  ```ts
  export type Verdict = "pass" | "caution" | "fail";
  export type Locale = "es" | "en";
  export type MessageParams = Record<string, string>;
  export type MessageKey = keyof MessageCatalog; // una clave por mensaje; es.ts y en.ts implementan MessageCatalog completo
  export interface Finding { ruleId: string; verdict: Verdict; evidence: string[]; messageKey: MessageKey; params: MessageParams }
  export function pass(ruleId: string, key: MessageKey, params?: MessageParams): Finding;
  export function fail(ruleId: string, evidence: string[], key: MessageKey, params?: MessageParams): Finding;
  export function renderMessage(key: MessageKey, params: MessageParams, locale: Locale): string;
  export function renderFinding(f: Finding): { es: string; en: string };
  ```
  La paridad es/en la garantiza el compilador: `es.ts` y `en.ts` son `const x: MessageCatalog = {...}`; una clave que falte en un idioma no compila.

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "forge614-ai",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Forge614 core: node standard, ecosystem contracts and lifecycle.",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "bun test",
    "verify": "bun run src/interfaces/cli/verify.ts",
    "standard:render": "bun run src/interfaces/cli/standard-render.ts",
    "standard:pack": "bun run src/interfaces/cli/standard-pack.ts",
    "schemas:generate": "bun run src/interfaces/cli/schemas-generate.ts",
    "notion-map:build": "bun run src/interfaces/cli/notion-map-build.ts"
  },
  "devDependencies": {
    "@types/bun": "1.3.8",
    "typescript": "5.9.3"
  },
  "dependencies": {
    "zod": "4.6.5"
  }
}
```

- [ ] **Step 2: Crear `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "types": ["bun-types"],
    "noEmit": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Crear `.gitignore`, `forge614.node.json`, `LICENSE`, `SECURITY.md`, `CHANGELOG.md`**

`.gitignore`:
```
node_modules/
dist/
.DS_Store
```

`forge614.node.json` (el puntero se apunta a sí mismo; la huella se rellena en la Task 9 cuando exista el paquete):
```json
{
  "schemaVersion": 1,
  "node": "ai",
  "kind": "product",
  "standard": { "version": "1.0.0", "sha256": "0000000000000000000000000000000000000000000000000000000000000000" }
}
```

`LICENSE`: texto completo de la licencia elegida por el propietario (por defecto, "Copyright (c) 2026 Forge614. Todos los derechos reservados." hasta que exista acta de licenciamiento).

`SECURITY.md`:
```markdown
# Política de seguridad / Security policy

**ES.** Reporta vulnerabilidades por correo al propietario del repositorio con el asunto `[forge614-ai][security]`. No abras issues públicos. Respondemos en 5 días hábiles y publicamos la corrección con su acta.

**EN.** Report vulnerabilities by e-mail to the repository owner with subject `[forge614-ai][security]`. Do not open public issues. We answer within 5 business days and publish the fix with its decision record.
```

`CHANGELOG.md`:
```markdown
# Changelog

Generado por `bun release` a partir de commits convencionales. No editar a mano.

## [Unreleased]
```

- [ ] **Step 4: Escribir `README.md` y `README.en.md` (reemplazan "hola")**

`README.md`:
```markdown
# forge614-ai

Piensa en el reglamento de un taller: una sola copia en la pared, y cada estación lo consulta en vez de guardar la suya. `forge614-ai` es el núcleo del ecosistema Forge614: publica el **Estándar de Nodo** (cómo se construye, instala, libera y documenta cada nodo), los contratos del ecosistema y, en entregas futuras, el comando global `forge614`.

## Qué contiene hoy

| Carpeta | Contenido |
| --- | --- |
| `standard/` | Norma, reglas como paquetes, pack de nodo, plantillas, esquemas, matriz de soporte |
| `docs/decisions/` | Actas de decisión (0001 en adelante) |
| `docs/audits/` | Auditorías de código de los nodos |
| `docs/es`, `docs/en` | Documentación numerada bilingüe |

## Comandos

```bash
bun install --frozen-lockfile
bun run verify              # typecheck + tests + validadores del estándar sobre este repo
bun run standard:render --node engram --out /tmp/engram-files
bun run standard:pack       # dist/standard-<VERSION>.tar.gz + SHA256SUMS
```

## Documentación

| No. | Español | English |
| --- | --- | --- |
| 00 | [Resumen y guía rápida](docs/es/00-resumen-y-guia-rapida.md) | [Summary and quickstart](docs/en/00-summary-and-quickstart.md) |
| 01 | [Estándar de nodo](docs/es/01-estandar-de-nodo.md) | [Node standard](docs/en/01-node-standard.md) |
| 02 | [Reglas y packs](docs/es/02-reglas-y-packs.md) | [Rules and packs](docs/en/02-rules-and-packs.md) |
| 03 | [Plantillas y render](docs/es/03-plantillas-y-render.md) | [Templates and rendering](docs/en/03-templates-and-rendering.md) |
| 04 | [Verificación y empaquetado](docs/es/04-verificacion-y-empaquetado.md) | [Verification and packaging](docs/en/04-verification-and-packaging.md) |

English: [README.en.md](README.en.md)
```

`README.en.md`: traducción fiel del anterior (mismas tablas y comandos), con enlace de vuelta a `README.md`.

- [ ] **Step 5: Escribir el catálogo tipado de mensajes y el tipo `Finding`**

Patrón (spec §4.8): una interfaz `MessageCatalog` con una función por mensaje, un archivo por idioma que la implementa completa, y un `render` que elige idioma. Los mensajes con datos reciben `params`. Identificadores, rutas y comandos nunca se traducen (van en `evidence`, no en el mensaje).

`src/modules/standard/messages/types.ts`:
```ts
export type Locale = "es" | "en";
export type MessageParams = Record<string, string>;
type Msg = (params: MessageParams) => string;

export interface MessageCatalog {
  docsParityOk: Msg;
  docsParityBroken: Msg;
  packageNamesOk: Msg;
  packageNamesInvalid: Msg;
  forbiddenMentionsNone: Msg;
  forbiddenMentionsFound: Msg;
  decisionRecordsOk: Msg;
  decisionRecordsInvalid: Msg;
  agentImpactDeclared: Msg;
  agentImpactMissing: Msg;
  rulesCatalogOk: Msg;
  rulesCatalogInvalid: Msg;
  packsOk: Msg;
  packsInvalid: Msg;
  supportMatrixMissing: Msg;
  supportMatrixInvalid: Msg;
  supportMatrixCurrent: Msg;
  supportMatrixStale: Msg;
  errorCodesOk: Msg;
  errorCodesInvalid: Msg;
  workflowsNone: Msg;
  workflowsOk: Msg;
  workflowsInvalid: Msg;
  ecosystemContractOk: Msg;
  ecosystemContractDiverged: Msg;
}
export type MessageKey = keyof MessageCatalog;
```

`src/modules/standard/messages/es.ts`:
```ts
import type { MessageCatalog } from "./types";
export const es: MessageCatalog = {
  docsParityOk: () => "Documentación bilingüe con paridad.",
  docsParityBroken: () => "Falta paridad español/inglés en documentación.",
  packageNamesOk: () => "Nombres de paquetes canónicos.",
  packageNamesInvalid: () => "Carpetas de paquete fuera de origen-tipo-nombre.",
  forbiddenMentionsNone: () => "Sin menciones prohibidas.",
  forbiddenMentionsFound: () => "Menciones a productos externos.",
  decisionRecordsOk: () => "Actas de decisión coherentes.",
  decisionRecordsInvalid: () => "Actas de decisión inválidas.",
  agentImpactDeclared: () => "Planes cerrados declaran impacto en el procedimiento de agentes.",
  agentImpactMissing: () => "Planes cerrados sin impacto declarado.",
  rulesCatalogOk: () => "Catálogo de reglas válido.",
  rulesCatalogInvalid: () => "Catálogo de reglas inválido.",
  packsOk: () => "Packs válidos.",
  packsInvalid: () => "Packs inválidos.",
  supportMatrixMissing: () => "Falta la matriz de soporte.",
  supportMatrixInvalid: () => "Matriz de soporte inválida.",
  supportMatrixCurrent: () => "Matriz de soporte vigente.",
  supportMatrixStale: (p) => `Celdas en revalidación vencidas (más de ${p.days ?? "30"} días).`,
  errorCodesOk: () => "Códigos de error con formato canónico.",
  errorCodesInvalid: () => "Códigos de error fuera del formato MAYUSCULAS_CON_GUION_BAJO.",
  workflowsNone: () => "Sin workflows que validar.",
  workflowsOk: () => "Workflows delgados, fijados y documentados.",
  workflowsInvalid: () => "Workflows fuera del estándar.",
  ecosystemContractOk: () => "Contrato del ecosistema coherente.",
  ecosystemContractDiverged: () => "Copia del contrato del ecosistema divergente.",
};
```

`src/modules/standard/messages/en.ts`:
```ts
import type { MessageCatalog } from "./types";
export const en: MessageCatalog = {
  docsParityOk: () => "Bilingual documentation with parity.",
  docsParityBroken: () => "Spanish/English documentation parity is broken.",
  packageNamesOk: () => "Package names are canonical.",
  packageNamesInvalid: () => "Package folders outside origin-kind-name.",
  forbiddenMentionsNone: () => "No forbidden mentions.",
  forbiddenMentionsFound: () => "External product mentions.",
  decisionRecordsOk: () => "Decision records are consistent.",
  decisionRecordsInvalid: () => "Invalid decision records.",
  agentImpactDeclared: () => "Completed plans declare agent-procedure impact.",
  agentImpactMissing: () => "Completed plans without declared impact.",
  rulesCatalogOk: () => "Rules catalog is valid.",
  rulesCatalogInvalid: () => "Invalid rules catalog.",
  packsOk: () => "Packs are valid.",
  packsInvalid: () => "Invalid packs.",
  supportMatrixMissing: () => "Support matrix missing.",
  supportMatrixInvalid: () => "Invalid support matrix.",
  supportMatrixCurrent: () => "Support matrix is current.",
  supportMatrixStale: (p) => `Stale revalidate cells (older than ${p.days ?? "30"} days).`,
  errorCodesOk: () => "Error codes use the canonical format.",
  errorCodesInvalid: () => "Error codes outside the UPPER_SNAKE_CASE format.",
  workflowsNone: () => "No workflows to validate.",
  workflowsOk: () => "Workflows are thin, pinned and documented.",
  workflowsInvalid: () => "Workflows violate the standard.",
  ecosystemContractOk: () => "Ecosystem contract is consistent.",
  ecosystemContractDiverged: () => "Diverged ecosystem contract copy.",
};
```

`src/modules/standard/messages/render.ts`:
```ts
import { en } from "./en";
import { es } from "./es";
import type { Locale, MessageKey, MessageParams } from "./types";
const catalogs = { es, en } as const;
export function renderMessage(key: MessageKey, params: MessageParams, locale: Locale): string {
  return catalogs[locale][key](params);
}
```

`src/modules/standard/messages/render.test.ts`:
```ts
import { expect, test } from "bun:test";
import { renderMessage } from "./render";
test("renders the same key in both locales with params", () => {
  expect(renderMessage("supportMatrixStale", { days: "30" }, "es")).toBe("Celdas en revalidación vencidas (más de 30 días).");
  expect(renderMessage("supportMatrixStale", { days: "30" }, "en")).toBe("Stale revalidate cells (older than 30 days).");
  expect(renderMessage("docsParityOk", {}, "en")).toBe("Bilingual documentation with parity.");
});
```

`src/modules/standard/finding.ts`:
```ts
import { renderMessage } from "./messages/render";
import type { MessageKey, MessageParams } from "./messages/types";
export type { Locale, MessageKey, MessageParams } from "./messages/types";

export type Verdict = "pass" | "caution" | "fail";

export interface Finding {
  ruleId: string;
  verdict: Verdict;
  evidence: string[];
  messageKey: MessageKey;
  params: MessageParams;
}

export function pass(ruleId: string, key: MessageKey, params: MessageParams = {}): Finding {
  return { ruleId, verdict: "pass", evidence: [], messageKey: key, params };
}

export function fail(ruleId: string, evidence: string[], key: MessageKey, params: MessageParams = {}): Finding {
  return { ruleId, verdict: "fail", evidence, messageKey: key, params };
}

export function renderFinding(f: Finding): { es: string; en: string } {
  return { es: renderMessage(f.messageKey, f.params, "es"), en: renderMessage(f.messageKey, f.params, "en") };
}

export function worst(findings: readonly Finding[]): Verdict {
  if (findings.some((f) => f.verdict === "fail")) return "fail";
  if (findings.some((f) => f.verdict === "caution")) return "caution";
  return "pass";
}
```

Run: `bun test src/modules/standard/messages/render.test.ts`
Expected: PASS (3 aserciones).

- [ ] **Step 6: Escribir la prueba de arquitectura (fallará hasta que existan las capas)**

`tests/architecture/import-rules.test.ts`:
```ts
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";

const SRC = resolve(import.meta.dir, "../../src");
type Layer = "modules" | "app" | "infrastructure" | "interfaces";
const ALLOWED: Record<Layer, readonly Layer[]> = {
  modules: ["modules"],
  infrastructure: ["infrastructure", "modules"],
  app: ["app", "modules", "infrastructure"],
  interfaces: ["interfaces", "app", "modules"],
};
const MODULES_EXTERNAL_ALLOWLIST = new Set(["node:crypto", "node:util", "zod"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".ts") && !full.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

function layerOf(file: string): Layer {
  const first = relative(SRC, file).split("/")[0];
  if (first === "modules" || first === "app" || first === "infrastructure" || first === "interfaces") return first;
  throw new Error(`file outside a known layer: ${file}`);
}

const IMPORT_RE = /^\s*(?:import|export)\s[^'"]*from\s+["']([^"']+)["']/gm;

function importsOf(file: string): string[] {
  const text = readFileSync(file, "utf8");
  return [...text.matchAll(IMPORT_RE)].map((m) => m[1] ?? "");
}

describe("layer import rules (spec §4.2)", () => {
  const files = walk(SRC);
  test("src has at least one file per layer", () => {
    const layers = new Set(files.map(layerOf));
    expect([...layers].sort()).toEqual(["app", "infrastructure", "interfaces", "modules"]);
  });
  for (const file of files) {
    test(relative(SRC, file), () => {
      const from = layerOf(file);
      for (const spec of importsOf(file)) {
        if (spec.startsWith(".")) {
          const target = resolve(dirname(file), spec.replace(/\.js$/, "") + ".ts");
          const to = layerOf(target.endsWith(".ts") ? target : target + ".ts");
          expect(ALLOWED[from], `${from} → ${to} in ${relative(SRC, file)}`).toContain(to);
        } else if (from === "modules") {
          expect(MODULES_EXTERNAL_ALLOWLIST.has(spec), `modules imports external ${spec}`).toBe(true);
        }
      }
    });
  }
});
```

- [ ] **Step 7: Instalar dependencias y ejecutar**

Run: `bun install && bun run typecheck && bun test tests/architecture`
Expected: `typecheck` PASS; el test "src has at least one file per layer" FALLA con `expected ["modules"] toEqual [...]` (solo existe `modules`). Es el fallo esperado hasta la Task 6/8; se deja rojo a propósito y se vuelve verde cuando existan las cuatro capas.

- [ ] **Step 8: Commit (lo ejecuta una persona)**

```bash
git add package.json tsconfig.json bun.lock .gitignore forge614.node.json LICENSE SECURITY.md CHANGELOG.md README.md README.en.md src/modules/standard/finding.ts tests/architecture/import-rules.test.ts
git commit -m "chore: bootstrap forge614-ai with node standard layout and architecture test"
```

---

### Task 2: Esquemas del estándar (Zod + JSON Schema)

**Files:**
- Create: `src/modules/standard/package-name.ts`, `src/modules/standard/package-name.test.ts`
- Create: `src/modules/standard/schemas/node-pointer.ts`, `rule-manifest.ts`, `pack.ts`, `support-matrix.ts`, `error-envelope.ts`, `ndjson-event.ts`, `index.ts` y un `*.test.ts` por esquema
- Create: `src/app/generate-json-schemas.ts`, `src/infrastructure/fs-write.ts`, `src/interfaces/cli/schemas-generate.ts`, `src/interfaces/cli/output.ts`
- Create: `standard/VERSION` (contenido `1.0.0`)

**Interfaces:**
- Produces:
  ```ts
  // package-name.ts
  export const PACKAGE_NAME_PATTERN: RegExp;
  export type PackageKind = "rule" | "skill" | "mcp" | "plugin" | "policy" | "pack";
  export function parsePackageName(name: string): { origin: string; kind: PackageKind; slug: string } | null;
  // schemas/index.ts
  export { NodePointerSchema, type NodePointer } ...; export const ALL_SCHEMAS: Record<string, z.ZodType>;
  // output.ts
  export function printJson(payload: Record<string, unknown> & { schemaVersion: number }): void;
  export function printError(code: string, error: string, schemaVersion?: number): void; // stderr
  ```

- [ ] **Step 1: Test del parser de nombres**

`src/modules/standard/package-name.test.ts`:
```ts
import { describe, expect, test } from "bun:test";
import { PACKAGE_NAME_PATTERN, parsePackageName } from "./package-name";

describe("origen-tipo-nombre", () => {
  test("accepts canonical names", () => {
    expect(parsePackageName("forge614-rule-package-naming")).toEqual({ origin: "forge614", kind: "rule", slug: "package-naming" });
    expect(parsePackageName("anthropics-skill-pdf")).toEqual({ origin: "anthropics", kind: "skill", slug: "pdf" });
    expect(PACKAGE_NAME_PATTERN.test("forge614-pack-ecosystem-node")).toBe(true);
  });
  test("rejects wrong shape", () => {
    for (const bad of ["create-pdfs", "forge614-create-pdfs", "Forge614-rule-x", "forge614-rule-", "forge-614-rule-x", "forge614-tool-x"]) {
      expect(parsePackageName(bad), bad).toBeNull();
    }
  });
});
```

- [ ] **Step 2: Ejecutar para ver el fallo**

Run: `bun test src/modules/standard/package-name.test.ts`
Expected: FAIL `Cannot find module './package-name'`

- [ ] **Step 3: Implementar `package-name.ts`**

```ts
export const PACKAGE_KINDS = ["rule", "skill", "mcp", "plugin", "policy", "pack"] as const;
export type PackageKind = (typeof PACKAGE_KINDS)[number];

export const PACKAGE_NAME_PATTERN = /^([a-z0-9]+)-(rule|skill|mcp|plugin|policy|pack)-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

export function parsePackageName(name: string): { origin: string; kind: PackageKind; slug: string } | null {
  const m = PACKAGE_NAME_PATTERN.exec(name);
  if (!m) return null;
  const [, origin, kind, slug] = m;
  if (!origin || !kind || !slug) return null;
  return { origin, kind: kind as PackageKind, slug };
}
```
(El `as PackageKind` es sobre un grupo de la regex que ya restringe los valores; no es dato externo.)

- [ ] **Step 4: Ejecutar**

Run: `bun test src/modules/standard/package-name.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Tests de los seis esquemas**

`src/modules/standard/schemas/node-pointer.test.ts`:
```ts
import { describe, expect, test } from "bun:test";
import { NodePointerSchema } from "./node-pointer";

const valid = { schemaVersion: 1, node: "engram", kind: "product", standard: { version: "1.0.0", sha256: "a".repeat(64) } };

describe("forge614.node.json", () => {
  test("valid", () => expect(NodePointerSchema.parse(valid)).toEqual(valid));
  test("rejects unknown keys", () => expect(NodePointerSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false));
  test("rejects bad node name / kind / sha", () => {
    expect(NodePointerSchema.safeParse({ ...valid, node: "Engram" }).success).toBe(false);
    expect(NodePointerSchema.safeParse({ ...valid, kind: "tool" }).success).toBe(false);
    expect(NodePointerSchema.safeParse({ ...valid, standard: { version: "1.0.0", sha256: "xyz" } }).success).toBe(false);
  });
});
```

`src/modules/standard/schemas/rule-manifest.test.ts`:
```ts
import { describe, expect, test } from "bun:test";
import { RuleManifestSchema } from "./rule-manifest";

const valid = {
  schemaVersion: 1, name: "forge614-rule-package-naming", version: "1.0.0", level: "core",
  title: { es: "Nombres de paquetes", en: "Package names" },
  appliesWhen: [], validator: "package-naming", decisions: ["0016"],
};

describe("rule manifest", () => {
  test("valid core rule", () => expect(RuleManifestSchema.parse(valid).name).toBe(valid.name));
  test("stack rule needs appliesWhen", () => {
    expect(RuleManifestSchema.safeParse({ ...valid, level: "stack" }).success).toBe(false);
    expect(RuleManifestSchema.safeParse({ ...valid, level: "stack", appliesWhen: [{ fileExists: "tsconfig.json" }] }).success).toBe(true);
  });
  test("rejects non-canonical name and unknown keys", () => {
    expect(RuleManifestSchema.safeParse({ ...valid, name: "package-naming" }).success).toBe(false);
    expect(RuleManifestSchema.safeParse({ ...valid, foo: 1 }).success).toBe(false);
  });
});
```

`src/modules/standard/schemas/pack.test.ts`:
```ts
import { describe, expect, test } from "bun:test";
import { PackSchema } from "./pack";
describe("pack", () => {
  test("valid", () => {
    expect(PackSchema.parse({ schemaVersion: 1, name: "forge614-pack-ecosystem-node", version: "1.0.0", title: { es: "Nodo", en: "Node" }, rules: ["forge614-rule-package-naming"] }).rules).toHaveLength(1);
  });
  test("rules must be canonical rule names", () => {
    expect(PackSchema.safeParse({ schemaVersion: 1, name: "forge614-pack-x", version: "1.0.0", title: { es: "a", en: "b" }, rules: ["forge614-skill-x"] }).success).toBe(false);
  });
});
```

`src/modules/standard/schemas/support-matrix.test.ts`:
```ts
import { describe, expect, test } from "bun:test";
import { SupportMatrixSchema } from "./support-matrix";
const valid = {
  schemaVersion: 1, nodes: ["engines", "workers"], agents: ["claude-code"],
  cells: [{ node: "engines", agent: "claude-code", status: "supported", verifiedAt: "2026-09-22", verifiedBy: "owner", notes: "" }],
};
describe("support matrix", () => {
  test("valid", () => expect(SupportMatrixSchema.parse(valid).cells).toHaveLength(1));
  test("revalidate requires since date", () => {
    const cell = { node: "engines", agent: "claude-code", status: "revalidate", verifiedAt: "2026-09-22", verifiedBy: "owner", notes: "" };
    expect(SupportMatrixSchema.safeParse({ ...valid, cells: [cell] }).success).toBe(false);
    expect(SupportMatrixSchema.safeParse({ ...valid, cells: [{ ...cell, revalidateSince: "2026-09-22" }] }).success).toBe(true);
  });
  test("cell must reference declared node and agent", () => {
    expect(SupportMatrixSchema.safeParse({ ...valid, cells: [{ ...valid.cells[0], node: "hub" }] }).success).toBe(false);
  });
});
```

`src/modules/standard/schemas/error-envelope.test.ts`:
```ts
import { describe, expect, test } from "bun:test";
import { ErrorEnvelopeSchema } from "./error-envelope";
describe("error envelope (acta 0013)", () => {
  test("valid", () => expect(ErrorEnvelopeSchema.parse({ schemaVersion: 1, code: "SCHEMA_UNSUPPORTED", error: "x" }).code).toBe("SCHEMA_UNSUPPORTED"));
  test("code must be UPPER_SNAKE", () => expect(ErrorEnvelopeSchema.safeParse({ schemaVersion: 1, code: "bad-code", error: "x" }).success).toBe(false));
});
```

`src/modules/standard/schemas/ndjson-event.test.ts`:
```ts
import { describe, expect, test } from "bun:test";
import { NdjsonEventSchema } from "./ndjson-event";
describe("ndjson event", () => {
  test("valid passthrough of extra payload", () => {
    expect(NdjsonEventSchema.parse({ schemaVersion: 2, event: "task_completed", taskId: "t1" }).event).toBe("task_completed");
  });
  test("event must be snake_case", () => expect(NdjsonEventSchema.safeParse({ schemaVersion: 2, event: "Task-Completed" }).success).toBe(false));
});
```

- [ ] **Step 6: Ejecutar para ver los fallos**

Run: `bun test src/modules/standard/schemas`
Expected: 6 archivos FAIL con `Cannot find module`.

- [ ] **Step 7: Implementar los esquemas**

`src/modules/standard/schemas/common.ts`:
```ts
import { z } from "zod";
export const SemVer = z.string().regex(/^\d+\.\d+\.\d+$/, "semver X.Y.Z");
export const Sha256 = z.string().regex(/^[a-f0-9]{64}$/, "sha256 hex");
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
export const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "kebab-case");
export const Bilingual = z.object({ es: z.string().min(1), en: z.string().min(1) }).strict();
```

`node-pointer.ts`:
```ts
import { z } from "zod";
import { SemVer, Sha256, Slug } from "./common";
export const NodePointerSchema = z.object({
  schemaVersion: z.literal(1),
  node: Slug,
  kind: z.enum(["product", "internal"]),
  standard: z.object({ version: SemVer, sha256: Sha256 }).strict(),
}).strict();
export type NodePointer = z.infer<typeof NodePointerSchema>;
```

`rule-manifest.ts`:
```ts
import { z } from "zod";
import { PACKAGE_NAME_PATTERN } from "../package-name";
import { Bilingual, SemVer, Slug } from "./common";
const RuleName = z.string().regex(PACKAGE_NAME_PATTERN).refine((n) => n.split("-")[1] === "rule", "must be a rule package");
export const AppliesWhenSchema = z.union([
  z.object({ fileExists: z.string().min(1) }).strict(),
  z.object({ anyFileMatches: z.string().min(1) }).strict(),
]);
export const RuleManifestSchema = z.object({
  schemaVersion: z.literal(1),
  name: RuleName,
  version: SemVer,
  level: z.enum(["core", "stack", "optional"]),
  title: Bilingual,
  appliesWhen: z.array(AppliesWhenSchema),
  validator: Slug.optional(),
  decisions: z.array(z.string().regex(/^\d{4}$/)),
}).strict().refine((m) => m.level !== "stack" || m.appliesWhen.length > 0, { message: "stack rules must declare appliesWhen", path: ["appliesWhen"] });
export type RuleManifest = z.infer<typeof RuleManifestSchema>;
```

`pack.ts`:
```ts
import { z } from "zod";
import { PACKAGE_NAME_PATTERN } from "../package-name";
import { Bilingual, SemVer } from "./common";
const RuleRef = z.string().regex(PACKAGE_NAME_PATTERN).refine((n) => n.split("-")[1] === "rule");
export const PackSchema = z.object({
  schemaVersion: z.literal(1),
  name: z.string().regex(PACKAGE_NAME_PATTERN).refine((n) => n.split("-")[1] === "pack"),
  version: SemVer,
  title: Bilingual,
  rules: z.array(RuleRef).min(1),
}).strict();
export type Pack = z.infer<typeof PackSchema>;
```

`support-matrix.ts`:
```ts
import { z } from "zod";
import { IsoDate, Slug } from "./common";
const Cell = z.object({
  node: Slug, agent: Slug,
  status: z.enum(["supported", "partial", "unsupported", "revalidate"]),
  verifiedAt: IsoDate, verifiedBy: z.string().min(1), notes: z.string(),
  revalidateSince: IsoDate.optional(),
}).strict().refine((c) => c.status !== "revalidate" || c.revalidateSince !== undefined, { message: "revalidate requires revalidateSince", path: ["revalidateSince"] });
export const SupportMatrixSchema = z.object({
  schemaVersion: z.literal(1),
  nodes: z.array(Slug).min(1),
  agents: z.array(Slug).min(1),
  cells: z.array(Cell),
}).strict().superRefine((m, ctx) => {
  m.cells.forEach((c, i) => {
    if (!m.nodes.includes(c.node)) ctx.addIssue({ code: "custom", path: ["cells", i, "node"], message: `unknown node ${c.node}` });
    if (!m.agents.includes(c.agent)) ctx.addIssue({ code: "custom", path: ["cells", i, "agent"], message: `unknown agent ${c.agent}` });
  });
});
export type SupportMatrix = z.infer<typeof SupportMatrixSchema>;
```

`error-envelope.ts`:
```ts
import { z } from "zod";
export const ErrorEnvelopeSchema = z.object({
  schemaVersion: z.number().int().positive(),
  code: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  error: z.string().min(1),
}).strict();
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
```

`ndjson-event.ts`:
```ts
import { z } from "zod";
export const NdjsonEventSchema = z.object({
  schemaVersion: z.number().int().positive(),
  event: z.string().regex(/^[a-z][a-z0-9_]*$/),
}).passthrough();
export type NdjsonEvent = z.infer<typeof NdjsonEventSchema>;
```

`index.ts`:
```ts
import type { z } from "zod";
import { ErrorEnvelopeSchema } from "./error-envelope";
import { NdjsonEventSchema } from "./ndjson-event";
import { NodePointerSchema } from "./node-pointer";
import { PackSchema } from "./pack";
import { RuleManifestSchema } from "./rule-manifest";
import { SupportMatrixSchema } from "./support-matrix";
export { ErrorEnvelopeSchema, NdjsonEventSchema, NodePointerSchema, PackSchema, RuleManifestSchema, SupportMatrixSchema };
export type { NodePointer } from "./node-pointer";
export type { RuleManifest } from "./rule-manifest";
export type { Pack } from "./pack";
export type { SupportMatrix } from "./support-matrix";
export const ALL_SCHEMAS: Record<string, z.ZodType> = {
  "node-pointer": NodePointerSchema,
  "rule-manifest": RuleManifestSchema,
  pack: PackSchema,
  "support-matrix": SupportMatrixSchema,
  "error-envelope": ErrorEnvelopeSchema,
  "ndjson-event": NdjsonEventSchema,
};
```

- [ ] **Step 8: Ejecutar**

Run: `bun test src/modules/standard`
Expected: PASS (todos los tests de esquemas y del parser).

- [ ] **Step 9: Generador de JSON Schema y salida de CLI**

`src/interfaces/cli/output.ts`:
```ts
export function printJson(payload: Record<string, unknown> & { schemaVersion: number }): void {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}
export function printError(code: string, error: string, schemaVersion = 1): void {
  process.stderr.write(`${JSON.stringify({ schemaVersion, code, error })}\n`);
}
```

`src/infrastructure/fs-write.ts`:
```ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
export function writeTextAtomic(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, content, { encoding: "utf8", mode: 0o644 });
  // rename es atómico en el mismo directorio
  require("node:fs").renameSync(tmp, path);
}
```
(Sustituir el `require` por `import { renameSync } from "node:fs"` arriba; se muestra separado solo para resaltar el rename.)

`src/app/generate-json-schemas.ts`:
```ts
import { z } from "zod";
import { ALL_SCHEMAS } from "../modules/standard/schemas";
export function generateJsonSchemas(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, schema] of Object.entries(ALL_SCHEMAS)) {
    const json = z.toJSONSchema(schema, { target: "draft-2020-12", unrepresentable: "any" });
    out[`${id}.schema.json`] = `${JSON.stringify({ $id: `https://forge614.dev/schemas/${id}.schema.json`, ...json }, null, 2)}\n`;
  }
  return out;
}
```

`src/app/generate-json-schemas.test.ts`:
```ts
import { expect, test } from "bun:test";
import { generateJsonSchemas } from "./generate-json-schemas";
test("emits one JSON Schema per zod schema with $id", () => {
  const files = generateJsonSchemas();
  expect(Object.keys(files).sort()).toEqual(["error-envelope.schema.json", "ndjson-event.schema.json", "node-pointer.schema.json", "pack.schema.json", "rule-manifest.schema.json", "support-matrix.schema.json"]);
  const parsed = JSON.parse(files["node-pointer.schema.json"] ?? "{}") as { $id?: string; additionalProperties?: boolean };
  expect(parsed.$id).toContain("node-pointer");
  expect(parsed.additionalProperties).toBe(false);
});
```

`src/interfaces/cli/schemas-generate.ts`:
```ts
import { resolve } from "node:path";
import { generateJsonSchemas } from "../../app/generate-json-schemas";
import { writeTextAtomic } from "../../infrastructure/fs-write";
import { printJson } from "./output";
const outDir = resolve(import.meta.dir, "../../../standard/schemas");
const files = generateJsonSchemas();
for (const [name, content] of Object.entries(files)) writeTextAtomic(resolve(outDir, name), content);
printJson({ schemaVersion: 1, written: Object.keys(files).sort() });
```
Nota de capas: `interfaces` importa `app` e `infrastructure`; según la regla `interfaces → app, modules`, mover la escritura a `app` si la prueba de arquitectura lo exige: crear `src/app/write-json-schemas.ts` que reciba `outDir` y use `writeTextAtomic`, y que la CLI solo llame a esa función. Hacerlo así desde el inicio.

- [ ] **Step 10: Generar y verificar**

Run: `bun run schemas:generate && ls standard/schemas && bun test src/app && printf '1.0.0\n' > standard/VERSION`
Expected: stdout `{"schemaVersion":1,"written":[...6 nombres...]}`; seis archivos `.schema.json`; tests PASS.

- [ ] **Step 11: Commit**

```bash
git add src/modules/standard src/app/generate-json-schemas.ts src/app/generate-json-schemas.test.ts src/app/write-json-schemas.ts src/infrastructure/fs-write.ts src/interfaces/cli/output.ts src/interfaces/cli/schemas-generate.ts standard/schemas standard/VERSION
git commit -m "feat(standard): add zod schemas, package name parser and JSON Schema generation"
```

---

### Task 3: Árbol de archivos en memoria y norma `STANDARD.md` es/en

**Files:**
- Create: `src/modules/standard/file-tree.ts`, `src/modules/standard/file-tree.test.ts`
- Create: `src/infrastructure/fs-tree.ts`, `src/infrastructure/fs-tree.test.ts`
- Create: `standard/STANDARD.md`, `standard/STANDARD.en.md`
- Create: `src/modules/validators/bilingual-docs.ts`, `src/modules/validators/bilingual-docs.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // file-tree.ts
  export interface FileTree { readonly files: ReadonlyMap<string, string> } // ruta relativa POSIX → contenido utf8
  export function treeFrom(entries: Record<string, string>): FileTree;
  export function listUnder(tree: FileTree, prefix: string): string[];
  // fs-tree.ts
  export function readTree(root: string, options?: { ignore?: readonly string[] }): FileTree; // ignora node_modules, dist, .git por defecto
  // validators/bilingual-docs.ts
  export function validateBilingualDocs(tree: FileTree): Finding[]; // ruleId "forge614-rule-bilingual-docs"
  ```

- [ ] **Step 1: Tests de `FileTree` y del validador bilingüe**

`src/modules/standard/file-tree.test.ts`:
```ts
import { expect, test } from "bun:test";
import { listUnder, treeFrom } from "./file-tree";
test("listUnder returns sorted relative paths under prefix", () => {
  const tree = treeFrom({ "docs/es/00-a.md": "", "docs/en/00-a.md": "", "README.md": "" });
  expect(listUnder(tree, "docs/es/")).toEqual(["docs/es/00-a.md"]);
  expect(listUnder(tree, "nope/")).toEqual([]);
});
```

`src/modules/validators/bilingual-docs.test.ts`:
```ts
import { describe, expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
import { validateBilingualDocs } from "./bilingual-docs";

describe("forge614-rule-bilingual-docs", () => {
  test("pass when every numbered es doc has an en twin with same number and headings count", () => {
    const tree = treeFrom({
      "docs/es/00-resumen.md": "# T\n\n## A\n## B\n",
      "docs/en/00-summary.md": "# T\n\n## A\n## B\n",
      "standard/STANDARD.md": "# S\n## 1\n", "standard/STANDARD.en.md": "# S\n## 1\n",
      "README.md": "x", "README.en.md": "x",
    });
    expect(validateBilingualDocs(tree).every((f) => f.verdict === "pass")).toBe(true);
  });
  test("fail on missing twin or heading count mismatch", () => {
    const tree = treeFrom({ "docs/es/01-x.md": "# T\n## A\n## B\n", "docs/en/01-x.md": "# T\n## A\n", "docs/es/02-y.md": "# T\n", "README.md": "x", "README.en.md": "x" });
    const fails = validateBilingualDocs(tree).filter((f) => f.verdict === "fail");
    expect(fails.map((f) => f.evidence).flat()).toEqual(expect.arrayContaining(["docs/es/01-x.md: 3 headings vs docs/en/01-x.md: 2", "docs/es/02-y.md: missing docs/en/02-*.md"]));
  });
});
```

- [ ] **Step 2: Ejecutar para ver el fallo**

Run: `bun test src/modules/standard/file-tree.test.ts src/modules/validators`
Expected: FAIL `Cannot find module`.

- [ ] **Step 3: Implementar `file-tree.ts`, `fs-tree.ts` y el validador**

`src/modules/standard/file-tree.ts`:
```ts
export interface FileTree { readonly files: ReadonlyMap<string, string> }
export function treeFrom(entries: Record<string, string>): FileTree {
  return { files: new Map(Object.entries(entries)) };
}
export function listUnder(tree: FileTree, prefix: string): string[] {
  return [...tree.files.keys()].filter((p) => p.startsWith(prefix)).sort();
}
export function read(tree: FileTree, path: string): string | undefined {
  return tree.files.get(path);
}
```

`src/infrastructure/fs-tree.ts`:
```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { FileTree } from "../modules/standard/file-tree";
const DEFAULT_IGNORE = ["node_modules", "dist", ".git"];
const TEXT = /\.(md|json|ts|yml|yaml|sh|ps1|txt)$/;
export function readTree(root: string, options: { ignore?: readonly string[] } = {}): FileTree {
  const ignore = new Set([...DEFAULT_IGNORE, ...(options.ignore ?? [])]);
  const files = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (ignore.has(name)) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (TEXT.test(name)) files.set(relative(root, full).split("\\").join("/"), readFileSync(full, "utf8"));
    }
  };
  walk(root);
  return { files };
}
```

`src/infrastructure/fs-tree.test.ts`:
```ts
import { expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readTree } from "./fs-tree";
test("readTree skips node_modules and binaries", () => {
  const root = mkdtempSync(join(tmpdir(), "tree-"));
  mkdirSync(join(root, "node_modules/x"), { recursive: true });
  writeFileSync(join(root, "node_modules/x/a.md"), "no");
  writeFileSync(join(root, "a.md"), "yes");
  writeFileSync(join(root, "img.png"), "bin");
  expect([...readTree(root).files.keys()]).toEqual(["a.md"]);
});
```

`src/modules/validators/bilingual-docs.ts`:
```ts
import { listUnder, read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
const RULE = "forge614-rule-bilingual-docs";
const PAIRS: ReadonlyArray<readonly [string, string]> = [["README.md", "README.en.md"], ["standard/STANDARD.md", "standard/STANDARD.en.md"], ["CONTRACT.md", "CONTRACT.en.md"]];
function headings(text: string): number { return text.split("\n").filter((l) => /^#{1,6}\s/.test(l)).length; }
export function validateBilingualDocs(tree: FileTree): Finding[] {
  const evidence: string[] = [];
  for (const [es, en] of PAIRS) {
    const a = read(tree, es); const b = read(tree, en);
    if (a !== undefined && b === undefined) evidence.push(`${es}: missing ${en}`);
  }
  for (const es of listUnder(tree, "docs/es/")) {
    const num = /docs\/es\/(\d{2})-/.exec(es)?.[1];
    if (!num) continue;
    const en = listUnder(tree, `docs/en/${num}-`)[0];
    if (!en) { evidence.push(`${es}: missing docs/en/${num}-*.md`); continue; }
    const ha = headings(read(tree, es) ?? ""); const hb = headings(read(tree, en) ?? "");
    if (ha !== hb) evidence.push(`${es}: ${ha} headings vs ${en}: ${hb}`);
  }
  return evidence.length === 0
    ? [pass(RULE, "docsParityOk")]
    : [fail(RULE, evidence, "docsParityBroken")];
}
```

- [ ] **Step 4: Ejecutar**

Run: `bun test src/modules src/infrastructure`
Expected: PASS.

- [ ] **Step 5: Escribir `standard/STANDARD.md` y `standard/STANDARD.en.md`**

Contenido: la sección 4 completa de la spec (4.1–4.12) convertida en norma autónoma, con este encabezado y numeración de secciones idéntica en ambos idiomas:

```markdown
# Estándar de Nodo Forge614 — versión 1.0.0

> Norma vinculante para todo repositorio del ecosistema Forge614. "Debe" significa que el verificador lo comprueba o que la revisión humana lo exige antes de fusionar. Las decisiones que lo originan están en `docs/decisions/` de `forge614-ai`.

## 1. Identidad y contrato del nodo
## 2. Estructura del repositorio y capas
## 3. Stack
## 4. Contratos de máquina
## 5. Patrones obligatorios
## 6. Instalación
## 7. Release, versionado y workflows
## 8. Documentación
## 9. Proceso de trabajo y registro de decisiones
## 10. Reglas de comportamiento del agente de IA
## 11. Seguridad transversal
## 12. Agentes de IA nuevos
## Anexo A. Patrones canónicos por elemento
```
Cada sección copia el texto normativo de la spec (incluida la sección 4.7 con los workflows delgados del acta 0019 y el Anexo A) sin referencias a "esta spec"; el `.en.md` es su traducción fiel con los mismos encabezados.

- [ ] **Step 6: Comprobar paridad con el validador sobre el repo real**

Run: `bun -e 'import {readTree} from "./src/infrastructure/fs-tree"; import {validateBilingualDocs} from "./src/modules/validators/bilingual-docs"; console.log(JSON.stringify(validateBilingualDocs(readTree(".")),null,1))'`
Expected: un único hallazgo con `"verdict": "pass"` (docs/es y docs/en aún no existen; se crean en la Task 11).

- [ ] **Step 7: Commit**

```bash
git add src/modules/standard/file-tree.ts src/modules/standard/file-tree.test.ts src/infrastructure/fs-tree.ts src/infrastructure/fs-tree.test.ts src/modules/validators/bilingual-docs.ts src/modules/validators/bilingual-docs.test.ts standard/STANDARD.md standard/STANDARD.en.md
git commit -m "feat(standard): add in-memory file tree, bilingual docs validator and STANDARD.md es/en"
```

---

### Task 4: Reglas como paquetes y sus validadores

**Files:**
- Create: `standard/forbidden-mentions.json`
- Create: `standard/rules/forge614-rule-<slug>/{RULE.md, RULE.en.md, manifest.json}` para: `package-naming`, `git-readonly-for-agents`, `plan-before-code`, `no-fabricated-validations`, `agent-questions-before-acting`, `no-external-product-mentions`, `never-touch-agents-dir-by-hand`, `machine-contracts`, `three-operating-systems`, `decision-records`, `bilingual-docs`, `agent-checklist-impact`, `thin-workflows`
- Create: `src/modules/validators/package-naming.ts`, `forbidden-mentions.ts`, `decision-records.ts`, `agent-checklist-impact.ts`, `error-codes.ts`, `index.ts` y sus `*.test.ts`
- Create: `src/modules/validators/rules-catalog.ts`, `rules-catalog.test.ts` (valida la carpeta `standard/rules`)

**Interfaces:**
- Produces:
  ```ts
  export type Validator = (tree: FileTree, options: ValidatorOptions) => Finding[];
  export interface ValidatorOptions { forbiddenMentions: readonly string[] }
  export const VALIDATORS: Record<string, Validator>; // id → función; ids: package-naming, forbidden-mentions, bilingual-docs, decision-records, agent-checklist-impact, error-codes
  export function validateRulesCatalog(tree: FileTree): Finding[]; // manifests válidos, nombres canónicos, RULE.md + RULE.en.md, validator existente en VALIDATORS
  ```

- [ ] **Step 1: `forbidden-mentions.json`**

```json
{ "schemaVersion": 1, "terms": ["<termino-prohibido-1>", "<termino-prohibido-2>"] }
```
(Los términos reales los escribe el propietario del producto al ejecutar esta tarea, tomándolos del acta 0012; no se transcriben en este plan para que el propio plan pase el validador. Es dato, no código; el validador excluye este archivo del escaneo.)

- [ ] **Step 2: Tests de los cinco validadores nuevos**

`src/modules/validators/package-naming.test.ts`:
```ts
import { expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
import { validatePackageNaming } from "./package-naming";
const opts = { forbiddenMentions: [] };
test("every folder under standard/rules, packs and .agents/{rules,skills,policies,mcps,plugins} is canonical", () => {
  const ok = treeFrom({ "standard/rules/forge614-rule-x/manifest.json": "{}", ".agents/skills/deploy/SKILL.md": "", ".agents/skills/forge614-skill-pdf/SKILL.md": "" });
  expect(validatePackageNaming(ok, opts)[0]?.verdict).toBe("pass");
  const bad = treeFrom({ "standard/rules/package-naming/manifest.json": "{}" });
  expect(validatePackageNaming(bad, opts)[0]?.evidence).toEqual(["standard/rules/package-naming"]);
});
```
(Regla: bajo `standard/rules` y `standard/packs` todo debe ser canónico; bajo `.agents/*` solo se exige a las carpetas que tengan `manifest.json` del Hub, porque las del usuario, como `deploy/`, no se tocan.)

`src/modules/validators/forbidden-mentions.test.ts`:
```ts
import { expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
import { validateForbiddenMentions } from "./forbidden-mentions";
test("reports file:line for each forbidden term, case-insensitive, whole word", () => {
  const tree = treeFrom({ "docs/es/01.md": "línea uno\nusa Zzzproduct aquí\n", "src/a.ts": "// zzzproductX no cuenta\n", "standard/forbidden-mentions.json": "{}" });
  const f = validateForbiddenMentions(tree, { forbiddenMentions: ["zzzproduct"] })[0];
  expect(f?.verdict).toBe("fail");
  expect(f?.evidence).toEqual(["docs/es/01.md:2: zzzproduct"]);
});
```

`src/modules/validators/decision-records.test.ts`:
```ts
import { describe, expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
import { validateDecisionRecords } from "./decision-records";
const opts = { forbiddenMentions: [] };
const rec = (n: string, estado: string) => `# ${n} — t\n\n**Fecha:** 2026-09-22\n**Estado:** ${estado}\n**Sesión:** s\n\n## Contexto\nx\n## Decisión\nx\n## Alternativas descartadas\nx\n## Consecuencias\nx\n`;
describe("forge614-rule-decision-records", () => {
  test("pass with consecutive numbering, valid states and INDEX.json listing all", () => {
    const tree = treeFrom({ "docs/decisions/0001-a.md": rec("0001", "aceptada"), "docs/decisions/0002-b.md": rec("0002", "reemplazada por 0001"), "docs/decisions/INDEX.json": JSON.stringify({ schemaVersion: 1, records: ["0001-a.md", "0002-b.md"] }) });
    expect(validateDecisionRecords(tree, opts)[0]?.verdict).toBe("pass");
  });
  test("fail on gap, bad state, missing section and record deleted vs INDEX", () => {
    const tree = treeFrom({ "docs/decisions/0001-a.md": rec("0001", "cancelada"), "docs/decisions/0003-c.md": rec("0003", "aceptada").replace("## Consecuencias\nx\n", ""), "docs/decisions/INDEX.json": JSON.stringify({ schemaVersion: 1, records: ["0001-a.md", "0002-b.md", "0003-c.md"] }) });
    const ev = validateDecisionRecords(tree, opts)[0]?.evidence ?? [];
    expect(ev).toEqual(expect.arrayContaining(["0001-a.md: invalid state 'cancelada'", "numbering gap before 0003", "0003-c.md: missing section '## Consecuencias'", "INDEX.json lists 0002-b.md but file is missing (records are never deleted)"]));
  });
});
```

`src/modules/validators/agent-checklist-impact.test.ts`:
```ts
import { expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
import { validateAgentChecklistImpact } from "./agent-checklist-impact";
const opts = { forbiddenMentions: [] };
const plan = (status: string, impact: string) => `# P\n\n**Date:** 2026-09-22\n**Type:** feature\n**Status:** ${status}\n\n## Impacto en el procedimiento de agentes\n${impact}\n## Result\nok\n`;
test("completed plans need Sí/No with content; in_progress plans are skipped", () => {
  const tree = treeFrom({ ".agents/plans/2026-09-22--a.md": plan("completed", "No — no cambia capacidades de asistentes."), ".agents/plans/2026-09-22--b.md": plan("completed", ""), ".agents/plans/2026-09-22--c.md": plan("in_progress", ""), ".agents/plans/2026-09-22--d.md": plan("completed", "Sí — Engines acepta --readable-dir; agregar validación en la sección de Engines.") });
  const ev = validateAgentChecklistImpact(tree, opts)[0]?.evidence ?? [];
  expect(ev).toEqual([".agents/plans/2026-09-22--b.md: section '## Impacto en el procedimiento de agentes' must start with 'Sí' or 'No' and explain"]);
});
```

`src/modules/validators/error-codes.test.ts` (acta 0013: todo `code` de error es `MAYUSCULAS_CON_GUION_BAJO`):
```ts
import { expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
import { validateErrorCodes } from "./error-codes";
const opts = { forbiddenMentions: [] };
test("accepts canonical codes in CONTRACT.md and source, rejects kebab-case or lowercase", () => {
  const ok = treeFrom({
    "CONTRACT.md": "## Códigos de error\n| Código | Significado |\n| --- | --- |\n| `INVALID_ARGUMENTS` | Entrada inválida |\n| `SCHEMA_UNSUPPORTED` | Versión desconocida |\n",
    "src/interfaces/cli/output.ts": 'printError("INVALID_ARGUMENTS", "x"); printError("SCHEMA_UNSUPPORTED", "y");',
  });
  expect(validateErrorCodes(ok, opts)[0]?.verdict).toBe("pass");
  const bad = treeFrom({
    "CONTRACT.md": "## Códigos de error\n| Código | Significado |\n| --- | --- |\n| `engines-outdated` | x |\n",
    "src/app/x.ts": 'printError("engines-outdated", "x"); printError("Bad_Code", "y");',
  });
  const f = validateErrorCodes(bad, opts)[0];
  expect(f?.verdict).toBe("fail");
  expect(f?.evidence).toEqual(["CONTRACT.md: engines-outdated", "src/app/x.ts:1: engines-outdated", "src/app/x.ts:1: Bad_Code"]);
});
test("passes when the repo has no CONTRACT.md and no printError calls", () => {
  expect(validateErrorCodes(treeFrom({ "README.md": "" }), opts)[0]?.verdict).toBe("pass");
});
```

- [ ] **Step 3: Ejecutar para ver los fallos**

Run: `bun test src/modules/validators`
Expected: FAIL `Cannot find module` en los cinco nuevos.

- [ ] **Step 4: Implementar los validadores**

`src/modules/validators/types.ts`:
```ts
import type { FileTree } from "../standard/file-tree";
import type { Finding } from "../standard/finding";
export interface ValidatorOptions { forbiddenMentions: readonly string[] }
export type Validator = (tree: FileTree, options: ValidatorOptions) => Finding[];
```

`package-naming.ts`:
```ts
import { PACKAGE_NAME_PATTERN } from "../standard/package-name";
import type { FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
import type { ValidatorOptions } from "./types";
const RULE = "forge614-rule-package-naming";
const STRICT_ROOTS = ["standard/rules/", "standard/packs/"];
const HUB_ROOTS = [".agents/rules/", ".agents/skills/", ".agents/policies/", ".agents/mcps/", ".agents/plugins/"];
export function validatePackageNaming(tree: FileTree, _o: ValidatorOptions): Finding[] {
  const bad = new Set<string>();
  for (const path of tree.files.keys()) {
    for (const root of STRICT_ROOTS) if (path.startsWith(root)) { const dir = path.slice(root.length).split("/")[0] ?? ""; if (!PACKAGE_NAME_PATTERN.test(dir)) bad.add(root + dir); }
    for (const root of HUB_ROOTS) if (path.startsWith(root) && path.endsWith("/manifest.json")) { const dir = path.slice(root.length).split("/")[0] ?? ""; if (!PACKAGE_NAME_PATTERN.test(dir)) bad.add(root + dir); }
  }
  return bad.size === 0 ? [pass(RULE, "packageNamesOk")] : [fail(RULE, [...bad].sort(), "packageNamesInvalid")];
}
```

`forbidden-mentions.ts`:
```ts
import type { FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
import type { ValidatorOptions } from "./types";
const RULE = "forge614-rule-no-external-product-mentions";
export function validateForbiddenMentions(tree: FileTree, o: ValidatorOptions): Finding[] {
  const evidence: string[] = [];
  const res = o.forbiddenMentions.map((t) => [t, new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i")] as const);
  for (const [path, text] of tree.files) {
    if (path === "standard/forbidden-mentions.json") continue;
    text.split("\n").forEach((line, i) => { for (const [term, re] of res) if (re.test(line)) evidence.push(`${path}:${i + 1}: ${term}`); });
  }
  return evidence.length === 0 ? [pass(RULE, "forbiddenMentionsNone")] : [fail(RULE, evidence, "forbiddenMentionsFound")];
}
```

`decision-records.ts`:
```ts
import { listUnder, read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
import type { ValidatorOptions } from "./types";
const RULE = "forge614-rule-decision-records";
const STATE_RE = /^\*\*Estado:\*\*\s*(propuesta|aceptada|revocada|reemplazada por \d{4})(\s*\(.*\))?\s*$/m;
const SECTIONS = ["## Contexto", "## Decisión", "## Alternativas descartadas", "## Consecuencias"];
export function validateDecisionRecords(tree: FileTree, _o: ValidatorOptions): Finding[] {
  const evidence: string[] = [];
  const files = listUnder(tree, "docs/decisions/").filter((p) => /docs\/decisions\/\d{4}-.+\.md$/.test(p));
  let expected = 1;
  for (const path of files) {
    const name = path.slice("docs/decisions/".length);
    const num = Number(name.slice(0, 4));
    if (num !== expected) evidence.push(`numbering gap before ${name.slice(0, 4)}`);
    expected = num + 1;
    const text = read(tree, path) ?? "";
    const state = STATE_RE.exec(text);
    if (!state) { const raw = /^\*\*Estado:\*\*\s*(.+)$/m.exec(text)?.[1] ?? "?"; evidence.push(`${name}: invalid state '${raw}'`); }
    for (const s of SECTIONS) if (!text.includes(`${s}\n`)) evidence.push(`${name}: missing section '${s}'`);
  }
  const indexRaw = read(tree, "docs/decisions/INDEX.json");
  if (indexRaw === undefined) evidence.push("docs/decisions/INDEX.json missing");
  else {
    const parsed: unknown = JSON.parse(indexRaw);
    const records = typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { records?: unknown }).records) ? ((parsed as { records: unknown[] }).records.filter((r): r is string => typeof r === "string")) : [];
    for (const r of records) if (!tree.files.has(`docs/decisions/${r}`)) evidence.push(`INDEX.json lists ${r} but file is missing (records are never deleted)`);
    for (const f of files) { const n = f.slice("docs/decisions/".length); if (!records.includes(n)) evidence.push(`INDEX.json does not list ${n}`); }
  }
  return evidence.length === 0 ? [pass(RULE, "decisionRecordsOk")] : [fail(RULE, evidence, "decisionRecordsInvalid")];
}
```
(`INDEX.json` lo genera `bun run decisions:index` en la Task 9; el validador exige que exista y que nunca pierda entradas.)

`agent-checklist-impact.ts`:
```ts
import { listUnder, read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
import type { ValidatorOptions } from "./types";
const RULE = "forge614-rule-agent-checklist-impact";
const SECTION = "## Impacto en el procedimiento de agentes";
export function validateAgentChecklistImpact(tree: FileTree, _o: ValidatorOptions): Finding[] {
  const evidence: string[] = [];
  for (const path of listUnder(tree, ".agents/plans/")) {
    const text = read(tree, path) ?? "";
    if (!/^\*\*Status:\*\*\s*completed\s*$/m.test(text)) continue;
    const start = text.indexOf(SECTION);
    const body = start < 0 ? "" : text.slice(start + SECTION.length).split(/\n## /)[0]?.trim() ?? "";
    if (!/^(Sí|No)\b.{10,}/s.test(body)) evidence.push(`${path}: section '${SECTION}' must start with 'Sí' or 'No' and explain`);
  }
  return evidence.length === 0 ? [pass(RULE, "agentImpactDeclared")] : [fail(RULE, evidence, "agentImpactMissing")];
}
```

`index.ts`:
```ts
import { validateAgentChecklistImpact } from "./agent-checklist-impact";
import { validateBilingualDocs } from "./bilingual-docs";
import { validateDecisionRecords } from "./decision-records";
import { validateErrorCodes } from "./error-codes";
import { validateForbiddenMentions } from "./forbidden-mentions";
import { validatePackageNaming } from "./package-naming";
import type { Validator } from "./types";
export type { Validator, ValidatorOptions } from "./types";
export const VALIDATORS: Record<string, Validator> = {
  "package-naming": validatePackageNaming,
  "forbidden-mentions": validateForbiddenMentions,
  "bilingual-docs": (tree) => validateBilingualDocs(tree),
  "decision-records": validateDecisionRecords,
  "agent-checklist-impact": validateAgentChecklistImpact,
  "error-codes": validateErrorCodes,
};
```
`error-codes.ts` (regla `forge614-rule-machine-contracts`, acta 0013):
```ts
import { read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
import type { ValidatorOptions } from "./types";
const RULE = "forge614-rule-machine-contracts";
export const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]+$/;
const CONTRACT_ROW = /^\|\s*`([^`]+)`\s*\|/;
const PRINT_ERROR = /printError\(\s*"([^"]+)"/g;
export function validateErrorCodes(tree: FileTree, _o: ValidatorOptions): Finding[] {
  const evidence: string[] = [];
  const contract = read(tree, "CONTRACT.md");
  if (contract !== undefined) {
    const section = contract.split(/^## /m).find((s) => s.startsWith("Códigos de error")) ?? "";
    for (const line of section.split("\n")) {
      const m = CONTRACT_ROW.exec(line);
      if (m?.[1] !== undefined && m[1] !== "Código" && !ERROR_CODE_PATTERN.test(m[1])) evidence.push(`CONTRACT.md: ${m[1]}`);
    }
  }
  for (const [path, text] of tree.files) {
    if (!path.startsWith("src/") || !path.endsWith(".ts") || path.endsWith(".test.ts")) continue;
    text.split("\n").forEach((line, i) => {
      for (const m of line.matchAll(PRINT_ERROR)) { const code = m[1] ?? ""; if (!ERROR_CODE_PATTERN.test(code)) evidence.push(`${path}:${i + 1}: ${code}`); }
    });
  }
  return evidence.length === 0 ? [pass(RULE, "errorCodesOk")] : [fail(RULE, evidence, "errorCodesInvalid")];
}
```
(Solo inspecciona `CONTRACT.md` y las llamadas `printError("...")` de `src/`; los códigos de otros nodos se validan cuando el verificador de la fase 0.2 corra sobre sus repositorios.)

- [ ] **Step 5: Ejecutar**

Run: `bun test src/modules/validators`
Expected: PASS.

- [ ] **Step 6: Test del catálogo de reglas**

`src/modules/validators/rules-catalog.test.ts`:
```ts
import { expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
import { validateRulesCatalog } from "./rules-catalog";
const manifest = (name: string, validator?: string) => JSON.stringify({ schemaVersion: 1, name, version: "1.0.0", level: "core", title: { es: "t", en: "t" }, appliesWhen: [], ...(validator ? { validator } : {}), decisions: ["0016"] });
test("catalog: manifest valid, folder = manifest.name, RULE.md + RULE.en.md, validator known", () => {
  const good = treeFrom({ "standard/rules/forge614-rule-package-naming/manifest.json": manifest("forge614-rule-package-naming", "package-naming"), "standard/rules/forge614-rule-package-naming/RULE.md": "# r", "standard/rules/forge614-rule-package-naming/RULE.en.md": "# r" });
  expect(validateRulesCatalog(good)[0]?.verdict).toBe("pass");
  const bad = treeFrom({ "standard/rules/forge614-rule-x/manifest.json": manifest("forge614-rule-y", "nope"), "standard/rules/forge614-rule-x/RULE.md": "# r" });
  expect(validateRulesCatalog(bad)[0]?.evidence).toEqual(expect.arrayContaining(["forge614-rule-x: manifest.name 'forge614-rule-y' differs from folder", "forge614-rule-x: unknown validator 'nope'", "forge614-rule-x: missing RULE.en.md"]));
});
```

- [ ] **Step 7: Implementar `rules-catalog.ts`**

```ts
import { RuleManifestSchema } from "../standard/schemas";
import { listUnder, read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
import { VALIDATORS } from "./index";
const RULE = "forge614-rule-package-naming";
export function validateRulesCatalog(tree: FileTree): Finding[] {
  const evidence: string[] = [];
  const dirs = new Set(listUnder(tree, "standard/rules/").map((p) => p.split("/")[2] ?? ""));
  for (const dir of [...dirs].sort()) {
    const base = `standard/rules/${dir}/`;
    const raw = read(tree, `${base}manifest.json`);
    if (raw === undefined) { evidence.push(`${dir}: missing manifest.json`); continue; }
    const parsed = RuleManifestSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) { evidence.push(`${dir}: invalid manifest: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`); continue; }
    if (parsed.data.name !== dir) evidence.push(`${dir}: manifest.name '${parsed.data.name}' differs from folder`);
    if (parsed.data.validator !== undefined && !(parsed.data.validator in VALIDATORS)) evidence.push(`${dir}: unknown validator '${parsed.data.validator}'`);
    if (read(tree, `${base}RULE.md`) === undefined) evidence.push(`${dir}: missing RULE.md`);
    if (read(tree, `${base}RULE.en.md`) === undefined) evidence.push(`${dir}: missing RULE.en.md`);
  }
  return evidence.length === 0 ? [pass(RULE, "rulesCatalogOk")] : [fail(RULE, evidence, "rulesCatalogInvalid")];
}
```

- [ ] **Step 8: Escribir las trece reglas**

Para cada slug, carpeta `standard/rules/forge614-rule-<slug>/` con `manifest.json`, `RULE.md`, `RULE.en.md`. Ejemplo completo (los demás siguen el mismo molde con su texto tomado de la spec §4.9–4.12 y su acta):

`standard/rules/forge614-rule-package-naming/manifest.json`:
```json
{ "schemaVersion": 1, "name": "forge614-rule-package-naming", "version": "1.0.0", "level": "core", "title": { "es": "Nombres de paquetes origen-tipo-nombre", "en": "Package names origin-kind-name" }, "appliesWhen": [], "validator": "package-naming", "decisions": ["0016"] }
```
`RULE.md`:
```markdown
# Nombres de paquetes: origen-tipo-nombre

> Como nombre y apellido: con solo leerlo sabes de quién es y qué es.

**Regla.** Todo paquete distribuido por el Hub (regla, skill, MCP, plugin, política, pack) se llama `origen-tipo-nombre`, en minúsculas y guiones: `forge614-rule-package-naming`, `anthropics-skill-pdf`. Regex: `^([a-z0-9]+)-(rule|skill|mcp|plugin|policy|pack)-([a-z0-9]+(?:-[a-z0-9]+)*)$`. En el catálogo, el identificador es `origen/tipo/nombre`.

**Alcance.** Obligatoria en `standard/rules/`, `standard/packs/` y en toda carpeta con `manifest.json` bajo `.agents/`. Las carpetas del usuario sin manifiesto no se tocan.

**Por qué.** Evita colisiones entre paquetes del usuario y del Hub y hace auditable cualquier log o libro de corridas (acta 0016).

**Verificación.** `validator: package-naming`.
```
Tabla de manifiestos (todos `level: core`, `appliesWhen: []`):

| Carpeta | validator | decisions |
|---|---|---|
| `forge614-rule-package-naming` | `package-naming` | 0016 |
| `forge614-rule-git-readonly-for-agents` | — | 0015 |
| `forge614-rule-plan-before-code` | — | 0015 |
| `forge614-rule-no-fabricated-validations` | — | 0015 |
| `forge614-rule-agent-questions-before-acting` | — | 0014 |
| `forge614-rule-no-external-product-mentions` | `forbidden-mentions` | 0012 |
| `forge614-rule-never-touch-agents-dir-by-hand` | — | 0005 |
| `forge614-rule-machine-contracts` | `error-codes` | 0013 |
| `forge614-rule-three-operating-systems` | — | 0018 |
| `forge614-rule-decision-records` | `decision-records` | 0015 |
| `forge614-rule-bilingual-docs` | `bilingual-docs` | 0016 |
| `forge614-rule-agent-checklist-impact` | `agent-checklist-impact` | 0017 |
| `forge614-rule-thin-workflows` | — (el validador `workflows` llega en la Task 8) | 0019 |

Cada `RULE.md` lleva: analogía de una línea, **Regla**, **Alcance**, **Por qué** (con acta), **Verificación** (validador o "revisión humana"). El `.en.md` es traducción fiel.

- [ ] **Step 9: Ejecutar catálogo contra el repo real**

Run: `bun test src/modules/validators && bun -e 'import {readTree} from "./src/infrastructure/fs-tree"; import {validateRulesCatalog} from "./src/modules/validators/rules-catalog"; console.log(JSON.stringify(validateRulesCatalog(readTree(".")),null,1))'`
Expected: tests PASS; `"verdict": "pass"` para las trece reglas.

- [ ] **Step 10: Commit**

```bash
git add standard/forbidden-mentions.json standard/rules src/modules/validators
git commit -m "feat(standard): add core rules as packages with validators"
```

---

### Task 5: Pack de nodo del ecosistema

**Files:**
- Create: `standard/packs/forge614-pack-ecosystem-node/pack.json`
- Create: `src/modules/validators/packs-catalog.ts`, `packs-catalog.test.ts`
- Modify: `src/modules/validators/index.ts` (no se registra como validador de regla; se llama desde `run-validators`)

**Interfaces:**
- Produces: `export function validatePacksCatalog(tree: FileTree): Finding[]` — cada `pack.json` valida contra `PackSchema`, carpeta = `name`, y cada regla listada existe en `standard/rules/`.

- [ ] **Step 1: Test**

`src/modules/validators/packs-catalog.test.ts`:
```ts
import { expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
import { validatePacksCatalog } from "./packs-catalog";
const pack = (rules: string[]) => JSON.stringify({ schemaVersion: 1, name: "forge614-pack-ecosystem-node", version: "1.0.0", title: { es: "n", en: "n" }, rules });
test("pack rules must exist", () => {
  const ok = treeFrom({ "standard/packs/forge614-pack-ecosystem-node/pack.json": pack(["forge614-rule-a"]), "standard/rules/forge614-rule-a/manifest.json": "{}" });
  expect(validatePacksCatalog(ok)[0]?.verdict).toBe("pass");
  const bad = treeFrom({ "standard/packs/forge614-pack-ecosystem-node/pack.json": pack(["forge614-rule-zzz"]) });
  expect(validatePacksCatalog(bad)[0]?.evidence).toEqual(["forge614-pack-ecosystem-node: rule 'forge614-rule-zzz' not found in standard/rules"]);
});
```

- [ ] **Step 2: Ejecutar para ver el fallo**

Run: `bun test src/modules/validators/packs-catalog.test.ts`
Expected: FAIL `Cannot find module`.

- [ ] **Step 3: Implementar**

```ts
import { PackSchema } from "../standard/schemas";
import { listUnder, read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
const RULE = "forge614-rule-package-naming";
export function validatePacksCatalog(tree: FileTree): Finding[] {
  const evidence: string[] = [];
  for (const path of listUnder(tree, "standard/packs/").filter((p) => p.endsWith("/pack.json"))) {
    const dir = path.split("/")[2] ?? "";
    const parsed = PackSchema.safeParse(JSON.parse(read(tree, path) ?? "{}"));
    if (!parsed.success) { evidence.push(`${dir}: invalid pack.json`); continue; }
    if (parsed.data.name !== dir) evidence.push(`${dir}: pack name '${parsed.data.name}' differs from folder`);
    for (const rule of parsed.data.rules) if (!tree.files.has(`standard/rules/${rule}/manifest.json`)) evidence.push(`${dir}: rule '${rule}' not found in standard/rules`);
  }
  return evidence.length === 0 ? [pass(RULE, "packsOk")] : [fail(RULE, evidence, "packsInvalid")];
}
```

`standard/packs/forge614-pack-ecosystem-node/pack.json`:
```json
{
  "schemaVersion": 1,
  "name": "forge614-pack-ecosystem-node",
  "version": "1.0.0",
  "title": { "es": "Reglas para repositorios del ecosistema Forge614", "en": "Rules for Forge614 ecosystem repositories" },
  "rules": [
    "forge614-rule-package-naming", "forge614-rule-git-readonly-for-agents", "forge614-rule-plan-before-code",
    "forge614-rule-no-fabricated-validations", "forge614-rule-agent-questions-before-acting", "forge614-rule-no-external-product-mentions",
    "forge614-rule-never-touch-agents-dir-by-hand", "forge614-rule-machine-contracts", "forge614-rule-three-operating-systems",
    "forge614-rule-decision-records", "forge614-rule-bilingual-docs", "forge614-rule-agent-checklist-impact", "forge614-rule-thin-workflows"
  ]
}
```

- [ ] **Step 4: Ejecutar**

Run: `bun test src/modules/validators/packs-catalog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add standard/packs src/modules/validators/packs-catalog.ts src/modules/validators/packs-catalog.test.ts
git commit -m "feat(standard): add forge614-pack-ecosystem-node and pack catalog validation"
```

---

### Task 6: Plantillas de nodo y renderizador

**Files:**
- Create: `src/modules/standard/template.ts`, `template.test.ts`
- Create: `src/app/render-templates.ts`, `render-templates.test.ts`
- Create: `src/infrastructure/process.ts`, `process.test.ts`
- Create: `src/interfaces/cli/standard-render.ts`
- Create: `standard/templates/install.sh`, `install.ps1`, `verify.yml`, `release.yml`, `CONTRACT.md`, `CONTRACT.en.md`, `README.md`, `README.en.md`, `decision.md`, `plan.md`, `hooks/pre-push`, `BRANCH_PROTECTION.md`, `BRANCH_PROTECTION.en.md`, `docs-workflows.md`, `docs-workflows.en.md`

**Interfaces:**
- Produces:
  ```ts
  // template.ts
  export function renderTemplate(content: string, vars: Readonly<Record<string, string>>): string; // {{NAME}} → valor; lanza si queda alguno sin sustituir
  export function placeholdersOf(content: string): string[];
  // render-templates.ts
  export interface NodeVars { NODE_NAME: string; NODE_TITLE: string; REPO: string; ASSET_PREFIX: string; STANDARD_VERSION: string }
  export function renderNodeFiles(templates: FileTree, vars: NodeVars): Record<string, string>; // ruta destino → contenido
  // process.ts
  export function run(cmd: string[], options?: { cwd?: string; stdin?: string; timeoutMs?: number }): { exitCode: number; stdout: string; stderr: string };
  ```
- Rutas destino que produce `renderNodeFiles`: `install.sh`, `install.ps1`, `.github/workflows/verify.yml`, `.github/workflows/release.yml`, `CONTRACT.md`, `CONTRACT.en.md`, `README.md`, `README.en.md`, `docs/decisions/TEMPLATE.md`, `.agents/templates/plan.md`, `.githooks/pre-push`, `BRANCH_PROTECTION.md`, `BRANCH_PROTECTION.en.md`, `docs/es/NN-workflows.md`, `docs/en/NN-workflows.md` (el `NN` se deja literal: cada nodo lo numera al colocarlo).

- [ ] **Step 1: Tests del renderizador puro**

`src/modules/standard/template.test.ts`:
```ts
import { expect, test } from "bun:test";
import { placeholdersOf, renderTemplate } from "./template";
test("replaces {{VAR}} and lists placeholders", () => {
  expect(placeholdersOf("a {{X}} b {{Y_2}} {{X}}")).toEqual(["X", "Y_2"]);
  expect(renderTemplate("hi {{NODE_NAME}}", { NODE_NAME: "engram" })).toBe("hi engram");
});
test("throws on unresolved placeholder", () => {
  expect(() => renderTemplate("{{NODE_NAME}} {{MISSING}}", { NODE_NAME: "x" })).toThrow("unresolved placeholders: MISSING");
});
```

- [ ] **Step 2: Ejecutar para ver el fallo**

Run: `bun test src/modules/standard/template.test.ts`
Expected: FAIL `Cannot find module`.

- [ ] **Step 3: Implementar `template.ts`**

```ts
const PLACEHOLDER = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;
export function placeholdersOf(content: string): string[] {
  return [...new Set([...content.matchAll(PLACEHOLDER)].map((m) => m[1] ?? ""))];
}
export function renderTemplate(content: string, vars: Readonly<Record<string, string>>): string {
  const out = content.replace(PLACEHOLDER, (whole, name: string) => (name in vars ? (vars[name] ?? whole) : whole));
  const left = placeholdersOf(out);
  if (left.length > 0) throw new Error(`unresolved placeholders: ${left.join(", ")}`);
  return out;
}
```

- [ ] **Step 4: Ejecutar**

Run: `bun test src/modules/standard/template.test.ts`
Expected: PASS.

- [ ] **Step 5: Escribir las plantillas**

`standard/templates/install.sh` (patrón: prefijo versionado con lanzador estable; sin Node ni Python):
```bash
#!/usr/bin/env bash
# Forge614 node installer — rendered from forge614-ai/standard/templates/install.sh (standard {{STANDARD_VERSION}}).
# Usage: install.sh [--version X.Y.Z] [--archive path.tar.gz] [--uninstall]
set -euo pipefail

NODE_NAME="{{NODE_NAME}}"
REPO="{{REPO}}"
ASSET_PREFIX="{{ASSET_PREFIX}}"
FORGE614_HOME="${FORGE614_HOME:-$HOME/.forge614}"
NODE_HOME="$FORGE614_HOME/$NODE_NAME"
BIN_DIR="$NODE_HOME/bin"
LAUNCHER="$BIN_DIR/forge614-$NODE_NAME"

log() { printf '%s\n' "$*" >&2; }
die() { log "error: $*"; exit 1; }

VERSION=""; ARCHIVE=""; UNINSTALL=0
while [ $# -gt 0 ]; do
  case "$1" in
    --version) VERSION="$2"; shift 2 ;;
    --archive) ARCHIVE="$2"; shift 2 ;;
    --uninstall) UNINSTALL=1; shift ;;
    *) die "unknown argument: $1" ;;
  esac
done

if [ "$UNINSTALL" = "1" ]; then
  if [ -x "$LAUNCHER" ]; then "$LAUNCHER" uninstall --self || die "node refused to uninstall its integrations; nothing removed"; fi
  rm -rf "$NODE_HOME"
  log "removed $NODE_HOME"
  exit 0
fi

# Migración de instalaciones anteriores al estándar: instalación plana ($BIN_DIR/forge614-<node> como
# binario real, sin prefijo versionado) y bloques PATH marcados en los perfiles de shell. Un nodo alineado
# nunca edita PATH: solo forge614-ai crea el comando global. El perfil se respalda antes de tocarlo.
MARK_BEGIN="# >>> forge614-$NODE_NAME PATH >>>"
MARK_END="# <<< forge614-$NODE_NAME PATH <<<"
remove_path_block() {
  local file="$1"
  [ -f "$file" ] || return 0
  grep -qF "$MARK_BEGIN" "$file" || return 0
  cp "$file" "$file.forge614-backup-$(date +%Y%m%d%H%M%S)"
  awk -v b="$MARK_BEGIN" -v e="$MARK_END" '$0==b{skip=1;next} $0==e{skip=0;next} !skip' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  log "removed legacy PATH block from $file (backup kept next to it)"
}
migrate_legacy_install() {
  if [ -f "$LAUNCHER" ] && [ ! -L "$LAUNCHER" ]; then
    local legacy="$NODE_HOME/legacy-$(date +%Y%m%d%H%M%S)"
    mkdir -p "$legacy" && mv "$LAUNCHER" "$legacy/forge614-$NODE_NAME"
    log "moved flat install to $legacy (kept until the new version verifies)"
  fi
  for f in "$HOME/.zshrc" "$HOME/.bash_profile" "$HOME/.bashrc" "$HOME/.profile" "$HOME/.config/fish/conf.d/forge614-$NODE_NAME.fish"; do remove_path_block "$f"; done
  [ -f "$HOME/.config/fish/conf.d/forge614-$NODE_NAME.fish" ] && [ ! -s "$HOME/.config/fish/conf.d/forge614-$NODE_NAME.fish" ] && rm -f "$HOME/.config/fish/conf.d/forge614-$NODE_NAME.fish"
  return 0
}

platform() {
  local os arch
  case "$(uname -s)" in Darwin) os=darwin ;; Linux) os=linux ;; *) die "unsupported OS $(uname -s)" ;; esac
  case "$(uname -m)" in arm64|aarch64) arch=arm64 ;; x86_64|amd64) arch=x64 ;; *) die "unsupported arch $(uname -m)" ;; esac
  printf '%s-%s' "$os" "$arch"
}

resolve_version() {
  # Sin Node ni Python: la API de releases devuelve "tag_name": "vX.Y.Z"; se extrae con sed.
  curl -fsSL -H 'Accept: application/vnd.github+json' "https://api.github.com/repos/$REPO/releases/latest" \
    | sed -n 's/.*"tag_name": *"v\([0-9][0-9.]*\)".*/\1/p' | head -n1
}

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
PLATFORM="$(platform)"
if [ -z "$ARCHIVE" ]; then
  [ -n "$VERSION" ] || VERSION="$(resolve_version)"
  [ -n "$VERSION" ] || die "could not resolve latest version"
  BASE="https://github.com/$REPO/releases/download/v$VERSION"
  ASSET="$ASSET_PREFIX-$PLATFORM.tar.gz"
  curl -fsSL --proto '=https' --tlsv1.2 -o "$TMP/$ASSET" "$BASE/$ASSET"
  curl -fsSL --proto '=https' --tlsv1.2 -o "$TMP/SHA256SUMS" "$BASE/SHA256SUMS"
  ( cd "$TMP" && grep " $ASSET\$" SHA256SUMS | sha256sum -c - >/dev/null 2>&1 || shasum -a 256 -c <(grep " $ASSET\$" SHA256SUMS) >/dev/null ) || die "checksum mismatch for $ASSET"
  ARCHIVE="$TMP/$ASSET"
else
  [ -n "$VERSION" ] || die "--archive requires --version"
fi

migrate_legacy_install
DEST="$NODE_HOME/$VERSION"
mkdir -p "$DEST" "$BIN_DIR"
tar -xzf "$ARCHIVE" -C "$DEST"
chmod 0755 "$DEST/forge614-$NODE_NAME"
ln -sfn "$DEST/forge614-$NODE_NAME" "$LAUNCHER"
printf '%s\n' "$VERSION" > "$NODE_HOME/.active-version"
"$LAUNCHER" --version >/dev/null || die "installed binary does not run"
log "installed forge614-$NODE_NAME $VERSION at $DEST (launcher: $LAUNCHER)"
```

`standard/templates/install.ps1`:
```powershell
# Forge614 node installer (Windows) — rendered from forge614-ai/standard/templates/install.ps1 (standard {{STANDARD_VERSION}}).
param([string]$Version = "", [string]$Archive = "", [switch]$Uninstall)
$ErrorActionPreference = "Stop"
$NodeName = "{{NODE_NAME}}"; $Repo = "{{REPO}}"; $AssetPrefix = "{{ASSET_PREFIX}}"
$Forge614Home = if ($env:FORGE614_HOME) { $env:FORGE614_HOME } else { Join-Path $HOME ".forge614" }
$NodeHome = Join-Path $Forge614Home $NodeName
$BinDir = Join-Path $NodeHome "bin"
$Launcher = Join-Path $BinDir "forge614-$NodeName.exe"

if ($Uninstall) {
  if (Test-Path $Launcher) { & $Launcher uninstall --self; if ($LASTEXITCODE -ne 0) { throw "node refused to uninstall its integrations; nothing removed" } }
  if (Test-Path $NodeHome) { Remove-Item -Recurse -Force $NodeHome }
  Write-Host "removed $NodeHome"; exit 0
}

$Arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { throw "unsupported architecture" }
$Platform = "windows-$Arch"
$Tmp = Join-Path ([IO.Path]::GetTempPath()) ("forge614-" + [Guid]::NewGuid())
New-Item -ItemType Directory -Path $Tmp | Out-Null
try {
  if (-not $Archive) {
    if (-not $Version) {
      $Release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -Headers @{ Accept = "application/vnd.github+json" }
      $Version = $Release.tag_name.TrimStart("v")
    }
    $Base = "https://github.com/$Repo/releases/download/v$Version"
    $Asset = "$AssetPrefix-$Platform.zip"
    Invoke-WebRequest -Uri "$Base/$Asset" -OutFile (Join-Path $Tmp $Asset)
    Invoke-WebRequest -Uri "$Base/SHA256SUMS" -OutFile (Join-Path $Tmp "SHA256SUMS")
    $Expected = (Get-Content (Join-Path $Tmp "SHA256SUMS") | Where-Object { $_ -match " $([regex]::Escape($Asset))$" }) -split "\s+" | Select-Object -First 1
    $Actual = (Get-FileHash -Algorithm SHA256 (Join-Path $Tmp $Asset)).Hash.ToLower()
    if ($Expected -ne $Actual) { throw "checksum mismatch for $Asset" }
    $Archive = Join-Path $Tmp $Asset
  } elseif (-not $Version) { throw "-Archive requires -Version" }
  $Dest = Join-Path $NodeHome $Version
  New-Item -ItemType Directory -Force -Path $Dest, $BinDir | Out-Null
  Expand-Archive -Path $Archive -DestinationPath $Dest -Force
  Copy-Item (Join-Path $Dest "forge614-$NodeName.exe") $Launcher -Force
  Set-Content -Path (Join-Path $NodeHome ".active-version") -Value $Version
  & $Launcher --version | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "installed binary does not run" }
  Write-Host "installed forge614-$NodeName $Version at $Dest"
} finally { Remove-Item -Recurse -Force $Tmp -ErrorAction SilentlyContinue }
```
(En Windows el lanzador es una copia, no un enlace, para no depender de privilegios de symlink.)

`standard/templates/verify.yml` (delgado: cada paso solo llama scripts; acciones fijadas por SHA):
```yaml
name: verify
on:
  push: { branches: [main] }
  pull_request:
jobs:
  verify:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@34e114876b0b11a390a9f2f37d3e4bb0e8a0a8bb # v4.3.1
      - uses: oven-sh/setup-bun@735343b667d3e6f658f44d0eca948eb6282f2b76 # v2.0.2
        with: { bun-version: "1.3.8" }
      - run: bun install --frozen-lockfile
      - run: bun run verify
```
(Los SHA se toman de los tags indicados el día que se renderiza y se registran en `docs/es/NN-workflows.md`; el validador de la Task 8 exige 40 hex.)

`standard/templates/release.yml`:
```yaml
name: release
on:
  push: { tags: ["v*"] }
jobs:
  build:
    strategy:
      matrix:
        include:
          - { os: macos-15, target: darwin-arm64 }
          - { os: macos-15-large, target: darwin-x64 }
          - { os: ubuntu-24.04-arm, target: linux-arm64 }
          - { os: ubuntu-24.04, target: linux-x64 }
          - { os: windows-2025, target: windows-x64 }
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@34e114876b0b11a390a9f2f37d3e4bb0e8a0a8bb # v4.3.1
      - uses: oven-sh/setup-bun@735343b667d3e6f658f44d0eca948eb6282f2b76 # v2.0.2
        with: { bun-version: "1.3.8" }
      - run: bun install --frozen-lockfile
      - run: bun run build:target
        env: { FORGE614_TARGET: "${{ matrix.target }}" }
      - run: bun run smoke:target
        env: { FORGE614_TARGET: "${{ matrix.target }}" }
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with: { name: "${{ matrix.target }}", path: dist/release/* }
  publish:
    needs: build
    runs-on: ubuntu-24.04
    permissions: { contents: write }
    steps:
      - uses: actions/checkout@34e114876b0b11a390a9f2f37d3e4bb0e8a0a8bb # v4.3.1
      - uses: oven-sh/setup-bun@735343b667d3e6f658f44d0eca948eb6282f2b76 # v2.0.2
        with: { bun-version: "1.3.8" }
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with: { path: dist/release, merge-multiple: true }
      - run: bun install --frozen-lockfile
      - run: bun run release:publish
```
(`build:target`, `smoke:target` y `release:publish` son scripts que el paquete `bun release` compartido aporta a cada nodo en la fase 0.4; la plantilla solo los invoca. El validador acepta `bun run <script>` con `env:` declarado.)

**Precondición de la plantilla de release:** el nodo no puede tener dependencias `file:../` a repositorios hermanos en `package.json`; el workflow hace checkout de un solo repositorio y `bun install --frozen-lockfile` fallaría. Un nodo con esa dependencia (hoy Atlas con `forge614-engram`) la sustituye por la versión publicada antes de adoptar la plantilla. Se documenta en `docs/*/NN-workflows.md` de plantilla como requisito.

`standard/templates/CONTRACT.md`:
```markdown
# Contrato de {{NODE_TITLE}} (`forge614-{{NODE_NAME}}`)

> Analogía en una frase: <completar>.

## Propósito
Una frase.

## Qué hace
- …

## Qué no hace
- …

## Dependencias
| Nodo o binario | Cómo se consume | Versión mínima |
| --- | --- | --- |

## Comandos públicos
| Comando | Entrada (esquema) | Salida (esquema) | `schemaVersion` | Códigos de salida |
| --- | --- | --- | --- | --- |

## Códigos de error
| Código | Significado |
| --- | --- |

## Requisitos obligatorios para asistentes de IA soportados
Sección `{{NODE_NAME}}` de `standard/procedures/new-agent-checklist.md` (estándar {{STANDARD_VERSION}}).

## Compatibilidad
Cambios incompatibles suben `schemaVersion`; se mantiene una versión de compatibilidad.
```
`CONTRACT.en.md`: misma estructura en inglés.

`standard/templates/README.md` / `README.en.md`: analogía, qué es, qué no es, instalación (`curl -fsSL https://github.com/{{REPO}}/releases/latest/download/install.sh | bash` y el `.ps1`), tabla de documentación `00–NN` es/en, enlace a `CONTRACT.md`.

`standard/templates/decision.md`: copia exacta de `docs/decisions/TEMPLATE.md`.

`standard/templates/plan.md`: la plantilla de plan del monorepo (secciones `Date`, `Type`, `Status`, `Objective`, `Context`, `Scope`, `Out of scope`, `Decisions`, `Affected apps/packages`, `Current versions → target versions`, `Granular checklist`, `Current state`, `Next step`, `Documentation affected`, `Validations`, `Result`) más, entre `Documentation affected` y `Validations`:
```markdown
## Impacto en el procedimiento de agentes

`Sí` o `No`, seguido de la explicación. Si es `Sí`: qué validación nueva exige a los asistentes y qué sección del procedimiento central cambia. Sin esta sección con contenido real, el plan no puede cerrarse.
```

`standard/templates/hooks/pre-push`:
```bash
#!/usr/bin/env bash
# Forge614 pre-push hook: run locally exactly what CI's verify workflow runs.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
bun run workflows:run --workflow verify
```

`standard/templates/BRANCH_PROTECTION.md`:
```markdown
# Protección de la rama `main`

Configuración exacta que debe tener el repositorio (Settings → Rules → Rulesets, o Branch protection):

| Ajuste | Valor |
| --- | --- |
| Rama protegida | `main` |
| Requiere pull request antes de fusionar | Sí; 1 aprobación mínima; descartar aprobaciones obsoletas |
| Status checks requeridos | `verify` (workflow `verify.yml`), actualizado con la base |
| Push directo a `main` | Prohibido para todos, incluidos administradores |
| Force push y borrado de `main` | Prohibidos |
| Historial lineal | Requerido |
| Firmas de commit | Recomendado |

Además, cada persona instala el gancho local: `git config core.hooksPath .githooks`.
```
`BRANCH_PROTECTION.en.md`: traducción fiel.

`standard/templates/docs-workflows.md` (se coloca como `docs/es/NN-workflows.md`):
```markdown
# NN — Workflows de integración y release

> Como la lista de control de un vuelo: cada paso está escrito, se ejecuta igual en tierra (local) que en el aire (CI), y nadie despega sin completarla.

## `verify.yml`
| Job | Disparador | Qué ejecuta | Qué valida | Duración esperada |
| --- | --- | --- | --- | --- |
| `verify` | push a `main`, pull request | `bun install --frozen-lockfile`, `bun run verify` | typecheck, tests, validadores del estándar, workflows | ~3 min |

## `release.yml`
| Job | Disparador | Qué ejecuta | Qué publica | Duración esperada |
| --- | --- | --- | --- | --- |
| `build` | tag `v*` | `bun run build:target`, `bun run smoke:target` en macOS arm64/x64, Linux arm64/x64, Windows x64 | artefactos por plataforma | ~8 min |
| `publish` | tras `build` | `bun run release:publish` | release con binarios y `SHA256SUMS` | ~1 min |

## Ejecutar en local
`bun run workflows:run --workflow verify` ejecuta, en orden, los mismos scripts que el job `verify`. El gancho `pre-push` lo hace automáticamente.

## Acciones fijadas
| Acción | Versión | SHA |
| --- | --- | --- |
| actions/checkout | v4.3.1 | 34e114876b0b11a390a9f2f37d3e4bb0e8a0a8bb |
| oven-sh/setup-bun | v2.0.2 | 735343b667d3e6f658f44d0eca948eb6282f2b76 |
| actions/upload-artifact | v4.6.2 | ea165f8d65b6e75b540449e92b4886f43607fa02 |
| actions/download-artifact | v4.3.0 | d3f86a106a0bac45b974a628896c90dbdf5c8093 |
```
`docs-workflows.en.md`: traducción fiel con los mismos encabezados y la columna `Job`.

- [ ] **Step 6: Tests del renderizado de nodo y de `run`**

`src/infrastructure/process.test.ts`:
```ts
import { expect, test } from "bun:test";
import { run } from "./process";
test("run captures stdout and exit code", () => {
  const r = run(["bash", "-c", "printf hi; exit 3"]);
  expect(r.stdout).toBe("hi"); expect(r.exitCode).toBe(3);
});
```

`src/app/render-templates.test.ts`:
```ts
import { expect, test } from "bun:test";
import { readTree } from "../infrastructure/fs-tree";
import { run } from "../infrastructure/process";
import { placeholdersOf } from "../modules/standard/template";
import { renderNodeFiles } from "./render-templates";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const vars = { NODE_NAME: "demo", NODE_TITLE: "Demo", REPO: "jotredev/forge614-demo", ASSET_PREFIX: "forge614-demo", STANDARD_VERSION: "1.0.0" };

test("renders every template with no placeholder left and expected destinations", () => {
  const templates = readTree("standard/templates");
  const files = renderNodeFiles(templates, vars);
  expect(Object.keys(files).sort()).toEqual([".agents/templates/plan.md", ".githooks/pre-push", ".github/workflows/release.yml", ".github/workflows/verify.yml", "BRANCH_PROTECTION.en.md", "BRANCH_PROTECTION.md", "CONTRACT.en.md", "CONTRACT.md", "README.en.md", "README.md", "docs/decisions/TEMPLATE.md", "docs/en/NN-workflows.md", "docs/es/NN-workflows.md", "install.ps1", "install.sh"]);
  for (const [path, content] of Object.entries(files)) expect(placeholdersOf(content), path).toEqual([]);
  expect(files["install.sh"]).toContain('NODE_NAME="demo"');
});

test("rendered install.sh passes bash -n", () => {
  const files = renderNodeFiles(readTree("standard/templates"), vars);
  const dir = mkdtempSync(join(tmpdir(), "render-"));
  writeFileSync(join(dir, "install.sh"), files["install.sh"] ?? "");
  expect(run(["bash", "-n", join(dir, "install.sh")]).exitCode).toBe(0);
});

test("install.sh migrates a flat install and removes the legacy PATH block with a backup", () => {
  const files = renderNodeFiles(readTree("standard/templates"), vars);
  const home = mkdtempSync(join(tmpdir(), "home-"));
  const nodeHome = join(home, ".forge614", "demo");
  mkdirSync(join(nodeHome, "bin"), { recursive: true });
  writeFileSync(join(nodeHome, "bin", "forge614-demo"), "#!/bin/sh\necho legacy\n", { mode: 0o755 });
  writeFileSync(join(home, ".zshrc"), "export A=1\n# >>> forge614-demo PATH >>>\nexport PATH=\"$HOME/.forge614/demo/bin:$PATH\"\n# <<< forge614-demo PATH <<<\nexport B=2\n");
  const script = join(home, "install.sh");
  writeFileSync(script, files["install.sh"] ?? "", { mode: 0o755 });
  // Se ejecuta solo la parte de migración: bash -c carga las funciones del script y llama migrate_legacy_install.
  const r = run(["bash", "-c", `HOME='${home}' FORGE614_HOME='${home}/.forge614'; export HOME FORGE614_HOME; source <(sed -n '1,/^platform()/p' '${script}' | grep -v '^platform()'); migrate_legacy_install`]);
  expect(r.exitCode).toBe(0);
  expect(readFileSync(join(home, ".zshrc"), "utf8")).toBe("export A=1\nexport B=2\n");
  expect(readdirSync(home).some((n) => n.startsWith(".zshrc.forge614-backup-"))).toBe(true);
  expect(existsSync(join(nodeHome, "bin", "forge614-demo"))).toBe(false);
  expect(readdirSync(nodeHome).some((n) => n.startsWith("legacy-"))).toBe(true);
});
```

- [ ] **Step 7: Ejecutar para ver los fallos**

Run: `bun test src/infrastructure/process.test.ts src/app/render-templates.test.ts`
Expected: FAIL `Cannot find module`.

- [ ] **Step 8: Implementar `process.ts`, `render-templates.ts` y la CLI**

`src/infrastructure/process.ts`:
```ts
export function run(cmd: string[], options: { cwd?: string; stdin?: string; timeoutMs?: number } = {}): { exitCode: number; stdout: string; stderr: string } {
  const proc = Bun.spawnSync(cmd, { cwd: options.cwd, stdin: options.stdin === undefined ? "ignore" : new TextEncoder().encode(options.stdin), stdout: "pipe", stderr: "pipe", timeout: options.timeoutMs ?? 600_000 });
  return { exitCode: proc.exitCode, stdout: new TextDecoder().decode(proc.stdout), stderr: new TextDecoder().decode(proc.stderr) };
}
```

`src/app/render-templates.ts`:
```ts
import { read, type FileTree } from "../modules/standard/file-tree";
import { renderTemplate } from "../modules/standard/template";
export interface NodeVars { NODE_NAME: string; NODE_TITLE: string; REPO: string; ASSET_PREFIX: string; STANDARD_VERSION: string }
const DESTINATIONS: ReadonlyArray<readonly [string, string]> = [
  ["install.sh", "install.sh"], ["install.ps1", "install.ps1"],
  ["verify.yml", ".github/workflows/verify.yml"], ["release.yml", ".github/workflows/release.yml"],
  ["CONTRACT.md", "CONTRACT.md"], ["CONTRACT.en.md", "CONTRACT.en.md"],
  ["README.md", "README.md"], ["README.en.md", "README.en.md"],
  ["decision.md", "docs/decisions/TEMPLATE.md"], ["plan.md", ".agents/templates/plan.md"],
  ["hooks/pre-push", ".githooks/pre-push"],
  ["BRANCH_PROTECTION.md", "BRANCH_PROTECTION.md"], ["BRANCH_PROTECTION.en.md", "BRANCH_PROTECTION.en.md"],
  ["docs-workflows.md", "docs/es/NN-workflows.md"], ["docs-workflows.en.md", "docs/en/NN-workflows.md"],
];
export function renderNodeFiles(templates: FileTree, vars: NodeVars): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [src, dest] of DESTINATIONS) {
    const content = read(templates, src);
    if (content === undefined) throw new Error(`template missing: ${src}`);
    out[dest] = renderTemplate(content, vars);
  }
  return out;
}
```

`src/interfaces/cli/standard-render.ts`:
```ts
import { resolve } from "node:path";
import { z } from "zod";
import { renderNodeFiles } from "../../app/render-templates";
import { writeRenderedFiles } from "../../app/write-rendered-files";
import { printError, printJson } from "./output";
const Args = z.object({ node: z.string().regex(/^[a-z0-9-]+$/), out: z.string().min(1), repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/).optional(), title: z.string().optional() }).strict();
function parseArgs(argv: string[]): Record<string, string> { const o: Record<string, string> = {}; for (let i = 0; i < argv.length; i += 2) { const k = argv[i]; const v = argv[i + 1]; if (k?.startsWith("--") && v !== undefined) o[k.slice(2)] = v; } return o; }
const argv = process.argv.slice(2);
if (argv.includes("--help")) { printJson({ schemaVersion: 1, usage: "standard-render --node <name> --out <dir> [--repo owner/repo] [--title Title]" }); process.exit(0); }
const parsed = Args.safeParse(parseArgs(argv));
if (!parsed.success) { printError("INVALID_ARGUMENTS", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")); process.exit(2); }
const { node, out, repo, title } = parsed.data;
const standardVersion = (await Bun.file(resolve(import.meta.dir, "../../../standard/VERSION")).text()).trim();
const files = renderNodeFiles(await (await import("../../infrastructure/fs-tree")).readTree(resolve(import.meta.dir, "../../../standard/templates")), { NODE_NAME: node, NODE_TITLE: title ?? node, REPO: repo ?? `jotredev/forge614-${node}`, ASSET_PREFIX: `forge614-${node}`, STANDARD_VERSION: standardVersion });
const written = writeRenderedFiles(out, files);
printJson({ schemaVersion: 1, node, out, written });
```
(`writeRenderedFiles(outDir, files)` en `src/app/write-rendered-files.ts` usa `writeTextAtomic` de `infrastructure/fs-write` y marca `0755` `install.sh` y `.githooks/pre-push`. Nota de capas: la CLI importa `infrastructure/fs-tree` directamente; para respetar `interfaces → app`, exponer `readTemplatesTree(root)` desde `app/render-templates.ts` y usar esa función en la CLI.)

- [ ] **Step 9: Ejecutar tests y un render real**

Run: `bun test src/infrastructure src/app src/modules && bun run standard:render --node demo --out /tmp/forge614-demo && ls -R /tmp/forge614-demo | head -30`
Expected: tests PASS; JSON con 15 rutas escritas; el árbol muestra `.github/workflows`, `install.sh`, `CONTRACT.md`, etc.

- [ ] **Step 10: Commit**

```bash
git add standard/templates src/modules/standard/template.ts src/modules/standard/template.test.ts src/app/render-templates.ts src/app/render-templates.test.ts src/app/write-rendered-files.ts src/infrastructure/process.ts src/infrastructure/process.test.ts src/interfaces/cli/standard-render.ts
git commit -m "feat(standard): add node templates (installers, thin workflows, contract, docs, hooks) and renderer"
```

---

### Task 7: Matriz de soporte inicial

**Files:**
- Create: `standard/support-matrix.json`
- Create: `src/modules/validators/support-matrix.ts`, `support-matrix.test.ts`

**Interfaces:**
- Produces: `export function validateSupportMatrix(tree: FileTree, today: string): Finding[]` — parsea con `SupportMatrixSchema`; falla si una celda lleva más de 30 días en `revalidate` (`revalidateSince` + 30 < `today`).

- [ ] **Step 1: Test**

```ts
import { expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
import { validateSupportMatrix } from "./support-matrix";
const m = (cells: unknown[]) => JSON.stringify({ schemaVersion: 1, nodes: ["engines"], agents: ["codex"], cells });
test("fails on stale revalidate and invalid schema", () => {
  const stale = treeFrom({ "standard/support-matrix.json": m([{ node: "engines", agent: "codex", status: "revalidate", revalidateSince: "2026-07-01", verifiedAt: "2026-06-01", verifiedBy: "o", notes: "" }]) });
  expect(validateSupportMatrix(stale, "2026-09-22")[0]?.evidence).toEqual(["engines/codex: in revalidate since 2026-07-01 (> 30 days)"]);
  const fresh = treeFrom({ "standard/support-matrix.json": m([{ node: "engines", agent: "codex", status: "supported", verifiedAt: "2026-09-22", verifiedBy: "o", notes: "" }]) });
  expect(validateSupportMatrix(fresh, "2026-09-22")[0]?.verdict).toBe("pass");
  expect(validateSupportMatrix(treeFrom({ "standard/support-matrix.json": "{}" }), "2026-09-22")[0]?.verdict).toBe("fail");
});
```

- [ ] **Step 2: Ejecutar para ver el fallo**

Run: `bun test src/modules/validators/support-matrix.test.ts`
Expected: FAIL `Cannot find module`.

- [ ] **Step 3: Implementar**

```ts
import { SupportMatrixSchema } from "../standard/schemas";
import { read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
const RULE = "forge614-rule-agent-checklist-impact";
const DAY = 86_400_000;
export function validateSupportMatrix(tree: FileTree, today: string): Finding[] {
  const raw = read(tree, "standard/support-matrix.json");
  if (raw === undefined) return [fail(RULE, ["standard/support-matrix.json missing"], "supportMatrixMissing")];
  const parsed = SupportMatrixSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) return [fail(RULE, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`), "supportMatrixInvalid")];
  const evidence: string[] = [];
  for (const c of parsed.data.cells) {
    if (c.status === "revalidate" && c.revalidateSince !== undefined && Date.parse(today) - Date.parse(c.revalidateSince) > 30 * DAY) evidence.push(`${c.node}/${c.agent}: in revalidate since ${c.revalidateSince} (> 30 days)`);
  }
  return evidence.length === 0 ? [pass(RULE, "supportMatrixCurrent")] : [fail(RULE, evidence, "supportMatrixStale", { days: "30" })];
}
```

`standard/support-matrix.json` (de la tabla "Agentes ya evaluados" del procedimiento; `verifiedBy: "owner"`, `verifiedAt: "2026-09-22"`):
```json
{
  "schemaVersion": 1,
  "nodes": ["engines", "workers", "atlas", "engram", "shell"],
  "agents": ["claude-code", "codex", "cursor"],
  "cells": [
    { "node": "engines", "agent": "claude-code", "status": "supported", "verifiedAt": "2026-09-22", "verifiedBy": "owner", "notes": "Sin nivel de razonamiento (REASONING_LEVEL_UNSUPPORTED)." },
    { "node": "workers", "agent": "claude-code", "status": "supported", "verifiedAt": "2026-09-22", "verifiedBy": "owner", "notes": "Auth por suscripción con cwd aislado y HOME real." },
    { "node": "atlas", "agent": "claude-code", "status": "supported", "verifiedAt": "2026-09-22", "verifiedBy": "owner", "notes": "" },
    { "node": "engram", "agent": "claude-code", "status": "supported", "verifiedAt": "2026-09-22", "verifiedBy": "owner", "notes": "No requiere cambios en Engram (protocolo v1)." },
    { "node": "shell", "agent": "claude-code", "status": "partial", "verifiedAt": "2026-09-22", "verifiedBy": "owner", "notes": "Onboarding de login no diseñado aún." },
    { "node": "engines", "agent": "codex", "status": "supported", "verifiedAt": "2026-09-22", "verifiedBy": "owner", "notes": "Soporta model_reasoning_effort." },
    { "node": "workers", "agent": "codex", "status": "supported", "verifiedAt": "2026-09-22", "verifiedBy": "owner", "notes": "Requiere --skip-git-repo-check." },
    { "node": "atlas", "agent": "codex", "status": "supported", "verifiedAt": "2026-09-22", "verifiedBy": "owner", "notes": "" },
    { "node": "engram", "agent": "codex", "status": "supported", "verifiedAt": "2026-09-22", "verifiedBy": "owner", "notes": "" },
    { "node": "shell", "agent": "codex", "status": "partial", "verifiedAt": "2026-09-22", "verifiedBy": "owner", "notes": "Pendiente." },
    { "node": "engines", "agent": "cursor", "status": "partial", "verifiedAt": "2026-09-22", "verifiedBy": "owner", "notes": "Detectado; supportsHeadlessExec false; sin instrucciones globales." },
    { "node": "workers", "agent": "cursor", "status": "unsupported", "verifiedAt": "2026-09-22", "verifiedBy": "owner", "notes": "No soporta headless." },
    { "node": "atlas", "agent": "cursor", "status": "unsupported", "verifiedAt": "2026-09-22", "verifiedBy": "owner", "notes": "No aplica." },
    { "node": "engram", "agent": "cursor", "status": "unsupported", "verifiedAt": "2026-09-22", "verifiedBy": "owner", "notes": "No aplica." },
    { "node": "shell", "agent": "cursor", "status": "unsupported", "verifiedAt": "2026-09-22", "verifiedBy": "owner", "notes": "Sin adaptador de chat." }
  ]
}
```

- [ ] **Step 4: Ejecutar**

Run: `bun test src/modules/validators/support-matrix.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add standard/support-matrix.json src/modules/validators/support-matrix.ts src/modules/validators/support-matrix.test.ts
git commit -m "feat(standard): add initial support matrix and its validator"
```

---

### Task 8: Workflows delgados: `workflows:check` y `workflows:run` (acta 0019)

**Files:**
- Create: `src/modules/standard/workflow.ts`, `workflow.test.ts` (esquema Zod del YAML de workflow y reglas de "delgadez")
- Create: `src/modules/validators/workflows.ts`, `workflows.test.ts`
- Create: `src/app/check-workflows.ts`, `check-workflows.test.ts`
- Create: `src/app/run-workflows.ts`, `run-workflows.test.ts`, `src/app/__tests__/fixtures/verify.fixture.yml`
- Create: `src/interfaces/cli/workflows-check.ts`, `src/interfaces/cli/workflows-run.ts`
- Modify: `package.json` (scripts `workflows:check`, `workflows:run`; dependencia `yaml` 2.8.x fijada; `bun add yaml@2.8.1`)
- Modify: `src/modules/validators/index.ts` (registrar `workflows`)

**Interfaces:**
- Produces:
  ```ts
  // workflow.ts
  export const WorkflowSchema: z.ZodType<Workflow>; // { name, on, jobs: Record<string, { "runs-on"|strategy..., steps: Step[] }> }, Step = { uses: string; with?; env? } | { run: string; env? }
  export const ALLOWED_RUN = /^(bun install --frozen-lockfile|bun test|bun run [a-z0-9:.-]+)$/;
  export const PINNED_USES = /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}(\s+#.*)?$/;
  export function checkWorkflowShape(w: Workflow, id: string): string[]; // evidencia: pasos no permitidos, uses sin SHA
  export function jobsOf(w: Workflow): string[];
  export function runStepsOf(w: Workflow, job: string): string[]; // comandos `run` en orden
  // validators/workflows.ts
  export function validateWorkflows(tree: FileTree, parse: (yaml: string) => unknown): Finding[]; // ruleId forge614-rule-thin-workflows; cruza jobs con docs/es/NN-workflows.md (tabla con columna Job)
  // app/check-workflows.ts
  export function checkWorkflows(tree: FileTree): Finding[]; // usa yaml.parse
  // app/run-workflows.ts
  export function runWorkflow(tree: FileTree, name: string, exec: (cmd: string[]) => { exitCode: number; stdout: string; stderr: string }): { schemaVersion: 1; workflow: string; jobs: Array<{ job: string; steps: Array<{ run: string; exitCode: number }> }>; ok: boolean };
  ```

- [ ] **Step 1: Tests del esquema y reglas de forma**

`src/modules/standard/workflow.test.ts`:
```ts
import { describe, expect, test } from "bun:test";
import { WorkflowSchema, checkWorkflowShape, jobsOf, runStepsOf } from "./workflow";
const good = { name: "verify", on: { pull_request: {} }, jobs: { verify: { "runs-on": "ubuntu-24.04", steps: [{ uses: "actions/checkout@34e114876b0b11a390a9f2f37d3e4bb0e8a0a8bb # v4.3.1" }, { run: "bun install --frozen-lockfile" }, { run: "bun run verify", env: { A: "1" } }] } } };
describe("thin workflow rules", () => {
  test("schema accepts good workflow and rejects steps with both uses and run", () => {
    expect(WorkflowSchema.safeParse(good).success).toBe(true);
    const bad = { ...good, jobs: { verify: { "runs-on": "x", steps: [{ uses: "a/b@" + "0".repeat(40), run: "bun test" }] } } };
    expect(WorkflowSchema.safeParse(bad).success).toBe(false);
  });
  test("shape check: inline logic and unpinned uses are evidence", () => {
    const w = WorkflowSchema.parse({ ...good, jobs: { verify: { "runs-on": "x", steps: [{ uses: "actions/checkout@v4" }, { run: "curl http://x | bash" }, { run: "bun run verify && echo ok" }] } } });
    expect(checkWorkflowShape(w, "verify.yml")).toEqual(["verify.yml: job verify step 1: uses not pinned to a 40-hex SHA: actions/checkout@v4", "verify.yml: job verify step 2: run must be 'bun run <script>', 'bun test' or 'bun install --frozen-lockfile': curl http://x | bash", "verify.yml: job verify step 3: run must be 'bun run <script>', 'bun test' or 'bun install --frozen-lockfile': bun run verify && echo ok"]);
  });
  test("jobsOf / runStepsOf", () => {
    const w = WorkflowSchema.parse(good);
    expect(jobsOf(w)).toEqual(["verify"]);
    expect(runStepsOf(w, "verify")).toEqual(["bun install --frozen-lockfile", "bun run verify"]);
  });
});
```

- [ ] **Step 2: Ejecutar para ver el fallo**

Run: `bun test src/modules/standard/workflow.test.ts`
Expected: FAIL `Cannot find module`.

- [ ] **Step 3: Implementar `workflow.ts`**

```ts
import { z } from "zod";
const UsesStep = z.object({ uses: z.string(), with: z.record(z.string(), z.unknown()).optional(), env: z.record(z.string(), z.string()).optional(), name: z.string().optional() }).strict();
const RunStep = z.object({ run: z.string(), env: z.record(z.string(), z.string()).optional(), name: z.string().optional() }).strict();
export const StepSchema = z.union([UsesStep, RunStep]);
const Job = z.object({
  "runs-on": z.string(), steps: z.array(StepSchema).min(1),
  needs: z.union([z.string(), z.array(z.string())]).optional(),
  strategy: z.object({ matrix: z.record(z.string(), z.unknown()) }).strict().optional(),
  permissions: z.record(z.string(), z.string()).optional(),
}).strict();
export const WorkflowSchema = z.object({ name: z.string().min(1), on: z.record(z.string(), z.unknown()), jobs: z.record(z.string(), Job) }).strict();
export type Workflow = z.infer<typeof WorkflowSchema>;
export const ALLOWED_RUN = /^(bun install --frozen-lockfile|bun test|bun run [a-z0-9:.-]+)$/;
export const PINNED_USES = /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}(\s+#.*)?$/;
export function checkWorkflowShape(w: Workflow, id: string): string[] {
  const out: string[] = [];
  for (const [job, def] of Object.entries(w.jobs)) def.steps.forEach((s, i) => {
    if ("uses" in s && !PINNED_USES.test(s.uses)) out.push(`${id}: job ${job} step ${i + 1}: uses not pinned to a 40-hex SHA: ${s.uses}`);
    if ("run" in s && !ALLOWED_RUN.test(s.run.trim())) out.push(`${id}: job ${job} step ${i + 1}: run must be 'bun run <script>', 'bun test' or 'bun install --frozen-lockfile': ${s.run.trim()}`);
  });
  return out;
}
export function jobsOf(w: Workflow): string[] { return Object.keys(w.jobs); }
export function runStepsOf(w: Workflow, job: string): string[] {
  const def = w.jobs[job]; if (!def) return [];
  return def.steps.flatMap((s) => ("run" in s ? [s.run.trim()] : []));
}
```

- [ ] **Step 4: Ejecutar**

Run: `bun test src/modules/standard/workflow.test.ts`
Expected: PASS.

- [ ] **Step 5: Test del validador `workflows` (cruce con docs)**

`src/modules/validators/workflows.test.ts`:
```ts
import { expect, test } from "bun:test";
import { parse } from "yaml";
import { treeFrom } from "../standard/file-tree";
import { validateWorkflows } from "./workflows";
const yml = `name: verify\non:\n  pull_request: {}\njobs:\n  verify:\n    runs-on: ubuntu-24.04\n    steps:\n      - uses: actions/checkout@34e114876b0b11a390a9f2f37d3e4bb0e8a0a8bb\n      - run: bun run verify\n`;
const doc = "# 05 — Workflows\n\n## verify.yml\n| Job | Disparador |\n| --- | --- |\n| `verify` | pr |\n";
test("pass when every job is documented; fail on undocumented job, bad yaml and missing doc", () => {
  expect(validateWorkflows(treeFrom({ ".github/workflows/verify.yml": yml, "docs/es/05-workflows.md": doc }), parse)[0]?.verdict).toBe("pass");
  const undocumented = validateWorkflows(treeFrom({ ".github/workflows/verify.yml": yml.replace("  verify:", "  build:"), "docs/es/05-workflows.md": doc }), parse)[0];
  expect(undocumented?.evidence).toEqual(["verify.yml: job 'build' not documented in docs/es/05-workflows.md"]);
  expect(validateWorkflows(treeFrom({ ".github/workflows/x.yml": "jobs: [", "docs/es/05-workflows.md": doc }), parse)[0]?.evidence[0]).toContain("x.yml: YAML parse error");
  expect(validateWorkflows(treeFrom({ ".github/workflows/verify.yml": yml }), parse)[0]?.evidence).toEqual(["docs/es/NN-workflows.md missing (no file matches docs/es/[0-9][0-9]-workflows.md)"]);
});
```

- [ ] **Step 6: Implementar `validators/workflows.ts`**

```ts
import { WorkflowSchema, checkWorkflowShape, jobsOf } from "../standard/workflow";
import { listUnder, read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
const RULE = "forge614-rule-thin-workflows";
function documentedJobs(doc: string): Set<string> {
  const jobs = new Set<string>();
  const lines = doc.split("\n");
  lines.forEach((line, i) => {
    if (!/^\|\s*Job\s*\|/i.test(line)) return;
    for (let j = i + 2; j < lines.length && lines[j]?.startsWith("|"); j += 1) {
      const cell = lines[j]?.split("|")[1]?.trim().replace(/`/g, "") ?? "";
      if (cell) jobs.add(cell);
    }
  });
  return jobs;
}
export function validateWorkflows(tree: FileTree, parse: (yaml: string) => unknown): Finding[] {
  const evidence: string[] = [];
  const files = listUnder(tree, ".github/workflows/").filter((p) => /\.ya?ml$/.test(p));
  if (files.length === 0) return [pass(RULE, "workflowsNone")];
  const docPath = listUnder(tree, "docs/es/").find((p) => /docs\/es\/\d{2}-workflows\.md$/.test(p));
  const documented = docPath ? documentedJobs(read(tree, docPath) ?? "") : new Set<string>();
  if (!docPath) evidence.push("docs/es/NN-workflows.md missing (no file matches docs/es/[0-9][0-9]-workflows.md)");
  for (const path of files) {
    const id = path.slice(".github/workflows/".length);
    let raw: unknown;
    try { raw = parse(read(tree, path) ?? ""); } catch (e) { evidence.push(`${id}: YAML parse error: ${e instanceof Error ? e.message : String(e)}`); continue; }
    const parsed = WorkflowSchema.safeParse(raw);
    if (!parsed.success) { evidence.push(`${id}: schema: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`); continue; }
    evidence.push(...checkWorkflowShape(parsed.data, id));
    if (docPath) for (const job of jobsOf(parsed.data)) if (!documented.has(job)) evidence.push(`${id}: job '${job}' not documented in ${docPath}`);
  }
  return evidence.length === 0 ? [pass(RULE, "workflowsOk")] : [fail(RULE, evidence, "workflowsInvalid")];
}
```
Registrar en `validators/index.ts`: `workflows: (tree) => validateWorkflows(tree, parseYaml)` — como `modules` no puede importar `yaml`, el registro recibe el parser por inyección: cambiar `ValidatorOptions` a `{ forbiddenMentions; parseYaml: (s: string) => unknown; today: string }` y que `app/run-validators.ts` (Task 9) inyecte `parse` de `yaml` y la fecha. Actualizar los tests anteriores para pasar `{ forbiddenMentions: [], parseYaml: () => ({}), today: "2026-09-22" }`.

- [ ] **Step 7: Ejecutar**

Run: `bun add yaml@2.8.1 && bun test src/modules/validators/workflows.test.ts`
Expected: PASS.

- [ ] **Step 8: Test y código de `run-workflows`**

`src/app/__tests__/fixtures/verify.fixture.yml`:
```yaml
name: verify
on: { pull_request: {} }
jobs:
  verify:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@34e114876b0b11a390a9f2f37d3e4bb0e8a0a8bb
      - run: bun install --frozen-lockfile
      - run: bun run typecheck
      - run: bun test
```

`src/app/run-workflows.test.ts`:
```ts
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { treeFrom } from "../modules/standard/file-tree";
import { runWorkflow } from "./run-workflows";
const fixture = readFileSync(resolve(import.meta.dir, "__tests__/fixtures/verify.fixture.yml"), "utf8");
test("runs the run steps of every job in order and stops a job at first failure", () => {
  const calls: string[][] = [];
  const exec = (cmd: string[]) => { calls.push(cmd); return { exitCode: cmd.join(" ") === "bun run typecheck" ? 1 : 0, stdout: "", stderr: "" }; };
  const r = runWorkflow(treeFrom({ ".github/workflows/verify.yml": fixture }), "verify", exec);
  expect(calls).toEqual([["bun", "install", "--frozen-lockfile"], ["bun", "run", "typecheck"]]);
  expect(r.ok).toBe(false);
  expect(r.jobs[0]?.steps.map((s) => s.exitCode)).toEqual([0, 1]);
});
test("unknown workflow name throws", () => {
  expect(() => runWorkflow(treeFrom({}), "nope", () => ({ exitCode: 0, stdout: "", stderr: "" }))).toThrow("workflow not found: nope");
});
```

`src/app/run-workflows.ts`:
```ts
import { parse } from "yaml";
import { WorkflowSchema, jobsOf, runStepsOf } from "../modules/standard/workflow";
import { read, type FileTree } from "../modules/standard/file-tree";
type Exec = (cmd: string[]) => { exitCode: number; stdout: string; stderr: string };
export interface WorkflowRunResult { schemaVersion: 1; workflow: string; jobs: Array<{ job: string; steps: Array<{ run: string; exitCode: number }> }>; ok: boolean }
export function runWorkflow(tree: FileTree, name: string, exec: Exec): WorkflowRunResult {
  const raw = read(tree, `.github/workflows/${name}.yml`);
  if (raw === undefined) throw new Error(`workflow not found: ${name}`);
  const w = WorkflowSchema.parse(parse(raw));
  const jobs: WorkflowRunResult["jobs"] = [];
  let ok = true;
  for (const job of jobsOf(w)) {
    const steps: Array<{ run: string; exitCode: number }> = [];
    for (const run of runStepsOf(w, job)) {
      const r = exec(run.split(/\s+/));
      steps.push({ run, exitCode: r.exitCode });
      if (r.exitCode !== 0) { ok = false; break; }
    }
    jobs.push({ job, steps });
  }
  return { schemaVersion: 1, workflow: name, jobs, ok };
}
```

`src/app/check-workflows.ts`:
```ts
import { parse } from "yaml";
import { validateWorkflows } from "../modules/validators/workflows";
import type { FileTree } from "../modules/standard/file-tree";
import type { Finding } from "../modules/standard/finding";
export function checkWorkflows(tree: FileTree): Finding[] { return validateWorkflows(tree, parse); }
```

CLIs (`src/interfaces/cli/workflows-check.ts` y `workflows-run.ts`): leen el árbol del repo actual con `readRepoTree()` expuesto desde `app`, llaman `checkWorkflows` / `runWorkflow(tree, name, (cmd) => run(cmd, { cwd }))`, imprimen con `printJson` (`{ schemaVersion: 1, verdict, findings }` / el `WorkflowRunResult`) y salen `0` si todo pasa, `1` si no; `--help` imprime uso sin leer nada; `--workflow <name>` por defecto `verify`. En `workflows-run` cada paso también se refleja en stderr como línea legible `[verify] bun run typecheck … exit 0` para la persona.

`package.json` scripts: `"workflows:check": "bun run src/interfaces/cli/workflows-check.ts"`, `"workflows:run": "bun run src/interfaces/cli/workflows-run.ts"`.

- [ ] **Step 9: Ejecutar**

Run: `bun test src/app src/modules && bun run workflows:check`
Expected: tests PASS; `workflows:check` devuelve `verdict: "pass"` con mensaje "Sin workflows que validar" (los workflows propios llegan en la Task 13).

- [ ] **Step 10: Commit**

```bash
git add package.json bun.lock src/modules/standard/workflow.ts src/modules/standard/workflow.test.ts src/modules/validators/workflows.ts src/modules/validators/workflows.test.ts src/modules/validators/index.ts src/modules/validators/types.ts src/app/check-workflows.ts src/app/run-workflows.ts src/app/run-workflows.test.ts src/app/__tests__ src/interfaces/cli/workflows-check.ts src/interfaces/cli/workflows-run.ts
git commit -m "feat(standard): add thin-workflow schema, workflows:check and workflows:run"
```

---

### Task 9: `bun verify`, índice de actas y orquestación de validadores

**Files:**
- Create: `src/app/run-validators.ts`, `run-validators.test.ts`
- Create: `src/app/decisions-index.ts`, `decisions-index.test.ts`, `src/interfaces/cli/decisions-index.ts`
- Create: `src/interfaces/cli/verify.ts`
- Create: `docs/decisions/INDEX.json` (generado)
- Modify: `package.json` (script `decisions:index`)

**Interfaces:**
- Produces:
  ```ts
  // run-validators.ts
  export interface ReportedFinding extends Finding { message: { es: string; en: string } } // mensaje renderizado en ambos idiomas desde el catálogo (renderFinding)
  export interface VerifyReport { schemaVersion: 1; standard: string; verdict: Verdict; checks: ReportedFinding[] }
  export function runValidators(tree: FileTree, options: { standardVersion: string; today: string }): VerifyReport;
  // decisions-index.ts
  export function buildDecisionsIndex(tree: FileTree): { schemaVersion: 1; records: string[] }; // nombres de archivo NNNN-*.md ordenados
  ```
- Nota para la fase 0.2: `runValidators` + `VALIDATORS` + los esquemas son exactamente lo que `forge614-sentinel check` empaqueta; el contrato de salida (`VerifyReport`) es el de la spec §6.1.

- [ ] **Step 1: Tests**

`src/app/decisions-index.test.ts`:
```ts
import { expect, test } from "bun:test";
import { treeFrom } from "../modules/standard/file-tree";
import { buildDecisionsIndex } from "./decisions-index";
test("lists numbered records only, sorted", () => {
  const tree = treeFrom({ "docs/decisions/0002-b.md": "", "docs/decisions/0001-a.md": "", "docs/decisions/README.md": "", "docs/decisions/TEMPLATE.md": "" });
  expect(buildDecisionsIndex(tree)).toEqual({ schemaVersion: 1, records: ["0001-a.md", "0002-b.md"] });
});
```

`src/app/run-validators.test.ts`:
```ts
import { expect, test } from "bun:test";
import { treeFrom } from "../modules/standard/file-tree";
import { runValidators } from "./run-validators";
test("aggregates every validator and computes worst verdict", () => {
  const tree = treeFrom({ "standard/forbidden-mentions.json": JSON.stringify({ schemaVersion: 1, terms: ["zzz"] }), "docs/es/01-a.md": "zzz\n", "README.md": "", "README.en.md": "", "standard/support-matrix.json": JSON.stringify({ schemaVersion: 1, nodes: ["a"], agents: ["b"], cells: [] }), "docs/decisions/INDEX.json": JSON.stringify({ schemaVersion: 1, records: [] }) });
  const report = runValidators(tree, { standardVersion: "1.0.0", today: "2026-09-22" });
  expect(report.verdict).toBe("fail");
  expect(report.checks.map((c) => c.ruleId)).toEqual(expect.arrayContaining(["forge614-rule-no-external-product-mentions", "forge614-rule-bilingual-docs", "forge614-rule-package-naming", "forge614-rule-decision-records", "forge614-rule-agent-checklist-impact", "forge614-rule-thin-workflows"]));
  expect(report.checks.find((c) => c.ruleId === "forge614-rule-no-external-product-mentions")?.verdict).toBe("fail");
  expect(report.checks.find((c) => c.ruleId === "forge614-rule-no-external-product-mentions")?.message).toEqual({ es: "Menciones a productos externos.", en: "External product mentions." });
});
```

- [ ] **Step 2: Ejecutar para ver los fallos**

Run: `bun test src/app/decisions-index.test.ts src/app/run-validators.test.ts`
Expected: FAIL `Cannot find module`.

- [ ] **Step 3: Implementar**

`src/app/decisions-index.ts`:
```ts
import { listUnder, type FileTree } from "../modules/standard/file-tree";
export function buildDecisionsIndex(tree: FileTree): { schemaVersion: 1; records: string[] } {
  const records = listUnder(tree, "docs/decisions/").map((p) => p.slice("docs/decisions/".length)).filter((n) => /^\d{4}-.+\.md$/.test(n)).sort();
  return { schemaVersion: 1, records };
}
```

`src/app/run-validators.ts`:
```ts
import { parse } from "yaml";
import { read, type FileTree } from "../modules/standard/file-tree";
import { renderFinding, worst, type Finding, type Verdict } from "../modules/standard/finding";
import { VALIDATORS } from "../modules/validators";
import { validatePacksCatalog } from "../modules/validators/packs-catalog";
import { validateRulesCatalog } from "../modules/validators/rules-catalog";
import { validateSupportMatrix } from "../modules/validators/support-matrix";
export interface ReportedFinding extends Finding { message: { es: string; en: string } }
export interface VerifyReport { schemaVersion: 1; standard: string; verdict: Verdict; checks: ReportedFinding[] }
function forbiddenTerms(tree: FileTree): string[] {
  const raw = read(tree, "standard/forbidden-mentions.json");
  if (raw === undefined) return [];
  const parsed: unknown = JSON.parse(raw);
  const terms = typeof parsed === "object" && parsed !== null ? (parsed as { terms?: unknown }).terms : undefined;
  return Array.isArray(terms) ? terms.filter((t): t is string => typeof t === "string") : [];
}
export function runValidators(tree: FileTree, options: { standardVersion: string; today: string }): VerifyReport {
  const vo = { forbiddenMentions: forbiddenTerms(tree), parseYaml: parse, today: options.today };
  const checks: Finding[] = [];
  for (const validator of Object.values(VALIDATORS)) checks.push(...validator(tree, vo));
  checks.push(...validateRulesCatalog(tree), ...validatePacksCatalog(tree), ...validateSupportMatrix(tree, options.today));
  const reported: ReportedFinding[] = checks.map((c) => ({ ...c, message: renderFinding(c) }));
  return { schemaVersion: 1, standard: options.standardVersion, verdict: worst(checks), checks: reported };
}
```

`src/interfaces/cli/verify.ts`:
```ts
import { resolve } from "node:path";
import { readRepoTree } from "../../app/repo-tree";
import { runValidators } from "../../app/run-validators";
import { runCommand } from "../../app/commands";
import { printError, printJson } from "./output";
if (process.argv.includes("--help")) { printJson({ schemaVersion: 1, usage: "verify [--json]" }); process.exit(0); }
const root = resolve(import.meta.dir, "../../..");
const steps: Array<[string, string[]]> = [["typecheck", ["bun", "run", "typecheck"]], ["test", ["bun", "test"]], ["workflows:check", ["bun", "run", "workflows:check"]]];
for (const [name, cmd] of steps) {
  const r = runCommand(cmd, root);
  process.stderr.write(`[verify] ${name}: exit ${r.exitCode}\n`);
  if (r.exitCode !== 0) { printError("VERIFY_STEP_FAILED", `${name} failed`); process.exit(1); }
}
const standardVersion = (await Bun.file(resolve(root, "standard/VERSION")).text()).trim();
const report = runValidators(readRepoTree(root), { standardVersion, today: new Date().toISOString().slice(0, 10) });
printJson({ ...report });
process.exit(report.verdict === "fail" ? 1 : 0);
```
(`app/repo-tree.ts` exporta `readRepoTree(root)` = `readTree` de infraestructura; `app/commands.ts` exporta `runCommand(cmd, cwd)` = `run` de infraestructura. Así `interfaces` solo importa `app`.)

`src/interfaces/cli/decisions-index.ts`: construye el índice con `buildDecisionsIndex(readRepoTree(root))`, lo escribe en `docs/decisions/INDEX.json` (vía función de `app` que usa `writeTextAtomic`) y lo imprime con `printJson`. Script `"decisions:index": "bun run src/interfaces/cli/decisions-index.ts"`.

- [ ] **Step 4: Ejecutar, generar el índice y correr `verify` real**

Run: `bun test src/app && bun run decisions:index && bun run verify`
Expected: tests PASS; `docs/decisions/INDEX.json` con 19 entradas (`0001`–`0019`); `verify` imprime el reporte con `verdict: "pass"` para todas las reglas excepto `forge614-rule-bilingual-docs` si aún faltan `docs/es`/`docs/en` (se crean en la Task 11); el test de arquitectura ya pasa porque existen las cuatro capas.

- [ ] **Step 5: Commit**

```bash
git add src/app/run-validators.ts src/app/run-validators.test.ts src/app/decisions-index.ts src/app/decisions-index.test.ts src/app/repo-tree.ts src/app/commands.ts src/interfaces/cli/verify.ts src/interfaces/cli/decisions-index.ts docs/decisions/INDEX.json package.json
git commit -m "feat(standard): add bun verify with validator report and decisions index"
```

---

### Task 10: Empaquetado del estándar

**Files:**
- Create: `src/infrastructure/hashing.ts`, `hashing.test.ts`
- Create: `src/app/pack-standard.ts`, `pack-standard.test.ts`
- Create: `src/interfaces/cli/standard-pack.ts`

**Interfaces:**
- Produces:
  ```ts
  // hashing.ts
  export function sha256Hex(bytes: Uint8Array): string;
  export function sha256File(path: string): string;
  // pack-standard.ts
  export interface PackResult { schemaVersion: 1; version: string; archive: string; sha256: string; entries: string[] }
  export function packStandard(root: string, outDir: string, exec: (cmd: string[], cwd: string) => { exitCode: number; stdout: string; stderr: string }): PackResult; // dist/standard-<VERSION>.tar.gz + SHA256SUMS
  ```

- [ ] **Step 1: Tests**

`src/infrastructure/hashing.test.ts`:
```ts
import { expect, test } from "bun:test";
import { sha256Hex } from "./hashing";
test("sha256 of empty input", () => expect(sha256Hex(new Uint8Array())).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"));
```

`src/app/pack-standard.test.ts`:
```ts
import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { run } from "../infrastructure/process";
import { packStandard } from "./pack-standard";
test("archive contains the standard tree and SHA256SUMS matches", () => {
  const out = mkdtempSync(join(tmpdir(), "pack-"));
  const r = packStandard(resolve(import.meta.dir, "../.."), out, (cmd, cwd) => run(cmd, { cwd }));
  expect(r.archive).toBe(join(out, `standard-${r.version}.tar.gz`));
  const listed = run(["tar", "-tzf", r.archive]).stdout.split("\n");
  for (const must of ["VERSION", "STANDARD.md", "STANDARD.en.md", "rules/", "packs/", "templates/", "schemas/", "procedures/", "support-matrix.json", "forbidden-mentions.json", "FORGE614_ECOSYSTEM_CONTRACT.md"]) expect(listed.some((l) => l.endsWith(must) || l.includes(`/${must}`)), must).toBe(true);
  const sums = run(["cat", join(out, "SHA256SUMS")]).stdout;
  expect(sums).toContain(`${r.sha256}  standard-${r.version}.tar.gz`);
});
```

- [ ] **Step 2: Ejecutar para ver el fallo**

Run: `bun test src/infrastructure/hashing.test.ts src/app/pack-standard.test.ts`
Expected: FAIL `Cannot find module` (y, tras crearlos, el test de contenido falla hasta que exista `FORGE614_ECOSYSTEM_CONTRACT.md` en `standard/`, Task 12).

- [ ] **Step 3: Implementar**

`src/infrastructure/hashing.ts`:
```ts
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
export function sha256Hex(bytes: Uint8Array): string { return createHash("sha256").update(bytes).digest("hex"); }
export function sha256File(path: string): string { return sha256Hex(readFileSync(path)); }
```

`src/app/pack-standard.ts`:
```ts
import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { sha256File } from "../infrastructure/hashing";
import { writeTextAtomic } from "../infrastructure/fs-write";
type Exec = (cmd: string[], cwd: string) => { exitCode: number; stdout: string; stderr: string };
export interface PackResult { schemaVersion: 1; version: string; archive: string; sha256: string; entries: string[] }
export function packStandard(root: string, outDir: string, exec: Exec): PackResult {
  const standardDir = resolve(root, "standard");
  const version = readFileSync(join(standardDir, "VERSION"), "utf8").trim();
  mkdirSync(outDir, { recursive: true });
  const archive = join(outDir, `standard-${version}.tar.gz`);
  // --sort y mtime fijo para archivos reproducibles cuando tar los soporta (GNU); en BSD tar se omiten y el checksum se publica igual.
  const r = exec(["tar", "-czf", archive, "-C", standardDir, "."], root);
  if (r.exitCode !== 0) throw new Error(`tar failed: ${r.stderr}`);
  const sha256 = sha256File(archive);
  writeTextAtomic(join(outDir, "SHA256SUMS"), `${sha256}  standard-${version}.tar.gz\n`);
  const entries = exec(["tar", "-tzf", archive], root).stdout.trim().split("\n").sort();
  return { schemaVersion: 1, version, archive, sha256, entries };
}
```

`src/interfaces/cli/standard-pack.ts`: `--help`; llama `packStandard(root, resolve(root, "dist"), runCommand)`; `printJson(result)`; exit `0`. Al final, si `--update-pointer` está presente, reescribe `forge614.node.json` con `standard.sha256` = huella del paquete (vía función de `app` que valida con `NodePointerSchema` antes de escribir).

- [ ] **Step 4: Ejecutar**

Run: `bun test src/app/pack-standard.test.ts && bun run standard:pack --update-pointer && cat forge614.node.json`
Expected (tras la Task 12): PASS; `dist/standard-1.0.0.tar.gz` y `dist/SHA256SUMS`; el puntero muestra la huella real de 64 hex.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/hashing.ts src/infrastructure/hashing.test.ts src/app/pack-standard.ts src/app/pack-standard.test.ts src/interfaces/cli/standard-pack.ts forge614.node.json
git commit -m "feat(standard): package the standard as a versioned tarball with SHA256SUMS"
```

---

### Task 11: Documentación propia de forge614-ai y `notion-map.json`

**Files:**
- Create: `docs/es/00-resumen-y-guia-rapida.md`, `01-estandar-de-nodo.md`, `02-reglas-y-packs.md`, `03-plantillas-y-render.md`, `04-verificacion-y-empaquetado.md`, `05-workflows.md`
- Create: `docs/en/00-summary-and-quickstart.md`, `01-node-standard.md`, `02-rules-and-packs.md`, `03-templates-and-rendering.md`, `04-verification-and-packaging.md`, `05-workflows.md`
- Create: `src/app/build-notion-map.ts`, `build-notion-map.test.ts`, `src/interfaces/cli/notion-map-build.ts`, `docs/notion-map.json`

**Interfaces:**
- Produces: `export function buildNotionMap(tree: FileTree, productVersion: string): NotionMap` con `{ schemaVersion: 1, productVersion, pages: Array<{ es: string; en: string; sha256Es: string; sha256En: string; notionPageId: string | null }> }`; `sha256` calculado con `node:crypto` sobre el contenido (permitido en `modules`; aquí vive en `app` porque lee el árbol completo).

- [ ] **Step 1: Test del mapa**

```ts
import { expect, test } from "bun:test";
import { treeFrom } from "../modules/standard/file-tree";
import { buildNotionMap } from "./build-notion-map";
test("pairs es/en by number and hashes both", () => {
  const map = buildNotionMap(treeFrom({ "docs/es/00-a.md": "hola", "docs/en/00-b.md": "hello" }), "0.1.0");
  expect(map.pages).toHaveLength(1);
  expect(map.pages[0]?.sha256Es).toHaveLength(64);
  expect(map.pages[0]?.notionPageId).toBeNull();
});
test("throws when a pair is incomplete", () => {
  expect(() => buildNotionMap(treeFrom({ "docs/es/01-x.md": "x" }), "0.1.0")).toThrow("docs/es/01-x.md has no en twin");
});
```

- [ ] **Step 2: Ejecutar para ver el fallo**

Run: `bun test src/app/build-notion-map.test.ts`
Expected: FAIL `Cannot find module`.

- [ ] **Step 3: Implementar**

```ts
import { createHash } from "node:crypto";
import { listUnder, read, type FileTree } from "../modules/standard/file-tree";
export interface NotionMap { schemaVersion: 1; productVersion: string; pages: Array<{ es: string; en: string; sha256Es: string; sha256En: string; notionPageId: string | null }> }
const h = (s: string): string => createHash("sha256").update(s).digest("hex");
export function buildNotionMap(tree: FileTree, productVersion: string, previous?: NotionMap): NotionMap {
  const pages: NotionMap["pages"] = [];
  for (const es of listUnder(tree, "docs/es/")) {
    const num = /docs\/es\/(\d{2})-/.exec(es)?.[1]; if (!num) continue;
    const en = listUnder(tree, `docs/en/${num}-`)[0];
    if (!en) throw new Error(`${es} has no en twin`);
    const prev = previous?.pages.find((p) => p.es === es);
    pages.push({ es, en, sha256Es: h(read(tree, es) ?? ""), sha256En: h(read(tree, en) ?? ""), notionPageId: prev?.notionPageId ?? null });
  }
  return { schemaVersion: 1, productVersion, pages };
}
```
La CLI `notion-map-build` lee el mapa previo si existe (para conservar `notionPageId`), pasa `productVersion` desde `package.json` y escribe `docs/notion-map.json` con `writeTextAtomic`.

- [ ] **Step 4: Escribir los seis documentos es/en**

Cada documento: analogía en la primera línea, definiciones al primer uso, mismos encabezados en ambos idiomas. Contenidos mínimos:

- `00` Resumen y guía rápida: qué es forge614-ai hoy, comandos (`verify`, `standard:render`, `standard:pack`, `workflows:check`, `workflows:run`, `decisions:index`, `notion-map:build`, `schemas:generate`), estructura del repo, enlaces a spec y actas.
- `01` Estándar de nodo: cómo leer `standard/STANDARD.md`, versionado del estándar (`standard/VERSION`, `forge614.node.json`), cómo un nodo fija y sube de versión, caché local prevista.
- `02` Reglas y packs: anatomía de una regla (manifest, RULE.md/.en.md, validador por id), niveles núcleo/stack/opcional y `appliesWhen`, tabla de las trece reglas con su acta, cómo agregar una regla (acta primero).
- `03` Plantillas y render: variables (`NODE_NAME`, `NODE_TITLE`, `REPO`, `ASSET_PREFIX`, `STANDARD_VERSION`), destino de cada plantilla, cómo un nodo adopta las plantillas (renderizar, revisar diff, commitear), gancho `pre-push` y `BRANCH_PROTECTION.md`.
- `04` Verificación y empaquetado: qué comprueba `bun verify` (tabla de reglas → validador), formato del reporte (`VerifyReport`), códigos de salida, `standard:pack` y `SHA256SUMS`, relación con el futuro `forge614-sentinel check`.
- `05` Workflows: tabla `| Job | Disparador | Qué ejecuta | Qué valida | Duración esperada |` para `verify.yml` (job `verify`) y `release.yml` (jobs `build`, `publish`) de este repositorio, acciones fijadas con SHA, ejecución local con `workflows:run`.

- [ ] **Step 5: Generar el mapa y verificar paridad**

Run: `bun test src/app/build-notion-map.test.ts && bun run notion-map:build && bun run verify`
Expected: PASS; `docs/notion-map.json` con 6 páginas y huellas reales; `verify` con `forge614-rule-bilingual-docs` en `pass`.

- [ ] **Step 6: Commit**

```bash
git add docs/es docs/en docs/notion-map.json src/app/build-notion-map.ts src/app/build-notion-map.test.ts src/interfaces/cli/notion-map-build.ts
git commit -m "docs: add bilingual documentation 00-05 and notion-map with real fingerprints"
```

---

### Task 12: Contrato del ecosistema v2

**Files:**
- Create: `standard/FORGE614_ECOSYSTEM_CONTRACT.md`, `standard/FORGE614_ECOSYSTEM_CONTRACT.en.md`
- Create: `src/modules/validators/ecosystem-contract.ts`, `ecosystem-contract.test.ts`
- Modify: `src/app/run-validators.ts` (añadir el validador), `docs/decisions/` (nueva acta `0020-contrato-del-ecosistema-v2.md` con estado `aceptada` si el propietario lo aprueba al revisar el texto; si no, `propuesta`)

**Interfaces:**
- Produces: `export function validateEcosystemContract(tree: FileTree, canonical: string): Finding[]` — si el repo tiene `FORGE614_ECOSYSTEM_CONTRACT.md` en la raíz, debe ser byte-idéntico a `canonical`; si no lo tiene, `pass` (el puntero basta). En `forge614-ai`, `canonical` = `standard/FORGE614_ECOSYSTEM_CONTRACT.md`.

- [ ] **Step 1: Test**

```ts
import { expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
import { validateEcosystemContract } from "./ecosystem-contract";
test("root copy must be byte-identical to canonical; absent copy passes", () => {
  expect(validateEcosystemContract(treeFrom({ "FORGE614_ECOSYSTEM_CONTRACT.md": "A\n" }), "A\n")[0]?.verdict).toBe("pass");
  expect(validateEcosystemContract(treeFrom({ "FORGE614_ECOSYSTEM_CONTRACT.md": "A \n" }), "A\n")[0]?.evidence).toEqual(["FORGE614_ECOSYSTEM_CONTRACT.md differs from the published contract (sha256 mismatch)"]);
  expect(validateEcosystemContract(treeFrom({}), "A\n")[0]?.verdict).toBe("pass");
});
```

- [ ] **Step 2: Implementar**

```ts
import { createHash } from "node:crypto";
import { read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
const RULE = "forge614-rule-machine-contracts";
const h = (s: string): string => createHash("sha256").update(s).digest("hex");
export function validateEcosystemContract(tree: FileTree, canonical: string): Finding[] {
  const local = read(tree, "FORGE614_ECOSYSTEM_CONTRACT.md");
  if (local === undefined || h(local) === h(canonical)) return [pass(RULE, "ecosystemContractOk")];
  return [fail(RULE, ["FORGE614_ECOSYSTEM_CONTRACT.md differs from the published contract (sha256 mismatch)"], "ecosystemContractDiverged")];
}
```
En `run-validators.ts`: `checks.push(...validateEcosystemContract(tree, read(tree, "standard/FORGE614_ECOSYSTEM_CONTRACT.md") ?? ""))`.

- [ ] **Step 3: Escribir el contrato v2 (es/en)**

Partir del texto actual más completo (la copia de Engram, 10 327 B) y aplicar estos cambios, marcando `**Versión:** 2.0.0` en la cabecera:

1. Sección 1: jerarquía con siete productos: `forge614-ai` (núcleo, meta-paquete), `forge614-shell`, `forge614-engines` (paquete de implementación), `forge614-workers` (paquete de implementación), `forge614-engram`, `forge614-atlas` (contextualización inicial opcional), `forge614-hub`, `forge614-sentinel`. Nombrar el patrón: arquitectura de micronúcleo con distribución por paquetes con dependencias declaradas.
2. Sección 2: tabla de responsabilidades con las filas nuevas: Workers ("ejecutar tareas ya decididas, en secuencia y aislamiento; sin estado; interno"), Hub ("almacén de paquetes: catálogo, lock, huellas; sin código propio; nunca sobrescribe lo del usuario"), Sentinel ("juzga, nunca hace: verificación determinista y, después, revisión con IA").
3. Sección 4: `forge614 init` (máquina), `forge614 prepare` (proyecto), `forge614 status`, `forge614 doctor`, `forge614 update`; la IA nunca prepara un proyecto, solo avisa.
4. Sección 7 (Atlas): "contextualización inicial opcional; no orquesta trabajo general; valida salidas de workers con Sentinel antes de escribir en Engram; Planes 1–4 implementados".
5. Sección 8: tabla de instalación con el grafo de dependencias (Shell→Engines; Engram→Shell+Engines; Atlas→Engram+Engines+Shell+Workers; Hub→Engines; Sentinel→—; forge614-ai→todo) y la regla de los tres sistemas operativos.
6. Sección nueva "Libro de corridas": excepción explícita a "sin bases de progreso paralelas": `forge614-ai` posee el libro operativo en `~/.forge614/ai/`; Engram recibe solo resúmenes.
7. Sección 10: contratos nuevos (Hub→forge614-ai, Sentinel→todos, forge614-ai→gancho de arranque `forge614 status --directory --json`).
8. Sección 12: la copia local es opcional y, si existe, debe ser byte-idéntica a la publicada en `forge614-ai/standard/`; los nodos la referencian por `forge614.node.json`.
9. Sin menciones a productos externos.

- [ ] **Step 4: Ejecutar**

Run: `bun test src/modules/validators/ecosystem-contract.test.ts && bun run verify && bun test src/app/pack-standard.test.ts`
Expected: PASS; el paquete ahora incluye el contrato.

- [ ] **Step 5: Commit**

```bash
git add standard/FORGE614_ECOSYSTEM_CONTRACT.md standard/FORGE614_ECOSYSTEM_CONTRACT.en.md src/modules/validators/ecosystem-contract.ts src/modules/validators/ecosystem-contract.test.ts src/app/run-validators.ts docs/decisions/0020-contrato-del-ecosistema-v2.md docs/decisions/INDEX.json
git commit -m "feat(standard): publish ecosystem contract v2 and verify local copies byte-identical"
```

---

### Task 13: forge614-ai cumple su propio estándar (workflows, gancho, protección)

**Files:**
- Create: `.github/workflows/verify.yml`, `.github/workflows/release.yml` (renderizados desde las plantillas con `NODE_NAME=ai`)
- Create: `.githooks/pre-push`, `BRANCH_PROTECTION.md`, `BRANCH_PROTECTION.en.md`, `CONTRACT.md`, `CONTRACT.en.md`, `.agents/templates/plan.md`
- Modify: `package.json` (scripts `build:target`, `smoke:target`, `release:publish` como stubs que fallan con `NOT_IMPLEMENTED` hasta la fase 0.4, para que el YAML sea válido y `workflows:check` pase)

- [ ] **Step 1: Renderizar sobre el propio repo**

Run: `bun run standard:render --node ai --title "Forge614 AI" --repo jotredev/forge614-ai --out /tmp/forge614-ai-render && cp -R /tmp/forge614-ai-render/.github /tmp/forge614-ai-render/.githooks /tmp/forge614-ai-render/BRANCH_PROTECTION*.md /tmp/forge614-ai-render/CONTRACT*.md . && mkdir -p .agents/templates && cp /tmp/forge614-ai-render/.agents/templates/plan.md .agents/templates/plan.md && chmod +x .githooks/pre-push`
Expected: archivos en su sitio. (`README.md` y `docs/*/NN-workflows.md` no se copian: el README real ya existe y `05-workflows.md` se escribió en la Task 11.)

- [ ] **Step 2: Completar `CONTRACT.md` / `CONTRACT.en.md` de forge614-ai**

Propósito: "publicar el Estándar de Nodo y los contratos del ecosistema". Comandos públicos: `verify`, `standard:render`, `standard:pack`, `workflows:check`, `workflows:run`, `decisions:index`, `notion-map:build`, `schemas:generate`, cada uno con entrada (argumentos), salida (`schemaVersion: 1` + campos) y códigos `0/1/2`. Códigos de error: `INVALID_ARGUMENTS`, `VERIFY_STEP_FAILED`, `NOT_IMPLEMENTED`. Qué no hace: no instala nodos, no orquesta (Entregas 1 y 2).

- [ ] **Step 3: Scripts stub y prueba de workflows**

`package.json` añade: `"build:target": "bun run src/interfaces/cli/not-implemented.ts build:target"`, `"smoke:target": "bun run src/interfaces/cli/not-implemented.ts smoke:target"`, `"release:publish": "bun run src/interfaces/cli/not-implemented.ts release:publish"`. `src/interfaces/cli/not-implemented.ts` imprime `printError("NOT_IMPLEMENTED", "<script> arrives in phase 0.4 (shared bun release)")` y sale `1`.

Run: `git config core.hooksPath .githooks && bun run workflows:check && bun run workflows:run --workflow verify && bun run verify`
Expected: `workflows:check` `pass` (jobs `verify`, `build`, `publish` documentados en `docs/es/05-workflows.md`, `uses` con SHA, `run` solo scripts); `workflows:run` ejecuta `bun install --frozen-lockfile` y `bun run verify` con `ok: true`; `verify` en `pass`.

- [ ] **Step 4: Commit**

```bash
git add .github .githooks BRANCH_PROTECTION.md BRANCH_PROTECTION.en.md CONTRACT.md CONTRACT.en.md .agents/templates/plan.md package.json src/interfaces/cli/not-implemented.ts
git commit -m "ci: adopt thin verify/release workflows, pre-push hook and node contract for forge614-ai"
```

Después del commit, la persona aplica en GitHub la configuración de `BRANCH_PROTECTION.md` (workflow `verify` requerido, sin push directo a `main`).

---

## Auto-revisión

**Cobertura de la spec.**
- §4.1 puntero y contrato → Tasks 2 (esquema), 12 (contrato v2 y validación), 13 (`CONTRACT.md` propio).
- §4.2 capas y prueba AST → Task 1 (`import-rules.test.ts`), Tasks 3–9 respetan `interfaces → app → (modules, infrastructure)`.
- §4.3 stack (strict, Zod en fronteras) → Task 1 `tsconfig`; Tasks 2, 6, 8, 9 validan argv/JSON/YAML con Zod.
- §4.4 contratos de máquina (acta 0013) → Task 2 `output.ts`, esquemas de error y evento; toda CLI usa `printJson`/`printError` y códigos `0/1/2`.
- §4.5 patrones nombrados → cada tarea nombra el patrón (prefijo versionado, Plan/Apply no aplica aquí, Single Source of Truth en Task 4, Quality Gate en Tasks 8–9).
- §4.6 instalación → Task 6 (`install.sh`/`.ps1` desde plantilla, sin Node/Python, `FORGE614_HOME`, `--uninstall` simétrico, huella, y migración de instalaciones planas y bloques PATH heredados con respaldo — caso real: Atlas v1.0.0).
- §4.4 formato de `code` (acta 0013) → Task 4 (validador `error-codes`, regex `^[A-Z][A-Z0-9_]+$`) y Task 2 (`ErrorEnvelopeSchema`).
- §4.8 textos bilingües dentro del código → Task 1 (`MessageCatalog` tipado es/en con paridad por compilador; `renderFinding`), consumido por todos los validadores y por el `VerifyReport` de la Task 9.
- §4.7 precondición de la plantilla de release (sin `file:../`) → Task 6, documentada en `docs-workflows` de plantilla.
- §4.7 release, versionado y workflows delgados (acta 0019) → Tasks 6 (plantillas `verify.yml`/`release.yml`, `pre-push`, `BRANCH_PROTECTION`, `docs-workflows`), 8 (`workflows:check`/`run`), 13 (adopción propia). El paquete `bun release` compartido queda para la fase 0.4 (stubs `NOT_IMPLEMENTED` documentados).
- §4.8 documentación → Tasks 3 (validador bilingüe, `STANDARD.md`), 11 (docs 00–05 y `notion-map`).
- §4.9 proceso y actas → Task 4 (`decision-records`), Task 9 (`INDEX.json`), Task 6 (`plan.md` con sección de impacto).
- §4.10 reglas del agente → Task 4 (reglas `agent-questions-before-acting`, `no-fabricated-validations`, `never-touch-agents-dir-by-hand`, `git-readonly-for-agents`).
- §4.11 seguridad → Task 6 (checksum obligatorio, HTTPS, sin scripts remotos sin verificar); Task 10 (huella del paquete). `SECURITY.md` en Task 1.
- §4.12 agentes nuevos (actas 0017) → Task 4 (`agent-checklist-impact`), Task 7 (matriz con `revalidate` y 30 días). El procedimiento ya existe en `standard/procedures/`.
- §5 distribución centralizada → Task 10 (paquete versionado + `SHA256SUMS`, puntero con huella). La caché local `~/.forge614/standard/` y el gancho de mantenedor son fases 0.2 y 0.5 (fuera de este plan).
- §6 verificador → Task 9 (`runValidators` = semilla de `forge614-sentinel check`; el `VerifyReport` es el contrato de §6.1). De las 18 comprobaciones de §6.2 este plan implementa: `ecosystem-contract`, `import-rules`, `boundaries-zod` (parcial: propio repo), `docs-parity`, `decisions`, `forbidden-mentions`, `support-matrix`, `agent-checklist-impact`, `workflows`, `versions` (parcial). Quedan para la fase 0.2 como comprobaciones sobre repos ajenos: `node-pointer` contra release, `node-contract`, `layout`, `stack`, `machine-contracts`, `installer`, `release`, `secrets-hygiene`.

**Placeholders.** No hay "TBD/TODO"; los `<completar>` de `CONTRACT.md` son parte de la plantilla para nodos (contenido que cada nodo rellena), no del plan. Los stubs `NOT_IMPLEMENTED` son deliberados y documentados con su fase.

**Consistencia de tipos.** `Finding { ruleId, verdict, evidence, messageKey, params }`, `MessageCatalog`/`MessageKey`/`MessageParams`/`Locale` (`messages/types.ts`), `renderMessage`, `renderFinding`, `pass(ruleId, key, params?)`/`fail(ruleId, evidence, key, params?)` (todas las llamadas de las Tasks 3–9 y 12 usan claves del catálogo, nunca texto literal), `FileTree`, `treeFrom`, `listUnder`, `read`, `ValidatorOptions { forbiddenMentions; parseYaml; today }` (ampliada en Task 8; los tests de Tasks 4–7 se actualizan en ese paso), `VALIDATORS`, `runValidators`, `VerifyReport { checks: ReportedFinding[] }` con `ReportedFinding = Finding & { message: { es; en } }`, `renderNodeFiles`/`NodeVars`, `run`, `packStandard`/`PackResult`, `buildDecisionsIndex`, `buildNotionMap`, `WorkflowSchema`/`checkWorkflowShape`/`jobsOf`/`runStepsOf`, `runWorkflow`/`WorkflowRunResult`: nombres idénticos en definición y uso. Funciones puente de `app` para respetar capas: `readRepoTree`, `runCommand`, `readTemplatesTree`, `writeRenderedFiles`, `writeJsonSchemas`.

**Requisito no cubierto por decisión explícita.** El paquete compartido `bun release` (spec §4.7) y su publicación multiplataforma se construyen en la fase 0.4 sobre el script de Engines; aquí solo se deja la plantilla que lo invoca y los stubs.

## Impacto en el procedimiento de agentes

Sí: esta fase crea la matriz de soporte (`standard/support-matrix.json`) y el runbook (`standard/procedures/add-agent-runbook.md`) que el procedimiento de agentes usa desde ahora; las celdas que quedaron en `revalidate` tienen plazo 2026-10-22 y el validador `support-matrix` falla si una celda supera los 30 días sin que una persona registre la revalidación.
