# 0006 — Nodo Hub: el almacén de paquetes

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

Había que decidir quién gestiona las reglas, skills, MCPs, plugins y políticas que llegan a cada proyecto y a cada IA, con vistas a un marketplace futuro. Engines ya sabe *cómo* escribir dentro de cada IA sin romperla; faltaba quien supiera *qué* existe, en qué versión, si es confiable y qué le toca a cada proyecto. Mezclar ambas cosas rompía la responsabilidad única de Engines; meterlo en forge614-ai rompía el modelo Lego.

## Decisión

Se crea el nodo **Hub** (nombre tentativo `forge614-hub`). Patrón canónico: **registro de artefactos + lockfile + verificación de cadena de suministro** (la analogía "almacén de piezas" es solo de lectura):

- **Catálogo** de paquetes: reglas, skills, MCPs, plugins y políticas se tratan como el mismo tipo de paquete, con versión, huella (checksum) y nivel de confianza.
- **No guarda código propio.** Guarda registro: catálogo, orígenes, confianza, huellas, cuarentena y el archivo de bloqueo (lock).
- **Instala en `.agents/`** del proyecto (fuente canónica) y anota en el lock qué archivos puso. **Solo toca lo que el Hub instaló**; si encuentra algo que no es suyo, se detiene y pregunta en Shell. Las skills de la persona nunca se pisan; los nombres repetidos se resuelven por "nombre + apellido" (origen).
- **Enlaza** cada skill a cada IA instalada o agregada al proyecto a través de Engines (patrón puertos y adaptadores, con Plan/Apply transaccional); el Hub nunca escribe directo en las carpetas de las IAs.
- **Update por huella:** si la huella coincide con lo que el Hub instaló, reemplaza con respaldo; si la persona lo modificó a mano, no lo pisa y avisa. Comandos: `forge614 update`, `forge614 update skills`, `forge614 update skills <nombre>`.
- **Marketplace futuro** = el mismo catálogo con un origen remoto.

Regla de scripts: **el script vive con quien es dueño del conocimiento, no con quien lo invoca.** Scripts del proyecto en el repo; scripts de una skill dentro de la skill (`scripts/`); scripts de un nodo en su nodo; el Hub no guarda código.

Contrato de script de skill: acepta argumentos con `--help`, responde JSON por salida estándar y usa códigos de salida documentados; así los obreros pueden ejecutarlos de forma verificable y contable.

## Alternativas descartadas

- **Meterlo en forge614-ai:** quien solo quiere Shell + skills tendría que instalar el jefe completo.
- **Meterlo en Engines:** convierte una pieza interna de bajo nivel en una tienda.
- **Hub con código propio:** se vuelve un segundo monorepo y rompe el Lego.

## Consecuencias

- Nuevo repositorio y nuevo contrato público (catálogo, plan, aplicar, lock, update, audit).
- Engines debe exponer plan/aplicación de enlaces de skills y adaptadores de proyecto.
- El `skills-lock.json` del monorepo, cuyas huellas nadie verifica hoy, queda sustituido por el lock del Hub con verificación real.

## Referencias

- Memoria Engram: `forge614-ai/decisions/nodes-hub-and-sentinel`
- Actas relacionadas: `0005`, `0007`, `0008`, `0016`
