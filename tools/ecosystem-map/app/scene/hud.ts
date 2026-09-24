import { termFor } from "./glossary";
import type { Stage } from "./stage";
import { createTip } from "./tip";

// What the map really costs to run, as a strip inside the time panel: how
// often it draws, how long each image takes to prepare, how much memory it
// holds and how much it asks of the graphics card. Every number is measured,
// none is made up: where the browser does not give one (memory, outside
// Chrome and Edge) it says so. The `H` key hides and shows it, and the choice
// is remembered.

const TARGET_FPS = 30; // the stage draws at most this often on purpose
const INTERVAL_MS = 500;
const STORAGE_KEY = "forge614.map.hud";
const MB = 1024 * 1024;

type Level = "good" | "warn" | "bad";

// Compared with the map's own target, not with a game's 60: 30 is normal here.
function levelOf(fps: number): Level {
  if (fps >= TARGET_FPS * 0.9) return "good";
  if (fps >= TARGET_FPS * 0.6) return "warn";
  return "bad";
}

// The memory the page holds in JavaScript. Only Chrome and Edge report it.
function heapBytes(): number | null {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return memory ? memory.usedJSHeapSize : null;
}

const thousands = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1)} k` : String(Math.round(n)));

function readHidden(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "hidden";
  } catch {
    return false;
  }
}

function writeHidden(hidden: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, hidden ? "hidden" : "shown");
  } catch {
    // Not remembered; it still works.
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export type Hud = { dispose(): void };

export function createHud(stage: Stage, mount: HTMLElement): Hud {
  const root = el("div", "hud");
  root.setAttribute("aria-label", "Rendimiento del mapa");
  mount.append(root);

  // Its own bubble, so the strip and the node panel never share one.
  const tip = createTip("hud-tip");
  tip.setAccent("#7fb2d9");

  // One item: the name (a word with an explanation) and its measured value.
  const item = (name: string): HTMLElement => {
    const box = el("div", "hud__item");
    const label = el("span", "hud__label");
    // The word is looked up as written; it is shown with a capital letter.
    const button = el("button", "info__term", name.charAt(0).toUpperCase() + name.slice(1));
    button.type = "button";
    const term = termFor(name);
    if (term) tip.attach(button, term);
    label.append(button);
    const value = el("span", "hud__value", "…");
    box.append(label, value);
    root.append(box);
    return value;
  };
  const fpsValue = item("FPS");
  const costValue = item("tiempo por cuadro");
  const memoryValue = item("RAM");
  const callsValue = item("llamadas de dibujo");
  const trianglesValue = item("triángulos");

  let last = stage.stats();
  let lastAt = performance.now();
  let hidden = readHidden();
  root.classList.toggle("is-hidden", hidden);

  const update = (): void => {
    if (hidden) return;
    const now = performance.now();
    const stats = stage.stats();
    const seconds = (now - lastAt) / 1000;
    const frames = stats.frames - last.frames;
    const fps = seconds > 0 ? frames / seconds : 0;
    if (stage.clock.isPlaying()) {
      fpsValue.textContent = fps.toFixed(0);
      fpsValue.dataset.level = levelOf(fps);
      fpsValue.append(el("span", "hud__goal", ` / ${TARGET_FPS}`));
    } else {
      // Paused: nothing is redrawn, so there is no rate to report.
      fpsValue.textContent = "en pausa";
      delete fpsValue.dataset.level;
    }
    costValue.textContent = frames > 0 ? `${((stats.renderMs - last.renderMs) / frames).toFixed(1)} ms` : "—";
    const heap = heapBytes();
    memoryValue.textContent = heap === null ? "no disponible" : `${(heap / MB).toFixed(0)} MB`;
    callsValue.textContent = String(stats.calls);
    trianglesValue.textContent = thousands(stats.triangles);
    last = stats;
    lastAt = now;
  };

  const timer = window.setInterval(update, INTERVAL_MS);
  update();

  const onKey = (event: KeyboardEvent): void => {
    if (event.key.toLowerCase() !== "h" || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    hidden = !hidden;
    root.classList.toggle("is-hidden", hidden);
    writeHidden(hidden);
    tip.hide();
    if (!hidden) {
      // Start counting from now, so the first number shown is not an average
      // over the time it was hidden; the next tick shows it.
      last = stage.stats();
      lastAt = performance.now();
    }
  };
  window.addEventListener("keydown", onKey);

  return {
    dispose() {
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKey);
      tip.dispose();
      root.remove();
    },
  };
}
