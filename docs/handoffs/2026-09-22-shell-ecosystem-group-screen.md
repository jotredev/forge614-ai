# Traspaso — Shell: pantalla de grupo (ámbito ecosistema) y bloque `ecosystem` en el contexto de arranque

**Fecha:** 2026-09-22 · **Repositorio destino:** `forge614-shell` · **Ejecuta:** el propietario · **Revisa:** forge614-ai
**Prioridad:** P1 de producto · **Actas:** 0022, 0023 · **Precondición:** la release de Engram con el ámbito `ecosystem` y `.forge614/project.json` ya publicada e instalada (`forge614-shell update`).

## Prompt para la sesión en `forge614-shell`

```
REGLA DE GIT (no negociable): NO hagas commit, merge, tag, push ni publicación en ningún momento, ni siquiera al final ni "para dejar limpio". La revisión de forge614-ai es PREVIA al commit; si terminas, reportas y esperas. Un commit sin revisión incumple este traspaso.

Contexto. Este repositorio es forge614-shell, la única interfaz visual del ecosistema Forge614. Rigen el
Estándar de Nodo (forge614-ai/standard/STANDARD.md) y las actas 0001–0023 (forge614-ai/docs/decisions/).
Lee completas las actas 0022 (ámbito ecosystem) y 0023 (identidad portátil del proyecto) antes de tocar
nada. Reglas: plan antes que código (.agents/plans/ con Decisions); acta 0016 (todo texto para personas por
el catálogo i18n es/en de src/i18n/); acta 0013 (códigos de error estables); acta 0012 (nunca mencionar
productos externos); Git de solo lectura para agentes (sin commit ni push); "cuestiona antes de hacer";
nunca inventar resultados de validación; nunca lanzar binarios nativos de asistentes desde Shell; nunca
escanear PATH (decisiones vigentes en AGENTS.md).

Engram ya publica: ámbito `ecosystem` (grupos de proyectos), archivo `.forge614/project.json` que Engram
escribe y posee, `startup-context` con bloques shared + ecosystem ({status:"member", group, context} |
{status:"none"}) + project (con project.source file|path|unbound), y comandos no interactivos
`group-create`, `group-list`, `group-bind`, `group-unbind`. Lee su CONTRACT.md/docs 03 y 10 para la forma
exacta de cada JSON; valida cada respuesta con esquema estricto como ya hace `forge614-engram.ts`.

Tarea (TDD; plan primero):
1. Bloque `ecosystem` en el contexto de arranque: `getStartupContext` (src/infrastructure/forge614-engram.ts)
   acepta el bloque opcional `ecosystem`, lo valida estrictamente y lo sanea con las mismas capas que
   `shared`/`project`; ambas sesiones (claude/session.ts, codex/session.ts) lo envuelven como dato, no como
   instrucción, en su bloque delimitado. Si el bloque no viene (Engram viejo), nada cambia.
2. Pantalla de selección de grupo dentro de `init --product engram` (src/app/init-engram.ts + src/ui/):
   se muestra SOLO si `.forge614/project.json` no existe en la carpeta actual o su `ecosystem` es null y la
   carpeta es un proyecto (Git o manifiesto). Diseño exacto: título "Este repositorio aún no pertenece a
   ningún grupo."; sección "Grupos existentes" con cada grupo y sus proyectos (de `group-list --json`);
   línea divisoria; "Crear un grupo nuevo…" (pide nombre, valida ^[a-z0-9]+(?:-[a-z0-9]+)*$) y "Es un
   proyecto suelto (sin grupo)". Si no hay grupos, la primera sección no aparece. La respuesta se aplica con
   `group-create`/`group-bind` (no interactivos); Shell NUNCA escribe `.forge614/project.json` (lo escribe
   Engram). Se pregunta una sola vez: si el archivo ya trae grupo, la pantalla no aparece. `init` con
   `--yes`/sin TTY no pregunta y no vincula grupo.
3. Recepción sin proyecto (acta 0003): en la lista de proyectos recientes, mostrar el grupo de cada uno si
   lo tiene (dato de Engram), sin inventar.
4. Textos por el catálogo i18n (es/en), paridad por compilador. Códigos de error nuevos en formato
   MAYUSCULAS_CON_GUION_BAJO mapeados desde el catálogo.
5. Tests con dobles de sesión y stubs de Engram: bloque ecosystem presente/ausente/inválido; pantalla con
   grupos, sin grupos, proyecto suelto, archivo ya con grupo (no pregunta), `--yes` (no pregunta);
   verificación visual PTY como en versiones anteriores.
6. Docs es/en (07 inicialización de Engram y 05 interfaz) y notion-map.json; CONTRACT.md si existe.
7. Suite completa, typecheck, build. NO commit ni publicación.

Reporte para revisión: archivos, tests, render de texto de la pantalla en sus tres variantes, evidencia de
que el bloque ecosystem llega al asistente saneado, y sección "Impacto en el procedimiento de agentes"
(esperado: Sí — todo asistente de chat debe inyectar los tres ámbitos; celdas de Shell a revalidar).
```

## Qué revisará forge614-ai

- Shell nunca escribe `.forge614/project.json`; solo llama comandos de Engram.
- La pantalla aparece una sola vez y nunca en modo no interactivo.
- Bloque `ecosystem` validado y saneado; Engram viejo no rompe nada.
- Textos en el catálogo; docs es/en; plan con impacto.
