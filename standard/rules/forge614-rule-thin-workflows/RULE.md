# Workflows delgados, documentados y validados

> Como un guion de teatro: los actores (los scripts) hacen el trabajo; el programa de mano (el YAML) solo dice el orden.

**Regla.** Cada paso de un workflow de CI ejecuta un script del repositorio (`bun run <script>`); ninguna lógica vive dentro del YAML, así que lo que corre en local es exactamente lo que corre en CI. Cada workflow está documentado en `docs/es/NN-workflows.md` y su par en inglés: disparadores, jobs, qué prueba, qué valida, qué publica y duración esperada. `bun workflows:check` valida sintaxis, esquema y que las acciones estén fijadas por versión antes de integrar; `bun workflows:run` ejecuta en local los mismos scripts que correría CI. La rama `main` está protegida: ninguna fusión sin el workflow `verify` en verde.

**Alcance.** Todo workflow de CI de cada repositorio del ecosistema.

**Por qué.** Un cambio se fusionaba a `main` y el workflow se rompía después, porque nadie sabía con precisión qué probaba cada uno y la lógica vivía dentro del YAML, imposible de correr en local (acta 0019).

**Verificación.** Revisión humana por ahora; `validator: workflows` llega en la Task 8.
