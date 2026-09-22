# Traspaso — Engines: revalidar el gancho de arranque con el bloque `ecosystem`

**Fecha:** 2026-09-22 · **Repositorio destino:** `forge614-engines` · **Ejecuta:** el propietario · **Revisa:** forge614-ai
**Prioridad:** P2 · **Actas:** 0022, 0023 · **Precondición:** la release de Engram con el ámbito `ecosystem` publicada.

## Prompt para la sesión en `forge614-engines`

```
Contexto. Este repositorio es forge614-engines, el inspector y adaptador interno de asistentes de IA del
ecosistema Forge614. Rigen el Estándar de Nodo (forge614-ai/standard/STANDARD.md) y las actas 0001–0023.
Lee las actas 0022 y 0023. Reglas: plan antes que código; acta 0012 (sin productos externos); acta 0013
(contratos de máquina); Git de solo lectura para agentes; "cuestiona antes de hacer"; nunca afirmar que un
host consumió contexto si no es verificable (regla ya vigente en este repo).

Engram ya publica en `startup-context` un bloque opcional `ecosystem` ({status:"member", group, context} |
{status:"none"}) entre `shared` y `project`, y `project.source` (file|path|unbound). El gancho de arranque
(src/app/run-memory-hook.ts, hook-command.ts, startup-context-client.ts) delega en ese comando.

Tarea (TDD; plan primero; cambio esperado pequeño):
1. Confirmar con evidencia real que el runtime del gancho NO descarta el bloque `ecosystem` (hoy
   startup-context-client.ts valida solo format/shared/project): ampliar el esquema Zod .strict() de la
   respuesta para aceptar `ecosystem` opcional y `project.source`, e inyectarlo en el additionalContext con
   el mismo saneamiento y tope de 16k que shared/project, marcado como dato.
2. Tratar `project.status: "unbound"` como éxito (ya exigido por la revalidación del 2026-09-22) — verificar
   que el hook inyecta shared en `cwd = ~`.
3. Tests: respuesta con ecosystem member / none / ausente (Engram viejo) / inválida; unbound en home.
4. `verify memory-integration` reporta si el Engram instalado publica el bloque (estructural, no por
   versión).
5. Docs es/en 06 (ejecución automática) y notion-map; CONTRACT.md si existe. Suite, typecheck, build.
   NO commit ni publicación.

Reporte: archivos, tests, salida real del hook contra el Engram publicado desde `~` y desde un proyecto
con grupo, y sección "Impacto en el procedimiento de agentes" (esperado: Sí — la sección de Engines del
procedimiento añade "el hook inyecta los tres ámbitos"; celdas de Claude Code y Codex en Engines a
revalidar).
```
