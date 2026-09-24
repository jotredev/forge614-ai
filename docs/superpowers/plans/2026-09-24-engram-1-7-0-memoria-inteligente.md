# Engram 1.7.0 — Memoria inteligente (plan de implementación)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar `forge614-engram` 1.7.0 con la memoria inteligente: índice por palabras, metadatos aparte, filtro de secretos, buscador en lenguaje natural, duplicados en dos niveles, reglas del tablero, sesiones interrumpidas, bloque de arranque listo y protocolo v4.

**Architecture:** Un nivel de esquema nuevo (11 = base 7 + ecosistema + inteligencia) que **solo agrega** tablas, un índice FTS5 `unicode61` y sus triggers; se activa con un comando explícito (`intelligence-enable`) con respaldo y verificación, porque el servidor MCP de Engram nunca migra la base. Todo lo nuevo se activa solo si el nivel 11 está presente; en niveles anteriores Engram se comporta igual que 1.6.0. Los datos nuevos viven fuera de la versión del recuerdo para no romper los formatos de réplica 1–3.

**Tech Stack:** Bun 1.4.2, TypeScript, `bun:sqlite` (FTS5), zod (solo en fronteras, carga perezosa fuera de `mcp`), `bun test`.

**Spec:** `forge614-ai/docs/superpowers/specs/2026-09-24-memoria-inteligente-engram-design.md` (§4–§9, M1–M12, R1–R7).

**Dónde se ejecuta:** en `~/Desktop/forge614-engram`, rama `work/1.7.0-memoria-inteligente` desde `main` (`9cbb7b5`). Este archivo vive en `forge614-ai` y el orquestador entrega un prompt por tarea; **una tarea = una sesión nueva**, con la etiqueta `[Engram · T<n>]`. El detalle con código de cada tarea se escribe **después de aprobar la anterior** (esqueleto aprobado por el propietario el 2026-09-24); hasta entonces, T2–T10 tienen objetivo, archivos, contratos y criterio de terminado.

## Global Constraints

- Solo agregar (acta 0024): nunca renombrar ni quitar tablas, columnas, campos JSON, comandos, herramientas ni códigos; campos nuevos opcionales.
- Nivel de esquema nuevo: `PRAGMA user_version = 11` = `{ base: 7, ecosystem: true, intelligence: true }`; 12 queda como "versión futura" en las pruebas.
- Migración: sonda de escritura antes del respaldo, respaldo `VACUUM INTO` `…v<n>-pre-intelligence-<stamp>-<uuid8>.bak` con permisos 0600, verificación de conteo y huella de `memories` y `requests`, `integrity-check` de ambos índices FTS, todo en una transacción inmediata; cualquier diferencia → `MIGRATION_VERIFY_FAILED` y rollback.
- El servidor MCP no migra la base; la activación es explícita (`intelligence-enable`) o en `init`/`setup` (T8).
- Datos nuevos fuera de `memory_versions.snapshot` (la réplica valida claves exactas en `src/modules/synchronization/snapshot.ts`).
- Arquitectura: cada archivo `src/**/*.ts` con comportamiento tiene su `X.test.ts` hermano; los módulos cruzan solo por `index.ts`; `app` no importa `bun:sqlite`; `interfaces` solo importa `src/app/index.ts`.
- **Contrato público del SDK:** todo método nuevo de `MemoryStore` (o export nuevo) se registra en `src/index.test.ts` (listas que solo crecen, con comentario `// Added in 1.7.0 …`) y en `ExpectedStore` de `tests/fixtures/sdk-contract.ts` con su firma exacta; ninguna firma existente cambia.
- Mensajes de error para personas en español; comentarios de código, texto del protocolo y descripciones MCP en inglés; documentación es/en con el mismo contenido.
- Commits convencionales en inglés, **sin líneas de atribución ni menciones a ninguna IA**; sin merge, tag ni release (los autoriza el propietario tras la revisión de `forge614-ai`).
- Sin nombres de productos externos en código, pruebas ni docs (acta 0012); el protocolo v4 no puede contener `claude|openai|anthropic` (misma regla que la prueba de v3).
- **Documentación tarea por tarea (regla del propietario, 2026-09-24):** al terminar cada tarea, con un **prompt aparte** (etiqueta `[Engram · T<n> · docs]`, misma sesión) para medir su costo por separado, se actualizan en **un commit propio** los capítulos es/en que describen lo que cambió, agrega su viñeta a la sección `## 1.7.0 — en desarrollo` de `CHANGELOG.md` y marca `"notionSyncPending": true` en las entradas de `docs/notion-map.json` de los capítulos que tocó **solo si la entrada existe y aún no está marcada** (nunca se crean entradas nuevas: exigirían inventar URL y huella). El orquestador verifica en cada revisión que código, pruebas y documentación digan lo mismo, y al cerrar cada tarea revisa `standard/procedures/new-agent-checklist.md` de `forge614-ai` (acta 0017) y registra el impacto (Sí con el punto nuevo, o No con el motivo); T8 solo hace la pasada final de coherencia y la versión.

## Review Focus

- **Base real del propietario en nivel 10 con 107 recuerdos (92 proyecto, 14 compartidos, 1 ecosistema):** `intelligence-enable` debe migrarla sin perder ni alterar una sola fila y dejar respaldo. Prueba: fixture `v1.6.0/schema-10.db` con los tres ámbitos, versiones, archivado y sesión (T1).
- **Conexión de solo lectura:** activar debe fallar **antes** de crear un respaldo inútil. Prueba en T1.
- **Falla a mitad de la migración:** rollback completo, nivel 10 intacto, sin tablas nuevas. Prueba en T1.
- **Búsqueda con acentos y en lenguaje natural** ("decision" encuentra "Decisión"; frases largas no devuelven 0). Base en T1 (índice `unicode61 remove_diacritics 2`), buscador completo en T3.
- **Base en nivel < 10 (instalaciones viejas):** activar encadena bindings, sesiones, refuerzo y ecosistema, cada uno con sus propias garantías. Prueba en T1.

## Tabla de tareas

| # | Tarea | Riesgo | Herramienta · modelo · razonamiento | Variable de experimento |
|---|---|---|---|---|
| T1 | Esquema nivel 11 + `intelligence-enable` | alto (datos reales) | Claude Code · Opus 5.5 · high | línea base: plan con código completo, reporte fijo |
| T2 | Filtro de secretos + metadatos (versión corta, vigencia 90 días, "reemplazado por") | medio | Codex · gpt-5.6-terra · medium | Codex medium con código completo |
| T3 | Buscador nuevo + candidatos parecidos + 20 consultas | medio-alto | Claude Code · Sonnet 5 · high | Sonnet high con código completo |
| T4 | Reglas del tablero, `affects`, tope, bajar, proyecto fuente, nota de estado | medio | Codex · gpt-5.6-terra · medium | **solo pruebas + contratos** (sin código de implementación) vs T2 |
| T5 | Sesiones: actividad e interrumpidas | medio | Claude Code · Sonnet 5 · medium | Sonnet medium vs T3 high |
| T6 | Bloque de arranque (formato 2) | medio-alto | Claude Code · Sonnet 5 · high | Sonnet high |
| T7 | Protocolo v4 + instrucciones MCP + descripciones | medio | Claude Code · Sonnet 5 · medium | Sonnet medium (redacción) |
| T8 | Docs es/en, CHANGELOG, códigos, activación en init/setup, plan de réplica → 1.8.0, versión | bajo | Claude Code · Sonnet 5 · low | low |
| T9 | Revisión independiente de toda la rama | — | Codex · gpt-5.6-terra · high | otro proveedor |
| T10 | PR, CI, publicación, instalación y activación en la Mac | bajo | Claude Code · Sonnet 5 · low | low |

Orden: T1 → T2 → T3 → T5 → T4 → T6 → T7 → T8 → T9 → T10 (uno a la vez; cada prompt se escribe tras aprobar el reporte anterior).

## Contratos compartidos (los fija este esqueleto; las tareas no los cambian sin aviso)

**Nivel 11 (T1):**
- `memory_meta(memory_id PK → memories.id, short TEXT ≤300, review_after TEXT, superseded_by → memories.id, affects TEXT JSON, updated_at)`.
- `session_activity(sessionId PK → sessions.sessionId, lastActivityAt, interruptedAt)`.
- `ecosystem_sources(groupId PK → ecosystem_groups.id, projectId → projects.projectId, setAt)`.
- `memories_words` FTS5 (`title, content, topic_key`, `content='memories'`, `tokenize='unicode61 remove_diacritics 2'`) + triggers `memory_words_insert|delete|update`.
- `intelligenceEnabled(db): boolean` en `src/infrastructure/sqlite/intelligence.ts`; `MemoryStore.intelligenceEnabled()` y `MemoryStore.enableIntelligence(): IntelligenceEnrolment`.

**T2:** `findSecret(text: string): string | null` (`src/modules/memory/secrets.ts`, devuelve el id del patrón, nunca el valor) → `SECRET_REJECTED`; `MemoryMeta { short: string | null; reviewAfter: string | null; supersededBy: string | null; affects: string[] | null }`; `SaveInput` gana opcionales `short?`, `supersedes?` (id del recuerdo que queda "reemplazado por" el nuevo) y `affects?`; `REVIEW_AFTER_DAYS = 90` para `decision` y `procedure`; `memory_get`/`memory_search` agregan `meta` y `marks: ("superseded" | "verify")[]`.

**T3:** `buildQuery(text: string): QueryPlan { terms: string[]; words: string | null; trigram: string | null }` (`src/modules/search/query.ts`, sin palabras de relleno ES/EN, prefijo `*` en términos ≥ 4 letras, OR); fusión de `memories_words` y `memories_fts` por RRF; `MIN_SCORE`; `explanation.mode` agrega `"hybrid"`; `similarTo(...)`: `SimilarCandidate { id: string; title: string; version: number; score: number }[]` (máx. 3, mismo ámbito y dueño); `memory_save` devuelve `similar` cuando no hubo tema ni texto idéntico.

**T4:** en nivel 11, `scope: "ecosystem"` exige `type ∈ {decision, procedure, warning}` y `affects` con ≥ 2 nombres de proyectos del grupo; `ECOSYSTEM_BOARD_LIMIT = 40` recuerdos activos; códigos `ECOSYSTEM_TYPE_NOT_ALLOWED`, `ECOSYSTEM_AFFECTS_REQUIRED`, `ECOSYSTEM_AFFECTS_UNKNOWN`, `ECOSYSTEM_BOARD_FULL`, `ECOSYSTEM_STATUS_FORBIDDEN`, `ECOSYSTEM_STATUS_TOO_LONG`; CLI `memory-demote --id <id> --project-id <id>` y `group-source-set --group <ref> --project-id <id>`; tema reservado `ecosystem/estado-actual` (fijado, ≤ 600 caracteres, `fact` permitido, solo desde el proyecto fuente del grupo).

**T5:** `touchSession(db, sessionId, at)`; al iniciar una sesión runtime, las demás abiertas del mismo proyecto quedan `endedAt` + `interruptedAt`; inactividad > `INACTIVITY_HOURS = 6` también cuenta como interrumpida al leer; `previousInterrupted(db, projectId): { sessionId: string; interruptedAt: string; summary: MemoryVersion | null } | null`.

**T6:** `startup-context --format 2` → `StartupBlock { format: 2; text: string; chars: number; sections: { essentials: number; previous: number; index: number }; omitted: number }`; topes `TOTAL 5000`, `ESSENTIALS 1500`, `PREVIOUS 800`; el `format: 1` queda byte-idéntico.

**T7:** `protocolV4` y `memoryProtocol(4)`; salida completa ≤ 2 500 caracteres; `MEMORY_PROTOCOL` (instrucciones MCP) < 2 000 caracteres generado de la misma fuente; `.describe()` en los campos de `toolSchemas`; `--protocol-version 4`; el default sigue en 1 (Engines pedirá 4 explícitamente).

---

### Task 1: Esquema nivel 11 e `intelligence-enable`

**Files:**
- Create: `tests/fixtures/v1.6.0/schema-10.db` (generado con el código de `main` **antes** de cualquier cambio)
- Modify: `src/infrastructure/sqlite/schema.ts`
- Create: `src/infrastructure/sqlite/intelligence.ts`, `src/infrastructure/sqlite/intelligence.test.ts`
- Create: `src/infrastructure/sqlite/intelligence-schema.test.ts`
- Modify: `src/infrastructure/sqlite/ecosystem-schema.test.ts` (líneas 51, 54, 61: `schemaState` gana `intelligence: false`; línea 191: versión futura 11 → 12)
- Modify: `src/infrastructure/sqlite/schema.test.ts:71` y `src/infrastructure/sqlite/projects.test.ts:28` (versión futura 11 → 12)
- Modify: `src/app/memory-store.ts` (+ su prueba hermana)
- Modify: `src/index.test.ts` (lista `INTELLIGENCE_STORE_METHODS`) y `tests/fixtures/sdk-contract.ts` (`ExpectedStore`)
- Modify: `src/interfaces/cli/arguments.ts:5`, `src/interfaces/cli/commands.ts` (junto a `reinforcement-enable`, ~línea 53), `src/interfaces/cli/help.ts` (tras la línea 27) y sus pruebas (`arguments.test.ts`, `commands.test.ts`, la prueba que fija el texto de ayuda)

**Interfaces:**
- Consumes: `decode`, `encode`, `validate`, `backupBeforeMigration`, `contentDigest`, `verificationFailed`, `enableEcosystem`, `enableSessionLifecycle`, `enableSearchReinforcement` de `schema.ts`.
- Produces:
  ```ts
  // src/infrastructure/sqlite/schema.ts
  export interface SchemaState { readonly base: Base; readonly ecosystem: boolean; readonly intelligence: boolean }
  export interface IntelligenceEnrolment { readonly migrated: boolean; readonly backup: string | null }
  export function enableIntelligence(db: Database): IntelligenceEnrolment;
  // src/infrastructure/sqlite/intelligence.ts
  export function intelligenceEnabled(db: Database): boolean;
  // src/app/memory-store.ts
  intelligenceEnabled(): boolean; enableIntelligence(): IntelligenceEnrolment;
  // CLI: forge614-engram intelligence-enable → {"enabled":true,"schema":11,"migrated":<bool>,"backup":<ruta|null>}
  ```

- [ ] **Step 1: Rama y línea base**

```bash
git switch main && git pull --ff-only && git status --short
git switch -c work/1.7.0-memoria-inteligente
bun test 2>&1 | tail -3
```
Expected: árbol limpio en `9cbb7b5`; anotar el conteo de pruebas de la línea base.

- [ ] **Step 2: Generar el fixture de 1.6.0 con el código actual (antes de tocar nada)**

```bash
bun -e '
import { MemoryStore } from "./src/app/memory-store";
import { Database } from "bun:sqlite";
import { mkdirSync, rmSync } from "node:fs";
const dir = "tests/fixtures/v1.6.0"; mkdirSync(dir, { recursive: true });
const file = `${dir}/schema-10.db`;
for (const suffix of ["", "-wal", "-shm"]) rmSync(file + suffix, { force: true });
const store = new MemoryStore(file, { create: true });
store.enableProjectBindings(); store.enableSessions(); store.enableSearchReinforcement(); store.enableEcosystem();
const alpha = store.createProject("Alpha"), beta = store.createProject("Beta");
const group = store.createGroup("fixture-group");
store.bindProjectToGroup(alpha.projectId, group.id); store.bindProjectToGroup(beta.projectId, group.id);
store.save({ projectId: alpha.projectId, type: "decision", title: "Decisión de almacenamiento", content: "Usar SQLite local", topicKey: "fixture/decision" });
store.save({ projectId: alpha.projectId, type: "decision", title: "Decisión de almacenamiento", content: "Usar SQLite local con respaldo previo", topicKey: "fixture/decision", expectedVersion: 1 });
store.save({ projectId: null, scope: "shared", type: "preference", title: "Preferencia de explicación", content: "Explicar con ejemplos de la vida real" });
store.save({ projectId: null, scope: "ecosystem", groupId: group.id, type: "procedure", title: "Regla del grupo", content: "Primero aprende el que recibe" });
const archived = store.save({ projectId: beta.projectId, type: "fact", title: "Dato archivado", content: "Se archiva para la prueba" });
store.archive(beta.projectId, archived.id);
store.startSession(alpha.projectId, "fixture-session");
store.close();
const db = new Database(file); db.exec("PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode=DELETE;");
console.log(JSON.stringify(db.query("PRAGMA user_version").get()), JSON.stringify(db.query("SELECT scope, count(*) AS n FROM memories GROUP BY scope ORDER BY scope").all()));
db.close();'
ls tests/fixtures/v1.6.0/
```
Expected: `{"user_version":10}` y `[{"scope":"ecosystem","n":1},{"scope":"project","n":2},{"scope":"shared","n":1}]`; en la carpeta solo `schema-10.db` (sin `-wal` ni `-shm`). Si alguna llamada de la API rechaza el script, **detente y reporta** el error exacto: no cambies el código para que pase.

- [ ] **Step 3: Pruebas que fallan**

`src/infrastructure/sqlite/intelligence-schema.test.ts`:

```ts
import { Database } from "bun:sqlite";
import { afterEach, expect, test } from "bun:test";
import { copyFileSync, mkdtempSync, readdirSync, realpathSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createProject } from "./projects";
import { enableIntelligence, initialize, schemaState } from "./schema";
import { save } from "./writes";

const FIXTURES = join(import.meta.dir, "../../../tests/fixtures");
const temporary: string[] = [];
afterEach(() => { while (temporary.length) rmSync(temporary.pop()!, { recursive: true, force: true }); });

function fixture(path: string, options: { readonly?: boolean } = {}): { db: Database; file: string; directory: string } {
  // SQLite reports the real path; on macOS tmpdir() is under /var, a symlink to /private/var.
  const directory = realpathSync(mkdtempSync(join(tmpdir(), "engram-intel-")));
  temporary.push(directory);
  const file = join(directory, "engram.db");
  copyFileSync(join(FIXTURES, path), file);
  const db = options.readonly ? new Database(file, { readonly: true }) : new Database(file, { strict: true });
  initialize(db, false, options.readonly === true);
  return { db, file, directory };
}

const TABLES = ["projects", "memories", "memory_versions", "requests", "events", "project_bindings", "sessions", "session_entries",
  "session_summaries", "local_session_bindings", "local_manual_sessions", "confirmations", "confirmation_requests",
  "ecosystem_groups", "ecosystem_memberships", "identity_events"];
function dump(db: Database): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const table of TABLES) {
    const exists = db.query("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
    if (exists) out[table] = db.query(`SELECT * FROM ${table}`).all().map(row => JSON.stringify(row)).sort();
  }
  return out;
}
const version = (db: Database) => (db.query("PRAGMA user_version").get() as { user_version: number }).user_version;
const words = (db: Database, match: string) =>
  (db.query("SELECT m.title FROM memories_words w JOIN memories m ON m.rowid = w.rowid WHERE memories_words MATCH ? ORDER BY m.title").all(match) as { title: string }[]).map(r => r.title);

test("level 10 base migrates to 11: every row kept, backup written, new structure empty and valid", () => {
  const { db, file, directory } = fixture("v1.6.0/schema-10.db");
  try {
    const before = dump(db);
    const result = enableIntelligence(db);
    expect(result.migrated).toBe(true);
    expect(result.backup).toStartWith(`${file}.v10-pre-intelligence-`);
    expect(statSync(result.backup!).mode & 0o777).toBe(0o600);
    expect(version(db)).toBe(11);
    expect(schemaState(db)).toEqual({ base: 7, ecosystem: true, intelligence: true });
    expect(dump(db)).toEqual(before);
    for (const table of ["memory_meta", "session_activity", "ecosystem_sources"]) {
      expect(db.query(`SELECT count(*) AS n FROM ${table}`).get()).toEqual({ n: 0 });
    }
    expect(readdirSync(directory).filter(name => name.endsWith(".bak"))).toHaveLength(1);
    initialize(db, false, false); // exact-schema validation of level 11 passes
  } finally { db.close(); }
});

test("the word index is accent-insensitive and covers existing rows after migration", () => {
  const { db } = fixture("v1.6.0/schema-10.db");
  try {
    enableIntelligence(db);
    expect(words(db, "decision")).toEqual(["Decisión de almacenamiento"]);
    expect(words(db, "respaldo")).toEqual(["Decisión de almacenamiento"]);
    expect(words(db, "explicacion")).toEqual(["Preferencia de explicación"]);
  } finally { db.close(); }
});

test("the word index follows inserts, updates and deletes through its triggers", () => {
  const { db } = fixture("v1.6.0/schema-10.db");
  try {
    enableIntelligence(db);
    const project = createProject(db, "Gamma");
    const saved = save(db, { projectId: project.projectId, type: "fact", title: "Configuración del índice", content: "palabra única zanahoria", topicKey: "gamma/index" });
    expect(words(db, "zanahoria")).toEqual(["Configuración del índice"]);
    save(db, { projectId: project.projectId, type: "fact", title: "Configuración del índice", content: "palabra única pepino", topicKey: "gamma/index", expectedVersion: 1 });
    expect(words(db, "zanahoria")).toEqual([]);
    expect(words(db, "pepino")).toEqual(["Configuración del índice"]);
    // Raw delete only to exercise the trigger; versions and events reference the row, so relax foreign keys here.
    db.exec("PRAGMA foreign_keys=OFF");
    db.query("DELETE FROM memories WHERE id = ?").run(saved.id);
    expect(words(db, "pepino")).toEqual([]);
  } finally { db.close(); }
});

test("enrolling twice is a no-op and never writes a second backup", () => {
  const { db, directory } = fixture("v1.6.0/schema-10.db");
  try {
    expect(enableIntelligence(db).migrated).toBe(true);
    expect(enableIntelligence(db)).toEqual({ migrated: false, backup: null });
    expect(readdirSync(directory).filter(name => name.endsWith(".bak"))).toHaveLength(1);
  } finally { db.close(); }
});

test("an older level chains every prerequisite and ends at 11 with its data", () => {
  const { db } = fixture("v1.5.3/schema-5.db");
  try {
    // Level 5 has no ecosystem column yet: compare counts and the original memory columns, not whole rows.
    const counts = (d: Database) => Object.fromEntries(TABLES.filter(t => d.query("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t))
      .map(t => [t, (d.query(`SELECT count(*) AS n FROM ${t}`).get() as { n: number }).n]));
    const memories = (d: Database) => d.query("SELECT id,projectId,scope,topic_key,type,title,content,pinned,version,state,created_at,updated_at FROM memories ORDER BY rowid").all();
    const countsBefore = counts(db), memoriesBefore = memories(db);
    enableIntelligence(db);
    expect(version(db)).toBe(11);
    const countsAfter = counts(db);
    for (const table of Object.keys(countsBefore)) expect(countsAfter[table]).toBe(countsBefore[table]);
    expect(memories(db)).toEqual(memoriesBefore);
  } finally { db.close(); }
});

test("a fresh empty base reaches 11 without writing a backup", () => {
  const db = new Database(":memory:");
  try {
    initialize(db);
    expect(enableIntelligence(db)).toEqual({ migrated: true, backup: null });
    expect(version(db)).toBe(11);
  } finally { db.close(); }
});

test("a read-only connection fails before leaving any backup behind", () => {
  const { db, directory } = fixture("v1.6.0/schema-10.db", { readonly: true });
  try {
    expect(() => enableIntelligence(db)).toThrow();
    expect(version(db)).toBe(10);
    expect(readdirSync(directory).filter(name => name.endsWith(".bak"))).toEqual([]);
  } finally { db.close(); }
});

test("a failure inside the migration rolls back to level 10 with no new objects", () => {
  const { db } = fixture("v1.6.0/schema-10.db");
  try {
    const execute = db.exec.bind(db);
    Object.defineProperty(db, "exec", { value: (sql: string) => execute(sql.includes("CREATE TABLE ecosystem_sources")
      ? sql.replace("CREATE TABLE ecosystem_sources", "THIS IS NOT SQL; CREATE TABLE ecosystem_sources") : sql) });
    expect(() => enableIntelligence(db)).toThrow();
    expect(version(db)).toBe(10);
    expect(db.query("SELECT name FROM sqlite_master WHERE name IN ('memory_meta','session_activity','ecosystem_sources','memories_words')").all()).toEqual([]);
  } finally { db.close(); }
});

test("level 11 validates its exact structure and 12 stays an unknown future version", () => {
  const { db } = fixture("v1.6.0/schema-10.db");
  try {
    enableIntelligence(db);
    db.exec("DROP TRIGGER memory_words_update");
    expect(() => initialize(db, false, false)).toThrow(expect.objectContaining({ code: "DATABASE_SCHEMA" }));
  } finally { db.close(); }
  const fresh = new Database(":memory:");
  try {
    initialize(fresh); enableIntelligence(fresh);
    fresh.exec("PRAGMA user_version=12");
    expect(() => initialize(fresh)).toThrow(expect.objectContaining({ code: "DATABASE_VERSION" }));
  } finally { fresh.close(); }
});
```

`src/infrastructure/sqlite/intelligence.test.ts`:

```ts
import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { intelligenceEnabled } from "./intelligence";
import { enableIntelligence, enableSearchReinforcement, initialize } from "./schema";

test("intelligence is enabled only at level 11", () => {
  const db = new Database(":memory:");
  try {
    initialize(db);
    expect(intelligenceEnabled(db)).toBe(false);
    enableSearchReinforcement(db);
    expect(intelligenceEnabled(db)).toBe(false);
    enableIntelligence(db);
    expect(intelligenceEnabled(db)).toBe(true);
  } finally { db.close(); }
});
```

Actualizar las pruebas existentes: en `ecosystem-schema.test.ts` las tres expectativas de `schemaState` pasan a `{ base: 5, ecosystem: false, intelligence: false }`, `{ base: 5, ecosystem: true, intelligence: false }` y `{ base: 7, ecosystem: true, intelligence: false }`; en `schema.test.ts:71`, `projects.test.ts:28` y `ecosystem-schema.test.ts:191`, `PRAGMA user_version=11` pasa a `PRAGMA user_version=12`.

- [ ] **Step 4: Correr y ver el rojo**

Run: `bun test src/infrastructure/sqlite/intelligence-schema.test.ts src/infrastructure/sqlite/intelligence.test.ts src/infrastructure/sqlite/ecosystem-schema.test.ts`
Expected: FAIL por `enableIntelligence`/`intelligenceEnabled` inexistentes y por el campo `intelligence` ausente.

- [ ] **Step 5: Implementar en `schema.ts`**

Agregar después de `ECOSYSTEM_INDEXES`:

```ts
// Memory intelligence (schema level 11 = base 7 + ecosystem + this structure). Additive only:
// side tables keep new data out of memory_versions, whose snapshot keys replication validates exactly.
const INTELLIGENCE_SCHEMA = `CREATE TABLE memory_meta (
  memory_id TEXT PRIMARY KEY NOT NULL REFERENCES memories(id),
  short TEXT CHECK(short IS NULL OR length(short) BETWEEN 1 AND 300),
  review_after TEXT,
  superseded_by TEXT REFERENCES memories(id),
  affects TEXT CHECK(affects IS NULL OR json_valid(affects)),
  updated_at TEXT NOT NULL
);
CREATE INDEX memory_meta_superseded ON memory_meta(superseded_by);
CREATE TABLE session_activity (
  sessionId TEXT PRIMARY KEY NOT NULL REFERENCES sessions(sessionId),
  lastActivityAt TEXT NOT NULL,
  interruptedAt TEXT
);
CREATE TABLE ecosystem_sources (
  groupId TEXT PRIMARY KEY NOT NULL REFERENCES ecosystem_groups(id),
  projectId TEXT NOT NULL REFERENCES projects(projectId),
  setAt TEXT NOT NULL
);
CREATE VIRTUAL TABLE memories_words USING fts5(
  title, content, topic_key, content='memories', content_rowid='rowid', tokenize='unicode61 remove_diacritics 2'
);
CREATE TRIGGER memory_words_insert AFTER INSERT ON memories BEGIN
  INSERT INTO memories_words(rowid,title,content,topic_key) VALUES(new.rowid,new.title,new.content,new.topic_key);
END;
CREATE TRIGGER memory_words_delete AFTER DELETE ON memories BEGIN
  INSERT INTO memories_words(memories_words,rowid,title,content,topic_key)
  VALUES('delete',old.rowid,old.title,old.content,old.topic_key);
END;
CREATE TRIGGER memory_words_update AFTER UPDATE OF title,content,topic_key ON memories BEGIN
  INSERT INTO memories_words(memories_words,rowid,title,content,topic_key)
  VALUES('delete',old.rowid,old.title,old.content,old.topic_key);
  INSERT INTO memories_words(rowid,title,content,topic_key) VALUES(new.rowid,new.title,new.content,new.topic_key);
END;
`;
```

Reemplazar el bloque de `Base`/`SchemaState`/`decode`/`encode` por:

```ts
type Base = 3 | 4 | 5 | 6 | 7;
export interface SchemaState { readonly base: Base; readonly ecosystem: boolean; readonly intelligence: boolean }
// Levels 3-7 are the linear feature chain. 8-10 are levels 5-7 with the ecosystem structure,
// so enabling ecosystem never silently enables sessions or search reinforcement.
// 11 is the only intelligence level: it requires base 7 and the ecosystem structure.
function decode(version: number): SchemaState | null {
  if (version >= 3 && version <= 7) return { base: version as Base, ecosystem: false, intelligence: false };
  if (version >= 8 && version <= 10) return { base: (version - 3) as Base, ecosystem: true, intelligence: false };
  if (version === 11) return { base: 7, ecosystem: true, intelligence: true };
  return null;
}
function encode(state: SchemaState): number {
  if (state.intelligence) return 11;
  return state.base + (state.ecosystem ? 3 : 0);
}
```

En `validate`, dentro de la construcción de la referencia, después de `if (state.ecosystem) applyEcosystemStructure(reference);`:

```ts
      if (state.intelligence) reference.exec(INTELLIGENCE_SCHEMA);
```

En `upgradeTo`, la línea del `PRAGMA` pasa a:

```ts
    db.exec(`PRAGMA user_version=${encode({ base: target, ecosystem: state.ecosystem, intelligence: state.intelligence })}`);
```

En `enableEcosystem`, la línea del `PRAGMA` pasa a:

```ts
      db.exec(`PRAGMA user_version=${encode({ base: insideState.base, ecosystem: true, intelligence: false })}`);
```

`backupBeforeMigration` gana la etiqueta (la llamada existente de ecosistema pasa `"ecosystem"`, así que su nombre de archivo no cambia):

```ts
function backupBeforeMigration(db: Database, version: number, label: "ecosystem" | "intelligence"): string | null {
```
y en su cuerpo `pre-ecosystem` pasa a `pre-${label}`; en `enableEcosystem`: `backupBeforeMigration(db, version, "ecosystem")`.

Agregar al final del archivo, antes de `initialize`:

```ts
export interface IntelligenceEnrolment { readonly migrated: boolean; readonly backup: string | null }

function ftsIntegrity(db: Database, table: "memories_fts" | "memories_words"): void {
  try { db.exec(`INSERT INTO ${table}(${table}) VALUES('integrity-check')`); } catch { verificationFailed(); }
}

/**
 * Explicit, additive enrollment for memory intelligence (level 11). Chains the prerequisites
 * (ecosystem structure, sessions, reinforcement), then adds side tables and the word index in one
 * transaction, verifying that no existing row changed. The MCP server never calls this.
 */
export function enableIntelligence(db: Database): IntelligenceEnrolment {
  const seen = db.transaction(() => {
    const current = currentVersion(db), decoded = decode(current);
    if (!decoded) throw new MemoryError("MIGRATION_REQUIRED", "No se puede habilitar la memoria inteligente en este formato.");
    validate(db, current);
    return decoded;
  }).deferred();
  if (seen.intelligence) return { migrated: false, backup: null };
  if (!seen.ecosystem) enableEcosystem(db);
  enableSessionLifecycle(db);
  enableSearchReinforcement(db);
  const version = currentVersion(db);
  // A connection that cannot write must fail before it leaves a useless backup behind.
  db.exec("BEGIN IMMEDIATE");
  try { db.exec(`PRAGMA user_version=${version + 100}`); } finally { db.exec("ROLLBACK"); }
  const backup = backupBeforeMigration(db, version, "intelligence");
  let migrated = false;
  db.transaction(() => {
    const inside = currentVersion(db);
    const insideState = decode(inside)!;
    validate(db, inside);
    if (insideState.intelligence) return;
    const memoriesBefore = contentDigest(db, "memories");
    const requestsBefore = contentDigest(db, "requests");
    db.exec(INTELLIGENCE_SCHEMA);
    db.exec("INSERT INTO memories_words(memories_words) VALUES('rebuild')");
    const memoriesAfter = contentDigest(db, "memories");
    const requestsAfter = contentDigest(db, "requests");
    if (memoriesAfter.count !== memoriesBefore.count || memoriesAfter.digest !== memoriesBefore.digest
      || requestsAfter.count !== requestsBefore.count || requestsAfter.digest !== requestsBefore.digest) verificationFailed();
    ftsIntegrity(db, "memories_fts");
    ftsIntegrity(db, "memories_words");
    db.exec(`PRAGMA user_version=${encode({ base: 7, ecosystem: true, intelligence: true })}`);
    migrated = true;
  }).immediate();
  return { migrated, backup: migrated ? backup : null };
}
```

`src/infrastructure/sqlite/intelligence.ts`:

```ts
import type { Database } from "bun:sqlite";
import { schemaFeatures } from "./schema";

/** True only at schema level 11; every intelligence feature is gated on this. */
export function intelligenceEnabled(db: Database): boolean { return schemaFeatures(db)?.intelligence === true; }
```

- [ ] **Step 6: Correr y ver el verde**

Run: `bun test src/infrastructure/sqlite`
Expected: PASS, incluidas las 9 pruebas nuevas de `intelligence-schema.test.ts` y la de `intelligence.test.ts`. Si alguna falla con el código literal del plan, **detente y reporta** qué falla, por qué y el ajuste mínimo: no cambies la prueba.

- [ ] **Step 7: `MemoryStore` y comando `intelligence-enable`**

En `src/app/memory-store.ts`: importar `enableIntelligence` y `type IntelligenceEnrolment` desde `../infrastructure/sqlite/schema` e `intelligenceEnabled` desde `../infrastructure/sqlite/intelligence`, y agregar junto a los métodos de ecosistema:

```ts
  // Memory intelligence (schema level 11). Additive; explicit enrollment only.
  intelligenceEnabled(): boolean { return intelligenceEnabled(this.db); }
  enableIntelligence(): IntelligenceEnrolment { return enableIntelligence(this.db); }
```
Exportar `IntelligenceEnrolment` donde `src/app/index.ts` exporta `EcosystemEnrolment` (si lo hace; si no, no hace falta).

Contrato del SDK (errata 2026-09-24: la versión inicial del plan lo omitió). En `src/index.test.ts`, después de `ECOSYSTEM_STORE_METHODS`:

```ts
// Added in 1.7.0 with memory intelligence. The lists above only ever grow.
const INTELLIGENCE_STORE_METHODS = ["enableIntelligence", "intelligenceEnabled"];
```
y en la aserción: `.toEqual([...PUBLIC_STORE_METHODS, ...ECOSYSTEM_STORE_METHODS, ...INTELLIGENCE_STORE_METHODS].sort());`.

En `tests/fixtures/sdk-contract.ts`, al final de `ExpectedStore`:

```ts
  // Added in 1.7.0 (memory intelligence). Purely additive: nothing above changed.
  intelligenceEnabled():boolean;enableIntelligence():{readonly migrated:boolean;readonly backup:string|null};
``` En la prueba hermana de `memory-store.ts`, agregar:

```ts
test("memory store enrolls intelligence explicitly", () => {
  const store = new MemoryStore(":memory:");
  try {
    expect(store.intelligenceEnabled()).toBe(false);
    expect(store.enableIntelligence()).toEqual({ migrated: true, backup: null });
    expect(store.intelligenceEnabled()).toBe(true);
  } finally { store.close(); }
});
```

CLI:
- `arguments.ts:5`: agregar `"intelligence-enable": []` junto a `"reinforcement-enable": []`.
- `commands.ts`, después del bloque de `reinforcement-enable`:

```ts
  if(command==="intelligence-enable"){
    workspace.init();const store=workspace.open();
    const result=(()=>{try{return store.enableIntelligence();}finally{store.close();}})();
    console.log(JSON.stringify({enabled:true,schema:11,migrated:result.migrated,backup:result.backup},null,2));return;
  }
```
- `help.ts`, después de las dos líneas de `reinforcement-enable` (las líneas existentes quedan byte-idénticas):

```
intelligence-enable
                Habilita explícitamente la memoria inteligente (esquema 11); respalda la base antes de migrar.
```
- Pruebas: en `arguments.test.ts`, igual que `reinforcement-enable` (acepta el comando, rechaza `--force`); en `commands.test.ts`, un caso que corre `intelligence-enable` dos veces sobre una base temporal y espera `schema: 11`, `migrated: true` la primera y `migrated: false` la segunda; en la prueba que fija el texto de ayuda, agregar las dos líneas nuevas en su posición.

- [ ] **Step 8: Suite completa y comprobaciones del repositorio**

```bash
bun test 2>&1 | tail -3
bun run typecheck
git diff --check
```
Expected: todo en verde; el conteo total = línea base + pruebas nuevas; `typecheck` y `git diff --check` sin salida.

- [ ] **Step 9: Commit**

```bash
git add tests/fixtures/v1.6.0/schema-10.db src/infrastructure/sqlite src/app/memory-store.ts src/app/memory-store.test.ts src/interfaces/cli src/index.test.ts tests/fixtures/sdk-contract.ts
git commit -m "feat(schema): level 11 memory intelligence structure with explicit, verified enrollment"
```
Verificar el mensaje: una línea, sin atribución.

- [ ] **Step 10: Documentación de la tarea (prompt aparte, commit propio)**

`docs/es/03-referencia-cli.md` y `docs/en/03-cli-reference.md`, después de la línea de `reinforcement-enable` (misma alineación, columna 41):

```
intelligence-enable                     habilita explícitamente la memoria inteligente (esquema 11); respalda antes de migrar
```
```
intelligence-enable                     explicitly enable memory intelligence (schema 11); backs up before migrating
```

`docs/es/05-arquitectura-interna-y-formulas.md`: en el párrafo de sincronización, `(plan propio, 1.7.0)` pasa a `(plan propio, 1.8.0)`; y después del párrafo que empieza "SQLite es la fuente durable de verdad", agregar:

```
Desde el esquema 11 (memoria inteligente, 1.7.0) hay un segundo índice FTS5 por palabras completas (`unicode61`, sin distinguir acentos) junto al índice por trigramas, y tablas aparte para metadatos del recuerdo (versión corta, vigencia, reemplazo, proyectos afectados), actividad de sesión y proyecto fuente de cada grupo. Esas tablas quedan fuera de la versión del recuerdo, así que los formatos de réplica 1–3 no cambian. El nivel 11 se activa solo de forma explícita con `intelligence-enable`, con respaldo y verificación; el servidor MCP nunca migra la base.
```

`docs/en/05-internal-architecture-and-formulas.md`: `(its own plan, 1.7.0)` pasa a `(its own plan, 1.8.0)`; y después del párrafo que empieza "SQLite is the durable source of truth", agregar:

```
From schema 11 (memory intelligence, 1.7.0) a second FTS5 index over whole words (`unicode61`, accent-insensitive) sits next to the trigram index, together with side tables for memory metadata (short version, review date, replacement, affected projects), session activity and each group's source project. Those tables stay outside the memory version, so replication formats 1–3 do not change. Level 11 is enabled only explicitly with `intelligence-enable`, with a backup and verification; the MCP server never migrates the database.
```

`CHANGELOG.md`, justo debajo de `# Changelog`:

```
## 1.7.0 — en desarrollo

Memoria inteligente; esta sección crece tarea por tarea.

- **Esquema 11 (aditivo, con respaldo):** nivel nuevo = esquema 7 + ecosistema + inteligencia. Agrega tablas aparte (`memory_meta`, `session_activity`, `ecosystem_sources`) y un índice FTS5 por palabras sin distinguir acentos (`memories_words`); no reconstruye ninguna tabla existente. Se activa solo con `intelligence-enable`, que prueba primero que puede escribir, copia la base a `engram.db.v<versión>-pre-intelligence-<fecha>-<id>.bak` (permisos 0600; se omite si la base está vacía) y verifica recuento y suma SHA-256 de `memories` y `requests` en una sola transacción (`MIGRATION_VERIFY_FAILED` revierte todo). Una base en un nivel anterior encadena antes sus requisitos (ecosistema, sesiones, refuerzo). El servidor MCP nunca migra la base.
- La replicación de grupos (formato 4) pasa a la versión 1.8.0.
```

`docs/notion-map.json`: sin cambios (errata 2026-09-24: las entradas del capítulo 03 ya tienen `"notionSyncPending": true` desde 1.6.0 y el capítulo 05 no tiene entrada ni página en Notion; crear una exigiría inventar su URL y su huella).

Verificación: `git diff --check` sin salida y `bun test` en verde (la documentación no cambia pruebas).

```bash
git add docs CHANGELOG.md
git commit -m "docs: schema 11 and intelligence-enable in CLI reference, architecture and changelog"
```

---

### Task 2: Filtro de secretos y metadatos del recuerdo *(detalle tras aprobar T1)*

**Objetivo:** rechazar secretos al guardar (`SECRET_REJECTED`, sin repetir el valor), guardar y leer `memory_meta` (versión corta ≤ 300, `reviewAfter` = +90 días para `decision`/`procedure`, "reemplazado por"), exponer `meta` y `marks` en `memory_get`/`memory_search`, y las entradas opcionales `short`, `supersedes`, `affects` en `memory_save` (MCP y SDK). Todo solo en nivel 11.
**Archivos previstos:** `src/modules/memory/secrets.ts` (+test), `src/modules/memory/types.ts`, `src/infrastructure/sqlite/meta.ts` (+test), `src/infrastructure/sqlite/writes.ts`, `src/infrastructure/sqlite/search.ts`, `src/interfaces/mcp/{schemas,memory-tools}.ts` y pruebas.
**Terminado:** secretos de al menos 8 patrones rechazados con prueba por patrón; texto sin secretos nunca rechazado (prueba con 20 textos reales del dominio); metadatos con pruebas de lectura/escritura; nada de esto cambia en nivel ≤ 10.

### Task 3: Buscador nuevo y candidatos parecidos *(detalle tras aprobar T2)*

**Objetivo:** `buildQuery` (sin palabras de relleno ES/EN, prefijo, OR), fusión RRF de `memories_words` + `memories_fts`, `MIN_SCORE`, modo `"hybrid"`; `similarTo` y `similar` en la respuesta de `memory_save`; conjunto de 20 consultas en lenguaje natural sobre un corpus sintético (nunca datos privados del propietario) con acierto medido antes y después.
**Terminado:** las 20 consultas con acierto igual o mayor al umbral acordado al escribir el detalle, y ninguna consulta larga devuelve 0 cuando hay un recuerdo relevante.

### Task 5: Sesiones interrumpidas *(detalle tras aprobar T3)*

**Objetivo:** `session_activity` al guardar y al iniciar; al iniciar una sesión runtime, las otras abiertas del mismo proyecto quedan interrumpidas; inactividad > 6 h cuenta como interrumpida al leer; `previousInterrupted`.
**Terminado:** pruebas con reloj controlado (`setSystemTime`) para ambos casos y para "la sesión actual nunca se marca".

### Task 4: Reglas del tablero *(detalle tras aprobar T5; plan con solo pruebas y contratos — experimento)*

**Objetivo:** los contratos T4 del esqueleto.
**Terminado:** una prueba por código de error nuevo; `memory-demote` conserva historial; la nota de estado solo la escribe el proyecto fuente.

### Task 6: Bloque de arranque *(detalle tras aprobar T4)*

**Objetivo:** `startup-context --format 2` según el contrato T6; `format 1` byte-idéntico.
**Terminado:** el bloque de una base con 107 recuerdos sintéticos mide ≤ 5 000 caracteres con encabezado de ocupación; prueba de sesión anterior interrumpida.

### Task 7: Protocolo v4 *(detalle tras aprobar T6)*

**Objetivo:** contrato T7; SHA de v1–v3 intactos.
**Terminado:** pruebas de topes (completo ≤ 2 500, MCP < 2 000), sin nombres prohibidos, v1–v3 byte-idénticos.

### Task 8: Coherencia final, activación en init/setup y versión *(detalle tras aprobar T7)*

**Objetivo:** pasada final de coherencia de docs es/en y CHANGELOG (cada tarea ya documentó lo suyo), `CONTRACT_CODES` completos, `init`/`setup` activan inteligencia en bases nuevas, renombrar el esbozo de réplica a 1.8.0, versión 1.7.0 en commit aparte.

### Task 9: Revisión independiente *(prompt tras aprobar T8)*

Revisión de solo lectura de toda la rama contra la spec y este plan, por otro proveedor.

### Task 10: Publicación *(prompt tras aprobar T9)*

PR, CI verde, fusión con rebase, tag, release; en la Mac del propietario: instalar, `forge614-engram intelligence-enable` (con respaldo) y verificar la base real (107 recuerdos intactos).

---

## Impacto en el procedimiento de agentes (acta 0017), tarea por tarea

Revisión de `standard/procedures/new-agent-checklist.md` al cerrar cada tarea. Los cambios al checklist se acumulan y se publican juntos en el reglamento 1.1.0.

| Tarea | Impacto | Motivo / punto nuevo |
|---|---|---|
| T1 | **No** | El nivel 11 es estructura interna con activación explícita (`intelligence-enable`); el servidor MCP no migra la base y ningún asistente llama ese comando ni cambia su integración. Todo lo nuevo queda apagado hasta que el nivel 11 existe. **Hallazgo previo, pendiente para T7:** la sección `forge614-engram` del checklist sigue describiendo solo el protocolo v1 y los ámbitos `shared`/`project`; no menciona el ámbito `ecosystem` (1.6.0, protocolo v3). Se corrige junto con el protocolo v4. |
