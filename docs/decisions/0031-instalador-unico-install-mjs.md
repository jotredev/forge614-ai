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

El portero de PowerShell usa .NET para SHA-256, compatible con Windows PowerShell 5.1; no depende de módulos ni de `Get-FileHash`. Cuando stdout o stderr están redirigidos, fija la codificación de salida de .NET a UTF-8 para conservar los acentos del mensaje. El manifiesto de la misma release protege contra descargas incompletas o alteradas en tránsito, pero no frente a una release comprometida.

### 2. Instalador común `install.mjs`

El archivo es idéntico byte a byte en los seis nodos y no incluye datos de nodo. Sus pasos son:

1. Analiza argumentos y resuelve `FORGE614_HOME`; una ruta vacía o relativa da `INVALID_FORGE614_HOME`.
2. Para `--uninstall`, usa la identidad de nodo entregada por el portero y no consulta la red. Llama a `<lanzador> uninstall --self`, avisa si falla, retira el lanzador externo y los bloques PATH del nodo, y borra solo `FORGE614_HOME/<nodo>/`.
3. Lee y valida el bloque `install` de la ficha de la release. Detecta macOS, Linux o Windows y `arm64` o `x64`; rechaza combinaciones no declaradas con código 65.
4. Resuelve la etiqueta indicada o `latest` y la versión activa. Si ya está al día y no se indicó `--force`, avisa y termina sin instalar dependencias ni descargar el activo.
5. Descarga el activo o lee `--archive`, y verifica su SHA-256 con el `SHA256SUMS` de esa release antes de instalar dependencias.
6. Para cada dependencia, comprueba compatibilidad. Si falta o no alcanza el mínimo, descarga su `install.mjs` y ficha, verifica ambas huellas con el `SHA256SUMS` de esa release y ejecuta su instalación. Si falla, no activa el nodo solicitante.
7. Prepara el nodo en `FORGE614_HOME/<nodo>/.install-*`, dentro del mismo padre. Rechaza entradas de archivo absolutas, con `..` o enlaces simbólicos.
8. Prueba el ejecutable preparado; exige código 0 y la salida exacta `forge614-<nodo> <versión>`.
9. Migra una instalación plana solo cuando no existe `.active-version`, conservando en `legacy-*` todos los lanzadores regulares `forge614-<nodo>`, `forge614-<nodo>.exe` y `forge614-<nodo>.cmd`. Esto evita que en Windows un `.exe` plano antiguo tenga precedencia sobre un `.cmd` nuevo por `PATHEXT` (`forge614-engram:scripts/install.sh:180,213,324-333`; `forge614-atlas:scripts/install.sh:55-90,374-392`).
10. Publica el lanzador y actualiza PATH según la ficha. Reemplaza el enlace Unix con un `rename` atómico y conserva los perfiles y sus permisos. En `--force` de la versión activa prepara una carpeta de versión única.
11. Escribe `.active-version` al final y prueba de nuevo el lanzador publicado. Si PATH, el puntero o esta segunda prueba fallan, restaura perfiles, lanzador, puntero y migración.

La única puerta de red para pruebas es `FORGE614_INSTALL_TEST_BASE_URL`, exclusiva de pruebas. Acepta únicamente `http://127.0.0.1:<puerto>` o `http://[::1]:<puerto>`; cualquier otra dirección requiere HTTPS.

No confirma `.active-version` hasta que el contenido y la prueba de humo estén listos. Una falla previa deja activa la versión anterior; una posterior revierte el puntero y elimina la carpeta nueva.

El criterio `compatible` vive en la ficha: si falta el nodo, se instala; `minimumVersion` se compara como SemVer; cada capacidad requerida es `{ "agent": "claude-code", "field": "supportsReadOnly" }`. El instalador ejecuta `<lanzador> capabilities --agent <agent>` y exige `schemaVersion === 1` y que el campo solicitado sea `true`. Si la comprobación falla, el error 69 identifica la dependencia y la razón en español o inglés. Engines registra esa orden en `forge614-engines:src/interfaces/cli/main.ts:169` y `src/interfaces/cli/commands.ts:63-66`; su JSON y campos están definidos en `forge614-engines:src/app/capabilities.ts:4-41`. Donde el reconocimiento solo comprobó existencia, el ejemplo usa `installed`, sin inventar un mínimo. Windows admite inicialmente `x64`; Atlas y Workers agregan Windows con la plantilla, sin `arm64`.

### 3. Bloque `install` de `forge614.node.json`

El objeto raíz `install` es opcional mientras las fichas actuales sigan usando la plantilla anterior. Se vuelve obligatorio para cada nodo al adoptar la nueva. Campos:

| Campo | Tipo | Significado |
|---|---|---|
| `repository` | string `owner/repo` | Repositorio de GitHub. |
| `minimumNodeVersion` | string SemVer | Mínimo del instalador: `22.19.0`. |
| `systems` | array de objetos | `os` (`darwin`, `linux`, `windows`) y `architectures` (`arm64`, `x64`) admitidas. |
| `tagFormat` | string | Formato de etiqueta: `vX.Y.Z`. |
| `asset` | objeto | `type`, `pattern` y `checksumFile` (`SHA256SUMS`). Tipos: `binary-tar-gzip`, `raw-binary`, `node-package-tar-gzip`, `binary-tar-gzip-or-zip`. |
| `dependencies` | array | `node`, `minimumVersion` (SemVer o `null`), `requiredCapabilities` (array de `{agent, field}` del JSON de `capabilities --agent` de Engines), `compatibility` (`installed`, `version`, `capabilities`, `version-and-capabilities`). |
| `path` | objeto | `modify` booleano; `retireWhen` string o `null`. Si modifica PATH, se retira cuando `forge614 init` lo gestione. |
| `smokeTest` | array de strings | Argumentos de dos pruebas, al ejecutable preparado y al lanzador publicado; inicialmente `--version`, con salida exacta `forge614-<nodo> <versión>`. |

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
{"install":{"repository":"jotredev/forge614-shell","minimumNodeVersion":"22.19.0","systems":[{"os":"darwin","architectures":["arm64","x64"]},{"os":"linux","architectures":["arm64","x64"]},{"os":"windows","architectures":["x64"]}],"tagFormat":"vX.Y.Z","asset":{"type":"node-package-tar-gzip","pattern":"forge614-shell-<ver>.tar.gz","checksumFile":"SHA256SUMS"},"dependencies":[{"node":"engines","minimumVersion":null,"requiredCapabilities":[{"agent":"claude-code","field":"fullySupported"}],"compatibility":"capabilities"}],"path":{"modify":true,"retireWhen":"cuando forge614 init gestione el PATH"},"smokeTest":["--version"]}}
```
Datos: `forge614-shell:scripts/install.sh:106-124` comprueba el lanzador de Engines, el JSON `detect` con `schemaVersion: 1` y agentes, y `capabilities --agent claude-code` con `fullySupported: true`; `forge614-shell:scripts/install.sh:202-221` gestiona su línea PATH antigua. Windows x64 y `.cmd`: `forge614-shell:scripts/install.ps1:528`.

**Atlas**

```json
{"install":{"repository":"jotredev/forge614-atlas","minimumNodeVersion":"22.19.0","systems":[{"os":"darwin","architectures":["arm64","x64"]},{"os":"linux","architectures":["arm64","x64"]},{"os":"windows","architectures":["x64"]}],"tagFormat":"vX.Y.Z","asset":{"type":"raw-binary","pattern":"forge614-atlas-<plat>-<arch>","checksumFile":"SHA256SUMS"},"dependencies":[{"node":"engram","minimumVersion":"1.8.7","requiredCapabilities":[],"compatibility":"version"},{"node":"workers","minimumVersion":"1.0.0","requiredCapabilities":[],"compatibility":"version"},{"node":"engines","minimumVersion":"1.17.0","requiredCapabilities":[{"agent":"claude-code","field":"supportsReadOnly"}],"compatibility":"version-and-capabilities"}],"path":{"modify":true,"retireWhen":"cuando forge614 init gestione el PATH"},"smokeTest":["--version"]}}
```
Datos: `forge614-atlas:scripts/install.sh:30-33,229-247,478-492`; Windows actual pendiente: `forge614-atlas:docs/en/10-installer-and-release.md:16`.

**Workers**

```json
{"install":{"repository":"jotredev/forge614-workers","minimumNodeVersion":"22.19.0","systems":[{"os":"darwin","architectures":["arm64","x64"]},{"os":"linux","architectures":["arm64","x64"]},{"os":"windows","architectures":["x64"]}],"tagFormat":"vX.Y.Z","asset":{"type":"raw-binary","pattern":"forge614-workers-<plat>-<arch>","checksumFile":"SHA256SUMS"},"dependencies":[{"node":"engines","minimumVersion":"1.17.0","requiredCapabilities":[{"agent":"claude-code","field":"supportsReadOnly"}],"compatibility":"version-and-capabilities"}],"path":{"modify":false,"retireWhen":null},"smokeTest":["--version"]}}
```
Datos: `forge614-workers:scripts/install.sh:46-68,252-272,293-304`; Windows pendiente: `forge614-workers:CONTRACT.en.md:76`.

**Sentinel**

```json
{"install":{"repository":"jotredev/forge614-sentinel","minimumNodeVersion":"22.19.0","systems":[{"os":"darwin","architectures":["arm64","x64"]},{"os":"linux","architectures":["arm64","x64"]},{"os":"windows","architectures":["x64"]}],"tagFormat":"vX.Y.Z","asset":{"type":"binary-tar-gzip-or-zip","pattern":"forge614-sentinel-<plat>-<arch>.tar.gz|.zip","checksumFile":"SHA256SUMS"},"dependencies":[],"path":{"modify":false,"retireWhen":null},"smokeTest":["--version"]}}
```
Datos: `forge614-sentinel:install.sh:84-99`; Windows x64: `forge614-sentinel:install.ps1:43`.

### 4. Releases, comandos y errores

Cada release publica el activo declarado por `install.asset.pattern`, `SHA256SUMS`, `install.sh`, `install.ps1`, `install.mjs` y `forge614.node.json`. `SHA256SUMS` usa un único formato GNU: `<64 caracteres hexadecimales minúsculos><dos espacios><nombre exacto>\n`, una entrada por archivo. No se mezclan activos `.sha256` sueltos ni formatos alternativos, salvo la excepción temporal de Engines descrita en la sección 6. Todas las etiquetas son `vX.Y.Z`, también Shell.

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
| `<nodo> update` | Por defecto, una frase para personas por stdout (por ejemplo, `forge614-engram se actualizó de 1.9.0 a 1.9.1.` o `forge614-engram ya está al día (1.9.1).`); el JSON definido sale solo con `--json` | 0 | Objeto de error por stderr; código 1. |
| `<nodo> uninstall` | Por defecto, una frase para personas por stdout tras confirmar; el JSON `{"schemaVersion":1,"result":{"removed":true}}\n` sale solo con `--json` | 0 | Objeto de error por stderr; código 1. Cancelar: 130. |
| `<nodo> uninstall --self` | Por defecto, una frase para personas por stdout; el JSON `{"schemaVersion":1,"result":{"integrationsRemoved":true}}\n` sale solo con `--json` | 0 | Objeto de error por stderr; código 1. |

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

Los mensajes del instalador tienen catálogos en español e inglés. `FORGE614_LOCALE` acepta `es` y `en`; si está vacío se usa `FORGE614_SHELL_LOCALE`, que sirve de respaldo durante la transición. Engines, Workers y Sentinel no modifican PATH (`forge614-engines:scripts/install.sh:115`; `forge614-workers:scripts/install.sh:304`; `forge614-sentinel:install.sh:94-99`). Engram, Shell y Atlas modifican solo perfiles que ya existen; si no hay ninguno, crean un perfil según `$SHELL`: `.zshrc` para zsh, `.bashrc` para bash y `.profile` para los demás. Nunca crean `.bash_profile`. Si el perfil es enlace simbólico, escriben en su destino y conservan sus permisos. Si faltan `HOME` y `USERPROFILE`, avisan y omiten PATH. Al editar perfiles retiran también los marcadores antiguos de Engram y Atlas (`forge614-engram:scripts/install.sh:14-114`; `forge614-atlas:scripts/install.sh:39-186`) y la línea `# Forge614 Shell` junto con su asignación PATH (`forge614-shell:scripts/install.sh:202-221`). El bloque vigente se retira cuando `forge614 init` gestione PATH, según la ficha.

### 6. Compatibilidad y adopción

El portero conserva `--latest`, `--force`, `--version`, `--archive`, `--uninstall` y `--help`, además de `--bin-dir` para Engram y Atlas. Los `update` ya instalados de Engram, Atlas, Workers y Shell descargan `releases/latest/download/install.sh`; el portero conserva ese nombre y sus argumentos, así que no hace falta conservar activos antiguos. Los llamadores conocidos son `forge614-engram:src/infrastructure/updater.ts:262`, `forge614-atlas:src/modules/updater/updater.ts:103`, `forge614-workers:src/updater.ts:108` y `forge614-shell:src/infrastructure/updater.ts:49,87`.

La única excepción es el `update` de Engines ya instalado: descarga el activo y su archivo `<activo>.sha256` (`forge614-engines:src/app/self-update.ts:239-255`). La primera release de Engines con esta plantilla publica también ese `.sha256`; la siguiente lo quita. El `update` de Engram en Windows descarga directamente `forge614-engram-windows-x64.exe` y `SHA256SUMS` (`forge614-engram:src/infrastructure/updater.ts:14-16,164-189`); esos nombres no cambian en el diseño y no requieren conservación adicional. Cada nodo que adopta la plantilla borra sus instaladores escritos a mano.

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
