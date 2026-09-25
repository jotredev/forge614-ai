# Mejoras pendientes para `forge614-shell`

> Como la libreta de un cliente que prueba el coche nuevo: cada cosa que el propietario nota al usar Shell se anota aquí, con fecha y en sus palabras, para convertirla en tareas cuando llegue el frente de Shell.

**Qué es:** la lista de mejoras de experiencia de uso que el propietario va encontrando mientras usa `forge614-shell` desde la terminal (desde el 2026-09-25). Meta del propietario: una terminal 100 % funcional, de nivel mundial, que haga las cosas bien.
**Quién la llena:** el orquestador de `forge614-ai`, cada vez que el propietario le pasa un punto. No se implementa nada desde aquí: cuando llegue el frente de Shell, cada punto se convierte en tarea del plan de Shell y se marca con el plan que lo resolvió.
**Formato de cada punto:** fecha · qué pasó o qué quiere (en palabras del propietario) · qué se espera · prioridad (alta / media / baja, si el propietario la da) · estado (pendiente / en plan `<ruta>` / resuelto en `<versión>`).

## Puntos

| # | Fecha | Qué pasó o qué quiere | Qué se espera | Prioridad | Estado |
|---|---|---|---|---|---|
| 1 | 2026-09-25 | «No puedo cambiar el modo de trabajo en medio, tengo que esperar a que termine todo; aquí en Orca sí puedo cambiar el modo de trabajo cuando está en proceso de algo.» Con un permiso de Bash pendiente, cambiar de modo respondió `Error: Termina o usa /stop en el turno actual primero.` | Cambiar el modo de trabajo (manual ↔ otros, `Shift+Tab`) en cualquier momento, también a mitad de un turno o con un permiso pendiente, sin tener que esperar ni usar `/stop`, como en Orca | — | pendiente |
| 2 | 2026-09-25 | «En el sidebar mostrar qué está usando del ecosistema de Forge614: Engram, Engines, etc., como para decirle al usuario qué tiene instalado, qué usa y qué no usa; también los MCP conectados, pero por Forge614.» Hoy la barra lateral (Shell v1.11.0) muestra Sesión, Contexto, Uso del plan y Recursos, sin nada del ecosistema | Una sección de la barra lateral con cada pieza de Forge614 (Engram, Engines, etc.): si está instalada, su versión y si esta sesión la está usando o no; y la lista de servidores MCP conectados a través de Forge614 | — | pendiente |
