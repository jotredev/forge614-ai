# 0021 — Piezas reemplazables conforme evoluciona el modelo

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

Los modelos de IA evolucionan más rápido que los procedimientos que se codifican en un arnés. Mucho de lo que hoy se resuelve con skills, servidores MCP, adaptadores o workflows explícitos, mañana lo hará el propio modelo de forma autónoma. El riesgo es construir una capa de orquestación estática alrededor de capacidades que se están moviendo constantemente hacia dentro del modelo: la capa sobrevive a su motivo y se vuelve peso muerto.

La respuesta no es tener menos arnés, sino hacerlo mínimo, modular y fácil de reemplazar a medida que el modelo cambia.

Patrones aplicables: modularidad por reemplazo (plug-in con contrato, arquitectura de micronúcleo); obsolescencia programada explícita; decisiones reversibles.

## Decisión

1. **Clasificación obligatoria.** Todo paquete y todo nodo declara `compensates: "model-limitation" | "structural"`. Es *estructural* lo que no se mueve al modelo aunque este mejore: memoria durable, contratos entre nodos, contabilidad, verificación, instalación e identidad de proyecto. Es *model-limitation* lo que existe porque hoy el modelo no lo hace solo.
2. **Retiro programado.** Todo paquete `model-limitation` lleva `sunset` obligatorio: una condición de retiro escrita y verificable ("cuando el modelo haga X de forma nativa") y una fecha de revisión.
3. **Apagable sin romper.** Ningún paquete depende de otro por dentro (micronúcleo); el Hub puede deshabilitar cualquier paquete `model-limitation` por política sin que nada más falle.
4. **Revisión periódica.** Cada release mayor de un asistente soportado dispara la revisión de los `sunset` vigentes (parte del procedimiento de agentes), y el libro de corridas aporta el uso real de cada paquete.
5. **Pregunta obligatoria antes de agregar.** "¿El modelo ya lo hace solo?", con evidencia. Si la respuesta es sí, el paquete no entra; la respuesta se registra en `Decisions` del plan.

## Alternativas descartadas

- **No codificar procedimientos** y dejar que el modelo lo haga todo: se pierden la contabilidad, los contratos entre nodos y la verificación, que son justamente lo estructural.
- **Congelar el arnés** en su estado actual: es la definición del problema que esta acta evita.

## Consecuencias

- El esquema de manifiesto gana los campos `compensates` y `sunset`.
- La matriz de soporte y el procedimiento de agentes incorporan la revisión de `sunset` en cada release mayor de un asistente.
- Los nodos existentes se clasifican durante la alineación: Engines y Workers son estructurales; las skills de stack son `model-limitation`.
- Toda propuesta de skill, MCP o plugin lleva la pregunta del punto 5 respondida antes de la revisión.

## Referencias

- Spec: `docs/superpowers/specs/2026-09-22-entrega-0-estandar-de-nodo-design.md`, secciones 4.12 y 4.13.
- Actas relacionadas: 0001 (micronúcleo), 0006 (Hub), 0017 (procedimiento de agentes en cada cambio), 0020 (huella mínima).
- Engram: topicKey `forge614-ai/decisions/replaceable-pieces`.
