# 0031 — Instalador único `install.mjs`

**Fecha:** 2026-10-15
**Estado:** aceptada
**Sesión:** forge614-ai-2026-10-15-t45-orquestador

## Contexto

Los seis instaladores repiten lógica de descarga, huella, instalación y PATH, pero difieren en plataformas, activos, dependencias y compatibilidad. El reconocimiento documenta las diferencias y sus fuentes en `~/.forge614/orquestador/forge614-ai/prompts/simetria/R2-recon-reporte.md`, secciones 3–5. El propietario decidió usar un solo `install.mjs`, idéntico byte a byte, precedido por porteros mínimos por sistema operativo, con los datos de cada nodo en `forge614.node.json`.

Node `22.19.0` es el mínimo para **instalar** cualquier nodo. El runtime que cada nodo necesita para **ejecutarse** sigue siendo una propiedad aparte de su contrato.

## Decisión

### 1. Porteros `install.sh` e `install.ps1`

Cada release publica ambos porteros, de unas 30 líneas. Cada uno hace, en este orden:

1. Lee sus únicos dos datos variables: nombre del nodo y repositorio GitHub, por ejemplo `sentinel` y `jotredev/forge614-sentinel`. No contiene versiones, activos ni lógica propia del nodo.
2. Busca Node y exige `>=22.19.0`. Si falta o es anterior, imprime el mensaje bilingüe y termina con código 65 sin cambiar archivos.
3. Resuelve la etiqueta pedida o `latest`, descarga por HTTPS `install.mjs`, `forge614.node.json` y `SHA256SUMS` de esa misma release.
4. Verifica el SHA-256 de `install.mjs` y `forge614.node.json` con sus entradas exactas de ese `SHA256SUMS`. Solo después ejecuta `node install.mjs`.
5. Reenvía sin alterar todos los argumentos: `--latest`, `--force`, `--version <TAG>`, `--archive <ruta>`, `--uninstall`, `--bin-dir <ruta>` y `--help`.

Si falta Node, imprime:

| Idioma | Mensaje |
|---|---|
| Español | `Forge614 necesita Node.js 22.19.0 o posterior para instalarse. Instálalo con Homebrew: brew install node; en Linux, con el gestor de paquetes de tu distribución o desde https://nodejs.org; en Windows, con winget install OpenJS.NodeJS.LTS o desde https://nodejs.org. Después vuelve a ejecutar este instalador.` |
| English | `Forge614 requires Node.js 22.19.0 or later to install. Install it with Homebrew: brew install node; on Linux, use your distribution's package manager or https://nodejs.org; on Windows, use winget install OpenJS.NodeJS.LTS or https://nodejs.org. Then run this installer again.` |

El portero de PowerShell usa .NET para SHA-256, compatible con Windows PowerShell 5.1; no depende de módulos ni de `Get-FileHash`. El manifiesto de la misma release protege contra descargas incompletas o alteradas en tránsito, pero no frente a una release comprometida.

### 2. Instalador común `install.mjs`

El archivo es idéntico byte a byte en los seis nodos y no incluye datos de nodo. Sus pasos son:

1. Analiza argumentos y determina `latest`, la etiqueta indicada o el archivo local de `--archive`.
2. Resuelve `FORGE614_HOME`; una ruta vacía o relativa da `INVALID_FORGE614_HOME`.
3. Lee y valida el bloque `install` de la ficha de la release.
4. Detecta macOS, Linux o Windows y `arm64` o `x64`; rechaza combinaciones no declaradas con código 65.
5. Obtiene la release por HTTPS y resuelve el activo y su `SHA256SUMS`.
6. Verifica el SHA-256 del activo antes de extraerlo o ejecutarlo.
7. Para cada dependencia, comprueba compatibilidad. Si falta o no alcanza el mínimo, descarga el `install.mjs` de la release de esa dependencia, verifica su SHA-256 con el `SHA256SUMS` de esa release y ejecuta su instalación. Si falla, no activa cambios parciales del nodo solicitante.
8. Prepara el nodo en `~/.forge614/<nodo>/<versión>/` (o bajo `FORGE614_HOME`) en un directorio temporal dentro del mismo padre. Valida su contenido y construye el lanzador.
9. En Unix publica `bin/forge614-<nodo>` como enlace; en Windows, una copia o `.cmd` según el activo. Cambia `.active-version` y el lanzador atómicamente. Si falla, restaura la versión previa y elimina el temporal de esta operación.
10. Migra las instalaciones planas de Engram y Atlas al esquema versionado, conservando la ruta canónica del lanzador (`forge614-engram:scripts/install.sh:180,213,324-333`; `forge614-atlas:scripts/install.sh:55-90,374-392`). Retira los bloques PATH viejos al reemplazarlos por el bloque marcado vigente.
11. Ejecuta `<lanzador> --version`; confirma éxito solo con salida y código válidos. `--uninstall` llama primero a `<lanzador> uninstall --self` y después borra solo `~/.forge614/<nodo>/`.

No confirma `.active-version` hasta que el contenido y la prueba de humo estén listos. Una falla previa deja activa la versión anterior; una posterior revierte el puntero y elimina la carpeta nueva.

El criterio `compatible` vive en la ficha: si falta el nodo, se instala; `minimumVersion` se compara como SemVer; las capacidades declaradas deben aparecer en `capabilities`. Donde el reconocimiento solo comprobó existencia, el ejemplo usa `installed`, sin inventar un mínimo. Windows admite inicialmente `x64`; Atlas y Workers agregan Windows con la plantilla, sin `arm64`.

### 3. Bloque `install` de `forge614.node.json`

El objeto raíz `install` es opcional mientras las fichas actuales sigan usando la plantilla anterior. Se vuelve obligatorio para cada nodo al adoptar la nueva. Campos:

| Campo | Tipo | Significado |
|---|---|---|
| `repository` | string `owner/repo` | Repositorio de GitHub. |
| `minimumNodeVersion` | string SemVer | Mínimo del instalador: `22.19.0`. |
| `systems` | array de objetos | `os` (`darwin`, `linux`, `windows`) y `architectures` (`arm64`, `x64`) admitidas. |
| `tagFormat` | string | Formato de etiqueta: `vX.Y.Z`. |
| `asset` | objeto | `type`, `pattern` y `checksumFile` (`SHA256SUMS`). Tipos: `binary-tar-gzip`, `raw-binary`, `node-package-tar-gzip`, `binary-tar-gzip-or-zip`. |
| `dependencies` | array | `node`, `minimumVersion` (SemVer o `null`), `requiredCapabilities` (array de strings), `compatibility` (`installed`, `version`, `capabilities`, `version-and-capabilities`). |
| `path` | objeto | `modify` booleano; `retireWhen` string o `null`. Si modifica PATH, se retira cuando `forge614 init` lo gestione. |
| `smokeTest` | array de strings | Argumentos de la prueba posterior a instalar; inicialmente `--version`. |

Ejemplos completos según los datos reales de R2, §3.3 y §5. Las combinaciones de plataforma representan el soporte exigido por el reglamento y la llegada de Windows para Atlas y Workers (sin arm64); cada nodo publica los activos declarados por sus fuentes.

**Engines**

```json
{"install":{"repository":"jotredev/forge614-engines","minimumNodeVersion":"22.19.0","systems":[{"os":"darwin","architectures":["arm64","x64"]},{"os":"linux","architectures":["arm64","x64"]},{"os":"windows","architectures":["x64"]}],"tagFormat":"vX.Y.Z","asset":{"type":"binary-tar-gzip","pattern":"forge614-engines-<ver>-<plat>-<arch>.tar.gz","checksumFile":"SHA256SUMS"},"dependencies":[],"path":{"modify":false,"retireWhen":null},"smokeTest":["--version"]}}
```
Datos: `forge614-engines:scripts/install.sh:92,110-115`; Windows x64: `forge614-engines:scripts/install.ps1:19-26`.

**Engram**

```json
{"install":{"repository":"jotredev/forge614-engram","minimumNodeVersion":"22.19.0","systems":[{"os":"darwin","architectures":["arm64","x64"]},{"os":"linux","architectures":["arm64","x64"]},{"os":"windows","architectures":["x64"]}],"tagFormat":"vX.Y.Z","asset":{"type":"raw-binary","pattern":"forge614-engram-<plat>-<arch>[.exe]","checksumFile":"SHA256SUMS"},"dependencies":[{"node":"shell","minimumVersion":null,"requiredCapabilities":[],"compatibility":"installed"},{"node":"engines","minimumVersion":null,"requiredCapabilities":[],"compatibility":"installed"}],"path":{"modify":true,"retireWhen":"cuando forge614 init gestione el PATH"},"smokeTest":["--version"]}}
```
Datos: `forge614-engram:scripts/install.sh:127,152,317-318,335`; Windows x64: `forge614-engram:scripts/install.ps1:154`.

**Shell**

```json
{"install":{"repository":"jotredev/forge614-shell","minimumNodeVersion":"22.19.0","systems":[{"os":"darwin","architectures":["arm64","x64"]},{"os":"linux","architectures":["arm64","x64"]},{"os":"windows","architectures":["x64"]}],"tagFormat":"vX.Y.Z","asset":{"type":"node-package-tar-gzip","pattern":"forge614-shell-<ver>.tar.gz","checksumFile":"SHA256SUMS"},"dependencies":[{"node":"engines","minimumVersion":null,"requiredCapabilities":["fullySupported"],"compatibility":"capabilities"}],"path":{"modify":true,"retireWhen":"cuando forge614 init gestione el PATH"},"smokeTest":["--version"]}}
```
Datos: `forge614-shell:scripts/install.sh:106-140,199-221`; Windows x64 y `.cmd`: `forge614-shell:scripts/install.ps1:528`.

**Atlas**

```json
{"install":{"repository":"jotredev/forge614-atlas","minimumNodeVersion":"22.19.0","systems":[{"os":"darwin","architectures":["arm64","x64"]},{"os":"linux","architectures":["arm64","x64"]},{"os":"windows","architectures":["x64"]}],"tagFormat":"vX.Y.Z","asset":{"type":"raw-binary","pattern":"forge614-atlas-<plat>-<arch>","checksumFile":"SHA256SUMS"},"dependencies":[{"node":"engram","minimumVersion":"1.8.7","requiredCapabilities":[],"compatibility":"version"},{"node":"workers","minimumVersion":"1.0.0","requiredCapabilities":[],"compatibility":"version"},{"node":"engines","minimumVersion":"1.17.0","requiredCapabilities":["supportsReadOnly"],"compatibility":"version-and-capabilities"}],"path":{"modify":true,"retireWhen":"cuando forge614 init gestione el PATH"},"smokeTest":["--version"]}}
```
Datos: `forge614-atlas:scripts/install.sh:30-33,229-247,478-492`; Windows actual pendiente: `forge614-atlas:docs/en/10-installer-and-release.md:16`.

**Workers**

```json
{"install":{"repository":"jotredev/forge614-workers","minimumNodeVersion":"22.19.0","systems":[{"os":"darwin","architectures":["arm64","x64"]},{"os":"linux","architectures":["arm64","x64"]},{"os":"windows","architectures":["x64"]}],"tagFormat":"vX.Y.Z","asset":{"type":"raw-binary","pattern":"forge614-workers-<plat>-<arch>","checksumFile":"SHA256SUMS"},"dependencies":[{"node":"engines","minimumVersion":"1.17.0","requiredCapabilities":["supportsReadOnly"],"compatibility":"version-and-capabilities"}],"path":{"modify":false,"retireWhen":null},"smokeTest":["--version"]}}
```
Datos: `forge614-workers:scripts/install.sh:46-68,252-272,293-304`; Windows pendiente: `forge614-workers:CONTRACT.en.md:76`.

**Sentinel**

```json
{"install":{"repository":"jotredev/forge614-sentinel","minimumNodeVersion":"22.19.0","systems":[{"os":"darwin","architectures":["arm64","x64"]},{"os":"linux","architectures":["arm64","x64"]},{"os":"windows","architectures":["x64"]}],"tagFormat":"vX.Y.Z","asset":{"type":"binary-tar-gzip-or-zip","pattern":"forge614-sentinel-<plat>-<arch>.tar.gz|.zip","checksumFile":"SHA256SUMS"},"dependencies":[],"path":{"modify":false,"retireWhen":null},"smokeTest":["--version"]}}
```
Datos: `forge614-sentinel:install.sh:84-99`; Windows x64: `forge614-sentinel:install.ps1:43`.

### 4. Releases, comandos y errores

Cada release publica el activo declarado por `install.asset.pattern`, `SHA256SUMS`, `install.sh`, `install.ps1`, `install.mjs` y `forge614.node.json`. `SHA256SUMS` usa un único formato GNU: `<64 caracteres hexadecimales minúsculos><dos espacios><nombre exacto>\n`, una entrada por archivo. No se mezclan activos `.sha256` sueltos ni formatos alternativos. Por una versión menor completa, cada release conserva los nombres de activos que aún usan actualizadores anteriores. Todas las etiquetas son `vX.Y.Z`, también Shell.

| Nodo | Nombre del activo por plataforma y arquitectura |
|---|---|
| Engines | `forge614-engines-<ver>-<plat>-<arch>.tar.gz` (`forge614-engines:scripts/install.sh:92`) |
| Engram | `forge614-engram-<plat>-<arch>` o `forge614-engram-<plat>-<arch>.exe` (`forge614-engram:scripts/install.sh:304-315`; `forge614-engram:scripts/install.ps1:123-126`) |
| Shell | `forge614-shell-<ver>.tar.gz` (`forge614-shell:scripts/install.sh:186`) |
| Atlas | `forge614-atlas-<plat>-<arch>` (`forge614-atlas:scripts/install.sh:478-492`) |
| Workers | `forge614-workers-<plat>-<arch>` (`forge614-workers:scripts/install.sh:252-272`) |
| Sentinel | `forge614-sentinel-<plat>-<arch>.tar.gz` o `forge614-sentinel-<plat>-<arch>.zip` (`forge614-sentinel:install.sh:84-88`; `forge614-sentinel:install.ps1:57-59`) |

| Comando común | stdout en éxito | Código | Error |
|---|---|---:|---|
| `<nodo> --version` | `forge614-<nodo> X.Y.Z\n` | 0 | Objeto estructurado en stderr. |
| `<nodo> --version --json` | `{"schemaVersion":1,"name":"forge614-<nodo>","version":"X.Y.Z"}\n` | 0 | Objeto estructurado en stderr. |
| `<nodo> --help` | Ayuda de texto, terminada en salto de línea | 0 | Objeto estructurado en stderr si no se puede generar. |
| `<nodo> update` | `{"schemaVersion":1,"result":{"updated":true,"previousVersion":"X.Y.Z","installedVersion":"X.Y.Z"}}\n`; sin cambios: `updated:false` y versión actual en ambos campos | 0 | Objeto de error por stderr; código 1. |
| `<nodo> uninstall` | `{"schemaVersion":1,"result":{"removed":true}}\n`, tras confirmación | 0 | Objeto de error por stderr; código 1. Cancelar: 130. |
| `<nodo> uninstall --self` | `{"schemaVersion":1,"result":{"integrationsRemoved":true}}\n` | 0 | Objeto de error por stderr; código 1. |

Los errores CLI usan `{ "schemaVersion": 1, "code": "CODIGO_ESTABLE", "error": "mensaje para personas" }` en stderr, sin rutas crudas, trazas ni secretos. Entrada inválida de un comando de nodo sale con 2. Son distintos de los códigos del instalador:

| Código de `install.mjs` | Significado |
|---:|---|
| 0 | Instalación, actualización o desinstalación correcta. |
| 64 | Uso incorrecto o argumentos inválidos. |
| 65 | Node menor que 22.19.0, plataforma/arquitectura no admitida u otro requisito local ausente. |
| 66 | Descarga, activo ausente o SHA-256 inválido. |
| 69 | Dependencia incompatible según la ficha. |

Los porteros reenvían el código de salida de `install.mjs`.

### 5. Idioma y PATH

Los mensajes del instalador tienen catálogos en español e inglés. `FORGE614_LOCALE` acepta `es` y `en`. `FORGE614_SHELL_LOCALE` se acepta durante la transición solo si no se definió `FORGE614_LOCALE`. Engines, Workers y Sentinel no modifican PATH (`forge614-engines:scripts/install.sh:115`; `forge614-workers:scripts/install.sh:304`; `forge614-sentinel:install.sh:94-99`); Engram, Shell y Atlas conservan el bloque marcado actual hasta que `forge614 init` gestione esa configuración, momento de retiro indicado en la ficha (`forge614-engram:scripts/install.sh:14-114,335`; `forge614-shell:scripts/install.sh:202-221`; `forge614-atlas:scripts/install.sh:39-186`).

### 6. Compatibilidad y adopción

El portero conserva `--latest`, `--force`, `--version`, `--archive`, `--uninstall` y `--help`, además de `--bin-dir` para Engram y Atlas. Así siguen funcionando los `update` ya instalados que llaman `releases/latest/download/install.sh` con `--force` o `--latest`; se conservan también los activos antiguos durante una versión menor completa. Los llamadores conocidos son `forge614-engram:src/infrastructure/updater.ts:262`, `forge614-atlas:src/modules/updater/updater.ts:103`, `forge614-workers:src/updater.ts:108` y `forge614-shell:src/infrastructure/updater.ts:49,87`.

Orden de adopción: Sentinel, Workers, Engines, Atlas, Engram y Shell. Al adoptar la plantilla, cada nodo borra sus instaladores escritos a mano y su copia v1 de `FORGE614_ECOSYSTEM_CONTRACT.md`, y referencia el reglamento por la ficha. Sentinel 0.2 verifica igualdad byte a byte de las tres plantillas, valida la ficha y su bloque `install`, comprueba los activos de release y admite nodos fijados a plantilla antigua o nueva. Debe publicarse antes de que migre el primer nodo.

## Alternativas descartadas

- **Instaladores escritos a mano por nodo:** repiten lógica, llegan a 605 líneas, implementan seis comportamientos distintos, Atlas y Workers carecen de Windows y algunos instaladores ejecutan dependencias sin verificar huella (reconocimiento R2, §3.1–3.2).
- **Variables de nodo incrustadas en `install.mjs`:** romperían el requisito del propietario de que el instalador semántico sea idéntico byte a byte. Solo el nombre y repositorio varían en cada portero; los demás datos van en la ficha.

## Consecuencias

Esta acta habilita R2, que implementará y probará la plantilla en los tres sistemas; R3 publicará la versión. Antes de adoptar, cada nodo conserva su instalador actual. La raíz de confianza del portero sigue siendo el repositorio de releases: el manifiesto verifica integridad del transporte, no la identidad del publicador.

## Referencias

- `~/.forge614/orquestador/forge614-ai/prompts/simetria/R2-recon-reporte.md`, secciones 3.2–5 y 8.2–8.4.
- Decisiones del propietario: `4b7b9212` v3; `de875cce` D1–D11; `41be3c42` diseño aprobado.
- `standard/STANDARD.md`, actualizado por esta acta.
