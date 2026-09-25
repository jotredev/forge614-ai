# 0027 — Memoria inteligente de Engram en el procedimiento de agentes

**Fecha:** 2026-09-25
**Estado:** aceptada
**Sesión:** forge614-ai-2026-09-25-reglamento-1-1-0

## Contexto

Engram 1.7.0 publica el esquema 11 (memoria inteligente), con activación explícita
(`intelligence-enable`) en una base existente y nacimiento directo en el nivel 11 para una base nueva
(`init`); un filtro de secretos que rechaza el guardado con `SECRET_REJECTED` en todo nivel; reglas del
tablero del ecosistema (`ECOSYSTEM_TYPE_NOT_ALLOWED`, `ECOSYSTEM_AFFECTS_REQUIRED`,
`ECOSYSTEM_AFFECTS_UNKNOWN`, `ECOSYSTEM_BOARD_FULL`, `ECOSYSTEM_STATUS_FORBIDDEN`,
`ECOSYSTEM_STATUS_TOO_LONG`); detección de parecidos en `memory_save` (`similar`); sesiones interrumpidas
(`previous` en `memory_session_start`); un bloque de arranque en formato 2 (`startup-context --format 2`,
≤ 5 000 caracteres); y el protocolo público `forge614-engram-memory` versión 4, que documenta la conducta
completa de esta memoria inteligente para todo cliente MCP desde 1.7.0.

El plan `docs/superpowers/plans/2026-09-24-engram-1-7-0-memoria-inteligente.md` dejó redactados, tarea por tarea, los puntos nuevos del checklist de agentes que este cambio exige
y una corrección pendiente desde T1: la sección `forge614-engram` de
`standard/procedures/new-agent-checklist.md` describía solo el protocolo v1 y los ámbitos `shared`/`project`,
sin mencionar `ecosystem` (ya vigente desde Engram 1.6.0) ni las versiones 2 a 4. Por acta 0017, el
procedimiento se revisa en cada cambio de nodo, no solo al llegar un agente nuevo; los cambios se acumulan
y se publican juntos en el reglamento siguiente.

## Decisión

1. **Checklist de agentes:** la sección `forge614-engram` de `standard/procedures/new-agent-checklist.md`
   incorpora los puntos T2 (`SECRET_REJECTED`), T4 (`ECOSYSTEM_*`), P-T3 (parecidos), P-T5 (sesión
   interrumpida), P-T6 (bloque de arranque, lado del host), P-T7a (manual completo) y P-T7b (resumen vivo
   e instrucciones del servidor MCP) redactados en el plan de Engram 1.7.0, y las cinco correcciones de esa
   misma sección (versión del protocolo en la Decisión, versión reconocida, lista de herramientas MCP,
   cierre no obligatorio con la versión 4, alcance `ecosystem` en el primer punto de memorias durables).
2. **Contrato del ecosistema:** la fila «Refuerzo por memorias repetidas» de
   `standard/FORGE614_ECOSYSTEM_CONTRACT.md` y `.en.md` deja de decir «Opcional» sin matiz: en una base
   nueva (Engram ≥ 1.7.0, `init`) el refuerzo viene incluido; en una base existente sigue siendo opcional
   hasta `intelligence-enable`.
3. **Matriz de soporte:** por el candado 3 de la sección 12 de `STANDARD.md` (cambia la sección de un nodo
   en el procedimiento ⇒ la matriz marca `revalidate` en todas las celdas de ese nodo), las celdas de
   `engram` de `claude-code` y `codex` en `standard/support-matrix.json` pasan a `revalidate` con
   `revalidateSince: "2026-09-25"` y `deadline: "2026-10-25"`. La de `cursor` sigue en `not-applicable`:
   Cursor no tiene integración de memoria (no se ejecuta sin interfaz; ver su celda de `engines`), así que
   no hay conducta que revalidar. Ninguna otra celda cambia.
4. **Versión del reglamento:** `standard/VERSION` sube de `1.0.2` a `1.1.0` (cambio aditivo de
   procedimiento y contrato, no de estructura de archivos ni de esquemas), con el encabezado de
   `STANDARD.md` / `STANDARD.en.md`, las menciones de la versión vigente en los documentos 00 y 01 (es/en),
   el puntero (`forge614.node.json`, versión y huella nueva vía `bun run standard:pack --update-pointer`)
   y el mapa de documentación (`bun run notion-map:build`).

## Alternativas descartadas

- **Esperar a que exista un agente nuevo para tocar el checklist:** el acta 0017 ya obliga a revisar el
  procedimiento en cada cambio de nodo relevante, no solo al integrar un agente; posponerlo dejaría el
  checklist describiendo un protocolo (v1) que ya no es el único vigente.
- **Dejar el refuerzo como "Opcional" sin matiz en el contrato:** contradice el comportamiento real de
  `init` desde Engram 1.7.0 (T8 del plan de Engram) y confundiría a quien lea el contrato como fuente de
  verdad pública.

## Consecuencias

- El checklist de agentes queda alineado con el protocolo v4 y con las reglas del tablero del ecosistema;
  cualquier integración nueva puede apoyarse en él sin reconstruir la conducta desde el plan de Engram.
- La matriz de soporte exige revalidar `claude-code` y `codex` en `engram` dentro de 30 días
  (antes del 2026-10-25) o el verificador falla (`forge614-rule-agent-checklist-impact`,
  `supportMatrixStale`).
- El reglamento 1.1.0 se publica con este acta, el checklist corregido, el contrato corregido y la matriz
  revalidada; la publicación (segunda tarea de este plan) es un paso separado, con aprobación del
  propietario.

## Referencias

- Plan: `docs/superpowers/plans/2026-09-25-reglamento-1-1-0.md`
- Plan de origen: `docs/superpowers/plans/2026-09-24-engram-1-7-0-memoria-inteligente.md` (sección
  «Impacto en el procedimiento de agentes (acta 0017), tarea por tarea»)
- Spec: `docs/superpowers/specs/2026-09-24-memoria-inteligente-engram-design.md`
- Actas relacionadas: `0017`, `0022`, `0024`, `0025`
