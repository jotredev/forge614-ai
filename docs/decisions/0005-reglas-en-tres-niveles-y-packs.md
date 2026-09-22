# 0005 — Reglas en tres niveles y packs de reglas

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

Las 25 reglas de ingeniería existentes nacieron para el monorepo de aplicaciones (Bun, TypeScript, Prisma, i18n, Changesets). Instalarlas todas en cualquier proyecto (por ejemplo uno en Python o una landing sin base de datos) confundiría a la IA con reglas que no aplican.

## Decisión

Las reglas se clasifican en tres niveles:

| Nivel | Qué son | Se instalan… | Se pueden apagar |
|---|---|---|---|
| **Núcleo** | Cómo trabaja la IA con el ecosistema, sin importar el stack: `origen-tipo-nombre`, Git solo lectura para agentes, plan antes que código, nunca inventar resultados de validación, nada de secretos en memoria, comunicación del agente, cuestionar antes de hacer | Siempre | No. Una excepción es explícita, autorizada, documentada y registrada en el plan. |
| **Stack** | Dependen de la tecnología (Bun, TypeScript strict, Prisma, i18n, Changesets…) | Solo si el proyecto lo usa, por detección sin IA sobre archivos (`bun.lock`, `tsconfig.json`, `prisma/schema.prisma`…) | Sí, por proyecto, con registro de quién, cuándo y por qué |
| **Opcional** | Preferencias de trabajo (estilo de UI, iconos, emails…) | Se proponen desmarcadas | Sí |

Cada regla de stack declara en su manifiesto cuándo aplica. Existen **packs** que agrupan reglas: `forge614-pack-bun-monorepo` (las 25 reglas actuales, para proyectos creados desde la plantilla) y `forge614-pack-ecosystem-node` (para los repos del propio ecosistema).

Regla núcleo nueva: **nunca crear ni modificar `.agents/` a mano; solo con las herramientas de Forge614.** `forge614 doctor` y el Sentinel detectan por huella si alguien lo hizo.

Si más adelante el proyecto agrega una tecnología, `forge614 update` avisa que una regla de stack ahora aplica y pregunta si activarla.

## Alternativas descartadas

- **Instalar siempre las 25 reglas:** reglas que no aplican confunden al modelo y gastan tokens.
- **Que la IA decida cuáles aplican:** la detección debe ser objetiva y sin IA para ser reproducible.

## Consecuencias

- Las 25 reglas actuales se separan en núcleo y stack y se empaquetan como paquetes del Hub con validador propio.
- El apagado de una regla queda registrado en el proyecto y en el libro de corridas; nunca desaparece en silencio.

## Referencias

- Memoria Engram: `forge614-ai/decisions/init-and-prepare-flow`
- Actas relacionadas: `0006`, `0016`
