# Estándar de Nodo Forge614 — versión 1.0.2

> Norma vinculante para todo repositorio del ecosistema Forge614. "Debe" significa que el verificador lo comprueba o que la revisión humana lo exige antes de fusionar. Las decisiones que lo originan están en `docs/decisions/` de `forge614-ai`.

## 1. Identidad y contrato del nodo

- Todo repositorio del ecosistema lleva en su raíz `forge614.node.json`:

  ```json
  {
    "schemaVersion": 1,
    "node": "engram",
    "kind": "product | internal",
    "standard": { "version": "1.0.0", "sha256": "<huella del paquete del estándar>" }
  }
  ```

  `kind: internal` marca piezas que nadie instala a mano (Engines, Workers).
- Todo nodo lleva `CONTRACT.md` y `CONTRACT.en.md` en la raíz, con secciones fijas: propósito en una frase; qué hace; qué no hace; dependencias (nodos y binarios externos); comandos públicos con esquema de entrada, esquema de salida y `schemaVersion`; códigos de error; requisitos obligatorios para agentes de IA soportados (enlace al procedimiento central); política de compatibilidad. El contrato se actualiza en el mismo cambio que modifica cualquiera de esos puntos.
- `FORGE614_ECOSYSTEM_CONTRACT.md` no se copia. Cada repositorio lo referencia por el puntero; el verificador comprueba que el texto local, si existe, es byte-idéntico al publicado por `forge614-ai` para la versión fijada.

## 2. Estructura del repositorio y capas

```
<nodo>/
├── forge614.node.json
├── CONTRACT.md · CONTRACT.en.md · README.md · CHANGELOG.md · SECURITY.md · LICENSE
├── src/
│   ├── modules/          reglas y tipos puros; sin I/O; solo node:crypto, node:util y zod
│   ├── app/              casos de uso; orquesta modules e infrastructure
│   ├── infrastructure/   disco, procesos, red, bases de datos
│   └── interfaces/       cli/, mcp/: traducen entrada externa a casos de uso
├── tests/architecture/   prueba de reglas de importación (AST) y de árbol final
├── docs/
│   ├── es/ · en/         numerados 00–NN, paridad uno a uno, analogía inicial
│   ├── decisions/        actas 0001-…
│   └── notion-map.json   espejos y huellas
├── scripts/              solo lo que el estándar no provee (mínimo)
└── .github/workflows/    verify.yml y release.yml generados desde la plantilla
```

- Dependencias solo hacia adentro: `interfaces → app → (modules, infrastructure)`, `infrastructure → modules`. `modules` no importa nada externo salvo `node:crypto`, `node:util` y `zod` (validación pura, sin I/O). Verificado por prueba AST (la de Engram es la referencia).
- Tests unitarios junto al código (`x.ts` + `x.test.ts`); integración en `__tests__/`; los que requieren binarios reales o cuentas se marcan y se excluyen de CI por defecto.
- Un nodo no importa carpetas internas de otro nodo. Consume solo binarios por ruta canónica (`~/.forge614/<nodo>/bin/`) o SDK público publicado y versionado. Prohibido `file:../otro-nodo` en `package.json`.

## 3. Stack

- TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Sin `any`, sin `@ts-ignore`, sin `as` sobre datos externos.
- Bun como gestor y ejecutor de desarrollo; `bun.lock` único lockfile; `bun install --frozen-lockfile` en CI.
- **Zod en toda frontera**: argumentos de CLI, stdin, archivos de configuración, respuestas de otros nodos, payloads MCP, respuestas de red. Esquemas `.strict()`; campos desconocidos son error. Dentro de la frontera, todo es tipado y confiable.
- Runtime de distribución: binario compilado (`bun build --compile`) por plataforma. Un nodo que hoy requiere Node en runtime (Shell) documenta la excepción en su contrato con fecha de retiro.

## 4. Contratos de máquina

Convención única (acta 0013): cambia el formato que Shell leía de Engines, por lo que se adopta con `schemaVersion` nuevo y una ventana de compatibilidad de una versión.

- Toda salida de datos va a **stdout** como un solo objeto JSON con `schemaVersion` entero en la raíz.
- Todo error va a **stderr** como `{ "schemaVersion": n, "code": "CODIGO_ESTABLE", "error": "mensaje para personas en el idioma configurado" }`, sin rutas crudas, sin stack traces, sin secretos.
- Códigos de salida: `0` éxito; `1` error; `2` entrada inválida; `75` pausa recuperable (cuota); otros solo si el contrato del nodo los documenta.
- Flujos de eventos: NDJSON en stdout, un objeto por línea, cada uno con `schemaVersion` y `event`; evento terminal garantizado.
- `--help` y `--version` siempre disponibles y nunca bloqueantes.
- Cambios incompatibles suben `schemaVersion`; el consumidor rechaza versiones que no conoce con `SCHEMA_UNSUPPORTED`.
- El `code` es un identificador estable en `MAYUSCULAS_CON_GUION_BAJO` (regex `^[A-Z][A-Z0-9_]+$`), listado en el `CONTRACT.md` del nodo. Los nodos con interfaz humana derivan el texto del mismo `code` mediante un catálogo tipado por idioma (8).

## 5. Patrones obligatorios

Se nombran por problema. Una abstracción que no responde a un problema listado se justifica en `Decisions` del plan o no entra. **Toda decisión de diseño nombra su patrón canónico; una analogía nunca sustituye al nombre del patrón** (el Anexo A mapea cada elemento del ecosistema a su patrón).

| Problema | Patrón | Referencia existente |
|---|---|---|
| Estructura | Arquitectura limpia por capas (2) | Engram |
| Proveedores externos (asistentes de IA, Git, disco) | Puertos y adaptadores: una interfaz por capacidad, un adaptador por proveedor, registro con manifiesto de capacidades validado al arrancar (fallo cerrado) | Engines |
| Comandos CLI | Cada comando es un caso de uso puro con entrada validada y salida tipada; la CLI solo traduce | — |
| Entradas externas | Esquema en la frontera (3) | Engram (MCP) |
| Errores | Modelo único: código estable + mensaje bilingüe + causa interna no expuesta | — |
| Cambios en archivos de terceros | Plan → instantánea → aplicar → verificar → revertir, con guarda contra cambios intermedios | Engines |
| Estado de trabajo | Bitácora de eventos inmutable + máquina de estados explícita | Diseñado |
| Persistencia | Repositorio: el dominio ignora si hay SQLite o PostgreSQL | Engram |
| Configuración | Tipada, validada al arrancar, por capas (ecosistema → proyecto → corrida) | Diseñado |
| Decisiones | Acta por decisión (9) | — |

## 6. Instalación

- **Tres sistemas operativos, siempre** (acta 0018): todo nodo publica binarios e instalador para macOS (arm64 y x64), Linux (arm64 y x64) y Windows (x64). No hay excepciones ni "pendiente"; un nodo sin uno de los tres no se libera.
- Un solo `install.sh` y un solo `install.ps1`, **generados desde la plantilla** de `forge614-ai/standard/templates/`, parametrizados por nombre de nodo, repositorio y activos. Ningún nodo escribe el suyo.
- Destino `~/.forge614/<nodo>/<versión>/` con lanzador estable `~/.forge614/<nodo>/bin/<nodo>` y archivo `.active-version`. `FORGE614_HOME` sustituye `~/.forge614` en todos los nodos, sin excepción.
- Descarga solo por HTTPS; verificación SHA-256 obligatoria contra `SHA256SUMS` del mismo release; el instalador nunca ejecuta scripts remotos sin verificar su huella.
- Sin dependencia de Node ni Python en la máquina destino: el instalador resuelve el release con herramientas del sistema o con un binario auxiliar publicado.
- Ningún nodo edita el `PATH` ni archivos de perfil del usuario. Solo `forge614-ai` crea el comando global `forge614`, y pregunta antes.
- Desinstalación simétrica: retira primero sus integraciones en asistentes (ganchos, MCP, instrucciones) mediante los contratos públicos, luego borra solo su directorio. Nunca `~/.forge614/` completo.
- Actualización (`<nodo> update`): descarga y verifica el instalador **de la release destino**, permite `--version`, y registra la versión previa para revertir.

## 7. Release, versionado y workflows

- `bun release` es un paquete compartido publicado por `forge614-ai` (origen: el script probado de Engines), no una copia por repositorio: sugiere versión por commits convencionales, valida contra tags, sincroniza `productVersion` en `notion-map.json`, corre tests y typecheck, ejecuta el verificador, aplica la puerta del procedimiento de agentes (12), etiqueta, empuja y sigue la ejecución de CI.
- SemVer estricto. Commits convencionales obligatorios (`feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `ci`; `!` o `BREAKING CHANGE` para mayor).
- `CHANGELOG.md` generado por `bun release`; nunca editado a mano.
- CI desde plantilla: `verify.yml` en push y PR ejecuta `bun install --frozen-lockfile` y `bun run verify`, que encadena typecheck, tests, paridad de docs y el verificador del estándar; `release.yml` por tag con compilación en runners nativos (macOS arm64/x64, Linux arm64/x64, Windows x64), prueba de humo por plataforma y publicación con `SHA256SUMS`.
- Acciones de CI fijadas por versión. Lockfile obligatorio.
- El commit de release no lleva atribuciones fijas de herramientas.
- **Workflows delgados, documentados y validados antes de integrar** (acta 0019):
  - Cada paso de un workflow ejecuta un script del repositorio (`bun run <script>`); ninguna lógica vive dentro del YAML. Así, lo que corre en local es exactamente lo que corre en CI.
  - Cada workflow está documentado en `docs/es/NN-workflows.md` y su par en inglés: disparadores, jobs, qué prueba, qué valida, qué publica y duración esperada. El verificador cruza los jobs del YAML con los documentados.
  - Todo job declara `timeout-minutes`; ninguna etapa queda sin límite.
  - `bun workflows:check` valida sintaxis y esquema de cada YAML, que las acciones estén fijadas por versión, que los pasos solo llamen scripts y que todo job tenga `timeout-minutes`; forma parte de `bun verify`.
  - `bun workflows:run` ejecuta en local, en el mismo orden, los scripts que CI ejecutaría; un gancho `pre-push` de plantilla lo corre antes de publicar una rama.
  - La rama `main` está protegida: ninguna fusión sin el workflow `verify` en verde. La plantilla de repositorio documenta la configuración exacta de la protección.

## 8. Documentación

- `README.md` raíz bilingüe con: analogía en una frase, qué es, qué no es, instalación, tabla de documentación.
- `docs/es/NN-slug.md` y `docs/en/NN-slug.md` numerados desde `00`, paridad uno a uno por número y contenido; cada documento abre con una analogía cotidiana y define cada término técnico la primera vez.
- `docs/notion-map.json` con todas las páginas, `productVersion` igual a la versión actual y huellas SHA-256 reales.
- `CONTRACT.md` generado o verificado contra el código (los comandos listados existen; los esquemas coinciden).
- Documentos históricos (`docs/superpowers/`, `docs/handoffs/`) se conservan pero se marcan como registro, no como estado actual, y no cuentan para la paridad. `CHANGELOG.md` (generado) y `LICENSE` (texto legal) quedan exentos de la paridad bilingüe.
- Ninguna mención a productos externos (acta 0012).
- Textos para personas dentro del código: catálogo tipado por idioma (una interfaz `Catalog`, un archivo por idioma `es.ts`/`en.ts`, funciones con parámetros para mensajes con datos); la paridad la garantiza el compilador; identificadores, rutas, comandos y texto externo nunca se traducen. Patrón de referencia: el catálogo de Shell 1.9.0.

## 9. Proceso de trabajo y registro de decisiones

1. **Plan antes que código** (`.agents/plans/AAAA-MM-DD--slug.md`, contrato del monorepo): objetivo, contexto, alcance, decisiones con porqué y alternativa descartada, checklist, validaciones reales, resultado. Un cambio no trivial sin plan no se revisa.
2. **Acta de decisión** (`docs/decisions/NNNN-slug.md`) para toda decisión de arquitectura o de contrato: fecha, estado (`propuesta | aceptada | revocada | reemplazada por NNNN`), sesión de Engram, contexto, decisión, alternativas descartadas, consecuencias. Nunca se borra; cambia de estado.
3. **Engram** recibe, al cerrar el plan, un resumen con enlace al plan y a las actas, con el `sessionId`. Git es el original; Engram es el índice recordable.
4. **Changelog** al liberar.
5. `bun verify` local antes de cerrar un plan y de nuevo tras cerrarlo; CI en cada PR. Git es de solo lectura para agentes de IA: el historial lo gestiona una persona.

## 10. Reglas de comportamiento del agente de IA

Instaladas por el gancho de arranque en repositorios del ecosistema. Son de núcleo: no se apagan.

- Antes de ejecutar cualquier petición no trivial, explicar para qué sirve, qué beneficia, pros, contras y alternativas. "Sí" nunca es la respuesta por defecto.
- Nunca inventar un resultado de validación ni marcar hecho lo que no se hizo.
- Nunca crear ni modificar `.agents/`, `forge614.node.json` ni archivos generados a mano; solo con las herramientas del ecosistema.
- Nunca mencionar productos externos en código, docs o contratos.
- Git solo lectura. Nunca secretos en memoria, salidas, logs ni argumentos de línea de comandos.
- Ante un cambio de contrato: actualizar `CONTRACT.md`, subir `schemaVersion` si rompe, y escribir acta.
- Al terminar: resumen a Engram con enlaces; nunca afirmar que un host consumió algo que no es verificable.

## 11. Seguridad transversal

- Secretos nunca en stdout, stderr, logs, `argv` ni memoria. Contenido completo de archivos de configuración de terceros solo en almacenamiento propio con permisos `0600`, nunca en salidas de comandos (diff y huella sí).
- Entradas por stdin o variables de entorno para valores sensibles (URLs con credenciales), nunca por argumento.
- Procesos hijos: entorno filtrado explícitamente (lista de bloqueo compartida de claves de API y URLs base), grupo de procesos propio, `SIGTERM` → `SIGKILL`, timeout siempre.
- Archivos: escritura atómica con `fsync` y verificación; instantánea antes de tocar archivos ajenos; retención definida para planes e instantáneas.
- Texto proveniente de modelos o de memoria se trata como dato: se acota y se sanea antes de persistir o de inyectar en un contexto.
- `SECURITY.md` con canal de reporte y política de divulgación.

## 12. Agentes de IA nuevos

- El procedimiento maestro vive en `forge614-ai/standard/procedures/new-agent-checklist.md` (origen: el checklist del propietario del producto), con una sección por nodo. Cada nodo lo enlaza desde su `CONTRACT.md` y solo completa su sección. El **runbook** `standard/procedures/add-agent-runbook.md` fija el orden de ejecución (investigación con el binario real → Engines → Workers → Atlas → Engram → Shell → cierre en `forge614-ai`), qué se modifica en cada repositorio y la puerta de salida de cada paso.
- La **matriz de soporte** (`standard/support-matrix.json`) es la fuente de verdad de qué asistentes están soportados y en qué nodo. Un asistente pasa a `supported` solo cuando todas las celdas obligatorias están en verde. Si le falta un requisito obligatorio o pierde funcionalidad, no entra.
- El verificador cruza la matriz con los registros de adaptadores (Engines), de ejecución (Workers) y la lista de chat (Shell): un asistente registrado en un nodo y ausente en la matriz, o al revés, es fallo.
- **El procedimiento se revisa en cada cambio de nodo, no solo al llegar un asistente nuevo** (acta 0017). Tres candados:
  1. Todo plan lleva la sección obligatoria `## Impacto en el procedimiento de agentes` con `Sí` (qué validación nueva exige) o `No` (motivo). El verificador no permite cerrar un plan sin contenido real ahí.
  2. `bun release` lee los planes cerrados desde el último tag; si alguno declara `Sí`, exige que `forge614.node.json` fije una versión del procedimiento y de la matriz que ya incluyan ese cambio. Si no, no publica y explica qué falta.
  3. Cuando cambia la sección de un nodo en el procedimiento, la matriz de soporte marca `revalidate` en todas las celdas de ese nodo; un asistente vuelve a `supported` solo cuando una persona ejecuta la validación nueva y lo registra con fecha. El verificador falla si una celda lleva más de 30 días en `revalidate`.

## 13. Huella mínima y piezas reemplazables

La complejidad de Forge614 vive en el lado del constructor (nodos, verificador, CI, instaladores, contratos), nunca en el contexto de la IA. Dos actas lo hacen verificable.

**Huella mínima en el contexto de la IA** (acta 0020):

1. Presupuesto de arranque: todo lo que Forge614 inyecta al inicio de una sesión (protocolo de memoria + índice de skills + pack de reglas aplicable) cabe en **≤ 3 000 tokens**; el verificador lo mide (`context-budget`) y falla si se excede.
2. Divulgación progresiva obligatoria: solo índice (nombre y una línea) hasta que una skill, regla o política se usa.
3. Nada encendido sin uso: un MCP o skill sin uso en 30 días se propone apagar, con datos del libro de corridas.
4. Cada paquete declara su costo: campo `tokens` en el manifiesto, medido al empaquetar; el Hub lo muestra antes de instalar.
5. La complejidad vive en el constructor; la IA nunca carga nodos, verificador ni CI.
6. Prueba de la regla: una sesión con Forge614 completo gasta en arranque menos que la misma sesión con las reglas puestas a mano; se mide y se publica.

**Piezas reemplazables conforme evoluciona el modelo** (acta 0021):

1. Todo paquete y nodo declara `compensates: "model-limitation" | "structural"`. Estructural: memoria durable, contratos entre nodos, contabilidad, verificación, instalación, identidad de proyecto.
2. Todo paquete `model-limitation` lleva `sunset` obligatorio: condición de retiro verificable ("cuando el modelo haga X de forma nativa") y fecha de revisión.
3. Apagable sin romper: ningún paquete depende de otro por dentro; el Hub puede deshabilitar cualquier paquete `model-limitation` por política.
4. Cada release mayor de un asistente soportado dispara la revisión de los `sunset` (procedimiento de agentes); el libro de corridas aporta el uso real.
5. Pregunta obligatoria antes de agregar algo: "¿el modelo ya lo hace solo?", con evidencia; si sí, no entra y se registra en `Decisions` del plan.

## Anexo A. Patrones canónicos por elemento

Nada del diseño es inventado: cada elemento corresponde a un patrón con nombre en la literatura. Las analogías de la documentación (taller, recepción, capataz, cartógrafo, archivero, centinela, almacén) son solo ayudas de lectura; lo normativo es el patrón.

| Elemento de Forge614 | Patrón canónico | Origen |
|---|---|---|
| Núcleo pequeño (`forge614-ai`) + nodos independientes con contratos públicos | Arquitectura de micronúcleo (plug-in architecture) | Patrones de arquitectura de software |
| Instalar un nodo trae lo que necesita | Resolución de dependencias transitivas de un gestor de paquetes | Gestores de paquetes (apt, npm, Homebrew) |
| `forge614-ai` instala todo el ecosistema | Meta-paquete | Debian, Homebrew |
| Engines y Workers no se instalan directo | Paquete de implementación (dependencia privada) | Gestores de paquetes |
| `~/.forge614/<nodo>/<versión>/` + lanzador estable en `bin/` | Prefijo versionado con enlaces estables (cellar / store) | Homebrew, Nix |
| Detección y configuración de asistentes de IA | Puertos y adaptadores (arquitectura hexagonal) + registro con manifiesto de capacidades validado al arrancar | Arquitectura hexagonal |
| plan → instantánea → aplicar → verificar → revertir | Plan/Apply (infraestructura como código) + cambio transaccional con reversión | Herramientas de IaC; transacciones |
| Capas `modules / app / infrastructure / interfaces` | Arquitectura limpia (dependencias hacia adentro) | Arquitectura limpia |
| Libro de corridas | Event Sourcing (bitácora inmutable) + máquina de estados explícita | Patrones de persistencia |
| Sentinel | Quality Gate + punto de aplicación de políticas (PEP/PDP) | CI/CD; arquitectura de seguridad |
| Hub con catálogo, lock y huellas | Registro de artefactos + lockfile + verificación de cadena de suministro | Gestores de paquetes; SLSA |
| Políticas en capas (ecosistema → proyecto → corrida) | Configuración en cascada | Git config, CSS |
| Tres intentos subiendo razonamiento y modelo | Reintento con escalado | Patrones de resiliencia |
| Pausar un perfil tras tres fallos seguidos | Circuit Breaker | *Release It!* |
| Un solo obrero escribe a la vez | Single Writer Principle | Sistemas concurrentes |
| Obreros con perfil tomando tareas de un tablero | Cola de trabajo con consumidores competidores + tablero de estados | Patrones de mensajería |
| Ganchos de arranque en asistentes | Puntos de extensión (hooks / observer) | GoF |
| Modelo y razonamiento por nivel de tarea | Strategy | GoF |
| Actas de decisión | Architecture Decision Records | Práctica de industria |
| Reglas en un solo lugar y adaptadores delgados por asistente | Single Source of Truth + adaptadores | Ya aplicado en el monorepo |
| Contratos JSON con `schemaVersion` | Versionado de esquemas (compatibilidad explícita) | Diseño de APIs |
| Índice de skills corto + carga completa bajo demanda | Divulgación progresiva | Diseño de interfaces |
| Textos bilingües dentro del código | Catálogo tipado por idioma con paridad verificada por el compilador | Shell 1.9.0 |
| Presupuesto de contexto | Presupuesto como contrato verificable + divulgación progresiva | Diseño de sistemas de agentes |
| Piezas que compensan al modelo | Obsolescencia programada explícita (sunset) + plug-in reemplazable | Arquitectura de micronúcleo |
