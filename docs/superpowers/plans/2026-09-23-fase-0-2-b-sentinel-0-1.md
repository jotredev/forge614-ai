# Fase 0.2 · Plan B — `forge614-sentinel` 0.1: el verificador independiente

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date:** 2026-09-23
**Type:** feature
**Status:** in_progress

**Goal:** Crear el repositorio `jotredev/forge614-sentinel` desde las plantillas del estándar 1.0.0 y entregar Sentinel 0.1: el comando `forge614-sentinel check` (19 comprobaciones, informe `CheckReport` de la spec §6, códigos de la spec §7), el subcomando `standard fetch`, la caché verificada del reglamento, la autoverificación, la paridad de informe en tres sistemas y la release de binarios para cinco plataformas.

**Architecture:** Un solo nodo con las cuatro capas del estándar. `modules` es puro: `RepoSnapshot` (archivos + hechos de Git), esquemas Zod (`CheckReport`, `NodePointer`, manifiestos, `pack.json`, manifiesto de caché, workflows), catálogo de mensajes es/en tipado, lector ustar y un módulo por comprobación en `modules/checks/<id>.ts` con `appliesWhen` y `run(snapshot, params): CheckResult`. `infrastructure` lee el árbol (por `git ls-files` cuando hay Git, por recorrido de disco si no), obtiene hechos de Git con timeout, ejecuta procesos, descomprime tar.gz (fflate + lector propio), calcula sha256, escribe la caché de forma atómica y descarga releases con un `fetch` inyectable. `app` orquesta: `classifyRepository`, `takeSnapshot`, `loadStandard`/`fetchStandard`, `buildCheckParams` (todo parámetro sale del reglamento cargado), `runChecks` (selección por pack + `--only`, `appliesWhen`, captura de `CHECK_FAILED`), `buildReport` y los casos de uso de release. `interfaces/cli` traduce argv (Zod `.strict()`) a esos casos de uso y escribe un solo JSON en stdout y sobres de error en stderr.

**Tech Stack:** TypeScript 5.9 `strict`, Bun 1.4.2 (CI) / `engines.bun >= 1.3.9`, Zod 4.6.5, fflate 0.8.3 (`gunzipSync`, `gzipSync`, `zipSync`), yaml 2.8.1, `bun build --compile` por plataforma, `gh` en los runners.

**Spec:** `docs/superpowers/specs/2026-09-23-entrega-0-fase-0-2-sentinel-design.md` §3–§14 (aprobada 2026-09-23). Actas 0005, 0009, 0012, 0013, 0017–0026.

**Prerequisito:** la release `standard-v1.0.0` de `forge614-ai` publicada (plan A1; publicada el 2026-09-23 con `standard-1.0.0.tar.gz`, `SHA256SUMS` y `pack-manifest.json`, huella `18d4455f…`). Este plan fija esa versión: las plantillas (Task 1) y la fixture del reglamento (Task 5) salen de esa release con `gh release download standard-v1.0.0 -R jotredev/forge614-ai`, nunca ejecutando código de `forge614-ai`. Los tests y la autoverificación usan la copia `fixtures/standard/` (el mismo paquete, la misma huella), así que no necesitan red.

## Fuera de este plan

Estas piezas de la spec §9.1 no se implementan aquí; cada una tiene su plan dueño:

| Pieza (spec §9.1) | Plan dueño |
| --- | --- |
| Script `sentinel:install` en la plantilla del estándar | Plan A2 (forge614-ai): adopción de Sentinel y estándar 1.1.0 |
| `SENTINEL_NOT_INSTALLED` en el `verify` de los nodos | Plan A2 (forge614-ai) para `forge614-ai`; fase 0.4: adopción en los demás nodos |
| Plantilla `verify.yml` con Sentinel | Plan A2 (forge614-ai): adopción de Sentinel y estándar 1.1.0 |
| Adopción de Sentinel en `forge614-ai` (retirar sus validadores, `check` en su `verify`) | Plan A2 (forge614-ai): adopción de Sentinel y estándar 1.1.0 |
| Estándar 1.1.0 (`layout.json`, `stack.json`, `secret-patterns.json`, `sentinel.version` en el puntero, `parity` en `BRANCH_PROTECTION`) | Plan A2 (forge614-ai): adopción de Sentinel y estándar 1.1.0 |
| Adopción de Sentinel en Engram, Engines, Atlas, Workers, Shell y Hub | fase 0.4: adopción en los demás nodos |

Para este plan `forge614-ai` es de solo lectura: ningún paso lo modifica.

## Mapa de tareas

1. Bootstrap del repositorio desde las plantillas 1.0.0 y prueba de capas
2. `modules` portado: esquemas Zod, `package-name`, `workflow`, `json-data` y `headings`
3. Núcleo de `modules`: `RepoSnapshot`, `CheckResult`, `CheckParams`, esquema del informe y catálogo de mensajes
4. `modules`: lector ustar, writer ustar portado y CRC-32
5. `infrastructure`: fixture del reglamento, árbol del repositorio, hechos de Git, procesos, tar.gz verificado y escritura atómica
6. `infrastructure` y `app`: caché del reglamento, red inyectable y entorno
7. `modules` y `app`: `StandardSource`, `loadStandard` (caché verificada) y `fetchStandard` (descarga con `fetch` inyectable)
8. `app`: clasificación del repositorio, snapshot y construcción de `CheckParams` desde el reglamento
9. Comprobaciones trasladadas `package-naming` y `forbidden-mentions`
10. Comprobaciones trasladadas `docs-parity`, `decisions` y `agent-checklist-impact`
11. Comprobaciones trasladadas `error-codes` y `support-matrix`
12. Comprobaciones trasladadas `workflows` y `context-budget`
13. Comprobaciones trasladadas `ecosystem-contract` y `rules-catalog` (fusiona `packs-catalog`)
14. Comprobaciones nuevas `node-pointer` y `layout`
15. Comprobaciones nuevas `stack` y `secrets-hygiene`
16. Comprobación nueva `node-contract`
17. Comprobación nueva `installer` (con render mínimo de plantillas)
18. Comprobación nueva `release`
19. Comprobación nueva `versions` y registro de comprobaciones
20. Fixtures de nodo completo: `pass-node`, `fail-node`, `external-project` y `foreign-folder`
21. `app`: `runChecks`, `buildReport` y el orquestador `checkRepository`
22. CLI `check`: versión, argumentos, códigos y el comando principal
23. CLI `standard fetch`, despachador `main` y release falsa para revisiones forzadas
24. Autoverificación: `verify`, `workflows:check`, `workflows:run`, `notion-map:build` y el gancho
25. Empaquetado y compilación por plataforma: `packaging` y `buildTarget`
26. Smoke, publicación y CLIs de release: `smoke:target`, `release:publish`, `build:target`
27. E2E con el binario, paridad en tres sistemas y presupuesto de 5 s
28. Documentación bilingüe 00–04, `CONTRACT.md`, `docs/notion-map.json` y protección de rama
29. Cierre: autoverificación final, protección de rama y release v0.1.0 (lo hace el propietario)

## Global Constraints

- Bun 1.4.2 en todo workflow (acta 0026); `engines.bun >= 1.3.9`; `bun.lock` único lockfile; `bun install --frozen-lockfile` en CI.
- Capas: `interfaces → app → (modules, infrastructure)`, `infrastructure → modules`; `modules` solo importa `node:crypto`, `node:util` y `zod` (test `tests/architecture/import-rules.test.ts`, Task 1). El lector ustar es puro y vive en `modules`; `fflate` y `yaml` se usan solo desde `infrastructure`/`app` y llegan a las comprobaciones como funciones o datos en `CheckParams`.
- Zod `.strict()` en toda frontera: argv, `forge614.node.json`, `manifest.json` de la caché, `pack.json`, manifiestos de regla, `forbidden-mentions.json`, `support-matrix.json`, YAML de workflows, `SHA256SUMS`, respuestas de red. Sin `any`, sin `@ts-ignore`/`@ts-expect-error`, sin `as` sobre datos externos, sin claves con valor `undefined` (`exactOptionalPropertyTypes`).
- Contratos de máquina (acta 0013): stdout un solo JSON con `schemaVersion: 1`; errores `{ schemaVersion: 1, code, error }` en stderr sin rutas absolutas ni stack traces; códigos `^[A-Z][A-Z0-9_]+$`; salidas `0/1/2`; `--help` y `--version` en toda CLI antes de cualquier otro análisis (`printVersionIfRequested`); toda CLI termina en `process.exit(runCli(CODE, main))`.
- Workflows delgados (acta 0019): cada `run` es `bun install --frozen-lockfile`, `bun test` o `bun run <script>`; `uses` fijados por SHA de 40 hex; `timeout-minutes` obligatorio; cada job documentado en `docs/es/04-workflows.md` y su gemela.
- Sin red durante `runChecks`: la única red posible es `fetchStandard`, antes de las comprobaciones, y solo cuando la versión pedida no está en caché. Sin escritura en el repositorio revisado: Sentinel escribe únicamente bajo `<FORGE614_HOME o ~/.forge614>/standard/` y bajo su propio `dist/`.
- Ninguna comprobación devuelve `pass` por no saber: `not-applicable` (con motivo) o `caution` (con evidencia).
- Identificadores, comentarios, claves JSON y nombres de archivo en inglés; prosa de docs en español con gemela en inglés y el mismo número de encabezados; sin términos de `forbidden-mentions.json` (los fixtures usan `zzzproduct`, nunca un término real); sin atribución a IA en ningún texto ni mensaje de commit.
- Los ayudantes nunca ejecutan `git commit/add/push/tag`, ni `gh release`; el propietario lo hace tras cada revisión. `forge614-ai` y `forge614-engram` se leen, nunca se modifican desde este plan.
- Rendimiento: `check` sobre un nodo del ecosistema en menos de 5 s (test e2e con tope, Task 27).

## Review Focus

1. **Repositorio con CRLF (Windows, `core.autocrlf=true`).** Todo texto entra al `RepoSnapshot` normalizado a `\n` (Task 5, test "walkTree normalizes CRLF to LF"); `installer` y `release` comparan texto normalizado, así que un checkout con CRLF produce el mismo informe que uno con LF (Task 17, test "a CRLF checkout of install.sh passes", que escribe los bytes con `\r\n` en disco y pasa por `takeSnapshot`). La paridad de Task 27 lo prueba en `windows-2025` contra el golden generado en macOS.
2. **Puntero que declara una versión sin caché y sin red.** `check` intenta `fetchStandard`; si el `fetch` falla por red, sale `STANDARD_UNAVAILABLE` con el comando exacto `forge614-sentinel standard fetch <versión>` y **nunca** revisa con otra versión (Task 7, test "no cache and no network never falls back to another cached version"; Task 21, test "no cache and no network is STANDARD_UNAVAILABLE naming the fetch command; nothing is checked"; Task 27 e2e con `FORGE614_SENTINEL_OFFLINE=1`).
3. **Enlaces simbólicos y carpetas ignoradas.** Con Git disponible, el árbol sale de `git ls-files` (respeta `.gitignore`, omite `node_modules`, `dist`, `.env` local); un enlace simbólico (modo `120000`) y un archivo borrado del disco se omiten sin excepción (Task 5, tests "walkTree skips symlinks (never follows them) and lists files above MAX_TEXT_BYTES" y "readListedFiles reads only the given paths, skips a listed file missing from disk and uses / separators"). Sin Git, el recorrido de disco usa `lstat` y no sigue enlaces.
4. **Repositorio muy grande o carpeta ajena enorme (`~`).** `classifyRepository` decide por dos `existsSync` antes de leer nada: una carpeta ajena responde `applicable: false` sin recorrerla (Task 8, test "neither identity file is not a forge614 repo, and the tree is not read": la carpeta de prueba contiene una subcarpeta sin permiso de lectura, así que cualquier recorrido lanzaría `EACCES`; Task 21, test "external project and foreign folder are not applicable, without loading the standard"); los archivos de más de 2 MiB no entran al snapshot y quedan en `facts.skippedLargeFiles` (Task 5). El tope de 5 s de Task 27 mide el caso real.
5. **Una comprobación que lanza.** `runChecks` captura la excepción, devuelve la entrada `{ id, verdict: "fail", evidence: ["CHECK_FAILED: …"] }`, sigue con las demás, imprime el informe completo y además el sobre `CHECK_FAILED` en stderr con salida `1` (Task 21, test "a throwing check becomes CHECK_FAILED evidence with verdict fail; the others still run"; Task 22, test "a crashing check prints the report (verdict fail) on stdout AND a CHECK_FAILED envelope on stderr, exit 1").

---

## Estructura de archivos (resultado final de este plan)

```
forge614-sentinel/
├── package.json · tsconfig.json · bun.lock · .gitattributes · .gitignore
├── forge614.node.json                         puntero al estándar 1.0.0 (sha256 18d4455f…)
├── README.md · README.en.md · CONTRACT.md · CONTRACT.en.md · CHANGELOG.md · LICENSE · SECURITY.md
├── BRANCH_PROTECTION.md · BRANCH_PROTECTION.en.md · install.sh · install.ps1
├── .github/workflows/{verify.yml, release.yml}   plantilla + job parity añadido en verify.yml
├── .githooks/pre-push · .agents/templates/plan.md
├── docs/{es,en}/00..04 · docs/decisions/{TEMPLATE.md, INDEX.json} · docs/notion-map.json
├── fixtures/
│   ├── standard/standard-v1.0.0/{standard-1.0.0.tar.gz, SHA256SUMS}   paquete real 1.0.0 (74 741 bytes)
│   ├── pass-node/ · fail-node/ · external-project/ · foreign-folder/    nodos completos para e2e y paridad
│   ├── standard-corrupt/standard-v1.0.0/                               mismo paquete con SHA256SUMS falso (STANDARD_CORRUPT)
│   ├── golden/{pass-node.report.json, fail-node.report.json}
│   └── <check-id>/{pass,fail}/                                          fixtures unitarias por comprobación
├── src/
│   ├── modules/
│   │   ├── snapshot.ts · check.ts · check-params.ts · report.ts · json-data.ts · headings.ts
│   │   ├── package-name.ts · template.ts · semver.ts · tar-reader.ts · tar.ts · crc32.ts · workflow.ts
│   │   ├── standard-source.ts · source-text.ts · line-diff.ts · deep-diff.ts
│   │   ├── messages/{types,es,en,render}.ts
│   │   ├── schemas/{common,node-pointer,rule-manifest,pack,support-matrix,forbidden-mentions,
│   │   │            decisions-index,error-envelope,cache-manifest,sha256sums,index}.ts
│   │   └── checks/{index.ts, <19 ids>.ts}
│   ├── infrastructure/{fs-tree,git,process,hashing,archive,fs-write,cache,network,packaging}.ts
│   ├── app/{take-snapshot,classify-repository,load-standard,fetch-standard,build-check-params,
│   │        run-checks,build-report,check-repository,run-command,environment,repo,build-notion-map,
│   │        dev-params,check-own-workflows,run-workflows,build-target,smoke-target,release-publish,parity}.ts
│   └── interfaces/cli/{main,check,standard-fetch,verify,workflows-check,workflows-run,
│                       build-target,smoke-target,release-publish,sentinel-parity,notion-map-build,
│                       output,args,version,codes}.ts
└── tests/
    ├── architecture/import-rules.test.ts
    ├── full-node-fixtures.test.ts
    ├── helpers/{snapshot-from-dir,params,fake-release}.ts
    └── e2e/{binary.ts, check.e2e.test.ts, budget.e2e.test.ts}
```

Convención de tests: `x.ts` + `x.test.ts` juntos; e2e en `tests/e2e/` (usan el binario compilado o `bun run` del `main.ts`); fixtures de comprobación en `fixtures/<id>/{pass,fail}/` y se cargan con `snapshotFromDir` (helper de test, Task 3). Ningún archivo bajo `fixtures/` se llama `*.test.ts`: `bun test` los ejecutaría.

---

### Task 1: Bootstrap del repositorio desde las plantillas 1.0.0 y prueba de capas

**Files:**
- Create (renderizados desde las plantillas de la release `standard-v1.0.0`): `install.sh`, `install.ps1`, `.github/workflows/verify.yml`, `.github/workflows/release.yml`, `CONTRACT.md`, `CONTRACT.en.md`, `README.md`, `README.en.md`, `docs/decisions/TEMPLATE.md`, `.agents/templates/plan.md`, `.githooks/pre-push`, `BRANCH_PROTECTION.md`, `BRANCH_PROTECTION.en.md`, `docs/es/NN-workflows.md` → renombrado a `docs/es/04-workflows.md`, `docs/en/NN-workflows.md` → `docs/en/04-workflows.md`
- Create: `package.json`, `tsconfig.json`, `bun.lock`, `.gitattributes`, `.gitignore`, `forge614.node.json`, `LICENSE`, `SECURITY.md`, `CHANGELOG.md`, `docs/decisions/INDEX.json`, `docs/es/{00-resumen-y-guia-rapida,01-comprobaciones,02-reglamento-y-cache,03-integracion}.md`, `docs/en/{00-summary-and-quickstart,01-checks,02-standard-and-cache,03-integration}.md` (esqueletos: analogía + encabezados; contenido real en Task 28)
- Create: `tests/architecture/import-rules.test.ts`, `src/modules/.gitkeep`-equivalente (un archivo real por capa: ver paso 9)

**Interfaces:**
- Consumes: la release pública `standard-v1.0.0` de `jotredev/forge614-ai` (`gh release download`, solo lectura; ningún código de `forge614-ai` se ejecuta) y el script de un solo uso `/tmp/sentinel-render.ts` (paso 1).
- Produces: repositorio que pasa `bun install`, `bun run typecheck` y `bun test` (solo el test de capas) y cuyos archivos de plantilla son byte-idénticos a la plantilla 1.0.0 renderizada con `NODE_NAME=sentinel`, `REPO=jotredev/forge614-sentinel`, `ASSET_PREFIX=forge614-sentinel`, `STANDARD_VERSION=1.0.0` (lo exige la comprobación `installer`, Task 17, cuando Sentinel se revise a sí mismo).

- [ ] **Step 1: Descargar la release `standard-v1.0.0` y renderizar sus plantillas**

Run (fuera de cualquier repositorio; `forge614-ai` no se toca):
```bash
mkdir -p /tmp/standard-v1.0.0 && cd /tmp/standard-v1.0.0
gh release download standard-v1.0.0 -R jotredev/forge614-ai --pattern 'standard-1.0.0.tar.gz' --pattern 'SHA256SUMS' --clobber
shasum -a 256 -c SHA256SUMS
mkdir -p content && tar -xzf standard-1.0.0.tar.gz -C content
ls content/templates content/templates/hooks
```
Expected: `standard-1.0.0.tar.gz: OK`; `content/templates/` con las 15 plantillas (`BRANCH_PROTECTION.md`, `BRANCH_PROTECTION.en.md`, `CONTRACT.md`, `CONTRACT.en.md`, `README.md`, `README.en.md`, `decision.md`, `docs-workflows.md`, `docs-workflows.en.md`, `install.sh`, `install.ps1`, `plan.md`, `release.yml`, `verify.yml`, `hooks/pre-push`).

Crear el renderizador de un solo uso (vive en `/tmp`, no entra en ningún repositorio; aplica la misma regla de marcadores `{{NOMBRE}}` y los mismos destinos que el renderizador del estándar):

```ts
// /tmp/sentinel-render.ts
// One-off renderer for the 15 template files of standard 1.0.0.
// Usage: bun /tmp/sentinel-render.ts <templatesDir> <outDir> <node> <title> <repo>
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const [templatesDir, outDir, node, title, repo] = process.argv.slice(2);
if (templatesDir === undefined || outDir === undefined || node === undefined || title === undefined || repo === undefined) {
  throw new Error("usage: bun /tmp/sentinel-render.ts <templatesDir> <outDir> <node> <title> <repo>");
}

const vars: Record<string, string> = { NODE_NAME: node, NODE_TITLE: title, REPO: repo, ASSET_PREFIX: `forge614-${node}`, STANDARD_VERSION: "1.0.0" };

// Source path inside templates/ -> destination relative to the node root.
const DESTINATIONS: ReadonlyArray<readonly [string, string]> = [
  ["install.sh", "install.sh"],
  ["install.ps1", "install.ps1"],
  ["verify.yml", ".github/workflows/verify.yml"],
  ["release.yml", ".github/workflows/release.yml"],
  ["CONTRACT.md", "CONTRACT.md"],
  ["CONTRACT.en.md", "CONTRACT.en.md"],
  ["README.md", "README.md"],
  ["README.en.md", "README.en.md"],
  ["decision.md", "docs/decisions/TEMPLATE.md"],
  ["plan.md", ".agents/templates/plan.md"],
  ["hooks/pre-push", ".githooks/pre-push"],
  ["BRANCH_PROTECTION.md", "BRANCH_PROTECTION.md"],
  ["BRANCH_PROTECTION.en.md", "BRANCH_PROTECTION.en.md"],
  ["docs-workflows.md", "docs/es/NN-workflows.md"],
  ["docs-workflows.en.md", "docs/en/NN-workflows.md"],
];

const PLACEHOLDER = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;
const written: string[] = [];
for (const [src, dest] of DESTINATIONS) {
  const rendered = readFileSync(join(templatesDir, src), "utf8").replace(PLACEHOLDER, (whole, name: string) => vars[name] ?? whole);
  const left = [...rendered.matchAll(PLACEHOLDER)].map((m) => m[1] ?? "");
  if (left.length > 0) throw new Error(`${src}: unresolved placeholders ${left.join(", ")}`);
  const target = join(outDir, dest);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, rendered);
  if (dest === "install.sh" || dest === ".githooks/pre-push") chmodSync(target, 0o755);
  written.push(dest);
}
console.log(JSON.stringify({ schemaVersion: 1, node, out: outDir, written }));
```

Run:
```bash
bun /tmp/sentinel-render.ts /tmp/standard-v1.0.0/content/templates ~/Desktop/forge614-sentinel sentinel "Forge614 Sentinel" jotredev/forge614-sentinel
```
Expected: `{"schemaVersion":1,"node":"sentinel","out":"…/forge614-sentinel","written":[…15 rutas…]}`. Comprobar: `grep -c 'NODE_NAME="sentinel"' ~/Desktop/forge614-sentinel/install.sh` → `1`.

- [ ] **Step 2: Renombrar los documentos de workflows**

```bash
cd ~/Desktop/forge614-sentinel
git init -b main
mv docs/es/NN-workflows.md docs/es/04-workflows.md
mv docs/en/NN-workflows.md docs/en/04-workflows.md
sed -i '' 's/^# NN — /# 04 — /' docs/es/04-workflows.md docs/en/04-workflows.md
chmod +x .githooks/pre-push install.sh
git config core.hooksPath .githooks
```
(`git init` y `git config` son operaciones locales sin commit; el primer commit lo hace el propietario en el paso 12.)

- [ ] **Step 3: `package.json`**

```json
{
  "name": "forge614-sentinel",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "bun": ">=1.3.9" },
  "description": "Forge614 Sentinel: checks any ecosystem repository against the Node Standard it declares.",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "bun test --timeout 30000",
    "verify": "bun run src/interfaces/cli/verify.ts",
    "workflows:check": "bun run src/interfaces/cli/workflows-check.ts",
    "workflows:run": "bun run src/interfaces/cli/workflows-run.ts",
    "notion-map:build": "bun run src/interfaces/cli/notion-map-build.ts",
    "sentinel:check": "bun run src/interfaces/cli/check.ts --repo . --json",
    "sentinel:parity": "bun run src/interfaces/cli/sentinel-parity.ts",
    "build:target": "bun run src/interfaces/cli/build-target.ts",
    "smoke:target": "bun run src/interfaces/cli/smoke-target.ts",
    "release:publish": "bun run src/interfaces/cli/release-publish.ts"
  },
  "devDependencies": {
    "@types/bun": "1.3.8",
    "typescript": "5.9.3"
  },
  "dependencies": {
    "fflate": "0.8.3",
    "yaml": "2.8.1",
    "zod": "4.6.5"
  }
}
```

Los scripts `verify`, `workflows:*`, `notion-map:build`, `sentinel:*`, `build:target`, `smoke:target` y `release:publish` se implementan en las Tasks 22–27; hasta entonces `bun run <script>` falla con "module not found", lo que es correcto (ningún stub que finja éxito).

- [ ] **Step 4: `tsconfig.json`** (mismas banderas que `forge614-ai` más `resolveJsonModule`, necesaria para incrustar `package.json` en el binario, Task 22)

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
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "types": ["bun-types"],
    "noEmit": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 5: `.gitattributes`, `.gitignore`, `forge614.node.json`, `LICENSE`, `SECURITY.md`, `CHANGELOG.md`, `docs/decisions/INDEX.json`**

`.gitattributes`:
```
* text=auto eol=lf
*.tar.gz binary
*.zip binary
```

`.gitignore`: copiar íntegro el de `forge614-ai` (lectura, sin modificarlo) y añadir las excepciones de fixtures. Las fixtures de `secrets-hygiene` contienen a propósito un `.env` y una clave `.pem` falsos; sin estas líneas Git los ignoraría, nunca llegarían al commit y el test de esa comprobación fallaría en CI:

```bash
cat ~/Desktop/forge614-ai/.gitignore > .gitignore
cat >> .gitignore <<'EOF'

# Fixtures de Sentinel: archivos falsos que las comprobaciones deben ver (nunca secretos reales)
!fixtures/**/.env
!fixtures/**/.env.*
!fixtures/**/*.pem
!fixtures/**/*.key
EOF
```

El archivo resultante contiene `node_modules/`, `dist/`, `.env`, `.env.*`, `*.pem`, `*.key`, `.superpowers/`, el resto de reglas por sistema y editor, y al final las cuatro excepciones. La Task 15 añade un test que confirma que Git lista `fixtures/secrets-hygiene/fail/.env` y `fixtures/secrets-hygiene/fail/keys/server.pem`.

`forge614.node.json`:
```json
{
  "schemaVersion": 1,
  "node": "sentinel",
  "kind": "product",
  "standard": {
    "version": "1.0.0",
    "sha256": "18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922"
  },
  "ecosystem": "forge614"
}
```

`LICENSE`: `Copyright (c) 2026 Forge614. Todos los derechos reservados.` (idéntico a `forge614-ai`).

`SECURITY.md`:
```markdown
# Política de seguridad / Security policy

**ES.** Reporta vulnerabilidades por correo al propietario del repositorio con el asunto `[forge614-sentinel][security]`. No abras issues públicos. Respondemos en 5 días hábiles y publicamos la corrección con su acta.

**EN.** Report vulnerabilities by e-mail to the repository owner with subject `[forge614-sentinel][security]`. Do not open public issues. We answer within 5 business days and publish the fix with its decision record.
```

`CHANGELOG.md`:
```markdown
# Changelog

Generado a partir de commits convencionales. No editar a mano.

## [Unreleased]
```

`docs/decisions/INDEX.json` (sin actas todavía; el índice vacío es válido y la comprobación `decisions` lo exige presente):
```json
{
  "schemaVersion": 1,
  "decisions": []
}
```

- [ ] **Step 6: Esqueletos de `docs/es` y `docs/en` 00–03** (04 ya existe por plantilla)

Cada archivo: título `# NN — …`, una línea de analogía `> …` y los encabezados `##` que Task 28 rellena. Los pares deben tener el mismo número de encabezados desde ahora.

`docs/es/00-resumen-y-guia-rapida.md`:
```markdown
# 00 — Resumen y guía rápida

> Como un inspector municipal: llega con el reglamento vigente bajo el brazo, revisa el edificio, entrega un acta con lo que cumple y lo que no, y se va.

## Qué es forge614-sentinel

## Instalar y ejecutar en un minuto

## Qué sale en el informe

## Dónde seguir leyendo
```

`docs/en/00-summary-and-quickstart.md`:
```markdown
# 00 — Summary and quickstart

> Like a municipal inspector: arrives with the current code under the arm, inspects the building, hands over a report of what complies and what does not, and leaves.

## What forge614-sentinel is

## Install and run in one minute

## What the report contains

## Where to read next
```

`docs/es/01-comprobaciones.md` / `docs/en/01-checks.md`: encabezados `## Cómo se elige qué corre` / `## How the set of checks is chosen`, `## Las 11 trasladadas` / `## The 11 ported checks`, `## Las 8 nuevas` / `## The 8 new checks`, `## Veredictos y evidencias` / `## Verdicts and evidence`. Analogía: "Como la lista de revisión de un inspector: cada punto tiene un número, un criterio y una casilla." / "Like an inspector's checklist: every item has a number, a criterion and a box."

`docs/es/02-reglamento-y-cache.md` / `docs/en/02-standard-and-cache.md`: `## De dónde sale el reglamento` / `## Where the standard comes from`, `## La caché local` / `## The local cache`, `## Verificación de huellas` / `## Fingerprint verification`, `## Sin red` / `## Offline`. Analogía: "Como la copia sellada del reglamento en el archivo municipal: se comprueba el sello antes de usarla y nunca se corrige a mano." / "Like the sealed copy of the code in the municipal archive: the seal is checked before use and it is never corrected by hand."

`docs/es/03-integracion.md` / `docs/en/03-integration.md`: `## En el verify de cada nodo` / `## In every node's verify`, `## En CI` / `## In CI`, `## Códigos de salida y errores` / `## Exit codes and errors`, `## Arranque circular con forge614-ai` / `## Bootstrapping with forge614-ai`. Analogía: "Como el sello de inspección en la entrada de un local: sin él, no abre." / "Like the inspection seal at a shop's entrance: without it, it does not open."

- [ ] **Step 7: Instalar dependencias**

Run: `bun install`
Expected: crea `bun.lock`; `node_modules/` con `zod`, `fflate`, `yaml`, `typescript`, `@types/bun`.

- [ ] **Step 8: Escribir la prueba de capas (portada y adaptada: ignora imports `.json`)**

```ts
// tests/architecture/import-rules.test.ts
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

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
  const first = relative(SRC, file).split(/[\\/]/)[0];
  if (first === "modules" || first === "app" || first === "infrastructure" || first === "interfaces") return first;
  throw new Error(`file outside a known layer: ${file}`);
}

// Three shapes of module reference: `import/export ... from "x"` (multi-line
// and `type` imports included), a side-effect `import "x"`, and a dynamic
// `import("x")`.
const IMPORT_RE = /^\s*(?:import|export)\s[^'"]*?from\s+["']([^"']+)["']|^\s*import\s+["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)/gm;

function specifiersOf(text: string): string[] {
  return [...text.matchAll(IMPORT_RE)].map((m) => m[1] ?? m[2] ?? m[3] ?? "");
}

function importsOf(file: string): string[] {
  return specifiersOf(readFileSync(file, "utf8"));
}

describe("IMPORT_RE", () => {
  test("covers from-imports, re-exports, side-effect imports and dynamic import()", () => {
    const sample = [
      'import { a } from "./a";',
      "import type { B } from './b';",
      'export { c } from "./c";',
      'export type { D } from "./d";',
      'import "./side-effect";',
      'const e = await import("./e");',
      'import {\n  f,\n} from "./f";',
      'const notAnImport = "from \'./x\'";',
    ].join("\n");
    expect(specifiersOf(sample)).toEqual(["./a", "./b", "./c", "./d", "./side-effect", "./e", "./f"]);
  });
});

describe("layer import rules (STANDARD §2)", () => {
  const files = walk(SRC);
  test("src has at least one file per layer", () => {
    const layers: Layer[] = ["modules", "app", "infrastructure", "interfaces"];
    for (const layer of layers) {
      expect(files.some((file) => layerOf(file) === layer), `expected at least one .ts file in src/${layer}`).toBe(true);
    }
  });
  for (const file of files) {
    test(relative(SRC, file), () => {
      const from = layerOf(file);
      for (const spec of importsOf(file)) {
        // package.json is imported as data by interfaces/cli/version.ts so the
        // compiled binary carries its own version; a .json file has no layer.
        if (spec.endsWith(".json")) {
          expect(from, `only interfaces may import JSON data: ${spec} in ${relative(SRC, file)}`).toBe("interfaces");
          continue;
        }
        if (spec.startsWith(".")) {
          const target = resolve(dirname(file), `${spec.replace(/\.js$/, "")}.ts`);
          const to = layerOf(target);
          expect(ALLOWED[from], `${from} → ${to} in ${relative(SRC, file)}`).toContain(to);
        } else if (from === "modules") {
          expect(MODULES_EXTERNAL_ALLOWLIST.has(spec), `modules imports external ${spec}`).toBe(true);
        }
      }
    });
  }
});
```

- [ ] **Step 9: Un archivo real por capa para que el test tenga qué recorrer**

Crear los cuatro archivos que las tareas siguientes amplían; aquí solo su primera versión mínima, sin marcadores vacíos:

```ts
// src/modules/semver.ts
export const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseSemver(value: string): [number, number, number] | null {
  const m = SEMVER_PATTERN.exec(value);
  if (m === null) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

// Returns a negative number when a < b, zero when equal, positive when a > b.
// Non-semver input sorts before any valid version so callers can still order.
export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (pa === null || pb === null) return pa === null && pb === null ? 0 : pa === null ? -1 : 1;
  for (let i = 0; i < 3; i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export function highestSemver(values: readonly string[]): string | undefined {
  return [...values].filter((v) => SEMVER_PATTERN.test(v)).sort(compareSemver).at(-1);
}
```

```ts
// src/modules/semver.test.ts
import { expect, test } from "bun:test";
import { compareSemver, highestSemver, parseSemver } from "./semver";

test("parseSemver accepts X.Y.Z only", () => {
  expect(parseSemver("1.2.3")).toEqual([1, 2, 3]);
  expect(parseSemver("v1.2.3")).toBeNull();
  expect(parseSemver("1.2")).toBeNull();
});

test("compareSemver orders numerically, not lexically", () => {
  expect(compareSemver("1.10.0", "1.9.0")).toBeGreaterThan(0);
  expect(compareSemver("0.1.0", "0.1.0")).toBe(0);
  expect(compareSemver("0.9.9", "1.0.0")).toBeLessThan(0);
});

test("highestSemver ignores non-semver strings and returns undefined for none", () => {
  expect(highestSemver(["0.1.0", "0.10.0", "0.2.0", "latest"])).toBe("0.10.0");
  expect(highestSemver([])).toBeUndefined();
});
```

```ts
// src/infrastructure/hashing.ts
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function sha256Text(text: string): string {
  return sha256Hex(new TextEncoder().encode(text));
}

export function sha256File(path: string): string {
  return sha256Hex(readFileSync(path));
}
```

```ts
// src/infrastructure/hashing.test.ts
import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sha256File, sha256Hex, sha256Text } from "./hashing";

test("sha256 of empty input", () => expect(sha256Hex(new Uint8Array())).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"));

test("sha256Text hashes the UTF-8 bytes", () => {
  expect(sha256Text("forge614")).toBe("78ce873de4bc32d8f641c3de7a55df80b2ca8e2bcae899d4737b851deba28a79");
});

test("sha256File hashes the bytes on disk", () => {
  const dir = mkdtempSync(join(tmpdir(), "hashing-"));
  const path = join(dir, "sample.txt");
  writeFileSync(path, "forge614 sentinel\n", "utf8");
  expect(sha256File(path)).toBe(sha256Text("forge614 sentinel\n"));
});
```

```ts
// src/app/repo.ts
import { resolve } from "node:path";

// This file lives at <repo>/src/app/repo.ts, so two levels up is the repo
// root. Used only by the development CLIs (verify, workflows, release
// scripts); `check` never assumes it runs inside this repository.
export const repoRoot = resolve(import.meta.dir, "../..");
```

```ts
// src/interfaces/cli/output.ts
export function printJson(payload: Record<string, unknown> & { schemaVersion: number }): void {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

export function printError(code: string, error: string, schemaVersion = 1): void {
  process.stderr.write(`${JSON.stringify({ schemaVersion, code, error })}\n`);
}

// Every CLI ends with `process.exit(await runCli(CODE, main))`: whatever
// `main` throws leaves through the error envelope with that code and exit 1,
// never as a raw stack trace (acta 0013). A normal return passes through.
export async function runCli(failureCode: string, main: () => number | Promise<number>): Promise<number> {
  try {
    return await main();
  } catch (error) {
    printError(failureCode, error instanceof Error ? error.message : String(error));
    return 1;
  }
}
```

```ts
// src/interfaces/cli/output.test.ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import { printError, printJson, runCli } from "./output";

let stdoutSpy: string[] = [];
let stderrSpy: string[] = [];
let stdoutWrite: typeof process.stdout.write;
let stderrWrite: typeof process.stderr.write;

beforeEach(() => {
  stdoutSpy = [];
  stderrSpy = [];
  stdoutWrite = process.stdout.write.bind(process.stdout);
  stderrWrite = process.stderr.write.bind(process.stderr);
  process.stdout.write = ((chunk: string) => {
    stdoutSpy.push(chunk);
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string) => {
    stderrSpy.push(chunk);
    return true;
  }) as typeof process.stderr.write;
});

afterEach(() => {
  process.stdout.write = stdoutWrite;
  process.stderr.write = stderrWrite;
});

test("printJson writes a single JSON line to stdout", () => {
  printJson({ schemaVersion: 1, ok: true });
  expect(stdoutSpy).toEqual([`${JSON.stringify({ schemaVersion: 1, ok: true })}\n`]);
});

test("printError writes an error envelope to stderr", () => {
  printError("STANDARD_CORRUPT", "boom");
  expect(stderrSpy).toEqual([`${JSON.stringify({ schemaVersion: 1, code: "STANDARD_CORRUPT", error: "boom" })}\n`]);
});

test("runCli returns main's exit code untouched (sync and async)", async () => {
  expect(await runCli("X_FAILED", () => 3)).toBe(3);
  expect(await runCli("X_FAILED", async () => 2)).toBe(2);
  expect(stderrSpy).toEqual([]);
});

test("runCli turns a throw or a rejection into the envelope with exit 1", async () => {
  expect(
    await runCli("SENTINEL_FAILED", () => {
      throw new Error("disk is full");
    }),
  ).toBe(1);
  expect(await runCli("SENTINEL_FAILED", async () => Promise.reject(new Error("later")))).toBe(1);
  expect(stderrSpy).toEqual([
    `${JSON.stringify({ schemaVersion: 1, code: "SENTINEL_FAILED", error: "disk is full" })}\n`,
    `${JSON.stringify({ schemaVersion: 1, code: "SENTINEL_FAILED", error: "later" })}\n`,
  ]);
});
```

- [ ] **Step 10: Ejecutar typecheck y tests**

Run: `bun run typecheck && bun test`
Expected: typecheck sin errores; `import-rules.test.ts` pasa (6 tests: la regex, "src has at least one file per layer" y uno por cada uno de los 4 archivos de capa: `semver.ts`, `hashing.ts`, `repo.ts`, `output.ts`), `semver.test.ts` 3 pass, `hashing.test.ts` 3 pass, `output.test.ts` 4 pass.

- [ ] **Step 11: Comprobar que los archivos de plantilla siguen byte-idénticos**

Run: `bun /tmp/sentinel-render.ts /tmp/standard-v1.0.0/content/templates /tmp/sentinel-render-check sentinel "Forge614 Sentinel" jotredev/forge614-sentinel && diff /tmp/sentinel-render-check/install.sh ~/Desktop/forge614-sentinel/install.sh && diff /tmp/sentinel-render-check/install.ps1 ~/Desktop/forge614-sentinel/install.ps1 && diff /tmp/sentinel-render-check/.github/workflows/release.yml ~/Desktop/forge614-sentinel/.github/workflows/release.yml && echo identical`
Expected: `identical` (verify.yml se modifica en Task 27 añadiendo el job `parity`; hasta entonces también idéntico).

- [ ] **Step 12: Commit (lo hace el propietario)**

```bash
cd ~/Desktop/forge614-sentinel
git add -A
git commit -m "chore: esqueleto de forge614-sentinel desde las plantillas del estándar 1.0.0 con prueba de capas"
```

---

### Task 2: `modules` portado: esquemas Zod, `package-name`, `workflow`, `json-data` y `headings`

Esta tarea va antes del núcleo (Task 3) porque `check-params.ts` y `report.ts` importan estos esquemas: así cada tarea termina con `typecheck` en verde.

**Files:**
- Create: `src/modules/schemas/{common,node-pointer,rule-manifest,pack,support-matrix,forbidden-mentions,decisions-index,error-envelope,cache-manifest,sha256sums,index}.ts` y sus tests (portados de `forge614-ai/src/modules/standard/schemas/`; nuevos: `cache-manifest`, `sha256sums`)
- Create: `src/modules/package-name.ts`, `src/modules/package-name.test.ts` (portado), `src/modules/workflow.ts`, `src/modules/workflow.test.ts` (portado)
- Create: `src/modules/json-data.ts`, `src/modules/json-data.test.ts`, `src/modules/headings.ts`, `src/modules/headings.test.ts`

**Interfaces:**
- Consumes: `zod`.
- Produces:
  ```ts
  // src/modules/schemas/* (ported unchanged) and index.ts
  export const NodePointerSchema, PackSchema, RuleManifestSchema, SupportMatrixSchema, ForbiddenMentionsSchema, DecisionsIndexSchema, ErrorEnvelopeSchema; // + inferred types
  export const SemVer, Sha256, Slug, IsoDate, Bilingual;          // schemas/common.ts
  // src/modules/schemas/cache-manifest.ts, sha256sums.ts (new)
  export const CacheManifestSchema; export type CacheManifest;
  export function parseSha256Sums(text: string): Sha256Sums | null;
  // src/modules/package-name.ts, workflow.ts (ported)
  export const PACKAGE_NAME_PATTERN: RegExp;
  export const WorkflowSchema; export type Workflow; export function checkWorkflowShape(w: Workflow, id: string): string[];
  export function jobsOf(w: Workflow): string[]; export function runStepsOf(w: Workflow, job: string): string[];
  export const PINNED_USES: RegExp; export const ALLOWED_RUN: RegExp;
  // src/modules/json-data.ts
  export type JsonData = { ok: true; data: unknown } | { ok: false; evidence: string };
  export function parseJsonData(path: string, raw: string): JsonData;
  // src/modules/headings.ts
  export function headingLines(text: string): string[];
  export function countHeadings(text: string): number;
  export function headingNumbering(text: string): string[];
  export function tableRowsAfter(text: string, heading: string): string[][];
  ```

- [ ] **Step 1: Esquemas portados y nuevos**

Portar sin cambios de contenido (solo rutas de import) desde `forge614-ai/src/modules/standard/schemas/`: `common.ts`, `node-pointer.ts`, `rule-manifest.ts`, `pack.ts`, `support-matrix.ts`, `forbidden-mentions.ts`, `decisions-index.ts`, `error-envelope.ts` con sus `*.test.ts`. `rule-manifest.ts` y `pack.ts` importan `PACKAGE_NAME_PATTERN` desde `../package-name` (portar `src/modules/standard/package-name.ts` → `src/modules/package-name.ts` con su test). Portar también `src/modules/standard/workflow.ts` → `src/modules/workflow.ts` con su test (schema `WorkflowSchema`, `checkWorkflowShape`, `jobsOf`, `runStepsOf`, `PINNED_USES`, `ALLOWED_RUN`).

Nuevos:

```ts
// src/modules/schemas/cache-manifest.ts
import { z } from "zod";
import { SemVer, Sha256 } from "./common";

// <FORGE614_HOME>/standard/<version>/manifest.json (spec §5.4).
export const CacheManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    version: SemVer,
    sha256: Sha256,
    fetchedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/, "ISO-8601 UTC"),
  })
  .strict();
export type CacheManifest = z.infer<typeof CacheManifestSchema>;
```

```ts
// src/modules/schemas/sha256sums.ts
import { z } from "zod";
import { Sha256 } from "./common";

const LINE = /^([a-f0-9]{64})  (\S+)$/;

export const Sha256SumsSchema = z.array(z.object({ sha256: Sha256, file: z.string().min(1) }).strict()).min(1);
export type Sha256Sums = z.infer<typeof Sha256SumsSchema>;

// "<sha256>  <file>" per line (two spaces, the sha256sum format). Any other
// line shape is a parse failure: a release asset that does not follow the
// format is not trusted.
export function parseSha256Sums(text: string): Sha256Sums | null {
  const entries: Array<{ sha256: string; file: string }> = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line === "") continue;
    const m = LINE.exec(line);
    if (m === null || m[1] === undefined || m[2] === undefined) return null;
    entries.push({ sha256: m[1], file: m[2] });
  }
  const parsed = Sha256SumsSchema.safeParse(entries);
  return parsed.success ? parsed.data : null;
}
```

```ts
// src/modules/schemas/sha256sums.test.ts
import { expect, test } from "bun:test";
import { parseSha256Sums } from "./sha256sums";

const SHA = "18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922";

test("parses sha256sum lines and ignores blank lines", () => {
  expect(parseSha256Sums(`${SHA}  standard-1.0.0.tar.gz\n\n`)).toEqual([{ sha256: SHA, file: "standard-1.0.0.tar.gz" }]);
});

test("rejects a single space separator, a short hash or an empty file", () => {
  expect(parseSha256Sums(`${SHA} standard-1.0.0.tar.gz\n`)).toBeNull();
  expect(parseSha256Sums(`abc  x\n`)).toBeNull();
  expect(parseSha256Sums("")).toBeNull();
});
```

`src/modules/schemas/index.ts` reexporta todos (`CacheManifestSchema`, `DecisionsIndexSchema`, `ErrorEnvelopeSchema`, `ForbiddenMentionsSchema`, `NodePointerSchema`, `PackSchema`, `RuleManifestSchema`, `SupportMatrixSchema`, `parseSha256Sums`) y sus tipos. No hace falta `ALL_SCHEMAS` ni `schemas:generate` en Sentinel (los JSON Schema los publica `forge614-ai`).

- [ ] **Step 2: Utilidades puras compartidas por varias comprobaciones**

```ts
// src/modules/json-data.ts
// A data file that is not valid JSON must surface as evidence naming the
// path, never as an exception out of a check (acta 0013).
export type JsonData = { ok: true; data: unknown } | { ok: false; evidence: string };

export function parseJsonData(path: string, raw: string): JsonData {
  try {
    return { ok: true, data: JSON.parse(raw) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, evidence: `${path}: invalid JSON: ${message}` };
  }
}
```

```ts
// src/modules/json-data.test.ts
import { expect, test } from "bun:test";
import { parseJsonData } from "./json-data";

test("returns the parsed value for valid JSON", () => {
  expect(parseJsonData("a.json", '{"x":1}')).toEqual({ ok: true, data: { x: 1 } });
});

test("turns a parse failure into evidence naming the path, never a throw", () => {
  const result = parseJsonData("standard/x.json", "{ not json");
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.evidence).toStartWith("standard/x.json: invalid JSON: ");
});
```

```ts
// src/modules/headings.ts
// A line inside a fenced code block (``` ... ```) is never a heading, even
// when it starts with '#': shell comments and sample Markdown would
// otherwise be counted and break the es/en parity check.
export function headingLines(text: string): string[] {
  const out: string[] = [];
  let fenced = false;
  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (!fenced && /^#{1,6}\s/.test(line)) out.push(line);
  }
  return out;
}

export function countHeadings(text: string): number {
  return headingLines(text).length;
}

// Leading number (or Anexo/Appendix letter) of every numbered heading, in
// document order, so an es/en pair can be compared by order and numbering.
export function headingNumbering(text: string): string[] {
  const tokens: string[] = [];
  for (const line of headingLines(text)) {
    const body = line.replace(/^#{1,6}\s+/, "");
    const numbered = /^(\d+(?:\.\d+)*)\./.exec(body)?.[1];
    if (numbered) {
      tokens.push(numbered);
      continue;
    }
    const lettered = /^(?:Anexo|Appendix)\s+([A-Za-z0-9]+)/i.exec(body)?.[1];
    if (lettered) tokens.push(lettered.toUpperCase());
  }
  return tokens;
}

// Rows of the first Markdown table found after `heading` (a "## …" line),
// excluding the header row and the separator; each row is its cells trimmed.
export function tableRowsAfter(text: string, heading: string): string[][] {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start < 0) return [];
  const rows: string[][] = [];
  let inTable = false;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (/^#{1,6}\s/.test(line)) break;
    if (!line.trim().startsWith("|")) {
      if (inTable) break;
      continue;
    }
    inTable = true;
    const cells = line.trim().slice(1, -1).split("|").map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue; // separator
    rows.push(cells);
  }
  return rows.slice(1); // drop the header row
}
```

```ts
// src/modules/headings.test.ts
import { expect, test } from "bun:test";
import { countHeadings, headingNumbering, tableRowsAfter } from "./headings";

test("counts headings outside fenced blocks only", () => {
  expect(countHeadings("# T\n## A\n```bash\n# not\n```\n## B\n")).toBe(3);
});

test("extracts numbering and appendix letters in order", () => {
  expect(headingNumbering("# T\n## 1. A\n## 2.1. B\n## Anexo A. C\n## Appendix b. D\n")).toEqual(["1", "2.1", "A", "B"]);
});

test("tableRowsAfter returns body rows of the first table under a heading", () => {
  const md = "## Códigos de error\nintro\n| Código | Significado |\n| --- | --- |\n| `A_B` | x |\n| `C_D` | y |\n\n## Otro\n| Q | R |\n| --- | --- |\n| 1 | 2 |\n";
  expect(tableRowsAfter(md, "## Códigos de error")).toEqual([["`A_B`", "x"], ["`C_D`", "y"]]);
  expect(tableRowsAfter(md, "## Nada")).toEqual([]);
});
```

- [ ] **Step 3: Ejecutar**

Run: `bun run typecheck && bun test src/modules`
Expected: todo en verde (schemas portados + `sha256sums` 2, package-name 3, workflow 5, json-data 2, headings 3).

- [ ] **Step 4: Commit (lo hace el propietario)**

```bash
git add src/modules
git commit -m "feat(modules): esquemas Zod portados, manifiesto de caché, SHA256SUMS y utilidades de JSON y encabezados"
```

---

### Task 3: Núcleo de `modules`: `RepoSnapshot`, `CheckResult`, `CheckParams`, esquema del informe y catálogo de mensajes

**Files:**
- Create: `src/modules/snapshot.ts`, `src/modules/snapshot.test.ts`
- Create: `src/modules/check.ts`, `src/modules/check.test.ts`
- Create: `src/modules/check-params.ts`
- Create: `src/modules/report.ts`, `src/modules/report.test.ts`
- Create: `src/modules/messages/{types,es,en,render}.ts`, `src/modules/messages/render.test.ts`
- Create: `tests/helpers/snapshot-from-dir.ts` (helper de test que carga `fixtures/<id>/{pass,fail}/`; no es código de producto)

**Interfaces:**
- Consumes: `zod`; `NodePointer`, `Pack`, `RuleManifest`, `SemVer`, `Sha256`, `Slug` (Task 2).
- Produces:
  ```ts
  // src/modules/snapshot.ts
  export interface RepoFacts {
    readonly gitAvailable: boolean;
    readonly gitTags: readonly string[];          // sorted, e.g. ["v0.1.0", "v0.2.0"]
    readonly gitLogSubjects: readonly string[];   // newest first, at most 50, "<sha7> <subject>"
    readonly executablePaths: readonly string[];  // sorted; from git mode 100755, never from the disk
    readonly skippedLargeFiles: readonly string[]; // sorted; text files above MAX_TEXT_BYTES
  }
  export interface RepoSnapshot { readonly files: ReadonlyMap<string, string>; readonly facts: RepoFacts }
  export const EMPTY_FACTS: RepoFacts;
  export const MAX_TEXT_BYTES = 2 * 1024 * 1024;
  export function snapshotFrom(entries: Record<string, string>, facts?: Partial<RepoFacts>): RepoSnapshot;
  export function read(s: RepoSnapshot, path: string): string | undefined;
  export function has(s: RepoSnapshot, path: string): boolean;
  export function listUnder(s: RepoSnapshot, prefix: string): string[];
  export function hasDirectory(s: RepoSnapshot, dir: string): boolean; // any file under "<dir>/"

  // src/modules/check.ts
  export type CheckVerdict = "pass" | "caution" | "fail" | "not-applicable";
  export type Verdict = Exclude<CheckVerdict, "not-applicable">;
  export interface CheckResult { verdict: CheckVerdict; evidence: string[]; messageKey: MessageKey; params: MessageParams }
  export interface CheckDefinition {
    id: string;
    appliesWhen: (snapshot: RepoSnapshot, params: CheckParams) => boolean;
    run: (snapshot: RepoSnapshot, params: CheckParams) => CheckResult;
  }
  export function pass(key: MessageKey, params?: MessageParams, evidence?: string[]): CheckResult;
  export function caution(evidence: string[], key: MessageKey, params?: MessageParams): CheckResult;
  export function fail(evidence: string[], key: MessageKey, params?: MessageParams): CheckResult;
  export function notApplicable(reason: string): CheckResult;
  export function worst(verdicts: readonly CheckVerdict[]): Verdict; // not-applicable does not count

  // src/modules/check-params.ts
  export interface StandardParams { version: string; sha256: string; pointerVersionSha256: string | undefined }
  export interface LayoutSpec { directories: readonly string[]; files: readonly string[]; source: "builtin" | "standard/layout.json" }
  export interface StackSpec { tsconfigFlags: readonly string[]; minimumBun: string; source: "builtin" | "standard/stack.json" }
  export interface SecretPattern { id: string; pattern: string }
  export interface SecretsSpec { patterns: readonly SecretPattern[]; excludePaths: readonly string[]; source: "builtin" | "standard/secret-patterns.json" }
  export interface CheckParams {
    sentinelVersion: string;
    today: string;                       // YYYY-MM-DD
    pointer: NodePointer;
    standard: StandardParams;
    pack: Pack;
    manifests: ReadonlyMap<string, RuleManifest>;   // by rule name
    forbiddenMentions: { terms: readonly string[]; excludePaths: readonly string[] };
    templates: ReadonlyMap<string, string>;         // "install.sh", "verify.yml", … (keys as in standard/templates/)
    ecosystemContract: string;                      // canonical FORGE614_ECOSYSTEM_CONTRACT.md text
    layout: LayoutSpec; stack: StackSpec; secrets: SecretsSpec;
    allowedExtraJobs: readonly string[];            // jobs a node may add to the template workflows (release check)
    knownCheckIds: readonly string[];               // registry ids (for rules-catalog)
    legacyValidatorIds: Readonly<Record<string, string>>; // "bilingual-docs" → "docs-parity", "decision-records" → "decisions"
    parseYaml: (text: string) => unknown;
  }

  // src/modules/report.ts (exactly the JSON of spec §6)
  export const CheckEntrySchema: z.ZodType<CheckEntry>;      // { id, verdict, applied, evidence, message: { es, en } }
  export const CheckReportSchema: z.ZodType<CheckReport>;    // { schemaVersion: 1, sentinel, standard: { version, sha256, forced, fetched, latestKnown? }, repository: { kind: "node", name }, verdict, checks, durationMs }
  export const NotApplicableReportSchema: z.ZodType<NotApplicableReport>; // { schemaVersion: 1, applicable: false, reason }
  export type SentinelReport = CheckReport | NotApplicableReport;
  ```

- [ ] **Step 1: Tests del snapshot (fallan: módulo inexistente)**

```ts
// src/modules/snapshot.test.ts
import { expect, test } from "bun:test";
import { EMPTY_FACTS, has, hasDirectory, listUnder, read, snapshotFrom } from "./snapshot";

test("snapshotFrom builds a map and defaults to empty facts", () => {
  const s = snapshotFrom({ "README.md": "# x\n", "docs/es/00-a.md": "" });
  expect(read(s, "README.md")).toBe("# x\n");
  expect(read(s, "nope")).toBeUndefined();
  expect(has(s, "docs/es/00-a.md")).toBe(true);
  expect(s.facts).toEqual(EMPTY_FACTS);
});

test("listUnder returns sorted relative paths under a prefix; hasDirectory looks for any file below", () => {
  const s = snapshotFrom({ "docs/es/01-b.md": "", "docs/es/00-a.md": "", "docs/en/00-a.md": "" });
  expect(listUnder(s, "docs/es/")).toEqual(["docs/es/00-a.md", "docs/es/01-b.md"]);
  expect(listUnder(s, "nope/")).toEqual([]);
  expect(hasDirectory(s, "docs/es")).toBe(true);
  expect(hasDirectory(s, "docs")).toBe(true);
  expect(hasDirectory(s, "src")).toBe(false);
});

test("facts can be given partially and are merged over the empty ones", () => {
  const s = snapshotFrom({}, { gitTags: ["v0.1.0"] });
  expect(s.facts.gitTags).toEqual(["v0.1.0"]);
  expect(s.facts.gitAvailable).toBe(false);
  expect(s.facts.executablePaths).toEqual([]);
});
```

- [ ] **Step 2: Implementar `src/modules/snapshot.ts`**

```ts
// The unit of work of every check: a read-only, in-memory picture of the
// repository. Paths always use "/" and are relative to the repository root;
// text is always LF-normalized (infrastructure does both), so a check never
// sees a platform difference.
export interface RepoFacts {
  readonly gitAvailable: boolean;
  readonly gitTags: readonly string[];
  readonly gitLogSubjects: readonly string[];
  readonly executablePaths: readonly string[];
  readonly skippedLargeFiles: readonly string[];
}

export interface RepoSnapshot {
  readonly files: ReadonlyMap<string, string>;
  readonly facts: RepoFacts;
}

export const EMPTY_FACTS: RepoFacts = {
  gitAvailable: false,
  gitTags: [],
  gitLogSubjects: [],
  executablePaths: [],
  skippedLargeFiles: [],
};

// Text files above this size are not loaded (a generated fixture or a data
// dump would otherwise dominate the run); they are listed in facts instead.
export const MAX_TEXT_BYTES = 2 * 1024 * 1024;

export function snapshotFrom(entries: Record<string, string>, facts: Partial<RepoFacts> = {}): RepoSnapshot {
  return { files: new Map(Object.entries(entries)), facts: { ...EMPTY_FACTS, ...facts } };
}

export function read(snapshot: RepoSnapshot, path: string): string | undefined {
  return snapshot.files.get(path);
}

export function has(snapshot: RepoSnapshot, path: string): boolean {
  return snapshot.files.has(path);
}

export function listUnder(snapshot: RepoSnapshot, prefix: string): string[] {
  return [...snapshot.files.keys()].filter((p) => p.startsWith(prefix)).sort();
}

export function hasDirectory(snapshot: RepoSnapshot, dir: string): boolean {
  const prefix = dir.endsWith("/") ? dir : `${dir}/`;
  for (const path of snapshot.files.keys()) if (path.startsWith(prefix)) return true;
  return false;
}
```

- [ ] **Step 3: Catálogo de mensajes tipado (paridad por compilador)**

```ts
// src/modules/messages/types.ts
export type Locale = "es" | "en";
export type MessageParams = Record<string, string>;
type Msg = (params: MessageParams) => string;

// One key per message; es.ts and en.ts each implement the whole interface, so
// a key missing in one language does not compile.
export interface MessageCatalog {
  // engine
  notApplicable: Msg;
  checkFailed: Msg;
  sentinelOutdated: Msg;
  dataFileInvalidJson: Msg;
  // ported checks
  packageNamesOk: Msg;
  packageNamesInvalid: Msg;
  forbiddenMentionsNone: Msg;
  forbiddenMentionsFound: Msg;
  docsParityOk: Msg;
  docsParityBroken: Msg;
  decisionRecordsOk: Msg;
  decisionRecordsInvalid: Msg;
  decisionsIndexMissing: Msg;
  agentImpactDeclared: Msg;
  agentImpactMissing: Msg;
  errorCodesOk: Msg;
  errorCodesInvalid: Msg;
  supportMatrixMissing: Msg;
  supportMatrixInvalid: Msg;
  supportMatrixCurrent: Msg;
  supportMatrixStale: Msg;
  workflowsNone: Msg;
  workflowsOk: Msg;
  workflowsInvalid: Msg;
  contextBudgetOk: Msg;
  contextBudgetOverBudget: Msg;
  contextBudgetInvalid: Msg;
  ecosystemContractOk: Msg;
  ecosystemContractDiverged: Msg;
  rulesCatalogOk: Msg;
  rulesCatalogInvalid: Msg;
  // new checks
  nodePointerOk: Msg;
  nodePointerMismatch: Msg;
  nodePointerUnverifiable: Msg;
  layoutOk: Msg;
  layoutIncomplete: Msg;
  stackOk: Msg;
  stackViolations: Msg;
  secretsNone: Msg;
  secretsFound: Msg;
  nodeContractOk: Msg;
  nodeContractBroken: Msg;
  installerOk: Msg;
  installerDrifted: Msg;
  releaseOk: Msg;
  releaseDrifted: Msg;
  versionsOk: Msg;
  versionsInconsistent: Msg;
}
export type MessageKey = keyof MessageCatalog;
```

```ts
// src/modules/messages/es.ts
import type { MessageCatalog } from "./types";
export const es: MessageCatalog = {
  notApplicable: (p) => `No aplica: ${p.reason ?? "sin motivo"}.`,
  checkFailed: (p) => `La comprobación lanzó una excepción inesperada (${p.error ?? "?"}).`,
  sentinelOutdated: (p) => `El reglamento pide el validador '${p.validator ?? "?"}' que esta versión de Sentinel no implementa: actualiza Sentinel.`,
  dataFileInvalidJson: () => "Archivo de datos con JSON inválido.",
  packageNamesOk: () => "Nombres de paquetes canónicos.",
  packageNamesInvalid: () => "Carpetas de paquete fuera de origen-tipo-nombre.",
  forbiddenMentionsNone: () => "Sin menciones prohibidas.",
  forbiddenMentionsFound: () => "Menciones a productos externos.",
  docsParityOk: () => "Documentación bilingüe con paridad.",
  docsParityBroken: () => "Falta paridad español/inglés en documentación.",
  decisionRecordsOk: () => "Actas de decisión coherentes.",
  decisionRecordsInvalid: () => "Actas de decisión inválidas.",
  decisionsIndexMissing: () => "Falta docs/decisions/INDEX.json.",
  agentImpactDeclared: () => "Planes cerrados declaran impacto en el procedimiento de agentes.",
  agentImpactMissing: () => "Planes cerrados sin impacto declarado.",
  errorCodesOk: () => "Códigos de error con formato canónico.",
  errorCodesInvalid: () => "Códigos de error fuera del formato MAYUSCULAS_CON_GUION_BAJO.",
  supportMatrixMissing: () => "Falta la matriz de soporte.",
  supportMatrixInvalid: () => "Matriz de soporte inválida.",
  supportMatrixCurrent: () => "Matriz de soporte vigente.",
  supportMatrixStale: (p) => `Celdas en revalidación vencidas (más de ${p.days ?? "30"} días).`,
  workflowsNone: () => "Sin workflows que validar.",
  workflowsOk: () => "Workflows delgados, fijados y documentados.",
  workflowsInvalid: () => "Workflows fuera del estándar.",
  contextBudgetOk: (p) => `Presupuesto de contexto (estimado): ~${p.tokens ?? "?"} tokens (límite ${p.budget ?? "3000"}).`,
  contextBudgetOverBudget: (p) => `Presupuesto de contexto (estimado) excede el límite: ~${p.tokens ?? "?"} tokens (límite ${p.budget ?? "3000"}).`,
  contextBudgetInvalid: () => "No se pudo estimar el presupuesto de contexto: pack.json del ecosistema ausente o inválido.",
  ecosystemContractOk: () => "Contrato del ecosistema coherente.",
  ecosystemContractDiverged: () => "Copia del contrato del ecosistema divergente.",
  rulesCatalogOk: () => "Catálogo de reglas y packs válido.",
  rulesCatalogInvalid: () => "Catálogo de reglas o packs inválido.",
  nodePointerOk: () => "forge614.node.json válido y con la huella del reglamento en caché.",
  nodePointerMismatch: () => "La huella de forge614.node.json no coincide con el paquete del reglamento en caché.",
  nodePointerUnverifiable: () => "No se pudo cruzar la huella del puntero: la versión declarada no está en caché (revisión forzada).",
  layoutOk: () => "Estructura del repositorio completa (STANDARD §2).",
  layoutIncomplete: () => "Faltan carpetas o archivos obligatorios de STANDARD §2.",
  stackOk: () => "Stack conforme a STANDARD §3.",
  stackViolations: () => "Stack fuera de STANDARD §3.",
  secretsNone: () => "Sin patrones de secretos en el árbol.",
  secretsFound: () => "Posibles secretos en el árbol.",
  nodeContractOk: () => "CONTRACT.md coherente con package.json y con los códigos de la CLI.",
  nodeContractBroken: () => "CONTRACT.md incoherente con package.json o con los códigos de la CLI.",
  installerOk: () => "Instaladores idénticos a la plantilla del reglamento.",
  installerDrifted: () => "Instaladores distintos de la plantilla del reglamento.",
  releaseOk: () => "Workflows de verificación y release conformes a la plantilla; CHANGELOG presente.",
  releaseDrifted: () => "Workflows de verificación o release distintos de la plantilla, acciones sin fijar o CHANGELOG ausente.",
  versionsOk: () => "Versiones coherentes entre package.json, tags y docs/notion-map.json.",
  versionsInconsistent: () => "Versiones incoherentes entre package.json, tags o docs/notion-map.json.",
};
```

```ts
// src/modules/messages/en.ts
import type { MessageCatalog } from "./types";
export const en: MessageCatalog = {
  notApplicable: (p) => `Not applicable: ${p.reason ?? "no reason"}.`,
  checkFailed: (p) => `The check threw an unexpected exception (${p.error ?? "?"}).`,
  sentinelOutdated: (p) => `The standard requests validator '${p.validator ?? "?"}', which this Sentinel version does not implement: update Sentinel.`,
  dataFileInvalidJson: () => "Data file with invalid JSON.",
  packageNamesOk: () => "Package names are canonical.",
  packageNamesInvalid: () => "Package folders outside origin-kind-name.",
  forbiddenMentionsNone: () => "No forbidden mentions.",
  forbiddenMentionsFound: () => "External product mentions.",
  docsParityOk: () => "Bilingual documentation with parity.",
  docsParityBroken: () => "Spanish/English documentation parity is broken.",
  decisionRecordsOk: () => "Decision records are consistent.",
  decisionRecordsInvalid: () => "Invalid decision records.",
  decisionsIndexMissing: () => "docs/decisions/INDEX.json is missing.",
  agentImpactDeclared: () => "Completed plans declare agent-procedure impact.",
  agentImpactMissing: () => "Completed plans without declared impact.",
  errorCodesOk: () => "Error codes use the canonical format.",
  errorCodesInvalid: () => "Error codes outside the UPPER_SNAKE_CASE format.",
  supportMatrixMissing: () => "Support matrix missing.",
  supportMatrixInvalid: () => "Invalid support matrix.",
  supportMatrixCurrent: () => "Support matrix is current.",
  supportMatrixStale: (p) => `Stale revalidate cells (older than ${p.days ?? "30"} days).`,
  workflowsNone: () => "No workflows to validate.",
  workflowsOk: () => "Workflows are thin, pinned and documented.",
  workflowsInvalid: () => "Workflows violate the standard.",
  contextBudgetOk: (p) => `Context budget (estimated): ~${p.tokens ?? "?"} tokens (limit ${p.budget ?? "3000"}).`,
  contextBudgetOverBudget: (p) => `Context budget (estimated) exceeds the limit: ~${p.tokens ?? "?"} tokens (limit ${p.budget ?? "3000"}).`,
  contextBudgetInvalid: () => "Could not estimate the context budget: the ecosystem pack.json is missing or invalid.",
  ecosystemContractOk: () => "Ecosystem contract is consistent.",
  ecosystemContractDiverged: () => "Diverged ecosystem contract copy.",
  rulesCatalogOk: () => "Rules and packs catalog is valid.",
  rulesCatalogInvalid: () => "Invalid rules or packs catalog.",
  nodePointerOk: () => "forge614.node.json is valid and carries the cached standard's fingerprint.",
  nodePointerMismatch: () => "The fingerprint in forge614.node.json does not match the cached standard archive.",
  nodePointerUnverifiable: () => "The pointer fingerprint could not be cross-checked: the declared version is not cached (forced run).",
  layoutOk: () => "Repository structure is complete (STANDARD §2).",
  layoutIncomplete: () => "Mandatory folders or files of STANDARD §2 are missing.",
  stackOk: () => "Stack conforms to STANDARD §3.",
  stackViolations: () => "Stack violates STANDARD §3.",
  secretsNone: () => "No secret patterns in the tree.",
  secretsFound: () => "Possible secrets in the tree.",
  nodeContractOk: () => "CONTRACT.md is consistent with package.json and with the CLI error codes.",
  nodeContractBroken: () => "CONTRACT.md is inconsistent with package.json or with the CLI error codes.",
  installerOk: () => "Installers are identical to the standard's template.",
  installerDrifted: () => "Installers differ from the standard's template.",
  releaseOk: () => "Verify and release workflows follow the template; CHANGELOG present.",
  releaseDrifted: () => "Verify or release workflows differ from the template, actions are unpinned or CHANGELOG is missing.",
  versionsOk: () => "Versions are consistent across package.json, tags and docs/notion-map.json.",
  versionsInconsistent: () => "Versions are inconsistent across package.json, tags or docs/notion-map.json.",
};
```

```ts
// src/modules/messages/render.ts
import { en } from "./en";
import { es } from "./es";
import type { Locale, MessageKey, MessageParams } from "./types";
const catalogs = { es, en } as const;
export function renderMessage(key: MessageKey, params: MessageParams, locale: Locale): string {
  return catalogs[locale][key](params);
}
export function renderBoth(key: MessageKey, params: MessageParams): { es: string; en: string } {
  return { es: renderMessage(key, params, "es"), en: renderMessage(key, params, "en") };
}
```

```ts
// src/modules/messages/render.test.ts
import { expect, test } from "bun:test";
import { en } from "./en";
import { es } from "./es";
import { renderBoth, renderMessage } from "./render";
import type { MessageKey } from "./types";

test("renders the same key in both locales with params", () => {
  expect(renderMessage("supportMatrixStale", { days: "30" }, "es")).toBe("Celdas en revalidación vencidas (más de 30 días).");
  expect(renderMessage("supportMatrixStale", { days: "30" }, "en")).toBe("Stale revalidate cells (older than 30 days).");
  expect(renderBoth("notApplicable", { reason: "no package.json" })).toEqual({ es: "No aplica: no package.json.", en: "Not applicable: no package.json." });
});

test("every key renders non-empty text in both languages (parity by compiler, content by test)", () => {
  const keys = Object.keys(es) as MessageKey[];
  expect(keys.length).toBeGreaterThan(40);
  for (const key of keys) {
    expect(es[key]({}).length, `es.${key}`).toBeGreaterThan(0);
    expect(en[key]({}).length, `en.${key}`).toBeGreaterThan(0);
  }
});
```

- [ ] **Step 4: `check.ts` con tests**

```ts
// src/modules/check.test.ts
import { expect, test } from "bun:test";
import { caution, fail, notApplicable, pass, worst } from "./check";

test("constructors carry verdict, evidence, key and params", () => {
  expect(pass("layoutOk")).toEqual({ verdict: "pass", evidence: [], messageKey: "layoutOk", params: {} });
  expect(pass("layoutOk", {}, ["layout list source: builtin (standard 1.0.0 ships no layout.json)"]).evidence).toHaveLength(1);
  expect(caution(["x"], "nodePointerUnverifiable")).toMatchObject({ verdict: "caution", evidence: ["x"] });
  expect(fail(["a", "b"], "layoutIncomplete")).toMatchObject({ verdict: "fail", evidence: ["a", "b"] });
  expect(notApplicable("no package.json")).toEqual({ verdict: "not-applicable", evidence: [], messageKey: "notApplicable", params: { reason: "no package.json" } });
});

test("worst ignores not-applicable and ranks fail > caution > pass", () => {
  expect(worst(["pass", "not-applicable"])).toBe("pass");
  expect(worst(["pass", "caution", "not-applicable"])).toBe("caution");
  expect(worst(["caution", "fail"])).toBe("fail");
  expect(worst(["not-applicable"])).toBe("pass");
  expect(worst([])).toBe("pass");
});
```

```ts
// src/modules/check.ts
import type { CheckParams } from "./check-params";
import type { MessageKey, MessageParams } from "./messages/types";
import type { RepoSnapshot } from "./snapshot";

export type CheckVerdict = "pass" | "caution" | "fail" | "not-applicable";
export type Verdict = Exclude<CheckVerdict, "not-applicable">;

// What a check returns: pure data. The id, the `applied` flag and the
// rendered messages are added by app/run-checks when it builds the report.
export interface CheckResult {
  verdict: CheckVerdict;
  evidence: string[];
  messageKey: MessageKey;
  params: MessageParams;
}

export interface CheckDefinition {
  id: string;
  appliesWhen: (snapshot: RepoSnapshot, params: CheckParams) => boolean;
  run: (snapshot: RepoSnapshot, params: CheckParams) => CheckResult;
}

// A pass may still carry informational evidence (for example, which list a
// check used when the standard version does not ship it yet).
export function pass(key: MessageKey, params: MessageParams = {}, evidence: string[] = []): CheckResult {
  return { verdict: "pass", evidence, messageKey: key, params };
}

export function caution(evidence: string[], key: MessageKey, params: MessageParams = {}): CheckResult {
  return { verdict: "caution", evidence, messageKey: key, params };
}

export function fail(evidence: string[], key: MessageKey, params: MessageParams = {}): CheckResult {
  return { verdict: "fail", evidence, messageKey: key, params };
}

export function notApplicable(reason: string): CheckResult {
  return { verdict: "not-applicable", evidence: [], messageKey: "notApplicable", params: { reason } };
}

export function worst(verdicts: readonly CheckVerdict[]): Verdict {
  if (verdicts.includes("fail")) return "fail";
  if (verdicts.includes("caution")) return "caution";
  return "pass";
}
```

- [ ] **Step 5: `check-params.ts`** (solo tipos; los valores los construye `app/build-check-params`, Task 8)

```ts
// src/modules/check-params.ts
import type { NodePointer } from "./schemas/node-pointer";
import type { Pack } from "./schemas/pack";
import type { RuleManifest } from "./schemas/rule-manifest";

export interface StandardParams {
  version: string;
  sha256: string;
  // sha256 of the cached archive of the version the POINTER declares. Equal
  // to `sha256` unless `--standard` forced another version; undefined when
  // that version is not cached (node-pointer then reports caution).
  pointerVersionSha256: string | undefined;
}

export interface LayoutSpec {
  directories: readonly string[];
  files: readonly string[];
  source: "builtin" | "standard/layout.json";
}

export interface StackSpec {
  tsconfigFlags: readonly string[];
  minimumBun: string;
  source: "builtin" | "standard/stack.json";
}

export interface SecretPattern {
  id: string;
  pattern: string; // RegExp source, flags "g"
}

export interface SecretsSpec {
  patterns: readonly SecretPattern[];
  excludePaths: readonly string[];
  source: "builtin" | "standard/secret-patterns.json";
}

// Every parameter a check may need, built once per run from the loaded
// standard (spec §8: parameters come from the standard, never from constants
// inside a check). `parseYaml` is the only function: the yaml package is
// external to modules, so app injects it.
export interface CheckParams {
  sentinelVersion: string;
  today: string;
  pointer: NodePointer;
  standard: StandardParams;
  pack: Pack;
  manifests: ReadonlyMap<string, RuleManifest>;
  forbiddenMentions: { terms: readonly string[]; excludePaths: readonly string[] };
  templates: ReadonlyMap<string, string>;
  ecosystemContract: string;
  layout: LayoutSpec;
  stack: StackSpec;
  secrets: SecretsSpec;
  // Jobs a node may add to the standard's workflow templates without the
  // release check failing (spec §13 names `parity` as the allowed deviation).
  allowedExtraJobs: readonly string[];
  knownCheckIds: readonly string[];
  legacyValidatorIds: Readonly<Record<string, string>>;
  parseYaml: (text: string) => unknown;
}
```

- [ ] **Step 6: `report.ts` con test contra el JSON exacto de la spec §6**

```ts
// src/modules/report.ts
import { z } from "zod";
import { SemVer, Sha256, Slug } from "./schemas/common";

const CheckVerdictSchema = z.enum(["pass", "caution", "fail", "not-applicable"]);
const VerdictSchema = z.enum(["pass", "caution", "fail"]);

export const CheckEntrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    verdict: CheckVerdictSchema,
    applied: z.boolean(),
    evidence: z.array(z.string()),
    message: z.object({ es: z.string().min(1), en: z.string().min(1) }).strict(),
  })
  .strict();
export type CheckEntry = z.infer<typeof CheckEntrySchema>;

// spec §6. Evolves additively (acta 0024): new fields are optional; nothing
// is renamed or removed without bumping schemaVersion.
export const CheckReportSchema = z
  .object({
    schemaVersion: z.literal(1),
    sentinel: SemVer,
    standard: z
      .object({ version: SemVer, sha256: Sha256, forced: z.boolean(), fetched: z.boolean(), latestKnown: SemVer.optional() })
      .strict(),
    repository: z.object({ kind: z.literal("node"), name: Slug }).strict(),
    verdict: VerdictSchema,
    checks: z.array(CheckEntrySchema),
    durationMs: z.number().int().nonnegative(),
  })
  .strict();
export type CheckReport = z.infer<typeof CheckReportSchema>;

export const NotApplicableReportSchema = z
  .object({
    schemaVersion: z.literal(1),
    applicable: z.literal(false),
    reason: z.enum(["external-project", "not-a-forge614-repo"]),
  })
  .strict();
export type NotApplicableReport = z.infer<typeof NotApplicableReportSchema>;

export type SentinelReport = CheckReport | NotApplicableReport;
```

```ts
// src/modules/report.test.ts
import { expect, test } from "bun:test";
import { CheckReportSchema, NotApplicableReportSchema } from "./report";

// Verbatim from spec §6 (with a real sha256 in place of the ellipsis).
const SPEC_EXAMPLE = {
  schemaVersion: 1,
  sentinel: "0.1.0",
  standard: { version: "1.0.0", sha256: "18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922", forced: false, fetched: false },
  repository: { kind: "node", name: "engram" },
  verdict: "pass",
  checks: [
    {
      id: "docs-parity",
      verdict: "pass",
      applied: true,
      evidence: ["docs/es/03-x.md: 5 headings vs docs/en/03-x.md: 4"],
      message: { es: "…", en: "…" },
    },
  ],
  durationMs: 812,
};

test("the spec §6 example is a valid CheckReport", () => {
  expect(CheckReportSchema.safeParse(SPEC_EXAMPLE).success).toBe(true);
});

test("latestKnown is optional and unknown keys are rejected", () => {
  expect(CheckReportSchema.safeParse({ ...SPEC_EXAMPLE, standard: { ...SPEC_EXAMPLE.standard, latestKnown: "1.1.0" } }).success).toBe(true);
  expect(CheckReportSchema.safeParse({ ...SPEC_EXAMPLE, extra: 1 }).success).toBe(false);
  expect(CheckReportSchema.safeParse({ ...SPEC_EXAMPLE, checks: [{ ...SPEC_EXAMPLE.checks[0], ruleId: "x" }] }).success).toBe(false);
});

test("a not-applicable report has exactly the spec §4 shape", () => {
  expect(NotApplicableReportSchema.safeParse({ schemaVersion: 1, applicable: false, reason: "external-project" }).success).toBe(true);
  expect(NotApplicableReportSchema.safeParse({ schemaVersion: 1, applicable: false, reason: "other" }).success).toBe(false);
});
```

- [ ] **Step 7: Helper de test para fixtures de comprobación**

```ts
// tests/helpers/snapshot-from-dir.ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { RepoFacts, RepoSnapshot } from "../../src/modules/snapshot";
import { snapshotFrom } from "../../src/modules/snapshot";

export const FIXTURES = resolve(import.meta.dir, "../../fixtures");

// Test-only loader: reads every file under a fixture folder into a snapshot
// (no git, no ignore rules, CRLF normalized) so a check can be exercised
// against `fixtures/<id>/{pass,fail}/` without going through infrastructure.
export function snapshotFromDir(dir: string, facts: Partial<RepoFacts> = {}): RepoSnapshot {
  const root = resolve(FIXTURES, dir);
  const entries: Record<string, string> = {};
  const walk = (current: string): void => {
    for (const name of readdirSync(current).sort()) {
      const full = join(current, name);
      if (statSync(full).isDirectory()) walk(full);
      else entries[relative(root, full).split("\\").join("/")] = readFileSync(full, "utf8").replace(/\r\n/g, "\n");
    }
  };
  walk(root);
  return snapshotFrom(entries, facts);
}
```

- [ ] **Step 8: Ejecutar**

Run: `bun run typecheck && bun test src/modules`
Expected: todo en verde (snapshot 3, check 2, messages 2, report 3, más los tests de Task 2).

- [ ] **Step 9: Commit (lo hace el propietario)**

```bash
git add src/modules tests/helpers
git commit -m "feat(modules): RepoSnapshot, CheckResult, CheckParams, esquema del informe y catálogo de mensajes es/en"
```

---

### Task 4: `modules`: lector ustar, writer ustar portado y CRC-32

**Files:**
- Create: `src/modules/tar-reader.ts`, `src/modules/tar-reader.test.ts`
- Create: `src/modules/tar.ts`, `src/modules/tar.test.ts` (writer portado, usado por `build:target` en Task 25 y por los tests del lector)
- Create: `src/modules/crc32.ts`, `src/modules/crc32.test.ts` (portado de `forge614-ai/src/modules/standard/gzip.ts`; lo usa `extractTarGz` en Task 5 para verificar el trailer gzip)

**Interfaces:**
- Consumes: nada fuera de TypeScript (módulos puros).
- Produces:
  ```ts
  // src/modules/tar-reader.ts
  export interface TarMember { path: string; mode: number; content?: Uint8Array } // content undefined = directory
  export function parseUstar(bytes: Uint8Array): TarMember[]; // throws on bad checksum, bad magic, unsafe path
  // src/modules/tar.ts (port)
  export interface TarEntry { path: string; mode: number; content?: Uint8Array }
  export function buildUstarArchive(entries: TarEntry[]): Uint8Array<ArrayBuffer>;
  export function tarMode(content: Uint8Array | undefined): number;
  // src/modules/crc32.ts (port)
  export function crc32(bytes: Uint8Array): number; // IEEE 802.3, reflected, polynomial 0xEDB88320
  ```

- [ ] **Step 1: Tests del lector ustar (fallan)**

```ts
// src/modules/tar-reader.test.ts
import { expect, test } from "bun:test";
import { parseUstar } from "./tar-reader";
import { buildUstarArchive } from "./tar";

const enc = new TextEncoder();
const dec = new TextDecoder();

test("round-trips files and directories written by the ecosystem's own ustar writer", () => {
  const archive = buildUstarArchive([
    { path: "VERSION", mode: 0o644, content: enc.encode("1.0.0\n") },
    { path: "rules/", mode: 0o755 },
    { path: "rules/RULE.md", mode: 0o644, content: enc.encode("# rule\n".repeat(100)) },
    { path: "run.sh", mode: 0o755, content: enc.encode("#!/bin/sh\n") },
    { path: "empty.txt", mode: 0o644, content: new Uint8Array() },
  ]);
  const members = parseUstar(archive);
  expect(members.map((m) => m.path)).toEqual(["VERSION", "rules/", "rules/RULE.md", "run.sh", "empty.txt"]);
  expect(members[1]?.content).toBeUndefined();
  expect(members[1]?.mode).toBe(0o755);
  expect(dec.decode(members[2]?.content)).toBe("# rule\n".repeat(100));
  expect(members[3]?.mode).toBe(0o755);
  expect(members[4]?.content?.length).toBe(0);
});

test("a content length that is an exact multiple of 512 needs no padding block", () => {
  const archive = buildUstarArchive([{ path: "a", mode: 0o644, content: new Uint8Array(1024).fill(7) }, { path: "b", mode: 0o644, content: enc.encode("b") }]);
  const members = parseUstar(archive);
  expect(members.map((m) => m.path)).toEqual(["a", "b"]);
  expect(members[0]?.content?.length).toBe(1024);
});

test("rejects a corrupted header checksum and a bad magic", () => {
  const archive = buildUstarArchive([{ path: "a", mode: 0o644, content: enc.encode("x") }]);
  const flipped = new Uint8Array(archive);
  flipped[0] = 0x62; // "a" → "b" without recomputing the checksum
  expect(() => parseUstar(flipped)).toThrow(/checksum/);
  const noMagic = new Uint8Array(archive);
  noMagic.set(enc.encode("gnu\0\0\0"), 257);
  expect(() => parseUstar(noMagic)).toThrow(/magic/);
});

test("rejects unsafe member paths (absolute, parent traversal)", () => {
  for (const bad of ["../x", "a/../../x", "/etc/passwd"]) {
    const archive = buildUstarArchive([{ path: bad, mode: 0o644, content: enc.encode("x") }]);
    expect(() => parseUstar(archive), bad).toThrow(/unsafe/);
  }
});

test("an empty archive (only end blocks) yields no members; a truncated one throws", () => {
  expect(parseUstar(new Uint8Array(1024))).toEqual([]);
  const archive = buildUstarArchive([{ path: "a", mode: 0o644, content: enc.encode("x".repeat(600)) }]);
  expect(() => parseUstar(archive.subarray(0, 700))).toThrow(/truncated/);
});
```

- [ ] **Step 2: Portar el writer ustar** (`forge614-ai/src/modules/standard/tar.ts` → `src/modules/tar.ts`, con su `tar.test.ts` salvo el test que invoca `tar` del sistema, que se omite: Sentinel no depende de binarios externos en tests). El código es el mismo (`TarEntry`, `BLOCK`, `RECORD`, `NAME_MAX`, `tarMode`, `header`, `buildUstarArchive`); solo cambia el comentario de cabecera:

```ts
// Pure POSIX ustar writer, the same one forge614-ai uses to package the
// standard. Sentinel needs it for two things: to build the release archives
// of its own binaries with pinned metadata (build:target) and to produce
// archives in tests for the reader below. Header fields that would depend on
// the machine are pinned: uid/gid 0, empty uname/gname, mtime 0.
```

- [ ] **Step 3: Implementar `src/modules/tar-reader.ts`**

```ts
// Pure POSIX ustar reader: the counterpart of tar.ts. It reads the archives
// forge614-ai publishes (ustar, no prefix field, no long names, no PAX) and
// refuses anything it does not understand instead of guessing.
export interface TarMember {
  path: string;
  mode: number;
  content?: Uint8Array;
}

const BLOCK = 512;
const decoder = new TextDecoder();

function cstring(block: Uint8Array, offset: number, length: number): string {
  const slice = block.subarray(offset, offset + length);
  const end = slice.indexOf(0);
  return decoder.decode(end < 0 ? slice : slice.subarray(0, end));
}

function octal(block: Uint8Array, offset: number, length: number): number {
  const text = cstring(block, offset, length).trim();
  if (text === "") return 0;
  if (!/^[0-7]+$/.test(text)) throw new Error(`tar: invalid octal field at ${offset}: '${text}'`);
  return Number.parseInt(text, 8);
}

function isSafePath(path: string): boolean {
  if (path === "" || path.startsWith("/") || path.includes("\\") || path.includes("\0")) return false;
  return path.split("/").every((segment) => segment !== ".." && segment !== "." || segment === "");
}

export function parseUstar(bytes: Uint8Array): TarMember[] {
  const members: TarMember[] = [];
  let offset = 0;
  while (offset + BLOCK <= bytes.length) {
    const header = bytes.subarray(offset, offset + BLOCK);
    if (header.every((b) => b === 0)) break; // end-of-archive zero block

    if (cstring(header, 257, 6) !== "ustar") throw new Error(`tar: bad magic at offset ${offset}`);

    let sum = 0;
    for (let i = 0; i < BLOCK; i += 1) sum += i >= 148 && i < 156 ? 0x20 : (header[i] ?? 0);
    if (octal(header, 148, 8) !== sum) throw new Error(`tar: header checksum mismatch at offset ${offset}`);

    const path = cstring(header, 0, 100);
    if (!isSafePath(path)) throw new Error(`tar: unsafe member path '${path}'`);
    const mode = octal(header, 100, 8) & 0o777;
    const size = octal(header, 124, 12);
    const typeflag = header[156];
    const isDirectory = typeflag === 0x35 || (typeflag === 0 && path.endsWith("/"));

    offset += BLOCK;
    if (isDirectory) {
      members.push({ path: path.endsWith("/") ? path : `${path}/`, mode });
      continue;
    }
    if (typeflag !== 0x30 && typeflag !== 0) throw new Error(`tar: unsupported member type '${String.fromCharCode(typeflag ?? 0)}' for '${path}'`);
    if (offset + size > bytes.length) throw new Error(`tar: truncated archive: '${path}' declares ${size} bytes`);
    members.push({ path, mode, content: bytes.slice(offset, offset + size) });
    offset += size + ((BLOCK - (size % BLOCK)) % BLOCK);
  }
  return members;
}
```

- [ ] **Step 4: Portar `crc32` con su test**

```ts
// src/modules/crc32.ts
// Standard CRC-32 (IEEE 802.3, reflected, polynomial 0xEDB88320): the
// checksum a gzip member carries in its trailer (RFC 1952). Same code as
// forge614-ai's src/modules/standard/gzip.ts, which writes the trailers
// Sentinel verifies.
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
```

```ts
// src/modules/crc32.test.ts
import { expect, test } from "bun:test";
import { gzipSync } from "node:zlib";
import { crc32 } from "./crc32";

const encoder = new TextEncoder();

test("crc32 matches the standard check vector", () => {
  expect(crc32(encoder.encode("123456789"))).toBe(0xcbf43926);
});

test("crc32 of empty input is 0", () => {
  expect(crc32(new Uint8Array())).toBe(0);
});

test("crc32 equals the CRC32 field of a gzip trailer written by node:zlib", () => {
  const input = encoder.encode("forge614 sentinel ".repeat(40));
  const gz = new Uint8Array(gzipSync(input));
  const trailer = new DataView(gz.buffer, gz.byteOffset + gz.length - 8, 8);
  expect(crc32(input)).toBe(trailer.getUint32(0, true));
});
```

- [ ] **Step 5: Ejecutar tests del tar**

Run: `bun run typecheck && bun test src/modules/tar-reader.test.ts src/modules/tar.test.ts src/modules/crc32.test.ts`
Expected: todo en verde (lector 5, writer 9, crc32 3).

- [ ] **Step 6: Commit (lo hace el propietario)**

```bash
git add src/modules/tar.ts src/modules/tar.test.ts src/modules/tar-reader.ts src/modules/tar-reader.test.ts src/modules/crc32.ts src/modules/crc32.test.ts
git commit -m "feat(modules): lector ustar propio, writer ustar portado y CRC-32 para el trailer gzip"
```

---

### Task 5: `infrastructure`: fixture del reglamento, árbol del repositorio, hechos de Git, procesos, tar.gz verificado y escritura atómica

**Files:**
- Create: `fixtures/standard/standard-v1.0.0/standard-1.0.0.tar.gz`, `fixtures/standard/standard-v1.0.0/SHA256SUMS` (descargados una sola vez de la release `standard-v1.0.0`)
- Create: `src/infrastructure/fs-tree.ts`, `src/infrastructure/fs-tree.test.ts`
- Create: `src/infrastructure/process.ts`, `src/infrastructure/process.test.ts` (portado)
- Create: `src/infrastructure/git.ts`, `src/infrastructure/git.test.ts`
- Create: `src/infrastructure/archive.ts`, `src/infrastructure/archive.test.ts`
- Create: `src/infrastructure/fs-write.ts`, `src/infrastructure/fs-write.test.ts` (portado + `writeTreeAtomic`)

**Interfaces:**
- Consumes: `fflate` (`gunzipSync`), `node:fs`, `Bun.spawnSync`; `parseUstar`, `TarMember`, `crc32` (Task 4); `MAX_TEXT_BYTES` (Task 3).
- Produces:
  ```ts
  // src/infrastructure/fs-tree.ts
  export interface TreeOptions { ignore?: readonly string[] }
  export function walkTree(root: string, options?: TreeOptions): { files: Map<string, string>; skippedLargeFiles: string[] };
  export function readListedFiles(root: string, paths: readonly string[]): { files: Map<string, string>; skippedLargeFiles: string[] };
  export function normalizeText(text: string): string; // CRLF → LF
  export function isTextFile(name: string): boolean;   // .env*, extensionless, and md/json/ts/…/pem/key
  // src/infrastructure/git.ts
  export interface GitFacts { available: boolean; listing: string[] | undefined; tags: string[]; logSubjects: string[]; executablePaths: string[] }
  export function readGitFacts(root: string, options?: { timeoutMs?: number; git?: string }): GitFacts;
  // src/infrastructure/process.ts
  export function run(cmd: string[], options?: { cwd?: string; stdin?: string; timeoutMs?: number; env?: Record<string, string> }): { exitCode: number; stdout: string; stderr: string };
  // src/infrastructure/archive.ts
  export function extractTarGz(bytes: Uint8Array): TarMember[]; // verifies the gzip CRC32 and ISIZE trailer
  // src/infrastructure/fs-write.ts
  export function writeTextAtomic(path: string, content: string): void;
  export function writeBytesAtomic(path: string, bytes: Uint8Array): void;
  export function writeTreeAtomic(finalDir: string, files: ReadonlyMap<string, Uint8Array>, tmpDir: string): void; // writes under tmpDir, then renames to finalDir
  ```

- [ ] **Step 1: Descargar la fixture del reglamento desde la release (una sola vez)**

Run (no ejecuta código de `forge614-ai`; la release es pública):
```bash
mkdir -p ~/Desktop/forge614-sentinel/fixtures/standard/standard-v1.0.0
cd ~/Desktop/forge614-sentinel/fixtures/standard/standard-v1.0.0
gh release download standard-v1.0.0 -R jotredev/forge614-ai --pattern 'standard-1.0.0.tar.gz' --pattern 'SHA256SUMS' --clobber
shasum -a 256 -c SHA256SUMS
wc -c < standard-1.0.0.tar.gz
tar -tzf standard-1.0.0.tar.gz | wc -l
```
Expected: `standard-1.0.0.tar.gz: OK` (huella `18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922`), `74741` bytes y `105` miembros. `SHA256SUMS` de la release lista solo el paquete. La carpeta `standard-v1.0.0/` imita la ruta de la release (`…/releases/download/standard-v1.0.0/…`) para que `FORGE614_SENTINEL_RELEASE_BASE=file://<repo>/fixtures/standard` funcione sin red (Task 6).

- [ ] **Step 2: Tests de `fs-tree` (fallan)**

```ts
// src/infrastructure/fs-tree.test.ts
import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeText, readListedFiles, walkTree } from "./fs-tree";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "sentinel-tree-"));
}

test("walkTree skips node_modules, dist, .git, .superpowers and binaries; includes extensionless and .env* files", () => {
  const root = tmp();
  mkdirSync(join(root, "node_modules/x"), { recursive: true });
  mkdirSync(join(root, ".git"), { recursive: true });
  mkdirSync(join(root, "hooks"), { recursive: true });
  writeFileSync(join(root, "node_modules/x/a.md"), "no");
  writeFileSync(join(root, ".git/HEAD"), "ref");
  writeFileSync(join(root, "a.md"), "yes");
  writeFileSync(join(root, "img.png"), "bin");
  writeFileSync(join(root, "hooks/pre-push"), "#!/bin/sh\n");
  writeFileSync(join(root, ".env.local"), "KEY=v\n");
  writeFileSync(join(root, "bun.lock"), "{}");
  expect([...walkTree(root).files.keys()].sort()).toEqual([".env.local", "a.md", "bun.lock", "hooks/pre-push"]);
});

test("walkTree normalizes CRLF to LF", () => {
  const root = tmp();
  writeFileSync(join(root, "a.md"), "# T\r\n## A\r\n");
  expect(walkTree(root).files.get("a.md")).toBe("# T\n## A\n");
  expect(normalizeText("a\r\nb\rc\n")).toBe("a\nb\rc\n");
});

// Creating symlinks on Windows needs developer mode or admin rights; the
// behavior under test (lstat, never follow) is the same code path there.
test.skipIf(process.platform === "win32")("walkTree skips symlinks (never follows them) and lists files above MAX_TEXT_BYTES", () => {
  const root = tmp();
  writeFileSync(join(root, "real.md"), "x");
  symlinkSync(join(root, "real.md"), join(root, "link.md"));
  mkdirSync(join(root, "outside"));
  symlinkSync(join(root, "outside"), join(root, "dir-link"));
  writeFileSync(join(root, "big.json"), "x".repeat(2 * 1024 * 1024 + 1));
  const tree = walkTree(root);
  expect([...tree.files.keys()].sort()).toEqual(["real.md"]);
  expect(tree.skippedLargeFiles).toEqual(["big.json"]);
});

test("walkTree reads .pem and .key files as text so secrets-hygiene can see a committed private key", () => {
  const root = tmp();
  writeFileSync(join(root, "server.pem"), "-----BEGIN X-----\n");
  writeFileSync(join(root, "client.key"), "k\n");
  expect([...walkTree(root).files.keys()].sort()).toEqual(["client.key", "server.pem"]);
});

test("readListedFiles reads only the given paths, skips a listed file missing from disk and uses / separators", () => {
  const root = tmp();
  mkdirSync(join(root, "docs/es"), { recursive: true });
  writeFileSync(join(root, "docs/es/00-a.md"), "a\r\n");
  writeFileSync(join(root, "other.md"), "o");
  const tree = readListedFiles(root, ["docs/es/00-a.md", "deleted.md", "img.png"]);
  expect([...tree.files.entries()]).toEqual([["docs/es/00-a.md", "a\n"]]);
});
```

- [ ] **Step 3: Implementar `src/infrastructure/fs-tree.ts`**

```ts
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { MAX_TEXT_BYTES } from "../modules/snapshot";

// Used only when the repository is not a git checkout (fixtures, plain
// folders): a git checkout gets its listing from `git ls-files` (git.ts),
// which already honors .gitignore.
const DEFAULT_IGNORE = ["node_modules", "dist", ".git", ".superpowers", "coverage", "build", "out"];

// Extensions treated as text. A file with no extension (or a dotfile such as
// `.gitignore`) is text too; `.env*` files are always text so the secrets
// check can look at them; `pem` and `key` are read so a private key
// committed by mistake reaches the secrets-hygiene check.
const TEXT_EXTENSIONS = new Set(["md", "json", "ts", "js", "mjs", "cjs", "yml", "yaml", "sh", "ps1", "txt", "toml", "lock", "pem", "key"]);

export interface TreeOptions {
  ignore?: readonly string[];
}

export interface TreeRead {
  files: Map<string, string>;
  skippedLargeFiles: string[];
}

export function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

export function isTextFile(name: string): boolean {
  if (name.startsWith(".env")) return true;
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return true;
  return TEXT_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
}

function toPosix(path: string): string {
  return path.split("\\").join("/");
}

function readOne(root: string, rel: string, out: TreeRead): void {
  const full = join(root, rel);
  let stat: ReturnType<typeof lstatSync>;
  try {
    stat = lstatSync(full);
  } catch {
    return; // listed by git but missing from the working tree
  }
  if (!stat.isFile()) return; // symlink, directory, socket
  if (stat.size > MAX_TEXT_BYTES) {
    out.skippedLargeFiles.push(rel);
    return;
  }
  out.files.set(rel, normalizeText(readFileSync(full, "utf8")));
}

export function walkTree(root: string, options: TreeOptions = {}): TreeRead {
  const ignore = new Set([...DEFAULT_IGNORE, ...(options.ignore ?? [])]);
  const out: TreeRead = { files: new Map(), skippedLargeFiles: [] };
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      if (ignore.has(name)) continue;
      const full = join(dir, name);
      const stat = lstatSync(full);
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) walk(full);
      else if (stat.isFile() && isTextFile(name)) readOne(root, toPosix(relative(root, full)), out);
    }
  };
  walk(root);
  out.skippedLargeFiles.sort();
  return out;
}

export function readListedFiles(root: string, paths: readonly string[]): TreeRead {
  const out: TreeRead = { files: new Map(), skippedLargeFiles: [] };
  for (const rel of [...paths].sort()) {
    const name = rel.split("/").at(-1) ?? rel;
    if (isTextFile(name)) readOne(root, rel, out);
  }
  return out;
}
```

- [ ] **Step 4: Portar `process.ts`** (idéntico a `forge614-ai/src/infrastructure/process.ts` más `env`):

```ts
// src/infrastructure/process.ts
export interface RunOptions {
  cwd?: string;
  stdin?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
}

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function run(cmd: string[], options: RunOptions = {}): RunResult {
  const proc = Bun.spawnSync(cmd, {
    ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
    ...(options.env === undefined ? {} : { env: { ...process.env, ...options.env } }),
    stdin: options.stdin === undefined ? "ignore" : new TextEncoder().encode(options.stdin),
    stdout: "pipe",
    stderr: "pipe",
    timeout: options.timeoutMs ?? 600_000,
  });
  return {
    exitCode: proc.exitCode,
    stdout: new TextDecoder().decode(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
  };
}
```

Con su `process.test.ts` portado (tres tests con `bash`, `skipIf(onWindows)`), más uno nuevo:

```ts
test("env is merged over the parent environment", () => {
  const r = run(["bun", "-e", "console.log(process.env.SENTINEL_TEST_VAR)"], { env: { SENTINEL_TEST_VAR: "on" } });
  expect(r.stdout.trim()).toBe("on");
});
```

- [ ] **Step 5: Tests de `git.ts` (fallan)**

```ts
// src/infrastructure/git.test.ts
import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readGitFacts } from "./git";
import { run } from "./process";

const hasGit = Bun.which("git") !== null;

function gitRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "sentinel-git-"));
  const git = (...args: string[]) => run(["git", ...args], { cwd: root, env: { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@x", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@x" } });
  git("init", "-q", "-b", "main");
  mkdirSync(join(root, ".githooks"));
  writeFileSync(join(root, ".githooks/pre-push"), "#!/bin/sh\n");
  writeFileSync(join(root, "README.md"), "# r\n");
  writeFileSync(join(root, ".gitignore"), ".env\n");
  writeFileSync(join(root, ".env"), "SECRET=1\n");
  git("add", ".");
  git("update-index", "--chmod=+x", ".githooks/pre-push");
  git("commit", "-q", "-m", "first commit");
  git("tag", "v0.1.0");
  git("tag", "v0.2.0");
  git("tag", "standard-v1.0.0");
  writeFileSync(join(root, "untracked.md"), "new\n");
  return root;
}

test.skipIf(!hasGit)("reads listing (tracked + untracked, ignoring .gitignore), tags v*, log subjects and executable paths from git modes", () => {
  const facts = readGitFacts(gitRepo());
  expect(facts.available).toBe(true);
  expect(facts.listing).toEqual([".githooks/pre-push", ".gitignore", "README.md", "untracked.md"]);
  expect(facts.tags).toEqual(["v0.1.0", "v0.2.0"]);
  expect(facts.logSubjects).toHaveLength(1);
  expect(facts.logSubjects[0]).toMatch(/^[0-9a-f]{7} first commit$/);
  expect(facts.executablePaths).toEqual([".githooks/pre-push"]);
});

test("a folder that is not a git repository yields available: false and no listing, without throwing", () => {
  const root = mkdtempSync(join(tmpdir(), "sentinel-nogit-"));
  writeFileSync(join(root, "a.md"), "x");
  const facts = readGitFacts(root);
  expect(facts).toEqual({ available: false, listing: undefined, tags: [], logSubjects: [], executablePaths: [] });
});

test("a missing git binary is handled as unavailable", () => {
  // The .git folder gets readGitFacts past its existsSync guard, so the path
  // exercised is "the git executable cannot be spawned".
  const root = mkdtempSync(join(tmpdir(), "sentinel-nogitbin-"));
  mkdirSync(join(root, ".git"));
  const facts = readGitFacts(root, { git: "definitely-not-a-git-binary" });
  expect(facts).toEqual({ available: false, listing: undefined, tags: [], logSubjects: [], executablePaths: [] });
});
```

- [ ] **Step 6: Implementar `src/infrastructure/git.ts`**

```ts
import { existsSync } from "node:fs";
import { join } from "node:path";
import { run } from "./process";

export interface GitFacts {
  available: boolean;
  // Every path git knows about (tracked, plus untracked files not ignored),
  // "/"-separated; undefined when git is unavailable so the caller walks the
  // disk instead.
  listing: string[] | undefined;
  tags: string[];
  logSubjects: string[];
  executablePaths: string[];
}

const UNAVAILABLE: GitFacts = { available: false, listing: undefined, tags: [], logSubjects: [], executablePaths: [] };
const LOG_LIMIT = 50;

// All commands are read-only and bounded by a timeout; Sentinel never writes
// to the repository it inspects. Modes come from the index (100755), never
// from the disk, so Windows reports the same executables as macOS.
export function readGitFacts(root: string, options: { timeoutMs?: number; git?: string } = {}): GitFacts {
  if (!existsSync(join(root, ".git"))) return UNAVAILABLE;
  const git = options.git ?? "git";
  const timeoutMs = options.timeoutMs ?? 10_000;
  const exec = (...args: string[]) => {
    try {
      return run([git, "-c", "core.quotepath=off", ...args], { cwd: root, timeoutMs });
    } catch {
      return { exitCode: 127, stdout: "", stderr: "git could not be executed" };
    }
  };

  const staged = exec("ls-files", "-z", "--stage");
  if (staged.exitCode !== 0) return UNAVAILABLE;
  const listing = new Set<string>();
  const executablePaths: string[] = [];
  for (const record of staged.stdout.split("\0")) {
    if (record === "") continue;
    // "<mode> <object> <stage>\t<path>"
    const tab = record.indexOf("\t");
    const meta = record.slice(0, tab).split(" ");
    const path = record.slice(tab + 1);
    const mode = meta[0] ?? "";
    if (mode === "120000" || mode === "160000") continue; // symlink, submodule
    listing.add(path);
    if (mode === "100755") executablePaths.push(path);
  }

  const untracked = exec("ls-files", "-z", "--others", "--exclude-standard");
  if (untracked.exitCode === 0) for (const path of untracked.stdout.split("\0")) if (path !== "") listing.add(path);

  const tags = exec("tag", "--list", "v*");
  const log = exec("log", `-n${LOG_LIMIT}`, "--format=%h %s");

  return {
    available: true,
    listing: [...listing].sort(),
    tags: tags.exitCode === 0 ? tags.stdout.split("\n").filter((t) => t !== "").sort() : [],
    logSubjects: log.exitCode === 0 ? log.stdout.split("\n").filter((l) => l !== "") : [],
    executablePaths: executablePaths.sort(),
  };
}
```

- [ ] **Step 7: `archive.ts` con test sobre la fixture real**

```ts
// src/infrastructure/archive.test.ts
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { extractTarGz } from "./archive";
import { sha256Hex } from "./hashing";

const FIXTURE = resolve(import.meta.dir, "../../fixtures/standard/standard-v1.0.0/standard-1.0.0.tar.gz");

test("extracts the published standard 1.0.0 archive: 105 members, VERSION and the ecosystem pack", () => {
  const bytes = new Uint8Array(readFileSync(FIXTURE));
  expect(sha256Hex(bytes)).toBe("18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922");
  const members = extractTarGz(bytes);
  expect(members).toHaveLength(105);
  const version = members.find((m) => m.path === "VERSION");
  expect(new TextDecoder().decode(version?.content)).toBe("1.0.0\n");
  expect(members.some((m) => m.path === "packs/forge614-pack-ecosystem-node/pack.json")).toBe(true);
  expect(members.some((m) => m.path === "templates/install.sh" && m.mode === 0o755)).toBe(true);
  expect(members.filter((m) => m.content === undefined).map((m) => m.path)).toContain("rules/");
});

test("a flipped byte in the CRC32 trailer is rejected (fflate alone does not check it)", () => {
  const bytes = new Uint8Array(readFileSync(FIXTURE));
  const i = bytes.length - 8; // first byte of CRC32
  bytes[i] = (bytes[i] ?? 0) ^ 0xff;
  expect(() => extractTarGz(bytes)).toThrow("gzip: crc mismatch");
});

test("a flipped byte in the ISIZE trailer is rejected, not silently extracted", () => {
  const bytes = new Uint8Array(readFileSync(FIXTURE));
  const i = bytes.length - 3; // second byte of ISIZE
  bytes[i] = (bytes[i] ?? 0) ^ 0xff;
  expect(() => extractTarGz(bytes)).toThrow();
});
```

```ts
// src/infrastructure/archive.ts
import { gunzipSync } from "fflate";
import { crc32 } from "../modules/crc32";
import { parseUstar, type TarMember } from "../modules/tar-reader";

// gunzip through fflate (pure JavaScript, pinned version: the same package
// forge614-ai compresses with) and the ecosystem's own ustar reader. fflate
// does not verify the gzip trailer, so CRC32 and ISIZE (RFC 1952 §2.3.1) are
// checked here and a flipped byte never reaches parseUstar. The standard's
// archives are a single gzip member, so the trailer is the last 8 bytes.
// No system tar, no temp files: bytes in, members out.
export function extractTarGz(bytes: Uint8Array): TarMember[] {
  if (bytes.length < 18) throw new Error("gzip: truncated stream");
  const tar = gunzipSync(bytes);
  const trailer = new DataView(bytes.buffer, bytes.byteOffset + bytes.length - 8, 8);
  if (crc32(tar) !== trailer.getUint32(0, true)) throw new Error("gzip: crc mismatch");
  if (tar.length >>> 0 !== trailer.getUint32(4, true)) throw new Error("gzip: size mismatch");
  return parseUstar(tar);
}
```

- [ ] **Step 8: `fs-write.ts` portado más `writeTreeAtomic`**

Portar `writeTextAtomic` y `writeBytesAtomic` y su test desde `forge614-ai/src/infrastructure/fs-write.ts`; añadir:

```ts
import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// Writes every file under tmpDir (created fresh), then renames tmpDir to
// finalDir in one step: a reader never sees a half-written cache entry.
// An existing finalDir is replaced only after the new tree is complete.
export function writeTreeAtomic(finalDir: string, files: ReadonlyMap<string, Uint8Array>, tmpDir: string): void {
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });
  for (const [rel, bytes] of files) {
    const target = join(tmpDir, rel);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes, { mode: 0o644 });
  }
  rmSync(finalDir, { recursive: true, force: true });
  mkdirSync(dirname(finalDir), { recursive: true });
  renameSync(tmpDir, finalDir);
}
```

```ts
// añadir a src/infrastructure/fs-write.test.ts
test("writeTreeAtomic leaves the final dir complete and no temp dir behind", () => {
  dir = mkdtempSync(join(tmpdir(), "fs-write-tree-"));
  const files = new Map<string, Uint8Array>([["a/b.txt", new TextEncoder().encode("b")], ["c.txt", new TextEncoder().encode("c")]]);
  writeTreeAtomic(join(dir, "final"), files, join(dir, "final.tmp"));
  expect(readFileSync(join(dir, "final/a/b.txt"), "utf8")).toBe("b");
  expect(readdirSync(dir)).toEqual(["final"]);
  // replacing an existing tree drops files that are no longer present
  writeTreeAtomic(join(dir, "final"), new Map([["only.txt", new TextEncoder().encode("1")]]), join(dir, "final.tmp"));
  expect(readdirSync(join(dir, "final"))).toEqual(["only.txt"]);
});
```

- [ ] **Step 9: Ejecutar toda la capa**

Run: `bun run typecheck && bun test src/infrastructure`
Expected: verde. En Windows los tests con `bash` y el de enlaces simbólicos se omiten con motivo; el test de `git` corre si `git` existe.

- [ ] **Step 10: Commit (lo hace el propietario)**

```bash
git add src/infrastructure fixtures/standard
git commit -m "feat(infrastructure): árbol por git ls-files o recorrido, hechos de Git, tar.gz con trailer verificado y escritura atómica"
```

---

### Task 6: `infrastructure` y `app`: caché del reglamento, red inyectable y entorno

**Files:**
- Create: `src/infrastructure/cache.ts`, `src/infrastructure/cache.test.ts`
- Create: `src/infrastructure/network.ts`, `src/infrastructure/network.test.ts`
- Create: `src/app/environment.ts`, `src/app/environment.test.ts` (reexporta lo que la CLI necesita del entorno, para que `interfaces` nunca importe `infrastructure`)

**Interfaces:**
- Consumes: `CacheManifestSchema` (Task 2), `compareSemver`, `SEMVER_PATTERN` (Task 1), `TarMember` (Task 4), `writeTextAtomic`, `writeTreeAtomic`, `walkTree` (Task 5).
- Produces:
  ```ts
  // src/infrastructure/cache.ts
  export function cacheRoot(env?: Record<string, string | undefined>): string;   // <FORGE614_HOME|~/.forge614>/standard
  export type ManifestRead = { kind: "missing" } | { kind: "invalid"; error: string } | { kind: "ok"; manifest: CacheManifest };
  export function readCacheManifest(root: string, version: string): ManifestRead;
  export function readCachedFiles(root: string, version: string): ReadonlyMap<string, string>; // text files under <root>/<version>/content
  export function cachedVersions(root: string): string[];                       // sorted semver
  export function writeCacheEntry(root: string, entry: { version: string; sha256: string; members: readonly TarMember[]; fetchedAt: string }): void;
  export function describeCacheLocation(version: string): string;               // "<FORGE614_HOME>/standard/<version>"

  // src/infrastructure/network.ts
  export interface FetchResponse { ok: boolean; status: number; bytes: Uint8Array }
  export type Fetcher = (url: string) => Promise<FetchResponse>;
  export const DEFAULT_RELEASE_BASE = "https://github.com/jotredev/forge614-ai/releases/download";
  export function releaseBaseFromEnv(env?: Record<string, string | undefined>): string;  // FORGE614_SENTINEL_RELEASE_BASE
  export function fetcherFromEnv(env?: Record<string, string | undefined>): Fetcher;     // FORGE614_SENTINEL_OFFLINE=1 → throws; file:// base → disk; else fetch
  export function fileFetcher(): Fetcher; export function httpFetcher(): Fetcher; export function offlineFetcher(): Fetcher;

  // src/app/environment.ts (re-exports only)
  export { cacheRoot, describeCacheLocation } from "../infrastructure/cache";
  export { fetcherFromEnv, releaseBaseFromEnv } from "../infrastructure/network";
  ```

- [ ] **Step 1: Tests de la caché (fallan)**

```ts
// src/infrastructure/cache.test.ts
import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cacheRoot, cachedVersions, readCacheManifest, readCachedFiles, writeCacheEntry } from "./cache";

const SHA = "18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922";
const enc = new TextEncoder();

test("cacheRoot honors FORGE614_HOME and falls back to ~/.forge614", () => {
  expect(cacheRoot({ FORGE614_HOME: "/x/home" })).toBe(join("/x/home", "standard"));
  expect(cacheRoot({ HOME: "/Users/me" })).toBe(join("/Users/me", ".forge614", "standard"));
});

test("writeCacheEntry stores manifest.json and content/ atomically; readers find it", () => {
  const root = mkdtempSync(join(tmpdir(), "sentinel-cache-"));
  writeCacheEntry(root, {
    version: "1.0.0",
    sha256: SHA,
    fetchedAt: "2026-09-23T10:00:00Z",
    members: [
      { path: "VERSION", mode: 0o644, content: enc.encode("1.0.0\n") },
      { path: "rules/", mode: 0o755 },
      { path: "rules/forge614-rule-x/manifest.json", mode: 0o644, content: enc.encode("{}") },
    ],
  });
  expect(readdirSync(root)).toEqual(["1.0.0"]); // no leftover temp dir
  expect(JSON.parse(readFileSync(join(root, "1.0.0/manifest.json"), "utf8"))).toEqual({ schemaVersion: 1, version: "1.0.0", sha256: SHA, fetchedAt: "2026-09-23T10:00:00Z" });
  expect(readCacheManifest(root, "1.0.0")).toEqual({ kind: "ok", manifest: { schemaVersion: 1, version: "1.0.0", sha256: SHA, fetchedAt: "2026-09-23T10:00:00Z" } });
  expect([...readCachedFiles(root, "1.0.0").keys()]).toEqual(["VERSION", "rules/forge614-rule-x/manifest.json"]);
  expect(cachedVersions(root)).toEqual(["1.0.0"]);
});

test("a missing or malformed manifest is reported, never thrown", () => {
  const root = mkdtempSync(join(tmpdir(), "sentinel-cache-"));
  expect(readCacheManifest(root, "9.9.9")).toEqual({ kind: "missing" });
  mkdirSync(join(root, "1.0.0"), { recursive: true });
  writeFileSync(join(root, "1.0.0/manifest.json"), JSON.stringify({ schemaVersion: 1, version: "1.0.0", sha256: "zzz", fetchedAt: "x" }));
  const bad = readCacheManifest(root, "1.0.0");
  expect(bad.kind).toBe("invalid");
  writeFileSync(join(root, "1.0.0/manifest.json"), "{ not json");
  expect(readCacheManifest(root, "1.0.0").kind).toBe("invalid");
});

test("cachedVersions lists only semver folders, sorted numerically", () => {
  const root = mkdtempSync(join(tmpdir(), "sentinel-cache-"));
  for (const d of ["1.10.0", "1.2.0", "tmp-123", "notes.txt"]) mkdirSync(join(root, d), { recursive: true });
  expect(cachedVersions(root)).toEqual(["1.2.0", "1.10.0"]);
});
```

- [ ] **Step 2: Implementar `src/infrastructure/cache.ts`**

```ts
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { CacheManifestSchema, type CacheManifest } from "../modules/schemas/cache-manifest";
import { compareSemver, SEMVER_PATTERN } from "../modules/semver";
import type { TarMember } from "../modules/tar-reader";
import { writeTextAtomic, writeTreeAtomic } from "./fs-write";
import { walkTree } from "./fs-tree";

// <FORGE614_HOME or ~/.forge614>/standard/<version>/{manifest.json, content/…}
// (spec §5.4). The env is a parameter so tests never touch the real home.
export function cacheRoot(env: Record<string, string | undefined> = process.env): string {
  const home = env.FORGE614_HOME !== undefined && env.FORGE614_HOME !== "" ? env.FORGE614_HOME : join(env.HOME ?? homedir(), ".forge614");
  return join(home, "standard");
}

export type ManifestRead = { kind: "missing" } | { kind: "invalid"; error: string } | { kind: "ok"; manifest: CacheManifest };

export function readCacheManifest(root: string, version: string): ManifestRead {
  const path = join(root, version, "manifest.json");
  if (!existsSync(path)) return { kind: "missing" };
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return { kind: "invalid", error: `manifest.json of standard ${version} is not valid JSON: ${error instanceof Error ? error.message : String(error)}` };
  }
  const parsed = CacheManifestSchema.safeParse(raw);
  if (!parsed.success) return { kind: "invalid", error: `manifest.json of standard ${version} does not match CacheManifestSchema` };
  return { kind: "ok", manifest: parsed.data };
}

export function readCachedFiles(root: string, version: string): ReadonlyMap<string, string> {
  return walkTree(join(root, version, "content")).files;
}

export function cachedVersions(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((name) => SEMVER_PATTERN.test(name) && statSync(join(root, name)).isDirectory())
    .sort(compareSemver);
}

export function writeCacheEntry(root: string, entry: { version: string; sha256: string; members: readonly TarMember[]; fetchedAt: string }): void {
  mkdirSync(root, { recursive: true });
  const files = new Map<string, Uint8Array>();
  for (const member of entry.members) if (member.content !== undefined) files.set(join("content", member.path), member.content);
  const manifest: CacheManifest = { schemaVersion: 1, version: entry.version, sha256: entry.sha256, fetchedAt: entry.fetchedAt };
  files.set("manifest.json", new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`));
  writeTreeAtomic(join(root, entry.version), files, join(root, `${entry.version}.tmp-${process.pid}`));
}

// Exposed for standard-fetch's `--json` output of where things landed,
// without leaking absolute paths into error envelopes.
export function describeCacheLocation(version: string): string {
  return `<FORGE614_HOME>/standard/${version}`;
}

export { writeTextAtomic };
```

- [ ] **Step 3: Tests de `network.ts` (fallan)**

```ts
// src/infrastructure/network.test.ts
import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { DEFAULT_RELEASE_BASE, fetcherFromEnv, fileFetcher, releaseBaseFromEnv } from "./network";

test("release base defaults to the forge614-ai releases URL and can be overridden", () => {
  expect(releaseBaseFromEnv({})).toBe(DEFAULT_RELEASE_BASE);
  expect(releaseBaseFromEnv({ FORGE614_SENTINEL_RELEASE_BASE: "file:///tmp/x/" })).toBe("file:///tmp/x");
});

test("fileFetcher serves file:// URLs from disk with ok/status and 404 for a missing file", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sentinel-net-"));
  mkdirSync(join(dir, "standard-v1.0.0"));
  writeFileSync(join(dir, "standard-v1.0.0/SHA256SUMS"), "abc\n");
  const base = pathToFileURL(dir).href;
  const hit = await fileFetcher()(`${base}/standard-v1.0.0/SHA256SUMS`);
  expect(hit).toMatchObject({ ok: true, status: 200 });
  expect(new TextDecoder().decode(hit.bytes)).toBe("abc\n");
  expect(await fileFetcher()(`${base}/standard-v1.0.0/nope`)).toMatchObject({ ok: false, status: 404 });
});

test("FORGE614_SENTINEL_OFFLINE=1 yields a fetcher that rejects like a network failure", async () => {
  await expect(fetcherFromEnv({ FORGE614_SENTINEL_OFFLINE: "1" })("https://x")).rejects.toThrow(/offline/);
});

test("a file:// base selects the file fetcher even without OFFLINE", async () => {
  const fetcher = fetcherFromEnv({ FORGE614_SENTINEL_RELEASE_BASE: "file:///nowhere" });
  expect(await fetcher("file:///nowhere/x")).toMatchObject({ ok: false, status: 404 });
});
```

- [ ] **Step 4: Implementar `src/infrastructure/network.ts`**

```ts
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export interface FetchResponse {
  ok: boolean;
  status: number;
  bytes: Uint8Array;
}

export type Fetcher = (url: string) => Promise<FetchResponse>;

export const DEFAULT_RELEASE_BASE = "https://github.com/jotredev/forge614-ai/releases/download";

// Test and CI seam: a file:// base serves a release layout from disk
// (fixtures/standard/), and OFFLINE simulates a machine without network.
// Neither changes what Sentinel verifies: sha256 checks run the same way.
export function releaseBaseFromEnv(env: Record<string, string | undefined> = process.env): string {
  const base = env.FORGE614_SENTINEL_RELEASE_BASE;
  return base !== undefined && base !== "" ? base.replace(/\/+$/, "") : DEFAULT_RELEASE_BASE;
}

export function httpFetcher(): Fetcher {
  return async (url) => {
    const response = await fetch(url, { redirect: "follow" });
    return { ok: response.ok, status: response.status, bytes: new Uint8Array(await response.arrayBuffer()) };
  };
}

export function fileFetcher(): Fetcher {
  return async (url) => {
    const path = fileURLToPath(url);
    if (!existsSync(path)) return { ok: false, status: 404, bytes: new Uint8Array() };
    return { ok: true, status: 200, bytes: new Uint8Array(readFileSync(path)) };
  };
}

export function offlineFetcher(): Fetcher {
  return async () => {
    throw new Error("offline: network disabled by FORGE614_SENTINEL_OFFLINE");
  };
}

export function fetcherFromEnv(env: Record<string, string | undefined> = process.env): Fetcher {
  if (env.FORGE614_SENTINEL_OFFLINE === "1") return offlineFetcher();
  if (releaseBaseFromEnv(env).startsWith("file://")) return fileFetcher();
  return httpFetcher();
}
```

- [ ] **Step 5: `src/app/environment.ts` con test**

Las CLIs (Task 22 y Task 23) leen la caché y la red a partir de variables de entorno. La prueba de capas prohíbe `interfaces → infrastructure`, así que `app` reexporta esas cuatro funciones, igual que `run-command.ts` reexporta `run`:

```ts
// src/app/environment.ts
// The CLIs resolve the cache root and the network from the process
// environment through app, never by importing infrastructure directly
// (layer rule interfaces → app). Same pattern as run-command.ts.
export { cacheRoot, describeCacheLocation } from "../infrastructure/cache";
export { fetcherFromEnv, releaseBaseFromEnv } from "../infrastructure/network";
```

```ts
// src/app/environment.test.ts
import { expect, test } from "bun:test";
import { join } from "node:path";
import { cacheRoot, describeCacheLocation, fetcherFromEnv, releaseBaseFromEnv } from "./environment";

test("re-exports the environment readers the CLIs need", async () => {
  expect(cacheRoot({ FORGE614_HOME: "/x/home" })).toBe(join("/x/home", "standard"));
  expect(describeCacheLocation("1.0.0")).toBe("<FORGE614_HOME>/standard/1.0.0");
  expect(releaseBaseFromEnv({})).toBe("https://github.com/jotredev/forge614-ai/releases/download");
  await expect(fetcherFromEnv({ FORGE614_SENTINEL_OFFLINE: "1" })("https://x")).rejects.toThrow(/offline/);
});
```

- [ ] **Step 6: Ejecutar**

Run: `bun run typecheck && bun test src/infrastructure/cache.test.ts src/infrastructure/network.test.ts src/app/environment.test.ts tests/architecture`
Expected: 4 + 4 + 1 pass, y la prueba de capas acepta `app/environment.ts → infrastructure`. Ninguno toca `~/.forge614` (todos pasan un `cacheRoot` o un `env` explícitos).

- [ ] **Step 7: Commit (lo hace el propietario)**

```bash
git add src/infrastructure/cache.ts src/infrastructure/cache.test.ts src/infrastructure/network.ts src/infrastructure/network.test.ts src/app/environment.ts src/app/environment.test.ts
git commit -m "feat(infrastructure): caché del reglamento con escritura atómica, red inyectable y entorno reexportado por app"
```

---

### Task 7: `modules` y `app`: `StandardSource`, `loadStandard` (caché verificada) y `fetchStandard` (descarga con `fetch` inyectable)

**Files:**
- Create: `src/modules/standard-source.ts`, `src/modules/standard-source.test.ts`
- Create: `src/app/load-standard.ts`, `src/app/load-standard.test.ts`
- Create: `src/app/fetch-standard.ts`, `src/app/fetch-standard.test.ts`

**Interfaces:**
- Consumes: `SemVer`, `Sha256`, `parseSha256Sums` (Task 2), `highestSemver` (Task 1), `extractTarGz`, `sha256Hex` (Task 1 y Task 5), `readCacheManifest`, `readCachedFiles`, `cachedVersions`, `writeCacheEntry`, `Fetcher` (Task 6).
- Produces:
  ```ts
  // src/modules/standard-source.ts (spec §5.2)
  export const STANDARD_REPOSITORY = "jotredev/forge614-ai";
  export const StandardSourceSchema: z.ZodType<StandardSource>;
  export interface StandardSource { kind: "github-release"; repository: string; version: string; sha256?: string } // sha256 absent only for a forced version
  export function standardSource(version: string, sha256?: string): StandardSource;

  // src/app/load-standard.ts
  export interface LoadedStandard { version: string; sha256: string; files: ReadonlyMap<string, string>; latestKnown: string }
  export type LoadStandardResult =
    | { ok: true; standard: LoadedStandard }
    | { ok: false; code: "STANDARD_UNAVAILABLE" | "STANDARD_CORRUPT"; error: string };
  export function fetchHint(version: string): string; // "run: forge614-sentinel standard fetch <version>"
  export function loadStandard(options: { version: string; expectedSha256?: string; cacheRoot: string }): LoadStandardResult;

  // src/app/fetch-standard.ts
  export type FetchStandardResult =
    | { ok: true; version: string; sha256: string; alreadyCached: boolean }
    | { ok: false; reason: "network" | "http" | "corrupt"; error: string };
  export function fetchStandard(options: { source: StandardSource; cacheRoot: string; fetcher: Fetcher; releaseBase: string; now?: () => Date }): Promise<FetchStandardResult>;
  ```

- [ ] **Step 1: `StandardSource` con test**

```ts
// src/modules/standard-source.ts
import { z } from "zod";
import { SemVer, Sha256 } from "./schemas/common";

// spec §5.2: where a standard comes from, as data. In 0.1 the only kind is a
// GitHub release of jotredev/forge614-ai; the version and the fingerprint
// come from the inspected repository's pointer. A version forced with
// --standard has no expected fingerprint, so sha256 is optional.
export const STANDARD_REPOSITORY = "jotredev/forge614-ai";

export const StandardSourceSchema = z
  .object({
    kind: z.literal("github-release"),
    repository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "owner/name"),
    version: SemVer,
    sha256: Sha256.optional(),
  })
  .strict();
export type StandardSource = z.infer<typeof StandardSourceSchema>;

export function standardSource(version: string, sha256?: string): StandardSource {
  const base = { kind: "github-release" as const, repository: STANDARD_REPOSITORY, version };
  return sha256 === undefined ? base : { ...base, sha256 };
}
```

```ts
// src/modules/standard-source.test.ts
import { expect, test } from "bun:test";
import { STANDARD_REPOSITORY, StandardSourceSchema, standardSource } from "./standard-source";

const SHA = "18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922";

test("standardSource builds the spec §5.2 shape, with or without a fingerprint", () => {
  expect(standardSource("1.0.0", SHA)).toEqual({ kind: "github-release", repository: STANDARD_REPOSITORY, version: "1.0.0", sha256: SHA });
  expect(standardSource("1.1.0")).toEqual({ kind: "github-release", repository: "jotredev/forge614-ai", version: "1.1.0" });
  expect("sha256" in standardSource("1.1.0")).toBe(false);
});

test("the schema is strict and validates version and fingerprint", () => {
  expect(StandardSourceSchema.safeParse(standardSource("1.0.0", SHA)).success).toBe(true);
  expect(StandardSourceSchema.safeParse({ ...standardSource("1.0.0"), kind: "url" }).success).toBe(false);
  expect(StandardSourceSchema.safeParse({ ...standardSource("1.0.0"), extra: 1 }).success).toBe(false);
  expect(StandardSourceSchema.safeParse(standardSource("v1", SHA)).success).toBe(false);
  expect(StandardSourceSchema.safeParse(standardSource("1.0.0", "abc")).success).toBe(false);
});
```

- [ ] **Step 2: Tests de `loadStandard` (fallan)**

```ts
// src/app/load-standard.test.ts
import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeCacheEntry } from "../infrastructure/cache";
import { loadStandard } from "./load-standard";

const SHA = "18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922";
const OTHER = "0".repeat(64);
const enc = new TextEncoder();

function seeded(version = "1.0.0", sha256 = SHA): string {
  const root = mkdtempSync(join(tmpdir(), "sentinel-load-"));
  writeCacheEntry(root, { version, sha256, fetchedAt: "2026-09-23T10:00:00Z", members: [{ path: "VERSION", mode: 0o644, content: enc.encode(`${version}\n`) }] });
  return root;
}

test("loads a cached version whose manifest sha256 matches the expected one", () => {
  const r = loadStandard({ version: "1.0.0", expectedSha256: SHA, cacheRoot: seeded() });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.standard).toMatchObject({ version: "1.0.0", sha256: SHA, latestKnown: "1.0.0" });
  expect(r.standard.files.get("VERSION")).toBe("1.0.0\n");
});

test("a missing cache is STANDARD_UNAVAILABLE with the fetch command in the message", () => {
  const r = loadStandard({ version: "1.0.0", expectedSha256: SHA, cacheRoot: mkdtempSync(join(tmpdir(), "sentinel-load-")) });
  expect(r).toMatchObject({ ok: false, code: "STANDARD_UNAVAILABLE" });
  if (r.ok) return;
  expect(r.error).toContain("forge614-sentinel standard fetch 1.0.0");
});

test("a cached manifest with a different sha256 than expected is STANDARD_CORRUPT and nothing is loaded", () => {
  const r = loadStandard({ version: "1.0.0", expectedSha256: OTHER, cacheRoot: seeded() });
  expect(r).toMatchObject({ ok: false, code: "STANDARD_CORRUPT" });
});

test("an invalid manifest is STANDARD_CORRUPT", () => {
  const root = mkdtempSync(join(tmpdir(), "sentinel-load-"));
  mkdirSync(join(root, "1.0.0/content"), { recursive: true });
  writeFileSync(join(root, "1.0.0/manifest.json"), "{}");
  expect(loadStandard({ version: "1.0.0", cacheRoot: root })).toMatchObject({ ok: false, code: "STANDARD_CORRUPT" });
});

test("without an expected sha256 (forced version) the cached fingerprint is trusted, and latestKnown is the highest cached", () => {
  const root = seeded("1.0.0", SHA);
  writeCacheEntry(root, { version: "1.1.0", sha256: OTHER, fetchedAt: "2026-09-23T10:00:00Z", members: [] });
  const r = loadStandard({ version: "1.0.0", cacheRoot: root });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.standard.sha256).toBe(SHA);
  expect(r.standard.latestKnown).toBe("1.1.0");
});
```

- [ ] **Step 3: Implementar `src/app/load-standard.ts`**

```ts
import { cachedVersions, readCacheManifest, readCachedFiles } from "../infrastructure/cache";
import { highestSemver } from "../modules/semver";

export interface LoadedStandard {
  version: string;
  sha256: string;
  files: ReadonlyMap<string, string>;
  latestKnown: string;
}

export type LoadStandardResult =
  | { ok: true; standard: LoadedStandard }
  | { ok: false; code: "STANDARD_UNAVAILABLE" | "STANDARD_CORRUPT"; error: string };

export function fetchHint(version: string): string {
  return `run: forge614-sentinel standard fetch ${version}`;
}

// Reads the requested version from the local cache and nothing else (spec
// §5.5): no network here, never another version "by approximation". The
// expected sha256 comes from the inspected repository's pointer; when the
// version was forced there is none and the manifest's own fingerprint (which
// fetchStandard verified against SHA256SUMS) is reported.
export function loadStandard(options: { version: string; expectedSha256?: string; cacheRoot: string }): LoadStandardResult {
  const read = readCacheManifest(options.cacheRoot, options.version);
  if (read.kind === "missing") {
    return { ok: false, code: "STANDARD_UNAVAILABLE", error: `standard ${options.version} is not in the local cache; ${fetchHint(options.version)}` };
  }
  if (read.kind === "invalid") return { ok: false, code: "STANDARD_CORRUPT", error: read.error };
  if (options.expectedSha256 !== undefined && read.manifest.sha256 !== options.expectedSha256) {
    return {
      ok: false,
      code: "STANDARD_CORRUPT",
      error: `cached standard ${options.version} has sha256 ${read.manifest.sha256} but the repository declares ${options.expectedSha256}; remove the cache entry and ${fetchHint(options.version)}`,
    };
  }
  const files = readCachedFiles(options.cacheRoot, options.version);
  const latestKnown = highestSemver([...cachedVersions(options.cacheRoot), options.version]) ?? options.version;
  return { ok: true, standard: { version: options.version, sha256: read.manifest.sha256, files, latestKnown } };
}
```

- [ ] **Step 4: Tests de `fetchStandard` (fallan)**

```ts
// src/app/fetch-standard.test.ts
import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readCacheManifest, writeCacheEntry } from "../infrastructure/cache";
import { fileFetcher, offlineFetcher, type Fetcher } from "../infrastructure/network";
import { standardSource } from "../modules/standard-source";
import { fetchStandard } from "./fetch-standard";
import { loadStandard } from "./load-standard";

const FIXTURES = resolve(import.meta.dir, "../../fixtures/standard");
const BASE = pathToFileURL(FIXTURES).href;
const SHA = "18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922";
const OTHER = "0".repeat(64);
const now = () => new Date("2026-09-23T10:00:00Z");

function root(): string {
  return mkdtempSync(join(tmpdir(), "sentinel-fetch-"));
}

test("downloads SHA256SUMS and the archive from <base>/standard-v<version>/, verifies and extracts atomically", async () => {
  const cacheRoot = root();
  const r = await fetchStandard({ source: standardSource("1.0.0", SHA), cacheRoot, fetcher: fileFetcher(), releaseBase: BASE, now });
  expect(r).toEqual({ ok: true, version: "1.0.0", sha256: SHA, alreadyCached: false });
  expect(readCacheManifest(cacheRoot, "1.0.0")).toMatchObject({ kind: "ok", manifest: { sha256: SHA, fetchedAt: "2026-09-23T10:00:00.000Z" } });
  expect(readFileSync(join(cacheRoot, "1.0.0/content/VERSION"), "utf8")).toBe("1.0.0\n");
  expect(readdirSync(cacheRoot)).toEqual(["1.0.0"]);
});

test("a version already cached is not downloaded again", async () => {
  const cacheRoot = root();
  await fetchStandard({ source: standardSource("1.0.0"), cacheRoot, fetcher: fileFetcher(), releaseBase: BASE, now });
  let calls = 0;
  const counting: Fetcher = async (url) => {
    calls += 1;
    return fileFetcher()(url);
  };
  const r = await fetchStandard({ source: standardSource("1.0.0"), cacheRoot, fetcher: counting, releaseBase: BASE, now });
  expect(r).toMatchObject({ ok: true, alreadyCached: true });
  expect(calls).toBe(0);
});

test("a network failure is reason 'network' and leaves no cache entry", async () => {
  const cacheRoot = root();
  const r = await fetchStandard({ source: standardSource("1.0.0"), cacheRoot, fetcher: offlineFetcher(), releaseBase: BASE, now });
  expect(r).toMatchObject({ ok: false, reason: "network" });
  expect(readdirSync(cacheRoot)).toEqual([]);
});

test("an HTTP error (unknown version) is reason 'http'", async () => {
  const r = await fetchStandard({ source: standardSource("9.9.9"), cacheRoot: root(), fetcher: fileFetcher(), releaseBase: BASE, now });
  expect(r).toMatchObject({ ok: false, reason: "http" });
  if (r.ok) return;
  expect(r.error).toContain("404");
});

test("a SHA256SUMS that disagrees with the repository's declared sha256 is 'corrupt' before downloading the archive", async () => {
  let archiveRequested = false;
  const fetcher: Fetcher = async (url) => {
    if (url.endsWith(".tar.gz")) archiveRequested = true;
    return fileFetcher()(url);
  };
  const r = await fetchStandard({ source: standardSource("1.0.0", OTHER), cacheRoot: root(), fetcher, releaseBase: BASE, now });
  expect(r).toMatchObject({ ok: false, reason: "corrupt" });
  expect(archiveRequested).toBe(false);
});

test("an archive whose bytes do not match SHA256SUMS is 'corrupt' and nothing is written", async () => {
  const cacheRoot = root();
  const fetcher: Fetcher = async (url) => {
    const real = await fileFetcher()(url);
    if (!url.endsWith(".tar.gz")) return real;
    const bytes = new Uint8Array(real.bytes);
    const i = bytes.length - 1;
    bytes[i] = (bytes[i] ?? 0) ^ 0x01;
    return { ...real, bytes };
  };
  const r = await fetchStandard({ source: standardSource("1.0.0", SHA), cacheRoot, fetcher, releaseBase: BASE, now });
  expect(r).toMatchObject({ ok: false, reason: "corrupt" });
  expect(readdirSync(cacheRoot)).toEqual([]);
});

test("no cache and no network never falls back to another cached version", async () => {
  const cacheRoot = root();
  writeCacheEntry(cacheRoot, { version: "1.1.0", sha256: OTHER, fetchedAt: "2026-09-23T10:00:00Z", members: [] });
  const fetched = await fetchStandard({ source: standardSource("1.0.0", SHA), cacheRoot, fetcher: offlineFetcher(), releaseBase: BASE, now });
  expect(fetched).toMatchObject({ ok: false, reason: "network" });
  const loaded = loadStandard({ version: "1.0.0", expectedSha256: SHA, cacheRoot });
  expect(loaded).toMatchObject({ ok: false, code: "STANDARD_UNAVAILABLE" });
  if (loaded.ok) return;
  expect(loaded.error).toContain("forge614-sentinel standard fetch 1.0.0");
  expect(readdirSync(cacheRoot)).toEqual(["1.1.0"]);
});
```

- [ ] **Step 5: Implementar `src/app/fetch-standard.ts`**

```ts
import { extractTarGz } from "../infrastructure/archive";
import { readCacheManifest, writeCacheEntry } from "../infrastructure/cache";
import { sha256Hex } from "../infrastructure/hashing";
import type { Fetcher } from "../infrastructure/network";
import { parseSha256Sums } from "../modules/schemas/sha256sums";
import type { StandardSource } from "../modules/standard-source";
import type { TarMember } from "../modules/tar-reader";

export type FetchStandardResult =
  | { ok: true; version: string; sha256: string; alreadyCached: boolean }
  | { ok: false; reason: "network" | "http" | "corrupt"; error: string };

export interface FetchStandardOptions {
  source: StandardSource;
  cacheRoot: string;
  fetcher: Fetcher;
  releaseBase: string;
  now?: () => Date;
}

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

// Order matters (spec §5.4): SHA256SUMS first, compared with what the
// repository declares (a disagreement means the release changed or the
// pointer was edited by hand, and there is no point downloading), then the
// archive, whose bytes must hash to the listed value before anything is
// written. The cache entry appears in one rename or not at all.
export async function fetchStandard(options: FetchStandardOptions): Promise<FetchStandardResult> {
  const { version } = options.source;
  const expectedSha256 = options.source.sha256;
  const existing = readCacheManifest(options.cacheRoot, version);
  if (existing.kind === "ok" && (expectedSha256 === undefined || existing.manifest.sha256 === expectedSha256)) {
    return { ok: true, version, sha256: existing.manifest.sha256, alreadyCached: true };
  }

  const base = `${options.releaseBase}/standard-v${version}`;
  const archiveName = `standard-${version}.tar.gz`;
  const get = async (name: string): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; result: FetchStandardResult }> => {
    let response: Awaited<ReturnType<Fetcher>>;
    try {
      response = await options.fetcher(`${base}/${name}`);
    } catch (error) {
      return { ok: false, result: { ok: false, reason: "network", error: `could not download ${name} for standard ${version}: ${error instanceof Error ? error.message : String(error)}` } };
    }
    if (!response.ok) return { ok: false, result: { ok: false, reason: "http", error: `release standard-v${version} did not serve ${name} (HTTP ${response.status})` } };
    return { ok: true, bytes: response.bytes };
  };

  const sums = await get("SHA256SUMS");
  if (!sums.ok) return sums.result;
  const listed = parseSha256Sums(decode(sums.bytes))?.find((e) => e.file === archiveName);
  if (listed === undefined) return { ok: false, reason: "corrupt", error: `SHA256SUMS of release standard-v${version} does not list ${archiveName}` };
  if (expectedSha256 !== undefined && listed.sha256 !== expectedSha256) {
    return { ok: false, reason: "corrupt", error: `release standard-v${version} of ${options.source.repository} publishes sha256 ${listed.sha256} but the repository declares ${expectedSha256}` };
  }

  const archive = await get(archiveName);
  if (!archive.ok) return archive.result;
  const actual = sha256Hex(archive.bytes);
  if (actual !== listed.sha256) return { ok: false, reason: "corrupt", error: `${archiveName} hashes to ${actual}, SHA256SUMS says ${listed.sha256}` };

  let members: TarMember[];
  try {
    members = extractTarGz(archive.bytes);
  } catch (error) {
    return { ok: false, reason: "corrupt", error: `${archiveName} could not be extracted: ${error instanceof Error ? error.message : String(error)}` };
  }
  writeCacheEntry(options.cacheRoot, { version, sha256: actual, members, fetchedAt: (options.now ?? (() => new Date()))().toISOString() });
  return { ok: true, version, sha256: actual, alreadyCached: false };
}
```

- [ ] **Step 6: Ejecutar**

Run: `bun run typecheck && bun test src/modules/standard-source.test.ts src/app/load-standard.test.ts src/app/fetch-standard.test.ts`
Expected: 2 + 5 + 7 pass. Ninguno toca `~/.forge614` (todos pasan `cacheRoot` temporal).

- [ ] **Step 7: Commit (lo hace el propietario)**

```bash
git add src/modules/standard-source.ts src/modules/standard-source.test.ts src/app/load-standard.ts src/app/load-standard.test.ts src/app/fetch-standard.ts src/app/fetch-standard.test.ts
git commit -m "feat(app): origen del reglamento como dato, caché verificada y descarga desde la release con fetch inyectable"
```

---

### Task 8: `app`: clasificación del repositorio, snapshot y construcción de `CheckParams` desde el reglamento

**Files:**
- Create: `src/app/classify-repository.ts`, `src/app/classify-repository.test.ts`
- Create: `src/app/take-snapshot.ts`, `src/app/take-snapshot.test.ts`
- Create: `src/app/build-check-params.ts`, `src/app/build-check-params.test.ts`

**Interfaces:**
- Consumes: `NodePointerSchema`, `PackSchema`, `RuleManifestSchema`, `ForbiddenMentionsSchema` (Task 2); `CheckParams`, `LayoutSpec`, `StackSpec`, `SecretsSpec` (Task 3); `walkTree`, `readListedFiles`, `readGitFacts` (Task 5); `LoadedStandard`, `fetchStandard`, `standardSource` (Task 7); `parse` de `yaml`.
- Produces:
  ```ts
  // src/app/classify-repository.ts
  export type Classification =
    | { kind: "node"; pointer: NodePointer }
    | { kind: "external-project" }
    | { kind: "not-a-forge614-repo" }
    | { kind: "invalid-pointer"; error: string };
  export function classifyRepository(root: string): Classification;   // two existsSync + one strict parse; never walks the tree
  // src/app/take-snapshot.ts
  export function takeSnapshot(root: string): RepoSnapshot;
  // src/app/build-check-params.ts
  export const BUILTIN_LAYOUT: LayoutSpec; export const BUILTIN_STACK: StackSpec; export const BUILTIN_SECRETS: SecretsSpec;
  export const LEGACY_VALIDATOR_IDS: Readonly<Record<string, string>>; // { "bilingual-docs": "docs-parity", "decision-records": "decisions" }
  export const BUILTIN_ALLOWED_EXTRA_JOBS: readonly string[];           // ["parity"]
  export type BuildParamsResult = { ok: true; params: CheckParams } | { ok: false; code: "STANDARD_CORRUPT"; error: string };
  export function buildCheckParams(options: { standard: LoadedStandard; pointer: NodePointer; pointerVersionSha256: string | undefined; today: string; sentinelVersion: string; knownCheckIds: readonly string[] }): BuildParamsResult;
  ```

- [ ] **Step 1: Tests de clasificación (fallan)**

```ts
// src/app/classify-repository.test.ts
import { expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classifyRepository } from "./classify-repository";

const SHA = "18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922";
const pointer = { schemaVersion: 1, node: "demo", kind: "product", standard: { version: "1.0.0", sha256: SHA }, ecosystem: "forge614" };

function folder(): string {
  return mkdtempSync(join(tmpdir(), "sentinel-classify-"));
}

test("a valid forge614.node.json makes a node, regardless of folder name or remotes", () => {
  const root = folder();
  writeFileSync(join(root, "forge614.node.json"), JSON.stringify(pointer));
  expect(classifyRepository(root)).toEqual({ kind: "node", pointer });
});

test(".forge614/project.json without a pointer is an external project", () => {
  const root = folder();
  mkdirSync(join(root, ".forge614"));
  writeFileSync(join(root, ".forge614/project.json"), "{}");
  expect(classifyRepository(root)).toEqual({ kind: "external-project" });
});

// The folder holds a subfolder without read permission: any walk of the
// tree would throw EACCES, so a clean answer proves classification never
// lists the folder. POSIX permissions only, hence the Windows skip.
test.skipIf(process.platform === "win32")("neither identity file is not a forge614 repo, and the tree is not read", () => {
  const root = folder();
  const locked = join(root, "huge");
  mkdirSync(locked);
  writeFileSync(join(locked, "x.md"), "x");
  chmodSync(locked, 0o000);
  try {
    expect(() => readdirSync(locked)).toThrow();
    expect(classifyRepository(root)).toEqual({ kind: "not-a-forge614-repo" });
  } finally {
    chmodSync(locked, 0o755);
  }
});

test("a pointer that fails NodePointerSchema is invalid-pointer with the issues, never a throw", () => {
  const root = folder();
  writeFileSync(join(root, "forge614.node.json"), JSON.stringify({ ...pointer, kind: "tool", extra: 1 }));
  const r = classifyRepository(root);
  expect(r.kind).toBe("invalid-pointer");
  if (r.kind !== "invalid-pointer") return;
  expect(r.error).toContain("kind");
  writeFileSync(join(root, "forge614.node.json"), "{ not json");
  expect(classifyRepository(root).kind).toBe("invalid-pointer");
});

test("the pointer wins over .forge614/project.json when both exist", () => {
  const root = folder();
  mkdirSync(join(root, ".forge614"));
  writeFileSync(join(root, ".forge614/project.json"), "{}");
  writeFileSync(join(root, "forge614.node.json"), JSON.stringify(pointer));
  expect(classifyRepository(root).kind).toBe("node");
});
```

- [ ] **Step 2: Implementar `src/app/classify-repository.ts`**

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NodePointerSchema, type NodePointer } from "../modules/schemas/node-pointer";

export type Classification =
  | { kind: "node"; pointer: NodePointer }
  | { kind: "external-project" }
  | { kind: "not-a-forge614-repo" }
  | { kind: "invalid-pointer"; error: string };

function issuesOf(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): string {
  return error.issues.map((i) => (i.path.length > 0 ? `${i.path.map(String).join(".")}: ${i.message}` : i.message)).join("; ");
}

// Identity files only (acta 0023, spec §4): never the folder name, never
// git remotes, never what is next to it on disk. Two existence checks and
// one strict parse: a foreign folder is answered without reading its tree.
export function classifyRepository(root: string): Classification {
  const pointerPath = join(root, "forge614.node.json");
  if (existsSync(pointerPath)) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(pointerPath, "utf8"));
    } catch (error) {
      return { kind: "invalid-pointer", error: `forge614.node.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}` };
    }
    const parsed = NodePointerSchema.safeParse(raw);
    if (!parsed.success) return { kind: "invalid-pointer", error: `forge614.node.json does not match NodePointerSchema: ${issuesOf(parsed.error)}` };
    return { kind: "node", pointer: parsed.data };
  }
  if (existsSync(join(root, ".forge614", "project.json"))) return { kind: "external-project" };
  return { kind: "not-a-forge614-repo" };
}
```

- [ ] **Step 3: `takeSnapshot` con test**

```ts
// src/app/take-snapshot.test.ts
import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../infrastructure/process";
import { takeSnapshot } from "./take-snapshot";

const hasGit = Bun.which("git") !== null;

test("without git: walks the disk, facts are empty", () => {
  const root = mkdtempSync(join(tmpdir(), "sentinel-snap-"));
  mkdirSync(join(root, "node_modules/x"), { recursive: true });
  writeFileSync(join(root, "node_modules/x/a.md"), "no");
  writeFileSync(join(root, "a.md"), "a\r\n");
  const s = takeSnapshot(root);
  expect([...s.files.entries()]).toEqual([["a.md", "a\n"]]);
  expect(s.facts.gitAvailable).toBe(false);
});

test.skipIf(!hasGit)("with git: honors .gitignore and reports executables and tags", () => {
  const root = mkdtempSync(join(tmpdir(), "sentinel-snap-git-"));
  const env = { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@x", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@x" };
  run(["git", "init", "-q", "-b", "main"], { cwd: root });
  writeFileSync(join(root, ".gitignore"), "ignored.md\n");
  writeFileSync(join(root, "ignored.md"), "x");
  writeFileSync(join(root, "run.sh"), "#!/bin/sh\n");
  writeFileSync(join(root, "README.md"), "# r\n");
  run(["git", "add", "."], { cwd: root });
  run(["git", "update-index", "--chmod=+x", "run.sh"], { cwd: root });
  run(["git", "commit", "-q", "-m", "init"], { cwd: root, env });
  run(["git", "tag", "v0.1.0"], { cwd: root });
  const s = takeSnapshot(root);
  expect([...s.files.keys()]).toEqual([".gitignore", "README.md", "run.sh"]);
  expect(s.facts).toMatchObject({ gitAvailable: true, gitTags: ["v0.1.0"], executablePaths: ["run.sh"] });
});
```

```ts
// src/app/take-snapshot.ts
import { readListedFiles, walkTree } from "../infrastructure/fs-tree";
import { readGitFacts } from "../infrastructure/git";
import type { RepoSnapshot } from "../modules/snapshot";

// One snapshot per run (spec §13): the tree is read once and every check
// works on the same picture. A git checkout is listed by git (so ignored
// files, symlinks and submodules stay out); anything else is walked.
export function takeSnapshot(root: string): RepoSnapshot {
  const git = readGitFacts(root);
  const tree = git.listing === undefined ? walkTree(root) : readListedFiles(root, git.listing);
  return {
    files: tree.files,
    facts: {
      gitAvailable: git.available,
      gitTags: git.tags,
      gitLogSubjects: git.logSubjects,
      executablePaths: git.executablePaths,
      skippedLargeFiles: tree.skippedLargeFiles,
    },
  };
}
```

- [ ] **Step 4: Tests de `buildCheckParams` (fallan)**

```ts
// src/app/build-check-params.test.ts
import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileFetcher } from "../infrastructure/network";
import { standardSource } from "../modules/standard-source";
import { buildCheckParams, BUILTIN_ALLOWED_EXTRA_JOBS, BUILTIN_LAYOUT, LEGACY_VALIDATOR_IDS } from "./build-check-params";
import { fetchStandard } from "./fetch-standard";
import { loadStandard, type LoadedStandard } from "./load-standard";

const SHA = "18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922";
const pointer = { schemaVersion: 1 as const, node: "demo", kind: "product" as const, standard: { version: "1.0.0", sha256: SHA } };
const BASE = pathToFileURL(resolve(import.meta.dir, "../../fixtures/standard")).href;

async function realStandard(): Promise<LoadedStandard> {
  const cacheRoot = mkdtempSync(join(tmpdir(), "sentinel-params-"));
  await fetchStandard({ source: standardSource("1.0.0"), cacheRoot, fetcher: fileFetcher(), releaseBase: BASE });
  const r = loadStandard({ version: "1.0.0", expectedSha256: SHA, cacheRoot });
  if (!r.ok) throw new Error(r.error);
  return r.standard;
}

const common = { pointer, pointerVersionSha256: SHA, today: "2026-09-23", sentinelVersion: "0.1.0", knownCheckIds: ["package-naming"] };

test("builds every parameter from the real standard 1.0.0", async () => {
  const r = buildCheckParams({ ...common, standard: await realStandard() });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  const p = r.params;
  expect(p.pack.name).toBe("forge614-pack-ecosystem-node");
  expect(p.pack.rules).toHaveLength(16);
  expect(p.manifests.size).toBe(16);
  expect(p.manifests.get("forge614-rule-bilingual-docs")?.validator).toBe("bilingual-docs");
  expect(p.forbiddenMentions.terms.length).toBeGreaterThan(0);
  expect(p.forbiddenMentions.excludePaths).toContain(".superpowers/");
  expect([...p.templates.keys()].sort()).toEqual(expect.arrayContaining(["install.sh", "install.ps1", "verify.yml", "release.yml", "CONTRACT.md", "hooks/pre-push"]));
  expect(p.ecosystemContract.length).toBeGreaterThan(1000);
  expect(p.layout).toEqual(BUILTIN_LAYOUT);
  expect(p.stack.source).toBe("builtin");
  expect(p.secrets.source).toBe("builtin");
  expect(p.standard).toEqual({ version: "1.0.0", sha256: SHA, pointerVersionSha256: SHA });
  expect(p.legacyValidatorIds).toEqual(LEGACY_VALIDATOR_IDS);
  expect(p.allowedExtraJobs).toEqual(BUILTIN_ALLOWED_EXTRA_JOBS);
  expect(BUILTIN_ALLOWED_EXTRA_JOBS).toEqual(["parity"]);
  expect(p.parseYaml("a: 1")).toEqual({ a: 1 });
});

test("standard/layout.json, stack.json and secret-patterns.json override the builtin defaults when the standard ships them (1.1.0)", async () => {
  const base = await realStandard();
  const files = new Map(base.files);
  files.set("layout.json", JSON.stringify({ schemaVersion: 1, directories: ["src"], files: ["README.md"] }));
  files.set("stack.json", JSON.stringify({ schemaVersion: 1, tsconfigFlags: ["strict"], minimumBun: "1.4.2" }));
  files.set("secret-patterns.json", JSON.stringify({ schemaVersion: 1, patterns: [{ id: "x", pattern: "XSECRET[0-9]+" }], excludePaths: ["fixtures/"] }));
  const r = buildCheckParams({ ...common, standard: { ...base, files } });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.params.layout).toEqual({ directories: ["src"], files: ["README.md"], source: "standard/layout.json" });
  expect(r.params.stack).toEqual({ tsconfigFlags: ["strict"], minimumBun: "1.4.2", source: "standard/stack.json" });
  expect(r.params.secrets.patterns).toEqual([{ id: "x", pattern: "XSECRET[0-9]+" }]);
});

test("a standard whose pack.json or a manifest is invalid is STANDARD_CORRUPT (its sha256 passed, so the release itself is broken)", async () => {
  const base = await realStandard();
  const files = new Map(base.files);
  files.set("packs/forge614-pack-ecosystem-node/pack.json", "{ not json");
  const r = buildCheckParams({ ...common, standard: { ...base, files } });
  expect(r).toMatchObject({ ok: false, code: "STANDARD_CORRUPT" });
  const files2 = new Map(base.files);
  files2.set("rules/forge614-rule-package-naming/manifest.json", JSON.stringify({ schemaVersion: 1 }));
  expect(buildCheckParams({ ...common, standard: { ...base, files: files2 } })).toMatchObject({ ok: false, code: "STANDARD_CORRUPT" });
});
```

- [ ] **Step 5: Implementar `src/app/build-check-params.ts`**

```ts
import { z } from "zod";
import { parse as parseYaml } from "yaml";
import type { CheckParams, LayoutSpec, SecretsSpec, StackSpec } from "../modules/check-params";
import { ForbiddenMentionsSchema } from "../modules/schemas/forbidden-mentions";
import type { NodePointer } from "../modules/schemas/node-pointer";
import { PackSchema } from "../modules/schemas/pack";
import { RuleManifestSchema, type RuleManifest } from "../modules/schemas/rule-manifest";
import type { LoadedStandard } from "./load-standard";

// Standard 1.0.0 does not ship these three data files; they arrive in
// 1.1.0 as layout.json, stack.json and secret-patterns.json (spec §8.2,
// §9.2). Until then the lists are builtin: they live here and every check
// that uses them says `source: builtin` in its evidence, so a report never
// hides which list judged the repository.
export const BUILTIN_LAYOUT: LayoutSpec = {
  directories: ["src/modules", "src/app", "src/infrastructure", "src/interfaces", "docs/es", "docs/en", "docs/decisions", ".github/workflows"],
  files: ["CONTRACT.md", "README.md", ".githooks/pre-push", ".agents/templates/plan.md"],
  source: "builtin",
};

export const BUILTIN_STACK: StackSpec = {
  tsconfigFlags: ["strict", "noUncheckedIndexedAccess", "exactOptionalPropertyTypes"],
  minimumBun: "1.3.9", // acta 0026
  source: "builtin",
};

export const BUILTIN_SECRETS: SecretsSpec = {
  patterns: [
    { id: "private-key", pattern: "-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----" },
    { id: "aws-access-key-id", pattern: "\\bAKIA[0-9A-Z]{16}\\b" },
    { id: "github-token", pattern: "\\bgh[pousr]_[A-Za-z0-9]{36,}\\b" },
    { id: "github-fine-grained-token", pattern: "\\bgithub_pat_[A-Za-z0-9_]{22,}\\b" },
    { id: "slack-token", pattern: "\\bxox[baprs]-[A-Za-z0-9-]{10,}\\b" },
    { id: "connection-string-with-credentials", pattern: "\\b[a-z][a-z0-9+.-]*://[^\\s/:@]+:[^\\s/@]+@" },
  ],
  excludePaths: ["fixtures/"],
  source: "builtin",
};

// Jobs a node may add to the standard's workflow templates (spec §13: the
// cross-platform `parity` job is the one allowed deviation). An explicit
// list, not "any extra job": a node that adds a deploy job to verify.yml
// gets a release fail naming it.
export const BUILTIN_ALLOWED_EXTRA_JOBS: readonly string[] = ["parity"];

// Validator ids that standard 1.0.0 manifests still use for checks Sentinel
// renamed (spec §8.1).
export const LEGACY_VALIDATOR_IDS: Readonly<Record<string, string>> = {
  "bilingual-docs": "docs-parity",
  "decision-records": "decisions",
};

const LayoutFileSchema = z.object({ schemaVersion: z.literal(1), directories: z.array(z.string().min(1)), files: z.array(z.string().min(1)) }).strict();
const StackFileSchema = z.object({ schemaVersion: z.literal(1), tsconfigFlags: z.array(z.string().min(1)).min(1), minimumBun: z.string().regex(/^\d+\.\d+\.\d+$/) }).strict();
const SecretsFileSchema = z
  .object({ schemaVersion: z.literal(1), patterns: z.array(z.object({ id: z.string().min(1), pattern: z.string().min(1) }).strict()).min(1), excludePaths: z.array(z.string()) })
  .strict();

export type BuildParamsResult = { ok: true; params: CheckParams } | { ok: false; code: "STANDARD_CORRUPT"; error: string };

function corrupt(version: string, what: string): BuildParamsResult {
  return { ok: false, code: "STANDARD_CORRUPT", error: `standard ${version} content is inconsistent: ${what}` };
}

function parseJson<T>(schema: z.ZodType<T>, raw: string | undefined, what: string, version: string): { ok: true; value: T } | { ok: false; result: BuildParamsResult } {
  if (raw === undefined) return { ok: false, result: corrupt(version, `${what} missing`) };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, result: corrupt(version, `${what} is not valid JSON`) };
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { ok: false, result: corrupt(version, `${what} does not match its schema`) };
  return { ok: true, value: parsed.data };
}

export interface BuildCheckParamsOptions {
  standard: LoadedStandard;
  pointer: NodePointer;
  pointerVersionSha256: string | undefined;
  today: string;
  sentinelVersion: string;
  knownCheckIds: readonly string[];
}

const PACK_PATH = "packs/forge614-pack-ecosystem-node/pack.json";

export function buildCheckParams(options: BuildCheckParamsOptions): BuildParamsResult {
  const { files, version } = options.standard;

  const pack = parseJson(PackSchema, files.get(PACK_PATH), PACK_PATH, version);
  if (!pack.ok) return pack.result;

  const manifests = new Map<string, RuleManifest>();
  for (const rule of pack.value.rules) {
    const path = `rules/${rule}/manifest.json`;
    const manifest = parseJson(RuleManifestSchema, files.get(path), path, version);
    if (!manifest.ok) return manifest.result;
    manifests.set(rule, manifest.value);
  }

  const forbidden = parseJson(ForbiddenMentionsSchema, files.get("forbidden-mentions.json"), "forbidden-mentions.json", version);
  if (!forbidden.ok) return forbidden.result;

  const templates = new Map<string, string>();
  for (const [path, text] of files) if (path.startsWith("templates/")) templates.set(path.slice("templates/".length), text);
  if (templates.size === 0) return corrupt(version, "templates/ missing");

  const ecosystemContract = files.get("FORGE614_ECOSYSTEM_CONTRACT.md");
  if (ecosystemContract === undefined) return corrupt(version, "FORGE614_ECOSYSTEM_CONTRACT.md missing");

  let layout: LayoutSpec = BUILTIN_LAYOUT;
  if (files.has("layout.json")) {
    const parsed = parseJson(LayoutFileSchema, files.get("layout.json"), "layout.json", version);
    if (!parsed.ok) return parsed.result;
    layout = { directories: parsed.value.directories, files: parsed.value.files, source: "standard/layout.json" };
  }
  let stack: StackSpec = BUILTIN_STACK;
  if (files.has("stack.json")) {
    const parsed = parseJson(StackFileSchema, files.get("stack.json"), "stack.json", version);
    if (!parsed.ok) return parsed.result;
    stack = { tsconfigFlags: parsed.value.tsconfigFlags, minimumBun: parsed.value.minimumBun, source: "standard/stack.json" };
  }
  let secrets: SecretsSpec = BUILTIN_SECRETS;
  if (files.has("secret-patterns.json")) {
    const parsed = parseJson(SecretsFileSchema, files.get("secret-patterns.json"), "secret-patterns.json", version);
    if (!parsed.ok) return parsed.result;
    secrets = { patterns: parsed.value.patterns, excludePaths: parsed.value.excludePaths, source: "standard/secret-patterns.json" };
  }

  return {
    ok: true,
    params: {
      sentinelVersion: options.sentinelVersion,
      today: options.today,
      pointer: options.pointer,
      standard: { version, sha256: options.standard.sha256, pointerVersionSha256: options.pointerVersionSha256 },
      pack: pack.value,
      manifests,
      forbiddenMentions: { terms: forbidden.value.terms, excludePaths: forbidden.value.excludePaths },
      templates,
      ecosystemContract,
      layout,
      stack,
      secrets,
      allowedExtraJobs: BUILTIN_ALLOWED_EXTRA_JOBS,
      knownCheckIds: options.knownCheckIds,
      legacyValidatorIds: LEGACY_VALIDATOR_IDS,
      parseYaml: (text) => parseYaml(text),
    },
  };
}
```

- [ ] **Step 6: Ejecutar**

Run: `bun run typecheck && bun test src/app/classify-repository.test.ts src/app/take-snapshot.test.ts src/app/build-check-params.test.ts`
Expected: 5 + 2 + 3 pass.

- [ ] **Step 7: Commit (lo hace el propietario)**

```bash
git add src/app/classify-repository.ts src/app/classify-repository.test.ts src/app/take-snapshot.ts src/app/take-snapshot.test.ts src/app/build-check-params.ts src/app/build-check-params.test.ts
git commit -m "feat(app): clasificación por archivos de identidad, snapshot único y parámetros de comprobación desde el reglamento"
```

---

## Comprobaciones (Tasks 9–19)

Convenciones comunes a todas las tasks de comprobación:

- Cada comprobación es `src/modules/checks/<id>.ts` y exporta `export const <camelId>Check: CheckDefinition = { id, appliesWhen, run }`. Sin I/O, sin red, sin `Date.now()` (la fecha llega en `params.today`).
- Fixtures en `fixtures/<id>/pass/` y `fixtures/<id>/fail/`: un árbol mínimo que hace pasar o fallar la comprobación. Los tests cargan las fixtures con `snapshotFromDir("<id>/pass")` y además cubren casos unitarios con `snapshotFrom({...})`. Ninguna fixture contiene términos reales de `forbidden-mentions.json` ni secretos literales (Sentinel se revisa a sí mismo).
- Las evidencias de las 11 comprobaciones trasladadas son las mismas cadenas que producen hoy los validadores de `forge614-ai` (spec §8.1). Cuando el validador original devolvía varios `Finding` (por ejemplo, catálogo + `dataFileInvalidJson`), Sentinel devuelve un solo `CheckResult` cuya `evidence` es la unión, en el mismo orden.
- Helper de parámetros para tests (creado en Task 9, usado por todas):

```ts
// tests/helpers/params.ts
import { parse } from "yaml";
import { BUILTIN_ALLOWED_EXTRA_JOBS, BUILTIN_LAYOUT, BUILTIN_SECRETS, BUILTIN_STACK, LEGACY_VALIDATOR_IDS } from "../../src/app/build-check-params";
import type { CheckParams } from "../../src/modules/check-params";
import type { Pack } from "../../src/modules/schemas/pack";

export const SHA = "18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922";

export const DEMO_POINTER = { schemaVersion: 1 as const, node: "demo", kind: "product" as const, standard: { version: "1.0.0", sha256: SHA } };

const MINIMAL_PACK: Pack = { schemaVersion: 1, name: "forge614-pack-ecosystem-node", version: "1.0.0", title: { es: "t", en: "t" }, rules: ["forge614-rule-package-naming"] };

export function testParams(overrides: Partial<CheckParams> = {}): CheckParams {
  return {
    sentinelVersion: "0.1.0",
    today: "2026-09-22",
    pointer: DEMO_POINTER,
    standard: { version: "1.0.0", sha256: SHA, pointerVersionSha256: SHA },
    pack: MINIMAL_PACK,
    manifests: new Map(),
    forbiddenMentions: { terms: [], excludePaths: [] },
    templates: new Map(),
    ecosystemContract: "",
    layout: BUILTIN_LAYOUT,
    stack: BUILTIN_STACK,
    secrets: BUILTIN_SECRETS,
    allowedExtraJobs: BUILTIN_ALLOWED_EXTRA_JOBS,
    knownCheckIds: [],
    legacyValidatorIds: LEGACY_VALIDATOR_IDS,
    parseYaml: (text) => parse(text),
    ...overrides,
  };
}
```

---

### Task 9: Comprobaciones trasladadas `package-naming` y `forbidden-mentions`

**Files:**
- Create: `tests/helpers/params.ts` (arriba)
- Create: `src/modules/checks/package-naming.ts`, `src/modules/checks/package-naming.test.ts`, `fixtures/package-naming/{pass,fail}/`
- Create: `src/modules/checks/forbidden-mentions.ts`, `src/modules/checks/forbidden-mentions.test.ts`, `fixtures/forbidden-mentions/{pass,fail}/`

**Interfaces:**
- Consumes: `PACKAGE_NAME_PATTERN`, `CheckDefinition`, `pass`/`fail`, `RepoSnapshot`, `CheckParams.forbiddenMentions`.
- Produces: `packageNamingCheck`, `forbiddenMentionsCheck` (`CheckDefinition`).

- [ ] **Step 1: Fixtures**

`fixtures/package-naming/pass/standard/rules/forge614-rule-x/manifest.json` → `{}`; `fixtures/package-naming/pass/.agents/skills/deploy/SKILL.md` → `# deploy` (carpeta personal sin manifest: no se revisa).
`fixtures/package-naming/fail/standard/rules/package-naming/manifest.json` → `{}`; `fixtures/package-naming/fail/.agents/skills/pdf-tools/manifest.json` → `{}`.

`fixtures/forbidden-mentions/pass/README.md` → `todo bien aquí\n`.
`fixtures/forbidden-mentions/fail/docs/es/01.md` → `línea uno\nusa Zzzproduct aquí\n`; `fixtures/forbidden-mentions/fail/src/a.ts` → `// zzzproductX no cuenta\n`.

- [ ] **Step 2: Tests (fallan)**

```ts
// src/modules/checks/package-naming.test.ts
import { expect, test } from "bun:test";
import { testParams } from "../../../tests/helpers/params";
import { snapshotFromDir } from "../../../tests/helpers/snapshot-from-dir";
import { snapshotFrom } from "../snapshot";
import { packageNamingCheck } from "./package-naming";

const params = testParams();

test("id and appliesWhen: always applies", () => {
  expect(packageNamingCheck.id).toBe("package-naming");
  expect(packageNamingCheck.appliesWhen(snapshotFrom({}), params)).toBe(true);
});

test("every folder under standard/rules, packs and .agents/{rules,skills,policies,mcps,plugins} is canonical", () => {
  expect(packageNamingCheck.run(snapshotFromDir("package-naming/pass"), params).verdict).toBe("pass");
  const r = packageNamingCheck.run(snapshotFromDir("package-naming/fail"), params);
  expect(r.verdict).toBe("fail");
  expect(r.evidence).toEqual([".agents/skills/pdf-tools", "standard/rules/package-naming"]);
  expect(r.messageKey).toBe("packageNamesInvalid");
});

test("a Hub package under .agents/ with a manifest.json must be canonical too", () => {
  const r = packageNamingCheck.run(snapshotFrom({ ".agents/skills/pdf-tools/manifest.json": "{}" }), params);
  expect(r.evidence).toEqual([".agents/skills/pdf-tools"]);
});
```

```ts
// src/modules/checks/forbidden-mentions.test.ts
import { expect, test } from "bun:test";
import { testParams } from "../../../tests/helpers/params";
import { snapshotFromDir } from "../../../tests/helpers/snapshot-from-dir";
import { snapshotFrom } from "../snapshot";
import { forbiddenMentionsCheck } from "./forbidden-mentions";

const params = testParams({ forbiddenMentions: { terms: ["zzzproduct"], excludePaths: [] } });

test("reports file:line for each forbidden term, case-insensitive, whole word", () => {
  const r = forbiddenMentionsCheck.run(snapshotFromDir("forbidden-mentions/fail"), params);
  expect(r.verdict).toBe("fail");
  expect(r.evidence).toEqual(["docs/es/01.md:2: zzzproduct"]);
});

test("passes when there are no matches", () => {
  expect(forbiddenMentionsCheck.run(snapshotFromDir("forbidden-mentions/pass"), params).verdict).toBe("pass");
});

test("never scans standard/forbidden-mentions.json itself or anything under .superpowers/", () => {
  const s = snapshotFrom({
    "standard/forbidden-mentions.json": JSON.stringify({ schemaVersion: 1, terms: ["zzzproduct"], excludePaths: [] }),
    ".superpowers/notes/plan.md": "esto menciona zzzproduct en un borrador\n",
  });
  expect(forbiddenMentionsCheck.run(s, params).verdict).toBe("pass");
});

test("excludePaths from the standard's forbidden-mentions.json are honored (prefix with trailing slash, exact path otherwise)", () => {
  const s = snapshotFrom({ "docs/historical/old.md": "zzzproduct aparece aquí\n", "notes.md": "zzzproduct\n" });
  const p = testParams({ forbiddenMentions: { terms: ["zzzproduct"], excludePaths: ["docs/historical/", "notes.md"] } });
  expect(forbiddenMentionsCheck.run(s, p).verdict).toBe("pass");
});

test("with no terms configured the check passes with an informational evidence line, never silently", () => {
  const r = forbiddenMentionsCheck.run(snapshotFrom({ "a.md": "x" }), testParams());
  expect(r.verdict).toBe("pass");
  expect(r.evidence).toEqual(["no forbidden terms declared by the standard"]);
});
```

- [ ] **Step 3: Implementar**

```ts
// src/modules/checks/package-naming.ts
import { fail, pass, type CheckDefinition } from "../check";
import { PACKAGE_NAME_PATTERN } from "../package-name";

// Obligatory everywhere the Hub distributes packages.
const STRICT_ROOTS = ["standard/rules/", "standard/packs/"];

// Under .agents/, only folders that carry a Hub manifest.json are checked:
// the person's own folders (e.g. .agents/skills/deploy/) are never touched.
const HUB_ROOTS = [".agents/rules/", ".agents/skills/", ".agents/policies/", ".agents/mcps/", ".agents/plugins/"];

export const packageNamingCheck: CheckDefinition = {
  id: "package-naming",
  appliesWhen: () => true,
  run: (snapshot) => {
    const bad = new Set<string>();
    for (const path of snapshot.files.keys()) {
      for (const root of STRICT_ROOTS) {
        if (path.startsWith(root)) {
          const dir = path.slice(root.length).split("/")[0] ?? "";
          if (!PACKAGE_NAME_PATTERN.test(dir)) bad.add(root + dir);
        }
      }
      for (const root of HUB_ROOTS) {
        if (path.startsWith(root) && path.endsWith("/manifest.json")) {
          const dir = path.slice(root.length).split("/")[0] ?? "";
          if (!PACKAGE_NAME_PATTERN.test(dir)) bad.add(root + dir);
        }
      }
    }
    return bad.size === 0 ? pass("packageNamesOk") : fail([...bad].sort(), "packageNamesInvalid");
  },
};
```

```ts
// src/modules/checks/forbidden-mentions.ts
import { fail, pass, type CheckDefinition } from "../check";

// Always excluded: the standard's own data file when a repository carries a
// copy (it lists the terms as data, not as a mention) and .superpowers/
// (planning scratch space). The standard's excludePaths add to these.
const DEFAULT_EXCLUDES = ["standard/forbidden-mentions.json", ".superpowers/"];

function isExcluded(path: string, excludePaths: readonly string[]): boolean {
  return excludePaths.some((ex) => (ex.endsWith("/") ? path.startsWith(ex) : path === ex));
}

function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// facts.gitLogSubjects is not scanned in 0.1 on purpose: the ported checks
// keep the evidence forge614-ai produced (spec §8.1); commit subjects are an
// additive extension for a later version.
export const forbiddenMentionsCheck: CheckDefinition = {
  id: "forbidden-mentions",
  appliesWhen: () => true,
  run: (snapshot, params) => {
    if (params.forbiddenMentions.terms.length === 0) return pass("forbiddenMentionsNone", {}, ["no forbidden terms declared by the standard"]);
    const excludePaths = [...new Set([...DEFAULT_EXCLUDES, ...params.forbiddenMentions.excludePaths])];
    const matchers = params.forbiddenMentions.terms.map((term) => [term, new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`, "i")] as const);
    const evidence: string[] = [];
    for (const [path, text] of snapshot.files) {
      if (isExcluded(path, excludePaths)) continue;
      text.split("\n").forEach((line, i) => {
        for (const [term, re] of matchers) if (re.test(line)) evidence.push(`${path}:${i + 1}: ${term}`);
      });
    }
    return evidence.length === 0 ? pass("forbiddenMentionsNone") : fail(evidence, "forbiddenMentionsFound");
  },
};
```

- [ ] **Step 4: Ejecutar**

Run: `bun test src/modules/checks/package-naming.test.ts src/modules/checks/forbidden-mentions.test.ts`
Expected: 3 + 5 pass.

- [ ] **Step 5: Commit (lo hace el propietario)**

```bash
git add tests/helpers/params.ts src/modules/checks fixtures/package-naming fixtures/forbidden-mentions
git commit -m "feat(checks): package-naming y forbidden-mentions trasladadas con sus fixtures"
```

---

### Task 10: Comprobaciones trasladadas `docs-parity`, `decisions` y `agent-checklist-impact`

**Files:**
- Create: `src/modules/checks/docs-parity.ts` + test + `fixtures/docs-parity/{pass,fail}/`
- Create: `src/modules/checks/decisions.ts` + test + `fixtures/decisions/{pass,fail}/`
- Create: `src/modules/checks/agent-checklist-impact.ts` + test + `fixtures/agent-checklist-impact/{pass,fail}/`

**Interfaces:**
- Consumes: `countHeadings`, `headingNumbering` (Task 2), `DecisionsIndexSchema`, `listUnder`, `read`.
- Produces: `docsParityCheck`, `decisionsCheck`, `agentChecklistImpactCheck`.

- [ ] **Step 1: Fixtures**

`docs-parity/pass/`: `README.md` y `README.en.md` (`# T\n\n## A\n`), `docs/es/00-resumen.md` y `docs/en/00-summary.md` (`# T\n\n## A\n## B\n`), `CONTRACT.md` y `CONTRACT.en.md` (`# C\n## 1. A\n`).
`docs-parity/fail/`: `README.md`, `README.en.md` (`x`), `docs/es/01-x.md` (`# T\n## A\n## B\n`), `docs/en/01-x.md` (`# T\n## A\n`), `docs/es/02-y.md` (`# T\n`).

`decisions/pass/docs/decisions/0001-a.md`:
```markdown
# 0001 — Acta de ejemplo

**Fecha:** 2026-09-22
**Estado:** aceptada

## Contexto

Texto de ejemplo de contexto.

## Decisión

Texto de ejemplo de decisión.

## Alternativas descartadas

Texto de ejemplo de alternativas descartadas.

## Consecuencias

Texto de ejemplo de consecuencias.
```

`decisions/pass/docs/decisions/INDEX.json`:
```json
{
  "schemaVersion": 1,
  "decisions": [
    { "number": "0001", "slug": "a", "title": "Acta de ejemplo", "status": "aceptada", "date": "2026-09-22", "file": "0001-a.md" }
  ]
}
```

`decisions/fail/docs/decisions/0001-a.md` (estado no admitido):
```markdown
# 0001 — Acta de ejemplo

**Fecha:** 2026-09-22
**Estado:** cancelada

## Contexto

Texto de ejemplo de contexto.

## Decisión

Texto de ejemplo de decisión.

## Alternativas descartadas

Texto de ejemplo de alternativas descartadas.

## Consecuencias

Texto de ejemplo de consecuencias.
```

`decisions/fail/docs/decisions/0003-c.md` (salta el 0002 y le falta `## Consecuencias`):
```markdown
# 0003 — Otra acta

**Fecha:** 2026-09-22
**Estado:** aceptada

## Contexto

Texto de ejemplo de contexto.

## Decisión

Texto de ejemplo de decisión.

## Alternativas descartadas

Texto de ejemplo de alternativas descartadas.
```

`decisions/fail/docs/decisions/INDEX.json` (lista un `0002-b.md` que no existe):
```json
{
  "schemaVersion": 1,
  "decisions": [
    { "number": "0001", "slug": "a", "title": "Acta de ejemplo", "status": "aceptada", "date": "2026-09-22", "file": "0001-a.md" },
    { "number": "0002", "slug": "b", "title": "Acta borrada", "status": "aceptada", "date": "2026-09-22", "file": "0002-b.md" },
    { "number": "0003", "slug": "c", "title": "Otra acta", "status": "aceptada", "date": "2026-09-22", "file": "0003-c.md" }
  ]
}
```

`agent-checklist-impact/pass/.agents/plans/2026-09-22--a.md`: plan `completed` con sección `## Impacto en el procedimiento de agentes\nNo — no cambia capacidades de asistentes.\n## Result\nok\n`. `agent-checklist-impact/fail/.agents/plans/2026-09-22--b.md`: plan `completed` con la sección vacía.

- [ ] **Step 2: Tests (fallan)**

```ts
// src/modules/checks/docs-parity.test.ts
import { expect, test } from "bun:test";
import { testParams } from "../../../tests/helpers/params";
import { snapshotFromDir } from "../../../tests/helpers/snapshot-from-dir";
import { snapshotFrom } from "../snapshot";
import { docsParityCheck } from "./docs-parity";

const params = testParams();

test("pass when every numbered es doc has an en twin with the same heading count", () => {
  expect(docsParityCheck.run(snapshotFromDir("docs-parity/pass"), params).verdict).toBe("pass");
});

test("fail on missing twin or heading count mismatch (same evidence as forge614-ai)", () => {
  const r = docsParityCheck.run(snapshotFromDir("docs-parity/fail"), params);
  expect(r.verdict).toBe("fail");
  expect(r.evidence).toEqual(expect.arrayContaining(["docs/es/01-x.md: 3 headings vs docs/en/01-x.md: 2", "docs/es/02-y.md: missing docs/en/02-*.md"]));
});

test("fail when STANDARD.md and STANDARD.en.md headings differ in order or numbering", () => {
  const s = snapshotFrom({
    "README.md": "x",
    "README.en.md": "x",
    "standard/STANDARD.md": "# E\n## 1. A\n## 2. B\n## Anexo A. C\n",
    "standard/STANDARD.en.md": "# E\n## 1. A\n## 3. B\n## Appendix A. C\n",
  });
  const r = docsParityCheck.run(s, params);
  expect(r.verdict).toBe("fail");
  expect(r.evidence.some((e) => e.includes("heading numbering"))).toBe(true);
});

test("a '#' line inside a fenced code block is not a heading", () => {
  const fenced = "# T\n## 1. A\n\n```bash\n# comment\n## not a heading\n```\n";
  const s = snapshotFrom({ "README.md": "x", "README.en.md": "x", "CONTRACT.md": fenced, "CONTRACT.en.md": "# T\n## 1. A\n" });
  expect(docsParityCheck.run(s, params).verdict).toBe("pass");
});

test("a missing twin of a root pair is reported on either side", () => {
  expect(docsParityCheck.run(snapshotFrom({ "README.md": "x" }), params).evidence).toEqual(["README.md: missing README.en.md"]);
  expect(docsParityCheck.run(snapshotFrom({ "CONTRACT.en.md": "x" }), params).evidence).toEqual(["CONTRACT.en.md: missing CONTRACT.md"]);
});
```

```ts
// src/modules/checks/decisions.test.ts
import { describe, expect, test } from "bun:test";
import { testParams } from "../../../tests/helpers/params";
import { snapshotFromDir } from "../../../tests/helpers/snapshot-from-dir";
import { snapshotFrom } from "../snapshot";
import { decisionsCheck } from "./decisions";

const params = testParams();

describe("decisions (formerly decision-records)", () => {
  test("pass with consecutive numbering, valid states and INDEX.json listing all", () => {
    expect(decisionsCheck.run(snapshotFromDir("decisions/pass"), params).verdict).toBe("pass");
  });

  test("fail on gap, bad state, missing section and record deleted vs INDEX", () => {
    const r = decisionsCheck.run(snapshotFromDir("decisions/fail"), params);
    expect(r.evidence).toEqual(
      expect.arrayContaining([
        "0001-a.md: invalid state 'cancelada'",
        "numbering gap before 0003",
        "0003-c.md: missing section '## Consecuencias'",
        "INDEX.json lists 0002-b.md but file is missing (records are never deleted)",
      ]),
    );
  });

  test("fails with decisionsIndexMissing when INDEX.json does not exist", () => {
    const r = decisionsCheck.run(snapshotFrom({ "docs/decisions/0001-a.md": "# x" }), params);
    expect(r.verdict).toBe("fail");
    expect(r.messageKey).toBe("decisionsIndexMissing");
    expect(r.evidence).toEqual(["docs/decisions/INDEX.json missing"]);
  });

  test("an empty index with no records passes (a young node)", () => {
    expect(decisionsCheck.run(snapshotFrom({ "docs/decisions/INDEX.json": JSON.stringify({ schemaVersion: 1, decisions: [] }) }), params).verdict).toBe("pass");
  });
});
```

```ts
// src/modules/checks/agent-checklist-impact.test.ts
import { expect, test } from "bun:test";
import { testParams } from "../../../tests/helpers/params";
import { snapshotFromDir } from "../../../tests/helpers/snapshot-from-dir";
import { snapshotFrom } from "../snapshot";
import { agentChecklistImpactCheck } from "./agent-checklist-impact";

const params = testParams();
const plan = (status: string, impact: string) => `# P\n\n**Date:** 2026-09-22\n**Type:** feature\n**Status:** ${status}\n\n## Impacto en el procedimiento de agentes\n${impact}\n## Result\nok\n`;

test("completed plans need Sí/No with content; in_progress plans are skipped", () => {
  expect(agentChecklistImpactCheck.run(snapshotFromDir("agent-checklist-impact/pass"), params).verdict).toBe("pass");
  const r = agentChecklistImpactCheck.run(snapshotFromDir("agent-checklist-impact/fail"), params);
  expect(r.evidence).toEqual([".agents/plans/2026-09-22--b.md: section '## Impacto en el procedimiento de agentes' must start with 'Sí' or 'No' and explain"]);
  const s = snapshotFrom({
    ".agents/plans/c.md": plan("in_progress", ""),
    ".agents/plans/d.md": plan("completed", "Sí — Engines acepta --readable-dir; agregar validación en la sección de Engines."),
  });
  expect(agentChecklistImpactCheck.run(s, params).verdict).toBe("pass");
});

test("passes when there are no plans at all", () => {
  expect(agentChecklistImpactCheck.run(snapshotFrom({}), params).verdict).toBe("pass");
});
```

- [ ] **Step 3: Implementar**

```ts
// src/modules/checks/docs-parity.ts
import { fail, pass, type CheckDefinition } from "../check";
import { countHeadings, headingNumbering } from "../headings";
import { listUnder, read } from "../snapshot";

const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["README.md", "README.en.md"],
  ["standard/STANDARD.md", "standard/STANDARD.en.md"],
  ["CONTRACT.md", "CONTRACT.en.md"],
  ["standard/FORGE614_ECOSYSTEM_CONTRACT.md", "standard/FORGE614_ECOSYSTEM_CONTRACT.en.md"],
];

export const docsParityCheck: CheckDefinition = {
  id: "docs-parity",
  appliesWhen: () => true,
  run: (snapshot) => {
    const evidence: string[] = [];
    for (const [es, en] of PAIRS) {
      const a = read(snapshot, es);
      const b = read(snapshot, en);
      if (a !== undefined && b === undefined) {
        evidence.push(`${es}: missing ${en}`);
        continue;
      }
      if (b !== undefined && a === undefined) {
        evidence.push(`${en}: missing ${es}`);
        continue;
      }
      if (a === undefined || b === undefined) continue;
      const ha = countHeadings(a);
      const hb = countHeadings(b);
      if (ha !== hb) evidence.push(`${es}: ${ha} headings vs ${en}: ${hb}`);
      const na = headingNumbering(a);
      const nb = headingNumbering(b);
      if (JSON.stringify(na) !== JSON.stringify(nb)) evidence.push(`${es}: heading numbering [${na.join(", ")}] vs ${en}: [${nb.join(", ")}]`);
    }
    for (const es of listUnder(snapshot, "docs/es/")) {
      const num = /docs\/es\/(\d{2})-/.exec(es)?.[1];
      if (!num) continue;
      const en = listUnder(snapshot, `docs/en/${num}-`)[0];
      if (!en) {
        evidence.push(`${es}: missing docs/en/${num}-*.md`);
        continue;
      }
      const ha = countHeadings(read(snapshot, es) ?? "");
      const hb = countHeadings(read(snapshot, en) ?? "");
      if (ha !== hb) evidence.push(`${es}: ${ha} headings vs ${en}: ${hb}`);
    }
    return evidence.length === 0 ? pass("docsParityOk") : fail(evidence, "docsParityBroken");
  },
};
```

```ts
// src/modules/checks/decisions.ts
import { fail, pass, type CheckDefinition } from "../check";
import { DecisionsIndexSchema } from "../schemas/decisions-index";
import { has, listUnder, read } from "../snapshot";

const DECISIONS_DIR = "docs/decisions/";
const INDEX_PATH = "docs/decisions/INDEX.json";
const FILE_RE = /^docs\/decisions\/(\d{4})-[a-z0-9-]+\.md$/;
const STATE_RE = /^\*\*Estado:\*\*\s*(propuesta|aceptada|revocada|reemplazada por \d{4})(\s*\(.*\))?\s*$/m;
const RAW_STATE_RE = /^\*\*Estado:\*\*\s*(.+)$/m;
const SECTIONS = ["## Contexto", "## Decisión", "## Alternativas descartadas", "## Consecuencias"];

export const decisionsCheck: CheckDefinition = {
  id: "decisions",
  appliesWhen: () => true,
  run: (snapshot) => {
    const indexRaw = read(snapshot, INDEX_PATH);
    if (indexRaw === undefined) return fail([`${INDEX_PATH} missing`], "decisionsIndexMissing");

    const evidence: string[] = [];
    const files = listUnder(snapshot, DECISIONS_DIR).filter((p) => FILE_RE.test(p));
    let expected = 1;
    for (const path of files) {
      const name = path.slice(DECISIONS_DIR.length);
      const num = Number(FILE_RE.exec(path)?.[1]);
      if (num !== expected) evidence.push(`numbering gap before ${String(num).padStart(4, "0")}`);
      expected = num + 1;
      const text = read(snapshot, path) ?? "";
      if (!STATE_RE.test(text)) evidence.push(`${name}: invalid state '${RAW_STATE_RE.exec(text)?.[1]?.trim() ?? "?"}'`);
      for (const section of SECTIONS) if (!text.includes(`${section}\n`)) evidence.push(`${name}: missing section '${section}'`);
    }

    let parsedIndex: unknown;
    try {
      parsedIndex = JSON.parse(indexRaw);
    } catch {
      return fail([...evidence, `${INDEX_PATH}: invalid JSON`], "decisionRecordsInvalid");
    }
    const result = DecisionsIndexSchema.safeParse(parsedIndex);
    if (!result.success) {
      evidence.push(`${INDEX_PATH}: invalid index: ${result.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
    } else {
      const indexed = new Set(result.data.decisions.map((d) => d.file));
      for (const f of indexed) if (!has(snapshot, `${DECISIONS_DIR}${f}`)) evidence.push(`INDEX.json lists ${f} but file is missing (records are never deleted)`);
      for (const path of files) {
        const name = path.slice(DECISIONS_DIR.length);
        if (!indexed.has(name)) evidence.push(`INDEX.json does not list ${name}`);
      }
    }
    return evidence.length === 0 ? pass("decisionRecordsOk") : fail(evidence, "decisionRecordsInvalid");
  },
};
```

```ts
// src/modules/checks/agent-checklist-impact.ts
import { fail, pass, type CheckDefinition } from "../check";
import { listUnder, read } from "../snapshot";

const SECTION = "## Impacto en el procedimiento de agentes";
// `\b` cannot be used after "Sí": JS's ASCII-only \w does not treat "í" as a
// word character. A Unicode-aware separator (whitespace or punctuation) is
// used instead.
const IMPACT_RE = /^(Sí|No)[\s\p{P}].{10,}/su;

export const agentChecklistImpactCheck: CheckDefinition = {
  id: "agent-checklist-impact",
  appliesWhen: () => true,
  run: (snapshot) => {
    const evidence: string[] = [];
    for (const path of listUnder(snapshot, ".agents/plans/")) {
      const text = read(snapshot, path) ?? "";
      if (!/^\*\*Status:\*\*\s*completed\s*$/m.test(text)) continue;
      const start = text.indexOf(SECTION);
      const body = start < 0 ? "" : (text.slice(start + SECTION.length).split(/\n## /)[0]?.trim() ?? "");
      if (!IMPACT_RE.test(body)) evidence.push(`${path}: section '${SECTION}' must start with 'Sí' or 'No' and explain`);
    }
    return evidence.length === 0 ? pass("agentImpactDeclared") : fail(evidence, "agentImpactMissing");
  },
};
```

- [ ] **Step 4: Ejecutar**

Run: `bun test src/modules/checks/docs-parity.test.ts src/modules/checks/decisions.test.ts src/modules/checks/agent-checklist-impact.test.ts`
Expected: 5 + 4 + 2 pass.

- [ ] **Step 5: Commit (lo hace el propietario)**

```bash
git add src/modules/checks fixtures/docs-parity fixtures/decisions fixtures/agent-checklist-impact
git commit -m "feat(checks): docs-parity, decisions y agent-checklist-impact trasladadas"
```

---

### Task 11: Comprobaciones trasladadas `error-codes` y `support-matrix`

**Files:**
- Create: `src/modules/checks/error-codes.ts` + test + `fixtures/error-codes/{pass,fail}/`
- Create: `src/modules/checks/support-matrix.ts` + test + `fixtures/support-matrix/{pass,fail}/`

**Interfaces:**
- Consumes: `SupportMatrixSchema`, `parseJsonData`, `tableRowsAfter`, `params.today`.
- Produces: `errorCodesCheck`, `supportMatrixCheck`, `ERROR_CODE_PATTERN` (reutilizado por `node-contract`, Task 16).

- [ ] **Step 1: Fixtures**

`error-codes/pass/CONTRACT.md`: `## Códigos de error\n| Código | Significado |\n| --- | --- |\n| \`INVALID_ARGUMENTS\` | Entrada inválida |\n`; `error-codes/pass/src/interfaces/cli/output.ts`: `printError("INVALID_ARGUMENTS", "x");\n`.
`error-codes/fail/CONTRACT.md`: fila `` `engines-outdated` ``; `error-codes/fail/src/app/x.ts`: `printError("engines-outdated", "x"); printError("Bad_Code", "y");\n`.

`support-matrix/pass/standard/support-matrix.json`: matriz válida con una celda `supported`. `support-matrix/fail/standard/support-matrix.json`: celda `revalidate` con `revalidateSince: "2026-07-01"` (vencida a fecha 2026-09-22).

- [ ] **Step 2: Tests (fallan)**

```ts
// src/modules/checks/error-codes.test.ts
import { expect, test } from "bun:test";
import { testParams } from "../../../tests/helpers/params";
import { snapshotFromDir } from "../../../tests/helpers/snapshot-from-dir";
import { snapshotFrom } from "../snapshot";
import { ERROR_CODE_PATTERN, errorCodesCheck } from "./error-codes";

const params = testParams();

test("accepts canonical codes in CONTRACT.md and source, rejects kebab-case or lowercase", () => {
  expect(ERROR_CODE_PATTERN.test("STANDARD_CORRUPT")).toBe(true);
  expect(errorCodesCheck.run(snapshotFromDir("error-codes/pass"), params).verdict).toBe("pass");
  const r = errorCodesCheck.run(snapshotFromDir("error-codes/fail"), params);
  expect(r.verdict).toBe("fail");
  expect(r.evidence).toEqual(["CONTRACT.md: engines-outdated", "src/app/x.ts:1: engines-outdated", "src/app/x.ts:1: Bad_Code"]);
});

test("passes when the repo has no CONTRACT.md and no printError calls; ignores test files under src/", () => {
  expect(errorCodesCheck.run(snapshotFrom({ "README.md": "" }), params).verdict).toBe("pass");
  expect(errorCodesCheck.run(snapshotFrom({ "src/app/x.test.ts": 'printError("bad-code", "x");' }), params).verdict).toBe("pass");
});
```

```ts
// src/modules/checks/support-matrix.test.ts
import { expect, test } from "bun:test";
import { testParams } from "../../../tests/helpers/params";
import { snapshotFromDir } from "../../../tests/helpers/snapshot-from-dir";
import { snapshotFrom } from "../snapshot";
import { supportMatrixCheck } from "./support-matrix";

const at = (today: string) => testParams({ today });
const m = (cells: unknown[]) => JSON.stringify({ schemaVersion: 1, nodes: ["engines"], agents: ["codex"], cells });

test("applies only when standard/support-matrix.json exists (forge614-ai)", () => {
  expect(supportMatrixCheck.appliesWhen(snapshotFrom({}), at("2026-09-22"))).toBe(false);
  expect(supportMatrixCheck.appliesWhen(snapshotFromDir("support-matrix/pass"), at("2026-09-22"))).toBe(true);
});

test("fails on stale revalidate (> 30 days) and passes on a fresh matrix", () => {
  expect(supportMatrixCheck.run(snapshotFromDir("support-matrix/pass"), at("2026-09-22")).verdict).toBe("pass");
  const r = supportMatrixCheck.run(snapshotFromDir("support-matrix/fail"), at("2026-09-22"));
  expect(r.evidence).toEqual(["engines/codex: in revalidate since 2026-07-01 (> 30 days)"]);
  expect(r.params).toEqual({ days: "30" });
});

test("a revalidate cell exactly 30 days old is not yet stale", () => {
  const s = snapshotFrom({
    "standard/support-matrix.json": m([{ node: "engines", agent: "codex", status: "revalidate", revalidateSince: "2026-08-23", reason: "r", verifiedAt: "2026-08-23", verifiedBy: "o", notes: "" }]),
  });
  expect(supportMatrixCheck.run(s, at("2026-09-22")).verdict).toBe("pass");
});

test("invalid JSON and invalid schema are fail findings with the same evidence as before", () => {
  const bad = supportMatrixCheck.run(snapshotFrom({ "standard/support-matrix.json": "{ not json" }), at("2026-09-22"));
  expect(bad.messageKey).toBe("dataFileInvalidJson");
  expect(bad.evidence[0]).toStartWith("standard/support-matrix.json: invalid JSON: ");
  expect(supportMatrixCheck.run(snapshotFrom({ "standard/support-matrix.json": "{}" }), at("2026-09-22")).messageKey).toBe("supportMatrixInvalid");
});
```

- [ ] **Step 3: Implementar**

```ts
// src/modules/checks/error-codes.ts
import { fail, pass, type CheckDefinition } from "../check";
import { read } from "../snapshot";

export const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]+$/;
const CONTRACT_ROW = /^\|\s*`([^`]+)`\s*\|/;
const PRINT_ERROR = /printError\(\s*"([^"]+)"/g;

// Format only: every code in CONTRACT.md's error table and every literal
// passed to printError under src/ (tests excluded) is UPPER_SNAKE_CASE.
// Cross-consistency between table and code is node-contract's job.
export const errorCodesCheck: CheckDefinition = {
  id: "error-codes",
  appliesWhen: () => true,
  run: (snapshot) => {
    const evidence: string[] = [];
    const contract = read(snapshot, "CONTRACT.md");
    if (contract !== undefined) {
      const section = contract.split(/^## /m).find((s) => s.startsWith("Códigos de error")) ?? "";
      for (const line of section.split("\n")) {
        const m = CONTRACT_ROW.exec(line);
        if (m?.[1] !== undefined && m[1] !== "Código" && !ERROR_CODE_PATTERN.test(m[1])) evidence.push(`CONTRACT.md: ${m[1]}`);
      }
    }
    for (const [path, text] of snapshot.files) {
      if (!path.startsWith("src/") || !path.endsWith(".ts") || path.endsWith(".test.ts")) continue;
      text.split("\n").forEach((line, i) => {
        for (const m of line.matchAll(PRINT_ERROR)) {
          const code = m[1] ?? "";
          if (!ERROR_CODE_PATTERN.test(code)) evidence.push(`${path}:${i + 1}: ${code}`);
        }
      });
    }
    return evidence.length === 0 ? pass("errorCodesOk") : fail(evidence, "errorCodesInvalid");
  },
};
```

```ts
// src/modules/checks/support-matrix.ts
import { fail, pass, type CheckDefinition } from "../check";
import { parseJsonData } from "../json-data";
import { SupportMatrixSchema } from "../schemas/support-matrix";
import { has, read } from "../snapshot";

const DAY = 86_400_000;
const MATRIX_PATH = "standard/support-matrix.json";

export const supportMatrixCheck: CheckDefinition = {
  id: "support-matrix",
  appliesWhen: (snapshot) => has(snapshot, MATRIX_PATH),
  run: (snapshot, params) => {
    const raw = read(snapshot, MATRIX_PATH);
    if (raw === undefined) return fail([`${MATRIX_PATH} missing`], "supportMatrixMissing");
    const json = parseJsonData(MATRIX_PATH, raw);
    if (!json.ok) return fail([json.evidence], "dataFileInvalidJson");
    const parsed = SupportMatrixSchema.safeParse(json.data);
    if (!parsed.success) return fail(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`), "supportMatrixInvalid");
    const evidence: string[] = [];
    for (const cell of parsed.data.cells) {
      if (cell.status !== "revalidate" || cell.revalidateSince === undefined) continue;
      if (Date.parse(params.today) - Date.parse(cell.revalidateSince) > 30 * DAY) {
        evidence.push(`${cell.node}/${cell.agent}: in revalidate since ${cell.revalidateSince} (> 30 days)`);
      }
    }
    return evidence.length === 0 ? pass("supportMatrixCurrent") : fail(evidence, "supportMatrixStale", { days: "30" });
  },
};
```

- [ ] **Step 4: Ejecutar**

Run: `bun test src/modules/checks/error-codes.test.ts src/modules/checks/support-matrix.test.ts`
Expected: 2 + 4 pass.

- [ ] **Step 5: Commit (lo hace el propietario)**

```bash
git add src/modules/checks fixtures/error-codes fixtures/support-matrix
git commit -m "feat(checks): error-codes y support-matrix trasladadas"
```

---

### Task 12: Comprobaciones trasladadas `workflows` y `context-budget`

**Files:**
- Create: `src/modules/checks/workflows.ts` + test + `fixtures/workflows/{pass,fail}/`
- Create: `src/modules/checks/context-budget.ts` + test + `fixtures/context-budget/{pass,fail}/`

**Interfaces:**
- Consumes: `WorkflowSchema`, `checkWorkflowShape`, `jobsOf` (Task 2), `params.parseYaml`, `PackSchema`.
- Produces: `workflowsCheck`, `contextBudgetCheck`.

- [ ] **Step 1: Fixtures**

`workflows/pass/.github/workflows/verify.yml`: la plantilla `verify.yml` del estándar (contenido de `standard/templates/verify.yml`); `workflows/pass/docs/es/04-workflows.md`: `# 04 — Workflows\n\n## verify.yml\n| Job | Disparador |\n| --- | --- |\n| \`verify\` | pr |\n`; `workflows/pass/package.json`: `{"scripts":{"verify":"bun run src/interfaces/cli/verify.ts"}}`.
`workflows/fail/.github/workflows/verify.yml`: igual pero con el job renombrado a `build:` y sin `timeout-minutes`; `docs/es/04-workflows.md` documenta solo `verify`.

`context-budget/pass/standard/packs/forge614-pack-ecosystem-node/pack.json`: pack con `rules: ["origin-rule-one"]`; `standard/rules/origin-rule-one/RULE.md`: `# A short rule\n\nmore\n`.
`context-budget/fail/…/pack.json` igual; `RULE.md` con primera línea de 20 000 caracteres (generarla con `bun -e 'console.log("# " + "x".repeat(20000))' > RULE.md`).

- [ ] **Step 2: Tests (fallan)**

```ts
// src/modules/checks/workflows.test.ts
import { expect, test } from "bun:test";
import { testParams } from "../../../tests/helpers/params";
import { snapshotFromDir } from "../../../tests/helpers/snapshot-from-dir";
import { snapshotFrom } from "../snapshot";
import { workflowsCheck } from "./workflows";

const params = testParams();
const yml = `name: verify\non:\n  pull_request: {}\njobs:\n  verify:\n    runs-on: ubuntu-24.04\n    timeout-minutes: 10\n    steps:\n      - uses: actions/checkout@34e114876b0b11a390a9f2f37d3e4bb0e8a0a8bb\n      - run: bun run verify\n`;
const doc = "# 04 — Workflows\n\n## verify.yml\n| Job | Disparador |\n| --- | --- |\n| `verify` | pr |\n";

test("pass when every job is documented and thin; fail on undocumented job or missing timeout", () => {
  expect(workflowsCheck.run(snapshotFromDir("workflows/pass"), params).verdict).toBe("pass");
  const r = workflowsCheck.run(snapshotFromDir("workflows/fail"), params);
  expect(r.verdict).toBe("fail");
  expect(r.evidence[0]).toStartWith("verify.yml: schema: jobs.build.timeout-minutes ");
});

test("bad yaml, missing doc and unknown script are evidence (same strings as forge614-ai)", () => {
  expect(workflowsCheck.run(snapshotFrom({ ".github/workflows/x.yml": "jobs: [", "docs/es/04-workflows.md": doc }), params).evidence[0]).toContain("x.yml: YAML parse error");
  expect(workflowsCheck.run(snapshotFrom({ ".github/workflows/verify.yml": yml }), params).evidence).toEqual([
    "docs/es/NN-workflows.md missing (no file matches docs/es/[0-9][0-9]-workflows.md)",
  ]);
  const pkg = JSON.stringify({ scripts: { verify: "x" } });
  const r = workflowsCheck.run(snapshotFrom({ ".github/workflows/verify.yml": yml.replace("bun run verify", "bun run nope"), "docs/es/04-workflows.md": doc, "package.json": pkg }), params);
  expect(r.evidence).toEqual(["verify.yml: job verify step 2: script 'nope' not found in package.json scripts: bun run nope"]);
});

test("no workflows found is a pass with workflowsNone", () => {
  const r = workflowsCheck.run(snapshotFrom({}), params);
  expect(r.verdict).toBe("pass");
  expect(r.messageKey).toBe("workflowsNone");
});
```

```ts
// src/modules/checks/context-budget.test.ts
import { expect, test } from "bun:test";
import { testParams } from "../../../tests/helpers/params";
import { snapshotFromDir } from "../../../tests/helpers/snapshot-from-dir";
import { snapshotFrom } from "../snapshot";
import { contextBudgetCheck } from "./context-budget";

const params = testParams();
const PACK = "standard/packs/forge614-pack-ecosystem-node/pack.json";

test("applies only when the ecosystem pack.json exists in the repository (forge614-ai)", () => {
  expect(contextBudgetCheck.appliesWhen(snapshotFrom({}), params)).toBe(false);
  expect(contextBudgetCheck.appliesWhen(snapshotFromDir("context-budget/pass"), params)).toBe(true);
});

test("pass within budget, fail over 3000 estimated tokens", () => {
  const ok = contextBudgetCheck.run(snapshotFromDir("context-budget/pass"), params);
  expect(ok.verdict).toBe("pass");
  expect(ok.messageKey).toBe("contextBudgetOk");
  expect(ok.evidence[0]).toMatch(/^origin-rule-one: ~\d+ tokens \(estimate\)$/);
  const over = contextBudgetCheck.run(snapshotFromDir("context-budget/fail"), params);
  expect(over.verdict).toBe("fail");
  expect(over.messageKey).toBe("contextBudgetOverBudget");
});

test("invalid JSON or invalid pack are fail findings, never a throw", () => {
  expect(contextBudgetCheck.run(snapshotFrom({ [PACK]: "{ not json" }), params).messageKey).toBe("dataFileInvalidJson");
  expect(contextBudgetCheck.run(snapshotFrom({ [PACK]: "{}" }), params).messageKey).toBe("contextBudgetInvalid");
});

test("pins the boundary: total === 3000 still passes", () => {
  const rule = "origin-rule-one";
  const firstLine = "x".repeat(3000 * 4 - `${rule}: `.length);
  const pack = JSON.stringify({ schemaVersion: 1, name: "forge614-pack-ecosystem-node", version: "1.0.0", title: { es: "t", en: "t" }, rules: [rule] });
  const r = contextBudgetCheck.run(snapshotFrom({ [PACK]: pack, [`standard/rules/${rule}/RULE.md`]: `${firstLine}\n` }), params);
  expect(r.params.tokens).toBe("3000");
  expect(r.verdict).toBe("pass");
});
```

- [ ] **Step 3: Implementar**

```ts
// src/modules/checks/workflows.ts
import { z } from "zod";
import { fail, pass, type CheckDefinition } from "../check";
import { listUnder, read, type RepoSnapshot } from "../snapshot";
import { checkWorkflowShape, jobsOf, WorkflowSchema } from "../workflow";

const RUN_SCRIPT = /^bun run ([a-z0-9:.-]+)$/;
const PackageJsonScripts = z.object({ scripts: z.record(z.string(), z.string()).optional() }).passthrough();

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

function packageScripts(snapshot: RepoSnapshot): Set<string> | undefined {
  const raw = read(snapshot, "package.json");
  if (raw === undefined) return undefined;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const parsed = PackageJsonScripts.safeParse(data);
  return parsed.success ? new Set(Object.keys(parsed.data.scripts ?? {})) : undefined;
}

export const workflowsCheck: CheckDefinition = {
  id: "workflows",
  appliesWhen: () => true,
  run: (snapshot, params) => {
    const evidence: string[] = [];
    const files = listUnder(snapshot, ".github/workflows/").filter((p) => /\.ya?ml$/.test(p));
    if (files.length === 0) return pass("workflowsNone");

    const docPath = listUnder(snapshot, "docs/es/").find((p) => /docs\/es\/\d{2}-workflows\.md$/.test(p));
    const documented = docPath ? documentedJobs(read(snapshot, docPath) ?? "") : new Set<string>();
    if (!docPath) evidence.push("docs/es/NN-workflows.md missing (no file matches docs/es/[0-9][0-9]-workflows.md)");
    const scripts = packageScripts(snapshot);

    for (const path of files) {
      const id = path.slice(".github/workflows/".length);
      let raw: unknown;
      try {
        raw = params.parseYaml(read(snapshot, path) ?? "");
      } catch (e) {
        evidence.push(`${id}: YAML parse error: ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
      const parsed = WorkflowSchema.safeParse(raw);
      if (!parsed.success) {
        evidence.push(`${id}: schema: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
        continue;
      }
      evidence.push(...checkWorkflowShape(parsed.data, id));
      for (const job of jobsOf(parsed.data)) {
        if (docPath && !documented.has(job)) evidence.push(`${id}: job '${job}' not documented in ${docPath}`);
        if (!scripts) continue;
        parsed.data.jobs[job]?.steps.forEach((s, i) => {
          if (!("run" in s)) return;
          const script = RUN_SCRIPT.exec(s.run.trim())?.[1];
          if (script !== undefined && !scripts.has(script)) evidence.push(`${id}: job ${job} step ${i + 1}: script '${script}' not found in package.json scripts: ${s.run.trim()}`);
        });
      }
    }
    return evidence.length === 0 ? pass("workflowsOk") : fail(evidence, "workflowsInvalid");
  },
};
```

```ts
// src/modules/checks/context-budget.ts
import { fail, pass, type CheckDefinition } from "../check";
import { parseJsonData } from "../json-data";
import { PackSchema } from "../schemas/pack";
import { has, read } from "../snapshot";

const PACK_PATH = "standard/packs/forge614-pack-ecosystem-node/pack.json";
const BUDGET = 3000;

// Coarse token estimate (acta 0020 asks only for an estimate, labeled as
// such in the message): ~4 characters per token.
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export const contextBudgetCheck: CheckDefinition = {
  id: "context-budget",
  appliesWhen: (snapshot) => has(snapshot, PACK_PATH),
  run: (snapshot) => {
    const raw = read(snapshot, PACK_PATH);
    if (raw === undefined) return fail([`${PACK_PATH} missing`], "contextBudgetInvalid");
    const json = parseJsonData(PACK_PATH, raw);
    if (!json.ok) return fail([json.evidence], "dataFileInvalidJson");
    const parsed = PackSchema.safeParse(json.data);
    if (!parsed.success) return fail(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`), "contextBudgetInvalid");

    const evidence: string[] = [];
    let total = 0;
    for (const rule of parsed.data.rules) {
      const firstLine = (read(snapshot, `standard/rules/${rule}/RULE.md`) ?? "").split("\n")[0]?.trim() ?? "";
      const tokens = estimateTokens(`${rule}: ${firstLine}`);
      total += tokens;
      evidence.push(`${rule}: ~${tokens} tokens (estimate)`);
    }
    const p = { tokens: String(total), budget: String(BUDGET) };
    return total > BUDGET ? fail(evidence, "contextBudgetOverBudget", p) : pass("contextBudgetOk", p, evidence);
  },
};
```

Nota: en `forge614-ai` el `pass` de `context-budget` no llevaba evidencia (el tipo `Finding` no lo permitía); en Sentinel la lista de estimaciones por regla se conserva también en el `pass` porque el informe la usa como dato (acta 0020). Las cadenas son las mismas.

- [ ] **Step 4: Ejecutar**

Run: `bun test src/modules/checks/workflows.test.ts src/modules/checks/context-budget.test.ts`
Expected: 3 + 4 pass.

- [ ] **Step 5: Commit (lo hace el propietario)**

```bash
git add src/modules/checks fixtures/workflows fixtures/context-budget
git commit -m "feat(checks): workflows y context-budget trasladadas"
```

---

### Task 13: Comprobaciones trasladadas `ecosystem-contract` y `rules-catalog` (fusiona `packs-catalog`)

**Files:**
- Create: `src/modules/checks/ecosystem-contract.ts` + test + `fixtures/ecosystem-contract/{pass,fail}/`
- Create: `src/modules/checks/rules-catalog.ts` + test + `fixtures/rules-catalog/{pass,fail}/`

**Interfaces:**
- Consumes: `sha256` via `node:crypto` (permitido en `modules`), `params.ecosystemContract`, `RuleManifestSchema`, `PackSchema`, `params.knownCheckIds`, `params.legacyValidatorIds`.
- Produces: `ecosystemContractCheck`, `rulesCatalogCheck`.

- [ ] **Step 1: Fixtures**

`ecosystem-contract/pass/README.md` → `sin copia local\n` (la ausencia pasa). `ecosystem-contract/fail/FORGE614_ECOSYSTEM_CONTRACT.md` → `A \n` (difiere del canónico `A\n` que inyecta el test).

`rules-catalog/pass/standard/rules/forge614-rule-package-naming/manifest.json`:
```json
{
  "schemaVersion": 1,
  "name": "forge614-rule-package-naming",
  "version": "1.0.0",
  "level": "core",
  "title": { "es": "Nombres de paquetes origen-tipo-nombre", "en": "Package names origin-kind-name" },
  "appliesWhen": [],
  "validator": "package-naming",
  "compensates": "structural",
  "decisions": ["0016"]
}
```
`rules-catalog/pass/standard/rules/forge614-rule-package-naming/RULE.md` → `# Nombres de paquetes\n`; `RULE.en.md` → `# Package names\n`.
`rules-catalog/pass/standard/packs/forge614-pack-ecosystem-node/pack.json`:
```json
{ "schemaVersion": 1, "name": "forge614-pack-ecosystem-node", "version": "1.0.0", "title": { "es": "Pack de prueba", "en": "Test pack" }, "rules": ["forge614-rule-package-naming"] }
```

`rules-catalog/fail/standard/rules/forge614-rule-x/manifest.json` (el `name` no coincide con la carpeta y el `validator` no existe):
```json
{
  "schemaVersion": 1,
  "name": "forge614-rule-y",
  "version": "1.0.0",
  "level": "core",
  "title": { "es": "Regla de prueba", "en": "Test rule" },
  "appliesWhen": [],
  "validator": "nope",
  "decisions": ["0016"]
}
```
`rules-catalog/fail/standard/rules/forge614-rule-x/RULE.md` → `# Regla de prueba\n` (sin `RULE.en.md`).
`rules-catalog/fail/standard/packs/forge614-pack-ecosystem-node/pack.json` (nombra una regla que no existe):
```json
{ "schemaVersion": 1, "name": "forge614-pack-ecosystem-node", "version": "1.0.0", "title": { "es": "Pack de prueba", "en": "Test pack" }, "rules": ["forge614-rule-zzz"] }
```

- [ ] **Step 2: Tests (fallan)**

```ts
// src/modules/checks/ecosystem-contract.test.ts
import { expect, test } from "bun:test";
import { testParams } from "../../../tests/helpers/params";
import { snapshotFromDir } from "../../../tests/helpers/snapshot-from-dir";
import { snapshotFrom } from "../snapshot";
import { ecosystemContractCheck } from "./ecosystem-contract";

const params = testParams({ ecosystemContract: "A\n" });

test("root copy must be byte-identical to the canonical text; an absent copy passes", () => {
  expect(ecosystemContractCheck.run(snapshotFromDir("ecosystem-contract/pass"), params).verdict).toBe("pass");
  expect(ecosystemContractCheck.run(snapshotFrom({ "FORGE614_ECOSYSTEM_CONTRACT.md": "A\n" }), params).verdict).toBe("pass");
  const r = ecosystemContractCheck.run(snapshotFromDir("ecosystem-contract/fail"), params);
  expect(r.verdict).toBe("fail");
  expect(r.evidence).toEqual(["FORGE614_ECOSYSTEM_CONTRACT.md differs from the published contract (sha256 mismatch)"]);
});
```

```ts
// src/modules/checks/rules-catalog.test.ts
import { expect, test } from "bun:test";
import { testParams } from "../../../tests/helpers/params";
import { snapshotFromDir } from "../../../tests/helpers/snapshot-from-dir";
import { snapshotFrom } from "../snapshot";
import { rulesCatalogCheck } from "./rules-catalog";

const params = testParams({ knownCheckIds: ["package-naming", "docs-parity"] });

test("applies only when standard/rules or standard/packs exist", () => {
  expect(rulesCatalogCheck.appliesWhen(snapshotFrom({ "README.md": "" }), params)).toBe(false);
  expect(rulesCatalogCheck.appliesWhen(snapshotFromDir("rules-catalog/pass"), params)).toBe(true);
});

test("catalog: manifest valid, folder = name, RULE.md + RULE.en.md, validator known, pack rules exist", () => {
  expect(rulesCatalogCheck.run(snapshotFromDir("rules-catalog/pass"), params).verdict).toBe("pass");
  const r = rulesCatalogCheck.run(snapshotFromDir("rules-catalog/fail"), params);
  expect(r.evidence).toEqual(
    expect.arrayContaining([
      "forge614-rule-x: manifest.name 'forge614-rule-y' differs from folder",
      "forge614-rule-x: unknown validator 'nope'",
      "forge614-rule-x: missing RULE.en.md",
      "forge614-pack-ecosystem-node: rule 'forge614-rule-zzz' not found in standard/rules",
    ]),
  );
});

test("a legacy validator id (bilingual-docs) is known through the legacy map", () => {
  const manifest = JSON.stringify({ schemaVersion: 1, name: "forge614-rule-bilingual-docs", version: "1.0.0", level: "core", title: { es: "t", en: "t" }, appliesWhen: [], validator: "bilingual-docs", decisions: ["0002"] });
  const s = snapshotFrom({ "standard/rules/forge614-rule-bilingual-docs/manifest.json": manifest, "standard/rules/forge614-rule-bilingual-docs/RULE.md": "#", "standard/rules/forge614-rule-bilingual-docs/RULE.en.md": "#" });
  expect(rulesCatalogCheck.run(s, params).verdict).toBe("pass");
});

test("invalid JSON in a manifest or pack is evidence, never a throw; missing manifest is reported; pack name must match folder", () => {
  const s = snapshotFrom({
    "standard/rules/forge614-rule-x/manifest.json": "{ not json",
    "standard/rules/forge614-rule-z/RULE.md": "# r",
    "standard/packs/forge614-pack-ecosystem-node/pack.json": JSON.stringify({ schemaVersion: 1, name: "forge614-pack-other", version: "1.0.0", title: { es: "n", en: "n" }, rules: ["forge614-rule-z"] }),
  });
  const r = rulesCatalogCheck.run(s, params);
  expect(r.verdict).toBe("fail");
  expect(r.evidence).toEqual(
    expect.arrayContaining([
      "forge614-rule-z: missing manifest.json",
      "forge614-pack-ecosystem-node: pack name 'forge614-pack-other' differs from folder",
      "forge614-pack-ecosystem-node: rule 'forge614-rule-z' not found in standard/rules",
    ]),
  );
  expect(r.evidence.some((e) => e.startsWith("standard/rules/forge614-rule-x/manifest.json: invalid JSON: "))).toBe(true);
});
```

- [ ] **Step 3: Implementar**

```ts
// src/modules/checks/ecosystem-contract.ts
import { createHash } from "node:crypto";
import { fail, pass, type CheckDefinition } from "../check";
import { read } from "../snapshot";

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

// A local copy of FORGE614_ECOSYSTEM_CONTRACT.md is optional (repositories
// reference it by pointer), but when present it must be byte-identical to
// the one the loaded standard carries.
export const ecosystemContractCheck: CheckDefinition = {
  id: "ecosystem-contract",
  appliesWhen: () => true,
  run: (snapshot, params) => {
    const local = read(snapshot, "FORGE614_ECOSYSTEM_CONTRACT.md");
    if (local === undefined || sha256(local) === sha256(params.ecosystemContract)) return pass("ecosystemContractOk");
    return fail(["FORGE614_ECOSYSTEM_CONTRACT.md differs from the published contract (sha256 mismatch)"], "ecosystemContractDiverged");
  },
};
```

```ts
// src/modules/checks/rules-catalog.ts
import { fail, pass, type CheckDefinition } from "../check";
import { parseJsonData } from "../json-data";
import { PackSchema } from "../schemas/pack";
import { RuleManifestSchema } from "../schemas/rule-manifest";
import { has, hasDirectory, listUnder, read } from "../snapshot";

// Rules catalog and packs catalog in one check (spec §8.1): the evidence
// strings are the ones forge614-ai's two validators produced, rules first,
// then packs, then the invalid-JSON lines each of them appended.
export const rulesCatalogCheck: CheckDefinition = {
  id: "rules-catalog",
  appliesWhen: (snapshot) => hasDirectory(snapshot, "standard/rules") || hasDirectory(snapshot, "standard/packs"),
  run: (snapshot, params) => {
    const evidence: string[] = [];
    const invalidJson: string[] = [];
    const known = new Set([...params.knownCheckIds, ...Object.keys(params.legacyValidatorIds)]);

    const dirs = new Set(listUnder(snapshot, "standard/rules/").map((p) => p.split("/")[2] ?? ""));
    for (const dir of [...dirs].sort()) {
      const base = `standard/rules/${dir}/`;
      const raw = read(snapshot, `${base}manifest.json`);
      if (raw === undefined) {
        evidence.push(`${dir}: missing manifest.json`);
        continue;
      }
      const json = parseJsonData(`${base}manifest.json`, raw);
      if (!json.ok) {
        invalidJson.push(json.evidence);
        continue;
      }
      const parsed = RuleManifestSchema.safeParse(json.data);
      if (!parsed.success) {
        evidence.push(`${dir}: invalid manifest: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
        continue;
      }
      if (parsed.data.name !== dir) evidence.push(`${dir}: manifest.name '${parsed.data.name}' differs from folder`);
      if (parsed.data.validator !== undefined && !known.has(parsed.data.validator)) evidence.push(`${dir}: unknown validator '${parsed.data.validator}'`);
      if (!has(snapshot, `${base}RULE.md`)) evidence.push(`${dir}: missing RULE.md`);
      if (!has(snapshot, `${base}RULE.en.md`)) evidence.push(`${dir}: missing RULE.en.md`);
    }

    for (const path of listUnder(snapshot, "standard/packs/").filter((p) => p.endsWith("/pack.json"))) {
      const dir = path.split("/")[2] ?? "";
      const json = parseJsonData(path, read(snapshot, path) ?? "{}");
      if (!json.ok) {
        invalidJson.push(json.evidence);
        continue;
      }
      const parsed = PackSchema.safeParse(json.data);
      if (!parsed.success) {
        evidence.push(`${dir}: invalid pack.json`);
        continue;
      }
      if (parsed.data.name !== dir) evidence.push(`${dir}: pack name '${parsed.data.name}' differs from folder`);
      for (const rule of parsed.data.rules) if (!has(snapshot, `standard/rules/${rule}/manifest.json`)) evidence.push(`${dir}: rule '${rule}' not found in standard/rules`);
    }

    const all = [...evidence, ...invalidJson];
    return all.length === 0 ? pass("rulesCatalogOk") : fail(all, "rulesCatalogInvalid");
  },
};
```

- [ ] **Step 4: Ejecutar**

Run: `bun test src/modules/checks/ecosystem-contract.test.ts src/modules/checks/rules-catalog.test.ts`
Expected: 1 + 4 pass.

- [ ] **Step 5: Commit (lo hace el propietario)**

```bash
git add src/modules/checks fixtures/ecosystem-contract fixtures/rules-catalog
git commit -m "feat(checks): ecosystem-contract y rules-catalog (con packs) trasladadas; 11 de 11 portadas"
```

---

### Task 14: Comprobaciones nuevas `node-pointer` y `layout`

**Files:**
- Create: `src/modules/checks/node-pointer.ts` + test + `fixtures/node-pointer/{pass,fail}/`
- Create: `src/modules/checks/layout.ts` + test + `fixtures/layout/{pass,fail}/`

**Interfaces:**
- Consumes: `params.pointer`, `params.standard`, `params.layout`, `params.templates`, `hasDirectory`, `has`, `listUnder`.
- Produces: `nodePointerCheck`, `layoutCheck`.

- [ ] **Step 1: Fixtures**

`node-pointer/pass/forge614.node.json`: puntero `demo` con la huella real `18d4455f…`. `node-pointer/fail/forge614.node.json`: igual con `sha256` = 64 ceros. (La comprobación usa `params.pointer`; las fixtures documentan el caso y cumplen la regla "cada comprobación tiene `pass` y `fail`". A nivel de repositorio, un puntero editado a mano con otra huella nunca llega a esta comprobación: `checkRepository` lo corta antes con `STANDARD_CORRUPT`, porque la huella declarada no coincide con `SHA256SUMS` de la release ni con la caché (Task 21 y Task 27). `node-pointer` da `fail` en una revisión forzada con `--standard` cuando la versión declarada está en caché con otra huella, y `caution` cuando no está.)

`layout/pass/`: un archivo vacío en cada carpeta obligatoria (`src/modules/index.ts`, `src/app/index.ts`, `src/infrastructure/index.ts`, `src/interfaces/cli/main.ts`, `docs/es/00-a.md`, `docs/en/00-a.md`, `docs/decisions/INDEX.json`, `.github/workflows/verify.yml`) y los archivos obligatorios (`CONTRACT.md`, `README.md`, `.githooks/pre-push`, `.agents/templates/plan.md`).
`layout/fail/`: solo `README.md`, `src/modules/index.ts` y `scripts/install.sh` (duplica una plantilla).

- [ ] **Step 2: Tests (fallan)**

```ts
// src/modules/checks/node-pointer.test.ts
import { expect, test } from "bun:test";
import { DEMO_POINTER, SHA, testParams } from "../../../tests/helpers/params";
import { snapshotFrom } from "../snapshot";
import { nodePointerCheck } from "./node-pointer";

const OTHER = "0".repeat(64);

test("passes when the pointer's sha256 equals the cached archive of the declared version", () => {
  const r = nodePointerCheck.run(snapshotFrom({}), testParams());
  expect(r.verdict).toBe("pass");
  expect(r.evidence).toEqual([]);
});

test("fails with both fingerprints in the evidence when they differ (hand-edited pointer or changed release)", () => {
  const params = testParams({ pointer: { ...DEMO_POINTER, standard: { version: "1.0.0", sha256: OTHER } } });
  const r = nodePointerCheck.run(snapshotFrom({}), params);
  expect(r.verdict).toBe("fail");
  expect(r.messageKey).toBe("nodePointerMismatch");
  expect(r.evidence).toEqual([`forge614.node.json standard.sha256 ${OTHER} vs cached standard-1.0.0.tar.gz ${SHA}`]);
});

test("is caution, never pass, when the declared version is not cached (forced run with another version)", () => {
  const params = testParams({ standard: { version: "1.1.0", sha256: OTHER, pointerVersionSha256: undefined } });
  const r = nodePointerCheck.run(snapshotFrom({}), params);
  expect(r.verdict).toBe("caution");
  expect(r.messageKey).toBe("nodePointerUnverifiable");
  expect(r.evidence).toEqual(["standard 1.0.0 declared by forge614.node.json is not cached; this run used 1.1.0 (--standard)"]);
});

test("a forced run whose declared version IS cached still cross-checks it and notes the forced version", () => {
  const params = testParams({ standard: { version: "1.1.0", sha256: OTHER, pointerVersionSha256: SHA } });
  const r = nodePointerCheck.run(snapshotFrom({}), params);
  expect(r.verdict).toBe("pass");
  expect(r.evidence).toEqual(["checked against standard 1.1.0 (--standard); forge614.node.json declares 1.0.0"]);
});
```

```ts
// src/modules/checks/layout.test.ts
import { expect, test } from "bun:test";
import { testParams } from "../../../tests/helpers/params";
import { snapshotFromDir } from "../../../tests/helpers/snapshot-from-dir";
import { snapshotFrom } from "../snapshot";
import { layoutCheck } from "./layout";

const params = testParams({ templates: new Map([["install.sh", "#!"], ["verify.yml", "name: verify"], ["hooks/pre-push", "#!"]]) });

test("passes with every mandatory directory and file, declaring the builtin list for standard 1.0.0", () => {
  const r = layoutCheck.run(snapshotFromDir("layout/pass"), params);
  expect(r.verdict).toBe("pass");
  expect(r.evidence).toEqual(["layout list source: builtin (standard 1.0.0 ships no layout.json)"]);
});

test("lists every missing directory and file, and scripts/ files that duplicate a template", () => {
  const r = layoutCheck.run(snapshotFromDir("layout/fail"), params);
  expect(r.verdict).toBe("fail");
  expect(r.evidence).toEqual([
    "layout list source: builtin (standard 1.0.0 ships no layout.json)",
    "missing directory src/app/",
    "missing directory src/infrastructure/",
    "missing directory src/interfaces/",
    "missing directory docs/es/",
    "missing directory docs/en/",
    "missing directory docs/decisions/",
    "missing directory .github/workflows/",
    "missing file CONTRACT.md",
    "missing file .githooks/pre-push",
    "missing file .agents/templates/plan.md",
    "scripts/install.sh duplicates the standard template install.sh",
  ]);
});

test("when the standard ships layout.json the evidence names it instead", () => {
  const p = testParams({ layout: { directories: ["src"], files: ["README.md"], source: "standard/layout.json" } });
  const r = layoutCheck.run(snapshotFrom({ "src/a.ts": "", "README.md": "" }), p);
  expect(r.verdict).toBe("pass");
  expect(r.evidence).toEqual(["layout list source: standard/layout.json"]);
});
```

- [ ] **Step 3: Implementar**

```ts
// src/modules/checks/node-pointer.ts
import { caution, fail, pass, type CheckDefinition } from "../check";

// The pointer already parsed against NodePointerSchema (a repository whose
// pointer does not parse never reaches the checks: NODE_POINTER_INVALID).
// What remains is the cross fingerprint of spec §5.6.
export const nodePointerCheck: CheckDefinition = {
  id: "node-pointer",
  appliesWhen: () => true,
  run: (_snapshot, params) => {
    const declared = params.pointer.standard;
    const forced = declared.version !== params.standard.version;
    const cached = params.standard.pointerVersionSha256;
    if (cached === undefined) {
      return caution([`standard ${declared.version} declared by forge614.node.json is not cached; this run used ${params.standard.version} (--standard)`], "nodePointerUnverifiable");
    }
    if (declared.sha256 !== cached) {
      return fail([`forge614.node.json standard.sha256 ${declared.sha256} vs cached standard-${declared.version}.tar.gz ${cached}`], "nodePointerMismatch");
    }
    const evidence = forced ? [`checked against standard ${params.standard.version} (--standard); forge614.node.json declares ${declared.version}`] : [];
    return pass("nodePointerOk", {}, evidence);
  },
};
```

```ts
// src/modules/checks/layout.ts
import { fail, pass, type CheckDefinition } from "../check";
import { has, hasDirectory, listUnder } from "../snapshot";

function basename(path: string): string {
  return path.split("/").at(-1) ?? path;
}

export const layoutCheck: CheckDefinition = {
  id: "layout",
  appliesWhen: () => true,
  run: (snapshot, params) => {
    const evidence: string[] = [
      params.layout.source === "builtin"
        ? `layout list source: builtin (standard ${params.standard.version} ships no layout.json)`
        : "layout list source: standard/layout.json",
    ];
    let problems = 0;
    for (const dir of params.layout.directories) {
      if (!hasDirectory(snapshot, dir)) {
        evidence.push(`missing directory ${dir}/`);
        problems += 1;
      }
    }
    for (const file of params.layout.files) {
      if (!has(snapshot, file)) {
        evidence.push(`missing file ${file}`);
        problems += 1;
      }
    }
    // STANDARD §2: scripts/ holds only what the standard does not provide.
    const templateNames = new Set([...params.templates.keys()].map(basename));
    for (const path of listUnder(snapshot, "scripts/")) {
      const name = basename(path);
      if (templateNames.has(name)) {
        evidence.push(`${path} duplicates the standard template ${name}`);
        problems += 1;
      }
    }
    return problems === 0 ? pass("layoutOk", {}, evidence) : fail(evidence, "layoutIncomplete");
  },
};
```

- [ ] **Step 4: Ejecutar**

Run: `bun test src/modules/checks/node-pointer.test.ts src/modules/checks/layout.test.ts`
Expected: 4 + 3 pass.

- [ ] **Step 5: Commit (lo hace el propietario)**

```bash
git add src/modules/checks fixtures/node-pointer fixtures/layout
git commit -m "feat(checks): node-pointer con huella cruzada y layout con lista embebida para 1.0.0"
```

---

### Task 15: Comprobaciones nuevas `stack` y `secrets-hygiene`

**Files:**
- Create: `src/modules/source-text.ts`, `src/modules/source-text.test.ts` (quitar comentarios y cadenas de código TypeScript; quitar comentarios de JSONC)
- Create: `src/modules/checks/stack.ts` + test + `fixtures/stack/{pass,fail}/`
- Create: `src/modules/checks/secrets-hygiene.ts` + test + `fixtures/secrets-hygiene/{pass,fail}/`

**Interfaces:**
- Consumes: `params.stack`, `params.secrets`, `compareSemver`; en tests, `takeSnapshot` (Task 8), `repoRoot` (Task 1) y `run` (Task 5).
- Produces: `stackCheck`, `secretsHygieneCheck`, `stripCommentsAndStrings(ts: string): string` (blanks comments, string contents and regular-expression bodies, keeps newlines), `stripJsonComments(jsonc: string): string`.

- [ ] **Step 1: Fixtures**

`stack/pass/`: `tsconfig.json` con las tres banderas en `true`; `bun.lock` (`{}`); `package.json` con `"engines": { "bun": ">=1.3.9" }`; `src/app/a.ts` con `const anyFileMatches = 1; // any comment is fine\nexport const s = "as any in a string";\nexport { anyFileMatches };\n`.
`stack/fail/`: `tsconfig.json` con `strict: true` y sin las otras dos; sin `bun.lock`; `package.json` con `"engines": { "bun": ">=1.2.0" }`; `src/app/bad.ts` con `export function f(x: any): void {\n  // @ts-ignore\n  return x;\n}\n// @ts-expect-error\nexport const y = 1;\n`; `src/app/bad.spec-fixture.ts` con `const z: any = 1;\n` (hace de archivo de test: no puede llamarse `*.test.ts` porque `bun test` lo ejecutaría; el test lo renombra a `bad.test.ts` en memoria para probar la exclusión).

`secrets-hygiene/pass/README.md` → `nada que ver\n`; `secrets-hygiene/pass/.env.example` → `API_KEY=\nDB_URL=<your url>\n`.
`secrets-hygiene/fail/src/config.ts` → una línea con `AKIA` + `IOSFODNN7EXAMPLE` (escribirla concatenada en la fixture no es posible: el archivo contiene el literal `AKIAIOSFODNN7EXAMPLE`; por eso `fixtures/` está en `excludePaths` embebidas y Sentinel no se marca a sí mismo); `secrets-hygiene/fail/keys/server.pem` → `-----BEGIN RSA PRIVATE KEY-----\nMIIB\n-----END RSA PRIVATE KEY-----\n` (`fs-tree.ts` lee `.pem` y `.key` como texto desde Task 5); `secrets-hygiene/fail/.env` → `DB_URL=postgres://user:secret@db.internal/app\nEMPTY=\n`.

- [ ] **Step 2: Tests (fallan)**

```ts
// src/modules/source-text.test.ts
import { expect, test } from "bun:test";
import { stripCommentsAndStrings, stripJsonComments } from "./source-text";

test("stripCommentsAndStrings blanks line comments, block comments and string/template contents but keeps line count", () => {
  const src = 'const a = "any"; // any here\nconst b = `x ${y} any`; /* any\nany */ const c: any = 1;\n';
  const out = stripCommentsAndStrings(src);
  expect(out.split("\n")).toHaveLength(src.split("\n").length);
  expect(out).not.toContain('"any"');
  expect(out).toContain("const c: any = 1;");
  expect(/\bany\b/.test(out.split("\n")[0] ?? "")).toBe(false);
});

test("quotes and backticks inside a regular expression literal are not string delimiters; division is not a regex", () => {
  const src = "const re = /[\"'`]/g;\nconst t: any = 1;\nconst half = a / 2; const b = c / d;\nconst p = /<any>|as any/;\n";
  const out = stripCommentsAndStrings(src).split("\n");
  expect(out).toHaveLength(5);
  expect(out[0]).toBe("const re = //g;");
  expect(out[1]).toBe("const t: any = 1;");
  expect(out[2]).toBe("const half = a / 2; const b = c / d;");
  expect(out[3]).toBe("const p = //;");
});

test("stripJsonComments removes // and /* */ outside strings", () => {
  expect(JSON.parse(stripJsonComments('{ // c\n "a": "http://x", /* b */ "b": 1 }'))).toEqual({ a: "http://x", b: 1 });
});
```

```ts
// src/modules/checks/stack.test.ts
import { expect, test } from "bun:test";
import { testParams } from "../../../tests/helpers/params";
import { snapshotFromDir } from "../../../tests/helpers/snapshot-from-dir";
import { repoRoot } from "../../app/repo";
import { takeSnapshot } from "../../app/take-snapshot";
import { snapshotFrom, type RepoSnapshot } from "../snapshot";
import { stackCheck } from "./stack";

const params = testParams();
const BUILTIN_NOTE = "stack rules source: builtin (standard 1.0.0 ships no stack.json)";

// A fixture cannot be named *.test.ts (bun test would run it), so the test
// file of stack/fail is stored as bad.spec-fixture.ts and renamed here to
// the path the check must skip.
function failTree(): RepoSnapshot {
  const s = snapshotFromDir("stack/fail");
  return { files: new Map([...s.files].map(([p, text]) => [p.replace(/\.spec-fixture\.ts$/, ".test.ts"), text] as const)), facts: s.facts };
}

test("applies when package.json or tsconfig.json exists", () => {
  expect(stackCheck.appliesWhen(snapshotFrom({ "README.md": "" }), params)).toBe(false);
  expect(stackCheck.appliesWhen(snapshotFrom({ "package.json": "{}" }), params)).toBe(true);
});

test("passes on the conforming fixture, with the builtin-list note", () => {
  const r = stackCheck.run(snapshotFromDir("stack/pass"), params);
  expect(r.verdict).toBe("pass");
  expect(r.evidence).toEqual([BUILTIN_NOTE]);
});

test("reports every violation: flags, any, ts-ignore, ts-expect-error, bun.lock, engines.bun", () => {
  const r = stackCheck.run(failTree(), params);
  expect(r.verdict).toBe("fail");
  expect(r.evidence).toEqual([
    BUILTIN_NOTE,
    "tsconfig.json: compilerOptions.noUncheckedIndexedAccess is not true",
    "tsconfig.json: compilerOptions.exactOptionalPropertyTypes is not true",
    "src/app/bad.ts:1: any",
    "src/app/bad.ts:2: @ts-ignore",
    "src/app/bad.ts:5: @ts-expect-error",
    "bun.lock missing",
    "package.json: engines.bun '>=1.2.0' is below the minimum 1.3.9",
  ]);
});

test("test files under src/ are excluded (bad.spec-fixture.ts stands in for bad.test.ts)", () => {
  expect(stackCheck.run(failTree(), params).evidence.some((e) => e.startsWith("src/app/bad.test.ts"))).toBe(false);
  expect(stackCheck.run(snapshotFromDir("stack/fail"), params).evidence).toContain("src/app/bad.spec-fixture.ts:1: any");
});

test("missing tsconfig.json, missing engines and unparsable JSON are evidence", () => {
  const r = stackCheck.run(snapshotFrom({ "package.json": "{}", "bun.lock": "" }), params);
  expect(r.evidence).toEqual(expect.arrayContaining(["tsconfig.json missing", "package.json: engines.bun missing"]));
  const bad = stackCheck.run(snapshotFrom({ "package.json": "{ nope", "tsconfig.json": "{ nope", "bun.lock": "" }), params);
  expect(bad.evidence).toEqual(expect.arrayContaining(["tsconfig.json: invalid JSON", "package.json: invalid JSON"]));
});

const conforming = {
  "tsconfig.json": '{ // comment\n "compilerOptions": { "strict": true, "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": true } }',
  "package.json": JSON.stringify({ engines: { bun: ">=1.4.2" } }),
  "bun.lock": "",
};

test("tsconfig with comments (JSONC) is accepted; 'any' inside comments, strings and identifiers is not a hit", () => {
  const s = snapshotFrom({ ...conforming, "src/a.ts": 'const anyThing = "any"; // any\nexport const t = anyThing; /* as any */\nexport const p = Promise.any([]);\n' });
  expect(stackCheck.run(s, params).verdict).toBe("pass");
});

test("every type position of any is a hit: annotation, assertion, type argument and array", () => {
  const src = "let a: any;\nconst b = x as any;\nconst c = new Map<string, any>();\nconst d: Array<any> = [];\nconst e: any[] = [];\n";
  const r = stackCheck.run(snapshotFrom({ ...conforming, "src/a.ts": src }), params);
  expect(r.evidence.filter((line) => line.startsWith("src/"))).toEqual(["src/a.ts:1: any", "src/a.ts:2: any", "src/a.ts:3: any", "src/a.ts:4: any", "src/a.ts:5: any"]);
});

test("regex literals, strings and prose never produce any or directive hits", () => {
  const src = "const re = /[\"'`]/;\nconst p = /<any>|as any|: any/;\nexport const note = \"use @ts-ignore never\";\n// we never write @ts-ignore here\n";
  expect(stackCheck.run(snapshotFrom({ ...conforming, "src/b.ts": src }), params).verdict).toBe("pass");
});

test("Sentinel's own src/ has no stack hits (the check passes on the repository that ships it)", () => {
  const r = stackCheck.run(takeSnapshot(repoRoot), params);
  expect(r.evidence.filter((line) => line.startsWith("src/"))).toEqual([]);
});
```

```ts
// src/modules/checks/secrets-hygiene.test.ts
import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { run } from "../../infrastructure/process";
import { testParams } from "../../../tests/helpers/params";
import { snapshotFromDir } from "../../../tests/helpers/snapshot-from-dir";
import { snapshotFrom } from "../snapshot";
import { secretsHygieneCheck } from "./secrets-hygiene";

const params = testParams();
// Samples are concatenated so this test file never contains a literal that
// matches a pattern when Sentinel checks its own tree.
const AWS = ["AKIA", "IOSFODNN7EXAMPLE"].join("");
const GH = ["ghp_", "a".repeat(36)].join("");

test("passes on a clean tree and on an .env.example with empty or placeholder values", () => {
  const r = secretsHygieneCheck.run(snapshotFromDir("secrets-hygiene/pass"), params);
  expect(r.verdict).toBe("pass");
  expect(r.evidence).toEqual(["secret patterns source: builtin (standard 1.0.0 ships no secret-patterns.json)"]);
});

test("reports pattern id and location, never the value", () => {
  const r = secretsHygieneCheck.run(snapshotFromDir("secrets-hygiene/fail"), params);
  expect(r.verdict).toBe("fail");
  expect(r.evidence).toEqual([
    "secret patterns source: builtin (standard 1.0.0 ships no secret-patterns.json)",
    ".env:1: connection-string-with-credentials",
    ".env:1: .env value for DB_URL",
    "keys/server.pem:1: private-key",
    "src/config.ts:1: aws-access-key-id",
  ]);
  expect(r.evidence.join("\n")).not.toContain("secret@");
});

test("honors excludePaths from the standard (fixtures/ in the builtin list) and detects tokens", () => {
  const s = snapshotFrom({ "fixtures/x/a.ts": `const k = "${AWS}";`, "src/b.ts": `const t = "${GH}";` });
  const r = secretsHygieneCheck.run(s, params);
  expect(r.evidence).toEqual(expect.arrayContaining(["src/b.ts:1: github-token"]));
  expect(r.evidence.some((e) => e.startsWith("fixtures/"))).toBe(false);
});

// .gitignore ignores .env and *.pem everywhere and re-includes them under
// fixtures/ only. Without that, the fail fixture would never be committed
// and this check's tests would fail in CI only.
const REPO_ROOT = resolve(import.meta.dir, "../../..");
test.skipIf(Bun.which("git") === null || !existsSync(join(REPO_ROOT, ".git")))("git lists the fail fixture's .env and keys/server.pem (they are not ignored)", () => {
  const r = run(["git", "ls-files", "--cached", "--others", "--exclude-standard", "fixtures/secrets-hygiene/fail"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(0);
  const listed = r.stdout.split("\n").filter((line) => line !== "");
  expect(listed).toEqual(expect.arrayContaining(["fixtures/secrets-hygiene/fail/.env", "fixtures/secrets-hygiene/fail/keys/server.pem"]));
});

test(".env.example, .env.sample and .env.template are never flagged for values; a real .env with a placeholder is not either", () => {
  const s = snapshotFrom({ ".env.example": "K=real-looking-value\n", ".env.sample": "K=v\n", ".env": "K=<fill me>\nJ=${VAR}\nL=changeme\n" });
  expect(secretsHygieneCheck.run(s, params).verdict).toBe("pass");
});
```

- [ ] **Step 3: Implementar `source-text.ts`**

```ts
// src/modules/source-text.ts
// Character-level scanners for the two text shapes the stack check reads:
// TypeScript source (comments, string contents and regular-expression bodies
// are blanked, newlines are kept so line numbers survive) and JSONC
// (comments are removed).

// A "/" starts a regular-expression literal, not a division, when the last
// significant character before it is an operator, an opening bracket, a
// separator or nothing, or when it follows a keyword that takes an
// expression. Without this, a quote inside a pattern such as /["'`]/ would
// open a fake string and blank the rest of the file.
const REGEX_PRECEDERS = new Set(["", "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "<", ">", "~", "^"]);
const REGEX_KEYWORDS = /\b(?:return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/;

function startsRegex(before: string): boolean {
  const trimmed = before.trimEnd();
  return REGEX_PRECEDERS.has(trimmed.slice(-1)) || REGEX_KEYWORDS.test(trimmed);
}

export function stripCommentsAndStrings(source: string): string {
  let out = "";
  let i = 0;
  const n = source.length;
  while (i < n) {
    const c = source[i] ?? "";
    const next = source[i + 1] ?? "";
    if (c === "/" && next === "/") {
      while (i < n && source[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) {
        if (source[i] === "\n") out += "\n";
        i += 1;
      }
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      out += quote;
      i += 1;
      while (i < n && source[i] !== quote) {
        if (source[i] === "\\") i += 1;
        if (source[i] === "\n") out += "\n";
        i += 1;
      }
      out += quote;
      i += 1;
      continue;
    }
    if (c === "/" && startsRegex(out)) {
      // Regular-expression literal: keep both slashes, blank the body (an
      // escaped "/" or one inside a [...] class does not end it). A literal
      // never spans lines; the flags after it are copied as ordinary text.
      out += "/";
      i += 1;
      let inClass = false;
      while (i < n && source[i] !== "\n") {
        const ch = source[i];
        if (ch === "\\") {
          i += 2;
          continue;
        }
        if (ch === "[") inClass = true;
        else if (ch === "]") inClass = false;
        else if (ch === "/" && !inClass) break;
        i += 1;
      }
      if (source[i] === "/") {
        out += "/";
        i += 1;
      }
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

export function stripJsonComments(jsonc: string): string {
  let out = "";
  let i = 0;
  const n = jsonc.length;
  while (i < n) {
    const c = jsonc[i] ?? "";
    const next = jsonc[i + 1] ?? "";
    if (c === '"') {
      out += c;
      i += 1;
      while (i < n && jsonc[i] !== '"') {
        if (jsonc[i] === "\\") {
          out += jsonc[i] ?? "";
          i += 1;
        }
        out += jsonc[i] ?? "";
        i += 1;
      }
      out += '"';
      i += 1;
      continue;
    }
    if (c === "/" && next === "/") {
      while (i < n && jsonc[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(jsonc[i] === "*" && jsonc[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}
```

- [ ] **Step 4: Implementar `stack.ts`**

```ts
// src/modules/checks/stack.ts
import { z } from "zod";
import { fail, pass, type CheckDefinition } from "../check";
import { compareSemver } from "../semver";
import { has, read } from "../snapshot";
import { stripCommentsAndStrings, stripJsonComments } from "../source-text";

const TsConfig = z.object({ compilerOptions: z.record(z.string(), z.unknown()).optional() }).passthrough();
const PackageEngines = z.object({ engines: z.object({ bun: z.string().optional() }).passthrough().optional() }).passthrough();
// `any` only where it is a type: annotation (`x: any`, `): any`), assertion
// (`as any`), type argument (`<any>`, `Record<string, any>`) and array
// (`any[]`). The scan runs on code whose comments, strings and regex bodies
// are blanked, so "any" in prose, in a message or in a pattern is never a hit.
const ANY_TYPE_RE = /:\s*any\b|\bas\s+any\b|<\s*any\s*>|,\s*any\s*>|\bany\s*\[\s*\]/;
// A suppression directive is a comment that starts with it, never the word
// inside a string or in the middle of a sentence.
const TS_DIRECTIVE = /^\s*(?:\/\/|\/\*+)\s*@ts-(ignore|expect-error)\b/;
const ENGINE_RE = /^\s*(?:>=|\^|~)?\s*(\d+\.\d+\.\d+)/;

function parseJson<T>(schema: z.ZodType<T>, raw: string, jsonc: boolean): T | null {
  try {
    const parsed = schema.safeParse(JSON.parse(jsonc ? stripJsonComments(raw) : raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const stackCheck: CheckDefinition = {
  id: "stack",
  appliesWhen: (snapshot) => has(snapshot, "package.json") || has(snapshot, "tsconfig.json"),
  run: (snapshot, params) => {
    const evidence: string[] = [
      params.stack.source === "builtin" ? `stack rules source: builtin (standard ${params.standard.version} ships no stack.json)` : "stack rules source: standard/stack.json",
    ];
    let problems = 0;
    const flag = (line: string): void => {
      evidence.push(line);
      problems += 1;
    };

    const tsconfigRaw = read(snapshot, "tsconfig.json");
    if (tsconfigRaw === undefined) flag("tsconfig.json missing");
    else {
      const tsconfig = parseJson(TsConfig, tsconfigRaw, true);
      if (tsconfig === null) flag("tsconfig.json: invalid JSON");
      else for (const f of params.stack.tsconfigFlags) if (tsconfig.compilerOptions?.[f] !== true) flag(`tsconfig.json: compilerOptions.${f} is not true`);
    }

    for (const [path, text] of snapshot.files) {
      if (!path.startsWith("src/") || !path.endsWith(".ts") || path.endsWith(".test.ts")) continue;
      const code = stripCommentsAndStrings(text).split("\n");
      text.split("\n").forEach((line, i) => {
        if (ANY_TYPE_RE.test(code[i] ?? "")) flag(`${path}:${i + 1}: any`);
        const directive = TS_DIRECTIVE.exec(line)?.[1];
        if (directive !== undefined) flag(`${path}:${i + 1}: @ts-${directive}`);
      });
    }

    if (!has(snapshot, "bun.lock")) flag("bun.lock missing");

    const pkgRaw = read(snapshot, "package.json");
    if (pkgRaw === undefined) flag("package.json missing");
    else {
      const pkg = parseJson(PackageEngines, pkgRaw, false);
      if (pkg === null) flag("package.json: invalid JSON");
      else {
        const engine = pkg.engines?.bun;
        if (engine === undefined) flag("package.json: engines.bun missing");
        else {
          const version = ENGINE_RE.exec(engine)?.[1];
          if (version === undefined) flag(`package.json: engines.bun '${engine}' is not a version constraint`);
          else if (compareSemver(version, params.stack.minimumBun) < 0) flag(`package.json: engines.bun '${engine}' is below the minimum ${params.stack.minimumBun}`);
        }
      }
    }
    return problems === 0 ? pass("stackOk", {}, evidence) : fail(evidence, "stackViolations");
  },
};
```

Nota sobre el orden de la evidencia: tsconfig, luego archivos de `src/` en el orden del `Map` (ordenado por ruta al construir el snapshot), luego `bun.lock`, luego `package.json`. El test de la fixture `fail` fija ese orden.

- [ ] **Step 5: Implementar `secrets-hygiene.ts`**

```ts
// src/modules/checks/secrets-hygiene.ts
import { fail, pass, type CheckDefinition } from "../check";

const ENV_FILE = /^\.env(?:\..+)?$/;
const ENV_EXAMPLE = /^\.env\.(?:example|sample|template|dist)$/;
const ENV_LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;
const PLACEHOLDER = /^(?:<.*>|\$\{.*\}|changeme|change-me|xxx+|todo|your[-_].*|)$/i;

function basename(path: string): string {
  return path.split("/").at(-1) ?? path;
}

function isExcluded(path: string, excludePaths: readonly string[]): boolean {
  return excludePaths.some((ex) => (ex.endsWith("/") ? path.startsWith(ex) : path === ex));
}

function unquote(value: string): string {
  const v = value.trim().replace(/\s+#.*$/, "");
  return /^(["']).*\1$/.test(v) ? v.slice(1, -1) : v;
}

// Evidence names the pattern and the location, never the matched text: the
// report travels through CI logs.
export const secretsHygieneCheck: CheckDefinition = {
  id: "secrets-hygiene",
  appliesWhen: () => true,
  run: (snapshot, params) => {
    const evidence: string[] = [
      params.secrets.source === "builtin"
        ? `secret patterns source: builtin (standard ${params.standard.version} ships no secret-patterns.json)`
        : "secret patterns source: standard/secret-patterns.json",
    ];
    const matchers = params.secrets.patterns.map((p) => [p.id, new RegExp(p.pattern)] as const);
    const hits: string[] = [];
    for (const [path, text] of snapshot.files) {
      if (isExcluded(path, params.secrets.excludePaths)) continue;
      const name = basename(path);
      const envWithValues = ENV_FILE.test(name) && !ENV_EXAMPLE.test(name);
      text.split("\n").forEach((line, i) => {
        for (const [id, re] of matchers) if (re.test(line)) hits.push(`${path}:${i + 1}: ${id}`);
        if (!envWithValues) return;
        const m = ENV_LINE.exec(line);
        if (m?.[1] !== undefined && !PLACEHOLDER.test(unquote(m[2] ?? ""))) hits.push(`${path}:${i + 1}: .env value for ${m[1]}`);
      });
    }
    return hits.length === 0 ? pass("secretsNone", {}, evidence) : fail([...evidence, ...hits], "secretsFound");
  },
};
```

- [ ] **Step 6: Ejecutar**

Run: `bun run typecheck && bun test src/modules/source-text.test.ts src/modules/checks/stack.test.ts src/modules/checks/secrets-hygiene.test.ts`
Expected: 3 + 9 + 5 pass. El test "Sentinel's own src/ has no stack hits" recorre el repositorio real: si falla, la evidencia nombra el archivo y la línea de `src/` que usa `any` en posición de tipo o una directiva `@ts-`.

- [ ] **Step 7: Commit (lo hace el propietario)**

```bash
git add src/modules/source-text.ts src/modules/source-text.test.ts src/modules/checks fixtures/stack fixtures/secrets-hygiene
git commit -m "feat(checks): stack (STANDARD §3) y secrets-hygiene con patrones embebidos para 1.0.0"
```

---

### Task 16: Comprobación nueva `node-contract`

**Files:**
- Create: `src/modules/checks/node-contract.ts` + test + `fixtures/node-contract/{pass,fail}/`

**Interfaces:**
- Consumes: `tableRowsAfter` (Task 2), `ERROR_CODE_PATTERN` (Task 11), `params.templates` (los `bun run <script>` de `verify.yml` y `release.yml` del reglamento definen qué scripts son comandos públicos), `read`, `has`, `listUnder`.
- Produces: `nodeContractCheck`.

- [ ] **Step 1: Fixtures**

`node-contract/pass/`:
- `package.json`: `{"scripts":{"verify":"x","build:target":"x"}}`
- `CONTRACT.md`: tabla `## Comandos públicos` con filas `` `bun run verify` `` y `` `bun run build:target` ``, más `` `forge614-demo check` `` (binario: no se comprueba en 0.1); tabla `## Códigos de error` con `` `INVALID_ARGUMENTS` `` y `` `DEMO_FAILED` ``.
- `CONTRACT.en.md`: mismas tablas bajo `## Public commands` y `## Error codes`.
- `src/interfaces/cli/main.ts`: `printError("INVALID_ARGUMENTS", "x");\nprocess.exit(runCli("DEMO_FAILED", () => 0));\n`.

`node-contract/fail/`:
- `package.json`: `{"scripts":{"verify":"x","release:publish":"x"}}` (`release:publish` lo invoca la plantilla `release.yml`, así que es público, y el contrato no lo lista)
- `CONTRACT.md`: comandos `` `bun run verify` `` y `` `bun run nope` ``; códigos `` `INVALID_ARGUMENTS` `` y `` `GHOST_CODE` ``.
- `CONTRACT.en.md`: solo la fila de `verify` (paridad rota) y solo `INVALID_ARGUMENTS`.
- `src/interfaces/cli/main.ts`: `printError("INVALID_ARGUMENTS", "x"); printError("UNLISTED_CODE", "y");\n`.

- [ ] **Step 2: Tests (fallan)**

```ts
// src/modules/checks/node-contract.test.ts
import { expect, test } from "bun:test";
import { testParams } from "../../../tests/helpers/params";
import { snapshotFromDir } from "../../../tests/helpers/snapshot-from-dir";
import { snapshotFrom } from "../snapshot";
import { nodeContractCheck } from "./node-contract";

// The standard's workflow templates decide which package.json scripts are
// public commands: whatever CI invokes through `bun run <script>`.
const params = testParams({
  templates: new Map([
    ["verify.yml", "      - run: bun install --frozen-lockfile\n      - run: bun run verify\n"],
    ["release.yml", "      - run: bun run build:target\n      - run: bun run smoke:target\n      - run: bun run release:publish\n"],
  ]),
});

test("applies when CONTRACT.md or CONTRACT.en.md exists", () => {
  expect(nodeContractCheck.appliesWhen(snapshotFrom({}), params)).toBe(false);
  expect(nodeContractCheck.appliesWhen(snapshotFrom({ "CONTRACT.en.md": "" }), params)).toBe(true);
});

test("passes when every bun run command is a script, every public script is listed, codes exist in cli sources and both languages have the same rows", () => {
  expect(nodeContractCheck.run(snapshotFromDir("node-contract/pass"), params).verdict).toBe("pass");
});

test("reports missing script, unlisted public script, ghost code, unlisted cli code and row parity", () => {
  const r = nodeContractCheck.run(snapshotFromDir("node-contract/fail"), params);
  expect(r.verdict).toBe("fail");
  expect(r.evidence).toEqual([
    "CONTRACT.md: command 'bun run nope' has no package.json script 'nope'",
    "package.json: script 'release:publish' is run by the standard's workflow templates but CONTRACT.md does not list 'bun run release:publish'",
    "CONTRACT.md: code GHOST_CODE not found in src/interfaces/cli",
    "src/interfaces/cli/main.ts:1: code UNLISTED_CODE not in CONTRACT.md",
    "CONTRACT.md: 2 command rows vs CONTRACT.en.md: 1",
    "CONTRACT.md: 2 error code rows vs CONTRACT.en.md: 1",
  ]);
});

test("a missing twin or a missing package.json is evidence", () => {
  const r = nodeContractCheck.run(snapshotFrom({ "CONTRACT.md": "# c\n## Comandos públicos\n| Comando | x |\n| --- | --- |\n| `bun run a` | y |\n" }), params);
  expect(r.evidence).toEqual(expect.arrayContaining(["CONTRACT.en.md missing", "package.json missing"]));
});
```

- [ ] **Step 3: Implementar**

```ts
// src/modules/checks/node-contract.ts
import { z } from "zod";
import { fail, pass, type CheckDefinition } from "../check";
import { tableRowsAfter } from "../headings";
import { has, listUnder, read } from "../snapshot";
import { ERROR_CODE_PATTERN } from "./error-codes";

const Scripts = z.object({ scripts: z.record(z.string(), z.string()).optional() }).passthrough();
const BUN_RUN = /`bun run ([a-z0-9:.-]+)`/g;
const CODE_CELL = /^`([^`]+)`$/;
const CLI_CODE_LITERAL = /\b(?:printError|runCli)\(\s*"([A-Z][A-Z0-9_]+)"/g;
const TEMPLATE_RUN = /\bbun run ([a-z0-9:.-]+)/g;
const HEADINGS = {
  es: { commands: "## Comandos públicos", codes: "## Códigos de error" },
  en: { commands: "## Public commands", codes: "## Error codes" },
} as const;

// A script is a public command when the standard's own workflow templates
// invoke it (`bun run verify`, `bun run build:target`, …): CI depends on it,
// so the contract must promise it. Derived from the loaded standard, never
// from a list inside the check.
function publicScripts(templates: ReadonlyMap<string, string>): Set<string> {
  const out = new Set<string>();
  for (const name of ["verify.yml", "release.yml"]) for (const m of (templates.get(name) ?? "").matchAll(TEMPLATE_RUN)) out.add(m[1] ?? "");
  return out;
}

function codesOf(rows: string[][]): string[] {
  return rows.map((r) => CODE_CELL.exec(r[0] ?? "")?.[1]).filter((c): c is string => c !== undefined && ERROR_CODE_PATTERN.test(c));
}

// The contract is a promise about package.json and the CLI; this check
// keeps the three in step, in both directions: every command row names a
// real script and every public script has a row; every listed code is a
// literal in the CLI and every CLI code is listed. Binary commands
// (`forge614-<node> …`) are not executed in 0.1: machine-contracts (0.2)
// does that.
export const nodeContractCheck: CheckDefinition = {
  id: "node-contract",
  appliesWhen: (snapshot) => has(snapshot, "CONTRACT.md") || has(snapshot, "CONTRACT.en.md"),
  run: (snapshot, params) => {
    const evidence: string[] = [];
    const es = read(snapshot, "CONTRACT.md");
    const en = read(snapshot, "CONTRACT.en.md");
    if (es === undefined) evidence.push("CONTRACT.md missing");
    if (en === undefined) evidence.push("CONTRACT.en.md missing");

    let scripts: Set<string> | undefined;
    const pkgRaw = read(snapshot, "package.json");
    if (pkgRaw === undefined) evidence.push("package.json missing");
    else {
      try {
        const parsed = Scripts.safeParse(JSON.parse(pkgRaw));
        if (parsed.success) scripts = new Set(Object.keys(parsed.data.scripts ?? {}));
        else evidence.push("package.json: scripts is not an object");
      } catch {
        evidence.push("package.json: invalid JSON");
      }
    }

    if (es !== undefined) {
      const commandRows = tableRowsAfter(es, HEADINGS.es.commands);
      const listedScripts = new Set<string>();
      for (const row of commandRows) for (const m of (row[0] ?? "").matchAll(BUN_RUN)) listedScripts.add(m[1] ?? "");
      if (scripts !== undefined) {
        for (const script of listedScripts) {
          if (!scripts.has(script)) evidence.push(`CONTRACT.md: command 'bun run ${script}' has no package.json script '${script}'`);
        }
        const required = publicScripts(params.templates);
        for (const script of [...scripts].sort()) {
          if (required.has(script) && !listedScripts.has(script)) {
            evidence.push(`package.json: script '${script}' is run by the standard's workflow templates but CONTRACT.md does not list 'bun run ${script}'`);
          }
        }
      }

      const listed = new Set(codesOf(tableRowsAfter(es, HEADINGS.es.codes)));
      const cliFiles = listUnder(snapshot, "src/interfaces/cli/").filter((p) => p.endsWith(".ts") && !p.endsWith(".test.ts"));
      const cliText = cliFiles.map((p) => read(snapshot, p) ?? "").join("\n");
      for (const code of listed) if (!cliText.includes(`"${code}"`)) evidence.push(`CONTRACT.md: code ${code} not found in src/interfaces/cli`);
      const reported = new Set<string>();
      for (const path of cliFiles) {
        (read(snapshot, path) ?? "").split("\n").forEach((line, i) => {
          for (const m of line.matchAll(CLI_CODE_LITERAL)) {
            const code = m[1] ?? "";
            if (!listed.has(code) && !reported.has(code)) {
              reported.add(code);
              evidence.push(`${path}:${i + 1}: code ${code} not in CONTRACT.md`);
            }
          }
        });
      }

      if (en !== undefined) {
        const enCommands = tableRowsAfter(en, HEADINGS.en.commands).length;
        const enCodes = tableRowsAfter(en, HEADINGS.en.codes).length;
        const esCodes = tableRowsAfter(es, HEADINGS.es.codes).length;
        if (commandRows.length !== enCommands) evidence.push(`CONTRACT.md: ${commandRows.length} command rows vs CONTRACT.en.md: ${enCommands}`);
        if (esCodes !== enCodes) evidence.push(`CONTRACT.md: ${esCodes} error code rows vs CONTRACT.en.md: ${enCodes}`);
      }
    }
    return evidence.length === 0 ? pass("nodeContractOk") : fail(evidence, "nodeContractBroken");
  },
};
```

- [ ] **Step 4: Ejecutar**

Run: `bun test src/modules/checks/node-contract.test.ts`
Expected: 4 pass.

- [ ] **Step 5: Commit (lo hace el propietario)**

```bash
git add src/modules/checks/node-contract.ts src/modules/checks/node-contract.test.ts fixtures/node-contract
git commit -m "feat(checks): node-contract cruza CONTRACT.md con package.json y los códigos de la CLI"
```

---

### Task 17: Comprobación nueva `installer` (con render mínimo de plantillas)

**Files:**
- Create: `src/modules/template.ts`, `src/modules/template.test.ts` (portado de `forge614-ai/src/modules/standard/template.ts`)
- Create: `src/modules/line-diff.ts`, `src/modules/line-diff.test.ts`
- Create: `src/modules/checks/installer.ts` + test + `fixtures/installer/{pass,fail}/`

**Interfaces:**
- Consumes: `params.templates` (`install.sh`, `install.ps1`), `params.pointer` (nodo y versión declarada del reglamento); en tests, `takeSnapshot` (Task 8), `fetchStandard`, `loadStandard`, `standardSource` (Task 7).
- Produces: `installerCheck`, `renderTemplate(content, vars)`, `placeholdersOf(content)`, `lineDiff(expected, actual, label, limit?)`: `string[]`.

- [ ] **Step 1: Portar `template.ts`** (mismo código y test que en `forge614-ai`):

```ts
// src/modules/template.ts
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

- [ ] **Step 2: `line-diff.ts` con test**

```ts
// src/modules/line-diff.test.ts
import { expect, test } from "bun:test";
import { lineDiff } from "./line-diff";

test("reports the first differing lines with expected/actual and the length difference", () => {
  expect(lineDiff("a\nb\nc\n", "a\nB\nc\n", "install.sh")).toEqual(["install.sh:2: expected 'b' got 'B'"]);
  expect(lineDiff("a\nb\n", "a\nb\nc\n", "x")).toEqual(["x: 3 lines vs template 2"]);
  expect(lineDiff("a\n", "a\n", "x")).toEqual([]);
});

test("truncates long lines and stops after the limit", () => {
  const expected = Array.from({ length: 10 }, (_, i) => `l${i}`).join("\n");
  const actual = Array.from({ length: 10 }, (_, i) => `L${i}`).join("\n");
  expect(lineDiff(expected, actual, "x", 3)).toHaveLength(4);
  expect(lineDiff(expected, actual, "x", 3)[3]).toBe("x: 7 more differing lines");
  expect(lineDiff("a".repeat(200), "b".repeat(200), "x")[0]?.length).toBeLessThan(200);
});
```

```ts
// src/modules/line-diff.ts
const MAX = 80;

function clip(line: string): string {
  return line.length > MAX ? `${line.slice(0, MAX - 1)}…` : line;
}

// Positional line comparison: enough to point a person at the drift in a
// rendered template, cheap and deterministic on every platform.
export function lineDiff(expected: string, actual: string, label: string, limit = 5): string[] {
  const a = expected.split("\n");
  const b = actual.split("\n");
  const out: string[] = [];
  let differing = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    if (a[i] === b[i]) continue;
    differing += 1;
    if (out.length < limit) out.push(`${label}:${i + 1}: expected '${clip(a[i] ?? "")}' got '${clip(b[i] ?? "")}'`);
  }
  if (differing > limit) out.push(`${label}: ${differing - limit} more differing lines`);
  if (a.length !== b.length) out.push(`${label}: ${b.length} lines vs template ${a.length}`);
  return out;
}
```

- [ ] **Step 3: Fixtures**

`installer/pass/install.sh` e `installer/pass/install.ps1`: las plantillas 1.0.0 renderizadas con `NODE_NAME=demo`, `NODE_TITLE=Demo`, `REPO=jotredev/forge614-demo`, `ASSET_PREFIX=forge614-demo`, `STANDARD_VERSION=1.0.0`. Se generan con el `renderTemplate` del paso 1 a partir del paquete de `fixtures/standard/` (el mismo de la release `standard-v1.0.0`); no se ejecuta código de `forge614-ai`:

```bash
mkdir -p /tmp/sentinel-std-1.0.0 && tar -xzf fixtures/standard/standard-v1.0.0/standard-1.0.0.tar.gz -C /tmp/sentinel-std-1.0.0
mkdir -p fixtures/installer/pass fixtures/installer/fail
bun -e '
import { readFileSync, writeFileSync } from "node:fs";
import { renderTemplate } from "./src/modules/template";
const vars = { NODE_NAME: "demo", NODE_TITLE: "Demo", REPO: "jotredev/forge614-demo", ASSET_PREFIX: "forge614-demo", STANDARD_VERSION: "1.0.0" };
for (const name of ["install.sh", "install.ps1"]) writeFileSync(`fixtures/installer/pass/${name}`, renderTemplate(readFileSync(`/tmp/sentinel-std-1.0.0/templates/${name}`, "utf8"), vars));
'
cp fixtures/installer/pass/install.sh fixtures/installer/fail/install.sh
sed -i '' 's/^set -euo pipefail$/set -eu/' fixtures/installer/fail/install.sh
echo 'echo hacked' >> fixtures/installer/fail/install.sh
```

`installer/pass/forge614.node.json`: puntero `demo` (el mismo JSON que `fixtures/node-pointer/pass/forge614.node.json`). `installer/fail/` no tiene `install.ps1`.

- [ ] **Step 4: Tests (fallan)**

```ts
// src/modules/checks/installer.test.ts
import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileFetcher } from "../../infrastructure/network";
import { fetchStandard } from "../../app/fetch-standard";
import { loadStandard } from "../../app/load-standard";
import { takeSnapshot } from "../../app/take-snapshot";
import { standardSource } from "../standard-source";
import { DEMO_POINTER, SHA, testParams } from "../../../tests/helpers/params";
import { FIXTURES, snapshotFromDir } from "../../../tests/helpers/snapshot-from-dir";
import { snapshotFrom } from "../snapshot";
import { installerCheck } from "./installer";

// The real templates of standard 1.0.0, from the fixture archive.
async function realTemplates(): Promise<Map<string, string>> {
  const cacheRoot = mkdtempSync(join(tmpdir(), "sentinel-installer-"));
  await fetchStandard({ source: standardSource("1.0.0"), cacheRoot, fetcher: fileFetcher(), releaseBase: pathToFileURL(resolve(import.meta.dir, "../../../fixtures/standard")).href });
  const r = loadStandard({ version: "1.0.0", expectedSha256: SHA, cacheRoot });
  if (!r.ok) throw new Error(r.error);
  const templates = new Map<string, string>();
  for (const [p, t] of r.standard.files) if (p.startsWith("templates/")) templates.set(p.slice("templates/".length), t);
  return templates;
}

test("forge614-ai is exempt; every other node applies", () => {
  expect(installerCheck.appliesWhen(snapshotFrom({}), testParams({ pointer: { ...DEMO_POINTER, node: "ai" } }))).toBe(false);
  expect(installerCheck.appliesWhen(snapshotFrom({}), testParams())).toBe(true);
});

test("passes when both installers equal the template rendered with the node's variables", async () => {
  const params = testParams({ templates: await realTemplates() });
  const r = installerCheck.run(snapshotFromDir("installer/pass"), params);
  expect(r.verdict).toBe("pass");
  expect(r.evidence).toEqual([]);
});

test("reports a line diff for a drifted install.sh and a missing install.ps1", async () => {
  const params = testParams({ templates: await realTemplates() });
  const r = installerCheck.run(snapshotFromDir("installer/fail"), params);
  expect(r.verdict).toBe("fail");
  expect(r.evidence[0]).toMatch(/^install\.sh:\d+: expected 'set -euo pipefail' got 'set -eu'$/);
  expect(r.evidence).toContain("install.ps1 missing");
  expect(r.evidence.some((e) => /^install\.sh: \d+ lines vs template \d+$/.test(e))).toBe(true);
});

test("REPO is taken from the file's own assignment; NODE_NAME, ASSET_PREFIX and STANDARD_VERSION from the pointer", async () => {
  const templates = await realTemplates();
  const params = testParams({ templates });
  const sh = (templates.get("install.sh") ?? "").replace("{{NODE_NAME}}", "demo").replace("{{REPO}}", "acme/forge614-demo").replace("{{ASSET_PREFIX}}", "forge614-demo").replace(/\{\{STANDARD_VERSION\}\}/g, "1.0.0");
  const ps = (templates.get("install.ps1") ?? "").replace("{{NODE_NAME}}", "demo").replace("{{REPO}}", "acme/forge614-demo").replace("{{ASSET_PREFIX}}", "forge614-demo").replace(/\{\{STANDARD_VERSION\}\}/g, "1.0.0");
  expect(installerCheck.run(snapshotFrom({ "install.sh": sh, "install.ps1": ps }), params).verdict).toBe("pass");
  const wrongNode = sh.replace('NODE_NAME="demo"', 'NODE_NAME="other"');
  expect(installerCheck.run(snapshotFrom({ "install.sh": wrongNode, "install.ps1": ps }), params).verdict).toBe("fail");
});

test("STANDARD_VERSION is the version the node declares, also when --standard forces another one", async () => {
  const params = testParams({ templates: await realTemplates(), standard: { version: "1.1.0", sha256: "0".repeat(64), pointerVersionSha256: SHA } });
  expect(installerCheck.run(snapshotFromDir("installer/pass"), params).verdict).toBe("pass");
});

test("a CRLF checkout of install.sh passes", async () => {
  // Bytes with \r\n on disk, read through takeSnapshot: the comparison sees
  // LF text, as a Windows checkout with core.autocrlf=true would.
  const params = testParams({ templates: await realTemplates() });
  const root = mkdtempSync(join(tmpdir(), "sentinel-installer-crlf-"));
  for (const name of ["install.sh", "install.ps1"]) {
    writeFileSync(join(root, name), readFileSync(join(FIXTURES, "installer/pass", name), "utf8").replace(/\n/g, "\r\n"));
  }
  expect(readFileSync(join(root, "install.sh"), "utf8")).toContain("\r\n");
  expect(installerCheck.run(takeSnapshot(root), params).verdict).toBe("pass");
});
```

- [ ] **Step 5: Implementar `installer.ts`**

```ts
// src/modules/checks/installer.ts
import { fail, pass, type CheckDefinition } from "../check";
import { lineDiff } from "../line-diff";
import { read } from "../snapshot";
import { renderTemplate } from "../template";

const SH_REPO = /^REPO="([^"]+)"$/m;
// install.ps1 declares its variables on one line
// (`$NodeName = "…"; $Repo = "…"; $AssetPrefix = "…"`), so no ^ anchor.
const PS_REPO = /\$Repo = "([^"]+)"/m;

// The installers are the standard's, rendered with the node's variables:
// any local edit is drift. REPO is the one variable the standard cannot
// know, so it is read from the file itself (defaulting to the ecosystem's
// naming); NODE_NAME, ASSET_PREFIX and STANDARD_VERSION come from the
// pointer. STANDARD_VERSION is the version the node declares, never the one
// forced with --standard: the node rendered its installers from its own
// standard, and a forced run must not turn that into drift.
export const installerCheck: CheckDefinition = {
  id: "installer",
  appliesWhen: (_snapshot, params) => params.pointer.node !== "ai",
  run: (snapshot, params) => {
    const evidence: string[] = [];
    const node = params.pointer.node;
    const sh = read(snapshot, "install.sh");
    const ps = read(snapshot, "install.ps1");
    const repo = SH_REPO.exec(sh ?? "")?.[1] ?? PS_REPO.exec(ps ?? "")?.[1] ?? `jotredev/forge614-${node}`;
    const vars = { NODE_NAME: node, NODE_TITLE: node, REPO: repo, ASSET_PREFIX: `forge614-${node}`, STANDARD_VERSION: params.pointer.standard.version };

    for (const [name, actual] of [["install.sh", sh], ["install.ps1", ps]] as const) {
      const template = params.templates.get(name);
      if (template === undefined) {
        evidence.push(`template ${name} missing from standard ${params.standard.version}`);
        continue;
      }
      if (actual === undefined) {
        evidence.push(`${name} missing`);
        continue;
      }
      evidence.push(...lineDiff(renderTemplate(template, vars), actual, name));
    }
    return evidence.length === 0 ? pass("installerOk") : fail(evidence, "installerDrifted");
  },
};
```

- [ ] **Step 6: Ejecutar**

Run: `bun run typecheck && bun test src/modules/template.test.ts src/modules/line-diff.test.ts src/modules/checks/installer.test.ts`
Expected: 2 + 2 + 6 pass.

- [ ] **Step 7: Commit (lo hace el propietario)**

```bash
git add src/modules/template.ts src/modules/template.test.ts src/modules/line-diff.ts src/modules/line-diff.test.ts src/modules/checks/installer.ts src/modules/checks/installer.test.ts fixtures/installer
git commit -m "feat(checks): installer compara install.sh e install.ps1 con la plantilla renderizada del reglamento"
```

---

### Task 18: Comprobación nueva `release`

**Files:**
- Create: `src/modules/deep-diff.ts`, `src/modules/deep-diff.test.ts`
- Create: `src/modules/checks/release.ts` + test + `fixtures/release/{pass,fail}/`

**Interfaces:**
- Consumes: `params.templates` (`verify.yml`, `release.yml`), `params.allowedExtraJobs` (Task 3; `["parity"]` en Task 8), `params.parseYaml`, `WorkflowSchema`, `PINNED_USES`.
- Produces: `releaseCheck`, `deepDiff(expected: unknown, actual: unknown, path: string): string[]`.

- [ ] **Step 1: `deep-diff.ts` con test**

```ts
// src/modules/deep-diff.test.ts
import { expect, test } from "bun:test";
import { deepDiff } from "./deep-diff";

test("reports scalar, missing and extra differences with JSON paths", () => {
  expect(deepDiff({ a: 1, b: [1, 2], c: { d: "x" } }, { a: 1, b: [1, 3], c: { d: "y" }, e: 1 }, "jobs.verify")).toEqual([
    "jobs.verify.b[1]: expected 2 got 3",
    "jobs.verify.c.d: expected \"x\" got \"y\"",
    "jobs.verify.e: unexpected",
  ]);
  expect(deepDiff({ a: 1 }, {}, "r")).toEqual(["r.a: missing"]);
  expect(deepDiff([1], [1, 2], "r")).toEqual(["r: 2 items vs template 1"]);
  expect(deepDiff({ a: 1 }, { a: 1 }, "r")).toEqual([]);
});
```

```ts
// src/modules/deep-diff.ts
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function deepDiff(expected: unknown, actual: unknown, path: string): string[] {
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) return [`${path}: ${actual.length} items vs template ${expected.length}`];
    return expected.flatMap((e, i) => deepDiff(e, actual[i], `${path}[${i}]`));
  }
  if (isRecord(expected) && isRecord(actual)) {
    const out: string[] = [];
    for (const key of Object.keys(expected)) {
      if (!(key in actual)) out.push(`${path}.${key}: missing`);
      else out.push(...deepDiff(expected[key], actual[key], `${path}.${key}`));
    }
    for (const key of Object.keys(actual)) if (!(key in expected)) out.push(`${path}.${key}: unexpected`);
    return out;
  }
  return JSON.stringify(expected) === JSON.stringify(actual) ? [] : [`${path}: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`];
}
```

- [ ] **Step 2: Fixtures**

`release/pass/.github/workflows/verify.yml`: la plantilla `verify.yml` 1.0.0 más un job extra `parity` (matriz de tres SO, pasos fijados por SHA, `timeout-minutes: 10`, `run: bun run sentinel:parity`). `release/pass/.github/workflows/release.yml`: la plantilla `release.yml` 1.0.0 tal cual. `release/pass/CHANGELOG.md`: `# Changelog\n`.
`release/fail/.github/workflows/verify.yml`: plantilla con `bun run verify` cambiado a `bun run test` y `uses: actions/checkout@v4` sin SHA; sin `release.yml`; sin `CHANGELOG.md`.

- [ ] **Step 3: Tests (fallan)**

```ts
// src/modules/checks/release.test.ts
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { testParams } from "../../../tests/helpers/params";
import { FIXTURES, snapshotFromDir } from "../../../tests/helpers/snapshot-from-dir";
import { snapshotFrom } from "../snapshot";
import { releaseCheck } from "./release";

// The fixture's release.yml IS the 1.0.0 template (byte-identical), so it
// doubles as the template here; verify.yml's template is the first job only.
const releaseTemplate = readFileSync(resolve(FIXTURES, "release/pass/.github/workflows/release.yml"), "utf8");
const verifyTemplate = `name: verify\non:\n  push: { branches: [main] }\n  pull_request:\njobs:\n  verify:\n    runs-on: ubuntu-24.04\n    timeout-minutes: 10\n    steps:\n      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4.3.1\n      - uses: oven-sh/setup-bun@735343b667d3e6f658f44d0eca948eb6282f2b76 # v2.0.2\n        with: { bun-version: "1.4.2" }\n      - run: bun install --frozen-lockfile\n      - run: bun run verify\n`;
const params = testParams({ templates: new Map([["verify.yml", verifyTemplate], ["release.yml", releaseTemplate]]) });

test("passes when both workflows match the template (an allowed extra job is named) and CHANGELOG exists", () => {
  const r = releaseCheck.run(snapshotFromDir("release/pass"), params);
  expect(r.verdict).toBe("pass");
  expect(r.evidence).toEqual(["verify.yml: extra job 'parity' (allowed; its shape is checked by 'workflows')"]);
});

test("reports a diff path for a changed template job, an unpinned action, a missing workflow and a missing CHANGELOG", () => {
  const r = releaseCheck.run(snapshotFromDir("release/fail"), params);
  expect(r.verdict).toBe("fail");
  expect(r.evidence).toEqual(
    expect.arrayContaining([
      "verify.yml: jobs.verify.steps[0].uses: expected \"actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5\" got \"actions/checkout@v4\"",
      "verify.yml: jobs.verify.steps[3].run: expected \"bun run verify\" got \"bun run test\"",
      "verify.yml: job verify step 1: uses not pinned to a 40-hex SHA: actions/checkout@v4",
      ".github/workflows/release.yml missing",
      "CHANGELOG.md missing",
    ]),
  );
});

test("an extra job outside the allowed list is a fail naming it", () => {
  const verify = `${verifyTemplate}  deploy:\n    runs-on: ubuntu-24.04\n    timeout-minutes: 5\n    steps:\n      - run: bun run verify\n`;
  const s = snapshotFrom({ ".github/workflows/verify.yml": verify, ".github/workflows/release.yml": releaseTemplate, "CHANGELOG.md": "# Changelog\n" });
  const r = releaseCheck.run(s, params);
  expect(r.verdict).toBe("fail");
  expect(r.evidence).toContain("verify.yml: extra job 'deploy' is not in the allowed list (parity)");
});
```

- [ ] **Step 4: Implementar `release.ts`**

```ts
// src/modules/checks/release.ts
import { fail, pass, type CheckDefinition } from "../check";
import { deepDiff } from "../deep-diff";
import { has, read } from "../snapshot";
import { PINNED_USES, WorkflowSchema, type Workflow } from "../workflow";

const WORKFLOWS = ["verify.yml", "release.yml"] as const;

function parseWorkflow(text: string, parseYaml: (t: string) => unknown): Workflow | string {
  let raw: unknown;
  try {
    raw = parseYaml(text);
  } catch (e) {
    return `YAML parse error: ${e instanceof Error ? e.message : String(e)}`;
  }
  const parsed = WorkflowSchema.safeParse(raw);
  return parsed.success ? parsed.data : `schema: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`;
}

// The template's jobs must be present and identical (name, triggers and
// every step). A repository may add only the jobs in params.allowedExtraJobs
// (spec §13: `parity` is the explicit allowed deviation); `workflows` keeps
// those thin. Every `uses` anywhere is pinned.
export const releaseCheck: CheckDefinition = {
  id: "release",
  appliesWhen: () => true,
  run: (snapshot, params) => {
    const evidence: string[] = [];
    let problems = 0;
    const flag = (line: string): void => {
      evidence.push(line);
      problems += 1;
    };

    for (const name of WORKFLOWS) {
      const path = `.github/workflows/${name}`;
      const template = params.templates.get(name);
      if (template === undefined) {
        flag(`template ${name} missing from standard ${params.standard.version}`);
        continue;
      }
      const actualText = read(snapshot, path);
      if (actualText === undefined) {
        flag(`${path} missing`);
        continue;
      }
      const expected = parseWorkflow(template, params.parseYaml);
      const actual = parseWorkflow(actualText, params.parseYaml);
      if (typeof expected === "string") {
        flag(`template ${name}: ${expected}`);
        continue;
      }
      if (typeof actual === "string") {
        flag(`${name}: ${actual}`);
        continue;
      }
      for (const line of deepDiff(expected.name, actual.name, "name")) flag(`${name}: ${line}`);
      for (const line of deepDiff(expected.on, actual.on, "on")) flag(`${name}: ${line}`);
      for (const job of Object.keys(expected.jobs)) {
        if (!(job in actual.jobs)) {
          flag(`${name}: jobs.${job}: missing`);
          continue;
        }
        for (const line of deepDiff(expected.jobs[job], actual.jobs[job], `jobs.${job}`)) flag(`${name}: ${line}`);
      }
      for (const job of Object.keys(actual.jobs)) {
        if (job in expected.jobs) continue;
        if (params.allowedExtraJobs.includes(job)) evidence.push(`${name}: extra job '${job}' (allowed; its shape is checked by 'workflows')`);
        else flag(`${name}: extra job '${job}' is not in the allowed list (${params.allowedExtraJobs.join(", ")})`);
      }
      for (const [job, def] of Object.entries(actual.jobs)) {
        def.steps.forEach((s, i) => {
          if ("uses" in s && !PINNED_USES.test(s.uses)) flag(`${name}: job ${job} step ${i + 1}: uses not pinned to a 40-hex SHA: ${s.uses}`);
        });
      }
    }
    if (!has(snapshot, "CHANGELOG.md")) flag("CHANGELOG.md missing");
    return problems === 0 ? pass("releaseOk", {}, evidence) : fail(evidence, "releaseDrifted");
  },
};
```

- [ ] **Step 5: Ejecutar**

Run: `bun run typecheck && bun test src/modules/deep-diff.test.ts src/modules/checks/release.test.ts`
Expected: 1 + 3 pass.

- [ ] **Step 6: Commit (lo hace el propietario)**

```bash
git add src/modules/deep-diff.ts src/modules/deep-diff.test.ts src/modules/checks/release.ts src/modules/checks/release.test.ts fixtures/release
git commit -m "feat(checks): release compara verify.yml y release.yml con la plantilla y exige acciones fijadas y CHANGELOG"
```

---

### Task 19: Comprobación nueva `versions` y registro de comprobaciones

**Files:**
- Create: `src/modules/checks/versions.ts` + test + `fixtures/versions/{pass,fail}/`
- Create: `src/modules/checks/index.ts`, `src/modules/checks/index.test.ts`

**Interfaces:**
- Consumes: `facts.gitTags`, `facts.gitAvailable`, `highestSemver`, `SEMVER_PATTERN`.
- Produces: `versionsCheck`; registro:
  ```ts
  export const CHECKS: readonly CheckDefinition[];        // report order, 19 entries
  export const CHECK_IDS: readonly string[];
  // Checks the 1.0.0 pack does not reference through a manifest `validator`
  // field and that Sentinel therefore always selects (spec §8.2 + support-matrix,
  // ecosystem-contract, rules-catalog). Standard 1.1.0 references them explicitly.
  export const NATIVE_CHECK_IDS: readonly string[];
  export function checkById(id: string): CheckDefinition | undefined;
  ```

- [ ] **Step 1: Fixtures**

`versions/pass/package.json`: `{"version":"0.1.0"}`; `versions/pass/docs/notion-map.json`: `{"schemaVersion":1,"productVersion":"0.1.0","pages":[]}`.
`versions/fail/package.json`: `{"version":"0.2.0"}`; `versions/fail/docs/notion-map.json`: `{"schemaVersion":1,"productVersion":"0.1.0","pages":[]}`.

- [ ] **Step 2: Tests (fallan)**

```ts
// src/modules/checks/versions.test.ts
import { expect, test } from "bun:test";
import { testParams } from "../../../tests/helpers/params";
import { snapshotFromDir } from "../../../tests/helpers/snapshot-from-dir";
import { snapshotFrom } from "../snapshot";
import { versionsCheck } from "./versions";

const params = testParams();

test("applies when package.json exists", () => {
  expect(versionsCheck.appliesWhen(snapshotFrom({}), params)).toBe(false);
  expect(versionsCheck.appliesWhen(snapshotFrom({ "package.json": "{}" }), params)).toBe(true);
});

test("passes when package.json and notion-map agree; without git the evidence says tags were unavailable", () => {
  const r = versionsCheck.run(snapshotFromDir("versions/pass"), params);
  expect(r.verdict).toBe("pass");
  expect(r.evidence).toEqual(["git tags not available (not a git checkout)"]);
});

test("fails when notion-map disagrees or the highest v* tag differs from package.json", () => {
  const r = versionsCheck.run(snapshotFromDir("versions/fail"), params);
  expect(r.verdict).toBe("fail");
  expect(r.evidence).toEqual(["git tags not available (not a git checkout)", "package.json version 0.2.0 vs docs/notion-map.json productVersion 0.1.0"]);
  const behind = versionsCheck.run(snapshotFromDir("versions/pass", { gitAvailable: true, gitTags: ["v0.1.0", "v0.2.0", "standard-v1.0.0"] }), params);
  expect(behind.evidence).toEqual(["package.json version 0.1.0 vs highest tag v0.2.0"]);
});

test("the highest v* tag must equal package.json exactly (spec §8.2): equal passes, ahead fails too", () => {
  expect(versionsCheck.run(snapshotFromDir("versions/pass", { gitAvailable: true, gitTags: ["v0.1.0"] }), params).evidence).toEqual([]);
  const ahead = versionsCheck.run(snapshotFromDir("versions/pass", { gitAvailable: true, gitTags: ["v0.0.9"] }), params);
  expect(ahead.verdict).toBe("fail");
  expect(ahead.evidence).toEqual(["package.json version 0.1.0 vs highest tag v0.0.9"]);
});

test("a git checkout without v* tags (a shallow CI clone) compares package.json with notion-map only", () => {
  const r = versionsCheck.run(snapshotFromDir("versions/pass", { gitAvailable: true, gitTags: [] }), params);
  expect(r.verdict).toBe("pass");
  expect(r.evidence).toEqual([]);
});

test("missing or invalid version fields are evidence", () => {
  const r = versionsCheck.run(snapshotFrom({ "package.json": JSON.stringify({ version: "1.0" }) }), params);
  expect(r.evidence).toEqual(expect.arrayContaining(["package.json: version '1.0' is not X.Y.Z", "docs/notion-map.json missing"]));
});
```

- [ ] **Step 3: Implementar `versions.ts`**

```ts
// src/modules/checks/versions.ts
import { z } from "zod";
import { fail, pass, type CheckDefinition } from "../check";
import { highestSemver, SEMVER_PATTERN } from "../semver";
import { has, read } from "../snapshot";

const PackageVersion = z.object({ version: z.string().optional() }).passthrough();
const NotionMapVersion = z.object({ productVersion: z.string().optional() }).passthrough();

function readJson<T>(schema: z.ZodType<T>, raw: string): T | null {
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// spec §8.2 (ruling R29): exact equality of package.json.version, the
// highest v* tag when the checkout has tags, and notion-map productVersion.
// A shallow CI clone (actions/checkout fetch-depth 1) carries no tags, so
// pull requests compare package.json with notion-map only; the release
// workflow runs on the pushed tag, which must then equal package.json.
// `--version` is not executed in 0.1 (machine-contracts, 0.2).
export const versionsCheck: CheckDefinition = {
  id: "versions",
  appliesWhen: (snapshot) => has(snapshot, "package.json"),
  run: (snapshot) => {
    const evidence: string[] = [];
    let problems = 0;
    const flag = (line: string): void => {
      evidence.push(line);
      problems += 1;
    };

    const pkg = readJson(PackageVersion, read(snapshot, "package.json") ?? "");
    const pkgVersion = pkg?.version;
    if (pkg === null) flag("package.json: invalid JSON");
    else if (pkgVersion === undefined) flag("package.json: version missing");
    else if (!SEMVER_PATTERN.test(pkgVersion)) flag(`package.json: version '${pkgVersion}' is not X.Y.Z`);

    if (!snapshot.facts.gitAvailable) evidence.push("git tags not available (not a git checkout)");
    const highestTag = highestSemver(snapshot.facts.gitTags.filter((t) => /^v\d+\.\d+\.\d+$/.test(t)).map((t) => t.slice(1)));
    if (highestTag !== undefined && pkgVersion !== undefined && SEMVER_PATTERN.test(pkgVersion) && pkgVersion !== highestTag) {
      flag(`package.json version ${pkgVersion} vs highest tag v${highestTag}`);
    }

    const mapRaw = read(snapshot, "docs/notion-map.json");
    if (mapRaw === undefined) flag("docs/notion-map.json missing");
    else {
      const map = readJson(NotionMapVersion, mapRaw);
      if (map === null) flag("docs/notion-map.json: invalid JSON");
      else if (map.productVersion === undefined) flag("docs/notion-map.json: productVersion missing");
      else if (pkgVersion !== undefined && map.productVersion !== pkgVersion) flag(`package.json version ${pkgVersion} vs docs/notion-map.json productVersion ${map.productVersion}`);
    }
    return problems === 0 ? pass("versionsOk", {}, evidence) : fail(evidence, "versionsInconsistent");
  },
};
```

- [ ] **Step 4: Registro con test**

```ts
// src/modules/checks/index.test.ts
import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { CHECK_IDS, CHECKS, checkById, NATIVE_CHECK_IDS } from "./index";

const FIXTURES = resolve(import.meta.dir, "../../../fixtures");

test("exactly the 19 checks of spec §8, unique kebab-case ids, in report order", () => {
  expect(CHECK_IDS).toEqual([
    "node-pointer", "layout", "stack", "secrets-hygiene",
    "package-naming", "forbidden-mentions", "docs-parity", "decisions", "agent-checklist-impact", "error-codes",
    "node-contract", "installer", "release", "versions",
    "workflows", "support-matrix", "context-budget", "ecosystem-contract", "rules-catalog",
  ]);
  expect(new Set(CHECK_IDS).size).toBe(19);
  for (const id of CHECK_IDS) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(CHECKS.map((c) => c.id)).toEqual([...CHECK_IDS]);
  expect(checkById("layout")?.id).toBe("layout");
  expect(checkById("nope")).toBeUndefined();
});

test("native ids are a subset of the registry and cover everything the 1.0.0 pack does not name", () => {
  for (const id of NATIVE_CHECK_IDS) expect(CHECK_IDS).toContain(id);
  expect(NATIVE_CHECK_IDS).toEqual(["node-pointer", "layout", "stack", "secrets-hygiene", "node-contract", "installer", "release", "versions", "support-matrix", "ecosystem-contract", "rules-catalog"]);
});

test("every check has pass and fail fixtures", () => {
  for (const id of CHECK_IDS) {
    expect(existsSync(resolve(FIXTURES, id, "pass")), `${id}/pass`).toBe(true);
    expect(existsSync(resolve(FIXTURES, id, "fail")), `${id}/fail`).toBe(true);
  }
});
```

```ts
// src/modules/checks/index.ts
import type { CheckDefinition } from "../check";
import { agentChecklistImpactCheck } from "./agent-checklist-impact";
import { contextBudgetCheck } from "./context-budget";
import { decisionsCheck } from "./decisions";
import { docsParityCheck } from "./docs-parity";
import { ecosystemContractCheck } from "./ecosystem-contract";
import { errorCodesCheck } from "./error-codes";
import { forbiddenMentionsCheck } from "./forbidden-mentions";
import { installerCheck } from "./installer";
import { layoutCheck } from "./layout";
import { nodeContractCheck } from "./node-contract";
import { nodePointerCheck } from "./node-pointer";
import { packageNamingCheck } from "./package-naming";
import { releaseCheck } from "./release";
import { rulesCatalogCheck } from "./rules-catalog";
import { secretsHygieneCheck } from "./secrets-hygiene";
import { stackCheck } from "./stack";
import { supportMatrixCheck } from "./support-matrix";
import { versionsCheck } from "./versions";
import { workflowsCheck } from "./workflows";

// Report order: identity and structure first, then the ported content
// checks, then contract/installer/release/versions, then the checks that
// only apply to forge614-ai's own tree.
export const CHECKS: readonly CheckDefinition[] = [
  nodePointerCheck, layoutCheck, stackCheck, secretsHygieneCheck,
  packageNamingCheck, forbiddenMentionsCheck, docsParityCheck, decisionsCheck, agentChecklistImpactCheck, errorCodesCheck,
  nodeContractCheck, installerCheck, releaseCheck, versionsCheck,
  workflowsCheck, supportMatrixCheck, contextBudgetCheck, ecosystemContractCheck, rulesCatalogCheck,
];

export const CHECK_IDS: readonly string[] = CHECKS.map((c) => c.id);

export const NATIVE_CHECK_IDS: readonly string[] = [
  "node-pointer", "layout", "stack", "secrets-hygiene", "node-contract", "installer", "release", "versions",
  "support-matrix", "ecosystem-contract", "rules-catalog",
];

export function checkById(id: string): CheckDefinition | undefined {
  return CHECKS.find((c) => c.id === id);
}
```

- [ ] **Step 5: Ejecutar**

Run: `bun run typecheck && bun test src/modules/checks`
Expected: todo en verde; `index.test.ts` confirma 19 ids y 38 carpetas de fixtures.

- [ ] **Step 6: Commit (lo hace el propietario)**

```bash
git add src/modules/checks fixtures/versions
git commit -m "feat(checks): versions y registro de las 19 comprobaciones de Sentinel 0.1"
```

---

### Task 20: Fixtures de nodo completo: `pass-node`, `fail-node`, `external-project` y `foreign-folder`

**Files:**
- Create: `fixtures/pass-node/`, `fixtures/fail-node/`, `fixtures/external-project/`, `fixtures/foreign-folder/`
- Create: `tests/full-node-fixtures.test.ts`

**Interfaces:**
- Consumes: `renderTemplate` (Task 17), `CHECKS` (Task 19), `classifyRepository`, `takeSnapshot`, `buildCheckParams` (Task 8), `fetchStandard`, `loadStandard`, `standardSource` (Task 7), `fileFetcher` (Task 6), `FIXTURES` (Task 3).
- Produces: cuatro árboles de repositorio que usan las Tasks 21 (orquestador), 22 y 23 (CLI) y 27 (e2e y paridad): `pass-node` pasa todas las comprobaciones aplicables, `fail-node` falla exactamente seis (`layout`, `stack`, `docs-parity`, `versions`, `secrets-hygiene`, `installer`), `external-project` tiene `.forge614/project.json` y `foreign-folder` no tiene archivo de identidad.

- [ ] **Step 1: Fixture `pass-node` (un nodo mínimo que pasa las 19)**

Renderizar las 15 plantillas del paquete de `fixtures/standard/` (el mismo de la release `standard-v1.0.0`) con el `renderTemplate` de Task 17; no se ejecuta código de `forge614-ai`. Run (desde la raíz de `forge614-sentinel`):

```bash
mkdir -p /tmp/sentinel-std-1.0.0 && tar -xzf fixtures/standard/standard-v1.0.0/standard-1.0.0.tar.gz -C /tmp/sentinel-std-1.0.0
bun -e '
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { renderTemplate } from "./src/modules/template";
const vars = { NODE_NAME: "demo", NODE_TITLE: "Demo", REPO: "jotredev/forge614-demo", ASSET_PREFIX: "forge614-demo", STANDARD_VERSION: "1.0.0" };
const destinations = [
  ["install.sh", "install.sh"],
  ["install.ps1", "install.ps1"],
  ["verify.yml", ".github/workflows/verify.yml"],
  ["release.yml", ".github/workflows/release.yml"],
  ["CONTRACT.md", "CONTRACT.md"],
  ["CONTRACT.en.md", "CONTRACT.en.md"],
  ["README.md", "README.md"],
  ["README.en.md", "README.en.md"],
  ["decision.md", "docs/decisions/TEMPLATE.md"],
  ["plan.md", ".agents/templates/plan.md"],
  ["hooks/pre-push", ".githooks/pre-push"],
  ["BRANCH_PROTECTION.md", "BRANCH_PROTECTION.md"],
  ["BRANCH_PROTECTION.en.md", "BRANCH_PROTECTION.en.md"],
  ["docs-workflows.md", "docs/es/04-workflows.md"],
  ["docs-workflows.en.md", "docs/en/04-workflows.md"],
];
for (const [src, dest] of destinations) {
  const target = join("fixtures/pass-node", dest);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, renderTemplate(readFileSync(join("/tmp/sentinel-std-1.0.0/templates", src), "utf8"), vars));
  if (dest === "install.sh" || dest === ".githooks/pre-push") chmodSync(target, 0o755);
}
'
sed -i '' 's/^# NN — /# 04 — /' fixtures/pass-node/docs/es/04-workflows.md fixtures/pass-node/docs/en/04-workflows.md
```

Y crear a mano:

`forge614.node.json`:
```json
{ "schemaVersion": 1, "node": "demo", "kind": "product", "standard": { "version": "1.0.0", "sha256": "18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922" }, "ecosystem": "forge614" }
```

`package.json`:
```json
{
  "name": "forge614-demo",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "bun": ">=1.3.9" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "bun test",
    "verify": "bun run src/interfaces/cli/verify.ts",
    "workflows:check": "bun run src/interfaces/cli/workflows-check.ts",
    "workflows:run": "bun run src/interfaces/cli/workflows-run.ts",
    "build:target": "bun run src/interfaces/cli/build-target.ts",
    "smoke:target": "bun run src/interfaces/cli/smoke-target.ts",
    "release:publish": "bun run src/interfaces/cli/release-publish.ts"
  }
}
```

`bun.lock`: `{ "lockfileVersion": 1, "workspaces": { "": { "name": "forge614-demo" } }, "packages": {} }`.
`tsconfig.json`: `{ "compilerOptions": { "strict": true, "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": true } }`.
`src/modules/demo.ts`: `export const DEMO = "demo";\n`. `src/app/demo.ts`: `export function demo(): string { return "demo"; }\n`. `src/infrastructure/demo.ts`: `export const ROOT = ".";\n`.
`src/interfaces/cli/main.ts`:
```ts
export function printError(code: string, error: string): void {
  process.stderr.write(`${JSON.stringify({ schemaVersion: 1, code, error })}\n`);
}
printError("INVALID_ARGUMENTS", "unknown flag");
printError("DEMO_FAILED", "unexpected");
```
`docs/es/00-resumen.md`: `# 00 — Resumen\n\n> Como una maqueta: pequeña, completa y sin pretensiones.\n\n## Qué es\n\nNodo de ejemplo.\n`. `docs/en/00-summary.md`: `# 00 — Summary\n\n> Like a scale model: small, complete and unpretentious.\n\n## What it is\n\nExample node.\n`.
`docs/decisions/INDEX.json`: `{ "schemaVersion": 1, "decisions": [] }`. `docs/notion-map.json`: `{ "schemaVersion": 1, "productVersion": "0.1.0", "pages": [] }`.
`CHANGELOG.md`: `# Changelog\n\n## [Unreleased]\n`. `LICENSE`: una línea. `SECURITY.md`: dos párrafos ES/EN.
`CONTRACT.md`: la plantilla renderizada con las tablas rellenas:
```markdown
## Comandos públicos
| Comando | Entrada (esquema) | Salida (esquema) | `schemaVersion` | Códigos de salida |
| --- | --- | --- | --- | --- |
| `bun run verify` | ninguna | `{ ok }` | `1` | `0`; `1` `DEMO_FAILED`; `2` `INVALID_ARGUMENTS` |
| `bun run build:target`, `bun run smoke:target`, `bun run release:publish` | `FORGE614_TARGET` | `{ ok }` | `1` | `0`; `1` `DEMO_FAILED` |

## Códigos de error
| Código | Significado |
| --- | --- |
| `INVALID_ARGUMENTS` | Argumento no admitido |
| `DEMO_FAILED` | Error inesperado |
```
`CONTRACT.en.md`: las mismas dos tablas bajo `## Public commands` / `## Error codes` (dos filas cada una).

Los demás archivos (README pair, install.sh, install.ps1, workflows, hook, plan, BRANCH_PROTECTION pair, `docs/decisions/TEMPLATE.md`) quedan como los renderizó la plantilla.

- [ ] **Step 2: Fixtures `fail-node`, `external-project`, `foreign-folder`**

`fail-node/` = copia de `pass-node/` con estas roturas, y solo estas (la e2e de Task 27 fija la evidencia exacta). El puntero se deja intacto a propósito: una huella editada a mano no llega a las comprobaciones, porque `checkRepository` la corta antes con `STANDARD_CORRUPT` (Task 21 lo prueba con una copia temporal de `pass-node`):
1. Borrar `.githooks/pre-push` → `layout` fail.
2. `src/app/bad.ts`: `export function f(x: any): void {\n  return x;\n}\n` → `stack` fail.
3. Borrar `docs/en/00-summary.md` → `docs-parity` fail.
4. `package.json` `version` → `0.2.0` (notion-map sigue en 0.1.0) → `versions` fail.
5. `src/config.ts`: `export const KEY = "AKIAIOSFODNN7EXAMPLE";\n` → `secrets-hygiene` fail (la ruta está bajo `fixtures/` en el repo de Sentinel, así que la autoverificación no la marca).
6. `install.sh`: cambiar `set -euo pipefail` por `set -eu` → `installer` fail.

`external-project/.forge614/project.json`: `{}`; `external-project/README.md`: `# external\n`.
`foreign-folder/notes.txt`: `nothing to see\n`.

- [ ] **Step 3: Test de las fixtures contra el registro de comprobaciones**

El orquestador llega en Task 21; aquí cada fixture se prueba directamente contra `CHECKS` con el reglamento real de `fixtures/standard/`:

```ts
// tests/full-node-fixtures.test.ts
import { beforeAll, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { buildCheckParams } from "../src/app/build-check-params";
import { classifyRepository } from "../src/app/classify-repository";
import { fetchStandard } from "../src/app/fetch-standard";
import { loadStandard, type LoadedStandard } from "../src/app/load-standard";
import { takeSnapshot } from "../src/app/take-snapshot";
import { fileFetcher } from "../src/infrastructure/network";
import { CHECKS } from "../src/modules/checks";
import { standardSource } from "../src/modules/standard-source";
import { FIXTURES } from "./helpers/snapshot-from-dir";

const SHA = "18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922";
let standard: LoadedStandard | undefined;

beforeAll(async () => {
  const cacheRoot = mkdtempSync(join(tmpdir(), "sentinel-full-node-"));
  const fetched = await fetchStandard({ source: standardSource("1.0.0", SHA), cacheRoot, fetcher: fileFetcher(), releaseBase: pathToFileURL(join(FIXTURES, "standard")).href });
  if (!fetched.ok) throw new Error(fetched.error);
  const loaded = loadStandard({ version: "1.0.0", expectedSha256: SHA, cacheRoot });
  if (!loaded.ok) throw new Error(loaded.error);
  standard = loaded.standard;
});

// id → verdict for every registered check, "not-applicable" when its
// appliesWhen is false.
function verdicts(name: string): Record<string, string> {
  if (standard === undefined) throw new Error("standard not loaded");
  const root = join(FIXTURES, name);
  const classification = classifyRepository(root);
  if (classification.kind !== "node") throw new Error(`${name}: ${classification.kind}`);
  const built = buildCheckParams({ standard, pointer: classification.pointer, pointerVersionSha256: SHA, today: "2026-09-23", sentinelVersion: "0.1.0", knownCheckIds: CHECKS.map((c) => c.id) });
  if (!built.ok) throw new Error(built.error);
  const snapshot = takeSnapshot(root);
  const out: Record<string, string> = {};
  for (const check of CHECKS) out[check.id] = check.appliesWhen(snapshot, built.params) ? check.run(snapshot, built.params).verdict : "not-applicable";
  return out;
}

test("pass-node passes every applicable check; support-matrix, context-budget and rules-catalog do not apply", () => {
  const notPass = Object.entries(verdicts("pass-node")).filter(([, verdict]) => verdict !== "pass").sort();
  expect(notPass).toEqual([
    ["context-budget", "not-applicable"],
    ["rules-catalog", "not-applicable"],
    ["support-matrix", "not-applicable"],
  ]);
});

test("fail-node fails exactly the six broken checks", () => {
  const failed = Object.entries(verdicts("fail-node")).filter(([, verdict]) => verdict === "fail").map(([id]) => id).sort();
  expect(failed).toEqual(["docs-parity", "installer", "layout", "secrets-hygiene", "stack", "versions"]);
});

test("external-project and foreign-folder are classified by identity files only", () => {
  expect(classifyRepository(join(FIXTURES, "external-project"))).toEqual({ kind: "external-project" });
  expect(classifyRepository(join(FIXTURES, "foreign-folder"))).toEqual({ kind: "not-a-forge614-repo" });
});
```

- [ ] **Step 4: Ejecutar**

Run: `bun run typecheck && bun test tests/full-node-fixtures.test.ts src/modules/checks`
Expected: 3 pass y las comprobaciones siguen en verde. Si `pass-node` tiene una entrada distinta de `pass`, correr esa comprobación con `bun -e` sobre la fixture y leer su evidencia: indica qué archivo de la fixture falta o difiere; se corrige la fixture, nunca la comprobación.

- [ ] **Step 5: Commit (lo hace el propietario)**

```bash
git add fixtures/pass-node fixtures/fail-node fixtures/external-project fixtures/foreign-folder tests/full-node-fixtures.test.ts
git commit -m "test(fixtures): nodos completos pass-node y fail-node, proyecto externo y carpeta ajena"
```

---

### Task 21: `app`: `runChecks`, `buildReport` y el orquestador `checkRepository`

**Files:**
- Create: `src/app/run-checks.ts`, `src/app/run-checks.test.ts`
- Create: `src/app/build-report.ts`, `src/app/build-report.test.ts`
- Create: `src/app/check-repository.ts`, `src/app/check-repository.test.ts`

**Interfaces:**
- Consumes: `CHECKS`, `NATIVE_CHECK_IDS` (Task 19), `classifyRepository`, `takeSnapshot`, `buildCheckParams` (Task 8), `loadStandard`, `fetchStandard`, `standardSource` (Task 7), `readCacheManifest` (Task 6), `renderBoth`, `worst` (Task 3), fixtures de nodo completo (Task 20).
- Produces:
  ```ts
  // src/app/run-checks.ts
  export interface Selection { selected: CheckDefinition[]; outdated: Array<{ validator: string; rule: string }> }
  export function selectChecks(params: CheckParams, registry: readonly CheckDefinition[], nativeIds: readonly string[], only?: readonly string[]): Selection;
  export interface RunChecksResult { entries: CheckEntry[]; crashed: string[] }
  export async function runChecks(snapshot: RepoSnapshot, params: CheckParams, selection: Selection): Promise<RunChecksResult>;
  // src/app/build-report.ts
  export function buildReport(input: { sentinelVersion: string; standard: { version: string; sha256: string; forced: boolean; fetched: boolean; latestKnown: string }; repositoryName: string; entries: CheckEntry[]; durationMs: number }): CheckReport;
  // src/app/check-repository.ts
  export interface CheckRepositoryOptions { root: string; standardVersion?: string; only?: readonly string[]; cacheRoot: string; fetcher: Fetcher; releaseBase: string; today: string; sentinelVersion: string; clock?: () => number }
  export type CheckRepositoryResult =
    | { kind: "report"; report: CheckReport; crashed: string[] }
    | { kind: "not-applicable"; report: NotApplicableReport }
    | { kind: "error"; code: "NODE_POINTER_INVALID" | "STANDARD_UNAVAILABLE" | "STANDARD_CORRUPT" | "STANDARD_FETCH_FAILED"; error: string };
  export async function checkRepository(options: CheckRepositoryOptions): Promise<CheckRepositoryResult>;
  ```

- [ ] **Step 1: Tests de `runChecks` (fallan)**

```ts
// src/app/run-checks.test.ts
import { expect, test } from "bun:test";
import { testParams } from "../../tests/helpers/params";
import type { CheckDefinition } from "../modules/check";
import { pass } from "../modules/check";
import { CHECKS, NATIVE_CHECK_IDS } from "../modules/checks";
import type { RuleManifest } from "../modules/schemas/rule-manifest";
import { snapshotFrom } from "../modules/snapshot";
import { runChecks, selectChecks } from "./run-checks";

const manifest = (name: string, validator?: string): RuleManifest => ({ schemaVersion: 1, name, version: "1.0.0", level: "core", title: { es: "t", en: "t" }, appliesWhen: [], decisions: ["0001"], ...(validator === undefined ? {} : { validator }) });

const packParams = testParams({
  pack: { schemaVersion: 1, name: "forge614-pack-ecosystem-node", version: "1.0.0", title: { es: "t", en: "t" }, rules: ["forge614-rule-a", "forge614-rule-b", "forge614-rule-c", "forge614-rule-d"] },
  manifests: new Map([
    ["forge614-rule-a", manifest("forge614-rule-a", "package-naming")],
    ["forge614-rule-b", manifest("forge614-rule-b", "bilingual-docs")],
    ["forge614-rule-c", manifest("forge614-rule-c")],
    ["forge614-rule-d", manifest("forge614-rule-d", "boundaries-zod")],
  ]),
});

test("selects checks named by the pack (through the legacy map) plus the native set, in registry order, and lists unknown validators as outdated", () => {
  const s = selectChecks(packParams, CHECKS, NATIVE_CHECK_IDS);
  expect(s.selected.map((c) => c.id)).toEqual([
    "node-pointer", "layout", "stack", "secrets-hygiene", "package-naming", "docs-parity",
    "node-contract", "installer", "release", "versions", "support-matrix", "ecosystem-contract", "rules-catalog",
  ]);
  expect(s.outdated).toEqual([{ validator: "boundaries-zod", rule: "forge614-rule-d" }]);
});

test("--only narrows the selection and the outdated list", () => {
  const s = selectChecks(packParams, CHECKS, NATIVE_CHECK_IDS, ["layout", "docs-parity", "boundaries-zod"]);
  expect(s.selected.map((c) => c.id)).toEqual(["layout", "docs-parity"]);
  expect(s.outdated).toEqual([{ validator: "boundaries-zod", rule: "forge614-rule-d" }]);
});

test("runs applicable checks, marks the rest not-applicable, and renders both messages", async () => {
  const s = selectChecks(packParams, CHECKS, NATIVE_CHECK_IDS, ["layout", "support-matrix"]);
  const { entries, crashed } = await runChecks(snapshotFrom({}), packParams, s);
  expect(crashed).toEqual([]);
  expect(entries.map((e) => [e.id, e.verdict, e.applied])).toEqual([
    ["layout", "fail", true],
    ["support-matrix", "not-applicable", false],
  ]);
  expect(entries[1]?.message).toEqual({ es: "No aplica: standard/support-matrix.json not present.", en: "Not applicable: standard/support-matrix.json not present." });
  expect(entries[0]?.message.es.length).toBeGreaterThan(0);
});

test("an outdated validator becomes a caution entry with SENTINEL_OUTDATED in the evidence", async () => {
  const s = selectChecks(packParams, CHECKS, NATIVE_CHECK_IDS, ["boundaries-zod"]);
  const { entries } = await runChecks(snapshotFrom({}), packParams, s);
  expect(entries).toEqual([
    {
      id: "boundaries-zod",
      verdict: "caution",
      applied: true,
      evidence: ["SENTINEL_OUTDATED: validator 'boundaries-zod' requested by forge614-rule-d is not implemented by sentinel 0.1.0"],
      message: {
        es: "El reglamento pide el validador 'boundaries-zod' que esta versión de Sentinel no implementa: actualiza Sentinel.",
        en: "The standard requests validator 'boundaries-zod', which this Sentinel version does not implement: update Sentinel.",
      },
    },
  ]);
});

test("a throwing check becomes CHECK_FAILED evidence with verdict fail; the others still run", async () => {
  const boom: CheckDefinition = { id: "boom", appliesWhen: () => true, run: () => { throw new Error("kaput"); } };
  const fine: CheckDefinition = { id: "fine", appliesWhen: () => true, run: () => pass("layoutOk") };
  const { entries, crashed } = await runChecks(snapshotFrom({}), packParams, { selected: [boom, fine], outdated: [] });
  expect(crashed).toEqual(["boom"]);
  expect(entries[0]).toMatchObject({ id: "boom", verdict: "fail", applied: true, evidence: ["CHECK_FAILED: kaput"] });
  expect(entries[0]?.message.en).toContain("kaput");
  expect(entries[1]).toMatchObject({ id: "fine", verdict: "pass" });
});
```

- [ ] **Step 2: Implementar `run-checks.ts`**

```ts
import type { CheckDefinition, CheckResult } from "../modules/check";
import type { CheckParams } from "../modules/check-params";
import { renderBoth } from "../modules/messages/render";
import type { CheckEntry } from "../modules/report";
import type { RepoSnapshot } from "../modules/snapshot";

export interface Selection {
  selected: CheckDefinition[];
  outdated: Array<{ validator: string; rule: string }>;
}

// The pack decides what runs (spec D3): every rule's `validator` (through
// the legacy name map) plus the checks Sentinel implements natively for the
// standard version that does not yet name them. A validator this Sentinel
// lacks is never dropped silently: it is carried as an outdated entry.
export function selectChecks(params: CheckParams, registry: readonly CheckDefinition[], nativeIds: readonly string[], only?: readonly string[]): Selection {
  const wanted = new Set<string>(nativeIds);
  const outdated: Array<{ validator: string; rule: string }> = [];
  for (const rule of params.pack.rules) {
    const validator = params.manifests.get(rule)?.validator;
    if (validator === undefined) continue;
    const id = params.legacyValidatorIds[validator] ?? validator;
    if (registry.some((c) => c.id === id)) wanted.add(id);
    else outdated.push({ validator, rule });
  }
  const onlySet = only === undefined ? undefined : new Set(only);
  const keep = (id: string): boolean => onlySet === undefined || onlySet.has(id);
  return {
    selected: registry.filter((c) => wanted.has(c.id) && keep(c.id)),
    outdated: outdated.filter((o) => keep(o.validator)),
  };
}

export interface RunChecksResult {
  entries: CheckEntry[];
  crashed: string[];
}

function toEntry(id: string, result: CheckResult, applied: boolean): CheckEntry {
  return { id, verdict: result.verdict, applied, evidence: result.evidence, message: renderBoth(result.messageKey, result.params) };
}

function notApplicableReason(check: CheckDefinition, snapshot: RepoSnapshot): string {
  switch (check.id) {
    case "support-matrix":
      return "standard/support-matrix.json not present";
    case "context-budget":
      return "standard/packs/forge614-pack-ecosystem-node/pack.json not present";
    case "rules-catalog":
      return "no standard/rules or standard/packs in this repository";
    case "installer":
      return "forge614-ai is exempt from the installer template";
    case "stack":
      return "no package.json or tsconfig.json";
    case "versions":
      return "no package.json";
    case "node-contract":
      return "no CONTRACT.md";
    default:
      return `appliesWhen returned false (${snapshot.files.size} files)`;
  }
}

// Checks are pure and independent, so they run through Promise.all: in 0.1
// every `run` is synchronous and the order of entries is the selection
// order regardless of timing. A throw inside a check is captured as a
// CHECK_FAILED entry (spec §7); the run continues.
export async function runChecks(snapshot: RepoSnapshot, params: CheckParams, selection: Selection): Promise<RunChecksResult> {
  const crashed: string[] = [];
  const entries = await Promise.all(
    selection.selected.map(async (check): Promise<CheckEntry> => {
      if (!check.appliesWhen(snapshot, params)) {
        return toEntry(check.id, { verdict: "not-applicable", evidence: [], messageKey: "notApplicable", params: { reason: notApplicableReason(check, snapshot) } }, false);
      }
      try {
        return toEntry(check.id, check.run(snapshot, params), true);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        crashed.push(check.id);
        return toEntry(check.id, { verdict: "fail", evidence: [`CHECK_FAILED: ${message}`], messageKey: "checkFailed", params: { error: message } }, true);
      }
    }),
  );
  for (const { validator, rule } of selection.outdated) {
    entries.push(
      toEntry(
        validator,
        {
          verdict: "caution",
          evidence: [`SENTINEL_OUTDATED: validator '${validator}' requested by ${rule} is not implemented by sentinel ${params.sentinelVersion}`],
          messageKey: "sentinelOutdated",
          params: { validator },
        },
        true,
      ),
    );
  }
  return { entries, crashed: crashed.sort() };
}
```

- [ ] **Step 3: `build-report.ts` con test**

```ts
// src/app/build-report.test.ts
import { expect, test } from "bun:test";
import { CheckReportSchema, type CheckEntry } from "../modules/report";
import { buildReport } from "./build-report";

const entry = (id: string, verdict: CheckEntry["verdict"], applied = true): CheckEntry => ({ id, verdict, applied, evidence: [], message: { es: "x", en: "x" } });
const standard = { version: "1.0.0", sha256: "18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922", forced: false, fetched: false, latestKnown: "1.0.0" };

test("verdict is the worst of the applied entries; not-applicable does not count", () => {
  const r = buildReport({ sentinelVersion: "0.1.0", standard, repositoryName: "demo", entries: [entry("a", "pass"), entry("b", "not-applicable", false), entry("c", "caution")], durationMs: 12 });
  expect(CheckReportSchema.safeParse(r).success).toBe(true);
  expect(r.verdict).toBe("caution");
  expect(r.standard).toEqual({ version: "1.0.0", sha256: standard.sha256, forced: false, fetched: false });
  expect(r.repository).toEqual({ kind: "node", name: "demo" });
});

test("latestKnown appears only when a newer standard than the one used is cached", () => {
  const r = buildReport({ sentinelVersion: "0.1.0", standard: { ...standard, latestKnown: "1.1.0" }, repositoryName: "demo", entries: [], durationMs: 0 });
  expect(r.standard.latestKnown).toBe("1.1.0");
  expect(r.verdict).toBe("pass");
});
```

```ts
// src/app/build-report.ts
import { worst } from "../modules/check";
import { compareSemver } from "../modules/semver";
import type { CheckEntry, CheckReport } from "../modules/report";

export interface BuildReportInput {
  sentinelVersion: string;
  standard: { version: string; sha256: string; forced: boolean; fetched: boolean; latestKnown: string };
  repositoryName: string;
  entries: CheckEntry[];
  durationMs: number;
}

export function buildReport(input: BuildReportInput): CheckReport {
  const { version, sha256, forced, fetched, latestKnown } = input.standard;
  const newer = compareSemver(latestKnown, version) > 0;
  return {
    schemaVersion: 1,
    sentinel: input.sentinelVersion,
    standard: { version, sha256, forced, fetched, ...(newer ? { latestKnown } : {}) },
    repository: { kind: "node", name: input.repositoryName },
    verdict: worst(input.entries.filter((e) => e.applied).map((e) => e.verdict)),
    checks: input.entries,
    durationMs: input.durationMs,
  };
}
```

- [ ] **Step 4: Tests del orquestador (fallan)**

```ts
// src/app/check-repository.test.ts
import { expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileFetcher, offlineFetcher } from "../infrastructure/network";
import { CheckReportSchema } from "../modules/report";
import { checkRepository } from "./check-repository";

const FIXTURES = resolve(import.meta.dir, "../../fixtures");
const SHA = "18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922";
const BASE = pathToFileURL(join(FIXTURES, "standard")).href;
const base = () => ({ cacheRoot: mkdtempSync(join(tmpdir(), "sentinel-check-")), fetcher: fileFetcher(), releaseBase: BASE, today: "2026-09-23", sentinelVersion: "0.1.0" });

test("pass-node: verdict pass, 19 entries, three not-applicable, standard fetched on first run and cached on the second", async () => {
  const options = { ...base(), root: join(FIXTURES, "pass-node") };
  const first = await checkRepository(options);
  expect(first.kind).toBe("report");
  if (first.kind !== "report") return;
  expect(CheckReportSchema.safeParse(first.report).success).toBe(true);
  expect(first.report.verdict).toBe("pass");
  expect(first.report.checks).toHaveLength(19);
  expect(first.report.checks.filter((c) => c.verdict === "not-applicable").map((c) => c.id)).toEqual(["support-matrix", "context-budget", "rules-catalog"]);
  expect(first.report.standard).toEqual({ version: "1.0.0", sha256: "18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922", forced: false, fetched: true });
  expect(first.report.repository).toEqual({ kind: "node", name: "demo" });
  const second = await checkRepository(options);
  if (second.kind !== "report") throw new Error(second.kind);
  expect(second.report.standard.fetched).toBe(false);
});

test("fail-node: verdict fail with exactly the six broken checks failing", async () => {
  const r = await checkRepository({ ...base(), root: join(FIXTURES, "fail-node") });
  if (r.kind !== "report") throw new Error(r.kind);
  expect(r.report.verdict).toBe("fail");
  expect(r.report.checks.filter((c) => c.verdict === "fail").map((c) => c.id).sort()).toEqual(["docs-parity", "installer", "layout", "secrets-hygiene", "stack", "versions"]);
  expect(r.crashed).toEqual([]);
});

test("a hand-edited pointer fingerprint is STANDARD_CORRUPT before any check runs (fresh cache and warm cache)", async () => {
  const root = mkdtempSync(join(tmpdir(), "sentinel-handptr-"));
  cpSync(join(FIXTURES, "pass-node"), root, { recursive: true });
  const pointerPath = join(root, "forge614.node.json");
  writeFileSync(pointerPath, readFileSync(pointerPath, "utf8").replace(SHA, "0".repeat(64)));
  // Fresh cache: SHA256SUMS of the release disagrees with the pointer.
  expect(await checkRepository({ ...base(), root })).toMatchObject({ kind: "error", code: "STANDARD_CORRUPT" });
  // Warm cache: the cached manifest disagrees with the pointer.
  const options = base();
  expect((await checkRepository({ ...options, root: join(FIXTURES, "pass-node") })).kind).toBe("report");
  expect(await checkRepository({ ...options, root })).toMatchObject({ kind: "error", code: "STANDARD_CORRUPT" });
});

test("external project and foreign folder are not applicable, without loading the standard", async () => {
  let calls = 0;
  const fetcher = async (url: string) => {
    calls += 1;
    return fileFetcher()(url);
  };
  expect(await checkRepository({ ...base(), fetcher, root: join(FIXTURES, "external-project") })).toEqual({ kind: "not-applicable", report: { schemaVersion: 1, applicable: false, reason: "external-project" } });
  expect(await checkRepository({ ...base(), fetcher, root: join(FIXTURES, "foreign-folder") })).toEqual({ kind: "not-applicable", report: { schemaVersion: 1, applicable: false, reason: "not-a-forge614-repo" } });
  expect(calls).toBe(0);
});

test("no cache and no network is STANDARD_UNAVAILABLE naming the fetch command; nothing is checked", async () => {
  const r = await checkRepository({ ...base(), fetcher: offlineFetcher(), root: join(FIXTURES, "pass-node") });
  expect(r).toMatchObject({ kind: "error", code: "STANDARD_UNAVAILABLE" });
  if (r.kind !== "error") return;
  expect(r.error).toContain("forge614-sentinel standard fetch 1.0.0");
});

test("--only runs the named checks only; --standard forces a version and marks the report", async () => {
  const options = { ...base(), root: join(FIXTURES, "pass-node") };
  const only = await checkRepository({ ...options, only: ["layout", "versions"] });
  if (only.kind !== "report") throw new Error(only.kind);
  expect(only.report.checks.map((c) => c.id)).toEqual(["layout", "versions"]);
  const forced = await checkRepository({ ...options, standardVersion: "1.0.0" });
  if (forced.kind !== "report") throw new Error(forced.kind);
  expect(forced.report.standard.forced).toBe(true);
  expect(forced.report.checks.find((c) => c.id === "node-pointer")?.verdict).toBe("pass");
  const unknown = await checkRepository({ ...options, standardVersion: "9.9.9" });
  expect(unknown).toMatchObject({ kind: "error", code: "STANDARD_FETCH_FAILED" });
});

test("an invalid pointer is NODE_POINTER_INVALID", async () => {
  const root = mkdtempSync(join(tmpdir(), "sentinel-badptr-"));
  await Bun.write(join(root, "forge614.node.json"), "{ \"schemaVersion\": 2 }");
  expect(await checkRepository({ ...base(), root })).toMatchObject({ kind: "error", code: "NODE_POINTER_INVALID" });
});
```

- [ ] **Step 5: Implementar `check-repository.ts`**

```ts
import { readCacheManifest } from "../infrastructure/cache";
import type { Fetcher } from "../infrastructure/network";
import { CHECKS, NATIVE_CHECK_IDS } from "../modules/checks";
import type { CheckReport, NotApplicableReport } from "../modules/report";
import { standardSource } from "../modules/standard-source";
import { buildCheckParams } from "./build-check-params";
import { buildReport } from "./build-report";
import { classifyRepository } from "./classify-repository";
import { fetchStandard } from "./fetch-standard";
import { loadStandard, type LoadStandardResult } from "./load-standard";
import { runChecks, selectChecks } from "./run-checks";
import { takeSnapshot } from "./take-snapshot";

export interface CheckRepositoryOptions {
  root: string;
  standardVersion?: string;
  only?: readonly string[];
  cacheRoot: string;
  fetcher: Fetcher;
  releaseBase: string;
  today: string;
  sentinelVersion: string;
  clock?: () => number;
}

export type CheckRepositoryResult =
  | { kind: "report"; report: CheckReport; crashed: string[] }
  | { kind: "not-applicable"; report: NotApplicableReport }
  | { kind: "error"; code: "NODE_POINTER_INVALID" | "STANDARD_UNAVAILABLE" | "STANDARD_CORRUPT" | "STANDARD_FETCH_FAILED"; error: string };

// The whole use case, in the order the spec fixes: identity (§4), standard
// resolution and cache (§5), one snapshot, the checks (§8), the report
// (§6). Network can only happen in `fetchStandard`, before any check runs.
export async function checkRepository(options: CheckRepositoryOptions): Promise<CheckRepositoryResult> {
  const clock = options.clock ?? (() => performance.now());
  const started = clock();

  const classification = classifyRepository(options.root);
  if (classification.kind === "invalid-pointer") return { kind: "error", code: "NODE_POINTER_INVALID", error: classification.error };
  if (classification.kind !== "node") return { kind: "not-applicable", report: { schemaVersion: 1, applicable: false, reason: classification.kind } };
  const { pointer } = classification;

  // `forced` is "the flag was given" (the report says so even when the
  // forced version equals the declared one); the pointer's fingerprint is
  // only an expectation when the version is the declared one.
  const forced = options.standardVersion !== undefined;
  const version = options.standardVersion ?? pointer.standard.version;
  const sameAsPointer = version === pointer.standard.version;
  const load: { expectedSha256?: string; cacheRoot: string; version: string } = sameAsPointer
    ? { version, cacheRoot: options.cacheRoot, expectedSha256: pointer.standard.sha256 }
    : { version, cacheRoot: options.cacheRoot };

  let fetched = false;
  let loaded: LoadStandardResult = loadStandard(load);
  if (!loaded.ok && loaded.code === "STANDARD_UNAVAILABLE") {
    const source = load.expectedSha256 === undefined ? standardSource(version) : standardSource(version, load.expectedSha256);
    const result = await fetchStandard({ source, cacheRoot: options.cacheRoot, fetcher: options.fetcher, releaseBase: options.releaseBase });
    if (!result.ok) {
      if (result.reason === "network") return { kind: "error", code: "STANDARD_UNAVAILABLE", error: `${loaded.error} (${result.error})` };
      return { kind: "error", code: result.reason === "corrupt" ? "STANDARD_CORRUPT" : "STANDARD_FETCH_FAILED", error: result.error };
    }
    fetched = true;
    loaded = loadStandard(load);
  }
  if (!loaded.ok) return { kind: "error", code: loaded.code, error: loaded.error };

  const pointerManifest = sameAsPointer ? undefined : readCacheManifest(options.cacheRoot, pointer.standard.version);
  const pointerVersionSha256 = sameAsPointer ? loaded.standard.sha256 : pointerManifest?.kind === "ok" ? pointerManifest.manifest.sha256 : undefined;

  const params = buildCheckParams({
    standard: loaded.standard,
    pointer,
    pointerVersionSha256,
    today: options.today,
    sentinelVersion: options.sentinelVersion,
    knownCheckIds: CHECKS.map((c) => c.id),
  });
  if (!params.ok) return { kind: "error", code: params.code, error: params.error };

  const snapshot = takeSnapshot(options.root);
  const selection = selectChecks(params.params, CHECKS, NATIVE_CHECK_IDS, options.only);
  const { entries, crashed } = await runChecks(snapshot, params.params, selection);

  const report = buildReport({
    sentinelVersion: options.sentinelVersion,
    standard: { version, sha256: loaded.standard.sha256, forced, fetched, latestKnown: loaded.standard.latestKnown },
    repositoryName: pointer.node,
    entries,
    durationMs: Math.max(0, Math.round(clock() - started)),
  });
  return { kind: "report", report, crashed };
}
```

- [ ] **Step 6: Ejecutar**

Run: `bun run typecheck && bun test src/app`
Expected: verde (run-checks 5, build-report 2, check-repository 7 y los tests anteriores de `src/app`).

- [ ] **Step 7: Commit (lo hace el propietario)**

```bash
git add src/app/run-checks.ts src/app/run-checks.test.ts src/app/build-report.ts src/app/build-report.test.ts src/app/check-repository.ts src/app/check-repository.test.ts
git commit -m "feat(app): selección por pack, ejecución con captura de CHECK_FAILED, informe y orquestador check-repository"
```


---

### Task 22: CLI `check`: versión, argumentos, códigos y el comando principal

**Files:**
- Create: `src/interfaces/cli/version.ts`, `src/interfaces/cli/version.test.ts`
- Create: `src/interfaces/cli/args.ts`, `src/interfaces/cli/args.test.ts`
- Create: `src/interfaces/cli/codes.ts`
- Create: `src/interfaces/cli/check.ts`, `src/interfaces/cli/check.test.ts`
- Create: `src/app/run-command.ts` (reexporta `run` para que `interfaces` no importe `infrastructure`)

**Interfaces:**
- Consumes: `checkRepository` (Task 21), `cacheRoot`, `fetcherFromEnv`, `releaseBaseFromEnv` desde `app/environment` (Task 6), `CHECK_IDS`, `CHECKS` (Task 19), `printJson`/`printError`/`runCli` (Task 1), fixtures de nodo completo (Task 20).
- Produces:
  ```ts
  // version.ts
  export const PRODUCT_NAME = "forge614-sentinel";
  export const SENTINEL_VERSION: string;            // from package.json, bundled into the binary
  export function printVersionIfRequested(argv: string[]): boolean;
  // args.ts
  export function parseFlags(argv: string[]): Record<string, true>;
  export function parsePairs(argv: string[]): Record<string, string>;   // `--key value` only (workflows-run, Task 24)
  export function parseMixed(argv: string[], valueFlags: readonly string[]): { flags: Record<string, string | true>; positionals: string[] };
  export function issuesOf(error: z.ZodError): string;
  // codes.ts
  export const SENTINEL_ERROR_CODES: readonly string[]; // every code of spec §7 plus INVALID_ARGUMENTS
  // check.ts
  export const CHECK_USAGE = "check [--repo <path>] [--standard <version>] [--only <id,id>] [--strict] [--json]";
  export function checkMain(argv: string[], env?: Record<string, string | undefined>, tty?: boolean): Promise<number>;
  // src/app/run-command.ts
  export function runCommand(cmd: string[], options?: RunOptions): RunResult;
  ```
- Exit codes (spec §6, §7): `0` pass / caution / not applicable; `1` fail, caution con `--strict`, `STANDARD_*`, `CHECK_FAILED`, `SENTINEL_FAILED`; `2` `INVALID_ARGUMENTS`, `NODE_POINTER_INVALID`.

- [ ] **Step 1: `version.ts` con test parametrizado**

```ts
// src/interfaces/cli/version.ts
import { z } from "zod";
import packageJson from "../../../package.json";
import { printJson } from "./output";

export const PRODUCT_NAME = "forge614-sentinel";

// package.json is bundled into the compiled binary (resolveJsonModule), so
// `--version` never reads the disk: it works from any working directory.
const PackageVersion = z.object({ name: z.literal(PRODUCT_NAME), version: z.string().regex(/^\d+\.\d+\.\d+$/) }).passthrough();
export const SENTINEL_VERSION: string = PackageVersion.parse(packageJson).version;

// STANDARD §4: `--version` is always available and never blocking. Every
// CLI calls this first, before any other argument parsing.
export function printVersionIfRequested(argv: string[]): boolean {
  if (!argv.includes("--version")) return false;
  printJson({ schemaVersion: 1, name: PRODUCT_NAME, version: SENTINEL_VERSION });
  return true;
}
```

```ts
// src/interfaces/cli/version.test.ts
import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { run } from "../../infrastructure/process";
import { PRODUCT_NAME, SENTINEL_VERSION } from "./version";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const VersionEnvelope = z.object({ schemaVersion: z.literal(1), name: z.literal(PRODUCT_NAME), version: z.literal(SENTINEL_VERSION) }).strict();

// Every entry point in this folder answers --version before anything else.
const HELPERS = new Set(["output.ts", "version.ts", "args.ts", "codes.ts"]);
const CLIS = readdirSync(import.meta.dir).filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts") && !HELPERS.has(n)).sort();

describe("--version in every CLI", () => {
  // check.ts arrives first (this task); standard-fetch.ts, main.ts and the
  // development CLIs join the list as their tasks add them.
  test("there are entry points to check", () => expect(CLIS.length).toBeGreaterThan(0));
  for (const cli of CLIS) {
    test(`${cli} --version exits 0 with { schemaVersion, name, version }`, () => {
      const r = run(["bun", "run", resolve(import.meta.dir, cli), "--version"], { cwd: REPO_ROOT });
      expect(r.exitCode, r.stderr).toBe(0);
      expect(r.stderr).toBe("");
      expect(VersionEnvelope.safeParse(JSON.parse(r.stdout.trim())).success).toBe(true);
    });
  }
});
```

- [ ] **Step 2: `args.ts` (portado con `parseFlags`, `parsePairs` e `issuesOf`, más `parseMixed`) con test**

```ts
// src/interfaces/cli/args.ts
import type { z } from "zod";

export function parseFlags(argv: string[]): Record<string, true> {
  const out: Record<string, true> = {};
  for (const arg of argv) out[arg.startsWith("--") ? arg.slice(2) : arg] = true;
  return out;
}

// `--key value` CLIs (workflows-run): pairs only; a key without a value at
// the end is dropped, and the strict schema on top rejects unknown keys.
export function parsePairs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key?.startsWith("--") && value !== undefined) out[key.slice(2)] = value;
  }
  return out;
}

// `--key value` for the flags listed in valueFlags, bare `--flag` for the
// rest, and anything without `--` as a positional. A value flag at the end
// without its value becomes `true`, which the strict schema then rejects.
export function parseMixed(argv: string[], valueFlags: readonly string[]): { flags: Record<string, string | true>; positionals: string[] } {
  const flags: Record<string, string | true> = {};
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (valueFlags.includes(key)) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) flags[key] = true;
      else {
        flags[key] = value;
        i += 1;
      }
      continue;
    }
    flags[key] = true;
  }
  return { flags, positionals };
}

export function issuesOf(error: z.ZodError): string {
  return error.issues.map((issue) => (issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message)).join("; ");
}
```

```ts
// src/interfaces/cli/args.test.ts
import { expect, test } from "bun:test";
import { z } from "zod";
import { issuesOf, parseFlags, parseMixed, parsePairs } from "./args";

test("parseMixed separates value flags, bare flags and positionals", () => {
  expect(parseMixed(["--repo", "/x", "--strict", "--json", "extra"], ["repo", "standard", "only"])).toEqual({ flags: { repo: "/x", strict: true, json: true }, positionals: ["extra"] });
  expect(parseMixed(["--repo"], ["repo"])).toEqual({ flags: { repo: true }, positionals: [] });
  expect(parseMixed(["--repo", "--json"], ["repo"])).toEqual({ flags: { repo: true, json: true }, positionals: [] });
});

test("parsePairs keeps --key value pairs only (workflows-run)", () => {
  expect(parsePairs(["--workflow", "release"])).toEqual({ workflow: "release" });
  expect(parsePairs(["--workflow"])).toEqual({});
  expect(parsePairs(["stray", "x"])).toEqual({});
});

test("parseFlags and issuesOf behave as in forge614-ai", () => {
  expect(parseFlags(["--json", "x"])).toEqual({ json: true, x: true });
  const r = z.object({ a: z.string() }).strict().safeParse({ a: 1, b: 2 });
  expect(r.success).toBe(false);
  if (r.success) return;
  expect(issuesOf(r.error)).toContain("a: ");
});
```

- [ ] **Step 3: `codes.ts`**

```ts
// src/interfaces/cli/codes.ts
// Every error code Sentinel can emit (spec §7 plus INVALID_ARGUMENTS).
// `--help` prints this list, and node-contract cross-checks CONTRACT.md
// against these literals.
export const SENTINEL_ERROR_CODES: readonly string[] = [
  "INVALID_ARGUMENTS",
  "NODE_POINTER_INVALID",
  "STANDARD_UNAVAILABLE",
  "STANDARD_CORRUPT",
  "STANDARD_FETCH_FAILED",
  "CHECK_FAILED",
  "SENTINEL_FAILED",
];
```

- [ ] **Step 4: `src/app/run-command.ts`** (misma pieza que en `forge614-ai`; la usan las CLIs de desarrollo de las Tasks 24–27):

```ts
// src/app/run-command.ts
import { run, type RunOptions, type RunResult } from "../infrastructure/process";

export function runCommand(cmd: string[], options: RunOptions = {}): RunResult {
  return run(cmd, options);
}
```

- [ ] **Step 5: Tests de `check` (fallan)**

```ts
// src/interfaces/cli/check.test.ts
import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { run } from "../../infrastructure/process";
import { CheckReportSchema } from "../../modules/report";

const CLI = resolve(import.meta.dir, "check.ts");
const REPO_ROOT = resolve(import.meta.dir, "../../..");
const FIXTURES = join(REPO_ROOT, "fixtures");
const env = () => ({ FORGE614_HOME: mkdtempSync(join(tmpdir(), "sentinel-cli-")), FORGE614_SENTINEL_RELEASE_BASE: pathToFileURL(join(FIXTURES, "standard")).href });

function cli(args: string[], extraEnv: Record<string, string> = {}) {
  return run(["bun", "run", CLI, ...args], { cwd: REPO_ROOT, env: { ...env(), ...extraEnv } });
}

test("--help prints usage with the error codes and exits 0", () => {
  const r = cli(["--help"]);
  expect(r.exitCode).toBe(0);
  expect(JSON.parse(r.stdout.trim())).toMatchObject({ schemaVersion: 1, usage: "check [--repo <path>] [--standard <version>] [--only <id,id>] [--strict] [--json]" });
});

test("unknown flag, positional, bad --standard and unknown --only id are INVALID_ARGUMENTS with exit 2", () => {
  for (const args of [["--repo", ".", "--jsn"], ["extra"], ["--standard", "v1"], ["--only", "layout,nope"]]) {
    const r = cli(args);
    expect(r.exitCode, args.join(" ")).toBe(2);
    expect(JSON.parse(r.stderr.trim())).toMatchObject({ schemaVersion: 1, code: "INVALID_ARGUMENTS" });
    expect(r.stdout).toBe("");
  }
});

test("pass-node with --json: a single CheckReport on stdout, nothing on stderr, exit 0", () => {
  const r = cli(["--repo", join(FIXTURES, "pass-node"), "--json"]);
  expect(r.exitCode, r.stderr).toBe(0);
  expect(r.stderr).toBe("");
  const report = CheckReportSchema.parse(JSON.parse(r.stdout.trim()));
  expect(report.verdict).toBe("pass");
  expect(r.stdout.trim().split("\n")).toHaveLength(1);
});

test("fail-node exits 1 and still prints the full report; --only narrows", () => {
  const fail = cli(["--repo", join(FIXTURES, "fail-node"), "--json"]);
  expect(fail.exitCode).toBe(1);
  expect(CheckReportSchema.parse(JSON.parse(fail.stdout.trim())).verdict).toBe("fail");
  const only = cli(["--repo", join(FIXTURES, "fail-node"), "--only", "docs-parity", "--json"]);
  expect(JSON.parse(only.stdout.trim()).checks.map((c: { id: string }) => c.id)).toEqual(["docs-parity"]);
});

test("external project and foreign folder print the not-applicable report and exit 0", () => {
  const ext = cli(["--repo", join(FIXTURES, "external-project"), "--json"]);
  expect(ext.exitCode).toBe(0);
  expect(JSON.parse(ext.stdout.trim())).toEqual({ schemaVersion: 1, applicable: false, reason: "external-project" });
  const foreign = cli(["--repo", join(FIXTURES, "foreign-folder"), "--json"]);
  expect(JSON.parse(foreign.stdout.trim())).toEqual({ schemaVersion: 1, applicable: false, reason: "not-a-forge614-repo" });
});

test("no cache and no network: STANDARD_UNAVAILABLE on stderr with the fetch command, exit 1, no stdout", () => {
  const r = cli(["--repo", join(FIXTURES, "pass-node"), "--json"], { FORGE614_SENTINEL_OFFLINE: "1" });
  expect(r.exitCode).toBe(1);
  expect(r.stdout).toBe("");
  const envelope = JSON.parse(r.stderr.trim());
  expect(envelope).toMatchObject({ schemaVersion: 1, code: "STANDARD_UNAVAILABLE" });
  expect(envelope.error).toContain("forge614-sentinel standard fetch 1.0.0");
  expect(envelope.error).not.toContain(tmpdir());
});

test("an invalid pointer is NODE_POINTER_INVALID with exit 2", async () => {
  const root = mkdtempSync(join(tmpdir(), "sentinel-cli-ptr-"));
  await Bun.write(join(root, "forge614.node.json"), "{}");
  const r = cli(["--repo", root, "--json"]);
  expect(r.exitCode).toBe(2);
  expect(JSON.parse(r.stderr.trim())).toMatchObject({ code: "NODE_POINTER_INVALID" });
});
```

Añadir a `check.test.ts` el test de "una comprobación que lanza" a nivel CLI. Usa la variable de entorno de prueba `FORGE614_SENTINEL_CRASH_CHECK=<id>`: cuando está definida, `checkMain` envuelve la comprobación con ese id para que lance `Error("injected crash")`. Es una costura de prueba explícita (documentada en CONTRACT como variable de entorno de desarrollo), no un flag:

```ts
test("a crashing check prints the report (verdict fail) on stdout AND a CHECK_FAILED envelope on stderr, exit 1", () => {
  const r = cli(["--repo", join(FIXTURES, "pass-node"), "--json"], { FORGE614_SENTINEL_CRASH_CHECK: "layout" });
  expect(r.exitCode).toBe(1);
  const report = CheckReportSchema.parse(JSON.parse(r.stdout.trim()));
  expect(report.verdict).toBe("fail");
  expect(report.checks.find((c) => c.id === "layout")?.evidence).toEqual(["CHECK_FAILED: injected crash"]);
  expect(JSON.parse(r.stderr.trim())).toMatchObject({ schemaVersion: 1, code: "CHECK_FAILED" });
});
```

- [ ] **Step 6: Implementar `check.ts`**

```ts
// src/interfaces/cli/check.ts
import { resolve } from "node:path";
import { z } from "zod";
import { checkRepository, type CheckRepositoryOptions } from "../../app/check-repository";
import { cacheRoot, fetcherFromEnv, releaseBaseFromEnv } from "../../app/environment";
import { CHECK_IDS, CHECKS } from "../../modules/checks";
import type { CheckReport } from "../../modules/report";
import { issuesOf, parseMixed } from "./args";
import { SENTINEL_ERROR_CODES } from "./codes";
import { printError, printJson, runCli } from "./output";
import { printVersionIfRequested, SENTINEL_VERSION } from "./version";

export const CHECK_USAGE = "check [--repo <path>] [--standard <version>] [--only <id,id>] [--strict] [--json]";

const Args = z
  .object({
    help: z.literal(true).optional(),
    json: z.literal(true).optional(),
    strict: z.literal(true).optional(),
    repo: z.string().min(1).optional(),
    standard: z.string().regex(/^\d+\.\d+\.\d+$/, "must be X.Y.Z").optional(),
    only: z
      .string()
      .min(1)
      .transform((s) => s.split(",").map((id) => id.trim()).filter((id) => id !== ""))
      .optional(),
  })
  .strict();

function summary(report: CheckReport): string {
  const lines = report.checks.map((c) => {
    const head = `[sentinel] ${c.id}: ${c.verdict} — ${c.message.es}`;
    return c.evidence.length === 0 ? head : `${head}\n${c.evidence.map((e) => `  - ${e}`).join("\n")}`;
  });
  lines.push(`[sentinel] ${report.repository.name} · standard ${report.standard.version}${report.standard.forced ? " (forced)" : ""} · verdict: ${report.verdict} · ${report.durationMs} ms`);
  return `${lines.join("\n")}\n`;
}

export async function checkMain(argv: string[], env: Record<string, string | undefined> = process.env, tty: boolean = process.stderr.isTTY === true): Promise<number> {
  if (printVersionIfRequested(argv)) return 0;
  const { flags, positionals } = parseMixed(argv, ["repo", "standard", "only"]);
  if (positionals.length > 0) {
    printError("INVALID_ARGUMENTS", `unexpected argument '${positionals[0] ?? ""}'; usage: ${CHECK_USAGE}`);
    return 2;
  }
  const parsed = Args.safeParse(flags);
  if (!parsed.success) {
    printError("INVALID_ARGUMENTS", issuesOf(parsed.error));
    return 2;
  }
  if (parsed.data.help) {
    printJson({ schemaVersion: 1, usage: CHECK_USAGE, checks: CHECK_IDS, errorCodes: SENTINEL_ERROR_CODES });
    return 0;
  }
  const unknown = (parsed.data.only ?? []).filter((id) => !CHECK_IDS.includes(id));
  if (unknown.length > 0) {
    printError("INVALID_ARGUMENTS", `--only names unknown checks: ${unknown.join(", ")}`);
    return 2;
  }

  // Test seam (Review Focus 5): make one check throw to prove CHECK_FAILED
  // handling end to end with the real binary.
  const crash = env.FORGE614_SENTINEL_CRASH_CHECK;
  if (crash !== undefined) {
    const target = CHECKS.find((c) => c.id === crash);
    if (target !== undefined) target.run = () => { throw new Error("injected crash"); };
  }

  const options: CheckRepositoryOptions = {
    root: resolve(parsed.data.repo ?? "."),
    ...(parsed.data.standard === undefined ? {} : { standardVersion: parsed.data.standard }),
    ...(parsed.data.only === undefined ? {} : { only: parsed.data.only }),
    cacheRoot: cacheRoot(env),
    fetcher: fetcherFromEnv(env),
    releaseBase: releaseBaseFromEnv(env),
    today: new Date().toISOString().slice(0, 10),
    sentinelVersion: SENTINEL_VERSION,
  };
  const result = await checkRepository(options);

  if (result.kind === "error") {
    printError(result.code, result.error);
    return result.code === "NODE_POINTER_INVALID" ? 2 : 1;
  }
  if (result.kind === "not-applicable") {
    printJson({ ...result.report });
    return 0;
  }

  const { report, crashed } = result;
  if (parsed.data.json !== true && tty) process.stderr.write(summary(report));
  printJson({ ...report });
  if (crashed.length > 0) {
    printError("CHECK_FAILED", `checks threw an unexpected exception: ${crashed.join(", ")}`);
    return 1;
  }
  if (report.verdict === "fail") return 1;
  if (report.verdict === "caution") return parsed.data.strict === true ? 1 : 0;
  return 0;
}

if (import.meta.main) process.exit(await runCli("SENTINEL_FAILED", () => checkMain(process.argv.slice(2))));
```

Nota: `CheckDefinition.run` es mutable a propósito (interfaz, no `readonly`) solo para esta costura; ninguna otra ruta reasigna `run`.

- [ ] **Step 7: Ejecutar**

Run: `bun run typecheck && bun test src/interfaces tests/architecture`
Expected: verde; `version.test.ts` descubre `check.ts`; `import-rules` acepta el import de `package.json` solo desde `interfaces` y `check.ts` solo importa `app` y `modules`.

- [ ] **Step 8: Commit (lo hace el propietario)**

```bash
git add src/interfaces/cli/version.ts src/interfaces/cli/version.test.ts src/interfaces/cli/args.ts src/interfaces/cli/args.test.ts src/interfaces/cli/codes.ts src/interfaces/cli/check.ts src/interfaces/cli/check.test.ts src/app/run-command.ts
git commit -m "feat(cli): forge614-sentinel check con sobres de error y códigos de salida de la spec"
```

---

### Task 23: CLI `standard fetch`, despachador `main` y release falsa para revisiones forzadas

**Files:**
- Create: `tests/helpers/fake-release.ts`
- Create: `src/interfaces/cli/standard-fetch.ts`, `src/interfaces/cli/standard-fetch.test.ts`, `fixtures/standard-corrupt/standard-v1.0.0/{standard-1.0.0.tar.gz, SHA256SUMS}`
- Create: `src/interfaces/cli/main.ts`, `src/interfaces/cli/main.test.ts`
- Modify: `src/interfaces/cli/check.test.ts` (test de `--standard` forzado con la release falsa)

**Interfaces:**
- Consumes: `fetchStandard`, `standardSource` (Task 7), `classifyRepository` (Task 8), `cacheRoot`, `describeCacheLocation`, `fetcherFromEnv`, `releaseBaseFromEnv` desde `app/environment` (Task 6), `extractTarGz`, `sha256Hex` (Task 5), `buildUstarArchive` (Task 4), `checkMain`, `CHECK_USAGE`, `parseMixed`, `issuesOf`, `SENTINEL_ERROR_CODES`, `printVersionIfRequested` (Task 22).
- Produces:
  ```ts
  // tests/helpers/fake-release.ts
  export function writeFakeRelease(version: string, mutate: (members: TarMember[]) => TarMember[]): { base: string; sha256: string };
  // standard-fetch.ts
  export const FETCH_USAGE = "standard fetch [<version>] [--json]";
  export function standardFetchMain(argv: string[], env?: Record<string, string | undefined>): Promise<number>;
  // main.ts (binary entry point)
  export const USAGE: string;
  export function main(argv: string[]): Promise<number>;
  ```
- Exit codes (spec §6, §7): `0` pass / caution / not applicable; `1` fail, caution con `--strict`, `STANDARD_*`, `CHECK_FAILED`, `SENTINEL_FAILED`; `2` `INVALID_ARGUMENTS`, `NODE_POINTER_INVALID`.

- [ ] **Step 1: Helper `fake-release.ts`**

Helper de test para fabricar una release futura del reglamento a partir de la fixture real (usa el writer ustar de Task 4 y `gzipSync` de fflate; el sha256 resultante es el que la release falsa publica en su `SHA256SUMS`):

```ts
// tests/helpers/fake-release.ts
import { gzipSync } from "fflate";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { extractTarGz } from "../../src/infrastructure/archive";
import { sha256Hex } from "../../src/infrastructure/hashing";
import { buildUstarArchive } from "../../src/modules/tar";
import type { TarMember } from "../../src/modules/tar-reader";

const FIXTURE = resolve(import.meta.dir, "../../fixtures/standard/standard-v1.0.0/standard-1.0.0.tar.gz");

// Writes <tmp>/standard-v<version>/{standard-<version>.tar.gz, SHA256SUMS}
// from the real 1.0.0 members after `mutate`, and returns the file:// base.
export function writeFakeRelease(version: string, mutate: (members: TarMember[]) => TarMember[]): { base: string; sha256: string } {
  const members = mutate(extractTarGz(new Uint8Array(readFileSync(FIXTURE))));
  const withVersion = members.map((m) => (m.path === "VERSION" ? { ...m, content: new TextEncoder().encode(`${version}\n`) } : m));
  const tar = buildUstarArchive(withVersion.map((m) => (m.content === undefined ? { path: m.path, mode: m.mode } : { path: m.path, mode: m.mode, content: m.content })));
  const gz = gzipSync(tar, { level: 9 });
  const sha256 = sha256Hex(gz);
  const dir = mkdtempSync(join(tmpdir(), "sentinel-fake-release-"));
  mkdirSync(join(dir, `standard-v${version}`));
  writeFileSync(join(dir, `standard-v${version}`, `standard-${version}.tar.gz`), gz);
  writeFileSync(join(dir, `standard-v${version}`, "SHA256SUMS"), `${sha256}  standard-${version}.tar.gz\n`);
  return { base: pathToFileURL(dir).href, sha256 };
}
```

- [ ] **Step 2: Test de `--standard` forzado en `check.test.ts`**

Añadir el import `import { writeFakeRelease } from "../../../tests/helpers/fake-release";` a `src/interfaces/cli/check.test.ts` y este test:

```ts
test("--standard with a newer standard that requests an unknown validator: caution exits 0, --strict exits 1, report is marked forced", () => {
  // A fake 1.0.1 release built from the 1.0.0 fixture (tests/helpers/fake-release.ts)
  // whose thin-workflows manifest asks for a validator Sentinel does not have.
  const release = writeFakeRelease("1.0.1", (members) =>
    members.map((m) => (m.path === "rules/forge614-rule-thin-workflows/manifest.json" ? { ...m, content: new TextEncoder().encode(new TextDecoder().decode(m.content).replace('"validator": "workflows"', '"validator": "boundaries-zod"')) } : m)),
  );
  const home = mkdtempSync(join(tmpdir(), "sentinel-cli-strict-"));
  const soft = cli(["--repo", join(FIXTURES, "pass-node"), "--standard", "1.0.1", "--json"], { FORGE614_HOME: home, FORGE614_SENTINEL_RELEASE_BASE: release.base });
  expect(soft.exitCode, soft.stderr).toBe(0);
  const report = CheckReportSchema.parse(JSON.parse(soft.stdout.trim()));
  expect(report.verdict).toBe("caution");
  expect(report.standard).toMatchObject({ version: "1.0.1", sha256: release.sha256, forced: true });
  expect(report.checks.find((c) => c.id === "node-pointer")?.verdict).toBe("caution");
  // installer renders STANDARD_VERSION from the pointer (1.0.0), not from the forced 1.0.1.
  expect(report.checks.find((c) => c.id === "installer")?.verdict).toBe("pass");
  expect(report.checks.find((c) => c.id === "boundaries-zod")?.evidence[0]).toStartWith("SENTINEL_OUTDATED:");
  const strict = cli(["--repo", join(FIXTURES, "pass-node"), "--standard", "1.0.1", "--strict", "--json"], { FORGE614_HOME: home, FORGE614_SENTINEL_RELEASE_BASE: release.base });
  expect(strict.exitCode).toBe(1);
});
```

- [ ] **Step 3: Tests e implementación de `standard-fetch.ts`**

```ts
// src/interfaces/cli/standard-fetch.test.ts
import { expect, test } from "bun:test";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { run } from "../../infrastructure/process";

const CLI = resolve(import.meta.dir, "standard-fetch.ts");
const REPO_ROOT = resolve(import.meta.dir, "../../..");
const BASE = pathToFileURL(join(REPO_ROOT, "fixtures/standard")).href;

test("fetches the given version into FORGE614_HOME and reports it; a second call says alreadyCached", () => {
  const home = mkdtempSync(join(tmpdir(), "sentinel-fetch-cli-"));
  const env = { FORGE614_HOME: home, FORGE614_SENTINEL_RELEASE_BASE: BASE };
  const first = run(["bun", "run", CLI, "1.0.0", "--json"], { cwd: REPO_ROOT, env });
  expect(first.exitCode, first.stderr).toBe(0);
  expect(JSON.parse(first.stdout.trim())).toEqual({ schemaVersion: 1, version: "1.0.0", sha256: "18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922", alreadyCached: false, location: "<FORGE614_HOME>/standard/1.0.0" });
  expect(readdirSync(join(home, "standard"))).toEqual(["1.0.0"]);
  expect(JSON.parse(run(["bun", "run", CLI, "1.0.0"], { cwd: REPO_ROOT, env }).stdout.trim())).toMatchObject({ alreadyCached: true });
});

test("without a version it uses ./forge614.node.json; without either it is INVALID_ARGUMENTS", () => {
  const home = mkdtempSync(join(tmpdir(), "sentinel-fetch-cli-"));
  const env = { FORGE614_HOME: home, FORGE614_SENTINEL_RELEASE_BASE: BASE };
  const fromPointer = run(["bun", "run", CLI], { cwd: join(REPO_ROOT, "fixtures/pass-node"), env });
  expect(fromPointer.exitCode, fromPointer.stderr).toBe(0);
  const none = run(["bun", "run", CLI], { cwd: join(REPO_ROOT, "fixtures/foreign-folder"), env });
  expect(none.exitCode).toBe(2);
  expect(JSON.parse(none.stderr.trim())).toMatchObject({ code: "INVALID_ARGUMENTS" });
});

test("network failure is STANDARD_FETCH_FAILED; a tampered SHA256SUMS is STANDARD_CORRUPT; both exit 1", () => {
  const home = mkdtempSync(join(tmpdir(), "sentinel-fetch-cli-"));
  const offline = run(["bun", "run", CLI, "1.0.0"], { cwd: REPO_ROOT, env: { FORGE614_HOME: home, FORGE614_SENTINEL_RELEASE_BASE: BASE, FORGE614_SENTINEL_OFFLINE: "1" } });
  expect(offline.exitCode).toBe(1);
  expect(JSON.parse(offline.stderr.trim())).toMatchObject({ code: "STANDARD_FETCH_FAILED" });
  const corruptBase = pathToFileURL(join(REPO_ROOT, "fixtures/standard-corrupt")).href;
  const corrupt = run(["bun", "run", CLI, "1.0.0"], { cwd: REPO_ROOT, env: { FORGE614_HOME: home, FORGE614_SENTINEL_RELEASE_BASE: corruptBase } });
  expect(corrupt.exitCode).toBe(1);
  expect(JSON.parse(corrupt.stderr.trim())).toMatchObject({ code: "STANDARD_CORRUPT" });
  expect(readdirSync(home)).toEqual([]);
});
```

Fixture `fixtures/standard-corrupt/standard-v1.0.0/`: el mismo `standard-1.0.0.tar.gz` y un `SHA256SUMS` cuya huella es 64 ceros:

```bash
mkdir -p fixtures/standard-corrupt/standard-v1.0.0
cp fixtures/standard/standard-v1.0.0/standard-1.0.0.tar.gz fixtures/standard-corrupt/standard-v1.0.0/
printf '%064d  standard-1.0.0.tar.gz\n' 0 > fixtures/standard-corrupt/standard-v1.0.0/SHA256SUMS
```

```ts
// src/interfaces/cli/standard-fetch.ts
import { z } from "zod";
import { classifyRepository } from "../../app/classify-repository";
import { cacheRoot, describeCacheLocation, fetcherFromEnv, releaseBaseFromEnv } from "../../app/environment";
import { fetchStandard } from "../../app/fetch-standard";
import { standardSource } from "../../modules/standard-source";
import { issuesOf, parseMixed } from "./args";
import { printError, printJson, runCli } from "./output";
import { printVersionIfRequested } from "./version";

export const FETCH_USAGE = "standard fetch [<version>] [--json]";

const Flags = z.object({ help: z.literal(true).optional(), json: z.literal(true).optional() }).strict();
const Version = z.string().regex(/^\d+\.\d+\.\d+$/, "version must be X.Y.Z");

export async function standardFetchMain(argv: string[], env: Record<string, string | undefined> = process.env): Promise<number> {
  if (printVersionIfRequested(argv)) return 0;
  const { flags, positionals } = parseMixed(argv, []);
  const parsed = Flags.safeParse(flags);
  if (!parsed.success) {
    printError("INVALID_ARGUMENTS", issuesOf(parsed.error));
    return 2;
  }
  if (parsed.data.help) {
    printJson({ schemaVersion: 1, usage: FETCH_USAGE });
    return 0;
  }
  if (positionals.length > 1) {
    printError("INVALID_ARGUMENTS", `expected at most one version, got ${positionals.length}`);
    return 2;
  }

  let version = positionals[0];
  let expectedSha256: string | undefined;
  if (version === undefined) {
    const here = classifyRepository(process.cwd());
    if (here.kind !== "node") {
      printError("INVALID_ARGUMENTS", "no version given and no forge614.node.json in the current directory");
      return 2;
    }
    version = here.pointer.standard.version;
    expectedSha256 = here.pointer.standard.sha256;
  }
  const v = Version.safeParse(version);
  if (!v.success) {
    printError("INVALID_ARGUMENTS", issuesOf(v.error));
    return 2;
  }

  const result = await fetchStandard({
    source: expectedSha256 === undefined ? standardSource(v.data) : standardSource(v.data, expectedSha256),
    cacheRoot: cacheRoot(env),
    fetcher: fetcherFromEnv(env),
    releaseBase: releaseBaseFromEnv(env),
  });
  if (!result.ok) {
    printError(result.reason === "corrupt" ? "STANDARD_CORRUPT" : "STANDARD_FETCH_FAILED", result.error);
    return 1;
  }
  printJson({ schemaVersion: 1, version: result.version, sha256: result.sha256, alreadyCached: result.alreadyCached, location: describeCacheLocation(result.version) });
  return 0;
}

if (import.meta.main) process.exit(await runCli("SENTINEL_FAILED", () => standardFetchMain(process.argv.slice(2))));
```

- [ ] **Step 4: `main.ts` (punto de entrada del binario) con test**

```ts
// src/interfaces/cli/main.ts
import { checkMain, CHECK_USAGE } from "./check";
import { SENTINEL_ERROR_CODES } from "./codes";
import { printError, printJson, runCli } from "./output";
import { FETCH_USAGE, standardFetchMain } from "./standard-fetch";
import { printVersionIfRequested } from "./version";

export const USAGE = `forge614-sentinel <command>: ${CHECK_USAGE} | ${FETCH_USAGE} | --help | --version`;

export async function main(argv: string[]): Promise<number> {
  if (printVersionIfRequested(argv)) return 0;
  const [command, ...rest] = argv;
  if (command === undefined || command === "--help") {
    printJson({ schemaVersion: 1, usage: USAGE, commands: ["check", "standard fetch"], errorCodes: SENTINEL_ERROR_CODES });
    return 0;
  }
  if (command === "check") return checkMain(rest);
  if (command === "standard" && rest[0] === "fetch") return standardFetchMain(rest.slice(1));
  printError("INVALID_ARGUMENTS", `unknown command '${[command, ...rest].join(" ")}'; usage: ${USAGE}`);
  return 2;
}

if (import.meta.main) process.exit(await runCli("SENTINEL_FAILED", () => main(process.argv.slice(2))));
```

```ts
// src/interfaces/cli/main.test.ts
import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { run } from "../../infrastructure/process";

const CLI = resolve(import.meta.dir, "main.ts");
const REPO_ROOT = resolve(import.meta.dir, "../../..");

test("no command or --help prints usage and exits 0; an unknown command is INVALID_ARGUMENTS", () => {
  expect(JSON.parse(run(["bun", "run", CLI], { cwd: REPO_ROOT }).stdout.trim())).toMatchObject({ schemaVersion: 1, commands: ["check", "standard fetch"] });
  expect(run(["bun", "run", CLI, "--help"], { cwd: REPO_ROOT }).exitCode).toBe(0);
  const r = run(["bun", "run", CLI, "chek"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(2);
  expect(JSON.parse(r.stderr.trim())).toMatchObject({ code: "INVALID_ARGUMENTS" });
});

test("dispatches to check and standard fetch (their --help)", () => {
  expect(JSON.parse(run(["bun", "run", CLI, "check", "--help"], { cwd: REPO_ROOT }).stdout.trim()).usage).toStartWith("check ");
  expect(JSON.parse(run(["bun", "run", CLI, "standard", "fetch", "--help"], { cwd: REPO_ROOT }).stdout.trim()).usage).toStartWith("standard fetch");
});
```

- [ ] **Step 5: Ejecutar**

Run: `bun run typecheck && bun test src/interfaces tests/architecture`
Expected: verde; `version.test.ts` descubre `check.ts`, `standard-fetch.ts` y `main.ts`; el test forzado de `check.test.ts` da `caution` con salida `0` y `1` con `--strict`.

- [ ] **Step 6: Commit (lo hace el propietario)**

```bash
git add src/interfaces/cli/standard-fetch.ts src/interfaces/cli/standard-fetch.test.ts src/interfaces/cli/main.ts src/interfaces/cli/main.test.ts src/interfaces/cli/check.test.ts fixtures/standard-corrupt tests/helpers/fake-release.ts
git commit -m "feat(cli): standard fetch, despachador main y revisión forzada probada con una release falsa"
```


---

### Task 24: Autoverificación: `verify`, `workflows:check`, `workflows:run`, `notion-map:build` y el gancho

**Files:**
- Create: `src/app/dev-params.ts` (parámetros mínimos para correr comprobaciones sobre el propio repo sin cargar el reglamento: solo `workflows`)
- Create: `src/app/check-own-workflows.ts`, `src/app/check-own-workflows.test.ts`
- Create: `src/app/run-workflows.ts`, `src/app/run-workflows.test.ts` (portado)
- Create: `src/app/build-notion-map.ts`, `src/app/build-notion-map.test.ts`, `src/interfaces/cli/notion-map-build.ts` (portados de `forge614-ai`, adaptados a `RepoSnapshot`)
- Create: `docs/notion-map.json` (generado)
- Create: `src/interfaces/cli/workflows-check.ts`, `src/interfaces/cli/workflows-run.ts`, `src/interfaces/cli/workflows-run.test.ts`, `src/interfaces/cli/verify.ts`, `src/interfaces/cli/verify.test.ts`
- Modify: `src/interfaces/cli/codes.ts`

**Interfaces:**
- Consumes: `workflowsCheck` (Task 12), `takeSnapshot` (Task 8), `repoRoot` (Task 1), `runCommand`, `parseFlags`, `parsePairs`, `issuesOf`, `SENTINEL_VERSION` (Task 22), `WorkflowSchema`, `jobsOf`, `runStepsOf`, `SemVer`, `Sha256` (Task 2), `sha256Text` (Task 1), `writeTextAtomic` (Task 5), `listUnder`, `read` (Task 3), `BUILTIN_ALLOWED_EXTRA_JOBS` y las listas incorporadas (Task 8).
- Produces: scripts `bun run verify`, `bun run workflows:check`, `bun run workflows:run [--workflow <name>]`, `bun run notion-map:build [--check]`; `verify` = typecheck → test → workflows:check → notion-map:build --check → `sentinel:check` (Sentinel revisando su propio repositorio desde el código fuente) y falla con `VERIFY_STEP_FAILED` en el primer paso que no sale `0`.
  ```ts
  // src/app/run-workflows.ts
  export interface WorkflowRunResult { schemaVersion: 1; workflow: string; jobs: Array<{ job: string; steps: Array<{ run: string; exitCode: number }> }>; ok: boolean }
  export function runWorkflow(snapshot: RepoSnapshot, name: string, exec: (cmd: string[]) => { exitCode: number; stdout: string; stderr: string }): WorkflowRunResult;
  // src/app/build-notion-map.ts
  export const NotionMapSchema: z.ZodType<NotionMap>; export type NotionMap;
  export const NOTION_MAP_PATH = "docs/notion-map.json";
  export function buildNotionMap(snapshot: RepoSnapshot, productVersion: string, previous?: NotionMap): NotionMap;
  export function readProductVersion(snapshot: RepoSnapshot): string;
  export function buildNotionMapForTree(snapshot: RepoSnapshot): NotionMap;
  export function serializeNotionMap(map: NotionMap): string;
  export function writeNotionMap(map: NotionMap, outPath: string): void;
  export function notionMapIsCurrent(snapshot: RepoSnapshot): boolean;
  ```

Qué queda en verde al cerrar esta tarea: todos los tests, `workflows:check` y `notion-map:build --check`. `sentinel:check` sobre el propio repositorio todavía da `fail` en `node-contract` (las tablas de `CONTRACT.md` están vacías hasta Task 28), así que `bun run verify` termina en `VERIFY_STEP_FAILED`; el test que exige `verify` con salida `0` y veredicto `pass` se añade en Task 28, que es la que lo pone en verde.

- [ ] **Step 1: `dev-params.ts` y `check-own-workflows.ts`**

```ts
// src/app/dev-params.ts
import { parse } from "yaml";
import type { CheckParams } from "../modules/check-params";
import { BUILTIN_ALLOWED_EXTRA_JOBS, BUILTIN_LAYOUT, BUILTIN_SECRETS, BUILTIN_STACK, LEGACY_VALIDATOR_IDS } from "./build-check-params";

// Parameters for the development CLIs that run one check on this very
// repository without the standard (workflows:check). Everything the
// `workflows` check reads is here; the pack is a placeholder that no
// selection ever consults on this path.
export function devCheckParams(sentinelVersion: string, today: string): CheckParams {
  return {
    sentinelVersion,
    today,
    pointer: { schemaVersion: 1, node: "sentinel", kind: "product", standard: { version: "1.0.0", sha256: "0".repeat(64) } },
    standard: { version: "1.0.0", sha256: "0".repeat(64), pointerVersionSha256: undefined },
    pack: { schemaVersion: 1, name: "forge614-pack-ecosystem-node", version: "1.0.0", title: { es: "t", en: "t" }, rules: ["forge614-rule-thin-workflows"] },
    manifests: new Map(),
    forbiddenMentions: { terms: [], excludePaths: [] },
    templates: new Map(),
    ecosystemContract: "",
    layout: BUILTIN_LAYOUT,
    stack: BUILTIN_STACK,
    secrets: BUILTIN_SECRETS,
    allowedExtraJobs: BUILTIN_ALLOWED_EXTRA_JOBS,
    knownCheckIds: [],
    legacyValidatorIds: LEGACY_VALIDATOR_IDS,
    parseYaml: (text) => parse(text),
  };
}
```

```ts
// src/app/check-own-workflows.ts
import type { CheckResult } from "../modules/check";
import { workflowsCheck } from "../modules/checks/workflows";
import { devCheckParams } from "./dev-params";
import { takeSnapshot } from "./take-snapshot";

export function checkOwnWorkflows(root: string, sentinelVersion: string): CheckResult {
  return workflowsCheck.run(takeSnapshot(root), devCheckParams(sentinelVersion, new Date().toISOString().slice(0, 10)));
}
```

```ts
// src/app/check-own-workflows.test.ts
import { expect, test } from "bun:test";
import { checkOwnWorkflows } from "./check-own-workflows";
import { repoRoot } from "./repo";

test("this repository's workflows are thin, pinned and documented", () => {
  const r = checkOwnWorkflows(repoRoot, "0.1.0");
  expect(r.evidence).toEqual([]);
  expect(r.verdict).toBe("pass");
});
```

- [ ] **Step 2: Portar `run-workflows.ts` con su test** (la lógica de `forge614-ai/src/app/run-workflows.ts`, con `RepoSnapshot` en lugar de `FileTree`):

```ts
// src/app/run-workflows.ts
import { parse } from "yaml";
import { read, type RepoSnapshot } from "../modules/snapshot";
import { jobsOf, runStepsOf, WorkflowSchema } from "../modules/workflow";

type Exec = (cmd: string[]) => { exitCode: number; stdout: string; stderr: string };

export interface WorkflowRunResult {
  schemaVersion: 1;
  workflow: string;
  jobs: Array<{ job: string; steps: Array<{ run: string; exitCode: number }> }>;
  ok: boolean;
}

// Runs the `run` steps of every job of .github/workflows/<name>.yml locally,
// in order, stopping a job at its first failing step (what CI would do).
// Workflows are thin (acta 0019), so every step is a plain command line.
export function runWorkflow(snapshot: RepoSnapshot, name: string, exec: Exec): WorkflowRunResult {
  const raw = read(snapshot, `.github/workflows/${name}.yml`);
  if (raw === undefined) throw new Error(`workflow not found: ${name}`);
  const workflow = WorkflowSchema.parse(parse(raw));

  const jobs: WorkflowRunResult["jobs"] = [];
  let ok = true;
  for (const job of jobsOf(workflow)) {
    const steps: Array<{ run: string; exitCode: number }> = [];
    for (const run of runStepsOf(workflow, job)) {
      const result = exec(run.split(/\s+/));
      steps.push({ run, exitCode: result.exitCode });
      if (result.exitCode !== 0) {
        ok = false;
        break;
      }
    }
    jobs.push({ job, steps });
  }
  return { schemaVersion: 1, workflow: name, jobs, ok };
}
```

```ts
// src/app/run-workflows.test.ts
import { expect, test } from "bun:test";
import { snapshotFrom } from "../modules/snapshot";
import { runWorkflow } from "./run-workflows";

const VERIFY = [
  "name: verify",
  "on:",
  "  pull_request: {}",
  "jobs:",
  "  verify:",
  "    runs-on: ubuntu-24.04",
  "    timeout-minutes: 10",
  "    steps:",
  "      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5",
  "      - run: bun install --frozen-lockfile",
  "      - run: bun run typecheck",
  "      - run: bun run verify",
  "",
].join("\n");

test("runs the run steps of every job in order and stops a job at its first failure", () => {
  const calls: string[][] = [];
  const exec = (cmd: string[]) => {
    calls.push(cmd);
    return { exitCode: cmd.join(" ") === "bun run typecheck" ? 1 : 0, stdout: "", stderr: "" };
  };
  const r = runWorkflow(snapshotFrom({ ".github/workflows/verify.yml": VERIFY }), "verify", exec);
  expect(calls).toEqual([
    ["bun", "install", "--frozen-lockfile"],
    ["bun", "run", "typecheck"],
  ]);
  expect(r.ok).toBe(false);
  expect(r.jobs[0]?.steps.map((s) => s.exitCode)).toEqual([0, 1]);
});

test("all steps succeed: ok is true and every step ran", () => {
  const r = runWorkflow(snapshotFrom({ ".github/workflows/verify.yml": VERIFY }), "verify", () => ({ exitCode: 0, stdout: "", stderr: "" }));
  expect(r.ok).toBe(true);
  expect(r.jobs).toEqual([{ job: "verify", steps: [{ run: "bun install --frozen-lockfile", exitCode: 0 }, { run: "bun run typecheck", exitCode: 0 }, { run: "bun run verify", exitCode: 0 }] }]);
});

test("an unknown workflow name throws", () => {
  expect(() => runWorkflow(snapshotFrom({}), "nope", () => ({ exitCode: 0, stdout: "", stderr: "" }))).toThrow("workflow not found: nope");
});
```

- [ ] **Step 3: CLIs `workflows-check.ts` y `workflows-run.ts`**

```ts
// src/interfaces/cli/workflows-check.ts
import { z } from "zod";
import { checkOwnWorkflows } from "../../app/check-own-workflows";
import { repoRoot } from "../../app/repo";
import { issuesOf, parseFlags } from "./args";
import { printError, printJson, runCli } from "./output";
import { printVersionIfRequested, SENTINEL_VERSION } from "./version";

const USAGE = "workflows-check";
const Args = z.object({ help: z.literal(true).optional() }).strict();

function main(argv: string[]): number {
  if (printVersionIfRequested(argv)) return 0;
  const parsed = Args.safeParse(parseFlags(argv));
  if (!parsed.success) {
    printError("INVALID_ARGUMENTS", issuesOf(parsed.error));
    return 2;
  }
  if (parsed.data.help) {
    printJson({ schemaVersion: 1, usage: USAGE });
    return 0;
  }
  const result = checkOwnWorkflows(repoRoot, SENTINEL_VERSION);
  printJson({ schemaVersion: 1, verdict: result.verdict, evidence: result.evidence });
  return result.verdict === "pass" ? 0 : 1;
}

process.exit(await runCli("WORKFLOWS_CHECK_FAILED", () => main(process.argv.slice(2))));
```

```ts
// src/interfaces/cli/workflows-run.ts
import { z } from "zod";
import { repoRoot } from "../../app/repo";
import { runCommand } from "../../app/run-command";
import { runWorkflow, type WorkflowRunResult } from "../../app/run-workflows";
import { takeSnapshot } from "../../app/take-snapshot";
import { issuesOf, parsePairs } from "./args";
import { printError, printJson, runCli } from "./output";
import { printVersionIfRequested } from "./version";

const USAGE = "workflows-run [--workflow <name>]";
const Args = z.object({ workflow: z.string().min(1).default("verify") }).strict();

function main(argv: string[]): number {
  if (printVersionIfRequested(argv)) return 0;
  if (argv.includes("--help")) {
    printJson({ schemaVersion: 1, usage: USAGE });
    return 0;
  }
  const parsed = Args.safeParse(parsePairs(argv));
  if (!parsed.success) {
    printError("INVALID_ARGUMENTS", issuesOf(parsed.error));
    return 2;
  }
  const { workflow } = parsed.data;
  let result: WorkflowRunResult;
  try {
    result = runWorkflow(takeSnapshot(repoRoot), workflow, (cmd) => {
      const r = runCommand(cmd, { cwd: repoRoot });
      process.stderr.write(`[${workflow}] ${cmd.join(" ")} … exit ${r.exitCode}\n`);
      return r;
    });
  } catch (error) {
    printError("WORKFLOW_NOT_FOUND", error instanceof Error ? error.message : String(error));
    return 1;
  }
  printJson({ ...result });
  return result.ok ? 0 : 1;
}

process.exit(await runCli("WORKFLOWS_RUN_FAILED", () => main(process.argv.slice(2))));
```

```ts
// src/interfaces/cli/workflows-run.test.ts
import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { run } from "../../infrastructure/process";

const CLI = resolve(import.meta.dir, "workflows-run.ts");
const REPO_ROOT = resolve(import.meta.dir, "../../..");

test("--help prints the usage; an unknown workflow is WORKFLOW_NOT_FOUND with exit 1", () => {
  expect(JSON.parse(run(["bun", "run", CLI, "--help"], { cwd: REPO_ROOT }).stdout.trim())).toEqual({ schemaVersion: 1, usage: "workflows-run [--workflow <name>]" });
  const r = run(["bun", "run", CLI, "--workflow", "nope"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(1);
  expect(JSON.parse(r.stderr.trim())).toMatchObject({ schemaVersion: 1, code: "WORKFLOW_NOT_FOUND" });
});
```

- [ ] **Step 4: Tests y CLI `verify.ts`**

```ts
// src/interfaces/cli/verify.test.ts
import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { run } from "../../infrastructure/process";

const CLI = resolve(import.meta.dir, "verify.ts");
const REPO_ROOT = resolve(import.meta.dir, "../../..");

test("--help and an unknown flag", () => {
  expect(JSON.parse(run(["bun", "run", CLI, "--help"], { cwd: REPO_ROOT }).stdout.trim())).toMatchObject({ schemaVersion: 1, usage: "verify [--skip-tests]" });
  const r = run(["bun", "run", CLI, "--nope"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(2);
});

// The full run (typecheck + tests + self-check) is what CI and the pre-push
// hook execute; here only the cheap path is exercised so the test suite does
// not recurse into itself. This assertion holds while CONTRACT.md is still
// the empty template; the test that also demands exit 0 and verdict pass
// arrives together with the filled-in contract.
test("--skip-tests runs typecheck, workflows:check and notion-map:build --check green, then sentinel:check", () => {
  const r = run(["bun", "run", CLI, "--skip-tests"], { cwd: REPO_ROOT, timeoutMs: 300_000 });
  for (const label of ["typecheck", "workflows:check", "notion-map:build --check"]) expect(r.stderr).toContain(`[verify] ${label}: exit 0`);
  expect(r.stderr).toContain("[verify] sentinel:check: exit ");
});
```

```ts
// src/interfaces/cli/verify.ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { repoRoot } from "../../app/repo";
import { runCommand } from "../../app/run-command";
import { CheckReportSchema } from "../../modules/report";
import { issuesOf, parseFlags } from "./args";
import { printError, printJson, runCli } from "./output";
import { printVersionIfRequested } from "./version";

const USAGE = "verify [--skip-tests]";
const Args = z.object({ help: z.literal(true).optional(), "skip-tests": z.literal(true).optional() }).strict();

// Order matters: a broken build must not produce a misleading self-check.
// The self-check runs Sentinel from source on this repository (bootstrap:
// until 0.1 is published there is no binary to install), against the
// standard fixture copy (byte-identical to the release, fingerprint pinned
// by forge614.node.json) in a throwaway FORGE614_HOME, so CI needs no
// network and the real cache of the machine is never touched.
const STEPS: ReadonlyArray<readonly [string, string[]]> = [
  ["typecheck", ["bun", "run", "typecheck"]],
  ["test", ["bun", "test", "--timeout", "30000"]],
  ["workflows:check", ["bun", "run", "workflows:check"]],
  ["notion-map:build --check", ["bun", "run", "notion-map:build", "--check"]],
];

function main(argv: string[]): number {
  if (printVersionIfRequested(argv)) return 0;
  const parsed = Args.safeParse(parseFlags(argv));
  if (!parsed.success) {
    printError("INVALID_ARGUMENTS", issuesOf(parsed.error));
    return 2;
  }
  if (parsed.data.help) {
    printJson({ schemaVersion: 1, usage: USAGE });
    return 0;
  }

  const steps: Array<{ label: string; exitCode: number }> = [];
  for (const [label, cmd] of STEPS) {
    if (label === "test" && parsed.data["skip-tests"] === true) continue;
    const result = runCommand(cmd, { cwd: repoRoot });
    steps.push({ label, exitCode: result.exitCode });
    process.stderr.write(`[verify] ${label}: exit ${result.exitCode}\n`);
    if (result.exitCode !== 0) {
      process.stderr.write(result.stdout + result.stderr);
      printError("VERIFY_STEP_FAILED", `${label} failed`);
      return 1;
    }
  }

  const home = mkdtempSync(join(tmpdir(), "sentinel-verify-home-"));
  try {
    const env = process.env.FORGE614_SENTINEL_RELEASE_BASE === undefined ? { FORGE614_HOME: home, FORGE614_SENTINEL_RELEASE_BASE: pathToFileURL(resolve(repoRoot, "fixtures/standard")).href } : { FORGE614_HOME: home };
    const self = runCommand(["bun", "run", "sentinel:check"], { cwd: repoRoot, env });
    steps.push({ label: "sentinel:check", exitCode: self.exitCode });
    process.stderr.write(`[verify] sentinel:check: exit ${self.exitCode}\n`);
    const report = CheckReportSchema.safeParse(JSON.parse(self.stdout.trim() || "{}"));
    if (!report.success) {
      process.stderr.write(self.stderr);
      printError("VERIFY_STEP_FAILED", "sentinel:check did not produce a CheckReport");
      return 1;
    }
    for (const c of report.data.checks) {
      process.stderr.write(`[verify] ${c.id}: ${c.verdict} — ${c.message.es}\n`);
      for (const e of c.evidence) process.stderr.write(`  - ${e}\n`);
    }
    if (self.exitCode !== 0) {
      printError("VERIFY_STEP_FAILED", `sentinel:check verdict ${report.data.verdict}`);
      return 1;
    }
    printJson({ schemaVersion: 1, ok: true, steps, sentinel: { verdict: report.data.verdict, durationMs: report.data.durationMs } });
    return 0;
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

process.exit(await runCli("VERIFY_FAILED", () => main(process.argv.slice(2))));
```

- [ ] **Step 5: Portar `build-notion-map.ts`, su test y la CLI `notion-map-build.ts`** (la lógica de `forge614-ai/src/app/build-notion-map.ts`, con `RepoSnapshot` en lugar de `FileTree` y `sha256Text` de `hashing`)

```ts
// src/app/build-notion-map.ts
import { z } from "zod";
import { writeTextAtomic } from "../infrastructure/fs-write";
import { sha256Text } from "../infrastructure/hashing";
import { SemVer, Sha256 } from "../modules/schemas/common";
import { listUnder, read, type RepoSnapshot } from "../modules/snapshot";

// docs/notion-map.json: one row per es/en documentation pair with the
// sha256 of each side, so a mirror (a page kept outside the repository) can
// tell whether the source it copied is still the current one. The schema
// lives in app: the map is this repository's own bookkeeping, not part of
// the standard's content.
const NotionPageSchema = z
  .object({
    es: z.string().min(1),
    en: z.string().min(1),
    sha256Es: Sha256,
    sha256En: Sha256,
    notionPageId: z.string().nullable(),
  })
  .strict();

export const NotionMapSchema = z
  .object({
    schemaVersion: z.literal(1),
    productVersion: SemVer,
    pages: z.array(NotionPageSchema),
  })
  .strict();

export type NotionMap = z.infer<typeof NotionMapSchema>;

export const NOTION_MAP_PATH = "docs/notion-map.json";
const ES_NUMBERED = /^docs\/es\/(\d{2})-/;
const PackageVersion = z.object({ version: SemVer }).passthrough();

function issuesOf(error: z.ZodError): string {
  return error.issues.map((issue) => (issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message)).join("; ");
}

// Pairs every numbered docs/es/NN-*.md with its docs/en/NN-*.md twin (the
// pairing rule of docs-parity) and fingerprints both. notionPageId is the
// only thing carried over from the previous map, and only while its es file
// still exists; fingerprints are always recomputed.
export function buildNotionMap(snapshot: RepoSnapshot, productVersion: string, previous?: NotionMap): NotionMap {
  const pages: NotionMap["pages"] = [];
  for (const es of listUnder(snapshot, "docs/es/")) {
    const num = ES_NUMBERED.exec(es)?.[1];
    if (num === undefined) continue;
    const en = listUnder(snapshot, `docs/en/${num}-`)[0];
    if (en === undefined) throw new Error(`${es} has no en twin`);
    const prev = previous?.pages.find((p) => p.es === es);
    pages.push({ es, en, sha256Es: sha256Text(read(snapshot, es) ?? ""), sha256En: sha256Text(read(snapshot, en) ?? ""), notionPageId: prev?.notionPageId ?? null });
  }
  return { schemaVersion: 1, productVersion, pages };
}

// The previous map goes through the same strict schema: a map that does not
// parse is an error, never ignored, because ignoring it would drop every
// notionPageId a person recorded.
function previousMapOf(snapshot: RepoSnapshot): NotionMap | undefined {
  const raw = read(snapshot, NOTION_MAP_PATH);
  if (raw === undefined) return undefined;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${NOTION_MAP_PATH} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  const parsed = NotionMapSchema.safeParse(data);
  if (!parsed.success) throw new Error(`${NOTION_MAP_PATH} is not a valid notion map: ${issuesOf(parsed.error)}`);
  return parsed.data;
}

export function readProductVersion(snapshot: RepoSnapshot): string {
  const raw = read(snapshot, "package.json");
  if (raw === undefined) throw new Error("package.json not found");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new Error(`package.json: invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  const parsed = PackageVersion.safeParse(data);
  if (!parsed.success) throw new Error(`package.json: ${issuesOf(parsed.error)}`);
  return parsed.data.version;
}

export function buildNotionMapForTree(snapshot: RepoSnapshot): NotionMap {
  const previous = previousMapOf(snapshot);
  const productVersion = readProductVersion(snapshot);
  return previous === undefined ? buildNotionMap(snapshot, productVersion) : buildNotionMap(snapshot, productVersion, previous);
}

export function serializeNotionMap(map: NotionMap): string {
  return `${JSON.stringify(map, null, 2)}\n`;
}

export function writeNotionMap(map: NotionMap, outPath: string): void {
  writeTextAtomic(outPath, serializeNotionMap(map));
}

// True when the committed docs/notion-map.json is byte-identical to what a
// fresh build would write (`notion-map:build --check`, a verify step).
export function notionMapIsCurrent(snapshot: RepoSnapshot): boolean {
  const committed = read(snapshot, NOTION_MAP_PATH);
  if (committed === undefined) return false;
  return committed === serializeNotionMap(buildNotionMapForTree(snapshot));
}
```

```ts
// src/app/build-notion-map.test.ts
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { snapshotFrom } from "../modules/snapshot";
import { buildNotionMap, buildNotionMapForTree, NotionMapSchema, notionMapIsCurrent, readProductVersion, serializeNotionMap, writeNotionMap, type NotionMap } from "./build-notion-map";

const SHA256_OF_HOLA = "b221d9dbb083a7f33428d7c2a3c3198ae925614d70210e28716ccaa7cd4ddb79";
const docs = { "docs/es/00-a.md": "a", "docs/en/00-a.md": "a", "package.json": JSON.stringify({ version: "0.1.0" }) };
const page = (notionPageId: string | null) => ({ es: "docs/es/00-a.md", en: "docs/en/00-a.md", sha256Es: "0".repeat(64), sha256En: "0".repeat(64), notionPageId });

describe("buildNotionMap", () => {
  test("pairs es/en by number, hashes both and lists pages in number order", () => {
    const map = buildNotionMap(snapshotFrom({ "docs/es/01-b.md": "b", "docs/en/01-b.md": "b", "docs/es/00-a.md": "hola", "docs/en/00-b.md": "hello" }), "0.1.0");
    expect(map.pages.map((p) => [p.es, p.en])).toEqual([["docs/es/00-a.md", "docs/en/00-b.md"], ["docs/es/01-b.md", "docs/en/01-b.md"]]);
    expect(map.pages[0]?.sha256Es).toBe(SHA256_OF_HOLA);
    expect(map.pages[0]?.notionPageId).toBeNull();
    expect(NotionMapSchema.safeParse(map).success).toBe(true);
  });

  test("throws when a pair is incomplete; ignores unnumbered files", () => {
    expect(() => buildNotionMap(snapshotFrom({ "docs/es/01-x.md": "x" }), "0.1.0")).toThrow("docs/es/01-x.md has no en twin");
    expect(buildNotionMap(snapshotFrom({ "docs/es/README.md": "i", "docs/es/00-a.md": "a", "docs/en/00-a.md": "a" }), "0.1.0").pages).toHaveLength(1);
  });

  test("keeps notionPageId from a previous map for pages that still exist and drops the rest", () => {
    const previous: NotionMap = { schemaVersion: 1, productVersion: "0.0.9", pages: [page("page-123"), { ...page("gone"), es: "docs/es/09-gone.md", en: "docs/en/09-gone.md" }] };
    const map = buildNotionMap(snapshotFrom({ "docs/es/00-a.md": "a", "docs/en/00-a.md": "a" }), "0.1.0", previous);
    expect(map.pages.map((p) => p.notionPageId)).toEqual(["page-123"]);
    expect(map.pages[0]?.sha256Es).not.toBe("0".repeat(64));
  });
});

describe("buildNotionMapForTree and notionMapIsCurrent", () => {
  test("reads productVersion from package.json and carries notionPageId from a valid previous map", () => {
    expect(buildNotionMapForTree(snapshotFrom(docs)).productVersion).toBe("0.1.0");
    const previous: NotionMap = { schemaVersion: 1, productVersion: "0.0.9", pages: [page("page-123")] };
    expect(buildNotionMapForTree(snapshotFrom({ ...docs, "docs/notion-map.json": serializeNotionMap(previous) })).pages[0]?.notionPageId).toBe("page-123");
  });

  test("an invalid previous map or package.json throws (the CLI's NOTION_MAP_FAILED)", () => {
    expect(() => buildNotionMapForTree(snapshotFrom({ ...docs, "docs/notion-map.json": JSON.stringify({ schemaVersion: 2, productVersion: "0.1.0", pages: [] }) }))).toThrow("docs/notion-map.json is not a valid notion map");
    expect(() => readProductVersion(snapshotFrom({}))).toThrow("package.json not found");
    expect(() => readProductVersion(snapshotFrom({ "package.json": "{ nope" }))).toThrow("package.json: invalid JSON");
    expect(() => readProductVersion(snapshotFrom({ "package.json": JSON.stringify({ version: "v1" }) }))).toThrow("package.json: version");
  });

  test("the committed map is current only when it equals a fresh build", () => {
    const current = serializeNotionMap(buildNotionMapForTree(snapshotFrom(docs)));
    expect(notionMapIsCurrent(snapshotFrom({ ...docs, "docs/notion-map.json": current }))).toBe(true);
    expect(notionMapIsCurrent(snapshotFrom(docs))).toBe(false);
    expect(notionMapIsCurrent(snapshotFrom({ ...docs, "docs/es/00-a.md": "changed", "docs/notion-map.json": current }))).toBe(false);
  });
});

describe("writeNotionMap", () => {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "notion-map-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("writes the file and a second run leaves it byte-identical", () => {
    const out = join(dir, "docs", "notion-map.json");
    writeNotionMap(buildNotionMapForTree(snapshotFrom(docs)), out);
    const first = readFileSync(out, "utf8");
    writeNotionMap(buildNotionMapForTree(snapshotFrom({ ...docs, "docs/notion-map.json": first })), out);
    expect(readFileSync(out, "utf8")).toBe(first);
  });
});
```

```ts
// src/interfaces/cli/notion-map-build.ts
import { resolve } from "node:path";
import { z } from "zod";
import { buildNotionMapForTree, NOTION_MAP_PATH, notionMapIsCurrent, writeNotionMap } from "../../app/build-notion-map";
import { repoRoot } from "../../app/repo";
import { takeSnapshot } from "../../app/take-snapshot";
import { issuesOf, parseFlags } from "./args";
import { printError, printJson, runCli } from "./output";
import { printVersionIfRequested } from "./version";

const USAGE = "notion-map-build [--check]";
const Args = z.object({ help: z.literal(true).optional(), check: z.literal(true).optional() }).strict();

function main(argv: string[]): number {
  if (printVersionIfRequested(argv)) return 0;
  const parsed = Args.safeParse(parseFlags(argv));
  if (!parsed.success) {
    printError("INVALID_ARGUMENTS", issuesOf(parsed.error));
    return 2;
  }
  if (parsed.data.help) {
    printJson({ schemaVersion: 1, usage: USAGE });
    return 0;
  }
  const snapshot = takeSnapshot(repoRoot);
  if (parsed.data.check) {
    if (!notionMapIsCurrent(snapshot)) {
      printError("NOTION_MAP_DRIFT", `${NOTION_MAP_PATH} is out of date; run 'bun run notion-map:build'`);
      return 1;
    }
    printJson({ schemaVersion: 1, ok: true, path: NOTION_MAP_PATH });
    return 0;
  }
  const map = buildNotionMapForTree(snapshot);
  writeNotionMap(map, resolve(repoRoot, NOTION_MAP_PATH));
  printJson({ schemaVersion: 1, path: NOTION_MAP_PATH, pages: map.pages.length });
  return 0;
}

process.exit(await runCli("NOTION_MAP_FAILED", () => main(process.argv.slice(2))));
```

Run: `bun run notion-map:build && bun run notion-map:build --check`
Expected: `{"schemaVersion":1,"path":"docs/notion-map.json","pages":5}` (los esqueletos 00–04 de Task 1) y luego `{"schemaVersion":1,"ok":true,"path":"docs/notion-map.json"}`. Cada vez que cambie un documento de `docs/es` o `docs/en` hay que regenerar el mapa (Task 28 lo hace al rellenar los documentos).

- [ ] **Step 6: Añadir los códigos nuevos a `codes.ts`**: `VERIFY_STEP_FAILED`, `VERIFY_FAILED`, `WORKFLOWS_CHECK_FAILED`, `WORKFLOWS_RUN_FAILED`, `WORKFLOW_NOT_FOUND`, `NOTION_MAP_DRIFT`, `NOTION_MAP_FAILED` (la comprobación `node-contract` de Sentinel sobre sí mismo exige que cada código de `CONTRACT.md` aparezca en `src/interfaces/cli`, y viceversa; el contrato se rellena en Task 28).

- [ ] **Step 7: Ejecutar**

Run: `bun run typecheck && bun test src/app src/interfaces && bun run workflows:check && bun run notion-map:build --check && bun run verify --skip-tests`
Expected: tests en verde (incluido `verify.test.ts`), `workflows:check` con `verdict: pass`, `notion-map:build --check` con `ok: true`. `bun run verify --skip-tests` termina con salida `1` y `VERIFY_STEP_FAILED` porque `sentinel:check` da `fail` solo en `node-contract` (tablas de `CONTRACT.md` vacías: los `printError("...")` de la CLI no están listados). Es el estado esperado; Task 28 lo pone en verde. Registrar en Engram el resultado parcial.

- [ ] **Step 8: Commit (lo hace el propietario)**

```bash
git add src/app/dev-params.ts src/app/check-own-workflows.ts src/app/check-own-workflows.test.ts src/app/run-workflows.ts src/app/run-workflows.test.ts src/app/build-notion-map.ts src/app/build-notion-map.test.ts docs/notion-map.json src/interfaces/cli/workflows-check.ts src/interfaces/cli/workflows-run.ts src/interfaces/cli/workflows-run.test.ts src/interfaces/cli/notion-map-build.ts src/interfaces/cli/verify.ts src/interfaces/cli/verify.test.ts src/interfaces/cli/codes.ts
git commit -m "feat(verify): autoverificación con sentinel:check desde el código fuente, workflows:check, workflows:run y notion-map:build"
```

---

### Task 25: Empaquetado y compilación por plataforma: `packaging` y `buildTarget`

**Antes de escribir código, leer (solo lectura, sin modificar ese repositorio):** `~/Desktop/forge614-engram/.github/workflows/release.yml` y `~/Desktop/forge614-engram/scripts/install.sh`. De ahí se copia el enfoque probado: `bun build <entry> --compile --target=bun-<os>-<arch> --outfile dist/<artefacto>`, smoke con `--help` sobre el binario recién compilado, un archivo por plataforma que conserve el modo ejecutable, `SHA256SUMS` con formato `sha256sum` (dos espacios), `gh release create "$GITHUB_REF_NAME" <assets> install.sh#install.sh --title "$GITHUB_REF_NAME"` con `--prerelease` cuando el tag lleva guion. Sentinel implementa esa secuencia como tres scripts del repo (no como pasos inline en YAML, acta 0019), diseñados para extraerse al `bun release` compartido en la fase 0.4.

**Files:**
- Create: `src/infrastructure/packaging.ts`, `src/infrastructure/packaging.test.ts` (tar.gz con modo 0755 y zip via fflate)
- Create: `src/app/build-target.ts`, `src/app/build-target.test.ts`

**Interfaces:**
- Consumes: `buildUstarArchive` (Task 4), `gzipSync`/`zipSync` de fflate, `extractTarGz`, `writeBytesAtomic` (Task 5), `sha256Hex`, `sha256File`, `repoRoot` (Task 1).
- Produces:
  ```ts
  // src/app/build-target.ts
  export const TARGETS = ["darwin-arm64", "darwin-x64", "linux-x64", "linux-arm64", "windows-x64"] as const;
  export type Target = (typeof TARGETS)[number];
  export function parseTarget(value: string | undefined): Target | null;
  export function hostTarget(): Target | null;                  // from process.platform/arch
  export function binaryName(target: Target): string;            // "forge614-sentinel" | "forge614-sentinel.exe"
  export function archiveName(target: Target): string;           // "forge614-sentinel-<target>.tar.gz" | ".zip"
  export type Exec = (cmd: string[], options?: { cwd?: string; env?: Record<string, string> }) => { exitCode: number; stdout: string; stderr: string };
  export type BuildTargetResult = { ok: true; target: Target; binary: string; archive: string; sha256: string } | { ok: false; code: "BUILD_FAILED"; error: string };
  export function buildTarget(options: { root: string; target: Target; outDir: string; exec: Exec }): BuildTargetResult;
  // src/infrastructure/packaging.ts
  export function packTarGz(entries: Array<{ path: string; mode: number; content: Uint8Array }>): Uint8Array;
  export function packZip(entries: Record<string, Uint8Array>): Uint8Array;
  ```

- [ ] **Step 1: `packaging.ts` con test**

```ts
// src/infrastructure/packaging.ts
import { gzipSync, zipSync } from "fflate";
import { buildUstarArchive } from "../modules/tar";

// Release archives for the installers: install.sh expects
// forge614-<node>-<os>-<arch>.tar.gz with the binary at the root (it runs
// chmod 0755 after extracting, the tar mode is belt and braces);
// install.ps1 expects forge614-<node>-windows-x64.zip with the .exe at the
// root. Reproducibility of these bytes is not a goal (the sha256 published
// in SHA256SUMS is computed from what was actually built).
export function packTarGz(entries: Array<{ path: string; mode: number; content: Uint8Array }>): Uint8Array {
  return gzipSync(buildUstarArchive(entries), { level: 6 });
}

export function packZip(entries: Record<string, Uint8Array>): Uint8Array {
  return zipSync(entries, { level: 6 });
}
```

```ts
// src/infrastructure/packaging.test.ts
import { expect, test } from "bun:test";
import { unzipSync } from "fflate";
import { extractTarGz } from "./archive";
import { packTarGz, packZip } from "./packaging";

const bytes = new TextEncoder().encode("#!/bin/sh\necho sentinel\n");

test("packTarGz yields a tar.gz with the binary at the root and mode 0755", () => {
  const members = extractTarGz(packTarGz([{ path: "forge614-sentinel", mode: 0o755, content: bytes }]));
  expect(members).toHaveLength(1);
  expect(members[0]).toMatchObject({ path: "forge614-sentinel", mode: 0o755 });
  expect(members[0]?.content).toEqual(bytes);
});

test("packZip yields a zip readable by fflate with the .exe at the root", () => {
  const files = unzipSync(packZip({ "forge614-sentinel.exe": bytes }));
  expect(Object.keys(files)).toEqual(["forge614-sentinel.exe"]);
  expect(files["forge614-sentinel.exe"]).toEqual(bytes);
});
```

- [ ] **Step 2: Tests de `buildTarget` (fallan)**

```ts
// src/app/build-target.test.ts
import { expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractTarGz } from "../infrastructure/archive";
import { sha256File } from "../infrastructure/hashing";
import { archiveName, binaryName, buildTarget, hostTarget, parseTarget, TARGETS, type Exec } from "./build-target";
import { repoRoot } from "./repo";

test("parseTarget accepts the five targets only; hostTarget maps this machine", () => {
  for (const t of TARGETS) expect(parseTarget(t)).toBe(t);
  expect(parseTarget("linux-x86")).toBeNull();
  expect(parseTarget(undefined)).toBeNull();
  expect(hostTarget() === null || TARGETS.includes(hostTarget() as (typeof TARGETS)[number])).toBe(true);
  expect(binaryName("windows-x64")).toBe("forge614-sentinel.exe");
  expect(archiveName("windows-x64")).toBe("forge614-sentinel-windows-x64.zip");
  expect(archiveName("linux-arm64")).toBe("forge614-sentinel-linux-arm64.tar.gz");
});

test("invokes bun build --compile with the right target and packages the result", () => {
  const outDir = mkdtempSync(join(tmpdir(), "sentinel-build-"));
  const calls: string[][] = [];
  // Fake compiler: records the command and writes a fake binary where --outfile says.
  const exec: Exec = (cmd) => {
    calls.push(cmd);
    const outfile = cmd[cmd.indexOf("--outfile") + 1] ?? "";
    writeFileSync(outfile, "#!/bin/sh\necho fake\n");
    return { exitCode: 0, stdout: "", stderr: "" };
  };
  const r = buildTarget({ root: repoRoot, target: "linux-arm64", outDir, exec });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(calls[0]?.slice(0, 5)).toEqual(["bun", "build", join(repoRoot, "src/interfaces/cli/main.ts"), "--compile", "--target=bun-linux-arm64"]);
  expect(r.binary).toBe(join(outDir, "linux-arm64", "forge614-sentinel"));
  expect(r.archive).toBe(join(outDir, "forge614-sentinel-linux-arm64.tar.gz"));
  expect(existsSync(r.archive)).toBe(true);
  expect(r.sha256).toBe(sha256File(r.archive));
  const members = extractTarGz(new Uint8Array(readFileSync(r.archive)));
  expect(members.map((m) => [m.path, m.mode])).toEqual([["forge614-sentinel", 0o755]]);
});

test("a failing compiler is BUILD_FAILED with its stderr", () => {
  const outDir = mkdtempSync(join(tmpdir(), "sentinel-build-"));
  const exec: Exec = () => ({ exitCode: 1, stdout: "", stderr: "error: cannot compile" });
  expect(buildTarget({ root: repoRoot, target: "darwin-arm64", outDir, exec })).toMatchObject({ ok: false, code: "BUILD_FAILED" });
});
```

- [ ] **Step 3: Implementar `build-target.ts`**

```ts
// src/app/build-target.ts
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { writeBytesAtomic } from "../infrastructure/fs-write";
import { sha256Hex } from "../infrastructure/hashing";
import { packTarGz, packZip } from "../infrastructure/packaging";

export const TARGETS = ["darwin-arm64", "darwin-x64", "linux-x64", "linux-arm64", "windows-x64"] as const;
export type Target = (typeof TARGETS)[number];

export type Exec = (cmd: string[], options?: { cwd?: string; env?: Record<string, string> }) => { exitCode: number; stdout: string; stderr: string };

export function parseTarget(value: string | undefined): Target | null {
  return TARGETS.find((t) => t === value) ?? null;
}

export function hostTarget(): Target | null {
  const os = process.platform === "darwin" ? "darwin" : process.platform === "linux" ? "linux" : process.platform === "win32" ? "windows" : null;
  const arch = process.arch === "arm64" ? "arm64" : process.arch === "x64" ? "x64" : null;
  return os === null || arch === null ? null : parseTarget(`${os}-${arch}`);
}

export function binaryName(target: Target): string {
  return target.startsWith("windows") ? "forge614-sentinel.exe" : "forge614-sentinel";
}

export function archiveName(target: Target): string {
  return `forge614-sentinel-${target}.${target.startsWith("windows") ? "zip" : "tar.gz"}`;
}

export type BuildTargetResult = { ok: true; target: Target; binary: string; archive: string; sha256: string } | { ok: false; code: "BUILD_FAILED"; error: string };

// One target per invocation (release.yml runs one matrix leg per OS with
// FORGE614_TARGET). The binary lands in <outDir>/<target>/ and the release
// asset next to it in <outDir>/, which is what the workflow uploads.
export function buildTarget(options: { root: string; target: Target; outDir: string; exec: Exec }): BuildTargetResult {
  const { target } = options;
  const targetDir = join(options.outDir, target);
  mkdirSync(targetDir, { recursive: true });
  const binary = join(targetDir, binaryName(target));
  const entry = join(options.root, "src/interfaces/cli/main.ts");
  let build: ReturnType<Exec>;
  try {
    build = options.exec(["bun", "build", entry, "--compile", `--target=bun-${target}`, "--outfile", binary], { cwd: options.root });
  } catch (error) {
    return { ok: false, code: "BUILD_FAILED", error: `bun build could not be executed: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (build.exitCode !== 0) return { ok: false, code: "BUILD_FAILED", error: `bun build --compile exited ${build.exitCode}: ${build.stderr.trim()}` };

  const bytes = new Uint8Array(readFileSync(binary));
  const archive = join(options.outDir, archiveName(target));
  const packed = target.startsWith("windows") ? packZip({ [binaryName(target)]: bytes }) : packTarGz([{ path: binaryName(target), mode: 0o755, content: bytes }]);
  writeBytesAtomic(archive, packed);
  return { ok: true, target, binary, archive, sha256: sha256Hex(packed) };
}
```

- [ ] **Step 4: Ejecutar**

Run: `bun run typecheck && bun test src/infrastructure/packaging.test.ts src/app/build-target.test.ts tests/architecture`
Expected: 2 + 3 pass; la prueba de capas acepta `app/build-target.ts → infrastructure`. La compilación real (sin `exec` falso) se prueba en Task 26 paso 6 y en Task 27.

- [ ] **Step 5: Commit (lo hace el propietario)**

```bash
git add src/infrastructure/packaging.ts src/infrastructure/packaging.test.ts src/app/build-target.ts src/app/build-target.test.ts
git commit -m "feat(release): empaquetado tar.gz/zip y compilación de un binario por plataforma"
```

---

### Task 26: Smoke, publicación y CLIs de release: `smoke:target`, `release:publish`, `build:target`

El flujo de referencia es el de `forge614-engram` descrito en Task 25 (lectura previa de `~/Desktop/forge614-engram/.github/workflows/release.yml`, solo lectura): smoke con `--version`/`--help` y un `check` real sobre el binario, `SHA256SUMS` en formato `sha256sum` y `gh release create` con los instaladores como assets.

**Files:**
- Create: `src/app/smoke-target.ts`, `src/app/smoke-target.test.ts`
- Create: `src/app/release-publish.ts`, `src/app/release-publish.test.ts`
- Create: `src/interfaces/cli/build-target.ts`, `src/interfaces/cli/smoke-target.ts`, `src/interfaces/cli/release-publish.ts`, `src/interfaces/cli/release-scripts.test.ts`
- Modify: `src/interfaces/cli/codes.ts` (`BUILD_FAILED`, `SMOKE_FAILED`, `RELEASE_TAG_MISMATCH`, `RELEASE_ASSETS_MISSING`, `RELEASE_PUBLISH_FAILED`)

**Interfaces:**
- Consumes: `buildTarget`, `parseTarget`, `hostTarget`, `binaryName`, `archiveName`, `TARGETS`, `Exec` (Task 25), `writeTextAtomic` (Task 5), `sha256Hex`, `repoRoot` (Task 1), `runCommand`, `parseMixed`, `issuesOf`, `SENTINEL_VERSION` (Task 22), fixtures `pass-node` (Task 20) y `standard` (Task 5).
- Produces:
  ```ts
  // src/app/smoke-target.ts
  export type SmokeTargetResult = { ok: true; target: Target; version: string; steps: string[] } | { ok: false; code: "SMOKE_FAILED"; error: string };
  export function smokeTarget(options: { root: string; target: Target; outDir: string; expectedVersion: string; exec: Exec }): SmokeTargetResult;
  // src/app/release-publish.ts
  export type ReleasePublishResult =
    | { ok: true; tag: string; version: string; assets: string[]; command: string[]; published: boolean }
    | { ok: false; code: "RELEASE_TAG_MISMATCH" | "RELEASE_ASSETS_MISSING" | "RELEASE_PUBLISH_FAILED"; error: string };
  export function releasePublish(options: { root: string; tag: string; version: string; assetsDir: string; exec: Exec; dryRun: boolean }): ReleasePublishResult;
  ```
  y las CLIs `bun run build:target`, `bun run smoke:target`, `bun run release:publish`.

- [ ] **Step 1: `smoke-target.ts` con test**

```ts
// src/app/smoke-target.test.ts
import { expect, test } from "bun:test";
import { join } from "node:path";
import { smokeTarget } from "./smoke-target";
import { repoRoot } from "./repo";
import type { Exec } from "./build-target";

function fakeBinary(version: string, verdict: string): Exec {
  return (cmd) => {
    if (cmd.includes("--version")) return { exitCode: 0, stdout: `${JSON.stringify({ schemaVersion: 1, name: "forge614-sentinel", version })}\n`, stderr: "" };
    if (cmd.includes("--help")) return { exitCode: 0, stdout: `${JSON.stringify({ schemaVersion: 1, usage: "x" })}\n`, stderr: "" };
    return { exitCode: verdict === "pass" ? 0 : 1, stdout: `${JSON.stringify({ schemaVersion: 1, verdict, checks: [] })}\n`, stderr: "" };
  };
}

test("runs --version, --help and check on fixtures/pass-node with an isolated FORGE614_HOME", () => {
  const r = smokeTarget({ root: repoRoot, target: "linux-x64", outDir: "/tmp/out", expectedVersion: "0.1.0", exec: fakeBinary("0.1.0", "pass") });
  expect(r).toEqual({ ok: true, target: "linux-x64", version: "0.1.0", steps: ["--version", "--help", "check fixtures/pass-node"] });
});

test("a version mismatch or a non-pass verdict is SMOKE_FAILED", () => {
  expect(smokeTarget({ root: repoRoot, target: "linux-x64", outDir: "/tmp/out", expectedVersion: "0.1.0", exec: fakeBinary("0.0.1", "pass") })).toMatchObject({ ok: false, code: "SMOKE_FAILED" });
  expect(smokeTarget({ root: repoRoot, target: "linux-x64", outDir: "/tmp/out", expectedVersion: "0.1.0", exec: fakeBinary("0.1.0", "fail") })).toMatchObject({ ok: false, code: "SMOKE_FAILED" });
});

test("the binary path is <outDir>/<target>/<binaryName>", () => {
  const seen: string[] = [];
  const exec: Exec = (cmd) => {
    seen.push(cmd[0] ?? "");
    return fakeBinary("0.1.0", "pass")(cmd);
  };
  smokeTarget({ root: repoRoot, target: "windows-x64", outDir: "/tmp/out", expectedVersion: "0.1.0", exec });
  expect(seen[0]).toBe(join("/tmp/out", "windows-x64", "forge614-sentinel.exe"));
});
```

```ts
// src/app/smoke-target.ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { binaryName, type Exec, type Target } from "./build-target";

const VersionEnvelope = z.object({ schemaVersion: z.literal(1), name: z.literal("forge614-sentinel"), version: z.string() }).strict();
const Verdict = z.object({ schemaVersion: z.literal(1), verdict: z.enum(["pass", "caution", "fail"]) }).passthrough();

export type SmokeTargetResult = { ok: true; target: Target; version: string; steps: string[] } | { ok: false; code: "SMOKE_FAILED"; error: string };

function parseJson<T>(schema: z.ZodType<T>, text: string): T | null {
  try {
    const parsed = schema.safeParse(JSON.parse(text.trim()));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// Proves the compiled binary is the program we think it is: it reports its
// own version, it answers --help, and it checks a real node fixture with the
// standard served from the fixture copy in a throwaway FORGE614_HOME.
export function smokeTarget(options: { root: string; target: Target; outDir: string; expectedVersion: string; exec: Exec }): SmokeTargetResult {
  const binary = join(options.outDir, options.target, binaryName(options.target));
  const steps: string[] = [];
  const fail = (error: string): SmokeTargetResult => ({ ok: false, code: "SMOKE_FAILED", error });

  const version = options.exec([binary, "--version"]);
  const envelope = version.exitCode === 0 ? parseJson(VersionEnvelope, version.stdout) : null;
  if (envelope === null) return fail(`--version failed (exit ${version.exitCode}): ${version.stderr.trim()}`);
  if (envelope.version !== options.expectedVersion) return fail(`--version reports ${envelope.version}, package.json says ${options.expectedVersion}`);
  steps.push("--version");

  const help = options.exec([binary, "--help"]);
  if (help.exitCode !== 0 || parseJson(z.object({ schemaVersion: z.literal(1) }).passthrough(), help.stdout) === null) return fail(`--help failed (exit ${help.exitCode})`);
  steps.push("--help");

  const home = mkdtempSync(join(tmpdir(), "sentinel-smoke-home-"));
  try {
    const check = options.exec([binary, "check", "--repo", resolve(options.root, "fixtures/pass-node"), "--json"], {
      cwd: options.root,
      env: { FORGE614_HOME: home, FORGE614_SENTINEL_RELEASE_BASE: pathToFileURL(resolve(options.root, "fixtures/standard")).href },
    });
    const report = parseJson(Verdict, check.stdout);
    if (check.exitCode !== 0 || report === null || report.verdict !== "pass") return fail(`check on fixtures/pass-node: exit ${check.exitCode}, verdict ${report?.verdict ?? "?"}: ${check.stderr.trim()}`);
    steps.push("check fixtures/pass-node");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
  return { ok: true, target: options.target, version: envelope.version, steps };
}
```

- [ ] **Step 2: `release-publish.ts` con test**

```ts
// src/app/release-publish.test.ts
import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { releasePublish } from "./release-publish";
import { repoRoot } from "./repo";
import { archiveName, TARGETS, type Exec } from "./build-target";

function assetsDir(missing?: string): string {
  const dir = mkdtempSync(join(tmpdir(), "sentinel-assets-"));
  for (const t of TARGETS) if (archiveName(t) !== missing) writeFileSync(join(dir, archiveName(t)), `bin-${t}`);
  return dir;
}

const okExec: Exec = () => ({ exitCode: 0, stdout: "https://github.com/jotredev/forge614-sentinel/releases/tag/v0.1.0\n", stderr: "" });

test("dry run: writes SHA256SUMS (sha256sum format) and returns the gh command without executing", () => {
  const dir = assetsDir();
  const calls: string[][] = [];
  const r = releasePublish({ root: repoRoot, tag: "v0.1.0", version: "0.1.0", assetsDir: dir, exec: (cmd) => { calls.push(cmd); return okExec(cmd); }, dryRun: true });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(calls).toHaveLength(0);
  expect(r.published).toBe(false);
  expect(r.command.slice(0, 4)).toEqual(["gh", "release", "create", "v0.1.0"]);
  expect(r.command).toContain(`${join(repoRoot, "install.sh")}#install.sh`);
  expect(r.command).toContain(`${join(repoRoot, "install.ps1")}#install.ps1`);
  expect(r.command).not.toContain("--prerelease");
  const sums = readFileSync(join(dir, "SHA256SUMS"), "utf8").trim().split("\n");
  expect(sums).toHaveLength(5);
  for (const line of sums) expect(line).toMatch(/^[a-f0-9]{64}  forge614-sentinel-[a-z0-9-]+\.(tar\.gz|zip)$/);
});

test("tag must be v<package.json version>; a missing asset aborts before gh; a failing gh is RELEASE_PUBLISH_FAILED; a hyphenated tag is a prerelease", () => {
  expect(releasePublish({ root: repoRoot, tag: "v0.2.0", version: "0.1.0", assetsDir: assetsDir(), exec: okExec, dryRun: true })).toMatchObject({ ok: false, code: "RELEASE_TAG_MISMATCH" });
  expect(releasePublish({ root: repoRoot, tag: "v0.1.0", version: "0.1.0", assetsDir: assetsDir("forge614-sentinel-windows-x64.zip"), exec: okExec, dryRun: true })).toMatchObject({ ok: false, code: "RELEASE_ASSETS_MISSING" });
  const failing: Exec = () => ({ exitCode: 1, stdout: "", stderr: "release v0.1.0 already exists" });
  const r = releasePublish({ root: repoRoot, tag: "v0.1.0", version: "0.1.0", assetsDir: assetsDir(), exec: failing, dryRun: false });
  expect(r).toMatchObject({ ok: false, code: "RELEASE_PUBLISH_FAILED" });
  if (r.ok) return;
  expect(r.error).toContain("already exists");
  const pre = releasePublish({ root: repoRoot, tag: "v0.2.0-rc.1", version: "0.2.0-rc.1", assetsDir: assetsDir(), exec: okExec, dryRun: true });
  expect(pre.ok && pre.command.includes("--prerelease")).toBe(true);
});
```

```ts
// src/app/release-publish.ts
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { writeTextAtomic } from "../infrastructure/fs-write";
import { sha256Hex } from "../infrastructure/hashing";
import { archiveName, TARGETS, type Exec } from "./build-target";

export type ReleasePublishResult =
  | { ok: true; tag: string; version: string; assets: string[]; command: string[]; published: boolean }
  | { ok: false; code: "RELEASE_TAG_MISMATCH" | "RELEASE_ASSETS_MISSING" | "RELEASE_PUBLISH_FAILED"; error: string };

// Mirrors the proven flow of forge614-engram's release workflow, as a script:
// the tag must name package.json's version, all five assets must be present
// (download-artifact merged them into assetsDir), SHA256SUMS is written in
// sha256sum format (what install.sh and install.ps1 parse), and gh publishes
// the assets plus the two installers. Nothing is published on any failure.
export function releasePublish(options: { root: string; tag: string; version: string; assetsDir: string; exec: Exec; dryRun: boolean }): ReleasePublishResult {
  if (options.tag !== `v${options.version}`) {
    return { ok: false, code: "RELEASE_TAG_MISMATCH", error: `tag '${options.tag}' does not name package.json version '${options.version}' (expected 'v${options.version}')` };
  }
  const assets = TARGETS.map((t) => join(options.assetsDir, archiveName(t)));
  const missing = assets.filter((a) => !existsSync(a));
  if (missing.length > 0) return { ok: false, code: "RELEASE_ASSETS_MISSING", error: `missing release assets: ${missing.map((m) => basename(m)).join(", ")}` };

  const sums = TARGETS.map((t) => `${sha256Hex(new Uint8Array(readFileSync(join(options.assetsDir, archiveName(t)))))}  ${archiveName(t)}`).join("\n");
  const sumsPath = join(options.assetsDir, "SHA256SUMS");
  writeTextAtomic(sumsPath, `${sums}\n`);

  const command = [
    "gh", "release", "create", options.tag,
    ...assets, sumsPath,
    `${join(options.root, "install.sh")}#install.sh`,
    `${join(options.root, "install.ps1")}#install.ps1`,
    "--title", options.tag,
    "--notes", `forge614-sentinel ${options.version}. Instala con install.sh (macOS/Linux) o install.ps1 (Windows); huellas en SHA256SUMS.`,
    "--verify-tag",
    ...(options.tag.includes("-") ? ["--prerelease"] : []),
  ];
  if (options.dryRun) return { ok: true, tag: options.tag, version: options.version, assets: [...assets, sumsPath], command, published: false };

  let run: ReturnType<Exec>;
  try {
    run = options.exec(command, { cwd: options.root });
  } catch (error) {
    return { ok: false, code: "RELEASE_PUBLISH_FAILED", error: `gh could not be executed: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (run.exitCode !== 0) return { ok: false, code: "RELEASE_PUBLISH_FAILED", error: `gh release create exited ${run.exitCode}: ${run.stderr.trim()}` };
  return { ok: true, tag: options.tag, version: options.version, assets: [...assets, sumsPath], command, published: true };
}
```

- [ ] **Step 3: Las tres CLIs**

```ts
// src/interfaces/cli/build-target.ts
import { resolve } from "node:path";
import { z } from "zod";
import { buildTarget, parseTarget, TARGETS } from "../../app/build-target";
import { repoRoot } from "../../app/repo";
import { runCommand } from "../../app/run-command";
import { issuesOf, parseMixed } from "./args";
import { printError, printJson, runCli } from "./output";
import { printVersionIfRequested } from "./version";

const USAGE = "build-target [--target <darwin-arm64|darwin-x64|linux-x64|linux-arm64|windows-x64>] (or FORGE614_TARGET)";
const Args = z.object({ help: z.literal(true).optional(), target: z.string().optional() }).strict();

function main(argv: string[]): number {
  if (printVersionIfRequested(argv)) return 0;
  const { flags, positionals } = parseMixed(argv, ["target"]);
  const parsed = Args.safeParse(flags);
  if (!parsed.success || positionals.length > 0) {
    printError("INVALID_ARGUMENTS", parsed.success ? `unexpected argument '${positionals[0] ?? ""}'` : issuesOf(parsed.error));
    return 2;
  }
  if (parsed.data.help) {
    printJson({ schemaVersion: 1, usage: USAGE, targets: TARGETS });
    return 0;
  }
  const target = parseTarget(parsed.data.target ?? process.env.FORGE614_TARGET);
  if (target === null) {
    printError("INVALID_ARGUMENTS", `target must be one of ${TARGETS.join(", ")} (--target or FORGE614_TARGET)`);
    return 2;
  }
  const result = buildTarget({ root: repoRoot, target, outDir: resolve(repoRoot, "dist/release"), exec: (cmd, options) => runCommand(cmd, options ?? {}) });
  if (!result.ok) {
    printError(result.code, result.error);
    return 1;
  }
  printJson({ schemaVersion: 1, ...result });
  return 0;
}

process.exit(await runCli("BUILD_FAILED", () => main(process.argv.slice(2))));
```

```ts
// src/interfaces/cli/smoke-target.ts
import { resolve } from "node:path";
import { z } from "zod";
import { parseTarget, TARGETS } from "../../app/build-target";
import { repoRoot } from "../../app/repo";
import { runCommand } from "../../app/run-command";
import { smokeTarget } from "../../app/smoke-target";
import { issuesOf, parseMixed } from "./args";
import { printError, printJson, runCli } from "./output";
import { printVersionIfRequested, SENTINEL_VERSION } from "./version";

const USAGE = "smoke-target [--target <darwin-arm64|darwin-x64|linux-x64|linux-arm64|windows-x64>] (or FORGE614_TARGET)";
const Args = z.object({ help: z.literal(true).optional(), target: z.string().optional() }).strict();

function main(argv: string[]): number {
  if (printVersionIfRequested(argv)) return 0;
  const { flags, positionals } = parseMixed(argv, ["target"]);
  const parsed = Args.safeParse(flags);
  if (!parsed.success || positionals.length > 0) {
    printError("INVALID_ARGUMENTS", parsed.success ? `unexpected argument '${positionals[0] ?? ""}'` : issuesOf(parsed.error));
    return 2;
  }
  if (parsed.data.help) {
    printJson({ schemaVersion: 1, usage: USAGE, targets: TARGETS });
    return 0;
  }
  const target = parseTarget(parsed.data.target ?? process.env.FORGE614_TARGET);
  if (target === null) {
    printError("INVALID_ARGUMENTS", `target must be one of ${TARGETS.join(", ")} (--target or FORGE614_TARGET)`);
    return 2;
  }
  const result = smokeTarget({
    root: repoRoot,
    target,
    outDir: resolve(repoRoot, "dist/release"),
    expectedVersion: SENTINEL_VERSION,
    exec: (cmd, options) => runCommand(cmd, options ?? {}),
  });
  if (!result.ok) {
    printError(result.code, result.error);
    return 1;
  }
  printJson({ schemaVersion: 1, ...result });
  return 0;
}

process.exit(await runCli("SMOKE_FAILED", () => main(process.argv.slice(2))));
```

```ts
// src/interfaces/cli/release-publish.ts
import { resolve } from "node:path";
import { z } from "zod";
import { releasePublish } from "../../app/release-publish";
import { repoRoot } from "../../app/repo";
import { runCommand } from "../../app/run-command";
import { issuesOf, parseMixed } from "./args";
import { printError, printJson, runCli } from "./output";
import { printVersionIfRequested, SENTINEL_VERSION } from "./version";

const USAGE = "release-publish [--tag vX.Y.Z] [--dry-run]";
const Args = z.object({ help: z.literal(true).optional(), tag: z.string().min(1).optional(), "dry-run": z.literal(true).optional() }).strict();

// The tag comes from --tag or, in the release workflow, from GITHUB_REF_NAME
// (the pushed tag). An empty GITHUB_REF_NAME counts as absent.
function main(argv: string[]): number {
  if (printVersionIfRequested(argv)) return 0;
  const { flags, positionals } = parseMixed(argv, ["tag"]);
  const parsed = Args.safeParse(flags);
  if (!parsed.success || positionals.length > 0) {
    printError("INVALID_ARGUMENTS", parsed.success ? `unexpected argument '${positionals[0] ?? ""}'` : issuesOf(parsed.error));
    return 2;
  }
  if (parsed.data.help) {
    printJson({ schemaVersion: 1, usage: USAGE });
    return 0;
  }
  const refName = process.env.GITHUB_REF_NAME;
  const tag = parsed.data.tag ?? (refName !== undefined && refName !== "" ? refName : undefined);
  if (tag === undefined) {
    printError("INVALID_ARGUMENTS", "no tag: pass --tag vX.Y.Z or set GITHUB_REF_NAME");
    return 2;
  }
  const result = releasePublish({
    root: repoRoot,
    tag,
    version: SENTINEL_VERSION,
    assetsDir: resolve(repoRoot, "dist/release"),
    exec: (cmd, options) => runCommand(cmd, options ?? {}),
    dryRun: parsed.data["dry-run"] === true,
  });
  if (!result.ok) {
    printError(result.code, result.error);
    return 1;
  }
  printJson({ schemaVersion: 1, ...result });
  return 0;
}

process.exit(await runCli("RELEASE_PUBLISH_FAILED", () => main(process.argv.slice(2))));
```

- [ ] **Step 4: Test de las CLIs de release (argumentos y `--help`; la compilación real se prueba en el paso 6 y en Task 27)**

```ts
// src/interfaces/cli/release-scripts.test.ts
import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { run } from "../../infrastructure/process";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const cli = (name: string, args: string[], env: Record<string, string> = {}) => run(["bun", "run", resolve(import.meta.dir, name), ...args], { cwd: REPO_ROOT, env });

test("build:target and smoke:target need a valid target (flag or FORGE614_TARGET)", () => {
  for (const name of ["build-target.ts", "smoke-target.ts"]) {
    expect(cli(name, ["--help"]).exitCode).toBe(0);
    const r = cli(name, [], { FORGE614_TARGET: "" });
    expect(r.exitCode).toBe(2);
    expect(JSON.parse(r.stderr.trim())).toMatchObject({ code: "INVALID_ARGUMENTS" });
    expect(cli(name, ["--target", "linux-x86"]).exitCode).toBe(2);
  }
});

test("release:publish --dry-run without assets is RELEASE_ASSETS_MISSING; without a tag is INVALID_ARGUMENTS", () => {
  expect(JSON.parse(cli("release-publish.ts", ["--tag", "v0.1.0", "--dry-run"], { GITHUB_REF_NAME: "" }).stderr.trim())).toMatchObject({ code: "RELEASE_ASSETS_MISSING" });
  expect(cli("release-publish.ts", ["--dry-run"], { GITHUB_REF_NAME: "" }).exitCode).toBe(2);
});
```

- [ ] **Step 5: Añadir los códigos de release a `codes.ts`**: `BUILD_FAILED`, `SMOKE_FAILED`, `RELEASE_TAG_MISMATCH`, `RELEASE_ASSETS_MISSING`, `RELEASE_PUBLISH_FAILED` (las CLIs los emiten a través de `result.code`, así que `codes.ts` es donde `node-contract` los encuentra como literales).

- [ ] **Step 6: Compilación real del host (comprobación manual del implementador)**

Run: `FORGE614_TARGET=$(bun -e 'import { hostTarget } from "./src/app/build-target"; console.log(hostTarget())') bun run build:target && FORGE614_TARGET=<mismo> bun run smoke:target`
Expected: `{"schemaVersion":1,"ok":true,…,"archive":"…/dist/release/forge614-sentinel-<host>.tar.gz"}` y luego `{"schemaVersion":1,"ok":true,"target":"<host>","version":"0.1.0","steps":["--version","--help","check fixtures/pass-node"]}`. `dist/` está ignorado por Git.

- [ ] **Step 7: Ejecutar y commit (lo hace el propietario)**

Run: `bun run typecheck && bun test src/app/smoke-target.test.ts src/app/release-publish.test.ts src/interfaces/cli/release-scripts.test.ts src/interfaces/cli/version.test.ts`
Expected: verde.

```bash
git add src/app/smoke-target.ts src/app/smoke-target.test.ts src/app/release-publish.ts src/app/release-publish.test.ts src/interfaces/cli/build-target.ts src/interfaces/cli/smoke-target.ts src/interfaces/cli/release-publish.ts src/interfaces/cli/release-scripts.test.ts src/interfaces/cli/codes.ts
git commit -m "feat(release): build:target, smoke:target y release:publish reales para cinco plataformas"
```


---

### Task 27: E2E con el binario, paridad en tres sistemas y presupuesto de 5 s

**Files:**
- Create: `tests/e2e/binary.ts` (helper: compila el binario del host una vez por proceso de test)
- Create: `tests/e2e/check.e2e.test.ts`, `tests/e2e/budget.e2e.test.ts`
- Create: `src/app/parity.ts`, `src/app/parity.test.ts`, `src/interfaces/cli/sentinel-parity.ts`
- Create: `fixtures/golden/pass-node.report.json`, `fixtures/golden/fail-node.report.json`
- Modify: `.github/workflows/verify.yml` (job `parity` añadido), `docs/es/04-workflows.md`, `docs/en/04-workflows.md` (fila del job `parity`), `docs/notion-map.json` (regenerado)
- Modify: `src/interfaces/cli/codes.ts` (`PARITY_MISMATCH`, `PARITY_FAILED`)

**Interfaces:**
- Consumes: `buildTarget`, `hostTarget` (Task 25), `checkRepository` (Task 21), `fileFetcher` (Task 6), `writeTextAtomic` (Task 5), `repoRoot` (Task 1), `parseFlags`, `issuesOf`, `SENTINEL_VERSION` (Task 22), fixtures de Task 20, `writeFakeRelease` (Task 23).
- Produces:
  ```ts
  // tests/e2e/binary.ts
  export function builtBinary(): string;   // absolute path; builds on first call into <tmp>/sentinel-e2e/<target>/
  // src/app/parity.ts
  export function normalizeReport(report: CheckReport): Omit<CheckReport, "durationMs">;
  export function canonicalJson(value: unknown): string;   // JSON.stringify(value, null, 2) + "\n"
  export type ParityResult = { ok: true; compared: string[] } | { ok: false; code: "PARITY_MISMATCH"; error: string; diffs: string[] };
  export async function runParity(options: { root: string; update: boolean; sentinelVersion: string; today: string }): Promise<ParityResult>; // fresh cache per fixture
  ```

- [ ] **Step 1: Helper del binario**

```ts
// tests/e2e/binary.ts
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildTarget, hostTarget } from "../../src/app/build-target";
import { run } from "../../src/infrastructure/process";

const REPO_ROOT = resolve(import.meta.dir, "../..");
let cached: string | undefined;

// One real `bun build --compile` per test process: the e2e suite exercises
// the same artifact release.yml ships, not `bun run` of the sources.
export function builtBinary(): string {
  if (cached !== undefined) return cached;
  const target = hostTarget();
  if (target === null) throw new Error(`unsupported host ${process.platform}-${process.arch}`);
  const outDir = join(tmpdir(), `sentinel-e2e-${process.pid}`);
  const r = buildTarget({ root: REPO_ROOT, target, outDir, exec: (cmd, options) => run(cmd, options ?? {}) });
  if (!r.ok) throw new Error(r.error);
  if (!existsSync(r.binary)) throw new Error(`binary not found at ${r.binary}`);
  cached = r.binary;
  return cached;
}
```

- [ ] **Step 2: E2E de `check` (spec §12)**

```ts
// tests/e2e/check.e2e.test.ts
import { beforeAll, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { run } from "../../src/infrastructure/process";
import { CheckReportSchema, type CheckReport } from "../../src/modules/report";
import { writeFakeRelease } from "../helpers/fake-release";
import { builtBinary } from "./binary";

const REPO_ROOT = resolve(import.meta.dir, "../..");
const FIXTURES = join(REPO_ROOT, "fixtures");
const BASE = pathToFileURL(join(FIXTURES, "standard")).href;
let bin = "";

function sentinel(args: string[], env: Record<string, string> = {}) {
  return run([bin, ...args], { cwd: REPO_ROOT, env: { FORGE614_HOME: mkdtempSync(join(tmpdir(), "sentinel-e2e-home-")), FORGE614_SENTINEL_RELEASE_BASE: BASE, ...env }, timeoutMs: 60_000 });
}

function report(stdout: string): CheckReport {
  return CheckReportSchema.parse(JSON.parse(stdout.trim()));
}

beforeAll(() => {
  bin = builtBinary();
});

describe("forge614-sentinel (compiled binary)", () => {
  test("--version and --help", () => {
    const v = sentinel(["--version"]);
    expect(v.exitCode).toBe(0);
    expect(JSON.parse(v.stdout.trim())).toMatchObject({ schemaVersion: 1, name: "forge614-sentinel" });
    expect(sentinel(["--help"]).exitCode).toBe(0);
  });

  test("pass node: verdict pass, exit 0", () => {
    const r = sentinel(["check", "--repo", join(FIXTURES, "pass-node"), "--json"]);
    expect(r.exitCode, r.stderr).toBe(0);
    expect(report(r.stdout).verdict).toBe("pass");
  });

  test("fail node: verdict fail with exact evidence per broken check, exit 1", () => {
    const r = sentinel(["check", "--repo", join(FIXTURES, "fail-node"), "--json"]);
    expect(r.exitCode).toBe(1);
    const failed = Object.fromEntries(report(r.stdout).checks.filter((c) => c.verdict === "fail").map((c) => [c.id, c.evidence]));
    expect(Object.keys(failed).sort()).toEqual(["docs-parity", "installer", "layout", "secrets-hygiene", "stack", "versions"]);
    expect(failed["layout"]).toContain("missing file .githooks/pre-push");
    expect(failed["stack"]).toContain("src/app/bad.ts:1: any");
    expect(failed["docs-parity"]).toEqual(["docs/es/00-resumen.md: missing docs/en/00-*.md"]);
    expect(failed["versions"]).toEqual(["git tags not available (not a git checkout)", "package.json version 0.2.0 vs docs/notion-map.json productVersion 0.1.0"]);
    expect(failed["secrets-hygiene"]).toContain("src/config.ts:1: aws-access-key-id");
    expect(failed["installer"]?.[0]).toMatch(/^install\.sh:\d+: expected 'set -euo pipefail' got 'set -eu'$/);
  });

  test("external project and foreign folder: applicable false, exit 0", () => {
    expect(JSON.parse(sentinel(["check", "--repo", join(FIXTURES, "external-project"), "--json"]).stdout.trim())).toEqual({ schemaVersion: 1, applicable: false, reason: "external-project" });
    const foreign = sentinel(["check", "--repo", join(FIXTURES, "foreign-folder"), "--json"]);
    expect(foreign.exitCode).toBe(0);
    expect(JSON.parse(foreign.stdout.trim())).toEqual({ schemaVersion: 1, applicable: false, reason: "not-a-forge614-repo" });
  });

  test("no cache and no network: STANDARD_UNAVAILABLE, exit 1", () => {
    const r = sentinel(["check", "--repo", join(FIXTURES, "pass-node"), "--json"], { FORGE614_SENTINEL_OFFLINE: "1" });
    expect(r.exitCode).toBe(1);
    expect(JSON.parse(r.stderr.trim())).toMatchObject({ schemaVersion: 1, code: "STANDARD_UNAVAILABLE" });
  });

  test("hand-edited pointer fingerprint: STANDARD_CORRUPT before any check, exit 1, no report", () => {
    const root = mkdtempSync(join(tmpdir(), "sentinel-e2e-handptr-"));
    cpSync(join(FIXTURES, "pass-node"), root, { recursive: true });
    const pointerPath = join(root, "forge614.node.json");
    writeFileSync(pointerPath, readFileSync(pointerPath, "utf8").replace("18d4455f6277374bf68938975cb1406f762f4ca9462b692f79bd01152b370922", "0".repeat(64)));
    const r = sentinel(["check", "--repo", root, "--json"]);
    expect(r.exitCode).toBe(1);
    expect(r.stdout).toBe("");
    expect(JSON.parse(r.stderr.trim())).toMatchObject({ schemaVersion: 1, code: "STANDARD_CORRUPT" });
  });

  test("tampered release fingerprint: STANDARD_CORRUPT, exit 1, nothing cached", () => {
    const home = mkdtempSync(join(tmpdir(), "sentinel-e2e-corrupt-"));
    const r = sentinel(["check", "--repo", join(FIXTURES, "pass-node"), "--json"], { FORGE614_HOME: home, FORGE614_SENTINEL_RELEASE_BASE: pathToFileURL(join(FIXTURES, "standard-corrupt")).href });
    expect(r.exitCode).toBe(1);
    expect(JSON.parse(r.stderr.trim())).toMatchObject({ code: "STANDARD_CORRUPT" });
  });

  test("--only, --strict and --standard forced", () => {
    const only = sentinel(["check", "--repo", join(FIXTURES, "pass-node"), "--only", "layout,stack", "--json"]);
    expect(report(only.stdout).checks.map((c) => c.id)).toEqual(["layout", "stack"]);
    const release = writeFakeRelease("1.0.1", (m) => m);
    const home = mkdtempSync(join(tmpdir(), "sentinel-e2e-forced-"));
    const forced = sentinel(["check", "--repo", join(FIXTURES, "pass-node"), "--standard", "1.0.1", "--json"], { FORGE614_HOME: home, FORGE614_SENTINEL_RELEASE_BASE: release.base });
    expect(forced.exitCode, forced.stderr).toBe(0);
    const fr = report(forced.stdout);
    expect(fr.standard).toEqual({ version: "1.0.1", sha256: release.sha256, forced: true, fetched: true });
    expect(fr.verdict).toBe("caution"); // node-pointer cannot cross-check: 1.0.0 is not cached in this home
    expect(fr.checks.find((c) => c.id === "installer")?.verdict).toBe("pass"); // STANDARD_VERSION comes from the pointer
    expect(sentinel(["check", "--repo", join(FIXTURES, "pass-node"), "--standard", "1.0.1", "--strict", "--json"], { FORGE614_HOME: home, FORGE614_SENTINEL_RELEASE_BASE: release.base }).exitCode).toBe(1);
  });

  test("latestKnown appears when a newer standard is cached than the one the node declares", () => {
    const release = writeFakeRelease("1.0.1", (m) => m);
    const home = mkdtempSync(join(tmpdir(), "sentinel-e2e-latest-"));
    sentinel(["standard", "fetch", "1.0.1"], { FORGE614_HOME: home, FORGE614_SENTINEL_RELEASE_BASE: release.base });
    const r = sentinel(["check", "--repo", join(FIXTURES, "pass-node"), "--json"], { FORGE614_HOME: home });
    expect(report(r.stdout).standard).toMatchObject({ version: "1.0.0", latestKnown: "1.0.1" });
  });

  test("without --json on a non-TTY stderr only the JSON is printed", () => {
    const r = sentinel(["check", "--repo", join(FIXTURES, "pass-node")]);
    expect(r.stderr).toBe("");
    expect(r.stdout.trim().split("\n")).toHaveLength(1);
  });

  test("the golden reports match this platform's output (what the parity job compares)", () => {
    for (const name of ["pass-node", "fail-node"]) {
      const r = sentinel(["check", "--repo", join(FIXTURES, name), "--json"]);
      const { durationMs: _ignored, ...rest } = report(r.stdout);
      expect(`${JSON.stringify(rest, null, 2)}\n`).toBe(readFileSync(join(FIXTURES, "golden", `${name}.report.json`), "utf8"));
    }
  });
});
```

- [ ] **Step 3: Presupuesto de 5 s**

```ts
// tests/e2e/budget.e2e.test.ts
import { beforeAll, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { run } from "../../src/infrastructure/process";
import { CheckReportSchema } from "../../src/modules/report";
import { builtBinary } from "./binary";

const REPO_ROOT = resolve(import.meta.dir, "../..");
const BUDGET_MS = 5000;
let bin = "";

beforeAll(() => {
  bin = builtBinary();
});

// spec §11: an ecosystem node in under 5 s. Sentinel's own repository (the
// largest tree at hand, with git facts) is the measured case; the fixture
// warms the cache first so the run measures checking, not downloading.
test(`checks this repository in under ${BUDGET_MS} ms (wall clock and durationMs)`, () => {
  const env = { FORGE614_HOME: mkdtempSync(join(tmpdir(), "sentinel-budget-")), FORGE614_SENTINEL_RELEASE_BASE: pathToFileURL(join(REPO_ROOT, "fixtures/standard")).href };
  run([bin, "standard", "fetch", "1.0.0"], { cwd: REPO_ROOT, env });
  const started = performance.now();
  const r = run([bin, "check", "--repo", REPO_ROOT, "--json"], { cwd: REPO_ROOT, env, timeoutMs: 30_000 });
  const wall = performance.now() - started;
  const report = CheckReportSchema.parse(JSON.parse(r.stdout.trim()));
  expect(report.durationMs).toBeLessThan(BUDGET_MS);
  expect(wall).toBeLessThan(BUDGET_MS);
});
```

- [ ] **Step 4: Paridad: `parity.ts`, CLI y goldens**

```ts
// src/app/parity.ts
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileFetcher } from "../infrastructure/network";
import { writeTextAtomic } from "../infrastructure/fs-write";
import type { CheckReport } from "../modules/report";
import { checkRepository, type CheckRepositoryResult } from "./check-repository";

const CASES = ["pass-node", "fail-node"] as const;

export function normalizeReport(report: CheckReport): Omit<CheckReport, "durationMs"> {
  const { durationMs: _dropped, ...rest } = report;
  return rest;
}

export function canonicalJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export type ParityResult = { ok: true; compared: string[] } | { ok: false; code: "PARITY_MISMATCH"; error: string; diffs: string[] };

// The same fixture must yield the same report (minus durationMs) on ubuntu,
// macOS and Windows (spec §12). The golden files are the report generated on
// one platform and committed; every platform compares against them.
// `--update` rewrites them (a reviewed change of behavior, never CI).
export async function runParity(options: { root: string; update: boolean; sentinelVersion: string; today: string }): Promise<ParityResult> {
  const diffs: string[] = [];
  const compared: string[] = [];
  for (const name of CASES) {
    // A fresh cache per fixture, created and removed here: every golden then
    // records `fetched: true`, which is what the e2e test sees when the
    // binary runs each case with an empty FORGE614_HOME. A cache shared
    // across cases would turn the second report into `fetched: false`.
    const cacheRoot = mkdtempSync(join(tmpdir(), `sentinel-parity-${name}-`));
    let result: CheckRepositoryResult;
    try {
      result = await checkRepository({
        root: resolve(options.root, "fixtures", name),
        cacheRoot,
        fetcher: fileFetcher(),
        releaseBase: pathToFileURL(resolve(options.root, "fixtures/standard")).href,
        today: options.today,
        sentinelVersion: options.sentinelVersion,
      });
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
    if (result.kind !== "report") return { ok: false, code: "PARITY_MISMATCH", error: `fixtures/${name} did not produce a report (${result.kind})`, diffs: [] };
    const actual = canonicalJson(normalizeReport(result.report));
    const goldenPath = join(options.root, "fixtures/golden", `${name}.report.json`);
    if (options.update) {
      writeTextAtomic(goldenPath, actual);
      compared.push(`${name} (updated)`);
      continue;
    }
    const expected = readFileSync(goldenPath, "utf8");
    if (expected !== actual) {
      const e = expected.split("\n");
      const a = actual.split("\n");
      const first = e.findIndex((line, i) => line !== a[i]);
      diffs.push(`${name}: line ${first + 1}: golden '${e[first] ?? ""}' vs actual '${a[first] ?? ""}'`);
    }
    compared.push(name);
  }
  return diffs.length === 0 ? { ok: true, compared } : { ok: false, code: "PARITY_MISMATCH", error: `report differs from golden on ${diffs.length} fixture(s)`, diffs };
}
```

```ts
// src/app/parity.test.ts
import { expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CheckReport } from "../modules/report";
import { canonicalJson, normalizeReport, runParity } from "./parity";
import { repoRoot } from "./repo";

const options = { update: false, sentinelVersion: "0.1.0", today: "2026-09-23" };

// Needs the goldens of step 5; until they exist this test fails, which is
// the expected red of this step.
test("the committed goldens match this platform's reports", async () => {
  expect(await runParity({ ...options, root: repoRoot })).toEqual({ ok: true, compared: ["pass-node", "fail-node"] });
});

test("normalizeReport drops durationMs only; canonicalJson is two-space JSON with a final newline", () => {
  const report: CheckReport = {
    schemaVersion: 1,
    sentinel: "0.1.0",
    standard: { version: "1.0.0", sha256: "0".repeat(64), forced: false, fetched: true },
    repository: { kind: "node", name: "demo" },
    verdict: "pass",
    checks: [],
    durationMs: 42,
  };
  const { durationMs: _dropped, ...rest } = report;
  expect(normalizeReport(report)).toEqual(rest);
  expect(canonicalJson({ a: 1 })).toBe('{\n  "a": 1\n}\n');
});

test("a golden changed by one word in a temporary copy is PARITY_MISMATCH naming the line", async () => {
  const root = mkdtempSync(join(tmpdir(), "sentinel-parity-copy-"));
  cpSync(join(repoRoot, "fixtures"), join(root, "fixtures"), { recursive: true });
  const golden = join(root, "fixtures/golden/pass-node.report.json");
  // The first "verdict" in the file is the report's own (it precedes checks).
  writeFileSync(golden, readFileSync(golden, "utf8").replace('"verdict": "pass"', '"verdict": "fail"'));
  const r = await runParity({ ...options, root });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.code).toBe("PARITY_MISMATCH");
  expect(r.diffs).toHaveLength(1);
  expect(r.diffs[0]).toMatch(/^pass-node: line \d+: golden '\s*"verdict": "fail",' vs actual '\s*"verdict": "pass",'$/);
});
```

```ts
// src/interfaces/cli/sentinel-parity.ts
import { z } from "zod";
import { runParity } from "../../app/parity";
import { repoRoot } from "../../app/repo";
import { issuesOf, parseFlags } from "./args";
import { printError, printJson, runCli } from "./output";
import { printVersionIfRequested, SENTINEL_VERSION } from "./version";

const USAGE = "sentinel-parity [--update]";
const Args = z.object({ help: z.literal(true).optional(), update: z.literal(true).optional() }).strict();

// A fixed date: no check that applies to the fixtures depends on the day
// (support-matrix does not apply to them), and a fixed value keeps a future
// date-dependent check from breaking parity between runners.
const PARITY_TODAY = "2026-09-23";

async function main(argv: string[]): Promise<number> {
  if (printVersionIfRequested(argv)) return 0;
  const parsed = Args.safeParse(parseFlags(argv));
  if (!parsed.success) {
    printError("INVALID_ARGUMENTS", issuesOf(parsed.error));
    return 2;
  }
  if (parsed.data.help) {
    printJson({ schemaVersion: 1, usage: USAGE });
    return 0;
  }
  const result = await runParity({ root: repoRoot, update: parsed.data.update === true, sentinelVersion: SENTINEL_VERSION, today: PARITY_TODAY });
  if (!result.ok) {
    for (const diff of result.diffs) process.stderr.write(`[parity] ${diff}\n`);
    printError(result.code, result.error);
    return 1;
  }
  printJson({ schemaVersion: 1, ok: true, compared: result.compared });
  return 0;
}

process.exit(await runCli("PARITY_FAILED", () => main(process.argv.slice(2))));
```

Añadir `PARITY_MISMATCH` y `PARITY_FAILED` a `SENTINEL_ERROR_CODES` en `codes.ts`.

- [ ] **Step 5: Generar los goldens**

Run: `bun run sentinel:parity --update && bun run sentinel:parity`
Expected: primera orden escribe `fixtures/golden/pass-node.report.json` y `fail-node.report.json`; la segunda imprime `{"schemaVersion":1,"ok":true,"compared":["pass-node","fail-node"]}`. Abrir `pass-node.report.json` y comprobar a ojo: `"verdict": "pass"`, 19 entradas, `"sentinel": "0.1.0"`, sin `durationMs`.

- [ ] **Step 6: Job `parity` en `verify.yml` (única desviación permitida de la plantilla: un job añadido)**

Añadir al final de `.github/workflows/verify.yml`:

```yaml
  parity:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-24.04, macos-15, windows-2025]
    runs-on: ${{ matrix.os }}
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4.3.1
      - uses: oven-sh/setup-bun@735343b667d3e6f658f44d0eca948eb6282f2b76 # v2.0.2
        with: { bun-version: "1.4.2" }
      - run: bun install --frozen-lockfile
      - run: bun run sentinel:parity
```

Y documentar en `docs/es/04-workflows.md` (tabla de `verify.yml`) la fila:

```markdown
| `parity` | push a `main`, pull request | `bun install --frozen-lockfile`, `bun run sentinel:parity` en `ubuntu-24.04`, `macos-15` y `windows-2025` | que el informe de `check` sobre `fixtures/pass-node` y `fixtures/fail-node` (sin `durationMs`) sea byte a byte el de `fixtures/golden/` en los tres sistemas | ~2 min por sistema |
```

Gemela en `docs/en/04-workflows.md`, misma posición en la tabla:

```markdown
| `parity` | push to `main`, pull request | `bun install --frozen-lockfile`, `bun run sentinel:parity` on `ubuntu-24.04`, `macos-15` and `windows-2025` | that the `check` report on `fixtures/pass-node` and `fixtures/fail-node` (without `durationMs`) is byte-for-byte the one in `fixtures/golden/` on the three systems | ~2 min per system |
```

Actualizar la frase de `timeout-minutes` en ambos idiomas: "`verify`: 10; `parity`: 15; `build`: 20; `publish`: 10". Después, regenerar el mapa de documentación (los dos archivos de `docs/` cambiaron): `bun run notion-map:build`.

- [ ] **Step 7: Ejecutar todo**

Run: `bun run typecheck && bun test && bun run workflows:check && bun run sentinel:check`
Expected: todos los tests en verde, e2e incluidos (compila el binario una vez, ~10 s); `workflows:check` pass con `parity` documentado; en el informe de `sentinel:check` sobre el propio repo la entrada `release` es `pass` con evidencia `verify.yml: extra job 'parity' (allowed; …)`. El veredicto global de `sentinel:check` sigue en `fail` solo por `node-contract` hasta Task 28, así que el comando termina con salida `1`; es lo esperado aquí. Los tests e2e se ejecutan también dentro de `bun run verify`.

- [ ] **Step 8: Commit (lo hace el propietario)**

```bash
git add tests/e2e src/app/parity.ts src/app/parity.test.ts src/interfaces/cli/sentinel-parity.ts src/interfaces/cli/codes.ts fixtures/golden .github/workflows/verify.yml docs/es/04-workflows.md docs/en/04-workflows.md docs/notion-map.json
git commit -m "test(e2e): binario compilado contra las fixtures, paridad en tres sistemas con goldens y tope de 5 s"
```

---

### Task 28: Documentación bilingüe 00–04, `CONTRACT.md`, `docs/notion-map.json` y protección de rama

**Files:**
- Modify: `docs/notion-map.json` (regenerado con `bun run notion-map:build`, Task 24)
- Modify: `docs/es/00-resumen-y-guia-rapida.md`, `docs/en/00-summary-and-quickstart.md`, `docs/es/01-comprobaciones.md`, `docs/en/01-checks.md`, `docs/es/02-reglamento-y-cache.md`, `docs/en/02-standard-and-cache.md`, `docs/es/03-integracion.md`, `docs/en/03-integration.md` (contenido real bajo los encabezados de Task 1)
- Modify: `CONTRACT.md`, `CONTRACT.en.md`, `README.md`, `README.en.md`
- Modify: `src/interfaces/cli/codes.ts` (la lista completa de los 21 códigos del contrato, en su orden)
- Modify: `src/interfaces/cli/verify.test.ts` (el test que exige `verify` con salida `0` y veredicto `pass`)
- `BRANCH_PROTECTION.md` / `.en.md`: sin cambios en el archivo (es el texto del estándar); la configuración real se hace en Task 29.

**Interfaces:**
- Consumes: `bun run notion-map:build` y `bun run verify` (Task 24), `SENTINEL_ERROR_CODES` (Task 22), las comprobaciones `docs-parity`, `node-contract` y `error-codes` (Tasks 10, 16 y 11) aplicadas por `sentinel:check` al propio repo.
- Produces: docs con el mismo número de encabezados por par; `CONTRACT.md` cuyas tablas satisfacen `node-contract` y `error-codes` sobre el propio repo; `bun run verify` en verde completo.

- [ ] **Step 1: `docs/es/00-resumen-y-guia-rapida.md`**

```markdown
# 00 — Resumen y guía rápida

> Como un inspector municipal: llega con el reglamento vigente bajo el brazo, revisa el edificio, entrega un acta con lo que cumple y lo que no, y se va. No construye, no repara, no decide qué hacer con el acta.

## Qué es forge614-sentinel

`forge614-sentinel` es el verificador del ecosistema Forge614. Revisa un repositorio contra el Estándar de Nodo que ese repositorio declara en `forge614.node.json` y entrega un informe con un veredicto por comprobación (`pass`, `caution`, `fail`, `not-applicable`) y uno global. Sentinel **juzga, nunca hace**: no escribe en el repositorio revisado, no corrige nada y no elige el reglamento por su cuenta.

Decide qué hacer solo por archivos de identidad (acta 0023): con `forge614.node.json` válido revisa; con `.forge614/project.json` responde `applicable: false, reason: "external-project"`; sin ninguno, `not-a-forge614-repo`. Nunca por el nombre de la carpeta ni por los remotos de Git.

## Instalar y ejecutar en un minuto

macOS / Linux: `curl -fsSL https://github.com/jotredev/forge614-sentinel/releases/latest/download/install.sh | bash`. Windows: `irm https://github.com/jotredev/forge614-sentinel/releases/latest/download/install.ps1 | iex`. El instalador deja el binario en `~/.forge614/sentinel/<versión>/` y el lanzador en `~/.forge614/sentinel/bin/forge614-sentinel`; comprueba la huella publicada en `SHA256SUMS` antes de instalar.

En la raíz de un nodo: `forge614-sentinel check --json`. La primera vez descarga el reglamento declarado (documento 02); las siguientes no usan red. Código de salida `0` con `pass` o `caution`, `1` con `fail`, `2` con argumentos inválidos.

## Qué sale en el informe

Un solo objeto JSON en stdout con `schemaVersion: 1`: la versión de Sentinel, el reglamento usado (versión, huella, si fue forzado con `--standard`, si se descargó en esta ejecución y, cuando existe, `latestKnown`), el repositorio (`kind: "node"`, `name`), el veredicto global (el peor de las comprobaciones aplicadas), la lista de comprobaciones con `id`, `verdict`, `applied`, `evidence` y `message` en español e inglés, y `durationMs`. Los errores van a stderr como `{ schemaVersion, code, error }`; los códigos están en `CONTRACT.md`.

## Dónde seguir leyendo

- Documento 01: las 19 comprobaciones y cómo se elige cuáles corren.
- Documento 02: de dónde sale el reglamento, la caché y las huellas.
- Documento 03: cómo se integra en el `verify` de cada nodo y en CI.
- Documento 04: los workflows de este repositorio.
- `CONTRACT.md`: comandos, salidas y códigos de error.
```

`docs/en/00-summary-and-quickstart.md`: Mismos encabezados que la versión en español, traducción fiel párrafo a párrafo (tablas con las mismas filas y el mismo orden); la comprobación `docs-parity` lo verifica al contar y comparar encabezados. Encabezados, en este orden:

```markdown
# 00 — Summary and quickstart
## What forge614-sentinel is
## Install and run in one minute
## What the report contains
## Where to read next
```

La analogía es la de Task 1 ("Like a municipal inspector: …"), ampliada con la misma frase final que la versión en español ("It does not build, repair or decide what to do with the report."). Cuatro encabezados `##` en ambos.

- [ ] **Step 2: `docs/es/01-comprobaciones.md`**

```markdown
# 01 — Comprobaciones

> Como la lista de revisión de un inspector: cada punto tiene un número, un criterio y una casilla.

## Cómo se elige qué corre

El pack del reglamento (`packs/forge614-pack-ecosystem-node/pack.json`) nombra reglas; cada regla puede declarar un `validator` en su `manifest.json`. Sentinel corre las comprobaciones que esos validadores nombran (con un mapa de nombres antiguos: `bilingual-docs` → `docs-parity`, `decision-records` → `decisions`) más las comprobaciones nativas que el estándar 1.0.0 todavía no nombra (el estándar 1.1.0 las nombra explícitamente). Si el pack pide un validador que esta versión de Sentinel no implementa, aparece una entrada `caution` con `SENTINEL_OUTDATED` en la evidencia: nunca se omite en silencio. `--only <id,id>` limita la ejecución; un id desconocido es `INVALID_ARGUMENTS`.

Cada comprobación declara cuándo aplica (`appliesWhen`); si no aplica, la entrada dice `not-applicable` con el motivo y no cuenta para el veredicto global. Ninguna comprobación devuelve `pass` por no saber.

## Las 11 trasladadas

Vienen de los validadores de `forge614-ai` con las mismas evidencias:

| Id | Qué comprueba |
| --- | --- |
| `package-naming` | carpetas de `standard/rules`, `standard/packs` y paquetes del Hub bajo `.agents/` con nombre `origen-tipo-nombre` |
| `forbidden-mentions` | ningún término de `forbidden-mentions.json` del reglamento en el árbol (salvo rutas excluidas) |
| `docs-parity` | pares `README`, `CONTRACT`, `docs/es/NN-*`/`docs/en/NN-*` con el mismo número de encabezados y la misma numeración |
| `decisions` | actas numeradas sin huecos, estados válidos, secciones obligatorias e `INDEX.json` coherente |
| `agent-checklist-impact` | todo plan cerrado en `.agents/plans/` declara `Sí`/`No` y explica el impacto en el procedimiento de agentes |
| `error-codes` | códigos de `CONTRACT.md` y de `printError(...)` en `MAYUSCULAS_CON_GUION_BAJO` |
| `support-matrix` | `standard/support-matrix.json` válido y sin celdas en revalidación vencidas (solo `forge614-ai`) |
| `workflows` | workflows delgados: `bun run <script>` existente, acciones fijadas por SHA, `timeout-minutes`, jobs documentados |
| `context-budget` | la suma estimada del índice del pack no supera 3000 tokens (solo `forge614-ai`) |
| `ecosystem-contract` | una copia local de `FORGE614_ECOSYSTEM_CONTRACT.md`, si existe, es idéntica a la publicada |
| `rules-catalog` | manifiestos de reglas y `pack.json` válidos, carpetas con su nombre, validadores conocidos (solo `forge614-ai`) |

## Las 8 nuevas

| Id | Qué comprueba | De dónde salen los parámetros |
| --- | --- | --- |
| `node-pointer` | `forge614.node.json` válido y `standard.sha256` igual a la huella del paquete en caché de esa versión | caché |
| `layout` | carpetas y archivos obligatorios de STANDARD §2; nada en `scripts/` que duplique una plantilla | lista incorporada en Sentinel con 1.0.0 (evidencia `source: builtin`); `layout.json` en 1.1.0 (la evidencia dice cuál) |
| `stack` | `tsconfig.json` con `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`; `any` en posición de tipo y directivas `@ts-ignore`/`@ts-expect-error` prohibidas en `src/` (tests excluidos; comentarios, textos y expresiones regulares no cuentan); `bun.lock`; `engines.bun` ≥ 1.3.9 | lista incorporada en Sentinel con 1.0.0 (`source: builtin`); `stack.json` en 1.1.0 |
| `secrets-hygiene` | patrones de secretos (claves privadas, tokens con prefijo conocido, cadenas de conexión con credenciales) y `.env` con valores reales; solo reporta el patrón y la línea, nunca el valor | lista incorporada en Sentinel con 1.0.0 (`source: builtin`); `secret-patterns.json` en 1.1.0 |
| `node-contract` | `CONTRACT.md` y `CONTRACT.en.md` con las mismas filas; en las dos direcciones: cada `bun run <script>` de la tabla existe en `package.json` y cada script que invocan las plantillas `verify.yml` y `release.yml` aparece en la tabla; cada código de la tabla aparece en `src/interfaces/cli` y cada código de la CLI está en la tabla | plantillas del reglamento (qué scripts son públicos) |
| `installer` | `install.sh` e `install.ps1` idénticos a la plantilla renderizada con las variables del nodo; la versión del reglamento es la que declara `forge614.node.json`, también en una revisión forzada con `--standard` (`forge614-ai` exento) | plantillas del reglamento |
| `release` | `verify.yml` y `release.yml` con los jobs de la plantilla intactos, acciones fijadas por SHA, `CHANGELOG.md` presente; solo se admiten jobs añadidos de una lista explícita (`parity`) | plantillas del reglamento; lista de jobs añadidos incorporada en Sentinel |
| `versions` | igualdad exacta entre `package.json.version`, `docs/notion-map.json.productVersion` y, cuando el checkout tiene tags `v*`, el más alto | — |

## Veredictos y evidencias

`pass` sin problemas (puede llevar evidencia informativa, por ejemplo qué lista incorporada se usó); `caution` cuando Sentinel no puede afirmar ni negar (huella no cruzable en una revisión forzada, validador desconocido); `fail` con evidencia concreta (`ruta:línea: motivo`); `not-applicable` con motivo. Una comprobación que lanza una excepción se reporta como `fail` con `CHECK_FAILED: <mensaje>` y las demás siguen; el proceso sale `1` y además escribe el sobre `CHECK_FAILED` en stderr.
```

`docs/en/01-checks.md`: Mismos encabezados que la versión en español, traducción fiel párrafo a párrafo (tablas con las mismas filas y el mismo orden); la comprobación `docs-parity` lo verifica al contar y comparar encabezados. Encabezados, en este orden:

```markdown
# 01 — Checks
## How the set of checks is chosen
## The 11 ported checks
## The 8 new checks
## Verdicts and evidence
```

Analogía: "Like an inspector's checklist: every item has a number, a criterion and a box." Las dos tablas conservan los ids en inglés tal cual y traducen solo las columnas de texto. Cuatro encabezados `##` en ambos.

- [ ] **Step 3: `docs/es/02-reglamento-y-cache.md`**

```markdown
# 02 — Reglamento y caché

> Como la copia sellada del reglamento en el archivo municipal: se comprueba el sello antes de usarla y nunca se corrige a mano.

## De dónde sale el reglamento

De la release `standard-v<versión>` de `jotredev/forge614-ai`: `standard-<versión>.tar.gz` y `SHA256SUMS`. El origen es un dato (`{ kind: "github-release", repository, version, sha256 }`); en 0.1 el repositorio es fijo y solo la versión y la huella vienen del repositorio revisado (`forge614.node.json`, campos `standard.version` y `standard.sha256`). `--standard <versión>` fuerza otra versión y el informe lo marca con `forced: true`. Sentinel nunca elige "la más nueva".

## La caché local

`<FORGE614_HOME o ~/.forge614>/standard/<versión>/` con `manifest.json` (`{ schemaVersion: 1, version, sha256, fetchedAt }`) y `content/` (el paquete extraído). La escritura es atómica: se extrae en una carpeta temporal y se renombra; nunca hay una entrada a medias. `forge614-sentinel standard fetch [<versión>]` la llena a mano; `check` la llena sola la primera vez que falta la versión pedida.

## Verificación de huellas

Antes de aceptar un paquete se compara su sha256 con el de `SHA256SUMS` y con el que declara el repositorio revisado; si difieren, `STANDARD_CORRUPT` y no se guarda nada. Al cargar de caché se vuelve a comparar `manifest.sha256` con la huella declarada. Por eso, si la huella del puntero no coincide con la de la release o con la de la caché (el puntero se editó a mano o la release cambió), el resultado es `STANDARD_CORRUPT` antes de correr ninguna comprobación: no hay informe, solo el sobre de error. La comprobación `node-pointer` cubre el caso que queda, una revisión forzada con `--standard`: cruza `standard.sha256` del repositorio con la huella en caché de la versión que el puntero declara y da `fail` si difieren, o `caution` si esa versión no está en caché.

## Sin red

Con la versión pedida en caché, `check` no usa red. Sin caché y sin red, `STANDARD_UNAVAILABLE` con el comando para obtenerlo; nunca se revisa con otra versión "por aproximación". Si hay una versión más nueva en caché que la que el nodo declara, el informe la anota en `standard.latestKnown` sin usarla. Dos variables de entorno existen solo para pruebas y CI sin red: `FORGE614_SENTINEL_RELEASE_BASE` (una URL `file://` con la misma estructura que la release) y `FORGE614_SENTINEL_OFFLINE=1`.
```

`docs/en/02-standard-and-cache.md`: Mismos encabezados que la versión en español, traducción fiel párrafo a párrafo (tablas con las mismas filas y el mismo orden); la comprobación `docs-parity` lo verifica al contar y comparar encabezados. Encabezados, en este orden:

```markdown
# 02 — Standard and cache
## Where the standard comes from
## The local cache
## Fingerprint verification
## Offline
```

Analogía: "Like the sealed copy of the code in the municipal archive: the seal is checked before use and it is never corrected by hand." Cuatro encabezados `##` en ambos.

- [ ] **Step 4: `docs/es/03-integracion.md`**

```markdown
# 03 — Integración

> Como el sello de inspección en la entrada de un local: sin él, no abre.

## En el verify de cada nodo

El script `verify` del nodo corre, además de lo suyo, `forge614-sentinel check --json` y falla si el veredicto es `fail`. Si el binario no está instalado, `verify` falla con `SENTINEL_NOT_INSTALLED` y el comando de instalación; no avisa y sigue. Ese cambio en el `verify` de cada nodo no forma parte de Sentinel 0.1: lo hacen el Plan A2 en `forge614-ai` y la fase 0.4 en los demás nodos. Sentinel es obligatorio para desarrollar nodos del ecosistema y opcional para productos de terceros hechos con el ecosistema (que reciben `applicable: false`).

## En CI

La plantilla `verify.yml` del estándar 1.1.0 (Plan A2) añade un paso `bun run sentinel:install` antes de `bun run verify`: descarga la release de Sentinel fijada en `forge614.node.json` (`sentinel.version`, campo opcional nuevo) para la plataforma del runner y verifica `SHA256SUMS`. Las releases son públicas: sin token no hay escritura. Este repositorio no se instala a sí mismo: su `verify` corre `check` desde el código fuente (`bun run sentinel:check`) contra la copia del reglamento en `fixtures/standard/`, cuya huella es la que fija `forge614.node.json`.

## Códigos de salida y errores

`0` con `pass`, con `caution` (salvo `--strict`) y con `applicable: false`; `1` con `fail`, con `caution` bajo `--strict` y con `STANDARD_UNAVAILABLE`, `STANDARD_CORRUPT`, `STANDARD_FETCH_FAILED`, `CHECK_FAILED` o `SENTINEL_FAILED`; `2` con `INVALID_ARGUMENTS` y `NODE_POINTER_INVALID`. Los sobres de error nunca incluyen rutas absolutas ni stack traces.

## Arranque circular con forge614-ai

`forge614-ai` publicó el reglamento 1.0.0; Sentinel se construyó desde sus plantillas y se revisa a sí mismo; una vez publicado Sentinel 0.1, `forge614-ai` adopta `check` en su `verify`, retira sus validadores y publica el estándar 1.1.0 (plantilla `verify.yml` con Sentinel, `layout.json`, `stack.json`, `secret-patterns.json`). Los demás nodos adoptan Sentinel en su siguiente release (fase 0.4). Un nodo puede declarar 1.0.0 mientras Sentinel ya conoce 1.1.0: se revisa con la versión declarada.
```

`docs/en/03-integration.md`: Mismos encabezados que la versión en español, traducción fiel párrafo a párrafo (tablas con las mismas filas y el mismo orden); la comprobación `docs-parity` lo verifica al contar y comparar encabezados. Encabezados, en este orden:

```markdown
# 03 — Integration
## In every node's verify
## In CI
## Exit codes and errors
## Bootstrapping with forge614-ai
```

Analogía: "Like the inspection seal at a shop's entrance: without it, it does not open." Cuatro encabezados `##` en ambos.

- [ ] **Step 5: `docs/*/04-workflows.md`**: ya tienen el contenido de la plantilla más la fila `parity` (Task 27). Sustituir en la fila de `verify` la celda "Qué valida" por "typecheck, tests (unitarios y e2e con el binario compilado), `workflows:check`, `notion-map:build --check`, `sentinel:check` sobre este repositorio" y su gemela.

- [ ] **Step 6: `CONTRACT.md`**

```markdown
# Contrato de Forge614 Sentinel (`forge614-sentinel`)

> Analogía en una frase: como un inspector municipal, llega con el reglamento vigente, revisa, entrega el acta y se va; no construye ni repara.

## Propósito
Revisar cualquier repositorio del ecosistema contra el Estándar de Nodo que declara y entregar un informe con veredicto y evidencias, igual en Linux, macOS y Windows.

## Qué hace
- Clasifica el repositorio por archivos de identidad (`forge614.node.json`, `.forge614/project.json`) y revisa solo nodos del ecosistema.
- Obtiene, verifica (sha256) y cachea el reglamento que el nodo declara; nunca elige otra versión por su cuenta.
- Ejecuta las 19 comprobaciones de Sentinel 0.1 (documento 01) seleccionadas por el pack del reglamento y produce `CheckReport` (`schemaVersion: 1`).
- Se revisa a sí mismo en `verify` y prueba la paridad del informe en tres sistemas.

## Qué no hace
- No escribe en el repositorio revisado ni corrige nada.
- No usa red durante las comprobaciones; solo para descargar el reglamento que falta en caché.
- No revisa proyectos de terceros ni reglamentos de terceros (entregas futuras); no ejecuta el nodo (`import-rules`, `boundaries-zod`, `machine-contracts` llegan en 0.2).

## Dependencias
| Nodo o binario | Cómo se consume | Versión mínima |
| --- | --- | --- |
| Bun | runtime de desarrollo y `bun build --compile`; fijado en los workflows (acta 0026) | 1.4.2 (CI); `engines.bun >= 1.3.9` |
| TypeScript | `devDependency`; `bun run typecheck` | 5.9.3 |
| zod | esquemas en toda frontera | 4.6.5 |
| fflate | `gunzipSync` para el reglamento; `gzipSync`/`zipSync` para los artefactos de release | 0.8.3 |
| yaml | lectura de workflows | 2.8.1 |
| git | solo lectura (`ls-files`, `tag`, `log`), opcional: sin git se recorre el disco | cualquiera |
| gh | solo en `release:publish` (runner de GitHub) | 2.x |
| forge614-ai | release `standard-v<versión>` (paquete + `SHA256SUMS`) | 1.0.0 |

## Comandos públicos
| Comando | Entrada (esquema) | Salida (esquema) | `schemaVersion` | Códigos de salida |
| --- | --- | --- | --- | --- |
| `forge614-sentinel check` | `[--repo <ruta>] [--standard <X.Y.Z>] [--only <id,id>] [--strict] [--json]` | `CheckReport` o `{ applicable: false, reason }` | `1` | `0` pass, caution, no aplicable; `1` fail, caution con `--strict`, `STANDARD_UNAVAILABLE`, `STANDARD_CORRUPT`, `STANDARD_FETCH_FAILED`, `CHECK_FAILED`, `SENTINEL_FAILED`; `2` `INVALID_ARGUMENTS`, `NODE_POINTER_INVALID` |
| `forge614-sentinel standard fetch` | `[<X.Y.Z>] [--json]` (sin versión usa `./forge614.node.json`) | `{ version, sha256, alreadyCached, location }` | `1` | `0`; `1` `STANDARD_FETCH_FAILED`, `STANDARD_CORRUPT`, `SENTINEL_FAILED`; `2` `INVALID_ARGUMENTS` |
| `bun run verify` | `[--skip-tests]` | `{ ok: true, steps, sentinel: { verdict, durationMs } }` | `1` | `0`; `1` `VERIFY_STEP_FAILED`, `VERIFY_FAILED`; `2` `INVALID_ARGUMENTS` |
| `bun run sentinel:check` | ninguna (alias de `check --repo . --json`) | `CheckReport` | `1` | los de `check` |
| `bun run sentinel:parity` | `[--update]` | `{ ok: true, compared }` | `1` | `0`; `1` `PARITY_MISMATCH`, `PARITY_FAILED`; `2` `INVALID_ARGUMENTS` |
| `bun run workflows:check` | ninguna | `{ verdict, evidence }` | `1` | `0` pass; `1` en otro caso o `WORKFLOWS_CHECK_FAILED`; `2` `INVALID_ARGUMENTS` |
| `bun run workflows:run` | `[--workflow <nombre>]` | `{ workflow, jobs, ok }` | `1` | `0`; `1` paso fallido, `WORKFLOW_NOT_FOUND`, `WORKFLOWS_RUN_FAILED`; `2` `INVALID_ARGUMENTS` |
| `bun run notion-map:build` | `[--check]` | `{ path, pages }` o `{ ok: true, path }` | `1` | `0`; `1` `NOTION_MAP_DRIFT`, `NOTION_MAP_FAILED`; `2` `INVALID_ARGUMENTS` |
| `bun run build:target` | `[--target <t>]` o `FORGE614_TARGET` | `{ target, binary, archive, sha256 }` | `1` | `0`; `1` `BUILD_FAILED`; `2` `INVALID_ARGUMENTS` |
| `bun run smoke:target` | `[--target <t>]` o `FORGE614_TARGET` | `{ target, version, steps }` | `1` | `0`; `1` `SMOKE_FAILED`; `2` `INVALID_ARGUMENTS` |
| `bun run release:publish` | `[--tag vX.Y.Z] [--dry-run]` (sin `--tag` usa `GITHUB_REF_NAME`) | `{ tag, version, assets, command, published }` | `1` | `0`; `1` `RELEASE_TAG_MISMATCH`, `RELEASE_ASSETS_MISSING`, `RELEASE_PUBLISH_FAILED`; `2` `INVALID_ARGUMENTS` |

Toda salida de datos es un solo objeto JSON en stdout con `schemaVersion: 1`; todo error es `{ schemaVersion: 1, code, error }` en stderr sin rutas absolutas; ningún comando imprime un stack trace. Todos aceptan `--help` (imprime `{ usage }`) y `--version` (`{ name: "forge614-sentinel", version }`) antes de analizar cualquier otro argumento. Variables de entorno: `FORGE614_HOME` (raíz de la caché), y solo para pruebas y CI sin red, `FORGE614_SENTINEL_RELEASE_BASE`, `FORGE614_SENTINEL_OFFLINE`, `FORGE614_SENTINEL_CRASH_CHECK`.

## Códigos de error
| Código | Significado |
| --- | --- |
| `INVALID_ARGUMENTS` | flag desconocido, valor inválido, `--only` con id inexistente, argumento posicional inesperado; salida `2` |
| `NODE_POINTER_INVALID` | `forge614.node.json` no cumple `NodePointerSchema`; salida `2` |
| `STANDARD_UNAVAILABLE` | la versión declarada no está en caché y no hay red; el mensaje trae el comando `standard fetch` |
| `STANDARD_CORRUPT` | la huella del paquete (descargado o en caché) no coincide con la pedida o con `SHA256SUMS`; no se guarda nada |
| `STANDARD_FETCH_FAILED` | error de red o de release al descargar el reglamento |
| `CHECK_FAILED` | una comprobación lanzó una excepción; el informe completo se imprime igualmente con veredicto `fail` |
| `SENTINEL_FAILED` | error inesperado fuera de las comprobaciones |
| `VERIFY_STEP_FAILED` | un paso de `verify` terminó con salida distinta de `0` o `sentinel:check` no dio `pass` |
| `VERIFY_FAILED` | `verify`: error inesperado |
| `WORKFLOWS_CHECK_FAILED` | `workflows:check`: error inesperado |
| `WORKFLOWS_RUN_FAILED` | `workflows:run`: error inesperado |
| `WORKFLOW_NOT_FOUND` | `workflows:run`: el workflow pedido no existe o no cumple `WorkflowSchema` |
| `NOTION_MAP_DRIFT` | `notion-map:build --check`: `docs/notion-map.json` no coincide con el mapa fresco |
| `NOTION_MAP_FAILED` | `notion-map:build`: error inesperado |
| `PARITY_MISMATCH` | `sentinel:parity`: el informe de una fixture difiere del golden |
| `PARITY_FAILED` | `sentinel:parity`: error inesperado |
| `BUILD_FAILED` | `build:target`: `bun build --compile` falló |
| `SMOKE_FAILED` | `smoke:target`: el binario no responde `--version`/`--help` o `check` sobre la fixture no da `pass` |
| `RELEASE_TAG_MISMATCH` | `release:publish`: el tag no es `v<package.json.version>` |
| `RELEASE_ASSETS_MISSING` | `release:publish`: falta alguno de los cinco artefactos |
| `RELEASE_PUBLISH_FAILED` | `release:publish`: `gh` no pudo ejecutarse o la release no se creó |

## Requisitos obligatorios para asistentes de IA soportados
Sección `sentinel` de `standard/procedures/new-agent-checklist.md` (estándar 1.0.0): no existe porque Sentinel no integra asistentes de IA; los asistentes consumen su informe JSON como cualquier otra herramienta.

## Compatibilidad
Cambios incompatibles suben `schemaVersion`; se mantiene una versión de compatibilidad. `CheckReport` evoluciona de forma aditiva (acta 0024): campos nuevos opcionales, nunca renombrar ni quitar.
```

`CONTRACT.en.md`: Mismos encabezados que la versión en español, traducción fiel párrafo a párrafo (tablas con las mismas filas y el mismo orden); la comprobación `docs-parity` lo verifica al contar y comparar encabezados. `node-contract` además compara el número de filas de las tablas de comandos y de códigos entre los dos idiomas. Encabezados, en este orden (los de la plantilla 1.0.0):

```markdown
# Contract of Forge614 Sentinel (`forge614-sentinel`)
## Purpose
## What it does
## What it does not do
## Dependencies
## Public commands
## Error codes
## Mandatory requirements for supported AI assistants
## Compatibility
```

Las celdas de comandos y códigos (lo que va entre comillas invertidas) se copian sin traducir. Actualizar `src/interfaces/cli/codes.ts` para que `SENTINEL_ERROR_CODES` liste exactamente los 21 códigos de la tabla (en ese orden), de modo que `node-contract` encuentre cada uno como literal en `src/interfaces/cli`.

- [ ] **Step 7: README es/en**

Sustituir los `<completar>` de la plantilla: analogía del inspector municipal; "Qué es": una frase; "Qué no es": no corrige, no elige reglamento, no revisa terceros; tabla de documentación con las filas 00–04 y el contrato (`| 00 | [Resumen y guía rápida](docs/es/00-resumen-y-guia-rapida.md) | [Summary and quickstart](docs/en/00-summary-and-quickstart.md) |` … `| 04 | [Workflows](docs/es/04-workflows.md) | [Workflows](docs/en/04-workflows.md) |`). Mismo número de encabezados en ambos.

- [ ] **Step 8: Test de `verify` completo en verde**

Con `CONTRACT.md` y la lista de códigos completos, `sentinel:check` sobre el propio repo pasa; ahora se añade a `src/interfaces/cli/verify.test.ts` el test que lo exige (en Task 24 no podía estar en verde):

```ts
test("--skip-tests exits 0 with one JSON: every step green and the self-check verdict pass", () => {
  const r = run(["bun", "run", CLI, "--skip-tests"], { cwd: REPO_ROOT, timeoutMs: 300_000 });
  expect(r.exitCode, r.stderr).toBe(0);
  const out = JSON.parse(r.stdout.trim());
  expect(out).toMatchObject({ schemaVersion: 1, ok: true });
  expect(out.steps.map((s: { label: string }) => s.label)).toEqual(["typecheck", "workflows:check", "notion-map:build --check", "sentinel:check"]);
  expect(out.sentinel.verdict).toBe("pass");
});
```

- [ ] **Step 9: Generar el mapa y cerrar la autoverificación**

Run: `bun run notion-map:build && bun run verify`
Expected: `docs/notion-map.json` con cinco páginas y `productVersion: "0.1.0"`; `verify` en verde completo: typecheck, tests (incluidos e2e), `workflows:check`, `notion-map:build --check`, `sentinel:check` con `verdict: pass` y las 19 entradas (16 `pass`, 3 `not-applicable`: `support-matrix`, `context-budget`, `rules-catalog`). Si `node-contract` o `docs-parity` fallan, la evidencia señala la fila o el encabezado que falta; corregir el documento.

- [ ] **Step 10: Commit (lo hace el propietario)**

```bash
git add docs CONTRACT.md CONTRACT.en.md README.md README.en.md src/interfaces/cli/codes.ts src/interfaces/cli/verify.test.ts
git commit -m "docs: documentación bilingüe 00-04, contrato del nodo y mapa de documentación de Sentinel 0.1"
```

---

### Task 29: Cierre: autoverificación final, protección de rama y release v0.1.0 (lo hace el propietario)

**Files:** ninguno nuevo en el repo (operaciones de GitHub y registro de resultados en Engram).

- [ ] **Step 1: Verificar que la release del reglamento se descarga sin token**

`install.sh`, `install.ps1` y `forge614-sentinel standard fetch` descargan de forma anónima (spec §13: releases públicas). Antes de publicar nada, comprobar desde una sesión sin credenciales de GitHub que el asset de `forge614-ai` responde:

```bash
env -u GH_TOKEN -u GITHUB_TOKEN curl -fsSL -o /dev/null -w '%{http_code}\n' https://github.com/jotredev/forge614-ai/releases/download/standard-v1.0.0/SHA256SUMS
env -u GH_TOKEN -u GITHUB_TOKEN curl -fsSL -o /dev/null -w '%{http_code}\n' https://github.com/jotredev/forge614-ai/releases/download/standard-v1.0.0/standard-1.0.0.tar.gz
```
Expected: `200` en las dos. Si alguna falla (`404` o `403`), la release no es pública: detenerse y avisar al propietario; se resuelve en `forge614-ai` (Plan A2), nunca desde este plan.

- [ ] **Step 2: Crear el repositorio remoto público y subir `main`**

Público porque sus releases deben descargarse sin token (spec §13), igual que las de `forge614-ai`:

```bash
cd ~/Desktop/forge614-sentinel
gh repo create jotredev/forge614-sentinel --public --source=. --remote=origin --push
```

- [ ] **Step 3: Configurar la protección de `main`** siguiendo `BRANCH_PROTECTION.md` (rama `main`; PR obligatorio; 0 aprobaciones mientras haya un solo mantenedor; status checks requeridos `verify` **y** `parity` (los tres SO), actualizados con la base; sin push directo, sin force push, historial lineal). El archivo `BRANCH_PROTECTION.md` no se edita (es el texto del estándar); el estándar 1.1.0 añadirá `parity` a la fila de checks requeridos.

- [ ] **Step 4: Primer PR y CI verde**

Abrir un PR desde una rama con todo el trabajo de las Tasks 1–28 (o, si se fue commiteando en `main` antes de la protección, un PR vacío de comprobación). Esperar `verify` (ubuntu) y `parity` (ubuntu, macOS, Windows) en verde. Si `parity` falla en Windows y no en los otros, el diff que imprime `PARITY_MISMATCH` nombra la línea; la causa esperada sería una ruta con `\` o un `\r` sin normalizar: corregir en `infrastructure`, nunca ajustar el golden a un sistema.

- [ ] **Step 5: Tag y release**

```bash
git checkout main && git pull
git tag v0.1.0
git push origin v0.1.0
```
Expected: `release.yml` corre `build` en cinco runners (`build:target` + `smoke:target` cada uno) y `publish` crea la release `v0.1.0` con `forge614-sentinel-{darwin-arm64,darwin-x64,linux-x64,linux-arm64}.tar.gz`, `forge614-sentinel-windows-x64.zip`, `SHA256SUMS`, `install.sh` e `install.ps1`.

Run: `gh release view v0.1.0 --json assets -q '.assets[].name'`
Expected: los ocho nombres anteriores.

- [ ] **Step 6: Instalar con la plantilla y probar**

```bash
curl -fsSL https://github.com/jotredev/forge614-sentinel/releases/download/v0.1.0/install.sh | bash
~/.forge614/sentinel/bin/forge614-sentinel --version
```
Expected: `installed forge614-sentinel 0.1.0 at ~/.forge614/sentinel/0.1.0 …` y `{"schemaVersion":1,"name":"forge614-sentinel","version":"0.1.0"}`.

- [ ] **Step 7: `check` sobre Sentinel mismo y sobre `forge614-ai` con el binario instalado**

```bash
cd ~/Desktop/forge614-sentinel && ~/.forge614/sentinel/bin/forge614-sentinel check --json | bun -e 'const r = await Bun.stdin.json(); console.log(r.verdict, r.standard, r.checks.filter(c => c.verdict !== "pass").map(c => [c.id, c.verdict, c.evidence]))'
cd ~/Desktop/forge614-ai && ~/.forge614/sentinel/bin/forge614-sentinel check --json | bun -e 'const r = await Bun.stdin.json(); console.log(r.verdict, r.standard, r.checks.filter(c => c.verdict !== "pass").map(c => [c.id, c.verdict, c.evidence]))'
```
Expected en Sentinel: `pass`, `fetched: true` la primera vez (descarga real desde la release `standard-v1.0.0` de GitHub: es la única prueba con red del plan), luego `false`; `not-applicable` solo `support-matrix`, `context-budget`, `rules-catalog`.
Expected en `forge614-ai`: `installer` `not-applicable` (exento); `support-matrix`, `context-budget`, `rules-catalog` aplicados. Cualquier `fail` (por ejemplo, `node-contract` por el código reservado `SCHEMA_UNSUPPORTED` listado en su `CONTRACT.md` sin literal en `src/interfaces/cli`, o `versions` si hay un tag `v*` por delante) es un hallazgo real que resuelve el plan de adopción de `forge614-ai` (spec §9.2 paso 4), no un ajuste de Sentinel. Anotar el veredicto y las evidencias.

- [ ] **Step 8: Registrar en Engram** (lo hace el coordinador): enlace de la release `v0.1.0`, las cinco huellas de `SHA256SUMS`, el resultado de `check` sobre ambos repositorios con sus evidencias, y la lista de desviaciones que `forge614-ai` debe corregir antes de adoptar Sentinel. Cerrar la sesión con `memory_session_end`.

---

## Impacto en el procedimiento de agentes

**Sí.** Este plan cambia lo que un asistente de IA tiene que hacer y validar al trabajar en cualquier nodo del ecosistema:

1. **Sentinel pasa a ser obligatorio en el `verify` de todo nodo** (spec D4, D7, §9.1; adopción en la fase 0.4). Un asistente que cierre un plan en un nodo debe ejecutar `forge614-sentinel check --json` (o `bun run verify`, que lo incluye) y no puede declarar el trabajo terminado con veredicto `fail`; sin el binario instalado, `verify` falla con `SENTINEL_NOT_INSTALLED` y el asistente debe pedir a la persona que lo instale, nunca omitir el paso ni fingir el resultado (regla `no-fabricated-validations`). La sección de validaciones del procedimiento central (`standard/procedures/new-agent-checklist.md`) debe añadir "ejecutar Sentinel y adjuntar el veredicto y las evidencias" como validación obligatoria.
2. **Las plantillas del estándar cambian en 1.1.0** (spec §9.2 paso 4): `verify.yml` con el paso `bun run sentinel:install`, `layout.json`, `stack.json` y `secret-patterns.json` nuevos, `forge614.node.json` con el campo opcional `sentinel.version`, y `BRANCH_PROTECTION.md` con `parity` entre los checks requeridos. Un asistente que renderice o actualice plantillas en un nodo debe usar la versión 1.1.0 y actualizar el puntero; los ocho parámetros que hoy Sentinel embebe dejan de estar en el código y pasan al reglamento.
3. **Seguimiento en `forge614-ai`, a cargo del Plan A2 (este plan no lo toca: para él `forge614-ai` es de solo lectura):** registrar a Sentinel en la matriz de soporte. `standard/support-matrix.json` añadiría el nodo `sentinel` a `nodes` y una celda por asistente (`claude-code`, `codex`, `cursor`) con `status: "not-applicable"` y la nota "consume el informe JSON; no integra asistentes", verificada en la fecha de la release 0.1.0. Hasta entonces la comprobación `support-matrix` de `forge614-ai` sigue en `pass` aunque la matriz omite el nodo; el Plan A2 decide el texto final de la celda.
