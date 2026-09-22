# 0010 — Revisor independiente por escalera, reintentos acotados y fusible

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

Un modelo que revisa en la misma conversación donde escribió tiende a aprobarse. Y "reintentar hasta que pase" sin límite quema la suscripción sin aprender nada. Había que fijar cómo se garantiza independencia del revisor según qué IAs tenga la persona, cuántas veces se corrige una tarea y cuándo se apaga un obrero que falla en cadena.

## Decisión

**Revisor independiente, por escalera según lo disponible** (lo decide el orquestador solo, con lo que Engines detectó):

| Situación | Revisor |
|---|---|
| Dos proveedores (p. ej. Claude y Codex) | Autor en uno, revisor en el otro |
| Un proveedor con varios modelos | Modelo distinto de la misma casa (autor Sonnet → revisor Opus) |
| Un solo modelo | Conversación nueva + razonamiento mayor (mínimo obligatorio) |

**Corrección de una tarea: 3 intentos máximo.** Patrón canónico: **reintento con escalado** (cada intento sube un peldaño de recursos, nunca salta al tope).

| Intento | Modelo | Razonamiento | Lleva |
|---|---|---|---|
| 1 | El asignado por nivel | El asignado | La tarea |
| 2 (corrección 1) | Mismo | +1 peldaño | Tarea + informe del Sentinel |
| 3 (corrección 2) | +1 peldaño en la escalera | Medio, no alto | Tarea + los dos informes |
| Agotado | — | — | Escala a humano en Shell con todo el historial |

**Techo por defecto:** "el siguiente hacia arriba, nunca el modelo más caro en razonamiento alto sin aprobación humana". El techo es un parámetro de política por proyecto.

**Fusible por perfil.** Patrón canónico: **Circuit Breaker** (la analogía "fusible" es solo de lectura). Un perfil (motor + modelo + razonamiento) con **3 fallos consecutivos** no atribuibles a la tarea (timeout, cuota, no arranca, `no pasa` repetido en tareas distintas) se pausa el resto de la corrida; el orquestador enruta a otro perfil y, si no hay, pausa todo y avisa al humano.

## Alternativas descartadas

- **Exigir siempre otro proveedor:** quien solo tiene una IA no podría revisar nada.
- **Reintentos ilimitados "hasta que pase":** costo sin techo y sin aprendizaje.
- **Saltar directo al modelo más caro en el segundo intento:** quemadera de tokens.
- **Una sola corrección:** más barato, pero el usuario prefirió dos con cambio de estrategia en la segunda.

## Consecuencias

- Estos valores viven en la política por defecto y son parametrizables por proyecto.
- Cada intento y cada veredicto se registran en el libro de corridas para medir tasa de aprobación por modelo × razonamiento × nivel.
- Se implementa en la Entrega 2.

## Referencias

- Memoria Engram: `forge614-ai/decisions/policies-and-accounting`
- Actas relacionadas: `0007`, `0008`, `0011`
