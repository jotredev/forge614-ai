# 0028 — Revalidación de Claude Code y Codex, y aclaraciones del checklist

**Fecha:** 2026-09-25
**Estado:** aceptada
**Sesión:** forge614-ai-orquestador-2026-09-25-r3-e4ec550

## Contexto

El acta 0027 dejó seis celdas de `standard/support-matrix.json` en `revalidate`: `engines/claude-code`,
`engines/codex`, `shell/claude-code`, `shell/codex` (abiertas el 2026-09-22, por la corrección de
`startup-context` en Engram) y `engram/claude-code`, `engram/codex` (abiertas el 2026-09-25, por el
checklist de la memoria inteligente). El plan
`docs/superpowers/plans/2026-09-25-revalidacion-matriz-claude-code-codex.md` ejecutó, el 2026-09-25, tres
tareas de revalidación en laboratorio (copia de la base real, nunca la real):

- **R1 y R1b:** batería del checklist `forge614-engram` contra Claude Code y Codex, con evidencia completa
  en `docs/orquestacion/revalidaciones/2026-09-25-claude-code-codex.md`. Los dos asistentes encuentran la
  memoria, la usan y no inventan cuando falta; el resumen vivo (P5′) y el secreto (P6′) quedaron aprobados
  en los dos por caminos distintos; el parecido (P8′) quedó aprobado en Claude Code (repetición del
  orquestador, con `supersedes`) y **falla en una cláusula** en Codex: recibe `similar` pero no explica a
  la persona por qué deja la nota aparte.
- **R2:** el propietario abrió Shell desde `~` y desde una carpeta sin Git con los dos asistentes, y
  probó `/compact`; las cuatro celdas de Engines y Shell quedaron demostradas.

De la batería quedaron correcciones y precisiones pendientes para el checklist (frase de «Previous session
(interrupted)», definición de «byte a byte» del manual v4, forma normal del manual incrustado —ya vigente
en Claude Code desde Engines 1.13.0—, verificación del formato 2 por la transcripción y no por la evidencia
del gancho, nota de laboratorio para no tocar la memoria real, entre otras), y la tabla «Agentes ya
evaluados» quedó desalineada con la matriz (la fila de Cursor fuera de la tabla, Engram sin actualizar,
Engines y Shell sin marcar la revalidación).

## Decisión

1. **Matriz de soporte:** `engines/claude-code`, `engines/codex`, `shell/claude-code` y `shell/codex` pasan
   de `revalidate` a `supported`, con `verifiedAt: "2026-09-25"` y `verifiedBy: "owner"`; se les agrega una
   frase de evidencia al final de `notes` y se les quitan `revalidateSince`, `reason` y `deadline`. Ningún
   otro campo de esas celdas cambia.
2. **Engram sigue en revalidación:** `engram/claude-code` y `engram/codex` conservan `status: "revalidate"`,
   `revalidateSince: "2026-09-25"`, `reason` sin cambios y `deadline: "2026-10-25"`; se les agrega una frase
   de resultado a `notes`. Se cierran cuando Engram 1.7.1 corrija que el manual pida explicar por qué se
   deja aparte un parecido (P8′ de Codex) y se repita esa prueba.
3. **Aclaraciones y correcciones del checklist** (`standard/procedures/new-agent-checklist.md`, sección
   `forge614-engram` salvo B1 y B2, en `forge614-engines`, y B3, en `forge614-shell`):
   - B1: la forma normal de `verify memory-integration` es el manual incrustado en el archivo principal del
     agente entre marcadores (desde Engines 1.13.0, también en Claude Code); primary file + `contentFile`
     satélite queda como excepción.
   - B2: se anota la ejecución del 2026-09-25 de la revalidación de Engines (`unbound`) para Claude Code y
     Codex.
   - B3: se anota la ejecución del 2026-09-25 de la revalidación de Shell (memoria desde `~` y sin Git) para
     Claude Code y Codex.
   - B4: se corrige la frase de «Previous session (interrupted)» (aparece cuando otra sesión ya marcó la
     cortada, o tras inactividad, no en la segunda conversación de un proyecto limpio) y la verificación del
     formato 2 pasa de «el registro del gancho guarda `chars` y el texto» a leer la transcripción del
     asistente y compararla con `text` de `startup-context --format 2`.
   - B5: la prueba de sesión interrumpida exige un proyecto sin otras sesiones abiertas (Engram 1.7.0 marca
     como interrumpida toda otra sesión abierta del mismo proyecto).
   - B6: la forma normal de la versión 4 del protocolo es el manual incrustado (excepción: archivo aparte,
     como en Engines); se define «byte a byte» entre los marcadores, sin la línea de marca de Engines, sin
     el renglón en blanco siguiente y sin el salto de línea final.
   - B7: se agrega el resultado medido el 2026-09-25 — Claude Code, sin archivo de instrucciones, toma el
     manual de las instrucciones del servidor MCP; Codex no las toma, así que en Codex el manual completo en
     `~/.codex/AGENTS.md` es obligatorio.
   - B8: `SECRET_REJECTED` admite dos caminos válidos (Engram rechaza y se guarda de nuevo sin el valor, o
     el agente quita el valor antes de guardar); no guardar nada es falla; se recomienda una cadena de
     conexión inventada en vez de la palabra «password» sola, que hace que el agente se niegue sin llamar a
     Engram.
   - B9: el aviso `similar` solo sale sin `topicKey` y con semejanza ≥ 0,25, y exige dos guardados en turnos
     separados; si el agente fusiona los dos pedidos, el aviso no se ejercitó.
   - B10: se agrega, al final de la sección `forge614-engram`, un bloque de viñetas «Cómo probar sin tocar
     la memoria real (laboratorio, 2026-09-25)» con la receta de copia de la base, `FORGE614_HOME`,
     guarda con base rota, variable explícita para el servidor MCP de Codex, copia limpia por agente,
     `--disallowedTools` en Claude Code, no renombrar proyectos/grupos en la copia, y borrar el laboratorio
     al terminar.
   - Tabla «Agentes ya evaluados»: Claude Code y Codex quedan con Engines y Shell en ✅ (revalidado
     2026-09-25) y Engram en ⚠️ revalidar (con el motivo y el plazo 2026-10-25); se agrega a las notas de
     cada uno cómo recibe el manual del servidor MCP. La fila de Cursor, que estaba después del párrafo
     «Revalidaciones abiertas» rompiendo la tabla, se mueve dentro de la tabla, tras Codex, sin cambiar su
     texto. El párrafo «Revalidaciones abiertas (acta 0017)» se corrige sin borrar su historia: las de
     Engines y Shell de Claude Code y Codex, abiertas el 2026-09-22, se cerraron el 2026-09-25; siguen
     abiertas las de Engram, desde el 2026-09-25 (acta 0027), plazo 2026-10-25.
4. **Por qué no se aplica el candado 3 de `STANDARD.md` §12 a Engines y Shell:** ese candado exige
   `revalidate` cuando cambia la sección de un nodo en el checklist. Los textos que cambian en las secciones
   de Engines y Shell (B2 y B3) solo registran, con fecha, una revalidación ya ejecutada contra el texto
   vigente desde el 2026-09-22 y aclaran la forma normal del manual incrustado (B1) sin agregar ninguna
   validación nueva que un agente ya soportado no haya cumplido; las cuatro celdas se validaron el mismo día
   contra ese mismo texto. La sección `forge614-engram` sí cambia de forma sustantiva (B4 a B10), pero ese
   cambio no reabre `engines`/`shell`: el candado 3 marca `revalidate` en las celdas del nodo cuya sección
   cambió, y `forge614-engram` pertenece al nodo Engram, ya en `revalidate` por el acta 0027.
5. **Versión del reglamento:** `standard/VERSION` sube de `1.1.0` a `1.1.1` (parche: corrige y aclara el
   checklist y cierra revalidaciones ya ejecutadas, sin requisitos nuevos para ningún agente), con el
   encabezado de `STANDARD.md`/`.en.md`, las menciones de la versión vigente en los documentos 00 y 01
   (es/en), el puntero (`forge614.node.json`: versión a mano y huella vía
   `bun run standard:pack -- --update-pointer`) y el mapa de
   documentación (`bun run notion-map:build`).

## Alternativas descartadas

- **Reabrir `revalidate` en Engines y Shell por haber tocado su sección del checklist:** el candado 3 existe
  para forzar revalidación cuando cambia una validación real, no cuando se anota, con fecha, una prueba que
  ya se ejecutó contra el texto vigente; reabrirlas habría exigido repetir en laboratorio pruebas ya hechas
  el mismo día, sin ganar nada.
- **Cerrar también `engram/claude-code` y `engram/codex`:** P8′ de Codex sigue fallando una cláusula del
  manual v4 (no explica por qué deja aparte un parecido); cerrarlas sin esa corrección dejaría la matriz
  diciendo `supported` sobre una conducta no verificada.
- **Subir la versión a 1.2.0:** este cambio no agrega ninguna validación nueva al checklist ni cambia
  esquemas o contratos; solo corrige y aclara texto ya publicado y cierra revalidaciones ya ejecutadas, lo
  que corresponde a un parche (1.1.1), no a una versión menor.

## Consecuencias

- La matriz de soporte queda con cuatro celdas menos en `revalidate`; solo Engram de Claude Code y Codex
  sigue pendiente, con plazo 2026-10-25.
- El checklist de agentes queda alineado con lo aprendido en R1, R1b y R2: la forma normal del manual
  incrustado, la definición de «byte a byte», la verificación del formato 2 por transcripción, la nota de
  laboratorio para no tocar la memoria real, y la tabla «Agentes ya evaluados» coherente con la matriz.
- Queda pendiente, fuera de esta acta, la corrección de Engram 1.7.1 (P8′ de Codex) y su repetición antes
  del 2026-10-25 para cerrar las dos celdas restantes.
- El reglamento 1.1.1 se publica con esta acta y los archivos corregidos; la publicación es un paso
  separado, con aprobación del propietario.

## Referencias

- Plan de origen: `docs/superpowers/plans/2026-09-25-revalidacion-matriz-claude-code-codex.md`
- Informe de evidencia: `docs/orquestacion/revalidaciones/2026-09-25-claude-code-codex.md`
- Actas relacionadas: `0017`, `0024`, `0027`
