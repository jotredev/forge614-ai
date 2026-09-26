# 00 — Resumen y guía rápida

> Como el plano de una casa colgado en la entrada: en una sola hoja se ve qué hay en cada cuarto y por dónde conviene empezar.

## Qué es forge614-ai hoy

`forge614-ai` es el núcleo del ecosistema Forge614, una familia de herramientas para trabajar con asistentes de IA. Cada herramienta es un **nodo**: un repositorio propio con un contrato público. Hoy este repositorio publica tres cosas:

- El **Estándar de Nodo** (`standard/STANDARD.md`, versión `1.1.2`): la norma que todo nodo cumple. Se explica en el documento 01.
- Las **reglas** como paquetes y el **pack** `forge614-pack-ecosystem-node` que las agrupa. Documento 02.
- Las **plantillas** desde las que un nodo genera sus instaladores, workflows y contratos, y el **verificador** (`bun run verify`) que comprueba el estándar sobre este mismo repositorio. Documentos 03 y 04.

Lo que aún no existe se marca con su fase: el comando global `forge614` pertenece a la Entrega 1; el verificador que corre sobre otros repositorios llega en la fase 0.2 y el `bun release` compartido, en la fase 0.4.

## Comandos

Todos los comandos se ejecutan con Bun (el gestor de paquetes y ejecutor de desarrollo del ecosistema) desde la raíz del repositorio, después de `bun install --frozen-lockfile`. Cada uno imprime un solo objeto JSON en stdout con `schemaVersion`, y todo error sale por stderr como `{ schemaVersion, code, error }`; el documento 04 explica los códigos. `--help` siempre responde de inmediato.

| Comando | Qué hace | Documento |
| --- | --- | --- |
| `bun run verify [--locale es\|en] [--today YYYY-MM-DD]` | typecheck, tests, comprobaciones de deriva y validadores del estándar sobre este repositorio | 04 |
| `bun run standard:render --node <name> --out <dir> [--repo owner/repo] [--title Title]` | genera desde `standard/templates/` los archivos que un nodo adopta | 03 |
| `bun run standard:pack [--update-pointer] [--check]` | empaqueta `standard/` de forma reproducible en `dist/` y calcula su huella | 04 |
| `bun run workflows:check` | valida los workflows de `.github/workflows/` contra el estándar | 05 |
| `bun run workflows:run [--workflow <name>]` | ejecuta en local los pasos de un workflow (por defecto `verify`) | 05 |
| `bun run decisions:index [--check]` | regenera `docs/decisions/INDEX.json` o comprueba que está al día | 02 |
| `bun run notion-map:build` | regenera `docs/notion-map.json` con las huellas de esta documentación | 00 (más abajo) |
| `bun run schemas:generate [--check]` | escribe los esquemas JSON de `standard/schemas/` desde los esquemas Zod, o comprueba que no hay deriva | 01 |

## Estructura del repositorio

| Ruta | Contenido |
| --- | --- |
| `forge614.node.json` | Puntero del nodo: nombre, tipo, versión del estándar fijada y su huella SHA-256 |
| `standard/` | La norma (`STANDARD.md`, `STANDARD.en.md`, `VERSION`), `rules/`, `packs/`, `templates/`, `schemas/`, `procedures/`, `support-matrix.json`, `forbidden-mentions.json` y el contrato del ecosistema |
| `src/modules/` | Reglas y tipos puros, sin acceso a disco: validadores, esquemas Zod, escritor tar y gzip |
| `src/app/` | Casos de uso que orquestan módulos e infraestructura: verificar, empaquetar, renderizar, indexar |
| `src/infrastructure/` | Disco, procesos, compresión y huellas |
| `src/interfaces/cli/` | Un archivo por comando; traduce argumentos a casos de uso |
| `tests/architecture/` | Prueba de reglas de importación entre capas |
| `docs/es/`, `docs/en/` | Esta documentación, numerada y en pares |
| `docs/decisions/` | Actas de decisión 0001 a 0025 con `INDEX.json` |
| `docs/audits/`, `docs/handoffs/`, `docs/signals/`, `docs/superpowers/` | Registro histórico (auditorías, traspasos, señales externas, planes); no cuenta para la paridad |
| `docs/notion-map.json` | Mapa de páginas con huellas (siguiente sección) |

## `docs/notion-map.json`

Un **espejo** es una copia de un documento mantenida fuera del repositorio. Para saber si un espejo sigue al día, `bun run notion-map:build` escribe `docs/notion-map.json` con `schemaVersion: 1`, `productVersion` (la `version` de `package.json`) y una fila por par es/en: `{ es, en, sha256Es, sha256En, notionPageId }`. La huella es el SHA-256 del contenido de cada archivo, calculado en cada ejecución. `notionPageId` empieza en `null`; si una persona lo rellena, se conserva mientras el archivo en español exista, y los pares que desaparecen se eliminan del mapa. Ejecutar el comando dos veces sin cambios produce exactamente el mismo archivo. Un mapa previo que no cumpla el esquema detiene el comando con `NOTION_MAP_FAILED` en vez de descartar identificadores en silencio.

## Dónde seguir leyendo

- La norma: `standard/STANDARD.md` en español y `standard/STANDARD.en.md` en inglés.
- Las actas: `docs/decisions/` con su `README.md`. Las que explican esta entrega son la 0009 (una sola fuente del estándar, sin copias), la 0015 (registro de decisiones en cuatro capas) y la 0019 (workflows delgados, documentados y validados).
- El contrato del ecosistema: `standard/FORGE614_ECOSYSTEM_CONTRACT.md` y su par en inglés.
