# Procedimiento — Agregar un agente de IA nuevo al ecosistema Forge614

English: [add-agent-runbook.en.md](add-agent-runbook.en.md)

> **Analogía:** contratar a un obrero nuevo para el taller. Primero se revisa si tiene las herramientas mínimas (paso 0); si no las tiene, no entra. Si las tiene, cada estación del taller (nodo) lo evalúa en un orden fijo, y solo cuando **todas** firman, se le da el gafete.

**Regla de admisión (acta 0017):** un agente entra al ecosistema solo cuando cumple **todos** los requisitos obligatorios de **todos** los nodos. Si le falta uno o pierde funcionalidad, no entra: queda `unsupported` o `partial` en la matriz, con el motivo escrito.

**Quién hace qué:** el propietario ejecuta cada paso en una sesión dentro del repo del nodo, con el prompt que `forge614-ai` le entrega (formato del acta de colaboración); `forge614-ai` coordina, revisa cada resultado y actualiza este procedimiento y la matriz. Ningún nodo resuelve la parte de otro.

Ejemplo usado en todo el documento: `opencode`.

---

## Paso 0 — Investigación previa (sin tocar ningún repo)

Se hace en `forge614-ai`, con el CLI del agente **instalado y autenticado** en la máquina. Todo se comprueba **ejecutando el binario**, nunca leyendo solo su documentación.

| # | Pregunta | Cómo se comprueba | Si la respuesta es "no" |
|---|---|---|---|
| 0.1 | ¿Tiene modo sin pantalla (headless / no interactivo)? | `opencode --help`, `opencode run --help` o equivalente; ejecutar una petición real y capturar stdout | Sin headless no hay Workers ni Atlas: entra como `partial` (solo chat/MCP) o no entra |
| 0.2 | ¿Puede recibir el prompt por stdin? | `echo "di hola" \| opencode <flag>` | Obligatorio para headless (el prompt nunca va en `argv`): si no puede, headless queda `unsupported` |
| 0.3 | ¿Flag para modelo y para nivel de razonamiento? | Probar `--model` y el mecanismo de esfuerzo; anotar sintaxis exacta | Sin razonamiento configurable: se documenta; Atlas y el orquestador nunca se lo piden |
| 0.4 | ¿Soporta servidores MCP? ¿Dónde y en qué formato vive su configuración? | Localizar archivo real (`~/.config/opencode/...`), formato (JSON/JSONC/TOML/YAML), forma de cada entrada | Sin MCP no hay memoria Engram por herramientas: `partial` |
| 0.5 | ¿Tiene ganchos de inicio de sesión (hook al arrancar)? | Configurar uno de prueba y verificar que corre (evidencia real, no suposición) | Sin hooks, la memoria de arranque depende de instrucciones (0.6) |
| 0.6 | ¿Tiene archivo oficial y estable de instrucciones globales? | Documentación oficial + prueba: escribir un marcador y ver que la sesión lo lee | Sin instrucciones ni hooks: `partial` (solo MCP) |
| 0.7 | ¿Emite reporte de uso de tokens en modo headless? | Salida JSON/estructurada con `usage` | Se registra `null` ("no medido"); no bloquea |
| 0.8 | ¿Cómo se autentica? ¿Por suscripción o solo API key? | Login oficial; confirmar que no exige API key | Shell nunca acepta API keys: chat en Shell `unsupported` |
| 0.9 | ¿Rechaza carpetas no confiables (como Codex sin repo Git)? | Ejecutar en carpeta temporal vacía | Anotar el flag que lo evita |
| 0.10 | ¿Cuál es el texto exacto de "cuota agotada"? | Forzar un error real; capturar stderr/stdout | Sin patrón confirmado, Workers no puede detectar cuota: bloquea Workers |

**Salida del paso 0:** una fila nueva en `support-matrix.json` con estado `evaluating`, una acta en `forge614-ai/docs/decisions/` ("Evaluación de `opencode`") con la tabla llena y evidencia, y la decisión: **continuar** o **no entra** (con motivo). Sin acta, no se toca ningún nodo.

---

## Paso 1 — Engines (obligatorio; primero siempre)

Repo: `forge614-engines`. Sección de referencia: "`forge614-engines`" del checklist.

| Qué | Dónde |
|---|---|
| Agregar el id al tipo `AgentId` | `src/modules/agents/types.ts` |
| Crear el adaptador con capacidades reales (`supportsMcp`, `supportsHooks`, `supportsHeadlessExec`), rutas de ejecutable y de configuración, formato de config, forma de entrada MCP, `headlessCommand()` (si aplica), `instructions` (solo si 0.6 es sí), mapeo de `--readable-dir` | `src/infrastructure/agents/opencode.ts` |
| Registrarlo | `src/app/default-registry.ts` |
| Tests del adaptador (headless con/sin stdin, con/sin razonamiento; manifiesto de capacidades) | `src/infrastructure/agents/opencode.test.ts` |
| Hook de arranque, si 0.5 es sí (delegando a `forge614-engram startup-context`; tratar `unbound` como éxito) | ruta del hook en el adaptador + `src/app/run-memory-hook.ts` |
| `CONTRACT.md` es/en: agente añadido a la lista soportada | raíz del repo |
| Plan con sección "Impacto en el procedimiento de agentes: Sí" | `.agents/plans/` |

**Puerta:** `bun verify` en verde; `forge614-engines detect` lo reporta instalado; `capabilities --agent opencode` correcto; `plan memory-install` → `apply` → `verify memory-integration` en una instalación real. Revisión de `forge614-ai`. Release de Engines.

## Paso 2 — Workers (obligatorio si `supportsHeadlessExec: true`)

Repo: `forge614-workers`.

| Qué | Dónde |
|---|---|
| Adaptador con `detectQuotaExhausted` usando el patrón **confirmado** en 0.10, `extraArgs()` (flag de 0.9 si aplica), fixtures de cuota real y de error genérico | `src/adapters/opencode.ts` + test |
| Registro | `src/adapters/registry.ts` |
| Test de completitud contra el binario real de Engines | `src/adapters/registry.completeness.test.ts` (debe pasar sin cambios) |
| Verificar con sesión autenticada real que la autenticación sobrevive con `cwd` aislado y `HOME` intacto | evidencia en el plan |
| Verificar que `SIGTERM → SIGKILL` mata al proceso y a sus hijos | evidencia en el plan |
| `CONTRACT.md`, plan con impacto | raíz, `.agents/plans/` |

**Puerta:** una tarea real ejecutada por Workers con `opencode` devuelve `task_completed`; cuota detectada con el fixture real. Revisión. Release.

## Paso 3 — Atlas (solo si Workers lo soporta)

Repo: `forge614-atlas`.

| Qué | Dónde |
|---|---|
| Modelos de `opencode` por nivel (ligero/estándar/profundo) y si acepta razonamiento | hoy `src/.../task-config.ts`; con el Hub, la política de modelos (`forge614-policy-*`) |
| Confirmar que aparece como opción sin cambios de código en el selector | evidencia |

**Puerta:** `forge614-atlas init --engine opencode` produce un plan válido y una corrida corta real escribe en Engram. Revisión. Release.

## Paso 4 — Engram (normalmente sin cambios)

Repo: `forge614-engram`. No se modifica: el agente consume el protocolo público (`memory-protocol --json` v1/v2) y las herramientas MCP `memory_context`, `memory_save`, `memory_session_summary`, `memory_session_end`. Se **verifica** (no se codifica): ciclo completo inicio → guardado explícito → recuperación en conversación nueva → compactación → cierre; resumen de sesión con los seis campos; nunca secretos en memoria; `unbound` tratado como éxito.

**Puerta:** evidencia del ciclo completo con `opencode`. Si algo no cabe en el protocolo, se detiene y se propone versión nueva del protocolo por acta.

## Paso 5 — Shell (para chat; MCP ya viene de Engines)

Repo: `forge614-shell`. Hoy exige tocar cinco sitios (hasta que la alineación los unifique en un registro):

| Qué | Dónde |
|---|---|
| Sesión propia: login por suscripción (nunca API key), catálogo de modelos, envío/cancelación, resume, `getStartupContext` con saneamiento | `src/engines/opencode/session.ts` (+ `auth.ts` si aplica) |
| Allowlist de adaptadores de chat | `src/infrastructure/forge614-engines.ts` (`supportedShellAdapters`) |
| Union type del motor | `src/contracts/available-engine.ts` |
| Parseo de `--engine` | `src/app/options.ts` |
| Rama de arranque del chat | `src/cli.ts` |
| Preferencias de modelo/razonamiento | `src/infrastructure/shell-preferences.ts` (`EngineId`) |
| Textos en el catálogo i18n es/en | `src/i18n/` |
| Tests con dobles de sesión; revisión visual PTY; docs es/en; `notion-map` | según checklist |

**Puerta:** chat real con `opencode` desde Shell, `/login` por suscripción, memoria compartida visible desde `~`. Revisión. Release.

## Paso 6 — Cierre en `forge614-ai`

1. `support-matrix.json`: fila `opencode` con cada celda en `supported | partial | unsupported`, fecha, responsable y motivo; estado global `supported` **solo** si todas las obligatorias están en `supported`.
2. Tabla "Agentes ya evaluados" del checklist: fila nueva con el resultado por nodo y notas.
3. Lecciones nuevas: cada validación descubierta se agrega a la **checklist general del nodo**, no solo a la fila del agente.
4. Acta de evaluación cerrada con el resultado; resumen a Engram con `sessionId`.
5. Si algún nodo publicó cambios de contrato: `CONTRACT.md` y `schemaVersion` actualizados; procedimiento revisado (acta 0017).

---

## Orden y dependencias

```
Paso 0 (investigación, acta)  →  1 Engines  →  2 Workers  →  3 Atlas
                                      └──────→  4 Engram (verificación)
                                      └──────→  5 Shell
                                                      └──→  6 Cierre en forge614-ai
```

Workers, Atlas, Engram y Shell dependen de que Engines ya publique el adaptador. Workers antes que Atlas. Shell puede ir en paralelo con Workers.

## Qué NO se hace nunca

- Empezar por Shell "para ver el chat" antes de que Engines reporte el agente.
- Copiar patrones de cuota, rutas de instalación o formatos de config de otro agente por parecido.
- Inventar un archivo de instrucciones que el agente no documente como estable.
- Marcar `supported` con celdas pendientes.
- Resolver desde un nodo algo que corresponde a otro: se anota en la sección del otro nodo y se le pasa como pendiente.
