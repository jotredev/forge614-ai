# Registro de decisiones (actas)

> Como el libro de bitácora de un barco: cada decisión importante queda anotada con fecha, para siempre.

**Regla.** Toda decisión de arquitectura o de contrato se registra como acta en `docs/decisions/NNNN-slug.md`, numerada consecutivamente desde `0001`, con fecha, estado (`propuesta | aceptada | revocada | reemplazada por NNNN`), sesión de Engram y las secciones `## Contexto`, `## Decisión`, `## Alternativas descartadas` y `## Consecuencias`. Un acta nunca se borra; cambia de estado. `docs/decisions/INDEX.json` lista todas las actas existentes y nunca pierde una entrada.

**Alcance.** `docs/decisions/` de cada repositorio del ecosistema.

**Por qué.** Es la segunda capa del registro de decisiones en cuatro capas: quien pregunta "¿por qué esto es así?" años después necesita una respuesta auditable, no solo lo que recuerda una IA (acta 0015).

**Verificación.** `validator: decision-records`. Si `docs/decisions/INDEX.json` todavía no existe en el repositorio (lo genera `bun run decisions:index`), el validador reporta un solo hallazgo indicando que falta, en vez de una pila de evidencia parcial.
