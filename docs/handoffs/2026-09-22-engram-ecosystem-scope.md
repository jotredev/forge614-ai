# Traspaso — Engram: v1.5.3 (Verify en rojo en Linux) + ámbito `ecosystem` (memoria compartida entre repositorios relacionados)

**Fecha:** 2026-09-22 · **Repositorio destino:** `forge614-engram` · **Ejecuta:** el propietario, en una sesión dentro de ese repo · **Revisa:** forge614-ai (coordinador)
**Prioridad:** P1 (Parte A: main con Verify en rojo; Parte B: producto) · **Actas:** 0019, 0022, 0023, 0024 · **Precondición:** v1.5.2 publicada (sí). Un solo prompt con dos partes secuenciales: la Parte B no empieza hasta que v1.5.3 esté revisada y publicada.

## Prompt para la sesión en `forge614-engram`

```
REGLA DE GIT (no negociable): NO hagas commit, merge, tag, push ni publicación en ningún momento, ni siquiera al final ni "para dejar limpio". La revisión de forge614-ai es PREVIA al commit; si terminas, reportas y esperas. Un commit sin revisión incumple este traspaso.

Este traspaso tiene DOS PARTES en orden. Termina la Parte A, reporta y ESPERA la revisión y la
publicación de v1.5.3 antes de empezar la Parte B (que será la 1.6.0).

=== PARTE A — v1.5.3: cuelgue intermitente de la CLI en Linux (Verify en rojo) ===

Verify falló en ubuntu-latest tras publicar v1.5.2 (run 35793823992): el test "all projects and working
directories share exactly one workspace configuration" (src/interfaces/cli/__tests__/cli.e2e.test.ts)
tardó 10 143 ms —el timeout de 10 s del lanzador se disparó: una invocación de la CLI se bloquea en
Linux— y excedió el timeout por defecto de bun test (5 000 ms). En macOS pasó. main no puede quedar con
Verify en rojo (acta 0019).
Tarea (TDD; reabre el plan de release; Scope/Decisions para v1.5.3):
1. Diagnóstico con evidencia en Linux (gh run view 35793823992 --log; si hace falta, un workflow_dispatch
   temporal con trazas en una RAMA de trabajo): instrumenta ese test para registrar cuánto tarda CADA
   invocación de la CLI y cuál se bloquea. Hipótesis a comprobar, no a asumir: la CLI espera stdin (no
   TTY) en algún comando; un lock de SQLite entre procesos; una espera de red.
2. Corrige la causa real, no solo los timeouts. Si es stdin: el lanzador de tests pasa stdin: "ignore" y
   la CLI nunca lee stdin salvo en comandos que lo declaran.
3. Timeout explícito por test en TODOS los e2e de CLI (tercer argumento de test(), ≥ 20 s), por encima
   del timeout del lanzador (10 s): un fallo debe ser del producto, no del arnés.
4. Verifica: bun test local; y ADEMÁS el workflow Verify en GitHub sobre una rama de trabajo (push de
   rama SÍ autorizado solo para esto; main intacto) en verde en ubuntu y macOS tres veces seguidas;
   pega los enlaces.
5. package.json 1.5.3; CHANGELOG "1.5.3: corrección del cuelgue intermitente de la CLI en Linux;
   timeouts por test". Impacto en el procedimiento de agentes: No.
6. docs/notion-map.json: el commit de v1.5.2 retiró notionSyncPending de 01/08 es/en. Si las páginas de
   Notion NO fueron sincronizadas realmente, restaura "notionSyncPending": true en esas cuatro entradas.
7. Reporta (causa raíz probada, diff, enlaces de CI) y ESPERA. Tras la revisión, el propietario hace
   commit, tag v1.5.3 y push; solo entonces sigue la Parte B.

=== PARTE B — 1.6.0: ámbito ecosystem e identidad portátil del proyecto ===

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

REGLA DURA (acta 0024, evolución aditiva): SOLO se agrega. Ninguna tabla, columna, campo, topicKey,
comando, herramienta MCP ni código de error existente se renombra, elimina ni cambia de tipo o significado.
Migraciones hacia adelante, idempotentes, con respaldo automático de engram.db antes de aplicarse y sin
reescribir datos. Test obligatorio: una base creada por la versión publicada anterior (fixture) se abre y
se lee completa con la versión nueva sin error ni pérdida; el protocolo v1/v2 y todas las salidas JSON
actuales siguen byte-idénticas para quien no use el ámbito nuevo.

Tarea (TDD; plan primero):
1. Esquema: tabla NUEVA de grupos (`ecosystem_groups`: id, name estable con regex
   ^[a-z0-9]+(?:-[a-z0-9]+)*$, createdAt) y pertenencia mediante columna NUEVA nula (o tabla nueva de
   pertenencia) — nunca modificando columnas existentes. Migración versionada como las existentes.
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
    forge614.node.json, vincular por .forge614/project.json, startup-context con y sin grupo, precedencia
    de topicKey, protocolo v1/v2 inmutables, memory-move con historial.
13. `bun test`, `bun run typecheck`, build. NO commit ni publicación.

Reporte para revisión: causa/diseño con archivo:línea; archivos; tests; salida real de los e2e; docs
cambiadas; sección "Impacto en el procedimiento de agentes" (esperado: Sí — Engines y Shell deben
inyectar el bloque ecosystem; asistentes soportados a revalidar).
```

## Qué revisará forge614-ai

- Parte A: causa raíz del cuelgue en Linux probada con evidencia (no solo timeouts ampliados); Verify verde 3× en ubuntu y macOS; `notionSyncPending` coherente con la realidad de Notion.
- Vinculación automática sin preguntas y sin escrituras fuera del caso (a)/(b).
- Protocolo v1/v2 byte-idénticos; v3 documentado.
- Precedencia y límites por bloque; nada de SQLite expuesto.
- Plan con Decisions, validaciones reales e impacto en agentes.

## Después

Traspasos derivados: Engines (gancho: inyectar bloque `ecosystem`), Shell (`getStartupContext` acepta `ecosystem`), forge614-ai (campo `ecosystem` en `forge614.node.json`, ya en el plan 0.1).
