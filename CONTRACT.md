# Contrato de Forge614 AI (`forge614-ai`)

> Analogía en una frase: como la oficina de pesas y medidas: no fabrica nada, guarda el patrón contra el que todos los demás nodos se calibran.

## Propósito
Publicar el Estándar de Nodo y los contratos del ecosistema Forge614, y verificar que este mismo repositorio los cumple.

## Qué hace
- Publica el Estándar de Nodo (`standard/STANDARD.md`, reglas, packs, plantillas y procedimientos) como un paquete reproducible `standard-<VERSION>.tar.gz` cuya huella sha256 vive en `forge614.node.json`.
- Publica el contrato del ecosistema (`standard/FORGE614_ECOSYSTEM_CONTRACT.md`) y los esquemas JSON de `standard/schemas/`, generados desde los esquemas Zod de `src/modules/standard/schemas/`.
- Renderiza las plantillas de repositorio (workflows, gancho `pre-push`, `CONTRACT.md`, `BRANCH_PROTECTION.md`, instaladores, plan) para cualquier nodo con `standard:render`.
- Verifica este repositorio con `verify`: typecheck, tests, índice de actas, workflows delgados, esquemas y los validadores del estándar (documento 04).
- Mantiene los índices derivados: `docs/decisions/INDEX.json` y `docs/notion-map.json`.

## Qué no hace
- No instala nodos ni distribuye binarios: no publica `install.sh` ni `install.ps1` propios (los instaladores de plantilla son para nodos que sí publican binarios).
- No orquesta ni ejecuta trabajo de otros nodos: esa capacidad llega con las Entregas 1 y 2.
- No verifica repositorios ajenos: `forge614-sentinel check` (fase 0.2) correrá estos validadores sobre cualquier nodo; hoy solo corren aquí.
- No publica releases todavía: `build:target`, `smoke:target` y `release:publish` fallan a propósito con `NOT_IMPLEMENTED` hasta que el `bun release` compartido llegue en la fase 0.4.

## Dependencias
| Nodo o binario | Cómo se consume | Versión mínima |
| --- | --- | --- |
| Bun | Runtime y ejecutor de scripts (`bun run`, `bun test`); fijado en `.github/workflows/*.yml` (acta 0026) | 1.4.2 |
| TypeScript | `devDependency`; `bun run typecheck` (`tsc --noEmit`) en modo estricto | 5.9.3 |
| zod | Dependencia; esquemas de argumentos, contratos y archivos de datos | 4.6.5 |
| yaml | Dependencia; lectura de `.github/workflows/*.yml` | 2.8.1 |
| fflate | Dependencia; DEFLATE en JavaScript puro para el paquete del estándar | 0.8.3 |
| Otros nodos Forge614 | Ninguno: `forge614-ai` es la raíz del ecosistema y no depende de otro nodo | — |

## Comandos públicos
| Comando | Entrada (esquema) | Salida (esquema) | `schemaVersion` | Códigos de salida |
| --- | --- | --- | --- | --- |
| `bun run verify` | `[--locale es\|en] [--today YYYY-MM-DD]` | `VerifyReport`: `{ standard, verdict, checks: [{ ruleId, verdict, evidence, messageKey, params, message: { es, en } }] }` | `1` | `0` todo en `pass`; `1` paso fallido (`VERIFY_STEP_FAILED`), veredicto distinto de `pass` o `VERIFY_FAILED`; `2` `INVALID_ARGUMENTS` |
| `bun run standard:render` | `--node <[a-z0-9-]+> --out <dir> [--repo owner/repo] [--title Título]` | `{ node, out, written: string[] }`; escribe los quince archivos de `DESTINATIONS` en `<dir>` | `1` | `0` escrito; `1` `STANDARD_RENDER_FAILED`; `2` `INVALID_ARGUMENTS` |
| `bun run standard:pack` | `[--update-pointer] [--check]` | `{ version, archive, sha256, tarSha256, entries }`; con `--check`: `{ ok: true, sha256, tarSha256, pointerChecked: true, sumsChecked }`; escribe `dist/` y, con `--update-pointer`, `forge614.node.json` | `1` | `0`; `1` `STANDARD_INVALID`, `STANDARD_PACK_DRIFT` o `STANDARD_PACK_FAILED`; `2` `INVALID_ARGUMENTS` |
| `bun run standard:check` | Sin argumentos (alias de `standard:pack --check`; es el paso del job `parity`) | Igual que `standard:pack --check` | `1` | Igual que `standard:pack --check` |
| `bun run standard:release` | `[--tag standard-vX.Y.Z] [--dry-run]` (sin `--tag` usa `GITHUB_REF_NAME`) | `{ ok: true, version, sha256, tarSha256, assets, command, published }`; publica la release de GitHub del estándar; con `--dry-run` igual construye `dist/` (ignorado por Git) pero no publica nada | `1` | `0`; `1` `STANDARD_RELEASE_TAG_MISMATCH`, `STANDARD_PACK_DRIFT` o `STANDARD_RELEASE_FAILED`; `2` `INVALID_ARGUMENTS` |
| `bun run workflows:check` | Sin argumentos | `{ verdict, findings: Finding[] }` | `1` | `0` veredicto `pass`; `1` en otro caso o `WORKFLOWS_CHECK_FAILED`; `2` `INVALID_ARGUMENTS` |
| `bun run workflows:run` | `[--workflow <nombre>]` (por defecto `verify`) | `{ workflow, jobs: [{ job, steps: [{ run, exitCode }] }], ok }` | `1` | `0` todo en `0`; `1` paso fallido, `WORKFLOW_NOT_FOUND` o `WORKFLOWS_RUN_FAILED`; `2` `INVALID_ARGUMENTS` |
| `bun run decisions:index` | `[--check]` | `{ ok: true, records }`; sin `--check` escribe `docs/decisions/INDEX.json` (`decisions-index.schema.json`) | `1` | `0`; `1` `DECISIONS_INDEX_INVALID`, `DECISIONS_INDEX_FAILED` o, con `--check`, `DECISIONS_INDEX_DRIFT`; `2` `INVALID_ARGUMENTS` |
| `bun run notion-map:build` | `[--check]` | `{ path, pages }`; escribe `docs/notion-map.json`; con `--check`: `{ ok: true, path }` sin escribir nada (es el paso 6 de `verify`) | `1` | `0`; `1` `NOTION_MAP_FAILED` o, con `--check`, `NOTION_MAP_DRIFT`; `2` `INVALID_ARGUMENTS` |
| `bun run schemas:generate` | `[--check]` | `{ written: string[] }`; con `--check`: `{ ok: true }`; sin `--check` escribe `standard/schemas/*.schema.json` | `1` | `0`; `1` `SCHEMAS_DRIFT` (solo con `--check`) o `SCHEMAS_GENERATE_FAILED`; `2` `INVALID_ARGUMENTS` |
| `bun run build:target`, `bun run smoke:target`, `bun run release:publish` | Sin argumentos (`release.yml` pasa `FORGE614_TARGET`, hoy ignorada) | Ninguna: stubs de `src/interfaces/cli/not-implemented.ts` hasta la fase 0.4 | `1` (solo el sobre de error) | `1` `NOT_IMPLEMENTED`; `2` `INVALID_ARGUMENTS` |

Toda salida de datos es un solo objeto JSON en stdout con `schemaVersion: 1`; todo error es un sobre `{ schemaVersion: 1, code, error }` en stderr (`error-envelope.schema.json`); ningún comando imprime un stack trace: un fallo inesperado sale por el sobre con el código `*_FAILED` del comando y salida `1`. Todos los comandos aceptan `--help`, que imprime `{ schemaVersion: 1, usage }` y sale con `0`, y `--version`, que imprime `{ schemaVersion: 1, name: "forge614-ai", version }` (la versión de `package.json`) y sale con `0` antes de analizar cualquier otro argumento.

## Códigos de error
| Código | Significado |
| --- | --- |
| `INVALID_ARGUMENTS` | Argumento, flag o valor no admitido por el comando; salida `2`. Los tres comandos con analizador de pares `--clave valor` (`verify`, `standard:render`, `workflows:run`) rechazan un flag desconocido solo cuando lleva valor e ignoran argumentos posicionales sueltos; todos los demás (`standard:pack`, `standard:check`, `standard:release`, `decisions:index`, `schemas:generate`, `workflows:check`, `notion-map:build`, `not-implemented`) tienen conjunto estricto de flags y rechazan cualquier flag desconocido o argumento posicional |
| `VERIFY_STEP_FAILED` | Un paso de `verify` (typecheck, test, índice de actas, workflows, esquemas, mapa de Notion) terminó con salida distinta de `0` |
| `VERIFY_FAILED` | `verify`: error inesperado (lectura del árbol o de `standard/VERSION`) fuera de los pasos y validadores |
| `DECISIONS_INDEX_FAILED` | `decisions:index`: error inesperado de lectura o escritura |
| `SCHEMAS_GENERATE_FAILED` | `schemas:generate`: error inesperado de lectura o escritura |
| `WORKFLOWS_CHECK_FAILED` | `workflows:check`: error inesperado de lectura del árbol |
| `WORKFLOWS_RUN_FAILED` | `workflows:run`: error inesperado fuera de la ejecución de los pasos (lectura del árbol o del YAML) |
| `STANDARD_RENDER_FAILED` | `standard:render`: error inesperado de lectura de plantillas o de escritura en `--out` |
| `NOTION_MAP_DRIFT` | `notion-map:build --check`: `docs/notion-map.json` no coincide con el mapa fresco |
| `WORKFLOW_NOT_FOUND` | `workflows:run`: `.github/workflows/<nombre>.yml` no existe o no cumple `WorkflowSchema` |
| `DECISIONS_INDEX_INVALID` | `decisions:index`: el índice construido desde `docs/decisions/` no cumple `DecisionsIndexSchema` |
| `DECISIONS_INDEX_DRIFT` | `decisions:index --check`: `docs/decisions/INDEX.json` no coincide con el índice fresco |
| `SCHEMAS_DRIFT` | `schemas:generate --check`: `standard/schemas/` no coincide con los esquemas Zod |
| `STANDARD_INVALID` | `standard:pack`: algún validador del estándar falla, no se empaqueta |
| `STANDARD_PACK_DRIFT` | `standard:pack --check`: la huella fresca no coincide con `forge614.node.json` o con `dist/SHA256SUMS` |
| `STANDARD_PACK_FAILED` | `standard:pack`: error inesperado de lectura o escritura |
| `STANDARD_RELEASE_TAG_MISMATCH` | `standard:release`: el tag no nombra la versión de `standard/VERSION` |
| `STANDARD_RELEASE_FAILED` | `standard:release`: `gh` no pudo ejecutarse o la release no se creó (por ejemplo, ya existía) |
| `NOTION_MAP_FAILED` | `notion-map:build`: mapa previo inválido, `package.json` ilegible o error de escritura |
| `NOT_IMPLEMENTED` | `build:target`, `smoke:target`, `release:publish`: llegan en la fase 0.4 (`bun release` compartido) |
| `SCHEMA_UNSUPPORTED` | Reservado por el estándar (§4) para un consumidor que recibe un `schemaVersion` que no conoce; ningún comando de este repositorio lo emite hoy |

## Requisitos obligatorios para asistentes de IA soportados
Sección `ai` de `standard/procedures/new-agent-checklist.md` (estándar 1.0.0): no existe porque `forge614-ai` no integra asistentes de IA. Este nodo publica ese checklist y `standard/support-matrix.json`; las secciones con requisitos son las de los nodos que sí integran asistentes (`forge614-engines`, `forge614-workers`, `forge614-atlas`, `forge614-engram`, `forge614-shell`).

## Compatibilidad
Cambios incompatibles suben `schemaVersion`; se mantiene una versión de compatibilidad. Desde que este contrato existe, los códigos y campos evolucionan de forma aditiva (acta 0024): ningún código o campo listado aquí se renombra ni se elimina sin subir `schemaVersion`.
