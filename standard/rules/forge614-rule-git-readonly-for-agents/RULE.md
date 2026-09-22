# Git de solo lectura para agentes de IA

> Como un becario que puede leer todos los archivos pero nunca firmar en nombre de otro.

**Regla.** Un agente de IA puede usar `git status`, `git diff` y `git log` para entender el estado de un repositorio, pero nunca ejecuta `git add`, `git commit`, `git push`, `git merge`, `git rebase`, `git reset --hard`, `git checkout -- .`, `git clean -f` ni cualquier otra operación que cambie el historial o el estado de una rama. El historial lo gestiona una persona.

**Alcance.** Todo agente de IA que trabaje dentro de un repositorio del ecosistema Forge614.

**Por qué.** Git es el original del registro de decisiones (acta 0015): si un agente puede reescribir el historial sin supervisión humana, se pierde la trazabilidad auditable del "por qué" de cada cambio.

**Verificación.** Revisión humana: no existe un comando de máquina que impida a un agente de IA ejecutar `git commit` por su cuenta; el candado es el procedimiento de arranque y el registro de la sesión.
