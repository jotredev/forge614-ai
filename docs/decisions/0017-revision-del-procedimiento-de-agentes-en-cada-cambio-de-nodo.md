# 0017 — El procedimiento de agentes se revisa en cada cambio de nodo, con puerta de release

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

El procedimiento central de agentes nuevos (`standard/procedures/new-agent-checklist.md`) nació para incorporar asistentes de IA nuevos al ecosistema. Pero los nodos cambian con más frecuencia que los asistentes: cuando Engines agrega una capacidad (por ejemplo, un directorio adicional de lectura para tareas sin pantalla), aparece una validación nueva que todo asistente futuro debe pasar, y los asistentes ya soportados dejan de estar verificados contra ese requisito. Sin un candado, el procedimiento y la matriz de soporte envejecen en silencio y la regla "un asistente entra solo si cumple todo lo obligatorio" se vuelve falsa por omisión.

Patrones aplicables: puerta de calidad (Quality Gate) en el proceso de release; matriz de trazabilidad entre requisitos y verificaciones; invalidación explícita de estado (una verificación tiene fecha y caduca cuando cambia lo verificado).

## Decisión

Tres candados obligatorios en el Estándar de Nodo (spec, sección 4.12):

1. **En el plan.** La plantilla de plan incluye la sección obligatoria `## Impacto en el procedimiento de agentes`: `Sí`, con la validación nueva que exige, o `No`, con el motivo. El verificador (`agent-checklist-impact`) impide cerrar un plan sin contenido real en esa sección.
2. **En el release.** `bun release` lee los planes cerrados desde el último tag. Si alguno declara `Sí`, exige que `forge614.node.json` fije una versión del procedimiento central y de la matriz de soporte que ya incluyan ese cambio. Si no, no publica y explica exactamente qué falta.
3. **En la matriz de soporte.** Cuando cambia la sección de un nodo en el procedimiento, todas las celdas de ese nodo pasan a `revalidate`. Un asistente vuelve a `supported` solo cuando una persona ejecuta la validación nueva y lo registra con fecha. El verificador falla si una celda permanece en `revalidate` más de 30 días.

## Alternativas descartadas

- **Confiar en que quien hace el cambio se acuerde de revisar el procedimiento.** Es exactamente lo que falla hoy; una regla sin verificador no es una regla.
- **Revisar el procedimiento solo cuando llega un asistente nuevo.** Deja a los asistentes ya soportados sin re-validar contra requisitos nuevos; la matriz mentiría.
- **Hacer que el verificador detecte por sí mismo qué cambios afectan a los agentes.** Requiere entender el código semánticamente; sería un validador ficticio. La declaración explícita en el plan es más honesta y auditable.

## Consecuencias

- La plantilla de plan del estándar gana una sección obligatoria; los planes existentes de los nodos la añaden al alinearse.
- `bun release` compartido incorpora la puerta; un nodo no puede publicar un cambio con impacto declarado sin haber actualizado el procedimiento central en `forge614-ai`.
- `support-matrix.json` gana el estado `revalidate` con fecha y responsable; el verificador suma la comprobación `agent-checklist-impact` (17 comprobaciones en total).
- Costo asumido: cada cambio de nodo obliga a responder una pregunta más y, a veces, a re-validar asistentes. Es el precio de que la matriz diga la verdad.

## Referencias

- Spec: `docs/superpowers/specs/2026-09-22-entrega-0-estandar-de-nodo-design.md`, secciones 4.7, 4.12 y 6.2.
- Procedimiento: `standard/procedures/new-agent-checklist.md`.
- Actas relacionadas: 0007 (Sentinel), 0009 (centralización), 0015 (registro de decisiones).
- Engram: topicKey `forge614-ai/decisions/agent-checklist-impact-gate`.
