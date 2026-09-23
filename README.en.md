# forge614-ai

Think of a workshop's rulebook: a single copy on the wall, and every station consults it instead of keeping its own. `forge614-ai` is the core of the Forge614 ecosystem: it publishes the **Node Standard** (how each node is built, installed, released and documented), the ecosystem contracts and, in future deliveries, the global `forge614` command.

## What it contains today

| Folder | Contents |
| --- | --- |
| `standard/` | Standard, rules as packages, node pack, templates, schemas, support matrix |
| `docs/decisions/` | Decision records (0001 onward) |
| `docs/audits/` | Code audits of the nodes |
| `docs/es`, `docs/en` | Bilingual numbered documentation |

## Commands

```bash
bun install --frozen-lockfile
bun run verify              # typecheck + tests + standard validators over this repo
bun run standard:render --node engram --out /tmp/engram-files
bun run standard:pack       # dist/standard-<VERSION>.tar.gz + SHA256SUMS
```

## Documentation

| No. | Español | English |
| --- | --- | --- |
| 00 | [Resumen y guía rápida](docs/es/00-resumen-y-guia-rapida.md) | [Summary and quickstart](docs/en/00-summary-and-quickstart.md) |
| 01 | [Estándar de nodo](docs/es/01-estandar-de-nodo.md) | [Node standard](docs/en/01-node-standard.md) |
| 02 | [Reglas y packs](docs/es/02-reglas-y-packs.md) | [Rules and packs](docs/en/02-rules-and-packs.md) |
| 03 | [Plantillas y render](docs/es/03-plantillas-y-render.md) | [Templates and rendering](docs/en/03-templates-and-rendering.md) |
| 04 | [Verificación y empaquetado](docs/es/04-verificacion-y-empaquetado.md) | [Verification and packaging](docs/en/04-verification-and-packaging.md) |
| 05 | [Workflows](docs/es/05-workflows.md) | [Workflows](docs/en/05-workflows.md) |

Español: [README.md](README.md)
