# 0011 — El libro de corridas vive en forge614-ai, no en Engram

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

Todo debe ser contable: qué se pidió, qué obrero lo hizo, con qué modelo y razonamiento, cuántos tokens, cuánto tardó, qué veredicto recibió, quién aprobó. Hoy nadie mide tokens (Workers no los reporta por diseño; Atlas persiste "Tokens consumidos: 0" como si fuera real). El contrato prohíbe "bases de progreso paralelas" y Engram es memoria curada, no un registro operativo de miles de filas.

## Decisión

El **libro de corridas** (ledger) es propiedad de forge614-ai, en `~/.forge614/ai/`, sobre SQLite. Patrón canónico: **Event Sourcing + máquina de estados explícita** (la analogía "libro mayor de contabilidad" es solo de lectura): una **bitácora de eventos inmutable** como fuente de verdad (nunca se borra una línea; se agrega otra), tablas derivadas (corridas, tareas, intentos, veredictos, aprobaciones) y transiciones de estado de tarea definidas de forma explícita. Cada fila indica a qué proyecto pertenece. A Engram solo suben resúmenes ("corrida X: 8 tareas, 8 aprobadas, 190k tokens, decisión…").

**Números reales, nunca inventados:** la fuente de verdad es el reporte de uso que cada IA emite en modo sin pantalla (tokens de entrada, salida y caché; duración). Engines pide salida estructurada, Workers la pasa **sin interpretar**, forge614-ai la anota. Si un motor no reporta uso, el libro registra `null` y lo marca "no medido". Toda estimación va etiquetada como estimación con su método.

Métricas objetivo: tasa de aprobación por modelo × razonamiento × nivel; tokens por tarea aprobada; duración por perfil; tasa de retrabajo; qué atrapa el Sentinel; gasto por proyecto y periodo.

Esta decisión constituye una **excepción explícita** al contrato del ecosistema ("sin bases de progreso paralelas") y debe registrarse en su actualización.

## Alternativas descartadas

- **Guardarlo en Engram:** mezcla miles de filas operativas con memoria curada y degrada la búsqueda.
- **Un archivo JSON plano:** sin consultas ni integridad.
- **Estimar tokens cuando el motor no los reporta:** mezclaría real con inventado y arruinaría las métricas.

## Consecuencias

- Workers y Engines deben capturar el reporte de uso y ampliar su contrato (`usage` en `task_completed`, `null` si no hay).
- Atlas debe dejar de persistir `tokensConsumed: 0`.
- El contrato del ecosistema se actualiza con esta excepción.

## Referencias

- Memoria Engram: `forge614-ai/decisions/policies-and-accounting`, `forge614-ai/pending-changes/sibling-repos`
- Actas relacionadas: `0007`, `0010`, `0013`
