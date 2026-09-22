# 0020 — Huella mínima en el contexto de la IA

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

Los arneses de IA suelen inyectar en cada sesión skills completas, decenas de servidores MCP, adaptadores y pasos extra. El resultado conocido es que el agente va más lento, gasta más tokens y el trabajo no mejora. Forge614 diseña siete nodos, veintiuna actas, casi veinte comprobaciones y un pack de reglas: el riesgo de convertirse en "un sistema operativo encima" del asistente es real y hay que atajarlo con una regla verificable, no con buenas intenciones.

La diferencia entre un arnés pesado y uno que sobresale no está en cuánta maquinaria existe, sino en **dónde vive la complejidad**: en el lado del constructor (nodos, verificador, CI, instaladores, contratos), que la IA nunca carga, o en el contexto de la IA, donde cada línea cuesta tokens en cada turno.

Patrones aplicables: divulgación progresiva (índice corto, contenido bajo demanda); presupuesto como contrato verificable; "cintura angosta" (núcleo mínimo, capacidad en los bordes).

## Decisión

Seis reglas obligatorias en el Estándar de Nodo (spec, sección 4.13):

1. **Presupuesto de arranque.** Todo lo que Forge614 inyecta al inicio de una sesión (protocolo de memoria + índice de skills + pack de reglas aplicable) cabe en **≤ 3 000 tokens**. El verificador lo mide con la comprobación `context-budget` y falla si se excede.
2. **Divulgación progresiva obligatoria.** Ninguna skill, regla ni política se carga completa hasta que se usa. Al inicio solo existe el índice: nombre y una línea.
3. **Nada encendido sin uso.** Un MCP o una skill sin uso en 30 días se propone apagar, con los datos del libro de corridas como evidencia.
4. **Cada paquete declara su costo.** El manifiesto lleva el campo `tokens`, medido al empaquetar; el Hub lo muestra antes de instalar, como el peso de una aplicación.
5. **La complejidad vive en el constructor.** Nodos, verificador y CI pueden ser tan estrictos como haga falta; la IA nunca los carga.
6. **Prueba de la regla.** Una sesión con Forge614 completo gasta en arranque menos que la misma sesión con las reglas puestas a mano en el archivo de instrucciones del asistente. Se mide y se publica.

## Alternativas descartadas

- **Confiar en el buen criterio** de quien escribe cada regla o skill: es lo que hace que los arneses engorden sin que nadie lo decida.
- **Medir después**, cuando el sistema ya esté en uso: para entonces el presupuesto ya está gastado y recortar duele; el presupuesto debe existir desde el primer pack.

## Consecuencias

- El pack de nodo de la fase 0.1 debe caber en el presupuesto: índice corto y texto completo bajo demanda.
- El esquema de manifiesto de regla y paquete gana el campo `tokens`.
- El verificador suma la comprobación `context-budget` (19 comprobaciones en total).
- El libro de corridas (Entrega 2) registra tokens de arranque por sesión y uso por paquete para alimentar las reglas 3 y 6.

## Referencias

- Spec: `docs/superpowers/specs/2026-09-22-entrega-0-estandar-de-nodo-design.md`, secciones 4.13 y 6.2.
- Actas relacionadas: 0006 (Hub), 0011 (libro de corridas), 0014 (patrones), 0021 (piezas reemplazables).
- Engram: topicKey `forge614-ai/decisions/context-budget`.
