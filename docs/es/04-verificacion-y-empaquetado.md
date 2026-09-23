# 04 — Verificación y empaquetado

> Como la inspección final de una fábrica: primero se revisa cada pieza con una lista fija y solo lo aprobado se sella en una caja cuyo precinto lleva número.

## Qué comprueba `bun run verify`

`bun run verify [--locale es|en] [--today YYYY-MM-DD]` corre en dos etapas sobre este repositorio. Primero, seis pasos en orden; si uno falla, se detiene con `VERIFY_STEP_FAILED` y salida `1`:

| Paso | Comando | Qué asegura |
| --- | --- | --- |
| 1 | `bun run typecheck` | TypeScript estricto sin errores |
| 2 | `bun test` | Todos los tests, incluida la prueba de capas de `tests/architecture/` |
| 3 | `bun run decisions:index --check` | `docs/decisions/INDEX.json` al día (`DECISIONS_INDEX_DRIFT` si no) |
| 4 | `bun run workflows:check` | Workflows delgados, fijados y documentados (documento 05) |
| 5 | `bun run schemas:generate --check` | `standard/schemas/*.json` iguales a los esquemas Zod (`SCHEMAS_DRIFT` si no) |
| 6 | `bun run notion-map:build --check` | `docs/notion-map.json` con las huellas actuales de cada par de documentos (`NOTION_MAP_DRIFT` si no) |

Después, `runValidators` (`src/app/run-validators.ts`) lee el árbol del repositorio (sin `node_modules`, `dist`, `.git`, `.superpowers` ni `.claude`) y ejecuta los validadores. Un **validador** es una función pura sobre ese árbol que devuelve hallazgos con el identificador de la regla que informa:

| Regla | Validador | Qué comprueba |
| --- | --- | --- |
| `forge614-rule-package-naming` | `package-naming` | Carpetas de `standard/rules/`, `standard/packs/` y paquetes con manifiesto bajo `.agents/` siguen `origen-tipo-nombre` |
| `forge614-rule-package-naming` | `rules-catalog` | Manifiesto válido, nombre igual a la carpeta, validador registrado, `RULE.md` y `RULE.en.md` presentes |
| `forge614-rule-package-naming` | `packs-catalog` | `pack.json` válido, nombre igual a la carpeta, reglas listadas existentes |
| `forge614-rule-no-external-product-mentions` | `forbidden-mentions` | Ninguna línea del árbol contiene un término de `standard/forbidden-mentions.json` (salvo las rutas excluidas) |
| `forge614-rule-bilingual-docs` | `bilingual-docs` | Los pares `README`, `STANDARD`, `CONTRACT` y contrato del ecosistema, y cada `docs/es/NN-*` con su `docs/en/NN-*`, tienen el mismo número de encabezados (y la misma numeración en los cuatro pares fijos) |
| `forge614-rule-decision-records` | `decision-records` | Actas consecutivas, estado válido, cuatro secciones, `INDEX.json` completo y ninguna acta borrada |
| `forge614-rule-agent-checklist-impact` | `agent-checklist-impact` | Todo plan cerrado en `.agents/plans/` responde `Sí` o `No` con motivo en `## Impacto en el procedimiento de agentes` |
| `forge614-rule-agent-checklist-impact` | `support-matrix` | `standard/support-matrix.json` válido y sin celdas en `revalidate` más de 30 días respecto a `--today` |
| `forge614-rule-machine-contracts` | `error-codes` | Los códigos de `CONTRACT.md` y de cada `printError(...)` en `src/` cumplen `^[A-Z][A-Z0-9_]+$` |
| `forge614-rule-machine-contracts` | `ecosystem-contract` | Una copia local de `FORGE614_ECOSYSTEM_CONTRACT.md`, si existe, es byte-idéntica a la de `standard/` |
| `forge614-rule-thin-workflows` | `workflows` | YAML válido, acciones fijadas a un SHA de 40 hex, pasos `bun run <script>` que existen en `package.json`, jobs documentados |
| `forge614-rule-context-budget` | `context-budget` | El índice del pack de nodo cabe en 3 000 tokens (estimación de unos 4 caracteres por token) |

Las ocho reglas sin validador se listan en el documento 02.

## Formato del reporte

El comando escribe en stderr una línea por paso (`[verify] <paso>: exit N`), una por hallazgo (`[verify] <regla>: <veredicto> — <mensaje>`, con cada línea de evidencia debajo) y el veredicto final. En stdout escribe un solo objeto `VerifyReport`:

```json
{
  "schemaVersion": 1,
  "standard": "1.0.0",
  "verdict": "pass",
  "checks": [
    {
      "ruleId": "forge614-rule-bilingual-docs",
      "verdict": "pass",
      "evidence": [],
      "messageKey": "docsParityOk",
      "params": {},
      "message": { "es": "Documentación bilingüe con paridad.", "en": "Bilingual documentation with parity." }
    }
  ]
}
```

`verdict` es `pass`, `caution` o `fail`, y el global es el peor de los hallazgos. `--locale` solo cambia el idioma de las líneas en stderr: `message` siempre lleva ambos idiomas, tomados del catálogo tipado de `src/modules/standard/messages/`.

## Códigos de salida

| Salida | Situación | `code` en stderr |
| --- | --- | --- |
| `0` | Todos los pasos y validadores en `pass` | — |
| `1` | Un paso falló | `VERIFY_STEP_FAILED` |
| `1` | El veredicto global no es `pass` (`caution` o `fail`); el reporte se imprime igual en stdout | — |
| `2` | Argumento inválido: `--today` sin formato `YYYY-MM-DD`, `--locale` distinto de `es`/`en`, flag desconocido con valor (el analizador lee pares `--clave valor`) | `INVALID_ARGUMENTS` |

## `standard:pack` y `SHA256SUMS`

`bun run standard:pack` empaqueta `standard/` de forma **reproducible**: los mismos archivos producen los mismos bytes en Linux, macOS y Windows y, por tanto, la misma huella. Lo consigue sin `tar` ni `gzip` del sistema: el archivo se construye en memoria con código TypeScript del propio repositorio.

| Pieza | Dónde | Qué fija |
| --- | --- | --- |
| Escritor ustar (POSIX) | `src/modules/standard/tar.ts` | `uid` y `gid` 0, nombres de propietario vacíos, `mtime` 0; modo derivado del contenido y nunca del disco: directorio `0755`, archivo que empieza por `#!` `0755`, cualquier otro `0644` |
| Orden de miembros | `src/app/pack-standard.ts` (`collectTarEntries`) | Recorrido en profundidad con los hijos de cada directorio ordenados por nombre, independiente del orden del sistema de archivos; los archivos ocultos se omiten |
| Compresión | `src/infrastructure/compression.ts` | DEFLATE crudo, nivel 9, con `fflate` 0.8.3 (versión exacta), un compresor escrito en JavaScript puro: los bytes de DEFLATE dependen del compresor y no solo de la entrada, y el zlib que Bun enlaza en Windows produjo otra huella que en Linux y macOS (PR #1); una sola implementación en JavaScript da los mismos bytes en todo sistema |
| Contenedor gzip | `src/modules/standard/gzip.ts` | Cabecera constante de 10 bytes (`mtime` 0, XFL 2, OS 3) y CRC32 propio |

Antes de empaquetar, el comando ejecuta los mismos validadores que `verify`; si alguno falla, sale con `STANDARD_INVALID` y no produce nada. Si pasan, escribe en `dist/` (ignorado por Git):

| Archivo | Contenido |
| --- | --- |
| `dist/standard-<VERSION>.tar.gz` | El paquete; `<VERSION>` viene de `standard/VERSION` |
| `dist/SHA256SUMS` | Una línea `<sha256>  standard-<VERSION>.tar.gz` |
| `dist/pack-manifest.json` | Estimación de tokens (acta 0020): por cada regla del pack, `tokens` de su `RULE.md` completo, y `packIndex.tokens` del índice de una línea por regla; cada entrada lleva `estimate: true`, y ningún manifiesto de `standard/rules/` se modifica |

Imprime `{ schemaVersion: 1, version, archive, sha256, tarSha256, entries }`: `sha256` es la huella del paquete comprimido (la que fija `forge614.node.json`) y `tarSha256` la del tar sin comprimir, para distinguir una deriva de contenido (cambia `tarSha256`) de una de compresión (solo cambia `sha256`). Dos flags:

- `--update-pointer`: además reescribe `standard.sha256` en `forge614.node.json`, validando el puntero antes y después con `NodePointerSchema`. Ese puntero es la **verdad commiteada**: hoy es la huella contra la que `standard:pack --check` compara, y la que todo nodo copia al fijar su versión; el verificador de cada nodo, previsto para la fase 0.2, la comparará contra el paquete publicado (acta 0009).
- `--check`: empaqueta en un directorio temporal, compara la huella fresca con la del puntero y, si existe, con `dist/SHA256SUMS`; imprime `{ schemaVersion: 1, ok: true, sha256, tarSha256, pointerChecked: true, sumsChecked }` o falla con `STANDARD_PACK_DRIFT`, cuyo mensaje incluye la huella fresca del tar (`fresh tar sha256 …`) para saber si derivó el contenido o la compresión. Ejecutarlo en CI en los tres sistemas operativos (job `parity`, documento 05) es la prueba de paridad: si los bytes cambiaran en alguna plataforma, la huella dejaría de coincidir con el puntero. El script `standard:check` de `package.json`, alias de `standard:pack --check`, es el que ese job invoca.

| Salida | `code` | Situación |
| --- | --- | --- |
| `0` | — | Paquete escrito, o `--check` sin deriva |
| `1` | `STANDARD_INVALID` | Algún validador falla antes de empaquetar |
| `1` | `STANDARD_PACK_DRIFT` | `--check`: la huella fresca no coincide con el puntero o con `dist/SHA256SUMS` |
| `1` | `STANDARD_PACK_FAILED` | Error inesperado de lectura o escritura; el mensaje sale en el sobre, nunca como stack trace |
| `2` | `INVALID_ARGUMENTS` | Flag desconocido o argumento posicional |

Publicación: el tag `standard-v<versión>` dispara `standard-release.yml`, que verifica el puntero y publica la release con el paquete y su huella (documento 05). Esa release es lo que descarga Sentinel.

## Relación con `forge614-sentinel check`

Sentinel es el nodo que juzga y nunca hace (acta 0007): recibe algo y devuelve `pasa`, `precaución` o `no pasa` con evidencia. Los validadores de este repositorio son su primera capa, la que no usa IA: funciones puras sobre un árbol de archivos que devuelven hallazgos con regla, veredicto y evidencia. Hoy solo corren aquí, a través de `bun run verify`. `forge614-sentinel check`, que ejecutará estas mismas comprobaciones sobre cualquier repositorio del ecosistema leyendo su `forge614.node.json`, llega en la fase 0.2 y no existe en este árbol.
