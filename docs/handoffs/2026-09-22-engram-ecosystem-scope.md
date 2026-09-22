# Traspaso — Engram: ámbito `ecosystem` (memoria compartida entre repositorios relacionados)

**Fecha:** 2026-09-22 · **Repositorio destino:** `forge614-engram` · **Ejecuta:** el propietario, en una sesión dentro de ese repo · **Revisa:** forge614-ai (coordinador)
**Prioridad:** P1 de producto · **Acta:** 0022 (aceptada) · **Precondición:** la corrección de `startup-context` (traspaso 2026-09-22-engram-startup-context-unbound) ya publicada.

## Prompt para la sesión en `forge614-engram`

```
Contexto. Este repositorio es forge614-engram, el motor de memoria persistente del ecosistema Forge614.
Rigen el Estándar de Nodo (repo forge614-ai: standard/STANDARD.md) y las actas 0001–0022 (forge614-ai/
docs/decisions/). Lee completa el acta 0022 (ámbito ecosystem) antes de tocar nada. Reglas: plan antes que
código (.agents/plans/ con Decisions); acta 0013 (contratos de máquina); acta 0012 (nunca mencionar
productos externos); Git de solo lectura para agentes (sin commit ni push); "cuestiona antes de hacer":
explica para qué sirve, qué beneficia, pros, contras y alternativas antes de implementar; nunca inventar
resultados de validación.

Problema real. La memoria por proyecto no cruza repositorios. Un ecosistema de varios repos (el de
Forge614, pero también microservicios, microfrontends o monorepos partidos de cualquier persona) comparte
decisiones y procedimientos que hoy solo ve el proyecto donde se guardaron. Debe resolverse en el producto,
sin que la persona guarde recuerdos a mano ni sepa que existen ámbitos.

Tarea (TDD; plan primero):
1. Esquema: tabla de grupos (`ecosystem_groups`: id, name estable con regex ^[a-z0-9]+(?:-[a-z0-9]+)*$,
   createdAt) y pertenencia (un proyecto → como máximo un grupo). Migración versionada como las existentes.
2. Ámbito `ecosystem` en memorias, sesiones y búsqueda con la misma semántica de topicKey, versiones,
   archivo/restauración y refuerzo que `project`/`shared`. Precedencia al resolver topicKey repetido:
   project > ecosystem > shared.
3. CLI no interactiva: `group-create --name`, `group-list`, `group-bind --project-id --group`,
   `group-unbind --project-id`; `save/search/get/context` aceptan `--scope ecosystem --group <name>`.
   Salidas JSON con schemaVersion; errores {code, error} por stderr; códigos en MAYUSCULAS_CON_GUION_BAJO.
4. Identidad portátil (acta 0023, léela completa): Engram escribe y posee `.forge614/project.json` en la
   raíz del repo: { "schemaVersion": 1, "project": { "id": UUID, "name" }, "ecosystem": { "id": UUID,
   "name" } | null }, validado con Zod .strict(). Toda operación con `--directory` lee primero ese archivo
   y resuelve por `project.id` (la ruta queda como pista); si el id no existe en la base local, registra el
   proyecto (y el grupo) con ese id sin preguntar (clon en otra máquina). `project-rename`/`group-rename`
   actualizan `name` en el archivo; los id nunca cambian. Proyectos ya vinculados por ruta reciben su
   `project.json` en el siguiente `session-start`/`startup-context` con aviso en el resultado. Vinculación de
   grupo sin preguntar: (a) `forge614.node.json` con `ecosystem` (grupo `forge614`, id fijo documentado);
   (b) sección `ecosystem` de `project.json`. Sin ninguno: en comandos no interactivos se vincula sin grupo,
   se escribe `ecosystem: null` y se informa; la pregunta única es de Shell (flujo visual), no de Engram.
   NADA se infiere por nombres de carpeta, cercanía en disco, remotos de Git ni parecidos. Un repositorio
   pertenece como máximo a un grupo; cambiar o quitar el grupo es un evento registrado. `.forge614/` es la
   carpeta de Forge614 en el proyecto: Engram escribe solo `project.json` y nunca toca otros archivos ahí.
   `startup-context` incluye `project.source: "file" | "path" | "unbound"`.
   Escritura del archivo: SILENCIOSA e IDEMPOTENTE. Nunca pedir permiso ni avisar por escribirlo (es config
   del producto). Si ya existe: leerlo, nunca reemplazarlo ni cambiar ids; completar solo campos faltantes;
   init/project-bind repetidos no cambian nada. Si la base local tenía esa carpeta vinculada a otro id, gana
   el archivo: re-vincular y registrar evento `PROJECT_REBOUND_FROM_FILE`; no tocar el archivo. Tests e2e para:
   archivo preexistente en clon (registro por id sin preguntar), init repetido (sin cambios, mismo sha256 del
   archivo), conflicto ruta↔archivo (gana el archivo), archivo corrupto o con esquema desconocido (error
   `PROJECT_FILE_INVALID` por stderr, sin sobrescribir).
5. `startup-context` y `context` devuelven `shared` + `ecosystem` (solo si el proyecto pertenece a un grupo;
   { status: "member", group, context } o { status: "none" }) + `project`, cada bloque con su propio
   límite de bytes (mismo default que hoy). `format` sube a 2 solo si cambia la forma; si añades el bloque
   como opcional sin romper consumidores, documenta por qué `format` se mantiene.
6. Protocolo público de memoria: versión 3 anuncia el ámbito `ecosystem`, `groupIntent` obligatorio al
   guardar en ese ámbito (simétrico a globalIntent), y el ciclo de vida actualizado; versiones 1 y 2 quedan
   byte-idénticas (test de inmutabilidad).
7. MCP: `memory_save`, `memory_search`, `memory_context`, `memory_session_summary` aceptan
   `scope: "ecosystem"` con esquemas Zod .strict(); `memory_current_project` informa el grupo.
8. SDK público: `MemoryWorkspace.createGroup/listGroups/bindProjectToGroup`; `MemoryStore` con el ámbito
   nuevo; sin exponer SQLite.
9. Migración explícita y registrada de memorias entre ámbitos: comando `memory-move --id --to-scope
   ecosystem --group <name>` que conserva historial y versiones (no copia ni borra en silencio).
10. Retiro del parche: documenta en el plan que el recuerdo shared `forge614/ecosystem/source-of-truth-
    pointer` debe eliminarse (o moverse al grupo forge614 con memory-move) una vez publicada esta versión.
11. Docs es/en (03 CLI, 04 SDK, 09 protocolo, 10 contexto de inicio, nuevo capítulo de ámbitos) con
    paridad y `notion-map.json`; `CONTRACT.md` si ya existe.
12. Tests: unitarios junto al código; e2e CLI contra base temporal para: crear grupo, vincular por
    forge614.node.json, vincular por .forge614/ecosystem.json, startup-context con y sin grupo, precedencia
    de topicKey, protocolo v1/v2 inmutables, memory-move con historial.
13. `bun test`, `bun run typecheck`, build. NO commit ni publicación.

Reporte para revisión: causa/diseño con archivo:línea; archivos; tests; salida real de los e2e; docs
cambiadas; sección "Impacto en el procedimiento de agentes" (esperado: Sí — Engines y Shell deben
inyectar el bloque ecosystem; asistentes soportados a revalidar).
```

## Qué revisará forge614-ai

- Vinculación automática sin preguntas y sin escrituras fuera del caso (a)/(b).
- Protocolo v1/v2 byte-idénticos; v3 documentado.
- Precedencia y límites por bloque; nada de SQLite expuesto.
- Plan con Decisions, validaciones reales e impacto en agentes.

## Después

Traspasos derivados: Engines (gancho: inyectar bloque `ecosystem`), Shell (`getStartupContext` acepta `ecosystem`), forge614-ai (campo `ecosystem` en `forge614.node.json`, ya en el plan 0.1).
