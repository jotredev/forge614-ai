# 02 — Reglas y packs

> Como las normas de una biblioteca: cada norma es una tarjeta con su número, su texto en dos idiomas y quién la revisa; el pack es el fichero que reúne las tarjetas que aplican a una sala.

## Anatomía de una regla

Una **regla** es un paquete: una carpeta con nombre `origen-tipo-nombre` (acta 0016) que viaja tal cual entre repositorios. Cada regla vive en `standard/rules/<nombre>/` con tres archivos:

| Archivo | Contenido |
| --- | --- |
| `manifest.json` | `schemaVersion: 1`, `name` (igual al nombre de la carpeta), `version`, `level`, `title` es/en, `appliesWhen`, `validator` (opcional), `decisions` (actas que la originan), `compensates` y, solo para paquetes `model-limitation`, `sunset` |
| `RULE.md` | Texto en español: título, analogía, la regla, alcance, por qué (con su acta) y verificación |
| `RULE.en.md` | Par en inglés del anterior |

El esquema `RuleManifestSchema` (`src/modules/standard/schemas/rule-manifest.ts`) valida el manifiesto: nombre con tipo `rule`, `compensates: "model-limitation" | "structural"` con `sunset` (condición de retiro y fecha de revisión) obligatorio solo para `model-limitation` (acta 0021), y `tokens` opcional (acta 0020). El validador `rules-catalog` recorre cada carpeta y comprueba manifiesto válido, nombre igual a la carpeta, `validator` registrado y presencia de `RULE.md` y `RULE.en.md`.

## Niveles y `appliesWhen`

El acta 0005 clasifica las reglas en tres niveles:

| Nivel | Qué es | Se instala | Se puede apagar |
| --- | --- | --- | --- |
| `core` (núcleo) | Cómo trabaja la IA con el ecosistema, sin importar la tecnología | Siempre | No |
| `stack` | Depende de la tecnología del proyecto | Solo si el proyecto la usa | Sí, por proyecto y con registro |
| `optional` | Preferencia de trabajo | Se propone desmarcada | Sí |

`appliesWhen` es la lista de condiciones, detectables sin IA, que activan una regla: `{ "fileExists": "<ruta>" }` o `{ "anyFileMatches": "<patrón>" }`. Una regla `stack` debe declarar al menos una; las de núcleo llevan la lista vacía. Hoy las dieciséis reglas del árbol son de núcleo y todas declaran `compensates: "structural"`.

## Las reglas del árbol

| Regla | Título | Validador | Acta |
| --- | --- | --- | --- |
| `forge614-rule-additive-evolution` | Evolución aditiva de datos y contratos | — | 0024 |
| `forge614-rule-agent-checklist-impact` | Impacto en el procedimiento de agentes | `agent-checklist-impact` | 0017 |
| `forge614-rule-agent-questions-before-acting` | El agente cuestiona antes de actuar | — | 0014 |
| `forge614-rule-bilingual-docs` | Documentación bilingüe es/en | `bilingual-docs` | 0016 |
| `forge614-rule-context-budget` | Huella mínima en el contexto de la IA | `context-budget` | 0020 |
| `forge614-rule-decision-records` | Registro de decisiones (actas) | `decision-records` | 0015 |
| `forge614-rule-git-readonly-for-agents` | Git de solo lectura para agentes de IA | — | 0015 |
| `forge614-rule-machine-contracts` | Convención única de contratos de máquina | `error-codes` | 0013 |
| `forge614-rule-never-touch-agents-dir-by-hand` | Nunca tocar `.agents/` a mano | — | 0005 |
| `forge614-rule-no-external-product-mentions` | Prohibido mencionar productos externos | `forbidden-mentions` | 0012 |
| `forge614-rule-no-fabricated-validations` | Nunca inventar resultados de validación | — | 0015 |
| `forge614-rule-package-naming` | Nombres de paquetes origen-tipo-nombre | `package-naming` | 0016 |
| `forge614-rule-plan-before-code` | Plan antes que código | — | 0015 |
| `forge614-rule-replaceable-pieces` | Piezas reemplazables conforme evoluciona el modelo | — | 0021 |
| `forge614-rule-thin-workflows` | Workflows delgados, documentados y validados | `workflows` | 0019 |
| `forge614-rule-three-operating-systems` | Soporte obligatorio de macOS, Linux y Windows | — | 0018 |

Las reglas sin validador se aplican por revisión humana o por el comportamiento del agente. Solo una tiene comprobación automática con fase asignada: el validador `schema-evolution` que el acta 0024 asigna a la evolución aditiva llega con Sentinel (fase 0.2); para las demás no hay fase asignada todavía. Además de los validadores de la tabla, `support-matrix`, `ecosystem-contract`, `rules-catalog` y `packs-catalog` informan bajo el identificador de la regla más cercana (`agent-checklist-impact`, `machine-contracts` y `package-naming`); el documento 04 los lista completos.

## El pack de nodo

Un **pack** agrupa reglas. `standard/packs/forge614-pack-ecosystem-node/pack.json` (esquema `PackSchema`: nombre con tipo `pack`, versión, título es/en y lista `rules` no vacía) enumera las dieciséis reglas anteriores; es el pack que todo repositorio del ecosistema recibe. El validador `packs-catalog` comprueba que el nombre coincide con la carpeta y que cada regla listada existe en `standard/rules/`; el validador `context-budget` estima el costo en tokens del índice del pack (nombre y primera línea de cada `RULE.md`) y falla por encima de 3 000 (acta 0020).

## Cómo agregar una regla

1. **Acta primero.** Toda regla nace de una decisión registrada en `docs/decisions/NNNN-slug.md` con la plantilla `TEMPLATE.md`; después, `bun run decisions:index` regenera `INDEX.json` (el validador `decision-records` exige numeración consecutiva, estado válido y las cuatro secciones fijas).
2. Crear `standard/rules/forge614-rule-<nombre>/` con `manifest.json`, `RULE.md` y `RULE.en.md`; `decisions` cita el acta del paso 1.
3. Si la regla se comprueba a máquina, escribir el validador en `src/modules/validators/` (función pura sobre el árbol de archivos, con su test al lado), registrarlo en `VALIDATORS` (`src/modules/validators/index.ts`) con el mismo id que `validator` en el manifiesto, y agregar las claves de mensaje es/en al catálogo tipado de `src/modules/standard/messages/`.
4. Añadir la regla a `pack.json` si aplica a todo el ecosistema.
5. Ejecutar `bun run verify` y, como cambió el contenido de `standard/`, `bun run standard:pack --update-pointer` para que el puntero lleve la huella nueva (documento 04).
