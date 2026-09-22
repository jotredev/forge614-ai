# 0008 — Políticas como paquetes en tres capas

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

Las políticas de operación (modelos por nivel, reintentos, techos de costo, revisor, aprobaciones) deben poder cambiarse sin tocar código, ser parametrizables por proyecto y, a futuro, distribuirse por el marketplace. Además había que distinguirlas de las reglas.

## Decisión

Una **política** es una perilla: se ajusta por proyecto. Una **regla** es una norma fija: se cumple o no, y cambiarla rompe compatibilidad. Criterio: si se cambiaría por proyecto, es política; si cambiarla rompe a todos, es regla (contrato).

Las políticas son **paquetes del Hub de tipo `policy`**: archivos versionados, legibles, con esquema que el Sentinel valida. Patrón canónico: **configuración en cascada** (resolución por capas, cada capa especializa a la anterior). Viven en tres capas:

```
1. Defaults del ecosistema   vienen con forge614-ai (política oficial, p. ej. forge614-policy-default)
        ↓ puede ajustar
2. Política del proyecto     en .agents/policies/ del repo
        ↓ puede ajustar
3. Ajuste por corrida        aprobado explícitamente; queda en el libro de corridas
```

Cada capa solo puede **endurecer o especializar** la anterior, nunca debilitarla en silencio.

**forge614 es la raíz de confianza:** el Hub trae por defecto un solo origen oficial; los orígenes de comunidad se agregan a propósito, pasan por el Sentinel y quedan marcados como tales.

## Alternativas descartadas

- **Políticas en código:** cambiar un techo exigiría una release.
- **Políticas solo por máquina:** un proyecto chico y uno crítico necesitan techos distintos.

## Consecuencias

- La tabla fija de modelos por nivel que hoy vive en el código de Atlas pasa a un paquete de política.
- El orquestador (Entrega 2) lee las políticas resueltas por capas; nunca decide fuera de ellas.
- El esquema de política se publica en la Entrega 1 aunque el cerebro aún no lo consuma.

## Referencias

- Memoria Engram: `forge614-ai/decisions/policies-and-accounting`
- Actas relacionadas: `0006`, `0010`, `0016`
