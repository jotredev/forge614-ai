# 0032 — Formato común de `update --json`

**Fecha:** 2026-11-26
**Estado:** aceptada
**Sesión:** forge614-ai-2026-11-26-r2b

## Contexto

El acta 0031 estableció `update --json`. Engram, Atlas, Sentinel y Workers ya devuelven `previousVersion` e `installedVersion` en la raíz. Engines devuelve `currentVersion`, `latestVersion` e `installedVersion` dentro de `result`. Shell tiene un lector para Engines y otro para Engram, y su propia respuesta reúne resultados bajo claves por nodo. Engram también puede informar un reemplazo diferido.

## Decisión

El propietario acordó el 20 de octubre de 2026 que la raíz describa el nodo invocado y que una lista aparte describa los cambios en otros nodos. El [estándar de nodo 1.3.0](../../standard/STANDARD.md#resultado-común-de-update---json) define esa salida y su [esquema común](../../standard/schemas/update-result.schema.json). La versión de esquema `2` distingue el formato común de las respuestas anteriores con versión `1` o sin versión.

El formato reutiliza `updated`, `previousVersion`, `installedVersion` y el `pendingVersion` opcional. `dependencies` es opcional y recoge los cambios confirmados y los reemplazos programados en otros nodos. En caso de fallo, el comando usa el objeto de error común de stderr. Los nodos con un formato anterior mantienen acceso a él durante la transición.

## Alternativas descartadas

- Generalizar `result.<nodo>` de Shell habría obligado a conocer una clave distinta para leer el resultado de cada comando.
- Usar `latestVersion` como `installedVersion` habría confundido una release disponible con la versión verificada, especialmente al volver atrás o programar un reemplazo diferido.
- Reutilizar `schemaVersion: 1` para el formato común habría dejado varias formas incompatibles con el mismo número.

## Consecuencias

Cada nodo adopta el contrato en su repositorio y verifica el comando público. Durante la transición, los consumidores deben distinguir el formato anterior conocido del nuevo. Shell debe cubrir con pruebas las combinaciones con versiones anteriores de Engines y Engram antes de que los productores cambien sus salidas. Los campos que ya existían conservan su significado en la salida de compatibilidad.

## Referencias

- Plan local `.agents/plans/2026-11-26--update-json-comun.md`.
- Memoria de ecosistema `0546a69c-8209-4974-8361-f508d8256240`, 2026-10-20.
- Actas relacionadas 0013, 0024 y 0031.
- [Issue #51](https://github.com/jotredev/forge614-ai/issues/51).
