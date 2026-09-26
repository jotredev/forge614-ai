# model-ledger etapa 1 · recolector — plan de construcción

> **Para agentes:** este plan se ejecuta en una sesión propia del repositorio `model-ledger`, tarea por tarea. Los pasos usan casillas (`- [ ]`). **El propietario decidió que no haya pruebas automáticas en esta etapa**: cada tarea se valida con `bun run typecheck` y con ejecuciones reales contra datos reales, tal como indica cada paso.

**Objetivo:** juntar en Neon (PostgreSQL), desde hoy, datos medidos de modelos y del trabajo real del propietario: fotos diarias de Artificial Analysis y models.dev, sesiones de Claude Code, Codex y OpenCode, y las corridas y lecciones de Notion.

**Arquitectura:**
- Un proyecto TypeScript pequeño con cuatro comandos: `diario`, `cada-hora`, `carga-inicial` y `verificar`.
- Los lectores (`fuentes/`) convierten cada origen en datos tipados; el almacén (`almacen/`) los escribe en Neon de forma idempotente.
- `diario` corre en GitHub Actions; `cada-hora` corre en la Mac con launchd.

**Tecnologías:** Bun 1.4+, TypeScript estricto, Zod 3, `postgres` (postgres.js) 3, `@notionhq/client` 5, `bun:sqlite`, GitHub Actions y launchd.

**Diseño que implementa:** `docs/superpowers/specs/2026-09-26-model-ledger-recolector-design.md`. En la tarea 1 se copia al repositorio.

## Restricciones globales

- **Solo lectura** sobre `~/.claude`, `~/.codex` y `~/.local/share/opencode`. Nunca se escribe, mueve ni borra nada ahí.
- En OpenCode **solo** se leen las tablas `session_v2` y `session_message`, y **de una copia temporal** de la base. Jamás `account`, `control_account`, `credential` ni ninguna otra, porque contienen tokens de acceso.
- De cada sesión solo se guardan como texto el **primer prompt** y el **reporte final**, siempre después de `limpiarTexto()` y con un tope de 20 000 caracteres.
- Nunca se guarda código, contenido de archivos, resultados de herramientas ni registros crudos.
- Los secretos solo viven en `.env` (permisos `600`, dentro de `.gitignore`) y en los secretos de GitHub. Nunca se imprimen en la salida ni en los errores.
- Toda escritura es **idempotente**: correr dos veces no duplica nada.
- **Vacío antes que inventado:** si un dato no se puede leer con certeza, se guarda `null`.
- Se salta todo registro modificado hace menos de 10 minutos, porque la sesión sigue abierta.
- **Commits sin ninguna mención a Claude ni líneas `Co-Authored-By`.** Mensajes en español, estilo `feat: …` o `docs: …`.
- Todo comando de terminal lleva el prefijo `rtk` (regla del propietario).

## Enfoque de revisión

Casos que ningún paso cubre por sí solo y que más probablemente fallen:

1. **Registros con una línea cortada o JSON inválido** (una sesión que se cerró a la mitad). Se espera que la línea se ignore, se cuente en `errores` de `ejecuciones` y el resto de la sesión se guarde. Lo cubre la tarea 7, paso 3.
2. **Sesión de Claude Code que cambia de modelo a la mitad o usa el modelo `<synthetic>`.** Se espera un tramo por modelo en `sesion_modelos`, y que `<synthetic>` no genere tramo. Lo cubre la tarea 7, paso 4.
3. **Neon caído o sin internet** durante `cada-hora`. Se espera que el comando termine con error claro, sin dejar filas a medias (transacción por sesión), y que la siguiente hora lo reintente solo. Lo cubre la tarea 11, paso 3.
4. **Dos `cada-hora` al mismo tiempo** (la Mac despierta y launchd dispara dos veces). Se espera que el segundo se salga sin hacer nada. Lo cubre la tarea 11, paso 2 (candado).
5. **Fila de Notion sin «Archivo de registro»** o que coincide con varias sesiones. Se espera `sesion_id = null`, nunca un enlace adivinado. Lo cubre la tarea 10, paso 4.

---

### Tarea 1: esqueleto del proyecto y configuración

**Archivos:**
- Crear: `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`, `src/config.ts`, `README.md`
- Crear: `docs/diseno.md` y `docs/plan.md` (copias del diseño y de este plan)

**Interfaces:**
- Produce:
  - `configNeon(): { url: string }`
  - `configNotion(): { token: string; corridasDs: string; leccionesDs: string }`
  - `configAA(): { apiKey: string }`
  - `maquina(): string`

- [ ] **Paso 1: copiar el diseño y el plan al repositorio** (lectura del repositorio `forge614-ai`, sin modificarlo)

```bash
rtk mkdir -p docs
rtk git -C ~/Desktop/forge614-ai show docs/model-ledger-diseno:docs/superpowers/specs/2026-09-26-model-ledger-recolector-design.md > docs/diseno.md
rtk git -C ~/Desktop/forge614-ai show docs/model-ledger-diseno:docs/superpowers/plans/2026-09-26-model-ledger-recolector.md > docs/plan.md
```

- [ ] **Paso 2: crear `package.json`**

```json
{
  "name": "model-ledger",
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "migrar": "bun src/comandos/migrar.ts",
    "diario": "bun src/comandos/diario.ts",
    "cada-hora": "bun src/comandos/cada-hora.ts",
    "carga-inicial": "bun src/comandos/carga-inicial.ts",
    "verificar": "bun src/comandos/verificar.ts"
  },
  "dependencies": {
    "@notionhq/client": "^5.0.0",
    "postgres": "^3.4.5",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.6.0"
  }
}
```

Luego: `rtk bun install`, que genera `bun.lock`.

- [ ] **Paso 3: crear `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "skipLibCheck": true,
    "types": ["bun"],
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Paso 4: crear `.gitignore` y `.env.example`**

`.gitignore`:
```
node_modules/
.env
*.log
```

`.env.example`:
```
# Copiar a .env (rtk cp .env.example .env && rtk chmod 600 .env) y llenar. Nunca subir .env a Git.
NEON_DATABASE_URL=
NOTION_TOKEN=
NOTION_CORRIDAS_DS=3a02e73e-002b-4c30-8dd0-fe5dbe0d817f
NOTION_LECCIONES_DS=25836d1f-7a24-4ed3-8c6c-a6decef60f77
ARTIFICIAL_ANALYSIS_API_KEY=
MAQUINA=mac-mini
```

- [ ] **Paso 5: crear `src/config.ts`**

Bun carga `.env` solo cuando el comando corre dentro de la carpeta del proyecto.

```ts
import { z } from "zod";

function leer<T extends z.ZodRawShape>(forma: T, nombres: string): z.infer<z.ZodObject<T>> {
  const r = z.object(forma).safeParse(process.env);
  if (!r.success) {
    const faltan = r.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Faltan o son inválidas en .env: ${faltan} (${nombres}). Revisa .env.example.`);
  }
  return r.data;
}

export function configNeon() {
  const e = leer({ NEON_DATABASE_URL: z.string().startsWith("postgres") }, "Neon");
  return { url: e.NEON_DATABASE_URL };
}

export function configNotion() {
  const e = leer(
    {
      NOTION_TOKEN: z.string().min(10),
      NOTION_CORRIDAS_DS: z.string().uuid(),
      NOTION_LECCIONES_DS: z.string().uuid(),
    },
    "Notion",
  );
  return { token: e.NOTION_TOKEN, corridasDs: e.NOTION_CORRIDAS_DS, leccionesDs: e.NOTION_LECCIONES_DS };
}

export function configAA() {
  const e = leer({ ARTIFICIAL_ANALYSIS_API_KEY: z.string().min(10) }, "Artificial Analysis");
  return { apiKey: e.ARTIFICIAL_ANALYSIS_API_KEY };
}

export function maquina(): string {
  return process.env.MAQUINA?.trim() || "sin-nombre";
}
```

- [ ] **Paso 6: crear `README.md`**

```markdown
# model-ledger

Recolector de datos de modelos de IA (etapa 1): guarda en Neon fotos diarias de Artificial Analysis y models.dev, las sesiones de Claude Code, Codex y OpenCode de esta computadora, y las corridas y lecciones de Notion «Forge614 · Laboratorio de agentes».

- Diseño: docs/diseno.md · Plan: docs/plan.md
- Comandos: `bun run migrar`, `bun run diario`, `bun run cada-hora`, `bun run carga-inicial`, `bun run verificar`
- Configuración: copiar `.env.example` a `.env` (permisos 600) y llenarlo.
```

- [ ] **Paso 7: typecheck y commit**

Ejecutar: `rtk bun run typecheck`. Resultado esperado: sin errores.

```bash
rtk git add -A && rtk git commit -m "feat: esqueleto del proyecto y configuración"
```

- [ ] **Paso 8: PAUSA PARA EL PROPIETARIO.** Detente aquí y pídele que:
  1. cree el `.env` con `rtk cp .env.example .env && rtk chmod 600 .env`;
  2. lo llene con su editor (sección «Puesta en marcha», pasos C a E);
  3. te avise.

  **No pidas ni leas los valores.** Para confirmar, usa solo:
  ```bash
  rtk bun -e 'import("./src/config.ts").then(m=>{m.configNeon();m.configNotion();m.configAA();console.log("config ok")})'
  ```

---

### Tarea 2: base de datos y migraciones

**Archivos:**
- Crear: `sql/001_inicial.sql`, `src/almacen/db.ts`, `src/comandos/migrar.ts`

**Interfaces:**
- Consume: `configNeon()`
- Produce:
  - `conectar(): Sql`, el cliente de postgres.js;
  - `type Sql = ReturnType<typeof postgres>`.

- [ ] **Paso 1: crear `sql/001_inicial.sql`**

```sql
create table fotos_api (
  id bigserial primary key,
  fuente text not null check (fuente in ('artificial_analysis','models_dev')),
  tomada_en timestamptz not null default now(),
  estado text not null check (estado in ('ok','error')),
  error text,
  huella text,
  respuesta jsonb
);
create index fotos_api_fuente_idx on fotos_api (fuente, tomada_en desc);

create table modelos (
  id text primary key,                 -- 'proveedor/modelo' como en models.dev
  proveedor text not null,
  modelo text not null,
  nombre text,
  familia text,
  fecha_lanzamiento date,
  contexto integer,
  salida_max integer,
  razona boolean,
  usa_herramientas boolean,
  pesos_abiertos boolean,
  visto_primero timestamptz not null default now(),
  visto_ultimo timestamptz not null default now()
);

create table precios (                 -- historial: fila nueva solo si cambia
  id bigserial primary key,
  modelo_id text not null references modelos(id),
  vigente_desde timestamptz not null default now(),
  entrada numeric,
  salida numeric,
  cache_lectura numeric,
  cache_escritura numeric,
  fuente text not null
);
create index precios_modelo_idx on precios (modelo_id, vigente_desde desc);

create table notas_benchmark (         -- historial: fila nueva solo si cambia la huella
  id bigserial primary key,
  aa_id text not null,
  aa_slug text,
  aa_nombre text,
  creador text,
  modelo_id text references modelos(id),
  tomada_en timestamptz not null default now(),
  indice_inteligencia numeric,
  indice_codigo numeric,
  indice_matematicas numeric,
  evaluaciones jsonb,
  precio_entrada numeric,
  precio_salida numeric,
  tokens_por_segundo numeric,
  segundos_primer_token numeric,
  huella text not null
);
create index notas_aa_idx on notas_benchmark (aa_id, tomada_en desc);

create table sesiones (
  id text primary key,                 -- 'herramienta:id_de_sesion'
  herramienta text not null check (herramienta in ('claude-code','codex','opencode')),
  sesion_id text not null,
  padre_id text,
  es_subagente boolean not null default false,
  version_herramienta text,
  maquina text not null,
  carpeta text,
  rama text,
  inicio timestamptz,
  fin timestamptz,
  minutos_activos numeric,
  mensajes integer not null default 0,
  llamadas_herramientas integer not null default 0,
  llamadas_mcp integer not null default 0,
  compactaciones integer not null default 0,
  tokens_entrada_nuevos bigint not null default 0,
  tokens_cache_lectura bigint not null default 0,
  tokens_cache_escritura bigint not null default 0,
  tokens_salida bigint not null default 0,     -- incluye razonamiento
  tokens_razonamiento bigint not null default 0,
  costo_equivalente_usd numeric,               -- con precios vigentes; estimación
  costo_real_usd numeric,                      -- solo si se pagó por uso y la herramienta lo reporta
  porcentaje_limite numeric,                   -- % del límite del plan (Codex)
  primer_prompt text,
  reporte_final text,
  texto_recortado boolean not null default false,
  registro_ruta text not null,
  registro_tamano bigint,
  registro_mtime timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index sesiones_inicio_idx on sesiones (herramienta, inicio desc);

create table sesion_modelos (
  sesion_id text not null references sesiones(id) on delete cascade,
  modelo text not null,
  razonamiento text not null default 'predeterminado',
  mensajes integer not null default 0,
  tokens_entrada_nuevos bigint not null default 0,
  tokens_cache_lectura bigint not null default 0,
  tokens_cache_escritura bigint not null default 0,
  tokens_salida bigint not null default 0,
  tokens_razonamiento bigint not null default 0,
  costo_equivalente_usd numeric,
  primary key (sesion_id, modelo, razonamiento)
);

create table corridas (
  notion_id text primary key,
  nombre text,
  etiqueta text,
  proyecto text,
  herramienta text,
  modelo text,
  razonamiento text,
  ronda integer,
  resultado text,
  archivo_registro text,
  inicio timestamptz,
  propiedades jsonb not null,          -- TODAS las columnas de Notion, en valores simples
  editado_en_notion timestamptz not null,
  sesion_id text references sesiones(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table lecciones (
  notion_id text primary key,
  leccion text,
  tipo text,
  estado text,
  muestras integer,
  propiedades jsonb not null,
  editado_en_notion timestamptz not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table ejecuciones (
  id bigserial primary key,
  fuente text not null,
  maquina text not null,
  inicio timestamptz not null default now(),
  fin timestamptz,
  leidos integer not null default 0,
  nuevos integer not null default 0,
  actualizados integer not null default 0,
  errores integer not null default 0,
  detalle_errores jsonb not null default '[]'
);

create table estado (
  clave text primary key,
  valor text not null,
  actualizado_en timestamptz not null default now()
);
```

- [ ] **Paso 2: crear `src/almacen/db.ts`**

```ts
import postgres from "postgres";
import { configNeon } from "../config";

export type Sql = ReturnType<typeof postgres>;

export function conectar(): Sql {
  return postgres(configNeon().url, { ssl: "require", max: 4, idle_timeout: 20, onnotice: () => {} });
}
```

- [ ] **Paso 3: crear `src/comandos/migrar.ts`**

```ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { conectar } from "../almacen/db";

const sql = conectar();
try {
  await sql`create table if not exists migraciones (nombre text primary key, aplicada_en timestamptz not null default now())`;
  const hechas = new Set((await sql<{ nombre: string }[]>`select nombre from migraciones`).map((r) => r.nombre));
  const dir = join(import.meta.dir, "../../sql");
  for (const archivo of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (hechas.has(archivo)) continue;
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(join(dir, archivo), "utf8"));
      await tx`insert into migraciones (nombre) values (${archivo})`;
    });
    console.log(`migración aplicada: ${archivo}`);
  }
  console.log("migraciones al día");
} finally {
  await sql.end();
}
```

- [ ] **Paso 4: aplicar y comprobar contra Neon**

Ejecutar: `rtk bun run migrar`. Resultado esperado: `migración aplicada: 001_inicial.sql` y luego `migraciones al día`.

Ejecutar otra vez: `rtk bun run migrar`. Resultado esperado: solo `migraciones al día`, sin errores (idempotente).

Comprobar las tablas:
```bash
rtk bun -e 'import("./src/almacen/db.ts").then(async m=>{const s=m.conectar();console.log((await s`select table_name from information_schema.tables where table_schema=${"public"} order by 1`).map(r=>r.table_name).join(", "));await s.end()})'
```
Resultado esperado: `corridas, ejecuciones, estado, fotos_api, lecciones, migraciones, modelos, notas_benchmark, precios, sesion_modelos, sesiones`.

- [ ] **Paso 5: typecheck y commit**

```bash
rtk bun run typecheck && rtk git add -A && rtk git commit -m "feat: tablas en Neon y migraciones"
```

---

### Tarea 3: limpieza de secretos y registro de ejecuciones

**Archivos:**
- Crear: `src/limpieza/secretos.ts`, `src/almacen/ejecuciones.ts`

**Interfaces:**
- Produce:
  - `limpiarTexto(t: string | null): { texto: string | null; recortado: boolean }`
  - `conEjecucion(sql: Sql, fuente: string, trabajo: (e: Contador) => Promise<void>): Promise<void>`
  - `type Contador = { leidos: number; nuevos: number; actualizados: number; error(detalle: string): void }`

- [ ] **Paso 1: crear `src/limpieza/secretos.ts`**

```ts
const MAXIMO = 20_000;

const PATRONES: RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\bsk-ant-[A-Za-z0-9_-]{10,}/g,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}/g,
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/g,
  /\bntn_[A-Za-z0-9]{20,}/g,
  /\bsecret_[A-Za-z0-9]{20,}/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  /\b(postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s:@/]+:[^\s@/]+@/g,
];

// Líneas de estilo .env: CLAVE_EN_MAYUSCULAS=valor, cuando la clave suena a secreto.
const LINEA_ENV = /^(\s*[A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASS|PWD|URL|DSN)[A-Z0-9_]*\s*=\s*)(\S.*)$/gm;

export function limpiarTexto(t: string | null): { texto: string | null; recortado: boolean } {
  if (t === null || t.trim() === "") return { texto: null, recortado: false };
  let s = t;
  for (const p of PATRONES) s = s.replace(p, "[SECRETO]");
  s = s.replace(LINEA_ENV, "$1[SECRETO]");
  if (s.length > MAXIMO) return { texto: s.slice(0, MAXIMO), recortado: true };
  return { texto: s, recortado: false };
}
```

- [ ] **Paso 2: comprobar a mano el limpiador**

```bash
rtk bun -e 'import("./src/limpieza/secretos.ts").then(m=>{const r=m.limpiarTexto("clave sk-ant-abcdefghijklmnop y postgres://u:p4ss@host/db\nAPI_KEY=123456\nnormal: hola");console.log(r.texto)})'
```
Resultado esperado: `clave [SECRETO] y [SECRETO]host/db`, luego `API_KEY=[SECRETO]` y luego `normal: hola`.

- [ ] **Paso 3: crear `src/almacen/ejecuciones.ts`**

```ts
import type { Sql } from "./db";
import { maquina } from "../config";

export type Contador = { leidos: number; nuevos: number; actualizados: number; error(detalle: string): void };

export async function conEjecucion(sql: Sql, fuente: string, trabajo: (e: Contador) => Promise<void>): Promise<void> {
  const [fila] = await sql<{ id: string }[]>`insert into ejecuciones (fuente, maquina) values (${fuente}, ${maquina()}) returning id`;
  const errores: string[] = [];
  const c: Contador = { leidos: 0, nuevos: 0, actualizados: 0, error: (d) => void errores.push(d.slice(0, 500)) };
  try {
    await trabajo(c);
  } catch (e) {
    errores.push(`fallo general: ${e instanceof Error ? e.message : String(e)}`.slice(0, 500));
    throw e;
  } finally {
    await sql`update ejecuciones set fin = now(), leidos = ${c.leidos}, nuevos = ${c.nuevos},
      actualizados = ${c.actualizados}, errores = ${errores.length},
      detalle_errores = ${sql.json(errores.slice(0, 50))} where id = ${fila!.id}`;
    console.log(`${fuente}: leídos ${c.leidos}, nuevos ${c.nuevos}, actualizados ${c.actualizados}, errores ${errores.length}`);
    if (errores.length) console.error(errores.slice(0, 5).map((e) => `  · ${e}`).join("\n"));
  }
}
```

- [ ] **Paso 4: typecheck y commit**

```bash
rtk bun run typecheck && rtk git add -A && rtk git commit -m "feat: limpieza de secretos y registro de ejecuciones"
```

---

### Tarea 4: models.dev (catálogo y precios)

**Archivos:**
- Crear: `src/fuentes/models-dev.ts`, `src/almacen/catalogo.ts`

**Interfaces:**
- Consume: `conectar`, `conEjecucion`
- Produce:
  - `leerModelsDev(): Promise<{ crudo: unknown; modelos: ModeloCatalogo[] }>`
  - `guardarFoto(sql, fuente, estado, crudo, error?): Promise<void>`
  - `guardarModelos(sql, modelos, c): Promise<void>`
  - `precioVigente(sql, modeloId): Promise<Precio | null>`
  - `type Precio = { entrada: number | null; salida: number | null; cacheLectura: number | null; cacheEscritura: number | null }`

- [ ] **Paso 1: crear `src/fuentes/models-dev.ts`**

```ts
import { z } from "zod";

const Costo = z.object({
  input: z.number().optional(),
  output: z.number().optional(),
  cache_read: z.number().optional(),
  cache_write: z.number().optional(),
}).passthrough();

const Modelo = z.object({
  id: z.string(),
  name: z.string().optional(),
  family: z.string().optional(),
  release_date: z.string().optional(),
  reasoning: z.boolean().optional(),
  tool_call: z.boolean().optional(),
  open_weights: z.boolean().optional(),
  limit: z.object({ context: z.number().optional(), output: z.number().optional() }).passthrough().optional(),
  cost: Costo.optional(),
}).passthrough();

const Respuesta = z.record(z.object({ id: z.string(), models: z.record(z.unknown()).default({}) }).passthrough());

export type ModeloCatalogo = {
  id: string; proveedor: string; modelo: string; nombre: string | null; familia: string | null;
  fechaLanzamiento: string | null; contexto: number | null; salidaMax: number | null;
  razona: boolean | null; usaHerramientas: boolean | null; pesosAbiertos: boolean | null;
  precio: { entrada: number | null; salida: number | null; cacheLectura: number | null; cacheEscritura: number | null } | null;
};

export async function leerModelsDev(): Promise<{ crudo: unknown; modelos: ModeloCatalogo[]; invalidos: number }> {
  const r = await fetch("https://models.dev/api.json", { signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new Error(`models.dev respondió ${r.status}`);
  const crudo: unknown = await r.json();
  const datos = Respuesta.parse(crudo);
  const modelos: ModeloCatalogo[] = [];
  let invalidos = 0;
  for (const [proveedor, p] of Object.entries(datos)) {
    for (const [clave, bruto] of Object.entries(p.models)) {
      const ok = Modelo.safeParse(bruto);
      if (!ok.success) { invalidos++; continue; }   // un modelo raro no tumba a los demás
      const m = ok.data;
      const fecha = m.release_date && /^\d{4}-\d{2}-\d{2}$/.test(m.release_date) ? m.release_date : null;
      modelos.push({
        id: `${proveedor}/${clave}`, proveedor, modelo: clave, nombre: m.name ?? null, familia: m.family ?? null,
        fechaLanzamiento: fecha, contexto: m.limit?.context ?? null, salidaMax: m.limit?.output ?? null,
        razona: m.reasoning ?? null, usaHerramientas: m.tool_call ?? null, pesosAbiertos: m.open_weights ?? null,
        precio: m.cost ? { entrada: m.cost.input ?? null, salida: m.cost.output ?? null,
          cacheLectura: m.cost.cache_read ?? null, cacheEscritura: m.cost.cache_write ?? null } : null,
      });
    }
  }
  return { crudo, modelos, invalidos };
}
```

- [ ] **Paso 2: crear `src/almacen/catalogo.ts`**

```ts
import { createHash } from "node:crypto";
import type { Sql } from "./db";
import type { Contador } from "./ejecuciones";
import type { ModeloCatalogo } from "../fuentes/models-dev";

export type Precio = { entrada: number | null; salida: number | null; cacheLectura: number | null; cacheEscritura: number | null };

export function huella(x: unknown): string {
  return createHash("sha256").update(JSON.stringify(x)).digest("hex");
}

export async function guardarFoto(sql: Sql, fuente: "artificial_analysis" | "models_dev",
  estado: "ok" | "error", crudo: unknown, error?: string): Promise<void> {
  await sql`insert into fotos_api (fuente, estado, error, huella, respuesta)
    values (${fuente}, ${estado}, ${error ?? null}, ${crudo === null ? null : huella(crudo)},
    ${crudo === null ? null : sql.json(crudo as never)})`;
}

const igual = (a: number | null, b: string | null) => (a === null ? b === null : b !== null && Number(b) === a);

export async function guardarModelos(sql: Sql, modelos: ModeloCatalogo[], c: Contador): Promise<void> {
  for (const m of modelos) {
    c.leidos++;
    const [r] = await sql<{ nuevo: boolean }[]>`
      insert into modelos (id, proveedor, modelo, nombre, familia, fecha_lanzamiento, contexto, salida_max,
        razona, usa_herramientas, pesos_abiertos)
      values (${m.id}, ${m.proveedor}, ${m.modelo}, ${m.nombre}, ${m.familia}, ${m.fechaLanzamiento},
        ${m.contexto}, ${m.salidaMax}, ${m.razona}, ${m.usaHerramientas}, ${m.pesosAbiertos})
      on conflict (id) do update set nombre = excluded.nombre, familia = excluded.familia,
        fecha_lanzamiento = excluded.fecha_lanzamiento, contexto = excluded.contexto, salida_max = excluded.salida_max,
        razona = excluded.razona, usa_herramientas = excluded.usa_herramientas,
        pesos_abiertos = excluded.pesos_abiertos, visto_ultimo = now()
      returning (xmax = 0) as nuevo`;
    if (r?.nuevo) c.nuevos++;
    if (!m.precio) continue;
    const [ultimo] = await sql<{ entrada: string | null; salida: string | null; cache_lectura: string | null; cache_escritura: string | null }[]>`
      select entrada, salida, cache_lectura, cache_escritura from precios
      where modelo_id = ${m.id} order by vigente_desde desc limit 1`;
    const p = m.precio;
    if (ultimo && igual(p.entrada, ultimo.entrada) && igual(p.salida, ultimo.salida)
      && igual(p.cacheLectura, ultimo.cache_lectura) && igual(p.cacheEscritura, ultimo.cache_escritura)) continue;
    await sql`insert into precios (modelo_id, entrada, salida, cache_lectura, cache_escritura, fuente)
      values (${m.id}, ${p.entrada}, ${p.salida}, ${p.cacheLectura}, ${p.cacheEscritura}, ${"models_dev"})`;
    c.actualizados++;
  }
}

export async function precioVigente(sql: Sql, modeloId: string): Promise<Precio | null> {
  const [p] = await sql<{ entrada: string | null; salida: string | null; cache_lectura: string | null; cache_escritura: string | null }[]>`
    select entrada, salida, cache_lectura, cache_escritura from precios
    where modelo_id = ${modeloId} order by vigente_desde desc limit 1`;
  if (!p) return null;
  const n = (v: string | null) => (v === null ? null : Number(v));
  return { entrada: n(p.entrada), salida: n(p.salida), cacheLectura: n(p.cache_lectura), cacheEscritura: n(p.cache_escritura) };
}
```

- [ ] **Paso 3: probar contra la API real**

```bash
rtk bun -e 'import("./src/fuentes/models-dev.ts").then(async m=>{const r=await m.leerModelsDev();console.log(r.modelos.length, r.modelos.find(x=>x.id==="xiaomi/mimo-v2.6-pro"))})'
```
Resultado esperado: más de 1 000 modelos y la ficha de `xiaomi/mimo-v2.6-pro`, con precio de entrada de 0.435.

- [ ] **Paso 4: typecheck y commit**

```bash
rtk bun run typecheck && rtk git add -A && rtk git commit -m "feat: lector de models.dev y catálogo con historial de precios"
```

---

### Tarea 5: Artificial Analysis (notas de benchmark)

**Archivos:**
- Crear: `src/fuentes/artificial-analysis.ts`
- Modificar: `src/almacen/catalogo.ts` (agregar `guardarNotas`)

**Interfaces:**
- Consume: `configAA()`, `huella()`
- Produce:
  - `leerAA(): Promise<{ crudo: unknown; notas: NotaAA[] }>`
  - `guardarNotas(sql, notas, c): Promise<void>`

- [ ] **Paso 1: crear `src/fuentes/artificial-analysis.ts`**

```ts
import { z } from "zod";
import { configAA } from "../config";

const num = z.number().nullable().optional();
const Modelo = z.object({
  id: z.string(),
  name: z.string().optional(),
  slug: z.string().optional(),
  model_creator: z.object({ id: z.string().optional(), name: z.string().optional(), slug: z.string().optional() }).passthrough().optional(),
  evaluations: z.record(z.unknown()).optional(),
  pricing: z.object({ price_1m_input_tokens: num, price_1m_output_tokens: num }).passthrough().optional(),
  median_output_tokens_per_second: num,
  median_time_to_first_token_seconds: num,
}).passthrough();
const Respuesta = z.object({ data: z.array(Modelo) }).passthrough();

export type NotaAA = {
  aaId: string; slug: string | null; nombre: string | null; creador: string | null; creadorSlug: string | null;
  inteligencia: number | null; codigo: number | null; matematicas: number | null; evaluaciones: Record<string, number | null>;
  precioEntrada: number | null; precioSalida: number | null; tps: number | null; ttft: number | null;
};

export async function leerAA(): Promise<{ crudo: unknown; notas: NotaAA[] }> {
  const r = await fetch("https://artificialanalysis.ai/api/v2/data/llms/models", {
    headers: { "x-api-key": configAA().apiKey }, signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) throw new Error(`Artificial Analysis respondió ${r.status}`);
  const crudo: unknown = await r.json();
  const datos = Respuesta.parse(crudo);
  const notas = datos.data.map((m): NotaAA => {
    const ev: Record<string, number | null> = {};
    for (const [k, v] of Object.entries(m.evaluations ?? {})) ev[k] = typeof v === "number" ? v : null;
    return {
      aaId: m.id, slug: m.slug ?? null, nombre: m.name ?? null,
      creador: m.model_creator?.name ?? null, creadorSlug: m.model_creator?.slug ?? null,
      inteligencia: ev.artificial_analysis_intelligence_index ?? null,
      codigo: ev.artificial_analysis_coding_index ?? null,
      matematicas: ev.artificial_analysis_math_index ?? null,
      evaluaciones: ev,
      precioEntrada: m.pricing?.price_1m_input_tokens ?? null, precioSalida: m.pricing?.price_1m_output_tokens ?? null,
      tps: m.median_output_tokens_per_second ?? null, ttft: m.median_time_to_first_token_seconds ?? null,
    };
  });
  return { crudo, notas };
}
```

- [ ] **Paso 2: agregar `guardarNotas` al final de `src/almacen/catalogo.ts`**

El emparejamiento con `modelos` usa el `slug` de Artificial Analysis contra la clave de models.dev dentro del proveedor del mismo nombre de creador. Si no hay exactamente un candidato, queda `null`.

```ts
import type { NotaAA } from "../fuentes/artificial-analysis";

export async function guardarNotas(sql: Sql, notas: NotaAA[], c: Contador): Promise<void> {
  for (const n of notas) {
    c.leidos++;
    const h = huella([n.inteligencia, n.codigo, n.matematicas, n.evaluaciones, n.precioEntrada, n.precioSalida, n.tps, n.ttft]);
    const [ultima] = await sql<{ huella: string }[]>`
      select huella from notas_benchmark where aa_id = ${n.aaId} order by tomada_en desc limit 1`;
    if (ultima?.huella === h) continue;
    let modeloId: string | null = null;
    if (n.slug) {
      const cand = await sql<{ id: string }[]>`select id from modelos where modelo = ${n.slug} limit 2`;
      if (cand.length === 1) modeloId = cand[0]!.id;
    }
    await sql`insert into notas_benchmark (aa_id, aa_slug, aa_nombre, creador, modelo_id, indice_inteligencia,
        indice_codigo, indice_matematicas, evaluaciones, precio_entrada, precio_salida, tokens_por_segundo,
        segundos_primer_token, huella)
      values (${n.aaId}, ${n.slug}, ${n.nombre}, ${n.creador}, ${modeloId}, ${n.inteligencia}, ${n.codigo},
        ${n.matematicas}, ${sql.json(n.evaluaciones as never)}, ${n.precioEntrada}, ${n.precioSalida}, ${n.tps}, ${n.ttft}, ${h})`;
    if (ultima) c.actualizados++; else c.nuevos++;
  }
}
```

- [ ] **Paso 3: probar contra la API real**

```bash
rtk bun -e 'import("./src/fuentes/artificial-analysis.ts").then(async m=>{const r=await m.leerAA();console.log(r.notas.length, r.notas.find(x=>/mimo/i.test(x.nombre??"")))})'
```
Resultado esperado: cientos de modelos y al menos una nota de MiMo con `inteligencia` numérica.
- **Si responde 401**, la llave del `.env` está mal: detente y avísale al propietario.
- **Si Zod rechaza la respuesta**, compara los nombres de campos reales con los del esquema y ajusta solo los nombres. Anota el cambio en el commit.

- [ ] **Paso 4: typecheck y commit**

```bash
rtk bun run typecheck && rtk git add -A && rtk git commit -m "feat: lector de Artificial Analysis con historial de notas"
```

---

### Tarea 6: comando `diario` y tarea programada de GitHub

**Archivos:**
- Crear: `src/comandos/diario.ts`, `.github/workflows/diario.yml`, `.github/workflows/typecheck.yml`

**Interfaces:**
- Consume: `leerModelsDev`, `leerAA`, `guardarFoto`, `guardarModelos`, `guardarNotas`, `conEjecucion`, `conectar`

- [ ] **Paso 1: crear `src/comandos/diario.ts`**

models.dev va primero, para que Artificial Analysis encuentre los modelos al emparejar. Si una fuente falla, la otra se intenta igual.

```ts
import { conectar } from "../almacen/db";
import { conEjecucion } from "../almacen/ejecuciones";
import { guardarFoto, guardarModelos, guardarNotas } from "../almacen/catalogo";
import { leerModelsDev } from "../fuentes/models-dev";
import { leerAA } from "../fuentes/artificial-analysis";

const sql = conectar();
let fallos = 0;
try {
  await conEjecucion(sql, "models_dev", async (c) => {
    try {
      const { crudo, modelos, invalidos } = await leerModelsDev();
      await guardarFoto(sql, "models_dev", "ok", crudo);
      await guardarModelos(sql, modelos, c);
      if (invalidos > 0) c.error(`${invalidos} modelos de models.dev con forma inesperada (quedan en la foto cruda)`);
    } catch (e) {
      await guardarFoto(sql, "models_dev", "error", null, e instanceof Error ? e.message : String(e));
      throw e;
    }
  }).catch(() => { fallos++; });
  await conEjecucion(sql, "artificial_analysis", async (c) => {
    try {
      const { crudo, notas } = await leerAA();
      await guardarFoto(sql, "artificial_analysis", "ok", crudo);
      await guardarNotas(sql, notas, c);
    } catch (e) {
      await guardarFoto(sql, "artificial_analysis", "error", null, e instanceof Error ? e.message : String(e));
      throw e;
    }
  }).catch(() => { fallos++; });
} finally {
  await sql.end();
}
process.exit(fallos > 0 ? 1 : 0);
```

- [ ] **Paso 2: correrlo dos veces contra Neon**

Ejecutar: `rtk bun run diario`.
- Primera vez: `models_dev` con más de 1 000 nuevos y `artificial_analysis` con cientos de nuevos, 0 errores.
- Segunda vez: los nuevos en 0, o casi 0 (idempotente).

- [ ] **Paso 3: crear `.github/workflows/diario.yml`**

```yaml
name: diario
on:
  schedule:
    - cron: "0 12 * * *"   # 06:00 hora de Ciudad de México
  workflow_dispatch: {}
jobs:
  diario:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run migrar
        env:
          NEON_DATABASE_URL: ${{ secrets.NEON_DATABASE_URL }}
      - run: bun run diario
        env:
          NEON_DATABASE_URL: ${{ secrets.NEON_DATABASE_URL }}
          ARTIFICIAL_ANALYSIS_API_KEY: ${{ secrets.ARTIFICIAL_ANALYSIS_API_KEY }}
          MAQUINA: github-actions
```

- [ ] **Paso 4: crear `.github/workflows/typecheck.yml`**

```yaml
name: typecheck
on: [push, pull_request]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run typecheck
```

- [ ] **Paso 5: typecheck y commit**

```bash
rtk bun run typecheck && rtk git add -A && rtk git commit -m "feat: comando diario y tareas de GitHub Actions"
```

---

### Tarea 7: forma común de una sesión y lector de Claude Code

**Archivos:**
- Crear: `src/esquemas/sesion.ts`, `src/fuentes/archivos.ts`, `src/fuentes/claude-code.ts`

**Interfaces:**
- Produce (lo usan las tareas 8, 9 y 10):

```ts
export type Herramienta = "claude-code" | "codex" | "opencode";
export type Tokens = { entradaNuevos: number; cacheLectura: number; cacheEscritura: number; cacheEscritura1h: number; salida: number; razonamiento: number };
export type Tramo = { modelo: string; razonamiento: string; mensajes: number; tokens: Tokens };
export type SesionLeida = {
  herramienta: Herramienta; sesionId: string; padreId: string | null; esSubagente: boolean; version: string | null;
  carpeta: string | null; rama: string | null; inicio: Date | null; fin: Date | null; minutosActivos: number | null;
  mensajes: number; llamadasHerramientas: number; llamadasMcp: number; compactaciones: number;
  tokens: Tokens; tramos: Tramo[];
  costoHerramientaUsd: number | null; costoEsReal: boolean; porcentajeLimite: number | null;
  primerPrompt: string | null; reporteFinal: string | null;
  registro: { ruta: string; tamano: number; mtime: Date };
  lineasInvalidas: number;
};
```

- `listarArchivos(raiz: string, filtro: (nombre: string) => boolean): { ruta: string; tamano: number; mtime: Date }[]` (se salta los modificados hace menos de 10 minutos).
- `leerClaude(archivo: { ruta: string; tamano: number; mtime: Date }): SesionLeida | null`

- [ ] **Paso 1: crear `src/esquemas/sesion.ts`**, con exactamente los tipos de arriba, más:

```ts
export const tokensCero = (): Tokens => ({ entradaNuevos: 0, cacheLectura: 0, cacheEscritura: 0, cacheEscritura1h: 0, salida: 0, razonamiento: 0 });

export function sumar(a: Tokens, b: Tokens): Tokens {
  return {
    entradaNuevos: a.entradaNuevos + b.entradaNuevos, cacheLectura: a.cacheLectura + b.cacheLectura,
    cacheEscritura: a.cacheEscritura + b.cacheEscritura, cacheEscritura1h: a.cacheEscritura1h + b.cacheEscritura1h,
    salida: a.salida + b.salida, razonamiento: a.razonamiento + b.razonamiento,
  };
}

export function agregarTramo(tramos: Map<string, Tramo>, modelo: string, razonamiento: string, t: Tokens, mensajes: number): void {
  const clave = `${modelo}\u0000${razonamiento}`;
  const actual = tramos.get(clave) ?? { modelo, razonamiento, mensajes: 0, tokens: tokensCero() };
  actual.mensajes += mensajes;
  actual.tokens = sumar(actual.tokens, t);
  tramos.set(clave, actual);
}
```

- [ ] **Paso 2: crear `src/fuentes/archivos.ts`**

```ts
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIEZ_MINUTOS = 10 * 60 * 1000;

export function listarArchivos(raiz: string, filtro: (nombre: string) => boolean) {
  const salida: { ruta: string; tamano: number; mtime: Date }[] = [];
  const ahora = Date.now();
  const recorrer = (dir: string) => {
    let entradas;
    try { entradas = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entradas) {
      const ruta = join(dir, e.name);
      if (e.isDirectory()) recorrer(ruta);
      else if (e.isFile() && filtro(e.name)) {
        const s = statSync(ruta);
        if (ahora - s.mtimeMs < DIEZ_MINUTOS) continue;
        salida.push({ ruta, tamano: s.size, mtime: s.mtime });
      }
    }
  };
  recorrer(raiz);
  return salida;
}
```

- [ ] **Paso 3: crear `src/fuentes/claude-code.ts`**

Reglas confirmadas con registros reales el 2026-09-26:
- `message.usage` se **repite** en varias líneas con el mismo `message.id`. Los tokens se cuentan **una vez por id**, pero los bloques `tool_use` se cuentan en **todas** las líneas, porque cada línea trae bloques distintos.
- El razonamiento está en `effort` (low, medium, high, xhigh o max).
- Las compactaciones son las líneas `type: "system"` con `subtype: "compact_boundary"`.
- El tiempo activo se suma de `subtype: "turn_duration"` (`durationMs`).
- Los subagentes viven en `<sesión>/subagents/*.jsonl`.

```ts
import { readFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { agregarTramo, tokensCero, sumar, type SesionLeida, type Tramo, type Tokens } from "../esquemas/sesion";

type Linea = Record<string, unknown>;
const texto = (v: unknown): string | null => (typeof v === "string" ? v : null);

function textoDeContenido(c: unknown): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((x) => (x && typeof x === "object" && (x as Linea).type === "text" ? String((x as Linea).text ?? "") : "")).join("\n").trim();
  return "";
}

export function leerClaude(a: { ruta: string; tamano: number; mtime: Date }): SesionLeida | null {
  const partes = a.ruta.split("/");
  const esSub = partes.includes("subagents");
  const sesionId = basename(a.ruta, ".jsonl");
  const padreId = esSub ? basename(dirname(dirname(a.ruta))) : null;

  let version: string | null = null, carpeta: string | null = null, rama: string | null = null;
  let inicio: number | null = null, fin: number | null = null, ms = 0, hayDuracion = false;
  let compactaciones = 0, herramientas = 0, mcp = 0, invalidas = 0;
  let primerPrompt: string | null = null, reporteFinal: string | null = null;
  const vistos = new Set<string>();
  const tramos = new Map<string, Tramo>();
  let total: Tokens = tokensCero();

  for (const cruda of readFileSync(a.ruta, "utf8").split("\n")) {
    if (!cruda.trim()) continue;
    let o: Linea;
    try { o = JSON.parse(cruda) as Linea; } catch { invalidas++; continue; }
    version ??= texto(o.version); carpeta ??= texto(o.cwd); rama ??= texto(o.gitBranch);
    const ts = texto(o.timestamp);
    if (ts) { const t = Date.parse(ts); if (!Number.isNaN(t)) { inicio = inicio === null ? t : Math.min(inicio, t); fin = fin === null ? t : Math.max(fin, t); } }

    if (o.type === "system" && o.subtype === "compact_boundary") compactaciones++;
    if (o.type === "system" && o.subtype === "turn_duration" && typeof o.durationMs === "number") { ms += o.durationMs; hayDuracion = true; }

    if (o.type === "user" && primerPrompt === null && o.isMeta !== true) {
      const m = o.message as Linea | undefined;
      const t = textoDeContenido(m?.content);
      if (t && !t.startsWith("<")) primerPrompt = t;
    }

    if (o.type === "assistant") {
      const m = (o.message ?? {}) as Linea;
      const contenido = Array.isArray(m.content) ? (m.content as Linea[]) : [];
      for (const b of contenido) {
        if (b.type === "tool_use") { herramientas++; if (String(b.name ?? "").startsWith("mcp__")) mcp++; }
        if (b.type === "text" && typeof b.text === "string" && b.text.trim()) reporteFinal = b.text;
      }
      const id = texto(m.id);
      const modelo = (texto(m.model) ?? "desconocido").replace(/\[.*\]$/, "");
      if (!id || vistos.has(id) || modelo === "<synthetic>") continue;
      vistos.add(id);
      const u = (m.usage ?? {}) as Linea;
      const cc = (u.cache_creation ?? {}) as Linea;
      const n = (v: unknown) => (typeof v === "number" ? v : 0);
      const t: Tokens = {
        entradaNuevos: n(u.input_tokens), cacheLectura: n(u.cache_read_input_tokens),
        cacheEscritura: n(u.cache_creation_input_tokens), cacheEscritura1h: n(cc.ephemeral_1h_input_tokens),
        salida: n(u.output_tokens), razonamiento: 0,
      };
      total = sumar(total, t);
      agregarTramo(tramos, modelo, texto(o.effort) ?? "predeterminado", t, 1);
    }
  }
  if (inicio === null && vistos.size === 0) return null;
  return {
    herramienta: "claude-code", sesionId, padreId, esSubagente: esSub, version, carpeta, rama,
    inicio: inicio === null ? null : new Date(inicio), fin: fin === null ? null : new Date(fin),
    minutosActivos: hayDuracion ? Math.round((ms / 60000) * 100) / 100 : null,
    mensajes: vistos.size, llamadasHerramientas: herramientas, llamadasMcp: mcp, compactaciones,
    tokens: total, tramos: [...tramos.values()], costoHerramientaUsd: null, costoEsReal: false, porcentajeLimite: null,
    primerPrompt, reporteFinal, registro: a, lineasInvalidas: invalidas,
  };
}
```

Nota: en Claude, `output_tokens` ya incluye el razonamiento y el registro no lo separa, así que `razonamiento` queda en 0 para Claude.

- [ ] **Paso 4: probar con una sesión real (solo lectura)**

```bash
rtk bun -e 'import("./src/fuentes/claude-code.ts").then(async m=>{const {listarArchivos}=await import("./src/fuentes/archivos.ts");const fs=listarArchivos(process.env.HOME+"/.claude/projects",n=>n.endsWith(".jsonl"));console.log("archivos",fs.length);const s=m.leerClaude(fs.sort((a,b)=>b.tamano-a.tamano)[0]!);console.log({...s,primerPrompt:s?.primerPrompt?.slice(0,80),reporteFinal:s?.reporteFinal?.slice(0,80)})})'
```

Resultado esperado:
- cientos de archivos;
- una sesión con `mensajes > 0`;
- `tramos` con modelos reales (por ejemplo `claude-opus-5-5`) y razonamiento distinto de `predeterminado`;
- `lineasInvalidas: 0`;
- `compactaciones >= 0`.

Confirma además que ningún tramo tiene el modelo `<synthetic>`.

- [ ] **Paso 5: typecheck y commit**

```bash
rtk bun run typecheck && rtk git add -A && rtk git commit -m "feat: forma común de sesión y lector de Claude Code"
```

---

### Tarea 8: lector de Codex

**Archivos:**
- Crear: `src/fuentes/codex.ts`

**Interfaces:**
- Consume: `SesionLeida`, `agregarTramo`, `tokensCero`
- Produce: `leerCodex(archivo): SesionLeida | null`

Reglas confirmadas con registros reales el 2026-09-26 (Codex 0.157.0):
- `event_msg/token_count.info.total_token_usage` es **acumulado** en toda la sesión; se toma el último.
- `input_tokens` **incluye** `cached_input_tokens`, y `output_tokens` **incluye** `reasoning_output_tokens` (`total_tokens = input + output`). Por eso: entrada nueva = input − cached.
- El modelo y el razonamiento vienen de `turn_context` (`model`, `effort`). Cada tramo se reparte por diferencia entre acumulados.
- Compactaciones: líneas `type: "compacted"`.
- % de límite: `rate_limits.primary.used_percent`, el último.
- Reporte: `event_msg/task_complete.last_agent_message`. Tiempo: suma de `duration_ms`.

- [ ] **Paso 1: crear `src/fuentes/codex.ts`**

```ts
import { readFileSync } from "node:fs";
import { agregarTramo, tokensCero, type SesionLeida, type Tramo, type Tokens } from "../esquemas/sesion";

type Linea = Record<string, unknown>;
const n = (v: unknown) => (typeof v === "number" ? v : 0);
const s = (v: unknown): string | null => (typeof v === "string" ? v : null);

function aTokens(u: Linea | undefined): Tokens {
  const entrada = n(u?.input_tokens), cache = n(u?.cached_input_tokens);
  return { entradaNuevos: Math.max(entrada - cache, 0), cacheLectura: cache, cacheEscritura: n(u?.cache_write_input_tokens),
    cacheEscritura1h: 0, salida: n(u?.output_tokens), razonamiento: n(u?.reasoning_output_tokens) };
}
const restar = (a: Tokens, b: Tokens): Tokens => ({
  entradaNuevos: a.entradaNuevos - b.entradaNuevos, cacheLectura: a.cacheLectura - b.cacheLectura,
  cacheEscritura: a.cacheEscritura - b.cacheEscritura, cacheEscritura1h: 0, salida: a.salida - b.salida,
  razonamiento: a.razonamiento - b.razonamiento,
});

export function leerCodex(a: { ruta: string; tamano: number; mtime: Date }): SesionLeida | null {
  let sesionId: string | null = null, version: string | null = null, carpeta: string | null = null;
  let modelo = "desconocido", esfuerzo = "predeterminado";
  let inicio: number | null = null, fin: number | null = null, ms = 0, hayDuracion = false;
  let compactaciones = 0, herramientas = 0, mcp = 0, mensajes = 0, invalidas = 0;
  let limite: number | null = null, primerPrompt: string | null = null, reporteFinal: string | null = null;
  let anterior: Tokens = tokensCero(), total: Tokens = tokensCero();
  const tramos = new Map<string, Tramo>();

  for (const cruda of readFileSync(a.ruta, "utf8").split("\n")) {
    if (!cruda.trim()) continue;
    let o: Linea;
    try { o = JSON.parse(cruda) as Linea; } catch { invalidas++; continue; }
    const ts = s(o.timestamp);
    if (ts) { const t = Date.parse(ts); if (!Number.isNaN(t)) { inicio = inicio === null ? t : Math.min(inicio, t); fin = fin === null ? t : Math.max(fin, t); } }
    const p = (o.payload && typeof o.payload === "object" ? o.payload : {}) as Linea;

    if (o.type === "session_meta") { sesionId = s(p.id) ?? s(p.session_id); version = s(p.cli_version); carpeta = s(p.cwd); }
    else if (o.type === "turn_context") { modelo = s(p.model) ?? modelo; esfuerzo = s(p.effort) ?? esfuerzo; }
    else if (o.type === "compacted") compactaciones++;
    else if (o.type === "response_item") {
      const tipo = s(p.type);
      if (tipo === "function_call" || tipo === "custom_tool_call" || tipo === "local_shell_call") {
        herramientas++; if (String(p.name ?? "").startsWith("mcp__")) mcp++;
      }
      if (tipo === "message" && p.role === "assistant") mensajes++;
      if (tipo === "message" && p.role === "user" && primerPrompt === null && Array.isArray(p.content)) {
        const t = (p.content as Linea[]).map((c) => s(c.text) ?? "").join("\n").trim();
        if (t && !t.startsWith("<")) primerPrompt = t;
      }
    } else if (o.type === "event_msg") {
      const tipo = s(p.type);
      if (tipo === "mcp_tool_call_end") mcp++;
      if (tipo === "token_count" && p.info && typeof p.info === "object") {
        const acum = aTokens((p.info as Linea).total_token_usage as Linea | undefined);
        agregarTramo(tramos, modelo, esfuerzo, restar(acum, anterior), 0);
        anterior = acum; total = acum;
        const rl = (p.rate_limits ?? {}) as Linea;
        const prim = (rl.primary ?? {}) as Linea;
        if (typeof prim.used_percent === "number") limite = prim.used_percent;
      }
      if (tipo === "task_complete") {
        reporteFinal = s(p.last_agent_message) ?? reporteFinal;
        if (typeof p.duration_ms === "number") { ms += p.duration_ms; hayDuracion = true; }
      }
    }
  }
  if (!sesionId) return null;
  return {
    herramienta: "codex", sesionId, padreId: null, esSubagente: false, version, carpeta, rama: null,
    inicio: inicio === null ? null : new Date(inicio), fin: fin === null ? null : new Date(fin),
    minutosActivos: hayDuracion ? Math.round((ms / 60000) * 100) / 100 : null,
    mensajes, llamadasHerramientas: herramientas, llamadasMcp: mcp, compactaciones,
    tokens: total, tramos: [...tramos.values()].filter((t) => t.tokens.salida + t.tokens.entradaNuevos + t.tokens.cacheLectura > 0),
    costoHerramientaUsd: null, costoEsReal: false, porcentajeLimite: limite,
    primerPrompt, reporteFinal, registro: a, lineasInvalidas: invalidas,
  };
}
```

- [ ] **Paso 2: probar con una sesión real**

```bash
rtk bun -e 'import("./src/fuentes/codex.ts").then(async m=>{const {listarArchivos}=await import("./src/fuentes/archivos.ts");const fs=listarArchivos(process.env.HOME+"/.codex/sessions",n=>n.startsWith("rollout-")&&n.endsWith(".jsonl"));console.log("archivos",fs.length);const s=m.leerCodex(fs[0]!);console.log({...s,primerPrompt:s?.primerPrompt?.slice(0,80),reporteFinal:s?.reporteFinal?.slice(0,80)})})'
```

Resultado esperado:
- `sesionId` presente y `version` del estilo `0.157.0`;
- tramo con `gpt-5.6-terra` y razonamiento `medium` o el que corresponda;
- la suma de los tramos igual a `tokens`;
- `porcentajeLimite` numérico si la sesión lo trae.

- [ ] **Paso 3: typecheck y commit**

```bash
rtk bun run typecheck && rtk git add -A && rtk git commit -m "feat: lector de Codex"
```

---

### Tarea 9: lector de OpenCode (copia temporal de su base)

**Archivos:**
- Crear: `src/fuentes/opencode.ts`

**Interfaces:**
- Produce: `leerOpenCode(desdeMs: number): SesionLeida[]` (sesiones con `time_updated > desdeMs` y quietas hace más de 10 minutos)

Reglas confirmadas el 2026-09-26 (OpenCode 2.0.10):
- `session_v2` trae totales (`tokens_*`, `cost`, `version`, `directory`, `parent_id`, tiempos en ms).
- `session_message.data` es JSON:
  - los mensajes del agente traen `model: { id, providerID, variant }`, `tokens: { input, output, reasoning, cache: { read, write } }` y `cost`;
  - los mensajes del usuario traen `text`.
- `providerID = "opencode-go"` es suscripción: el costo reportado es una valoración a precio de lista, así que va a costo equivalente. `providerID = "opencode"` (Zen) es de pago por uso: va a costo real.

- [ ] **Paso 1: crear `src/fuentes/opencode.ts`**

```ts
import { Database } from "bun:sqlite";
import { copyFileSync, existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { agregarTramo, tokensCero, sumar, type SesionLeida, type Tramo, type Tokens } from "../esquemas/sesion";

const ORIGEN = join(process.env.HOME ?? "", ".local/share/opencode/opencode.db");
const DIEZ_MINUTOS = 10 * 60 * 1000;
type Fila = Record<string, unknown>;
const n = (v: unknown) => (typeof v === "number" ? v : 0);
const s = (v: unknown): string | null => (typeof v === "string" ? v : null);

export function leerOpenCode(desdeMs: number): SesionLeida[] {
  if (!existsSync(ORIGEN)) return [];
  const dir = mkdtempSync(join(tmpdir(), "model-ledger-oc-"));
  try {
    for (const suf of ["", "-wal", "-shm"]) if (existsSync(ORIGEN + suf)) copyFileSync(ORIGEN + suf, join(dir, "oc.db" + suf));
    const db = new Database(join(dir, "oc.db"), { readonly: true });
    const limite = Date.now() - DIEZ_MINUTOS;
    // SOLO session_v2 y session_message. Nunca otras tablas: contienen tokens de acceso.
    const sesiones = db.query(`select id, parent_id, directory, version, cost, time_created, time_updated, time_compacting
      from session_v2 where time_updated > ? and time_updated < ?`).all(desdeMs, limite) as Fila[];
    const mensajesDe = db.query(`select type, data from session_message where session_id = ? order by seq`);
    const salida: SesionLeida[] = [];
    for (const f of sesiones) {
      const tramos = new Map<string, Tramo>();
      let total: Tokens = tokensCero(), mensajes = 0, herramientas = 0, mcp = 0, compactaciones = 0, invalidas = 0;
      let costoGo = 0, costoZen = 0, primerPrompt: string | null = null, reporteFinal: string | null = null;
      for (const m of mensajesDe.all(String(f.id)) as Fila[]) {
        let d: Fila;
        try { d = JSON.parse(String(m.data)) as Fila; } catch { invalidas++; continue; }
        if (String(m.type).includes("compact")) compactaciones++;
        if (primerPrompt === null && typeof d.text === "string" && d.text.trim()) primerPrompt = d.text;
        const modelo = d.model as Fila | undefined;
        if (modelo && d.tokens && typeof d.tokens === "object") {
          mensajes++;
          const tk = d.tokens as Fila, cache = (tk.cache ?? {}) as Fila;
          const t: Tokens = { entradaNuevos: n(tk.input), cacheLectura: n(cache.read), cacheEscritura: n(cache.write),
            cacheEscritura1h: 0, salida: n(tk.output) + n(tk.reasoning), razonamiento: n(tk.reasoning) };
          total = sumar(total, t);
          const proveedor = s(modelo.providerID) ?? "desconocido";
          agregarTramo(tramos, `${proveedor}/${s(modelo.id) ?? "desconocido"}`, s(modelo.variant) ?? "predeterminado", t, 1);
          if (proveedor === "opencode-go") costoGo += n(d.cost); else costoZen += n(d.cost);
          if (Array.isArray(d.content)) for (const c of d.content as Fila[]) {
            const tipo = String(c.type ?? "");
            if (tipo.includes("tool")) { herramientas++; if (String(c.name ?? c.tool ?? "").startsWith("mcp")) mcp++; }
            if (tipo === "text" && typeof c.text === "string" && c.text.trim()) reporteFinal = c.text;
          }
        }
      }
      salida.push({
        herramienta: "opencode", sesionId: String(f.id), padreId: s(f.parent_id), esSubagente: f.parent_id != null,
        version: s(f.version), carpeta: s(f.directory), rama: null,
        inicio: new Date(n(f.time_created)), fin: new Date(n(f.time_updated)), minutosActivos: null,
        mensajes, llamadasHerramientas: herramientas, llamadasMcp: mcp, compactaciones,
        tokens: total, tramos: [...tramos.values()],
        costoHerramientaUsd: costoZen > 0 ? costoZen : costoGo > 0 ? costoGo : null, costoEsReal: costoZen > 0,
        porcentajeLimite: null, primerPrompt, reporteFinal,
        registro: { ruta: `${ORIGEN}#${String(f.id)}`, tamano: statSync(ORIGEN).size, mtime: new Date(n(f.time_updated)) },
        lineasInvalidas: invalidas,
      });
    }
    db.close();
    return salida;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
```

- [ ] **Paso 2: probar con las sesiones de prueba del 2026-09-26**

```bash
rtk bun -e 'import("./src/fuentes/opencode.ts").then(m=>{const r=m.leerOpenCode(0);console.log(r.length);console.log(r.map(x=>({id:x.sesionId,tramos:x.tramos,costo:x.costoHerramientaUsd,real:x.costoEsReal})))})'
```

Resultado esperado: al menos 3 sesiones, entre ellas una con tramo `opencode-go/deepseek-v4.1-flash`, costo cercano a `0.00126` y `real: false`.
- Si las llamadas a herramientas salen en 0 en una sesión que sí usó herramientas, abre esa sesión con `rtk opencode session export <id>`, mira el nombre real del tipo de bloque y ajusta **solo** la condición `tipo.includes("tool")`.

- [ ] **Paso 3: typecheck y commit**

```bash
rtk bun run typecheck && rtk git add -A && rtk git commit -m "feat: lector de OpenCode desde una copia de su base"
```

---

### Tarea 10: guardar sesiones y copiar Notion

**Archivos:**
- Crear: `src/almacen/sesiones.ts`, `src/fuentes/notion.ts`, `src/almacen/notion.ts`

**Interfaces:**
- Consume: `SesionLeida`, `limpiarTexto`, `precioVigente`, `maquina`, `configNotion`
- Produce:
  - `yaGuardada(sql, id, tamano, mtime): Promise<boolean>`
  - `guardarSesion(sql, s: SesionLeida): Promise<"nueva" | "actualizada">`
  - `leerNotion(dsId: string, desde: string | null): Promise<PaginaNotion[]>`
  - `guardarCorridas(sql, paginas, c)`
  - `guardarLecciones(sql, paginas, c)`
  - `enlazarCorridas(sql, c)`

- [ ] **Paso 1: crear `src/almacen/sesiones.ts`**

Costo equivalente:
- Claude usa `anthropic/<modelo>` y Codex usa `openai/<modelo>` en `precios`.
- Escritura de caché de 1 hora = 2 × precio de entrada (regla oficial de Anthropic). El resto de la escritura usa `cache_escritura`.
- Codex no aplica el tramo de más de 272 000 tokens de contexto: es una estimación y así queda.
- OpenCode usa su propio costo reportado.

```ts
import type { Sql } from "./db";
import { maquina } from "../config";
import { limpiarTexto } from "../limpieza/secretos";
import { precioVigente, type Precio } from "./catalogo";
import type { SesionLeida, Tokens, Tramo } from "../esquemas/sesion";

// Se consulta ANTES de leer el archivo: si la ruta ya está guardada con el mismo tamaño y fecha, no se vuelve a leer.
export async function yaGuardada(sql: Sql, ruta: string, tamano: number, mtime: Date): Promise<boolean> {
  const [r] = await sql<{ ok: boolean }[]>`select (registro_tamano = ${tamano} and registro_mtime = ${mtime}) as ok
    from sesiones where registro_ruta = ${ruta} limit 1`;
  return r?.ok === true;
}

function costo(p: Precio | null, t: Tokens): number | null {
  if (!p || p.entrada === null || p.salida === null) return null;
  const normal = Math.max(t.cacheEscritura - t.cacheEscritura1h, 0);
  return (t.entradaNuevos * p.entrada + t.cacheLectura * (p.cacheLectura ?? p.entrada) + normal * (p.cacheEscritura ?? p.entrada)
    + t.cacheEscritura1h * p.entrada * 2 + t.salida * p.salida) / 1_000_000;
}

const proveedorDe = { "claude-code": "anthropic", codex: "openai", opencode: null } as const;

export async function guardarSesion(sql: Sql, s: SesionLeida): Promise<"nueva" | "actualizada"> {
  const id = `${s.herramienta}:${s.sesionId}`;
  const prompt = limpiarTexto(s.primerPrompt), reporte = limpiarTexto(s.reporteFinal);
  const prov = proveedorDe[s.herramienta];
  const tramos: (Tramo & { costo: number | null })[] = [];
  let equivalente: number | null = s.costoEsReal ? null : s.costoHerramientaUsd;
  if (prov) {
    let suma = 0, completo = s.tramos.length > 0;
    for (const t of s.tramos) {
      const c = costo(await precioVigente(sql, `${prov}/${t.modelo}`), t.tokens);
      tramos.push({ ...t, costo: c });
      if (c === null) completo = false; else suma += c;
    }
    equivalente = completo ? suma : null;
  } else for (const t of s.tramos) tramos.push({ ...t, costo: null });

  return await sql.begin(async (tx) => {
    const [r] = await tx<{ nuevo: boolean }[]>`
      insert into sesiones (id, herramienta, sesion_id, padre_id, es_subagente, version_herramienta, maquina, carpeta, rama,
        inicio, fin, minutos_activos, mensajes, llamadas_herramientas, llamadas_mcp, compactaciones,
        tokens_entrada_nuevos, tokens_cache_lectura, tokens_cache_escritura, tokens_salida, tokens_razonamiento,
        costo_equivalente_usd, costo_real_usd, porcentaje_limite, primer_prompt, reporte_final, texto_recortado,
        registro_ruta, registro_tamano, registro_mtime)
      values (${id}, ${s.herramienta}, ${s.sesionId}, ${s.padreId}, ${s.esSubagente}, ${s.version}, ${maquina()}, ${s.carpeta}, ${s.rama},
        ${s.inicio}, ${s.fin}, ${s.minutosActivos}, ${s.mensajes}, ${s.llamadasHerramientas}, ${s.llamadasMcp}, ${s.compactaciones},
        ${s.tokens.entradaNuevos}, ${s.tokens.cacheLectura}, ${s.tokens.cacheEscritura}, ${s.tokens.salida}, ${s.tokens.razonamiento},
        ${equivalente}, ${s.costoEsReal ? s.costoHerramientaUsd : null}, ${s.porcentajeLimite}, ${prompt.texto}, ${reporte.texto},
        ${prompt.recortado || reporte.recortado}, ${s.registro.ruta}, ${s.registro.tamano}, ${s.registro.mtime})
      on conflict (id) do update set version_herramienta = excluded.version_herramienta, fin = excluded.fin,
        minutos_activos = excluded.minutos_activos, mensajes = excluded.mensajes, llamadas_herramientas = excluded.llamadas_herramientas,
        llamadas_mcp = excluded.llamadas_mcp, compactaciones = excluded.compactaciones,
        tokens_entrada_nuevos = excluded.tokens_entrada_nuevos, tokens_cache_lectura = excluded.tokens_cache_lectura,
        tokens_cache_escritura = excluded.tokens_cache_escritura, tokens_salida = excluded.tokens_salida,
        tokens_razonamiento = excluded.tokens_razonamiento, costo_equivalente_usd = excluded.costo_equivalente_usd,
        costo_real_usd = excluded.costo_real_usd, porcentaje_limite = excluded.porcentaje_limite,
        primer_prompt = excluded.primer_prompt, reporte_final = excluded.reporte_final, texto_recortado = excluded.texto_recortado,
        registro_tamano = excluded.registro_tamano, registro_mtime = excluded.registro_mtime, actualizado_en = now()
      returning (xmax = 0) as nuevo`;
    await tx`delete from sesion_modelos where sesion_id = ${id}`;
    for (const t of tramos) {
      await tx`insert into sesion_modelos (sesion_id, modelo, razonamiento, mensajes, tokens_entrada_nuevos, tokens_cache_lectura,
          tokens_cache_escritura, tokens_salida, tokens_razonamiento, costo_equivalente_usd)
        values (${id}, ${t.modelo}, ${t.razonamiento}, ${t.mensajes}, ${t.tokens.entradaNuevos}, ${t.tokens.cacheLectura},
          ${t.tokens.cacheEscritura}, ${t.tokens.salida}, ${t.tokens.razonamiento}, ${t.costo})`;
    }
    return r?.nuevo ? "nueva" : "actualizada";
  });
}
```

- [ ] **Paso 2: crear `src/fuentes/notion.ts`**

Convierte cada propiedad a un valor simple: texto, número, booleano, fecha ISO o lista de textos.

```ts
import { Client } from "@notionhq/client";
import { configNotion } from "../config";

export type PaginaNotion = { id: string; editado: string; propiedades: Record<string, unknown> };
type Prop = Record<string, unknown> & { type: string };

function aPlano(p: Prop): unknown {
  const v = p[p.type] as unknown;
  switch (p.type) {
    case "title": case "rich_text": return Array.isArray(v) ? v.map((x) => (x as { plain_text?: string }).plain_text ?? "").join("") : null;
    case "number": case "checkbox": case "url": case "email": case "created_time": case "last_edited_time": return v ?? null;
    case "select": case "status": return (v as { name?: string } | null)?.name ?? null;
    case "multi_select": return Array.isArray(v) ? v.map((x) => (x as { name?: string }).name ?? "") : [];
    case "date": return (v as { start?: string } | null)?.start ?? null;
    default: return null;
  }
}

export async function leerNotion(dsId: string, desde: string | null): Promise<PaginaNotion[]> {
  const notion = new Client({ auth: configNotion().token });
  const salida: PaginaNotion[] = [];
  let cursor: string | undefined;
  do {
    const r = await notion.dataSources.query({
      data_source_id: dsId, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}),
      ...(desde ? { filter: { timestamp: "last_edited_time", last_edited_time: { on_or_after: desde } } } : {}),
    });
    for (const pag of r.results) {
      if (!("properties" in pag)) continue;
      const props: Record<string, unknown> = {};
      for (const [nombre, p] of Object.entries(pag.properties)) props[nombre] = aPlano(p as Prop);
      salida.push({ id: pag.id, editado: pag.last_edited_time, propiedades: props });
    }
    cursor = r.has_more && r.next_cursor ? r.next_cursor : undefined;
  } while (cursor);
  return salida;
}
```

- [ ] **Paso 3: crear `src/almacen/notion.ts`**

```ts
import type { Sql } from "./db";
import type { Contador } from "./ejecuciones";
import type { PaginaNotion } from "../fuentes/notion";

const t = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown) => (typeof v === "number" ? v : null);

export async function guardarCorridas(sql: Sql, paginas: PaginaNotion[], c: Contador): Promise<void> {
  for (const p of paginas) {
    c.leidos++;
    const x = p.propiedades;
    const [r] = await sql<{ nuevo: boolean }[]>`
      insert into corridas (notion_id, nombre, etiqueta, proyecto, herramienta, modelo, razonamiento, ronda, resultado,
        archivo_registro, inicio, propiedades, editado_en_notion)
      values (${p.id}, ${t(x["Nombre"])}, ${t(x["Etiqueta"])}, ${t(x["Proyecto"])}, ${t(x["Herramienta"])}, ${t(x["Modelo"])},
        ${t(x["Razonamiento"])}, ${num(x["Ronda"])}, ${t(x["Resultado"])}, ${t(x["Archivo de registro"])}, ${t(x["Inicio"])},
        ${sql.json(x as never)}, ${p.editado})
      on conflict (notion_id) do update set nombre = excluded.nombre, etiqueta = excluded.etiqueta, proyecto = excluded.proyecto,
        herramienta = excluded.herramienta, modelo = excluded.modelo, razonamiento = excluded.razonamiento, ronda = excluded.ronda,
        resultado = excluded.resultado, archivo_registro = excluded.archivo_registro, inicio = excluded.inicio,
        propiedades = excluded.propiedades, editado_en_notion = excluded.editado_en_notion, actualizado_en = now()
      returning (xmax = 0) as nuevo`;
    if (r?.nuevo) c.nuevos++; else c.actualizados++;
  }
}

export async function guardarLecciones(sql: Sql, paginas: PaginaNotion[], c: Contador): Promise<void> {
  for (const p of paginas) {
    c.leidos++;
    const x = p.propiedades;
    const [r] = await sql<{ nuevo: boolean }[]>`
      insert into lecciones (notion_id, leccion, tipo, estado, muestras, propiedades, editado_en_notion)
      values (${p.id}, ${t(x["Lección"])}, ${t(x["Tipo"])}, ${t(x["Estado"])}, ${num(x["Muestras"])}, ${sql.json(x as never)}, ${p.editado})
      on conflict (notion_id) do update set leccion = excluded.leccion, tipo = excluded.tipo, estado = excluded.estado,
        muestras = excluded.muestras, propiedades = excluded.propiedades, editado_en_notion = excluded.editado_en_notion, actualizado_en = now()
      returning (xmax = 0) as nuevo`;
    if (r?.nuevo) c.nuevos++; else c.actualizados++;
  }
}

const HERRAMIENTA: Record<string, string> = { "Claude Code": "claude-code", Codex: "codex", OpenCode: "opencode" };

// Enlaza solo cuando hay exactamente UNA sesión candidata. Nunca adivina.
export async function enlazarCorridas(sql: Sql, c: Contador): Promise<void> {
  const pendientes = await sql<{ notion_id: string; archivo_registro: string | null; etiqueta: string | null; herramienta: string | null; inicio: Date | null }[]>`
    select notion_id, archivo_registro, etiqueta, herramienta, inicio from corridas where sesion_id is null`;
  let sinEnlace = 0;
  for (const p of pendientes) {
    let candidatos: { id: string }[] = [];
    const archivo = p.archivo_registro?.match(/[\w.-]+\.jsonl/)?.[0];
    if (archivo) candidatos = await sql<{ id: string }[]>`select id from sesiones where registro_ruta like ${"%/" + archivo} limit 2`;
    else if (p.etiqueta && p.herramienta && HERRAMIENTA[p.herramienta] && p.inicio) {
      candidatos = await sql<{ id: string }[]>`select id from sesiones where herramienta = ${HERRAMIENTA[p.herramienta]!}
        and primer_prompt like ${p.etiqueta.replace(/[%_]/g, "") + "%"}
        and inicio between ${p.inicio}::timestamptz - interval '12 hours' and ${p.inicio}::timestamptz + interval '12 hours' limit 2`;
    }
    if (candidatos.length === 1) { await sql`update corridas set sesion_id = ${candidatos[0]!.id} where notion_id = ${p.notion_id}`; c.actualizados++; }
    else sinEnlace++;
  }
  if (sinEnlace > 0) c.error(`${sinEnlace} corridas sin sesión enlazada (sin «Archivo de registro» o con varias candidatas)`);
}
```

- [ ] **Paso 4: probar la copia de Notion**

```bash
rtk bun -e 'import("./src/fuentes/notion.ts").then(async m=>{const {configNotion}=await import("./src/config.ts");const r=await m.leerNotion(configNotion().corridasDs,null);console.log(r.length, Object.keys(r[0]!.propiedades).length, r[0]!.propiedades["Origen de la corrección"])})'
```

Resultado esperado: 78 corridas o más, más de 60 propiedades por página, y `Origen de la corrección` como una lista.
- **Si da `object_not_found` o `unauthorized`**, la integración no tiene acceso a la página «Forge614 · Laboratorio de agentes». Detente y avísale al propietario (Puesta en marcha, paso D).

- [ ] **Paso 5: typecheck y commit**

```bash
rtk bun run typecheck && rtk git add -A && rtk git commit -m "feat: guardado de sesiones y copia de Notion con enlace a sesiones"
```

---

### Tarea 11: comandos `cada-hora` y `carga-inicial`, y launchd

**Archivos:**
- Crear: `src/comandos/cada-hora.ts`, `src/comandos/carga-inicial.ts`, `scripts/instalar-launchd.sh`

**Interfaces:**
- Consume: todo lo anterior

- [ ] **Paso 1: crear `src/comandos/cada-hora.ts`**

```ts
import { conectar } from "../almacen/db";
import { conEjecucion } from "../almacen/ejecuciones";
import { guardarSesion, yaGuardada } from "../almacen/sesiones";
import { guardarCorridas, guardarLecciones, enlazarCorridas } from "../almacen/notion";
import { listarArchivos } from "../fuentes/archivos";
import { leerClaude } from "../fuentes/claude-code";
import { leerCodex } from "../fuentes/codex";
import { leerOpenCode } from "../fuentes/opencode";
import { leerNotion } from "../fuentes/notion";
import { configNotion } from "../config";
import type { SesionLeida } from "../esquemas/sesion";
import type { Sql } from "../almacen/db";
import type { Contador } from "../almacen/ejecuciones";

const HOME = process.env.HOME ?? "";

async function procesar(sql: Sql, c: Contador, s: SesionLeida | null, ruta: string) {
  if (!s) return;
  if (s.lineasInvalidas > 0) c.error(`${s.lineasInvalidas} líneas inválidas en ${ruta}`);
  try { (await guardarSesion(sql, s)) === "nueva" ? c.nuevos++ : c.actualizados++; }
  catch (e) { c.error(`${ruta}: ${e instanceof Error ? e.message : String(e)}`); }
}

async function archivos(sql: Sql, c: Contador, herramienta: "claude-code" | "codex") {
  const lista = herramienta === "claude-code"
    ? listarArchivos(`${HOME}/.claude/projects`, (n) => n.endsWith(".jsonl"))
    : listarArchivos(`${HOME}/.codex/sessions`, (n) => n.startsWith("rollout-") && n.endsWith(".jsonl"));
  for (const a of lista) {
    c.leidos++;
    if (await yaGuardada(sql, a.ruta, a.tamano, a.mtime)) continue;   // sin cambios desde la última vez
    let s: SesionLeida | null;
    try { s = herramienta === "claude-code" ? leerClaude(a) : leerCodex(a); }
    catch (e) { c.error(`${a.ruta}: ${e instanceof Error ? e.message : String(e)}`); continue; }
    await procesar(sql, c, s, a.ruta);
  }
}

async function leerEstado(sql: Sql, clave: string) { const [r] = await sql<{ valor: string }[]>`select valor from estado where clave = ${clave}`; return r?.valor ?? null; }
async function escribirEstado(sql: Sql, clave: string, valor: string) {
  await sql`insert into estado (clave, valor) values (${clave}, ${valor}) on conflict (clave) do update set valor = excluded.valor, actualizado_en = now()`;
}

const sql = conectar();
let codigo = 0;
try {
  const [candado] = await sql<{ ok: boolean }[]>`select pg_try_advisory_lock(614614) as ok`;
  if (!candado?.ok) { console.log("otra ejecución de cada-hora sigue corriendo; salgo sin hacer nada"); process.exit(0); }
  const pasos: [string, (c: Contador) => Promise<void>][] = [
    ["claude_code", (c) => archivos(sql, c, "claude-code")],
    ["codex", (c) => archivos(sql, c, "codex")],
    ["opencode", async (c) => {
      const desde = Number((await leerEstado(sql, "opencode_desde")) ?? "0");
      const lista = leerOpenCode(desde);
      let maximo = desde;
      for (const s of lista) { c.leidos++; await procesar(sql, c, s, s.registro.ruta); maximo = Math.max(maximo, s.registro.mtime.getTime()); }
      await escribirEstado(sql, "opencode_desde", String(maximo));
    }],
    ["notion", async (c) => {
      const cfg = configNotion();
      const desde = await leerEstado(sql, "notion_desde");
      const inicio = new Date().toISOString();
      await guardarCorridas(sql, await leerNotion(cfg.corridasDs, desde), c);
      await guardarLecciones(sql, await leerNotion(cfg.leccionesDs, desde), c);
      await enlazarCorridas(sql, c);
      await escribirEstado(sql, "notion_desde", inicio);
    }],
  ];
  for (const [fuente, trabajo] of pasos) await conEjecucion(sql, fuente, trabajo).catch(() => { codigo = 1; });
} finally {
  await sql.end();
}
process.exit(codigo);
```

- [ ] **Paso 2: comprobar el candado**

Abre dos terminales y corre `rtk bun run cada-hora` en las dos, casi al mismo tiempo. Resultado esperado: una de las dos imprime `otra ejecución de cada-hora sigue corriendo; salgo sin hacer nada`.

- [ ] **Paso 3: crear `src/comandos/carga-inicial.ts`**

La primera corrida de `cada-hora` ya lee todo el historial, porque Neon está vacía. Este comando solo encadena `migrar`, `diario` y `cada-hora` en orden, para el primer arranque.

```ts
for (const paso of ["migrar", "diario", "cada-hora"]) {
  console.log(`\n=== ${paso} ===`);
  const p = Bun.spawnSync(["bun", "run", paso], { stdout: "inherit", stderr: "inherit" });
  if (p.exitCode !== 0) { console.error(`${paso} terminó con error (${p.exitCode}); revisa la tabla ejecuciones`); process.exit(p.exitCode ?? 1); }
}
```

- [ ] **Paso 4: correr la carga inicial**

Ejecutar: `rtk bun run carga-inicial`. Puede tardar varios minutos, porque lee todo el historial.

Resultado esperado:
- `claude_code` con cientos de nuevos;
- `codex` con decenas o cientos;
- `opencode` con al menos 3;
- `notion` con 78 corridas o más y 60 lecciones o más.

Los errores pueden ser mayores que 0 solo por corridas sin enlace o líneas inválidas; el detalle queda en `ejecuciones.detalle_errores`.

Si Neon se cae a la mitad, se corre otra vez `rtk bun run cada-hora`: continúa donde quedó, sin duplicar.

- [ ] **Paso 5: crear `scripts/instalar-launchd.sh`**

```bash
#!/bin/zsh
# Instala la tarea de cada hora en esta Mac. Uso: rtk zsh scripts/instalar-launchd.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUN="$(command -v bun)"
PLIST="$HOME/Library/LaunchAgents/com.model-ledger.cada-hora.plist"
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.model-ledger.cada-hora</string>
  <key>ProgramArguments</key><array><string>$BUN</string><string>run</string><string>cada-hora</string></array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>StartInterval</key><integer>3600</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/model-ledger.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/model-ledger.log</string>
</dict></plist>
EOF
launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Tarea instalada. Registro: ~/Library/Logs/model-ledger.log"
```

**No lo ejecutes tú:** lo corre el propietario en la Puesta en marcha, paso H.

- [ ] **Paso 6: typecheck y commit**

```bash
rtk bun run typecheck && rtk git add -A && rtk git commit -m "feat: comandos cada-hora y carga-inicial, e instalador de launchd"
```

---

### Tarea 12: comando `verificar`

**Archivos:**
- Crear: `src/comandos/verificar.ts`

Compara los números que el orquestador **ya midió** en Notion (tokens totales, tokens de salida y mensajes, en corridas con sesión enlazada) contra lo que el recolector leyó de los registros. Es una comprobación **independiente**, porque las mediciones de Notion salieron de otros scripts. También muestra la salud de las últimas ejecuciones.

- [ ] **Paso 1: crear `src/comandos/verificar.ts`**

```ts
import { conectar } from "../almacen/db";

const sql = conectar();
try {
  const filas = await sql<{ nombre: string; sesion_id: string; notion_total: number | null; neon_total: string; notion_salida: number | null; neon_salida: string }[]>`
    select c.nombre, c.sesion_id,
      (c.propiedades->>'Tokens totales')::numeric as notion_total,
      (s.tokens_entrada_nuevos + s.tokens_cache_lectura + s.tokens_cache_escritura + s.tokens_salida) as neon_total,
      (c.propiedades->>'Tokens salida')::numeric as notion_salida, s.tokens_salida as neon_salida
    from corridas c join sesiones s on s.id = c.sesion_id
    where c.propiedades->>'Tokens totales' is not null
    order by c.editado_en_notion desc limit 40`;
  let malas = 0;
  for (const f of filas) {
    const a = Number(f.notion_total), b = Number(f.neon_total);
    const dif = a === 0 ? 0 : Math.abs(a - b) / a;
    const marca = dif <= 0.01 ? "OK " : "DIF";
    if (marca === "DIF") malas++;
    console.log(`${marca} ${(dif * 100).toFixed(2).padStart(6)}%  notion=${a}  neon=${b}  ${f.nombre}`);
  }
  console.log(`\n${filas.length} corridas comparadas; ${malas} con diferencia mayor a 1 %`);
  const salud = await sql`select fuente, max(inicio) as ultima, sum(errores) as errores from ejecuciones
    where inicio > now() - interval '2 days' group by fuente order by fuente`;
  console.log("\nÚltimas ejecuciones (2 días):");
  for (const s of salud) console.log(`  ${s.fuente}: última ${s.ultima?.toISOString?.() ?? s.ultima}, errores ${s.errores}`);
} finally {
  await sql.end();
}
```

- [ ] **Paso 2: correrlo e interpretar**

Ejecutar: `rtk bun run verificar`. Resultado esperado: la mayoría `OK` (diferencia de 1 % o menos).

Por cada `DIF`:
- abre esa sesión con el lector de su herramienta (tareas 7 a 9, paso de prueba);
- compara con la nota de la corrida en Notion;
- reporta al propietario **qué lado cuenta distinto y por qué** (por ejemplo, si Notion sumó subagentes).

**No cambies los números de Notion.** Si el error es del lector, corrígelo, commitea y vuelve a correr `cada-hora` y `verificar`.

- [ ] **Paso 3: typecheck y commit**

```bash
rtk bun run typecheck && rtk git add -A && rtk git commit -m "feat: comando verificar contra las mediciones de Notion"
```

- [ ] **Paso 4: reporte final al propietario**

En lenguaje llano, sin pegar código:
- conteos por tabla: `select count(*)` de sesiones, sesion_modelos, corridas, lecciones, modelos, precios y notas_benchmark;
- cuántas corridas quedaron enlazadas;
- el resultado de `verificar`;
- lo que falta que haga él: pasos G y H de la Puesta en marcha.

---

## Puesta en marcha (lo que hace el propietario, guiado)

- **A. Crear el repositorio**, desde la terminal y en el Escritorio:
  ```bash
  rtk proxy sh -c 'cd ~/Desktop && gh repo create model-ledger --private --clone'
  ```
- **B. Abrir la sesión nueva** en `~/Desktop/model-ledger` y pegar el prompt que entrega el orquestador. La sesión construye la tarea 1 y se detiene en el paso 8.
- **C. Neon:** en console.neon.tech abre tu proyecto → **Connect** → copia la cadena de conexión (*connection string*) con la opción de conexiones agrupadas (*pooled*).
- **D. Notion:**
  1. En notion.so/profile/integrations → **Nueva integración** → tipo **Interna**, nombre `model-ledger` → copia el **token secreto de integración** (*Internal Integration Secret*).
  2. Abre la página «Forge614 · Laboratorio de agentes» → menú `···` → **Conexiones** → agrega `model-ledger`.
- **E. Artificial Analysis:** crea tu cuenta gratis en artificialanalysis.ai → sección de API → copia tu llave.
- **F. Llenar `.env`:** en `~/Desktop/model-ledger` corre:
  ```bash
  rtk cp .env.example .env && rtk chmod 600 .env && open -e .env
  ```
  Pega cada valor después de su `=`, guarda y cierra. Luego dile a la sesión «listo». **Nunca pegues los valores en ningún chat.**
- **G. Secretos de GitHub** para la tarea diaria. Cada comando te pide el valor sin mostrarlo:
  ```bash
  rtk proxy sh -c 'cd ~/Desktop/model-ledger && gh secret set NEON_DATABASE_URL && gh secret set ARTIFICIAL_ANALYSIS_API_KEY'
  ```
  Después: `rtk proxy sh -c 'cd ~/Desktop/model-ledger && git push -u origin HEAD && gh workflow run diario'`.
- **H. Activar la tarea de cada hora en tu Mac:**
  ```bash
  rtk proxy sh -c 'cd ~/Desktop/model-ledger && zsh scripts/instalar-launchd.sh'
  ```
  Para revisar que corre: `rtk tail -20 ~/Library/Logs/model-ledger.log`.
