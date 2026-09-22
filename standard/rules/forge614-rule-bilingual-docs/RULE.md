# Documentación bilingüe es/en

> Como una etiqueta de producto con dos idiomas impresos, uno junto al otro, siempre actualizados a la par.

**Regla.** Toda superficie orientada a personas (documentación, mensajes de Shell, descripciones de paquetes y políticas, explicaciones del Sentinel, resúmenes) existe en español e inglés, con la misma numeración de archivo y la misma estructura y numeración de encabezados. El código, los identificadores y las claves de datos van en inglés; nunca se traducen.

**Alcance.** `README.md`, `standard/STANDARD.md`, `CONTRACT.md`, y los pares `docs/es/NN-slug.md` / `docs/en/NN-slug.md` de cada repositorio del ecosistema.

**Por qué.** Con el Hub, cualquier persona necesita saber qué es un paquete y por qué existe una decisión, en su idioma; la paridad rota en silencio es peor que no tener traducción (acta 0016).

**Verificación.** `validator: bilingual-docs`.
