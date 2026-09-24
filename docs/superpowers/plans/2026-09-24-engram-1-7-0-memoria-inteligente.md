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
];

test("real domain texts are never rejected", () => {
  for (const text of BENIGN) expect(findSecret(text)).toBeNull();
});
```

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
  ["password-assignment", /\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*["']?[^\s"']{8,}/iu],
];

/** Id of the first secret pattern found in the text, or null. */
export function findSecret(text: string): string | null {
  for (const [id, pattern] of SECRET_PATTERNS) if (pattern.test(text)) return id;
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

- [ ] **Step 12: Documentación (prompt aparte, sesión nueva, commit propio)** — el orquestador escribe su texto exacto después de aprobar el código, leyendo los capítulos reales (04 SDK, 06 errores y el capítulo que describe `memory_save`).

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
