# Traspaso — Shell: pantalla de grupo (ámbito ecosistema) y bloque `ecosystem` en el contexto de arranque

**Fecha:** 2026-09-22 · **Repositorio destino:** `forge614-shell` · **Ejecuta:** el propietario · **Revisa:** forge614-ai
**Prioridad:** P1 de producto · **Actas:** 0022, 0023 · **Precondición:** Engram 1.6.0 publicada e instalada en la máquina del propietario (release v1.6.0 de forge614-engram; `forge614-engram --version` = 1.6.0).
**Actualizado:** 2026-09-23 tras la publicación de Engram 1.6.0 (actas 0024, 0026; ruling R31).

## Prompt para la sesión en `forge614-shell`

```
REGLA DE GIT (no negociable): NO hagas commit, merge, tag, push ni publicación en ningún momento, ni siquiera al final ni "para dejar limpio". La revisión de forge614-ai es PREVIA al commit; si terminas, reportas y esperas. Un commit sin revisión incumple este traspaso.

REGLAS ADICIONALES: trabajas SOLO en este repositorio; ~/Desktop/forge614-ai es solo lectura (norma, actas, spec). Ningún commit ni texto menciona a ninguna IA ni lleva atribución. Bun 1.4.2 es la versión única del ecosistema (acta 0026): fija bun-version 1.4.2 en los workflows y en los binarios de la próxima release de este nodo, y engines.bun >= 1.3.9 en package.json (1.3.8 cuelga en Linux).

Contexto. Este repositorio es forge614-shell, la única interfaz visual del ecosistema Forge614. Rigen el
Estándar de Nodo (forge614-ai/standard/STANDARD.md) y las actas 0001–0023 (forge614-ai/docs/decisions/).
Lee completas las actas 0022 (ámbito ecosystem) y 0023 (identidad portátil del proyecto) antes de tocar
nada. Reglas: plan antes que código (.agents/plans/ con Decisions); acta 0016 (todo texto para personas por
el catálogo i18n es/en de src/i18n/); acta 0013 (códigos de error estables); acta 0012 (nunca mencionar
productos externos); Git de solo lectura para agentes (sin commit ni push); "cuestiona antes de hacer";
nunca inventar resultados de validación; nunca lanzar binarios nativos de asistentes desde Shell; nunca
escanear PATH (decisiones vigentes en AGENTS.md).

Engram 1.6.0 ya publica (léelo en su CHANGELOG, CONTRACT.md y docs 03, 10 y 11): ámbito `ecosystem`
(grupos de proyectos; precedencia project > ecosystem > shared), archivo `.forge614/project.json` que
Engram escribe y posee, `startup-context` que MANTIENE format: 1 y suma campos ADITIVOS: bloque
`ecosystem` ({status:"member", group, context} | {status:"none"}) entre `shared` y `project`,
`project.source` (file|path|unbound) y `project.notices` (avisos como DATABASE_MIGRATED con la ruta del
respaldo, o PROJECT_REBOUND_FROM_FILE). Comandos no interactivos `group-create`, `group-list`,
`group-bind`, `group-unbind`, `memory-move`; protocolo de memoria versión 3; un `project.json` inválido
hace fallar `startup-context` con PROJECT_FILE_INVALID y sin contexto (error visible para el host). Las
memorias de grupo aún NO se replican a PostgreSQL (llegará en 1.7.0).

Tarea (TDD; plan primero):
1. Tolerancia a campos desconocidos (ruling R31 del estándar, derivado del acta 0024): al leer salidas de
   OTRO nodo (aquí, Engram) el esquema de validación acepta campos que no conoce (Zod
   `.passthrough()`/`.loose()` en el objeto raíz y en cada bloque), y solo es estricto sobre los campos que
   este nodo usa. Primero demuestra con un test que la respuesta real de Engram 1.6.0 (con `ecosystem`,
   `project.source` y `project.notices`) NO se rechaza hoy; si se rechaza, esa corrección va antes que todo
   lo demás. `.strict()` sigue aplicando a argv y a los archivos propios de este nodo.
2. Bloque `ecosystem` en el contexto de arranque: `getStartupContext` (src/infrastructure/forge614-engram.ts)
   acepta el bloque opcional `ecosystem`, lo valida estrictamente y lo sanea con las mismas capas que
   `shared`/`project`; ambas sesiones (claude/session.ts, codex/session.ts) lo envuelven como dato, no como
   instrucción, en su bloque delimitado. Si el bloque no viene (Engram viejo), nada cambia.
3. Pantalla de selección de grupo dentro de `init --product engram` (src/app/init-engram.ts + src/ui/):
   se muestra SOLO si `.forge614/project.json` no existe en la carpeta actual o su `ecosystem` es null y la
   carpeta es un proyecto (Git o manifiesto). Diseño exacto: título "Este repositorio aún no pertenece a
   ningún grupo."; sección "Grupos existentes" con cada grupo y sus proyectos (de `group-list --json`);
   línea divisoria; "Crear un grupo nuevo…" (pide nombre, valida ^[a-z0-9]+(?:-[a-z0-9]+)*$) y "Es un
   proyecto suelto (sin grupo)". Si no hay grupos, la primera sección no aparece. La respuesta se aplica con
   `group-create`/`group-bind` (no interactivos); Shell NUNCA escribe `.forge614/project.json` (lo escribe
   Engram). Se pregunta una sola vez: si el archivo ya trae grupo, la pantalla no aparece. `init` con
   `--yes`/sin TTY no pregunta y no vincula grupo.
4. Avisos de Engram: si `project.notices` trae DATABASE_MIGRATED o PROJECT_REBOUND_FROM_FILE, Shell los
   muestra a la persona (texto por el catálogo i18n es/en), una sola vez, sin bloquear el flujo.
5. Recepción sin proyecto (acta 0003): en la lista de proyectos recientes, mostrar el grupo de cada uno si
   lo tiene (dato de Engram), sin inventar.
6. Textos por el catálogo i18n (es/en), paridad por compilador. Códigos de error nuevos en formato
   MAYUSCULAS_CON_GUION_BAJO mapeados desde el catálogo.
7. Tests con dobles de sesión y stubs de Engram: bloque ecosystem presente/ausente/inválido; pantalla con
   grupos, sin grupos, proyecto suelto, archivo ya con grupo (no pregunta), `--yes` (no pregunta);
   verificación visual PTY como en versiones anteriores.
8. Docs es/en (07 inicialización de Engram y 05 interfaz) y notion-map.json; CONTRACT.md si existe.
9. Suite completa, typecheck, build. NO commit ni publicación.

Reporte para revisión: archivos, tests, render de texto de la pantalla en sus tres variantes, evidencia de
que el bloque ecosystem llega al asistente saneado, y sección "Impacto en el procedimiento de agentes"
(esperado: Sí — todo asistente de chat debe inyectar los tres ámbitos; celdas de Shell a revalidar).
Enlaces de CI en verde (ubuntu y macOS) sobre la rama de trabajo. Empieza el reporte con el prefijo
"Shell:".
```

## Qué revisará forge614-ai

- Shell nunca escribe `.forge614/project.json`; solo llama comandos de Engram.
- La pantalla aparece una sola vez y nunca en modo no interactivo.
- Bloque `ecosystem` validado y saneado; Engram viejo no rompe nada.
- Textos en el catálogo; docs es/en; plan con impacto.
