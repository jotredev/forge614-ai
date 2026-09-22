# Nombres de paquetes: origen-tipo-nombre

> Como nombre y apellido: con solo leerlo sabes de quién es y qué es.

**Regla.** Todo paquete distribuido por el Hub (regla, skill, MCP, plugin, política, pack) se llama `origen-tipo-nombre`, en minúsculas y guiones: `forge614-rule-package-naming`, `anthropics-skill-pdf`. Regex: `^([a-z0-9]+)-(rule|skill|mcp|plugin|policy|pack)-([a-z0-9]+(?:-[a-z0-9]+)*)$`. En el catálogo, el identificador es `origen/tipo/nombre`.

**Alcance.** Obligatoria en `standard/rules/`, `standard/packs/` y en toda carpeta con `manifest.json` bajo `.agents/`. Las carpetas del usuario sin manifiesto no se tocan.

**Por qué.** Evita colisiones entre paquetes del usuario y del Hub y hace auditable cualquier log o libro de corridas (acta 0016).

**Verificación.** `validator: package-naming`.
