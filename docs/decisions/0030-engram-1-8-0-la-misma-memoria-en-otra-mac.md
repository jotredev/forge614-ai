# 0030 — Engram 1.8.0: la misma memoria en otra Mac

**Fecha:** 2026-09-27
**Estado:** aceptada
**Sesión:** forge614-ai-orquestador-2026-09-27-engram-1-8-0

## Contexto

El propietario usa dos Mac, una a la vez, sin patrón fijo, y quiere la misma memoria de Engram (proyecto,
libreta personal y tablero del ecosistema) en cualquiera de las dos. La réplica de hoy (formatos 1-3,
`src/app/synchronization.ts`, `src/infrastructure/postgres/replica.ts`) nunca se configuró en la práctica
(P1) y tiene límites verificados el 2026-09-27: es una foto completa de hasta 8 MiB reconciliada entera en
cada corrida (P2, `replica.ts:95`); un solo recuerdo de ecosistema bloquea toda la réplica
(P3, `snapshots.ts:14`); no viajan grupos, pertenencias, datos de memoria inteligente ni actividad de sesión
(P4); un conflicto detiene toda la sincronización (P5, `snapshot.ts:183-206`); no hay id de instalación por
Mac (P6, `replica.ts:27-34,84`); y la identidad de proyecto depende solo de `.forge614/project.json`, que
tres repos del propietario no tienen en Git (P7).

El esbozo previo (`forge614-engram/.agents/plans/2026-09-23--1.7.0-ecosystem-replication.md`, «formato 4»)
proponía extender la foto completa con `groups` y `memberships`, sincronizada entera. El diseño
`docs/superpowers/specs/2026-09-27-engram-1-8-0-otra-mac-design.md` (aprobado por el propietario el
2026-09-27) lo reemplaza entero: no hay foto completa ni `sync --upgrade-format` como mecanismo principal;
en su lugar hay una lista de cambios numerada en Neon y una tarea en segundo plano que la lee y la alimenta.

## Decisión

Se adoptan las decisiones M1-M13 del diseño y las decisiones técnicas del orquestador D1-D11, D13 y D14 que las
implementan:

- **M1-M3.** Una Mac a la vez, sin escritura simultánea; solo Mac en 1.8.0 (Windows queda fuera); la nube es
  un proyecto de Neon nuevo, creado por el propietario, solo para Engram.
- **M4.** Viaja toda la memoria (recuerdos de los tres ámbitos con historial, datos de memoria inteligente,
  sesiones, resúmenes, confirmaciones, proyectos, grupos y pertenencias); no viaja la dirección ni la
  contraseña de Neon. Primera sincronización: la Mac que activa la nube sube todo lo local; la otra baja
  todo; lo local se conserva siempre.
- **M5-M6.** Sincronización sola, como tarea en segundo plano dentro del servidor MCP, solo si hay nube
  configurada; sin nube, Engram arranca exactamente como hoy; con nube, espera como máximo 1 s a la red.
- **M7 / D1 / D2.** Solo viajan los cambios: en Neon, una lista numerada; cada Mac recuerda el último número
  leído. Al guardar: primero SQLite local, el cambio entra a una cola local de pendientes (outbox) **en la
  misma transacción del guardado**, la tarea en segundo plano la sube y la tacha. La cola vive en un nivel de
  esquema SQLite nuevo, el **12**, activado SOLO por `cloud on` (enrollment explícito, igual que el nivel 11
  de memoria inteligente); sin nube, la base no cambia y el arranque es el de hoy. La cola se alimenta con
  disparadores SQL por tabla, con una guardia que el aplicador de cambios bajados prende y apaga dentro de
  su propia transacción para no volver a encolar lo que acaba de bajar.
- **M7 / D3.** En Neon: `forge614_sync.changes(id bigserial primary key, change_id text not null unique,
  installation_id uuid not null, kind text not null, op text not null, payload jsonb not null, created_at
  timestamptz not null default now())`, creada si falta; `change_id` identifica cada fila de la cola local,
  así una subida repetida tras perder la respuesta de Neon no duplica el cambio; las tablas `revisions`/`state` de hoy no se tocan. Misma variable `POSTGRES_URL` y misma
  verificación de TLS obligatorio fuera de loopback.
- **M8 / D4.** Conflicto de recuerdos: gana la versión con fecha más reciente; la otra queda en el
  historial, nunca se borra; se avisa una vez en el siguiente `memory_session_start`, como dato, nunca como
  orden. La sincronización nunca se detiene por esto. Las demás tablas: la fila más reciente gana, sin aviso.
- **M9 / D9.** Configuración por Mac en `~/.forge614/engram/.env`, nunca en Git; comandos nuevos `cloud
  on` (prueba la dirección antes de guardarla), `cloud off`, `cloud status`. Id de instalación: un UUID por
  Mac (`FORGE614_ENGRAM_INSTALLATION_ID`), generado por `cloud on`.
- **M10 / D6.** La otra Mac reconoce cada proyecto primero por `.forge614/project.json` y, si falta, por la
  dirección normalizada del remoto de Git (`origin`), solo al aplicar un cambio de un proyecto que no existe
  localmente; sin coincidencia, se crea como proyecto nuevo sin carpeta; nunca se adivina.
- **M11 / D11.** Aviso de cola vieja: si el pendiente más viejo tiene más de 24 h, se avisa al abrir sesión.
- **M12.** Pruebas: primero dos «Macs de mentira» contra una rama de prueba de Neon y contra PostgreSQL
  local de pruebas; después, uso real con las dos Mac; suite completa como en CI.
- **M13 / D8.** Al abrir sesión con la nube prendida, `startup-context` y `memory_context` esperan como
  máximo 1 s a bajar lo nuevo de Neon; si no llega, siguen con lo local.
- **D5.** El filtro de secretos ya existente se aplica también a lo que llega de Neon antes de escribir; un
  cambio rechazado se salta y queda un aviso, sin detener la sincronización.
- **D7.** La tarea en segundo plano vive dentro del servidor MCP, arranca solo con nube configurada y nivel
  12; ciclo de 30 s más uno al guardar (con retraso corto para agrupar); errores de red se reintentan en el
  siguiente ciclo sin ruido.
- **D10.** `sync` pasa a significar «sincroniza ahora» con el mecanismo nuevo; `sync-watch` sigue existiendo,
  corre ese mismo ciclo por intervalo, y queda marcado obsoleto con `sunset 2027-03-31`; `sync
  --upgrade-format` y los formatos de foto 1-3 quedan obsoletos, sin borrarse (acta 0024).
- **D13.** `cloud on` pide la dirección de Neon en la terminal con entrada oculta; en el uso real la corre el
  propietario en su propia terminal, así la dirección no entra a ningún registro de una sesión de IA.
- **D14.** Primera sincronización: activar la nube encola toda la memoria local en orden de dependencias;
  si `cloud on` apunta a otra base, se trata como primera vez (se vuelve a encolar todo y se baja desde 0).

## Alternativas descartadas

- **Base aparte `sync.db` para la cola de pendientes (D1):** no toca el esquema de la base principal, pero
  el guardado y la cola no quedarían en la misma transacción; se perdería la garantía de «nada se pierde si
  se cierra la laptop» que exige M7. Descartada a favor del nivel de esquema 12 en la misma base.
- **Sincronizador aparte cada pocos minutos:** lo último puede no subir si se cierra la laptop antes del
  ciclo (M7 lo descarta).
- **Solo la nube, sin copia local:** sin internet no habría memoria; además implicaría una reescritura
  grande del almacenamiento (M4/M5 lo descartan).
- **Detenerse y preguntar en cada conflicto:** con el uso irregular del propietario (una Mac a la vez, sin
  patrón fijo) podría quedar parada días (M8 lo descarta).
- **Las dos versiones de un conflicto como recuerdos separados:** produce duplicados; se prefiere una activa
  y la otra en el historial, como ya rige para duplicados (acta 0027 §5.4).
- **Reconocer proyectos solo por archivo o solo por ruta:** tres repos del propietario no tienen
  `.forge614/project.json` en Git, y reconocer solo por ruta falla si se clona en otro lugar (M10 lo
  descarta; se usa el remoto de Git como segunda vía, nunca como adivinanza).
- **No esperar nunca a la red al abrir sesión:** la primera sesión tras cambiar de Mac no vería lo último
  (M13 lo descarta a favor de una espera acotada a 1 s).
- **Probar directo con memoria real del propietario:** se prueba primero con Macs de mentira y una rama de
  prueba de Neon, antes de tocar datos reales (M12).
- **El «formato 4» del esbozo previo (foto completa + `groups`/`memberships`):** repite los límites P2, P3 y
  P5 de la réplica de hoy a mayor escala; reemplazado entero por la lista de cambios numerada.

## Consecuencias

- Contratos que se actualizan: CLI (`cloud on/off/status`, `sync`/`sync-watch` obsoletos, D10), esquema
  SQLite (nivel 12), esquema Neon (`forge614_sync.changes`, D3), y la respuesta de `memory_session_start`
  (aviso de conflicto y de cola vieja, junto a `sessionNotice` de 1.7.2, como dato).
- Trabajo que se habilita: `forge614-engram` 1.8.0 puede instalarse en las dos Mac del propietario y activar
  la nube (`docs/superpowers/plans/2026-09-27-engram-1-8-0.md`, tareas T1-T10).
- Trabajo que se bloquea o queda fuera de este diseño: Windows; sincronización simultánea o escritura
  concurrente; búsqueda por significado, un «archivista» en segundo plano y cambios a Atlas, Workers y Hub;
  poda de la lista de cambios en Neon (riesgo R5 del diseño, revisada con datos de uso reales antes de fijar
  una poda).
- Riesgos aceptados: la cola de pendientes puede crecer si una Mac pasa muchos días sin red (mitigado con
  medición en la primera tarea y `cloud status`); Neon gratis puede suspenderse y tardar en despertar
  (mitigado por la espera acotada de 1 s y la tarea en segundo plano); un conflicto mal explicado podría
  confundir al propietario (mitigado con el aviso explícito de D4); reconocer un proyecto por el remoto de
  Git falla si ese remoto cambia (mitigado: sin archivo ni remoto reconocible, se trata como proyecto nuevo,
  nunca se adivina); los formatos 1-3 quedan como código obsoleto (su retiro real, solo en una versión mayor
  con acta propia, acta 0024).
- El proyecto de Neon lo crea el propietario solo cuando la tarea T6 del plan esté cerrada y verificada y
  antes del laboratorio L1, con una rama de prueba `prueba-1-8-0` que se borra al cerrar T10.
- Esta acta es una decisión técnica del orquestador (D1-D11, D13 y D14 derivan del diseño ya aprobado por el
  propietario el 2026-09-27); el propietario confirmó D1, D13 y D14 el 2026-09-27 (opción A en las tres:
  cola en la misma base con nivel 12, dirección de Neon pegada por él con entrada oculta, primera vez sube
  toda la memoria).

## Referencias

- Plan: `docs/superpowers/plans/2026-09-27-engram-1-8-0.md`
- Spec: `docs/superpowers/specs/2026-09-27-engram-1-8-0-otra-mac-design.md`
- Memoria Engram: `topicKey` pendiente de asignar al cerrar el plan
- Actas relacionadas: `0023` (identidad portátil del proyecto), `0024` (evolución aditiva de datos y
  contratos), `0025` (contrato del ecosistema v2), `0027` (memoria inteligente de Engram en el
  procedimiento), `0029` (revalidación de Engram 1.7.2)
