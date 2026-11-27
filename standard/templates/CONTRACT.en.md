# Contract of {{NODE_TITLE}} (`forge614-{{NODE_NAME}}`)

> One-sentence analogy: <fill in>.

## Purpose
One sentence.

## What it does
- …

## What it does not do
- …

## Dependencies
| Node or binary | How it is consumed | Minimum version |
| --- | --- | --- |

## Public commands
| Command | Input (schema) | Output (schema) | `schemaVersion` | Exit codes |
| --- | --- | --- | --- | --- |
| `update` | Optional `--version X.Y.Z` and `--json` | Text by default. With `--json`, [common result](https://github.com/jotredev/forge614-ai/blob/standard-v{{STANDARD_VERSION}}/standard/schemas/update-result.schema.json). | `2` for the JSON result | `0`, `1`, `2` |

## Error codes
| Code | Meaning |
| --- | --- |

## Mandatory requirements for supported AI assistants
`{{NODE_NAME}}` section of `standard/procedures/new-agent-checklist.md` (standard {{STANDARD_VERSION}}).

## Compatibility
Breaking changes bump `schemaVersion`; one compatibility version is kept.
