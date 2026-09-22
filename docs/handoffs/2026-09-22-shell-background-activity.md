# Traspaso — Shell: mostrar actividad en segundo plano (agentes y procesos)

**Fecha:** 2026-09-22 · **Repositorio destino:** `forge614-shell` · **Ejecuta:** el propietario, en una sesión dentro de ese repo · **Revisa:** forge614-ai (coordinador)
**Prioridad:** P2 (experiencia; no bloquea otros trabajos)

## Problema

Cuando el asistente lanza un agente o un proceso en segundo plano (por ejemplo, un ayudante que investiga o edita mientras la conversación sigue), Shell no muestra nada: ni que hay trabajo en curso, ni cuántos, ni cuándo terminan. Un cliente nativo sí lo hace (fila "agente en segundo plano", contador "esperando N agentes", lista de agentes con estado en la barra inferior). Sin esa señal, la persona cree que Shell está detenido o que el agente no hizo nada.

## Prompt para la sesión en `forge614-shell`

```
Contexto. Este repositorio es forge614-shell (v1.9.0), la única interfaz visual del ecosistema Forge614.
Hoy se aprobó el Estándar de Nodo (repo forge614-ai, docs/superpowers/specs/
2026-09-22-entrega-0-estandar-de-nodo-design.md) y las actas 0001–0019. Aplican: acta 0016 (todo texto
para personas bilingüe es/en: usa el catálogo tipado src/i18n/), acta 0013 (códigos de error estables),
acta 0012 (nunca mencionar productos externos), "plan antes que código" (.agents/plans/), Git de solo
lectura para agentes (no commit ni push), y "cuestiona antes de hacer": antes de tocar código explica
para qué sirve, qué beneficia, pros, contras y alternativas. No introduzcas escaneo de PATH ni lanzamiento
de binarios nativos desde Shell (decisiones vigentes en AGENTS.md).

Problema. Shell no muestra nada cuando el asistente tiene agentes o procesos en segundo plano. Se necesita
una señal visible y honesta: solo lo que el protocolo del motor realmente reporta; nunca inventar estado.

Tarea (TDD; primero el plan con Decisions):
1. Investiga con evidencia real (no por documentación) qué eventos emite cada motor sobre trabajo en
   segundo plano: en el SDK de Claude Code, las llamadas a la herramienta de agentes con ejecución en
   segundo plano y las notificaciones de tarea que llegan después; en Codex app-server, los eventos
   equivalentes de sub-tareas o procesos. Anota en el plan qué se puede saber con certeza en cada motor
   y qué no (si un motor no lo reporta, Shell lo dice: "este motor no informa actividad en segundo plano").
2. Diseña un modelo único en src/engines/types.ts: `BackgroundActivity { id, kind: "agent" | "process",
   label, state: "running" | "done" | "failed", startedAt, endedAt? }`, alimentado por cada adaptador
   (claude/session.ts, codex/session.ts) a partir de sus eventos reales.
3. Muestra la actividad en la interfaz compartida (src/ui/basic/): un indicador en la barra de estado
   ("2 en segundo plano" con el punto animado existente) y una lista en el panel lateral (ShellSidebar)
   con nombre, estado y tiempo transcurrido; al terminar, la fila cambia a hecho/fallido y se puede
   expandir para ver el resultado si el motor lo entrega. Reutiliza ActivityCard y el spinner actuales;
   nada de cajas JSON.
4. Textos por el catálogo i18n (es/en), con paridad garantizada por el compilador.
5. Tests con dobles de sesión (como los existentes) para: aparición de una actividad, actualización a
   hecho, fallo, motor que no reporta, y varios agentes simultáneos.
6. Documenta en docs/es y docs/en (documento 05 de interfaz) y sincroniza notion-map.json.
7. Ejecuta suite completa, typecheck y build. NO hagas commit ni publicación.

Reporte para revisión: qué eventos reales encontraste por motor (con la forma exacta del evento),
archivos tocados, tests añadidos, capturas o render de texto del panel, y la sección "Impacto en el
procedimiento de agentes" (Sí/No con motivo: un asistente nuevo deberá declarar si reporta actividad en
segundo plano; esto entra en la sección de Shell del procedimiento central).
```

## Qué revisará forge614-ai al recibir el resultado

- Que no se muestre estado que el motor no reporta (honestidad).
- Que el modelo `BackgroundActivity` sea común a los adaptadores y no dependa de uno.
- Que los textos estén en el catálogo tipado y las docs es/en al día.
- Que el plan declare el impacto en el procedimiento de agentes (esta capacidad se vuelve requisito a validar para asistentes nuevos).
