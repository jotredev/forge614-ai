# Convención única de contratos de máquina

> Como un enchufe universal: no importa el nodo, el mismo formato entra y sale.

**Regla.** Todo comando de máquina del ecosistema sigue una sola convención: la salida correcta es un único objeto JSON en **stdout** con `schemaVersion` entero en la raíz; todo error es un único objeto JSON en **stderr** con la forma `{ "schemaVersion": n, "code": "CODIGO_ESTABLE", "error": "mensaje para personas" }`; los códigos de salida son `0` éxito, `1` error, `2` entrada inválida, `75` pausa recuperable; los flujos van en NDJSON con evento terminal garantizado; `--help` y `--version` responden de inmediato; las entradas externas se validan con esquema (Zod) en la frontera. El `code` es un identificador estable en `MAYUSCULAS_CON_GUION_BAJO`, regex `^[A-Z][A-Z0-9_]+$`, listado en el `CONTRACT.md` del nodo.

**Alcance.** Todo comando de máquina de todos los nodos del ecosistema.

**Por qué.** La auditoría mostró que cada nodo hablaba un dialecto distinto de errores, salidas y códigos de salida; un orquestador que consuma varios nodos no puede conocer cinco formatos (acta 0013).

**Verificación.** `validator: error-codes` (comprueba los códigos listados en `CONTRACT.md` y usados en `src/`; el resto de la convención se revisa por ahora a mano).
