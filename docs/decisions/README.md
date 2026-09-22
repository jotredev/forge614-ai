# Actas de decisión (ADR) de forge614-ai

Un **acta de decisión** es un archivo corto, numerado, que registra una decisión de arquitectura o de contrato: qué se decidió, por qué, qué alternativas se descartaron y qué consecuencias tiene. Es el registro auditable que sobrevive a las conversaciones, a las sesiones de IA y a las personas.

Aquí viven las actas del **ecosistema Forge614** (decisiones que afectan a más de un nodo). Cada nodo tiene su propia carpeta `docs/decisions/` para las decisiones que solo le afectan a él.

## Regla de ascenso

Una decisión se escribe donde se toma y sube de capa según lo que dura:

1. **Plan de la tarea** (`.agents/plans/`, sección `Decisions`): se anota en cuanto se decide. Si no está en el plan, no existe; "acordado en el chat" no cuenta.
2. **Acta** (`docs/decisions/NNNN-slug.md`): si la decisión es de arquitectura o cambia un contrato público.
3. **Engram**: al cerrar el plan, la decisión se guarda como memoria con el mismo número, el `sessionId` de la sesión donde nació y el enlace al acta. Git es el original; Engram es el índice recordable.
4. **Changelog**: al liberar una versión, `bun release` la refleja en `CHANGELOG.md`.

## Estados

`propuesta` → `aceptada` → `revocada` o `reemplazada por NNNN`.

**Un acta nunca se borra.** Cuando deja de aplicar, cambia de estado y apunta al acta que la sustituye. La historia completa queda en el árbol.

## Convenciones

- Numeración de cuatro dígitos, consecutiva, sin huecos.
- Nombre de archivo en kebab-case: `0007-libro-de-corridas-en-forge614-ai.md`.
- Plantilla obligatoria: [`TEMPLATE.md`](TEMPLATE.md).
- El verificador del ecosistema comprueba: numeración, campos obligatorios, estados válidos y que ninguna acta haya desaparecido entre versiones.
