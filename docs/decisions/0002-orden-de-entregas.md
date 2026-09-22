# 0002 — Orden de entregas de forge614-ai

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

forge614-ai reúne dos trabajos distintos: (A) montar y mantener el ecosistema en una máquina (instalación, `init`, `update`, `doctor`) y (B) dirigir el trabajo diario con IA (especificación, plan, tareas, obreros, verificación, contabilidad). Además, la auditoría de los cinco nodos existentes mostró que cada uno se construyó con sus propias recetas de instalación, release, documentación y contratos, sin un estándar común ni un verificador que lo hiciera cumplir.

## Decisión

Las entregas se construyen en este orden, y ninguna se adelanta a la anterior:

| Entrega | Qué produce |
|---|---|
| **0 — Estándar de Nodo** | El estándar con el que se construye todo: estructura, instalador desde plantilla, `bun release` compartido, documentación bilingüe, contratos de máquina, patrones, registro de decisiones; el verificador sin IA (Sentinel v0); la alineación de los cinco nodos existentes; el gancho de reglas centrales para mantenedores. |
| **1 — Instalación y preparación** | `forge614 init` (máquina) y `forge614 prepare` (proyecto), Hub local con origen oficial, Sentinel sin IA en `verify` y CI, primer pack de reglas y políticas por defecto. |
| **2 — Núcleo de orquestación** | El cerebro: tablero de tareas durable (Event Sourcing + máquina de estados), obreros con perfil, reintento con escalado y Circuit Breaker, Sentinel con IA (Quality Gate), captura real de tokens, libro de corridas completo. |
| **3 — Marketplace** | Orígenes remotos, cuarentena, niveles de confianza, comunidad, plugins y MCPs de terceros. |

Antes de la Entrega 0 se aplican parches de seguridad P1 en cada nodo, sin esperar el estándar.

## Alternativas descartadas

- **Empezar por el cerebro (B):** es donde están las decisiones difíciles, pero sin estándar ni instalación no hay dónde ejecutarlo de forma contable.
- **Empezar por `init` sin estándar:** se habría construido un sexto nodo con su propia receta, agravando el problema que se quiere resolver.
- **Diseñar (A) y (B) juntos:** demasiado grande para una sola especificación; es la receta para hacerlo a la ligera.

## Consecuencias

- La primera especificación es la de la Entrega 0, y la Entrega 1 se escribe bajo ese estándar.
- Los repos existentes reciben un plan de alineación cada uno; ninguno se da por alineado hasta que el verificador pase en verde.

## Referencias

- Memoria Engram: `forge614-ai/decisions/entrega-0-node-standard`, `forge614-ai/decisions/install-model-and-init`
- Actas relacionadas: `0001`, `0003`, `0009`
