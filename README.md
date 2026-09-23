# forge614-ai

Piensa en el reglamento de un taller: una sola copia en la pared, y cada estación lo consulta en vez de guardar la suya. `forge614-ai` es el núcleo del ecosistema Forge614: publica el **Estándar de Nodo** (cómo se construye, instala, libera y documenta cada nodo), los contratos del ecosistema y, en entregas futuras, el comando global `forge614`.

## Qué contiene hoy

| Carpeta | Contenido |
| --- | --- |
| `standard/` | Norma, reglas como paquetes, pack de nodo, plantillas, esquemas, matriz de soporte |
| `docs/decisions/` | Actas de decisión (0001 en adelante) |
| `docs/audits/` | Auditorías de código de los nodos |
| `docs/es`, `docs/en` | Documentación numerada bilingüe |

## Comandos

```bash
bun install --frozen-lockfile
bun run verify              # typecheck + tests + validadores del estándar sobre este repo
bun run standard:render --node engram --out /tmp/engram-files
bun run standard:pack       # dist/standard-<VERSION>.tar.gz + SHA256SUMS
```

## Documentación

| No. | Español | English |
| --- | --- | --- |
| 00 | [Resumen y guía rápida](docs/es/00-resumen-y-guia-rapida.md) | [Summary and quickstart](docs/en/00-summary-and-quickstart.md) |
| 01 | [Estándar de nodo](docs/es/01-estandar-de-nodo.md) | [Node standard](docs/en/01-node-standard.md) |
| 02 | [Reglas y packs](docs/es/02-reglas-y-packs.md) | [Rules and packs](docs/en/02-rules-and-packs.md) |
| 03 | [Plantillas y render](docs/es/03-plantillas-y-render.md) | [Templates and rendering](docs/en/03-templates-and-rendering.md) |
| 04 | [Verificación y empaquetado](docs/es/04-verificacion-y-empaquetado.md) | [Verification and packaging](docs/en/04-verification-and-packaging.md) |
| 05 | [Workflows](docs/es/05-workflows.md) | [Workflows](docs/en/05-workflows.md) |

English: [README.en.md](README.en.md)
