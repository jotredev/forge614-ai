# Contrato del Ecosistema Forge614

> **Estado:** Contrato v2 — dirección de producto aprobada; sustituye a las copias divergentes de la v1; se distribuye por puntero (`forge614.node.json`), ya no se copia a mano.
> **Versión:** 2.0.0
> **Propósito:** Mantener coordinados a proyectos independientes sin que uno asuma en silencio la responsabilidad de otro.

## 1. La jerarquía del producto

`forge614-ai` es el núcleo del ecosistema Forge614: un meta-paquete que coordina el resto y, cuando esté listo, poseerá el comando global `forge614`. Alrededor del núcleo hay cinco **productos** (una persona los instala) y dos **paquetes de implementación** (nadie los instala directo; los trae consigo el producto que los necesita):

```text
forge614-ai                         Núcleo y meta-paquete: coordina el ecosistema
├─ forge614-shell                   Producto — la única experiencia visual
├─ forge614-engines                 Paquete de implementación — adaptadores de motores de IA instalados
├─ forge614-workers                 Paquete de implementación — ejecución aislada de tareas ya decididas
├─ forge614-engram                  Producto — motor de memoria persistente
├─ forge614-atlas                   Producto — contextualización inicial opcional de repositorios
├─ forge614-hub                     Producto — almacén de paquetes
└─ forge614-sentinel                Producto — juzga, nunca hace
```

Patrón canónico: **arquitectura de micronúcleo** (`forge614-ai` como núcleo pequeño; las capacidades viven en nodos independientes), **distribuida como paquetes con dependencias declaradas** que el instalador resuelve de forma transitiva (acta 0001). Cada nodo es un producto o un paquete de implementación separado, con repositorio propio. Los nodos se comunican solo por contratos públicos explícitos, nunca por importaciones profundas a las carpetas privadas de otro nodo.

## 2. Responsabilidades del producto

| Producto | ¿Funciona solo? | ¿Tiene interfaz visual? | Posee |
|---|---:|---:|---|
| `forge614-ai` | No hasta que se publique su núcleo | Coordina la experiencia | Orquestación global, ciclo de vida, enrutamiento, estado, workflows y el futuro comando `forge614` |
| `forge614-shell` | Sí | Sí | Espacio de trabajo opcional de chat y terminal, instalación guiada, inicialización, configuración, confirmaciones, reparación y estado visible. No es necesario para el trabajo diario con IA una vez configuradas las integraciones |
| `forge614-engines` | No | No | Detectar motores de IA disponibles y proveer adaptadores seguros para ellos |
| `forge614-workers` | No | No | Ejecutar tareas ya decididas, en secuencia y en aislamiento; sin estado propio; de uso interno |
| `forge614-engram` | Sí, como motor de memoria CLI/MCP | No | Memoria persistente, SQLite, FTS5, identidad de proyecto, búsqueda y sincronización opcional |
| `forge614-atlas` | No por completo; necesita a Engram y a Engines | No | Contextualizar repositorios en profundidad y depositar conocimiento validado en Engram |
| `forge614-hub` | Sí, como almacén | No | Almacén de paquetes: catálogo, lock y huellas; sin código propio; nunca sobrescribe lo que pertenece a la persona usuaria |
| `forge614-sentinel` | Sí, como verificador | No | Juzga, nunca hace: verificación determinista y, después, revisión con IA |

## 3. Una sola experiencia visual

Forge614 Shell es la única interfaz visual que Forge614 posee y mantiene. Es obligatoria para la instalación guiada por una persona, la inicialización, la configuración, la reparación y los flujos de confirmación sensibles. Es opcional para el trabajo diario con IA una vez configuradas las integraciones aprobadas.

- Ningún otro producto de Forge614 mantiene su propia interfaz de texto.
- Shell presenta preguntas, opciones, vistas previas, confirmaciones, progreso, advertencias y resultados durante su propio flujo de configuración y de ciclo de vida.
- Shell configura las integraciones aprobadas a través de los contratos públicos de cada producto.
- Tras la configuración, las personas pueden trabajar directamente en sus asistentes de IA nativos ya configurados o en una terminal normal; esos entornos usan su propia interfaz y Forge614 no la duplica.
- Los clientes externos consumen el MCP, la CLI, el SDK, los ganchos o las skills configurados a través de contratos públicos explícitos, nunca por importaciones profundas a carpetas privadas de otro producto.
- Shell puede funcionar sin Engram ni Atlas.

## 4. El flujo global de `forge614`

Cuando `forge614-ai` esté listo, poseerá el comando global `forge614` con cinco subcomandos:

- **`forge614 init`** — inicializa la **máquina**: resuelve e instala los productos y paquetes de implementación que falten, desde releases verificados, con aviso claro de qué se instala y en qué versión.
- **`forge614 prepare`** — prepara un **proyecto** (repositorio): detecta o crea su identidad portátil, vincula su grupo de ecosistema en Engram (actas 0022 y 0023) y aplica la configuración inicial de ese repositorio. La IA nunca ejecuta `prepare` por su cuenta: solo avisa cuando falta y espera la confirmación de una persona.
- **`forge614 status`** — reporta el estado del ecosistema y del proyecto actual, en texto o como JSON (ver el gancho de arranque en la sección 11).
- **`forge614 doctor`** — diagnostica problemas y propone reparaciones; nunca las aplica sin confirmación.
- **`forge614 update`** — actualiza los productos instalados a versiones compatibles.

```text
forge614-ai revisa los productos Forge614 instalados
        ↓
resuelve los componentes compatibles que faltan, con aviso claro
        ↓
Forge614 Shell abre el flujo visual cuando hace falta una decisión humana
        ↓
Forge614 Engines reporta los motores de IA disponibles
        ↓
Shell recoge las decisiones de la persona y muestra una vista previa
        ↓
los componentes aprobados aplican solo los cambios confirmados
```

Hasta que `forge614-ai` exista, ningún otro producto puede reclamar la propiedad de `forge614 init`, `forge614 prepare`, `forge614 status`, `forge614 doctor` ni `forge614 update`. Pueden existir comandos específicos de un producto, de forma transitoria, por compatibilidad, pero deben ceder el control a Shell cuando el flujo requiera una decisión visual.

## 5. Forge614 Engines

Forge614 Engines es una dependencia interna, nunca una aplicación independiente.

- Se instala automáticamente cuando un producto lo requiere.
- Detecta motores de IA instalados, disponibilidad de ejecutables, ubicaciones de configuración y capacidades.
- Prepara planes y vistas previas de solo lectura.
- No presenta interfaz de texto.
- No escribe configuración por su cuenta.
- Shell solicita un cambio propuesto, lo muestra a la persona y pide confirmación explícita antes de que Engines lo aplique.
- Atlas consume a Engines para decidir qué motor de IA disponible puede ejecutar sus paquetes de Workers.

## 6. Forge614 Engram

Engram es el motor de memoria persistente, no una interfaz de configuración.

Posee:

- su almacenamiento privado bajo `~/.forge614/engram/`;
- SQLite y FTS5 locales;
- sincronización opcional con PostgreSQL;
- memorias persistentes, identidades de proyecto (`projectId`), memorias compartidas, búsqueda y sesiones;
- el ámbito `ecosystem` de memoria compartida entre repositorios relacionados y el archivo de identidad portátil `.forge614/project.json` que Engram escribe y posee (actas 0022 y 0023);
- su servidor MCP y su SDK público de TypeScript.

Debe preservar comandos no interactivos y operaciones de SDK para automatización, como:

```text
forge614-engram init --json
forge614-engram mcp
forge614-engram search ...
```

Engram no debe poseer interfaz de texto, ni detectar motores de IA, ni presentar directamente opciones de configuración de asistentes. Esas responsabilidades son de Shell y de Engines.

Durante la inicialización de memoria por primera vez, Engram solo necesita estas decisiones:

| Necesidad | Decisión |
|---|---|
| Directorio privado del producto | Siempre obligatorio |
| SQLite y FTS5 locales | Siempre obligatorio |
| Sincronización con PostgreSQL | Opcional |
| Refuerzo por memorias repetidas | Incluido en una base nueva (Engram ≥ 1.7.0, `init`); opcional hasta `intelligence-enable` en una base existente |
| Detectar motores de IA | No es responsabilidad de Engram |
| Configurar integraciones de IA | No es responsabilidad de Engram |
| Crear o seleccionar proyectos | No es parte de la inicialización |
| Escribir `.forge614/project.json` al vincular un proyecto | Siempre, silencioso e idempotente |

Vincular un proyecto (escribir `.forge614/project.json`) ocurre después de `init`, cuando un proyecto se crea o se selecciona: vincular no es inicializar.

## 7. Forge614 Atlas

Atlas es el orquestador de contextualización profunda. Trabaja detrás de Engram; no es ni el almacén de memoria ni el espacio de trabajo visual. Planes 1–5 implementados, v1.0.0 publicada; contextualización inicial opcional del proyecto.

```text
Forge614 Engines encuentra motores de IA utilizables
        ↓
Forge614 Atlas analiza un repositorio y ejecuta paquetes de Workers no interactivos
        ↓
Workers devuelve el análisis crudo a Atlas
        ↓
Atlas valida, organiza y escribe conocimiento estructurado en Engram
        ↓
Engram se vuelve la fuente de verdad durable de contexto y progreso
```

Reglas de Atlas:

- Atlas consume el contrato público de Engines; no implementa un segundo detector de motores.
- Atlas usa el SDK público de TypeScript de Engram, nunca los archivos privados de Engram ni acceso ad-hoc a su base de datos.
- Atlas es el único escritor de sus resultados estructurados de contextualización; Workers nunca escribe directo en Engram.
- Atlas no crea una base de progreso paralela. Su progreso reanudable pertenece a las sesiones y memorias de Engram.
- Atlas no tiene interfaz de texto. Shell posee toda decisión humana, pantalla de progreso y confirmación.
- Atlas puede reportar progreso estructurado a Shell mediante un contrato público explícito.

## 8. Instalación y límites de propiedad

Todos los productos viven bajo un mismo directorio compartido, pero cada uno posee solo el suyo:

```text
~/.forge614/
├─ shell/
├─ engines/
├─ workers/
├─ engram/
├─ atlas/
├─ hub/
├─ sentinel/
└─ ai/
```

| Producto que instala la persona | Dependencias resueltas transitivamente |
|---|---|
| `forge614-shell` | Engines |
| `forge614-engram` | Shell, Engines |
| `forge614-atlas` | Engram, Engines, Shell (+ Workers cuando ejecuta tareas) |
| `forge614-hub` | Engines |
| `forge614-sentinel` | — (la verificación determinista no depende de otro producto) |
| `forge614-ai` | Todos los productos y paquetes de implementación (meta-paquete) |

`forge614-engines` y `forge614-workers` son paquetes de implementación: nadie los instala directo.

Reglas de instalación:

1. Los componentes que faltan provienen de releases verificados y compatibles.
2. Las huellas se verifican antes de instalar.
3. Se informa a la persona qué componente y qué versión se va a instalar.
4. Ningún producto reemplaza los archivos o los datos de otro producto.
5. Ningún producto borra `~/.forge614/` completo.
6. Cada producto repara permisos solo dentro de su propio directorio.
7. Instalar un binario nunca configura integraciones de IA en silencio ni crea memorias.
8. **Tres sistemas operativos, siempre** (acta 0018): todo nodo publica binarios e instalador para macOS (arm64 y x64), Linux (arm64 y x64) y Windows (x64). No hay excepciones ni estados "pendiente"; un nodo al que le falte uno de los tres no se libera.

## 9. Reglas de desinstalación

Cada producto retira solo su propio directorio y sus propias entradas de integración.

Engram es una dependencia obligatoria de Atlas. Por eso, retirar Engram mientras Atlas existe exige esta confirmación explícita y exacta:

```text
REMOVE FORGE614-ENGRAM AND FORGE614-ATLAS
```

Esa operación retira únicamente:

```text
~/.forge614/engram/
~/.forge614/atlas/
```

Nunca debe retirar Shell, Engines, Workers, Hub, Sentinel, el directorio compartido, ni archivos ajenos de la persona usuaria.

## 10. El libro de corridas: excepción explícita

El contrato prohíbe que un producto cree una **base de progreso paralela** (sección 13). El **libro de corridas** (ledger) de `forge614-ai`, en `~/.forge614/ai/` sobre SQLite, es la **excepción explícita** a esa regla (acta 0011): una bitácora de eventos inmutable con tablas derivadas que registra qué se pidió, qué obrero lo hizo, con qué modelo y razonamiento, cuántos tokens, cuánto tardó, qué veredicto recibió y quién aprobó. A Engram solo llegan **resúmenes** ("corrida X: 8 tareas, 8 aprobadas, 190k tokens, decisión…"); el detalle operativo del libro de corridas nunca sustituye ni contamina la memoria curada de Engram.

## 11. Contratos públicos requeridos

Ningún repositorio puede depender de las carpetas internas de otro repositorio.

| Proveedor | Consumidor | Contrato requerido |
|---|---|---|
| Engines | Shell | Resultados de detección, capacidades, vistas previas de solo lectura y operaciones confirmadas de aplicación o retiro |
| Engines | Atlas | Motores ejecutables disponibles y capacidades seguras de arranque no interactivo |
| Engram | Shell | Inicialización no interactiva de memoria, estado y disponibilidad del MCP |
| Engram | Atlas | SDK público de TypeScript para proyectos, sesiones, escrituras de memoria estructurada y búsqueda |
| Engram | Todos los productos | Ámbito `ecosystem` de memoria compartida y el archivo de identidad portátil `.forge614/project.json` (actas 0022 y 0023) |
| Atlas | Shell | Ciclo de vida de contextualización, progreso, pausa/reanudación y reporte final |
| Hub | `forge614-ai` | Catálogo de paquetes, resolución de versiones compatibles y huellas para instalación |
| Sentinel | Todos los productos | Veredictos de verificación determinista y, después, de revisión con IA sobre los cambios propuestos |
| Workers | Atlas, `forge614-ai` | Entrada JSON por stdin, eventos de progreso en NDJSON; captura de uso de tokens pendiente (acta 0011) |
| `forge614-ai` | Todos los productos | Descubrimiento futuro de productos, resolución de versiones compatibles, contratos globales de ciclo de vida y el gancho de arranque `forge614 status --directory --json` que reporta identidad y estado del proyecto actual a los asistentes de IA |

## 12. Orden de implementación

Ningún producto debe implementar su integración final antes de que exista el contrato público requerido.

1. `forge614-ai`: define los contratos futuros de orquestación del núcleo y de ciclo de vida del producto, y el libro de corridas.
2. `forge614-engines`: publica los contratos de detección, vista previa y aplicación.
3. `forge614-shell`: implementa la única experiencia visual de inicialización contra esos contratos.
4. `forge614-engram`: retira su interfaz de texto y la propiedad de asistentes, mientras preserva los contratos de CLI, MCP, SDK y el ámbito `ecosystem`.
5. `forge614-atlas`: consume los contratos de Engines y de Engram; reporta el ciclo de vida a Shell.
6. `forge614-hub`: publica el contrato de catálogo, lock y huellas para `forge614-ai`.
7. `forge614-sentinel`: publica sus veredictos de verificación determinista para todos los productos.
8. Se agregan pruebas de extremo a extremo para instalación, `forge614 init`, `forge614 prepare`, configuración, actualización y desinstalación en todos los productos.

## 13. Reglas transversales de cada nodo

Estas reglas se detallan en el Estándar de Nodo (`standard/STANDARD.md`) y se aplican a todo producto y paquete de implementación del ecosistema:

- **Convención única de contratos de máquina** (acta 0013): una sola forma de hablar por stdout y stderr, los mismos códigos de salida y el mismo sobre NDJSON para todo comando de máquina del ecosistema.
- **Evolución aditiva** (acta 0024): en datos persistidos y en contratos públicos solo se agrega; nunca se renombra, se elimina ni se cambia el significado de algo existente. Lo que deja de usarse se marca obsoleto con `sunset`.
- **Huella mínima en el contexto de la IA** (acta 0020): todo lo que Forge614 inyecta al inicio de una sesión de IA cabe en un presupuesto verificable; ninguna skill, regla o política se carga completa hasta que se usa.
- **Piezas reemplazables conforme evoluciona el modelo** (acta 0021): todo paquete declara si compensa una limitación del modelo, con retiro programado, o si es estructural.

## 14. Regla de trabajo para todo repositorio

Antes de cambiar un comportamiento que cruza productos, el agente responsable debe:

1. Leer este contrato y el **Estándar de Nodo** (`standard/STANDARD.md`), la norma vinculante que lo desarrolla.
2. Leer el `CONTRACT.md` del nodo en el que trabaja: es la fuente concreta de sus comandos, esquemas y códigos de error.
3. Identificar el contrato público que consume o que publica (sección 11) y verificar que la dependencia ya existe, o declararla bloqueada.
4. Seguir el procedimiento de agentes nuevos (`standard/procedures/new-agent-checklist.md`) y consultar la matriz de soporte (`standard/support-matrix.json`) antes de asumir que un asistente está soportado.
5. Evitar importaciones profundas temporales, almacenamiento duplicado, detección duplicada y flujos visuales duplicados.
6. Actualizar este contrato en `forge614-ai` solo cuando cambie la decisión de producto misma; los demás repositorios lo referencian por puntero (`forge614.node.json`) y nunca lo copian a mano.
