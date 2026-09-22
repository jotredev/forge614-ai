# 0022 — Ámbito "ecosistema" en Engram: memoria compartida entre repositorios relacionados, resuelta por el producto

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

> **Principio (del propietario):** esto se resuelve en la raíz, en el producto, para cualquier persona que instale Forge614. Ningún usuario debe guardar recuerdos a mano ni saber que existen ámbitos: el ecosistema se detecta y se vincula solo. El puntero compartido creado el 2026-09-22 en la memoria del propietario es un parche de sesión y se retira al publicar esta capacidad.

## Contexto

Engram guarda memoria en dos ámbitos: `shared` (la persona, en todos sus proyectos) y `project` (un repositorio vinculado a una carpeta). Las decisiones, el estándar y los procedimientos del ecosistema Forge614 se registran hoy bajo el proyecto `forge614-ai`; una sesión abierta en `forge614-engram` o en `forge614-shell` no los ve. Evidencia real: Shell abierto desde el repositorio de Engram respondió sobre cómo agregar un asistente sin conocer el runbook ni las actas. Meter todo el conocimiento del ecosistema en `shared` lo haría visible también en proyectos ajenos a Forge614, contra la regla de huella mínima (acta 0020).

Patrones aplicables: ámbitos jerárquicos de configuración (sistema → global → local), resolución en cascada con precedencia del más específico, grupos de proyectos (workspace) como unidad de pertenencia.

## Decisión

1. Engram incorpora un tercer ámbito, **`ecosystem`**: un grupo de proyectos con nombre estable, memorias propias, sesiones y búsqueda, con la misma semántica de `topicKey`, versiones y refuerzo que los otros ámbitos. Es una capacidad **general del producto** para cualquier conjunto de repositorios relacionados (microservicios, microfrontends, monorepos partidos, el propio ecosistema Forge614); no es una función para mantenedores.
2. Un proyecto pertenece como máximo a un grupo. Engram expone la vinculación de forma no interactiva (`forge614-engram group-bind --project-id <UUID> --group <nombre>` y su equivalente en el SDK), pero **la persona nunca la ejecuta a mano**: `forge614 prepare` (Entrega 1) detecta el grupo y vincula solo, con estas reglas de detección, en orden: (a) `forge614.node.json` declara `ecosystem` (los nodos Forge614 lo traen de fábrica: `forge614`); (b) `.forge614/project.json` con sección `ecosystem` (escrito por Engram la primera vez que se vincula el proyecto y compartido por Git; acta 0023); (c) si no hay ninguno y el flujo es visual (Shell `init --product engram` hoy, `prepare` después), se pregunta una sola vez con los grupos existentes separados de las acciones "crear nuevo" y "proyecto suelto"; en flujos no interactivos no se pregunta: se vincula sin grupo y se informa. Hasta que exista `forge614 prepare`, `forge614-engram init`/`project-bind` aplican (a) y (b) sin preguntar y Shell hace la pregunta.
   **Nada se infiere**: ni por nombres de carpeta, ni por cercanía en disco, ni por remotos de Git, ni por parecido. La pertenencia es siempre una declaración explícita en el repositorio, versionada en Git (patrón: configuración declarativa en el repo, como `.nvmrc` o `CODEOWNERS`).
   La declaración vive en `.forge614/project.json`, el archivo de identidad portátil del proyecto que Engram escribe y posee (acta 0023): `{ "schemaVersion": 1, "project": { "id", "name" }, "ecosystem": { "id": "<UUID>", "name": "<nombre>" } | null }`. El `id` del grupo es su identidad (se genera al crearlo y viaja con el repo); el `name` es para personas. (El nombre `ecosystem.json` usado en el primer borrador de esta acta queda sustituido.) Al clonar el repo en otra máquina, Engram reconoce o crea el grupo por `id` y vincula sin preguntar, aunque exista otro grupo con el mismo nombre. Un repositorio es un proyecto y pertenece como máximo a un grupo; un monorepo es un solo proyecto. Cambiar o quitar el grupo es editar ese archivo (o `forge614 ecosystem set|unset`) y queda registrado como evento; borrar el archivo deja el proyecto sin grupo. `prepare --yes` nunca inventa un grupo: sin archivo, sin grupo, y lo dice.
3. `startup-context` y `context` devuelven `shared` + `ecosystem` (si el proyecto pertenece a un grupo) + `project`, en ese orden y cada uno con su propio límite de bytes; el protocolo público de memoria pasa a versión 3 anunciando el ámbito nuevo; las versiones 1 y 2 quedan byte-idénticas.
4. Las herramientas MCP `memory_save`, `memory_search`, `memory_context` aceptan `scope: "ecosystem"`; `memory_save` en ese ámbito exige `groupIntent` (explicación de por qué aplica a todo el ecosistema), simétrico al `globalIntent` de `shared`.
5. Precedencia al resolver un `topicKey` repetido: `project` sobre `ecosystem` sobre `shared`.
6. Ninguna memoria existente cambia de ámbito automáticamente; migrar decisiones de `forge614-ai` al grupo `forge614` es una operación explícita y registrada.

## Alternativas descartadas

- **Guardar el conocimiento del ecosistema como `shared`.** Contamina el contexto de proyectos ajenos a Forge614 y viola la huella mínima. Se usa solo, de forma transitoria, un puntero corto a la fuente de verdad (memoria `forge614/ecosystem/source-of-truth-pointer`).
- **Que cada nodo lea directamente la base de `forge614-ai`.** Rompe la identidad de proyecto y el contrato de Engram (nadie lee SQLite ajeno).
- **Resolverlo solo con el gancho de mantenedor (acta 0009, fase 0.5).** El gancho inyecta reglas y punteros, no memoria viva de decisiones y sesiones; son complementarios, no sustitutos.

## Consecuencias

- Cambio de contrato en Engram: esquema (tabla de grupos y pertenencia), CLI, SDK, MCP, `startup-context`, protocolo v3, docs 03/09/10 es/en, `notion-map`. Requiere plan propio en `forge614-engram` y traspaso desde `forge614-ai` con el formato acordado.
- Engines (gancho) y Shell (`getStartupContext`) deben aceptar el bloque `ecosystem` como opcional y saneado; impacto en el procedimiento de agentes: **Sí** (todo asistente debe inyectar los tres ámbitos).
- El puntero compartido transitorio se retira cuando el ámbito exista y las decisiones estén migradas; su retiro es un paso del plan de Engram, no una tarea manual.
- El contrato del ecosistema y el estándar (spec §4.1) añaden el campo `ecosystem` a `forge614.node.json`; el esquema del puntero de nodo se extiende (plan 0.1, Task 4 o posterior) y todos los nodos Forge614 declaran `"ecosystem": "forge614"`.
- Costo asumido: una migración de esquema en Engram y una versión más del protocolo.

## Referencias

- Actas relacionadas: 0009 (centralización), 0015 (registro de decisiones), 0017 (procedimiento de agentes), 0020 (huella mínima).
- Engram: topicKey `forge614-ai/decisions/ecosystem-scope` (al aceptarse).
