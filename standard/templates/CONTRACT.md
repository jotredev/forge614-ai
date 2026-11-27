# Contrato de {{NODE_TITLE}} (`forge614-{{NODE_NAME}}`)

> Analogía en una frase: <completar>.

## Propósito
Una frase.

## Qué hace
- …

## Qué no hace
- …

## Dependencias
| Nodo o binario | Cómo se consume | Versión mínima |
| --- | --- | --- |

## Comandos públicos
| Comando | Entrada (esquema) | Salida (esquema) | `schemaVersion` | Códigos de salida |
| --- | --- | --- | --- | --- |
| `update` | `--version X.Y.Z` y `--json` opcionales | Texto por defecto. Con `--json`, [resultado común](https://github.com/jotredev/forge614-ai/blob/standard-v{{STANDARD_VERSION}}/standard/schemas/update-result.schema.json). | `2` para el resultado JSON | `0`, `1`, `2` |

## Códigos de error
| Código | Significado |
| --- | --- |

## Requisitos obligatorios para asistentes de IA soportados
Sección `{{NODE_NAME}}` de `standard/procedures/new-agent-checklist.md` (estándar {{STANDARD_VERSION}}).

## Compatibilidad
Cambios incompatibles suben `schemaVersion`; se mantiene una versión de compatibilidad.
