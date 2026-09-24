import { CHECK_NAMES } from "./sentinel";

// What the panel says about each node when it is clicked, in four tabs:
// summary, how it works (the steps the map animates, in order), connections
// (what it gets and sends to each neighbor) and details. Written in plain
// words from the ecosystem contract (sections 2 to 11), the decision records
// and what the map itself shows; technical words go in parentheses and
// `backticks` mark commands and file names.

export type NodeInfo = {
  // Summary tab.
  analogy: string;
  purpose: string;
  never: string;
  // How it works: what the node does in the map, in the order it happens.
  steps: { title: string; text: string }[];
  // Connections: only the neighbors drawn on the map, seen from this node.
  links: { name: string; receives: string; sends: string }[];
  // Details.
  facts: { label: string; value: string }[];
};

export type InfoId = "shell" | "engram" | "engines" | "atlas" | "sentinel" | "worker" | "cloud";

export const NODE_INFO: Record<InfoId, NodeInfo> = {
  shell: {
    analogy: "El mostrador de atención: ahí la persona escribe lo que quiere, ve qué va a pasar y da el «sí».",
    purpose:
      "Es el único lugar donde la persona decide. Shell les pide lo necesario a los demás nodos, muestra qué se va a cambiar y espera la confirmación antes de que alguien lo aplique.",
    never: "No cambia nada sin confirmación, no detecta las IAs (eso es de Engines) y no guarda la memoria (eso es de Engram).",
    steps: [
      { title: "Estado", text: "La persona escribe `forge614 status` (¿cómo está todo?). Engram y Engines contestan que están listos." },
      {
        title: "Preparar el proyecto",
        text: "Con `forge614 prepare` (dejar listo el proyecto), Shell le pide a Engram los recuerdos del proyecto y a Engines la lista de IAs instaladas.",
      },
      {
        title: "Vista previa",
        text: "Shell le pide a Engines qué cambiaría. Es solo para leer: todavía no se toca nada. El resultado aparece en la terminal.",
      },
      { title: "Confirmación", text: "La persona confirma en la terminal. Solo entonces Shell le dice a Engines que aplique exactamente eso." },
      {
        title: "Contextualizar (opcional)",
        text: "Shell pregunta si se quiere contextualizar el proyecto. Si la persona dice que sí, arranca Atlas y, al terminar, le entrega su reporte final.",
      },
      { title: "Guardar lo hecho", text: "Shell le entrega a Engram lo que hizo, para que quede en la memoria." },
    ],
    links: [
      { name: "Engram", receives: "Los recuerdos del proyecto y el aviso de que algo quedó guardado.", sends: "Lo que Shell hizo, para que se guarde." },
      {
        name: "Engines",
        receives: "La lista de IAs instaladas, la vista previa y el resultado de aplicar.",
        sends: "Las preguntas y la orden de aplicar solo lo confirmado.",
      },
      { name: "Atlas", receives: "El avance y el reporte final.", sends: "La orden de contextualizar el proyecto, solo si la persona aceptó." },
    ],
    facts: [
      {
        label: "¿Funciona solo?",
        value: "Sí. Es el único con pantalla propia, y no hace falta para el trabajo diario con IA una vez que todo está configurado.",
      },
      { label: "Depende de", value: "Engines. Al instalar Shell, Engines se instala solo." },
      { label: "Sus datos", value: "`~/.forge614/shell/`, su carpeta propia: ningún otro nodo escribe ahí." },
      {
        label: "Comandos que muestra el mapa",
        value:
          "`forge614 status` (el estado) y `forge614 prepare` (dejar listo el proyecto). Los comandos globales `forge614 …` son de forge614-ai; Shell pone la pantalla y las decisiones.",
      },
      {
        label: "Fuera de un proyecto",
        value: "Funciona como recepción: muestra el estado de la máquina y los proyectos recientes (preparados o sin preparar).",
      },
      { label: "Actas", value: "0003 — instalar la máquina (`init`) y preparar cada proyecto (`prepare`)." },
    ],
  },

  engram: {
    analogy: "La libreta compartida: lo importante que aprenden la persona y sus IAs queda anotado para la próxima vez.",
    purpose:
      "Es la memoria de largo plazo del ecosistema: guarda recuerdos en un archivo local, sabe a qué proyecto pertenece cada uno y permite buscarlos por texto.",
    never: "No tiene pantalla, no detecta las IAs y no configura asistentes: eso es de Engines y de Shell.",
    steps: [
      {
        title: "Entregar recuerdos",
        text: "Cuando Shell los pide, Engram busca en su archivo local los recuerdos del proyecto y se los devuelve.",
      },
      {
        title: "Guardar",
        text: "Cuando Shell guarda algo, Engram lo escribe en su archivo local y confirma que quedó guardado.",
      },
      { title: "Copiar a la nube (opcional)", text: "Justo después de guardar, si la copia en la nube está activada, el recuerdo se manda por internet a una base de datos remota (PostgreSQL)." },
      { title: "Recibir el conocimiento de Atlas", text: "Al final de la contextualización, Atlas deja aquí el conocimiento ya revisado y su progreso." },
    ],
    links: [
      { name: "Shell", receives: "Lo que Shell hizo, para guardarlo.", sends: "Los recuerdos del proyecto y la confirmación de lo guardado." },
      { name: "Atlas", receives: "El conocimiento ya revisado y el progreso de la contextualización.", sends: "El progreso guardado, cuando Atlas lo consulta." },
      { name: "PostgreSQL", receives: "—", sends: "Una copia de cada recuerdo, solo si la nube está activada." },
    ],
    facts: [
      { label: "¿Funciona solo?", value: "Sí. Se usa escribiéndole comandos o conectándole una IA por un canal estándar (MCP), y no tiene pantalla." },
      { label: "Depende de", value: "Shell y Engines. Al instalar Engram, se instalan solos." },
      {
        label: "Dónde guarda",
        value: "En un archivo de tu computadora, dentro de `~/.forge614/engram/`, hecho con SQLite (una base de datos de un solo archivo) y FTS5 (su buscador de texto). Siempre local y obligatorio.",
      },
      { label: "Nube", value: "La copia en la nube, en una base PostgreSQL, es opcional: nadie está obligado a usarla." },
      {
        label: "Identidad del proyecto",
        value: "Al vincular un proyecto escribe `.forge614/project.json` (la cédula portátil del proyecto), en silencio y sin duplicarla.",
      },
      { label: "Memoria compartida", value: "Los proyectos (repositorios) relacionados pueden compartir una misma memoria, llamada `ecosystem`." },
      {
        label: "Comandos",
        value:
          "`forge614-engram init --json` (dejar lista la memoria) · `forge614-engram mcp` (abrir el canal para las IAs) · `forge614-engram search …` (buscar recuerdos).",
      },
      { label: "Actas", value: "0022 — ámbito del ecosistema · 0023 — identidad portátil del proyecto." },
    ],
  },

  engines: {
    analogy: "El banco de pruebas de motores: conoce cada IA instalada y cómo conectarse a ella sin romperla.",
    purpose:
      "Sabe qué IAs (los «motores») hay en la máquina, dónde guardan su configuración y qué saben hacer. Cuando hay que cambiar algo en una de ellas, lo prepara y lo aplica de forma segura.",
    never: "No tiene pantalla y no escribe configuración por su cuenta: solo aplica lo que Shell le pide después de que la persona confirmó.",
    steps: [
      {
        title: "Buscar las IAs",
        text: "Cuando Shell pregunta qué IAs hay, Engines revisa la máquina y detecta cuáles están instaladas, si su programa está disponible y qué pueden hacer.",
      },
      { title: "Responder a Shell", text: "La lista de IAs detectadas vuelve a Shell." },
      {
        title: "Preparar la vista previa",
        text: "Cuando Shell pide un cambio, Engines prepara qué se modificaría. Es solo lectura: el panel lo muestra y no se toca nada.",
      },
      {
        title: "Aplicar",
        text: "Cuando la persona confirma en Shell, Engines aplica únicamente ese cambio y avisa que terminó.",
      },
      { title: "Ayudar a Atlas", text: "Cuando Atlas empieza, Engines le dice qué IAs disponibles pueden ejecutar sus tareas." },
    ],
    links: [
      {
        name: "Shell",
        receives: "Las preguntas y la orden de aplicar lo confirmado.",
        sends: "La lista de IAs, la vista previa y el resultado de aplicar.",
      },
      { name: "Atlas", receives: "La pregunta de qué IAs hay.", sends: "Las IAs disponibles y cómo arrancarlas sin pantalla." },
    ],
    facts: [
      { label: "¿Funciona solo?", value: "No. Es una pieza interna: nadie la instala directamente." },
      { label: "Depende de", value: "Nada. Al revés: Shell, Engram, Atlas y Hub dependen de ella." },
      { label: "Cómo se instala", value: "Sola, cuando otro nodo la necesita." },
      { label: "Sus datos", value: "`~/.forge614/engines/`, su carpeta propia." },
      {
        label: "Qué detecta",
        value: "Las IAs instaladas, si su programa está disponible, dónde guardan su configuración y qué capacidades tienen.",
      },
      {
        label: "Cómo cambia cosas",
        value: "En dos pasos, plan y aplicar (Plan/Apply): primero un plan de solo lectura y, con la confirmación, se aplica solo eso.",
      },
      {
        label: "Cómo se conecta a cada IA",
        value: "Con una pieza traductora por cada IA (el patrón de puertos y adaptadores), para hablarle en su propio idioma sin romperla.",
      },
      { label: "Actas", value: "0003 — instalar y preparar con vista previa y confirmación." },
    ],
  },

  atlas: {
    analogy: "El cartógrafo: recorre un proyecto por primera vez y dibuja su mapa, carpeta por carpeta.",
    purpose:
      "Contextualiza un proyecto la primera vez: lo recorre, reparte el análisis entre sus workers, hace revisar cada informe y deja el conocimiento en Engram para que las IAs no partan de cero.",
    never: "Es opcional y no dirige el trabajo diario: eso es de forge614-ai. Tampoco tiene pantalla; las decisiones son de Shell.",
    steps: [
      { title: "Empezar", text: "Cuando la persona acepta contextualizar, Shell le da la orden a Atlas." },
      {
        title: "Preparar",
        text: "Atlas le pregunta a Engines qué IAs hay y a Engram si ya había avance guardado (así puede retomar donde quedó).",
      },
      {
        title: "Repartir las tareas",
        text: "Atlas recorre el proyecto carpeta por carpeta y manda una tarea de análisis a cada worker, de una en una.",
      },
      { title: "Pedir revisión", text: "Cuando un worker entrega su informe crudo, Atlas se lo manda a Sentinel." },
      {
        title: "Marcar lo revisado",
        text: "Cuando Sentinel devuelve su acta, Atlas da por revisadas las carpetas de esa tarea y sigue con la siguiente.",
      },
      { title: "Guardar y avisar", text: "Atlas escribe el conocimiento revisado en Engram y le entrega su reporte final a Shell." },
    ],
    links: [
      { name: "Shell", receives: "La orden de contextualizar.", sends: "El avance y el reporte final." },
      { name: "Engines", receives: "Las IAs disponibles para ejecutar tareas.", sends: "La pregunta de qué IAs hay." },
      { name: "Engram", receives: "El avance guardado, para poder retomar.", sends: "El conocimiento ya revisado y su progreso." },
      { name: "Workers", receives: "El informe crudo de cada tarea.", sends: "Una tarea a la vez." },
      { name: "Sentinel", receives: "El acta con el veredicto.", sends: "Cada informe de un worker, para revisarlo." },
    ],
    facts: [
      { label: "¿Funciona solo?", value: "No del todo: necesita a Engram y a Engines." },
      { label: "Depende de", value: "Engram, Engines y Shell (y de Workers cuando ejecuta tareas)." },
      { label: "Es opcional", value: "Shell lo pregunta durante `prepare`. Si la persona dice que no, se trabaja normal, con memoria." },
      {
        label: "Cómo usa a Engram",
        value: "Por la puerta oficial que Engram ofrece a otros programas (su SDK), nunca metiéndose en su base de datos por debajo.",
      },
      {
        label: "Quién escribe",
        value: "Atlas es el único que escribe los resultados de la contextualización. Workers jamás escribe directo en Engram.",
      },
      {
        label: "Su progreso",
        value: "No tiene base propia: su avance, y por eso poder pausar y reanudar, vive en las sesiones de Engram.",
      },
      { label: "Sus datos", value: "`~/.forge614/atlas/`, su carpeta propia." },
      { label: "Actas", value: "0004 — contextualización inicial opcional · 0007 — Sentinel juzga, nunca hace." },
    ],
  },

  cloud: {
    analogy: "La copia de seguridad en otro lugar: como guardar una copia de tus fotos en casa de un familiar, por si algo le pasa a tu computadora.",
    purpose:
      "Es una base de datos (PostgreSQL) que vive en un servidor de internet y no en tu computadora. Engram puede mandarle una copia de cada recuerdo que guarda. Es opcional.",
    never:
      "No es parte del ecosistema, no piensa ni decide, y no hace falta para que Engram funcione: la memoria local siempre está y es obligatoria.",
    steps: [
      { title: "Engram guarda un recuerdo", text: "Lo escribe primero en su archivo local, como siempre." },
      { title: "Lo manda por internet", text: "Justo después, si la copia en la nube está activada, Engram envía el recuerdo al servidor." },
      { title: "PostgreSQL lo guarda", text: "El servidor recibe la copia y la conserva." },
    ],
    links: [{ name: "Engram", receives: "Una copia de cada recuerdo, por internet, justo después de que Engram lo guarda.", sends: "Nada: en el mapa solo recibe." }],
    facts: [
      { label: "¿Es obligatorio?", value: "No. Sin la nube, Engram sigue guardando todo en su archivo local." },
      { label: "Dónde vive", value: "En un servidor de internet, no en tu computadora." },
      { label: "Quién la usa", value: "Solo Engram, y solo si la persona activó la copia." },
      { label: "Cuándo se copia", value: "Justo después de guardar cada recuerdo." },
    ],
  },

  worker: {
    analogy: "El obrero de un taller: recibe una orden clara, la hace en su mesa y entrega lo que salió, sin decidir nada.",
    purpose:
      "Ejecuta una tarea que ya viene decidida (aquí, analizar una parte del proyecto) usando una IA, y devuelve el resultado tal cual salió. Trabaja de una tarea a la vez y aislado del resto.",
    never:
      "No decide qué hacer, no recuerda nada entre una tarea y otra, no escribe en Engram y nunca llama a Sentinel: de guardar y de pedir revisiones se encarga Atlas.",
    steps: [
      {
        title: "Recibe la tarea",
        text: "Atlas le pasa la tarea escrita como texto ordenado (JSON), sin que nadie la teclee: se la entrega por su entrada estándar (`stdin`).",
      },
      {
        title: "La ejecuta",
        text: "La corre con una de las IAs disponibles, que Atlas eligió con ayuda de Engines. Lo hace aislado y sin interfaz.",
      },
      { title: "Avisa su avance", text: "Mientras trabaja va mandando mensajes cortos de avance, uno por línea (NDJSON)." },
      { title: "Entrega su informe", text: "Al terminar le devuelve a Atlas el análisis en bruto. Atlas lo manda a revisar antes de aceptarlo." },
    ],
    links: [{ name: "Atlas", receives: "Una tarea a la vez.", sends: "Su avance mientras trabaja y el informe en bruto al terminar." }],
    facts: [
      { label: "¿Funciona solo?", value: "No. Es de uso interno: nadie lo instala directamente, llega junto con Atlas." },
      { label: "Estado", value: "No recuerda nada entre tareas (no tiene estado propio): cada una empieza de cero y no guarda nada al terminar." },
      {
        label: "Cómo se comunica",
        value: "Recibe la tarea como texto ordenado (JSON) y va contando su avance con mensajes cortos, uno por línea (NDJSON). Es el acuerdo (contrato) que usan Atlas y forge614-ai.",
      },
      {
        label: "Tokens gastados",
        value: "Todavía no informa cuánto gastó de la IA. Falta medir los tokens (la unidad con que las IAs cuentan y cobran el texto): es un pendiente del acta 0011.",
      },
      { label: "Sus datos", value: "`~/.forge614/workers/`, su carpeta propia." },
      { label: "Actas", value: "0011 — libro de corridas (medir el gasto real) · 0007 — un worker nunca llama a Sentinel." },
    ],
  },

  sentinel: {
    analogy: "El inspector de calidad: revisa el trabajo con una lista fija y dice si pasa, pero no lo arregla.",
    purpose:
      "Quien hizo un trabajo nunca debe calificarse a sí mismo. Sentinel lo revisa con el reglamento y da un veredicto con evidencia: pasa, precaución o no pasa.",
    never: "No corrige, no instala, no ejecuta trabajo ni decide. Si hay precaución, decide siempre una persona.",
    steps: [
      { title: "Llega un informe", text: "Atlas le manda el informe de un worker." },
      { title: "Se revisa", text: "Sentinel lo compara con el reglamento: 19 revisiones, una tras otra." },
      {
        title: "Se emite el acta",
        text: "Sentinel escribe su acta con el veredicto, que es cumple o precaución, y se la devuelve a Atlas.",
      },
    ],
    links: [
      { name: "Atlas", receives: "Cada informe de un worker, para revisarlo.", sends: "El acta con el veredicto." },
    ],
    facts: [
      { label: "¿Funciona solo?", value: "Sí, como verificador." },
      { label: "Depende de", value: "Nada: la verificación sin IA no necesita a ningún otro nodo." },
      { label: "Veredictos", value: "Pasa · precaución · no pasa, siempre con evidencia." },
      {
        label: "Dos tipos de juicio",
        value:
          "1) Sin IA, siempre primero: es barato e inmediato. Busca patrones peligrosos, comprueba que los datos tengan la forma correcta (esquemas), verifica las huellas (el código que prueba que un archivo no cambió), corre pruebas y busca menciones prohibidas. Si algo falla, ahí termina y no se gasta ni un token.\n2) Con IA, solo si pasó lo anterior y es trabajo de un worker: un revisor con un modelo distinto al que lo hizo.",
      },
      {
        label: "Quién lo llama",
        value:
          "Atlas, Hub cuando admite un paquete nuevo, forge614-ai en cada puerta del flujo, el comando `bun verify` y la revisión automática (CI) de cada repositorio. Un worker nunca lo llama.",
      },
      { label: "Las 19 revisiones", value: CHECK_NAMES.map((name) => `\`${name}\``).join(" · ") },
      { label: "Sus datos", value: "`~/.forge614/sentinel/`, su carpeta propia." },
      { label: "Actas", value: "0007 — Sentinel juzga, nunca hace." },
    ],
  },
};
