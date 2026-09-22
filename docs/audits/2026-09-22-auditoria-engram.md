# Auditoría de forge614-engram

**Fecha:** 2026-09-22
**Método:** lectura estática del código vía API de GitHub (rama main), sin ejecutar tests ni binarios
**Versión auditada:** 1.5.0

> Los cinco hallazgos P1 de seguridad fueron re-verificados contra el código por el autor de la spec el 2026-09-22.
> Todo lo marcado **[V]** se verificó leyendo el código; **[S]** es supuesto o no verificado.

## 1. Estado real

**[V]** `package.json` v1.5.0; tags v1.2.0…v1.5.0; release v1.5.0 publica 4 binarios (darwin/linux × arm64/x64), `SHA256SUMS` e `install.sh`. Dependencias runtime: `@modelcontextprotocol/sdk`, `zod` 4.6.5, `jsonc-parser`, `smol-toml` (las dos últimas **no se importan en ningún `src/`**: dependencias huérfanas, resto de la época en que Engram escribía configs de asistentes).

**Comandos CLI reales [V]** (`src/interfaces/cli/arguments.ts:4-16`, `main.ts`): `init [--json] [--postgres-url]`, `update [--json]`, `uninstall --confirm`, `sync [--upgrade-format]`, `sync-watch [--interval]`, `sessions-enable`, `reinforcement-enable`, `memory-protocol --json [--protocol-version 1|2]`, `mcp`, `project-create/list/rename/bind`, `save/search/get/history/archive/restore`, `session-start/end/summary`, `timeline`, `context`, `startup-context --directory --json`, `help`, `--version`. `setup` → `COMMAND_RETIRED` (`main.ts:11`).

**MCP real [V]** (`memory-tools.ts`, `sessions-tools.ts`): `memory_current_project, memory_search, memory_get, memory_save, memory_history, memory_session_start, memory_session_end, memory_session_summary, memory_timeline, memory_context` (10 tools). Instrucciones del protocolo v1 inyectadas como `instructions` del servidor (`server.ts:18`).

**SDK público [V]** (`src/index.ts`, fijado por `src/index.test.ts:8-23`): `MemoryStore` (35 métodos), `MemoryWorkspace`, `WorkspaceConfig`, `memoryProtocol`, `inspect/preview/applyMemoryInitialization`, `saveProjectMemoryWithSession`, `startProjectSession`, `MemoryError`, `memoryTypes`, `defaultDatabasePath`.

**Discrepancias docs↔código [V]:**
- No hay `README.md` en la raíz (solo `docs/README.md`).
- `FORGE614_ECOSYSTEM_CONTRACT.md` "debe copiarse sin cambios" y **ya divergió**: engram (10327 B) ≠ engines (10158) ≠ atlas (10136) ≠ workers (9825) ≠ shell (9464). Engram tiene párrafos propios (roles de los dos `init`, Shell opcional) que engines no tiene y viceversa.
- `init` sin `--json` sigue siendo un asistente interactivo de terminal (`interfaces/terminal/setup.ts`, `app/setup.ts` ~110 líneas de preguntas). El contrato §6 dice que Engram "must not own a TUI"; es texto plano, no TUI, pero es una interfaz humana propia que la Sección 11.4 pide retirar.
- `docs/es/08` dice "Capacidades disponibles en v1.2.1" en un repo v1.5.0.
- `native/windows-reparse-guard/build/Release/windows_reparse_guard.node` es un archivo de **0 bytes** versionado, sin fuente ni uso; residuo.
- 54 archivos históricos en `docs/superpowers` + `docs/handoffs` versionados como "registros".

## 2. Stack y calidad

**[V]** TS strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` (`tsconfig.json`). Sin `@ts-ignore`. `any` explícito en 4 sitios: `postgres/replica.ts:45,53,55` (`(r:any)`) y `cli/commands.ts:93` (`summary as any` tras validación manual). ~108 casts `as` en `src/` (la mayoría sobre filas SQLite: patrón aceptado, sin validación de forma).

**Validación de entradas [V]:** Zod **solo en MCP** (`interfaces/mcp/schemas.ts`, `.strict()` en todo). CLI valida a mano (`arguments.ts`, `commands.ts:89-91` para `summary-json`), `.env` a mano con regex (`workspace-config.ts:77-86`), URL Postgres a mano (`replica.ts:5-23`, bien hecha: solo `sslmode`, TLS obligatorio salvo loopback). Divergencia con el estándar "Zod para entradas externas".

**Capas [V]:** `tests/architecture/import-rules.ts` es una prueba AST real: grafo de módulos permitido (`MODULE_EDGES`), módulos sin imports externos salvo `node:crypto/util`, app/interface sin `bun:sqlite`, interfaces solo vía `src/app/index.ts`, detección de ciclos, prohíbe importar el SDK desde dentro. `final-tree.test.ts` lo corre contra el árbol real. **Sí es referencia válida de capas.** Excepción: `interfaces/mcp/project-directory.ts` importa `assertGitProjectDirectory` desde `app` (re-export de infraestructura) — legal por la regla, pero es infraestructura filtrada por `app`.

**Tests [V]:** 73 archivos `*.test.ts` (unitarios junto al código, integración en `__tests__/`, e2e CLI/MCP/instalador, Postgres real con fixture desechable en CI). Cubren: sync Postgres, esquemas 3→7, sesiones, confirmaciones, instalador bash. **No cubren [V]:** concurrencia real SQLite entre procesos (solo `busy_timeout=5000`, `schema.ts:227`), migración 1/2→3 (explícitamente "aún no disponible", `schema.ts:233`), Windows (no hay target).

## 3. Seguridad

- **Secretos [V]:** `MemoryError` redacta `postgres://` en mensajes (`shared/errors.ts`); errores no-MemoryError → mensaje genérico (`main.ts:22`). `.env` 0600, dir 0700, `O_NOFOLLOW`, límite 16 KiB, dueño verificado (`workspace-config.ts:71-73`). Bien. **Hueco [V]:** `init --json --postgres-url <URL>` deja la URL en `argv` → visible en `ps` y en historial de shell. No hay opción de leerla por stdin/env.
- **SQL injection [V]:** todo parametrizado. FTS5: cada término se envuelve en comillas con `""` escapado (`modules/search/rules.ts:3`) → sin operadores inyectables. Dinámico solo en fragmentos generados internamente (`excludeKeys`).
- **Prompt injection [V]:** `startup-context`/`context` devuelven `title`/`preview` **sin sanear**; Engram lo deja al host (Shell v1.8 sanea por su lado según el checklist). Aceptable como contrato "esto es dato", pero no está documentado en `docs/es/10`.
- **MCP stdio sin auth [V]:** local, `maxBufferSize 256 KiB`, cierre limpio en SIGINT/SIGTERM/stdin end. OK para stdio.
- **Directorio implícito [V]:** `project-directory.ts:29` rechaza usar la carpeta del ejecutable como proyecto; exige Git si no hay `directory` explícito; `realpath`, rechaza `/` y `$HOME`.
- **update [V]:** `updater.ts:25` descarga `install.sh` con `fetch` **sin verificar hash del script**, lo escribe en tmp y lo ejecuta con `bash --force`. La confianza recae en TLS + que el instalador verifique el binario (sí lo hace: `install.sh:259-268`). El script en sí no está firmado ni fijado. Además `update` **fija la URL a `releases/latest`** (`updater.ts:6`): no permite versión, ni canal, ni rollback.
- **uninstall [V]:** frase exacta, `lstat` sin symlink, `assertSafePath`, ejecuta `forge614-atlas uninstall --from forge614-engram --confirmed` antes (`uninstall.ts:38`) — **acoplamiento a un contrato de Atlas que no existe** (Atlas hoy solo tiene `init`).
- **install.sh [V]:** HTTPS forzado, TLS 1.2, SHA-256 obligatorio, `mktemp`, `ln` para evitar carrera, PATH con bloque marcado y sin symlinks. Sólido. Instala Engines por debajo (`install.sh:125-145`) coherente con el modelo Lego.

## 4. Contratos

**[V]** `startup-context` → `format: 1`; `context` → `format: 1`; `memory_search` → `format: 2`; `memoryProtocol` → `version 1|2` congelado con `Object.freeze`. **Pero** `init --json`, `update --json`, `project-*`, `save`, `search`, `sync` **no llevan `schemaVersion`/`format`** (`commands.ts`). Errores sí uniformes `{code,error}` en CLI y MCP (`context.ts:9-14`). SDK no expone SQLite crudo (`memory-store.ts` es fachada; `sqlite-facade.test.ts` lo vigila). Compatibilidad Atlas: `getByTopic` existe (`memory.ts:31`).

## 5. Instalación / release / docs / CI

**[V]** `install.sh` propio (11.6 KB, escrito a mano), sin `install.ps1`; release por tag `v*` con matriz de 4 runners nativos, SHA256SUMS verificado y `gh release create` (`release.yml`); **no hay script `bun release`** local (el de Engines no se comparte). CI `verify.yml` corre en push y PR (ubuntu+macos, Postgres real). Docs 10+10 es/en con paridad de nombres; `notion-map.json` cubre 7 de 10 pares (faltan 02, 04, 05) y mezcla `reviewedProductVersion` 1.4.0/1.5.0.

## 6. Bugs y fallas concretas

1. `updater.ts:6,25-31` — script remoto no fijado ni verificado; sin versión/rollback.
2. `uninstall.ts:35-39` — depende de `forge614-atlas uninstall --from … --confirmed`, inexistente en Atlas; con Atlas instalado, `uninstall` **siempre fallará** con `ATLAS_UNINSTALL_FAILED`.
3. `commands.ts:64-67` — `init --json --postgres-url` fuerza `enableReinforcement:false` y **no permite habilitar refuerzo** por JSON (solo en el modo interactivo); asimetría del contrato.
4. `commands.ts:69-72` — `init --json` sin URL **no revalida Postgres existente** ni reporta `expectedRevision`; devuelve `inspect` mientras el interactivo devuelve texto. Salidas distintas para el mismo comando.
5. `package.json` — `jsonc-parser` y `smol-toml` sin uso (peso e inventario falso).
6. `native/…/windows_reparse_guard.node` de 0 bytes versionado.
7. `schema.ts:145-158` — `validate()` compara `sqlite_master` byte a byte contra un esquema de referencia: cualquier cambio de formato de SQLite/Bun en el `sql` almacenado rompería la apertura con `DATABASE_SCHEMA` (frágil, no probado entre versiones de Bun) **[S]**.
8. `search.ts:35-37` y `contextSelection` — la regla "tema de proyecto tapa al shared" **no aplica** si `topic_key` es NULL (comparación NULL=NULL falsa): recuerdos sin tema nunca se sombrean. Es comportamiento, no está documentado **[V]**.
9. Contrato del ecosistema divergente entre los 5 repos.

## 7. Divergencias respecto al estándar

Sin `README.md` raíz; sin `CONTRACT.md` por nodo; sin `install.ps1` ni Windows; instalador y release a medida; sin `bun release`; Zod solo en MCP; `schemaVersion` ausente en la mayoría de salidas; interfaz humana propia (`init` interactivo); contrato copiado y ya divergente; dependencias huérfanas; docs con versión desfasada y notion-map incompleto. Respecto a los otros nodos: Engram es el único con Postgres real en CI y prueba de arquitectura AST; Engines tiene `bun release` y Windows; Engram no.

## 8. Top 10 acciones

1. **P1** Arreglar `uninstall` acoplado a un comando de Atlas inexistente (o mover la coordinación a forge614-ai).
2. **P1** `update`: fijar versión, verificar hash del instalador o descargar binario+SHA256SUMS directo; permitir `--version`.
3. **P1** Unificar el contrato del ecosistema en una sola fuente (puntero + verificación), no copias.
4. **P1** `--postgres-url` por stdin/variable, nunca `argv`.
5. **P2** `schemaVersion` en todas las salidas JSON (init, update, project-*, save, search, sync).
6. **P2** Retirar `init` interactivo o delegarlo a Shell (contrato §11.4); `init --json` con refuerzo y revisión.
7. **P2** Zod en CLI y `.env`/summary-json (hoy manual) para cumplir el estándar.
8. **P2** Instalador y release desde plantilla común (adoptar `bun release` de Engines; añadir `install.ps1`/Windows o declarar explícitamente fuera de alcance).
9. **P3** Quitar `jsonc-parser`, `smol-toml` y el `.node` vacío; añadir `README.md` raíz y `CONTRACT.md`.
10. **P3** notion-map completo (02, 04, 05), docs/es/08 con versión actual, documentar que `startup-context` devuelve datos sin sanear y la regla de sombreado por `topic_key`.
