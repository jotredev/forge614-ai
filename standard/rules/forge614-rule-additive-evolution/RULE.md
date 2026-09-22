# Evolución aditiva de datos y contratos

> Como ampliar una casa sin tirar paredes de carga: se agrega un cuarto, nunca se derrumba uno que ya está habitado.

**Regla.** En datos persistidos y en contratos públicos (esquemas de base de datos, archivos de configuración e identidad, protocolo de memoria, SDK, MCP, salidas JSON, códigos de error, nombres de comandos) solo se agrega: tablas, columnas nulas o con valor por defecto, campos JSON opcionales, comandos, herramientas, versiones de protocolo y códigos nuevos. Nunca se renombra, se elimina ni se cambia el tipo o el significado de algo existente. Lo que deja de usarse se marca obsoleto (no se borra): sigue funcionando, se documenta el reemplazo y lleva `sunset` (condición de retiro verificable y fecha de revisión); su retiro real solo ocurre con versión mayor, herramienta de migración con respaldo y acta. Las migraciones son hacia adelante, idempotentes, con respaldo automático antes de aplicarse y verificación posterior; ninguna reescribe, borra ni "limpia" datos de la persona usuaria. Cada nodo mantiene fixtures de datos escritos por versiones anteriores y un test que los abre con la versión actual sin error ni pérdida. Un campo nuevo sube `schemaVersion`/`format` cuando cambia la forma; el consumidor rechaza versiones desconocidas con `SCHEMA_UNSUPPORTED` (acta 0013), nunca las interpreta a ciegas.

**Alcance.** Todo nodo con datos persistidos o contratos públicos: esquemas de base de datos, archivos de configuración e identidad, protocolo de memoria, SDK, MCP, salidas JSON, códigos de error y nombres de comandos.

**Por qué.** Cuando un cambio renombra una tabla, una columna, un `topicKey` o un campo, toda persona con datos previos queda rota al actualizar; los ajustes deben ser siempre aditivos, como el ámbito `ecosystem` de la acta 0022 (acta 0024).

**Verificación.** Sin validador automático todavía; la comprobación `schema-evolution` (rechazo de `DROP`/`RENAME`/cambios de tipo en migraciones) llega con Sentinel fase 0.2. Por ahora, revisión humana.
