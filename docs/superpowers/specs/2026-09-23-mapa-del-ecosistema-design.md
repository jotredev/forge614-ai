# forge614-ai — Mapa visual del ecosistema

**Fecha:** 2026-09-23
**Estado:** Borrador para revisión del propietario del producto
**Gobierna:** la carpeta `tools/ecosystem-map/` de `forge614-ai`
**Traducción hermana:** `2026-09-23-ecosystem-map-design.en.md`
**Actas relacionadas:** `0002` (orden de entregas), `0012` (menciones prohibidas), `0016` (bilingüismo), `0018` (tres sistemas operativos), `0024` (evolución aditiva), `0026` (Bun como versión única)

---

## 1. Propósito

El ecosistema Forge614 está descrito en 26 actas, un contrato, una guía de nodo, cinco auditorías y varios traspasos. Entenderlo exige leerlo todo, y las contradicciones entre documentos solo se descubren leyendo línea por línea.

El mapa visual convierte esa documentación en **una oficina 3D interactiva en el navegador**. Cada nodo es una plataforma, cada pieza interna es un escritorio, las conexiones son líneas animadas, las reglas son placas en las paredes y las contradicciones se marcan a la vista.

Tiene dos usos:

1. **Entender:** que el propietario comprenda al 100 % cómo se conectan los nodos, quién depende de quién, quién orquesta, quién ejecuta, quién juzga y qué reglas aplican.
2. **Mostrar:** enseñar el ecosistema a otras personas sin tener que explicarlo en voz alta.

Además funciona como **detector visual de contradicciones**: si dos documentos dicen cosas distintas, el mapa muestra el choque con sus fuentes en vez de elegir una en silencio.

### 1.1 Fuera de alcance

- Datos en vivo: tareas en curso, agentes trabajando o métricas. El mapa muestra cómo está **definido** el ecosistema, no lo que pasa en este momento.
- Editar documentos desde el mapa. El mapa solo lee.
- Integrarlo en `bun verify` o en la CI de forge614-ai. Se decide más adelante.

## 2. Ubicación y límites

```
forge614-ai/
└── tools/ecosystem-map/
    ├── package.json      dependencias propias, separadas del núcleo
    ├── tsconfig.json     propio; el navegador y Bun usan tipos distintos
    ├── extractor/        lee el repositorio y arma los datos
    ├── curated/          datos curados a mano, cada uno con su recibo
    ├── data/             generado: ecosystem.json y findings.json
    ├── app/              la página: oficina 3D y paneles
    └── tests/
```

**Reglas de frontera:**

- **Nada vive en `src/`.** La prueba `tests/architecture/import-rules.test.ts` rechaza cualquier archivo de `src/` fuera de las cuatro capas, y el mapa no pertenece a ninguna.
- **Ningún archivo del mapa se importa desde `src/`, y el mapa no importa nada de `src/`.** Lee los documentos del repositorio como archivos, nada más.
- **Portabilidad.** La carpeta debe poder moverse a un repositorio propio copiándola, sin cambiar código. La única referencia al repositorio padre es una ruta raíz configurable, `--root`, cuyo valor por defecto es `../..`.
- **Aislamiento.** El `package.json`, el `tsconfig.json` y el `bun verify` del núcleo no se modifican.

## 3. Tecnología

| Pieza | Uso |
|---|---|
| Bun 1.4.2 | Empaqueta la página, la sirve en desarrollo y corre el extractor y las pruebas (acta 0026) |
| Three.js | Escena 3D, cámara, luces, sombras |
| TypeScript sin marco de interfaz | Paneles, buscador y estado de la pantalla |
| Zod | Esquemas de los datos generados y curados |
| YAML | Formato de los archivos curados |

Sin servidor ni marco de interfaz. El resultado de `map:build` es una carpeta estática que se abre en cualquier navegador moderno de macOS, Linux y Windows (acta 0018).

## 4. Estilo visual

- **Cámara.** Vista isométrica en diagonal, desde arriba, con proyección ortográfica. Fondo gris azulado oscuro.
- **Plataformas.** Una por nodo, cada una de un color apagado propio. La paleta se diseña con contraste medido y debe distinguirse con deficiencias de visión de color.
- **Escritorios y personajes.** Figuras geométricas simples de estilo "juguete", construidas por código, sin modelos externos.
- **Luz.** Ambiental suave, oclusión ambiental y sombras de contacto.
- **Texto.** Siempre nítido: letreros y tarjetas se dibujan como capa HTML sobre la escena, no como texto 3D.
- **Movimiento.** La cámara vuela con aceleración y frenado suaves. Solo se anima lo que aporta información, y se respeta la preferencia del sistema de reducir movimiento.
- **Rendimiento.** Objetivo de 60 cuadros por segundo en una laptop de gama media.

### 4.0 Decisiones del propietario (2026-09-23)

- **Cada nodo se reconoce por un objeto protagonista** que dice lo que es sin leer nada. De lejos se ve ese objeto; de cerca, sus piezas reales.
- **Engram:** una red de neuronas, con una esfera central unida por hilos a esferas más pequeñas, en rosa suave (`#d98ca0`).
- **Plataforma:** una placa delgada que flota sobre el piso, sostenida por una columna, con una línea del color del nodo bajo su orilla.
- **Tarjeta:** sin caja. Una línea pequeña en mayúsculas con la función (`NODO · LA MEMORIA`), en el color del nodo, sobre el nombre grande con letra de estilo clásico (serif).
- **Tipografía del nombre:** Manrope, instalada dentro del proyecto (sin depender de internet).
- **Fondo:** un circuito completo y conectado, dibujado muy tenue. Un anillo cerrado alrededor del centro con esquinas a 45°, ramas que salen hacia adentro y hacia afuera terminadas en un punto, y un anillo exterior todavía más tenue. Una sola luz con estela recorre el anillo sin detenerse, como datos moviéndose. Se anima a 30 cuadros por segundo como máximo y queda quieto si el sistema pide reducir movimiento.
- **Rendimiento:** la escena se dibuja solo cuando algo cambia (cámara o fondo animado), las sombras se calculan una vez y no se usa oclusión ambiental.
- **Descartado:** el estilo neón de plano técnico. El fondo y la luz se quedan como en la primera versión, y las referencias visuales nuevas solo suman detalles.

### 4.1 Distribución del ecosistema

| Elemento | Representación |
|---|---|
| Engram | Plataforma central: la memoria a la que todos se conectan |
| Shell, Engines, Atlas, Workers | Plataformas alrededor del centro |
| Hub, Sentinel | Plataformas en holograma semitransparente (planeados) |
| forge614-ai | El edificio: piso común y paredes con las reglas como placas |
| Piezas internas de cada nodo | Escritorios con letrero |
| Piezas planeadas (`forge614` init/prepare, libro de corridas…) | Escritorios vacíos marcados como planeados |

## 5. Interacciones

- **Pantalla.** Barra superior (buscador, capas, recorridos, idioma, tema), panel izquierdo de detalle, oficina al centro, panel derecho de hallazgos y línea de tiempo abajo.
- **Explorar.** Clic en una plataforma: la cámara vuela hacia ella y el panel izquierdo muestra las pestañas *Qué hace · Sus piezas · Depende de · Reglas que le aplican · Actas · Hallazgos*. También se puede dar clic en un escritorio, una línea o una placa. Esc vuelve a la vista general.
- **Capas.** Interruptores para dependencias de instalación, contratos en tiempo de ejecución, reglas, hallazgos y planeado.
- **Recorridos.** Una luz viaja por las plataformas con narración paso a paso, y se puede pausar, avanzar o retroceder. Recorridos: `init`, `prepare`, contextualización con Atlas, juicio de Sentinel, reintentos y fusible, y viaje de un cambio hasta el release.
- **Hallazgos.** Lista filtrable. Cada hallazgo lleva la cámara a su lugar y muestra las fuentes en conflicto lado a lado.
- **Línea de tiempo.** De E0 a E3: la oficina se construye según el orden de entregas (acta 0002).
- **Acabados.** Buscador, español e inglés, tema claro y oscuro, un enlace por vista y uso completo con teclado.

## 6. Datos

### 6.1 Flujo

```
documentos del repositorio
   ├── automático: INDEX.json de actas, support-matrix.json, standard/rules/*,
   │               packs, forge614.node.json
   └── curado: curated/*.yaml (lo que está en texto normal)
                    ↓
               extractor (valida, compara, detecta choques)
                    ↓
      data/ecosystem.json  +  data/findings.json   ← la página solo lee esto
```

### 6.2 Recibos

Todo dato curado lleva al menos un **recibo** con tres partes: `file` (ruta relativa a la raíz), `line` y `quote`, una cita textual corta.

El extractor:

1. **Rechaza** cualquier dato sin recibo.
2. **Comprueba** que la cita siga existiendo en el archivo, cerca de la línea indicada.
3. Si la cita ya no está, marca el dato como **desactualizado** y, si era un hallazgo, como **posiblemente resuelto**. Nunca lo borra en silencio.

### 6.3 Hallazgos

Un hallazgo es una de tres cosas: **contradicción** (dos o más recibos que se oponen), **pendiente** (planeado y no hecho) o **hueco** (algo citado que no existe). Cada hallazgo indica a qué nodos afecta y qué fuente manda cuando la jerarquía está clara; por ejemplo, un acta aceptada manda sobre un checklist.

Los hallazgos automáticos se calculan comparando fuentes estructuradas. Por ejemplo: el número de actas en el índice contra el que declaran las guías, o las reglas que cita un pack contra las que existen. Los hallazgos de texto se registran en `curated/findings.yaml`.

### 6.4 Esquemas

Zod valida `curated/*.yaml` al leerlos y `data/*.json` al generarlos. La página valida también al cargar los datos, y si fallan muestra un error claro en vez de una escena incompleta.

Los esquemas solo crecen: se agregan campos, nunca se renombran ni se quitan (acta 0024).

## 7. Comandos

| Comando | Efecto |
|---|---|
| `bun run map:extract` | Regenera `data/` desde el repositorio |
| `bun run map:check` | Falla si `data/` no está al día o si algún recibo dejó de ser válido |
| `bun run map:dev` | Sirve la oficina en el navegador con recarga automática |
| `bun run map:build` | Genera la carpeta estática para compartir |
| `bun run test` | Pruebas del extractor y los esquemas |

Las pruebas del mapa usan el sufijo `.check.ts` para que el `bun test` de la raíz de forge614-ai no las recoja.

Todos se ejecutan dentro de `tools/ecosystem-map/`. Salidas y errores siguen la convención de contratos de máquina (acta 0013): JSON con `schemaVersion` por stdout, errores `{schemaVersion, code, error}` por stderr y códigos de salida 0, 1 y 2.

## 8. Construcción por pasos visibles

No se construye todo de una vez. Cada paso termina con:

- una captura de pantalla;
- la oficina abierta en el navegador del propietario.

El siguiente paso empieza solo con su visto bueno. Si un paso revela que algo de este diseño no funciona, se corrige aquí antes de seguir.

| # | Entregable visible | Decisión del propietario |
|---|---|---|
| 1 | Ambiente: fondo, cámara isométrica, luz, sombras y una plataforma de prueba | Tono general |
| 2 | Las ocho plataformas con colores y nombres reales, desde `data/` | Distribución y paleta |
| 3 | Un escritorio y un personaje de prueba en Engines | Aspecto de los trabajadores |
| 4 | Todas las plataformas con sus piezas | Claridad de quién hace qué |
| 5 | Conexiones animadas entre plataformas | Claridad de qué viaja a dónde |
| 6 | Clic, vuelo de cámara y panel izquierdo | Sensación al navegar |
| 7 | Reglas como placas en las paredes | Legibilidad de las reglas |
| 8 | Marcas de hallazgos y panel derecho | Detección de un vistazo |
| 9 | Recorridos animados | Valor didáctico |
| 10 | Línea de tiempo E0 a E3 | Comprensión del orden de entregas |
| 11 | Buscador, idiomas, temas y enlaces | Acabados |

El extractor y los esquemas crecen junto con los pasos. El paso 2 introduce solo los nodos, el 4 las piezas, el 5 las conexiones, y así sucesivamente. No se construye el extractor completo antes de ver algo en pantalla.

## 9. Verificación

- **Pruebas automáticas** (`bun run test`): esquemas, validación de recibos, detección de citas desaparecidas y cálculo de hallazgos automáticos.
- **Revisión visual automatizada:** un navegador automatizado abre la oficina, recorre los nodos y toma capturas para confirmar que se ve y responde. Complementa la revisión del propietario en cada paso, no la sustituye.
- **Sin validaciones inventadas:** un paso se declara listo solo con la salida real de estos comandos y la captura correspondiente.

## 10. Reglas del ecosistema que aplican

- **Acta 0012:** ningún documento, comentario ni commit del mapa cita productos o proyectos externos como referencia o inspiración. El diseño se describe como propio de Forge614. Usar una biblioteca como dependencia no es una mención de inspiración.
- **Acta 0016:** textos de pantalla en español e inglés y código en inglés. Esta spec tiene su traducción hermana.
- **Acta 0018:** los comandos funcionan en macOS, Linux y Windows. Nada depende de rutas con `/` fijas.
- **Acta 0024:** los esquemas de datos solo crecen.

## 11. Riesgos

| Riesgo | Mitigación |
|---|---|
| Los datos curados se vuelven viejos al cambiar los documentos | Recibos con cita textual y `map:check` los detecta |
| El mapa se interpreta como fuente de verdad | La página muestra en cada dato su fuente, y el pie de pantalla dice que la fuente de verdad son los documentos |
| El 3D se vuelve pesado con muchas piezas | Detalle por niveles de acercamiento, geometría compartida y objetivo medido de 60 cuadros por segundo |
| Tocar el trabajo en curso de la fase 0.2 | Todo ocurre en la rama `feat/ecosystem-map`, en un worktree aparte, dentro de `tools/ecosystem-map/` |
