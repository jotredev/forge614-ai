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
   - corre pruebas y typecheck en una copia temporal: `git -C <repo> archive <commit> | tar -x -C <scratchpad>/verif-<tarea>`, luego `bun install --frozen-lockfile --ignore-scripts`, `bun test` y `bun run typecheck`, leyendo el código de salida de cada comando por separado; **la suite se corre como en CI, sin pruebas omitidas por el entorno** (en Engram: `FORGE614_TEST_POSTGRES_BIN=$(pg_config --bindir) bun test`, porque PostgreSQL está instalado en la Mac) y cada prueba que siga omitida se justifica;
   - registra el conteo **medido**, no el reportado, y borra la copia.
   A futuro, Sentinel hará esta verificación de forma automática.
4. **Al cerrar cada paso, antes de entregar el siguiente prompt, el orquestador anota todo, sin que se lo pidan** (regla firme del propietario, 2026-09-25: «nunca se te debe pasar»): fila del agente **y** fila del propio orquestador en «Corridas de agentes» (medidas en su registro, §5), lecciones nuevas o actualizadas en «Lecciones de orquestación», esta guía al día (reglas y §6) y el estado en Engram. El mensaje al propietario dice qué quedó anotado.
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
| Cuando el plan agrega un campo de texto, listar cada filtro o validación que recorre los campos de texto (secretos, límites, normalización) y exigir una prueba por campo nuevo en cada uno | provisional | Engram T2 agregó `affects` y el filtro de secretos no lo revisaba; nadie lo vio hasta la revisión independiente T9 (1 tarea de corrección extra, T9b) |
| Antes de activar un nivel de esquema nuevo sobre la base real, comprobar qué hace la versión anterior con ese nivel; si lo rechaza, el plan ordena instalar, cerrar todas las sesiones que usan la base y activar desde una sesión abierta después | provisional | Engram T10: 1.6.0 responde `DATABASE_VERSION` con el nivel 11; los servidores MCP abiertos (procesos 1.6.0) habrían perdido la memoria al activar |
| Una prueba omitida no está verificada: el laboratorio y la verificación corren la suite como CI (con las variables que activan las pruebas de servicios, como PostgreSQL) y cuentan y justifican cada omisión | provisional | Engram T10a r1: 2 pruebas de PostgreSQL rotas desde T8 pasaron T8, T9 y T9b como «10 skip»; CI las encontró en el PR; 1 ronda extra |
| Todo filtro o expresión regular del plan se ejecuta antes contra textos normales parecidos ("casi positivos") y esos casos entran como pruebas fijas | provisional | Engram T2: el filtro de secretos rechazaba 5 de 8 textos normales, incluido `password: <redacted>`; 1 ronda |
| Con código literal y anclas únicas, el agente aplica el plan por script (sin editar a mano): mantener las anclas exactas y únicas | provisional | Engram T3 y T3 docs: 0 Write/Edit, reemplazos con comprobación de unicidad |
| Cuando el plan trae pruebas largas sin código de implementación, el prompt pide extraerlas del plan con un script; nunca escribirlas a mano | provisional | Engram T4 r1 (Codex medium): reescribió en 15 líneas la prueba de 114 del plan y omitió dos; r2 con extracción por script: idénticas |
| Aunque no haya laboratorio, el orquestador revisa la implementación del agente contra casos borde que las pruebas no cubren | provisional | Engram T4: la revisión encontró 2 fallos (tope que ignoraba recuerdos sin tema; huella de la petición antes de fijar la nota) que las pruebas del plan dejaban pasar |
| Las anclas de reemplazo del plan se citan completas, nunca recortadas con «…» | provisional | Engram T6: un ancla de `commands.ts` terminaba en «…»; el agente la resolvió uniendo dos líneas (sin error, pero lo tuvo que deducir) |
| Cuando el plan le pone algo a una pieza reutilizada (una descripción, un límite, un valor por defecto), listar **todos** los campos que usan esa pieza y comprobar que les sirve a cada uno | provisional | Engram T7: la descripción «id de recuerdo» puesta en la pieza `id` pasó también a `sessionProjectId`, que es un id de proyecto; las pruebas no lo vieron y la revisión sí (se corrige en T8) |

## 4b. Documentación

| Regla | Estado | Evidencia |
|---|---|---|
| **Documentación tarea por tarea:** al terminar cada tarea, un prompt aparte (etiqueta `· docs`, **sesión nueva**, medido por separado; los textos exactos van en el plan, redactados contra los capítulos reales y simulados en una copia) actualiza en un commit propio los documentos que describen lo que cambió (es/en), el CHANGELOG y el mapa de Notion; el orquestador verifica en cada revisión que código, pruebas y documentación coincidan, porque la documentación es la fuente de verdad después del código | firme (regla del propietario) | decisión del propietario, 2026-09-24; primer caso: Engram 1.7.0 T1 encontró que el capítulo 05 ya decía una versión equivocada de la réplica. Sesión nueva en vez de la misma (provisional): T1 docs misma sesión ≈ $1 por ronda; T3 docs sesión nueva Sonnet low 0,48 M tokens ≈ $0,28, a la primera |
| En los prompts de documentación, exigir que cada frase se compruebe en el código del commit y que un dato del plan que no coincida no se escriba y se reporte | provisional | Engram T7 docs: el plan decía que las versiones 1 a 3 del protocolo anuncian el formato 1; el agente vio en el código que la 1 no anuncia nada, escribió lo correcto y lo reportó (0 rondas extra) |
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
| Un subagente para un trabajo abierto ("ajusta las pruebas que fallen") cuesta mucho más que uno de redacción: acotarlo con la lista exacta de pruebas y medirlo **en su registro**, no con el total que devuelve la herramienta | provisional | Engram T8: el subagente que ajustó 21 pruebas hizo 165 mensajes con razonamiento high heredado: 34 M tokens ≈ $8 (la herramienta informó 0,31 M); el trabajo salió bien y atrapó un fallo real |
| Plan con solo pruebas y contratos, sin laboratorio (el worker implementa) | provisional (1 muestra) | Engram T4 (Codex medium): 2 rondas (1 por error del agente, 2 fallos del plan atrapados en la revisión), 3,77 M tokens, 2 % del límite semanal; T2 con código completo: 4,58 M, 1 ronda. Costo del orquestador sin laboratorio claramente menor que en T3 y T5 |
| Costo = precios de Notion "Precios de modelos" (por fecha); en Codex con suscripción, el costo se mide como % del límite semanal | firme (regla del propietario) | decisión del propietario, 2026-09-24 |

El programa de medición (Claude Code) está en el apéndice A; uso: `python3 medir.py <registro .jsonl> "<etiqueta del prompt>"`. Mide desde el primer mensaje del usuario que contiene la etiqueta hasta el final del registro.

## 6. Elección de modelo y razonamiento

Punto de partida (se ajusta solo con datos de "Corridas de agentes"):

| Tipo de tarea | Recomendado | Estado |
|---|---|---|
| Migración de datos o cambios con riesgo sobre datos reales | Opus · high | provisional (0 corridas) |
| Código + pruebas con plan preciso | Sonnet · medium con parche o plan probado en laboratorio | **firme** (3 corridas Sonnet medium a la primera: Engram T7 con laboratorio, 0,63 M ≈ $0,39; T8 con parche por `git apply`, 0,42 M ≈ $0,27; T9b con parche, 0,31 M ≈ $0,23 en 4,1 min). Codex · medium: 1 corrida (Engram T2, 4,58 M tokens, 1 ronda por error del plan) |
| Algoritmos con muchos casos borde, plan probado en laboratorio | Sonnet · high | provisional (2 corridas: Engram T3, 1,09 M tokens ≈ $0,59, 0 rondas; Engram T6, 0,96 M tokens ≈ $0,56, 0 rondas, commit idéntico al laboratorio) |
| Documentación, versión, publicación | Sonnet · low | provisional (2 corridas: Engram T3 docs, 0,48 M tokens ≈ $0,28, 0 rondas; Engram T10a publicación, 0,98 M ≈ $0,43 en 2 rondas, se detuvo bien ante el CI rojo y la ronda 2 fue por error del plan; Engram T2 docs se hizo con Codex medium: 0,44 M tokens en 2 rondas, una por error del prompt) |
| Documentación redactada por el agente a partir de datos verificados y lugares exactos | Sonnet · medium | **firme** (3 corridas, todas a la primera: Engram T4 docs, 1,08 M tokens ≈ $0,74; T7 docs, 1,43 M ≈ $0,68, atrapó un dato falso del plan; T8 docs + versión, 22 archivos, 1,36 M ≈ $0,76 en 3,1 min) |
| Migración con riesgo (referencia) | Opus · xhigh por error (se pidió high): Engram T1, 22,7 M tokens ≈ $10,47, 3 rondas (todas error del plan) | 1 corrida |
| Revisión independiente de una rama | otro proveedor · high | provisional (1 corrida: Engram T9, Codex gpt-5.6-terra high, 108 archivos en ≈ 14 min, 4,25 M tokens, límite semanal 5 % → 5 %, 1 hallazgo real que las pruebas no cubrían, 0 falsos) |
| Ejecución de un plan ya escrito (referencia) | Sonnet · high: Sentinel 0.1.1, 8,86 M tokens, 3 rondas (todas error del plan) | 1 corrida |

## 7. Registro de cambios de esta guía

- 2026-09-25 — Suite como en CI, sin pruebas omitidas por el entorno (§1.3, §4), tras Engram T10a r1.
- 2026-09-25 — Código con parche o laboratorio en Sonnet medium pasa a firme (§6, Engram T9b); lección de niveles de esquema y procesos abiertos (§4).
- 2026-09-25 — Regla firme del propietario: el orquestador anota todo al cerrar cada paso, incluida su propia fila (§1.4); lección de Engram T9 sobre campos nuevos y filtros (§4); primera revisión independiente medida (§6).
- 2026-09-25 — Documentación redactada por el agente pasa a firme (§6, 3 corridas); parche completo con `git apply` como forma de entregar código (§6).
- 2026-09-25 — Lección de Engram T8: costo real de un subagente de trabajo abierto (§5).
- 2026-09-25 — Lecciones de Engram T7 y T7 docs: revisar todos los campos que reutilizan una pieza del esquema (§4), comprobar cada frase de la documentación en el código (§4b) y segundas corridas en §6.
- 2026-09-24 — Lecciones de Engram T6: anclas completas (sin «…») y segunda corrida de Sonnet high con laboratorio (§6).
- 2026-09-24 — Lecciones de Engram T4: extraer pruebas del plan con un script, revisar casos borde sin laboratorio, datos de "solo pruebas y contratos" y de documentación redactada por el agente.
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
