# 0018 — Soporte obligatorio de macOS, Linux y Windows en todo nodo

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

El ecosistema se distribuye como binarios compilados por plataforma con instaladores propios (`install.sh`, `install.ps1`). Hoy solo Engines publica para los tres sistemas operativos y prueba en un runner de Windows real. Engram publica únicamente macOS y Linux y documenta Windows como pendiente; Shell no tiene `install.ps1`; Atlas y Workers no publican nada. Un estándar simétrico no puede dejar la cobertura de plataforma a criterio de cada nodo: una persona con Windows recibiría medio ecosistema.

Patrones aplicables: matriz de compilación por plataforma en CI (build matrix) con prueba de humo nativa por objetivo; instalador generado desde plantilla única.

## Decisión

Todo nodo del ecosistema publica, en cada release, binarios e instalador para **macOS (arm64 y x64), Linux (arm64 y x64) y Windows (x64)**, y su `release.yml` de plantilla compila y prueba cada objetivo en un runner nativo de esa plataforma. No existen excepciones ni estados "pendiente": un nodo al que le falte uno de los tres objetivos no se libera, y el verificador (`release`) lo comprueba en la configuración de CI.

## Alternativas descartadas

- **Permitir una excepción documentada con fecha para Windows en Engram.** Se descartó por decisión del propietario: la cobertura de plataforma es parte de la identidad del producto, no un detalle de cada nodo.
- **Soportar Windows solo vía WSL.** Obliga a la persona a instalar un subsistema Linux y rompe la integración con asistentes que corren en Windows nativo.
- **Windows arm64 desde ahora.** Se pospone hasta que los asistentes de IA soportados publiquen binarios para esa arquitectura; se abrirá acta cuando aplique.

## Consecuencias

- El plan de alineación de Engram incluye compilar y probar SQLite/FTS5 en Windows real, y retirar el binario nativo vacío que hoy está versionado.
- Shell, Atlas y Workers adoptan la plantilla de release con los cinco objetivos desde su primera publicación alineada.
- Las plantillas `install.sh` e `install.ps1` son un solo par para todos; ninguna lógica de instalación se escribe por nodo.
- Costo asumido: tiempo de CI por release (cinco compilaciones nativas) y la obligación de que toda dependencia nativa nueva justifique en `Decisions` cómo se compila en los tres sistemas.

## Referencias

- Spec: `docs/superpowers/specs/2026-09-22-entrega-0-estandar-de-nodo-design.md`, secciones 4.6, 4.7, 7.2 y 9.
- Actas relacionadas: 0001 (distribución por paquetes), 0013 (contratos de máquina), 0016 (bilingüismo).
- Engram: topicKey `forge614-ai/decisions/three-os-mandatory`.
