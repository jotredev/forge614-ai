# 0013 — Convención única de contratos de máquina

**Fecha:** 2026-09-22
**Estado:** aceptada (2026-09-22)
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

La auditoría mostró que cada nodo habla un dialecto distinto: Engram escribe errores `{code,error}` por stderr con exit 1; Engines escribe `{schemaVersion, error:{code,message}}` por stdout con exit 1; Atlas escribe `{status:"error", error:{code,message}}` por stdout; Workers no lleva `schemaVersion` en la entrada ni en los eventos y sus errores fatales van por stdout con exit 2; `forge614-workers --version` se queda esperando stdin. Un orquestador que consuma a los cinco tendría que conocer cinco formatos.

## Decisión

Una sola convención para todo comando de máquina del ecosistema:

- **Salida correcta:** un único objeto JSON en **stdout** con `schemaVersion` (entero) en la raíz.
- **Errores:** un único objeto JSON en **stderr** con la forma `{ "schemaVersion": n, "code": "CODIGO_ESTABLE", "error": "mensaje para personas" }`, sin rutas crudas ni stack traces, sin secretos.
- **Códigos de salida:** `0` éxito; `1` error de ejecución; `2` entrada inválida o dependencia ausente (nada se ejecutó); `75` pausa por cuota agotada.
- **Flujos NDJSON:** un objeto por línea, cada uno con `schemaVersion` y `event`; siempre existe un evento terminal (`run_completed` o `fatal_error`) salvo muerte del proceso.
- **`--help` y `--version`** responden de inmediato y nunca leen stdin.
- **Entradas externas** (argv, stdin, archivos de configuración, respuestas de otros nodos) se validan con esquema (Zod) en la frontera; los campos desconocidos se rechazan.
- El código de error es un contrato: se lista en el `CONTRACT.md` del nodo y el verificador comprueba que los códigos documentados existen en el código y viceversa.
- **Formato del `code`:** identificador estable en `MAYUSCULAS_CON_GUION_BAJO`, regex `^[A-Z][A-Z0-9_]+$`. Los nodos con interfaz humana derivan el texto del mismo `code` mediante un catálogo tipado por idioma (spec §4.8).

## Alternativas descartadas

- **Adoptar el formato de Engram tal cual:** no lleva `schemaVersion` en la mayoría de sus salidas.
- **Adoptar el formato de Engines tal cual:** errores por stdout obligan a parsear la salida buena y la mala por el mismo canal.

## Consecuencias

- Cambio de contrato (nueva `schemaVersion`) en los cinco nodos durante la alineación; los consumidores (Shell, Atlas, Workers) se actualizan en el mismo ciclo.
- Aceptada por el propietario del producto el 2026-09-22. Se adopta con `schemaVersion` nuevo y una ventana de compatibilidad de una versión: cada consumidor acepta el formato anterior y el nuevo durante un ciclo de release, y después solo el nuevo.
- Shell 1.9.0 usa códigos en kebab-case en su catálogo de presentación (`ShellError`); en su alineación migra al formato del acta con mapeo 1:1. Su catálogo tipado por idioma se adopta como patrón para todos los nodos (spec §4.8).
- Ruling del coordinador 2026-09-22: formato de `code` fijado sin consulta adicional; costo si es incorrecto: renombrar códigos en un ciclo de release.

## Referencias

- Anexos: `docs/audits/README.md`
- Actas relacionadas: `0009`, `0011`, `0014`
