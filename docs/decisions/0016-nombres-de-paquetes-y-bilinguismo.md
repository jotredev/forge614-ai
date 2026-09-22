# 0016 — Nombres de paquetes `origen-tipo-nombre` y bilingüismo es/en

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

Con el Hub, un proyecto puede tener skills propias y skills de varios orígenes con el mismo nombre. En cualquier lugar (un log, el libro de corridas, la carpeta de una IA) hay que saber de quién es un paquete y qué es. Además, toda la documentación del ecosistema es bilingüe y el resto del producto debía seguir la misma convención.

## Decisión

**Regla (contrato, no política):** todo paquete del Hub se llama `origen-tipo-nombre`.

| Tipo | Ejemplo | Carpeta en el proyecto |
|---|---|---|
| Política | `forge614-policy-frugal` | `.agents/policies/` |
| Skill | `forge614-skill-create-pdfs` | `.agents/skills/` |
| MCP | `forge614-mcp-engram` | `.agents/mcps/` |
| Regla | `forge614-rule-git-readonly` | `.agents/rules/` |
| Plugin | `forge614-plugin-notion-sync` | `.agents/plugins/` |
| De comunidad | `anthropics-skill-pdf` | igual, con su origen |

En el catálogo el identificador es el mismo con barras: `forge614/skill/create-pdfs`. El Hub valida la regla al admitir un paquete; si no cumple, no entra. Es regla y no política porque cambiarla rompe la compatibilidad de todo el ecosistema; ella misma viaja como paquete (`forge614-rule-package-naming`).

**Bilingüe:** toda superficie orientada a personas (documentación, mensajes de Shell, descripciones de paquetes y políticas, explicaciones del Sentinel, resúmenes) existe en español e inglés, como la documentación actual. El código, los identificadores y las claves de datos van en inglés. El Sentinel explica en el idioma configurado por la persona.

## Alternativas descartadas

- **Solo `origen-nombre` con el tipo dado por la carpeta:** ambiguo fuera de la carpeta (logs, libro de corridas, enlaces en la IA).
- **Excepción para skills (nombres más cortos al invocarlas):** rompe la regla única; el costo de un nombre largo es menor que el de dos convenciones.

## Consecuencias

- El verificador comprueba nombres de paquetes y paridad es/en de la documentación.
- Las skills del usuario (`deploy/`) nunca se renombran ni se pisan; conviven con las del Hub por su apellido.

## Referencias

- Memoria Engram: `forge614-ai/decisions/naming-i18n-ledger`
- Actas relacionadas: `0005`, `0006`, `0008`
