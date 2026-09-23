# 0025 — Contrato del ecosistema v2

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

El contrato del ecosistema ("idéntico" en teoría) tenía cinco versiones distintas y divergentes copiadas a mano en cada repositorio: 10 327 B en Engram, 10 158 en Engines, 10 136 en Atlas, 9 825 en Workers, 9 464 en Shell. Ninguna copia reflejaba las decisiones tomadas después de su redacción original: Workers no aparecía como paquete de implementación, Hub y Sentinel no existían todavía, no había comandos `forge614 prepare|status|doctor|update`, no se documentaba el libro de corridas como excepción a "sin bases de progreso paralelas" (acta 0011), y no recogía la convención única de contratos de máquina (acta 0013), el ámbito `ecosystem` de Engram (acta 0022), la identidad portátil de proyecto (acta 0023) ni la evolución aditiva (acta 0024). El Estándar de Nodo (spec §4.1) ya establece que `FORGE614_ECOSYSTEM_CONTRACT.md` deja de copiarse: cada repositorio lo referencia por puntero (`forge614.node.json`) y el verificador comprueba que una copia local, si existe, sea byte-idéntica a la publicada.

## Decisión

Se publica el **Contrato del ecosistema v2** (versión `2.0.0`) en `forge614-ai/standard/FORGE614_ECOSYSTEM_CONTRACT.md` (es) y su par `FORGE614_ECOSYSTEM_CONTRACT.en.md` (en), como texto único y fuente de verdad. El v2 reescribe el v1 más completo (la copia de Engram, 10 327 B) e incorpora:

1. La jerarquía de siete nodos (`forge614-shell`, `forge614-engines`, `forge614-workers`, `forge614-engram`, `forge614-atlas`, `forge614-hub`, `forge614-sentinel`) alrededor del núcleo `forge614-ai`, nombrando el patrón de arquitectura de micronúcleo con distribución por paquetes con dependencias declaradas (acta 0001).
2. La tabla de responsabilidades extendida con Workers, Hub y Sentinel.
3. Los tres sistemas operativos obligatorios en todo nodo (acta 0018).
4. El comando global `forge614` con `init | prepare | status | doctor | update`, propiedad de `forge614-ai`; la IA nunca ejecuta `prepare` por su cuenta, solo avisa.
5. La descripción de Atlas: Planes 1–5 implementados, v1.0.0 publicada, contextualización inicial opcional del proyecto.
6. La tabla de instalación con el grafo de dependencias transitivas (Shell→Engines; Engram→Shell+Engines; Atlas→Engram+Engines+Shell(+Workers); Hub→Engines; Sentinel→—; forge614-ai→todos).
7. El libro de corridas de `forge614-ai` como **excepción explícita** a "sin bases de progreso paralelas" (acta 0011).
8. La tabla de contratos públicos extendida: Hub↔forge614-ai, Sentinel↔todos, forge614-ai→gancho de arranque `forge614 status --directory --json`, Engram→ámbito `ecosystem` y `.forge614/project.json` (actas 0022, 0023), Workers→Atlas/forge614-ai.
9. Las reglas transversales de convención única de contratos de máquina (acta 0013), evolución aditiva (acta 0024), huella mínima (acta 0020) y piezas reemplazables (acta 0021), remitiendo al Estándar de Nodo para el detalle.
10. La regla de trabajo por repositorio, que ahora apunta al Estándar de Nodo (`standard/STANDARD.md`), al `CONTRACT.md` de cada nodo, al procedimiento de agentes nuevos y a la matriz de soporte.

Sin menciones a productos externos. Los nodos existentes dejan de mantener copias propias: solo referencian la versión publicada por `forge614.node.json` y, si conservan una copia local, esta debe ser byte-idéntica (comprobación `validateEcosystemContract`, spec §4.1).

## Alternativas descartadas

- **Corregir cada una de las cinco copias divergentes en su propio repositorio.** Perpetúa la causa raíz (copias por valor) en vez de resolverla; el estándar ya exige distribución por puntero.
- **Fusionar automáticamente las cinco copias con una herramienta de diff.** Las divergencias no son solo de redacción sino de decisiones de producto distintas; se necesitó una reescritura deliberada contra las actas aceptadas.

## Consecuencias

- Se agrega el paquete de regla `forge614-rule-additive-evolution` (núcleo, `compensates: structural`, acta 0024) al pack `forge614-pack-ecosystem-node`, sin validador todavía (llega con Sentinel fase 0.2).
- `bilingual-docs` (spec §4.8) ahora también verifica la paridad de encabezados es/en del par `standard/FORGE614_ECOSYSTEM_CONTRACT.md`/`.en.md`.
- El validador `ecosystem-contract` (`forge614-rule-machine-contracts`) queda disponible en `VALIDATORS` y corre en `bun verify`: compara la copia local en la raíz del repositorio, si existe, contra `standard/FORGE614_ECOSYSTEM_CONTRACT.md` byte a byte.
- Los cinco nodos existentes (Shell, Engines, Engram, Atlas, Workers) deben retirar su copia divergente del contrato en su próxima alineación y referenciarlo por puntero.

## Referencias

- Spec: `docs/superpowers/specs/2026-09-22-entrega-0-estandar-de-nodo-design.md`, §3.1.8, §4.1, §4.4, §4.6, §4.13, Anexo A.
- Actas relacionadas: `0001`, `0009`, `0011`, `0012`, `0013`, `0018`, `0020`, `0021`, `0022`, `0023`, `0024`.
- Engram: topicKey `forge614-ai/decisions/ecosystem-contract-v2` (al aceptarse).
