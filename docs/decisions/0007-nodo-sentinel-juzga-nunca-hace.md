# 0007 — Nodo Sentinel: juzga, nunca hace

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

Un sistema que produce trabajo con IA necesita que alguien distinto lo verifique: el que hace nunca debe calificarse a sí mismo. Se propuso un nodo que "verifique todo lo que se haga con IA"; esa definición era demasiado amplia y habría producido un nodo que termina haciendo de todo.

## Decisión

Se crea el nodo **Sentinel** (`forge614-sentinel`). Patrón canónico: **Quality Gate**, es decir, **punto de aplicación de políticas** (la analogía "centinela: vigila, avisa, no actúa" es solo de lectura). **Juzga, nunca hace.** Recibe algo y devuelve un veredicto con evidencia: `pasa`, `precaución` o `no pasa`.

Dos tipos de juicio, siempre en este orden:

1. **Sin IA, siempre primero** (barato, instantáneo): escáner de patrones peligrosos en paquetes, validación de esquemas JSON, comparación de huellas, resultado de `verify`/tests, menciones prohibidas, paridad de documentación, coherencia contrato↔código. Si falla, se acaba ahí sin gastar un token.
2. **Con IA, solo si pasó lo anterior y es trabajo producido por un obrero** (código, spec, plan): revisor independiente con un modelo distinto al autor, veredicto formal; su base es la skill de revisión de implementación del monorepo.

En `precaución` decide siempre un humano.

Quién lo llama: el Hub al admitir un paquete (los de comunidad requieren además aprobación humana); forge614-ai en cada puerta del flujo (spec → plan → código); Atlas para validar la salida de los workers antes de escribir en Engram; `bun verify` y la CI de cada repo del ecosistema. **El worker nunca llama al Sentinel**; lo llama el orquestador y el veredicto vuelve al orquestador, que decide aceptar, reenviar con feedback (acotado) o escalar a un humano en Shell.

Lo que el Sentinel no hace: corregir, instalar, ejecutar trabajo ni decidir.

## Alternativas descartadas

- **Verificación dentro de cada nodo:** cada uno se juzgaría a sí mismo y duplicaría escáneres.
- **Un nodo que "verifica todo":** sin definición estrecha se vuelve un nodo-dios.
- **Nombres `guard`, `warden`, `arbiter`, `assay`, `crucible`:** se eligió `sentinel` porque describe exactamente "vigila, avisa, no actúa".

## Consecuencias

- Entrega 0 y 1 solo implementan la parte sin IA; la revisión con IA llega en la Entrega 2.
- Cada veredicto queda registrado en el libro de corridas con quién revisó y con qué modelo.
- Nuevo repositorio y contrato público (`sentinel check`, `scan`, y después `review`).

## Referencias

- Memoria Engram: `forge614-ai/decisions/nodes-hub-and-sentinel`
- Actas relacionadas: `0006`, `0010`, `0011`, `0012`
