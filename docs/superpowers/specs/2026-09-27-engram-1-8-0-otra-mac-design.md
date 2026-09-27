# Engram 1.8.0: la misma memoria en otra Mac (diseño)

**Fecha:** 2026-09-27 · **Estado:** aprobado por el propietario el 2026-09-27
**Nodos afectados:** `forge614-engram` (servidor, sincronización y comandos `cloud`). Sin cambio en Engines ni Shell: este diseño no toca el protocolo ni el bloque de arranque que ellos inyectan (sección 11).
**Actas que rigen:** 0023 (identidad portátil del proyecto), 0024 (evolución aditiva de datos y contratos), 0025 (contrato del ecosistema v2), 0027 (memoria inteligente de Engram en el procedimiento).
**Acta nueva:** 0030 *(decisión técnica del orquestador, a revisar: número tomado del último archivo en `forge614-ai/docs/decisions/`, el 0029 del 2026-09-26)*.
**Esbozo que reemplaza:** `forge614-engram/.agents/plans/2026-09-23--1.7.0-ecosystem-replication.md` (proponía un "formato 4" = formato 3 + `groups` + `memberships`, sincronizado por foto completa). Este diseño lo reemplaza entero: no hay foto completa (snapshot) ni `sync --upgrade-format`; en su lugar hay una lista de cambios numerada en Neon y una tarea en segundo plano que la lee y la alimenta (sección 6).

> Como una libreta de viaje que se llena en cualquier ciudad: lo que se anota allá no borra lo de acá, cada página nueva lleva su número de orden, y si dos manos escriben la misma línea el mismo día, gana la tinta más fresca — la otra queda guardada, nunca tachada.

## 1. Propósito

Que la memoria de Engram (proyecto, libreta personal y tablero del ecosistema) sea la misma en cualquiera de las dos Mac del propietario, aunque las use una a la vez y sin patrón fijo, sin escritura simultánea, sin que el arranque de sesión se sienta más lento, y sin perder nada si se queda sin internet.

## 2. Problemas verificados (2026-09-27)

| # | Problema | Evidencia |
|---|---|---|
| P1 | `sync`/`sync-watch` existen pero el propietario nunca los usó | `commands.ts:41-43` los despacha; `synchronization.ts:22-24` exige `POSTGRES_URL` o lanza `SYNC_DISABLED`; el `.env` real del propietario no tiene esa clave. |
| P2 | La réplica de hoy es una foto completa (snapshot), hasta 8 MiB, reconciliada entera en cada corrida | `synchronization.ts:5-15` (`reconcile` de local contra remoto); `replica.ts:95` (`SYNC_TOO_LARGE` sobre 8×1024×1024). |
| P3 | Un solo recuerdo de ecosistema bloquea **toda** la réplica | `snapshots.ts:14` (`SYNC_ECOSYSTEM_UNSUPPORTED` si existe algún `scope='ecosystem'`). |
| P4 | No viajan grupos, pertenencias, datos de memoria inteligente ni actividad de sesión | Tablas fuera de los formatos 1–3 (`snapshot.ts:15-17`): `ecosystem_groups` (`schema.ts:143`), `ecosystem_memberships` (`schema.ts:150`), `identity_events` (`schema.ts:157`), `memory_meta` (`schema.ts:225`), `session_activity` (`schema.ts:234`), `ecosystem_sources` (`schema.ts:239`). |
| P5 | Un conflicto detiene toda la sincronización | `assertExtension` (`snapshot.ts:183-206`) lanza `SYNC_CONFLICT` y `synchronize` no aplica nada de esa corrida. |
| P6 | No hay id de instalación por Mac | `forge614_sync.state` es una sola fila (`replica.ts:27-34`) con un `replica` uuid que identifica **la base remota**, no el equipo que escribe (`replica.ts:84`). |
| P7 | La identidad de proyecto depende hoy solo del archivo | `applyIdentityFile` (`project-identity.ts:46-64`) solo lee `.forge614/project.json`; tres repos del propietario no lo tienen en Git y `forge614-atlas` no lo tiene ni localmente. |

## 3. Decisiones tomadas con el propietario (2026-09-27)

| # | Decisión |
|---|---|
| M1 | Uso de una Mac a la vez, sin patrón fijo; no se diseña para escritura simultánea. |
| M2 | Solo Mac en 1.8.0; Windows queda fuera (sección 16). |
| M3 | Nube: Neon, un proyecto nuevo solo para Engram, creado por el propietario. |
| M4 | Viaja toda la memoria: recuerdos de proyecto, libreta y tablero, con sus datos de memoria inteligente (fijado/`pinned`, versión corta/`short`, afecta-a/`affects`), versiones e historial, sesiones y resúmenes, confirmaciones, proyectos, grupos y pertenencias. No viaja la dirección ni la contraseña de Neon. Primera sincronización: la Mac que la activa sube todo lo local; la otra Mac baja todo; lo local se conserva siempre. |
| M5 | Sincronización sola, sin comandos, como tarea en segundo plano dentro del mismo servidor MCP de Engram; solo arranca si la nube está configurada. Sin nube, Engram arranca exactamente como hoy. |
| M6 | El arranque no se siente más lento: sin nube, igual que hoy (medido); con nube, espera como máximo 1 s a la red (M13) y el resto baja por detrás. |
| M7 | Solo viajan los cambios: en Neon, una lista numerada (como tickets); cada Mac recuerda el último número leído y pide lo posterior. Al guardar: primero SQLite local (inmediato), el cambio entra a una cola local de pendientes (outbox), la tarea lo sube y lo tacha; sin internet la cola espera y sale en la próxima oportunidad. |
| M8 | Conflicto (mismo recuerdo cambiado en las dos Mac sin sincronizar): gana la versión más reciente, la otra queda en el historial, Engram avisa en la siguiente sesión; la sincronización nunca se detiene por esto. |
| M9 | Configuración por Mac en `~/.forge614/engram/.env` (nunca en `.forge614/project.json`, que va a Git), leída en cada arranque; se prende o apaga en cualquier momento y vale desde la siguiente sesión. Comandos nuevos: `cloud on` (prueba la dirección antes de guardarla), `cloud off`, `cloud status`. |
| M10 | La otra Mac reconoce cada proyecto primero por `.forge614/project.json` y, si falta, por la dirección del remoto de GitHub (`origin`), sin importar la carpeta. |
| M11 | Avisos: si algo lleva mucho sin subir, se avisa al abrir sesión. |
| M12 | Pruebas: primero dos "Macs de mentira" contra una rama de prueba de Neon y contra PostgreSQL local de pruebas; después, uso real con las dos Mac; además la suite completa como en CI. |
| M13 | Al abrir sesión con la nube prendida, se espera como máximo 1 s a bajar lo nuevo; si no llega, se sigue con lo local (sección 6). Descartado: no esperar nunca (la primera sesión tras cambiar de Mac no vería lo último). |

### Descartado (con motivo)

Sincronizador aparte cada pocos minutos (lo último puede no subir si se cierra la laptop) · solo la nube sin copia local (sin internet no hay memoria; reescritura grande) · detenerse y preguntar en conflictos (con uso irregular puede quedar parada días) · las dos versiones como recuerdos separados (duplicados) · reconocer proyectos solo por archivo (tres repos no lo tienen en Git) o solo por ruta (falla si se clona en otro lugar) · probar directo con memoria real (se prueba primero con Macs de mentira).

## 4. Quién hace qué

| Pieza | Responsabilidad |
|---|---|
| **Engram** | Implementa `cloud on/off/status`, la tarea en segundo plano, la lista de cambios en Neon, la cola de pendientes local, el id de instalación por Mac, reutiliza el filtro de secretos ya existente, pasa `sync`/`sync-watch` al mecanismo nuevo y marca obsoletos los formatos 1–3 (sección 10, acta 0024). |
| **forge614-ai** | Acta 0030, plan por tarea, laboratorio antes de entregar, medición en Notion. |
| **El propietario** | Crea el proyecto Neon; ejecuta `cloud on` en cada Mac. |

## 5. Qué viaja y qué no

**Viaja** (M4): `memories` de los tres ámbitos con su historial de versiones; `memory_meta` completo — fijado, versión corta, afecta-a (`meta.ts:27`); `sessions` + `sessionEntries` + `sessionSummaries`; `confirmations` + `confirmationRequests`; `projects`; `ecosystem_groups`; `ecosystem_memberships`; y `ecosystem_sources` *(decisión técnica del orquestador, a revisar: el propietario no lo nombró explícitamente, pero es la tabla del puntero de fuente de verdad del tablero por grupo — `schema.ts:239` — sin ella la nota de estado del ecosistema, acta 0027 §5.1, no sería igual en las dos Mac; se trata como parte del tablero)*.

**No viaja:** la dirección/contraseña de Neon (M4, sección 7); `identity_events`, que ya el esbozo reemplazado fijaba como bitácora local (`.agents/plans/2026-09-23--1.7.0-ecosystem-replication.md:10`); `.forge614/project.json`, que vive en Git (M9).

## 6. Cómo sincroniza

- **Lista de cambios en Neon:** cada escritura local relevante (memoria nueva o versión nueva, sesión, resumen, confirmación, grupo, pertenencia) genera una fila numerada de forma consecutiva, con su contenido y el id de instalación que la originó. *(Decisión técnica del orquestador, a revisar: forma mínima de esa tabla — `forge614_sync.changes(id bigserial, change_id text unique, installation_id uuid, kind text, op text, payload jsonb, created_at)`; `change_id` identifica cada fila de la cola local, así una subida repetida tras perder la respuesta de Neon no duplica el cambio — reemplaza `forge614_sync.revisions`/`state` de hoy, `replica.ts:27-34`.)* Cada Mac guarda en SQLite local el número más alto ya aplicado y pide los posteriores.
- **Al guardar:** primero SQLite local, igual que hoy (inmediato); la escritura entra también a una cola local de pendientes (outbox, tabla SQLite nueva); la tarea en segundo plano la sube en orden y la tacha al confirmarla Neon (M7).
- **Sin internet:** el arranque no espera la red más de 1 s (M13); la cola espera y sale en cuanto haya red, en esta sesión o en la siguiente.
- **Arranque (decisión del propietario, M13):** con la nube prendida, `startup-context` (el bloque que inyecta el gancho de Engines al abrir la sesión) y `memory_context` esperan **como máximo 1 segundo** a bajar lo nuevo de Neon; si no llega a tiempo, siguen con lo local y la tarea en segundo plano termina de bajarlo. Así, al cambiar de Mac, la primera sesión ya ve dónde se quedó. Costo: hasta 1 s más al abrir sesión, solo con la nube prendida (estimado ≈0,2 s con Neon despierta y ≈1 s dormida; se mide en el ensayo). Sin nube, el arranque no cambia (M5). La tarea en segundo plano arranca con el servidor MCP, igual que hoy SQLite se abre perezoso en `startMcp` (`server.ts:11,16`).
- **Conflicto:** mismo recuerdo cambiado en las dos Mac sin sincronizar entre sí → gana la versión con fecha más reciente; la otra queda en el historial, nunca se borra (como ya rige para duplicados, acta 0027 §5.4); Engram avisa en la siguiente sesión (M8); la sincronización no se detiene por esto, a diferencia de hoy, donde cualquier conflicto detiene toda la corrida (`snapshot.ts:183-206`).

## 7. Configuración por Mac y comandos nuevos

- `~/.forge614/engram/.env`, leído en cada arranque, igual que hoy lee `POSTGRES_URL` (`workspace-config.ts:83-84`); se prende o apaga en cualquier momento y vale desde la siguiente sesión (M9).
- `forge614-engram cloud on` — pide la dirección de Neon y la **prueba conectando antes de guardarla**, el mismo patrón que ya usa `init --postgres-url`: `applyMemoryInitialization` llama `validatePostgres`, que conecta de verdad antes de escribir el `.env` (`initialization.ts:72,90`; escritura protegida contra carreras en `configurePostgres`, `workspace-config.ts:105-124`).
- `cloud off` — quita la configuración sin tocar recuerdos locales.
- `cloud status` — prendida o no, última sincronización, pendientes en la cola.
- **Id de instalación:** un UUID por Mac, generado la primera vez que corre `cloud on` y guardado en el mismo `.env` (nunca en Git); identifica de dónde vino cada cambio para los avisos (M11) y el aviso de conflicto (M8). Hoy no existe nada así: la réplica solo identifica la base remota, en una fila única (`replica.ts:27-34,84`), no el equipo que escribe.

## 8. Identidad de proyecto en la otra Mac

Primero por `.forge614/project.json`, igual que hoy (`project-identity.ts:46-64`); si falta, por la dirección del remoto de GitHub (`origin`), sin importar la carpeta (M10) — esto es código nuevo: hoy Engram no lee remotos de Git. *(Decisión técnica del orquestador, a revisar: esa segunda vía solo se usa al reconciliar un cambio bajado de Neon que trae un proyecto sin `.forge614/project.json` local; el caso ya resuelto por archivo no cambia.)*

## 9. Secretos

El filtro de secretos sigue aplicando antes de guardar (`SECRET_REJECTED`, ya en 1.7.2 — `writes.ts:231`); se aplica igual a lo que llega de la nube y a lo que sale hacia ella, porque ambos pasan por el mismo camino de escritura local. La dirección de Neon nunca entra en un recuerdo ni en ninguna fila de la lista de cambios: vive solo en `.env` (sección 7), como ya ocurre hoy con `POSTGRES_URL` (`workspace-config.ts:83-124`).

## 10. `sync`/`sync-watch` y los formatos 1–3 hoy

Nadie más que el propietario ha instalado Engram (lo confirmó el 2026-09-27) y él nunca configuró la réplica, así que no hay datos que migrar. Aun así rige el acta 0024 (evolución aditiva: lo que deja de usarse se marca obsoleto, no se borra): `sync` sigue existiendo y pasa a significar «sincroniza ahora» con el mecanismo de la sección 6; `sync-watch` sigue existiendo, corre ese mismo ciclo cada cierto intervalo y queda marcado obsoleto (la tarea en segundo plano lo reemplaza), con su `sunset`. Los formatos de foto 1–3 (`snapshot.ts:15-17`) y las tablas `forge614_sync.revisions`/`state` (`replica.ts:27-34`) dejan de usarse y quedan marcados obsoletos; las tablas nuevas conviven con ellas sin tocarlas. `POSTGRES_URL` sigue siendo la única variable de conexión, con la misma verificación de TLS obligatorio fuera de loopback (`replica.ts:5-23`).

## 11. Versiones de Engines, Shell y el manual

Sin cambio en el manual: este diseño no toca el protocolo (`protocol.ts`) ni la forma del bloque de arranque; Engines y Shell no requieren versión nueva.

## 12. Pruebas

- Dos "Macs de mentira" en esta Mac (dos `HOME`/`FORGE614_HOME` distintos) contra una rama de prueba de Neon (Neon branch) y contra PostgreSQL local de pruebas (`FORGE614_TEST_POSTGRES_BIN`, como ya usa hoy la suite de réplica).
- Escenarios: primera sincronización sube todo / baja todo; cambio en A se ve en B; conflicto en el mismo recuerdo → ninguna versión se pierde y hay aviso; sin internet → la cola espera y sale después; proyecto sin `.forge614/project.json` reconocido por el remoto de GitHub.
- Uso real con las dos Mac del propietario, después de las Macs de mentira.
- Suite completa como en CI.
- Medición del arranque, en tiempo (mediana de 10 corridas de `startup-context` y de `memory_context`, como en la medición de 1.6.0): sin nube, igual que hoy (±2 ms); con nube, ≤ 1 s más en el peor caso (M13), con el tiempo real anotado despierta y dormida. En tokens, el mismo presupuesto de hoy (acta 0027 §8, ≤3000 de bloque + manual).

## 13. Orden de construcción y versiones

1. **Engram 1.8.0** — comandos `cloud on/off/status`, id de instalación, lista de cambios en Neon, cola de pendientes, `sync`/`sync-watch` sobre el mecanismo nuevo y formatos 1–3 marcados obsoletos (acta 0024).
2. **forge614-ai** — acta 0030, plan por tarea, laboratorio, medición en Notion.

Mientras la nube no esté configurada, Engram arranca exactamente como hoy (M5).

## 14. Orquestación y medición

`forge614-ai` orquesta: plan en `forge614-ai`, tareas en `forge614-engram` con worker — una tarea = una sesión nueva, cada prompt con su nombre (`[Engram · T…]`), como ya rige (acta 0027 §10). Laboratorio con las Macs de mentira antes de entregar. Medición solo desde los registros de la herramienta (Claude Code `~/.claude/projects/…/*.jsonl`, Codex `~/.codex/sessions/…/*.jsonl`, OpenCode `~/.local/share/opencode/opencode.db`), con evidencia en Notion, base "Corridas de agentes" (página "Forge614 · Laboratorio de agentes").

## 15. Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | La cola de pendientes (outbox) crece si una Mac pasa muchos días sin red. | Se mide en la primera tarea; `cloud status` ya lo muestra (M11). |
| R2 | Neon gratis se suspende y tarda en despertar. | El arranque espera como máximo 1 s (M13) y sigue con lo local; la tarea en segundo plano termina de bajar. |
| R3 | Un conflicto mal explicado confunde al propietario. | Aviso explícito en la siguiente sesión con qué pasó y dónde quedó la otra versión (M8). |
| R4 | Reconocer un proyecto por el remoto de GitHub falla si ese remoto cambia. | Nunca mezcla en silencio: si no hay archivo ni remoto reconocible, se trata como proyecto nuevo; nunca se adivina (sección 8). |
| R5 | La lista de cambios en Neon crece sin límite. | Se revisa con datos de uso reales antes de fijar una poda; fuera de este diseño (sección 16). |
| R6 | Los formatos 1–3 quedan como código obsoleto que nadie usa. | Marcados obsoletos con `sunset` (sección 10); su retiro real, solo en una versión mayor con acta (0024). |

## 16. Fuera de este diseño

Windows (M2); sincronización simultánea o escritura concurrente (M1); búsqueda por significado, un "archivista" en segundo plano y cambios a Atlas, Workers y Hub (ya fuera del diseño anterior, acta 0027 §12); poda de la lista de cambios en Neon (R5).

## 17. Terminado

- Engram 1.8.0 publicado e instalado en las dos Mac del propietario, con `cloud on` corrido en cada una.
- Primera sincronización real: la Mac que faltaba tiene la misma memoria (proyecto, libreta, tablero, grupos y pertenencias) que la otra.
- Un conflicto de prueba deja la versión más reciente activa, la otra en el historial, con aviso en la siguiente sesión.
- El arranque medido cabe en el mismo presupuesto de hoy (acta 0027).
- `cloud status` reporta pendientes y última sincronización en las dos Mac.
- Las Macs de mentira y la suite completa pasan en CI.
