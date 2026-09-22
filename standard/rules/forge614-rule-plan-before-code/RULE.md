# Plan antes que código

> Como un plano antes de levantar una pared: primero se dibuja, después se construye.

**Regla.** Ningún cambio no trivial se implementa sin un plan escrito en `.agents/plans/AAAA-MM-DD--slug.md` con objetivo, contexto, alcance, decisiones con su porqué y la alternativa descartada, checklist, validaciones reales y resultado. Un cambio no trivial sin plan no se revisa.

**Alcance.** Todo cambio de código, contrato o documentación que no sea una corrección trivial, en cualquier repositorio del ecosistema.

**Por qué.** El plan es la primera capa del registro de decisiones en cuatro capas (acta 0015): si la decisión no se anota ahí, no existe.

**Verificación.** Revisión humana al fusionar. La sección obligatoria `## Impacto en el procedimiento de agentes` de los planes cerrados sí tiene verificador propio (acta 0017, `validator: agent-checklist-impact`).
