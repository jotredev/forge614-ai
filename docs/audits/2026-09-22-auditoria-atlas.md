# Auditoría de forge614-atlas

**Fecha:** 2026-09-22
**Método:** lectura estática del código vía API de GitHub (rama main), sin ejecutar tests ni binarios
**Versión auditada:** 0.1.0 (main `2c39e0b`, `private: true`, sin tags ni releases); **v1.0.0 publicada el mismo día** — ver la adenda al final

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

En `2c39e0b`, nada implementado. **Estado tras v1.0.0 (ver adenda):** instalador propio de 303 líneas (`scripts/install.sh`) que edita perfiles de shell y no soporta Windows; `release.yml` de 4 objetivos (sin Windows) con lógica inline y acciones por tag; **sin CI de PR** (`verify.yml` no existe); release `v1.0.0` publicada. Docs es/en 1:1 por nombre ✓ (10 + 9 subpáginas). `notion-map.json` cubre solo 08/09 y sus "fingerprints" son etiquetas (`plan4-dispatch-5cb2ea5`), no hashes. README con badge "License Private" y "67 tests". **El `FORGE614_ECOSYSTEM_CONTRACT.md` difiere entre repos**: sha `7cf551d` (atlas) ≠ `d206659` (engines) ≠ `735cdea` (engram) — tres versiones del "archivo idéntico".

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
- P2 Adoptar instalador/CI/release del estándar (no el Plan 5 propio) y publicar v1.0.0 solo después. **Incumplida:** v1.0.0 ya se publicó con instalador propio; la alineación migrará `~/.forge614/atlas/bin` al prefijo versionado y limpiará el bloque PATH marcado (ver adenda).
- P2 Convención de errores `{code,error}`/stderr y `--version`; agregar `CONTRACT.md`.
- P2 Mover tabla de modelos a política del Hub; separar tests de integración (binarios reales) de unitarios para CI.
- P2 Reescribir README/docs 00-01/spec para "contextualización inicial opcional", sin TUI ni concurrencia 3; fingerprints reales en notion-map.
- P3 Límites de tamaño/tiempo en scoring, respetar `.gitignore`, capas `infrastructure/app`, borrar rama huérfana.

## Adenda 2026-09-22 — v1.0.0 (delta `2c39e0b`…`06d5fcd`)

Revisión del delta publicado el mismo día de la auditoría (15 archivos; release `v1.0.0` a las 19:43Z con 4 binarios darwin/linux × arm64/x64, `install.sh` y `SHA256SUMS`). Todo lo siguiente es **verificado** en código salvo indicación contraria.

### Qué cambió

- **Instalador `scripts/install.sh` (+303 líneas):** destino `$HOME/.forge614/atlas/bin/forge614-atlas` (`:160`) sin carpeta por versión ni `.active-version`; opciones `--version TAG`, `--bin-dir`, `--force`; HTTPS + TLS 1.2 (`:240`); SHA-256 obligatorio contra `SHA256SUMS` antes de instalar (`:271-280`); publicación atómica con `mktemp` + `ln`/`mv` (`:288-296`); parseo del release con `tr`/`sed`/`awk`, sin Node ni Python (`:243-257`). **Edita perfiles de shell** (`.zshrc`, `.bash_profile`/`.bashrc`, `conf.d/forge614-atlas.fish`) con un bloque marcado `# >>> forge614-atlas PATH >>>` y **sin respaldo** del archivo (`:14-15,93-125`, reescritura vía `awk` + `mv` en `:58-90`). Encadena Engram descargando y ejecutando `releases/latest/download/install.sh` **sin verificar huella** (`:143-155`; riesgo aceptado por escrito en `docs/es/10:62-64` y STATE.md). **No hay `--uninstall`.** Solo macOS/Linux (`:197-203`); Windows declarado fuera de alcance (`docs/es/10:15`). **Ignora `FORGE614_HOME`** (`$HOME` fijo, `:160`).
- **`.github/workflows/release.yml` (+211 líneas):** matriz de 4 runners (`:79-94`), **sin Windows**; acciones fijadas por tag mayor (`actions/checkout@v4`, `oven-sh/setup-bun@v2`, `:20,28`), **no por SHA**; lógica inline extensa (`:36-56,62-67,135-167,197-211`); hace checkout de `forge614-engram@v1.5.0` como repositorio hermano (`:23-27,99-103`) porque persiste `file:../forge614-engram`; instala Engines real con `curl | bash` (`:33`); comprueba que el tag coincide con `package.json` (`:60-67`). Se dispara solo por tag o `workflow_dispatch`: **no existe `verify.yml` en push/PR** (es el único workflow).
- **CI "subconjunto hermético":** excluye `init.test.ts`, `dispatch-modules.test.ts` y `run-batch.test.ts` (`:43-47`) porque exigen Workers (sin release) y Claude Code autenticado; el resto corre contra Engram y Engines reales.
- **`--version`** (`src/interfaces/cli/main.ts:13-16`): imprime la versión de `package.json` con exit 0, con test (`main.test.ts:7-12`).
- Además: `package.json` 0.1.0 → 1.0.0; `tsconfig.json` gana `resolveJsonModule`; docs `10-*` es/en, README y STATE.md actualizados; `notion-map.json` con etiquetas nuevas.

### Estado de los hallazgos de esta auditoría

| Hallazgo | Estado |
|---|---|
| Sin instalador / release / CI | **Parcialmente resuelto:** instalador y release existen; **CI de PR sigue sin existir** (solo `release.yml`) |
| Sin `--version`/`--help` | `--version` **resuelto**; `--help` **sin cambio** (sigue devolviendo `UNKNOWN_COMMAND`) |
| `file:../forge614-engram` | **Sin cambio**, ahora cimentado en CI con el checkout hermano |
| `tokensConsumed: 0`, stdout crudo a Engram, cierre con módulos saltados, `already-complete` antes de validar Workers, `resolveModuleFiles` re-escanea | **Sin cambio** |
| Sin Zod / `JSON.parse as`, capas incompletas, errores `{status:"error"}` por stdout | **Sin cambio** |
| README "Planes 1–3" desactualizado | **Resuelto** (ahora "Planes 1–5", 105 tests) |
| Rama huérfana `atlas/plan4-subagent-dispatch` | **Sin cambio** |
| `notion-map` con fingerprints etiqueta | **Sin cambio** (`plan5-installer-6952559`) |
| Contrato del ecosistema divergente | **Sin cambio** |
| Sin `CONTRACT.md` | **Sin cambio** |
| Se autodenomina "orquestador" | **Sin cambio** |
| **Nuevo:** v1.0.0 publicada antes de la alineación al estándar | Hallazgo nuevo |

### Conflictos con el Estándar de Nodo aprobado

- **Spec §4.6 / acta 0001:** instalador escrito a mano en vez de la plantilla única; sin prefijo versionado ni `.active-version`; ignora `FORGE614_HOME`; sin `--uninstall` simétrico; **edita PATH y archivos de perfil** cuando solo `forge614-ai` puede crear un comando global.
- **Acta 0018:** sin Windows, y declarado fuera de alcance por escrito.
- **Spec §4.7 / acta 0019:** workflow con lógica inline, acciones no fijadas por SHA, sin `verify.yml` en PR, sin `docs/*/NN-workflows.md` (el doc 10 describe los jobs, pero no en el formato exigido).
- **Spec §4.11:** ejecuta un instalador remoto (Engram) sin verificar su huella.
- **Spec §4.2:** la dependencia `file:../` a un nodo hermano persiste.
- Menciones a productos externos: ninguna nueva en los 15 archivos del delta.
- *Supuesto:* los documentos de spec y plan del instalador (`2026-09-22-atlas-installer-*.md`) existían antes de `2c39e0b`; no se releyeron.

### Consecuencia para la alineación

La alineación de Atlas no parte de cero sino de una instalación plana ya distribuida: la release alineada debe **migrar** `~/.forge614/atlas/bin/forge614-atlas` al prefijo versionado con lanzador estable y **limpiar** el bloque PATH marcado de los perfiles de shell, además de eliminar `file:../` y el checkout hermano en CI. La plantilla de instalador del estándar contempla esa migración (plan de la fase 0.1, Task 6).
