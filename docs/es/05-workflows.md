# 05 — Workflows de integración y release

> Como la lista de control de un vuelo: cada paso está escrito, se ejecuta igual en tierra (local) que en el aire (CI), y nadie despega sin completarla.

Un **workflow** es un archivo YAML de `.github/workflows/` que la integración continua (CI) ejecuta ante un evento; un **job** es cada unidad de trabajo dentro de él, con su propia máquina. En este repositorio los workflows son delgados (acta 0019): cada paso llama un script de `package.json`, así que `bun run workflows:run` reproduce en local exactamente lo que corre en CI. Los dos archivos están generados desde `standard/templates/verify.yml` y `release.yml`; `verify.yml` suma un job propio, `parity`, que la plantilla no lleva.

## `verify.yml`

| Job | Disparador | Qué ejecuta | Qué valida | Duración esperada |
| --- | --- | --- | --- | --- |
| `verify` | push a `main`, pull request | `bun install --frozen-lockfile`, `bun run verify` en `ubuntu-24.04` | typecheck, tests, índice de actas, workflows, esquemas, mapa de Notion y validadores del estándar (documento 04) | ~3 min |
| `parity` | push a `main`, pull request | `bun install --frozen-lockfile`, `bun run standard:check` en la matriz `ubuntu-24.04`, `macos-15`, `windows-2025` | que el paquete del estándar tiene en los tres sistemas operativos la misma huella que `forge614.node.json`: los bytes son idénticos en Linux, macOS y Windows (acta 0018) | ~2 min por sistema |

`standard:check` es el alias de script de `bun run standard:pack --check` (documento 04); el validador de workflows solo admite pasos `bun run <script>` sin argumentos, por eso el job no invoca el flag directamente. Todo job declara `timeout-minutes` (`verify` y `parity`: 10; `build`: 20; `publish`: 10): ninguna etapa queda sin límite y `workflows:check` rechaza el job que no lo lleva. La matriz de `parity` declara `fail-fast: false`: si un sistema falla, los otros dos terminan y reportan su propio resultado, así que un fallo de paridad muestra los tres veredictos en lugar de cancelar los que faltaban.

## `release.yml`

| Job | Disparador | Qué ejecuta | Qué publica | Duración esperada |
| --- | --- | --- | --- | --- |
| `build` | tag `v*` | `bun install --frozen-lockfile`, `bun run build:target`, `bun run smoke:target` en macOS arm64/x64, Linux arm64/x64, Windows x64 | artefactos por plataforma (`dist/release/*`) | ~8 min |
| `publish` | tras `build` | `bun install --frozen-lockfile`, `bun run release:publish` | release con binarios y `SHA256SUMS` | ~1 min |

`build:target`, `smoke:target` y `release:publish` son stubs: scripts de `package.json` que terminan con `NOT_IMPLEMENTED` hasta que el `bun release` compartido llegue en la fase 0.4. Hasta entonces un tag `v*` falla de forma deliberada: los tres scripts llaman a `src/interfaces/cli/not-implemented.ts`, que sale con `1` y ese código.

**Precondición de `release.yml`:** un nodo con dependencias `file:../` a repositorios hermanos en su `package.json` no puede adoptar esta plantilla; el workflow hace checkout de un solo repositorio y `bun install --frozen-lockfile` fallaría contra esa dependencia de ruta. Se sustituye por la versión publicada del nodo hermano antes de adoptar la plantilla.

## Validar antes de integrar

`bun run workflows:check` lee cada YAML de `.github/workflows/`, lo valida contra `WorkflowSchema` (campos desconocidos son error y `timeout-minutes` es obligatorio en cada job), exige que cada `uses` esté fijado a un SHA de 40 caracteres hexadecimales, que cada `run` sea `bun install --frozen-lockfile`, `bun test` o `bun run <script>` con un script que exista en `package.json`, y que cada job aparezca en la primera columna de las tablas de este documento (busca las filas bajo un encabezado que empiece por `| Job |`). Imprime `{ schemaVersion: 1, verdict, findings }` y sale con `1` si el veredicto no es `pass`. Forma parte de `bun run verify`. Sin archivos en `.github/workflows/` informa `pass` con "sin workflows que validar".

## Ejecutar en local

`bun run workflows:run --workflow verify` lee `.github/workflows/verify.yml` y ejecuta, job por job y en orden, cada paso `run`; se detiene en el primer paso fallido de un job e imprime `{ schemaVersion: 1, workflow, jobs: [{ job, steps: [{ run, exitCode }] }], ok }`, con salida `1` si algo falló y `WORKFLOW_NOT_FOUND` si el archivo no existe. El gancho `pre-push` (documento 03) lo hace automáticamente. En local el job `parity` corre una sola vez, en el sistema operativo de la máquina; la matriz de tres sistemas solo existe en CI.

## Acciones fijadas

| Acción | Versión | SHA |
| --- | --- | --- |
| actions/checkout | v4.3.1 | 34e114876b0b11c390a56381ad16ebd13914f8d5 |
| oven-sh/setup-bun | v2.0.2 | 735343b667d3e6f658f44d0eca948eb6282f2b76 |
| actions/upload-artifact | v4.6.2 | ea165f8d65b6e75b540449e92b4886f43607fa02 |
| actions/download-artifact | v4.3.0 | d3f86a106a0bac45b974a628896c90dbdf5c8093 |
