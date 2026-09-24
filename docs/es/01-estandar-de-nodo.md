# 01 — Estándar de nodo

> Como el código de construcción de una ciudad: no dice qué casa construir, pero toda casa nueva debe cumplirlo y un inspector lo comprueba.

## Cómo leer `standard/STANDARD.md`

El **Estándar de Nodo** es la norma vinculante para todo repositorio del ecosistema. Vive en `standard/STANDARD.md` con su par `standard/STANDARD.en.md`; en su texto, "debe" significa que el verificador lo comprueba o que la revisión humana lo exige antes de fusionar. Tiene trece secciones numeradas y un anexo:

| Sección | Tema |
| --- | --- |
| 1 | Identidad y contrato del nodo (`forge614.node.json`, `CONTRACT.md`) |
| 2 | Estructura del repositorio y capas (`modules`, `app`, `infrastructure`, `interfaces`) |
| 3 | Stack (TypeScript estricto, Bun, Zod en toda frontera) |
| 4 | Contratos de máquina (JSON en stdout, errores en stderr, códigos de salida) |
| 5 | Patrones obligatorios, nombrados por problema |
| 6 | Instalación (tres sistemas operativos, instaladores desde plantilla) |
| 7 | Release, versionado y workflows |
| 8 | Documentación |
| 9 | Proceso de trabajo y registro de decisiones |
| 10 | Reglas de comportamiento del agente de IA |
| 11 | Seguridad transversal |
| 12 | Agentes de IA nuevos |
| 13 | Huella mínima y piezas reemplazables |
| Anexo A | Patrón canónico de cada elemento del ecosistema |

Donde una decisión originó un punto, la norma cita el acta correspondiente (secciones 4, 6, 7, 8, 12 y 13); las actas están en `docs/decisions/` (documento 02 explica cómo nacen). Este repositorio es el primero que cumple la norma; los demás nodos la adoptan en su alineación. Los esquemas de datos que la norma nombra (puntero, manifiesto de regla, pack, matriz de soporte, sobre de error, evento NDJSON, índice de actas, menciones prohibidas) existen dos veces: como esquema Zod en `src/modules/standard/schemas/` y como copia JSON Schema en `standard/schemas/`, generada por `bun run schemas:generate`; `bun run schemas:generate --check` falla con `SCHEMAS_DRIFT` si las copias no coinciden.

## Versionado del estándar

Dos archivos fijan la versión:

- `standard/VERSION` contiene la versión del estándar (hoy `1.0.1`) en formato SemVer (`MAYOR.MENOR.PARCHE`). Aparece en el título de `STANDARD.md`, en el nombre del paquete (`standard-1.0.1.tar.gz`) y en los archivos renderizados desde plantilla (variable `STANDARD_VERSION`, documento 03).
- `forge614.node.json` es el **puntero del nodo**: `{ schemaVersion: 1, node, kind, standard: { version, sha256 }, ecosystem? }`. `standard.version` es la versión del estándar que el nodo declara cumplir y `standard.sha256` la huella del paquete del estándar de esa versión; `kind` distingue `product` (se instala) de `internal` (nadie lo instala a mano); `ecosystem`, opcional en el esquema (acta 0022), nombra el grupo al que pertenece el nodo. El esquema `NodePointerSchema` (`src/modules/standard/schemas/node-pointer.ts`) lo valida y rechaza campos desconocidos.

En este repositorio el puntero lleva la huella del paquete que `bun run standard:pack` produce a partir del propio `standard/`; `bun run standard:pack --check` comprueba que siguen coincidiendo (documento 04).

## Cómo un nodo fija y sube de versión

Un nodo **fija** la versión escribiendo `standard.version` y `standard.sha256` en su `forge614.node.json`; la huella es la del paquete publicado para esa versión, que coincide con la del puntero de `forge614-ai`. Ningún nodo copia `standard/` a su árbol: solo lleva el puntero (acta 0009).

Para **subir** de versión, el nodo cambia los dos campos a la versión nueva, vuelve a renderizar las plantillas (documento 03), revisa el diff y ejecuta su verificación. La práctica prevista es que subir de versión agregue comprobaciones sin renombrar ni quitar las existentes. Hoy la edición del puntero de otro nodo es manual; `bun run standard:pack --update-pointer` solo reescribe la huella del puntero de este repositorio.

## Caché local prevista

Hoy el verificador corre únicamente sobre este repositorio y lee `standard/` directamente del árbol. El acta 0009 prevé que el verificador de cada nodo obtenga la versión publicada del estándar, la guarde en caché en `~/.forge614/` y compruebe la huella contra el puntero antes de usarla; según la sección 6 de la norma, `FORGE614_HOME` sustituye `~/.forge614` en todos los nodos. Esa caché, y el verificador que corre en otros repositorios, llegan con la fase 0.2; no existen en este árbol.
