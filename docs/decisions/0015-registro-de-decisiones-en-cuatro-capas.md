# 0015 — Registro de decisiones en cuatro capas

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

El propietario necesita un historial que responda, años después, por qué se agregó algo, qué bloqueaba y qué pasó; hoy eso se queda en las conversaciones. Engram guarda memoria con `sessionId`, pero una máquina nueva sin Engram, o una base perdida, lo borraría todo. Engram es memoria (lo que una IA recuerda al empezar), no registro (lo que un humano audita con fecha y commit).

## Decisión

Cuatro capas, cada una con un trabajo, unidas por una regla de ascenso:

| Capa | Qué guarda | Dónde | Quién la lee |
|---|---|---|---|
| **Plan de la tarea** | Registro mientras se trabaja: objetivo, alcance, decisiones con su porqué y lo descartado, bloqueos (qué, por qué, cómo se destraba), validaciones reales, resultado | `.agents/plans/` del repo, en Git | Quien retoma; el revisor |
| **Acta de decisión (ADR)** | Una decisión de arquitectura o contrato por archivo, numerada, con estado y `sessionId` | `docs/decisions/` del repo; las del ecosistema en forge614-ai | Quien pregunta "¿por qué esto es así?" |
| **Changelog** | Qué cambió en cada versión | `CHANGELOG.md`, generado por `bun release` desde commits convencionales | Usuarios y mantenedores |
| **Engram** | Copia recordable: misma numeración, `sessionId`, enlace al acta y al plan; línea de tiempo por sesión | Base de memoria (réplica PostgreSQL opcional) | Las IAs, en cualquier repo |

Regla de ascenso: se decide → se anota **ya** en el plan (si no está ahí, no existe) → si es arquitectura o contrato, acta → al cerrar el plan, resumen a Engram con enlace → al liberar versión, changelog.

**Git es el original; Engram es el índice.** Si Engram se pierde, se reconstruye desde Git.

El verificador comprueba: planes cerrados con `Decisions` reales y bloqueos explicados; actas con numeración consecutiva, campos obligatorios y estados válidos; ninguna acta eliminada entre versiones; changelog actualizado en cada release.

Es un diferenciador del producto: cada decisión queda con su fecha, su sesión, sus alternativas descartadas y sus consecuencias, auditable por humanos y recordable por IAs, con verificación automática.

## Alternativas descartadas

- **Solo Engram:** no sobrevive a una máquina sin Engram ni a una base perdida; no se revisa en PR.
- **Solo el plan:** un plan es de una tarea; una decisión puede durar años.
- **Solo el changelog:** dice qué cambió, nunca por qué se descartó la alternativa obvia.

## Consecuencias

- Todas las decisiones de la sesión fundacional se convierten en las actas 0001–0016 de este repositorio.
- El Estándar de Nodo exige `docs/decisions/` y `CHANGELOG.md` en cada repo.

## Referencias

- Memoria Engram: `forge614-ai/decisions/decision-record-system`
- Actas relacionadas: `0009`, `0014`
