# 0009 — Centralización del estándar: una sola fuente, sin copias

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

El contrato del ecosistema exige copiarse "sin cambios" en cada repo. La auditoría encontró cinco versiones distintas del mismo archivo (10 327 bytes en Engram, 10 158 en Engines, 10 136 en Atlas, 9 825 en Workers, 9 464 en Shell). Copiar reglas a cada repo garantiza que diverjan. Además, las reglas para desarrollar Forge614 no deben llegar a los usuarios finales de Engram o Shell: no les sirven y gastan sus tokens.

## Decisión

- Las reglas del estándar y el contrato del ecosistema viven **solo en forge614-ai** (`standard/` y `.agents/rules/`), publicados en GitHub con versión.
- **Ningún repo lleva copia.** Cada nodo tiene un **puntero** (`forge614.node.json`) con la versión fijada del estándar y su huella. El verificador obtiene la versión publicada, la guarda en caché en `~/.forge614/` y comprueba que el repo la cumple; o coincide con lo publicado, o falla.
- El contrato del ecosistema pasa al mismo esquema: puntero o verificación byte-idéntica contra el publicado.
- **Gancho de mantenedor:** cuando una IA abre una carpeta que es un repo de Forge614 (reconocido por el puntero), el gancho de arranque que Engines ya instala le entrega las reglas centrales desde la caché. En cualquier otro proyecto no se cargan. Los usuarios finales nunca reciben reglas de desarrollo.
- Cada nodo tiene además su propio `CONTRACT.md` (es/en): qué hace, qué no hace, comandos públicos con esquemas y versión, dependencias, requisitos obligatorios. Se actualiza con cada cambio y el verificador comprueba coherencia contrato↔código.
- El procedimiento para agentes nuevos vive en `standard/procedures/new-agent-checklist.md`, con secciones por nodo enlazadas desde el `CONTRACT.md` de cada uno. Un agente nuevo entra solo si cumple todos los requisitos obligatorios de todos los nodos.

## Alternativas descartadas

- **Copiar el pack de reglas a cada repo:** es exactamente lo que ya divergió.
- **Instalar las reglas de desarrollo en `~/.forge614/rules/` con cualquier nodo:** llegarían a usuarios finales que no las necesitan.

## Consecuencias

- Hay que retirar las cinco copias del contrato y sustituirlas por punteros en la alineación de nodos.
- El verificador necesita acceso de lectura a GitHub (o a la caché) para comprobar versiones.
- El `STATE.md` de cada repo deja de reproducir política; solo narrativa e inventario.

## Referencias

- Memoria Engram: `forge614-ai/decisions/entrega-0-node-standard`
- Anexo: `docs/audits/README.md`
- Actas relacionadas: `0002`, `0012`, `0013`
