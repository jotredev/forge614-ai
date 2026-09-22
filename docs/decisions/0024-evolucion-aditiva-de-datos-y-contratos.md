# 0024 — Evolución aditiva de datos persistidos y contratos públicos: agregar, nunca renombrar ni quitar

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

Engram guarda la memoria de la persona en SQLite y publica un protocolo de memoria, un SDK, herramientas MCP y archivos como `.forge614/project.json`. Otros nodos persisten configuración, planes, instantáneas y salidas JSON versionadas. Cuando un cambio renombra una tabla, una columna, un `topicKey` o un campo, todo usuario con datos previos queda roto al actualizar. El propietario exige que los ajustes sean siempre **aditivos**, como el ámbito `ecosystem` de la acta 0022: se agrega, no se modifica ni se quita.

Patrones aplicables: evolución de esquema "expandir/contraer" limitada a la fase de expansión (expand-only); migraciones hacia adelante no destructivas; compatibilidad hacia atrás por contrato ("no romper lo que el usuario ya tiene"); obsolescencia explícita con `sunset` (acta 0021).

## Decisión

Regla de núcleo para **todo nodo con datos persistidos o contratos públicos** (esquemas de base de datos, archivos de configuración e identidad, protocolo de memoria, SDK, MCP, salidas JSON, códigos de error, nombres de comandos):

1. **Solo se agrega.** Tablas, columnas (nulas o con valor por defecto), campos JSON opcionales, comandos, herramientas, versiones de protocolo y códigos nuevos. Nunca se renombra, se elimina ni se cambia el tipo o el significado de algo existente.
2. **Obsoleto, no borrado.** Lo que deja de usarse se marca obsoleto: sigue funcionando, se documenta el reemplazo y lleva `sunset` (condición y fecha de revisión). Su retiro real solo ocurre con versión mayor, herramienta de migración con respaldo y acta.
3. **Migraciones hacia adelante y no destructivas.** Numeradas, idempotentes, con respaldo automático de la base antes de aplicarse y verificación posterior. Ninguna migración reescribe, borra ni "limpia" datos del usuario.
4. **Compatibilidad probada.** Cada nodo mantiene fixtures de datos escritos por versiones anteriores y un test que los abre y los lee con la versión actual sin error ni pérdida.
5. **Versionar lo que se agrega.** Un campo nuevo sube `schemaVersion`/`format` cuando cambia la forma; el consumidor acepta versiones conocidas y rechaza las desconocidas con `SCHEMA_UNSUPPORTED` (acta 0013), nunca las interpreta a ciegas.
6. **Verificación sin IA.** El verificador revisa los archivos de migración y falla ante `DROP TABLE`, `DROP COLUMN`, `RENAME` o cambios de tipo, y ante la desaparición de un campo, código o comando documentado en `CONTRACT.md` respecto a la versión anterior (comprobación `schema-evolution`, Sentinel fase 0.2).

## Alternativas descartadas

- **Permitir renombrados con migración automática.** Cualquier fallo a mitad de la migración deja al usuario con datos inaccesibles; el riesgo no compensa la limpieza del esquema.
- **Confiar en el número de versión mayor para avisar.** Un usuario no lee el changelog antes de `update`; la protección tiene que estar en el producto.

## Consecuencias

- Paquete de regla `forge614-rule-additive-evolution` (núcleo, `compensates: structural`) en el pack de nodo; texto es/en; el validador `schema-evolution` llega con Sentinel v0.
- El traspaso del ámbito `ecosystem` en Engram se ejecuta bajo esta regla: tablas nuevas, columnas nuevas nulas, protocolo v3 aditivo, sin tocar lo existente; test con una base de v1.5.x abierta por la versión nueva.
- La alineación de cada nodo revisa su historial de migraciones y sus contratos para detectar renombrados ya hechos y documentarlos como deuda (no se revierten).
- `STANDARD.md` §4 (contratos de máquina) y §11 (seguridad) incorporan la regla.

## Referencias

- Actas relacionadas: 0013 (contratos de máquina), 0021 (piezas reemplazables), 0022 (ámbito ecosystem), 0023 (identidad portátil).
- Engram: topicKey `forge614-ai/decisions/additive-evolution`.
