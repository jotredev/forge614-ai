# Protección de la rama `main`

Configuración exacta que debe tener el repositorio (Settings → Rules → Rulesets, o Branch protection):

| Ajuste | Valor |
| --- | --- |
| Rama protegida | `main` |
| Requiere pull request antes de fusionar | Sí; 1 aprobación mínima; descartar aprobaciones obsoletas |
| Status checks requeridos | `verify` y `parity` (ambos del workflow `verify.yml`), actualizados con la base |
| Push directo a `main` | Prohibido para todos, incluidos administradores |
| Force push y borrado de `main` | Prohibidos |
| Historial lineal | Requerido |
| Firmas de commit | Recomendado |

Además, cada persona instala el gancho local: `git config core.hooksPath .githooks`.
