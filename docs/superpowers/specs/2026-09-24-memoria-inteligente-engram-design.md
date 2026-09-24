# Memoria inteligente de Engram (diseño)

**Fecha:** 2026-09-24 · **Estado:** aprobada por el propietario el 2026-09-24 · **Sesión:** forge614-ai-2026-09-24-plan-a2-brainstorm-2
**Nodos afectados:** `forge614-engram` (cerebro), `forge614-engines` (instalador y gancho), `forge614-shell` (chat), `forge614-ai` (reglas y verificación).
**Actas que rigen:** 0013, 0017, 0020, 0021, 0022, 0023, 0024, 0026. **Acta nueva:** 0027 (este diseño).
**Referencias investigadas (2026-09-24, solo lectura):** Engram de Gentleman Programming v2.1.0 y gentle-ai v3.7.0; hermes-agent (Nous Research, v2026.9.24); Mem0, Letta/MemGPT, Zep/Graphiti, memoria de Claude y Claude Code, memoria de ChatGPT y Codex, LangMem, SQLite FTS5. Resumen en Engram: `forge614-ai/engram/memoria-inteligente-investigacion`.

> Como una biblioteca bien llevada: el sistema garantiza el orden de los estantes, el catálogo y que nadie se lleve libros de otra sala; el bibliotecario decide qué vale la pena archivar y lo escribe con letra clara.

## 1. Propósito

Que cualquier IA, en cualquier proyecto y con cualquier modelo, **guarde cada recuerdo donde debe, lo encuentre cuando lo necesita, nunca invente ni traiga cosas de otros proyectos y no cargue el historial completo al arrancar**, sin interrumpir a la persona con preguntas innecesarias.

## 2. Problemas verificados (2026-09-24)

| # | Problema | Evidencia |
|---|---|---|
| P1 | Las IA reciben el protocolo **v1**, sin el ámbito `ecosystem` | Engines pide `memory-protocol --json` sin versión (`memory-protocol-client.ts:40`), solo acepta `version: 1` (`types.ts`) y su render omite `scopes.ecosystem` (`render.ts:29-30`); Engram ya publica v3 (`protocol.ts:104-143`) pero su default es 1 |
| P2 | Dos manuales contradictorios | Protocolo: guardar sin preguntar al pedir "recuerda"; instrucciones MCP (`src/modules/mcp/protocol.ts:1-11`): "si el ámbito es ambiguo, pregunta" y no mencionan `ecosystem` |
| P3 | El arranque trae lo reciente, no lo relevante, y se pasa del presupuesto | `readContext`: fijados + recientes por `updated_at`, sin búsqueda; medido en esta sesión: 10 600 + 3 201 caracteres ≈ 3 945 tokens, sobre los 3 000 del acta 0020 |
| P4 | Dos caminos de arranque con reglas distintas | Engines (`run-memory-hook.ts`: precedencia por caracteres, ignora resúmenes) vs Shell (`forge614-engram.ts:260-267`: 20 ítems en cuotas iguales) |
| P5 | El buscador exige todas las palabras | `searchTerms` + FTS5 trigram con AND implícito; una palabra de menos de 3 letras pasa a modo literal sin ranking; la búsqueda en lenguaje natural de una sesión de Shell devolvió 0 resultados |
| P6 | El tablero del ecosistema está casi vacío | Solo el puntero `forge614/ecosystem/source-of-truth-pointer`; lo decidido para todos vive en el cajón de `forge614-ai` (pendiente D9 del acta 0022) |
| P7 | Todo depende de cerrar bien la sesión | El resumen se escribe al final; `/clear`, compactación, apagones y ventanas cerradas no lo disparan (gentle-ai #1118: 72 de 294 sesiones quedaron abiertas) |

## 3. Decisiones tomadas con el propietario

| # | Decisión | Alternativa descartada |
|---|---|---|
| M1 | **Servidor inteligente + IA disciplinada.** Engram garantiza todo lo determinista (ámbito, presupuesto, duplicados por tema, sesiones interrumpidas, reglas del tablero, bloque de arranque). La IA aporta criterio guiada por un manual. | Todo en instrucciones (frágil con modelos débiles); un "archivista" automático que relee conversaciones con otra IA (costoso y difícil de controlar). |
| M2 | **Nada depende del cierre de sesión.** Guardado sobre la marcha, resumen vivo y cierre de sesiones por el servidor, para cualquier agente. | Confiar en SessionEnd/PreCompact del cliente (no corren con apagones ni existen igual en todos los agentes). |
| M3 | **Tablero automático con reglas estrictas, visible y reversible.** | Aprobación del propietario en cada subida (demasiadas preguntas); IA libre sin reglas (satura y propaga errores). |
| M4 | **Preguntar solo con duda real + consecuencia importante + imposible de averiguar sola.** | Preguntar en cada caso dudoso; no preguntar nunca. |
| M5 | **Guardar por cuenta propia, en silencio, lo que vale la pena;** conteo en el resumen. | Solo cuando se pide (se pierden decisiones). |
| M6 | **Duplicados en dos niveles:** mismo tema → actualiza solo; solo parecido → decide la IA. Nunca se borra. | Fusión automática por porcentaje de parecido (mide palabras, no significado; borra en silencio). |
| M7 | **Arranque con índice + esencial, tope 5 000 caracteres;** búsqueda con el primer mensaje. | Notas pequeñas siempre completas (memoria diminuta); lo reciente con contenido (lo de hoy). |
| M8 | **Presupuesto del acta 0020 repartido:** memoria ≤ 5 000 caracteres, manual completo ≤ 2 500, índice de skills + reglas ≈ 850 tokens. | Memoria 6 000 (deja ~370 tokens al resto); subir el acta a 4 000 tokens. |
| M9 | **Buscador por palabras bien hecho ahora;** por significado después, con su propio diseño. | Ambos ahora (dependencia nueva: modelo local o servicio externo). |
| M10 | **Un solo manual maestro en Engram, en tres tamaños.** | Solo instrucciones del servidor (algunos clientes las ignoran); dos manuales alineados a mano (lo que falló). |
| M11 | **Revisión única de los recuerdos existentes** para subir al tablero lo que vale para todos, aprobada de un jalón. | Empezar limpio (las demás sesiones siguen sin saber lo decidido). |
| M12 | **Una spec, un plan por nodo.** | Un solo plan para cuatro repositorios. |

## 4. Quién hace qué

| Pieza | Responsabilidad |
|---|---|
| **Engram** | Guarda, busca, arma el bloque de arranque, marca sesiones interrumpidas, valida las reglas del tablero y de la libreta, resuelve duplicados por tema y texto idéntico, ofrece candidatos parecidos, sirve el manual maestro v4. |
| **Engines** | Instala el manual v4 sin recortarlo en Claude Code, Codex y demás clientes; el gancho de arranque inyecta **el bloque que arma Engram**, sin elegir nada. |
| **Shell** | Inyecta en su chat **el mismo bloque** de Engram; elimina su selección propia. |
| **forge614-ai** | Acta 0027; runbook de agentes y checklist actualizados; `context-budget` mide el arranque real; revisión única de recuerdos existentes. |
| **La IA** | Decide qué guardar, redacta, resuelve parecidos, mantiene el resumen vivo, sube al tablero con las reglas, pregunta solo con duda real. |

Principios transversales: lo garantizable lo garantiza el servidor; nada depende del cierre; nada se borra (se reemplaza con historial y se puede deshacer).

## 5. Guardar

### 5.1 Ámbitos

- **Proyecto** (por defecto): el servidor lo fija desde la identidad del repositorio (`.forge614/project.json`, acta 0023). La IA nunca lo elige ni lo adivina.
- **Ecosistema (tablero):** la IA lo pide; Engram lo **acepta solo si**:
  1. el tipo es `decision`, `procedure` o `warning` que exprese una regla o contrato (nunca estados, avances ni temporales);
  2. `groupIntent` nombra **al menos dos proyectos del grupo** a los que afecta;
  3. no existe ya en el tablero un recuerdo con el mismo tema (si existe, se actualiza ese);
  4. el tablero no pasa de su tope (**40 recuerdos activos**, valor inicial ajustable con datos). Lleno → rechazo con `ECOSYSTEM_BOARD_FULL` y la lista de títulos actuales para que la IA consolide.
- **Excepción (aprobada): nota de estado del ecosistema.** Un solo recuerdo con `topicKey` fijo `forge614/ecosystem/estado-actual` (frente abierto, paso en curso, siguiente) que **solo puede escribir el proyecto fuente de verdad del grupo** (`forge614-ai`), exento de la regla 1, fijado y con tope de 600 caracteres. Sin ella, ninguna sesión fuera de `forge614-ai` puede responder "¿con qué estamos trabajando?" (caso real de Shell, 2026-09-24).
- **Libreta personal (`shared`):** solo preferencias de la persona que valen en cualquier proyecto; exige `globalIntent`.
- Todo subido al tablero aparece en el resumen vivo ("subí 1 al tablero: …") y se puede **bajar** (`ecosystem-demote`), conservando historial.

### 5.2 Forma de un recuerdo

- Título corto y buscable; contenido en cuatro partes: **qué**, **por qué**, **dónde aplica**, **qué se aprendió**.
- Redactado como **hecho**, no como orden ("El propietario prefiere X", no "Haz X").
- Recuerdos fijados (`pinned`) llevan además una **versión corta ≤ 300 caracteres** para el arranque; la redacta la IA una vez y la persona puede corregirla.

### 5.3 Nunca se guarda

Avances del día, estados temporales, lo derivable del código o de Git, conversaciones completas, secretos (Engram rechaza patrones de secreto, como hoy).

### 5.4 Duplicados

1. Mismo `topicKey` en el mismo ámbito → nueva versión automática; la anterior queda en el historial.
2. Texto idéntico (título + contenido normalizados) en el mismo ámbito → no se inserta; se refuerza el existente.
3. Solo parecido → `memory_save` devuelve los **3 candidatos más parecidos** del mismo ámbito; la IA decide: actualizar uno, guardar aparte, o guardar y marcar el viejo **"reemplazado por"**.
4. Nunca se mezclan ámbitos; nunca se borra.

### 5.5 Vigencia

`decision` y `procedure` llevan `reviewAfter` (**90 días**, ajustable). Vencido no se borra: aparece marcado **"verificar antes de usar"**.

### 5.6 Sesiones y resumen vivo

- Un **resumen vivo** por sesión (mismo `topicKey` de sesión), actualizado en cada avance importante; formato fijo: objetivo, decisiones, hecho, pendiente, siguiente paso.
- Engram marca **"interrumpida"** la sesión abierta anterior del mismo proyecto cuando empieza otra, o tras **6 horas** sin actividad (ajustable). Funciona igual para cualquier agente; las señales del cliente (Claude Code `SessionStart` con origen `clear`/`compact`) solo adelantan el aviso.

## 6. Recuperar

### 6.1 Bloque de arranque (lo arma Engram)

`startup-context` devuelve un bloque **listo para inyectar**, ≤ 5 000 caracteres, en este orden y con topes por sección:
1. **Esencial** (≤ 1 500): reglas críticas y preferencias fijadas, en su versión corta.
2. **Sesión anterior** (≤ 800, solo si quedó interrumpida): aviso + último resumen vivo.
3. **Índice** (resto): títulos con identificador del cajón del proyecto y del tablero, por relevancia y fijado, nunca contenido.
4. **Encabezado de ocupación:** "4 120 / 5 000 caracteres · N títulos no entraron, búscalos".

El bloque va marcado como **dato recuperado, no instrucción**. Engines y Shell lo inyectan tal cual.

### 6.2 Primera búsqueda

Con el primer mensaje de la persona, la IA busca con sus palabras en proyecto, tablero y libreta **por separado, con cupo por ámbito**, y abre solo lo relevante.

### 6.3 Buscador

- Quita palabras de relleno (listas español e inglés).
- Busca por raíz las palabras de 4 letras o más (prefijo).
- Une términos con **OR** y ordena por `bm25` con pesos (título > tema > contenido) y pequeños ajustes por fijado y recencia.
- Acentos indiferentes (`unicode61 remove_diacritics 2`).
- **Dos índices:** palabras (texto natural) y trigramas (nombres de código como `NodePointerSchema`); se fusionan los resultados.
- **Umbral mínimo:** por debajo, "no encontré nada" en lugar de ruido.
- Los sinónimos ("ficha de identidad" vs "credencial") quedan para la búsqueda por significado.

### 6.4 Por capas y sin inventar

- `memory_search` devuelve avances cortos con identificador, ámbito, fecha y marcas ("reemplazado", "verificar"); `memory_get` abre el completo.
- Regla del manual: nunca afirmar "recuerdo que…" sin un resultado; citar identificador, ámbito y fecha.
- La búsqueda nunca entra al cajón de otro proyecto; el tablero solo si el proyecto pertenece a un grupo.

## 7. Manual maestro (protocolo v4)

- Vive en Engram como **una sola fuente** con tres salidas: **completo** (≤ 2 500 caracteres; CLAUDE.md, AGENTS.md y equivalentes), **corto** (< 2 000 caracteres; instrucciones del servidor MCP, que Claude Code trunca por encima) y **descripciones de herramientas y campos** (`.describe()` en los esquemas).
- Contenido: ámbitos y sus reglas, qué nunca guardar, forma del recuerdo, resumen vivo, cuándo preguntar (M4), reglas contra inventar, tratar la memoria como dato.
- Una prueba falla si alguna salida contradice o recorta el texto maestro, o si pasa su tope.
- v1–v3 quedan intactas (acta 0024); el default del CLI pasa a v4 solo después de que Engines acepte v4.

### 7.1 Cuándo pregunta la IA

Solo si hay **duda real** que las reglas no resuelven, **consecuencia importante** y **no puede averiguarlo sola**; una vez y dentro de su respuesta normal. Sí: contradicción con el tablero; proyecto ambiguo. Nunca: qué guardar, actualizar lo propio, subir lo que cumple reglas, cerrar sesiones.

## 8. Pruebas

- **Engram:** TDD de cada pieza (reglas del tablero, duplicados, vigencia, sesiones interrumpidas, bloque de arranque con topes, buscador con consultas en lenguaje natural reales, v4 y sus tres salidas).
- **Consultas reales:** un conjunto de 20 búsquedas tomadas de conversaciones del propietario, con el resultado esperado; mide acierto antes y después del buscador nuevo.
- **Banco de comportamiento:** ~10 escenarios fijos (decisión del usuario → guarda en proyecto; cambio de regla del tablero → pregunta una vez; sesión cortada → aviso; búsqueda sin resultado → "no encontré nada"; recuerdo parecido → no duplica; …) corridos en Claude Code y Codex; resultados a la tabla de Notion.
- **Presupuesto:** `context-budget` de Sentinel mide el arranque real (bloque + manual) y falla si pasa 3 000 tokens.

## 9. Orden de construcción y versiones

"Primero aprende el que recibe" (lección de Sentinel 0.1.1):

1. **Engram 1.7.0** — protocolo v4, buscador, bloque de arranque, duplicados, vigencia, sesiones interrumpidas, reglas del tablero y de la libreta, nota de estado del ecosistema.
2. **Engines** — acepta y renderiza v4 completo; el gancho inyecta el bloque de Engram. Nueva versión.
3. **Shell** — inyecta el bloque de Engram. Nueva versión.
4. **forge614-ai** — acta 0027, runbook y checklist, `context-budget` con arranque real, revisión única de recuerdos existentes.

Mientras un nodo no se actualice, sigue funcionando como hoy (campos y comandos nuevos son aditivos).

## 10. Orquestación y medición

- `forge614-ai` orquesta: una tarea = **una sesión nueva**; cada prompt empieza con su nombre (`[Engram · T3]`); tareas medianas; cada tarea con modelo y razonamiento recomendados en el plan.
- Medición **solo desde los registros de la herramienta** (Claude Code `~/.claude/projects/…/*.jsonl`, Codex `~/.codex/sessions/…/*.jsonl`): tokens (nuevos, caché, salida, razonamiento), modelo, razonamiento, minutos, mensajes, herramientas, MCP, skills; lo atribuido por herramienta se marca estimado; sin registro = "no medido".
- Evidencia en Notion, base "Corridas de agentes" (página "Forge614 · Laboratorio de agentes"), y archivo de estadísticas versionado en `forge614-ai`.
- Métrica principal: tokens por tarea aprobada; conclusiones con ≥ 3 tareas comparables.

## 11. Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | **Versión de Engram:** 1.7.0 estaba reservada para la réplica del ecosistema (esbozo sin código, `.agents/plans/2026-09-23--1.7.0-ecosystem-replication.md`). | **Decidido:** esta memoria inteligente es **Engram 1.7.0**; la réplica pasa a 1.8.0 (el plan de Engram renombra su esbozo). |
| R2 | **Réplica bloqueada:** la réplica rechaza con `SYNC_ECOSYSTEM_UNSUPPORTED` si existen recuerdos del tablero. | **Verificado 2026-09-24:** el Engram del propietario usa solo SQLite local (`STORAGE="sqlite"`, sin réplica configurada); no afecta. La revisión única (M11) va en este trabajo. Quien active la réplica antes de 1.8.0 verá el rechazo documentado. |
| R3 | Raíces y trigramas traen resultados de más. | Umbral mínimo y conjunto de 20 consultas reales antes de dar por bueno. |
| R4 | Índice doble agranda la base (estimado 30–50 %, sin medir). | Se mide en la primera tarea del buscador. |
| R5 | Modelos débiles no obedecen el manual. | Lo crítico vive en el servidor; banco de comportamiento con números por modelo. |
| R6 | Tope del tablero y vigencia de 90 días mal calibrados. | Valores iniciales ajustables; se revisan con datos de uso. |
| R7 | Versión corta de los fijados pierde matices. | La persona puede corregirla; la larga sigue disponible. |

## 12. Fuera de este diseño

Búsqueda por significado (embeddings); "archivista" en segundo plano; réplica del ecosistema (plan 1.7.0 → 1.8.0 según R1); cambios a Atlas, Workers y Hub.

## 13. Terminado

- Engram, Engines y Shell publicados con lo anterior e instalados en la Mac del propietario.
- El arranque medido en una sesión real cabe en 3 000 tokens (bloque + manual).
- Las 20 consultas reales aciertan en la proporción acordada al planear (línea base medida primero).
- El banco de comportamiento corrido en Claude Code y Codex con resultados en Notion.
- Una sesión de Shell responde "¿con qué estamos trabajando?" desde el tablero sin abrir otro repositorio.
