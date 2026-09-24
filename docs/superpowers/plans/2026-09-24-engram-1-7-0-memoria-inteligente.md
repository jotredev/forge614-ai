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

**T3:** `buildQuery(text: string): QueryPlan { terms: string[]; words: string | null; trigram: string | null }` (`src/modules/search/query.ts`, sin palabras de relleno ES/EN, prefijo `*` en términos ≥ 4 letras, OR); fusión de `memories_words` y `memories_fts` por RRF; `MIN_MATCHED_TERMS = 2` (errata 2026-09-24: sustituye a `MIN_SCORE`, ver D-T3-4); `explanation.mode` agrega `"hybrid"`; `similarTo(...)`: `SimilarCandidate { id: string; title: string; version: number; score: number }[]` (en `modules/memory`; máx. 3, mismo ámbito y dueño, puntaje ≥ `SIMILAR_MIN_SCORE = 0.25`); `memory_save` devuelve `similar` cuando no hubo tema ni texto idéntico.

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

### Task 2: Filtro de secretos y metadatos del recuerdo

**Experimento:** Codex · gpt-5.6-terra · **medium**, plan con código completo (comparar contra T1 Opus xhigh). Documentación en **sesión nueva** aparte (comparar contra T1 docs en la misma sesión).

**Decisiones de esta tarea (escritas tras leer el código real, 2026-09-24):**
- **D-T2-1:** el filtro de secretos aplica **en todos los niveles** de esquema (es validación de entrada, no depende del esquema; proteger la memoria vale más que conservar el comportamiento de 1.6.0 ante un secreto). Revisa título, contenido, tema y versión corta; el mensaje nombra el tipo de secreto, **nunca** el valor.
- **D-T2-2:** `short`, `supersedes` y `affects` solo existen en nivel 11; enviarlos en un nivel menor es `INTELLIGENCE_REQUIRED` (nunca se descartan en silencio).
- **D-T2-3:** los metadatos **no** entran al hash de la clave de petición ni a la versión del recuerdo (la réplica recalcula ese hash y valida las claves exactas). Una repetición con la misma `requestKey` devuelve lo guardado aunque cambien los metadatos.
- **D-T2-4:** en un guardado que no crea versión (texto idéntico → confirmación), los metadatos enviados **sí** se aplican. Es la única forma de agregar la versión corta a un recuerdo existente sin cambiar su contenido (lo necesita T6).
- **D-T2-5:** la versión corta se conserva si el contenido no cambia; si el contenido cambia y no llega una nueva, se borra (quedaría desactualizada; T6 usa entonces el inicio del contenido). `reviewAfter` = ahora + 90 días para `decision` y `procedure` en cada versión nueva; `null` para los demás tipos.
- **D-T2-6:** `supersedes` marca "reemplazado por" en otro recuerdo **activo del mismo ámbito y dueño**; nunca lo archiva ni lo borra. Otro ámbito o inexistente → `SUPERSEDES_NOT_FOUND`; a sí mismo → `INVALID_INPUT`.
- **D-T2-7:** `affects` se normaliza (sin espacios exteriores, sin repetidos, ordenado; 1–20 nombres de 1–64 caracteres) y se guarda; las reglas del tablero que lo exigen llegan en T4.
- **D-T2-8:** `memory_get` y `memory_search` agregan `meta` y `marks` (`"superseded"`, `"verify"`) **solo en nivel 11**; en niveles menores la respuesta queda idéntica a 1.6.0.

**Files:**
- Create: `src/modules/memory/secrets.ts` (+ `secrets.test.ts`), `src/modules/memory/meta.ts` (+ `meta.test.ts`)
- Modify: `src/modules/memory/types.ts` (`SaveInput`), `src/modules/memory/index.ts` (exports)
- Create: `src/infrastructure/sqlite/meta.ts` (+ `meta.test.ts`), `src/infrastructure/sqlite/meta-save.test.ts`
- Modify: `src/infrastructure/sqlite/writes.ts` (`saveCore`), `src/infrastructure/sqlite/search.ts` (`searchPreviews`, `getVersion`)
- Modify: `src/modules/search/types.ts` (`PreviewResult`, `VersionRead`)
- Modify: `src/index.ts` (tipos públicos `MemoryMeta`, `MemoryMark`)
- Modify: `src/interfaces/mcp/schemas.ts`, `src/interfaces/mcp/memory-tools.ts`, `src/interfaces/mcp/schemas.test.ts`, `src/interfaces/mcp/memory-tools.test.ts`
- Modify: `src/interfaces/cli/main.ts:10-11` (`CONTRACT_CODES`)

**Interfaces:**
- Consumes: `intelligenceEnabled(db)` (T1), `required` de `infrastructure/sqlite/memory.ts`, `MemoryError`.
- Produces:
  ```ts
  // src/modules/memory/secrets.ts
  export function findSecret(text: string): string | null;            // id del patrón o null
  // src/modules/memory/meta.ts
  export const REVIEW_AFTER_DAYS = 90; export const SHORT_MAX = 300; export const AFFECTS_MAX = 20;
  export interface MemoryMeta { short: string | null; reviewAfter: string | null; supersededBy: string | null; affects: string[] | null }
  export type MemoryMark = "superseded" | "verify";
  export function reviewAfterFor(type: MemoryType, now: string): string | null;
  export function marksFor(meta: MemoryMeta | null, now: string): MemoryMark[];
  export function normalizeShort(value: string): string;              // INVALID_INPUT si vacío o > 300
  export function normalizeAffects(value: readonly string[]): string[]; // INVALID_INPUT si 0, > 20 o nombre inválido
  // SaveInput gana: short?: string; supersedes?: string; affects?: readonly string[]
  // src/infrastructure/sqlite/meta.ts
  export function readMeta(db: Database, memoryId: string): MemoryMeta | null;
  export function readMetas(db: Database, ids: readonly string[]): Map<string, MemoryMeta>;
  export function upsertMeta(db: Database, memoryId: string, patch: Partial<MemoryMeta>, now: string): void;
  // PreviewResult y VersionRead ganan (opcionales, solo nivel 11): meta?: MemoryMeta; marks?: MemoryMark[]
  // Códigos nuevos: SECRET_REJECTED, INTELLIGENCE_REQUIRED, SUPERSEDES_NOT_FOUND
  ```

- [ ] **Step 1: Pruebas que fallan del módulo**

`src/modules/memory/secrets.test.ts` (las muestras se arman por partes para que el propio archivo de pruebas no contenga un secreto literal que un revisor de secretos marcaría):

```ts
import { expect, test } from "bun:test";
import { findSecret } from "./secrets";

const join = (...parts: string[]) => parts.join("");
const SAMPLES: ReadonlyArray<readonly [string, string]> = [
  ["private-key", join("-----BEGIN ", "RSA PRIVATE KEY-----\nMIIEow")],
  ["aws-access-key-id", join("clave AK", "IAIOSFODNN7EXAMPLE en el archivo")],
  ["github-token", join("gh", "p_", "a".repeat(36))],
  ["slack-token", join("xo", "xb-", "1234567890-abcdefghij")],
  ["sk-key", join("s", "k-", "b".repeat(40))],
  ["jwt", join("ey", "JhbGciOiJIUzI1NiJ9.", "ey", "JzdWIiOiIxMjM0NTY3ODkwIn0.", "c".repeat(20))],
  ["connection-string-with-credentials", join("postgres", "://admin:", "s3cret-value", "@db.internal:5432/app")],
  ["password-assignment", join("pass", "word = ", "hunter2hunter2")],
];

test("every secret pattern is detected and only its id is returned", () => {
  for (const [id, text] of SAMPLES) expect(findSecret(text)).toBe(id);
});

// Real texts from this ecosystem's memories: none of them may be rejected.
const BENIGN = [
  "El paso release:publish recibe GH_TOKEN desde github.token en la plantilla del reglamento 1.0.2.",
  "Tokens totales: 8 857 497; salida 55 484; razonamiento 6 836.",
  "Instalar con https://github.com/jotredev/forge614-sentinel/releases/download/v0.1.1/install.sh",
  "sha256 10d036f02f767d54b0b7d710e96b21b249e034b480b0d83be124df5b2f97a4f5 del paquete del reglamento.",
  "La réplica usa PostgreSQL; la URL se oculta en los mensajes de error.",
  "Nunca guardar contraseñas, tokens, llaves privadas ni cadenas de conexión con credenciales.",
  "sessionId y sessionProjectId son obligatorios juntos para shared.",
  "project id 42007e73-ab93-4b4e-9e1a-a699e48674c1 y grupo e0b3e1c9-ffbb-4b6b-8a55-79fbf3e8f0b4.",
  "La clave de ejemplo de AWS se describe en prosa: AKIA seguido del resto, nunca completa.",
  "git@github.com:jotredev/forge614-ai.git es el remoto.",
  "Correr bun test --timeout 30000 y bun run typecheck antes del commit.",
  "El check versions compara package.json con el tag más alto v0.1.1.",
  "Usar requestKey estable forge614-ai/plan-a2/decisiones/2026-09-24-q1-q2.",
  "La tarea de riesgo alto usa Opus; la de riesgo bajo, Sonnet.",
  "password y token aparecen como palabras sueltas en la documentación de seguridad.",
  "http://localhost:3000/@scope/package es una ruta local de prueba.",
  "ECOSYSTEM_BOARD_FULL devuelve los títulos actuales para consolidar.",
  "El respaldo queda en engram.db.v10-pre-intelligence-20260924T180657787Z-0542aea7.bak.",
  "Precio de Opus 5.5: entrada $4, salida $20 por millón de tokens.",
  "La API key se configura como variable de entorno, nunca en la memoria.",
  // Keyword followed by something that names or hides a value (errata 2026-09-24).
  "La config usa apiKey: process.env.OPENAI_KEY",
  "El error es secret: SECRET_REJECTED cuando el texto trae credenciales.",
  "password: <redacted>",
  "password: ********",
  "Guarda el token en access_token = getTokenFromVault()",
  "pwd = /Users/jorge/proyecto",
  "api_key=${API_KEY} en el archivo de entorno.",
];

test("real domain texts are never rejected", () => {
  for (const text of BENIGN) expect(findSecret(text)).toBeNull();
});

test("an assignment with a literal value is rejected whatever its form", () => {
  const ASSIGNED = [
    join("pass", "word: ", "hunter2hunter2."),
    join("api", "_key=\"", "a8f3kd92mfk3", "\""),
    join("sec", "ret: ", "AB12CD34EF56GH78"),
    join("access", "Token = '", "x9Kd02mZq7", "'"),
    join("pw", "d=", "Sup3r$ecret!", ", luego conectar"),
    join("PASS", "WORD: ", "correcthorsebattery"),
  ];
  for (const text of ASSIGNED) expect(findSecret(text)).toBe("password-assignment");
});
```

> **Errata 2026-09-24 (tras T2 r1, commit `8d6dad2`):** el patrón `password-assignment` original rechazaba 5 de 8 textos normales medidos, incluido `password: <redacted>`, que es la forma que el propio error `SECRET_REJECTED` recomienda. Ahora el valor debe ser literal (termina en comilla, espacio, coma, punto y coma o fin del texto) y no cuenta si es un nombre de variable de entorno, una referencia con puntos (`process.env.X`) o una máscara (`****`). Verificado por el orquestador en una copia temporal: 634 pruebas, 0 fallos, typecheck 0. Límite aceptado: una clave real seguida de `)` o formada solo por mayúsculas sin dígitos no se detecta.

`src/modules/memory/meta.test.ts`:

```ts
import { expect, test } from "bun:test";
import { marksFor, normalizeAffects, normalizeShort, reviewAfterFor } from "./meta";

const NOW = "2026-09-24T12:00:00.000Z";

test("decisions and procedures get a review date 90 days ahead; other types none", () => {
  expect(reviewAfterFor("decision", NOW)).toBe("2026-12-23T12:00:00.000Z");
  expect(reviewAfterFor("procedure", NOW)).toBe("2026-12-23T12:00:00.000Z");
  for (const type of ["fact", "warning", "preference"] as const) expect(reviewAfterFor(type, NOW)).toBeNull();
});

test("marks: superseded when replaced, verify once the review date has passed", () => {
  const base = { short: null, reviewAfter: null, supersededBy: null, affects: null };
  expect(marksFor(null, NOW)).toEqual([]);
  expect(marksFor(base, NOW)).toEqual([]);
  expect(marksFor({ ...base, supersededBy: "other" }, NOW)).toEqual(["superseded"]);
  expect(marksFor({ ...base, reviewAfter: "2026-09-24T11:59:59.000Z" }, NOW)).toEqual(["verify"]);
  expect(marksFor({ ...base, reviewAfter: "2026-09-24T12:00:01.000Z" }, NOW)).toEqual([]);
  expect(marksFor({ ...base, supersededBy: "x", reviewAfter: "2020-01-01T00:00:00.000Z" }, NOW)).toEqual(["superseded", "verify"]);
});

test("short is trimmed and bounded", () => {
  expect(normalizeShort("  Resumen corto  ")).toBe("Resumen corto");
  expect(normalizeShort("a".repeat(300))).toHaveLength(300);
  for (const bad of ["", "   ", "a".repeat(301), "a\0b"]) expect(() => normalizeShort(bad)).toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
});

test("affects is trimmed, deduplicated, sorted and bounded", () => {
  expect(normalizeAffects([" shell", "engram", "shell "])).toEqual(["engram", "shell"]);
  for (const bad of [[], Array.from({ length: 21 }, (_, i) => `p${i}`), [""], ["x".repeat(65)], ["a\0b"]]) {
    expect(() => normalizeAffects(bad)).toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
  }
});
```

- [ ] **Step 2: Rojo del módulo**

Run: `bun test src/modules/memory/secrets.test.ts src/modules/memory/meta.test.ts`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar el módulo**

`src/modules/memory/secrets.ts`:

```ts
// Credentials that must never be stored in memory. The id names the kind of secret so the
// caller can say what to remove; the matched value is never returned or echoed.
const SECRET_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ["private-key", /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/u],
  ["aws-access-key-id", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/u],
  ["github-token", /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/u],
  ["slack-token", /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/u],
  ["sk-key", /\bsk-(?:[A-Za-z0-9_-]{2,20}-)?[A-Za-z0-9]{32,}\b/u],
  ["jwt", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/u],
  ["connection-string-with-credentials", /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:[^\s@/]+@[^\s/]+/iu],
];

// A keyword assigned a literal value. The value must end at a quote, space, comma, semicolon or the
// end of the text, so placeholders (<...>), paths and calls never match.
const ASSIGNMENT = /\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*["']?([A-Za-z0-9+=_.!@#$%^&*~-]{8,})(?=["'\s,;]|$)/giu;
// Values that name a secret instead of holding it: environment variable names, dotted code references and masks.
const NOT_A_VALUE = /^(?:[A-Z]+|[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+|[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+|\*+)$/u;

/** Id of the first secret pattern found in the text, or null. */
export function findSecret(text: string): string | null {
  for (const [id, pattern] of SECRET_PATTERNS) if (pattern.test(text)) return id;
  for (const match of text.matchAll(ASSIGNMENT)) if (!NOT_A_VALUE.test(match[1]!)) return "password-assignment";
  return null;
}
```

`src/modules/memory/meta.ts`:

```ts
import { MemoryError } from "../../shared/errors";
import type { MemoryType } from "./types";

export const REVIEW_AFTER_DAYS = 90;
export const SHORT_MAX = 300;
export const AFFECTS_MAX = 20;
const DAY_MS = 86_400_000;

/** Metadata kept outside the memory version (schema level 11). */
export interface MemoryMeta { short: string | null; reviewAfter: string | null; supersededBy: string | null; affects: string[] | null }
export type MemoryMark = "superseded" | "verify";

/** Decisions and procedures are re-checked after REVIEW_AFTER_DAYS; other types never expire. */
export function reviewAfterFor(type: MemoryType, now: string): string | null {
  if (type !== "decision" && type !== "procedure") return null;
  return new Date(Date.parse(now) + REVIEW_AFTER_DAYS * DAY_MS).toISOString();
}

export function marksFor(meta: MemoryMeta | null, now: string): MemoryMark[] {
  if (meta === null) return [];
  const marks: MemoryMark[] = [];
  if (meta.supersededBy !== null) marks.push("superseded");
  if (meta.reviewAfter !== null && Date.parse(meta.reviewAfter) <= Date.parse(now)) marks.push("verify");
  return marks;
}

export function normalizeShort(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > SHORT_MAX || trimmed.includes("\0")) {
    throw new MemoryError("INVALID_INPUT", `short debe tener entre 1 y ${SHORT_MAX} caracteres, sin caracteres nulos.`);
  }
  return trimmed;
}

export function normalizeAffects(value: readonly string[]): string[] {
  const names = [...new Set(value.map(name => name.trim()))].sort();
  if (names.length === 0 || names.length > AFFECTS_MAX || names.some(name => !name || name.length > 64 || name.includes("\0"))) {
    throw new MemoryError("INVALID_INPUT", `affects debe nombrar entre 1 y ${AFFECTS_MAX} proyectos de 1 a 64 caracteres.`);
  }
  return names;
}
```

`src/modules/memory/types.ts`, en `SaveInput`, el primer objeto pasa a:

```ts
export type SaveInput = { title:string;content:string;type:MemoryType;topicKey?:string;pinned?:boolean;expectedVersion?:number;requestKey?:string;
  short?:string;supersedes?:string;affects?:readonly string[] }
```

`src/modules/memory/index.ts`, agregar:

```ts
export { findSecret } from "./secrets";
export { REVIEW_AFTER_DAYS, SHORT_MAX, AFFECTS_MAX, reviewAfterFor, marksFor, normalizeShort, normalizeAffects } from "./meta";
export type { MemoryMeta, MemoryMark } from "./meta";
```

`src/index.ts`: en la línea `export type { MemoryType,… } from "./modules/memory";` agregar `MemoryMeta,MemoryMark` (solo tipos: la lista de exports de ejecución de `src/index.test.ts` no cambia).

- [ ] **Step 4: Verde del módulo**

Run: `bun test src/modules/memory`
Expected: PASS.

- [ ] **Step 5: Pruebas que fallan de almacenamiento**

`src/infrastructure/sqlite/meta.test.ts`:

```ts
import { expect, test } from "bun:test";
import { withDatabase } from "../__test-support__/fixtures";
import { createProject } from "./projects";
import { readMeta, readMetas, upsertMeta } from "./meta";
import { enableIntelligence } from "./schema";
import { save } from "./writes";

test("upsertMeta merges patches and readMeta/readMetas return the stored metadata", () => withDatabase(db => {
  enableIntelligence(db);
  const project = createProject(db, "Meta");
  const a = save(db, { projectId: project.projectId, type: "fact", title: "A", content: "a" });
  const b = save(db, { projectId: project.projectId, type: "fact", title: "B", content: "b" });
  expect(readMeta(db, a.id)).toBeNull();
  upsertMeta(db, a.id, { short: "corta" }, "2026-09-24T00:00:00.000Z");
  upsertMeta(db, a.id, { affects: ["engram", "shell"] }, "2026-09-24T00:00:01.000Z");
  expect(readMeta(db, a.id)).toEqual({ short: "corta", reviewAfter: null, supersededBy: null, affects: ["engram", "shell"] });
  upsertMeta(db, a.id, { short: null }, "2026-09-24T00:00:02.000Z");
  expect(readMeta(db, a.id)?.short).toBeNull();
  expect([...readMetas(db, [a.id, b.id]).keys()]).toEqual([a.id]);
}));
```

`src/infrastructure/sqlite/meta-save.test.ts`:

```ts
import { expect, setSystemTime, test } from "bun:test";
import { withDatabase } from "../__test-support__/fixtures";
import { createProject } from "./projects";
import { readMeta } from "./meta";
import { enableIntelligence, enableSearchReinforcement } from "./schema";
import { getVersion, searchPreviews } from "./search";
import { save } from "./writes";

const secretText = ["pass", "word = ", "hunter2hunter2"].join("");

test("secrets are rejected at every schema level, naming the kind and never the value", () => {
  for (const level of ["base", "intelligence"] as const) withDatabase(db => {
    if (level === "intelligence") enableIntelligence(db);
    const project = createProject(db, "Secrets");
    let error: unknown;
    try { save(db, { projectId: project.projectId, type: "fact", title: "Credenciales", content: secretText }); } catch (caught) { error = caught; }
    expect(error).toMatchObject({ code: "SECRET_REJECTED" });
    expect(String((error as Error).message)).not.toContain("hunter2");
    expect(db.query("SELECT count(*) AS n FROM memories").get()).toEqual({ n: 0 });
  });
});

test("metadata fields below level 11 are rejected, never dropped", () => withDatabase(db => {
  enableSearchReinforcement(db);
  const project = createProject(db, "Old");
  expect(() => save(db, { projectId: project.projectId, type: "fact", title: "T", content: "c", short: "corta" }))
    .toThrow(expect.objectContaining({ code: "INTELLIGENCE_REQUIRED" }));
}));

test("decisions get a review date; short survives same content, is cleared on new content, and can be added by confirmation", () => withDatabase(db => {
  enableIntelligence(db);
  setSystemTime(new Date("2026-09-24T12:00:00.000Z"));
  try {
    const project = createProject(db, "Meta");
    const v1 = save(db, { projectId: project.projectId, type: "decision", title: "D", content: "uno", topicKey: "d", short: "corta" });
    expect(readMeta(db, v1.id)).toMatchObject({ short: "corta", reviewAfter: "2026-12-23T12:00:00.000Z" });
    save(db, { projectId: project.projectId, type: "decision", title: "D", content: "dos", topicKey: "d", expectedVersion: 1 });
    expect(readMeta(db, v1.id)?.short).toBeNull();
    // Same content, same version: a confirmation, and the new short still applies (D-T2-4).
    save(db, { projectId: project.projectId, type: "decision", title: "D", content: "dos", topicKey: "d", expectedVersion: 2, short: "nueva corta" });
    expect(readMeta(db, v1.id)?.short).toBe("nueva corta");
    expect(db.query("SELECT max(version) AS v FROM memory_versions WHERE memory_id=?").get(v1.id)).toEqual({ v: 2 });
  } finally { setSystemTime(); }
}));

test("supersedes marks the replaced memory in the same scope and owner only", () => withDatabase(db => {
  enableIntelligence(db);
  const project = createProject(db, "Meta"), other = createProject(db, "Other");
  const old = save(db, { projectId: project.projectId, type: "decision", title: "Vieja", content: "usar A" });
  const foreign = save(db, { projectId: other.projectId, type: "decision", title: "Ajena", content: "usar Z" });
  const fresh = save(db, { projectId: project.projectId, type: "decision", title: "Nueva", content: "usar B", supersedes: old.id });
  expect(readMeta(db, old.id)?.supersededBy).toBe(fresh.id);
  expect(() => save(db, { projectId: project.projectId, type: "fact", title: "X", content: "x", supersedes: foreign.id }))
    .toThrow(expect.objectContaining({ code: "SUPERSEDES_NOT_FOUND" }));
  expect(() => save(db, { projectId: project.projectId, type: "fact", title: "X", content: "x", supersedes: "missing" }))
    .toThrow(expect.objectContaining({ code: "SUPERSEDES_NOT_FOUND" }));
  const topic = save(db, { projectId: project.projectId, type: "fact", title: "T", content: "t", topicKey: "t" });
  expect(() => save(db, { projectId: project.projectId, type: "fact", title: "T", content: "t2", topicKey: "t", expectedVersion: 1, supersedes: topic.id }))
    .toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
}));

test("get and search expose meta and marks at level 11 only, including verify after the review date", () => {
  withDatabase(db => {
    enableIntelligence(db);
    const project = createProject(db, "Meta");
    setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const saved = save(db, { projectId: project.projectId, type: "decision", title: "Regla del almacenamiento", content: "usar SQLite", affects: ["shell", "engram"] });
    setSystemTime(new Date("2026-06-01T00:00:00.000Z"));
    try {
      expect(getVersion(db, project.projectId, saved.id)).toMatchObject({ meta: { affects: ["engram", "shell"] }, marks: ["verify"] });
      expect(searchPreviews(db, project.projectId, "almacenamiento")[0]).toMatchObject({ marks: ["verify"] });
    } finally { setSystemTime(); }
  });
  withDatabase(db => {
    enableSearchReinforcement(db);
    const project = createProject(db, "Old");
    const saved = save(db, { projectId: project.projectId, type: "decision", title: "Regla vieja", content: "usar SQLite" });
    const read = getVersion(db, project.projectId, saved.id)!;
    expect(Object.keys(read).sort()).toEqual(["currentVersion", "memory", "state"]);
    expect(Object.keys(searchPreviews(db, project.projectId, "vieja")[0]!).sort()).toEqual(["explanation", "memory"]);
  });
});
```

- [ ] **Step 6: Rojo de almacenamiento**

Run: `bun test src/infrastructure/sqlite/meta.test.ts src/infrastructure/sqlite/meta-save.test.ts`
Expected: FAIL (`./meta` inexistente y códigos nuevos sin implementar).

- [ ] **Step 7: Implementar almacenamiento, guardado y lectura**

`src/infrastructure/sqlite/meta.ts`:

```ts
import type { Database } from "bun:sqlite";
import type { MemoryMeta } from "../../modules/memory";

type MetaRow = { memory_id: string; short: string | null; review_after: string | null; superseded_by: string | null; affects: string | null };

function fromRow(row: MetaRow): MemoryMeta {
  return { short: row.short, reviewAfter: row.review_after, supersededBy: row.superseded_by, affects: row.affects === null ? null : JSON.parse(row.affects) as string[] };
}

export function readMeta(db: Database, memoryId: string): MemoryMeta | null {
  const row = db.query("SELECT * FROM memory_meta WHERE memory_id=?").get(memoryId) as MetaRow | null;
  return row ? fromRow(row) : null;
}

export function readMetas(db: Database, ids: readonly string[]): Map<string, MemoryMeta> {
  const result = new Map<string, MemoryMeta>();
  if (ids.length === 0) return result;
  const rows = db.query(`SELECT * FROM memory_meta WHERE memory_id IN (${ids.map(() => "?").join(",")})`).all(...ids) as MetaRow[];
  for (const row of rows) result.set(row.memory_id, fromRow(row));
  return result;
}

/** Merge a patch into the memory's metadata row, creating it when missing. */
export function upsertMeta(db: Database, memoryId: string, patch: Partial<MemoryMeta>, now: string): void {
  const current = readMeta(db, memoryId) ?? { short: null, reviewAfter: null, supersededBy: null, affects: null };
  const next = { ...current, ...patch };
  db.query(`INSERT INTO memory_meta(memory_id,short,review_after,superseded_by,affects,updated_at) VALUES(?,?,?,?,?,?)
    ON CONFLICT(memory_id) DO UPDATE SET short=excluded.short,review_after=excluded.review_after,
    superseded_by=excluded.superseded_by,affects=excluded.affects,updated_at=excluded.updated_at`)
    .run(memoryId, next.short, next.reviewAfter, next.supersededBy, next.affects === null ? null : JSON.stringify(next.affects), now);
}
```

`src/infrastructure/sqlite/writes.ts`:
- Imports: agregar `findSecret, normalizeAffects, normalizeShort, reviewAfterFor` a la importación de `../../modules/memory`; agregar `import { intelligenceEnabled } from "./intelligence";` y `import { readMeta, upsertMeta } from "./meta";`.
- En `saveCore`, justo después del bloque de `expected` (la validación de `expectedVersion`), agregar:

```ts
    const secret = findSecret([title, content, topic ?? "", typeof input.short === "string" ? input.short : ""].join("\n"));
    if (secret !== null) throw new MemoryError("SECRET_REJECTED", `El recuerdo parece contener un secreto (${secret}); guárdalo sin el valor.`);
    const wantsMeta = input.short !== undefined || input.supersedes !== undefined || input.affects !== undefined;
    if (wantsMeta && !intelligenceEnabled(db)) throw new MemoryError("INTELLIGENCE_REQUIRED", "short, supersedes y affects requieren la memoria inteligente (forge614-engram intelligence-enable).");
    const short = input.short === undefined ? undefined : normalizeShort(input.short);
    const affects = input.affects === undefined ? undefined : normalizeAffects(input.affects);
    const supersedes = input.supersedes === undefined ? null : required(input.supersedes, "supersedes");
```

- Agregar, antes de `function saveCore`, este ayudante:

```ts
// Level-11 metadata for a save. The replaced memory must be active and in the same scope and owner.
function applySaveMeta(db: Database, input: { id: string; type: SaveInput["type"]; now: string; newVersion: boolean; contentChanged: boolean;
    short: string | undefined; affects: string[] | undefined; supersedes: string | null; scope: Memory["scope"]; ownerColumn: string; ownerId: string | null }): void {
  if (input.supersedes !== null) {
    if (input.supersedes === input.id) throw new MemoryError("INVALID_INPUT", "Un recuerdo no puede reemplazarse a sí mismo.");
    const target = db.query(`SELECT id FROM memories WHERE scope=? AND ${input.ownerColumn} IS ? AND id=? AND state='active'`)
      .get(input.scope, input.ownerId, input.supersedes) as { id: string } | null;
    if (!target) throw new MemoryError("SUPERSEDES_NOT_FOUND", "El recuerdo a reemplazar no existe o no es del mismo alcance.");
  }
  const previous = readMeta(db, input.id);
  const patch: Partial<MemoryMeta> = {};
  if (input.newVersion) {
    const reviewAfter = reviewAfterFor(input.type, input.now);
    // Only touch review_after when there is something to store or to clear: plain facts get no metadata row.
    if (reviewAfter !== null || previous?.reviewAfter) patch.reviewAfter = reviewAfter;
    if (input.short === undefined && input.contentChanged && previous?.short) patch.short = null;
  }
  if (input.short !== undefined) patch.short = input.short;
  if (input.affects !== undefined) patch.affects = input.affects;
  if (Object.keys(patch).length > 0) upsertMeta(db, input.id, patch, input.now);
  if (input.supersedes !== null) upsertMeta(db, input.supersedes, { supersededBy: input.id }, input.now);
}
```
(agregar `type MemoryMeta` a la importación de tipos de `../../modules/memory`).

- En la rama de confirmación (texto idéntico), justo antes de `return response;`:

```ts
          if (intelligenceEnabled(db) && wantsMeta) applySaveMeta(db, { id: confirmed.id, type: input.type, now, newVersion: false, contentChanged: false,
            short, affects, supersedes, scope, ownerColumn, ownerId });
```

- En la rama de versión nueva, justo antes de `return {memory:snapshot,sessionId:selected,sessionSource:source};`:

```ts
      if (intelligenceEnabled(db)) applySaveMeta(db, { id, type: input.type, now, newVersion: true, contentChanged: existing?.content !== content,
        short, affects, supersedes, scope, ownerColumn, ownerId });
```

`src/modules/search/types.ts`:

```ts
import type { Memory,MemoryMark,MemoryMeta,MemoryVersion,SearchResult } from "../memory";
export interface PreviewResult{memory:MemoryPreview;explanation:SearchResult["explanation"];meta?:MemoryMeta;marks?:MemoryMark[]}
export interface VersionRead{memory:MemoryVersion;currentVersion:number;state:Memory["state"];meta?:MemoryMeta;marks?:MemoryMark[]}
```
(las demás líneas del archivo no cambian).

`src/infrastructure/sqlite/search.ts`: importar `marksFor` de `../../modules/memory`, `intelligenceEnabled` de `./intelligence` y `readMeta, readMetas` de `./meta`, y reemplazar las dos funciones exportadas:

```ts
export function searchPreviews(db: Database, projectId: string | null, query: string, limit = 10, scope: SearchScope = "all", groupId?: string | null): PreviewResult[] {
    const results = readSearchPreviews(db, projectId === null ? null : projectIdentity(projectId), query, limit, scope, groupId);
    if (!intelligenceEnabled(db)) return results;
    const metas = readMetas(db, results.map(result => result.memory.id)), now = new Date().toISOString();
    return results.map(result => {
      const meta = metas.get(result.memory.id) ?? null;
      return meta === null ? result : { ...result, meta, marks: marksFor(meta, now) };
    });
  }

export function getVersion(db: Database, owner: MemoryOwner, id: string, version?: number): VersionRead | null {
    const read = readGetVersion(db, owner, id, version);
    if (read === null || !intelligenceEnabled(db)) return read;
    const meta = readMeta(db, read.memory.id);
    return meta === null ? read : { ...read, meta, marks: marksFor(meta, new Date().toISOString()) };
  }
```

`src/interfaces/cli/main.ts:10-11`: agregar `"SECRET_REJECTED","INTELLIGENCE_REQUIRED","SUPERSEDES_NOT_FOUND"` al conjunto `CONTRACT_CODES`.

- [ ] **Step 8: Verde de almacenamiento**

Run: `bun test src/infrastructure/sqlite src/modules`
Expected: PASS. Si algo falla con el código literal del plan, detente y repórtalo.

- [ ] **Step 9: MCP**

`src/interfaces/mcp/schemas.ts`, en `memory_save`, agregar después de `requestKey:text(300).optional(),`:

```ts
      short:text(300).optional(),supersedes:id.optional(),affects:z.array(text(64)).min(1).max(20).optional(),
```

`src/interfaces/mcp/memory-tools.ts`, en el manejador de `memory_save`: el tipo de `saveInput` gana `short?:string; supersedes?:string; affects?:string[]` y, después de la línea de `requestKey`, agregar:

```ts
    if (input.short !== undefined) saveInput.short = input.short;
    if (input.supersedes !== undefined) saveInput.supersedes = input.supersedes;
    if (input.affects !== undefined) saveInput.affects = input.affects;
```

`src/interfaces/mcp/schemas.test.ts`, agregar:

```ts
test("memory_save accepts bounded metadata fields", () => {
  const save = { title: "T", content: "c", type: "decision" as const };
  expect(toolSchemas.memory_save.parse({ ...save, short: "  corta  ", supersedes: "id-1", affects: ["engram", "shell"] }))
    .toMatchObject({ short: "corta", supersedes: "id-1", affects: ["engram", "shell"] });
  expect(toolSchemas.memory_save.safeParse({ ...save, short: "x".repeat(301) }).success).toBe(false);
  expect(toolSchemas.memory_save.safeParse({ ...save, affects: [] }).success).toBe(false);
  expect(toolSchemas.memory_save.safeParse({ ...save, affects: Array.from({ length: 21 }, (_, i) => `p${i}`) }).success).toBe(false);
});
```

`src/interfaces/mcp/memory-tools.test.ts`, agregar:

```ts
test("memory_save passes metadata through and memory_get returns it with marks at level 11", async () => {
  const h=await sdkHarness(registerMemoryTools);
  try {
    h.store.enableIntelligence();
    const old=(await h.call("memory_save",{title:"Vieja",content:"usar A",type:"decision"})).data;
    const fresh=(await h.call("memory_save",{title:"Nueva",content:"usar B",type:"decision",short:"B en vez de A",supersedes:old.id,affects:["shell","engram"]})).data;
    expect((await h.call("memory_get",{id:fresh.id})).data).toMatchObject({meta:{short:"B en vez de A",affects:["engram","shell"]},marks:[]});
    expect((await h.call("memory_get",{id:old.id})).data).toMatchObject({meta:{supersededBy:fresh.id},marks:["superseded"]});
    expect((await h.call("memory_save",{title:"Clave",content:["pass","word = ","hunter2hunter2"].join(""),type:"fact"})).data.code).toBe("SECRET_REJECTED");
  } finally {await h.close();}
});
```

- [ ] **Step 10: Suite completa**

```bash
bun test 2>&1 | tail -3
bun run typecheck; echo "typecheck exit: $?"
git diff --check
```
Expected: todo en verde; conteo = 619 + pruebas nuevas; typecheck con código 0.

- [ ] **Step 11: Commit**

```bash
git add src/modules/memory src/modules/search/types.ts src/index.ts src/infrastructure/sqlite/meta.ts src/infrastructure/sqlite/meta.test.ts src/infrastructure/sqlite/meta-save.test.ts src/infrastructure/sqlite/writes.ts src/infrastructure/sqlite/search.ts src/interfaces/mcp/schemas.ts src/interfaces/mcp/schemas.test.ts src/interfaces/mcp/memory-tools.ts src/interfaces/mcp/memory-tools.test.ts src/interfaces/cli/main.ts
git commit -m "feat(memory): reject secrets on save and keep level-11 metadata (short, review date, supersedes, affects)"
```

- [ ] **Step 12: Documentación (prompt aparte, sesión nueva, commit propio)**

Texto escrito por el orquestador tras aprobar el código (commits `8d6dad2` y `62dfc6f`), leyendo los capítulos reales. Hechos verificados en el código: todo guardado pasa por `saveCore` (CLI `save`, SDK, `memory_save`, resúmenes de sesión de proyecto y de grupo); `meta`/`marks` salen en `searchPreviews` y `getVersion` (MCP `memory_search` y `memory_get`; CLI `search --preview` y `get --version`); la CLI no tiene opciones para `short`, `affects` ni `supersedes`. Ningún capítulo de usuario lista los parámetros de `memory_save` (su uso se documenta en el capítulo 09 con el protocolo v4, Task 7). T1 no documentó `enableIntelligence` en el capítulo 04; se corrige aquí.

Archivos: `docs/es/04-sdk-typescript.md`, `docs/en/04-typescript-sdk.md`, `docs/es/06-resolucion-de-errores.md`, `docs/en/06-troubleshooting.md` y `CHANGELOG.md`. `docs/notion-map.json` **sin cambios**: las entradas del 06 ya tienen `"notionSyncPending": true` y el 04 no tiene entrada.

1. `docs/es/04-sdk-typescript.md`, al final del archivo:

````markdown

## Memoria inteligente (desde 1.7.0, esquema 11)

```ts
store.intelligenceEnabled();   // boolean
store.enableIntelligence();    // IntelligenceEnrolment: { migrated, backup }; activa el esquema 11 con respaldo previo
store.save({ projectId, title: "Base de datos", content: "…", type: "decision", topicKey: "db",
  short: "Usamos SQLite local", affects: ["engram", "shell"], supersedes: oldId });
store.searchPreviews(projectId, "sqlite")[0]?.meta;  // MemoryMeta | undefined
store.getVersion(projectId, id)?.marks;              // MemoryMark[] | undefined: "superseded" | "verify"
```

`SaveInput` gana tres campos opcionales que solo se aceptan con el esquema 11 (en un nivel anterior responden `INTELLIGENCE_REQUIRED`): `short` (versión corta de 1 a 300 caracteres), `affects` (de 1 a 20 nombres de proyecto de 1 a 64 caracteres; se recortan, se quitan repetidos y se ordenan) y `supersedes` (id de un recuerdo activo del mismo ámbito y dueño, que queda marcado como reemplazado por este; nunca se archiva; si no existe o es de otro ámbito, `SUPERSEDES_NOT_FOUND`). Estos datos viven fuera de la versión del recuerdo: no crean versión nueva ni cambian su huella, y guardar el mismo texto con metadatos nuevos solo los actualiza. Cada versión nueva de una `decision` o un `procedure` recibe una fecha de revisión a 90 días; cuando pasa, la lectura añade la marca `verify`. Si el contenido cambia sin un `short` nuevo, la versión corta anterior se borra. `searchPreviews` y `getVersion` (y sus variantes `*InGroup`) añaden `meta` y `marks` solo con el esquema 11 y solo cuando el recuerdo tiene metadatos; en otro caso el resultado no cambia de forma. Tipos exportados nuevos: `MemoryMeta` y `MemoryMark`.

Todo guardado (`save`, resúmenes de sesión, CLI y MCP), en cualquier nivel de la base, rechaza con `SECRET_REJECTED` un título, contenido, tema o versión corta que parezca contener un secreto: llave privada, clave de AWS, token de GitHub o Slack, clave `sk-`, JWT, cadena de conexión con usuario y contraseña, o una asignación con valor literal como `password=<valor>`. El error nombra el tipo de secreto, nunca el valor. Nombrar dónde vive una clave sí se permite (`process.env.API_KEY`, `password: <redacted>`).
````

2. `docs/en/04-typescript-sdk.md`, al final del archivo:

````markdown

## Memory intelligence (since 1.7.0, schema 11)

```ts
store.intelligenceEnabled();   // boolean
store.enableIntelligence();    // IntelligenceEnrolment: { migrated, backup }; enables schema 11 after a backup
store.save({ projectId, title: "Database", content: "…", type: "decision", topicKey: "db",
  short: "We use local SQLite", affects: ["engram", "shell"], supersedes: oldId });
store.searchPreviews(projectId, "sqlite")[0]?.meta;  // MemoryMeta | undefined
store.getVersion(projectId, id)?.marks;              // MemoryMark[] | undefined: "superseded" | "verify"
```

`SaveInput` gains three optional fields accepted only with schema 11 (an earlier level answers `INTELLIGENCE_REQUIRED`): `short` (a 1–300 character short version), `affects` (1–20 project names of 1–64 characters; trimmed, deduplicated and sorted) and `supersedes` (the id of an active memory with the same scope and owner, which is marked as replaced by this one; it is never archived; if it does not exist or belongs to another scope, `SUPERSEDES_NOT_FOUND`). This data lives outside the memory version: it creates no new version and does not change the memory's hash, and saving the same text with new metadata only updates it. Every new version of a `decision` or `procedure` gets a review date 90 days ahead; once it passes, reads add the `verify` mark. When the content changes without a new `short`, the previous short version is cleared. `searchPreviews` and `getVersion` (and their `*InGroup` variants) add `meta` and `marks` only with schema 11 and only when the memory has metadata; otherwise the result keeps its shape. New exported types: `MemoryMeta` and `MemoryMark`.

Every save (`save`, session summaries, CLI and MCP), at any database level, rejects with `SECRET_REJECTED` a title, content, topic or short version that looks like it contains a secret: a private key, an AWS key, a GitHub or Slack token, an `sk-` key, a JWT, a connection string with user and password, or an assignment with a literal value such as `password=<value>`. The error names the kind of secret, never the value. Naming where a key lives is allowed (`process.env.API_KEY`, `password: <redacted>`).
````

3. `docs/es/06-resolucion-de-errores.md`, nueva sección justo antes de `## Integraciones de IA`:

```markdown
## Memoria inteligente

Desde 1.7.0. En la CLI estos códigos devuelven `{schemaVersion,code,error}` por stderr.

- `SECRET_REJECTED`: el título, el contenido, el tema o la versión corta parecen contener un secreto (el mensaje dice de qué tipo, nunca el valor). Quita el valor y guarda solo dónde vive, por ejemplo `password: <redacted>` o el nombre de la variable de entorno. Aplica en cualquier nivel de la base.
- `INTELLIGENCE_REQUIRED`: se enviaron `short`, `supersedes` o `affects` y la base aún no tiene la memoria inteligente. Actívala con `forge614-engram intelligence-enable` (respalda antes de migrar) o guarda sin esos campos.
- `SUPERSEDES_NOT_FOUND`: `supersedes` apunta a un recuerdo que no existe, está archivado o es de otro ámbito o proyecto. Busca el id correcto con `memory_search`.

```

4. `docs/en/06-troubleshooting.md`, nueva sección justo antes de `## AI integrations`:

```markdown
## Memory intelligence

Since 1.7.0. In the CLI these codes return `{schemaVersion,code,error}` on stderr.

- `SECRET_REJECTED`: the title, content, topic or short version looks like it contains a secret (the message names its kind, never the value). Remove the value and save only where it lives, for example `password: <redacted>` or the environment variable name. Applies at any database level.
- `INTELLIGENCE_REQUIRED`: `short`, `supersedes` or `affects` were sent and the database does not have memory intelligence yet. Enable it with `forge614-engram intelligence-enable` (it backs up before migrating) or save without those fields.
- `SUPERSEDES_NOT_FOUND`: `supersedes` points to a memory that does not exist, is archived, or belongs to another scope or project. Find the right id with `memory_search`.

```

5. `CHANGELOG.md`, en `## 1.7.0 — en desarrollo`, después de la viñeta **Esquema 11** y antes de «La replicación de grupos…»:

```markdown
- **Filtro de secretos y metadatos del recuerdo:** todo guardado (CLI, SDK, MCP y resúmenes de sesión), en cualquier nivel de la base, rechaza con `SECRET_REJECTED` un texto que parezca contener un secreto; el error nombra el tipo, nunca el valor, y nombrar dónde vive una clave sigue permitido. Con el esquema 11, `memory_save` y `SaveInput` aceptan `short`, `affects` y `supersedes` (`INTELLIGENCE_REQUIRED` en niveles anteriores; `SUPERSEDES_NOT_FOUND` si el reemplazado no existe en el mismo ámbito); las decisiones y los procedimientos reciben fecha de revisión a 90 días; `memory_search` y `memory_get` añaden `meta` y `marks` (`superseded`, `verify`). Los metadatos no crean versión ni cambian la huella del recuerdo. Tipos nuevos del SDK: `MemoryMeta` y `MemoryMark`.
```

Verificación: `git diff --check` sin salida y `git diff --stat` con exactamente esos 5 archivos (la documentación no cambia pruebas; el orquestador corre la suite en su copia).

Commit:

```bash
git add docs/es/04-sdk-typescript.md docs/en/04-typescript-sdk.md docs/es/06-resolucion-de-errores.md docs/en/06-troubleshooting.md CHANGELOG.md
git commit -m "docs: secret filter and memory metadata in SDK, troubleshooting and changelog"
```

### Task 3: Buscador nuevo y candidatos parecidos

**Experimento:** Claude Code · Sonnet 5 · **high**, plan con código completo, **probado por el orquestador antes de entregarlo** (primera tarea con esa práctica: medir si baja las rondas por error del plan, que fueron 3 en T1 y 1 en T2).

**Medición del orquestador (2026-09-24, laboratorio sobre `ed69776`, nunca en el repositorio):**
- 20 preguntas en lenguaje natural sobre una **copia** de la base real del propietario (107 recuerdos): buscador actual **8/20** en el top 3 y **9/20 sin ningún resultado**; buscador nuevo **20/20** y **0 sin resultado**. La primera versión dio 19/20: el índice de trigramas distingue acentos ("proteccion" no encontraba "protección"); se corrigió buscando cada término como se escribió y sin acentos.
- Mismo ejercicio sobre el corpus sintético que entra al repositorio (`tests/fixtures/search-benchmark.ts`, 30 recuerdos reescritos sin datos privados): antes **8/20** (12 vacías), después **20/20**.
- Parecidos: en la base real, de 1 609 pares de recuerdos del mismo dueño, solo 2 llegan a 0,25 de similitud y los dos son una actualización real del otro (causa del cuelgue de Bun → Bun 1.4.2 fijado; Engines 1.12.0 → 1.12.1). Con 0,20 serían 11 pares, varios solo emparentados. Umbral: **0,25**.
- Velocidad (misma copia, 100 búsquedas): actual mediana 0,44 ms; nuevo mediana 1,63 ms, p95 3,24 ms.
- Suite completa en el laboratorio: **636 pass / 10 skip / 0 fail** (646; +12), typecheck 0.

**Decisiones de esta tarea:**
- **D-T3-1:** el buscador nuevo solo actúa en **nivel 11**; en niveles menores `search`/`searchPreviews` quedan idénticos a 1.6.0 (modos `fts5` y `literal`).
- **D-T3-2:** consulta = palabras sin relleno (listas ES/EN), sin acentos y en minúsculas, unidas con **OR**; en el índice de palabras (`memories_words`) las de 4+ letras buscan por prefijo; en el de trigramas (`memories_fts`) las de 3+ letras buscan como se escribieron y sin acentos. Máximo 16 términos. Si todas son de relleno, se usan todas; si no queda ninguna palabra, 0 resultados.
- **D-T3-3:** fusión por rango recíproco (RRF, `k = 60`, 50 candidatos por índice) multiplicada por el refuerzo existente (`rankingFactors`: fijado, recencia, estabilidad). `explanation` = `{ mode: "hybrid", bm25, multiplier, orderScore: -(rrf × multiplier), reinforcement }` (menor es mejor, como en `fts5`).
- **D-T3-4:** umbral de ruido: un resultado debe contener **al menos 2** términos de la pregunta (o todos si tiene menos de 2). Se nombra `MIN_MATCHED_TERMS` (el esqueleto decía `MIN_SCORE`: un umbral de puntaje no sirve con RRF, que solo mide posiciones).
- **D-T3-5:** parecidos = índice de Jaccard entre las palabras (sin relleno ni acentos) de título + contenido; mismo ámbito y dueño, activos, sin el propio recuerdo ni resúmenes de sesión (`session/*/summary`); máx. 3 con puntaje ≥ 0,25. Solo se calculan al **crear** un recuerdo **sin tema**; nunca en una versión nueva de un tema ni en una confirmación de texto idéntico. Una repetición por `requestKey` no los repite.
- **D-T3-6:** `SessionSaveResult` gana `similar?` (opcional, solo si hay candidatos); `memory_save` lo devuelve en los tres ámbitos. `SimilarCandidate` vive en `modules/memory` porque `modules/sessions` no puede depender de `modules/search` (regla de arquitectura medida en el laboratorio).

**Files:**
- Create: `src/modules/search/query.ts` (+ `query.test.ts`)
- Create: `src/infrastructure/sqlite/hybrid.ts` (+ `hybrid.test.ts`), `src/infrastructure/sqlite/similar.ts` (+ `similar.test.ts`)
- Create: `tests/fixtures/search-benchmark.ts`
- Modify: `src/modules/search/index.ts`, `src/modules/memory/types.ts`, `src/modules/memory/index.ts`, `src/modules/sessions/types.ts`, `src/index.ts`
- Modify: `src/infrastructure/sqlite/search.ts`, `src/infrastructure/sqlite/writes.ts`
- Modify: `src/interfaces/mcp/memory-tools.ts`, `src/interfaces/mcp/memory-tools.test.ts`

**Interfaces:**
- Consumes: `intelligenceEnabled(db)` (T1), `rankingFactors` y pesos `RANKING_*` de `modules/memory`, `memories_words` (T1), `memories_fts`.
- Produces:
  ```ts
  // src/modules/search/query.ts
  export const MAX_QUERY_TERMS = 16; export const MIN_MATCHED_TERMS = 2; export const RRF_K = 60; export const HYBRID_CANDIDATES = 50;
  export const SIMILAR_LIMIT = 3; export const SIMILAR_MIN_SCORE = 0.25;
  export interface QueryPlan { terms: string[]; words: string | null; trigram: string | null }
  export function termsOf(text: string): string[];
  export function buildQuery(text: string): QueryPlan;
  export function matchedTerms(terms: readonly string[], text: string): number;
  export function similarity(left: readonly string[], right: readonly string[]): number;
  // src/modules/memory/types.ts
  export interface SimilarCandidate { id: string; title: string; version: number; score: number }
  // SearchExplanation.mode gana "hybrid"; SessionSaveResult gana similar?: SimilarCandidate[]
  // src/infrastructure/sqlite/hybrid.ts
  export function hybridHits(db, selection: { sql: string; args: string[] }, query: string, limit: number, now?: string): HybridHit[];
  // src/infrastructure/sqlite/similar.ts
  export function similarTo(db, input: { scope; ownerColumn: "projectId" | "groupId"; ownerId: string | null; title: string; content: string; excludeId: string }): SimilarCandidate[];
  ```

- [ ] **Step 1: Pruebas que fallan**

`src/modules/search/query.test.ts`:

```ts
import { expect, test } from "bun:test";
import { buildQuery, matchedTerms, MAX_QUERY_TERMS, similarity, termsOf } from "./query";

test("filler words are dropped, accents folded, terms OR-ed; four letters or more match by prefix", () => {
  expect(buildQuery("¿Qué decidimos sobre la versión de Sentinel y el bun?")).toEqual({
    terms: ["decidimos", "version", "sentinel", "bun"],
    words: '"decidimos"* OR "version"* OR "sentinel"* OR "bun"',
    trigram: '"decidimos" OR "version" OR "sentinel" OR "bun" OR "versión"',
  });
});

test("a query made only of filler words keeps them; punctuation alone yields no query", () => {
  expect(buildQuery("de la")).toEqual({ terms: ["de", "la"], words: '"de" OR "la"', trigram: null });
  expect(buildQuery("¿?! --")).toEqual({ terms: [], words: null, trigram: null });
});

test("long texts are capped and repeated words counted once", () => {
  const text = Array.from({ length: 30 }, (_, i) => `palabra${i}`).join(" ");
  expect(buildQuery(text).terms).toHaveLength(MAX_QUERY_TERMS);
  expect(termsOf("Main main MAIN rama")).toEqual(["main", "rama"]);
});

test("matched terms: substring from three letters, whole word below", () => {
  expect(matchedTerms(["proteccion", "main", "ai"], "Protección de main en forge614-ai")).toBe(3);
  expect(matchedTerms(["ai"], "email")).toBe(0);
  expect(matchedTerms(["pointerschema"], "NodePointerSchema es estricto")).toBe(1);
});

test("similarity is the Jaccard index of two term sets, two decimals", () => {
  expect(similarity(["a", "b"], ["b", "c"])).toBe(0.33);
  expect(similarity(["a", "b"], ["b", "a"])).toBe(1);
  expect(similarity([], ["a"])).toBe(0);
});
```

`tests/fixtures/search-benchmark.ts`:

```ts
// Search benchmark: 30 memories modeled on real ones from this ecosystem (rewritten, no private data)
// and 20 natural-language questions its owner asked, each with the title it must find in the top 3.
export const BENCHMARK_MEMORIES: ReadonlyArray<{ title: string; content: string; type: "fact" | "decision" | "procedure" | "warning" | "preference" }> = [
  { type: "decision", title: "Versión de Sentinel dentro de forge614.node.json", content: "La versión de Sentinel vive en el campo sentinel.version del archivo del nodo; no se agregan archivos nuevos." },
  { type: "decision", title: "Presupuesto de arranque de 3000 tokens", content: "Acta 0020: la memoria que se inyecta al iniciar una sesión no pasa de 3000 tokens." },
  { type: "procedure", title: "Procedimiento para agregar un agente de IA", content: "Runbook paso a paso: registrar el agente en Engines, probar el gancho de inicio y marcar la matriz de soporte." },
  { type: "decision", title: "Bun 1.4.2 como versión única", content: "Todos los nodos fijan Bun 1.4.2 en CI y en local; la 1.3.8 se atoraba en Linux al cargar módulos." },
  { type: "decision", title: "Productos externos que no se nombran", content: "La documentación y los contratos no mencionan productos de terceros; se describen como referencia A o B." },
  { type: "fact", title: "Protección de la rama main", content: "Ruleset aplicado: todo cambio entra por PR con los cuatro checks en verde." },
  { type: "decision", title: "Grupo forge614 en Engram", content: "Todos los nodos pertenecen al grupo forge614 del ámbito ecosystem." },
  { type: "decision", title: "Identidad portátil del proyecto", content: "Engram escribe .forge614/project.json en la raíz del repositorio y resuelve por su id." },
  { type: "decision", title: "Soporte de macOS, Linux y Windows", content: "Acta 0018: todo nodo corre en los tres sistemas; la paridad se prueba en CI." },
  { type: "decision", title: "Diseño de forge614 init y prepare", content: "init prepara la máquina y prepare prepara cada proyecto; ninguno instala nada sin confirmar." },
  { type: "decision", title: "Evolución aditiva de datos", content: "Acta 0024: los contratos y los datos guardados solo crecen; nunca se renombra ni se quita un campo." },
  { type: "procedure", title: "Precios de modelos por fecha", content: "Los precios oficiales se guardan con su fecha en Notion para calcular el costo de cada corrida." },
  { type: "procedure", title: "Verificación del orquestador", content: "Cada tarea se revisa leyendo el diff completo y corriendo pruebas y typecheck en una copia temporal." },
  { type: "warning", title: "Goldens de Sentinel al subir versión", content: "Lección: subir la versión exige regenerar los goldens con sentinel:parity --update." },
  { type: "warning", title: "Proyecto de prueba en la base real", content: "Un proyecto Release probe quedó registrado en la base del propietario por una prueba de publicación." },
  { type: "preference", title: "Commits sin atribución", content: "Ningún commit ni PR menciona a una IA ni lleva líneas Co-Authored-By." },
  { type: "preference", title: "Comandos para la terminal", content: "Los comandos que se entregan para pegar no llevan líneas de comentario." },
  { type: "preference", title: "Color favorito", content: "Negro con morado." },
  { type: "decision", title: "Workflows delgados", content: "Acta 0019: los workflows de CI son delgados, documentados y validados antes de integrar." },
  { type: "fact", title: "Reglamento 1.0.0 publicado", content: "Release standard-v1.0.0 con el paquete del reglamento y su huella sha256." },
  { type: "warning", title: "Timeouts de CI en Ubuntu", content: "La prueba cli.e2e excedía 10 s en ubuntu; se subió el límite de la prueba." },
  { type: "fact", title: "Release de Shell 1.10.0", content: "Publicada con la actividad en segundo plano corregida." },
  { type: "fact", title: "Engines 1.12.1 publicada", content: "Release sin atribución y pruebas de Windows en verde." },
  { type: "decision", title: "Modelo Lego de instalación", content: "Cada nodo se instala por separado y se combina como piezas." },
  { type: "decision", title: "Registro de decisiones en cuatro capas", content: "Plan, acta, Engram y changelog." },
  { type: "procedure", title: "Checklist de agentes nuevos", content: "Se revisa en cada cambio de nodo antes de publicar." },
  { type: "fact", title: "Pantalla de grupo en Shell", content: "Shell muestra el grupo del ecosistema y los avisos de Engram." },
  { type: "fact", title: "Réplica en PostgreSQL", content: "La sincronización con PostgreSQL es explícita con el comando sync." },
  { type: "fact", title: "Plan B de Sentinel", content: "29 tareas escritas y revisadas antes de ejecutar." },
  { type: "fact", title: "Traspaso del 24 de septiembre", content: "Sentinel 0.1 cerrado e instalado en la Mac." },
];

export const BENCHMARK_QUERIES: ReadonlyArray<readonly [query: string, expectedTitle: string]> = [
  ["qué decidimos sobre la versión de Sentinel en el json", "Versión de Sentinel dentro de forge614.node.json"],
  ["cuánto es el presupuesto de tokens al arrancar", "Presupuesto de arranque de 3000 tokens"],
  ["cómo se agrega un agente nuevo", "Procedimiento para agregar un agente de IA"],
  ["qué versión de bun usamos", "Bun 1.4.2 como versión única"],
  ["regla de no mencionar productos externos", "Productos externos que no se nombran"],
  ["protección de la rama main", "Protección de la rama main"],
  ["a qué grupo pertenecen los nodos en engram", "Grupo forge614 en Engram"],
  ["identidad portátil del proyecto", "Identidad portátil del proyecto"],
  ["soporte de windows linux y mac", "Soporte de macOS, Linux y Windows"],
  ["decisión sobre init y prepare", "Diseño de forge614 init y prepare"],
  ["evolución aditiva de los contratos", "Evolución aditiva de datos"],
  ["dónde guardamos los precios de los modelos", "Precios de modelos por fecha"],
  ["cómo verifica el orquestador cada tarea", "Verificación del orquestador"],
  ["lección de los goldens de sentinel", "Goldens de Sentinel al subir versión"],
  ["proyecto de prueba que quedó en la base real", "Proyecto de prueba en la base real"],
  ["commits sin atribución a la IA", "Commits sin atribución"],
  ["comandos para la terminal sin comentarios", "Comandos para la terminal"],
  ["cuál es mi color favorito", "Color favorito"],
  ["workflows delgados validados", "Workflows delgados"],
  ["reglamento publicado", "Reglamento 1.0.0 publicado"],
];
```

`src/infrastructure/sqlite/hybrid.test.ts`:

```ts
import { expect, test } from "bun:test";
import type { Database } from "bun:sqlite";
import { BENCHMARK_MEMORIES, BENCHMARK_QUERIES } from "../../../tests/fixtures/search-benchmark";
import { withDatabase } from "../__test-support__/fixtures";
import { createProject } from "./projects";
import { enableIntelligence, enableSearchReinforcement } from "./schema";
import { search, searchPreviews } from "./search";
import { save } from "./writes";

function benchmarkHits(db: Database): number {
  const project = createProject(db, "Benchmark");
  for (const memory of BENCHMARK_MEMORIES) save(db, { projectId: project.projectId, ...memory });
  return BENCHMARK_QUERIES.filter(([query, expected]) =>
    searchPreviews(db, project.projectId, query, 3, "all").some(result => result.memory.title === expected)).length;
}

test("benchmark: 20 natural-language questions, at least 18 found in the top 3 (was far fewer before level 11)", () => {
  let before = 0, after = 0;
  withDatabase(db => { enableSearchReinforcement(db); before = benchmarkHits(db); });
  withDatabase(db => { enableIntelligence(db); after = benchmarkHits(db); });
  expect(after).toBeGreaterThanOrEqual(18);
  expect(before).toBeLessThan(after);
});

test("OR search with accents folded; a result needs at least two of the query terms", () => withDatabase(db => {
  enableIntelligence(db);
  const project = createProject(db, "Hybrid");
  const replica = save(db, { projectId: project.projectId, type: "fact", title: "Réplica en PostgreSQL", content: "sincronización explícita" });
  save(db, { projectId: project.projectId, type: "fact", title: "Notas de la rama", content: "la rama main está protegida" });
  const results = searchPreviews(db, project.projectId, "cómo configuro la replica de postgres en main", 10, "all");
  expect(results.map(result => result.memory.id)).toEqual([replica.id]);
  const explanation = results[0]!.explanation;
  expect(explanation.mode).toBe("hybrid");
  expect(explanation.multiplier).toBeGreaterThan(1);
  expect(explanation.orderScore!).toBeLessThan(0);
}));

test("code names are found by fragment, and another project's memories never leak", () => withDatabase(db => {
  enableIntelligence(db);
  const mine = createProject(db, "Mine"), other = createProject(db, "Other");
  const schema = save(db, { projectId: mine.projectId, type: "fact", title: "Credencial del nodo", content: "NodePointerSchema es estricto" });
  save(db, { projectId: other.projectId, type: "fact", title: "Credencial del nodo", content: "NodePointerSchema es estricto" });
  expect(search(db, mine.projectId, "PointerSchema", 10, "all").map(result => result.memory.id)).toEqual([schema.id]);
  expect(searchPreviews(db, mine.projectId, "PointerSchema", 10, "project").map(result => result.memory.id)).toEqual([schema.id]);
}));

test("a query with no usable words returns nothing instead of noise", () => withDatabase(db => {
  enableIntelligence(db);
  const project = createProject(db, "Empty");
  save(db, { projectId: project.projectId, type: "fact", title: "Algo", content: "texto" });
  expect(searchPreviews(db, project.projectId, "¿?!", 10, "all")).toEqual([]);
  expect(searchPreviews(db, project.projectId, "nada relacionado aquí", 10, "all")).toEqual([]);
}));
```

`src/infrastructure/sqlite/similar.test.ts`:

```ts
import { expect, test } from "bun:test";
import { withDatabase } from "../__test-support__/fixtures";
import { createProject } from "./projects";
import { enableIntelligence, enableSearchReinforcement } from "./schema";
import { similarTo } from "./similar";
import { archive, save, saveWithSession } from "./writes";

const cause = { type: "decision" as const, title: "Bun 1.3.8 se atora en Linux", content: "La causa del cuelgue de CI es Bun 1.3.8 al cargar módulos en Linux; Bun 1.3.9 pasa." };
const fix = { type: "decision" as const, title: "Bun 1.4.2 fijado como versión única", content: "Todos los nodos fijan Bun 1.4.2; la 1.3.8 se atoraba en Linux al cargar módulos." };

test("look-alikes: same scope and owner only, never itself, archived memories or session summaries", () => withDatabase(db => {
  enableIntelligence(db);
  const mine = createProject(db, "Mine"), other = createProject(db, "Other");
  const kept = save(db, { projectId: mine.projectId, ...cause });
  const gone = save(db, { projectId: mine.projectId, ...cause, title: "Bun 1.3.8 se atora en Linux (copia)" });
  archive(db, mine.projectId, gone.id);
  save(db, { projectId: mine.projectId, ...cause, title: "Resumen", topicKey: "session/abc/summary" });
  save(db, { projectId: other.projectId, ...cause });
  save(db, { projectId: mine.projectId, type: "fact", title: "Color favorito", content: "Negro con morado." });
  const probe = save(db, { projectId: mine.projectId, ...fix });
  const found = similarTo(db, { scope: "project", ownerColumn: "projectId", ownerId: mine.projectId, title: fix.title, content: fix.content, excludeId: probe.id });
  expect(found.map(candidate => candidate.id)).toEqual([kept.id]);
  expect(found[0]!.score).toBeGreaterThanOrEqual(0.25);
  expect(found[0]).toEqual({ id: kept.id, title: cause.title, version: 1, score: found[0]!.score });
}));

test("a new memory without a topic reports look-alikes; topics, identical text and older levels do not", () => {
  withDatabase(db => {
    enableIntelligence(db);
    const project = createProject(db, "Save");
    const first = saveWithSession(db, { projectId: project.projectId, ...cause });
    expect(first.similar).toBeUndefined();
    const second = saveWithSession(db, { projectId: project.projectId, ...fix });
    expect(second.similar?.map(candidate => candidate.id)).toEqual([first.memory.id]);
    expect(saveWithSession(db, { projectId: project.projectId, ...fix, topicKey: "bun" }).similar).toBeUndefined();
    expect(saveWithSession(db, { projectId: project.projectId, ...fix })).not.toHaveProperty("similar");
  });
  withDatabase(db => {
    enableSearchReinforcement(db);
    const project = createProject(db, "Old");
    saveWithSession(db, { projectId: project.projectId, ...cause });
    expect(saveWithSession(db, { projectId: project.projectId, ...fix })).not.toHaveProperty("similar");
  });
});
```

`src/interfaces/mcp/memory-tools.test.ts`: agregar esta prueba justo después de la línea `import { sdkHarness } from "./__tests__/sdk-harness";` (antes de la primera prueba que ya existe debajo de esa línea):

```ts
test("memory_save reports look-alikes of a new memory at level 11 and memory_search finds natural questions", async () => {
  const h=await sdkHarness(registerMemoryTools);
  try {
    h.store.enableIntelligence();
    const cause=(await h.call("memory_save",{title:"Bun 1.3.8 se atora en Linux",content:"La causa del cuelgue de CI es Bun 1.3.8 al cargar módulos en Linux; Bun 1.3.9 pasa.",type:"decision"})).data;
    expect(cause).not.toHaveProperty("similar");
    const fix=(await h.call("memory_save",{title:"Bun 1.4.2 fijado como versión única",content:"Todos los nodos fijan Bun 1.4.2; la 1.3.8 se atoraba en Linux al cargar módulos.",type:"decision"})).data;
    expect(fix.similar.map((candidate:any)=>candidate.id)).toEqual([cause.id]);
    const found=(await h.call("memory_search",{query:"qué versión de bun usamos",limit:3})).data;
    expect(found.results.map((result:any)=>[result.memory.id,result.explanation.mode])).toEqual([[fix.id,"hybrid"]]);
  } finally {await h.close();}
});
```

- [ ] **Step 2: Rojo**

Run: `bun test src/modules/search/query.test.ts src/infrastructure/sqlite/hybrid.test.ts src/infrastructure/sqlite/similar.test.ts src/interfaces/mcp/memory-tools.test.ts`
Expected: FAIL (módulos `query`, `hybrid` y `similar` inexistentes; la prueba MCP nueva no recibe `similar`).

- [ ] **Step 3: Módulo de consulta**

`src/modules/search/query.ts`:

```ts
// Natural-language query planning for the level-11 hybrid search: filler words are dropped,
// the remaining terms are OR-ed, terms of four or more letters match by prefix in the word
// index and terms of three or more letters match anywhere in the trigram index.
const STOPWORDS = new Set([
  "a","al","algo","ante","antes","aqui","asi","cada","como","con","contra","cual","cuales","cuando","de","del","desde","donde",
  "el","ella","ellas","ellos","en","entre","era","eres","es","esa","esas","ese","eso","esos","esta","estaba","estan","estas",
  "este","esto","estos","fue","fueron","ha","han","hay","la","las","le","les","lo","los","mas","me","mi","mis","muy","nos",
  "nosotros","o","otra","otras","otro","otros","para","pero","por","porque","pues","que","quien","se","sea","ser","si","sin",
  "sobre","son","su","sus","te","ti","tu","tus","u","un","una","unas","uno","unos","y","ya","yo",
  "an","and","are","as","at","be","been","but","by","can","did","do","does","for","from","had","has","have","how","i","if",
  "in","into","is","it","its","me","my","of","on","or","our","so","that","the","their","them","then","there","these","they",
  "this","to","was","we","were","what","when","where","which","who","why","will","with","you","your",
]);

/** At most this many terms are sent to the indexes; the rest of a long text is ignored. */
export const MAX_QUERY_TERMS = 16;
/** A result must contain at least this many query terms (or all of them when the query has fewer). */
export const MIN_MATCHED_TERMS = 2;
/** Reciprocal rank fusion constant: a result scores 1/(RRF_K + rank) in each index that returns it. */
export const RRF_K = 60;
/** Candidates read from each index before fusion. */
export const HYBRID_CANDIDATES = 50;

export interface QueryPlan { terms: string[]; words: string | null; trigram: string | null }

function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function tokens(text: string): string[] {
  return fold(text).match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** Distinct folded words of a text without filler words; when every word is filler, all of them. */
export function termsOf(text: string): string[] {
  const all = [...new Set(tokens(text))];
  const meaningful = all.filter(term => !STOPWORDS.has(term));
  return meaningful.length > 0 ? meaningful : all;
}

export function buildQuery(text: string): QueryPlan {
  const terms = termsOf(text).slice(0, MAX_QUERY_TERMS);
  const quote = (term: string) => `"${term}"`;
  const words = terms.length === 0 ? null : terms.map(term => Array.from(term).length >= 4 ? `${quote(term)}*` : quote(term)).join(" OR ");
  // The trigram index keeps accents: search each term as folded and as written.
  const written = (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(word => terms.includes(fold(word)));
  const long = [...new Set([...terms, ...written])].filter(term => Array.from(term).length >= 3);
  return { terms, words, trigram: long.length === 0 ? null : long.map(quote).join(" OR ") };
}

/** How many query terms a text contains: by substring for three or more letters, as a whole word otherwise. */
export function matchedTerms(terms: readonly string[], text: string): number {
  const folded = fold(text), words = new Set(tokens(text));
  return terms.filter(term => Array.from(term).length >= 3 ? folded.includes(term) : words.has(term)).length;
}

/** At most this many similar memories are returned after a save. */
export const SIMILAR_LIMIT = 3;
/** Minimum share of distinct words two memories must have in common to be reported as similar. */
export const SIMILAR_MIN_SCORE = 0.25;

/** Jaccard similarity of two term sets, rounded to two decimals. */
export function similarity(left: readonly string[], right: readonly string[]): number {
  const a = new Set(left), b = new Set(right);
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const term of a) if (b.has(term)) shared += 1;
  return Math.round(shared / (a.size + b.size - shared) * 100) / 100;
}
```

`src/modules/search/index.ts` (archivo completo):

```ts
export type { MemoryPreview,PreviewResult,VersionRead,TimelineInput,TimelineRow,TimelineResult,ContextInput,ContextRow,ContextResult } from "./types";
export { searchTerms,validateSearchLimit } from "./rules";
export { buildQuery,termsOf,matchedTerms,similarity,MAX_QUERY_TERMS,MIN_MATCHED_TERMS,RRF_K,HYBRID_CANDIDATES,SIMILAR_LIMIT,SIMILAR_MIN_SCORE } from "./query";
export type { QueryPlan } from "./query";
```

`src/modules/memory/types.ts`: en `SearchExplanation`, reemplazar `mode:"fts5"|"literal";` por `mode:"fts5"|"literal"|"hybrid";`, y justo después de la línea `export interface SearchResult { memory:Memory;explanation:SearchExplanation }` agregar:

```ts
/** A memory of the same scope and owner that looks like the one just saved (level 11). */
export interface SimilarCandidate { id:string;title:string;version:number;score:number }
```

`src/modules/memory/index.ts`: en el `export type { … } from "./types";` agregar `SimilarCandidate` al final de la lista (después de `SearchExplanation`).

`src/modules/sessions/types.ts`: la primera línea pasa a `import type { MemoryVersion,SimilarCandidate } from "../memory";` y `SessionSaveResult` pasa a:

```ts
export interface SessionSaveResult {memory:MemoryVersion;sessionId:string|null;sessionSource:"explicit"|"inferred"|"manual"|null;similar?:SimilarCandidate[]}
```

`src/index.ts`: en el `export type { … } from "./modules/memory";` agregar `SimilarCandidate` al final de la lista (después de `MemoryMark`).

- [ ] **Step 4: Búsqueda híbrida y parecidos**

`src/infrastructure/sqlite/hybrid.ts`:

```ts
import type { Database } from "bun:sqlite";
import { rankingFactors,RANKING_CONTENT_WEIGHT,RANKING_TITLE_WEIGHT,RANKING_TOPIC_WEIGHT,type SearchExplanation } from "../../modules/memory";
import { buildQuery,HYBRID_CANDIDATES,matchedTerms,MIN_MATCHED_TERMS,RRF_K } from "../../modules/search";

type Selection = { sql: string; args: string[] };
type IndexRow = { id: string; bm25: number };
type CandidateRow = { id: string; title: string; content: string; topic_key: string | null; pinned: number;
  revisionCount: number; duplicateCount: number; lastSeenAt: string };
export interface HybridHit { id: string; explanation: SearchExplanation }

function indexHits(db: Database, index: "memories_words" | "memories_fts", match: string, selection: Selection): IndexRow[] {
  return db.query(`SELECT m.id AS id,bm25(${index},${RANKING_TITLE_WEIGHT},${RANKING_CONTENT_WEIGHT},${RANKING_TOPIC_WEIGHT}) AS bm25
    FROM ${index} JOIN memories m ON m.rowid=${index}.rowid
    WHERE ${index} MATCH ? AND ${selection.sql} AND m.state='active' ORDER BY bm25 ASC,m.id ASC LIMIT ?`)
    .all(match, ...selection.args, HYBRID_CANDIDATES) as IndexRow[];
}

/** Level-11 search: word and trigram indexes fused by rank, filtered by matched terms, weighted by reinforcement. */
export function hybridHits(db: Database, selection: Selection, query: string, limit: number, now = new Date().toISOString()): HybridHit[] {
  const plan = buildQuery(query);
  const fused = new Map<string, { rrf: number; bm25: number | null }>();
  const lists = [plan.words === null ? [] : indexHits(db, "memories_words", plan.words, selection),
    plan.trigram === null ? [] : indexHits(db, "memories_fts", plan.trigram, selection)];
  for (const list of lists) list.forEach((row, index) => {
    const current = fused.get(row.id) ?? { rrf: 0, bm25: null };
    fused.set(row.id, { rrf: current.rrf + 1 / (RRF_K + index + 1), bm25: current.bm25 ?? row.bm25 });
  });
  if (fused.size === 0) return [];
  const ids = [...fused.keys()];
  const rows = db.query(`SELECT m.id,m.title,m.content,m.topic_key,m.pinned,m.version-1 AS revisionCount,
      (SELECT count(*) FROM confirmations c WHERE c.memoryId=m.id) AS duplicateCount,
      max(m.updated_at,coalesce((SELECT max(c.recordedAt) FROM confirmations c WHERE c.memoryId=m.id),m.updated_at)) AS lastSeenAt
    FROM memories m WHERE m.id IN (${ids.map(() => "?").join(",")})`).all(...ids) as CandidateRow[];
  const needed = Math.min(MIN_MATCHED_TERMS, plan.terms.length);
  return rows
    .filter(row => matchedTerms(plan.terms, `${row.title}\n${row.content}\n${row.topic_key ?? ""}`) >= needed)
    .map(row => {
      const { rrf, bm25 } = fused.get(row.id)!;
      const { multiplier, ...reinforcement } = rankingFactors({ revisionCount: row.revisionCount,
        duplicateCount: row.duplicateCount, lastSeenAt: row.lastSeenAt }, row.pinned === 1, now);
      return { id: row.id, explanation: { mode: "hybrid" as const, bm25, multiplier, orderScore: -(rrf * multiplier), reinforcement } };
    })
    .sort((a, b) => a.explanation.orderScore! - b.explanation.orderScore! || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, limit);
}
```

`src/infrastructure/sqlite/similar.ts`:

```ts
import type { Database } from "bun:sqlite";
import type { MemoryScope,SimilarCandidate } from "../../modules/memory";
import { buildQuery,HYBRID_CANDIDATES,similarity,SIMILAR_LIMIT,SIMILAR_MIN_SCORE,termsOf } from "../../modules/search";

type CandidateRow = { id: string; title: string; content: string; version: number };

/** Active memories of the same scope and owner whose words look like the given text; session summaries excluded. */
export function similarTo(db: Database, input: { scope: MemoryScope; ownerColumn: "projectId" | "groupId"; ownerId: string | null;
    title: string; content: string; excludeId: string }): SimilarCandidate[] {
  const text = `${input.title}\n${input.content}`, plan = buildQuery(text);
  if (plan.words === null) return [];
  const rows = db.query(`SELECT m.id,m.title,m.content,m.version FROM memories_words JOIN memories m ON m.rowid=memories_words.rowid
    WHERE memories_words MATCH ? AND m.scope=? AND m.${input.ownerColumn} IS ? AND m.state='active' AND m.id<>?
    AND (m.topic_key IS NULL OR m.topic_key NOT GLOB 'session/*/summary')
    ORDER BY bm25(memories_words) ASC,m.id ASC LIMIT ?`)
    .all(plan.words, input.scope, input.ownerId, input.excludeId, HYBRID_CANDIDATES) as CandidateRow[];
  const mine = termsOf(text);
  return rows
    .map(row => ({ id: row.id, title: row.title, version: row.version, score: similarity(mine, termsOf(`${row.title}\n${row.content}`)) }))
    .filter(candidate => candidate.score >= SIMILAR_MIN_SCORE)
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, SIMILAR_LIMIT);
}
```

`src/infrastructure/sqlite/search.ts`:
1. Después de `import { ecosystemEnabled,getGroup,groupOfProject } from "./ecosystem-groups";` agregar `import { hybridHits } from "./hybrid";`.
2. Justo antes de `function readSearchPreviews(` agregar:

```ts
// Level 11: rank ids with the hybrid search, then read the requested projection in that order.
function hybridRows<T extends { id: string }>(db: Database, columns: string, selection: Selection, query: string, limit: number):
    { row: T; explanation: SearchResult["explanation"] }[] {
  const hits = hybridHits(db, selection, query, limit);
  if (hits.length === 0) return [];
  const rows = db.query(`SELECT ${columns} FROM memories m WHERE m.id IN (${hits.map(() => "?").join(",")})`).all(...hits.map(hit => hit.id)) as T[];
  const byId = new Map(rows.map(row => [row.id, row]));
  return hits.map(hit => ({ row: byId.get(hit.id)!, explanation: hit.explanation }));
}

```

3. En `readSearchPreviews`, justo después de la línea `const selection = searchSelection(db, projectId, scope, groupId); const parsed = searchTerms(query); validateSearchLimit(limit);` agregar:

```ts
  if (intelligenceEnabled(db)) return hybridRows<PreviewRow>(db, PREVIEW_COLUMNS, selection, query, limit)
    .map(({ row, explanation }) => ({ memory: preview(row), explanation }));
```

4. En `search`, justo después de la línea `const parsed = searchTerms(query); validateSearchLimit(limit);` agregar:

```ts
    if (intelligenceEnabled(db)) return hybridRows<Row>(db, "m.*", selection, query, limit)
      .map(({ row, explanation }) => ({ memory: memory(row), explanation }));
```

`src/infrastructure/sqlite/writes.ts`:
1. Después de `import { readMeta,upsertMeta } from "./meta";` agregar `import { similarTo } from "./similar";`.
2. Al final de `saveCore`, reemplazar `      return {memory:snapshot,sessionId:selected,sessionSource:source};` (la última, después de `applySaveMeta` con `newVersion: true`) por:

```ts
      // A brand-new memory without a topic reports up to three look-alikes so the caller can merge or supersede.
      const similar = intelligenceEnabled(db) && !existing && topic === null
        ? similarTo(db, { scope, ownerColumn, ownerId, title, content, excludeId: id }) : [];
      return {memory:snapshot,sessionId:selected,sessionSource:source,...(similar.length > 0 ? { similar } : {})};
```

`src/interfaces/mcp/memory-tools.ts` (handler de `memory_save`):
1. Rama `ecosystem`: reemplazar

```ts
      return memoryStore().saveWithSession({ ...saveInput,scope:"ecosystem",projectId:null,groupId:target.group.id },
        {mode:"assistant",...(sessionId?{sessionId,projectId:target.projectId}:{})}).memory;
```

por

```ts
      const saved = memoryStore().saveWithSession({ ...saveInput,scope:"ecosystem",projectId:null,groupId:target.group.id },
        {mode:"assistant",...(sessionId?{sessionId,projectId:target.projectId}:{})});
      return saved.similar ? {...saved.memory,similar:saved.similar} : saved.memory;
```

2. Rama `shared`: reemplazar

```ts
      return memoryStore().saveWithSession({ ...saveInput,scope:"shared",projectId:null },
        {mode:"assistant",...(sessionId?{sessionId}:{}),...(sessionProjectId?{projectId:sessionProjectId}:{})}).memory;
```

por

```ts
      const saved = memoryStore().saveWithSession({ ...saveInput,scope:"shared",projectId:null },
        {mode:"assistant",...(sessionId?{sessionId}:{}),...(sessionProjectId?{projectId:sessionProjectId}:{})});
      return saved.similar ? {...saved.memory,similar:saved.similar} : saved.memory;
```

3. Rama `project`: reemplazar

```ts
    return {...saved.memory,sessionId:saved.sessionId,sessionSource:saved.sessionSource,...(notices.length?{notices}:{})};
```

por

```ts
    return {...saved.memory,sessionId:saved.sessionId,sessionSource:saved.sessionSource,...(saved.similar?{similar:saved.similar}:{}),...(notices.length?{notices}:{})};
```

- [ ] **Step 5: Verde**

Run: `bun test src/modules/search/query.test.ts src/infrastructure/sqlite/hybrid.test.ts src/infrastructure/sqlite/similar.test.ts src/interfaces/mcp/memory-tools.test.ts`
Expected: PASS (5 + 4 + 2 + 9 = 20 pruebas).

- [ ] **Step 6: Suite completa y tipos**

Run: `bun test` y `bun run typecheck`. Expected: 636 pass / 10 skip / 0 fail; typecheck sin errores. La suite completa tarda ~30 s; si el entorno la corta, córrela por grupos **sin repetir carpetas** (`bun test src/modules`, `bun test src/infrastructure`, `bun test src/app src/interfaces src/shared src/index.test.ts`, `bun test tests scripts`).

- [ ] **Step 7: Commit**

```bash
git add src/modules/search src/modules/memory/types.ts src/modules/memory/index.ts src/modules/sessions/types.ts src/index.ts src/infrastructure/sqlite/hybrid.ts src/infrastructure/sqlite/hybrid.test.ts src/infrastructure/sqlite/similar.ts src/infrastructure/sqlite/similar.test.ts src/infrastructure/sqlite/search.ts src/infrastructure/sqlite/writes.ts src/interfaces/mcp/memory-tools.ts src/interfaces/mcp/memory-tools.test.ts tests/fixtures/search-benchmark.ts
git commit -m "feat(search): hybrid word and trigram search with look-alike candidates on save (level 11)"
```

- [ ] **Step 8: Documentación (prompt aparte, sesión nueva, commit propio)**

Borrador redactado por un subagente de contexto limpio (Sonnet, solo lectura sobre `e880c45`) y revisado por el orquestador: se corrigió una contradicción (`save` no devuelve los parecidos; los devuelven `saveWithSession` y `memory_save`), los decimales en español y la precisión sobre consultas con solo palabras de relleno. Cada dato se verificó contra el código. **Simulado sobre una copia de `e880c45`: 7 archivos, 15 inserciones y 2 borrados, `git diff --check` limpio.**

Archivos: `docs/es/04-sdk-typescript.md`, `docs/en/04-typescript-sdk.md`, `docs/es/05-arquitectura-interna-y-formulas.md`, `docs/en/05-internal-architecture-and-formulas.md`, `docs/es/06-resolucion-de-errores.md`, `docs/en/06-troubleshooting.md` y `CHANGELOG.md`. **Sin cambios:** `docs/es/03-referencia-cli.md` y `docs/en/03-cli-reference.md` (solo documentan opciones y formas de JSON, nunca el mecanismo de búsqueda) y `docs/notion-map.json` (las entradas del 06 ya tienen `"notionSyncPending": true`; 04 y 05 no tienen entrada).

1. `docs/es/04-sdk-typescript.md`: al final del archivo, después de una línea en blanco, estos dos párrafos (quedan dentro de la sección «Memoria inteligente» que ya cierra el archivo):

```markdown
Desde el esquema 11, `search`, `searchPreviews` (y sus variantes `*InGroup`) usan búsqueda híbrida: la consulta se reparte en un índice por palabras completas y otro por trigramas, se combinan por rango recíproco (RRF) y el resultado se pondera por el mismo multiplicador de refuerzo (fijado, recencia, estabilidad) que ya usaba `fts5`. Un resultado necesita al menos 2 de los términos de la consulta (todos si son menos de 2); si ninguno aplica, la búsqueda no devuelve nada en vez de ruido. `SearchExplanation.mode` gana el valor `"hybrid"`, con el mismo significado de `orderScore` (menor es mejor) que en `fts5`. Consulta el capítulo 5 para la fórmula completa.

Al guardar un recuerdo **nuevo** y **sin tema** se calculan hasta 3 parecidos activos del mismo ámbito y dueño (nunca resúmenes de sesión ni el propio recuerdo) con una similitud de palabras (Jaccard) de al menos 0,25; nunca en una versión nueva de un tema, en una confirmación de texto idéntico ni en una repetición de `requestKey`. `save` sigue devolviendo solo el recuerdo; `saveWithSession` (y `memory_save` por MCP, en los tres ámbitos) añaden `similar?: SimilarCandidate[]` solo cuando hay parecidos. Tipo nuevo exportado: `SimilarCandidate { id, title, version, score }`.
```

2. `docs/en/04-typescript-sdk.md`: al final del archivo, después de una línea en blanco:

```markdown
From schema 11, `search`, `searchPreviews` (and their `*InGroup` variants) use hybrid search: the query is split across a whole-word index and a trigram index, the two are combined by reciprocal rank fusion, and the result is weighted by the same reinforcement multiplier (pinned, recency, stability) that `fts5` already used. A result needs at least 2 of the query terms (all of them when there are fewer than 2); when none apply, the search returns nothing instead of noise. `SearchExplanation.mode` gains the value `"hybrid"`, with the same meaning for `orderScore` (lower is better) as in `fts5`. See chapter 5 for the full formula.

When a **new** memory **without a topic** is saved, up to 3 active look-alikes are computed of the same scope and owner (never session summaries or the memory itself) with a word similarity (Jaccard) of at least 0.25; never on a new version of a topic, on an identical-text confirmation, or on a `requestKey` replay. `save` still returns only the memory; `saveWithSession` (and MCP's `memory_save`, in all three scopes) add `similar?: SimilarCandidate[]` only when there are look-alikes. New exported type: `SimilarCandidate { id, title, version, score }`.
```

3. `docs/es/05-arquitectura-interna-y-formulas.md`: párrafo nuevo justo antes de la línea que empieza con `La sincronización PostgreSQL transfiere un snapshot versionado del estado local.`, separado de ella por una línea en blanco:

```markdown
La búsqueda híbrida del esquema 11 arma la consulta quitando palabras vacías (español e inglés), pliega acentos y mayúsculas y une los términos restantes con OR (máximo 16); si todas las palabras son vacías se usan todas. En el índice de palabras los términos de 4 o más letras buscan por prefijo; en el de trigramas los de 3 o más letras buscan en cualquier posición, tanto con acento como sin él. Cada índice aporta hasta 50 candidatos; se combinan por rango recíproco (RRF: `1/(60+rango)` en cada lista donde aparece) y el resultado se multiplica por el mismo multiplicador de refuerzo que usa `fts5` (fijado, recencia, estabilidad): `orderScore = -(rrf × multiplicador)`, menor es mejor. Un resultado se descarta si no contiene al menos 2 de los términos de la consulta (todos si hay menos de 2), por subcadena si el término tiene 3 letras o más y como palabra completa si es más corto; una consulta sin ninguna palabra (solo signos) no devuelve nada. Al guardar un recuerdo nuevo sin tema se calcula además similitud de Jaccard sobre las palabras distintas (sin vacías ni acentos) contra los demás recuerdos activos del mismo ámbito y dueño; a partir de 0,25 se reporta como parecido (hasta 3, consulta el capítulo 4).
```

4. `docs/en/05-internal-architecture-and-formulas.md`: párrafo nuevo justo antes de la línea que empieza con `PostgreSQL synchronization transfers a versioned snapshot of local state.`, separado de ella por una línea en blanco:

```markdown
The schema-11 hybrid search builds the query by dropping filler words (Spanish and English), folding accents and case, and joining the remaining terms with OR (16 at most); when every word is filler, all of them are used. In the word index, terms of 4 or more letters match by prefix; in the trigram index, terms of 3 or more letters match anywhere, both as written and with accents folded. Each index contributes up to 50 candidates; they are fused by reciprocal rank fusion (`1/(60+rank)` in each list where a result appears) and the result is multiplied by the same reinforcement multiplier `fts5` already uses (pinned, recency, stability): `orderScore = -(rrf × multiplier)`, lower is better. A result is dropped unless it contains at least 2 of the query terms (all of them when there are fewer than 2), matched by substring for terms of 3 or more letters and as a whole word otherwise; a query with no words at all (only punctuation) returns nothing. Saving a new memory without a topic also computes Jaccard similarity over distinct words (filler and accents removed) against the other active memories of the same scope and owner; a score of 0.25 or higher is reported as a look-alike (up to 3; see chapter 4).
```

5. `docs/es/06-resolucion-de-errores.md`: reemplazar la línea completa que empieza con `La búsqueda es coincidencia literal FTS5.` (sección «Búsqueda y temas») por:

```markdown
Por debajo del esquema 11, la búsqueda es coincidencia literal FTS5 (sin cambios). Desde el esquema 11 (memoria inteligente) es híbrida: reparte la consulta entre palabras completas y trigramas, combina por rango recíproco (RRF) y pondera por el multiplicador de refuerzo; un resultado necesita al menos 2 de los términos de la consulta y una consulta sin términos útiles no devuelve nada (consulta el capítulo 5). Proporciona un `projectId` para búsquedas de proyecto o usa `--scope shared`. Actualizar un tema requiere su `--expected-version` actual; consulta antes `get` o `history`.
```

6. `docs/en/06-troubleshooting.md`: reemplazar la línea completa que empieza con `Search is literal FTS5 matching.` (sección «Search and topics») por:

```markdown
Below schema 11, search is literal FTS5 matching (unchanged). From schema 11 (memory intelligence) it is hybrid: it splits the query across whole words and trigrams, fuses the results by reciprocal rank fusion, and weights them by the reinforcement multiplier; a result needs at least 2 of the query terms, and a query with no usable terms returns nothing (see chapter 5). Provide a `projectId` for project searches, or use `--scope shared`. Updating a topic needs its current `--expected-version`; use `get` or `history` first.
```

7. `CHANGELOG.md`: línea nueva justo antes de `- La replicación de grupos (formato 4) pasa a la versión 1.8.0.`:

```markdown
- **Búsqueda híbrida y parecidos al guardar:** con el esquema 11, `search` y `searchPreviews` (CLI, SDK y `memory_search`) reparten la consulta entre un índice de palabras completas y uno de trigramas, los combinan por rango recíproco (RRF) y ponderan el resultado con el multiplicador de refuerzo existente (`SearchExplanation.mode` gana `"hybrid"`); un resultado necesita al menos 2 de los términos de la consulta y una consulta sin términos útiles no devuelve nada. Guardar un recuerdo nuevo sin tema reporta hasta 3 parecidos activos del mismo ámbito y dueño (similitud de palabras ≥ 0,25, nunca resúmenes de sesión); `saveWithSession` y `memory_save` (en los tres ámbitos) añaden `similar` solo cuando hay parecidos. Tipo nuevo del SDK: `SimilarCandidate`. Medido: el banco de 20 preguntas en lenguaje natural (`tests/fixtures/search-benchmark.ts`) pasa de 8/20 a 20/20 encontradas entre los 3 primeros resultados; mediana de 1,6 ms por búsqueda en una base de 107 recuerdos.
```

Verificación: `git diff --check` sin salida y `git diff --stat` con exactamente esos 7 archivos (15 inserciones, 2 borrados). La documentación no cambia pruebas; el orquestador corre la suite en su copia.

Commit:

```bash
git add docs/es/04-sdk-typescript.md docs/en/04-typescript-sdk.md docs/es/05-arquitectura-interna-y-formulas.md docs/en/05-internal-architecture-and-formulas.md docs/es/06-resolucion-de-errores.md docs/en/06-troubleshooting.md CHANGELOG.md
git commit -m "docs: hybrid search and look-alike candidates in SDK, architecture, troubleshooting and changelog"
```

### Task 5: Sesiones interrumpidas

**Experimento:** Claude Code · Sonnet 5 · **medium**, plan con código completo probado en laboratorio (como T3; variable: medium contra el high de T3). Variable nueva del orquestador: el laboratorio lo construyó un **subagente de contexto limpio (Sonnet)** a partir del diseño fijado por el orquestador (decisiones, contratos y pruebas exigidas); el orquestador revisó el diff completo línea por línea y después otro subagente limpio aplicó este texto tal cual sobre otra copia para probar que el plan es literal. Hipótesis: baja el costo del orquestador sin subir las rondas.

**Medición del orquestador (2026-09-24, laboratorio sobre `d478c0f`, nunca en el repositorio):**
- Subagente de laboratorio (Sonnet, contexto limpio): 247 955 tokens, 107 llamadas a herramientas, 19,7 min, TDD rojo → verde. Revisión del orquestador: 1 corrección (en `startProjectSessionWithNotices` la consulta del vínculo de carpeta se condiciona al nivel 11, porque `projectForDirectory` exige el nivel 5 y una base más vieja habría cambiado de error), 0 desviaciones del diseño.
- Suite completa en el laboratorio: **642 pass / 10 skip / 0 fail** (+6 pruebas, +1 archivo), typecheck 0, `git diff --check` limpio.
- Segundo laboratorio (otro subagente limpio aplicó este texto tal cual sobre otra copia de `d478c0f`, como lo hará la sesión de Engram): todas las anclas únicas, rojo (3 fallos + 1 error) → verde 13/13 en el paso 7, 642 / 10 / 0, typecheck 0, 16 archivos en el commit, **0 discrepancias** con el plan.
- Evidencia viva del problema que resuelve: al guardar el traspaso del orquestador, Engram respondió `AMBIGUOUS_SESSION` porque tres sesiones viejas de `forge614-ai` (21, 22 y 24 de septiembre) seguían abiertas.

**Decisiones de esta tarea:**
- **D-T5-1:** todo bajo **nivel 11** (`intelligenceEnabled(db)`). En niveles menores nada cambia: no se escribe `session_activity`, `inferredSessions` conserva su consulta de 7 días byte-idéntica, `previousInterrupted` devuelve `null`, `touchSession` no hace nada (la tabla no existe) y `startProjectSessionWithNotices` no hace ninguna consulta nueva.
- **D-T5-2 (cambia el contrato del esqueleto, con aviso):** "interrumpida" es una **marca, no un cierre**: `sessions.endedAt` sigue en `NULL`. Al **crear** una sesión runtime, las demás abiertas del mismo proyecto (`kind='runtime' AND endedAt IS NULL`; otros proyectos y la sesión manual no se tocan) reciben `session_activity.interruptedAt = <instante del arranque>`; una marca anterior se conserva; repetir el arranque de una sesión abierta no marca a nadie. El esqueleto decía `endedAt + interruptedAt`: cerrar rompería una sesión que sigue viva en otra ventana del mismo repositorio (dos sesiones de Claude Code sobre `forge614-ai` a la vez, como la anterior y la actual del orquestador): sus guardados fallarían con `SESSION_CLOSED`, nunca podría guardar su resumen y la réplica fusiona sesiones por `endedAt`. Con la marca, una sesión interrumpida que sigue trabajando se revive sola con su siguiente guardado y puede cerrar bien.
- **D-T5-3:** actividad = `touchSession(db, sessionId, at)`: upsert de `session_activity` con `lastActivityAt = at` e `interruptedAt = NULL` (la actividad borra la marca). Se llama al arrancar o repetir el arranque de una sesión runtime (el mismo instante que `startedAt`, capturado una sola vez), al registrar en `saveCore` una entrada o una confirmación con sesión runtime (explícita o inferida; nunca la sesión manual) y al cerrar (con el instante de `endedAt`). Las repeticiones por `requestKey` no tocan.
- **D-T5-4:** `INACTIVITY_HOURS = 6` en `modules/sessions/rules.ts` (se exporta por `modules/sessions`; no por `src/index.ts`, cuya lista `RUNTIME_EXPORTS` no cambia). Última actividad efectiva de una sesión = `coalesce(session_activity.lastActivityAt, max(session_entries.recordedAt), sessions.startedAt)` (las sesiones anteriores al nivel 11 no tienen fila de actividad).
- **D-T5-5:** `previousInterrupted(db, projectId, now?)`: entre las sesiones runtime abiertas del proyecto, las **marcadas** o con última actividad anterior a `now − 6 h`; se devuelve la de actividad más reciente (empate: `sessionId` ascendente); `interruptedAt` = la marca o, si no la hay, última actividad + 6 h; `summary` = la versión apuntada por `session_summaries` (desde `memory_versions.snapshot`) o `null`.
- **D-T5-6:** inferencia en nivel 11: `inferredSessions` excluye las sesiones marcadas y exige actividad en las últimas 6 h (la ventana de 6 h sustituye a la de 7 días **solo** en nivel 11). Es lo que evita `AMBIGUOUS_SESSION` por sesiones viejas que quedaron abiertas.
- **D-T5-7:** `memory_session_start` (MCP) y `session-start` (CLI) devuelven `previous` (`PreviousSession`) solo cuando la sesión se **crea** en esa llamada, nunca en una repetición tras compactar; es el canal para clientes sin gancho de arranque. El bloque de arranque (T6) usará `previousInterrupted` para el caso de > 6 h sin necesidad de un arranque previo. Qué hace la IA con `previous` lo define el protocolo v4 (T7).
- **D-T5-8:** sin cambios en `Session`, en la réplica (`session_activity` queda fuera de los formatos 1–3; formato 4 en 1.8.0), en `toolSchemas` ni en las descripciones MCP.

**Files:**
- Create: `src/infrastructure/sqlite/activity.ts` (+ `activity.test.ts`)
- Modify: `src/modules/sessions/rules.ts`, `src/modules/sessions/types.ts`, `src/modules/sessions/index.ts`, `src/index.ts`
- Modify: `src/infrastructure/sqlite/sessions.ts`, `src/infrastructure/sqlite/writes.ts`
- Modify: `src/app/memory-store.ts`, `src/app/project-context.ts`, `src/app/project-context.test.ts`
- Modify: `src/interfaces/mcp/sessions-tools.ts`, `src/interfaces/mcp/sessions-tools.test.ts`, `src/interfaces/cli/commands.ts`
- Modify (guardas del contrato público): `src/index.test.ts`, `tests/fixtures/sdk-contract.ts`

**Interfaces:**
- Consumes: `intelligenceEnabled(db)` y la tabla `session_activity` (T1), `session_summaries` y `memory_versions` (nivel 6+), `projectIdentity` de `modules/projects`.
- Produces:
  ```ts
  // src/modules/sessions/rules.ts
  export const INACTIVITY_HOURS = 6;
  // src/modules/sessions/types.ts
  export interface PreviousSession {sessionId:string;interruptedAt:string;summary:MemoryVersion|null}
  // src/infrastructure/sqlite/activity.ts
  export function touchSession(db, sessionId: string, at: string): void;
  export function interruptOtherSessions(db, projectId: string, sessionId: string, at: string): void;
  export function inactivityThreshold(now: string): string;
  export function previousInterrupted(db, projectId: string, now?: string): PreviousSession | null;
  // src/app/memory-store.ts
  previousInterrupted(projectId: string): PreviousSession | null;
  // src/app/project-context.ts
  startProjectSessionWithNotices(...): { session: Session; notices: IdentityNotice[]; previous?: PreviousSession };
  // memory_session_start (MCP) y session-start (CLI): { ...session, previous?, notices? }
  ```

- [ ] **Step 1: Pruebas que fallan**

`src/infrastructure/sqlite/activity.test.ts`:

```ts
import { expect, setSystemTime, test } from "bun:test";
import { withDatabase } from "../__test-support__/fixtures";
import { createProject } from "./projects";
import { inferredSessions, manualSession } from "./sessions";
import { enableIntelligence, enableSearchReinforcement } from "./schema";
import { endSession, saveSessionSummary, saveWithSession, startSession } from "./writes";
import { previousInterrupted, touchSession } from "./activity";

test("below intelligence level, touchSession is inert, previousInterrupted is null and inference keeps the seven-day window", () => withDatabase(db => {
  enableSearchReinforcement(db);
  const p = createProject(db, "Pre11");
  startSession(db, p.projectId, "old", "/dir");
  expect(() => touchSession(db, "old", new Date().toISOString())).not.toThrow();
  expect(previousInterrupted(db, p.projectId)).toBeNull();
  db.query("UPDATE sessions SET startedAt=? WHERE sessionId='old'").run(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString());
  expect(inferredSessions(db, p.projectId, "/dir", new Date().toISOString())).toEqual(["old"]);
}));

test("starting a new runtime session marks every other open runtime session of the project, never itself", () => withDatabase(db => {
  enableIntelligence(db);
  const p = createProject(db, "P"), other = createProject(db, "Other");
  setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  try {
    // An already-ended session and another project's session are set up first so their own starts
    // (which would otherwise mark A and B too) happen before A and B even exist.
    startSession(db, p.projectId, "E");
    endSession(db, p.projectId, "E");
    startSession(db, other.projectId, "X", "/x");
    const manualId = manualSession(db, p.projectId, new Date().toISOString());
    startSession(db, p.projectId, "A", "/a");
    startSession(db, p.projectId, "B", "/b"); // marks A; the summary save below clears that mark again
    const summary = saveSessionSummary(db, p.projectId, "A",
      { goal: "g", instructions: "", discoveries: "", accomplishments: "", nextSteps: "", files: [] }, { requestKey: "r" });
    setSystemTime(new Date("2026-01-01T01:00:00.000Z"));
    startSession(db, p.projectId, "C", "/c");
    const cStart = "2026-01-01T01:00:00.000Z";
    expect(db.query("SELECT sessionId,interruptedAt FROM session_activity WHERE sessionId IN ('A','B') ORDER BY sessionId").all())
      .toEqual([{ sessionId: "A", interruptedAt: cStart }, { sessionId: "B", interruptedAt: cStart }]);
    expect(db.query("SELECT sessionId,interruptedAt FROM session_activity WHERE sessionId IN ('C','E','X') ORDER BY sessionId").all())
      .toEqual([{ sessionId: "C", interruptedAt: null }, { sessionId: "E", interruptedAt: null }, { sessionId: "X", interruptedAt: null }]);
    expect(db.query("SELECT count(*) AS n FROM session_activity WHERE sessionId=?").get(manualId)).toEqual({ n: 0 });
    expect(previousInterrupted(db, p.projectId)).toEqual({ sessionId: "A", interruptedAt: cStart, summary: summary.memory });
    startSession(db, p.projectId, "C", "/c"); // replay: marks nobody
    expect(db.query("SELECT sessionId,interruptedAt FROM session_activity WHERE sessionId IN ('A','B') ORDER BY sessionId").all())
      .toEqual([{ sessionId: "A", interruptedAt: cStart }, { sessionId: "B", interruptedAt: cStart }]);
    setSystemTime(new Date("2026-01-01T02:00:00.000Z"));
    startSession(db, p.projectId, "D", "/d");
    expect(db.query("SELECT interruptedAt FROM session_activity WHERE sessionId='A'").get()).toEqual({ interruptedAt: cStart });
  } finally { setSystemTime(); }
}));

test("a session idle past the inactivity window is reported and any activity clears the mark", () => withDatabase(db => {
  enableIntelligence(db);
  const p = createProject(db, "P");
  setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  try {
    startSession(db, p.projectId, "S", "/s");
    expect(previousInterrupted(db, p.projectId, "2026-01-01T05:00:00.000Z")).toBeNull();
    expect(previousInterrupted(db, p.projectId, "2026-01-01T06:01:00.000Z"))
      .toEqual({ sessionId: "S", interruptedAt: "2026-01-01T06:00:00.000Z", summary: null });
    setSystemTime(new Date("2026-01-01T05:00:00.000Z"));
    saveWithSession(db, { projectId: p.projectId, title: "Note", content: "Body", type: "fact" }, { sessionId: "S" });
    expect(previousInterrupted(db, p.projectId, "2026-01-01T06:01:00.000Z")).toBeNull();
    setSystemTime(new Date("2026-01-01T05:30:00.000Z"));
    startSession(db, p.projectId, "other", "/o");
    expect(db.query("SELECT interruptedAt FROM session_activity WHERE sessionId='S'").get())
      .toEqual({ interruptedAt: "2026-01-01T05:30:00.000Z" });
    setSystemTime(new Date("2026-01-01T05:45:00.000Z"));
    saveWithSession(db, { projectId: p.projectId, title: "Note2", content: "Body2", type: "fact" }, { sessionId: "S" });
    expect(db.query("SELECT interruptedAt FROM session_activity WHERE sessionId='S'").get()).toEqual({ interruptedAt: null });
    setSystemTime(new Date("2026-01-01T06:00:00.000Z"));
    startSession(db, p.projectId, "other2", "/o2");
    expect(db.query("SELECT interruptedAt FROM session_activity WHERE sessionId='S'").get())
      .toEqual({ interruptedAt: "2026-01-01T06:00:00.000Z" });
    const ended = endSession(db, p.projectId, "S");
    expect(ended.endedAt).not.toBeNull();
    expect(db.query("SELECT interruptedAt FROM session_activity WHERE sessionId='S'").get()).toEqual({ interruptedAt: null });
    expect(previousInterrupted(db, p.projectId, "2026-06-01T00:00:00.000Z")?.sessionId).not.toBe("S");
  } finally { setSystemTime(); }
}));

test("inference at level 11 excludes marked and stale sessions; manual sessions stay untouched", () => withDatabase(db => {
  enableIntelligence(db);
  const marked = createProject(db, "Marked"), idle = createProject(db, "Idle");
  setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  try {
    startSession(db, marked.projectId, "old", "/dir");
    setSystemTime(new Date("2026-01-01T01:00:00.000Z"));
    startSession(db, marked.projectId, "new", "/dir");
    expect(inferredSessions(db, marked.projectId, "/dir", "2026-01-01T01:00:00.000Z")).toEqual(["new"]);
    startSession(db, idle.projectId, "fresh", "/dir");
    expect(inferredSessions(db, idle.projectId, "/dir", "2026-01-01T06:59:00.000Z")).toEqual(["fresh"]);
    expect(inferredSessions(db, idle.projectId, "/dir", "2026-01-01T07:01:00.000Z")).toEqual([]);
    manualSession(db, marked.projectId, new Date().toISOString());
    expect(db.query("SELECT count(*) AS n FROM session_activity").get()).toEqual({ n: 3 });
  } finally { setSystemTime(); }
}));
```

`src/app/project-context.test.ts`: reemplazar la línea `import { bindProjectContext, resolveProjectContext, saveProjectMemoryWithSession, startProjectSession } from "./project-context";` por:

```ts
import { bindProjectContext, resolveProjectContext, saveProjectMemoryWithSession, startProjectSession, startProjectSessionWithNotices } from "./project-context";
```

y agregar al final del archivo:

```ts
test("a new session reports the project's previously interrupted session only once intelligence is enabled", () => {
  const directory = mkdtempSync(join(tmpdir(),"engram-context-previous-"));
  const store = new MemoryStore(":memory:");
  try {
    store.enableSessions();
    const first = startProjectSessionWithNotices(store,directory,"first");
    expect(first).not.toHaveProperty("previous");
    store.enableIntelligence();
    const second = startProjectSessionWithNotices(store,directory,"second");
    expect(second.previous).toEqual({sessionId:"first",interruptedAt:expect.any(String),summary:null});
    const replay = startProjectSessionWithNotices(store,directory,"second");
    expect(replay).not.toHaveProperty("previous");
  } finally { store.close(); rmSync(directory,{recursive:true,force:true}); }
});
```

`src/interfaces/mcp/sessions-tools.test.ts`: agregar esta prueba (seguida de una línea en blanco) justo antes de la línea `const both = (context: Parameters<typeof registerMemoryTools>[0]) => { registerMemoryTools(context); registerSessionTools(context); };`:

```ts
test("memory_session_start reports the previous interrupted session once intelligence is enabled, but not on replay", async () => {
  const h=await sdkHarness(registerSessionTools);
  try {
    h.store.enableIntelligence();
    await h.call("memory_session_start",{sessionId:"first"});
    const second=await h.call("memory_session_start",{sessionId:"second"});
    expect(second.data.previous).toMatchObject({sessionId:"first"});
    const replay=await h.call("memory_session_start",{sessionId:"second"});
    expect(replay.data).not.toHaveProperty("previous");
  } finally {await h.close();}
});
```

- [ ] **Step 2: Rojo**

Run: `bun test src/infrastructure/sqlite/activity.test.ts src/app/project-context.test.ts src/interfaces/mcp/sessions-tools.test.ts`
Expected: FAIL (módulo `activity` inexistente; `startProjectSessionWithNotices` y `memory_session_start` no devuelven `previous`).

- [ ] **Step 3: Módulo de sesiones**

`src/modules/sessions/rules.ts`: justo después de la línea `import type { SummaryFields } from "./types";` agregar:

```ts
// Hours of inactivity before an open runtime session counts as interrupted (T5, level 11).
export const INACTIVITY_HOURS = 6;
```

`src/modules/sessions/types.ts`: agregar al final del archivo:

```ts
export interface PreviousSession {sessionId:string;interruptedAt:string;summary:MemoryVersion|null}
```

`src/modules/sessions/index.ts` (archivo completo):

```ts
export type { Session,SessionEntry,SessionSummary,SessionSaveOptions,SessionSaveResult,SummaryFields,PreviousSession } from "./types";
export { sessionIdentity,summaryContent,INACTIVITY_HOURS } from "./rules";
```

`src/index.ts`: reemplazar la línea `export type { Session,SessionEntry,SessionSummary,SessionSaveOptions,SessionSaveResult,SummaryFields } from "./modules/sessions";` por:

```ts
export type { Session,SessionEntry,SessionSummary,SessionSaveOptions,SessionSaveResult,SummaryFields,PreviousSession } from "./modules/sessions";
```

- [ ] **Step 4: Actividad de sesión**

`src/infrastructure/sqlite/activity.ts`:

```ts
import type { Database } from "bun:sqlite";
import type { MemoryVersion } from "../../modules/memory";
import { projectIdentity } from "../../modules/projects";
import { INACTIVITY_HOURS, type PreviousSession } from "../../modules/sessions";
import { intelligenceEnabled } from "./intelligence";

/** Records session activity and clears any interruption mark; a no-op before intelligence is enabled. */
export function touchSession(db: Database, sessionId: string, at: string): void {
  if (!intelligenceEnabled(db)) return;
  db.query(`INSERT INTO session_activity(sessionId,lastActivityAt,interruptedAt) VALUES(?,?,NULL)
    ON CONFLICT(sessionId) DO UPDATE SET lastActivityAt=excluded.lastActivityAt,interruptedAt=NULL`)
    .run(sessionId, at);
}

/** Marks every other open runtime session of the project as interrupted at `at`, keeping any earlier mark. */
export function interruptOtherSessions(db: Database, projectId: string, sessionId: string, at: string): void {
  if (!intelligenceEnabled(db)) return;
  db.query(`INSERT INTO session_activity(sessionId,lastActivityAt,interruptedAt)
    SELECT s.sessionId,
      coalesce(sa.lastActivityAt,(SELECT max(e.recordedAt) FROM session_entries e WHERE e.sessionId=s.sessionId),s.startedAt),
      ?
    FROM sessions s LEFT JOIN session_activity sa ON sa.sessionId=s.sessionId
    WHERE s.projectId=? AND s.kind='runtime' AND s.endedAt IS NULL AND s.sessionId<>?
    ON CONFLICT(sessionId) DO UPDATE SET interruptedAt=excluded.interruptedAt WHERE interruptedAt IS NULL`)
    .run(at, projectId, sessionId);
}

/** now minus INACTIVITY_HOURS, ISO. */
export function inactivityThreshold(now: string): string {
  return new Date(Date.parse(now) - INACTIVITY_HOURS * 60 * 60 * 1000).toISOString();
}

/** The project's most recently active marked-or-idle open runtime session, or null; null below level 11. */
export function previousInterrupted(db: Database, projectId: string, now: string = new Date().toISOString()): PreviousSession | null {
  const project = projectIdentity(projectId);
  if (!intelligenceEnabled(db)) return null;
  const threshold = inactivityThreshold(now);
  const row = db.query(`SELECT s.sessionId AS sessionId,
      coalesce(sa.lastActivityAt,(SELECT max(e.recordedAt) FROM session_entries e WHERE e.sessionId=s.sessionId),s.startedAt) AS lastActivity,
      sa.interruptedAt AS interruptedAt
    FROM sessions s LEFT JOIN session_activity sa ON sa.sessionId=s.sessionId
    WHERE s.projectId=? AND s.kind='runtime' AND s.endedAt IS NULL
      AND (sa.interruptedAt IS NOT NULL OR
        coalesce(sa.lastActivityAt,(SELECT max(e.recordedAt) FROM session_entries e WHERE e.sessionId=s.sessionId),s.startedAt) < ?)
    ORDER BY lastActivity DESC,s.sessionId ASC LIMIT 1`).get(project, threshold) as
    { sessionId: string; lastActivity: string; interruptedAt: string | null } | null;
  if (!row) return null;
  const interruptedAt = row.interruptedAt ?? new Date(Date.parse(row.lastActivity) + INACTIVITY_HOURS * 60 * 60 * 1000).toISOString();
  const pointer = db.query("SELECT memoryId,version FROM session_summaries WHERE sessionId=?").get(row.sessionId) as
    { memoryId: string; version: number } | null;
  const summary = pointer === null ? null : (JSON.parse((db.query("SELECT snapshot FROM memory_versions WHERE memory_id=? AND version=?")
    .get(pointer.memoryId, pointer.version) as { snapshot: string }).snapshot) as MemoryVersion);
  return { sessionId: row.sessionId, interruptedAt, summary };
}
```

- [ ] **Step 5: Arranque, cierre, inferencia y guardados**

`src/infrastructure/sqlite/sessions.ts`:
1. Justo después de la línea `import { MemoryError } from "../../shared/errors";` agregar:

```ts
import { inactivityThreshold,interruptOtherSessions,touchSession } from "./activity";
import { intelligenceEnabled } from "./intelligence";
```

2. Reemplazar la función `startRuntimeSession` completa (desde `export function startRuntimeSession(` hasta su `}` de cierre; el comentario de dos líneas que la precede no cambia) por:

```ts
export function startRuntimeSession(db: Database, projectId: string, sessionId: string, runtimeDirectory?: string): Session {
  const at = new Date().toISOString();
  const existing = sessionRow(db, sessionId);
  let created = false;
  if (existing) {
    if (existing.projectId !== projectId || existing.kind !== "runtime" || existing.endedAt !== null) {
      throw new MemoryError("SESSION_CONFLICT", "El identificador de sesión no está disponible.");
    }
  } else {
    const project = db.query("SELECT 1 FROM projects WHERE projectId=?").get(projectId);
    if (!project) throw new MemoryError("PROJECT_NOT_FOUND", "Proyecto no encontrado en esta base.");
    db.query("INSERT INTO sessions(sessionId,projectId,kind,startedAt,endedAt) VALUES(?,?,'runtime',?,NULL)")
      .run(sessionId, projectId, at);
    created = true;
  }
  if (runtimeDirectory !== undefined) {
    db.query("INSERT OR IGNORE INTO local_session_bindings(sessionId,directory) VALUES(?,?)")
      .run(sessionId, runtimeDirectory);
  }
  // A brand-new runtime session interrupts every other open runtime session of the project; a replay never does.
  touchSession(db, sessionId, at);
  if (created) interruptOtherSessions(db, projectId, sessionId, at);
  return sessionRow(db, sessionId)!;
}
```

3. En `endRuntimeSession`, reemplazar

```ts
  if (existing.endedAt === null) {
    db.query("UPDATE sessions SET endedAt=? WHERE sessionId=? AND endedAt IS NULL")
      .run(new Date().toISOString(), sessionId);
  }
```

por

```ts
  if (existing.endedAt === null) {
    const at = new Date().toISOString();
    db.query("UPDATE sessions SET endedAt=? WHERE sessionId=? AND endedAt IS NULL")
      .run(at, sessionId);
    touchSession(db, sessionId, at);
  }
```

4. En `inferredSessions`, justo después de la línea `export function inferredSessions(db: Database, projectId: string, directory: string, requestNow: string): string[] {` agregar (la consulta de 7 días que sigue queda intacta):

```ts
    // At level 11 a stale or explicitly interrupted session must never be silently inferred: the six-hour
    // activity window (session_activity) replaces the plain seven-day window used below that level.
    if (intelligenceEnabled(db)) {
      const threshold = inactivityThreshold(requestNow);
      return (db.query(`SELECT s.sessionId FROM sessions s LEFT JOIN session_activity sa ON sa.sessionId=s.sessionId
        WHERE s.projectId=? AND s.kind='runtime' AND s.endedAt IS NULL
        AND EXISTS (SELECT 1 FROM local_session_bindings b WHERE b.sessionId=s.sessionId AND b.directory=?)
        AND sa.interruptedAt IS NULL
        AND coalesce(sa.lastActivityAt,(SELECT max(e.recordedAt) FROM session_entries e WHERE e.sessionId=s.sessionId),s.startedAt) >= ?
        ORDER BY s.sessionId`).all(projectId,directory,threshold) as {sessionId:string}[]).map(row=>row.sessionId);
    }
```

`src/infrastructure/sqlite/writes.ts`:
1. Justo después de la línea `import { MemoryError } from "../../shared/errors";` agregar `import { touchSession } from "./activity";`.
2. En `saveCore` (rama de confirmación), justo después de las dos líneas

```ts
          db.query("INSERT INTO confirmations(confirmationId,memoryId,version,recordedAt,sessionId) VALUES(?,?,?,?,?)")
            .run(confirmationId,confirmed.id,confirmed.version,now,selected);
```

agregar:

```ts
          if (selected !== null && source !== "manual") touchSession(db, selected, now);
```

3. En `saveCore` (versión nueva), justo después de las dos líneas

```ts
      if (selected !== null) db.query("INSERT INTO session_entries(sessionId,memoryId,version,recordedAt) VALUES(?,?,?,?)")
        .run(selected,id,version,now);
```

agregar:

```ts
      if (selected !== null && source !== "manual") touchSession(db, selected, now);
```

- [ ] **Step 6: Fachada, app, interfaces y guardas del contrato**

`src/app/memory-store.ts`:
1. Como primera línea del archivo (antes de `import { closeDatabase,defaultDatabasePath,openDatabase } from "../infrastructure/sqlite/connection";`) agregar `import { previousInterrupted } from "../infrastructure/sqlite/activity";`.
2. Reemplazar `import { type Session,type SessionSaveOptions,type SessionSaveResult,type SummaryFields } from "../modules/sessions";` por `import { type PreviousSession,type Session,type SessionSaveOptions,type SessionSaveResult,type SummaryFields } from "../modules/sessions";`.
3. Justo después de la línea `  enableIntelligence(): IntelligenceEnrolment { return enableIntelligence(this.db); }` agregar:

```ts
  previousInterrupted(projectId: string): PreviousSession | null { return previousInterrupted(this.db, projectId); }
```

`src/app/project-context.ts`:
1. Reemplazar `import type { Session, SessionSaveOptions, SessionSaveResult } from "../modules/sessions";` por `import type { PreviousSession, Session, SessionSaveOptions, SessionSaveResult } from "../modules/sessions";`.
2. Reemplazar la función `startProjectSessionWithNotices` completa (desde la línea `/** Like startProjectSession, also reporting the identity notices (for example the file just written). */` hasta el `}` de cierre que precede a `export function startProjectSession(`) por:

```ts
/** Like startProjectSession, also reporting the identity notices (for example the file just written) and,
 * for a session created by this call, the project's previously interrupted session (if any). */
export function startProjectSessionWithNotices(store: MemoryStore, directory: string, sessionId: string): { session: Session; notices: IdentityNotice[]; previous?: PreviousSession } {
  const canonical = canonicalProject(directory);
  const runtimeDirectory = runtimeProjectDirectory(directory,canonical);
  const root = identityRoot(directory, canonical);
  const identity = applyIdentityFile(store, canonical.directory, root);
  const notices = [...identity.notices];
  // Level 11 only: whether this id already names a session, read before starting (a replay never reports `previous`).
  const known = store.intelligenceEnabled() ? (identity.projectId ?? store.projectForDirectory(canonical.directory)?.projectId ?? null) : null;
  const existed = known !== null && store.getSession(known, sessionId) !== null;
  const session = store.startSessionForProjectDirectory(canonical.directory,canonical.name,runtimeDirectory,sessionId,bindingAvailable);
  const project = store.getProject(session.projectId);
  if (project) notices.push(...publishIdentity(store, project, root, true));
  const previous = store.intelligenceEnabled() && !existed ? store.previousInterrupted(session.projectId) : null;
  return { session, notices, ...(previous ? { previous } : {}) };
}
```

`src/interfaces/mcp/sessions-tools.ts`: reemplazar `    return started.notices.length ? {...started.session,notices:started.notices} : started.session;` por:

```ts
    return {...started.session,...(started.previous?{previous:started.previous}:{}),...(started.notices.length?{notices:started.notices}:{})};
```

`src/interfaces/cli/commands.ts`: reemplazar la línea completa que empieza con `    const store=workspace.open();try{const started=startProjectSessionWithNotices(store,need("directory"),need("session-id"));` (la única del comando `session-start`) por:

```ts
    const store=workspace.open();try{const started=startProjectSessionWithNotices(store,need("directory"),need("session-id"));console.log(JSON.stringify({...started.session,...(started.previous?{previous:started.previous}:{}),...(started.notices.length?{notices:started.notices}:{})},null,2));}finally{store.close();}return;
```

`src/index.test.ts`: reemplazar `const INTELLIGENCE_STORE_METHODS = ["enableIntelligence", "intelligenceEnabled"];` por:

```ts
const INTELLIGENCE_STORE_METHODS = ["enableIntelligence", "intelligenceEnabled", "previousInterrupted"];
```

`tests/fixtures/sdk-contract.ts`:
1. En el bloque `import type {` inicial, justo después de la línea `  WorkspaceSettings, MemoryStore, Group, GroupSummary, IdentityEvent, MembershipSource, ProjectGroup,` agregar la línea `  PreviousSession,`.
2. Reemplazar `  intelligenceEnabled():boolean;enableIntelligence():{readonly migrated:boolean;readonly backup:string|null};` por:

```ts
  intelligenceEnabled():boolean;enableIntelligence():{readonly migrated:boolean;readonly backup:string|null};previousInterrupted(projectId:string):PreviousSession|null;
```

- [ ] **Step 7: Verde**

Run: `bun test src/infrastructure/sqlite/activity.test.ts src/app/project-context.test.ts src/interfaces/mcp/sessions-tools.test.ts`
Expected: PASS (`activity.test.ts` 4, `project-context.test.ts` 3, `sessions-tools.test.ts` 6: 13 en total, 6 nuevas).

- [ ] **Step 8: Suite completa y tipos**

Run: `bun test` y `bun run typecheck`. Expected: 642 pass / 10 skip / 0 fail; typecheck sin errores. La suite completa tarda ~30 s; si el entorno la corta, córrela por grupos **sin repetir carpetas** (`bun test src/modules`, `bun test src/infrastructure`, `bun test src/app src/interfaces src/shared src/index.test.ts`, `bun test tests scripts`).

- [ ] **Step 9: Commit**

```bash
git add src/modules/sessions/rules.ts src/modules/sessions/types.ts src/modules/sessions/index.ts src/index.ts src/infrastructure/sqlite/activity.ts src/infrastructure/sqlite/activity.test.ts src/infrastructure/sqlite/sessions.ts src/infrastructure/sqlite/writes.ts src/app/memory-store.ts src/app/project-context.ts src/app/project-context.test.ts src/interfaces/mcp/sessions-tools.ts src/interfaces/mcp/sessions-tools.test.ts src/interfaces/cli/commands.ts src/index.test.ts tests/fixtures/sdk-contract.ts
git commit -m "feat(sessions): activity tracking, interrupted sessions and previous-session handoff (level 11)"
```

- [ ] **Step 10: Documentación (prompt aparte, sesión nueva, commit propio)**

Los textos exactos se redactan tras aprobar el commit del paso 9, contra los capítulos reales y simulados en una copia (como en T3). Alcance fijado: `docs/es/03-referencia-cli.md` y `docs/en/03-cli-reference.md` (sección «Sesiones y contexto»: `session-start` devuelve `previous` en nivel 11), `docs/es/04-sdk-typescript.md` y `docs/en/04-typescript-sdk.md` (sección «Memoria inteligente»: `previousInterrupted`, `PreviousSession`, actividad y marca), `docs/es/05-arquitectura-interna-y-formulas.md` y `docs/en/05-internal-architecture-and-formulas.md` (regla de la marca, 6 h y la inferencia), `docs/es/06-resolucion-de-errores.md` y `docs/en/06-troubleshooting.md` (sección «Memoria inteligente»: `AMBIGUOUS_SESSION` ya no lo causan sesiones viejas abiertas) y `CHANGELOG.md` (viñeta en `## 1.7.0 — en desarrollo`, antes de «La replicación de grupos…»). `docs/notion-map.json` solo cambia si una entrada de 03 existe y aún no está marcada (06 ya está marcado; 04 y 05 no tienen entrada). Commit: `docs: session activity, interrupted sessions and previous-session handoff in CLI, SDK, architecture, troubleshooting and changelog`.

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
| T2 | **Sí** | Engram ya no solo pide no guardar secretos: los rechaza con `SECRET_REJECTED` en todo guardado y en cualquier nivel. Punto nuevo para la sección `forge614-engram`, bajo «Memorias durables y seguridad», después del punto de credenciales: «- [ ] Probar con el agente nuevo que, si Engram responde `SECRET_REJECTED`, el agente vuelve a guardar el recuerdo sin el valor (nombrando dónde vive, por ejemplo `password: <redacted>` o el nombre de la variable de entorno), no reintenta con el secreto, no descarta el recuerdo en silencio y le dice a la persona qué quitó. Verificación: pedirle que recuerde un texto con una clave de prueba inventada y revisar con `memory_search` que se guardó sin el valor.» Los campos `short`, `supersedes` y `affects` **no** generan punto todavía: solo existen con el esquema 11 y el protocolo v4 (T7) define cuándo usarlos. |
| T3 | **No (por ahora)** | El buscador nuevo no cambia cómo se integra un asistente: `memory_search` sigue igual por fuera y mejora solo. La respuesta `similar` de `memory_save` sí pide una conducta (actualizar el parecido, guardar aparte o marcarlo "reemplazado por"), pero esa conducta la define el protocolo v4 (T7); el punto del checklist se redacta entonces, con su prueba (guardar dos veces algo parecido y verificar que no se duplica). |
