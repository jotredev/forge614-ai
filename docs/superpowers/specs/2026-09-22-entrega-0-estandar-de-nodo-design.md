# forge614-ai — Entrega 0: Estándar de Nodo Forge614

**Fecha:** 2026-09-22
**Estado:** Aprobada por el propietario del producto el 2026-09-22
**Gobierna:** `forge614-ai` y, por extensión, todos los repositorios del ecosistema Forge614
**Traducción hermana:** `2026-09-22-delivery-0-node-standard-design.en.md`
**Actas relacionadas:** `docs/decisions/0001` a `docs/decisions/0019`
**Anexos:** `docs/audits/2026-09-22-*.md` (auditorías de código de los cinco nodos), `standard/procedures/new-agent-checklist.md`

---

## 1. Propósito

Antes de construir el núcleo de forge614-ai, el ecosistema necesita una sola forma de construirse. Hoy cada nodo es una isla: instalador propio, release propio, documentación parecida pero no igual, contratos repartidos, y ninguna revisión sistemática. La Entrega 0 crea **el Estándar de Nodo Forge614**: un conjunto de reglas centralizadas, versionadas y verificables por máquina, que todo repositorio del ecosistema debe cumplir, y el **verificador** que las hace cumplir en local y en CI.

Resultado esperado al cerrar la entrega: los cinco nodos existentes (Engines, Engram, Shell, Atlas, Workers) pasan el verificador en verde, tienen su contrato propio, se instalan y liberan de la misma manera, y ninguna decisión de arquitectura vive solo en una conversación.

## 2. Contexto

### 2.1 Estado de partida

`forge614-ai` es un repositorio vacío (un `README.md`). El contrato del ecosistema (`FORGE614_ECOSYSTEM_CONTRACT.md`) lo nombra como núcleo y orquestador, y le asigna como primer trabajo definir los contratos de orquestación y ciclo de vida.

Los cinco nodos existen y funcionan en distinto grado. Una auditoría de código estática (2026-09-22, cinco lectores independientes, hallazgos con archivo y línea, separando lo verificado de lo supuesto) encontró problemas de sistema, no de un repositorio:

| Problema | Evidencia |
|---|---|
| El contrato "idéntico" del ecosistema tiene cinco versiones distintas | 10 327 B en Engram, 10 158 en Engines, 10 136 en Atlas, 9 825 en Workers, 9 464 en Shell |
| Ningún nodo valida con esquema lo que recibe de otro nodo | Atlas lee la salida de Engines y Workers con `JSON.parse(...) as`; Engram usa Zod solo en MCP |
| Errores y versionado de salidas distintos por nodo | Engram: `{code,error}` en stderr; Engines: `{schemaVersion, error:{code,message}}` en stdout; Atlas: `{status:"error"}`; Workers sin `schemaVersion` |
| Cinco recetas de instalación y release | Engines: `bun release` + CI multiplataforma; Engram: instalador manual sin Windows; Shell: instalador que edita dotfiles y subida manual de assets; Atlas: instalador propio v1.0.0 que edita perfiles de shell, sin Windows, sin CI de PR; Workers: nada |
| Documentación que contradice el código | Atlas documentaba "Planes 1–3" con Planes 1–4 fusionados (corregido en v1.0.0, pero sigue llamándose "orquestador"); Engram documenta v1.2.1 en v1.5.0; `AGENTS.md` de Shell contradice su código |
| Sin contrato propio por nodo | Los contratos viven repartidos entre specs, docs y código |

Hallazgos de seguridad de prioridad 1, re-verificados en el código por el autor de esta spec:

| Nodo | Hallazgo | Ubicación |
|---|---|---|
| Engines | `plan` imprime en stdout el archivo de configuración completo del asistente (`writes[].afterContent`), con tokens de otros servidores MCP del usuario | `src/interfaces/cli/commands.ts:36,42,48,106,112`; `src/modules/config-writer/types.ts:4` |
| Engines | Desinstalar borra el binario sin retirar los ganchos de sesión: Claude Code y Codex quedan invocando un ejecutable inexistente | `install.sh:36-45`, `install.ps1:31-44` |
| Engram | `uninstall` invoca `forge614-atlas uninstall --from forge614-engram --confirmed`; Atlas solo implementa `init` | `src/app/uninstall.ts:35-39`; Atlas `src/interfaces/cli/main.ts:12,21` |
| Atlas | Persiste en Engram la salida cruda del modelo sin sanear ni acotar, y `tokensConsumed: 0` como dato real | `src/modules/cli/dispatch-modules.ts:68,115` |
| Atlas | El instalador (v1.0.0) edita `.zshrc`/`.bashrc`/fish sin respaldo y ejecuta el instalador remoto de Engram sin verificar su huella | `scripts/install.sh:93-125,143-155` |
| Workers | Hereda `process.env` completo (claves de API y URLs base incluidas); `--version` se bloquea esperando stdin | `src/process-runner.ts:63-68`; `src/main.ts:7` |
| Shell | Sin integración continua; el motor "retirado" Pi sigue siendo dependencia viva del runtime | árbol del repositorio; `package.json:5,24-25` |

El detalle completo por nodo está en los anexos `docs/audits/`.

### 2.2 Decisiones de producto que enmarcan esta entrega

Tomadas con el propietario del producto el 2026-09-22 y registradas como actas (`docs/decisions/`):

- El ecosistema sigue una **arquitectura de micronúcleo** distribuida como **paquetes con dependencias declaradas**: cada nodo se instala solo y resuelve sus dependencias transitivas; `forge614-ai` es el **meta-paquete** que instala todo (acta 0001). "Lego" es solo la analogía de apertura.
- El orden de construcción es: Entrega 0 (este estándar) → Entrega 1 (`forge614 init` / `forge614 prepare`) → Entrega 2 (núcleo de orquestación) → Entrega 3 (marketplace) (acta 0002).
- Las reglas de desarrollo viven **solo** en `forge614-ai`, sin copias en otros repositorios (acta 0009).
- Ningún nodo, contrato ni documento menciona productos externos (acta 0012).
- Todo desarrollo aplica patrones de estructura y diseño nombrados por el estándar, justificados por problema, nunca por lista (acta 0014).
- Toda decisión de arquitectura se registra en cuatro capas: plan → acta → Engram → changelog (acta 0015).

## 3. Alcance

### 3.1 Entra

1. **El Estándar de Nodo** (sección 4): documento normativo bilingüe, plantillas y pack de reglas, publicado desde `forge614-ai`.
2. **Distribución centralizada** (sección 5): puntero por repositorio, caché local, gancho para mantenedores.
3. **El verificador** (sección 6): `forge614-sentinel check`, primera versión sin IA, integrado en `bun verify` y en CI de cada nodo.
4. **Contratos por nodo**: `CONTRACT.md` es/en en los cinco nodos existentes.
5. **Procedimiento de agentes nuevos y matriz de soporte** (sección 4.12), centralizados.
6. **Alineación de los cinco nodos** (sección 7): parches P1 de seguridad inmediatos y un plan de alineación por repositorio.
7. **Registro de decisiones**: `docs/decisions/` en `forge614-ai` con las actas 0001–0019, plantilla y regla de ascenso.
8. **Actualización del contrato del ecosistema**: Workers como paquete de implementación; Hub y Sentinel como nodos; arquitectura de micronúcleo con distribución por paquetes con dependencias declaradas; comandos `forge614 init|prepare|status|doctor|update`; libro de corridas como excepción explícita a "sin bases de progreso paralelas".

### 3.2 No entra (a propósito)

| Qué | Por qué todavía no | Cuándo |
|---|---|---|
| `forge614 init` y `forge614 prepare` | Se construyen sobre este estándar | Entrega 1 |
| Hub (catálogo de paquetes) | Necesita el formato de paquete y el verificador ya probados con las reglas del propio estándar | Entrega 1 (primer catálogo local) |
| Núcleo de orquestación: cerebro, tablero de tareas, obreros, reintentos, fusible, libro de corridas | Entrega 2 | Entrega 2 |
| Sentinel con IA (revisor independiente) | Depende del núcleo para tener trabajo que revisar | Entrega 2 |
| Captura de uso de tokens en Workers/Engines | Solo la consume el núcleo; queda anotada como cambio de contrato pendiente | Entrega 2 |
| Marketplace remoto, orígenes de comunidad, cuarentena | El catálogo local con origen oficial basta para arrancar | Entrega 3 |
| Ejecución o rediseño funcional de Atlas | Atlas ya despacha y publicó v1.0.0 (Planes 1–5); solo se alinea al estándar (instalador y release desde plantilla) y se corrige su documentación | Repositorio de Atlas |

## 4. El Estándar de Nodo Forge614

Es normativo. "Debe" significa que el verificador lo comprueba o, si no puede, que la revisión humana lo exige antes de fusionar.

### 4.1 Identidad y contrato del nodo

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
- `FORGE614_ECOSYSTEM_CONTRACT.md` deja de copiarse. Cada repositorio lo referencia por el puntero; el verificador comprueba que el texto local, si existe, es byte-idéntico al publicado por `forge614-ai` para la versión fijada.

### 4.2 Estructura del repositorio y capas

```
<nodo>/
├── forge614.node.json
├── CONTRACT.md · CONTRACT.en.md · README.md · CHANGELOG.md · SECURITY.md · LICENSE
├── src/
│   ├── modules/          reglas y tipos puros; sin I/O; solo node:crypto y node:util
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

- Dependencias solo hacia adentro: `interfaces → app → (modules, infrastructure)`, `infrastructure → modules`. `modules` no importa nada externo. Verificado por prueba AST (la de Engram es la referencia).
- Tests unitarios junto al código (`x.ts` + `x.test.ts`); integración en `__tests__/`; los que requieren binarios reales o cuentas se marcan y se excluyen de CI por defecto.
- Un nodo no importa carpetas internas de otro nodo. Consume solo binarios por ruta canónica (`~/.forge614/<nodo>/bin/`) o SDK público publicado y versionado. Prohibido `file:../otro-nodo` en `package.json`.

### 4.3 Stack

- TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Sin `any`, sin `@ts-ignore`, sin `as` sobre datos externos.
- Bun como gestor y ejecutor de desarrollo; `bun.lock` único lockfile; `bun install --frozen-lockfile` en CI.
- **Zod en toda frontera**: argumentos de CLI, stdin, archivos de configuración, respuestas de otros nodos, payloads MCP, respuestas de red. Esquemas `.strict()`; campos desconocidos son error. Dentro de la frontera, todo es tipado y confiable.
- Runtime de distribución: binario compilado (`bun build --compile`) por plataforma. Un nodo que hoy requiere Node en runtime (Shell) documenta la excepción en su contrato con fecha de retiro.

### 4.4 Contratos de máquina

Convención única (acta 0013, **aceptada** el 2026-09-22; cambia el formato que Shell lee hoy de Engines, por lo que se adopta con `schemaVersion` nuevo y una ventana de compatibilidad de una versión):

- Toda salida de datos va a **stdout** como un solo objeto JSON con `schemaVersion` entero en la raíz.
- Todo error va a **stderr** como `{ "schemaVersion": n, "code": "CODIGO_ESTABLE", "error": "mensaje para personas en el idioma configurado" }`, sin rutas crudas, sin stack traces, sin secretos.
- Códigos de salida: `0` éxito; `1` error; `2` entrada inválida; `75` pausa recuperable (cuota); otros solo si el contrato del nodo los documenta.
- Flujos de eventos: NDJSON en stdout, un objeto por línea, cada uno con `schemaVersion` y `type`; evento terminal garantizado.
- `--help` y `--version` siempre disponibles y nunca bloqueantes.
- Cambios incompatibles suben `schemaVersion`; el consumidor rechaza versiones que no conoce con `SCHEMA_UNSUPPORTED`.
- El `code` es un identificador estable en `MAYUSCULAS_CON_GUION_BAJO` (regex `^[A-Z][A-Z0-9_]+$`), listado en el `CONTRACT.md` del nodo. Los nodos con interfaz humana derivan el texto del mismo `code` mediante un catálogo tipado por idioma (4.8).

### 4.5 Patrones obligatorios

Se nombran por problema. Una abstracción que no responde a un problema listado se justifica en `Decisions` del plan o no entra. **Toda decisión de diseño nombra su patrón canónico; una analogía nunca sustituye al nombre del patrón** (el Anexo A mapea cada elemento del ecosistema a su patrón).

| Problema | Patrón | Referencia existente |
|---|---|---|
| Estructura | Arquitectura limpia por capas (4.2) | Engram |
| Proveedores externos (asistentes de IA, Git, disco) | Puertos y adaptadores: una interfaz por capacidad, un adaptador por proveedor, registro con manifiesto de capacidades validado al arrancar (fallo cerrado) | Engines |
| Comandos CLI | Cada comando es un caso de uso puro con entrada validada y salida tipada; la CLI solo traduce | — |
| Entradas externas | Esquema en la frontera (4.3) | Engram (MCP) |
| Errores | Modelo único: código estable + mensaje bilingüe + causa interna no expuesta | — |
| Cambios en archivos de terceros | Plan → instantánea → aplicar → verificar → revertir, con guarda contra cambios intermedios | Engines |
| Estado de trabajo | Bitácora de eventos inmutable + máquina de estados explícita | Diseñado (Entrega 2) |
| Persistencia | Repositorio: el dominio ignora si hay SQLite o PostgreSQL | Engram |
| Configuración | Tipada, validada al arrancar, por capas (ecosistema → proyecto → corrida) | Diseñado (Entrega 1) |
| Decisiones | Acta por decisión (4.9) | — |

### 4.6 Instalación

- **Tres sistemas operativos, siempre** (acta 0018): todo nodo publica binarios e instalador para macOS (arm64 y x64), Linux (arm64 y x64) y Windows (x64). No hay excepciones ni "pendiente"; un nodo sin uno de los tres no se libera.
- Un solo `install.sh` y un solo `install.ps1`, **generados desde la plantilla** de `forge614-ai/standard/templates/`, parametrizados por nombre de nodo, repositorio y activos. Ningún nodo escribe el suyo.
- Destino `~/.forge614/<nodo>/<versión>/` con lanzador estable `~/.forge614/<nodo>/bin/<nodo>` y archivo `.active-version`. `FORGE614_HOME` sustituye `~/.forge614` en todos los nodos, sin excepción.
- Descarga solo por HTTPS; verificación SHA-256 obligatoria contra `SHA256SUMS` del mismo release; el instalador nunca ejecuta scripts remotos sin verificar su huella.
- Sin dependencia de Node ni Python en la máquina destino: el instalador resuelve el release con herramientas del sistema o con un binario auxiliar publicado.
- Ningún nodo edita el `PATH` ni archivos de perfil del usuario. Solo `forge614-ai` crea el comando global `forge614`, y pregunta antes.
- Desinstalación simétrica: retira primero sus integraciones en asistentes (ganchos, MCP, instrucciones) mediante los contratos públicos, luego borra solo su directorio. Nunca `~/.forge614/` completo.
- Actualización (`<nodo> update`): descarga y verifica el instalador **de la release destino**, permite `--version`, y registra la versión previa para revertir.

### 4.7 Release y versionado

- `bun release` es un paquete compartido publicado por `forge614-ai` (origen: el script probado de Engines), no una copia por repositorio: sugiere versión por commits convencionales, valida contra tags, sincroniza `productVersion` en `notion-map.json`, corre tests y typecheck, ejecuta el verificador, aplica la puerta del procedimiento de agentes (4.12), etiqueta, empuja y sigue la ejecución de CI.
- SemVer estricto. Commits convencionales obligatorios (`feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `ci`; `!` o `BREAKING CHANGE` para mayor).
- `CHANGELOG.md` generado por `bun release`; nunca editado a mano.
- CI desde plantilla: `verify.yml` en push y PR (install frozen, typecheck, test, build, paridad de docs, verificador del estándar); `release.yml` por tag con compilación en runners nativos (macOS arm64/x64, Linux arm64/x64, Windows x64), prueba de humo por plataforma y publicación con `SHA256SUMS`.
- Acciones de CI fijadas por versión. Lockfile obligatorio.
- El commit de release no lleva atribuciones fijas de herramientas.
- **Workflows delgados, documentados y validados antes de integrar** (acta 0019):
  - Cada paso de un workflow ejecuta un script del repositorio (`bun run <script>`); ninguna lógica vive dentro del YAML. Así, lo que corre en local es exactamente lo que corre en CI.
  - Cada workflow está documentado en `docs/es/NN-workflows.md` y su par en inglés: disparadores, jobs, qué prueba, qué valida, qué publica y duración esperada. El verificador cruza los jobs del YAML con los documentados.
  - `bun workflows:check` valida sintaxis y esquema de cada YAML, que las acciones estén fijadas por versión y que los pasos solo llamen scripts; forma parte de `bun verify`.
  - `bun workflows:run` ejecuta en local, en el mismo orden, los scripts que CI ejecutaría; un gancho `pre-push` de plantilla lo corre antes de publicar una rama.
  - La rama `main` está protegida: ninguna fusión sin el workflow `verify` en verde. La plantilla de repositorio documenta la configuración exacta de la protección.

### 4.8 Documentación

- `README.md` raíz bilingüe con: analogía en una frase, qué es, qué no es, instalación, tabla de documentación.
- `docs/es/NN-slug.md` y `docs/en/NN-slug.md` numerados desde `00`, paridad uno a uno por número y contenido; cada documento abre con una analogía cotidiana y define cada término técnico la primera vez.
- `docs/notion-map.json` con todas las páginas, `reviewedProductVersion` igual a la versión actual y huellas SHA-256 reales.
- `CONTRACT.md` generado o verificado contra el código (los comandos listados existen; los esquemas coinciden).
- Documentos históricos (`docs/superpowers/`, `docs/handoffs/`) se conservan pero se marcan como registro, no como estado actual, y no cuentan para la paridad.
- Ninguna mención a productos externos (acta 0012).
- Textos para personas dentro del código: catálogo tipado por idioma (una interfaz `Catalog`, un archivo por idioma `es.ts`/`en.ts`, funciones con parámetros para mensajes con datos); la paridad la garantiza el compilador; identificadores, rutas, comandos y texto externo nunca se traducen. Patrón de referencia: el catálogo de Shell 1.9.0.

### 4.9 Proceso de trabajo y registro de decisiones

1. **Plan antes que código** (`.agents/plans/AAAA-MM-DD--slug.md`, contrato del monorepo): objetivo, contexto, alcance, decisiones con porqué y alternativa descartada, checklist, validaciones reales, resultado. Un cambio no trivial sin plan no se revisa.
2. **Acta de decisión** (`docs/decisions/NNNN-slug.md`) para toda decisión de arquitectura o de contrato: fecha, estado (`propuesta | aceptada | revocada | reemplazada por NNNN`), sesión de Engram, contexto, decisión, alternativas descartadas, consecuencias. Nunca se borra; cambia de estado.
3. **Engram** recibe, al cerrar el plan, un resumen con enlace al plan y a las actas, con el `sessionId`. Git es el original; Engram es el índice recordable.
4. **Changelog** al liberar.
5. `bun verify` local antes de cerrar un plan y de nuevo tras cerrarlo; CI en cada PR. Git es de solo lectura para agentes de IA: el historial lo gestiona una persona.

### 4.10 Reglas de comportamiento del agente de IA (pack de nodo)

Instaladas por el gancho de arranque en repositorios del ecosistema (sección 5.4). Son de núcleo: no se apagan.

- Antes de ejecutar cualquier petición no trivial, explicar para qué sirve, qué beneficia, pros, contras y alternativas. "Sí" nunca es la respuesta por defecto.
- Nunca inventar un resultado de validación ni marcar hecho lo que no se hizo.
- Nunca crear ni modificar `.agents/`, `forge614.node.json` ni archivos generados a mano; solo con las herramientas del ecosistema.
- Nunca mencionar productos externos en código, docs o contratos.
- Git solo lectura. Nunca secretos en memoria, salidas, logs ni argumentos de línea de comandos.
- Ante un cambio de contrato: actualizar `CONTRACT.md`, subir `schemaVersion` si rompe, y escribir acta.
- Al terminar: resumen a Engram con enlaces; nunca afirmar que un host consumió algo que no es verificable.

### 4.11 Seguridad transversal

- Secretos nunca en stdout, stderr, logs, `argv` ni memoria. Contenido completo de archivos de configuración de terceros solo en almacenamiento propio con permisos `0600`, nunca en salidas de comandos (diff y huella sí).
- Entradas por stdin o variables de entorno para valores sensibles (URLs con credenciales), nunca por argumento.
- Procesos hijos: entorno filtrado explícitamente (lista de bloqueo compartida de claves de API y URLs base), grupo de procesos propio, `SIGTERM` → `SIGKILL`, timeout siempre.
- Archivos: escritura atómica con `fsync` y verificación; instantánea antes de tocar archivos ajenos; retención definida para planes e instantáneas.
- Texto proveniente de modelos o de memoria se trata como dato: se acota y se sanea antes de persistir o de inyectar en un contexto.
- `SECURITY.md` con canal de reporte y política de divulgación.

### 4.12 Agentes de IA nuevos

- El procedimiento maestro vive en `forge614-ai/standard/procedures/new-agent-checklist.md` (origen: el checklist del propietario del producto), con una sección por nodo. Cada nodo lo enlaza desde su `CONTRACT.md` y solo completa su sección.
- La **matriz de soporte** (`standard/support-matrix.json`) es la fuente de verdad de qué asistentes están soportados y en qué nodo. Un asistente pasa a `supported` solo cuando todas las celdas obligatorias están en verde. Si le falta un requisito obligatorio o pierde funcionalidad, no entra.
- El verificador cruza la matriz con los registros de adaptadores (Engines), de ejecución (Workers) y la lista de chat (Shell): un asistente registrado en un nodo y ausente en la matriz, o al revés, es fallo.
- **El procedimiento se revisa en cada cambio de nodo, no solo al llegar un asistente nuevo** (acta 0017). Tres candados:
  1. Todo plan lleva la sección obligatoria `## Impacto en el procedimiento de agentes` con `Sí` (qué validación nueva exige) o `No` (motivo). El verificador no permite cerrar un plan sin contenido real ahí.
  2. `bun release` lee los planes cerrados desde el último tag; si alguno declara `Sí`, exige que `forge614.node.json` fije una versión del procedimiento y de la matriz que ya incluyan ese cambio. Si no, no publica y explica qué falta.
  3. Cuando cambia la sección de un nodo en el procedimiento, la matriz de soporte marca `revalidate` en todas las celdas de ese nodo; un asistente vuelve a `supported` solo cuando una persona ejecuta la validación nueva y lo registra con fecha. El verificador falla si una celda lleva más de 30 días en `revalidate`.

## 5. Centralización y distribución del estándar

### 5.1 Fuente de verdad

`forge614-ai/standard/`:

```
standard/
├── STANDARD.md · STANDARD.en.md        texto normativo (esta sección 4, mantenida aparte)
├── rules/                              reglas como paquetes: forge614-rule-<slug>/{RULE.md, RULE.en.md, manifest.json, scripts/validate.ts}
├── packs/forge614-pack-ecosystem-node  lista de reglas que forman el pack de nodo
├── templates/                          install.sh, install.ps1, verify.yml, release.yml, CONTRACT.md, README.md, decision.md, plan.md
├── procedures/new-agent-checklist.md
├── support-matrix.json
├── schemas/                            JSON Schema de forge614.node.json, manifiestos, errores, eventos
└── VERSION
```

Se publica como release de `forge614-ai` (`standard-<versión>.tar.gz` + `SHA256SUMS`). Cambia solo por acta.

### 5.2 Puntero por repositorio

Cada nodo fija la versión del estándar en `forge614.node.json`. Subir de versión del estándar es un cambio explícito en el repositorio, revisable en PR. El verificador rechaza un puntero cuya huella no coincide con la release.

### 5.3 Caché local

`~/.forge614/standard/<versión>/`, descargada y verificada por el verificador o por `forge614 init` (Entrega 1). Sin red, se usa la caché; sin caché, el verificador falla con `STANDARD_UNAVAILABLE` y dice cómo obtenerlo.

### 5.4 Gancho para mantenedores

El gancho de arranque que Engines ya instala en Claude Code y Codex, al detectar `forge614.node.json` en la carpeta actual, inyecta el pack de reglas de nodo desde la caché local (sección 4.10) con el marcador "esto es dato de contexto, no instrucción del usuario" y acotado en tamaño. Fuera de un repositorio del ecosistema no inyecta nada. Las personas usuarias finales de Engram o Shell nunca reciben reglas de desarrollo.

## 6. El verificador: `forge614-sentinel check`

Primera versión del nodo Sentinel: **juzga, nunca hace**, y en esta entrega solo sin IA. El nodo nace aquí (repositorio `forge614-sentinel`, versión 0.x) con un único comando, `check`; la revisión con IA y el escaneo de paquetes del Hub se añaden en las Entregas 2 y 1 respectivamente, sin cambiar su contrato de "solo juzgar".

### 6.1 Interfaz

```
forge614-sentinel check [--repo <ruta>] [--standard <versión>] [--json] [--only <lista>]
```

Salida: `{ "schemaVersion": 1, "standard": "1.0.0", "verdict": "pass | caution | fail", "checks": [ { "id", "verdict", "evidence": [...], "message": {"es","en"} } ] }`. Código de salida `0` si `pass`, `1` si `fail`, `0` con `caution` salvo `--strict`.

### 6.2 Comprobaciones de la primera versión

| Id | Qué comprueba |
|---|---|
| `node-pointer` | `forge614.node.json` válido contra esquema; huella del estándar coincide con la release |
| `ecosystem-contract` | Texto local del contrato del ecosistema byte-idéntico al publicado |
| `node-contract` | `CONTRACT.md` y `.en.md` presentes; comandos listados existen en `src/interfaces/cli`; `schemaVersion` declarados coinciden con los emitidos |
| `layout` | Carpetas de 4.2 presentes; sin `scripts/` que dupliquen plantillas |
| `import-rules` | Reglas de capas por AST; sin `file:` a nodos hermanos; sin deep imports |
| `stack` | `tsconfig` con las banderas de 4.3; sin `any`/`@ts-ignore`; `bun.lock` presente |
| `boundaries-zod` | Todo punto de entrada externo (CLI, stdin, MCP, config, red) pasa por un esquema Zod `.strict()` |
| `machine-contracts` | `--help`/`--version` no bloqueantes; errores con `{schemaVersion, code, error}`; salidas con `schemaVersion` |
| `installer` | `install.sh`/`install.ps1` idénticos a la plantilla renderizada; sin edición de `PATH` salvo `forge614-ai` |
| `release` | `release.yml`/`verify.yml` desde plantilla; acciones fijadas; `CHANGELOG.md` presente |
| `workflows` | Todo YAML de `.github/workflows/` parsea y cumple el esquema; cada paso llama un script del repositorio; acciones fijadas por versión; cada job está documentado en `docs/*/NN-workflows.md` |
| `docs-parity` | Paridad es/en por número; `notion-map` completo con huellas reales y versión actual; README raíz |
| `decisions` | Actas con estados válidos; ninguna eliminada respecto al historial; planes cerrados con `Decisions` no vacías |
| `forbidden-mentions` | Lista de nombres prohibidos ausente en código, docs, contratos y commits |
| `secrets-hygiene` | Patrones de secretos ausentes en el árbol; salidas de `plan` sin contenido completo de archivos |
| `support-matrix` | Registros de adaptadores coherentes con `support-matrix.json`; ninguna celda en `revalidate` por más de 30 días |
| `agent-checklist-impact` | Todo plan cerrado tiene `## Impacto en el procedimiento de agentes` con contenido real; si declara `Sí`, el puntero fija una versión del procedimiento y la matriz que incluya el cambio |
| `versions` | `package.json`, tag más alto, `notion-map.productVersion` y `--version` coinciden |

### 6.3 Integración

- `bun verify` de cada nodo invoca `forge614-sentinel check --json` (binario por ruta canónica; en CI, instalado desde release).
- `verify.yml` de plantilla lo ejecuta en cada PR; un `fail` bloquea la fusión.
- Sentinel se audita a sí mismo: su propio repositorio pasa el verificador antes de publicarse.

### 6.4 Lo que el verificador no hace

No corrige, no instala, no ejecuta trabajo de IA, no decide. Un `caution` lo decide una persona.

## 7. Alineación de los nodos existentes

### 7.1 Parches P1 inmediatos (antes del estándar, un plan pequeño por repositorio)

| Nodo | Parche |
|---|---|
| Engines | Redactar `writes[].afterContent` en toda salida de `plan` (emitir diff + huella; contenido solo en el plan-store con `0600`). Desinstalación que ejecuta `plan memory-remove` + `apply` por asistente antes de borrar. Honrar `FORGE614_HOME` en `plan-store.ts` y `snapshot.ts`. |
| Engram | Desacoplar `uninstall` del comando inexistente de Atlas (la coordinación entre nodos pasa a `forge614-ai` en la Entrega 1; mientras, Engram desinstala solo lo suyo y avisa). `--postgres-url` por stdin o variable de entorno. `update` con versión fijada y huella verificada del instalador. |
| Atlas | Sanear y acotar la salida del modelo antes de `recordModuleReport`; `tokensConsumed: null` con marca "no medido"; sustituir `file:../forge614-engram` por versión publicada; retirar la escritura de PATH/perfil del instalador; verificar la huella del instalador de Engram antes de ejecutarlo; agregar `--help`. |
| Workers | Filtrar claves de API y URLs base del entorno heredado (lista compartida con Shell); `--help`/`--version` sin leer stdin; timeout y captura de stderr al invocar Engines; grupo de procesos para matar hijos. |
| Shell | `verify.yml` mínimo (install, typecheck, test, build) (1.9.0: CI sigue ausente). Confirmación explícita antes de saltar permisos. `update` que descarga el instalador de la release destino. |

### 7.2 Alineación completa (con el estándar publicado)

Cada nodo abre un plan `2026-MM-DD--alineacion-estandar-de-nodo.md` cuyo criterio de cierre es `forge614-sentinel check` en `pass`. Contenido mínimo por nodo, derivado de las auditorías (anexos):

- **Engines**: Zod en argv/stdin/planes/manifiestos/respuestas de GitHub; `apply --revert` y rollback en fallo parcial; retención de planes e instantáneas; instalador desde plantilla sin Node/Python; spec reescrita sin menciones externas; `CONTRACT.md`.
- **Engram**: `schemaVersion` en todas las salidas; retirar el `init` interactivo (Shell lo asume en la Entrega 1) manteniendo `init --json` completo (refuerzo incluido); Zod en CLI, `.env` y `summary-json`; instalador y release desde plantilla **con Windows x64 obligatorio** (SQLite y FTS5 compilados y probados en un runner de Windows real); retirar dependencias huérfanas y el binario nativo vacío; README raíz; `CONTRACT.md`; documentar que `startup-context` devuelve datos sin sanear y la regla de sombreado por `topic_key`.
- **Shell**: decidir por acta la base de su interfaz (hoy toda la pantalla depende de la librería `pi-tui` y el runtime de Pi sigue como dependencia aunque Pi esté "retirado" como motor): declararla base oficial y documentarla, o reemplazarla; retirar en cualquier caso el lanzador, la extensión y el test de integración de Pi como motor; Zod en payloads de Codex y preferencias; registro de motores de chat en un solo módulo; capas `app → ui` corregidas, incluidas `language-gate` y `language-command` (1.9.0); un solo módulo para `Locale`; adoptar el formato de `code` del acta 0013 con mapeo desde su catálogo tipado (que se conserva como patrón de referencia); modo `--json` para los comandos de automatización; instalador y release desde plantilla para los tres sistemas operativos; `AGENTS.md`, `clientInfo.version`, `notion-map` al día; borrar activos binarios sin uso.
- **Atlas**: reescribir README, docs 00–01 y spec como "contextualización inicial opcional" sin TUI ni concurrencia 3; corregir cierre de sesión con módulos saltados y re-análisis incremental; Zod en salidas de Engines/Workers; capturar stderr de Workers; convención de errores (`--version` ya existe; falta `--help`); capas `infrastructure/app`; mover la tabla de modelos a política (Entrega 1); sustituir `scripts/install.sh` y `release.yml` propios por los de plantilla (prefijo versionado, `FORGE614_HOME`, `--uninstall`, Windows x64, acciones fijadas, sin lógica inline), añadir `verify.yml` y `docs/*/NN-workflows.md`, migrar la instalación plana `~/.forge614/atlas/bin` y limpiar el bloque PATH marcado; eliminar `file:../` y el checkout hermano en CI; `CONTRACT.md`; borrar rama huérfana.
- **Workers**: `schemaVersion` en entrada y eventos; Zod con ids únicos, enteros positivos, rutas absolutas y tope de prompt; patrones de cuota confirmados contra CLIs reales; capas; `CONTRACT.md` y runbook en español; CI, instalador y release desde plantilla; primer tag; `kind: internal`.

Orden de alineación: contrato del ecosistema → Engines → Workers → Engram → Atlas → Shell (de menor a mayor superficie visible; Shell al final porque la Entrega 1 le añade la pantalla de plan).

## 8. Fases y criterios de terminado

| Fase | Entregable | Terminada cuando |
|---|---|---|
| 0.1 Estándar | `standard/` completo, bilingüe, con plantillas, pack y esquemas; actas 0001–0016; contrato del ecosistema actualizado | El propietario aprueba `STANDARD.md`; `forge614-ai` pasa su propio `docs-parity` y `decisions` |
| 0.2 Verificador | Repositorio `forge614-sentinel` con `check` y las 18 comprobaciones; publicado con release e instalador de plantilla | Sentinel pasa su propio `check`; `forge614-ai` pasa `check` |
| 0.3 Parches P1 | Cinco planes pequeños fusionados y liberados | Cada hallazgo P1 tiene test de regresión y release |
| 0.4 Alineación | Cinco planes de alineación cerrados | Los cinco nodos pasan `check` en CI; matriz de soporte coherente |
| 0.5 Gancho de mantenedor | Pack de nodo inyectado por el gancho de Engines en repos del ecosistema | Abrir Claude Code o Codex en cualquier nodo muestra el pack; fuera de un nodo, nada |

## 9. Riesgos y preguntas abiertas

| Riesgo / pregunta | Mitigación / decisión pendiente |
|---|---|
| El verificador se vuelve un nodo-dios | Su contrato lo limita a juzgar; cada comprobación nueva requiere acta |
| Dependencia circular: Sentinel debe pasar el estándar que él mismo verifica | Sentinel se construye con la plantilla y se auto-verifica antes de publicar la primera versión; hasta entonces, revisión humana |
| Retirar el `init` interactivo de Engram antes de que Shell lo cubra | Se retira solo cuando `forge614 prepare`/Shell lo asuman (Entrega 1); mientras, se marca transitorio |
| Pi en Shell: retirarlo puede exigir reescribir la UI | Decisión de producto pendiente: base de UI del ecosistema (acta por abrir al alinear Shell) |
| Windows en Engram (SQLite/FTS5 nativos) | Obligatorio por acta 0018; el plan de alineación de Engram incluye compilación y pruebas en runner de Windows real |
| Atlas publicó 1.0.0 con instalador propio antes del estándar | Su alineación es una release con instalador de plantilla que migra la ruta plana `~/.forge614/atlas/bin` al prefijo versionado y limpia el bloque PATH heredado; la plantilla de instalador contempla esa migración (plan 0.1, Task 6) |
| Tokens del gancho de mantenedor | Pack acotado (< 4 000 tokens) y solo en repos del ecosistema |
| Convención de errores rompe consumidores actuales (Shell lee Engines) | Cambio coordinado con `schemaVersion` nuevo y ventana de compatibilidad de una versión |

## 10. Criterio de éxito de la Entrega 0

En una máquina limpia: clonar cualquiera de los cinco nodos, ejecutar `bun install --frozen-lockfile && bun verify`, y obtener el verificador en `pass`; instalar cualquier nodo con su `install.sh` de plantilla y desinstalarlo sin dejar rastro en asistentes ni en `~/.forge614/` ajeno; abrir Claude Code en cualquier nodo y recibir el pack de reglas; y poder responder, para cada decisión de arquitectura del ecosistema, "cuándo, por qué, qué se descartó y en qué sesión", leyendo `docs/decisions/`.

## Anexo A — Patrones canónicos por elemento del ecosistema

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
