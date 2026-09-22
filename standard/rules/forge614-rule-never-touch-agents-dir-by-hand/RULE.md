# Nunca tocar .agents/ a mano

> Como el cuarto de máquinas de un edificio: solo el personal autorizado, con las herramientas correctas, entra.

**Regla.** Nunca se crea ni se modifica `.agents/`, `forge614.node.json` ni ningún archivo generado a mano; solo con las herramientas del ecosistema Forge614 (`forge614 init`, `forge614 update`, el Hub). `forge614 doctor` y el Sentinel detectan por huella si alguien lo hizo a mano.

**Alcance.** Todo agente de IA y toda persona que trabaje en un repositorio con Forge614 instalado.

**Por qué.** Es la regla núcleo que nació junto con la clasificación de reglas en tres niveles (acta 0005), para proteger la integridad de lo que el Hub instala y evitar que el estándar y la matriz de soporte envejezcan en silencio.

**Verificación.** Revisión humana y huella del Sentinel; el verificador automático de huella llega en una fase posterior.
