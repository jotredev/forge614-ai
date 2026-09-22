# Auditoría de forge614-engines

**Fecha:** 2026-09-22
**Método:** lectura estática del código vía API de GitHub (rama main), sin ejecutar tests ni binarios
**Versión auditada:** 1.11.0

> Los cinco hallazgos P1 de seguridad fueron re-verificados contra el código por el autor de la spec el 2026-09-22.
> Todo lo marcado **[V]** se verificó leyendo el código; **[S]** es supuesto o no verificado.

## 1. Estado real

**[V]** Versión 1.11.0. Comandos reales (`src/interfaces/cli/main.ts:106-183`): `detect`, `agents list`, `capabilities --agent`, `plan mcp-install|mcp-remove|memory-install|memory-remove|mcp-repair`, `apply --plan-id`, `apply mcp-repair --plan-id [--confirm]`, `verify memory-integration|mcp-repair`, `headless`, `update`, `memory-hook-run --agent`. Adapters: claude-code, codex, cursor. Funciona completo el ciclo plan→snapshot→apply con guarda TOCTOU (`apply-plan.ts:26-35`), hooks SessionStart con evidencia de runtime (`hook-evidence.ts`, expira 7 días), instrucciones con bloque administrado, self-update con checksum.

**Discrepancias [V]:** la spec (§6) promete `apply --plan-id <id> --revert`; no existe (`restoreSnapshot` en `snapshot.ts:49` nunca se expone; docs 04 lo admite). Spec §8 exige instalación "sin asumir Node/Bun"; `install.sh:52-75` necesita `node` o `python3` para leer el JSON del release. Spec §5 prometía preservar comentarios en TOML; `toml-format.ts:27-37` re-serializa todo el documento con la librería TOML (docs 07 lo reconoce): los comentarios del usuario en `~/.codex/config.toml` se pierden.

## 2. Stack y calidad

**[V]** `tsconfig.json` `strict: true`; sin `any` ni `@ts-ignore` en `src/`. Casts: `JSON.parse(...) as Plan` (`plan-store.ts:38`), `as SnapshotManifest` (`snapshot.ts:51`, `verify-mcp-repair.ts:58`), `as GithubRelease` (`self-update.ts:55`) — datos de disco/red sin validar. **Sin Zod**: validación manual y parcial (`memory-protocol/types.ts:33`, `startup-context-client.ts:28` solo mira `format/shared/project`, no la forma interna). Parseo de argv artesanal: `flag()` + `!` en `main.ts:112-113,120-121,140,171-172`; `--agent` casteado sin validar (`main.ts:111`), `--timeout-ms` `Number()` sin rechazar NaN (`main.ts:174`). Falta un flag → `INTERNAL_ERROR` genérico. Capas `modules/infrastructure/app/interfaces` respetadas con prueba AST (`tests/architecture/import-rules.ts`), pero `app/self-update.ts` hace fs/child_process/fetch directo (fuga de infraestructura que la prueba no detecta porque solo mira imports relativos). **51 archivos de test [V]**, colocados junto al código. Cobertura de casos y `cli.test.ts` **[S]**.

## 3. Seguridad

- **P1 [V] Secretos en stdout.** `printJson({ plan })` (`commands.ts:35,41,47,105,111`) imprime `writes[].afterContent` completo — el archivo de config reconstruido (`~/.claude.json`, `~/.cursor/mcp.json`, `settings.json`) con tokens de otros MCP. `redactMcpEntry` solo cubre `repair.existing`. Hoy Shell "promete no mostrarlo"; el productor sigue emitiéndolo.
- **P1 [V] Desinstalación deja hooks colgantes.** `install.sh:36-45` / `install.ps1:31-44` hacen `rm -rf` del root sin ejecutar `plan memory-remove`; los `SessionStart` en Claude/Codex quedan apuntando a un binario inexistente → error de hook en cada sesión.
- **P2 [V] `FORGE614_HOME` ignorado** en `plan-store.ts:13` y `snapshot.ts:18` (usan `~/.forge614` fijo) mientras `self-update.ts:37`, `hook-command.ts:13,55`, `constants.ts:16` lo honran. Con la variable puesta, planes y respaldos (con secretos) caen en el home real.
- **P2 [V] Retención inexistente:** planes y snapshots con contenido de config se acumulan para siempre (spec: "TBD").
- **[V]** Bien: escritura atómica con fsync y verificación (`atomic-write.ts`), 0600/0700 en planes/snapshots, prompt por stdin fuera de `ps`, saneo de marcadores de instrucción en el hook (`run-memory-hook.ts:50-55`), truncado a 16k chars, nunca `--dangerously-bypass-hook-trust`, remoción solo de entradas propias (`mcp-write-decision.ts:58`).
- **[V]** Update: checksum del mismo release, sin firma; `FORGE614_RELEASE_API_URL` redirige el origen (`self-update.ts:52`) sin exigir https (install.sh sí lo exige salvo con la variable). Extracción con `tar` externo sin sanear rutas del archivo.

## 4. Contratos

**[V]** Todo `schemaVersion: 1`; errores como `{schemaVersion, error:{code,message}}` **en stdout** con exit 1 (`main.ts:189-193`) — Engram usa `{code,error}` en **stderr**: divergencia entre nodos. `errorCodeFor` clasifica "Unknown agent" por prefijo de texto (`main.ts:84`), frágil. Mensajes incluyen rutas de archivos. `memory-hook-run` rompe el envelope a propósito (documentado). Sin deep imports: Engram se consume por subproceso a ruta canónica. No hay `CONTRACT.md`; el contrato vive repartido entre docs 05/06 y la spec.

## 5. Instalación / release / docs / CI

**[V]** `install.sh`: destino `~/.forge614/engines/<ver>/`, launcher symlink `bin/forge614-engines`, checksum SHA256, `--archive` para pruebas locales; no toca PATH; no escribe `.active-version` (el update sí, `self-update.ts:295`) mientras `install.ps1` lo exige. Release: `release-cut.mjs` (sugerencia semver por commits, validación contra tags, sync `notion-map.productVersion`, tag → CI compila 5 targets nativos y publica). El commit de release lleva un `Co-Authored-By` fijo (`release-cut.mjs:264`). CI `verify.yml` en push y PR, incluye instalación real en Windows y self-update. Docs 00–07 es/en con paridad, huellas y códigos de error verificados por `verify-documentation.mjs` (mejor pipeline documental del ecosistema; `REQUIRED_AGENTS` y `RELEASE_REPO` quedaron fijos en el script).

La spec de diseño (`docs/superpowers/specs/2026-09-19-forge614-engines-design.md`) cita un producto externo como referencia de diseño (menciones prohibidas; ver acta 0012).

## 6. Bugs concretos

1. `commands.ts:35-111` — fuga de `afterContent` (ver 3).
2. `install.sh:42` / `install.ps1:41` — uninstall sin `memory-remove`.
3. `plan-store.ts:13`, `snapshot.ts:18` — ignoran `FORGE614_HOME`.
4. `apply-plan.ts:43-47` — sin rollback: si la 2ª escritura falla, la 1ª queda aplicada y el snapshot no se restaura.
5. `main.ts:174` — `--timeout-ms abc` → `NaN` propagado.
6. `install.sh:101` no escribe `.active-version`; `install.ps1:103` depende de él.
7. `toml-format.ts:36` — destruye comentarios/orden del TOML del usuario.

## 7. Divergencias

Sin Zod; sin `CONTRACT.md`; errores en stdout vs stderr; scripts (`install.sh`, `release-cut.mjs`, `verify-documentation.mjs`) propios del repo con constantes fijas en vez de plantilla compartida; `apply --revert` prometido y ausente; instalador dependiente de node/python3; hooks al cliente sin desinstalación simétrica; spec con menciones prohibidas.

## 8. Top 10

- **P1** Redactar `writes[].afterContent` en toda salida de `plan` (emitir diff/hash; contenido solo bajo `--include-content` o en el plan-store).
- **P1** Uninstall simétrico: `install.sh --uninstall` ejecuta `plan memory-remove` + `apply` por agente antes de borrar.
- **P1** Validar argv, stdin, planes, manifests y respuestas de GitHub con Zod; eliminar `!` y casts.
- **P2** Honrar `FORGE614_HOME` en plan-store y snapshot (una sola función `enginesRoot` en `modules`).
- **P2** Implementar `apply --revert` y rollback automático en fallo parcial.
- **P2** Política de retención para `plans/` y `snapshots/`.
- **P2** Unificar formato de error del ecosistema (stderr, `{code,error}`, sin rutas crudas) al fijarlo el estándar.
- **P2** Adoptar instalador desde plantilla sin dependencia de node/python3 (parseo con bash/PowerShell puro o binario auxiliar).
- **P3** Escribir `CONTRACT.md` es/en generado o verificado contra `main.ts` (ya existe la extracción en `verify-documentation.mjs:35`).
- **P3** Mover `self-update.ts` I/O a `infrastructure/`; quitar el `Co-Authored-By` fijo del release; documentar/decidir preservación de comentarios TOML; reescribir la spec sin menciones prohibidas.
