# Entrega 0 · Fase 0.2 — El verificador `forge614-sentinel` (diseño)

**Fecha:** 2026-09-23 · **Estado:** aprobada por el propietario el 2026-09-23 · **Sesión:** forge614-ai-2026-09-22-fase-0-1-tarea-10-b
**Precede:** spec de la Entrega 0 (`2026-09-22-entrega-0-estandar-de-nodo-design.md`, §5 y §6) y fase 0.1 cerrada (estándar 1.0.0, sha256 `18d4455f…`).
**Actas que rigen:** 0005, 0009, 0012, 0013, 0017, 0018, 0019, 0020, 0021, 0022, 0023, 0024, 0025, 0026.

> Como un inspector municipal: llega con el reglamento vigente bajo el brazo, revisa el edificio, entrega un acta con lo que cumple y lo que no, y se va. No construye, no repara, no decide qué hacer con el acta.

## 1. Propósito

Sacar las comprobaciones del Estándar de Nodo del interior de `forge614-ai` y convertirlas en un programa independiente, `forge614-sentinel`, que revise cualquier repositorio del ecosistema contra el reglamento que ese repositorio declara, con el mismo resultado en Linux, macOS y Windows. Sentinel **juzga, nunca hace**.

## 2. Decisiones de diseño tomadas con el propietario (2026-09-23)

| # | Decisión | Alternativa descartada |
|---|---|---|
| D1 | Toda la lógica de comprobación vive en Sentinel. `forge614-ai` deja de tener validadores y su `verify` llama a Sentinel como cualquier nodo. | Comprobaciones dentro del paquete del estándar ejecutadas por Sentinel (código descargado ejecutado por un binario); duplicar en ambos repos. |
| D2 | Publicación pragmática: `forge614-ai` publica el reglamento con un workflow mínimo (tag `standard-v<versión>`); Sentinel copia el flujo de release de binarios probado en Engram. La fase 0.4 lo extrae al `bun release` compartido. | Construir primero el paquete compartido de release. |
| D3 | Interno primero, puerta abierta: 0.1 revisa solo repositorios con `forge614.node.json`. El origen del reglamento es un dato (ubicación + huella), las comprobaciones toman parámetros del reglamento y el pack decide qué corre, para que reglamentos de terceros sean una entrega futura que agrega, no que reescribe. | Diseñar desde 0.1 para terceros. |
| D4 | Sentinel es obligatorio para desarrollar nodos del ecosistema y opcional para productos de terceros hechos con el ecosistema. Un solo nodo, dos niveles de obligación, decididos por los archivos de identidad. | Dos nodos. |
| D5 | Dos versiones dentro de la fase: 0.1 con 19 comprobaciones; 0.2 con las 3 que requieren análisis de código o ejecución del nodo. | Las 22 en una versión. |
| D6 | Las reglas de usuario (proyecto, grupo, compartido) vivirán en Engram como la memoria: tabla nueva, mismos ámbitos, búsqueda local con FTS5, puntuación por uso; Engram materializa `.forge614/rules.json` (generado, versionado) solo para Sentinel y CI. Fuera de esta fase. | Repositorios de reglas y URLs configurados por la persona; Sentinel leyendo la base de datos. |
| D7 | Sin Sentinel instalado en la máquina de quien desarrolla un nodo, `verify` falla con el mensaje de instalación. En CI se instala desde release. | Avisar y continuar; instalar solo. |

## 3. Alcance

### 3.1 Entra (Sentinel 0.1)

- Repositorio `forge614-sentinel` creado desde las plantillas del estándar 1.0.0 (`standard:render --node sentinel`), con capas, contratos, workflows, gancho, protección de rama, contrato del nodo y documentación bilingüe.
- Comando `forge614-sentinel check` con el informe de §6 y los errores de §7.
- Subcomando `forge614-sentinel standard fetch [<versión>]`.
- Obtención, verificación y caché local del reglamento (§5).
- 19 comprobaciones (§8): 11 trasladadas desde `forge614-ai` y 8 nuevas (5 de lectura de archivos y 3 de comparación con plantillas y versiones). El reglamento original (spec Entrega 0 §6.2) listaba 19 identificadores; tres de las existentes (`package-naming`, `error-codes`, `rules-catalog`) conservan identificador propio, por eso el total con la 0.2 es 22.
- Release de binarios para 5 plataformas con Bun 1.4.2 e instalador de plantilla (§10).
- Autoverificación: el `verify` de Sentinel corre su propio `check`.
- En `forge614-ai`: workflow mínimo de publicación del reglamento (§5.1); adopción de Sentinel en `verify` y retiro de los validadores (§9.2); estándar 1.1.0 con la plantilla de verificación actualizada.

### 3.2 Entra (Sentinel 0.2)

- `import-rules` sobre cualquier repositorio (análisis del código, no solo texto).
- `boundaries-zod`.
- `machine-contracts` (ejecuta `--help`/`--version` del nodo con timeout y valida sobres de error).

### 3.3 No entra (a propósito)

- Reglas de usuario en Engram y lectura de `.forge614/rules.json` (entrega de Engram posterior a 1.6.0; Sentinel las leerá en una versión siguiente).
- Reglamentos de terceros y extensiones con código propio (requerirán acta por seguridad).
- Revisión con IA (Entrega 2), escaneo de paquetes del Hub (Entrega 1).
- Corregir automáticamente; escribir en el repositorio revisado.
- Revisión incremental (solo archivos cambiados).
- Paquete compartido `bun release` (fase 0.4).

## 4. Tipos de repositorio y nivel de obligación

Sentinel decide qué hacer solo por archivos de identidad, nunca por nombres de carpeta, cercanía en disco ni remotos de Git (acta 0023):

| Situación | Cómo se reconoce | Qué hace Sentinel |
|---|---|---|
| Nodo del ecosistema | Existe `forge614.node.json` válido | Revisión completa contra el reglamento declarado. Obligatorio: el `verify` del nodo lo invoca. |
| Proyecto de terceros con Forge614 | Existe `.forge614/project.json` y no hay `forge614.node.json` | Informa `{ applicable: false, reason: "external-project" }` y sale `0`. Opcional; reglamentos de terceros en una entrega futura. |
| Carpeta cualquiera | Ninguno de los dos | Informa `{ applicable: false, reason: "not-a-forge614-repo" }` y sale `0`. No revisa nada. |

## 5. El reglamento: origen, verificación y caché

### 5.1 Publicación en `forge614-ai`

Workflow `standard-release.yml` (delgado, acta 0019; documentado en `docs/*/05-workflows.md`): disparador `push` de tag `standard-v*`; pasos `bun install --frozen-lockfile`, `bun run standard:check` (el puntero debe coincidir), `bun run standard:release` (script nuevo que verifica que el tag coincide con `standard/VERSION`, construye `dist/` y publica una release de GitHub con `standard-<versión>.tar.gz`, `SHA256SUMS` y `pack-manifest.json`; usa `gh` con el token del workflow; código `STANDARD_RELEASE_FAILED`). `timeout-minutes` obligatorio. La release es inmutable: republicar la misma versión falla.

### 5.2 Origen del reglamento en Sentinel

`StandardSource = { kind: "github-release", repository: "jotredev/forge614-ai", version, sha256 }`. En 0.1 el `repository` es fijo y solo la versión y la huella vienen del repo revisado; la forma se define como dato para que una entrega futura admita otros orígenes sin cambiar el motor.

### 5.3 Versión a usar

La que declara `forge614.node.json` del repositorio revisado (`standard.version` y `standard.sha256`). `--standard <versión>` fuerza otra y el informe lo marca (`standardForced: true`). Sentinel nunca elige una versión por su cuenta ni "la más nueva".

### 5.4 Caché local

`<FORGE614_HOME o ~/.forge614>/standard/<versión>/` con el contenido del tarball extraído y un archivo `manifest.json` (`{ schemaVersion: 1, version, sha256, fetchedAt }`). Escritura atómica (extraer en carpeta temporal y renombrar). Antes de aceptar un tarball se comprueba su sha256 contra la huella pedida; si no coincide → `STANDARD_CORRUPT` y no se guarda nada.

### 5.5 Sin red

Con caché de la versión pedida, la revisión no usa red. Sin caché y sin red → `STANDARD_UNAVAILABLE` con el comando para obtenerlo (`forge614-sentinel standard fetch <versión>`). Nunca se revisa con otra versión "por aproximación".

### 5.6 Huella cruzada

La comprobación `node-pointer` compara `standard.sha256` del repo con el sha256 del tarball de la caché de esa versión. Si difieren, `fail`: o el puntero se editó a mano o la release cambió.

### 5.7 Reglamento más nuevo que Sentinel

Si el pack pide un `validator` que esta versión de Sentinel no implementa, la comprobación sale `caution` con `SENTINEL_OUTDATED` en la evidencia y el mensaje "actualiza Sentinel". Nunca se omite en silencio ni se inventa un resultado.

## 6. Interfaz

```
forge614-sentinel check [--repo <ruta>] [--standard <versión>] [--only <id,id>] [--strict] [--json]
forge614-sentinel standard fetch [<versión>] [--json]
forge614-sentinel --help | --version
```

- Sin `--json` y con TTY: resumen legible en stderr y el JSON completo en stdout (un solo objeto; acta 0013). Con `--json` o sin TTY: solo el JSON.
- Salida de `check` (contrato `CheckReport`, `schemaVersion: 1`):

```json
{
  "schemaVersion": 1,
  "sentinel": "0.1.0",
  "standard": { "version": "1.0.0", "sha256": "…", "forced": false, "fetched": false },
  "repository": { "kind": "node", "name": "engram" },
  "verdict": "pass | caution | fail",
  "checks": [
    { "id": "docs-parity", "verdict": "pass | caution | fail | not-applicable",
      "applied": true, "evidence": ["docs/es/03-x.md: 5 headings vs docs/en/03-x.md: 4"],
      "message": { "es": "…", "en": "…" } }
  ],
  "durationMs": 812
}
```

- `verdict` global = el peor de los `checks` aplicados (`not-applicable` no cuenta).
- Códigos de salida: `0` pass; `0` caution (`1` con `--strict`); `1` fail; `2` uso incorrecto. Un repositorio no aplicable (§4) devuelve `{ schemaVersion: 1, applicable: false, reason }` y sale `0`.
- `applied` alimenta la puntuación de reglas (D6): qué reglas se aplicaron y cuáles fallaron en cada revisión.
- El contrato evoluciona de forma aditiva (acta 0024): campos nuevos opcionales; nunca renombrar ni quitar.

## 7. Errores (sobre `{ schemaVersion: 1, code, error }` en stderr, sin rutas absolutas)

| Código | Cuándo | Salida |
|---|---|---|
| `INVALID_ARGUMENTS` | flag desconocido, valor inválido, `--only` con id inexistente | 2 |
| `NODE_POINTER_INVALID` | `forge614.node.json` no cumple `NodePointerSchema` | 2 |
| `STANDARD_UNAVAILABLE` | sin caché de la versión y sin red | 1 |
| `STANDARD_CORRUPT` | huella del tarball distinta de la pedida | 1 |
| `STANDARD_FETCH_FAILED` | error de red o de release al descargar | 1 |
| `CHECK_FAILED` | excepción inesperada dentro de una comprobación (se reporta y las demás siguen; el veredicto global es `fail`) | 1 |
| `SENTINEL_FAILED` | error inesperado fuera de las comprobaciones | 1 |

## 8. Comprobaciones

Cada comprobación es un módulo puro `modules/checks/<id>.ts` con la firma `run(snapshot: RepoSnapshot, params: CheckParams): CheckResult`, sin I/O, con mensajes en el catálogo es/en tipado (paridad por compilador) y sus fixtures en `fixtures/<id>/{pass,fail}/`. Los parámetros salen del reglamento (manifiestos, pack, `forbidden-mentions.json`, `support-matrix.json`, plantillas), nunca de constantes en el código. Cada comprobación declara `appliesWhen`; si no aplica, devuelve `not-applicable`.

### 8.1 Trasladadas desde `forge614-ai` (11)

`package-naming`, `forbidden-mentions`, `docs-parity` (hoy `bilingual-docs`), `decisions`, `agent-checklist-impact`, `error-codes` (hoy parte de `machine-contracts`; en Sentinel conserva su id propio), `support-matrix`, `workflows`, `context-budget`, `ecosystem-contract`, `rules-catalog` + `packs-catalog` (se fusionan como `rules-catalog`). Se trasladan con sus tests y se adaptan a `RepoSnapshot` y `CheckParams`; el comportamiento observable no cambia (mismas evidencias).

### 8.2 Nuevas en 0.1 (5 de lectura + 3 de comparación)

| Id | Qué comprueba | Parámetros del reglamento |
|---|---|---|
| `node-pointer` | `forge614.node.json` válido; `standard.sha256` igual al del tarball de la caché | `node-pointer.schema.json` |
| `layout` | carpetas y archivos obligatorios de STANDARD §2 presentes (`src/{modules,app,infrastructure,interfaces}`, `docs/es`, `docs/en`, `docs/decisions`, `CONTRACT.md`, `README.md`, `.github/workflows`, `.githooks/pre-push`, `.agents/templates/plan.md`); sin `scripts/` que dupliquen plantillas | lista en `standard/layout.json` (archivo nuevo del estándar 1.1.0; en 1.0.0 Sentinel usa la lista embebida y lo declara en la evidencia) |
| `stack` | `tsconfig.json` con las banderas de STANDARD §3 (`strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, …); sin `any`, `@ts-ignore`, `@ts-expect-error` en `src/` (tests excluidos); `bun.lock` presente; `package.json` con `engines.bun` ≥ mínimo del acta 0026 | STANDARD §3 |
| `secrets-hygiene` | patrones de secretos ausentes en el árbol (claves privadas PEM, tokens con prefijos conocidos, `AKIA…`, `ghp_…`, cadenas de conexión con credenciales, `.env` con valores); excluye fixtures declaradas | lista de patrones en el estándar (`standard/secret-patterns.json`, nuevo en 1.1.0; embebida en 1.0.0) |
| `node-contract` | `CONTRACT.md` y `.en.md` presentes con paridad; cada comando de la tabla existe como script en `package.json`; cada código de error de la tabla aparece en `src/interfaces/cli`; y viceversa | plantilla `CONTRACT.md` |
| `installer` | `install.sh` e `install.ps1` byte-idénticos a la plantilla renderizada con las variables del nodo (`NODE_NAME`, `REPO`, `STANDARD_VERSION`); solo `forge614-ai` está exento | plantillas + `render` mínimo en Sentinel |
| `release` | `verify.yml` y `release.yml` idénticos a la plantilla salvo jobs añadidos permitidos; acciones fijadas por SHA; `CHANGELOG.md` presente | plantillas |
| `versions` | `package.json.version` = tag `v*` más alto (si existe) = `docs/notion-map.json.productVersion`; `--version` no se ejecuta en 0.1 (queda para `machine-contracts`) | — |

### 8.3 Para 0.2 (3)

`import-rules` (capas por análisis del código con el mismo criterio que `tests/architecture/import-rules.test.ts`, incluidos imports dinámicos y de efecto), `boundaries-zod` (todo punto de entrada externo pasa por esquema `.strict()`), `machine-contracts` (ejecuta `--help`/`--version` con timeout, valida sobres de error y `schemaVersion`).

## 9. Integración

### 9.1 En cada nodo

- El script `verify` del nodo corre, además de lo suyo, `forge614-sentinel check --json` y falla si el veredicto es `fail`. Si el binario no está: mensaje `SENTINEL_NOT_INSTALLED` con el comando de instalación (D7).
- Plantilla `verify.yml` (estándar 1.1.0): paso `bun run sentinel:install` (script del repo que descarga la release fijada de Sentinel por plataforma y verifica `SHA256SUMS`) antes de `bun run verify`. La versión de Sentinel se fija en `forge614.node.json` (`sentinel.version`, campo opcional nuevo; aditivo).

### 9.2 En `forge614-ai`

Secuencia del arranque circular (revisión humana hasta que exista Sentinel 0.1):

1. `forge614-ai` publica el reglamento 1.0.0 (tag `standard-v1.0.0`) con el workflow de §5.1.
2. Sentinel se construye desde las plantillas 1.0.0; sus PR pasan `verify` propio (typecheck, tests) y revisión independiente.
3. Sentinel 0.1 se revisa a sí mismo con su `check`, pasa, y se publica.
4. `forge614-ai` adopta Sentinel en `verify`, borra `src/modules/validators/` y `src/app/run-validators.ts`, conserva `standard:render`, `standard:pack`, `schemas:generate`, `decisions:index`, `notion-map:build`, y publica el estándar 1.1.0 (plantilla `verify.yml` con Sentinel, `layout.json`, `stack.json`, `secret-patterns.json`, aclaración del acta 0024 en la regla de evolución aditiva, `BRANCH_PROTECTION` ya actualizado).
5. Los nodos adoptan Sentinel en su siguiente release (fase 0.4).

Un nodo puede declarar 1.0.0 mientras Sentinel ya conoce 1.1.0: Sentinel revisa con la versión declarada y añade en el informe `standard.latestKnown`.

## 10. Publicación e instalación de Sentinel

- Repositorio `jotredev/forge614-sentinel`, versión inicial `0.1.0`, Bun 1.4.2 (acta 0026), tres sistemas operativos (acta 0018).
- `release.yml` de plantilla con `build:target` (compila `bun build --compile` por objetivo), `smoke:target` (ejecuta el binario con `--version` y `--help`, y `check` sobre una fixture), `release:publish` (junta artefactos, genera `SHA256SUMS`, publica la release con `install.sh`). Implementados como scripts reales en el repo de Sentinel, copiando el flujo probado de Engram y diseñados para extraerse en la fase 0.4.
- Instalador de plantilla sin cambios: `~/.forge614/sentinel/<versión>/`, huella verificada, `--uninstall` simétrico, `install.ps1` para Windows.

## 11. Arquitectura interna de Sentinel

```
src/
├── modules/           puro: checks/<id>.ts, catálogo de mensajes es/en, esquemas Zod (CheckReport, StandardManifest, CheckParams), RepoSnapshot (árbol + facts)
├── infrastructure/    lectura del árbol, datos de Git (tags, log, modos), red (descarga de release), caché, extracción de tar.gz (lector ustar propio + gunzip de fflate; mismo formato que produce forge614-ai)
├── app/               takeSnapshot, loadStandard, runChecks (selección por pack y appliesWhen, paralelismo), buildReport, fetchStandard
└── interfaces/cli/    check.ts, standard-fetch.ts, version/help, sobres de error
```

Reglas: capas del estándar; Zod `.strict()` en toda frontera (argv, `forge614.node.json`, `manifest.json` de caché, `pack.json`, manifiestos de regla, YAML); sin red durante `runChecks`; sin escritura en el repo revisado; identificadores y comentarios en inglés; tests junto al código; fixtures en `fixtures/`; objetivo de rendimiento: revisar un nodo del ecosistema en menos de 5 s (prueba e2e con tope).

## 12. Pruebas

- Unitarias por comprobación con fixtures pass/fail (veredicto, evidencias, mensajes es/en).
- E2E con el binario: nodo correcto (`pass`), nodo con fallos conocidos (`fail` con evidencias exactas), carpeta ajena (`applicable: false`, salida `0`), proyecto de terceros (`applicable: false`, `external-project`), sin caché y sin red (`STANDARD_UNAVAILABLE`, con red simulada apagada), tarball con huella alterada (`STANDARD_CORRUPT`), `--only`, `--strict`, `--standard` forzada.
- Paridad: el mismo informe (sin `durationMs`) byte a byte en ubuntu, macOS y Windows sobre la misma fixture.
- Autoverificación en `verify`.
- Rendimiento: tope de 5 s en e2e.
- Ninguna comprobación devuelve `pass` por no saber: `not-applicable` o `caution` con motivo.

## 13. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Arranque circular Sentinel ↔ forge614-ai | Secuencia de §9.2 con revisión humana; forge614-ai no borra sus validadores hasta pasar `check` con Sentinel publicado. |
| Falsos positivos en `installer`/`release` por diferencias legítimas | Comparación contra plantilla renderizada con las variables del nodo; lista explícita de desviaciones permitidas (jobs añadidos) en el reglamento; evidencia con diff de líneas. |
| Reglamento más nuevo que Sentinel | `caution` + `SENTINEL_OUTDATED`, nunca silencio. |
| Descarga desde GitHub en CI sin token | Releases públicas; `sentinel:install` verifica `SHA256SUMS`; sin token no hay escritura. |
| Rendimiento con repos grandes | Snapshot una sola vez; checks en paralelo; incremental como meta posterior. |

## 14. Criterio de terminado de la fase 0.2

- Sentinel 0.1 publicado (5 plataformas), instalable con plantilla, `check` verde sobre sí mismo y sobre `forge614-ai`.
- `forge614-ai` sin validadores propios, `verify` con Sentinel, estándar 1.1.0 publicado como release.
- Sentinel 0.2 publicado con las 3 comprobaciones restantes; 22 en total.
- Paridad de informe en tres sistemas probada en CI.
- Documentación bilingüe de Sentinel (00 resumen, 01 comprobaciones, 02 reglamento y caché, 03 integración, 04 workflows) y `CONTRACT.md`.
