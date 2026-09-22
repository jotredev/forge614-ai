# Señales externas

Bandeja de datos que llegan de fuera (anuncios de asistentes, cambios de versión, publicaciones) y que pueden afectar al ecosistema. Una señal **no es una decisión**: se registra, se verifica contra el binario o la fuente real, y solo entonces produce un acta, un cambio en el procedimiento de agentes o una revisión de `sunset` (acta 0021).

Formato: un archivo por señal, `AAAA-MM-DD-<slug>.md`, con: qué se afirma, fuente, estado (`sin verificar | verificada | descartada`), cómo se verifica, impacto si es cierta, y qué dispara.

| Fecha | Señal | Estado | Dispara |
|---|---|---|---|
| 2026-09-22 | Claude Code lee `AGENTS.md` por defecto desde 2.1.277 | sin verificar | Revisión de `sunset` del adaptador `CLAUDE.md`; capacidad `instructions` de Engines |
