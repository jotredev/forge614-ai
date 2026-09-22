# 0003 — `forge614 init` para la máquina y `forge614 prepare` para el proyecto

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

Instalar el ecosistema toca dos ámbitos distintos: la máquina (nodos, memoria, IAs conectadas) y cada proyecto (reglas según su stack, skills, política, vínculo a memoria). La experiencia debía ser sencilla, amigable y rápida, y evitar que la persona crea que "ya quedó" cuando aún falta preparar el proyecto. También se evaluó que la IA preparara el proyecto desde el chat, y se descartó por riesgo.

## Decisión

Dos comandos, dos ámbitos:

- **`forge614 init`** — máquina, una sola vez. Instala o actualiza los nodos faltantes desde releases verificados (resolución transitiva de dependencias, acta 0001), inicializa Engram, detecta las IAs vía Engines (puertos y adaptadores) y las conecta a Engram (MCP + protocolo de memoria + gancho de arranque) con **Plan/Apply transaccional**: plan → vista previa → confirmación → aplicar en Shell, instala el catálogo local del Hub y las políticas por defecto. Experiencia: **una pantalla con casillas y un solo Enter**; detalle expandible; idempotente (repetirlo repara o actualiza, nunca duplica); `--yes --json` para scripts y CI. Termina con el mensaje exacto de que todavía no hay reglas ni skills en ningún proyecto y que hay que entrar al proyecto y ejecutar `forge614 prepare`.
- **`forge614 prepare`** — proyecto, una vez por proyecto, ejecutado por la persona desde Shell o la terminal dentro del repo. Detecta que es proyecto (`.git` o manifiesto), detecta el stack por archivos, vincula a Engram, instala reglas (núcleo siempre, stack por detección, opcionales desmarcadas), skills base y política del proyecto; Atlas es opcional y se pregunta. Misma experiencia de una pantalla. Nunca sobrescribe un `.agents/` existente.

**La IA nunca prepara.** El gancho de arranque que Engines instala en cada IA ejecuta `forge614 status --directory <cwd> --json` y entrega un mensaje fijo generado por forge614-ai ("Este proyecto no está preparado para Forge614. Ábrelo desde Shell y ejecuta `forge614 prepare`"). Es un recordatorio de solo lectura; no existe herramienta MCP de preparación. Cobertura por IA: aviso nativo, relé por el modelo, o ninguno; Engines reporta la capacidad.

Shell abierto fuera de un proyecto funciona como recepción: estado de máquina, proyectos recientes de Engram (preparado / sin preparar), abrir otra carpeta, convertir carpeta en proyecto, chat general con memoria compartida y sin obreros.

## Alternativas descartadas

- **Asistente paso a paso (una pregunta por pantalla):** más control, pero es la experiencia confusa que se quería evitar.
- **Preparar el proyecto automáticamente al primer uso desde el chat de la IA:** aunque con candados (mensaje fijo, herramienta sin parámetros, aprobación del cliente), delega una escritura en el repo a un modelo que puede ser barato; además exigía una excepción al contrato ("toda configuración pasa por Shell").
- **Buscar proyectos en el disco al hacer `init`:** lento, impreciso y toca repos que la persona no quería.
- **Negar Shell fuera de un proyecto:** pierde la lista de proyectos y el estado de máquina sin ganar seguridad.

## Consecuencias

- Toda configuración sigue pasando por Shell; el contrato queda intacto.
- Engines debe exponer plan/aplicación de adaptadores de proyecto y de instrucciones globales, además del gancho ya existente.
- Shell necesita una pantalla de plan genérica y la recepción sin proyecto.
- Atajos para muchos proyectos: política `auto`, "preparar varios" desde Shell, carpeta de trabajo registrada en `init`.

## Referencias

- Memoria Engram: `forge614-ai/decisions/init-and-prepare-flow`
- Actas relacionadas: `0001`, `0004`, `0005`, `0009`
