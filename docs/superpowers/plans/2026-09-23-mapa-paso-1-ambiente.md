# Mapa del ecosistema — Paso 1: ambiente — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar en el navegador el ambiente de la oficina 3D: fondo, cámara isométrica, luz, sombras suaves, oclusión ambiental y una plataforma de prueba con su tarjeta flotante, para que el propietario apruebe el tono general.

**Architecture:** Carpeta autocontenida `tools/ecosystem-map/` con su propio `package.json` y `tsconfig.json`. La matemática de cámara, la paleta y los mensajes de error son funciones puras probadas con `bun test`. La escena (Three.js) se arma en `app/scene/` y se verifica visualmente. Bun sirve la página con `Bun.serve` y un import de HTML, y la empaqueta con `bun build`.

**Tech Stack:** Bun 1.4.2, TypeScript 5.9.3, Three.js 0.186.0 (`three`, `@types/three`).

**Spec:** `docs/superpowers/specs/2026-09-23-mapa-del-ecosistema-design.md` (paso 1 de la sección 8)

## Global Constraints

- Todo vive en `tools/ecosystem-map/`. Nada en `src/`, y no se modifican el `package.json`, el `tsconfig.json` ni el `bun verify` del núcleo.
- Versión de Bun: 1.4.2 (acta 0026). `engines.bun` es `">=1.3.9"` y la 1.3.8 está prohibida.
- Dependencias con versión exacta, sin `^` ni `~`.
- Las pruebas del mapa usan el sufijo `.check.ts`, nunca `.test.ts` ni `.spec.ts`, para que el `bun test` de la raíz no las recoja. Se ejecutan con `bun run test` dentro de la carpeta del mapa.
- Código e identificadores en inglés. Textos de pantalla en español en este paso; el inglés llega en el paso 11 (acta 0016).
- Ningún archivo, comentario ni commit menciona productos o proyectos externos como referencia o inspiración (acta 0012).
- Los CLIs imprimen JSON con `schemaVersion` por stdout (acta 0013).
- Commits en español, estilo `tipo(map): descripción`, sin líneas de atribución.
- Rutas con `node:path`, nunca con `/` fijo concatenado (acta 0018).

## Review Focus

- **Ventana alta y angosta (teléfono, aspecto 0.46):** la plataforma debe verse completa, sin recortes laterales. Lo cubre la prueba `frustumFor` con aspecto menor que 1 (Task 1).
- **Cambiar el tamaño de la ventana:** la escena no se estira ni se deforma. Lo cubre la prueba de proporción `frustumFor` = aspecto (Task 1).
- **Navegador sin WebGL:** debe aparecer un mensaje legible en español e inglés, no una página en blanco. Lo cubre la prueba `fatalMessage` (Task 2).
- **Pantallas de alta densidad (pixel ratio 3):** se limita a 2 para mantener la fluidez. Lo cubre la prueba `clampPixelRatio` (Task 1).
- **Zoom extremo:** no se puede alejar hasta perder la escena ni acercar hasta quedar dentro de la plataforma. Lo cubre la prueba `ZOOM_LIMITS` (Task 1).

---

## Task 0: Prerrequisito — Bun 1.4.2

Bun 1.3.8 está instalado y prohibido por el acta 0026. Instalarlo cambia la máquina del propietario, así que **se pide permiso antes**.

- [ ] **Step 1: Pedir permiso al propietario e instalar la versión exacta**

```bash
curl -fsSL https://bun.sh/install | bash -s "bun-v1.4.2"
```

- [ ] **Step 2: Confirmar**

Run: `bun --version`
Expected: `1.4.2`

---

## Task 1: Paquete del mapa y matemática de cámara

**Files:**
- Create: `tools/ecosystem-map/package.json`
- Create: `tools/ecosystem-map/tsconfig.json`
- Create: `tools/ecosystem-map/app/scene/iso-camera.ts`
- Test: `tools/ecosystem-map/tests/iso-camera.check.ts`
- Modify: `docs/superpowers/specs/2026-09-23-mapa-del-ecosistema-design.md` (sección 7, fila `bun test`)
- Modify: `docs/superpowers/specs/2026-09-23-ecosystem-map-design.en.md` (sección 7, fila `bun test`)

**Interfaces:**
- Produces:
  - `ISO_ELEVATION: number`, `ISO_AZIMUTH: number`
  - `type Frustum = { left: number; right: number; top: number; bottom: number }`
  - `frustumFor(aspect: number, viewSize: number): Frustum`
  - `isoOffset(distance: number): [number, number, number]`
  - `clampPixelRatio(dpr: number): number`
  - `ZOOM_LIMITS: { readonly min: number; readonly max: number }`

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "forge614-ecosystem-map",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "bun": ">=1.3.9" },
  "description": "Forge614 ecosystem map: an interactive 3D office built from the repository documents.",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "bun test ./tests/*.check.ts",
    "map:dev": "bun run app/serve.ts",
    "map:build": "bun build ./app/index.html --outdir ./dist --minify"
  },
  "dependencies": {
    "three": "0.186.0"
  },
  "devDependencies": {
    "@types/bun": "1.3.8",
    "@types/three": "0.186.0",
    "typescript": "5.9.3"
  }
}
```

- [ ] **Step 2: Crear `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "types": ["bun-types"],
    "noEmit": true
  },
  "include": ["app", "tests"]
}
```

- [ ] **Step 3: Instalar dependencias**

Run: `cd tools/ecosystem-map && bun install`
Expected: se crea `tools/ecosystem-map/bun.lock` y `node_modules/` (ignorado por el `.gitignore` raíz).

- [ ] **Step 4: Escribir la prueba que falla**

`tools/ecosystem-map/tests/iso-camera.check.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { ISO_ELEVATION, ZOOM_LIMITS, clampPixelRatio, frustumFor, isoOffset } from "../app/scene/iso-camera";

describe("frustumFor", () => {
  test("wide window keeps the full view size vertically", () => {
    const f = frustumFor(16 / 9, 24);
    expect(f.top).toBeCloseTo(12);
    expect(f.bottom).toBeCloseTo(-12);
    expect(f.right).toBeCloseTo(12 * (16 / 9));
  });

  test("tall phone window keeps the full view size horizontally", () => {
    const f = frustumFor(0.46, 24);
    expect(f.right - f.left).toBeCloseTo(24);
    expect(f.top - f.bottom).toBeGreaterThan(24);
  });

  test("width divided by height always equals the aspect, so nothing stretches", () => {
    for (const aspect of [0.46, 1, 1.6, 2.4]) {
      const f = frustumFor(aspect, 24);
      expect((f.right - f.left) / (f.top - f.bottom)).toBeCloseTo(aspect);
    }
  });

  test("rejects impossible sizes", () => {
    expect(() => frustumFor(0, 24)).toThrow();
    expect(() => frustumFor(Number.NaN, 24)).toThrow();
    expect(() => frustumFor(1.5, 0)).toThrow();
  });
});

describe("isoOffset", () => {
  test("sits on the isometric diagonal at the requested distance", () => {
    const [x, y, z] = isoOffset(10);
    expect(Math.hypot(x, y, z)).toBeCloseTo(10);
    expect(x).toBeCloseTo(z);
    expect(Math.asin(y / 10)).toBeCloseTo(ISO_ELEVATION);
  });
});

describe("clampPixelRatio", () => {
  test("caps dense screens at 2 and falls back to 1 on garbage", () => {
    expect(clampPixelRatio(3)).toBe(2);
    expect(clampPixelRatio(1.5)).toBe(1.5);
    expect(clampPixelRatio(Number.NaN)).toBe(1);
    expect(clampPixelRatio(0)).toBe(1);
  });
});

describe("ZOOM_LIMITS", () => {
  test("allows zooming out a little and in up to 3x", () => {
    expect(ZOOM_LIMITS.min).toBeGreaterThan(0.4);
    expect(ZOOM_LIMITS.min).toBeLessThan(1);
    expect(ZOOM_LIMITS.max).toBe(3);
  });
});
```

- [ ] **Step 5: Correr la prueba y ver que falla**

Run: `cd tools/ecosystem-map && bun run test`
Expected: FAIL, `Cannot find module '../app/scene/iso-camera'`

- [ ] **Step 6: Implementar `iso-camera.ts`**

```ts
// Isometric view: the camera looks down the cube diagonal, so the three
// axes are foreshortened equally.
export const ISO_ELEVATION = Math.atan(1 / Math.SQRT2);
export const ISO_AZIMUTH = Math.PI / 4;

export const ZOOM_LIMITS = { min: 0.6, max: 3 } as const;

export type Frustum = { left: number; right: number; top: number; bottom: number };

// The shorter side of the window always shows `viewSize` world units, so a
// tall phone screen never crops the scene sideways.
export function frustumFor(aspect: number, viewSize: number): Frustum {
  if (!Number.isFinite(aspect) || aspect <= 0) throw new Error(`invalid aspect: ${aspect}`);
  if (!Number.isFinite(viewSize) || viewSize <= 0) throw new Error(`invalid view size: ${viewSize}`);
  const halfHeight = aspect >= 1 ? viewSize / 2 : viewSize / 2 / aspect;
  const halfWidth = halfHeight * aspect;
  return { left: -halfWidth, right: halfWidth, top: halfHeight, bottom: -halfHeight };
}

export function isoOffset(distance: number): [number, number, number] {
  const horizontal = distance * Math.cos(ISO_ELEVATION);
  return [
    horizontal * Math.sin(ISO_AZIMUTH),
    distance * Math.sin(ISO_ELEVATION),
    horizontal * Math.cos(ISO_AZIMUTH),
  ];
}

export function clampPixelRatio(dpr: number): number {
  return Number.isFinite(dpr) && dpr > 0 ? Math.min(dpr, 2) : 1;
}
```

- [ ] **Step 7: Correr la prueba y ver que pasa**

Run: `cd tools/ecosystem-map && bun run test`
Expected: PASS, `0 fail`

- [ ] **Step 8: Ajustar la spec (sección 7) en ambos idiomas**

En la fila de la tabla de comandos, reemplazar `` `bun test` `` por `` `bun run test` ``. Agregar debajo de la tabla:

- Español: `Las pruebas del mapa usan el sufijo .check.ts para que el bun test de la raíz de forge614-ai no las recoja.`
- Inglés: `Map tests use the .check.ts suffix so the forge614-ai root bun test does not pick them up.`

- [ ] **Step 9: Commit**

```bash
git add tools/ecosystem-map/package.json tools/ecosystem-map/tsconfig.json tools/ecosystem-map/bun.lock tools/ecosystem-map/app/scene/iso-camera.ts tools/ecosystem-map/tests/iso-camera.check.ts docs/superpowers/specs/2026-09-23-mapa-del-ecosistema-design.md docs/superpowers/specs/2026-09-23-ecosystem-map-design.en.md
git commit -m "feat(map): paquete del mapa y matemática de la cámara isométrica"
```

---

## Task 2: Paleta con contraste medido y mensaje de error

**Files:**
- Create: `tools/ecosystem-map/app/scene/theme.ts`
- Create: `tools/ecosystem-map/app/fatal.ts`
- Test: `tools/ecosystem-map/tests/theme.check.ts`
- Test: `tools/ecosystem-map/tests/fatal.check.ts`

**Interfaces:**
- Produces:
  - `theme` (objeto `as const` con las claves `background`, `floor`, `floorLine`, `platformSide`, `testPlatform`, `cardBackground`, `cardBorder`, `cardText`, `cardMuted`, todas como cadenas `#rrggbb`)
  - `relativeLuminance(hex: string): number`
  - `contrastRatio(a: string, b: string): number`
  - `fatalMessage(error: unknown): string`

- [ ] **Step 1: Escribir las pruebas que fallan**

`tools/ecosystem-map/tests/theme.check.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { contrastRatio, relativeLuminance, theme } from "../app/scene/theme";

describe("contrastRatio", () => {
  test("black on white is 21:1 and a color against itself is 1:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
    expect(contrastRatio("#5b8f7b", "#5b8f7b")).toBeCloseTo(1);
  });

  test("rejects anything that is not #rrggbb", () => {
    expect(() => relativeLuminance("red")).toThrow();
    expect(() => relativeLuminance("#fff")).toThrow();
  });
});

describe("theme", () => {
  test("card text is readable (at least 4.5:1)", () => {
    expect(contrastRatio(theme.cardText, theme.cardBackground)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.cardMuted, theme.cardBackground)).toBeGreaterThanOrEqual(4.5);
  });

  test("the platform stands out from the floor (at least 3:1)", () => {
    expect(contrastRatio(theme.testPlatform, theme.floor)).toBeGreaterThanOrEqual(3);
  });
});
```

`tools/ecosystem-map/tests/fatal.check.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { fatalMessage } from "../app/fatal";

describe("fatalMessage", () => {
  test("explains the problem in Spanish and English and keeps the cause", () => {
    const text = fatalMessage(new Error("WebGL context could not be created"));
    expect(text).toContain("No se pudo mostrar la oficina 3D");
    expect(text).toContain("The 3D office could not be displayed");
    expect(text).toContain("WebGL context could not be created");
  });

  test("works when the thrown value is not an Error", () => {
    expect(fatalMessage("boom")).toContain("boom");
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `cd tools/ecosystem-map && bun run test`
Expected: FAIL, `Cannot find module '../app/scene/theme'` y `'../app/fatal'`

- [ ] **Step 3: Implementar `theme.ts`**

```ts
export const theme = {
  background: "#1b1e27",
  floor: "#232733",
  floorLine: "#2e3342",
  platformSide: "#1f222c",
  testPlatform: "#5b8f7b",
  cardBackground: "#262a36",
  cardBorder: "#3a4052",
  cardText: "#e8e6df",
  cardMuted: "#9aa0b0",
} as const;

export function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) throw new Error(`invalid hex color: ${hex}`);
  const value = Number.parseInt(match[1], 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
```

- [ ] **Step 4: Implementar `fatal.ts`**

```ts
export function fatalMessage(error: unknown): string {
  const cause = error instanceof Error ? error.message : String(error);
  return [
    "No se pudo mostrar la oficina 3D. Tu navegador necesita WebGL activado.",
    "The 3D office could not be displayed. Your browser needs WebGL enabled.",
    `(${cause})`,
  ].join("\n");
}
```

- [ ] **Step 5: Correr y ver que pasan**

Run: `cd tools/ecosystem-map && bun run test`
Expected: PASS, `0 fail`

- [ ] **Step 6: Commit**

```bash
git add tools/ecosystem-map/app/scene/theme.ts tools/ecosystem-map/app/fatal.ts tools/ecosystem-map/tests/theme.check.ts tools/ecosystem-map/tests/fatal.check.ts
git commit -m "feat(map): paleta con contraste medido y mensaje de error bilingüe"
```

---

## Task 3: Escena, plataforma de prueba y servidor

**Files:**
- Create: `tools/ecosystem-map/app/scene/stage.ts`
- Create: `tools/ecosystem-map/app/scene/platform.ts`
- Create: `tools/ecosystem-map/app/main.ts`
- Create: `tools/ecosystem-map/app/index.html`
- Create: `tools/ecosystem-map/app/styles.css`
- Create: `tools/ecosystem-map/app/serve.ts`

**Interfaces:**
- Consumes: `frustumFor`, `isoOffset`, `clampPixelRatio`, `ZOOM_LIMITS` (Task 1); `theme`, `fatalMessage` (Task 2)
- Produces:
  - `type Stage = { scene: THREE.Scene; start(): void; dispose(): void }`
  - `createStage(container: HTMLElement): Stage`
  - `type PlatformOptions = { size: number; height: number; color: string; title: string; subtitle: string }`
  - `createPlatform(options: PlatformOptions): THREE.Group`

Esta tarea es visual. Su prueba es el typecheck, el build y la captura de la Task 4.

- [ ] **Step 1: Implementar `stage.ts`**

```ts
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { ZOOM_LIMITS, clampPixelRatio, frustumFor, isoOffset } from "./iso-camera";
import { theme } from "./theme";

const VIEW_SIZE = 24;
const CAMERA_DISTANCE = 60;

export type Stage = { scene: THREE.Scene; start(): void; dispose(): void };

export function createStage(container: HTMLElement): Stage {
  const width = container.clientWidth;
  const height = container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(clampPixelRatio(window.devicePixelRatio));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Labels are HTML on top of the canvas so text stays sharp at any zoom.
  const labels = new CSS2DRenderer();
  labels.setSize(width, height);
  labels.domElement.className = "label-layer";
  container.appendChild(labels.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.background);

  const frustum = frustumFor(width / height, VIEW_SIZE);
  const camera = new THREE.OrthographicCamera(frustum.left, frustum.right, frustum.top, frustum.bottom, 0.1, 500);
  camera.position.set(...isoOffset(CAMERA_DISTANCE));
  camera.lookAt(0, 0, 0);

  // The label layer sits on top, so it is the element that receives input.
  const controls = new OrbitControls(camera, labels.domElement);
  controls.enableRotate = false;
  controls.enableDamping = true;
  controls.screenSpacePanning = true;
  controls.minZoom = ZOOM_LIMITS.min;
  controls.maxZoom = ZOOM_LIMITS.max;
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };

  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x1a1d26, 1.1));
  const sun = new THREE.DirectionalLight(0xfff4e6, 2.2);
  sun.position.set(18, 30, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 100;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: theme.floor, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(120, 60, theme.floorLine, theme.floorLine);
  grid.position.y = 0.01;
  const gridMaterial = grid.material as THREE.Material;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.5;
  scene.add(grid);

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(clampPixelRatio(window.devicePixelRatio));
  composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new GTAOPass(scene, camera, width, height));
  composer.addPass(new OutputPass());

  const resize = (): void => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    const f = frustumFor(w / h, VIEW_SIZE);
    camera.left = f.left;
    camera.right = f.right;
    camera.top = f.top;
    camera.bottom = f.bottom;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    labels.setSize(w, h);
  };
  window.addEventListener("resize", resize);

  let frame = 0;
  const loop = (): void => {
    frame = requestAnimationFrame(loop);
    controls.update();
    composer.render();
    labels.render(scene, camera);
  };

  return {
    scene,
    start: () => {
      if (frame === 0) loop();
    },
    dispose: () => {
      cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener("resize", resize);
      controls.dispose();
      composer.dispose();
      renderer.dispose();
      container.replaceChildren();
    },
  };
}
```

- [ ] **Step 2: Implementar `platform.ts`**

```ts
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { theme } from "./theme";

export type PlatformOptions = { size: number; height: number; color: string; title: string; subtitle: string };

export function createPlatform(options: PlatformOptions): THREE.Group {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new RoundedBoxGeometry(options.size, options.height, options.size, 4, 0.35),
    new THREE.MeshStandardMaterial({ color: theme.platformSide, roughness: 0.85 }),
  );
  base.position.y = options.height / 2;
  base.castShadow = true;
  base.receiveShadow = true;

  const top = new THREE.Mesh(
    new RoundedBoxGeometry(options.size - 0.3, 0.12, options.size - 0.3, 4, 0.05),
    new THREE.MeshStandardMaterial({ color: options.color, roughness: 0.7 }),
  );
  top.position.y = options.height + 0.06;
  top.receiveShadow = true;

  group.add(base, top);

  const card = document.createElement("div");
  card.className = "platform-card";
  const title = document.createElement("div");
  title.className = "platform-card__title";
  title.textContent = options.title;
  const subtitle = document.createElement("div");
  subtitle.className = "platform-card__subtitle";
  subtitle.textContent = options.subtitle;
  card.append(title, subtitle);

  const label = new CSS2DObject(card);
  label.position.set(0, options.height + 3.2, 0);
  group.add(label);

  return group;
}
```

- [ ] **Step 3: Implementar `main.ts`**

```ts
import * as THREE from "three";
import { fatalMessage } from "./fatal";
import { createPlatform } from "./scene/platform";
import { createStage } from "./scene/stage";
import { theme } from "./scene/theme";

const container = document.getElementById("office");
if (!container) throw new Error("missing #office container");

try {
  const stage = createStage(container);
  stage.scene.add(
    createPlatform({ size: 10, height: 1.2, color: theme.testPlatform, title: "Plataforma de prueba", subtitle: "Paso 1 · ambiente" }),
  );

  // One block on the platform so soft and contact shadows can be judged.
  const block = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.2, 1),
    new THREE.MeshStandardMaterial({ color: "#e9dcc4", roughness: 0.6 }),
  );
  block.position.set(-1.5, 1.32 + 0.6, 0.8);
  block.castShadow = true;
  block.receiveShadow = true;
  stage.scene.add(block);

  stage.start();
} catch (error) {
  const message = document.createElement("pre");
  message.className = "fatal";
  message.textContent = fatalMessage(error);
  container.replaceChildren(message);
}
```

- [ ] **Step 4: Crear `index.html`**

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Forge614 · Mapa del ecosistema</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <header class="topbar">
      <span class="topbar__brand">FORGE614</span>
      <span class="topbar__divider">·</span>
      <span class="topbar__title">Mapa del ecosistema</span>
    </header>
    <main id="office" aria-label="Oficina 3D del ecosistema Forge614"></main>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Crear `styles.css`**

```css
:root {
  --bg: #1b1e27;
  --card-bg: rgba(38, 42, 54, 0.92);
  --card-border: #3a4052;
  --text: #e8e6df;
  --muted: #9aa0b0;
  --accent: #5b8f7b;
  --font-display: ui-serif, Georgia, "Times New Roman", serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  height: 100%;
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
}

.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--card-border);
  background: linear-gradient(var(--bg), rgba(27, 30, 39, 0.6));
  pointer-events: none;
}

.topbar__brand { font-weight: 700; }
.topbar__divider, .topbar__title { color: var(--muted); }

#office {
  position: fixed;
  inset: 0;
}

#office canvas,
.label-layer {
  position: absolute;
  inset: 0;
}

.platform-card {
  min-width: 180px;
  padding: 12px 14px;
  border: 1px solid var(--card-border);
  border-radius: 10px;
  background: var(--card-bg);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}

.platform-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.platform-card__title::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
}

.platform-card__subtitle {
  margin-top: 6px;
  font-family: var(--font-display);
  font-size: 15px;
  color: var(--muted);
}

.fatal {
  margin: 80px auto;
  max-width: 560px;
  padding: 20px;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  border: 1px solid var(--card-border);
  border-radius: 10px;
  background: var(--card-bg);
}
```

- [ ] **Step 6: Implementar `serve.ts`**

```ts
import page from "./index.html";

const port = Number(process.env.MAP_PORT ?? 4614);
const server = Bun.serve({ port, development: true, routes: { "/": page } });

process.stdout.write(`${JSON.stringify({ schemaVersion: 1, url: server.url.href })}\n`);
```

- [ ] **Step 7: Typecheck**

Run: `cd tools/ecosystem-map && bun run typecheck`
Expected: sin salida, exit 0

- [ ] **Step 8: Build**

Run: `cd tools/ecosystem-map && bun run map:build`
Expected: se genera `tools/ecosystem-map/dist/index.html` más los assets. `dist/` está ignorado por el `.gitignore` raíz.

- [ ] **Step 9: Commit**

```bash
git add tools/ecosystem-map/app
git commit -m "feat(map): ambiente de la oficina 3D con cámara isométrica, sombras y plataforma de prueba"
```

---

## Task 4: Aislamiento del núcleo y revisión visual

**Files:** ninguno nuevo; solo verificación.

- [ ] **Step 1: El `bun test` de la raíz no recoge las pruebas del mapa**

Run (desde la raíz del worktree): `bun test 2>&1 | tail -3`
Expected: el mismo número de archivos de prueba que antes del mapa, ninguno bajo `tools/ecosystem-map/`.

- [ ] **Step 2: El `bun verify` del núcleo sigue en verde**

Run (desde la raíz del worktree): `bun install && bun run verify`
Expected: exit 0. Si falla por un validador que recorre `tools/ecosystem-map/`, reportarlo al propietario antes de cambiar nada del núcleo.

- [ ] **Step 3: Levantar la oficina**

Run (en segundo plano): `cd tools/ecosystem-map && bun run map:dev`
Expected: `{"schemaVersion":1,"url":"http://localhost:4614/"}`

- [ ] **Step 4: Captura automatizada**

Con el navegador automatizado, abrir `http://localhost:4614/` a 1440×900 y tomar una captura. Repetir a 390×844 (teléfono). Revisar la consola: cero errores.

- [ ] **Step 5: Mostrar al propietario**

Enseñar las dos capturas en el chat y abrir `http://localhost:4614/` en su navegador. Pedir su decisión sobre el **tono general**. No empezar el paso 2 sin su visto bueno.
