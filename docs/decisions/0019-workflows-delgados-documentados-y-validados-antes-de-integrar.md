# 0019 — Workflows delgados, documentados y validados antes de integrar a `main`

**Fecha:** 2026-09-22
**Estado:** aceptada
**Sesión:** forge614-ai-bd590adc-2026-09-21

## Contexto

En los nodos del ecosistema ocurre que un cambio se fusiona a `main` y el workflow de CI se rompe después, obligando a corregir en caliente. La causa de fondo es doble: los workflows contienen lógica propia que no se puede ejecutar en local, y nadie sabe con precisión qué prueba, qué valida y qué publica cada uno, porque no están documentados. El propietario del producto exige que cada workflow esté documentado y que exista un comando para ejecutarlos y hacerlos pasar antes de integrar.

Patrones aplicables: "una sola fuente de verdad" para la lógica de verificación (los scripts del repositorio), con el workflow como envoltura delgada; puerta de calidad en la rama protegida; validación estática de la configuración de CI antes de ejecutarla.

## Decisión

Tres reglas en el Estándar de Nodo (spec, sección 4.7):

1. **Workflows delgados.** Cada paso de un workflow ejecuta un script del repositorio (`bun run <script>`). Ninguna lógica vive dentro del YAML. Lo que corre en local con `bun verify` es exactamente lo que corre en CI.
2. **Workflows documentados.** Cada workflow tiene su documentación en `docs/es/NN-workflows.md` y su par en inglés: disparadores, jobs, qué prueba, qué valida, qué publica y duración esperada. El verificador (`workflows`) cruza los jobs del YAML con los documentados y falla si alguno falta.
3. **Validación antes de integrar.** `bun workflows:check` valida sintaxis y esquema de cada YAML, que las acciones estén fijadas por versión y que los pasos solo llamen scripts; forma parte de `bun verify`. `bun workflows:run` ejecuta en local, en el mismo orden, los scripts que CI ejecutaría; un gancho `pre-push` de plantilla lo corre. La rama `main` queda protegida: ninguna fusión sin el workflow `verify` en verde.

## Alternativas descartadas

- **Ejecutar el YAML completo en local con un emulador de CI.** Añade una dependencia pesada y aun así no reproduce los runners nativos por plataforma; con workflows delgados no hace falta, porque el YAML no contiene nada que no sea llamar scripts.
- **Confiar en la revisión humana del YAML en cada PR.** Es lo que falla hoy; una regla sin verificador no es una regla.
- **Solo proteger `main` sin comando local.** Protege la rama pero obliga a descubrir los fallos en CI, que es lento y ruidoso.

## Consecuencias

- Las plantillas `verify.yml` y `release.yml` se reescriben como envolturas de scripts; toda lógica pasa a `package.json`/`scripts/`.
- La plantilla de repositorio incluye el gancho `pre-push` y documenta la configuración exacta de protección de rama.
- El verificador suma la comprobación `workflows` (18 en total).
- Los cinco nodos añaden `docs/*/NN-workflows.md` en su alineación; Shell, Atlas y Workers además crean sus workflows desde plantilla.

## Referencias

- Spec: `docs/superpowers/specs/2026-09-22-entrega-0-estandar-de-nodo-design.md`, secciones 4.7 y 6.2.
- Actas relacionadas: 0007 (Sentinel), 0013 (contratos de máquina), 0018 (tres sistemas operativos).
- Engram: topicKey `forge614-ai/decisions/workflows-thin-documented-validated`.
