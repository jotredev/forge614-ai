# Auditoría de forge614-workers

**Fecha:** 2026-09-22
**Método:** lectura estática del código vía API de GitHub (rama main), sin ejecutar tests ni binarios
**Versión auditada:** 0.1.0 (último commit 2026-09-22 "readableDir")

> Los cinco hallazgos P1 de seguridad fueron re-verificados contra el código por el autor de la spec el 2026-09-22.
> Todo lo marcado **verificado** se comprobó leyendo el código; lo marcado **supuesto** no se verificó.

## 1. Estado real

**Verificado en código.** Entrada (`src/types.ts:84-152`): `{enginesBin, maxOutputBytes?, tasks[{id, agentId, executable, prompt, readableDir?, model?, reasoningLevel?, timeoutMs?}]}`. Eventos (`types.ts:26-77`): `task_started{taskId,agentId,startedAt}`, `task_completed{taskId,exitCode,durationMs,stdout,stdoutBytes,stdoutTruncated,stderr,stderrBytes,stderrTruncated}`, `task_failed{+reason,exitCode|null}`, `quota_exhausted{+agentId,matchedPattern}`, `run_completed{totalTasks,completed,failed,notStarted,pausedByQuota,totalDurationMs}`, `fatal_error{reason,message}`. Exit codes 0/75/2/1 (`cli.ts:24,37,53,62`). Funciona: bucle secuencial con frontera de error por tarea (`runner.ts:50-219`), pausa por cuota solo con exit≠0 (`runner.ts:136-172`), cwd temporal + env íntegro (`process-runner.ts:57-72`), SIGTERM→SIGKILL (`:101-113`), prompt solo por stdin (`engines-client.ts:35-43`).

**Discrepancias docs↔código:** `docs/03-data-contract.md` no menciona `readableDir` (agregado en el último commit; la spec §4 sí). `docs/08` dice "README pendiente de ampliar" pero el README ya existe. **Ningún evento ni la entrada llevan `schemaVersion`** (`types.ts`), aunque la fixture de Engines sí lo usa (`test/fixtures/fake-engines-headless.js:13`).

**Supuesto:** las huellas de `notion-map.json` quedaron desactualizadas tras el commit de readableDir (no se recalcularon).

## 2. Stack y calidad

**Verificado.** TS `strict: true` (`tsconfig.json:6`); sin `any`, pero ~12 casts `as` en `types.ts:95,119,134,139,143-146` y `engines-client.ts:53,61`. **Sin Zod**: validación manual. Huecos reales: campos desconocidos se ignoran en silencio; `Number()` coacciona `"2048"` y `true`→1 ms (`types.ts:105,127`); `id` duplicados no se rechazan (Atlas correlaciona por id); `prompt` con solo espacios pasa; `readableDir` no se exige absoluto; no hay tope de tamaño de prompt. **Sin capas**: `src/` plano (no modules/infrastructure/app/interfaces), sin prueba de arquitectura. Tests: **57** (adapters 8, registry 5, cli 4, engines-client 7, process-runner 8, runner 12, types 8, version 1, e2e 4). Sí existe test de completitud contra el binario real de Engines (`src/adapters/registry.completeness.test.ts`); 8 tests dependen de tener `forge614-engines` instalado. No cubren: cuelgue de Engines sin timeout, truncamiento de stderr, `--version/--help`, esquema de eventos, `version.test.ts` compara contra un literal duplicado (`"0.1.0"`), no contra `package.json`.

## 3. Seguridad

**Verificado.** Prompt jamás en argv: correcto en ambos saltos (`engines-client.ts:35-43`, `process-runner.ts:88-93`), con test de 1.1 MB. Cwd: `mkdtemp` + `rm -rf` en `finally` (`process-runner.ts:57,125`), correcto. Captura acotada por stream; cuota sobre stderr completo + 4096 bytes reales de stdout (`runner.ts:151-155`).

Hallazgos:
- **Entorno heredado sin filtro** (`process-runner.ts:68`): `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_BASE_URL`, `OPENAI_BASE_URL` pasan tal cual. Shell sí las bloquea (regex en `claudeEnvironment()`). Una tarea podría facturar por API o hablar con un endpoint ajeno. Es decisión de diseño de la spec §5, pero diverge de Shell.
- **Solo se mata el hijo directo** (`:103,108`): sin `detached`/grupo de procesos; subshells o hijos del CLI quedan huérfanos tras SIGKILL (riesgo que el propio checklist maestro anticipa).
- **`engines-client.ts:47` no tiene timeout** y descarta stderr: un Engines colgado bloquea el lote entero sin evento.
- `executable`/`agentId` vienen del JSON y se ejecutan sin validar (Engines los recibe por flags; inyección de shell no aplica porque no hay shell, pero un `executable` relativo se resuelve contra el cwd temporal vacío → `spawn_error`, no un fallo claro).
- **Patrón Codex `"rate limit"` en minúsculas sobre todo stderr** (`codex.ts:7,12`): cualquier stderr que mencione rate limit con exit≠0 pausa el lote (falso positivo). Ambos patrones siguen sin confirmar contra CLIs reales (comentarios en `claude-code.ts:3-6`, `codex.ts:3-6`).

## 4. Contratos

**Verificado.** Sin `schemaVersion`. `run_completed` garantizado en todo camino no fatal (`runner.ts:222-230`, frontera por tarea + test). `fatal_error` tiene forma distinta al estándar `{code,error}` por stderr: aquí va por stdout como evento y con exit 2 (Engram usa 1). **`main.ts` no acepta argumentos**: `forge614-workers --version` o `--help` se queda esperando stdin para siempre (`main.ts:7`).

**Captura de usage:** Engines hoy resuelve `claude -p` y `codex exec` **sin** `--output-format json` / `--json` (`engines/.../claude-code.ts:60`, `codex.ts:57-67`), así que stdout es texto plano y Workers no parsea nada. **Supuesto (no verificado aquí):** Claude `--output-format json` devuelve un objeto con `usage`, `total_cost_usd`, `duration_ms`, `session_id`; Codex `exec --json` emite JSONL con uso de tokens. Riesgo derivado: en modo JSON los errores de cuota cambian de forma (Claude los devuelve como JSON con `is_error`), por lo que los patrones de cuota deben reconfirmarse en ese modo.

## 5. Instalación/release/docs/CI

**Verificado.** No hay `.github/` (404), **cero releases y cero tags**, sin `install.sh/.ps1`, sin script de release, `"private": true`; solo `bun build --compile`. Docs 00–08 en pares es/en completos + notion-map (18 entradas); `docs/adding-a-new-engine-adapter.md` solo en inglés; README solo en español. **`FORGE614_ECOSYSTEM_CONTRACT.md` pesa 9 825 bytes aquí, 10 158 en Engines y 10 327 en Engram: tres versiones distintas del contrato "idéntico".**

## 6. Bugs concretos

1. `main.ts:7` — sin manejo de argv: cualquier invocación sin stdin cuelga.
2. `engines-client.ts:47-49` — sin timeout ni captura de stderr al invocar Engines.
3. `process-runner.ts:103,108` — kill sin grupo de procesos → huérfanos.
4. `types.ts:105,127` — coerción `Number()` acepta booleanos/strings; `true` → 1 ms.
5. `types.ts:110` — ids duplicados aceptados.
6. `codex.ts:7` — patrón "rate limit" demasiado amplio; ambos patrones sin confirmar.
7. `version.ts` + `version.test.ts:6` — versión duplicada a mano.
8. `docs/03-data-contract.md` — sin `readableDir`.
9. Contrato del ecosistema divergente entre repos.
10. `main.ts:9` — `process.exit` inmediato tras `console.log`; **supuesto** riesgo de última línea truncada en pipes.

## 7. Divergencias respecto al estándar y otros nodos

Sin capas ni test de arquitectura (Engram/Engines sí); sin CI, releases, instalador ni `bun release` (Engines sí); sin `schemaVersion`; errores fatales por stdout/exit 2 vs `{code,error}`/exit 1; sin Zod; sin `CONTRACT.md`; sin `--version/--help`; runbook solo en inglés; contrato del ecosistema desincronizado.

## 8. Top 10 acciones

- **P1** Agregar `schemaVersion: 2` a entrada y eventos; `--version`/`--help` en `main.ts`; error `{code,error}` coherente con el estándar.
- **P1** Capturar usage con el mínimo cambio: Engines `headless --structured-output` (adapter decide `--output-format json` / `--json` y devuelve `outputFormat`); Workers agrega `usage: {...}|null` y `outputFormat` a `task_completed`, extraído por una función pura por adapter (`extractUsage(stdout)`) con fixtures; stdout crudo se conserva intacto.
- **P1** Reconfirmar patrones de cuota con CLIs reales en modo JSON y acotar el de Codex (frase exacta, no substring genérico).
- **P1** Timeout + captura de stderr al invocar Engines (`engines-client.ts`).
- **P1** Spawn en grupo de procesos (`detached`) y kill al grupo; test con fixture que crea un hijo.
- **P2** Validar entrada con Zod (`strict()`, ids únicos, enteros positivos, rutas absolutas, tope de prompt).
- **P2** Filtrar variables de API key/base URL igual que Shell, o documentar explícitamente por qué no.
- **P2** Reestructurar en capas + test de import-rules; `CONTRACT.md` es/en; runbook en español; docs/03 con readableDir.
- **P2** CI (test/typecheck/build por plataforma), instalador desde plantilla y release compartido; primer tag `v0.1.0`; leer versión de `package.json`.
- **P3** Sincronizar `FORGE614_ECOSYSTEM_CONTRACT.md` (puntero/verificación byte-idéntica) y limpieza opcional de sesiones acumuladas en `~/.claude/projects` y `~/.codex/sessions`.
