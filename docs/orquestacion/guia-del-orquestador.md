# Guía del orquestador

> Como la bitácora de un jefe de obra: cada instrucción que funcionó queda escrita con la prueba de que funcionó, y cada una que falló queda tachada con el motivo.

**Qué es:** las reglas vigentes para que una sesión de `forge614-ai` coordine trabajo en otros repositorios del ecosistema mediante prompts (y, a futuro, para el orquestador automático).
**Cuándo se lee:** solo cuando una sesión va a orquestar. No se carga al arrancar ninguna sesión (acta 0020).
**Evidencia:** Notion, página "Forge614 · Laboratorio de agentes": bases "Corridas de agentes" (una fila por tarea medida) y "Lecciones de orquestación" (cada regla con sus números).
**Estados de una regla:** **provisional** (observada en 1–2 corridas), **firme** (confirmada en ≥ 3 corridas distintas), **retirada** (una corrida la contradijo; queda tachada con el motivo). Varias observaciones dentro de una misma corrida cuentan como una muestra. Ninguna regla entra sin evidencia.

## 1. Método

1. El plan vive en `forge614-ai` (`docs/superpowers/plans/`) y cada tarea trae modelo y razonamiento recomendados. **Antes de entregar una tarea, su código se prueba en un laboratorio** (copia del repositorio en el scratchpad con `git archive`): se aplica el plan, se corre la suite completa y las reglas de arquitectura, y se verifica que cada texto a reemplazar exista una sola vez. La documentación se simula igual. Lo pesado de esa preparación se delega a un subagente de contexto limpio y el orquestador revisa el resultado (§5).
2. **Una tarea = una sesión nueva** en el repositorio que toca. El propietario pega el prompt, la sesión trabaja y reporta, el propietario pega el reporte aquí.
3. El orquestador revisa el reporte **y verifica por su cuenta**, sin tocar el otro repositorio (autorización del propietario, 2026-09-24):
   - lee el diff completo del commit contra el plan, línea por línea (`git -C <repo> diff/show`), y lo revisa como experto;
   - corre pruebas y typecheck en una copia temporal: `git -C <repo> archive <commit> | tar -x -C <scratchpad>/verif-<tarea>`, luego `bun install --frozen-lockfile --ignore-scripts`, `bun test` y `bun run typecheck`, leyendo el código de salida de cada comando por separado;
   - registra el conteo **medido**, no el reportado, y borra la copia.
   A futuro, Sentinel hará esta verificación de forma automática.
4. Al cerrar cada tarea, el orquestador mide la corrida desde el registro de la herramienta (§5) y agrega la fila en Notion; si aprendió algo, agrega o actualiza una lección.
5. **Los prompts se entregan en el chat del orquestador, en un solo bloque de código listo para copiar y pegar** (decisión del propietario, 2026-09-24: la página de tarjetas se retiró porque cada publicación costaba $1,5–2 y agregaba pasos). Antes del bloque, una línea dice dónde pegarlo (repositorio, herramienta, modelo y razonamiento). Un solo paso a la vez. Nunca se manda un prompt solo para decirle a una sesión que su trabajo quedó aprobado: con el visto bueno del propietario va directo el prompt de la siguiente tarea.
6. **Traspaso del orquestador:** cuando cada mensaje del orquestador relee más de ~300K tokens, se guarda el estado (resumen en Engram, plan, esta guía, página de prompts y Notion) y se continúa en una sesión nueva de `forge614-ai` (§5).

## 2. Forma del prompt

```
[<Proyecto> · T<n>] <qué hace, en una línea>

Contexto: <1–3 líneas: por qué existe esta tarea>.
Plan (lectura autorizada: solo lectura, mismo ecosistema): git -C ~/Desktop/forge614-ai show <rama>:<ruta del plan> — Tarea <n>, pasos <a>–<b>.
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
| **El prompt dice explícitamente que la lectura del plan está autorizada** ("solo lectura, mismo ecosistema"): la regla compartida `sesion-solo-repo-propio` v2 permite leer (nunca escribir ni ejecutar) otro repositorio del mismo ecosistema Forge614 cuando el prompt lo indica | firme (regla del propietario) | decisión del propietario, 2026-09-24, tras Engram T2 docs r1: Codex medium se detuvo con razón al pedirle leer el plan, aunque el mismo modelo con la misma regla lo había leído en T2 r1 (y Opus en T1): la regla v1 era ambigua sobre leer |

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
| No pedir el total de la suite en el reporte (el orquestador lo mide en su copia); pedir solo las pruebas nuevas rojo → verde | provisional | Engram T2 (Codex medium, límite de 30 s): r1 omitió el total; r2 reportó 866/18 cuando el real era 624/10 (sumó una carpeta dos veces) |

## 4. Qué incluir en el plan

| Regla | Estado | Evidencia |
|---|---|---|
| Al subir una versión, listar todo lo que depende del número (buscar la versión actual en pruebas, fixtures y goldens y clasificar cada aparición); arreglo de raíz: leer la versión real, regenerar goldens con la herramienta oficial | provisional | Sentinel 0.1.1: 3 pruebas no previstas, 2 rondas evitables |
| Antes de escribir un documento en `forge614-ai`, revisar `standard/forbidden-mentions.json`: no nombrar productos prohibidos (acta 0012) | provisional | spec de memoria inteligente: 2 menciones que habrían hecho fallar `verify` |
| Indicar archivos y líneas exactos a tocar, para que la sesión no explore el repositorio | provisional (hipótesis a medir) | la entrada re-leída es el 99 % del costo (§5) |
| **Probar el plan completo en un laboratorio antes de entregarlo** (§1): código y pruebas literales ya verdes, anclas de reemplazo únicas | provisional | Engram 1.7.0: rondas por error del plan T1 3 → T2 1 → **T3 0** (el laboratorio atrapó 4 errores); agente T3 en 2,3 min y 1,09 M tokens |
| Todo filtro o expresión regular del plan se ejecuta antes contra textos normales parecidos ("casi positivos") y esos casos entran como pruebas fijas | provisional | Engram T2: el filtro de secretos rechazaba 5 de 8 textos normales, incluido `password: <redacted>`; 1 ronda |
| Con código literal y anclas únicas, el agente aplica el plan por script (sin editar a mano): mantener las anclas exactas y únicas | provisional | Engram T3 y T3 docs: 0 Write/Edit, reemplazos con comprobación de unicidad |

## 4b. Documentación

| Regla | Estado | Evidencia |
|---|---|---|
| **Documentación tarea por tarea:** al terminar cada tarea, un prompt aparte (etiqueta `· docs`, **sesión nueva**, medido por separado; los textos exactos van en el plan, redactados contra los capítulos reales y simulados en una copia) actualiza en un commit propio los documentos que describen lo que cambió (es/en), el CHANGELOG y el mapa de Notion; el orquestador verifica en cada revisión que código, pruebas y documentación coincidan, porque la documentación es la fuente de verdad después del código | firme (regla del propietario) | decisión del propietario, 2026-09-24; primer caso: Engram 1.7.0 T1 encontró que el capítulo 05 ya decía una versión equivocada de la réplica. Sesión nueva en vez de la misma (provisional): T1 docs misma sesión ≈ $1 por ronda; T3 docs sesión nueva Sonnet low 0,48 M tokens ≈ $0,28, a la primera |
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
| **Medir también al orquestador**, no solo al agente: su costo por tarea domina cuando su contexto es grande | provisional | Engram T3: agentes $0,59 + $0,28, subagente de borrador $0,81, orquestador $8,49 (≈ 85–90 %); ~310K → 430K tokens releídos por mensaje |
| Delegar la redacción y el laboratorio a un subagente de contexto limpio (Sonnet) y revisar su resultado | provisional (1 muestra) | Engram T3 docs: borrador en 4,9 min ≈ $0,81 con 1 contradicción y 2 detalles corregidos en la revisión; queda medir en T5 el laboratorio de código delegado |
| Costo = precios de Notion "Precios de modelos" (por fecha); en Codex con suscripción, el costo se mide como % del límite semanal | firme (regla del propietario) | decisión del propietario, 2026-09-24 |

El programa de medición (Claude Code) está en el apéndice A; uso: `python3 medir.py <registro .jsonl> "<etiqueta del prompt>"`. Mide desde el primer mensaje del usuario que contiene la etiqueta hasta el final del registro.

## 6. Elección de modelo y razonamiento

Punto de partida (se ajusta solo con datos de "Corridas de agentes"):

| Tipo de tarea | Recomendado | Estado |
|---|---|---|
| Migración de datos o cambios con riesgo sobre datos reales | Opus · high | provisional (0 corridas) |
| Código + pruebas con plan preciso | Sonnet · medium o Codex · medium | provisional (1 corrida: Engram T2 Codex medium, 4,58 M tokens, 1 ronda por error del plan, 0 del agente) |
| Algoritmos con muchos casos borde, plan probado en laboratorio | Sonnet · high | provisional (1 corrida: Engram T3, 1,09 M tokens ≈ $0,59, 0 rondas) |
| Documentación, versión, publicación | Sonnet · low | provisional (1 corrida: Engram T3 docs, 0,48 M tokens ≈ $0,28, 0 rondas; Engram T2 docs se hizo con Codex medium: 0,44 M tokens en 2 rondas, una por error del prompt) |
| Migración con riesgo (referencia) | Opus · xhigh por error (se pidió high): Engram T1, 22,7 M tokens ≈ $10,47, 3 rondas (todas error del plan) | 1 corrida |
| Revisión independiente de una rama | otro proveedor · high | provisional (0 corridas) |
| Ejecución de un plan ya escrito (referencia) | Sonnet · high: Sentinel 0.1.1, 8,86 M tokens, 3 rondas (todas error del plan) | 1 corrida |

## 7. Registro de cambios de esta guía

- 2026-09-24 — Los prompts se entregan en el chat del orquestador, en un solo bloque para copiar (§1.5); se retira la página de tarjetas.
- 2026-09-24 — Laboratorio antes de entregar cada tarea (§1, §4), medición del orquestador y traspaso de sesión (§1, §5), reporte sin total de la suite (§3), documentación en sesión nueva (§4b), datos de T1–T3 en §6 y programa de medición (apéndice A).
- 2026-09-24 — Regla firme del propietario: lectura del plan autorizada explícitamente en el prompt (solo lectura, mismo ecosistema; regla compartida v2). Sustituye la decisión previa del mismo día de copiar todo el texto en el prompt.
- 2026-09-24 — Regla firme del propietario: documentación tarea por tarea (§4b).
- 2026-09-24 — Creada con 6 reglas provisionales de las primeras corridas medidas (Sentinel 0.1.1) y 2 hipótesis a medir.

## Apéndice A. Programa de medición (Claude Code)

```python
import json,sys,collections
path,label=sys.argv[1],sys.argv[2]
started=False; t0=t1=None; models=collections.Counter(); efforts=collections.Counter(); tools=collections.Counter()
u=collections.Counter(); seen=set(); msgs=0; last_text=""
for line in open(path):
    o=json.loads(line); ty=o.get("type")
    if ty=="user" and not started:
        c=o.get("message",{}).get("content")
        txt=c if isinstance(c,str) else " ".join(x.get("text","") for x in c if isinstance(x,dict))
        if label in txt: started=True; t0=o.get("timestamp")
    if not started: continue
    t1=o.get("timestamp") or t1
    if ty=="assistant":
        m=o.get("message",{}); mid=m.get("id")
        if o.get("effort"): efforts[o["effort"]]+=1
        for b in m.get("content",[]):
            if b.get("type")=="tool_use": tools[b.get("name")]+=1
            if b.get("type")=="text": last_text=b.get("text","")
        if mid in seen: continue
        seen.add(mid); msgs+=1; models[m.get("model")]+=1
        us=m.get("usage",{})
        for k in ("input_tokens","cache_read_input_tokens","cache_creation_input_tokens","output_tokens"): u[k]+=us.get(k,0) or 0
        cc=us.get("cache_creation") or {}
        u["cache_1h"]+=cc.get("ephemeral_1h_input_tokens",0) or 0; u["cache_5m"]+=cc.get("ephemeral_5m_input_tokens",0) or 0
print("inicio",t0,"fin",t1); print("modelos",dict(models),"effort",dict(efforts)); print("mensajes",msgs)
print("tokens",dict(u),"total",u["input_tokens"]+u["cache_read_input_tokens"]+u["cache_creation_input_tokens"]+u["output_tokens"])
print("herramientas",dict(tools)); print("largo último texto",len(last_text))
```
