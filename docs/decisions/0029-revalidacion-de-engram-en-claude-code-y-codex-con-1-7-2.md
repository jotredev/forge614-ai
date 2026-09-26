# 0029 — Revalidación de Engram en Claude Code y Codex con 1.7.2, y checklist de sesiones alineado

**Fecha:** 2026-09-26
**Estado:** aceptada
**Sesión:** forge614-ai-orquestador-2026-09-26-e172b

## Contexto

El acta 0028 (reglamento 1.1.1) cerró cuatro de las seis celdas que el acta 0027 había dejado en
`revalidate`: `engines/claude-code`, `engines/codex`, `shell/claude-code` y `shell/codex`. Quedaron
abiertas `engram/claude-code` y `engram/codex`, desde el 2026-09-25, con plazo máximo el 2026-10-25,
porque Codex fallaba una cláusula del manual v4 (P8′: no explicaba por qué dejaba aparte un parecido) y
los dos asistentes tenían comportamientos no conformes en las pruebas de sesión en paralelo y sin cerrar.

`docs/superpowers/plans/2026-09-25-engram-1-7-1.md` (tarea T4) corrigió P8′ (**aprobada**: Codex usa
`supersedes` y explica el reemplazo) pero no las pruebas de sesiones: Claude Code ofrece continuar el
trabajo de la sesión en paralelo en 2 de 3 corridas (el checklist lo prohíbe) y Codex, sin el sesgo de «en
una línea», menciona la sesión que quedó abierta pero no ofrece continuar desde su resumen (0 de 2) y una
vez no dice cuándo. El propietario decidió la opción A: publicar Engram 1.7.2 con la regla 3 del manual
reescrita (nombra primero la sesión que quedó abierta) y un campo nuevo, `sessionNotice`, con la frase ya
redactada como dato.

`docs/superpowers/plans/2026-09-26-engram-1-7-2.md` publicó Engram 1.7.2 (T1–T2), lo instaló en la Mac
(T3) y revalidó S1-b y S2 en Claude Code y Codex, 6 corridas por asistente (T4b, con evidencia en
`docs/orquestacion/revalidaciones/2026-09-25-claude-code-codex.md`, sección «T4b»):

- `sessionNotice` llegó completo y correcto en las 24 llamadas donde debía aparecer, en los dos asistentes.
- **Claude Code:** S2 (sesión que quedó abierta) 6 de 6 en las cuatro marcas, con el bloque de arranque
  «was left open; its last activity was at» en las 6. S1-b (solo sesión en paralelo) 3 de 6 limpias, 1 con
  reserva y 2 que hacen una pregunta de coordinación a la persona antes de tocar el trabajo de la sesión
  paralela («¿la continúo yo o la dejas en esa sesión?»), sin llamarla interrumpida ni retomarla por su
  cuenta en ninguna corrida.
- **Codex:** S1-b 5 de 6 (la sexta ofrece «continuar desde ahí», sin llamarla interrumpida). S2: dice que
  la sesión anterior quedó abierta en 6 de 6, dice cuándo en 5 de 6, nombra la paralela sin ofrecerla en 6
  de 6, pero **no ofrece continuar desde el resumen en ninguna de las 6 corridas** (cuenta su contenido sin
  inventar, pero nunca pregunta o propone seguir desde ahí).

`2026-09-26-engram-1-7-2.md` deja pendiente para este acta, en su sección «Impacto en el procedimiento de
agentes» (punto 6): si «ofrece continuar desde su resumen» es obligatorio para certificar la celda de
Codex o queda como límite documentado.

## Decisión

1. **Matriz de soporte** (`standard/support-matrix.json`): `engram/claude-code` y `engram/codex` pasan de
   `revalidate` a `supported`, con `verifiedAt: "2026-09-26"` y `verifiedBy: "owner"`; se les agrega una
   frase de evidencia a `notes` (Engram 1.7.2, manual v4 con la regla 3 nueva, `sessionNotice`, T4 y T4b) y
   se les quitan `revalidateSince`, `reason` y `deadline`. En la celda de Codex, la frase de evidencia
   incluye el límite: «dice que la sesión quedó abierta y cuándo y cuenta su resumen, pero no ofrece
   continuar desde él (0 de 6); si quieres seguir, pídeselo». Ningún otro campo de esas celdas cambia.
2. **«Ofrecer continuar desde su resumen» no es obligatorio para certificar la celda de un asistente**:
   es la conducta esperada y se prueba, pero si un asistente no la hace queda anotada como límite conocido
   en su celda y en la tabla «Agentes ya evaluados», sin bloquear `supported`. Lo que sí es obligatorio y
   bloquea: decir que la sesión anterior quedó abierta, decir cuándo, no inventar su contenido, y no
   llamarla interrumpida o abandonada a una sesión que solo está en paralelo.
3. **Una pregunta de coordinación en la prueba de sesión en paralelo no es falla.** Si el asistente dice
   que hay otra sesión abierta ahora, sin llamarla interrumpida ni abandonada, y le pregunta a la persona
   antes de tocar ese trabajo (en vez de retomarlo por su cuenta o de ofrecerse a continuarlo sin
   preguntar), la prueba pasa. Solo falla si el asistente retoma ese trabajo por su cuenta o llama
   interrumpida o abandonada a la sesión paralela.
4. **Checklist** (`standard/procedures/new-agent-checklist.md`, sección `forge614-engram`):
   - El punto de sesión que quedó abierta ya no exige un proyecto sin otras sesiones abiertas (desde Engram
     1.7.1 ninguna sesión marca a otra como interrumpida al abrir): para que la segunda sesión reciba
     `previous`, la primera debe llevar más de 30 minutos sin actividad en Engram (en laboratorio: esperar o
     adelantar su última actividad en la copia). La verificación agrega que `memory_session_start` trae
     `sessionNotice` con la frase «was left open; its last activity was at» (Engram 1.7.2), y que ofrecer
     continuar desde el resumen es lo esperado pero, si el agente no lo hace, se anota como límite en su
     celda sin bloquear.
   - Punto nuevo, junto al anterior: abrir dos sesiones seguidas del agente en el mismo repositorio (sin
     dejar pasar 30 minutos) y verificar que la segunda recibe `parallel` (con `sessionNotice` trayendo
     «Another session is open now: `<id>`.») y que el agente dice que hay otra sesión abierta ahora, sin
     llamarla interrumpida ni abandonada y sin retomar su trabajo por su cuenta; preguntarle a la persona
     antes de tocar ese trabajo no es falla (decisión 3).
   - El punto del bloque de arranque (formato 2): la sección «Previous session (interrupted)» aparece
     cuando una sesión abierta del proyecto lleva más de 30 minutos sin actividad (se quita la frase sobre
     «otra sesión ya marcó la cortada»); el texto dice «was left open; its last activity was at», igual que
     `sessionNotice`.
   - El punto de `similar` no cambia de texto: ya pedía que el agente le diga a la persona por qué deja
     aparte el parecido, que es lo que exige el manual v4.
   - Nota nueva: las pruebas de conducta de esta sección no limitan el largo de la respuesta que se le pide
     al agente (el prompt «dime en una línea…» de la revalidación de 1.7.1 sesgó la prueba: Codex omite
     avisos por obedecer ese límite; ver T4 y el hallazgo 0 de su informe).
   - Tabla «Agentes ya evaluados»: Claude Code y Codex quedan con Engram en ✅ (revalidado 2026-09-26,
     Engram 1.7.2: manual v4 con la regla 3 nueva y `sessionNotice`); la nota de Codex agrega el límite de
     la decisión 1. El párrafo «Revalidaciones abiertas (acta 0017)» se corrige: las de Engram, abiertas el
     2026-09-25 (acta 0027), se cierran el 2026-09-26 (T4 y T4b, este acta); no quedan celdas abiertas.
5. **Candado 3 de `STANDARD.md` §12:** la sección `forge614-engram` sí cambia de forma sustantiva (los dos
   puntos de sesión, `sessionNotice`, la nota de largo de respuesta), lo que mantenía en `revalidate` las
   celdas del nodo Engram desde el acta 0027; este acta las cierra porque T4 (2026-09-25) y T4b
   (2026-09-26) ya ejecutaron la validación nueva contra ese mismo texto y la registran con fecha, en los
   dos asistentes.
6. **Versión del reglamento:** `standard/VERSION` sube de `1.1.1` a `1.1.2` (parche: cierra las dos
   últimas celdas de la matriz que quedaban en `revalidate` y alinea el checklist con la conducta ya
   verificada; ninguna validación nueva queda pendiente de ejecutar), con el encabezado de
   `STANDARD.md`/`.en.md`, las menciones de la versión vigente en los documentos 00 y 01 (es/en), el
   puntero (`forge614.node.json`: versión a mano y huella vía `bun run standard:pack -- --update-pointer`)
   y el mapa de documentación (`bun run notion-map:build`).

## Alternativas descartadas

- **Exigir «ofrecer continuar desde su resumen» como requisito obligatorio de la celda `engram/codex`:**
  dejaría la celda en `revalidate` de forma indefinida sin una corrección de Engram a la vista — el dato
  (`sessionNotice`, el bloque de arranque y `previous`) ya le llega completo a Codex en las 6 corridas; el
  problema es cuánto de ese dato repite al responder, no algo que Engram pueda forzar sin reescribir la
  respuesta del modelo. Se prefiere certificar con el límite anotado y visible en la matriz y en la tabla,
  que la persona puede pedir explícitamente («si quieres seguir, pídeselo»), sobre dejar la revalidación
  abierta sin una tarea concreta que la cierre.
- **Contar la pregunta de coordinación de Claude Code (S1-b, cc2/cc6) como falla:** el checklist prohíbe
  retomar el trabajo de la sesión paralela por su cuenta o llamarla interrumpida/abandonada; preguntarle a
  la persona antes de tocar ese trabajo es justamente la conducta seria que se busca, no una violación.
- **Subir la versión a 1.2.0:** este cambio no agrega ninguna validación nueva al checklist ni cambia
  esquemas o contratos; cierra revalidaciones ya ejecutadas y corrige el texto para que documente la
  conducta ya verificada, lo que corresponde a un parche (1.1.2).

## Consecuencias

- La matriz de soporte queda sin ninguna celda en `revalidate`: las seis celdas abiertas por el acta 0027
  (2026-09-22 y 2026-09-25) están cerradas.
- El checklist de agentes queda alineado con Engram 1.7.2: el aviso `sessionNotice`, la regla de 30 minutos
  sin actividad, la prueba de dos sesiones seguidas y la nota de que las pruebas de conducta no limitan el
  largo de la respuesta.
- Queda anotado en la matriz y en la tabla, no como bloqueo, que Codex no ofrece por su cuenta continuar
  desde el resumen de una sesión que quedó abierta; quien lo necesite debe pedírselo explícitamente.
- El reglamento 1.1.2 se publica con esta acta y los archivos corregidos; la publicación es un paso
  separado, con aprobación del propietario.

## Referencias

- Planes de origen: `docs/superpowers/plans/2026-09-25-engram-1-7-1.md` (T4),
  `docs/superpowers/plans/2026-09-26-engram-1-7-2.md` (T1–T4b), `docs/superpowers/plans/2026-09-26-reglamento-1-1-2.md` (R4)
- Informe de evidencia: `docs/orquestacion/revalidaciones/2026-09-25-claude-code-codex.md` (secciones «T4»
  y «T4b»)
- Actas relacionadas: `0017`, `0024`, `0027`, `0028`
