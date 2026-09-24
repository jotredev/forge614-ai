# Guía del orquestador

> Como la bitácora de un jefe de obra: cada instrucción que funcionó queda escrita con la prueba de que funcionó, y cada una que falló queda tachada con el motivo.

**Qué es:** las reglas vigentes para que una sesión de `forge614-ai` coordine trabajo en otros repositorios del ecosistema mediante prompts (y, a futuro, para el orquestador automático).
**Cuándo se lee:** solo cuando una sesión va a orquestar. No se carga al arrancar ninguna sesión (acta 0020).
**Evidencia:** Notion, página "Forge614 · Laboratorio de agentes": bases "Corridas de agentes" (una fila por tarea medida) y "Lecciones de orquestación" (cada regla con sus números).
**Estados de una regla:** **provisional** (observada en 1–2 corridas), **firme** (confirmada en ≥ 3 corridas distintas), **retirada** (una corrida la contradijo; queda tachada con el motivo). Varias observaciones dentro de una misma corrida cuentan como una muestra. Ninguna regla entra sin evidencia.

## 1. Método

1. El plan vive en `forge614-ai` (`docs/superpowers/plans/`) y cada tarea trae modelo y razonamiento recomendados.
2. **Una tarea = una sesión nueva** en el repositorio que toca. El propietario pega el prompt, la sesión trabaja y reporta, el propietario pega el reporte aquí.
3. El orquestador revisa el reporte **y verifica por su cuenta en solo lectura** (`git -C <repo> show`, `gh pr view`, `gh release view`) antes de aprobar.
4. Al cerrar cada tarea, el orquestador mide la corrida desde el registro de la herramienta (§5) y agrega la fila en Notion; si aprendió algo, agrega o actualiza una lección.
5. Los prompts se entregan en la página "Prompts Forge614": tarjeta "Ahora" con el paso numerado y botón Copiar; en el chat solo se dice qué hacer ahora. Un solo paso a la vez.

## 2. Forma del prompt

```
[<Proyecto> · T<n>] <qué hace, en una línea>

Contexto: <1–3 líneas: por qué existe esta tarea>.
Plan: git -C ~/Desktop/forge614-ai show <rama>:<ruta del plan> — Tarea <n>, pasos <a>–<b>.
Haz SOLO eso. No hagas <lo siguiente>: <sin push / sin PR / sin tags, según el caso>.

Antes de empezar (solo lectura): <estado esperado: rama, commit, árbol limpio>. Si no cuadra, detente.

Reglas:
- Sigue el plan al pie de la letra con TDD; no agregues nada que no pida.
- Si una prueba falla con el código literal del plan, no cambies la prueba: reporta qué falla, por qué y el ajuste mínimo.
- <reglas específicas de la tarea>
- Commits sin líneas de atribución ni menciones a ninguna IA; verifica el mensaje.

Repórtame con el prefijo "<Proyecto>:" en el formato fijo de la guía (§3).
```

Reglas del prompt:

| Regla | Estado | Evidencia |
|---|---|---|
| Ordenar detenerse ante un fallo y no parchar por su cuenta | provisional | Sentinel 0.1.1: 3 fallos, 0 parches incorrectos (1 corrida) |
| Tras un fallo que el plan no previó, pedir la suite completa **antes** de enmendar | provisional | Sentinel 0.1.1: la ronda con suite previa cerró en verde 426/426 |
| Si el prompt autoriza un paso que el plan asigna al propietario, decirlo explícitamente ("te AUTORIZA el paso X aunque el plan diga…") | provisional | Sentinel 0.1.1: el agente obedeció al plan y se detuvo; 1 ronda extra |
| El prompt empieza con la etiqueta `[<Proyecto> · T<n>]` (así se liga la sesión a su registro) | provisional | método nuevo, 0 corridas |

## 3. Forma del reporte

Formato fijo pedido a toda sesión:

```
<Proyecto>: <resultado en una línea: aprobable / detenido por X>
Hecho: <máx. 5 líneas>
Archivos: <lista>
Pruebas: <rojo → verde, conteo total>
Verificación: <comando → resultado resumido>
Commit: <hash> <mensaje exacto>
Desviaciones: <lista o "ninguna">
Bloqueos: <lista o "ninguno">
```

| Regla | Estado | Evidencia |
|---|---|---|
| Cuando la sesión busca algo (grep), el reporte trae cada aparición con `archivo:línea` y su clasificación, no solo la conclusión | provisional | Sentinel 0.1.1: `parity.test.ts:9` visto y mal clasificado; 1 ronda extra |
| No pedir diffs ni JSON completos en el reporte: el orquestador los verifica en solo lectura | provisional (hipótesis a medir) | el reporte entra dos veces al contexto (sesión y orquestador); medir el largo antes y después |

## 4. Qué incluir en el plan

| Regla | Estado | Evidencia |
|---|---|---|
| Al subir una versión, listar todo lo que depende del número (buscar la versión actual en pruebas, fixtures y goldens y clasificar cada aparición); arreglo de raíz: leer la versión real, regenerar goldens con la herramienta oficial | provisional | Sentinel 0.1.1: 3 pruebas no previstas, 2 rondas evitables |
| Antes de escribir un documento en `forge614-ai`, revisar `standard/forbidden-mentions.json`: no nombrar productos prohibidos (acta 0012) | provisional | spec de memoria inteligente: 2 menciones que habrían hecho fallar `verify` |
| Indicar archivos y líneas exactos a tocar, para que la sesión no explore el repositorio | provisional (hipótesis a medir) | la entrada re-leída es el 99 % del costo (§5) |

## 4b. Documentación

| Regla | Estado | Evidencia |
|---|---|---|
| **Documentación tarea por tarea:** al terminar cada tarea, un prompt aparte (etiqueta `· docs`, misma sesión, medido por separado) actualiza en un commit propio los documentos que describen lo que cambió (es/en), el CHANGELOG y el mapa de Notion; el orquestador verifica en cada revisión que código, pruebas y documentación coincidan, porque la documentación es la fuente de verdad después del código | firme (regla del propietario) | decisión del propietario, 2026-09-24; primer caso: Engram 1.7.0 T1 encontró que el capítulo 05 ya decía una versión equivocada de la réplica |

| **Checklist de agentes tarea por tarea (acta 0017):** al cerrar cada tarea (código + documentación), el orquestador revisa `standard/procedures/new-agent-checklist.md` (sección del nodo que cambió y las de Engines y Shell si consumen lo cambiado) y decide si hay un requisito nuevo para los asistentes; si lo hay, redacta el punto con su verificación; si no, anota el motivo. Los cambios se acumulan y se publican juntos en la siguiente versión del reglamento, para revalidar la matriz de soporte una sola vez | firme (regla del propietario) | decisión del propietario, 2026-09-24 |

## 5. Medición

- **Fuente única: el registro de la herramienta**, nunca el reporte de la IA.
  - Claude Code: `~/.claude/projects/<carpeta>/<sesión>.jsonl` — por mensaje: `message.model`, `usage` (`input_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, `output_tokens`, `output_tokens_details.thinking_tokens`), `effort`, `tool_use` con nombre (incluye `mcp__*` y `Skill`).
  - Codex: `~/.codex/sessions/AAAA/MM/DD/rollout-*.jsonl` — `session_meta` (cwd, versión), `turn_context` (`model`, `reasoning_effort`), `event_msg`/`token_count` acumulado (entrada, caché, salida, razonamiento, total) y `rate_limits.primary.used_percent` (límite semanal).
- **Exacto:** tokens, modelo, razonamiento, horas, mensajes, herramientas y tamaño de sus resultados. **Estimado (marcado):** tokens atribuidos a una herramienta concreta. **Sin registro:** "no medido".
- **Comportamiento medido en cada corrida:** archivos que tocó fuera del plan y acciones no pedidas (comparando el commit con la lista del plan, en solo lectura, y las ediciones del registro), paradas correctas ante fallos, si respetó el formato del reporte y su largo en caracteres. Con esto se decide, por modelo y razonamiento, qué hay que pedir o prohibir explícitamente (por ejemplo "no documentes todavía").
- **Métrica principal:** tokens por tarea aprobada, sumando las rondas de corrección. Una conclusión del tipo "X es mejor para Y" exige ≥ 3 tareas comparables del mismo tipo; se cambia una sola variable a la vez.

| Regla | Estado | Evidencia |
|---|---|---|
| Para ahorrar, bajar rondas de corrección, dar archivos exactos y pedir reportes cortos; acortar el prompt casi no mueve el costo | provisional | salida = 0,6–0,7 % del total (Codex 01a0d44c; Sentinel 0.1.1) |

## 6. Elección de modelo y razonamiento

Punto de partida (se ajusta solo con datos de "Corridas de agentes"):

| Tipo de tarea | Recomendado | Estado |
|---|---|---|
| Migración de datos o cambios con riesgo sobre datos reales | Opus · high | provisional (0 corridas) |
| Código + pruebas con plan preciso | Sonnet · medium o Codex · medium | provisional (0 corridas); se contrasta contra high |
| Algoritmos con muchos casos borde | Sonnet · high | provisional (0 corridas) |
| Documentación, versión, publicación | Sonnet · low | provisional (0 corridas) |
| Revisión independiente de una rama | otro proveedor · high | provisional (0 corridas) |
| Ejecución de un plan ya escrito (referencia) | Sonnet · high: Sentinel 0.1.1, 8,86 M tokens, 3 rondas (todas error del plan) | 1 corrida |

## 7. Registro de cambios de esta guía

- 2026-09-24 — Regla firme del propietario: documentación tarea por tarea (§4b).
- 2026-09-24 — Creada con 6 reglas provisionales de las primeras corridas medidas (Sentinel 0.1.1) y 2 hipótesis a medir.
