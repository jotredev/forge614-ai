# Auditorías del ecosistema Forge614 — 2026-09-22

Lectura estática del código de los cinco nodos existentes (rama `main`, vía API de GitHub), sin ejecutar tests ni binarios. Cada reporte separa lo verificado en código de lo supuesto. Los cinco hallazgos P1 de seguridad fueron re-verificados contra el código por el autor de la spec el mismo día.

Estos anexos son la entrada de la Entrega 0 (Estándar de Nodo) y de los planes de alineación por repo. Ningún hallazgo entra a un plan de corrección sin re-verificarse contra el código en el momento de escribir ese plan.

## Índice

| Nodo | Versión auditada | Reporte |
|---|---|---|
| Engines | 1.11.0 | [2026-09-22-auditoria-engines.md](2026-09-22-auditoria-engines.md) |
| Engram | 1.5.0 | [2026-09-22-auditoria-engram.md](2026-09-22-auditoria-engram.md) |
| Shell | 1.8.0 (+ adenda del delta 1.9.0, publicada el mismo día) | [2026-09-22-auditoria-shell.md](2026-09-22-auditoria-shell.md) |
| Atlas | 0.1.0 (+ adenda del delta v1.0.0, publicada el mismo día) | [2026-09-22-auditoria-atlas.md](2026-09-22-auditoria-atlas.md) |
| Workers | 0.1.0 (sin releases) | [2026-09-22-auditoria-workers.md](2026-09-22-auditoria-workers.md) |

## Problemas comunes a todos los nodos

| Problema | Evidencia |
|---|---|
| **El "contrato idéntico" tiene cinco versiones distintas** | `FORGE614_ECOSYSTEM_CONTRACT.md`: 10 327 bytes en Engram, 10 158 en Engines, 10 136 en Atlas, 9 825 en Workers, 9 464 en Shell. Cada copia tiene párrafos que las otras no tienen. |
| **Nadie valida con esquema lo que recibe de otro nodo** | Ninguno usa Zod en sus fronteras (Engram solo en MCP). Atlas lee la salida de Engines y Workers con `JSON.parse(...) as`; un campo faltante pasa en silencio. |
| **Cada nodo maneja errores y versiones a su modo** | Engram: `{code,error}` por stderr. Engines: `{schemaVersion, error:{code,message}}` por stdout. Atlas: `{status:"error"}` por stdout. Workers: sin `schemaVersion` en nada y `--version` que se cuelga. |
| **Cinco recetas de instalación y release** | Engines: `bun release` + CI con Windows. Engram: instalador de 11 KB a mano, sin Windows, sin `bun release`. Shell: instalador propio que edita dotfiles, subida manual de assets, sin CI. Atlas (v1.0.0, mismo día): instalador propio que edita perfiles de shell sin respaldo, sin Windows, `release.yml` con lógica inline. Workers: nada (cero tags, cero CI). **Sin `verify.yml` en PR: Shell y Atlas.** |
| **Documentación que contradice el código** | Atlas decía "Planes 1–3" con los Planes 1–4 fusionados (corregido en v1.0.0: "Planes 1–5"); Engram documenta "v1.2.1" en un repo v1.5.0; el `AGENTS.md:27` de Shell contradice su código y su `notion-map` sigue en 1.3.0 (el doc 09 de i18n sí está al día); Engines promete `apply --revert` y no existe. |
| **Ningún `CONTRACT.md` por nodo** | Los contratos viven repartidos entre specs, docs y código. |
| **Menciones a productos externos** | La spec de diseño de Engines y un asset versionado en Shell referencian un producto externo (regla del acta 0012). |
| **Patrón a generalizar (positivo)** | Shell 1.9.0 resuelve los errores con códigos estables (`ShellError`) y un catálogo tipado por idioma cuya paridad es/en la garantiza el compilador. Es el patrón que el estándar adopta para los textos dentro del código (spec §4.8). |

> Las adendas de Atlas (v1.0.0) y Shell (1.9.0), publicadas el mismo día de la auditoría, están al final de cada reporte con el estado actualizado de cada hallazgo.

## Hallazgos P1 de seguridad (re-verificados)

| Nodo | Hallazgo | Ubicación |
|---|---|---|
| Engines | `plan` imprime el archivo de configuración completo de la IA (`writes[].afterContent`) con tokens de otros MCP | `src/interfaces/cli/commands.ts` (`printJson({ plan })`) |
| Engram | `uninstall` invoca `forge614-atlas uninstall --from forge614-engram --confirmed`, comando que Atlas no tiene → con Atlas instalado, desinstalar siempre falla | `src/app/uninstall.ts:35-39` |
| Atlas | Guarda en Engram la salida cruda del modelo sin sanear y persiste `tokensConsumed: 0` como dato real | `src/modules/cli/dispatch-modules.ts:68,115` |
| Workers | Hereda `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`*_BASE_URL` sin filtrar; `--version` se cuelga esperando stdin | `src/process-runner.ts:68`, `src/main.ts:7` |
| Shell | No existe CI; el motor "retirado" Pi sigue siendo dependencia viva del runtime | sin `.github/workflows`; `package.json` (`pi-coding-agent`, `pi-tui`) |
