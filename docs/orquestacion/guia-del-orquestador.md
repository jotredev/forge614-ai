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
6. **Traspaso del orquestador:** cuando cada mensaje del orquestador relee más de ~300K tokens, se guarda el estado (resumen en Engram, plan, esta guía, página de prompts y Notion) y se continúa en una sesión nueva de `forge614-ai` (§5). El tamaño se **mide en el registro** (`costo.py`, apéndice B), nunca se estima: el 2026-09-25 el orquestador dijo «unos 100K» cuando medía 290K. El traspaso dice el estado de cada prompt entregado: «entregado, sin pegar», «corriendo» o «reportado»; el orquestador nuevo lo comprueba en solo lectura (rama y commit) antes de pedir un reporte y, si no se corrió, vuelve a dar el prompt en su primer mensaje (provisional: Engram 1.7.1 T1, el propietario preguntó «¿cuál reporte?»).

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
| La línea «Pégalo en» dice en qué carpeta abrir la sesión (`~/Desktop/<repositorio>`), porque Shell y Claude Code arrancan en la carpeta de la terminal; el prompt empieza comprobando la carpeta y se detiene si no cuadra | provisional | Engram · Notion 1.7.0 docs r1: el prompt se pegó en una sesión de Shell abierta en `forge614-ai`; el agente se detuvo solo sin cambiar nada (1 ronda perdida ≈ $0,15) |
| La línea antes del prompt dice en palabras llanas «sesión NUEVA» (no la de la tarea anterior) y trae los comandos para abrirla (`cd ~/Desktop/<repositorio>` y `claude` o `codex`) y cómo elegir modelo y razonamiento; nunca «sesión nueva abierta en…» | provisional | Revalidación R1b: el propietario no entendió «sesión nueva abierta en `~/Desktop/forge614-ai`» y preguntó si pegaba el prompt en la misma sesión de R1 |
| Si el prompt reescribe los pasos del plan, no quita ninguno: los cita por número o los copia todos y el orquestador los compara uno a uno con el plan; los datos esperados (conteos) salen de una lectura del día | provisional | Engram T10b: el prompt decía «pasos 1–7» pero al reescribirlos terminó en el 6 y omitió la prueba de búsqueda y el «detente si algo no cuadra»; esperaba «unos 107 recuerdos» y había 125 (1 paso cubierto por el orquestador, 0 rondas) |
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
| Antes de activar un nivel de esquema nuevo sobre la base real, comprobar qué hace la versión anterior con ese nivel; si lo rechaza, el plan ordena instalar, cerrar todas las sesiones que usan la base y activar desde una sesión abierta después | provisional | Engram T10: 1.6.0 responde `DATABASE_VERSION` con el nivel 11; los servidores MCP abiertos (procesos 1.6.0) habrían perdido la memoria al activar. T10b: el control previo (procesos con hora de inicio y programa padre, detenerse si queda alguno anterior) encontró 10 vivos tras «cerrar todo»; 3 eran de la app de Codex, que los mantiene hasta salir con Cmd+Q |
| Todo comando que el plan manda correr sobre datos reales (consultas de antes/después, huellas, conteos) se ejecuta tal cual en el laboratorio contra una copia antes de entregar el prompt | provisional | Engram T10b: `.sha3sum` con cinco tablas en una llamada respondió «Usage» (acepta un solo patrón); era de solo lectura y el agente lo repitió tabla por tabla, sin daño |
| Una copia de `git archive` no trae lo que Git ignora: antes de entregar, revisar qué archivos ignorados tiene el repositorio real (`git status --ignored`: `dist/`, cachés, compilados) y, si una prueba o verificación los lee, incluir en el plan el paso que los regenera | provisional | Reglamento 1.1.0 R1: `dist/` de la Mac conservaba el paquete de 1.0.2 y `verify`, `standard:pack --check` y 5 pruebas fallaron con `STANDARD_PACK_DRIFT`; en el laboratorio `dist/` no existía (1 ronda extra ≈ $0,10) |
| Una prueba omitida no está verificada: el laboratorio y la verificación corren la suite como CI (con las variables que activan las pruebas de servicios, como PostgreSQL) y cuentan y justifican cada omisión | provisional | Engram T10a r1: 2 pruebas de PostgreSQL rotas desde T8 pasaron T8, T9 y T9b como «10 skip»; CI las encontró en el PR; 1 ronda extra |
| Todo filtro o expresión regular del plan se ejecuta antes contra textos normales parecidos ("casi positivos") y esos casos entran como pruebas fijas | provisional | Engram T2: el filtro de secretos rechazaba 5 de 8 textos normales, incluido `password: <redacted>`; 1 ronda |
| Con código literal y anclas únicas, el agente aplica el plan por script (sin editar a mano): mantener las anclas exactas y únicas | provisional | Engram T3 y T3 docs: 0 Write/Edit, reemplazos con comprobación de unicidad |
| Cuando el plan trae pruebas largas sin código de implementación, el prompt pide extraerlas del plan con un script; nunca escribirlas a mano | provisional | Engram T4 r1 (Codex medium): reescribió en 15 líneas la prueba de 114 del plan y omitió dos; r2 con extracción por script: idénticas |
| Aunque no haya laboratorio, el orquestador revisa la implementación del agente contra casos borde que las pruebas no cubren | provisional | Engram T4: la revisión encontró 2 fallos (tope que ignoraba recuerdos sin tema; huella de la petición antes de fijar la nota) que las pruebas del plan dejaban pasar |
| Las verificaciones literales del checklist de agentes que tocan lo que cambia (y las de los nodos que lo consumen) se ejecutan tal cual en el laboratorio contra datos reales antes de entregar el parche | provisional | Engines E1: el manual v4 llevaba un encabezado y el checklist 1.1.0 exige el texto «byte a byte igual a `instructions`»; se vio al cerrar E1 y se corrigió con E1b |
| Antes de instalar o migrar sobre archivos reales del propietario, ensayar en un laboratorio con HOME falso: copias de los archivos del agente (rutas a `~/.forge614` reescritas), el binario real, y actualización, plan, apply y verify tal cual; el prompt lleva las escrituras esperadas y se detiene si difieren. El laboratorio se borra al terminar (lleva copias con datos privados) | provisional | Engines E4b: con copias de `~/.claude` y `~/.codex`, 1.12.1 → 1.13.0 por `update`; plan con 2 escrituras en Claude Code (`CLAUDE.md` y borrado del archivo aparte) y 1 en Codex (`AGENTS.md`); `upToDate: true` en ambos; encontró que el bloque lleva un renglón en blanco tras la marca y un salto final |
| Antes de instalar, el laboratorio averigua cómo el instalador reemplaza el ejecutable (renombrar encima o sobrescribir en el sitio) y si el esquema de la base cambia: con renombre y mismo esquema, los servidores MCP abiertos siguen con la versión vieja y no hace falta cerrarlos antes; el prompt real fija como candado las huellas de antes (`beforeHash` del plan = huella real) y las de después medidas en el laboratorio | provisional | Engram 1.7.1 T3, laboratorio del subagente: `install.sh` copia a un archivo de paso y hace `mv -f`; 9 servidores 1.7.0 vivos; `beforeHash` del plan en el HOME falso = huellas reales de `CLAUDE.md` y `AGENTS.md` |
| El candado de huellas de un archivo que el propio asistente reescribe (`~/.claude/settings.json`, `~/.claude.json`: modelo elegido, cachés de uso) no se compara entero: se comparan solo las claves de Forge614 (servidores MCP, ganchos, valores con `forge614`) contra el respaldo | provisional | Engram 1.7.1 T3: las huellas de `settings.json` y `.claude.json` cambiaron entre fase 1 y fase 2 porque la sesión nueva guardó `model` y el razonamiento y Claude Code actualizó cachés; la instalación no los tocó (0 claves de Forge614 distintas); el agente se detuvo a reportarlo sin deshacer nada |
| Un laboratorio que redirige la memoria con `FORGE614_HOME` se prueba primero con una base «rota» (la base es una carpeta): si el asistente responde `DATABASE_PATH_UNSAFE`, usa el laboratorio; si responde con recuerdos, usa la base real. Codex no pasa las variables del entorno a sus servidores MCP: se le da explícita (`-c "mcp_servers.<servidor>.env={…}"`) | provisional | Revalidación de la matriz, laboratorio del orquestador: Claude Code heredó la variable en el MCP y en el gancho; Codex la heredó en el gancho pero su MCP leyó la base real (solo lectura, sin daño); con la variable explícita, aislado |
| Un laboratorio con la memoria copiada no queda del todo aislado si el asistente corre en la carpeta real de un repositorio: el arranque de Engram escribe la identidad del proyecto en `.forge614/project.json`. En la copia no se renombra nada y se compara `git status` antes y después | provisional | Revalidación de la matriz, laboratorio del orquestador: el nombre «forge614-ai-laboratorio», puesto solo en la copia, llegó a `.forge614/project.json` real; la base real no cambió; deshecho con `git checkout` |
| Una prueba de conducta copia **al pie de la letra** las condiciones del punto del checklist (por ejemplo «sin `topicKey`») y se comprueba en el código del servicio qué dispara el aviso que prueba; la tarea de prueba tiene que ser real (sin archivos que no existen) y un secreto demasiado obvio hace que el asistente se niegue antes de llamar al servicio | provisional | Revalidación R1: P8 no ejercitó `similar` (solo salta sin `topicKey` y con semejanza ≥ 0,25), P6 no ejercitó `SECRET_REJECTED` («password: …» explícito) y P5 pidió leer un README que no existía; 3 pruebas a repetir (R1b) |
| Las pruebas que escriben en una memoria compartida van en una copia limpia por asistente: Engram no borra y la segunda prueba ve lo que dejó la primera | provisional | Revalidación R1: P7 de Codex encontró la regla que Claude Code ya había subido y no la repitió; se rehízo en una copia limpia |
| Un prompt de prueba de conducta no limita el largo de la respuesta («en una línea», «breve»): un asistente obediente recorta los avisos que el manual pide dar y la prueba mide la obediencia al límite, no al manual | provisional | Engram 1.7.1 T4: con «dime en una línea…», Codex no mencionó la sesión que quedó abierta (0 de 5); sin esa frase, la mencionó 2 de 2. Claude Code ignoró el límite |
| Una prueba de conducta que falla o sale al límite se repite al menos 3 veces antes de decidir: con una corrida no se sabe si es azar o regla | provisional | Engram 1.7.1 T4: S1-b de Claude Code falló, pasó y volvió a fallar (1 de 3); el subagente la había calificado «aprobado con reserva» |
| Si la evidencia real del gancho cambia durante un laboratorio, antes de culpar al laboratorio se cruzan su hora con los procesos abiertos (`ps -Ao pid,lstart,command`): el propietario puede abrir sesiones mientras tanto | provisional | Engram 1.7.1 T4: `claude-code.json` y `codex.json` cambiaron 1 s y 3 s después de que arrancaran una sesión interactiva y un `codex exec` (high, con escritura) ajenos al laboratorio |
| Antes de publicar una versión que cambia una frase del manual, se ensaya la frase en el laboratorio con un `AGENTS.md` y un `CLAUDE.md` en la carpeta del proyecto de prueba («this sentence replaces…»), sin tocar los archivos reales ni el binario; se prueban 2–3 redacciones con 2–3 corridas cada una | provisional | Engram 1.7.2: el ensayo mostró en 20 minutos que la frase nueva arregla a Claude Code (2 de 2) pero no a Codex (3 de 7), antes de gastar una versión |
| En una prueba de conducta de sesiones, los resúmenes y sesiones de preparación son neutros: el goal no delata la prueba (nada de «medir si la mencionan») y la sesión en paralelo se abre por la CLI, sin contenido, cuando lo medido es la siguiente respuesta; el brazo de control se corre con la misma preparación, en la misma tanda | provisional | Engram 1.7.2, experimento para Codex: el control del subagente (la sesión en paralelo la abrió Codex y el resumen decía «medir si -b y -c la mencionan») dio 3 de 3; el del orquestador, con la paralela abierta por la CLI, 0 de 3; con el aviso nuevo, 8 de 8 |
| En `claude -p`, `--allowedTools` no restringe las herramientas: para limitar se usa `--disallowedTools` o `--tools` | provisional | Revalidación R1: con `--allowedTools mcp__forge614-engram`, Claude Code corrió `Bash` de solo lectura en P5 |
| El modelo de las pruebas se lee del archivo del día (`~/.forge614/shell/preferences.json`), no de una nota vieja | provisional | Revalidación R1: el plan dijo `sonnet` por la mejora 7 de Shell; el archivo decía `opus` · `high` |
| Una prueba de varias vueltas con `claude -p --input-format stream-json` manda el siguiente mensaje solo después del evento `result` del anterior; si se mandan juntos, el asistente los atiende como uno | provisional | Revalidación R1b: P8′ de Claude Code recibió los dos mensajes juntos y guardó uno solo; repetida por turnos (`turnos.py` en el plan), se ejercitó `similar` y pasó |
| Después de entregar un prompt que fija el último commit, el orquestador no hace commits en esa rama hasta recibir el reporte (o el prompt fija solo la huella del plan) | provisional | Revalidación R1b: el commit `662d741` de la guía movió el último commit; la sesión se detuvo con razón y hubo que autorizarla (1 ronda ≈ $0,1) |
| La comprobación «0 recuerdos de prueba en la base real» excluye los que guarda la propia sesión sobre su resultado (mencionan la marca) | provisional | Revalidación R1b: 2 coincidencias en la base real eran el resultado y el resumen de la sesión R1b, sin datos de prueba |
| Todo script que el plan usa para verificar se escribe dentro del plan, no solo en el scratchpad | provisional | `bloque.py` del plan E4b vivía solo en el scratchpad de otra sesión y se perdió; hubo que reescribirlo para la revalidación |
| Al subir la versión del reglamento, la versión de `forge614.node.json` se cambia a mano: `standard:pack -- --update-pointer` solo escribe la huella, y `verify` pasa aunque el puntero diga la versión vieja | provisional | Reglamento 1.1.1: el borrador del subagente dejó el puntero en 1.1.0 con la huella nueva, `verify` 0 con `"standard":"1.1.1"`, y el subagente reportó que «quedó en 1.1.1»; atrapado al leer el diff |
| En una prueba, el reloj se congela (`setSystemTime`) solo desde el paso que lo necesita: congelado desde el inicio, los guardados empatan en `updated_at`, el desempate por id es al azar y la prueba falla a veces; se corre la suite varias veces antes de entregar | provisional (2 muestras) | Engram T8 (D-T8-6): `startup.test.ts` fallaba ~1 de 3; Engram 1.7.1 T1: el borrador del subagente congeló el reloj desde el inicio y la misma prueba falló 2 de 3 corridas; con el reloj congelado desde la sesión, 0 de 10 y la suite 6 de 6 |
| Las anclas de reemplazo del plan se citan completas, nunca recortadas con «…» | provisional | Engram T6: un ancla de `commands.ts` terminaba en «…»; el agente la resolvió uniendo dos líneas (sin error, pero lo tuvo que deducir) |
| Cuando el plan le pone algo a una pieza reutilizada (una descripción, un límite, un valor por defecto), listar **todos** los campos que usan esa pieza y comprobar que les sirve a cada uno | provisional | Engram T7: la descripción «id de recuerdo» puesta en la pieza `id` pasó también a `sessionProjectId`, que es un id de proyecto; las pruebas no lo vieron y la revisión sí (se corrige en T8) |

## 4b. Documentación

| Regla | Estado | Evidencia |
|---|---|---|
| **Documentación tarea por tarea:** al terminar cada tarea, un prompt aparte (etiqueta `· docs`, **sesión nueva**, medido por separado; los textos exactos van en el plan, redactados contra los capítulos reales y simulados en una copia) actualiza en un commit propio los documentos que describen lo que cambió (es/en), el CHANGELOG y el mapa de Notion; el orquestador verifica en cada revisión que código, pruebas y documentación coincidan, porque la documentación es la fuente de verdad después del código | firme (regla del propietario) | decisión del propietario, 2026-09-24; primer caso: Engram 1.7.0 T1 encontró que el capítulo 05 ya decía una versión equivocada de la réplica. Sesión nueva en vez de la misma (provisional): T1 docs misma sesión ≈ $1 por ronda; T3 docs sesión nueva Sonnet low 0,48 M tokens ≈ $0,28, a la primera |
| En los prompts de documentación, exigir que cada frase se compruebe en el código del commit y que un dato del plan que no coincida no se escriba y se reporte | provisional | Engram T7 docs: el plan decía que las versiones 1 a 3 del protocolo anuncian el formato 1; el agente vio en el código que la 1 no anuncia nada, escribió lo correcto y lo reportó (0 rondas extra) |
| Una página para que el propietario lea o imprima no la redacta el orquestador de memoria: entrega un prompt de docs para una sesión nueva en el repositorio dueño, con sus preferencias (sin fondos de color ni toggles, solo el tema de la página, cada comando con qué hace, para qué sirve y un ejemplo, cada dato comprobado en el código o en `--help`) | provisional (2 muestras) | 2026-09-25: la página «Engram 1.7.0 — Qué cambió» hecha por el orquestador desde el CHANGELOG tuvo 4 correcciones del propietario y terminó delegada; la sesión de docs en `forge614-engram` (Sonnet medium) la rehízo a la primera, 1,89 M tokens ≈ $1,24 en 4 min, sin datos falsos, y reportó 3 que no pudo comprobar |
| Leer qué corre la CI (`verify.yml`, `release.yml`) y qué verificadores del repositorio quedan fuera; el prompt ordena correrlos a mano y avisa, con ejemplo probado en una copia, cada regla del verificador que un texto nuevo pueda romper | provisional | Engines E3: `verify:docs` (fuera de la CI) toma todo texto en MAYÚSCULAS entre comillas invertidas como código de error del CLI; `INVALID_INPUT` con comillas falló en la copia. Avisado en el prompt: E3 a la primera, `verify:docs` en 0 |
| **Checklist de agentes tarea por tarea (acta 0017):** al cerrar cada tarea (código + documentación), el orquestador revisa `standard/procedures/new-agent-checklist.md` (sección del nodo que cambió y las de Engines y Shell si consumen lo cambiado) y decide si hay un requisito nuevo para los asistentes; si lo hay, redacta el punto con su verificación; si no, anota el motivo. Los cambios se acumulan y se publican juntos en la siguiente versión del reglamento, para revalidar la matriz de soporte una sola vez | firme (regla del propietario) | decisión del propietario, 2026-09-24 |

## 5. Medición

**Rondas en «Corridas de agentes»** (regla del propietario, 2026-09-26, versión corregida): una fila por ronda con la misma Etiqueta; cada fila describe lo que pasó en su propia ronda. Si la ronda falló, se detuvo o hubo que corregirla después, esa fila lleva «Origen de la corrección» (plan o prompt del orquestador · revisión del orquestador · worker o agente · entorno o herramienta · otro nodo de Forge614 · cambio de pedido del propietario), «Detectado por» (el propio agente · orquestador · pruebas · Sentinel · propietario; si lo encontró el propietario, «propietario») y «Tipo de falla» si el agente se equivocó. Si la ronda salió bien, «Origen de la corrección» = «ninguna». Al cerrar la tarea, «Rondas de corrección» (total de correcciones) queda igual en todas sus filas y «Aprobada a la primera» es verdadero solo si hubo una única ronda (si hubo más, falso en todas). «Causa de corrección» se sigue llenando. **Las anotaciones de Notion las hace un subagente Haiku** con los datos ya medidos por el orquestador (decisión del propietario, 2026-09-26): los esquemas de las herramientas de Notion pesan ~48K y no deben entrar al contexto del orquestador. El modo SQL de la consulta de Notion tiene un tope de uso compartido del plan (el 2026-09-26 se agotó tras ~6 consultas): para leer filas se usa el modo `rows` o `fetch` de la página.

- **Fuente única: el registro de la herramienta**, nunca el reporte de la IA.
  - Claude Code: `~/.claude/projects/<carpeta>/<sesión>.jsonl` — por mensaje: `message.model`, `usage` (`input_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, `output_tokens`, `output_tokens_details.thinking_tokens`), `effort`, `tool_use` con nombre (incluye `mcp__*` y `Skill`).
  - Codex: `~/.codex/sessions/AAAA/MM/DD/rollout-*.jsonl` — `session_meta` (cwd, versión), `turn_context` (`model`, `reasoning_effort`), `event_msg`/`token_count` acumulado (entrada, caché, salida, razonamiento, total) y `rate_limits.primary.used_percent` (límite semanal).
- **Exacto:** tokens, modelo, razonamiento, horas, mensajes, herramientas y tamaño de sus resultados. **Estimado (marcado):** tokens atribuidos a una herramienta concreta. **Sin registro:** "no medido".
- **Comportamiento medido en cada corrida:** archivos que tocó fuera del plan y acciones no pedidas (comparando el commit con la lista del plan, en solo lectura, y las ediciones del registro), paradas correctas ante fallos, si respetó el formato del reporte y su largo en caracteres. Con esto se decide, por modelo y razonamiento, qué hay que pedir o prohibir explícitamente (por ejemplo "no documentes todavía").
- **Métrica principal:** tokens por tarea aprobada, sumando las rondas de corrección. Una conclusión del tipo "X es mejor para Y" exige ≥ 3 tareas comparables del mismo tipo; se cambia una sola variable a la vez.

| Regla | Estado | Evidencia |
|---|---|---|
| Cuando el propietario prueba a mano, se le piden capturas; el orquestador se las traduce en palabras llanas y confirma cada resultado en los registros (`hook-evidence`, transcripciones de Claude Code, `rollout-*.jsonl` de Codex) antes de darlo por aprobado | provisional | Revalidación R2: 6 pruebas aprobadas, cada una con su registro; el «sí jalaron» de Codex se confirmó en 2 registros de Shell con el bloque y los fijados `shared`; de paso salieron 4 fallos de Shell |
| Para ahorrar, bajar rondas de corrección, dar archivos exactos y pedir reportes cortos; acortar el prompt casi no mueve el costo | provisional | salida = 0,6–0,7 % del total (Codex 01a0d44c; Sentinel 0.1.1) |
| **Medir también al orquestador**, no solo al agente: su costo por tarea domina cuando su contexto es grande | provisional | Engram T3: agentes $0,59 + $0,28, subagente de borrador $0,81, orquestador $8,49 (≈ 85–90 %); ~310K → 430K tokens releídos por mensaje |
| Delegar la redacción y el laboratorio a un subagente de contexto limpio (Sonnet) y revisar su resultado; **el orquestador rehace los cambios en una copia limpia y entrega un parche** con su SHA-256, nunca el borrador tal cual | **firme** (5 muestras) | Engram 1.7.1 T1: borrador con TDD en 21 min, 18,6 M tokens ≈ $4,23, «en verde» con una prueba que fallaba 2 de 3 corridas y dos comentarios desactualizados, atrapados al revisar y correr la suite varias veces. Engines 1.13.0: parches E1 y E2 «en verde» del subagente; la revisión línea por línea encontró que `verify` sugería reinstalar aunque la instalación estaría bloqueada; el orquestador lo corrigió con su prueba en una copia limpia y rehízo el parche (421 y 432 pruebas medidas). Engram T3 docs: borrador en 4,9 min ≈ $0,81 con 1 contradicción y 2 detalles corregidos en la revisión. Reglamento 1.1.0: borrador + laboratorio en 6,7 min ≈ $1,25, reportado «en verde» pero con 4 errores atrapados al leer su diff (matriz reescrita con otra sangría, `sed` sin `g`, orden de comandos que fallaba, texto del acta ausente) y 1 decisión de alcance corregida. Reglamento 1.1.1: borrador + laboratorio en 10,5 min, 9,44 M tokens ≈ $2,6 (razonamiento high heredado), «en verde» pero con 5 errores atrapados en la revisión (versión del puntero, secciones mal citadas en el acta, una frase que afirmaba más de lo medido, una palabra equivocada en la receta y «este acta») |
| Un subagente para un trabajo abierto ("ajusta las pruebas que fallen") cuesta mucho más que uno de redacción: acotarlo con la lista exacta de pruebas y medirlo **en su registro**, no con el total que devuelve la herramienta | provisional (2 muestras) | Engram T8: el subagente que ajustó 21 pruebas hizo 165 mensajes con razonamiento high heredado: 34 M tokens ≈ $8 (la herramienta informó 0,31 M); el trabajo salió bien y atrapó un fallo real. Engines 1.13.0: el laboratorio que escribió E1 y E2 con TDD (394 → 431 pruebas) y recibió una decisión nueva a mitad de tarea hizo 214 mensajes, 47,9 M tokens ≈ $11 en 38 min |
| Si el laboratorio escribe código nuevo con TDD (no solo simula un plan ya escrito): un subagente por tarea, con todas las decisiones cerradas antes de lanzarlo, y comparar su costo con dejar la TDD a la sesión del repositorio (Sonnet medium, $0,3–0,7 por tarea) | provisional | Engines 1.13.0: ver la fila anterior |
| Todo parche que va a un archivo se genera con `rtk proxy git diff` (`rtk git diff` guarda un resumen) y se prueba con `git apply --check` en una copia nueva | provisional | Engines 1.13.0: el primer `e1.patch` salió como resumen y no aplicaba; el subagente lo notó solo |
| Plan con solo pruebas y contratos, sin laboratorio (el worker implementa) | provisional (1 muestra) | Engram T4 (Codex medium): 2 rondas (1 por error del agente, 2 fallos del plan atrapados en la revisión), 3,77 M tokens, 2 % del límite semanal; T2 con código completo: 4,58 M, 1 ronda. Costo del orquestador sin laboratorio claramente menor que en T3 y T5 |
| Costo = precios de Notion "Precios de modelos" (por fecha); en Codex con suscripción, el costo se mide como % del límite semanal | firme (regla del propietario) | decisión del propietario, 2026-09-24 |
| **Punto de traspaso por tipo de sesión:** orquestador Opus en ~300K (el costo por mensaje útil es casi igual entre 300K y 500K: $0,143 a 300K, $0,134 a 400K, $0,138 a 500K; subir el umbral casi no ahorra y alarga el contexto); sesiones de trabajo largas, la misma regla; Codex en ~200K (su ventana real es 258 400 tokens y por encima de 272 000 su precio se duplica, según models.dev) | provisional (1 estudio) | Estudio del 2026-09-25 sobre 1 116 registros de Claude Code y 206 de Codex (solo lectura, subagente Sonnet 49 mensajes ≈ $1,27; informe y scripts en el scratchpad de esa sesión): 12 sesiones de orquestador; 53 de 206 sesiones de Codex pasaron del 80 % de su ventana |
| El traspaso cuesta ≈ $2,8 y deja al orquestador nuevo en ≈ 169K tokens antes de su primer prompt: el prompt de traspaso manda leer solo lo necesario (secciones, no archivos enteros; nada que ya esté en el resumen de Engram) | provisional (1 estudio, 4 traspasos) | mismo estudio: arranque promedio H ≈ $2,77, C0 ≈ 169K |
| Las recargas de caché por ausencia pesan poco en el orquestador (≈ 6 % de su costo; 74 % de los mensajes ya usan la caché de 1 h); lo que más gasta son sesiones muy largas nunca traspasadas | provisional (1 estudio) | mismo estudio: recargas por ausencia $428 de $5 455 en total; las 5 sesiones más largas sin traspaso (682–1 487 mensajes, 440–533K sostenidos) suman $637 (11,7 % de todo el gasto) |

El programa de medición (Claude Code) está en el apéndice A; uso: `python3 medir.py <registro .jsonl> "<etiqueta del prompt>"`. Mide desde el primer mensaje del usuario que contiene la etiqueta hasta el final del registro.

## 6. Elección de modelo y razonamiento

Punto de partida (se ajusta solo con datos de "Corridas de agentes"):

**Variar los modelos** (regla del propietario, 2026-09-26): la tabla es un punto de partida, no una receta. Al elegir modelo, el orquestador rota entre herramientas (Claude Code, Codex, OpenCode), modelos y razonamientos, cambiando **una sola cosa** respecto a la corrida comparable y anotándola en «Variable de experimento». Un modelo sin datos empieza por tareas de bajo riesgo (aplicar un parche probado, publicar, borrador de laboratorio en el scratchpad), siempre con la verificación completa; nunca con datos reales del propietario ni en pruebas de conducta hasta tener corridas limpias. Cada modelo nuevo se agrega como opción de «Modelo» en Notion.

| Tipo de tarea | Recomendado | Estado |
|---|---|---|
| Migración de datos o cambios con riesgo sobre datos reales | Opus · high, en dos fases con parada para que el propietario apruebe entre plan y aplicación | **firme** (3 corridas; tercera: Engram 1.7.1 T3, instalación de 1.7.1 y manual v4 nuevo en Claude Code y Codex, ensayada en laboratorio con HOME falso, 1,45 M ≈ $1,15 en 9 min, a la primera, parada correcta hasta «aplica», huellas finales = laboratorio; Engram T10b, activación del esquema 11 en la base real, 1,14 M tokens ≈ $0,84 en 8,4 min, a la primera, 1 parada correcta ante procesos viejos, 0 filas cambiadas; Engines E4b, instalación de 1.13.0 y migración del manual en Claude Code y Codex, ensayada antes en laboratorio con HOME falso, 0,54 M ≈ $0,67 en 4 min, a la primera, parada correcta hasta «aplica») |
| Laboratorio de instalación con HOME falso (subagente de contexto limpio con pasos y valores esperados cerrados) | Sonnet (subagente del orquestador) | provisional (1 corrida: Engram 1.7.1 T3, 12 pasos, 1,84 M tokens ≈ $0,54 en 3 min, todo cuadró; el orquestador repitió lo clave en 3 comandos) |
| Código + pruebas con plan preciso | Sonnet · medium con parche o plan probado en laboratorio | **firme** (séptima: Engram 1.7.1 T1 con parche por `git apply`, 0,28 M ≈ $0,23 en 2 min, a la primera; 3 corridas Sonnet medium a la primera: Engram T7 con laboratorio, 0,63 M ≈ $0,39; T8 con parche por `git apply`, 0,42 M ≈ $0,27; T9b con parche, 0,31 M ≈ $0,23 en 4,1 min; cuarta: Reglamento 1.1.0 R1 con parche, 0,61 M ≈ $0,31 en 2 rondas, la segunda por error del plan, `dist/` ignorado; quinta: Engines E1 con parche desde forge614-shell, 0,32 M ≈ $0,23 en menos de 1 min, a la primera; sexta: Engines E1b+E2, dos parches en dos commits en una sesión, 0,37 M ≈ $0,22 en 1,5 min, a la primera; séptima: Reglamento 1.1.1 R1, 0,46 M ≈ $0,27 en menos de 1 min, a la primera, con `dist/` regenerado como paso del plan). Codex · medium: 2 corridas (Engram 1.7.2 T1, gpt-5.6-terra, parche por `git apply`, 0,67 M tokens en 2,3 min, a la primera, guardó en Engram un recuerdo de progreso que el manual pide no guardar; Engram T2, 4,58 M tokens, 1 ronda por error del plan) |
| Algoritmos con muchos casos borde, plan probado en laboratorio | Sonnet · high | provisional (2 corridas: Engram T3, 1,09 M tokens ≈ $0,59, 0 rondas; Engram T6, 0,96 M tokens ≈ $0,56, 0 rondas, commit idéntico al laboratorio) |
| Documentación, versión, publicación | Sonnet · low | **firme** (3 corridas; séptima: Engram 1.7.1 T2 publicación, PR + CI + rebase + tag + release, 0,52 M ≈ $0,27 en 13 min, a la primera; sexta: Engram 1.7.1 T1 docs con parche de dos commits por `git am`, 0,27 M ≈ $0,19, a la primera; quinta: Reglamento 1.1.1 R2, publicación a la primera, 0,55 M ≈ $0,26 en 12 min; cuarta: Engines E4a, PR + CI + fusión + `bun run release` desde `main`, 0,60 M ≈ $0,32 en 13 min, a la primera; Reglamento 1.1.0 R2, publicación a la primera, 0,48 M ≈ $0,24 en 12 min; antes: Engram T3 docs, 0,48 M tokens ≈ $0,28, 0 rondas; Engram T10a publicación, 0,98 M ≈ $0,43 en 2 rondas, se detuvo bien ante el CI rojo y la ronda 2 fue por error del plan; Engram T2 docs se hizo con Codex medium: 0,44 M tokens en 2 rondas, una por error del prompt) |
| Documentación redactada por el agente a partir de datos verificados y lugares exactos | Sonnet · medium | **firme** (3 corridas, todas a la primera: Engram T4 docs, 1,08 M tokens ≈ $0,74; T7 docs, 1,43 M ≈ $0,68, atrapó un dato falso del plan; T8 docs + versión, 22 archivos, 1,36 M ≈ $0,76 en 3,1 min; cuarta: página de Notion de Engram 1.7.0 desde forge614-shell, 1,89 M ≈ $1,24 en 4 min, a la primera; quinta: Engines E3, 4 capítulos es/en desde forge614-shell, 1,49 M ≈ $0,72 en 2 min, a la primera, con 1 imprecisión menor corregida por el orquestador) |
| Migración con riesgo (referencia) | Opus · xhigh por error (se pidió high): Engram T1, 22,7 M tokens ≈ $10,47, 3 rondas (todas error del plan) | 1 corrida |
| Batería de pruebas de conducta de asistentes en laboratorio (lanza Claude Code y Codex sin pantalla) | Sonnet · high (batería completa) o medium (repetición acotada) | provisional (2 corridas: cuarta: experimento de Engram 1.7.2, subagente Sonnet con parche TDD, binario compilado y 9 ciclos en 3 brazos, 10,26 M ≈ $2,44 en 27 min más $0,37 de Opus y 18 turnos de Codex, aislamiento completo; su brazo de control quedó sesgado por la preparación y el orquestador lo repitió (0 de 3 frente a 3 de 3); tercera: Engram 1.7.1 T4 como subagente Sonnet del orquestador, 5 pruebas en 2 asistentes, 5,47 M ≈ $1,42 en 15 min más $1,20 de corridas en Opus, con aislamiento completo, pero calificó con indulgencia una falla y no notó el sesgo del prompt; el orquestador repitió con un script propio ($1,93); Revalidación R1b, Sonnet medium, 3 pruebas × 2 asistentes, 4,03 M ≈ $1,67 más $1,39 de corridas en Opus, parada correcta al inicio; R1: Revalidación R1, 11 pruebas × 2 asistentes, 11,75 M tokens ≈ $4,27 en 28 min, más $1,87 de corridas de Claude Code y 1,52 M tokens de Codex; aislamiento perfecto y 9 desviaciones bien reportadas; 3 pruebas a repetir por error del plan; el orquestador estimó $2,5–4,5 y fue ≈ $6,1) |
| Revisión independiente de una rama | otro proveedor · high | provisional (1 corrida: Engram T9, Codex gpt-5.6-terra high, 108 archivos en ≈ 14 min, 4,25 M tokens, límite semanal 5 % → 5 %, 1 hallazgo real que las pruebas no cubrían, 0 falsos) |
| Ejecución de un plan ya escrito (referencia) | Sonnet · high: Sentinel 0.1.1, 8,86 M tokens, 3 rondas (todas error del plan) | 1 corrida |

## 7. Registro de cambios de esta guía

- 2026-09-26 — Experimento de Engram 1.7.2: preparación neutra y control en la misma tanda en pruebas de sesiones (§4); cuarta batería (§6).
- 2026-09-26 — Ensayar una frase nueva del manual con archivos de instrucciones del proyecto antes de publicar (§4).
- 2026-09-26 — Engram 1.7.1 T4: pruebas de conducta sin límite de largo, repetir 3 veces antes de decidir y cruzar la evidencia del gancho con los procesos (§4); tercera batería (§6).
- 2026-09-26 — Regla del propietario: variar herramientas, modelos y razonamientos de los workers, una variable a la vez (§6).
- 2026-09-26 — Engram 1.7.1 publicado: séptima corrida de parche en Sonnet medium, sexta y séptima de documentación y publicación en Sonnet low (§6).
- 2026-09-25 — Engram 1.7.1 T1 y T1 docs: el traspaso dice si cada prompt entregado se pegó y corrió (§1.6); sexta muestra del subagente de borrador, esta vez de documentación (Notion «Lecciones»).
- 2026-09-25 — Plan de Engram 1.7.1: reloj congelado solo desde donde hace falta (§4), quinta muestra del subagente de borrador (§5), estudio del punto de traspaso por tipo de sesión y medir el propio contexto en el registro (§1.6, §5, apéndice B).
- 2026-09-25 — Reglamento 1.1.1 publicado: séptima corrida de parche en Sonnet medium y quinta de publicación en Sonnet low (§6).
- 2026-09-25 — Reglamento 1.1.1 (R3): la versión del puntero se cambia a mano (§4); cuarta muestra del subagente de borrador (§5).
- 2026-09-25 — Revalidación R2: pruebas a mano del propietario con capturas verificadas en los registros (§5).
- 2026-09-25 — Revalidación R1b: pruebas de varias vueltas por turnos, sin commits en la rama tras entregar un prompt, recuento de la base real sin lo que guarda la sesión (§4); segunda batería (§6).
- 2026-09-25 — Revalidación R1: pruebas de conducta al pie de la letra del checklist, copia por asistente, `--disallowedTools` y modelo del archivo del día (§4); primera batería en laboratorio (§6).
- 2026-09-25 — Plan de revalidación de la matriz: laboratorio de memoria con base «rota» como guarda y variable explícita para el MCP de Codex; los scripts de verificación van dentro del plan (§4).
- 2026-09-25 — Engines E4b: segunda corrida con datos reales en Opus high, en dos fases con aprobación del propietario (§6).
- 2026-09-25 — Engines E4a: cuarta corrida de publicación en Sonnet low (§6); laboratorio con HOME falso antes de instalar en la Mac (§4).
- 2026-09-25 — Engines E3: verificadores fuera de la CI (§4b) y quinta corrida de documentación redactada por el agente (§6).
- 2026-09-25 — Engines E1b+E2: sexta corrida de parche en Sonnet medium, dos parches en una sesión (§6).
- 2026-09-25 — Engines E1: verificaciones literales del checklist en el laboratorio (§4) y quinta corrida de parche en Sonnet medium (§6).
- 2026-09-25 — Plan de Engines 1.13.0: revisar y rehacer el trabajo del subagente pasa a firme; costo de un laboratorio con TDD completo y parches con `rtk proxy git diff` (§5).
- 2026-09-25 — Página de Notion de Engram 1.7.0 hecha por una sesión de docs a la primera (§4b, §6); la línea «Pégalo en» dice en qué carpeta abrir la sesión (§2).
- 2026-09-25 — Documentación, versión y publicación en Sonnet low pasa a firme (§6, Reglamento R2).
- 2026-09-25 — Las páginas para el propietario van a una sesión de docs en el repositorio dueño (§4b).
- 2026-09-25 — Lección de Reglamento R1: el laboratorio de `git archive` no ve lo que Git ignora (§4); cuarta corrida de parche en Sonnet medium (§6).
- 2026-09-25 — Segunda muestra del subagente de borrador y laboratorio: el orquestador rehace y entrega un parche (§5).
- 2026-09-25 — Lecciones de Engram T10b: el prompt no quita pasos del plan (§2), comandos sobre datos reales probados antes en una copia (§4), segunda muestra del control de procesos (§4) y primera corrida con datos reales (§6).
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

## Apéndice B. Costo y contexto de una sesión (Claude Code)

Uso: `python3 costo.py <registro .jsonl>`. Precios del 2026-09-25 (models.dev y Notion «Precios de modelos»); la escritura de caché distingue 5 min y 1 h. «contexto max» es lo que relee el mensaje más grande: es el número del traspaso (§1.6).

```python
import json,sys,collections
# precios USD/M: entrada, lectura caché, escritura 5m, escritura 1h, salida
P={"opus":(4,0.2,5,8,20),"sonnet":(2,0.2,2.5,4,10)}
path=sys.argv[1]; seen=set(); u=collections.Counter(); msgs=0; t0=t1=None; cost=0; models=collections.Counter(); maxctx=0
for line in open(path):
    o=json.loads(line)
    if o.get("type")!="assistant": continue
    m=o["message"]; mid=m.get("id")
    if mid in seen: continue
    seen.add(mid); msgs+=1; t=o.get("timestamp"); t0=t0 or t; t1=t
    mod=m.get("model",""); models[mod]+=1; p=P["opus" if "opus" in mod else "sonnet"]
    us=m.get("usage",{}); cc=us.get("cache_creation") or {}
    i=us.get("input_tokens",0) or 0; r=us.get("cache_read_input_tokens",0) or 0; w=us.get("cache_creation_input_tokens",0) or 0; out=us.get("output_tokens",0) or 0
    w1=cc.get("ephemeral_1h_input_tokens",0) or 0; w5=w-w1
    cost+=(i*p[0]+r*p[1]+w5*p[2]+w1*p[3]+out*p[4])/1e6
    u["in"]+=i;u["read"]+=r;u["write"]+=w;u["out"]+=out; maxctx=max(maxctx,i+r+w)
print(dict(models),"mensajes",msgs,"inicio",t0,"fin",t1)
print("tokens",dict(u),"total",sum(u.values()),"contexto max",maxctx,"costo $%.2f"%cost)
```
