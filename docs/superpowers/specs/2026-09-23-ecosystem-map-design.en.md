# forge614-ai — Visual ecosystem map

**Date:** 2026-09-23
**Status:** Draft for product owner review
**Governs:** the `tools/ecosystem-map/` folder of `forge614-ai`
**Sister translation:** `2026-09-23-mapa-del-ecosistema-design.md`
**Related decisions:** `0002` (delivery order), `0012` (forbidden mentions), `0016` (bilingualism), `0018` (three operating systems), `0024` (additive evolution), `0026` (Bun as the single version)

---

## 1. Purpose

The Forge614 ecosystem is described across 26 decision records, one contract, one node guide, five audits and several handoffs. To understand it, you have to read all of it. Contradictions between documents only surface through line-by-line reading.

The visual map turns that documentation into **an interactive 3D office in the browser**:

- each node is a platform;
- each internal piece is a desk;
- connections are animated lines;
- rules are plaques on the walls;
- contradictions are marked where you can see them.

It serves two uses:

1. **Understand:** the owner fully understands how the nodes connect, who depends on whom, who orchestrates, who executes, who judges, and which rules apply.
2. **Show:** present the ecosystem to other people without explaining it out loud.

It also acts as a **visual contradiction detector**. When two documents disagree, the map shows the clash with its sources instead of silently picking one.

### 1.1 Out of scope

- Live data: running tasks, working agents or metrics. The map shows how the ecosystem is **defined**, not what is happening right now.
- Editing documents from the map. The map is read-only.
- Wiring it into `bun verify` or forge614-ai CI. That decision comes later.

## 2. Location and boundaries

```
forge614-ai/
└── tools/ecosystem-map/
    ├── package.json      own dependencies, separate from the core
    ├── tsconfig.json     own; browser and Bun use different types
    ├── extractor/        reads the repository and builds the data
    ├── curated/          hand-curated data, each item with its receipt
    ├── data/             generated: ecosystem.json and findings.json
    ├── app/              the page: 3D office and panels
    └── tests/
```

**Boundary rules:**

- **Nothing lives in `src/`.** `tests/architecture/import-rules.test.ts` rejects any file in `src/` outside the four layers, and the map belongs to none of them.
- **No map file is imported from `src/`, and the map imports nothing from `src/`.** It only reads the repository's documents as files.
- **Portability.** The folder must be movable to its own repository by copying it, with no code changes. Its only reference to the parent repository is a configurable root path, `--root`, which defaults to `../..`.
- **Isolation.** The core's `package.json`, `tsconfig.json` and `bun verify` are not modified.

## 3. Technology

| Piece | Use |
|---|---|
| Bun 1.4.2 | Bundles the page, serves it in development, runs the extractor and tests (decision 0026) |
| Three.js | 3D scene, camera, lights, shadows |
| TypeScript with no UI framework | Panels, search, screen state |
| Zod | Schemas for generated and curated data |
| YAML | Curated file format |

There is no server and no UI framework. `map:build` outputs a static folder that opens in any modern browser on macOS, Linux and Windows (decision 0018).

## 4. Visual style

- **Camera.** Isometric diagonal view from above, with orthographic projection. Dark blue-grey background.
- **Platforms.** One per node, each in its own muted color. The palette has measured contrast and stays distinguishable for color-vision deficiencies.
- **Desks and characters.** Simple geometric "toy" figures built in code, with no external models.
- **Light.** Soft ambient light, ambient occlusion and contact shadows.
- **Text.** Always sharp: labels and cards are an HTML layer over the scene, not 3D text.
- **Motion.** The camera flies with smooth easing. Only informative elements animate, and the system reduced-motion preference is respected.
- **Performance.** Target is 60 frames per second on a mid-range laptop.

### 4.1 Ecosystem layout

| Element | Representation |
|---|---|
| Engram | Central platform: the memory everyone connects to |
| Shell, Engines, Atlas, Workers | Platforms around the center |
| Hub, Sentinel | Semi-transparent hologram platforms (planned) |
| forge614-ai | The building: shared floor, with rules as plaques on the walls |
| Each node's internal pieces | Labeled desks |
| Planned pieces (`forge614` init/prepare, run ledger…) | Empty desks marked as planned |

## 5. Interactions

- **Screen.** A top bar (search, layers, tours, language, theme), a left detail panel, the office in the center, a right findings panel and a timeline at the bottom.
- **Explore.** Clicking a platform flies the camera to it. The left panel then shows the tabs *What it does · Its pieces · Depends on · Rules that apply · Decisions · Findings*. Desks, lines and plaques are clickable too. Esc returns to the overview.
- **Layers.** Toggles for install dependencies, runtime contracts, rules, findings and planned items.
- **Tours.** A light travels across platforms while a narration explains each step. Tours can be paused, stepped forward or stepped back. Tours: `init`, `prepare`, Atlas contextualization, Sentinel judgment, retries and circuit breaker, and a change traveling to release.
- **Findings.** A filterable list. Each finding flies the camera to its location and shows the conflicting sources side by side.
- **Timeline.** From E0 to E3, the office builds itself following the delivery order (decision 0002).
- **Finishing.** Search, Spanish and English, light and dark themes, a link per view, and full keyboard use.

## 6. Data

### 6.1 Flow

```
repository documents
   ├── automatic: decisions INDEX.json, support-matrix.json, standard/rules/*,
   │              packs, forge614.node.json
   └── curated: curated/*.yaml (content that is plain prose)
                    ↓
               extractor (validates, compares, detects clashes)
                    ↓
      data/ecosystem.json  +  data/findings.json   ← the page reads only these
```

### 6.2 Receipts

Every curated item carries at least one **receipt** with three parts: `file` (path relative to the root), `line`, and `quote`, a short verbatim quote.

The extractor:

1. **Rejects** any item without a receipt.
2. **Checks** that the quote still exists in the file, near the given line.
3. If the quote is gone, it marks the item **stale**. A stale finding is also marked **possibly resolved**. Nothing is ever deleted silently.

### 6.3 Findings

A finding is one of three kinds:

- **contradiction:** two or more receipts disagree;
- **pending:** planned but not done;
- **gap:** something cited that does not exist.

Each finding states which nodes it affects. When the hierarchy is clear, it also states which source prevails; for example, an accepted decision prevails over a checklist.

Automatic findings come from comparing structured sources, for example:

- the decision count in the index against the count stated in the guides;
- the rules a pack cites against the rules that exist.

Prose findings are recorded in `curated/findings.yaml`.

### 6.4 Schemas

Zod validates `curated/*.yaml` on read and `data/*.json` on generation. The page validates again on load. On failure it shows a clear error instead of an incomplete scene.

Schemas only grow: fields are added, never renamed or removed (decision 0024).

## 7. Commands

| Command | Effect |
|---|---|
| `bun run map:extract` | Regenerates `data/` from the repository |
| `bun run map:check` | Fails if `data/` is out of date or any receipt is no longer valid |
| `bun run map:dev` | Serves the office in the browser with live reload |
| `bun run map:build` | Produces the static folder for sharing |
| `bun test` | Extractor and schema tests |

All commands run inside `tools/ecosystem-map/`. Output and errors follow the machine contract convention (decision 0013):

- JSON with `schemaVersion` on stdout;
- `{schemaVersion, code, error}` on stderr;
- exit codes 0, 1 and 2.

## 8. Building in visible steps

Nothing is built all at once. Each step ends with:

- a screenshot;
- the office open in the owner's browser.

The next step starts only after the owner's approval. If a step shows that part of this design does not work, the design is corrected here before continuing.

| # | Visible deliverable | Owner's decision |
|---|---|---|
| 1 | Atmosphere: background, isometric camera, light, shadows and one test platform | Overall tone |
| 2 | The eight platforms with real colors and names, from `data/` | Layout and palette |
| 3 | One test desk and character on Engines | Look of the workers |
| 4 | All platforms with their pieces | Clarity of who does what |
| 5 | Animated connections between platforms | Clarity of what travels where |
| 6 | Click, camera flight and left panel | Navigation feel |
| 7 | Rules as wall plaques | Rule readability |
| 8 | Finding markers and right panel | At-a-glance detection |
| 9 | Animated tours | Teaching value |
| 10 | E0 to E3 timeline | Understanding the delivery order |
| 11 | Search, languages, themes, links | Finishing touches |

The extractor and schemas grow with the steps:

- step 2 adds only the nodes;
- step 4 adds the pieces;
- step 5 adds the connections;
- and so on.

The full extractor is never built before something is visible on screen.

## 9. Verification

- **Automated tests** (`bun test`) cover:
  - schemas;
  - receipt validation;
  - detection of vanished quotes;
  - computation of automatic findings.
- **Automated visual check:** an automated browser opens the office, visits the nodes and takes screenshots to confirm it renders and responds. This complements the owner's review at each step; it does not replace it.
- **No fabricated validations:** a step is declared done only with the real output of these commands and the matching screenshot.

## 10. Ecosystem rules that apply

- **Decision 0012.** No document, comment or commit of the map cites external products or projects as reference or inspiration. The design is described as Forge614's own. Using a library as a dependency is not a mention of inspiration.
- **Decision 0016.** On-screen text is in Spanish and English; code is in English. This spec has its sister translation.
- **Decision 0018.** Commands work on macOS, Linux and Windows. Nothing relies on hard-coded `/` paths.
- **Decision 0024.** Data schemas only grow.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Curated data goes stale as documents change | Receipts with verbatim quotes, detected by `map:check` |
| The map is taken as the source of truth | Every item shows its source, and the footer states that the documents are the source of truth |
| 3D gets heavy with many pieces | Level-of-detail by zoom, shared geometry, and a measured 60 frames-per-second target |
| Touching in-progress phase 0.2 work | Everything happens on the `feat/ecosystem-map` branch, in a separate worktree, inside `tools/ecosystem-map/` |
