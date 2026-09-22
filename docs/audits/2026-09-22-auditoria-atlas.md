# Auditoría de forge614-atlas

**Fecha:** 2026-09-22
**Método:** lectura estática del código vía API de GitHub (rama main), sin ejecutar tests ni binarios
**Versión auditada:** 0.1.0 (`private: true`, sin tags ni releases)

> Los cinco hallazgos P1 de seguridad fueron re-verificados contra el código por el autor de la spec el 2026-09-22.
> Todo lo marcado **verificado** se comprobó leyendo el código; lo marcado **supuesto** no se verificó.

## 1. Estado real (verificado leyendo código)

- `package.json:3` v0.1.0, `private: true`. Cero tags, cero releases, cero `.github/workflows`, cero `scripts/`, sin `install.sh`. Rama huérfana `atlas/plan4-subagent-dispatch` sigue viva tras el merge (PR #2).
- Único comando: `init` (`src/interfaces/cli/main.ts:12`). **No existe `resume`** aunque STATE.md:88 y el spec §5 lo nombran; el resume es implícito en `init`. No hay `--version`/`--help` (UNKNOWN_COMMAND).
- **Los Planes 1–4 están hechos y fusionados** — corrige lo que se asumía: `init` sí despacha vía Workers (`dispatch-modules.ts`), guarda reportes en Engram (`module-report.ts`), pausa por cuota (`pause-count.ts`), reporte final (`finalize-run.ts`). El bug de `discoverModules` **ya está corregido**: recursivo, nombre = ruta relativa (`discovery.ts:68-117`). Plan 5 (instalador) solo tiene spec+plan escritos (commits `f079893`, `2c39e0b`).
- Scoring funciona: ciclomática por AST (`cyclomatic.ts:34-85`), fan-in con dedupe por módulo (`fan-in.ts:127-171`), churn por `git log` (`churn.ts:36-76`), gap de tests hermanos (`test-coverage-gap.ts:57-81`), min-max 0.35/0.35/0.30 ×(1+0.2·gap) (`composite-score.ts:58-80`), tiers 15/35/50 con mínimo 1 profundo (`tiers.ts:44-77`).
- Docs↔código desincronizados: README dice "Planes 1–3, `init` solo emite plan" (falso); `docs/es/08` documenta estado `ready` que ya no existe (STATE.md:238 lo admite); `docs/es/01` mantiene concurrencia 3, menú TUI de flechas y "elección fresca por menú" — el spec `2026-09-18` §5 dice "muestra siempre un menú interactivo" y §10 concurrencia 3, mientras STATE.md:72-85 los revoca (secuencial 1 a 1; Shell resuelve ambigüedad). Tres fuentes, tres versiones. "67 tests": se contaron ~25 `test(` en 12 archivos por grep (no verificado corriendo `bun test`).
- STATE.md:51 dice "tabla fija, editable por separado, **no quemada en el código**" — está quemada en `task-config.ts:9-22`.

## 2. Stack y calidad

- Verificado: `strict: true` (`tsconfig.json:6`); sin `any`; 3 non-null `!` (`init.ts:144`, `resolve-engine.ts:32`) y un cast `engineId as EngineId` (`task-config.ts:29`). **Sin Zod ni validación en runtime**: `JSON.parse(...) as` sobre salida de Engines (`detect.ts:20`, `capabilities.ts:20`) y NDJSON de Workers (`run-batch.ts:88`). Un campo faltante pasa en silencio.
- Capas: solo `modules/` e `interfaces/`; no hay `infrastructure/`/`app/`. Los "modules" hacen I/O de procesos (`engines-client`, `workers-client`, `churn.ts:38`, `session-id.ts:20`) — no son puros como en Engram.
- Engram: SDK público `forge614-engram` ✓, pero **`"forge614-engram": "file:../forge614-engram"`** (`package.json:21`): depende de un checkout hermano, sin versión; irreproducible y el binario compilado empaqueta lo que haya ahí.
- Engines/Workers: binarios por ruta fija `~/.forge614/<x>/bin` ✓ (`binary-path.ts`), sin chequeo de `schemaVersion` de sus respuestas.
- Tests: `init.test.ts:36-40` y `run-batch.test.ts:9-12` **exigen Engines y Workers instalados y Claude Code real con suscripción** (timeouts 60 s) — son integración contra producción, no corren en CI. `run-batch.ts:71` descarta stderr de Workers (`"ignore"`): se pierde diagnóstico.

## 3. Seguridad

- Verificado: sin inyección de comandos (argv en arrays; `git -C`).
- **Prompt injection persistente**: `dispatch-modules.ts:68` guarda el stdout crudo del modelo como memoria `fact` sin validar, sanear ni acotar (solo el tope de 10 MiB de Workers). Ese texto se reinyecta en sesiones futuras de cualquier asistente. Shell sanea al leer; Engram lo recibe tal cual.
- Sin límites de tamaño/tiempo en análisis: `readFileSync` + AST síncrono por archivo, dos veces (ciclomática y fan-in); `git log` de toda la historia en memoria (`churn.ts:38`; supuesto no verificado: `maxBuffer` por defecto de `spawnSync` en repos grandes → `status≠0` → `ANALYSIS_FAILED`). `discoverModules` ignora `.gitignore` y analiza `.js` (vendor/minificados).
- `repoName: directory` (`dispatch-modules.ts:109`) → ruta absoluta de la máquina guardada en Engram.

## 4. Contratos

- `InitOutcome` (`init.ts:20-44`): `schemaVersion: 1`; estados `completed|paused|already-complete|engine-ambiguous|engine-unavailable|engine-invalid|error`. Errores como `{status:"error", error:{code,message}}` **en stdout** — diverge de la convención Engram/Engines `{code,error}` en stderr.
- Workers: envía `readableDir` (`run-batch.ts:9`, `dispatch-modules.ts:50`) — no aparece en el doc 03 de Workers (verificar en Workers). Nunca fija `timeoutMs` (10 min por módulo por defecto). `reasoningLevel` tipado `low|medium|high` (`run-batch.ts:11`) pero solo se emite `low|medium` ✓; Claude Code nunca recibe nivel (`supportsReasoningLevel`) ✓.
- **`tokensConsumed: 0` quemado** (`dispatch-modules.ts:115`) y persistido en Engram como "Tokens consumidos: 0" (`finalize-run.ts:37`): número falso en memoria durable.

## 5. Instalación/release/docs/CI

Nada implementado. Docs es/en 1:1 por nombre ✓ (10 + 9 subpáginas). `notion-map.json` cubre solo 08/09 y sus "fingerprints" son etiquetas (`plan4-dispatch-5cb2ea5`), no hashes. README con badge "License Private" y "67 tests". **El `FORGE614_ECOSYSTEM_CONTRACT.md` difiere entre repos**: sha `7cf551d` (atlas) ≠ `d206659` (engines) ≠ `735cdea` (engram) — tres versiones del "archivo idéntico".

## 6. Bugs concretos

- **Módulos saltados nunca se reintentan**: `dispatch-modules.ts:84-122` llama `finalizeRun` (cierra sesión, `finalize-run.ts:50`) aunque `skippedModuleNames` no esté vacío; el siguiente `init` cae en `SESSION_CONFLICT` → `already-complete` (`run-state.ts:21`). Contradice `docs/es/09:82` ("se reintenta en el siguiente init"). Solo `--force` (re-analiza TODO) los recupera.
- Sesión cerrada = "repo analizado para siempre": módulos nuevos jamás se contextualizan sin `--force`; `deriveForcedSessionId` usa `Date.now()` (`session-id.ts:52`), no determinista.
- `resolveModuleFiles` (`module-files.ts:4`) re-escanea el disco tras el plan: si cambió el árbol, plan y tareas divergen.
- `already-complete` se responde **antes** de validar Workers (`init.ts:158-161` vs `runDispatch:72`).
- `main.ts:29-46`: error inesperado imprime JSON en stdout con exit 1, sin `code` estable de contrato.

## 7. Divergencias

Sin CI/instalador/release/CONTRACT.md; dependencia `file:`; sin Zod; capas incompletas; forma de error distinta; contrato del ecosistema divergente; STATE.md duplica política de proceso por repo (contra la centralización decidida); Plan 5 propone **copiar** el `install.sh` de Engram y añadir su propio bloque de PATH en `.zshrc` (`installer-design §5.12`) — contra "instalador único desde plantilla" y contra "solo forge614-ai crea comando global". Atlas se autodenomina "orquestador" en README/docs 00-01/spec; con la decisión nueva es solo contextualización inicial opcional.

## 8. Top 10

- P1 Reemplazar `file:../forge614-engram` por versión publicada fijada.
- P1 Corregir cierre de sesión con módulos saltados; permitir re-análisis incremental de módulos nuevos sin `--force`.
- P1 Validar con Zod las salidas de Engines/Workers y `schemaVersion`; capturar stderr de Workers.
- P1 Sanear/acotar el reporte del modelo antes de `recordModuleReport`; nunca guardar `tokensConsumed: 0` (null/"no medido").
- P1 Unificar `FORGE614_ECOSYSTEM_CONTRACT.md` (hoy 3 versiones) vía puntero central.
- P2 Adoptar instalador/CI/release del estándar (no el Plan 5 propio) y publicar v1.0.0 solo después.
- P2 Convención de errores `{code,error}`/stderr y `--version`; agregar `CONTRACT.md`.
- P2 Mover tabla de modelos a política del Hub; separar tests de integración (binarios reales) de unitarios para CI.
- P2 Reescribir README/docs 00-01/spec para "contextualización inicial opcional", sin TUI ni concurrencia 3; fingerprints reales en notion-map.
- P3 Límites de tamaño/tiempo en scoring, respetar `.gitignore`, capas `infrastructure/app`, borrar rama huérfana.
