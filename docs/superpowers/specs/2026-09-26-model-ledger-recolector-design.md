# model-ledger · etapa 1: recolector de datos de modelos — diseño

- **Fecha:** 2026-09-26
- **Estado:** borrador para revisión del propietario
- **Memoria relacionada en Engram:** `84b3c010` (decisiones), `83f14077` (columnas de Notion), `1d00881a` (fuentes públicas)

## 1. Para qué existe

El propietario quiere saber, **con datos medidos y contables, nunca supuestos**, qué modelo y con qué nivel de razonamiento conviene usar para cada tipo de tarea (bug, feature, revisión, etc.). Quiere saberlo trabaje con Claude Code, Codex u OpenCode, y en cualquiera de sus proyectos. Con esos datos se construirán más adelante perfiles de elección (calidad, economía, balance) y lecciones para que los orquestadores aprendan cómo pedir y qué falla.

Esta **etapa 1 solo recolecta**. Junta datos buenos en una base de datos desde hoy, para que cuando se construya el proyecto completo (monorepo, monitor y fórmulas) ya existan semanas de historia real.

## 2. Decisiones del propietario (vigentes)

1. Proyecto **aparte**, fuera de los nodos de Forge614, en su propio repositorio `model-ledger`. El nombre puede cambiar antes de crear el repositorio.
2. **Solo recolectar:** sin página web, sin API pública, sin monitor y sin fórmulas en esta etapa.
3. Base de datos: la **Neon (PostgreSQL)** del propietario, vacía y de pruebas, dedicada completa a esto.
4. Los datos vienen **solo de los proyectos y computadoras del propietario**. No hay emisores de terceros.
5. **Notion «Forge614 · Laboratorio de agentes» se sigue usando** además de Neon.
6. Qué se guarda:
   - **siempre**, los números;
   - el **texto útil** (prompt, reporte final, notas), pasado por un limpiador de secretos.

   **Nunca** se guarda código, contenido de archivos ni registros crudos completos.
7. Si hace falta pagar una API, se paga.
8. **Sin pruebas automáticas por ahora.** Se mantiene la revisión de tipos (typecheck) y un comando de verificación manual (sección 9).
9. Los secretos van en un archivo `.env` del propietario.

## 3. Qué recolecta y de dónde

| Fuente | Qué aporta | Frecuencia | Dónde corre |
|---|---|---|---|
| **Artificial Analysis** (API gratis) | Notas de inteligencia, código y matemáticas por modelo; puntaje por prueba; velocidad; precio | 1 vez al día | GitHub Actions (tarea programada) |
| **models.dev** (JSON público) | Catálogo de modelos: proveedor, contexto, salida máxima, si razona, si usa herramientas, pesos abiertos, fecha de lanzamiento y precio | 1 vez al día | GitHub Actions |
| **Registros de Claude Code** (`~/.claude/projects/**/*.jsonl`, subagentes incluidos) | Por sesión: modelo, versión, carpeta y rama, horas, mensajes, tokens de cada tipo, llamadas a herramientas y a MCP, compactaciones, primer prompt y reporte final | Cada hora | Mac del propietario (launchd) |
| **Registros de Codex** (`~/.codex/sessions/**/rollout-*.jsonl`) | Lo mismo, más el razonamiento por turno y el % de límite usado del plan | Cada hora | Mac (launchd) |
| **Sesiones de OpenCode** (`~/.local/share/opencode/opencode.db`, o `opencode export`) | Lo mismo para OpenCode, incluido el costo real si es de pago por uso | Cada hora | Mac (launchd) |
| **Notion «Corridas de agentes» y «Lecciones de orquestación»** | Lo que solo sabe el orquestador o el propietario: categoría, dificultad prevista, resultado, rondas, origen de la corrección, quién la detectó, tipo de falla, pruebas, minutos humanos y lecciones | Cada hora (solo filas editadas desde la última vez) | Mac (launchd) |

**Todos los proyectos quedan cubiertos solos.** Las tres herramientas guardan todas sus sesiones sin importar la carpeta, así que el recolector no necesita configurarse proyecto por proyecto. En otra computadora se instala el mismo recolector con el mismo `.env`.

## 4. Cómo conviven Notion y Neon

- **Los orquestadores siguen escribiendo en Notion exactamente como hoy.** Para ellos no cambia nada.
- El recolector **copia de Notion a Neon** las filas nuevas o editadas y **las enlaza** con la sesión real. El enlace se hace con la columna «Archivo de registro» o, si falta, con la herramienta, la hora de inicio y la etiqueta del prompt.
- Las **sesiones normales**, donde el propietario trabaja sin orquestador, van **solo a Neon**. Serían miles al mes y llenarían Notion de ruido.
- **Neon no escribe en Notion** en esta etapa. Si más adelante se quiere que Neon complete en Notion los números exactos, se agrega como mejora.

*Punto a confirmar por el propietario en la revisión:* ¿basta con que Notion reciba lo que anotan los orquestadores, o también quiere ver ahí las sesiones normales?

## 5. Tablas en Neon

Todas llevan `creado_en` y `actualizado_en`. Los identificadores externos son únicos, así que volver a correr el recolector no duplica nada.

### Datos públicos (fotos diarias)
- **`fotos_api`**: una fila por consulta diaria. Guarda la fuente (`artificial_analysis` o `models_dev`), `tomada_en`, estado (ok o error), la **respuesta completa en JSON** y su huella (hash). Son datos públicos, así que guardarlos completos permite reprocesarlos si luego se necesita otro campo.
- **`modelos`**: catálogo normalizado. Guarda el id `proveedor/modelo` (como en models.dev), proveedor, nombre, familia, fecha de lanzamiento, contexto, salida máxima, si razona, si usa herramientas, si tiene pesos abiertos, `visto_primero` y `visto_ultimo`.
- **`precios`**: historial. Una fila nueva **solo cuando el precio cambia**. Guarda modelo, vigente desde, entrada, salida, lectura de caché, escritura de caché y fuente.
- **`notas_benchmark`**: historial. Una fila nueva solo cuando cambia una nota. Guarda el id de Artificial Analysis, el modelo enlazado (si se pudo emparejar), la fecha, los índices de inteligencia, código y matemáticas, los puntajes por prueba (JSON), los tokens por segundo y el tiempo al primer token.

### Trabajo real
- **`sesiones`**: una fila por sesión de Claude Code, Codex u OpenCode. Guarda:
  - **identidad:** herramienta, id de sesión, si es subagente (y de qué sesión), versión de la herramienta, máquina, carpeta, repositorio remoto y rama;
  - **tiempo:** inicio, fin y minutos activos;
  - **actividad:** mensajes, llamadas a herramientas, llamadas a MCP y compactaciones;
  - **uso:** tokens de entrada nuevos, lectura de caché, escritura de caché, salida y razonamiento;
  - **costo:** costo API equivalente (con el precio vigente ese día) y costo real (solo si la herramienta lo reporta), más el % de límite del plan (solo Codex);
  - **texto limpio:** primer prompt y reporte final;
  - **control:** ruta del registro y huella del contenido leído, para saber si cambió.
- **`sesion_modelos`**: desglose de cada sesión por modelo y razonamiento, porque una sesión puede cambiar de modelo a la mitad. Guarda los tokens y mensajes de cada tramo.
- **`corridas`**: copia de «Corridas de agentes» de Notion. Tiene **todas sus columnas** (incluidas las 15 nuevas del 2026-09-26), el id de la página de Notion, la fecha de última edición en Notion y el **enlace a `sesiones`** (vacío si no se pudo emparejar).
- **`lecciones`**: copia de «Lecciones de orquestación».

### Salud del recolector
- **`ejecuciones`**: una fila por cada vez que corre un recolector. Guarda la fuente, inicio y fin, cuántos elementos leyó, cuántos eran nuevos, cuántos se actualizaron y los errores. Sirve para saber si el recolector dejó de funcionar.

## 6. Cómo corre

- **Diario (GitHub Actions, 1 vez al día):** consulta Artificial Analysis y models.dev, guarda la foto y actualiza `modelos`, `precios` y `notas_benchmark` solo donde algo cambió. Si una API falla, se anota el error en `ejecuciones` y la foto de ayer sigue válida.
- **Cada hora (launchd en la Mac):**
  1. Busca los registros nuevos o modificados de las tres herramientas. Se salta los que cambiaron en los últimos 10 minutos, porque probablemente la sesión sigue abierta; así lo hacen los scripts existentes.
  2. Extrae los números y el texto útil, los limpia y los guarda.
  3. Consulta Notion por filas editadas desde la última vez y las copia a `corridas` y `lecciones`.
  4. Anota la ejecución.
- **Solo lectura sobre las herramientas:** el recolector **nunca modifica** `~/.claude`, `~/.codex` ni los archivos de OpenCode. Las sesiones y Notion solo se leen.
- **Carga inicial:** el primer arranque lee **todo el historial** existente de las tres herramientas y todas las filas de Notion (78 corridas y 60 lecciones al 2026-09-26).

## 7. Limpieza de secretos y privacidad

- Antes de guardar cualquier texto se reemplaza por `[SECRETO]` todo lo que parezca credencial:
  - claves de API (`sk-`, `sk-ant-`, `ghp_`, `gho_`, `github_pat_`, `AKIA`, `xox`);
  - JWT;
  - cadenas de conexión con contraseña (`postgres://usuario:contraseña@`);
  - líneas `CLAVE=valor` de estilo `.env` y bloques de llave privada.
- **Solo se guardan dos textos por sesión:** el primer mensaje del usuario (el prompt) y el último mensaje del agente (el reporte). Nunca se guardan resultados de herramientas, contenido de archivos ni lo que el agente leyó.
- Tope de 20 000 caracteres por texto. Si es más largo, se recorta y se marca como recortado.
- Del código solo se guarda **dónde está**: repositorio y commit, cuando aparecen en el registro o en Notion.

## 8. Configuración (`.env`)

El archivo vive en la carpeta del proyecto, está en `.gitignore` y tiene permisos `600`, así que solo el propietario lo lee:

```
NEON_DATABASE_URL=...            # cadena de conexión de Neon
NOTION_TOKEN=...                 # llave de una integración de Notion con acceso al Laboratorio
NOTION_CORRIDAS_ID=3c6f115453ec4be78eab66181c8294bc
NOTION_LECCIONES_ID=138234c3de244878b00cd5ec91021a91
ARTIFICIAL_ANALYSIS_API_KEY=...  # llave gratis de artificialanalysis.ai
MAQUINA=mac-mini                 # nombre de esta computadora en los datos
```

En GitHub, la tarea diaria solo necesita `NEON_DATABASE_URL` y `ARTIFICIAL_ANALYSIS_API_KEY`, guardadas como **secretos del repositorio**.

## 9. Tecnologías

- **TypeScript estricto + Bun**, igual que los nodos de Forge614, para que al pasar al monorepo baste con mover carpetas.
- **Zod** para revisar cada dato que entra: registros, respuestas de API y filas de Notion. Si llega algo con forma inesperada, se anota como error en `ejecuciones` y no se guarda a medias.
- **`postgres` (postgres.js)** para escribir en Neon.
- **Migraciones en SQL** numeradas (`001_inicial.sql`, …). Sin ORM en esta etapa.
- **`@notionhq/client`** (librería oficial de Notion).
- **GitHub Actions** para la tarea diaria y **launchd** para la de cada hora.
- **Sin pruebas automáticas** (decisión del propietario). A cambio:
  - `bun run typecheck` en cada cambio;
  - el comando **`bun run verificar`**, que toma una sesión real ya conocida y compara sus totales (tokens, mensajes, modelo) con los que están en Neon. Es la garantía mínima de que los números son contables.

Organización interna, pensada para volverse paquetes del monorepo:
- `esquemas/`: la forma de cada dato, en Zod;
- `fuentes/`: un lector por origen (claude-code, codex, opencode, artificial-analysis, models-dev y notion);
- `almacen/`: la escritura en Neon y las migraciones;
- `limpieza/`: el limpiador de secretos;
- `comandos/`: `diario`, `cada-hora`, `carga-inicial` y `verificar`.

**Punto de partida:** los scripts de lectura ya probados en `forge614-ai/docs/orquestacion/estudios/2026-09-25-punto-de-traspaso-scripts/` (`extract_claude.py`, `extract_codex.py` y `pricing.py`). La lógica se traduce a TypeScript; el formato real de cada registro se confirma leyendo archivos reales antes de escribir cada lector.

## 10. Fuera de esta etapa

- Monitor, página web, API pública y fórmulas de probabilidad.
- Laboratorio que corre la misma tarea en varios modelos.
- Escritura de Neon hacia Notion.
- Emisores de terceros.
- Pruebas automáticas y proceso de publicación de nodos.

## 11. Riesgos conocidos

- **Sin pruebas, un lector puede guardar números mal** sin que nadie se dé cuenta. Mitigación: `bun run verificar` contra sesiones conocidas antes de dar por buena cada fuente, y revisar `ejecuciones`.
- **Los formatos de registro cambian** con las versiones de las herramientas. Mitigación: Zod rechaza lo desconocido y deja el error anotado con la versión de la herramienta.
- **Emparejar corridas de Notion con sesiones** puede fallar si falta «Archivo de registro». En ese caso la corrida queda sin enlace (nunca se inventa uno) y se cuenta en `ejecuciones`.
- **OpenCode 2.x guarda sus sesiones en SQLite** (`opencode.db`), no en `.jsonl`. Hay que confirmar si se lee la base o se usa `opencode export`.

## 12. Puesta en marcha (lo que hará el propietario, guiado paso a paso)

1. Aprobar este documento.
2. El orquestador escribe el plan de construcción.
3. Crear el repositorio vacío `model-ledger` en GitHub y clonarlo en el Escritorio (comandos exactos en el plan).
4. Crear en Notion una integración, darle acceso a la página «Forge614 · Laboratorio de agentes» y copiar su llave.
5. Crear la cuenta gratis de Artificial Analysis y copiar su llave.
6. Crear el `.env` con los valores (plantilla en el plan) y aplicarle `chmod 600`.
7. Abrir una sesión nueva en `model-ledger` y pegar el prompt del plan.
8. Después de construir: correr la carga inicial, revisar `verificar`, activar la tarea diaria (secretos en GitHub) y la de cada hora (launchd).
