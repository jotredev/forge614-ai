# Auditoría de forge614-shell

**Fecha:** 2026-09-22
**Método:** lectura estática del código vía API de GitHub (rama main), sin ejecutar tests ni binarios
**Versión auditada:** 1.8.0

> Los cinco hallazgos P1 de seguridad fueron re-verificados contra el código por el autor de la spec el 2026-09-22.
> Todo lo marcado **verificado** se comprobó leyendo el código; lo marcado **no verificado** es supuesto.

## 1. Estado real

**Verificado:** `package.json` v1.8.0; tags/releases 1.4.0→1.8.0 en un solo día (22-sep). CLI real (`src/cli.ts`): `update`, `uninstall`, `init --product engram`, `--help`, `--version`, y arranque interactivo (spinner → picker visual "Basic/Full(disabled)" → picker de motor → chat Claude/Codex). Flujos completos: chat Claude (SDK) y Codex (app-server JSON-RPC) con `/login /logout /model /effort /resume /new /status /stop /refresh`; `init --product engram` en una sola alt-screen (`EngramFlowScreen`) con plan→preview→apply→verify; `update` en cascada Shell→Engines→Engram.

**Restos:** Pi sigue vivo, no "legacy": `src/engines/pi/launcher.ts`, `extensions/forge614-shell.ts`, dependencias `@earendil-works/pi-coding-agent` (0.85.1, runtime completo) y `pi-tui` (toda la UI depende de ella), `tests/integration/runtime.test.ts` lanza Pi real; `package.json:5` describe "powered by Pi"; `--engine pi` en `options.ts:1`. La extensión Pi dice "Engram deferred" (`extensions/forge614-shell.ts:37`). Cero rastros de Gemini/Antigravity (bien).

**Docs↔código:** `docs/es/05` dice que Codex muestra `item.server/item.tool` ✓ (el código lo hace en `codex/session.ts:280-282`), pero `AGENTS.md:27` afirma lo contrario ("línea 239 descarta esto") — AGENTS.md está desactualizado. `notion-map.json:3` `reviewedVersion: 1.3.0` con producto en 1.8.0. `output/ui-comparison/*.png` (267 KB) versionado sin uso y con nombre que referencia un producto externo (menciones prohibidas). No hay `.github/workflows` ni `.superpowers/`: **no existe CI**.

## 2. Stack y calidad

**Verificado:** `tsconfig` strict + `noUncheckedIndexedAccess` ✓. `any` explícito: `codex/session.ts` (7: líneas 71-72, 112, 201, 212, 262, 300) y `rpc.ts` (10, toda la interfaz `RpcConnection`). Sin Zod; toda validación de entradas externas es manual con `unknown`+guards: Engines (`forge614-engines.ts:59-65, 340-457`) y Engram `startup-context` (`forge614-engram.ts:208-259`) están bien validados; **Codex JSON-RPC no se valida** (`params.item.id`, `response.data`, `thread.turns` se leen a ciegas); eventos del SDK Claude se confían por tipos del SDK; `preferences.json` se castea (`shell-preferences.ts:32`). `telemetry.ts:22` recibe `Record<string, any>`. Capas: `engines/`, `infrastructure/`, `app/`, `ui/`, `contracts/`; test de arquitectura sólo prohíbe `engines|infrastructure → ui|app` (`tests/architecture/layers.test.ts`), pero `app/startup-spinner.ts:1` importa `ui/basic/theme.ts` y `app/init-engram.ts` importa 5 módulos `ui/` — `app` depende de `ui`, no al revés (no está en el estándar `modules/infrastructure/app/interfaces`). Dependencias runtime: Claude SDK 0.3.274 + Pi 0.85.1 + pi-tui 0.85.1; **no hay `bun.lock`-frozen en instrucciones ni lockfile check**. Tests: 44 archivos; cubren sesiones con dobles, infraestructura, UI por render, instalador end-to-end con servidor local (excelente). No cubren: PTY real, cuentas reales, `claude.ts`/`native.ts` a nivel de flujo (solo helpers).

## 3. Seguridad

**Verificado bien:** bloqueo de env de API keys (`claude/auth.ts:8-14`, `process.ts:4-9`); stderr nativo descartado (`process.ts:17`); preview nunca muestra `afterContent/beforeHash` (`memory-setup.ts:101-123`); saneamiento de memoria en dos capas (`forge614-engram.ts:188-206` + `wrapStartupContext` en ambas sesiones); redacción del connection string en errores (`forge614-engram.ts:37-39, 77, 86`); checksum SHA-256 en instalador y test de checksum malo; `openLoginBrowser` con allowlist de hosts y sin shell (`browser.ts:13-19`); binarios de Engines/Engram por ruta fija bajo `FORGE614_HOME` ✓.

**Hallazgos:** (a) `native-chat.ts:21` — `codexStartupContext` inyecta `env: process.env`, pero `CodexSession.send` llama `getStartupContextFn(this.cwd, {})` (`codex/session.ts:231`); funciona sólo porque el wrapper sobreescribe con spread al final — frágil, el test `cli.test.ts` es un grep del código fuente, no una prueba de comportamiento. (b) `updater.ts:7` ejecuta `install.sh` del **bundle instalado** (no el de la release nueva): un `update` con instalador viejo puede instalar con lógica antigua. (c) `install.sh:118-136` edita `.zshrc/.bashrc` con Node inline y borra líneas legacy — escritura en dotfiles del usuario sin respaldo. (d) `install.sh:33` usa `node -e` para parsear JSON: Node es requisito duro aunque el estándar es Bun. (e) `claude/session.ts:140` permite `bypassPermissions` con `allowDangerouslySkipPermissions: true` vía Shift+Tab sin confirmación adicional. (f) `codex/session.ts:282` vuelca `item.arguments` completo al transcript (argumentos de MCP pueden contener datos sensibles; Claude sí recorta a 2000 chars, `claude.ts:278`). (g) `rpc.ts:33` no fija `jsonrpc:"2.0"` (`version=false` en `process.ts:15`) — dependiente del comportamiento de app-server.

## 4. Contratos

**Verificado:** consume Engines `detect`, `capabilities`, `plan mcp-install|mcp-remove|memory-install`, `apply`, `verify memory-integration`, `update`; Engram `init --json`, `reinforcement-enable`, `update --json`, `startup-context`. Detección estructural del campo `hook` ✓ (`forge614-engines.ts:382-384, 426-428`), nunca por versión. Allowlist `supportedShellAdapters` (`:34-37`); union types hardcodeados `AvailableEngine.id` (`contracts/available-engine.ts:3`), `parseEngine` (`options.ts:1,6`), `NativeId="codex"` (`engines/types.ts:1`), `EngineId` (`shell-preferences.ts:5`), dispatch `if/else` en `cli.ts:89-119`: **5 lugares** que tocar por agente nuevo. Engines `schemaVersion` sólo se exige en `detect` (`:62`); los demás comandos no verifican versión. No existe `CONTRACT.md`; `FORGE614_ECOSYSTEM_CONTRACT.md` tiene 9464 B vs 10327 B en Engram — **copia divergente**.

## 5. Instalación / release / docs / CI

Instalador propio de 141 líneas (`scripts/install.sh`), sin `.ps1`; release por `scripts/release-bundle.mjs` + subida **manual** (assets: tar.gz, .sha256, install.sh); sin `bun release`, sin CI, sin verificación de docs (`docs/es/08:31` lo admite). Docs 00-08 es/en con paridad de números ✓; `notion-map` desfasado (1.3.0). README dice "Node.js 22.19+" pero `engines` de `package.json` y `bin` apuntan a `dist/cli.js` con `--packages=external` (los `node_modules` viajan en el tar).

## 6. Bugs concretos

- `AGENTS.md:27` contradice `codex/session.ts:280` (ya corregido en código).
- `codex/session.ts:71` `clientInfo.version: "0.1.0"` hardcodeado vs 1.8.0.
- `codex/session.ts:231` pasa `{}` como env (solo salvado por el wrapper).
- `cli.ts:15,23` `update`/`uninstall` solo si `args.length===1`; `forge614-shell update --json` cae al picker interactivo.
- `claude.ts:409` `/resume` lista sesiones con `listSessions({dir: cwd})` y filtra `cwd` de nuevo; `claude.ts:414` reconstruye historial con `entry.type` crudo (`user:`/`assistant:` sin `chatMessage`).
- `install.sh:59,117` deduce perfil por `$SHELL` — con `fish` cae a `.profile` y `forge614-shell` no queda en PATH.
- `notion-map.json` `reviewedVersion` 1.3.0.

## 7. Divergencias vs estándar

Sin `bun release`, sin CI, sin `.ps1`, sin Zod, sin `CONTRACT.md`, contrato de ecosistema divergente, capas `app→ui`, `any` en RPC, runtime Node (no Bun) por Pi/SDK, Pi como dependencia viva de un motor "retirado", assets binarios en repo, docs sin validador, allowlists en 5 archivos.

## 8. Top 10

- **P1** Copiar `FORGE614_ECOSYSTEM_CONTRACT.md` byte-idéntico (o puntero central) y crear `CONTRACT.md`.
- **P1** Añadir CI (typecheck, test, build, paridad docs) — hoy nada corre en PR.
- **P1** Validar con Zod los payloads de Codex app-server y `preferences.json`; eliminar `any` de `rpc.ts`.
- **P1** `update` debe descargar y ejecutar el `install.sh` de la release nueva, no el instalado.
- **P2** Retirar Pi del runtime (`launcher`, `extensions/`, `runtime.test`, dependencia) o declararlo soportado; decidir si `pi-tui` es la base UI del ecosistema.
- **P2** Adoptar `bun release` compartido + `install.ps1` desde plantilla.
- **P2** Unificar el registro de motores de chat en un solo módulo data-driven (hoy 5 sitios).
- **P2** Confirmación explícita antes de `bypassPermissions`; recortar `item.arguments` de Codex.
- **P3** Corregir `AGENTS.md:27`, `clientInfo.version`, `notion-map.reviewedVersion`, borrar `output/`.
- **P3** Sustituir `node -e` en `install.sh` por lógica portable o Bun; respaldar dotfiles antes de editarlos.

**No verificado:** comportamiento real de Codex app-server sin `jsonrpc:"2.0"`; que `bun test` pase hoy (no se ejecutó la suite).
