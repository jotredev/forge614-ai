# 0014 — Patrones obligatorios nombrados por problema, no por lista

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

El propietario exige que todo desarrollo del ecosistema aplique patrones de estructura y diseño de nivel mundial. Pedir "usa patrones" en general hace que cada IA los aplique a su manera, o que abstraiga "por si acaso". La auditoría mostró capas incompletas (Atlas y Workers sin `infrastructure/app`), módulos "puros" que hacen I/O y una prueba de arquitectura solo en Engram y Engines.

## Decisión

El Estándar de Nodo **nombra el patrón para cada problema**:

| Problema | Patrón obligatorio |
|---|---|
| Estructura | Arquitectura limpia por capas: `modules` (reglas puras, sin I/O) → `app` (casos de uso) → `infrastructure` (disco, procesos, red) → `interfaces` (CLI, MCP). Dependencias solo hacia adentro, verificadas por prueba de arquitectura AST. |
| Hablar con cosas externas | Puertos y adaptadores: una interfaz por capacidad, un adaptador por proveedor, registro con manifiesto de capacidades validado al arrancar. |
| Comandos CLI | Cada comando es un caso de uso puro que recibe entrada validada y devuelve un resultado; la CLI solo traduce. |
| Entradas externas | Validación con esquema (Zod) en la frontera; adentro todo es tipado y confiable. |
| Errores | Modelo único: código estable + mensaje bilingüe + causa; nunca un stack trace crudo. |
| Cambios en archivos de terceros | Plan → instantánea → aplicar → verificar → revertir. |
| Estado de tareas y corridas | Bitácora de eventos inmutable + máquina de estados explícita. |
| Persistencia | Repositorio: el dominio no sabe si hay SQLite o PostgreSQL detrás. |
| Configuración | Tipada, validada al arrancar, con capas (ecosistema → proyecto → corrida). |
| Decisiones de diseño | Acta de decisión (qué, por qué, qué se descartó) enlazada desde el plan. |

Transversal: SemVer + commits convencionales + changelog; releases con huella verificada y CI por plataforma (Windows incluido); lockfiles y acciones de CI fijadas por versión; `SECURITY.md`; pirámide de pruebas (unitarias junto al código, integración contra binarios reales, un flujo extremo a extremo por nodo); documentación bilingüe; sin telemetría oculta.

**Cautela obligatoria:** un patrón se aplica donde resuelve un problema real, nunca por lista. Cada abstracción nueva se justifica en la sección `Decisions` del plan, o no entra.

**Regla de nomenclatura:** toda decisión de diseño nombra su **patrón canónico**; una analogía ("Lego", "capataz", "centinela") puede acompañar para facilitar la lectura, pero **nunca sustituye al nombre del patrón**. El catálogo de patrones canónicos del ecosistema y su correspondencia con cada nodo vive en el Anexo A de la spec de la Entrega 0. Ejemplos ya aplicados: micronúcleo y paquetes con dependencias declaradas (acta 0001), Plan/Apply con cambio transaccional y puertos y adaptadores (Engines), registro de artefactos con lockfile y verificación de cadena de suministro (Hub, acta 0006), Quality Gate como punto de aplicación de políticas (Sentinel, acta 0007), configuración en cascada (políticas, acta 0008), reintento con escalado y Circuit Breaker (acta 0010), Event Sourcing con máquina de estados (libro de corridas, acta 0011).

## Alternativas descartadas

- **Regla genérica "aplicar buenas prácticas":** no verificable y aplicada de forma distinta por cada IA.
- **Exigir todos los patrones en todos los nodos:** abstracción especulativa, más código, más tokens, más lugares donde fallar.

## Consecuencias

- La prueba de arquitectura de Engram se generaliza como plantilla del estándar y se exige en todos los nodos.
- Atlas y Workers deben reestructurarse en capas durante la alineación.

## Referencias

- Memoria Engram: `forge614-ai/decisions/entrega-0-node-standard`
- Spec: `docs/superpowers/specs/2026-09-22-entrega-0-estandar-de-nodo-design.md`, Anexo A (patrones canónicos)
- Actas relacionadas: `0001`, `0009`, `0013`, `0015`
