import * as THREE from "three";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { ZOOM_LIMITS, frustumFor } from "./iso-camera";
import { createLeader } from "./leader";
import type { NodeInfo } from "./nodes/info";
import { createInfoPanel } from "./panel";
import { isClick, type Point } from "./pointer";
import type { Stage } from "./stage";

// Clicking a node flies the camera to it and opens its panel; Escape, the
// panel's close button or a click on empty floor fly back to the whole map.
// Hovering a node lights its title and shows a pointing hand. Dragging still
// pans and the wheel still zooms: a press only counts as a click if the
// pointer barely moved.

export type Selectable = {
  id: string;
  name: string;
  role: string;
  accent: string;
  // Position on the floor (x, z).
  center: THREE.Vector2;
  card: CSS2DObject;
  info: NodeInfo;
  // Smaller things than a node, such as a worker, adjust these.
  hit?: { width: number; height: number }; // size of the invisible click box
  zoom?: number; // how close the camera gets
  anchor?: number; // height above the plate where the line starts
};

export type Interaction = { select(id: string): void; clear(): void; dispose(): void };

const FOCUS_ZOOM = Math.min(2.4, ZOOM_LIMITS.max);
const FLIGHT_MS = 800;
// Below this width the panel is a sheet at the bottom instead of a column.
const NARROW = 720;
const PANEL_WIDTH = 440; // the panel plus its margin; must match .info in styles.css
const SHEET_HALF = 0.28; // half of the narrow-screen sheet's height (56vh)
// How high above the plate the line to the panel starts, at the node's middle.
const ANCHOR_HEIGHT = 4.2;

// Invisible box around each node (plate, scene and title), so a click on any
// part of it counts and the ray never has to test the detailed scene.
const HIT = { width: 8.6, height: 10.5, base: 1.4 };

// Screen right and screen down, as directions on the floor. They match how
// main.ts places nodes: `across` is right, `down` is toward the viewer.
const RIGHT = new THREE.Vector3(Math.SQRT1_2, 0, -Math.SQRT1_2);
const DOWN = new THREE.Vector3(Math.SQRT1_2, 0, Math.SQRT1_2);

export function createInteraction(stage: Stage, viewSize: number, items: Selectable[]): Interaction {
  const home = stage.view();
  const byId = new Map(items.map((item) => [item.id, item]));

  const boxes = items.map((item) => {
    const { width, height } = item.hit ?? HIT;
    const box = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), new THREE.MeshBasicMaterial({ visible: false }));
    box.position.set(item.center.x, HIT.base + height / 2, item.center.y);
    box.userData.id = item.id;
    box.updateMatrixWorld();
    stage.scene.add(box);
    return box;
  });

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pick = (at: Point): string | null => {
    const rect = stage.input.getBoundingClientRect();
    ndc.set(((at.x - rect.left) / rect.width) * 2 - 1, -((at.y - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, stage.camera);
    const hit = raycaster.intersectObjects(boxes, false)[0];
    return hit ? (hit.object.userData.id as string) : null;
  };

  // Where the camera must look for the node to sit in the free part of the
  // screen, beside the panel (or above it, on a narrow screen).
  const zoomOf = (item: Selectable): number => Math.min(item.zoom ?? FOCUS_ZOOM, ZOOM_LIMITS.max);
  const focusTarget = (item: Selectable): THREE.Vector3 => {
    const { center } = item;
    const width = stage.input.clientWidth;
    const height = stage.input.clientHeight;
    const frustum = frustumFor(width / height, viewSize);
    const unitsPerPixel = (frustum.top - frustum.bottom) / zoomOf(item) / height;
    const wide = width >= NARROW;
    const shift = (wide ? PANEL_WIDTH / 2 : height * SHEET_HALF) * unitsPerPixel;
    return new THREE.Vector3(center.x, home.target.y, center.y).addScaledVector(wide ? RIGHT : DOWN, shift);
  };

  let hovered: string | null = null;
  const setHover = (id: string | null): void => {
    if (id === hovered) return;
    if (hovered) byId.get(hovered)?.card.element.classList.remove("is-hover");
    hovered = id;
    if (id) byId.get(id)?.card.element.classList.add("is-hover");
    stage.input.style.cursor = id ? "pointer" : "";
  };

  let selected: string | null = null;
  const clear = (): void => {
    if (!selected) return;
    byId.get(selected)?.card.element.classList.remove("is-selected");
    selected = null;
    panel.hide();
    leader.hide();
    stage.flyTo(home.target, home.zoom, FLIGHT_MS);
  };
  const select = (id: string): void => {
    const item = byId.get(id);
    if (!item) return;
    if (selected && selected !== id) byId.get(selected)?.card.element.classList.remove("is-selected");
    selected = id;
    item.card.element.classList.add("is-selected");
    panel.show({ name: item.name, role: item.role, accent: item.accent, info: item.info });
    leader.show(item.accent);
    stage.flyTo(focusTarget(item), zoomOf(item), FLIGHT_MS);
  };
  const panel = createInfoPanel(clear);
  const leader = createLeader();

  // After every frame, pin the line to the node's spot on screen and to the
  // panel's edge (its top, on a narrow screen where the panel is a sheet).
  const anchor = new THREE.Vector3();
  stage.onRender(() => {
    const item = selected ? byId.get(selected) : undefined;
    if (!item) return;
    const width = stage.input.clientWidth;
    const height = stage.input.clientHeight;
    const box = panel.rect();
    anchor.set(item.center.x, item.anchor ?? ANCHOR_HEIGHT, item.center.y).project(stage.camera);
    const from = { x: (anchor.x * 0.5 + 0.5) * width, y: (-anchor.y * 0.5 + 0.5) * height };
    const vertical = width < NARROW;
    const to = vertical ? { x: Math.min(Math.max(from.x, box.left + 24), box.right - 24), y: box.top } : { x: box.left, y: box.top + 44 };
    leader.update(from, to, vertical);
  });

  let pressed: Point | null = null;
  const onDown = (event: PointerEvent): void => {
    pressed = event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
  };
  const onUp = (event: PointerEvent): void => {
    const start = pressed;
    pressed = null;
    const end = { x: event.clientX, y: event.clientY };
    if (!start || !isClick(start, end)) return;
    const id = pick(end);
    if (id) select(id);
    else clear();
  };
  const onCancel = (): void => {
    pressed = null;
  };

  // Hover is checked at most once per frame, and never while dragging.
  let pending: Point | null = null;
  let frame = 0;
  const onMove = (event: PointerEvent): void => {
    if (event.buttons !== 0) return;
    pending = { x: event.clientX, y: event.clientY };
    if (frame !== 0) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (pending) setHover(pick(pending));
    });
  };
  const onLeave = (): void => {
    pending = null;
    setHover(null);
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === "Escape") clear();
  };

  stage.input.addEventListener("pointerdown", onDown);
  stage.input.addEventListener("pointerup", onUp);
  stage.input.addEventListener("pointercancel", onCancel);
  stage.input.addEventListener("pointermove", onMove);
  stage.input.addEventListener("pointerleave", onLeave);
  window.addEventListener("keydown", onKey);

  return {
    select,
    clear,
    dispose: () => {
      stage.input.removeEventListener("pointerdown", onDown);
      stage.input.removeEventListener("pointerup", onUp);
      stage.input.removeEventListener("pointercancel", onCancel);
      stage.input.removeEventListener("pointermove", onMove);
      stage.input.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("keydown", onKey);
      if (frame !== 0) cancelAnimationFrame(frame);
      panel.dispose();
      leader.dispose();
      for (const box of boxes) stage.scene.remove(box);
    },
  };
}
