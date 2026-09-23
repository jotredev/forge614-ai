# 0026 — Bun 1.4.2 como versión única del ecosistema

**Fecha:** 2026-09-23
**Estado:** aceptada
**Sesión:** forge614-ai-2026-09-22-fase-0-1-tarea-10-b

## Contexto

Engram v1.5.2 dejó el workflow `verify` en rojo en `ubuntu` por un cuelgue intermitente de su CLI. La investigación (rama `work/v1.5.3-cli-hang-diagnosis` de `forge614-engram`) demostró con capturas de `/proc` que Bun 1.3.8 se atora en Linux durante la carga de módulos: el proceso queda en `epoll_pwait2` con los archivos de módulo abiertos y cero bytes de salida. Bun 1.3.9 y 1.4.0–1.4.2 no presentan el cuelgue.

Un hallazgo previo, "1.4.x rompe la idempotencia de `init` en `bun:sqlite`", resultó un falso positivo: la prueba comparaba los bytes del archivo y en el punto equivocado; comparando el contenido lógico, las cuatro versiones pasan. Un fallo aislado del test de inicializadores concurrentes no se reprodujo en 200 + 200 iteraciones (1.3.9 y 1.4.2), y el código ya usa `BEGIN IMMEDIATE` con `busy_timeout`. Con 1.4.2, `verify` de Engram quedó 5/5 en verde en `ubuntu` y `macOS` (run 35859426664).

Las plantillas del Estándar (`standard/templates/verify.yml` y `release.yml`) fijaban `bun-version: "1.3.8"`, y el ecosistema no tenía regla para elegir la versión del runtime ni para subirla: cada cambio era un accidente descubierto en `main`.

## Decisión

1. **Una sola versión de Bun para todo el ecosistema:** `1.4.2`, fijada en las plantillas del Estándar (`bun-version` de `verify.yml` y `release.yml`) y en los binarios publicados por cada nodo. Nunca `latest` en CI.
2. **Mínimo público para ejecutar desde fuente:** el `package.json` de cada nodo declara `"engines": { "bun": ">=1.3.9" }`. Bun 1.3.8 queda prohibida por el cuelgue en Linux.
3. **Subir de versión es un procedimiento, no un accidente.** Se propone por acta; se prueba en una rama de trabajo del nodo con más superficie (hoy Engram) con: suite completa ×3, bucle aislado ×500 del cuelgue, prueba de idempotencia lógica, escenario concurrente y `verify` 5/5 en `ubuntu` y `macOS`. Superadas las pruebas, `forge614-ai` actualiza plantillas y puntero, y cada nodo adopta la versión con su siguiente release.
4. **Revalidación:** al menos cada 90 días, o cuando salga una versión minor nueva de Bun, quien mantiene revisa el changelog y repite el procedimiento del punto 3. El registro de esa revalidación entra en la matriz de soporte en la fase 0.2: hoy la matriz solo modela agentes por nodo y se extenderá de forma aditiva (acta 0024).

## Alternativas descartadas

- **Seguir `latest` en CI.** Regresiones sin control: 1.3.8 fue una, y la siguiente se descubriría igual, en `main` y en rojo.
- **Quedarse en 1.3.9.** Funciona, pero la última versión verificada con el procedimiento completo es 1.4.2 y no hay razón probada para no adoptarla.
- **Rango abierto sin fijar (`>=1.3.9` también en CI).** Bytes y comportamiento no reproducibles entre máquinas; la paridad en tres sistemas operativos (acta 0018) exige una versión exacta.

## Consecuencias

- Cambian `standard/templates/verify.yml` y `release.yml`, los workflows propios de `.github/workflows/`, la tabla de dependencias de `CONTRACT.md` y `CONTRACT.en.md`, `package.json` (campo `engines`) y, con ello, el `sha256` del paquete del estándar en `forge614.node.json`.
- Engram v1.5.3 se publica con Bun 1.4.2.
- Shell, Engines, Atlas y Workers adoptan 1.4.2 en su siguiente release; los traspasos quedan pendientes.
- Riesgo aceptado: una regresión futura de Bun se detecta en la rama de prueba del procedimiento, no en `main`.

## Referencias

- Memoria Engram: topicKey `forge614-ai/ecosistema/version-de-bun`
- Actas relacionadas: `0017`, `0018`, `0019`, `0024`
