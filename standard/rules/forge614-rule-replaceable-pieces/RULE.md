# Piezas reemplazables conforme evoluciona el modelo

> Como una pieza de repuesto estandarizada: se cambia sola, sin desarmar el resto de la máquina.

**Regla.** Todo paquete y todo nodo declara `compensates: "model-limitation" | "structural"`. Es *estructural* lo que no se mueve al modelo aunque este mejore: memoria durable, contratos entre nodos, contabilidad, verificación, instalación e identidad de proyecto. Es *model-limitation* lo que existe porque hoy el modelo no lo hace solo, y ese tipo de paquete lleva `sunset` obligatorio (condición de retiro verificable y fecha de revisión). Ningún paquete depende de otro por dentro, así que el Hub puede deshabilitar cualquier paquete `model-limitation` por política sin que nada más falle. Antes de agregar una skill, MCP o plugin nuevo se responde, con evidencia, "¿el modelo ya lo hace solo?"; si la respuesta es sí, el paquete no entra.

**Alcance.** Todo manifiesto de paquete y de nodo del ecosistema.

**Por qué.** Los modelos de IA evolucionan más rápido que los procedimientos codificados en un arnés; sin clasificación y retiro programado, la capa de orquestación sobrevive a su motivo y se vuelve peso muerto (acta 0021).

**Verificación.** Revisión humana por ahora; el esquema de manifiesto ya valida `compensates`/`sunset` (esta tarea) y la revisión periódica de `sunset` vigentes se automatiza en una fase posterior.
