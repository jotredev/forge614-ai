# Traspaso — Engram: `startup-context` debe devolver memoria compartida en carpetas no vinculadas

**Fecha:** 2026-09-22 · **Repositorio destino:** `forge614-engram` · **Ejecuta:** el propietario, en una sesión dentro de ese repo · **Revisa:** forge614-ai (coordinador)
**Prioridad:** P1 (rompe la memoria compartida en Shell fuera de un proyecto; bloquea el acta 0003 "Shell como recepción")

## Prompt para la sesión en `forge614-engram`

```
Contexto. Este repositorio es forge614-engram, el motor de memoria persistente del ecosistema Forge614
(SQLite/FTS5, MCP, SDK). Hoy se aprobó el Estándar de Nodo Forge614 (repo forge614-ai,
docs/superpowers/specs/2026-09-22-entrega-0-estandar-de-nodo-design.md) y las actas 0001–0019.
Aplican en especial: acta 0013 (contratos de máquina: JSON con schemaVersion/format en stdout, errores en
stderr {code, error}), acta 0015 (toda decisión va al plan y, si cambia un contrato, a un acta), acta 0012
(nunca mencionar productos externos), regla "plan antes que código" (.agents/plans/), Git de solo lectura
para agentes (no hagas commit ni push), y "cuestiona antes de hacer": antes de tocar código, explica para
qué sirve el cambio, qué beneficia, pros, contras y alternativas.

Bug confirmado (evidencia real):
- Existe un recuerdo shared con topicKey `user/preference/favorite-color`.
- `forge614-engram startup-context --directory ~/Desktop/forge614-shell --json` lo devuelve bien.
- `forge614-engram startup-context --directory ~ --json` devuelve `INVALID_DIRECTORY`.
- Forge614 Shell arrancó desde `~`, startup-context falló, Shell arrancó sin memoria y el asistente dijo
  que no había ningún registro.
Causa probable: `src/interfaces/mcp/project-directory.ts` (y la ruta equivalente del CLI) rechaza `/` y
`$HOME` y exige Git para resolver una carpeta como proyecto; esa guarda es correcta para VINCULAR, pero
`startup-context` es una consulta de solo lectura y su propio contrato (docs/es/03, docs/es/10) dice que
una carpeta no vinculada no es un error (`project.status: "unbound"`).

Tarea (TDD; primero el plan en .agents/plans/AAAA-MM-DD--startup-context-unbound.md con Decisions):
1. Si `--directory` apunta a una carpeta existente y legible que no puede resolverse o vincularse como
   proyecto (sin Git, `$HOME`, `/`, Git sin vínculo), `startup-context` NO falla: devuelve
   `format: 1`, `shared` con el contexto compartido normal y `project: { "status": "unbound" }`.
2. Falla solo si la ruta no existe, no es directorio o no puede leerse (código estable, stderr, exit 1).
3. Nunca crea proyecto, vínculo, recuerdo ni modifica la base en esta consulta.
4. Proyecto válido y vinculado: comportamiento actual intacto (shared + contexto de proyecto).
5. Regresiones (tests junto al código o en __tests__/): carpeta existente sin Git; home/carpeta no
   vinculada; Git no vinculado; proyecto vinculado; ruta inexistente; y que la preferencia shared de color
   aparece en el resultado de una carpeta no vinculada.
6. Conserva formato, límites (16 384 bytes por sección), saneamiento y seguridad actuales.
7. Si la guarda de `$HOME`/`/` se comparte con la vinculación, sepárala en dos reglas con nombre
   (resolver vs. vincular) sin debilitar la de vincular. Documenta la decisión en el plan.
8. Actualiza docs/es/03 y docs/en/03 (y 10) si el texto del contrato cambia; `notion-map.json` con huellas.
9. Ejecuta: suite completa (`bun test`), `bun run typecheck`, build, y la CLI real contra una base SQLite
   temporal (`FORGE614_HOME` temporal) en los cinco casos del punto 5.
10. NO hagas commit ni publicación.

Reporte para revisión (pégalo en un archivo .agents/plans/... sección Result y devuélvemelo): causa raíz
con archivo:línea; archivos tocados; tests añadidos; salida real de los cinco casos de CLI; salida de
typecheck y suite; qué documentación cambió; y la sección "Impacto en el procedimiento de agentes"
(¿algún asistente debe re-validar su integración de startup-context? Responde Sí/No con motivo).
```

## Qué revisará forge614-ai al recibir el resultado

- Que `startup-context` no escriba nada (probar con base de solo lectura).
- Que la guarda de vinculación siga rechazando `$HOME` y `/` al vincular.
- Que los cinco casos tengan test y salida real.
- Que el cambio quede en plan + docs + (si aplica) acta en `forge614-ai/docs/decisions/` para el contrato.

## Después de publicar Engram

`forge614-shell update` → abrir Shell desde `~` y confirmar que las preferencias compartidas aparecen.
