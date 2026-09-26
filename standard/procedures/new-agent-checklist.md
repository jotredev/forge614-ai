> **Origen:** archivo del propietario del ecosistema (`FORGE614-NUEVO-AGENTE-CHECKLIST.md`), movido al centro del estándar el 2026-09-22 sin cambios de contenido.
> **Regla de admisión:** un agente nuevo entra al ecosistema solo si cumple todos los requisitos obligatorios de todos los nodos; si le falta algo o pierde funcionalidad, no entra.

# Checklist maestro — Agregar un agente de IA nuevo al ecosistema Forge614

> **Qué es este archivo:** cuando aparece un agente de IA nuevo (ej. OpenCode, o cualquier otro CLI de IA
> que salga en el futuro) y se quiere que el ecosistema Forge614 lo soporte, cada nodo tiene sus propias
> validaciones que hacer — **cada uno investiga solo lo que a él le corresponde, nunca lo del otro.**
> Este archivo se va llenando con lo aprendido cada vez que se agrega un agente nuevo, para no repetir
> el mismo trabajo de investigación ni los mismos errores dos veces.
>
> **Regla de oro:** ningún nodo debe intentar resolver la parte de otro nodo. Si `forge614-workers`
> descubre algo que en realidad le corresponde a `forge614-engines`, se anota en la sección de Engines
> y se le pasa como pendiente — no se implementa cruzado.

---

> **Procedimiento paso a paso:** el orden exacto de pasos, nodos, archivos a tocar y puertas de admisión
> está en [`add-agent-runbook.md`](add-agent-runbook.md). Este archivo es el catálogo de validaciones por
> nodo que ese procedimiento consulta.

## Cómo usar este archivo

> **Paso a paso, en orden y con puertas de salida:** [`add-agent-runbook.md`](add-agent-runbook.md). Este
> archivo es la checklist detallada por nodo; el runbook dice en qué orden se ejecuta, qué se toca en cada
> repo, qué prueba cierra cada paso y cómo se actualiza la matriz de soporte al final.

1. Cuando alguien quiera agregar soporte para un agente nuevo, cada nodo relevante (Engines, Workers,
   Atlas, Engram, Shell) revisa **su propia sección de esta guía** y sigue esa checklist para ese agente.
2. Al terminar la investigación/implementación, se agrega una fila a la tabla de "Agentes ya evaluados"
   al final de este archivo, con el resultado de cada nodo.
3. Si algún nodo descubre una validación nueva que no estaba contemplada aquí, se agrega a la checklist
   general de ese nodo (no solo a la fila del agente actual) — así el próximo agente que se agregue ya
   se beneficia de esa lección.

---

## `forge614-engines` — el especialista en motores

*(Esta sección la debe llenar una sesión trabajando directamente dentro del repo `forge614-engines`,
con su propio conocimiento real del código de ese repo. No se completa desde fuera ni por inferencia
de otro nodo.)*

Su trabajo: exponer el CLI del agente candidato como un `AgentAdapter` (`src/modules/agents/types.ts`)
registrado en `AgentRegistry` (`src/modules/agents/registry.ts`). No decide qué modelo/nivel usar en
cada tarea (eso es de Atlas) ni cómo se aísla o lanza el proceso (eso es de Workers) — solo construye
el comando correcto y declara con precisión qué soporta el CLI y qué no.

**Detección headless (verificar siempre contra el binario instalado, nunca solo contra su doc):**

- [ ] ¿El CLI candidato tiene un modo headless/no interactivo real (`--help`, `exec --help`, etc.)?
      Si sí, `capabilities.supportsHeadlessExec = true` y hay que implementar `headlessCommand()`.
      Si no, se deja `false` y **no** se implementa `headlessCommand` — mismo patrón que el adapter
      de Cursor (`src/infrastructure/agents/cursor.ts`), que no tiene esa función.
- [ ] ¿Cómo recibe el prompt en modo headless: como argumento posicional, o puede leerlo por stdin?
      Confirmarlo ejecutando el binario real (ej. `echo "..." | <cmd> <flag>`), como ya se hizo con
      Claude Code (`-p` sin prompt posicional lee de stdin) y Codex (`exec` sin `PROMPT` posicional lee
      de stdin). Si el CLI **no** tiene forma de leer el prompt por stdin, el adapter debe lanzar un
      error explícito cuando `opts.stdinPrompt` venga en `true` — nunca dejar el prompt silenciosamente
      en `args` (eso lo expondría completo a `ps`). Mismo patrón defensivo que
      `ReasoningLevelUnsupportedError`.
- [ ] ¿Qué flag exacto usa para elegir modelo (`--model`, u otro)? Confirmar la sintaxis contra el
      binario real, no contra la doc — el comportamiento real de un CLI puede no estar bien documentado
      (así pasó con el modo stdin de Codex).
- [ ] ¿Soporta nivel de razonamiento configurable en modo headless? Si sí, documentar el flag/sintaxis
      exacta (Codex no usa un flag directo: usa `-c model_reasoning_effort=<level>`). Si no, el
      `headlessCommand()` debe lanzar `ReasoningLevelUnsupportedError` cuando `opts.reasoningLevel` esté
      presente — nunca ignorarlo en silencio (así lo hace Claude Code, que no tiene flag público y
      estable para esto).
- [ ] ¿El CLI candidato tiene algún flag para dar acceso de lectura a una carpeta adicional del proyecto
      sin romper el aislamiento normal (equivalente a `--add-dir`)? Ya existe el mecanismo genérico para
      esto: `HeadlessOptions.readableDir` (`src/modules/agents/types.ts`), expuesto públicamente como
      `--readable-dir <ruta>` en el CLI (`src/interfaces/cli/main.ts`) — el adapter nuevo solo debe
      mapearlo al flag real de su binario dentro de `headlessCommand()`, igual que ya hacen
      `claude-code.ts` y `codex.ts`. Si el flag real es variádico (acepta varias rutas seguidas, como
      `--add-dir`), colocarlo **siempre antes** del prompt/`-p` — después se comería el texto del prompt
      como si fuera otra ruta. Confirmar con el binario real si, al explorar esa carpeta por su cuenta,
      el agente carga y se deja influenciar por algún archivo de instrucciones de ahí (`CLAUDE.md`,
      `AGENTS.md`, etc.); si lo hace y el CLI no tiene forma más fina de restringirlo (como pasa con
      Codex, que no tiene equivalente a `--allowedTools`), no intentar resolverlo — alcanza con
      documentarlo como limitación aceptada y de bajo riesgo (mientras el sandbox por defecto siga siendo
      de solo lectura).

**Registro del agente en el código:**

- [ ] Agregar el id nuevo al union type `AgentId` en `src/modules/agents/types.ts` (única fuente de
      verdad del tipo — hoy es `"claude-code" | "codex" | "cursor"`).
- [ ] Crear `src/infrastructure/agents/<agente>.ts` implementando `AgentAdapter` completo:
      - `capabilities` (`supportsMcp`, `supportsHooks`, `supportsHeadlessExec`) con los valores reales
        confirmados arriba.
      - `configFormat`: si el agente usa un formato distinto a `"json"`/`"toml"` (ej. YAML), hay que
        extender primero el tipo `ConfigFormat` — no forzarlo a uno existente que no aplica.
      - `mcpEntryPath` + `mcpEntryShape`: solo si `supportsMcp` es `true`. Confirmar contra el archivo
        de config real del agente dónde vive el bloque de servidores MCP y qué forma espera cada
        entrada.
      - `candidateExecutableNames(platform)` y `knownInstallPaths(platform, home)`: rutas reales de
        instalación verificadas con el CLI instalado en al menos una plataforma, no inventadas.
      - `configDir(home)` / `configFile(home)`: rutas reales de configuración del agente.
      - `instructions` (opcional): solo si el agente tiene un mecanismo de archivo estable y
        oficialmente soportado para cargar instrucciones globales en cada sesión nueva. Si no lo tiene
        documentado y estable (como Cursor, cuyas "User Rules" solo se configuran desde su UI), se deja
        sin definir — no inventar un archivo que no está garantizado.
- [ ] Registrar el adapter nuevo en `buildDefaultRegistry()` (`src/app/default-registry.ts`).
- [ ] Confirmar que pasa `validateCapabilityManifest` (se corre automáticamente al `register()`): si
      `supportsHeadlessExec` es `true` debe existir `headlessCommand()`, y si `supportsMcp` es `true`
      `mcpEntryPath` no puede estar vacío.

**Pruebas y verificación:**

- [ ] Agregar tests unitarios del adapter nuevo (paralelos a `claude-code.test.ts` / `codex.test.ts` /
      `cursor.test.ts`), cubriendo `headlessCommand()` con y sin `stdinPrompt`, y con y sin
      `reasoningLevel`.
- [ ] Confirmar que `agents list` y `capabilities --agent <id>` (comandos CLI genéricos sobre el
      registry, en `src/interfaces/cli/commands.ts`) exponen el agente nuevo sin cambios adicionales de
      código — si no aparece automáticamente ahí, algo quedó mal registrado.
- [ ] Si el agente declara `instructions`, correr `verify memory-integration` (`runVerifyMemoryIntegration`
      / `verifyMemoryIntegration`) contra una instalación real, para confirmar que el bloque
      administrado de memoria se escribe y se detecta correctamente con el formato real de archivo de
      ese agente. La forma normal es el manual incrustado en el archivo principal de instrucciones del
      agente, entre sus marcadores (desde Engines 1.13.0 también en Claude Code, `~/.claude/CLAUDE.md`,
      como ya hacía Codex en `~/.codex/AGENTS.md`); primary file + `contentFile` satélite queda como
      excepción, solo si el agente no admite el bloque incrustado.

**Integración automática de memoria vía SessionStart hooks (ya implementada para Claude Code y Codex —
usar esto como referencia al agregar el hook de un agente nuevo):**

- [ ] Confirmar si el CLI candidato tiene algún mecanismo de hook real al inicio de sesión (no asumir por
      similitud con otro agente). Verificarlo con el CLI instalado, no solo con su doc — la creencia
      inicial de que Codex **no** podía emitir `additionalContext` desde su SessionStart hook resultó
      falsa; solo se confirmó correcta al leer el hilo completo del issue oficial (no solo el reporte de
      apertura). El formato real que Codex sí soporta es anidado:
      `hookSpecificOutput.additionalContext` (no un campo plano). Claude Code, en cambio, no necesita
      matcher explícito (omitir `matcher` ya hace match-all); Codex sí requiere uno explícito
      (`^(startup|resume|clear|compact)$` en `~/.codex/config.toml`) y requiere confianza interactiva del
      usuario vía `/hooks` antes de ejecutarse.
- [ ] El hook debe delegar la carga real de memoria a `forge614-engram startup-context --directory <ruta>
      --json` (comando público, no interactivo, de solo lectura) — nunca importar nada interno de Engram
      ni reimplementar su lógica de precarga.
- [ ] **Revalidación 2026-09-22:** `startup-context` ahora devuelve `project.status: "unbound"` (éxito) en
      carpetas legibles no vinculables (home, raíz, sin Git, Git sin vínculo) en vez de `INVALID_DIRECTORY`.
      Confirmar que el runtime del hook (`src/app/run-memory-hook.ts`) inyecta `shared` también en ese caso
      y no descarta la respuesta por no venir `bound`; probar el hook con `cwd` = `~`. Aplica a Claude Code
      y Codex (ya soportados): sus celdas de Engines quedan en `revalidar` hasta que se ejecute esta prueba.
      **Ejecutada el 2026-09-25** con Claude Code y Codex (gancho desde `~` y desde una carpeta sin Git,
      formato 2 del bloque): celdas de Engines en `supported`.
- [ ] **Nunca afirmar "el host realmente consumió el contexto"** — eso no es verificable desde Engines.
      Usar nombres honestos como `runtime-observed`, que significan únicamente "el runtime propio de
      Engines fue invocado con un payload con forma de SessionStart y Engram devolvió contexto" —
      explícitamente **no** es prueba de que el cliente lo haya consumido. Ver
      `src/app/hook-runtime-status.ts` (tipo `HookRuntimeStatus`:
      `unsupported | absent | needs-user-trust | pending-runtime-verification | runtime-observed`) frente
      al tipo estructural `HookComponentStatus` (`unsupported | noop | write | blocked`,
      `src/modules/config-writer/types.ts`) — son cosas distintas a propósito: uno es "¿el archivo de
      config tiene el hook escrito?", el otro es "¿hay evidencia real de que corrió?". Un plan/verify que
      solo mire el primero puede reportar "completo" para un hook recién instalado que nunca se ejecutó
      — ese fue un bug real encontrado en review; el arreglo fue unificar `planMemoryInstall` y
      `verifyMemoryIntegration` sobre la misma función compartida (`computeHookRuntimeStatus`) en vez de
      que cada uno calculara el estado por su cuenta.
- [ ] La evidencia de ejecución (`src/app/hook-evidence.ts`, `recordHookEvidence`/`readHookEvidence`,
      guardada en `~/.forge614/engines/hook-evidence/<agente>.json`) debe expirar — no quedarse como
      "verificado" para siempre. Constante ya usada: `HOOK_EVIDENCE_MAX_AGE_MS = 7 días`, con
      `CLOCK_SKEW_TOLERANCE_MS = 5 minutos` de tolerancia para relojes desincronizados.
- [ ] Solo registrar evidencia cuando la invocación es inequívocamente un SessionStart real: exigir
      `hook_event_name === "SessionStart"` exacto y un `cwd` no vacío en el payload
      (`recognizedInvocation` en `src/app/run-memory-hook.ts`) — nunca grabar evidencia ante cualquier
      invocación del runtime sin verificar la forma del payload.

---

## `forge614-workers` — el ejecutor

Su trabajo: ejecutar el proceso real del agente ya resuelto por Engines, aislado por tarea. No le
importa qué modelo/nivel de razonamiento usar (eso es de Atlas) ni cómo se construye el comando del
sistema operativo (eso es de Engines) — solo cómo correrlo de forma segura y detectar cuándo se le
acabó la cuota. El runbook completo y accionable vive en `docs/adding-a-new-engine-adapter.md` dentro
de este repo; esta checklist es el resumen de validaciones que ese runbook exige, con las lecciones
reales ya aprendidas del aislamiento de autenticación (con Claude Code y Codex).

**Validaciones a investigar para un agente nuevo:**

- [ ] Confirmar con `forge614-engines agents list` que el agente tiene `supportsHeadlessExec: true`.
      Si es `false`, Workers no necesita adapter — nunca podrá invocarlo headless (caso ya visto con
      Cursor).
- [ ] Detectar el patrón real de "cuota/sesión agotada" de este motor **forzando un error real** con
      el CLI instalado (nunca inventar o adivinar el texto). Anotar el patrón exacto y si aparece en
      `stderr`, en el inicio de `stdout`, o en ambos. Implementar `detectQuotaExhausted` en el adapter
      nuevo con ese patrón, y agregar tests con fixtures tanto del caso real de cuota agotada como de
      un error genérico no relacionado (para evitar falsos positivos).
      **Nota honesta:** los patrones que hoy trae el repo para Claude Code
      (`"Claude AI usage limit reached"`) y Codex (`"usage limit"`, `"rate limit"`) **no se confirmaron
      así** — son best-guesses documentados con un comentario propio en el código
      (`src/adapters/claude-code.ts`, `src/adapters/codex.ts`) que pide reconfirmarlos contra el CLI
      real antes de depender de ellos en producción. No están corregidos todavía; quien toque este
      archivo de nuevo debería considerar cerrarlo también para los dos motores ya existentes, no solo
      para el agente nuevo que esté agregando.
- [ ] Verificar con una **sesión real ya autenticada** de este CLI (nunca asumir por similitud con
      Claude Code o Codex) que la autenticación por suscripción sobrevive cuando Workers aísla
      únicamente el directorio de trabajo (`cwd`) y deja `HOME`/variables de entorno reales sin tocar.
      Esto ya rompió una vez en el diseño original (con Claude Code y Codex, cuando se aislaba `HOME`)
      y costó una investigación completa arreglarlo — no repetir el error de asumir que funciona igual
      para un motor nuevo. Si la autenticación falla, investigarlo como su propio problema antes de
      seguir — nunca implementar un mecanismo que dependa de extraer o mover credenciales de un
      almacén no documentado (Keychain, etc.) sin confirmar primero, con evidencia real, que es
      necesario y viable.
- [ ] Confirmar si el CLI rechaza correr en directorios que no reconoce como confiables (como hace
      Codex, que exige un repo git de confianza). Si es así, encontrar el flag exacto que lo evita
      (para Codex es `--skip-git-repo-check`) y agregarlo en el `extraArgs()` del adapter nuevo — nunca
      asumir que no hace falta ningún flag sin probarlo con una invocación real en un directorio
      temporal vacío.
- [ ] Confirmar si el CLI necesita alguna variable de entorno adicional más allá de la herencia
      completa del entorno real (que ya es el comportamiento por defecto de Workers desde el rediseño
      de aislamiento — `HOME`/`CODEX_HOME`/todo lo demás se hereda intacto). Debería ser poco común,
      pero no asumirlo sin verificar.
- [ ] Confirmar que el timeout con escalada `SIGTERM`→`SIGKILL` mata correctamente el proceso de este
      CLI (algunos CLIs lanzan procesos hijos o subshells que no siempre mueren limpio con `SIGTERM`).
- [ ] Registrar el adapter nuevo en `src/adapters/registry.ts` y correr `bun test` — el test de
      completitud del registro (`src/adapters/registry.completeness.test.ts`, que corre contra el
      binario real de `forge614-engines`) debe pasar sin necesitar cambios adicionales.
- [ ] Actualizar la fila correspondiente en la tabla "Agentes ya evaluados" al final de este archivo
      con el resultado de Workers para este agente (✅/❌ y notas relevantes, siguiendo el formato ya
      usado para Claude Code y Codex).

---

## `forge614-atlas` — el orquestador/decisor

Su trabajo: decidir qué analizar, con qué nivel de profundidad, y qué modelo/motor asignar a cada
tarea. No le importa cómo se invoca el motor por dentro (eso es de Engines) ni cómo se aísla el
proceso (eso es de Workers).

**Validaciones a investigar para un agente nuevo:**

- [ ] ¿Qué modelo(s) de este agente corresponden a cada nivel de la tabla ya fija de Atlas
      (Ligero / Estándar / Profundo)? Agregar la fila correspondiente a la tabla de
      "Modelo/razonamiento por nivel" en `STATE.md`.
- [ ] ¿Este agente soporta nivel de razonamiento configurable? Si no, dejar anotado que Atlas **nunca**
      debe pedirle `--reasoning-level` a este agente al armar una tarea — debe consultar
      `capabilities`/`agents list` de Engines antes de construir la tarea, igual que ya hace para
      Claude Code.
- [ ] Confirmar que el flujo de selección de motor (Shell, cuando hay ambigüedad) puede mostrar este
      agente nuevo como opción sin cambios adicionales de código en Atlas.

---

## `forge614-engram` — la memoria

**Decisión:** agregar un agente nuevo **no requiere cambiar Engram** mientras su integración use el
protocolo público `forge614-engram-memory` (versión 1 por defecto; la 3 desde Engram 1.6.0 anuncia el
ámbito `ecosystem`; la 4 desde 1.7.0 es el manual de la memoria inteligente) y convierta la información
del agente al formato canónico de Engram. Engines es quien adapta al agente; Engram no debe recibir plugins, reglas o formatos
especiales por agente.

**Novedad (Engram v1.5.0): precarga desde el host, sin depender del modelo.** Engram ahora expone
`forge614-engram startup-context --directory <ruta-absoluta> --json`, un comando público, no interactivo
y de solo lectura pensado para que el *host* (Engines o Shell, no el agente) precargue `shared` + el
contexto del proyecto vinculado **antes** de iniciar la sesión — sin depender de que el modelo decida
llamar `memory_context` (el bug de confiabilidad original). No crea proyectos, vínculos, recuerdos ni
bases; una carpeta no vinculada no es un error (`project.status: "unbound"`). Esto es **opcional**: la
integración vía protocolo v1 (el agente llamando `memory_context` por su cuenta) sigue siendo válida y
suficiente por sí sola, y no cambió. `forge614-engram memory-protocol --json` ahora también acepta
`--protocol-version 2`, que añade el campo `startupContext` anunciando este comando a Engines/Shell; la
versión 1 (`instructions`/`lifecycle` que ya consumen los agentes) permanece byte-idéntica.

**Novedad (Engram, release posterior a v1.5.0, 2026-09-22): `startup-context` en carpetas no vinculadas.**
`forge614-engram startup-context --directory <ruta> --json` ya **no falla** cuando la carpeta existe y es
legible pero no puede vincularse como proyecto (home, raíz, carpeta sin Git, Git sin vínculo, Git no
inspeccionable): devuelve `format: 1`, `shared` completo y `project: { "status": "unbound" }`. Solo falla
(`INVALID_DIRECTORY`, stderr, exit 1) si la ruta no existe, no es directorio o no se puede leer. La guarda
que prohíbe **vincular** home y raíz se conserva aparte (`readableDirectory` vs `bindableProjectDirectory`).
Consecuencia para todo host: `unbound` es un resultado de éxito, no un error, y la memoria `shared` debe
inyectarse igual. Antes de esta corrección, Shell abierto desde `~` arrancaba sin memoria compartida.

- [ ] Confirmar que la integración de arranque del agente nuevo (gancho de Engines, sesión de Shell o
      instrucción de protocolo) trata `project.status: "unbound"` como éxito e inyecta `shared`; probarlo
      con una sesión real abierta desde `~` y desde una carpeta sin Git, verificando que una preferencia
      shared conocida (p. ej. `user/preference/favorite-color`) aparece en el contexto inicial.
- [ ] Confirmar que ninguna ruta del agente intenta vincular (`project-bind`) home o raíz apoyándose en que
      `startup-context` ya no falla ahí: vincular sigue prohibido y debe seguir devolviendo
      `INVALID_DIRECTORY`.

- [ ] Si el agente nuevo no tiene un mecanismo confiable para llamar `memory_context` al inicio (o si el
      host prefiere no depender de esa decisión del modelo), evaluar usar `startup-context` desde el lado
      de Engines/Shell para precargar memoria antes de lanzar la sesión e inyectarla en el contexto
      inicial. **Esto se implementa en Engines/Shell, no en Engram** — Engram solo expone la interfaz de
      lectura. **Ya implementado en Engines para Claude Code y Codex** vía SessionStart hooks — ver la
      checklist "Integración automática de memoria vía SessionStart hooks" en la sección de
      `forge614-engines` arriba antes de repetir esa investigación para un agente nuevo.
- [ ] Si el host (Engines o Shell) usa `startup-context --format 2` para el agente nuevo, verificar que
      inyecta `text` tal cual y como dato recuperado, sin reescribirlo; que el bloque mide ≤ 5 000
      caracteres y empieza con el encabezado de ocupación; y que con el bloque presente el agente no vuelve
      a llamar `memory_context` al arrancar (regla 2 del manual v4). La sección «Previous session
      (interrupted)» del bloque aparece cuando una sesión abierta del proyecto lleva más de 30 minutos sin
      actividad en Engram; el texto dice «was left open; its last activity was at» — el aviso inmediato lo
      da igual el campo `previous` de `memory_session_start`, con `sessionNotice` trayendo la misma frase
      desde Engram 1.7.2 (ver el punto de sesión que quedó abierta, más abajo). Verificación: el texto
      inyectado se lee en la transcripción del asistente (Claude Code: evento
      `system/hook_response` con `--verbose --output-format stream-json`; Codex: su registro
      `~/.codex/sessions/…/rollout-*.jsonl`) y se compara con `text` de `startup-context --format 2`; la
      evidencia del gancho (`~/.forge614/engines/hook-evidence/<agente>.json`) solo guarda
      `engramContextReceived` y la huella del comando, no el texto inyectado.

**Compatibilidad con el protocolo público:**

- [ ] Confirmar que el adaptador consume `forge614-engram memory-protocol --json` y reconoce
      `id: "forge614-engram-memory"` y la versión que pidió (1 a 4); no copiar instrucciones privadas ni depender de
      archivos internos, SQLite o imports internos de Engram.
- [ ] Confirmar que la integración configura las herramientas MCP públicas de Engram: `memory_context`,
      `memory_search`, `memory_get`, `memory_save`, `memory_session_start`, `memory_session_summary` y
      `memory_session_end`.
- [ ] Confirmar el ciclo completo: al iniciar y después de compactar usa `memory_context`; ante un
      “recuerda/guarda” explícito usa `memory_save`; antes de compactar guarda resumen; al terminar guarda
      el resumen útil y cierra la sesión. Con la versión 4, el cierre deja de ser obligatorio: el resumen
      vivo (ver el punto de las instrucciones del servidor MCP, más abajo) reemplaza al resumen final, porque ninguna conducta depende de que la sesión se cierre.
- [ ] Con esquema 11, abrir una sesión del agente nuevo en un repositorio, dejarla sin cerrar y, cuando
      lleve más de 30 minutos sin actividad en Engram (en laboratorio: esperar o adelantar su última
      actividad en la copia), abrir otra en el mismo repositorio; verificar que la segunda recibe
      `previous` de `memory_session_start` (con `sessionNotice` trayendo «was left open; its last activity
      was at») y que el agente dice que la sesión anterior quedó abierta y cuándo, sin inventar lo que
      hizo (si no hay resumen, dice que no dejó ninguno). Ofrecer continuar desde el resumen es lo
      esperado; si el agente nuevo no lo hace, se anota como límite conocido en su celda de la matriz, sin
      que eso bloquee la certificación. Verificación: comparar lo que dice con el resumen real
      (`memory_get` del id que trae `previous`).
- [ ] Con esquema 11, abrir dos sesiones seguidas del agente nuevo en el mismo repositorio, sin dejar pasar
      30 minutos entre ellas; verificar que la segunda recibe `parallel` de `memory_session_start` (con
      `sessionNotice` trayendo «Another session is open now: `<id>`.») y que el agente dice que hay otra
      sesión abierta ahora, sin llamarla interrumpida ni abandonada y sin retomar su trabajo por su
      cuenta; preguntarle a la persona antes de tocar ese trabajo no es falla. Ninguna de las dos pruebas
      de este punto limita el largo de la respuesta que se le pide al agente.
- [ ] Si la integración pide la versión 4 (`memory-protocol --json --protocol-version 4`), verificar que
      instala `instructions` completo y sin recortar (≤ 2 500 caracteres) en el archivo de instrucciones
      del agente, sin agregarle reglas de memoria propias, y que no copia allí `mcpInstructions` (llegan
      solas por el servidor MCP). La forma normal es incrustar el manual en el archivo principal de
      instrucciones del agente, entre sus marcadores; el archivo aparte (primary file + `contentFile`
      satélite) queda como excepción, igual que en Engines. Verificación: el texto instalado es byte a
      byte igual a `instructions` de la salida del comando — «byte a byte» significa que el contenido
      entre los marcadores `<!-- forge614-engines:begin engram-memory-protocol -->` y
      `<!-- forge614-engines:end engram-memory-protocol -->`, sin la línea de marca de Engines
      (`<!-- Managed by Forge614 Engines. …`), sin el renglón en blanco que la sigue y sin el salto de
      línea final, es idéntico a `instructions`.
- [ ] Verificar que el agente nuevo recibe las instrucciones del servidor MCP de Engram (desde 1.7.0 son
      las del manual v4 para todo cliente) y las sigue: en una sesión nueva, sin archivo de instrucciones,
      tras dos pasos importantes, `memory_history` de su resumen de sesión muestra al menos dos versiones
      (resumen vivo, no solo al final). Si el cliente descarta las instrucciones del servidor, anotarlo en
      la fila del agente: entonces el manual completo es obligatorio. Resultado medido el 2026-09-25:
      Claude Code, sin archivo de instrucciones, tomó el manual de las instrucciones del servidor MCP (abrió
      sesión y guardó su resumen con los seis campos); Codex no las toma y solo recibe el manual por
      `~/.codex/AGENTS.md`, así que para Codex el manual completo es obligatorio (Engines ya lo instala).
- [ ] Si el host crea la base con `init` para el agente nuevo, verificar que queda en el esquema 11
      (`intelligence-enable` responde `migrated: false`) y que una base existente no cambia de nivel.
- [ ] Si Engram no está disponible, el agente debe continuar y decir la verdad; nunca sustituirlo por un
      archivo privado del cliente ni afirmar que recordó algo que no pudo recuperar.

**Formato fijo del reporte de sesión:**

- [ ] No pasar la salida nativa del agente directamente a `memory_session_summary`. Convertirla a un objeto
      con **exactamente** estos seis campos: `goal`, `instructions`, `discoveries`, `accomplishments`,
      `nextSteps` y `files`.
- [ ] Validar la conversión: `goal` es texto no vacío; los otros cinco campos narrativos son texto; `files`
      es una lista de rutas/textos. No agregar campos propios del agente: el esquema MCP y el CLI rechazan
      campos desconocidos, faltantes, objetos extraños y datos inválidos.
- [ ] Respetar los límites públicos: `goal` hasta 4,000 caracteres; cada campo narrativo hasta 8,000;
      `files` hasta 200 entradas. Resumir información extensa, no guardar la transcripción cruda.
- [ ] Si el nuevo agente produce una clase de resultado que no cabe de forma honesta en esos seis campos,
      detener la integración y proponer una versión nueva y explícita del protocolo. No extender el
      esquema actual de manera informal.

**Memorias durables y seguridad:**

- [ ] Para preferencias que deban funcionar entre clientes, usar alcance `shared` con un `globalIntent`
      verdadero; para conocimiento de un repositorio, usar alcance `project`; para reglas o contratos que
      atan a varios proyectos del mismo grupo, alcance `ecosystem` con un `groupIntent` verdadero (con
      esquema 11, además tipo `decision`, `procedure` o `warning` y `affects`; ver el punto de
      `ECOSYSTEM_*`).
- [ ] Usar un `topicKey` estable al actualizar un tema duradero, para no duplicar recuerdos.
- [ ] Verificar que la adaptación nunca mande contraseñas, tokens, llaves privadas, credenciales ni cadenas
      de conexión con credenciales en memorias, resúmenes, `topicKey`, errores o logs.
- [ ] Probar con el agente nuevo que, si Engram responde `SECRET_REJECTED`, el agente vuelve a guardar el
      recuerdo sin el valor (nombrando dónde vive, por ejemplo `password: <redacted>` o el nombre de la
      variable de entorno), no reintenta con el secreto, no descarta el recuerdo en silencio y le dice a la
      persona qué quitó. Verificación: pedirle que recuerde un texto con una clave de prueba inventada y
      revisar con `memory_search` que se guardó sin el valor. Hay dos caminos válidos: Engram rechaza con
      `SECRET_REJECTED` y el agente vuelve a guardar sin el valor, o el agente quita el valor antes de
      guardar y lo dice; no guardar nada es falla. Un `password: …` demasiado obvio hace que el agente se
      niegue a guardar sin llegar a llamar a Engram — para ejercitar `SECRET_REJECTED` de verdad conviene
      usar, por ejemplo, una cadena de conexión inventada con usuario y contraseña en vez de la palabra
      «password» sola.
- [ ] Con esquema 11 y un proyecto que pertenece a un grupo, pedirle al agente nuevo que suba al tablero una
      regla que afecta a varios proyectos y verificar que manda un tipo permitido y `affects` con al menos
      dos proyectos del grupo; y que ante cualquier código `ECOSYSTEM_*` corrige el guardado, lo deja en el
      proyecto o consolida el tablero, sin reintentar igual, y le dice a la persona qué pasó. Verificación:
      `memory_search` con `scope: "ecosystem"` muestra el recuerdo con sus `affects`.
- [ ] Probar con el agente nuevo: inicio, guardado explícito, recuperación en una conversación nueva,
      compactación/reanudación y cierre. Debe usarse Engram compartido y no almacenamiento privado del
      agente.
- [ ] Con esquema 11, pedirle al agente nuevo que guarde dos veces, sin `topicKey`, el mismo aprendizaje
      redactado distinto, y verificar que ante la respuesta `similar` de `memory_save` hace una de las tres
      cosas que manda el protocolo v4 (actualiza el parecido, lo deja aparte diciendo por qué, o guarda con
      `supersedes`), sin dejar dos recuerdos activos iguales en silencio y sin borrar nada. Verificación:
      `memory_search` con esas palabras devuelve un solo recuerdo activo, o el viejo con la marca
      `superseded`. El aviso `similar` solo sale al guardar sin `topicKey` y con una semejanza de palabras
      de al menos 0,25; la prueba necesita dos guardados en turnos separados (el segundo mensaje enviado
      después de que termine la respuesta al primero) — si el agente fusiona los dos pedidos en un solo
      guardado, el aviso no se ejercitó.

**Cómo probar sin tocar la memoria real (laboratorio, 2026-09-25):**

- Hacer una copia coherente de la base real con `sqlite3 <base> ".backup '<lab>/engram/engram.db'"`, con
  permisos 600 y una primera apertura (por ejemplo `sqlite3 <copia> "pragma journal_mode"` o `init --json`
  sin carpeta) antes de aceptar escrituras.
- Apuntar toda la prueba a esa copia con `FORGE614_HOME` del laboratorio.
- Antes de cualquier prueba, hacer una guarda con una base «rota» (una carpeta en lugar del archivo de la base): el
  agente debe responder `DATABASE_PATH_UNSAFE`; si responde con recuerdos, está usando la base real y hay
  que detenerse.
- Codex no pasa `FORGE614_HOME` a su propio servidor MCP: hay que dárselo explícito con
  `-c "mcp_servers.forge614-engram.env={FORGE614_HOME=\"$LAB\"}"` y, en `codex exec`, además
  `-c 'mcp_servers.forge614-engram.default_tools_approval_mode="approve"'`.
- Usar una copia limpia por agente: Engram no borra nada, así que una segunda prueba sobre la misma copia
  ve lo que dejó la primera.
- En `claude -p`, `--allowedTools` no restringe las herramientas disponibles: usar `--disallowedTools` (o
  `--tools`) para limitar de verdad lo que el agente puede llamar.
- Si el agente corre en la carpeta real de un repositorio, no renombrar proyectos ni grupos en la copia: el
  arranque de Engram escribe `.forge614/project.json` en esa carpeta, y un cambio hecho solo pensando en la
  copia puede llegar al archivo real; comparar `git status` antes y después de cada prueba.
- Borrar el laboratorio al terminar: lleva datos privados de la memoria real.

---

## `forge614-shell` — la cara humana

*(Esta sección la debe llenar una sesión trabajando directamente dentro del repo `forge614-shell`,
con su propio conocimiento real del código de ese repo. No se completa desde fuera ni por inferencia
de otro nodo.)*

Su trabajo: mostrar el agente nuevo como opción seleccionable para **chat real** (no MCP) y resolver su
login por suscripción. La sección "When Forge614 Engines adds a new agent/assistant" de `AGENTS.md` de
este repo ya documenta esto en detalle — esta checklist es su resumen accionable.

**Novedad (Shell v1.6.0): feedback en vivo y catálogo de modelos ya son infraestructura compartida.**
Esta versión rediseñó a fondo la capa genérica de chat (`src/ui/basic/`): tarjetas de actividad de
herramientas sin caja/JSON (`transcript.ts`), diffs de código con color, spinner de arranque, punto de
estado animado con segundos transcurridos, colores por estado y mensajes de error en rojo. **Un agente
nuevo hereda todo esto automáticamente** en cuanto su sesión pasa por los componentes compartidos
(`ActivityCard`, `ChatText`, `ForgeComposer`, `ShellSidebar`) — no hay nada que implementar aparte para
tener esa experiencia.

También se agregó `src/infrastructure/shell-preferences.ts`: recuerda el modelo y el nivel de
razonamiento elegidos por motor entre reinicios de Shell (`~/.forge614/shell/preferences.json`, o bajo
`FORGE614_HOME`), sin tocar la config nativa del CLI del agente.

**Novedad (Shell v1.8.0, publicada): el hand-off nativo se eliminó por decisión de producto — nunca
reintroducirlo para un agente nuevo.** La versión anterior de esta sección describía un mecanismo real
que existió brevemente en `main` (`src/infrastructure/native-handoff.ts`, un `spawn(executable, [],
{ stdio: "inherit" })` en primer plano) para lanzar el binario nativo del asistente y forzar un
`SessionStart` real cuando el hook de memoria no tenía evidencia de ejecución. **Ese archivo ya no
existe.** La decisión final de producto fue que `forge614-shell init --product engram` **nunca** lanza
Claude Code, Codex ni ningún otro cliente nativo, bajo ninguna circunstancia — ni para esto ni para
nada. `runMemorySetupStep` (`src/app/init-engram.ts`) llama `verify memory-integration` **exactamente
una vez** por asistente seleccionado (nunca dos, nunca condicionado a relanzar nada) y clasifica el
resultado con la función pura `classifyMemoryOutcome`, que produce uno de: `configured` (todo
verificado, incluida evidencia de runtime), `prepared` (estructuralmente correcto, evidencia de runtime
aún ausente — reportado como éxito, nunca como pendiente ni como error), `blocked` (conflicto real
reportado por Engines en el plan, con su detalle textual), `unsupported` (limitación real del agente,
p. ej. Cursor sin mecanismo de instrucciones) o `failed` (error genuino de Engines). La ausencia de
evidencia de runtime **nunca** bloquea el resultado ni pide volver a ejecutar nada — es información de
estado, no una condición de éxito. Todo el comando además renderiza en una sola sesión de pantalla
alterna continua (`EngramFlowScreen`, `src/ui/startup/frame.ts`) desde la intro hasta el resultado —
sin cerrar/reabrir pantallas TUI entre pasos.

- [ ] **Nunca lanzar el binario nativo de ningún agente desde `init` ni desde ningún otro flujo humano
      de Shell**, ni para "probar" un hook ni para ninguna otra razón. Si el agente nuevo también
      requiere un paso de confianza nativo e interactivo (como `/hooks` de Codex), Shell **no** intenta
      resolverlo por su cuenta: se reporta como `prepared`/listo con una frase que describe una
      posibilidad futura, nunca una afirmación de lo que ya pasó (ver el siguiente punto). No existe ni
      debe volver a existir un módulo tipo `native-handoff.ts`.
- [ ] **Nunca afirmar que el agente "no confía" en el hook, ni nada que Shell no pueda saber con
      certeza.** `needs-user-trust` (Codex) y `pending-runtime-verification` (evidencia nunca observada,
      o vencida) se reportan ambos como `prepared`, con redacción que solo describe una posibilidad
      futura — p. ej. "Codex memory integration is ready. When you next start Codex normally, Codex may
      ask you once to approve the Forge614 memory hook." Nunca "has not trusted", nunca pedir volver a
      ejecutar un comando. Ver `preparedDetail` en `src/app/init-engram.ts`.
- [ ] **Un conflicto real (`blocked`) en cualquier componente del plan — MCP, instrucciones o hook —
      siempre gana**, incluso si los otros componentes ya están presentes y verificados. Un bug real
      encontrado en review: la clasificación original dejaba pasar un hook bloqueado como `configured`
      si el MCP y las instrucciones ya estaban en su lugar, ocultando el conflicto. `classifyMemoryOutcome`
      revisa `blocked` antes que cualquier otra cosa, precisamente por esto.
- [ ] **Nunca depender de un número de versión de Engines para saber si el contrato del hook existe.**
      La detección es estructural: si la respuesta JSON de `plan`/`verify` no trae el campo `hook`, el
      Engines instalado es viejo — mostrar exactamente "Forge614 Engines needs to be updated. Run
      \"forge614-shell update\", then try again." y nada más. Las versiones de Engines cambian
      constantemente; codificar una versión específica ya causó una corrección de plan real en esta
      sesión.
- [ ] **Nunca mostrar ni registrar `writes[].afterContent`/`beforeHash` de ningún componente, para
      ningún agente.** Confirmado con evidencia real durante esta implementación: un `plan
      memory-install` real para Cursor devolvió el archivo `~/.cursor/mcp.json` completo, con tokens
      reales de GitHub y GitLab en texto plano, dentro de `afterContent` — porque Engines reconstruye el
      archivo completo al planear cualquier escritura de MCP/hook, no solo el fragmento nuevo. Esto
      aplica todavía más a un agente cuyo hook se escribe en su archivo de configuración principal (como
      `~/.claude/settings.json` para Claude Code, que también contiene todos sus otros hooks y permisos).
- [ ] Nunca llamar `forge614-engines memory-hook-run` directamente ni leer
      `~/.forge614/engines/hook-evidence/*` desde Shell, para ningún agente — solo `detect`,
      `capabilities`, `plan memory-install`, `apply`, `verify memory-integration`.
- [ ] Verificado con revisión visual PTY real (entorno aislado, `HOME`/`FORGE614_HOME` propios, stubs de
      Engines/Engram, binarios falsos de Claude/Codex con marcador): una sola sesión de pantalla alterna
      de principio a fin, cero lanzamientos de cliente nativo, preview sin secretos, y ambos casos de
      cancelación (Summary y Preview) detienen la escritura antes de `apply`.

**Novedad (Shell v1.8.0, publicada): memoria propia del chat de Shell, sin depender de hooks del
agente.** Independiente de todo lo anterior, `src/engines/claude/session.ts` y
`src/engines/codex/session.ts` ahora recuperan contexto directamente del contrato público
`forge614-engram startup-context --directory <cwd> --json` (nunca del protocolo v1
`memory_context`/hooks) — una vez por conversación, y de nuevo tras `/new`/`/resume`, nunca en cada
turno. `getStartupContext` (`src/infrastructure/forge614-engram.ts`) valida estrictamente la forma del
JSON (`format: 1`, bucket `shared` con su propio `format`, `project.status` exactamente `"bound"`/
`"unbound"` con los campos correctos según cada caso) y devuelve `{available:false}` ante cualquier
forma inesperada, sin inyectar nada. El contenido de cada `title`/`preview` se sanea por campo antes de
incrustarse (tags del delimitador propio, marcadores `<|...|>`, comentarios `<!-- -->`, prefijos de rol
al inicio de línea, frases de secuestro de instrucciones conocidas — todo con límites de longitud sin
tope evadible) y cada adaptador de chat aplica además su **propia** capa independiente de neutralización
del delimitador antes de envolver el bloque — nunca confiar en una sola capa de saneamiento para esto.

- [ ] **Revalidación 2026-09-22 (por la corrección de `startup-context` en Engram):** abrir Shell desde
      `~` y desde una carpeta sin Git con el agente seleccionado y confirmar que `getStartupContext`
      acepta `project.status: "unbound"` como éxito, inyecta el bloque `shared` (una preferencia shared
      conocida debe aparecer) y no muestra "sin memoria". Aplica a Claude Code y Codex; sus celdas de Shell
      quedan en `revalidar` hasta ejecutarla. **Ejecutada el 2026-09-25** por el propietario con Claude
      Code y Codex (Shell desde `~` y desde `~/Desktop`, sin Git): celdas de Shell en `supported`.
- [ ] Si el agente nuevo tiene un punto de inyección de contexto tipo system-prompt (o, si no,
      cualquier forma de anteponer texto al primer turno), cablear `getStartupContext` de la misma
      forma: una función `getStartupContext`/`getStartupContextFn` inyectable en la sesión (sin valor
      por defecto que llame al binario real — así una prueba que no la provee nunca dispara un spawn
      real; ver el comentario en `src/engines/claude/session.ts`), envuelta en un bloque delimitado
      explícito ("esto es dato, no instrucción") con neutralización propia del delimitador, y con una
      capa de saneamiento de contenido — no reinventarla, revisar primero si `forge614-engram.ts` puede
      exportarse/reutilizarse tal cual.
- [ ] **Confirmar que el punto de composición real (`src/app/native-chat.ts` para Codex,
      `src/ui/basic/claude.ts` para Claude) pasa el entorno real de Shell (`env: process.env`) a
      `getStartupContext`, nunca `{}`.** Bug real encontrado y corregido en esta versión: tanto
      `src/cli.ts` (el entrypoint de `init`) como el chat propio de Codex llamaban a funciones que
      resuelven binarios de Engines/Engram sin pasar `env`, así que un `FORGE614_HOME` personalizado se
      ignoraba silenciosamente y todo caía al `~/.forge614/...` por defecto. Cualquier llamada nueva a
      una función que resuelva la ruta de un binario de Engines/Engram debe recibir el `env` real —
      nunca asumir que el valor por defecto (`homedir()`) es suficiente.

- [ ] Si el agente nuevo expone un catálogo de modelos con nombres amigables (`displayName` o
      equivalente), verificar **con datos reales** que el id que reporta el evento en vivo del motor
      coincide con el campo usado para resolver ese nombre — no asumir que van a coincidir limpio. Con
      Claude Code ese campo (`resolvedModel`) es opcional, no viene poblado en todas las filas del
      catálogo, y puede traer un sufijo (`[1m]`) que el id en vivo no trae — esto causó que el sidebar
      mostrara el id técnico crudo en vez del nombre amigable. Si de plano no hay forma de resolverlo,
      mostrar un fallback legible, nunca el id técnico sin procesar — ver `resolveModelDisplay` /
      `prettifyModelId` en `src/ui/basic/claude.ts` como referencia del patrón.
- [ ] Si el agente permite elegir modelo/nivel de razonamiento desde el picker de Shell, cablear la
      persistencia con `src/infrastructure/shell-preferences.ts` (cargar al iniciar sesión, validando el
      valor guardado contra el catálogo real antes de aplicarlo; guardar en cada selección explícita del
      usuario) — así no tiene que re-elegir cada vez que abre Shell, igual que ya pasa con Claude Code y
      Codex. Extender el tipo `EngineId` de ese archivo con el id del agente nuevo si hace falta.

**Autenticación por suscripción (nunca API key):**

- [ ] Confirmar que **no existe** un paso de configuración manual tipo `claude setup-token` para este
      agente — Shell nunca copia, lee ni genera tokens de larga duración; siempre delega el login real
      al mecanismo oficial nativo del CLI/servidor del agente. (Así funciona hoy tanto Claude Code como
      Codex — no hay ningún comando `init`/`setup` de auth en `src/cli.ts` distinto del `/login`
      interactivo dentro de cada sesión de chat.)
- [ ] Escribir la lógica de auth específica de este agente en `src/engines/<agente>/`, siguiendo el
      mismo contrato que ya usan Claude (`src/engines/claude/auth.ts`) y Codex
      (`src/engines/codex/session.ts`), aunque el mecanismo concreto sea distinto en cada uno (Claude:
      `spawn` sobre el subcomando oficial `claude auth login` con `stdio: "inherit"`; Codex: OAuth vía
      JSON-RPC contra su `app-server`, abriendo el navegador y esperando la notificación de login
      completado). El contrato común es:
      1. Bloquear explícitamente cualquier variable de entorno de API key/override propia del agente
         (mismo patrón que el regex de `claudeEnvironment()` en `src/engines/claude/auth.ts` y de
         `nativeEnvironment()` en `src/engines/process.ts`).
      2. Exigir que la sesión activa sea de cuenta/suscripción nativa, nunca de API key.
      3. Delegar el flujo interactivo real al binario o servidor oficial del agente — Shell nunca
         implementa su propio flujo OAuth desde cero.
      4. No persistir, leer ni imprimir tokens en ningún momento.
- [ ] Verificar con una sesión real ya autenticada de este CLI (no asumir por similitud con Claude Code
      o Codex) que el `/login` de Shell deja al usuario funcionando con su suscripción normal, sin pedir
      ni aceptar una API key.

**Flujo de selección de motor (engine picker) — agregarlo como opción de chat no es un solo paso:**

- [ ] Confirmar primero con `forge614-engines agents list` / `capabilities --agent <id>` que Engines ya
      reporta este agente como `installed` (y, si aplica headless, `supportsHeadlessExec: true` — dato
      de Engines/Workers, no de Shell).
- [ ] Crear `src/engines/<agente>/` con una sesión propia (seguir `src/engines/codex/session.ts` si el
      protocolo encaja en la forma genérica `NativeSession`, o `src/engines/claude/session.ts` si
      necesita manejo propio): login/auth, catálogo de modelos, envío/cancelación de mensaje, resume de
      sesión.
- [ ] Agregar el id nuevo a `supportedShellAdapters` en `src/infrastructure/forge614-engines.ts`
      (líneas 33-36) — este mapa es un **allowlist deliberado y separado** del chequeo de capacidad MCP
      (`discoverMcpCapableAgents`, que no tiene allowlist y no requiere cambios aquí). Sin esta entrada,
      `toSelectableAgent()` descarta el agente aunque Engines lo reporte instalado.
- [ ] Ampliar el union type hardcodeado `AvailableEngine["id"]` en `src/contracts/available-engine.ts`
      (hoy `"claude" | "codex"`) para incluir el id nuevo — si no, `supportedShellAdapters` no compila
      al mapear hacia un id que el tipo no reconoce.
- [ ] Ampliar el union type hardcodeado del engine en `parseEngine` (`src/app/options.ts`, hoy
      `"claude" | "codex" | "pi"`) para que `--engine <agente>` no falle al parsear.
- [ ] Agregar la rama de dispatch nueva en `src/cli.ts` (el `if/else if` que hoy resuelve
      `"claude"` → `src/ui/basic/claude.ts` / `"codex"` → `src/app/native-chat.ts`): **no es
      data-driven**, agregar el id al allowlist no basta, hace falta la rama explícita apuntando al
      módulo de sesión nuevo.
- [ ] Confirmar que `src/ui/startup/engine-picker.ts` no necesita cambios — es genérico, solo renderiza
      lo que le pasa `discoverSelectableEngines()`, así que si los pasos anteriores están bien hechos el
      agente aparece automáticamente en el picker visual.
- [ ] Nunca reintroducir un escaneo de `PATH` local para detectar el agente — `src/engines/discovery.ts`
      existió para eso y fue eliminado; Shell solo pregunta a Engines vía `discoverSelectableEngines`.
- [ ] Solo una vez que el chat ya funcione: evaluar si hace falta feedback visual de "tool en uso" (p.
      ej. cuando el agente llama una tool MCP de Engram) — es una traducción adicional específica del
      protocolo de este agente (ver punto 3 de `AGENTS.md`), no un requisito para que el chat exista.

**Novedad (Shell, 2026-09-22): indicador de actividad en segundo plano.** Shell muestra agentes y procesos
en segundo plano (contador en la barra de estado y lista expandible en el panel lateral) a partir del modelo
común `BackgroundActivity` (`src/engines/types.ts`) que cada adaptador de sesión alimenta con los eventos
reales de su protocolo. Claude Code lo alimenta con los eventos `task_started`, `task_updated`,
`task_notification` y `background_tasks_changed` verificados en el `sdk.d.ts` instalado; Codex no lo reporta
hoy y Shell lo dice ("este motor no informa actividad en segundo plano") en vez de inventar estado.

- [ ] Declarar **con evidencia real** (tipos del SDK o eventos observados en vivo, nunca por documentación)
      si el protocolo del agente nuevo reporta actividad en segundo plano. Si sí, implementar
      `backgroundActivity()` en su sesión alimentando `BackgroundActivity` y cubrirlo con tests con dobles
      (inicio, actualización, fin, fallo, varios simultáneos, caída del turno). Si no, dejar el método sin
      implementar y un test que fije esa ausencia: la UI mostrará el aviso de "no informa". Nunca mostrar un
      estado que el motor no reporte.

---

## Agentes ya evaluados

| Agente | Engines | Workers | Atlas | Engram | Shell | Notas |
|---|---|---|---|---|---|---|
| Claude Code | ✅ (revalidado 2026-09-25) | ✅ | ✅ | ✅ (revalidado 2026-09-26, Engram 1.7.2: manual v4 con la regla 3 nueva y `sessionNotice`) | ✅ (revalidado 2026-09-25); onboarding de `claude setup-token` no diseñado aún | Auth por suscripción funciona con `cwd` aislado y `HOME` real intacto. No soporta nivel de razonamiento (`REASONING_LEVEL_UNSUPPORTED`). Recibe el manual por `~/.claude/CLAUDE.md` y por las instrucciones del servidor MCP. |
| Codex | ✅ (revalidado 2026-09-25) | ✅ | ✅ | ✅ (revalidado 2026-09-26, Engram 1.7.2: manual v4 con la regla 3 nueva y `sessionNotice`; límite: dice que la sesión quedó abierta y cuándo y cuenta su resumen, pero no ofrece continuar desde él (0 de 6) — si quieres seguir, pídeselo) | ✅ (revalidado 2026-09-25) | Necesita `--skip-git-repo-check` en `extraArgs()` porque rechaza correr en carpetas no confiables. Sí soporta nivel de razonamiento (`model_reasoning_effort`). No toma las instrucciones del servidor MCP: el manual completo en `~/.codex/AGENTS.md` es obligatorio. |
| Cursor | ✅ (detectado, `supportsHeadlessExec: false`) | N/A (no aplica, no soporta headless) | N/A | N/A | N/A | No requiere adapter en Workers — no puede invocarse headless. |

**Revalidaciones abiertas (acta 0017):** las celdas marcadas `⚠️ revalidar` vuelven a ✅ solo cuando una
persona ejecuta la prueba indicada, con fecha. Las de Engines y Shell de Claude Code y Codex se abrieron el
2026-09-22 (corrección de `startup-context`) y se cerraron el 2026-09-25 (ver el informe
`docs/orquestacion/revalidaciones/2026-09-25-claude-code-codex.md` y el acta 0028). Las de Engram de Claude
Code y Codex se abrieron el 2026-09-25 (acta 0027) y se cerraron el 2026-09-26 con Engram 1.7.2 (secciones
«T4» y «T4b» del mismo informe, y el acta 0029). No quedan celdas abiertas.
