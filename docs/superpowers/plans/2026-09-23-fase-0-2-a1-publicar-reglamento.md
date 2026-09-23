# Fase 0.2 · Plan A1 — Publicar el reglamento desde forge614-ai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date:** 2026-09-23
**Type:** feature
**Status:** in_progress

**Goal:** Que el estándar 1.0.0 quede descargable desde una release de GitHub de `forge614-ai` (`standard-1.0.0.tar.gz` + `SHA256SUMS` + `pack-manifest.json`) mediante un workflow delgado disparado por el tag `standard-v1.0.0`, para que Sentinel pueda obtenerlo.

**Architecture:** Un script nuevo `standard:release` (CLI en `interfaces`, lógica en `app`) que valida que el tag pedido coincide con `standard/VERSION` y con el puntero, empaqueta con `packStandard`, y publica con `gh release create`. Un workflow `standard-release.yml` de tres pasos que lo invoca. Todo lo demás (empaquetado, huellas, puntero) ya existe y se reutiliza sin cambios.

**Tech Stack:** TypeScript 5.9 `strict`, Bun 1.4.2, Zod 4, `gh` (GitHub CLI, presente en los runners), workflows delgados (acta 0019).

**Spec:** `docs/superpowers/specs/2026-09-23-entrega-0-fase-0-2-sentinel-design.md` §5.1 (y §9.2 paso 1).

## Global Constraints

- Bun 1.4.2 en CI (acta 0026); `engines.bun >= 1.3.9`.
- Capas: `interfaces → app → (modules, infrastructure)`; `modules` solo `node:crypto`, `node:util`, `zod` (test `tests/architecture/import-rules.test.ts`).
- Zod `.strict()` en toda frontera (argv, JSON); sin `any`, `@ts-ignore`, `as` sobre datos externos; sin claves `undefined`.
- Contratos de máquina (acta 0013): stdout un solo JSON con `schemaVersion: 1`; errores `{ schemaVersion, code, error }` en stderr; códigos `^[A-Z][A-Z0-9_]+$`; salidas `0/1/2`; `--help` y `--version` en toda CLI (`printVersionIfRequested`); sobre `runCli`.
- Workflows delgados: cada `run` es `bun install --frozen-lockfile`, `bun test` o `bun run <script>` sin argumentos; `uses` fijados por SHA; `timeout-minutes` obligatorio; cada job documentado en `docs/es/05-workflows.md` y su gemela.
- `standard/` NO se toca en este plan (el sha256 `18d4455f…` debe seguir siendo el publicado).
- Docs siempre es/en con el mismo número de encabezados; sin términos de `standard/forbidden-mentions.json`; sin atribución a IA en ningún texto ni commit.
- Los ayudantes nunca ejecutan `git commit/add/push/tag`; el propietario lo hace tras cada revisión.

## Review Focus

1. Tag que no coincide con `standard/VERSION` (por ejemplo `standard-v1.0.1` con VERSION `1.0.0`): el script debe fallar con `STANDARD_RELEASE_TAG_MISMATCH` y no publicar nada. (Task 1, test 3.)
2. Puntero desactualizado respecto al árbol (alguien editó `standard/` sin `--update-pointer`): `standard:release` debe fallar con `STANDARD_PACK_DRIFT` antes de publicar. (Task 1, test 4.)
3. Release ya existente para esa versión: `gh release create` falla; el script debe devolver `STANDARD_RELEASE_FAILED` con el stderr de `gh` y no dejar `dist/` a medias como "publicado". (Task 1, test 5 con `gh` simulado.)
4. `gh` ausente en la máquina (ejecución local): mensaje claro `STANDARD_RELEASE_FAILED: gh not found`, no un stack trace. (Task 1, test 6.)
5. Nombre de tag en el entorno de CI (`GITHUB_REF_NAME`) frente a `--tag` explícito: el flag manda; sin ninguno de los dos → `INVALID_ARGUMENTS`. (Task 1, tests 1 y 2.)

---

### Task 1: `standard:release` — lógica en `app` y CLI

**Files:**
- Create: `src/app/release-standard.ts`, `src/app/release-standard.test.ts`
- Create: `src/interfaces/cli/standard-release.ts`, `src/interfaces/cli/standard-release.test.ts`
- Modify: `package.json` (script `standard:release`)

**Interfaces:**
- Consumes: `packStandard(root, outDir): PackResult` (`src/app/pack-standard.ts`), `checkStandardPack({ root, pointerPath, sumsPath })` (`src/app/check-standard-pack.ts`), `runCommand(cmd, options)` (`src/app/run-command.ts`), `parseFlags`/`parsePairs`/`issuesOf` (`src/interfaces/cli/args.ts`), `printJson`/`printError`/`runCli` (`src/interfaces/cli/output.ts`), `printVersionIfRequested` (`src/interfaces/cli/version.ts`), `repoRoot` (`src/app/repo.ts`).
- Produces:
  ```ts
  // src/app/release-standard.ts
  export interface ReleaseStandardOptions {
    root: string;                // raíz del repo
    tag: string;                 // "standard-v1.0.0"
    outDir: string;              // normalmente <root>/dist
    exec: (cmd: string[], options?: { cwd?: string }) => { exitCode: number; stdout: string; stderr: string }; // inyectable para tests
    dryRun: boolean;             // true: no ejecuta gh, devuelve el comando
  }
  export type ReleaseStandardResult =
    | { ok: true; version: string; sha256: string; tarSha256: string; assets: string[]; command: string[]; published: boolean }
    | { ok: false; code: "STANDARD_RELEASE_TAG_MISMATCH" | "STANDARD_PACK_DRIFT" | "STANDARD_RELEASE_FAILED"; error: string };
  export function releaseStandard(options: ReleaseStandardOptions): ReleaseStandardResult;
  export const STANDARD_TAG_PATTERN = /^standard-v(\d+\.\d+\.\d+)$/;
  ```

- [ ] **Step 1: Escribir los tests de `app` (fallan: módulo inexistente)**

```ts
// src/app/release-standard.test.ts
import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { releaseStandard, STANDARD_TAG_PATTERN } from "./release-standard";

const REPO_ROOT = resolve(import.meta.dir, "../..");

type Call = { cmd: string[]; cwd?: string };
function fakeExec(calls: Call[], result = { exitCode: 0, stdout: "https://github.com/jotredev/forge614-ai/releases/tag/standard-v1.0.0\n", stderr: "" }) {
  return (cmd: string[], options?: { cwd?: string }) => {
    calls.push({ cmd, ...(options?.cwd === undefined ? {} : { cwd: options.cwd }) });
    return result;
  };
}

test("the tag pattern accepts standard-vX.Y.Z only", () => {
  expect(STANDARD_TAG_PATTERN.test("standard-v1.0.0")).toBe(true);
  expect(STANDARD_TAG_PATTERN.test("v1.0.0")).toBe(false);
  expect(STANDARD_TAG_PATTERN.test("standard-v1.0")).toBe(false);
});

test("dry run packs, verifies the pointer and returns the gh command without executing it", () => {
  const out = mkdtempSync(join(tmpdir(), "standard-release-"));
  const calls: Call[] = [];
  try {
    const r = releaseStandard({ root: REPO_ROOT, tag: "standard-v1.0.0", outDir: out, exec: fakeExec(calls), dryRun: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.version).toBe("1.0.0");
    expect(r.published).toBe(false);
    expect(calls).toHaveLength(0);
    expect(r.command.slice(0, 4)).toEqual(["gh", "release", "create", "standard-v1.0.0"]);
    expect(r.assets).toEqual([join(out, "standard-1.0.0.tar.gz"), join(out, "SHA256SUMS"), join(out, "pack-manifest.json")]);
    expect(readFileSync(join(out, "SHA256SUMS"), "utf8")).toContain(r.sha256);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("a tag whose version differs from standard/VERSION fails with STANDARD_RELEASE_TAG_MISMATCH and calls nothing", () => {
  const out = mkdtempSync(join(tmpdir(), "standard-release-"));
  const calls: Call[] = [];
  try {
    const r = releaseStandard({ root: REPO_ROOT, tag: "standard-v9.9.9", outDir: out, exec: fakeExec(calls), dryRun: false });
    expect(r).toMatchObject({ ok: false, code: "STANDARD_RELEASE_TAG_MISMATCH" });
    expect(calls).toHaveLength(0);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("a pointer that does not match the tree fails with STANDARD_PACK_DRIFT before publishing", () => {
  // Copia mínima del repo con el puntero alterado: solo standard/ y forge614.node.json hacen falta.
  const root = mkdtempSync(join(tmpdir(), "standard-release-root-"));
  const calls: Call[] = [];
  try {
    const { cpSync, writeFileSync } = require("node:fs") as typeof import("node:fs");
    cpSync(join(REPO_ROOT, "standard"), join(root, "standard"), { recursive: true });
    const pointer = JSON.parse(readFileSync(join(REPO_ROOT, "forge614.node.json"), "utf8")) as { standard: { sha256: string } };
    pointer.standard.sha256 = "0".repeat(64);
    writeFileSync(join(root, "forge614.node.json"), `${JSON.stringify(pointer, null, 2)}\n`);
    const r = releaseStandard({ root, tag: "standard-v1.0.0", outDir: join(root, "dist"), exec: fakeExec(calls), dryRun: false });
    expect(r).toMatchObject({ ok: false, code: "STANDARD_PACK_DRIFT" });
    expect(calls).toHaveLength(0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a failing gh (release already exists) surfaces STANDARD_RELEASE_FAILED with gh's stderr", () => {
  const out = mkdtempSync(join(tmpdir(), "standard-release-"));
  const calls: Call[] = [];
  try {
    const r = releaseStandard({ root: REPO_ROOT, tag: "standard-v1.0.0", outDir: out, exec: fakeExec(calls, { exitCode: 1, stdout: "", stderr: "release standard-v1.0.0 already exists" }), dryRun: false });
    expect(r).toMatchObject({ ok: false, code: "STANDARD_RELEASE_FAILED" });
    if (r.ok) return;
    expect(r.error).toContain("already exists");
    expect(calls).toHaveLength(1);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("a missing gh binary is reported as STANDARD_RELEASE_FAILED, not thrown", () => {
  const out = mkdtempSync(join(tmpdir(), "standard-release-"));
  try {
    const exec = () => { throw new Error("spawn gh ENOENT"); };
    const r = releaseStandard({ root: REPO_ROOT, tag: "standard-v1.0.0", outDir: out, exec, dryRun: false });
    expect(r).toMatchObject({ ok: false, code: "STANDARD_RELEASE_FAILED" });
    if (r.ok) return;
    expect(r.error).toContain("gh");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
```

Nota para el implementador: el test 4 usa `cpSync` + `writeFileSync` con `require` tipado para no arrastrar imports que otros tests no usan; si el equipo prefiere `import { cpSync, writeFileSync } from "node:fs"` arriba, es equivalente.

- [ ] **Step 2: Ejecutar para ver el fallo**

Run: `bun test src/app/release-standard.test.ts`
Expected: FAIL `Cannot find module "./release-standard"`.

- [ ] **Step 3: Implementar `src/app/release-standard.ts`**

```ts
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { checkStandardPack } from "./check-standard-pack";
import { packStandard } from "./pack-standard";

export const STANDARD_TAG_PATTERN = /^standard-v(\d+\.\d+\.\d+)$/;

export interface ReleaseStandardOptions {
  root: string;
  tag: string;
  outDir: string;
  exec: (cmd: string[], options?: { cwd?: string }) => { exitCode: number; stdout: string; stderr: string };
  dryRun: boolean;
}

export type ReleaseStandardResult =
  | { ok: true; version: string; sha256: string; tarSha256: string; assets: string[]; command: string[]; published: boolean }
  | { ok: false; code: "STANDARD_RELEASE_TAG_MISMATCH" | "STANDARD_PACK_DRIFT" | "STANDARD_RELEASE_FAILED"; error: string };

// Publishes the packaged standard as a GitHub release. Order matters: the tag
// must name the version the tree declares, the committed pointer must match a
// fresh pack (no silent drift ships), and only then the archive is built into
// outDir and handed to `gh`. Nothing is published on any failure.
export function releaseStandard(options: ReleaseStandardOptions): ReleaseStandardResult {
  const match = STANDARD_TAG_PATTERN.exec(options.tag);
  const declared = readFileSync(resolve(options.root, "standard/VERSION"), "utf8").trim();
  if (match === null || match[1] !== declared) {
    return {
      ok: false,
      code: "STANDARD_RELEASE_TAG_MISMATCH",
      error: `tag '${options.tag}' does not name standard/VERSION '${declared}' (expected 'standard-v${declared}')`,
    };
  }

  const check = checkStandardPack({
    root: options.root,
    pointerPath: resolve(options.root, "forge614.node.json"),
    sumsPath: resolve(options.root, "dist/SHA256SUMS"),
  });
  if (!check.ok) return { ok: false, code: "STANDARD_PACK_DRIFT", error: check.error };

  const result = packStandard(options.root, options.outDir);
  const assets = [
    join(options.outDir, `standard-${result.version}.tar.gz`),
    join(options.outDir, "SHA256SUMS"),
    join(options.outDir, "pack-manifest.json"),
  ];
  const command = [
    "gh", "release", "create", options.tag,
    ...assets,
    "--title", `Estándar de Nodo ${result.version}`,
    "--notes", `Estándar de Nodo Forge614 ${result.version}. sha256 ${result.sha256}. Instalación y verificación: forge614-sentinel.`,
    "--verify-tag",
  ];

  if (options.dryRun) {
    return { ok: true, version: result.version, sha256: result.sha256, tarSha256: result.tarSha256, assets, command, published: false };
  }

  let run: { exitCode: number; stdout: string; stderr: string };
  try {
    run = options.exec(command, { cwd: options.root });
  } catch (error) {
    return { ok: false, code: "STANDARD_RELEASE_FAILED", error: `gh could not be executed: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (run.exitCode !== 0) {
    return { ok: false, code: "STANDARD_RELEASE_FAILED", error: `gh release create exited ${run.exitCode}: ${run.stderr.trim()}` };
  }
  return { ok: true, version: result.version, sha256: result.sha256, tarSha256: result.tarSha256, assets, command, published: true };
}
```

- [ ] **Step 4: Ejecutar los tests de `app`**

Run: `bun test src/app/release-standard.test.ts`
Expected: 6 pass. Si el test 2 falla porque `checkStandardPack` detecta drift en tu árbol, ejecuta antes `bun run standard:check`: el puntero comprometido debe coincidir (este plan no toca `standard/`).

- [ ] **Step 5: Escribir los tests de la CLI (fallan: archivo inexistente)**

```ts
// src/interfaces/cli/standard-release.test.ts
import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { run } from "../../infrastructure/process";

const CLI = resolve(import.meta.dir, "standard-release.ts");
const REPO_ROOT = resolve(import.meta.dir, "../../..");

test("an unknown flag fails with INVALID_ARGUMENTS and exit 2", () => {
  const r = run(["bun", "run", CLI, "--tag", "standard-v1.0.0", "--dry-rn"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(2);
  expect(JSON.parse(r.stderr.trim())).toMatchObject({ schemaVersion: 1, code: "INVALID_ARGUMENTS" });
});

test("without --tag and without GITHUB_REF_NAME it fails with INVALID_ARGUMENTS", () => {
  const r = run(["bun", "run", CLI, "--dry-run"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(2);
  expect(JSON.parse(r.stderr.trim())).toMatchObject({ schemaVersion: 1, code: "INVALID_ARGUMENTS" });
});

test("--dry-run with --tag prints the plan and exits 0 without publishing", () => {
  const r = run(["bun", "run", CLI, "--tag", "standard-v1.0.0", "--dry-run"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(0);
  const out: unknown = JSON.parse(r.stdout.trim());
  expect(out).toMatchObject({ schemaVersion: 1, ok: true, version: "1.0.0", published: false });
});

test("a mismatching tag exits 1 with STANDARD_RELEASE_TAG_MISMATCH", () => {
  const r = run(["bun", "run", CLI, "--tag", "standard-v9.9.9", "--dry-run"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(1);
  expect(JSON.parse(r.stderr.trim())).toMatchObject({ schemaVersion: 1, code: "STANDARD_RELEASE_TAG_MISMATCH" });
});

test("--help prints the usage envelope and exits 0", () => {
  const r = run(["bun", "run", CLI, "--help"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(0);
  expect(JSON.parse(r.stdout.trim())).toMatchObject({ schemaVersion: 1, usage: "standard-release [--tag standard-vX.Y.Z] [--dry-run]" });
});
```

- [ ] **Step 6: Ejecutar para ver el fallo**

Run: `bun test src/interfaces/cli/standard-release.test.ts`
Expected: FAIL (el archivo `standard-release.ts` no existe; `bun run` sale distinto de 0).

- [ ] **Step 7: Implementar `src/interfaces/cli/standard-release.ts`**

```ts
import { resolve } from "node:path";
import { z } from "zod";
import { releaseStandard } from "../../app/release-standard";
import { repoRoot } from "../../app/repo";
import { runCommand } from "../../app/run-command";
import { issuesOf } from "./args";
import { printError, printJson, runCli } from "./output";
import { printVersionIfRequested } from "./version";

const USAGE = "standard-release [--tag standard-vX.Y.Z] [--dry-run]";

// argv is a mix: `--tag <value>` pairs and bare flags. Every token becomes a
// key so the strict schema rejects anything unknown.
const Args = z
  .object({
    help: z.literal(true).optional(),
    "dry-run": z.literal(true).optional(),
    tag: z.string().regex(/^standard-v\d+\.\d+\.\d+$/, "must be standard-vX.Y.Z").optional(),
  })
  .strict();

function parseArgs(argv: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--tag") {
      const value = argv[i + 1];
      out.tag = value === undefined ? true : value;
      i += 1;
      continue;
    }
    out[arg.startsWith("--") ? arg.slice(2) : arg] = true;
  }
  return out;
}

function main(argv: string[]): number {
  if (printVersionIfRequested(argv)) return 0;
  const parsed = Args.safeParse(parseArgs(argv));
  if (!parsed.success) {
    printError("INVALID_ARGUMENTS", issuesOf(parsed.error));
    return 2;
  }
  if (parsed.data.help) {
    printJson({ schemaVersion: 1, usage: USAGE });
    return 0;
  }

  const envTag = process.env.GITHUB_REF_NAME;
  const tag = parsed.data.tag ?? (envTag !== undefined && envTag !== "" ? envTag : undefined);
  if (tag === undefined) {
    printError("INVALID_ARGUMENTS", "no tag: pass --tag standard-vX.Y.Z or run inside a tag workflow (GITHUB_REF_NAME)");
    return 2;
  }

  const result = releaseStandard({
    root: repoRoot,
    tag,
    outDir: resolve(repoRoot, "dist"),
    exec: (cmd, options) => runCommand(cmd, options === undefined || options.cwd === undefined ? {} : { cwd: options.cwd }),
    dryRun: parsed.data["dry-run"] === true,
  });
  if (!result.ok) {
    printError(result.code, result.error);
    return 1;
  }
  printJson({ schemaVersion: 1, ...result });
  return 0;
}

process.exit(runCli("STANDARD_RELEASE_FAILED", () => main(process.argv.slice(2))));
```

- [ ] **Step 8: Añadir el script a `package.json`**

En `scripts`, después de `"standard:check"`: `"standard:release": "bun run src/interfaces/cli/standard-release.ts"`.

- [ ] **Step 9: Ejecutar tests y verificación**

Run: `bun test src/interfaces/cli/standard-release.test.ts src/app/release-standard.test.ts && bun run typecheck && bun test`
Expected: todo en verde; `src/interfaces/cli/version.test.ts` (parametrizado) descubre la CLI nueva y comprueba `--version` solo.

- [ ] **Step 10: Commit (lo hace el propietario)**

```bash
git add src/app/release-standard.ts src/app/release-standard.test.ts src/interfaces/cli/standard-release.ts src/interfaces/cli/standard-release.test.ts package.json
git commit -m "feat(standard): script standard:release que publica el reglamento empaquetado con gh"
```

---

### Task 2: Workflow `standard-release.yml`, documentación y contrato

**Files:**
- Create: `.github/workflows/standard-release.yml`
- Modify: `docs/es/05-workflows.md`, `docs/en/05-workflows.md` (sección nueva `## \`standard-release.yml\`` con tabla `| Job |`)
- Modify: `CONTRACT.md`, `CONTRACT.en.md` (fila de comando y códigos `STANDARD_RELEASE_TAG_MISMATCH`, `STANDARD_RELEASE_FAILED`)
- Modify: `docs/es/04-verificacion-y-empaquetado.md`, `docs/en/04-verification-and-packaging.md` (párrafo "Cómo se publica el reglamento")

**Interfaces:**
- Consumes: script `standard:release` (Task 1); validador de workflows (`bun run workflows:check` exige `timeout-minutes`, `uses` con SHA, `run` = `bun run <script>`, job documentado en `docs/es/05-workflows.md`).
- Produces: release de GitHub `standard-v1.0.0` con `standard-1.0.0.tar.gz`, `SHA256SUMS`, `pack-manifest.json`.

- [ ] **Step 1: Escribir el workflow**

```yaml
name: standard-release
on:
  push: { tags: ["standard-v*"] }
jobs:
  standard-release:
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    permissions: { contents: write }
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4.3.1
      - uses: oven-sh/setup-bun@735343b667d3e6f658f44d0eca948eb6282f2b76 # v2.0.2
        with: { bun-version: "1.4.2" }
      - run: bun install --frozen-lockfile
      - run: bun run standard:check
      - run: bun run standard:release
        env: { GH_TOKEN: "${{ github.token }}" }
```

Nota: gh no lee el token solo: el paso lo recibe en `GH_TOKEN` desde `${{ github.token }}`; `permissions: contents: write` es lo que autoriza crear la release. `GITHUB_REF_NAME` trae el nombre del tag.

- [ ] **Step 2: Documentar el job en `docs/es/05-workflows.md` y su gemela**

Añadir, después de la sección de `release.yml` y antes de "Validar antes de integrar", una sección con el mismo número de encabezados en ambos idiomas:

```markdown
## `standard-release.yml`

| Job | Disparador | Qué ejecuta | Qué publica | Duración esperada |
| --- | --- | --- | --- | --- |
| `standard-release` | tag `standard-v*` | `bun install --frozen-lockfile`, `bun run standard:check`, `bun run standard:release` en `ubuntu-24.04` | release de GitHub con `standard-<versión>.tar.gz`, `SHA256SUMS` y `pack-manifest.json`; el tag debe coincidir con `standard/VERSION` y el puntero con el árbol | ~2 min |

Es el mecanismo mínimo de publicación del reglamento (spec de la fase 0.2, §5.1): Sentinel descarga el paquete de esa release y comprueba su huella. Una release existente no se reemplaza: publicar la misma versión dos veces falla.
```

Inglés equivalente (`## \`standard-release.yml\``, "Job / Trigger / What it runs / What it publishes / Expected duration"). Actualizar también la tabla de "Acciones fijadas" solo si se añade una acción nueva (no se añade).

- [ ] **Step 3: Contrato**

En `CONTRACT.md` tabla de comandos, después de `standard:check`:

```markdown
| `bun run standard:release` | `[--tag standard-vX.Y.Z] [--dry-run]` (sin `--tag` usa `GITHUB_REF_NAME`) | `{ ok: true, version, sha256, tarSha256, assets, command, published }`; publica la release de GitHub del estándar | `1` | `0`; `1` `STANDARD_RELEASE_TAG_MISMATCH`, `STANDARD_PACK_DRIFT` o `STANDARD_RELEASE_FAILED`; `2` `INVALID_ARGUMENTS` |
```

Y en la tabla de códigos:

```markdown
| `STANDARD_RELEASE_TAG_MISMATCH` | `standard:release`: el tag no nombra la versión de `standard/VERSION` |
| `STANDARD_RELEASE_FAILED` | `standard:release`: `gh` no pudo ejecutarse o la release no se creó (por ejemplo, ya existía) |
```

Gemela en inglés con las mismas filas. Añadir `standard:release` a la fila de `INVALID_ARGUMENTS` como parser estricto.

- [ ] **Step 4: Docs 04 (es/en)**

En la sección de `standard:pack` y `SHA256SUMS`, un párrafo final: "Publicación: el tag `standard-v<versión>` dispara `standard-release.yml`, que verifica el puntero y publica la release con el paquete y su huella (documento 05). Esa release es lo que descarga Sentinel." Mismo número de encabezados.

- [ ] **Step 5: Validar**

Run: `bun run workflows:check && bun run notion-map:build && bun run verify`
Expected: `workflows:check` pass con `standard-release` documentado; `verify` pass (bilingual-docs con paridad; notion-map al día).

- [ ] **Step 6: Commit (lo hace el propietario)**

```bash
git add .github/workflows/standard-release.yml docs/es/05-workflows.md docs/en/05-workflows.md docs/es/04-verificacion-y-empaquetado.md docs/en/04-verification-and-packaging.md docs/notion-map.json CONTRACT.md CONTRACT.en.md
git commit -m "ci: workflow standard-release que publica el reglamento al crear un tag standard-v*"
```

---

### Task 3: Publicar el reglamento 1.0.0 (lo hace el propietario tras fusionar)

**Files:** ninguno (operación de Git y GitHub).

- [ ] **Step 1: Fusionar el PR de este plan a `main` (rebase).**
- [ ] **Step 2: Crear y subir el tag**

```bash
git checkout main && git pull
git tag standard-v1.0.0
git push origin standard-v1.0.0
```

- [ ] **Step 3: Comprobar la release**

Run: `gh release view standard-v1.0.0 --json assets -q '.assets[].name'`
Expected: `standard-1.0.0.tar.gz`, `SHA256SUMS`, `pack-manifest.json`. Descargar `SHA256SUMS` y comprobar que contiene `18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922`.

- [ ] **Step 4: Registrar en Engram** el enlace de la release y el sha256 publicado (lo hace el coordinador).

---

## Impacto en el procedimiento de agentes

No: este plan no cambia cómo los asistentes de IA arrancan ni qué se les inyecta; solo añade un workflow de publicación y un script.
