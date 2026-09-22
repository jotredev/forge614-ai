# Soporte obligatorio de macOS, Linux y Windows

> Como una puerta que abre igual sin importar de qué casa vengas.

**Regla.** Todo nodo del ecosistema publica, en cada release, binarios e instalador para macOS (arm64 y x64), Linux (arm64 y x64) y Windows (x64); su `release.yml` de plantilla compila y prueba cada objetivo en un runner nativo de esa plataforma. No existen excepciones ni estados "pendiente": un nodo al que le falte uno de los tres sistemas no se libera.

**Alcance.** Todo nodo publicado del ecosistema Forge614.

**Por qué.** Solo un nodo publicaba para los tres sistemas y probaba en Windows real; dejar la cobertura a criterio de cada nodo significa que una persona con Windows recibe medio ecosistema (acta 0018).

**Verificación.** Revisión humana de la configuración de CI por ahora; el `validator: release` llega en una fase posterior.
