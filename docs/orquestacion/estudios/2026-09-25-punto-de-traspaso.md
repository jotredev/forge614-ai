# Cuándo conviene hacer traspaso (fresh session) — datos medidos

Investigación de solo lectura sobre `~/.claude/projects/*.jsonl` (1,116 archivos, 2.5 GB) y `~/.codex/sessions/**/rollout-*.jsonl` (206 archivos, 1.6 GB). Se excluyeron 6 archivos modificados en los últimos 10 minutos (la sesión que corre esta investigación y su subagente). Scripts en `2026-09-25-punto-de-traspaso-scripts/` (junto a este informe); los datos intermedios no se guardan (se regeneran con ellos).

## Conclusión en 5 líneas

1. **Orquestador (Opus, forge614-ai, 12 sesiones ≥30 mensajes):** el óptimo matemático del modelo (Q4) da **T ≈ 397K tokens de contexto** (mínimo de $0.134/mensaje productivo), pero la curva es muy plana entre 300K–500K (±5%), así que la regla actual de ~300K ya es casi óptima — **subirla a 350–400K** ahorra un poco más sin riesgo.
2. **El traspaso mismo cuesta**: arrancar desde un prompt de traspaso consume en promedio **H≈$2.77 y ya deja el contexto en C0≈169K tokens** (n=4 orquestador) antes de que el orquestador lance su primer Agent/bloque de código — un umbral de 150K nunca se alcanza en la práctica porque el arranque ya lo supera.
3. **Reconstrucciones de caché por inactividad** cuestan **$428 de $5,455** del gasto total medido (7.8%), pero en las sesiones orquestador específicamente son marginales (~5-6% del costo, solo 4-5 de 12 sesiones tuvieron alguna) porque el 74% de los mensajes ya usa TTL de 1h.
4. **Los workers (Sonnet y otros) sí llegan a ser tan largos como el orquestador** — mediana de contexto máximo 516K–560K tokens, algunos con 1,000+ mensajes — así que **el mismo criterio de traspaso (~300-400K) aplica a workers largos**, no solo al orquestador; los workers cortos (mediana global de solo 3 mensajes) no necesitan regla.
5. **Codex**: 53/206 sesiones (26%) superan el 80% de la ventana de contexto reportada (258,400 tokens) y algunas la superan hasta 1.9×; se recomienda compactar/traspasar Codex en **~200K tokens de contexto por turno** (78% de la ventana), antes de tocar el nuevo escalón de precio de 272K.

---

## Q1 — Sesiones ≥30 mensajes: tamaño, costo y ajuste costo≈a+b·contexto

- 281 sesiones con ≥30 mensajes de asistente (de 1,104 sesiones totales con datos válidos).
- Clasificación: **orquestador** = sesión principal (no subagente) en el proyecto `forge614-ai`, dominada por Opus → **12 sesiones**. **Worker** = todo lo demás no-subagente → **132 sesiones**. **Subagente** (carpeta `subagents/`) → **137 sesiones**.

| Grupo | n | mensajes (mediana) | contexto máx (mediana) | costo total (mediana) |
|---|---|---|---|---|
| Orquestador (Opus, forge614-ai) | 12 | 126 | 394,636 | $13.5 |
| Worker (no-subagente, resto) | 132 | 190 | 516,294 | $25.7 |
| Subagente | 137 | 42 | 138,768 | $1.4 |

Top-3 orquestador por costo: `eb6d8516…` (443 msgs, contexto máx 961,603, $59.73), `3348f813…` (92 msgs, 517,759, $26.87), `d1fd0463…` (221 msgs, 428,149, $21.47).

**Ajuste lineal costo_mensaje ≈ a + b·contexto** (mínimos cuadrados, por mensaje, familia de modelo):

| Modelo | a (USD/mensaje base) | b (USD/token) | R² | n mensajes |
|---|---|---|---|---|
| Opus | 0.0391 | 2.381e-7 | 0.043 | 21,142 |
| Sonnet | 0.0144 | 2.183e-7 | 0.211 | 17,029 |
| Fable | 0.1883 | 2.677e-7 | 0.012 | 3,302 |
| Haiku | 0.0041 | 4.85e-8 | 0.035 | 518 |

R² bajo (sobre todo Opus/Fable) porque el costo por mensaje también depende de cuánto del contexto es lectura de caché barata (0.2/M) vs. escritura cara (5-8/M) — el modelo lineal simple captura la tendencia (b>0, más contexto = más costo) pero no toda la varianza. La pendiente b es similar entre Opus y Sonnet (~2.2-2.4e-7 $/token); lo que más separa a Opus es el intercepto a (2.7× el de Sonnet), reflejo del costo base más alto de escritura/salida de Opus.

Desglose de costo total (todas las sesiones ≥30 msgs, $ y % del total de ese grupo) está en `data/q1_sessions_ge30.csv` (columnas cost_input/cost_cache_read/cost_cache_write/cost_output).

---

## Q2 — Reconstrucciones de caché

Regla usada: mensaje con `cache_creation > 50%` de su contexto total, excluyendo el primer mensaje de la sesión (que siempre es 100% escritura nueva).

- **283 eventos** de este tipo en todo el dataset, costo total de escritura **$606.73** (de $5,455 de gasto total = 11.1%).
- Se dividieron en dos poblaciones según el hueco (gap) desde el mensaje anterior:
  - **Reconstrucción por inactividad real** (gap ≥ 5 min, el TTL más corto posible): **197 eventos, $428.12** — mediana de hueco 108 min, p90 656 min (~11h), máximo 302h (12.6 días). De estos, 162 ocurrieron con TTL de 1h activo (o sea, el hueco superó incluso la hora) y 35 con TTL de 5m.
  - **Salto de contexto en el mismo turno** (gap < 5 min — típicamente un resultado de herramienta grande o varios subagentes agregando contexto de golpe, no inactividad): **86 eventos, $178.61**. Esto es un fenómeno distinto (ver Q7), no relacionado al traspaso.
- TTL en uso en general: de 49,076 mensajes con escritura de caché, **36,105 (73.6%) usan TTL de 1h** y 12,971 (26.4%) usan 5m; nunca se mezclan ambos en el mismo mensaje.
- **Impacto en sesiones orquestador (12, Opus, forge614-ai)**: solo **4 de las 12** tuvieron algún evento de reconstrucción por inactividad, con costo total de $10.73. La fracción de costo por reconstrucciones, ponderada por costo total de esas 12 sesiones ($217.21), es **6.3%** (media simple por sesión: 5.4%). Es decir, para el orquestador la reconstrucción por inactividad **no es el principal driver de costo** — el TTL de 1h ya absorbe la mayoría de los huecos entre mensajes.

---

## Q3 — Costo de arranque (boot) del traspaso

Regla de "primer bloque de trabajo": el primero que ocurra entre (a) el primer `tool_use` con `name` Agent/Task, o (b) el primer bloque de texto del asistente que contenga ` ``` `. Se usó el orden real de líneas del archivo (no el orden deduplicado por id).

Sesiones cuyo primer mensaje de usuario contiene "traspaso", "Retomar" u "Orquestador" (case-insensitive): **7 sesiones**.

| Sesión | Proyecto | Regla de arranque | C0 (contexto) | H (costo boot) | mensajes hasta boot |
|---|---|---|---|---|---|
| 4f1a7365… | forge614-ai (Opus) | Agent tool_use | 180,905 | $2.68 | 36 |
| 6c54ceb3… | forge614-ai (Opus) | ```code``` | 149,508 | $2.17 | 32 |
| 5efd175c… | forge614-ai (Opus) | ```code``` | 238,101 | $5.05 | 68 |
| 5cfcc14e… | forge614-ai (Opus) | ```code``` | 109,116 | $1.18 | 16 |
| bd5baf90…/agent-a1381… (subagente) | orca PKG-791 (Opus) | ```code``` | 215,670 | $1.09 | 5 |
| 48955ab4… | forge614-engines (Sonnet) | ```code``` | 153,021 | $1.86 | 40 |
| c604b488… | forge614-engram (Sonnet) | ```code``` | 486,178 | $20.73 | 287 |

Para el **orquestador Opus** (las 4 primeras, n=4 — muestra pequeña, tomarla con cautela): **H medio = $2.77, C0 medio = 169,408 tokens**. Es decir, cada traspaso ya "gasta" ~170K tokens de contexto y ~$2.8 antes de empezar a producir, solo en leer el resumen/memoria y arrancar el primer subagente o bloque de código.

La sesión `c604b488…` (worker Sonnet, forge614-engram) es un outlier: 287 mensajes y $20.73 antes de su primer bloque de código — sugiere que ese arranque en particular fue ineficiente (mucha exploración antes de producir), no un patrón típico de traspaso.

---

## Q4 — Modelo de umbral óptimo (orquestador Opus)

Con el crecimiento medido de contexto por mensaje **g** (delta de contexto entre mensajes consecutivos, sesiones orquestador Opus ≥30 msgs): **g_medio = 2,240 tokens/mensaje, g_mediana = 1,588**. Boot cost H y contexto inicial C0 del Q3 (n=4): **H=$2.77, C0=169,408**. Ajuste Opus de Q1: a=0.0391, b=2.381e-7.

Modelo: en una "ventana" de traspaso que va de C0 a T, con N=(T-C0)/g mensajes productivos, el costo esperado por mensaje productivo es:

```
costo_por_mensaje(T) = H/N + a + b·(C0+T)/2
```

(boot amortizado entre los N mensajes, más el costo medio de mensaje al contexto promedio de la ventana).

| T (umbral) | mensajes por ventana (N) | costo/mensaje productivo |
|---|---|---|
| 150,000 | — | **no alcanzable** (C0 medio ya es 169K) |
| 200,000 | 13.7 | $0.2861 |
| 250,000 | 36.0 | $0.1661 |
| 300,000 | 58.3 | $0.1426 |
| 400,000 | 102.9 | $0.1339 |
| 500,000 | 147.6 | $0.1376 |
| 700,000 | 236.9 | $0.1543 |

**Óptimo: T ≈ 396,600 tokens, costo/mensaje ≈ $0.1339.** La curva es plana: entre T=300K y T=500K el costo/mensaje se mueve solo entre $0.1426 y $0.1376 (±5% del mínimo), así que no hay urgencia de precisión — cualquier umbral entre 300K-450K es prácticamente óptimo. Por debajo de 250K el costo/mensaje sube rápido (el boot H se amortiza entre pocos mensajes); por arriba de 500K también sube (el término b·contexto pesa más que lo que se ahorra en boot).

**Efecto de un hueco de inactividad > TTL**: si la sesión se queda inactiva más que el TTL vigente, el próximo mensaje reconstruye el caché completo (~T tokens) a precio de escritura en vez de lectura. Con T≈400K y precio de escritura Opus 1h = $8/M, eso cuesta **≈ $3.2 de golpe** (vs. ~$0.08 si hubiera sido lectura de caché a $0.2/M) — comparable a un boot H completo. Esto no cambia mucho el T óptimo (la curva ya es plana ahí), pero refuerza que **evitar huecos largos** (o usar TTL 1h, que ya se usa en 74% de los mensajes) importa tanto como elegir bien T.

---

## Q5 — Workers Sonnet y subagentes

- **429 sesiones worker** (no-subagente, no-orquestador) en total; la mayoría son cortas (**mediana global = 3 mensajes**), pero **132 tienen ≥30 mensajes** y algunas son enormes: máximo 1,487 mensajes, contexto máximo hasta 971,177 tokens. Mediana de contexto máximo entre las ≥30 msgs: 516,294. **Conclusión: sí, los workers llegan a ser tan largos como el orquestador — el criterio de traspaso no debe limitarse a las sesiones "forge614-ai".**
- Dentro de esas 132, 73 están dominadas por Opus (muchas en el proyecto `forge614`, sin el sufijo `-ai` — un nodo hermano que corre sesiones largas igual de "orquestador" en la práctica) y 42 por Sonnet puro.
- **Sonnet worker puro** (42 sesiones ≥30 msgs): mediana 226 mensajes, mediana contexto máximo 560,507, mediana costo $20.8. Crecimiento por mensaje **g = 1,327 tokens/mensaje** (medio), similar orden que el orquestador.
- Con el mismo modelo de Q4 pero con los dos datos de boot disponibles para Sonnet (Q3): el caso típico (`forge614-engines`, H=$1.86, C0=153K) da un costo/mensaje que crece de forma casi monótona con T ($0.081 en T=300K hasta $0.112 en T=700K) — para Sonnet, con boot barato, **conviene traspasar más temprano (≈300K) que para el orquestador Opus**, porque el ajuste a/b de Sonnet es más bajo y no hay tanto que amortizar. El caso outlier (`forge614-engram`, H=$20.7, C0=486K) muestra lo contrario, pero es un arranque anómalo (287 mensajes de exploración antes de producir), no la norma — el problema ahí es el boot ineficiente, no el umbral.
- **Subagentes** (651 sesiones en carpetas `subagents/`): mediana 13 mensajes, 137 con ≥30. Mediana de contexto máximo entre esas: 138,768 — bastante menor que orquestador/worker. Costo mediano $1.4. **Los subagentes casi nunca necesitan traspaso** — son tareas acotadas por diseño; solo 137/651 (21%) pasan de 30 mensajes y muy pocos superan 300K de contexto.

---

## Q6 — Codex

Se usó `last_token_usage` (tamaño del turno más reciente) como "tokens en contexto", no `total_token_usage` (que es un contador acumulado de por vida de la sesión, no el tamaño de la ventana — una sesión de 3,250 turnos llegó a acumular 872M tokens totales, pero su contexto por turno nunca superó 477K).

- **206 sesiones** con datos de ventana. Ventana de contexto reportada (`model_context_window`) casi siempre **258,400 tokens** en este dataset.
- **53 de 206 sesiones (26%)** llegaron a superar el 80% de esa ventana en algún turno; razón media contexto-máximo/ventana = 0.65 (pero con mucha dispersión: la mediana real está dominada por sesiones cortas que nunca se acercan).
- Varias sesiones **superan la ventana reportada por completo**: hasta 1.87× (483,205 tokens de contexto en una ventana declarada de 258,400), en modelos `gpt-5.5`, `gpt-5.6-terra` y `gpt-6-astra`. Esto sugiere que el harness de Codex no siempre compacta al tocar la ventana nominal, o que la ventana reportada queda desactualizada tras un cambio de modelo a mitad de sesión.
- **Auto-compactación (evento `compacted`)**: ocurrió en **40 de 206 sesiones (19%)**, entre 1 y 34 veces por sesión. La sesión con 34 compactaciones (`2026/09/16/…01a0aabf…`, modelo `gpt-5.6-terra`) es un caso extremo de 3,250 turnos.
- **Escalón de precio >272K tokens** (gpt-5.6-terra, según models.dev): **37 de 206 sesiones (18%)** tuvieron al menos un turno por encima de ese umbral, donde el precio se duplica (input 2→4, output 12→18, cache_read 0.2→0.4, cache_write 2.5→5 USD/M).
- **% del límite semanal consumido**: delta medio observado por sesión (rate_limit `used_percent` al inicio vs. al final de la sesión) = 2.47 puntos porcentuales, mediana 1.0 pp (n=203; máximo 98 pp en una sesión). **% por millón de tokens**: mediana 0.73 pp/M, media 7.7 pp/M (n=103; la media está muy inflada por sesiones con pocos tokens pero saltos grandes de %, probablemente contaminadas por otras sesiones corriendo en la misma ventana semanal — usar la mediana). **Advertencia de método**: el % de límite semanal es acumulado a nivel de cuenta, no aislado por sesión, así que esta cifra es solo orientativa (ver Supuestos).
- Costo API-equivalente total estimado (solo para referencia, no es lo que se paga — Codex es suscripción): **$4,801** en las 206 sesiones.

**Recomendación Codex**: compactar/traspasar cerca de **200K tokens de contexto por turno (~78% de la ventana de 258,400)**, antes de: (a) arriesgarse a superar la ventana nominal (26% de sesiones lo hacen), y (b) cruzar el escalón de precio de 272K que duplica el costo de cada turno subsecuente mientras el contexto se mantenga arriba de ese nivel.

---

## Q7 — Otros drivers de costo claros

1. **Modelo Fable = motor de costo desproporcionado.** Los 3 mensajes individuales más caros de todo el dataset son de `claude-fable-5-1` con reconstrucciones de caché de 500K-800K tokens en un solo mensaje: $14.72, $11.01 y $10.03 (futball-webpage, orca M4LCOM-779, orca PKG-763). Fable cuesta 10/M input y 12.5/M escritura de caché — 2.5× Opus — así que una sola reconstrucción grande con Fable cuesta lo mismo que ~15 mensajes normales de Opus.
2. **Top 5 mensajes individuales = solo 0.91% del costo total** ($5,455) — o sea, el gasto NO está concentrado en unos pocos mensajes gigantes; está distribuido en muchas sesiones largas.
3. **Sesiones que nunca se traspasan son el verdadero driver.** Las 5 sesiones con más mensajes de todo el dataset (`forge614` 1,487 msgs/$184.5; `forge614-atlas` 1,139 msgs/$154.6; `forge614` 1,000 msgs/$118.9; worktree `ecosystem-map` 745 msgs/$94.1; `forge614-engram` 682 msgs/$84.9) tienen contexto promedio de 440K-533K tokens **sostenido durante cientos de mensajes** — muy por encima de cualquier umbral de traspaso razonable. Juntas suman **$637 (11.7% del gasto total medido)** en solo 5 sesiones de 1,104.
4. **Reconstrucciones "mismo turno" (Q2)**: $178.6 en 86 eventos donde el contexto salta de golpe dentro de un mismo turno (probablemente resultados de herramienta grandes o múltiples subagentes agregando contexto), sin relación con inactividad — un problema de "qué se lee", no de "cuándo se traspasa".
5. **Subagentes con contexto alto pero pocos mensajes**: el subagente más caro de todos ($49.6, 214 mensajes, hasta 802,746 de contexto) muestra que algunos subagentes de "background" terminan comportándose como sesiones largas — vale la pena revisar si deberían dividirse en varios subagentes más chicos.

---

## Supuestos y límites

- **Precios** (USD/millón de tokens), confirmados por el coordinador contra `models.dev` (snapshot leído 2026-09-25, archivo `scratchpad/modelsdev.json`):
  - Opus 5.5: input 4, cache_read 0.2, cache_write 5m 5, cache_write 1h 8, output 20.
  - Sonnet 5: input 2, cache_read 0.2, cache_write 5m 2.5, cache_write 1h 4, output 10.
  - Haiku 4.5 y Fable 5.1 (aparecen en los datos pero no en la tabla de precios original de la tarea): tomados de models.dev — Haiku input 1/cache_read 0.1/cache_write(5m) 1.25/output 5; Fable input 10/cache_read 0.25/cache_write(5m) 12.5/output 50. **ASUNCIÓN**: el precio de escritura 1h para Haiku y Fable no está en models.dev — se extendió la misma razón observada en Opus/Sonnet (1h = 2× input): Haiku 1h=2.0, Fable 1h=20.0. Esto solo afecta la cola de Q7 (Haiku 518 msgs, Fable 3,302 msgs de 46,410 totales), no las conclusiones principales de Opus/Sonnet.
  - Codex (`gpt-5.6-terra`, models.dev): input 2, cache_read 0.2, cache_write 2.5, output 12 hasta 272,000 tokens de contexto en el turno; arriba de eso, precio duplicado (input 4, cache_read 0.4, cache_write 5, output 18). Se aplicó esta misma tabla a **todas** las sesiones Codex del dataset (que también corrieron en `gpt-5.4`, `gpt-5.5`, `gpt-5.6-luna/sol`, `gpt-6-astra`) por no tener tablas específicas para esos modelos — el costo API-equivalente de Codex ($4,801) es **orientativo**, no exacto por modelo.
  - Cache write 5 minutos = 1.25× precio de input: dado en la tarea original y **confirmado por models.dev** (ej. Haiku 1.25=1.25×1, Fable 12.5=1.25×10).
- **Codex es suscripción, no $/token**: el costo API-equivalente reportado en Q6 es solo para comparar magnitudes; lo que realmente limita a Codex es el % del cupo semanal (`rate_limits.primary.used_percent`), y ese porcentaje es acumulado a nivel de cuenta — puede incluir consumo de otras sesiones corriendo en paralelo o antes en la misma ventana de 300 min / semana. Por eso el "% por millón de tokens" se reporta con mediana (más robusta) además de la media (inflada por outliers).
- **`total_token_usage` de Codex NO es tamaño de contexto** — es un contador acumulado de tokens facturados a lo largo de toda la sesión (crece con cada turno). El tamaño de contexto real por turno usado en Q6 es `last_token_usage.input_tokens + last_token_usage.cached_input_tokens`.
- **Deduplicación de mensajes Claude**: cuando el mismo `message.id` aparece en varias líneas del jsonl (bloques thinking/text/tool_use separados), el `usage` es idéntico en cada línea — se contó una sola vez por id, tomando el primer timestamp visto para el orden cronológico.
- **Clasificación orquestador/worker**: "orquestador" = sesión principal (no subagente) del proyecto `forge614-ai` dominada por Opus, tal como pidió la tarea. Esto deja fuera sesiones muy similares en comportamiento del proyecto hermano `forge614` (sin `-ai`) que también corren largo con Opus — se documentan aparte en Q5/Q7 pero no se mezclaron con la muestra "orquestador" oficial para no violar la definición dada.
- **Q3/Q4 con muestra chica**: solo 4 sesiones orquestador Opus califican como "traspaso" (mencionan traspaso/Retomar/Orquestador en el primer mensaje) con datos válidos de boot — los H y C0 usados en el modelo de Q4 vienen de esas 4, no de cientos. La curva de Q4 es un modelo, no una medición directa de "costo real repetido a cada T"; es sensible sobre todo a C0 y H medidos, menos a T dentro del rango plano.
- **Regla de "primer bloque de trabajo" (Q3)**: primero entre (a) primer `tool_use` Agent/Task o (b) primer texto del asistente con ` ``` `, en orden real de aparición en el archivo (no en el orden deduplicado por id).
- **Regla de traspaso (`is_handoff`)**: primer mensaje de usuario contiene, sin distinguir mayúsculas, alguna de las palabras "traspaso", "retomar", "orquestador". No se aplicó normalización de acentos más allá de minúsculas simple (no hizo falta: las tres palabras no llevan tilde en su forma base usada).
- **Archivos excluidos por regla de "≤10 min"**: 5 transcripciones Claude Code (la sesión y subagentes de esta misma investigación) y 1 rollout Codex, todos correctamente identificados como recientes y omitidos — no se leyeron ni un byte de ellos.
- **Regresión Q1**: mínimos cuadrados simple mensaje-a-mensaje (no por sesión), R² bajo para Opus/Fable porque el costo real depende de la mezcla lectura/escritura de caché, no solo del tamaño total de contexto — la pendiente b sigue siendo un estimador razonable de "cuánto sube el costo por mensaje por cada token adicional de contexto acumulado", que es lo que pide el modelo de Q4.
