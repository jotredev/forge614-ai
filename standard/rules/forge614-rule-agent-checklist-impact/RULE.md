# Impacto en el procedimiento de agentes

> Como una revisión de seguridad que se repite en cada vuelo, no solo la primera vez que se compró el avión.

**Regla.** Todo plan bajo `.agents/plans/` cuyo `Status:` sea `completed` incluye la sección `## Impacto en el procedimiento de agentes` con contenido real: `Sí`, indicando qué validación nueva exige, o `No`, con el motivo. Un plan cerrado sin contenido real en esa sección no pasa la revisión.

**Alcance.** Todos los planes cerrados de todos los repositorios del ecosistema.

**Por qué.** El procedimiento de agentes nuevos y la matriz de soporte envejecen en silencio si nadie revisa el impacto de cada cambio de nodo; confiar en que "alguien se acuerde" es justo lo que falla (acta 0017).

**Verificación.** `validator: agent-checklist-impact`.
