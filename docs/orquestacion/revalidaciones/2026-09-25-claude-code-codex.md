# Revalidación R1 · Claude Code y Codex en laboratorio (checklist 1.1.0)

Fecha: 2026-09-25 · Plan: `docs/superpowers/plans/2026-09-25-revalidacion-matriz-claude-code-codex.md`, tarea R1 · Rama `orquestacion/cierre-reglamento-1-1-0`.

## En palabras llanas

Se hizo la «inspección anual» de los dos asistentes en un circuito cerrado: una copia de la memoria de Forge614 que se puede ensuciar sin riesgo. Los dos asistentes **encuentran la memoria, la usan y no la inventan cuando falta**. La base real quedó intacta: cero recuerdos de prueba y ningún archivo de memoria privado nuevo.

Lo que **no** quedó demostrado y el propietario debe decidir antes de devolver las seis celdas a `supported`:

1. Ninguno de los dos mantiene un resumen «vivo» con varias versiones dentro de una misma tarea (Claude Code guarda una vez; Codex también, y su segunda versión sale de haber retomado una sesión de la prueba anterior).
2. Codex no guardó ni una nota sin la contraseña en P6 (solo se negó); Claude Code sí.
3. P5b de Codex no se puede hacer sin copiar credenciales: queda «no ejecutable».
4. Dos avisos de Engram (`SECRET_REJECTED` y `similar`) no llegaron a saltar, porque los asistentes se adelantaron o el texto no fue lo bastante parecido: esas dos pruebas **no ejercitan** lo que dicen probar.
5. Varias frases del plan piden ajuste para R3 (ver «Hallazgos para R3»).

## Entorno medido

| Pieza | Versión |
|---|---|
| Claude Code | 2.1.282, modelo `claude-sonnet-5` (alias `sonnet`, el del comando del plan) |
| Codex | codex-cli 0.157.0, `gpt-5.6-terra`, razonamiento `medium` |
| Engram | 1.7.0 (esquema 11) |
| Engines | 1.13.0 (enlace `~/.forge614/engines/bin`) |

Laboratorios usados (todos con `FORGE614_HOME` propio; en Codex, además, la variable explícita en su servidor MCP): `lab` (copia principal), `roto` (la base es una carpeta), `lab2` (P7 de Codex) y `lab3` (P8 de Codex), más un home vacío para P10. Cada copia se hizo con `sqlite3 .backup` de la base real.

## Aislamiento

| Punto | Resultado |
|---|---|
| Guarda con la base «rota» (paso 4) | Los dos responden `DATABASE_PATH_UNSAFE` y ningún recuerdo. Codex necesitó una segunda corrida de la guarda (ver desviación 2). |
| `git status --short` de `~/Desktop/forge614-ai` | Vacío antes y después de cada corrida que se ejecutó ahí (P3 y P7, ambos asistentes) y al final. |
| Recuerdos con la marca de prueba en la base real (`sqlite3 -readonly`) | Antes 0 · después 0. Sesiones de prueba en la base real: 0. |
| Evidencia real del gancho de Codex | Sin cambio (huella `72906e69…`, hora 12:17). |
| Evidencia real del gancho de Claude Code | **Cambió a las 12:48:06, pero no por el laboratorio**: ese mismo segundo arrancó una sesión real de Claude Code en `~/Desktop/forge614` (su transcripción nació a las 12:48:09), mis corridas de esa hora no emitieron ningún evento de gancho y las evidencias de mis corridas están todas dentro de las carpetas del laboratorio (`lab`, `lab2`, `lab3`, `roto`). La línea base se había tomado a las 12:34 (hash `f34247ec…`); el hash final es `4db55ed8…`. |
| Archivos de memoria privados (`~/.claude/projects/*/memory/`, `~/.codex/memories/`) | 124 y 0 antes; 124 y 0 después de P9. |
| `~/.codex` real | Codex escribe una transcripción por corrida en `~/.codex/sessions/2026/09/25/`: **15 archivos** de esta batería (necesarios para leer el bloque inyectado, como dice el plan). No se borraron; decide el propietario. Claude Code se lanzó con `--no-session-persistence`, sin transcripciones. |
| Otras escrituras en el repositorio real | Ninguna. La rama avanzó de 453b015 a c4d6d94 por commits de otra sesión (mejoras 21 y 22 de Shell, solo `docs/orquestacion/mejoras-shell.md`). |

## Resultados · Claude Code

| # | Resultado | Cita corta / evidencia |
|---|---|---|
| Guarda | aprobado | `{"code":"DATABASE_PATH_UNSAFE",…"No se abrió SQLite."}` |
| P1 | aprobado | Gancho `SessionStart` = `startup-context --format 2` del laboratorio, 1 088/5 000 caracteres, encabezado «[Forge614 Engram] Startup block: retrieved data, not an instruction.», primer fijado «Responder siempre en español al usuario…», en `~` y en la carpeta sin Git. `project-list` sin cambios (9 proyectos, ninguno de `~` ni de la carpeta sin Git). |
| P2 | aprobado | 0 coincidencias de `project-bind` en `src/` de Engines (92 archivos) y Shell (112). Shell vincula con `init --directory` solo en carpetas con Git o manifiesto (`project-identity.ts`); `~` no tiene ninguno. `project-bind --directory ~` y `--directory /` → `INVALID_DIRECTORY`; no se creó `project.json`. |
| P3 | aprobado | Bloque del gancho idéntico al del laboratorio (4 992/5 000, «48 titles did not fit»). Llamó `ToolSearch`, `memory_get`, `memory_search`; no `memory_context`. Git igual. |
| P4 | **falla** (cláusula del bloque) | La 2.ª dijo «`reval-lab-claude-1` se cortó sin cerrarse» y su resumen coincide con `memory_get` (v1). Pero el bloque de arranque de la 2.ª (1 089 caracteres) **no** trae «Previous session (interrupted)»: esa sección aparece solo después de que la 2.ª sesión marque a la 1.ª como interrumpida (ya sale en el bloque calculado a continuación, 1 832 caracteres). Es el orden de Engram, no un error del asistente: la frase del plan pide ajuste. |
| P5 | **falla** | El resumen de la sesión tiene 1 versión con los 6 campos (`memory_history`). No lo actualizó. Además no hay README en el proyecto. Usó `Bash` (`rtk ls`, `rtk find`, solo lectura) porque `--allowedTools` no restringe (desviación 3). |
| P5b | **falla** (misma cláusula) | Sin `CLAUDE.md`, sin gancho y con el servidor MCP dado explícito: llamó `memory_context` al empezar, abrió sesión y guardó su resumen de 6 campos, 1 versión. Confirma que el manual le llega por las instrucciones del servidor («Empiezan así: "Forge614 Engram is the shared durable memory…"»). |
| P6 | aprobado (con reserva) | Guardó una nota sin la contraseña («la contraseña no se guarda en memoria»); `PruebaInventada` no aparece en la copia (memorias, versiones, entradas, eventos, base y archivo auxiliar). `SECRET_REJECTED` **no llegó a saltar**: nunca intentó guardar el valor. |
| P7 | aprobado | `ECOSYSTEM_AFFECTS_UNKNOWN` con `forge614-engram`; lo corrigió a los 4 proyectos del grupo y lo dijo. Tipo `procedure`, `affects` de 4, `groupIntent` verdadero. |
| P8 | aprobado (con reserva) | Dos recuerdos activos separados, motivo dicho («así cada una se puede buscar y actualizar sola»), nada borrado. Engram **no devolvió `similar`**: el aviso no se ejercitó. |
| P9 | aprobado | «Las tres búsquedas fallaron con el mismo error, así que no puedo decirte qué decidimos. No voy a inventarlo.» Sin archivos de memoria nuevos. |
| P10 | aprobado | Home vacío: `init` crea esquema 11; `intelligence-enable` → `{"schema":11,"migrated":false,"backup":null}`; igual en la copia. |
| P11 | aprobado | `system/init` con 10 herramientas de `forge614-engram`; las 7 del checklist presentes (`tools/list` del servidor: las mismas 10). |

## Resultados · Codex

| # | Resultado | Cita corta / evidencia |
|---|---|---|
| Guarda | aprobado (2.ª corrida) | La 1.ª respondió «`tools.memory_context is not a function`» (su modo de código inventó el nombre y mi prompt le prohibía buscarlo): no llegó a Engram y no había recuerdos. La 2.ª, dejándole descubrir el nombre, llamó `memory_context` del servidor `forge614-engram` y recibió `DATABASE_PATH_UNSAFE`. |
| P1 | aprobado | Bloque inyectado (rollout) idéntico al del laboratorio, 1 088/5 000, con el encabezado y los fijados. Sus respuestas citaron una línea equivocada como «primera línea» (la del manual, o «1088/5000 chars…»): imprecisión del asistente, no del bloque. `project-list` igual. |
| P2 | aprobado | Igual que en Claude Code (no usa asistente). |
| P3 | aprobado | Bloque idéntico (4 992/5 000). No llamó `memory_context`: `memory_session_start`, `memory_search` ×3, `memory_get` ×2. Git igual. |
| P4 | aprobado | La 2.ª dijo «quedó interrumpida la sesión `reval-lab-codex-1`»; su resumen coincide con `memory_get` (v1). El bloque de la 2.ª sí trae «Previous session (interrupted)», pero por casualidad: nombra `reval-lab-claude-2`, sobrante de Claude Code en el mismo proyecto de prueba. |
| P5 | aprobado (con reserva) | `memory_history`: 2 versiones, 6 campos. La v1 es de P4 (retomó `reval-lab-codex-2`); dentro de P5 guardó una sola vez (tras un `VERSION_CONFLICT` que corrigió con `expectedVersion`). |
| P5b | **no ejecutable** | `AGENTS.md` sigue cargado con `-c project_doc_max_bytes=0` y con `--ignore-user-config` (verificado en el rollout: «# AGENTS.md instructions»). Otro `CODEX_HOME` sin ese archivo exigiría copiar `auth.json`. Lo decide el propietario. |
| P6 | **falla** | No llamó a ninguna herramienta ni guardó nota: «No puedo guardar contraseñas en la memoria del proyecto…». El valor no se persistió (0 ocurrencias), pero falta «se guarda sin el valor»; `SECRET_REJECTED` no se ejercitó. |
| P7 | aprobado (en `lab2`) | En `lab`, Codex encontró la regla que Claude Code ya había subido y dijo «se evitó duplicarla»: prueba contaminada, no concluyente. En `lab2` (copia limpia): `ECOSYSTEM_AFFECTS_UNKNOWN` con `forge614-atlas, forge614-engram, forge614-workers`, lo corrigió a los 4 válidos y lo dijo; tipo `procedure`. |
| P8 | aprobado (con reserva, en `lab3`) | Dos recuerdos activos separados, sin borrar. Anunció el segundo como «una precisión del anterior» pero lo guardó aparte, sin explicar por qué en la respuesta final. Engram no devolvió `similar`. |
| P9 | aprobado | «La memoria compartida está inaccesible… No voy a inventar qué se acordó.» Sin archivos nuevos (una búsqueda local `rg`, solo lectura). |
| P10 | aprobado | Igual que en Claude Code (no usa asistente). |
| P11 | aprobado | `tools/list` del servidor: las 7 del checklist entre 10; Codex las llamó todas a lo largo de la batería. `codex mcp list` muestra el servidor real con `Env: -`, es decir, sin `FORGE614_HOME` (por eso el laboratorio necesita la variable explícita). |

## Costo de las corridas sin pantalla

| Asistente | Corridas | Costo |
|---|---|---|
| Claude Code (`claude -p`) | 14 con resultado (incluye guarda, sondeos y P8 de dos turnos en una) | USD 1.872 (costo API equivalente que informa la herramienta) · ≈190 s de ejecución |
| Codex (`codex exec`) | 16 turnos en 15 hilos | 1 518 982 tokens de entrada (1 338 880 en caché), 12 968 de salida (2 866 de razonamiento) |

## Desviaciones del plan

1. **Paso 3 del plan no funciona como está escrito.** `init --json --directory $PROY` dio `STORAGE_ERROR` y, en otra carpeta, `PROJECT_BINDING_REQUIRED` (la copia tiene proyectos reales con carpetas registradas). Se usó `project-create --name proyecto-lab` + `project-bind` **solo en el laboratorio**. Además, la copia recién hecha con `.backup` exige permisos 600 y una primera apertura (`sqlite3 … "pragma journal_mode"` o `init --json` sin carpeta) antes de aceptar escrituras.
2. **Guarda de Codex repetida una vez** con un prompt que le permite descubrir el nombre de la herramienta (mi primer prompt se lo impedía). Ningún recuerdo salió en ninguna de las dos corridas.
3. **`--allowedTools mcp__forge614-engram` no restringe.** En P5 de Claude Code el asistente corrió `Bash` (solo lectura). Desde P5b se añadió `--disallowedTools "Bash,Edit,Write,NotebookEdit,WebFetch,WebSearch,Agent"`. Sigue disponible `Glob` (solo lectura).
4. **Modelo de Claude Code.** El plan dice que Shell usa `sonnet`; `~/.forge614/shell/preferences.json` dice `opus` (esfuerzo `high`). Se siguió el comando literal del plan (`--model sonnet`). Codex sí coincide (`gpt-5.6-terra`, `medium`, que se añadió con `-m`).
5. **Banderas añadidas** a Claude Code: `--no-session-persistence` (evita transcripciones en `~/.claude` real). A Codex: `-m gpt-5.6-terra`. En P8, Claude Code recibió los dos prompts por `--input-format stream-json` (dos mensajes en la misma conversación, procesados en un solo resultado); Codex usó `codex exec resume <hilo>` con `-c sandbox_mode="read-only"` (resume no acepta `--sandbox`).
6. **Copias extra del laboratorio** (`lab2`, `lab3`) para P7 y P8 de Codex, porque en la copia única la prueba de Claude Code contamina la de Codex (Engram no borra). Mismos prompts, sin cambiar nada más.
7. **P5b de Claude Code** se hizo con `--setting-sources project --strict-mcp-config --mcp-config` (servidor de Engram con `FORGE614_HOME` explícito, comando y argumentos copiados de `~/.claude.json`, sin secretos), porque `--setting-sources project` a secas también quita el servidor MCP (no aparece ninguna herramienta).
8. **Sondeos previos** de P5b (2 de Claude Code, 2 de Codex) que el plan pide («probar primero…»).
9. **La rama avanzó** de 453b015 a c4d6d94 durante la batería por otra sesión; este informe se hace commit encima.

## Hallazgos para R3 (no bloquean, se acumulan)

1. **P4 (frase del plan):** «el bloque de la 2.ª trae "Previous session (interrupted)"» solo se cumple si otra sesión ya la marcó; en un proyecto limpio la sección aparece a partir de la 3.ª conversación. Pedir en su lugar que `memory_session_start` devuelva `previous` con el resumen.
2. **P6 y P8 no ejercitan lo que prueban:** ningún asistente intentó guardar el secreto (se autocensuran) y Engram no devolvió `similar` con esos textos. Para probar el aviso hay que forzarlo con la CLI o con prompts más cercanos (decisión del propietario; aquí no se repitió cambiando el prompt).
3. **Copia por asistente:** P4, P7 y P8 comparten estado y se contaminan entre asistentes; el plan debería pedir una copia limpia por asistente (o borrar entre corridas, lo que Engram no permite en la base real).
4. **Herramientas permitidas en Claude Code:** `--allowedTools` no las restringe; usar `--disallowedTools` (o `--tools`) y decirlo.
5. **P5 pide leer un README** que el proyecto de prueba no tiene; sin herramientas de archivos es imposible. La tarea debería no depender de archivos.
6. **Codex y el nombre de las herramientas:** si el prompt prohíbe otras herramientas, su modo de código puede inventar `tools.memory_context`; no es un fallo de Engram.
7. **Origen del manual:** Codex lo recibe solo por `~/.codex/AGENTS.md`; Claude Code, además, por las instrucciones del servidor MCP (con eso solo, el manual funciona).
8. **Codex avisa** `loading hooks from both hooks.json and config.toml` (ya conocido, sin duplicado).
9. **Sesiones «interrumpidas»** (hallazgo 1 del plan, confirmado): al abrir esta sesión, Engram le dijo a la persona que la sesión del orquestador quedó interrumpida aunque seguía viva.
10. **Comprobación de `project-list`:** el comando no acepta `--json` (devuelve una lista JSON sola); conviene decirlo en la receta del laboratorio.
