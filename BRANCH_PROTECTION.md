# Protección de la rama `main`

Configuración exacta que debe tener el repositorio (Settings → Rules → Rulesets, o Branch protection):

| Ajuste | Valor |
| --- | --- |
| Rama protegida | `main` |
| Requiere pull request antes de fusionar | Sí; 1 aprobación mínima; descartar aprobaciones obsoletas |
| Status checks requeridos | `verify`, `parity (ubuntu-24.04)`, `parity (macos-15)` y `parity (windows-2025)` (los cuatro del workflow `verify.yml`), actualizados con la base |
| Push directo a `main` | Prohibido para todos, incluidos administradores |
| Force push y borrado de `main` | Prohibidos |
| Historial lineal | Requerido |
| Firmas de commit | Recomendado |

Regla: un job con matriz reporta un status check por entrada, con el nombre `job (valor)`, por eso `parity` aparece tres veces y ningún check llamado solo `parity` existe.

Además, cada persona instala el gancho local: `git config core.hooksPath .githooks`.
