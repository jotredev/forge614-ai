# Traspaso — Engines: revalidar el gancho de arranque con el bloque `ecosystem`

**Fecha:** 2026-09-22 · **Repositorio destino:** `forge614-engines` · **Ejecuta:** el propietario · **Revisa:** forge614-ai
**Prioridad:** P2 · **Actas:** 0022, 0023 · **Precondición:** Engram 1.6.0 publicada e instalada en la máquina del propietario (release v1.6.0 de forge614-engram; `forge614-engram --version` = 1.6.0).
**Actualizado:** 2026-09-23 tras la publicación de Engram 1.6.0 (actas 0024, 0026; ruling R31).

## Prompt para la sesión en `forge614-engines`

```
REGLA DE GIT (no negociable): NO hagas commit, merge, tag, push ni publicación en ningún momento, ni siquiera al final ni "para dejar limpio". La revisión de forge614-ai es PREVIA al commit; si terminas, reportas y esperas. Un commit sin revisión incumple este traspaso.

REGLAS ADICIONALES: trabajas SOLO en este repositorio; ~/Desktop/forge614-ai es solo lectura (norma, actas, spec). Ningún commit ni texto menciona a ninguna IA ni lleva atribución. Bun 1.4.2 es la versión única del ecosistema (acta 0026): fija bun-version 1.4.2 en los workflows y en los binarios de la próxima release de este nodo, y engines.bun >= 1.3.9 en package.json (1.3.8 cuelga en Linux).

Contexto. Este repositorio es forge614-engines, el inspector y adaptador interno de asistentes de IA del
ecosistema Forge614. Rigen el Estándar de Nodo (forge614-ai/standard/STANDARD.md) y las actas 0001–0023.
Lee las actas 0022 y 0023. Reglas: plan antes que código; acta 0012 (sin productos externos); acta 0013
(contratos de máquina); Git de solo lectura para agentes; "cuestiona antes de hacer"; nunca afirmar que un
host consumió contexto si no es verificable (regla ya vigente en este repo).

Engram 1.6.0 ya publica (léelo en su CHANGELOG, CONTRACT.md y docs 03, 10 y 11): ámbito `ecosystem`
(grupos de proyectos; precedencia project > ecosystem > shared), archivo `.forge614/project.json` que
Engram escribe y posee, `startup-context` que MANTIENE format: 1 y suma campos ADITIVOS: bloque
`ecosystem` ({status:"member", group, context} | {status:"none"}) entre `shared` y `project`,
`project.source` (file|path|unbound) y `project.notices` (avisos como DATABASE_MIGRATED con la ruta del
respaldo, o PROJECT_REBOUND_FROM_FILE). Comandos no interactivos `group-create`, `group-list`,
`group-bind`, `group-unbind`, `memory-move`; protocolo de memoria versión 3; un `project.json` inválido
hace fallar `startup-context` con PROJECT_FILE_INVALID y sin contexto (error visible para el host). Las
memorias de grupo aún NO se replican a PostgreSQL (llegará en 1.7.0). El gancho de arranque
(src/app/run-memory-hook.ts, hook-command.ts, startup-context-client.ts) delega en ese comando.

Tarea (TDD; plan primero; cambio esperado pequeño):
1. Tolerancia a campos desconocidos (ruling R31 del estándar, derivado del acta 0024): al leer salidas de
   OTRO nodo (aquí, Engram) el esquema de validación acepta campos que no conoce (Zod
   `.passthrough()`/`.loose()` en el objeto raíz y en cada bloque), y solo es estricto sobre los campos que
   este nodo usa. Primero demuestra con un test que la respuesta real de Engram 1.6.0 (con `ecosystem`,
   `project.source` y `project.notices`) NO se rechaza hoy; si se rechaza, esa corrección va antes que todo
   lo demás. `.strict()` sigue aplicando a argv y a los archivos propios de este nodo.
2. Confirmar con evidencia real que el runtime del gancho NO descarta el bloque `ecosystem` (hoy
   startup-context-client.ts valida solo format/shared/project): ampliar el esquema Zod .strict() de la
   respuesta para aceptar `ecosystem` opcional y `project.source`, e inyectarlo en el additionalContext con
   el mismo saneamiento y tope de 16k que shared/project, marcado como dato. Incluye `project.notices` como
   dato (nunca como instrucción) y respeta el presupuesto de contexto del acta 0020 (≤ 3 000 tokens en el
   arranque, medido).
3. Tratar `project.status: "unbound"` como éxito (ya exigido por la revalidación del 2026-09-22) — verificar
   que el hook inyecta shared en `cwd = ~`.
4. Tests: respuesta con ecosystem member / none / ausente (Engram viejo) / inválida; unbound en home.
5. `verify memory-integration` reporta si el Engram instalado publica el bloque (estructural, no por
   versión).
6. Docs es/en 06 (ejecución automática) y notion-map; CONTRACT.md si existe. Suite, typecheck, build.
   NO commit ni publicación.

Reporte: archivos, tests, salida real del hook contra el Engram publicado desde `~` y desde un proyecto
con grupo, y sección "Impacto en el procedimiento de agentes" (esperado: Sí — la sección de Engines del
procedimiento añade "el hook inyecta los tres ámbitos"; celdas de Claude Code y Codex en Engines a
revalidar).
Enlaces de CI en verde (ubuntu y macOS) sobre la rama de trabajo. Empieza el reporte con el prefijo
"Engines:".
```
