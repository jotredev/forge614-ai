# 0023 — Identidad portátil del proyecto en el repositorio (`.forge614/project.json`, propiedad de Engram)

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

Engram vincula hoy un proyecto a la **ruta** de su carpeta. Mover o renombrar la carpeta, o clonar el repositorio en otra máquina, rompe el vínculo y la memoria "desaparece". El acta 0022 añade el ámbito `ecosystem`; para que la pertenencia a un grupo sea estable necesita una identidad de proyecto igual de estable. El propietario exige que esto lo resuelva el producto, que Engram sea el dueño (es la memoria de todo), que renombrar un proyecto no rompa nada, que la pregunta de grupo no sea repetitiva y que funcione aunque solo se instale Engram.

Patrones aplicables: identidad portátil en el repositorio (como `package.json` nombra un paquete o `.git` identifica un repositorio); configuración declarativa versionada; propiedad exclusiva de archivo por componente.

## Decisión

1. **Archivo de identidad.** Engram escribe y posee `.forge614/project.json` en la raíz del repositorio, versionado en Git:

   ```json
   {
     "schemaVersion": 1,
     "project":   { "id": "<UUID>", "name": "frontend" },
     "ecosystem": { "id": "<UUID>", "name": "mi-tienda" }
   }
   ```

   `ecosystem` es `null` para un proyecto suelto. Los `id` son la verdad; los `name` son para personas.
2. **Resolución por identidad, no por ruta.** `startup-context`, `context`, `session-start` y toda operación que reciba `--directory` leen primero `.forge614/project.json`; la ruta queda como pista informativa. Si el `id` no existe en la base local, Engram registra el proyecto (y el grupo) con ese `id` sin preguntar: así un clon en otra máquina conserva identidad, y la réplica PostgreSQL une ambas.
   **Escritura silenciosa e idempotente.** Engram escribe el archivo sin preguntar ni avisar (es configuración del producto, necesaria para funcionar, como la de cualquier herramienta). Si el archivo ya existe, **nunca lo reemplaza ni cambia los `id`**: lo lee y, como máximo, completa campos que falten; `init`, `project-bind` o `prepare` repetidos son inofensivos. Si la base local tenía esa carpeta vinculada a otro `id`, **gana el archivo** (la identidad viaja con el repositorio): Engram re-vincula y registra el evento; el archivo no se toca. El único diálogo posible con la persona es la pregunta de grupo (punto 4); el archivo nunca es tema de conversación.
3. **Renombrar no rompe nada.** Cambiar `name` del proyecto o del grupo se hace con los comandos de Engram y actualiza el archivo; el `id` nunca cambia. Mover o renombrar la carpeta no requiere ninguna acción.
4. **Cuándo se pregunta el grupo (una sola vez, solo en flujos visuales).** Si existe el archivo, nunca se pregunta. Si no existe y el flujo es visual (Shell `init --product engram` hoy; `forge614 prepare` en la Entrega 1, reutilizando la misma pantalla de Shell), se pregunta una vez y se escribe el archivo. Si no existe y el comando es no interactivo (`init --json`, `project-bind`, gancho de arranque, `prepare --yes`), se vincula el proyecto sin grupo, se escribe el archivo con `ecosystem: null` y se informa; nada se inventa. Un `forge614.node.json` con `ecosystem` vincula al grupo declarado sin preguntar.
5. **Pantalla de selección de grupo** (Shell): primero "Grupos existentes" con nombre y proyectos que contiene; una línea divisoria; después "Crear un grupo nuevo…" y "Es un proyecto suelto (sin grupo)". Sin grupos existentes, la primera sección no aparece.
6. **Propiedad de `.forge614/`.** Es la carpeta de Forge614 dentro del proyecto. Cada nodo escribe solo su archivo (Engram: `project.json`; el Hub, en su entrega: `lock.json`; forge614-ai: políticas del proyecto). Ningún nodo toca el archivo de otro; el verificador lo comprueba cuando existan los esquemas.
7. **Solo Engram instalado.** Instalar Engram instala obligatoriamente Shell y Engines (acta 0001), así que la pantalla siempre existe: Engram provee toda la capacidad de forma no interactiva y Shell pone la pregunta; `prepare` no añade una pregunta nueva. **Solo Shell instalado** (sin Engram): no hay memoria de Forge614, por lo tanto no hay archivo ni pregunta; Shell trabaja con la memoria propia del asistente.

## Alternativas descartadas

- **Seguir vinculando por ruta.** Es exactamente lo que falla al mover, renombrar o clonar.
- **Un archivo solo para el grupo (`ecosystem.json`).** Deja la identidad del proyecto atada a la ruta; el grupo sería estable pero el proyecto no. Se sustituye por `project.json`, que contiene ambas.
- **Que forge614-ai sea dueño del archivo.** Rompe el modelo de paquetes: un usuario que solo instala Engram no tendría identidad portátil.
- **Preguntar en cada arranque si el proyecto pertenece a un grupo.** Repetitivo; contra la huella mínima y contra la experiencia acordada.

## Consecuencias

- El acta 0022 pasa a usar `.forge614/project.json` (sección `ecosystem`) en lugar de `.forge614/ecosystem.json`.
- Engram: migración de datos (proyectos existentes vinculados por ruta reciben su `project.json` al siguiente `startup-context`/`session-start` en esa carpeta, con aviso en el resultado), esquema Zod `.strict()` del archivo, comandos `project-rename` y `group-rename` que actualizan el archivo, `startup-context` con `project.source: "file" | "path" | "unbound"`.
- Shell: pantalla de selección de grupo en `init --product engram`; `getStartupContext` acepta el bloque `ecosystem`.
- Engines: el gancho de arranque no cambia (delega en `startup-context`).
- Impacto en el procedimiento de agentes: **Sí** (los asistentes deben inyectar el bloque `ecosystem`; revalidación de los soportados).
- El traspaso `docs/handoffs/2026-09-22-engram-ecosystem-scope.md` incorpora esta acta.

## Referencias

- Actas relacionadas: 0003 (prepare), 0020 (huella mínima), 0022 (ámbito ecosystem).
- Engram: topicKey `forge614-ai/decisions/portable-project-identity`.
