# 0004 — Atlas es contextualización inicial opcional, no el orquestador general

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

La documentación de Atlas lo describe como "orquestador de contextualización profunda" y su hoja de ruta incluía un bucle de despacho (cola, concurrencia, pausa por cuota, reanudación) que coincide con el bucle genérico que forge614-ai necesita. Existía el riesgo de dos orquestadores compitiendo. La auditoría confirmó que Atlas ya despacha vía Workers y escribe en Engram (Planes 1–4 fusionados), aunque sus documentos digan lo contrario.

## Decisión

Atlas hace una sola cosa: **contextualizar un repositorio la primera vez** (recorrerlo, puntuar módulos sin IA, despachar análisis y depositar el conocimiento en Engram). Es **opcional**: durante `forge614 prepare`, Shell pregunta si se quiere contextualizar; si la persona dice que no, se trabaja normal con memoria. Atlas no es el orquestador general del trabajo diario; ese papel es de forge614-ai.

Atlas valida lo que devuelven los workers a través del Sentinel antes de escribirlo en Engram.

## Alternativas descartadas

- **Atlas como orquestador general:** duplicaría el bucle de forge614-ai y mezclaría dos responsabilidades.
- **Atlas obligatorio en `prepare`:** consume la suscripción de la persona sin que lo haya pedido.

## Consecuencias

- README, docs 00–01 y la spec de Atlas deben reescribirse: sin "orquestador", sin menú TUI, sin concurrencia 3; ejecución secuencial y ambigüedad de motor resuelta por Shell.
- La tabla fija de modelos por nivel de Atlas pasa a ser una política del Hub.
- Atlas sigue en desarrollo (sin 1.0.0) y se alinea al estándar antes de publicar.

## Referencias

- Memoria Engram: `forge614-ai/decisions/install-model-and-init`, `forge614-ai/pending-changes/sibling-repos`
- Anexo: `docs/audits/2026-09-22-auditoria-atlas.md`
- Actas relacionadas: `0003`, `0007`, `0008`
