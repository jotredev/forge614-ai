# 0001 — Arquitectura de micronúcleo y distribución por paquetes con dependencias declaradas

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

El ecosistema Forge614 se compone de productos separados (Shell, Engines, Engram, Atlas, Workers, forge614-ai y los nodos nuevos Hub y Sentinel). El contrato del ecosistema ya establecía que cada producto es independiente y se comunica por contratos públicos, pero no fijaba con precisión qué trae consigo cada instalación ni qué piezas son internas. Workers nació después del contrato y no aparecía en él.

La analogía de lectura usada en el diseño fue "un Lego: cada pieza se instala sola y trae lo que necesita". La analogía no sustituye al patrón; el patrón canónico se nombra abajo.

## Decisión

El ecosistema adopta una **arquitectura de micronúcleo** (`forge614-ai` como núcleo coordinador, capacidades en nodos independientes) distribuida como **paquetes con dependencias declaradas**:

- Cada nodo es un **paquete** que declara sus dependencias; el instalador las resuelve **transitivamente** desde releases verificados.
- **Engines** y **Workers** son **paquetes de implementación**: nunca se instalan directo; los trae el paquete que los necesita.
- **forge614-ai** es el **meta-paquete**: instalarlo instala el ecosistema completo.

| Paquete | Dependencias declaradas (resueltas transitivamente) | Instalable directo |
|---|---|---|
| Shell | Engines | Sí |
| Engram | Shell, Engines | Sí |
| Atlas | Engram, Engines, Shell (+ Workers) | Sí |
| Engines | — | No (implementación) |
| Workers | — | No (implementación) |
| forge614-ai | Todos | Sí (meta-paquete) |

**Layout de instalación:** prefijo versionado con lanzador estable: `~/.forge614/<nodo>/<versión>/` para los archivos de cada versión y `~/.forge614/<nodo>/bin/` como lanzador estable que apunta a la versión activa. Ningún nodo escribe fuera de su prefijo.

## Alternativas descartadas

- **Shell sin Engines:** Shell falla a propósito si Engines no está, para no duplicar la detección de IAs; "instalar Shell solo" significa que la persona instala Shell y la resolución de dependencias trae Engines.
- **Workers como paquete instalable directo:** un ejecutor sin coordinador que le dé órdenes no tiene uso; se declara paquete de implementación como Engines.
- **Monolito que instala siempre todo:** contradice el micronúcleo y el principio de instalar solo lo necesario.

## Consecuencias

- El contrato del ecosistema debe actualizarse para incluir Workers como paquete de implementación y los nodos Hub y Sentinel.
- Cada instalador de nodo resuelve dependencias desde releases verificados, con aviso claro de qué se instala y en qué versión.
- `forge614 init` coordina esta resolución y nunca instala un paquete dos veces.

## Referencias

- Memoria Engram: `forge614-ai/decisions/install-model-and-init`
- Spec: `docs/superpowers/specs/2026-09-22-entrega-0-estandar-de-nodo-design.md`, Anexo A (patrones canónicos)
- Actas relacionadas: `0002`, `0003`, `0014`
