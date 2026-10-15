# 03 — Plantillas y render

> Como un molde de repostería: la forma es siempre la misma y solo cambia el nombre escrito encima de cada pieza.

## Variables

Una **plantilla** es un archivo de `standard/templates/` con marcadores `{{NOMBRE}}` que el renderizador sustituye. `renderTemplate` (`src/modules/standard/template.ts`) reemplaza cada marcador y falla con `unresolved placeholders: …` si queda alguno sin valor, así que una plantilla nunca sale a medias. El nodo y repositorio salen de `node` e `install.repository` en la ficha; solo hay dos valores de presentación adicionales (`NodeVars`, en `src/app/render-templates.ts`):

| Variable | Origen en `standard:render` | Ejemplo |
| --- | --- | --- |
| `NODE_NAME` | `node` de `forge614.node.json` | `engram` |
| `NODE_TITLE` | `--title` (opcional; por defecto igual a `NODE_NAME`) | `Engram` |
| `REPO` | `install.repository` de `forge614.node.json` | `jotredev/forge614-engram` |
| `STANDARD_VERSION` | `standard/VERSION` | `1.2.0` |

## Destino de cada plantilla

`bun run standard:render --out <dir> [--pointer <forge614.node.json>] [--title Title]` escribe en `<dir>` los 17 archivos de `DESTINATIONS`, con escritura atómica. Si se omite `--pointer`, lee `<dir>/forge614.node.json`. `install.sh` y `.githooks/pre-push` quedan ejecutables (`0755`); `install.mjs` y `prepare-release-assets.mjs` se copian byte a byte. Imprime `{ schemaVersion: 1, node, out, written }` y sale con `2` e `INVALID_ARGUMENTS` si falta `--out`, si la ficha no tiene `node`/`install.repository` válidos o si aparece un flag desconocido con valor.

| Plantilla | Destino en el nodo | Para qué |
| --- | --- | --- |
| `install.sh` | `install.sh` | Portero macOS/Linux: verifica Node, ficha, instalador y manifiesto de la misma release, y reenvía los argumentos |
| `install.ps1` | `install.ps1` | Portero Windows con la misma lógica, compatible con PowerShell 5.1 y 7 |
| `install.mjs` | `install.mjs` | Instalador común, copiado sin cambios |
| `prepare-release-assets.mjs` | `scripts/prepare-release-assets.mjs` | Prepara activos de release y un único `SHA256SUMS` GNU |
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

1. Renderizar a un directorio aparte: `bun run standard:render --out /tmp/<name>-files --pointer <ruta-al-repositorio-del-nodo>/forge614.node.json --title <Título>`.
2. Copiar los archivos al repositorio del nodo. `NN` en `docs/*/NN-workflows.md` es un marcador de número: el nodo lo sustituye por el siguiente número libre de su documentación (el validador de workflows busca `docs/es/[0-9][0-9]-workflows.md`).
3. Revisar el diff: las marcas `<completar>` de `README.md` y `CONTRACT.md` se rellenan a mano; el resto no se edita, porque la siguiente versión del estándar se vuelve a renderizar encima.
4. Commitear. El historial lo gestiona una persona: Git es de solo lectura para agentes de IA (regla `forge614-rule-git-readonly-for-agents`).

## Gancho `pre-push` y `BRANCH_PROTECTION.md`

El **gancho `pre-push`** (`.githooks/pre-push`) se activa con `git config core.hooksPath .githooks` y ejecuta `bun run workflows:run --workflow verify` antes de publicar una rama: los mismos scripts, en el mismo orden, que el job `verify` de CI. `BRANCH_PROTECTION.md` (y su par en inglés) describe la configuración exacta que debe tener la rama `main`: pull request obligatorio con una aprobación mínima y aprobaciones obsoletas descartadas, status check `verify` requerido y al día con la base, sin push directo ni force push ni borrado, historial lineal y firmas de commit recomendadas (acta 0019).
