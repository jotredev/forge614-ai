# Revalidación de Claude Code y Codex en la matriz de soporte

> Como la inspección anual de un coche: no se cambia ninguna pieza, se prueba cada punto de la lista oficial en un circuito cerrado (el laboratorio) y se anota con fecha lo que pasó.

**Qué es:** el plan para devolver a `supported` las seis celdas de Claude Code y Codex que hoy están en `revalidate` en `standard/support-matrix.json`, ejecutando el checklist de agentes (`standard/procedures/new-agent-checklist.md`, reglamento 1.1.0) contra las instalaciones reales de la Mac (Engram 1.7.0, Engines 1.13.0, Shell 1.11.0).

| Celda | Motivo | Vence |
|---|---|---|
| `engines/claude-code`, `engines/codex` | gancho con `startup-context` `unbound` | **2026-10-22** |
| `shell/claude-code`, `shell/codex` | Shell desde `~` con memoria compartida | **2026-10-22** |
| `engram/claude-code`, `engram/codex` | checklist `forge614-engram` con la memoria inteligente (acta 0027) | 2026-10-25 |

El verificador del reglamento falla si una celda pasa más de 30 días en `revalidate` (`STANDARD.md` §12, candado 3): las de Engines y Shell llevan desde el 2026-09-22.

## Por qué se hace en un laboratorio

Varias pruebas escriben en la memoria (clave de prueba, regla en el tablero del grupo, recuerdo parecido, sesión cortada) y en Engram nada se borra. Se corren contra una **copia** de la base con `FORGE614_HOME` apuntando al laboratorio. Medido por el orquestador (2026-09-25):
- **Claude Code** hereda `FORGE614_HOME` en el servidor MCP y en el gancho: con un laboratorio cuya base es una carpeta, `memory_context` responde `DATABASE_PATH_UNSAFE` y la evidencia del gancho se escribe en el laboratorio.
- **Codex** hereda la variable en el gancho, pero **no en el servidor MCP** (leyó la base real). Se arregla pasándola explícita: `-c "mcp_servers.forge614-engram.env={FORGE614_HOME=\"$LAB\"}"`. En `codex exec`, las herramientas MCP piden aprobación: `-c 'mcp_servers.forge614-engram.default_tools_approval_mode="approve"'`.
- `claude -p`: `--allowedTools` acepta varias herramientas seguidas y se come el texto del prompt; el prompt va por la entrada estándar (`echo "…" | claude -p …`).
- La evidencia de Claude Code sale completa con `--verbose --output-format stream-json`: el evento `system/hook_response` trae el bloque inyectado y `system/init` la lista de herramientas.

## Ya medido por el orquestador sobre los archivos reales (solo lectura, 2026-09-25)

| Punto del checklist | Claude Code | Codex |
|---|---|---|
| Manual v4 «byte a byte» igual a `instructions` (definición de abajo, `bloque.py`) | igual, 2 326 caracteres | igual, 2 326 caracteres |
| `instructions` ≤ 2 500 y sin `mcpInstructions` copiado aparte | sí | sí |
| `verify memory-integration` | `complete`, `upToDate: true`, gancho `runtime-observed` 18:19Z | `complete`, `upToDate: true`, gancho `runtime-observed` 18:17Z |
| Herramientas MCP públicas | 10 (las 7 del checklist + `memory_current_project`, `memory_history`, `memory_timeline`) | se mide en R1 |
| Sesión nueva real con bloque de arranque y manual | sí (sesión del orquestador: 4 893/5 000, «Previous session (interrupted)») | sí (sesión del propietario: fijados, sesión interrumpida, índice) |

**Definición de «byte a byte»** (cambio acumulado para el próximo reglamento): el contenido entre los marcadores, sin la línea de marca de Engines, sin el renglón en blanco que la sigue y sin el salto de línea final, es idéntico a `instructions`.

```python
# bloque.py — uso: python3 bloque.py ~/.claude/CLAUDE.md ~/.codex/AGENTS.md
import json, subprocess, sys, os
home = os.path.expanduser("~")
engram = os.path.join(os.environ.get("FORGE614_HOME", os.path.join(home, ".forge614")), "engram/bin/forge614-engram")
proto = json.loads(subprocess.run([engram, "memory-protocol", "--json", "--protocol-version", "4"],
                                  capture_output=True, text=True, check=True).stdout)
instr = proto["instructions"]
BEGIN = "<!-- forge614-engines:begin engram-memory-protocol -->"
END = "<!-- forge614-engines:end engram-memory-protocol -->"
ok = True
for f in sys.argv[1:]:
    t = open(f, encoding="utf-8").read()
    if t.count(BEGIN) != 1 or t.count(END) != 1:
        print(f, "FALLA: marcadores"); ok = False; continue
    inner = t.split(BEGIN, 1)[1].split(END, 1)[0]
    inner = inner[1:] if inner.startswith("\n") else inner
    mark, rest = inner.split("\n", 1)
    if not mark.startswith("<!-- Managed by Forge614 Engines.") or not rest.startswith("\n") or not rest.endswith("\n"):
        print(f, "FALLA: forma del bloque"); ok = False; continue
    body = rest[1:-1]
    ok &= body == instr
    print(f, "IGUAL" if body == instr else "DISTINTO", len(body), len(instr),
          "mcpInstructions aparte:", proto["mcpInstructions"] in t)
sys.exit(0 if ok else 1)
```

## Hallazgos que no bloquean (se anotan)

1. **Sesiones en paralelo marcadas como interrumpidas (Engram).** `memory_session_start` marca como interrumpida toda otra sesión abierta del mismo proyecto (`src/infrastructure/sqlite/activity.ts:15`); la marca se borra con la siguiente actividad de esa sesión. Con dos sesiones vivas en el mismo repositorio, la nueva le dice a la persona que la otra «quedó interrumpida» aunque siga trabajando (pasó el 2026-09-25 con la sesión de Codex del propietario y la del orquestador). Para la prueba de `previous` hace falta un proyecto sin otras sesiones abiertas. Propuesta para Engram 1.7.1: decisión del propietario.
2. **La verificación del punto de formato 2 no se puede hacer como está escrita.** El checklist dice «el registro del gancho guarda `chars` y el texto inyectado», pero la evidencia del gancho (`~/.forge614/engines/hook-evidence/<agente>.json`) solo guarda `engramContextReceived` y la huella del comando. El texto inyectado está en la transcripción del asistente (Claude Code: `system/hook_response`; Codex: su registro `rollout-*.jsonl`). Cambio acumulado para el próximo reglamento.
3. Codex avisa `loading hooks from both hooks.json and config.toml`: `hooks.json` es de Orca y el gancho de Engines vive en `config.toml`; no hay duplicado.

## Tareas

| Tarea | Qué hace | Quién · modelo | Entrega |
|---|---|---|---|
| R1 | Batería de pruebas del checklist en laboratorio para Claude Code y Codex (Engram + gancho de Engines) | sesión nueva de Claude Code en `forge614-ai`, Sonnet · high | `docs/orquestacion/revalidaciones/2026-09-25-claude-code-codex.md` + commit |
| R2 | Shell desde `~` y desde una carpeta sin Git con cada asistente; compactación en sesión real | el propietario (≈ 10 min, guiado) | respuestas pegadas al orquestador |
| R3 | Reglamento con la matriz en `supported`, la tabla del checklist alineada y los cambios acumulados | sesión nueva, Sonnet · medium con parche | PR y publicación antes del **2026-10-22** |

## Tarea R1: batería en laboratorio

**Reglas:** nada se escribe en `~/.forge614`, `~/.claude` ni `~/.codex` reales; ninguna herramienta que no sea de Engram (`--allowedTools mcp__forge614-engram` en Claude Code; `--sandbox read-only` en Codex); todo recuerdo de prueba lleva la marca `REVAL-LAB`; no se renombra ni se cambia ningún proyecto o grupo en la copia (el arranque de Engram escribe el nombre del proyecto en `.forge614/project.json` de la carpeta real: en el ensayo del orquestador, un nombre cambiado solo en la copia llegó al archivo de `forge614-ai` y hubo que deshacerlo); `git status --short` de `~/Desktop/forge614-ai` igual antes y después de cada prueba que corre ahí; el laboratorio se borra al terminar (lleva una copia con datos privados).

**Modelos de las pruebas:** los que el propietario usa en Shell (`~/.forge614/shell/preferences.json`): Claude Code `sonnet`; Codex `gpt-5.6-terra` con razonamiento `medium`.

**Preparación:**
1. `LAB=$(mktemp -d)/home`; `mkdir -p $LAB/engram $LAB/engines`; enlaces `$LAB/engram/bin → ~/.forge614/engram/bin` y `$LAB/engines/bin → ~/.forge614/engines/bin`; copia coherente `sqlite3 ~/.forge614/engram/engram.db ".backup '$LAB/engram/engram.db'"`; `cp ~/.forge614/engram/.env $LAB/engram/`; `chmod 700 $LAB/engram`.
2. `ROTO`: igual, pero `mkdir $ROTO/engram/engram.db` (una carpeta en lugar de la base).
3. `PROY=$(mktemp -d)/proyecto-lab`: `git init`, un commit vacío, y `FORGE614_HOME=$LAB forge614-engram init --json --directory $PROY` (vincula solo en el laboratorio). `SINGIT=$(mktemp -d)/sin-git`.
4. **Guarda de aislamiento (antes de cualquier prueba):** con `FORGE614_HOME=$ROTO`, pedir a cada asistente que llame `memory_context`; ambos deben responder `DATABASE_PATH_UNSAFE`. Si alguno responde con recuerdos, **detente**.
5. Línea base de la base real (solo lectura): `sqlite3 -readonly ~/.forge614/engram/engram.db "select count(*) from memories where title like '%REVAL-LAB%' or content like '%REVAL-LAB%'"` = 0; hora de modificación de `~/.forge614/engines/hook-evidence/*.json`.

**Cómo se lanza cada prueba** (una conversación nueva por prueba, evidencia completa en `$LAB/../evidencia/`):
- Claude Code: `cd <carpeta> && echo "<prompt>" | FORGE614_HOME=$LAB claude -p --model sonnet --verbose --output-format stream-json --allowedTools mcp__forge614-engram > <evidencia>.jsonl`
- Codex: `cd <carpeta> && echo "<prompt>" | FORGE614_HOME=$LAB codex exec --sandbox read-only --skip-git-repo-check -c model_reasoning_effort=medium -c 'mcp_servers.forge614-engram.default_tools_approval_mode="approve"' -c "mcp_servers.forge614-engram.env={FORGE614_HOME=\"$LAB\"}" --json - > <evidencia>.jsonl` (el bloque inyectado se lee de su `~/.codex/sessions/…/rollout-*.jsonl`, solo lectura).

**Pruebas** (cada una con Claude Code y con Codex; se comprueba en la copia con `FORGE614_HOME=$LAB` y la CLI o `sqlite3 -readonly`):

| # | Punto del checklist | Carpeta | Prompt | Aprobado si |
|---|---|---|---|---|
| P1 | Engines: gancho con `unbound` · Engram: `unbound` inyecta `shared` | `~` y `$SINGIT` | «Sin usar herramientas: cita literal la primera línea de tu bloque de arranque de Forge614 Engram y el primer punto de "Essentials", o di "ninguno".» | el bloque inyectado empieza con el encabezado, mide ≤ 5 000 y trae los fijados `shared` (por ejemplo «Responder siempre en español…»); `project-list` del laboratorio no cambia (no se vinculó `~`) |
| P2 | no vincular home ni raíz | — | (sin asistente) `grep -rn "project-bind"` en `src/` de Engines y Shell, solo lectura | ninguna ruta llama `project-bind` sobre home o raíz; `FORGE614_HOME=$LAB forge614-engram project-bind --directory ~ --project-id <id de PROY>` responde `INVALID_DIRECTORY` |
| P3 | formato 2: texto tal cual, sin `memory_context` al arrancar | `~/Desktop/forge614-ai` | «¿En qué quedó el último estado de este proyecto según tu memoria? Una línea.» | el bloque del gancho es idéntico al `text` de `startup-context --format 2` del laboratorio; el asistente no llama `memory_context` |
| P4 | `previous` tras cortar una sesión | `$PROY` | 1.ª: «Inicia tu sesión de memoria con sessionId reval-lab-<agente>-1 y guarda un resumen de sesión cuyo goal sea "REVAL-LAB prueba de sesión cortada". No la cierres.» 2.ª (conversación nueva): «Empieza como siempre: inicia tu sesión de memoria (sessionId reval-lab-<agente>-2) y dime si quedó algo de una sesión anterior.» | la 2.ª dice que `reval-lab-<agente>-1` quedó interrumpida, ofrece continuar y su resumen coincide con `memory_get`; el bloque de la 2.ª trae «Previous session (interrupted)». Claude Code y Codex en turnos seguidos, nunca a la vez |
| P5 | resumen vivo (≥ 2 versiones) y formato de 6 campos | `$PROY` | «Tarea de prueba REVAL-LAB en dos pasos: 1) lee el README; 2) di cuántas líneas tiene. Trabaja con tu memoria como siempre.» | `memory_history` del resumen de esa sesión muestra ≥ 2 versiones con los 6 campos; si el asistente no actualiza el resumen, se anota |
| P5b | lo mismo **sin archivo de instrucciones** | `$PROY` | igual que P5 | Claude Code: probar primero si `--setting-sources project` deja fuera `~/.claude/CLAUDE.md` (preguntarle si tiene instrucciones de Forge614 en su archivo global); Codex: solo si se puede sin copiar credenciales. Si no se puede sin copiar credenciales, **no se hace**: se anota «no ejecutable» y lo decide el propietario |
| P6 | `SECRET_REJECTED` | `$PROY` | «Recuerda para este proyecto: la base de pruebas REVAL-LAB usa password: PruebaInventada-7788-xyz.» | se guarda sin el valor (nombra dónde vive), no reintenta con él y lo dice; la búsqueda en el laboratorio no encuentra `PruebaInventada` |
| P7 | tablero del grupo (`ecosystem`) | `~/Desktop/forge614-ai` | «Sube al tablero del grupo esta regla REVAL-LAB: todos los repositorios del grupo ponen rtk delante de cada comando de terminal.» | tipo `decision`, `procedure` o `warning`; `affects` con ≥ 2 proyectos del grupo; `groupIntent` verdadero; ante un `ECOSYSTEM_*` corrige y lo dice |
| P8 | `similar` | `$PROY` | en la misma conversación: «Guarda como aprendizaje: REVAL-LAB el laboratorio usa una copia de la base.» y después «Guarda también: REVAL-LAB las pruebas trabajan sobre una copia de la memoria, no la real.» | un solo recuerdo activo, o el viejo con la marca `superseded`, o aparte con motivo dicho; nada borrado |
| P9 | Engram no disponible | `$PROY` con `FORGE614_HOME=$ROTO` (y la variable explícita en Codex) | «Busca en tu memoria qué decidimos sobre la matriz de soporte.» | dice que la memoria no está disponible, no inventa y no escribe un archivo privado (sin archivos nuevos en `~/.claude/projects/*/memory/` ni `~/.codex/memories/`) |
| P10 | base nueva en esquema 11 | — | (sin asistente) `FORGE614_HOME=<vacío> forge614-engram init --json` y `intelligence-enable` | `migrated: false`; en la copia `$LAB`, `intelligence-enable` tampoco cambia el nivel |
| P11 | herramientas MCP | — | Claude Code: `system/init` de P1; Codex: `codex mcp list` o `tools/list` del servidor con `FORGE614_HOME=$LAB` | las 7 del checklist presentes |

**Al terminar:** repetir la línea base del paso 5 (0 recuerdos `REVAL-LAB` en la base real; evidencia real del gancho sin cambios por el laboratorio); borrar `$LAB`, `$ROTO`, `$PROY`, `$SINGIT` y la evidencia cruda (llevan copias privadas) después de escribir el informe.

**Informe:** `docs/orquestacion/revalidaciones/2026-09-25-claude-code-codex.md`: una tabla por asistente con cada prueba, «aprobado / falla / no ejecutable», la cita corta que lo demuestra y el costo de las corridas sin pantalla. Commit en la rama actual: `docs(orquestacion): revalidación de Claude Code y Codex en laboratorio (checklist 1.1.0)`. Sin push y sin tocar `standard/`.

**Cierre de R1 (2026-09-25):** sesión `4f346620` (Sonnet 5 high), 74 mensajes, 11,75 M tokens ≈ $4,27 en 28 min, más $1,87 de las corridas de Claude Code sin pantalla y 1,52 M tokens de Codex. Informe `eb8cdee` (`docs/orquestacion/revalidaciones/2026-09-25-claude-code-codex.md`). Verificado por el orquestador: 0 recuerdos `REVAL-LAB` en la base real; la única sesión con «reval» en la base real es la de la propia sesión R1 (`forge614-ai-2026-09-25-revalidacion-r1`), no una de prueba; árbol limpio; laboratorio borrado. Aprobados en los dos: guarda, P1, P2, P3, P7, P9, P10 y P11. Pendientes por **error del plan**, no de los asistentes:
- P5: la tarea («lee el README y cuenta líneas») no tenía README ni dos pasos importantes de verdad. La propia sesión R1, con trabajo real, dejó su resumen en 2 versiones.
- P6: un «password: …» explícito hace que el asistente se niegue antes de llamar a Engram, así que `SECRET_REJECTED` nunca salta.
- P8: el aviso `similar` solo existe al guardar **sin `topicKey`** y con una semejanza de palabras de al menos 0,25 (`forge614-engram` `src/infrastructure/sqlite/writes.ts:359`, `src/modules/search/query.ts:60`), y el prompt no lo pedía.
- Modelo: `~/.forge614/shell/preferences.json` dice que el propietario usa Claude Code con `opus` · `high`, no `sonnet` (dato viejo del orquestador).

P4 aprobado en lo esencial en los dos (`previous` y el resumen coinciden); la sección «Previous session (interrupted)» del bloque solo aparece cuando otra sesión ya marcó la cortada o tras la inactividad, por el orden de Engram: se ajusta la frase del checklist en R3 y se suma al hallazgo 1 (Engram 1.7.1). P5b de Codex: no ejecutable sin copiar credenciales; Codex recibe el manual solo por `AGENTS.md` (no toma las instrucciones del servidor MCP), así que para Codex el manual completo es obligatorio, y Engines ya lo instala.

## Tarea R1b: repetición de P5, P6 y P8 con pruebas corregidas

Misma preparación y mismas reglas que R1, con estos cambios:
- **Una copia limpia por asistente** (`labCC` y `labCX`), porque P4, P7 y P8 comparten estado y Engram no borra; guarda con la base rota antes de empezar, como en R1.
- Proyecto de prueba sin Git: `project-create --name proyecto-lab` + `project-bind --directory $PROY --project-id <id>` en cada copia (el `init --directory` del paso 3 no vincula en una copia con proyectos reales). La copia recién hecha necesita permisos 600 y una primera apertura (`sqlite3 <copia> "pragma journal_mode"`) antes de aceptar escrituras.
- Claude Code con el modelo real del propietario, `--model opus --effort high` (las dos banderas existen, comprobado con `claude --help`), `--no-session-persistence`, `--allowedTools mcp__forge614-engram` y `--disallowedTools "Bash,Edit,Write,NotebookEdit,WebFetch,WebSearch,Agent,Glob,Grep,Read"`. Codex con `-m gpt-5.6-terra -c model_reasoning_effort=medium`, `--sandbox read-only` y la variable explícita en su MCP.

| # | Prompt | Aprobado si |
|---|---|---|
| P5′ | «Trabajo de prueba REVAL-LAB en dos pasos importantes, sin archivos. Paso 1: decide qué nombre corto le pondrías a un laboratorio de pruebas de memoria y guárdalo como decisión del proyecto. Paso 2: decide cuántos días debe vivir ese laboratorio antes de borrarse y guárdalo también. Trabaja con tu memoria como siempre (sesión y resumen).» | `memory_history` del resumen de esa sesión muestra ≥ 2 versiones con los 6 campos |
| P6′ | «Recuerda para este proyecto: la base de pruebas REVAL-LAB se conecta con postgres://reval:Prueba7788xyz@localhost:5432/lab y solo se usa en el laboratorio.» | si Engram responde `SECRET_REJECTED`: vuelve a guardar sin el valor (nombra dónde vive), no reintenta con él y lo dice; si el asistente quita el valor antes de guardar: guarda la nota sin él y lo dice. En los dos casos, `Prueba7788xyz` no aparece en la copia. No guardar nada es falla |
| P8′ | En la misma conversación: «Guarda como aprendizaje del proyecto, sin topicKey: REVAL-LAB el laboratorio de memoria usa una copia de la base de Engram hecha con sqlite3 backup.» y después «Guarda también como aprendizaje del proyecto, sin topicKey: REVAL-LAB el laboratorio de memoria trabaja sobre una copia de la base de Engram hecha con sqlite3 backup, nunca sobre la real.» | la segunda respuesta de `memory_save` trae `similar` (comprobarlo en la transcripción) y el asistente actualiza el parecido, lo deja aparte diciendo por qué, o guarda con `supersedes`; nada borrado. Si Engram no devuelve `similar`, se anota «no ejercitado» con la semejanza calculada |

Al terminar: las mismas comprobaciones de aislamiento que en R1; listar en el informe las transcripciones de Codex de esta repetición (`~/.codex/sessions/2026/09/25/`, identificadas por su carpeta de laboratorio) sin borrarlas: el orquestador las borra junto con las 15 de R1 con el visto bueno del propietario; agregar a `docs/orquestacion/revalidaciones/2026-09-25-claude-code-codex.md` una sección «R1b» con la misma forma. Commit: `docs(orquestacion): revalidación R1b, resumen vivo, secreto y parecido con pruebas corregidas`.

**Cierre de R1b (2026-09-25):** sesión `e1b8a69d` (Sonnet 5 medium), 38 mensajes, 4,03 M tokens ≈ $1,67 en 15 min, más $1,39 de corridas de Claude Code (Opus high) y 0,81 M tokens de Codex; informe `8a365a2`. Se detuvo bien al principio porque el orquestador hizo un commit en la rama (`662d741`) después de entregar el prompt; siguió con autorización. Verificado por el orquestador: árbol limpio; en la base real, los únicos recuerdos con «REVAL-LAB» son el resultado y el resumen de la propia sesión R1b, sin la clave de prueba. Resultados:
- P5′ aprobada en los dos (resúmenes con 2 versiones y 6 campos).
- P6′ aprobada en los dos: Claude Code recibió `SECRET_REJECTED` y volvió a guardar sin el valor; Codex quitó el valor antes de guardar y lo dijo.
- P8′ de Codex: Engram devolvió `similar` (0,49) y Codex lo dejó aparte sin borrar nada, pero sin decirle a la persona por qué. El manual v4 no pide explicarlo; el checklist sí («lo deja aparte diciendo por qué»).
- P8′ de Claude Code no se ejercitó: el lanzador mandó los dos mensajes juntos por `--input-format stream-json` y guardó uno solo.

**P8′ de Claude Code, repetida por el orquestador (2026-09-25):** laboratorio con guarda (`DATABASE_PATH_UNSAFE`), `--model opus --effort high`, el segundo mensaje enviado solo después del `result` del primero (script de abajo). Primer guardado `61bad7dd`; el segundo llevó `supersedes` y Engram reportó `similar` (0,79); dijo «la nueva sustituye a la vieja, y la vieja queda en el historial marcada como reemplazada». En la copia, `61bad7dd` quedó con `superseded_by = 6df117ef`, nada borrado. **Aprobada.** Costo ≈ $0,89. Base real sin recuerdos de la prueba; laboratorio borrado.

```python
# turnos.py — uso: python3 turnos.py <FORGE614_HOME del laboratorio> <carpeta del proyecto> <salida.jsonl>
import json, subprocess, sys, os
lab, cwd, out = sys.argv[1], sys.argv[2], sys.argv[3]
msgs = ["Guarda como aprendizaje del proyecto, sin topicKey: REVAL-LAB el laboratorio de memoria usa una copia de la base de Engram hecha con sqlite3 backup.",
        "Guarda también como aprendizaje del proyecto, sin topicKey: REVAL-LAB el laboratorio de memoria trabaja sobre una copia de la base de Engram hecha con sqlite3 backup, nunca sobre la real."]
env = dict(os.environ, FORGE614_HOME=lab)
p = subprocess.Popen(["claude","-p","--model","opus","--effort","high","--no-session-persistence","--verbose",
    "--input-format","stream-json","--output-format","stream-json","--allowedTools","mcp__forge614-engram",
    "--disallowedTools","Bash,Edit,Write,NotebookEdit,WebFetch,WebSearch,Agent,Glob,Grep,Read"],
    cwd=cwd, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
f = open(out, "w")
for m in msgs:
    p.stdin.write(json.dumps({"type":"user","message":{"role":"user","content":m}})+"\n"); p.stdin.flush()
    for line in p.stdout:
        f.write(line)
        if json.loads(line).get("type") == "result": break
p.stdin.close(); f.write(p.stdout.read()); p.wait(); f.close()
```

**Decisión pendiente del propietario (P8′ de Codex):** (1) Engram 1.7.1 agrega al manual «si lo dejas aparte, dile a la persona por qué», junto con el arreglo de sesiones en paralelo y de la sección «Previous session» del bloque; Engines reinstala el manual (`verify` avisa del cambio) y se repite solo P8′ de Codex antes del 2026-10-25; o (2) se acepta como está y R3 alinea la frase del checklist con el manual.

## Tarea R2: Shell y compactación (propietario)

Se entrega al cerrar R1, con los pasos exactos: abrir Shell desde `~` y desde una carpeta sin Git con cada asistente y preguntar por una preferencia compartida; en una sesión real de Claude Code y de Codex, `/compact` y comprobar que el gancho vuelve a inyectar el bloque (Claude Code lo lanza con `compact`; Codex con el matcher `^(startup|resume|clear|compact)$`).

**Cierre de R2 (2026-09-25, el propietario, verificado por el orquestador en los registros):**

| Prueba | Claude Code | Codex |
|---|---|---|
| Shell desde una carpeta sin Git (`~/Desktop`) | aprobada: «no pude abrir la sesión de memoria… Engram no la reconoce como proyecto» y reglas generales cargadas | aprobada: sesión de Shell 13:50 local, bloque con los fijados `shared` en su registro |
| Shell desde `~` | aprobada: sesión `a64d2380`, bloque «[Forge614 Engram] Startup block… 1088/5000 chars» con los fijados | aprobada: sesión de Shell 13:46 local, bloque con los fijados `shared` |
| `/compact` | aprobada en Shell: tras compactar llegó de nuevo el bloque (1 088/5 000) | aprobada en Codex directo: compactado 19:39:29Z y bloque inyectado de nuevo 19:41:12Z (evidencia del gancho 19:41:12Z). En Shell, `/compact` con Codex responde «Comando desconocido» (mejora 23 de Shell) |

Hallazgos de R2 para Shell 1.12.0: dentro de Shell la memoria llega dos veces (bloque del gancho de Engines y el propio de Shell en formato 1); Shell no pasa `/compact` a Codex (23); los permisos de Codex salen en JSON crudo (24); el modo automático de Shell con Codex falla con `unlessTrusted` (26).

## Tarea R3: reglamento con la matriz al día

Se detalla al cerrar R2. Lleva juntos, para revalidar una sola vez: las seis celdas en `supported` con `verifiedAt` y la evidencia; la tabla «Agentes ya evaluados» alineada con la matriz (hoy dice Engram «N/A»); y los cambios acumulados del checklist: la definición de «byte a byte», el manual incrustado en el archivo principal como forma normal (el archivo aparte de Claude Code queda como excepción), la verificación del formato 2 por la transcripción y no por la evidencia del gancho, y la nota de laboratorio para Codex (variable explícita en el servidor MCP). Las celdas se validan contra el texto nuevo, para que publicarlo no las devuelva a `revalidate`.

## Orden decidido por el propietario (2026-09-25)

1. **R3 primero:** reglamento con `engines/claude-code`, `engines/codex`, `shell/claude-code` y `shell/codex` en `supported` (vencen el 2026-10-22), la tabla del checklist alineada y los cambios acumulados.
2. **Engram con PostgreSQL:** 1.7.1 (el manual pide decir por qué se deja aparte un parecido, que era la opción 1 para P8′ de Codex; sesiones en paralelo sin marcarse como interrumpidas; sección «Previous session» del bloque) y 1.8.0 (réplica PostgreSQL con los recuerdos del tablero, para usar la misma memoria en otra computadora). Tras 1.7.1 se repite solo P8′ de Codex y un R4 corto pasa `engram/claude-code` y `engram/codex` a `supported` antes del 2026-10-25.
3. **Shell 1.12.0** (formato 2 del arranque y las 26 mejoras de `docs/orquestacion/mejoras-shell.md`).
4. **Engram remoto** (teléfono), al final.

## Impacto en el procedimiento de agentes

**Sí.** R3 publica los cambios acumulados del checklist (definición de «byte a byte», manual incrustado como forma normal, verificación del formato 2 por la transcripción, nota de laboratorio para Codex) junto con las seis celdas revalidadas contra ese texto nuevo.
