# Huella mínima en el contexto de la IA

> Como una maleta de mano bien empacada: cabe lo esencial, y lo demás se factura solo si hace falta.

**Regla.** Todo lo que Forge614 inyecta al inicio de una sesión (protocolo de memoria + índice de skills + pack de reglas aplicable) cabe en **≤ 3 000 tokens**. Ninguna skill, regla ni política se carga completa hasta que se usa: al inicio solo existe el índice (nombre y una línea). Un MCP o una skill sin uso en 30 días se propone apagar. Cada paquete declara su costo estimado en el campo `tokens` de su manifiesto, medido al empaquetar.

**Alcance.** Todo lo que Forge614 inyecta al contexto de un agente de IA al inicio de una sesión, y todo manifiesto de paquete.

**Por qué.** Los arneses de IA suelen inyectar skills completas, decenas de servidores MCP y pasos extra en cada sesión; el resultado conocido es un agente más lento que gasta más tokens sin que el trabajo mejore. La complejidad de Forge614 debe vivir en el constructor (nodos, verificador, CI), nunca en el contexto de la IA (acta 0020).

**Verificación.** Revisión humana por ahora; `validator: context-budget` llega en una fase posterior y medirá el presupuesto real de arranque.
