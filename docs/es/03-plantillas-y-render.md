# 03 — Plantillas y render

> Como un molde de repostería: la forma es siempre la misma y solo cambia el nombre escrito encima de cada pieza.

## Variables

Una **plantilla** es un archivo de `standard/templates/` con marcadores `{{NOMBRE}}` que el renderizador sustituye. `renderTemplate` (`src/modules/standard/template.ts`) reemplaza cada marcador y falla con `unresolved placeholders: …` si queda alguno sin valor, así que una plantilla nunca sale a medias. Las variables son exactamente cinco (`NodeVars`, en `src/app/render-templates.ts`):

| Variable | Origen en `standard:render` | Ejemplo |
| --- | --- | --- |
| `NODE_NAME` | `--node` (obligatorio; patrón `[a-z0-9-]+`) | `engram` |
| `NODE_TITLE` | `--title` (opcional; por defecto igual a `NODE_NAME`) | `Engram` |
| `REPO` | `--repo owner/repo` (opcional; por defecto `jotredev/forge614-<node>`) | `jotredev/forge614-engram` |
| `ASSET_PREFIX` | Fijo: `forge614-<node>` | `forge614-engram` |
| `STANDARD_VERSION` | `standard/VERSION` | `1.0.0` |

## Destino de cada plantilla

`bun run standard:render --node <name> --out <dir> [--repo owner/repo] [--title Title]` escribe en `<dir>` los quince archivos siguientes (lista `DESTINATIONS`), con escritura atómica; `install.sh` y `.githooks/pre-push` quedan ejecutables (`0755`). Imprime `{ schemaVersion: 1, node, out, written }` y sale con `2` e `INVALID_ARGUMENTS` si falta `--node` o `--out`, si un valor no cumple su patrón o si aparece un flag desconocido con valor (el analizador lee pares `--clave valor`).

| Plantilla | Destino en el nodo | Para qué |
| --- | --- | --- |
| `install.sh` | `install.sh` | Instalador macOS/Linux: descarga la release por HTTPS, comprueba la huella contra `SHA256SUMS`, instala bajo `~/.forge614/<nodo>/` (o `FORGE614_HOME`) con lanzador `bin/forge614-<nodo>`; admite `--version`, `--archive` y `--uninstall` |
| `install.ps1` | `install.ps1` | Instalador Windows con la misma lógica |
| `verify.yml` | `.github/workflows/verify.yml` | CI de verificación (documento 05) |
| `release.yml` | `.github/workflows/release.yml` | CI de release por tag en cinco objetivos (documento 05) |
| `CONTRACT.md`, `CONTRACT.en.md` | Raíz | Contrato del nodo con las secciones fijas del estándar |
| `README.md`, `README.en.md` | Raíz | README bilingüe con analogía, instalación y tabla de documentación |
| `decision.md` | `docs/decisions/TEMPLATE.md` | Plantilla de acta |
| `plan.md` | `.agents/templates/plan.md` | Plantilla de plan, con la sección obligatoria `## Impacto en el procedimiento de agentes` (acta 0017) |
| `hooks/pre-push` | `.githooks/pre-push` | Gancho que ejecuta `bun run workflows:run --workflow verify` |
| `BRANCH_PROTECTION.md`, `BRANCH_PROTECTION.en.md` | Raíz | Configuración exacta de protección de `main` |
| `docs-workflows.md`, `docs-workflows.en.md` | `docs/es/NN-workflows.md`, `docs/en/NN-workflows.md` | Documentación de los workflows (documento 05) |

## Cómo un nodo adopta las plantillas

1. Renderizar a un directorio aparte: `bun run standard:render --node <name> --out /tmp/<name>-files --repo <owner>/<repo> --title <Título>`.
2. Copiar los archivos al repositorio del nodo. `NN` en `docs/*/NN-workflows.md` es un marcador de número: el nodo lo sustituye por el siguiente número libre de su documentación (el validador de workflows busca `docs/es/[0-9][0-9]-workflows.md`).
3. Revisar el diff: las marcas `<completar>` de `README.md` y `CONTRACT.md` se rellenan a mano; el resto no se edita, porque la siguiente versión del estándar se vuelve a renderizar encima.
4. Commitear. El historial lo gestiona una persona: Git es de solo lectura para agentes de IA (regla `forge614-rule-git-readonly-for-agents`).

## Gancho `pre-push` y `BRANCH_PROTECTION.md`

El **gancho `pre-push`** (`.githooks/pre-push`) se activa con `git config core.hooksPath .githooks` y ejecuta `bun run workflows:run --workflow verify` antes de publicar una rama: los mismos scripts, en el mismo orden, que el job `verify` de CI. `BRANCH_PROTECTION.md` (y su par en inglés) describe la configuración exacta que debe tener la rama `main`: pull request obligatorio con una aprobación mínima y aprobaciones obsoletas descartadas, status check `verify` requerido y al día con la base, sin push directo ni force push ni borrado, historial lineal y firmas de commit recomendadas (acta 0019).
