# {{NODE_TITLE}} (`forge614-{{NODE_NAME}}`)

The installer templates change in Standard 1.2.0 according to record [0031](../../docs/decisions/0031-instalador-unico-install-mjs.md).
In Standard 1.3.0 they incorporate cleanup of old versions, user data protection (`userData`), safe rename before deletion on uninstall, and output details on smoke test failures.

> One-sentence analogy: <fill in>.

## What it is
One sentence.

## What it is not
- …

## Installation

macOS / Linux:
```bash
curl -fsSL https://github.com/{{REPO}}/releases/latest/download/install.sh | bash
```

Windows (PowerShell):
```powershell
irm https://github.com/{{REPO}}/releases/latest/download/install.ps1 | iex
```

## Documentation
| # | Español | English |
| --- | --- | --- |
| 00 | [Contrato](CONTRACT.md) | [Contract](CONTRACT.en.md) |
| NN | [Workflows de integración y release](docs/es/NN-workflows.md) | [Integration and release workflows](docs/en/NN-workflows.md) |

## Contract
See [`CONTRACT.md`](CONTRACT.md) (standard {{STANDARD_VERSION}}).
