# Señal — Claude Code lee `AGENTS.md` por defecto (desde 2.1.277)

**Fecha de registro:** 2026-09-22 · **Estado:** sin verificar · **Fuente:** captura de una publicación en redes compartida por el propietario (no es fuente oficial)

## Qué se afirma

Desde la versión 2.1.277, Claude Code lee `AGENTS.md` por defecto y, si no lo encuentra, lee `CLAUDE.md`. No hay que configurar nada.

## Cómo se verifica (obligatorio antes de actuar)

1. `claude --version` en la máquina del propietario: ¿es ≥ 2.1.277?
2. En un directorio temporal con Git: crear solo `AGENTS.md` con una instrucción inequívoca y comprobable (p. ej. "responde siempre empezando con la palabra ANCLA"); abrir una sesión sin pantalla (`claude -p "di hola"`) y confirmar que obedece. Repetir con `CLAUDE.md` solo, y con ambos (¿cuál gana?).
3. Comprobar el comportamiento con instrucciones **globales** (`~/.claude/CLAUDE.md` vs un eventual `~/.claude/AGENTS.md` o `~/AGENTS.md`): la integración de memoria de Engines instala el protocolo en el archivo global; hay que saber si cambia.
4. Buscar el changelog oficial de la versión y citarlo en este archivo.

## Impacto si es cierta

- **Acta 0021 (piezas reemplazables):** el adaptador `CLAUDE.md` que solo delega en `AGENTS.md` (patrón del monorepo y de las plantillas del estándar) compensaba una limitación de la herramienta; su condición de retiro se cumple para Claude Code ≥ 2.1.277. Para versiones anteriores sigue haciendo falta.
- **Engines:** la capacidad `instructions` del adaptador `claude-code` pasa a depender de la versión detectada: archivo primario `AGENTS.md` cuando la versión lo soporte, `CLAUDE.md` en caso contrario; `plan memory-install` debe elegir el archivo correcto y `verify memory-integration` reportarlo. Requiere detectar la versión del binario (hoy la detección es solo de presencia).
- **Estándar (plantillas de proyecto, Task 6 del plan 0.1 y `forge614 prepare`):** `AGENTS.md` como archivo canónico de instrucciones; `CLAUDE.md` solo como adaptador de compatibilidad generado para versiones antiguas, marcado con su `sunset`.
- **Procedimiento de agentes (sección Engines):** nueva validación general: "¿qué archivo(s) de instrucciones lee el asistente, en qué orden y desde qué versión? Verificado con el binario, no con la documentación".

## Qué dispara

- Verificación (pasos 1–4) → si se confirma: acta nueva (retiro condicionado del adaptador `CLAUDE.md`), traspaso a Engines, actualización de plantillas y del procedimiento; celdas de Claude Code en Engines a `revalidar`.
- Si no se confirma: se marca `descartada` con la evidencia.
