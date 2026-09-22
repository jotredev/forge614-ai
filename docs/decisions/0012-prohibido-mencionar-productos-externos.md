# 0012 — Prohibido mencionar productos externos en código, documentación y contratos

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

Durante el diseño se estudiaron otros proyectos para tomar decisiones informadas. Forge614 es un producto propio; sus decisiones se explican por sí mismas y no por comparación con terceros. La auditoría encontró una especificación de Engines que cita explícitamente un producto externo como referencia de diseño.

## Decisión

En ningún nodo, contrato, especificación, documentación, README, comentario de código, mensaje de commit ni mensaje de producto se menciona un producto, framework o proyecto externo como referencia o inspiración. Las decisiones se describen como propias de Forge614.

El verificador (Sentinel sin IA) incluye una comprobación de **menciones prohibidas** sobre código, docs, contratos y commits de todos los repos, con una lista que el propietario del ecosistema controla.

## Alternativas descartadas

- **Citar fuentes "por transparencia":** ata la identidad del producto a terceros y confunde a quien lee las decisiones.

## Consecuencias

- La spec de diseño de Engines debe reescribirse sin esas menciones en la alineación de nodos; se revisan también los handoffs históricos de los demás repos.
- Los anexos de auditoría y las actas de este repositorio ya cumplen la regla.
- Es regla de núcleo del pack `forge614-pack-ecosystem-node`.

## Referencias

- Memoria Engram: `forge614-ai/rules/no-external-product-mentions`
- Actas relacionadas: `0007`, `0009`
