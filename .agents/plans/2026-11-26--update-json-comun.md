# R2b — Formato común de `update --json`

**Date:** 2026-11-26
**Type:** feature
**Status:** completed

## Objetivo y contexto

Completar R2b del issue #51 en el Estándar de Nodo 1.3.0. El acta 0031 exige `update --json` para automatizar actualizaciones. Shell lee dos respuestas distintas al llamar a Engines y Engram. La decisión del 20 de octubre coloca el resultado del propio nodo en la raíz y los cambios de otros nodos en una lista aparte.

## Alcance

Publicar el contrato bilingüe y el esquema validable en `forge614-ai`. Registrar cómo conviven las salidas anteriores y el formato común cuando los seis nodos adopten el estándar.

## Decisiones

- Esquema en la frontera. Reusar `updated`, `previousVersion`, `installedVersion` y `pendingVersion`. Publicar el esquema como `schemaVersion: 2` para identificarlo en presencia de contratos previos con versión 1. Un esquema que aceptara cualquiera de las formas anteriores solo para pasar la validación mantendría los distintos dialectos para los consumidores.
- Resultado de la operación. El booleano refleja cambios confirmados en la versión instalada. La versión pendiente se conserva por separado para el reemplazo diferido. Las operaciones en otros nodos se declaran solo si cambiaron o quedaron programadas.

## Checklist

- [x] Registrar campos, canales de salida y compatibilidad en el estándar y el acta.
- [x] Agregar el esquema Zod al catálogo y su JSON Schema generado al paquete.
- [x] Probar resultados propios y de dependencias, estado pendiente y rechazo de formas inválidas.
- [x] Ejecutar `bun run verify` y `bun run standard:check` con la huella actualizada.

## Impacto en el procedimiento de agentes

No cambia las capacidades de los asistentes ni el procedimiento de alta de un motor. Cambia el contrato de la CLI que los nodos pueden consumir.

## Resultado

El estándar 1.3.0 incluye el contrato común `schemaVersion: 2` en español e inglés. Los ejemplos de ambos idiomas se validaron con Zod y las plantillas renderizadas apuntan al esquema del paquete 1.3.0. `bun run verify` y `bun run standard:check` aprobaron en macOS. Las pruebas específicas de Windows y PowerShell se omitieron en este entorno. La adopción de la salida corresponde a los seis nodos según el issue #51.
