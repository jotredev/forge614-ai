import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { ZOOM_LIMITS, clampPixelRatio, frustumFor, isoOffset } from "./iso-camera";
import { easeInOut } from "./pointer";
import { theme } from "./theme";

const DEFAULT_VIEW_SIZE = 24;
const CAMERA_DISTANCE = 60;

export type Stage = {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  // The element that receives pointer input (the label layer, on top).
  input: HTMLElement;
  // Where the camera looks and how far it is zoomed in.
  view(): { target: THREE.Vector3; zoom: number };
  // Put the camera at `target` and `zoom` right away, keeping its angle.
  setView(target: THREE.Vector3, zoom: number): void;
  // Glide the camera to look at `target` at `zoom`. Any pan or zoom by the
  // person cancels the flight.
  flyTo(target: THREE.Vector3, zoom: number, ms?: number): void;
  // What drawing has cost so far. `frames` and `renderMs` only grow, so a
  // reader takes two samples and divides the difference; `calls` and
  // `triangles` are those of the last frame drawn.
  stats(): { frames: number; renderMs: number; calls: number; triangles: number };
  // Ask for a new frame after changing the scene. Pass `shadows` when
  // something moved, so the shadow map is recomputed too.
  invalidate(options?: { shadows?: boolean }): void;
  // Run something on every animation tick (at most 30 times a second).
  onTick(listener: (seconds: number) => void): void;
  // Advance everything that animates to `seconds` on the map's clock, without
  // drawing anything.
  simulate(seconds: number): void;
  // The map's own clock: it starts at the beginning of the story, and can be
  // paused, moved to any second and resumed.
  clock: {
    time(): number;
    isPlaying(): boolean;
    play(): void;
    pause(): void;
    // Go to `seconds` and draw that moment now, whether or not it is playing.
    seek(seconds: number): void;
    // Called after it is played, paused or moved.
    onChange(listener: () => void): void;
  };
  // Run something right after every frame is drawn, e.g. to keep an overlay
  // pinned to the scene while the camera moves.
  onRender(listener: () => void): void;
  start(): void;
  dispose(): void;
};

// The scene is static, so it is drawn only when something changes (camera
// moves, window resizes, the scene is edited) instead of 60 times a second.
// `target` is the point the camera looks at, so the view can be framed on
// what is shown.
export function createStage(container: HTMLElement, viewSize = DEFAULT_VIEW_SIZE, target = new THREE.Vector3()): Stage {
  const width = container.clientWidth;
  const height = container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(clampPixelRatio(window.devicePixelRatio));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Shadows are baked once and refreshed only on request.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  container.appendChild(renderer.domElement);

  // Labels are HTML on top of the canvas so text stays sharp at any zoom.
  const labels = new CSS2DRenderer();
  labels.setSize(width, height);
  labels.domElement.className = "label-layer";
  container.appendChild(labels.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.background);

  const frustum = frustumFor(width / height, viewSize);
  const camera = new THREE.OrthographicCamera(frustum.left, frustum.right, frustum.top, frustum.bottom, 0.1, 500);
  camera.position.set(...isoOffset(CAMERA_DISTANCE)).add(target);
  camera.lookAt(target);

  // The label layer sits on top, so it is the element that receives input.
  const controls = new OrbitControls(camera, labels.domElement);
  controls.enableRotate = false;
  controls.enableDamping = true;
  controls.screenSpacePanning = true;
  controls.target.copy(target);
  // The wheel zooms toward what the pointer is on, to look at details.
  controls.zoomToCursor = true;
  controls.minZoom = ZOOM_LIMITS.min;
  controls.maxZoom = ZOOM_LIMITS.max;
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
  // Aim the camera now. Until the first frame is drawn it is not looking at
  // the target in the isometric angle, and anything that measures the scene
  // with it (such as framing the view) would measure it from the wrong angle.
  controls.update();

  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x1a1d26, 1.1));
  const sun = new THREE.DirectionalLight(0xfff4e6, 2.2);
  // Light from the left of the camera so shadows fall into view.
  sun.position.set(-12, 30, 22);
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
  sun.shadow.radius = 4;
  scene.add(sun);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: theme.floor, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  let frame = 0;
  let framesDrawn = 0;
  let renderMs = 0;
  const renderListeners: Array<() => void> = [];
  const draw = (): void => {
    frame = 0;
    // While the camera is still gliding (damping), keep asking for frames.
    const moving = controls.update();
    const began = performance.now();
    renderer.render(scene, camera);
    labels.render(scene, camera);
    renderMs += performance.now() - began;
    framesDrawn += 1;
    for (const listener of renderListeners) listener();
    if (moving) invalidate();
  };

  const invalidate = (options?: { shadows?: boolean }): void => {
    if (options?.shadows) renderer.shadowMap.needsUpdate = true;
    if (frame === 0) frame = requestAnimationFrame(draw);
  };

  controls.addEventListener("change", () => invalidate());

  // Animations tick at most 30 times a second. People who ask the system for
  // less motion get the still version.
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FRAME_MS = 1000 / 30;
  const tickListeners: Array<(seconds: number) => void> = [];
  let ambient = 0;
  let lastTick = 0;
  // The map's clock. `?freeze=12.5` starts it paused at that second, so the
  // same moment can be drawn again and again (to compare two versions image by
  // image). It never jumps ahead by more than a moment, so coming back to a
  // hidden tab does not skip the story.
  const freezeParam = new URLSearchParams(window.location.search).get("freeze");
  const frozenAt = freezeParam !== null && Number.isFinite(Number(freezeParam)) ? Number(freezeParam) : null;
  let mapTime = frozenAt ?? 0;
  // People who ask the system for less motion get the story paused; they can
  // still step through it.
  let playing = frozenAt === null && !reducedMotion;
  const changeListeners: Array<() => void> = [];
  const changed = (): void => {
    for (const listener of changeListeners) listener();
  };
  let moved = true; // something changed the time: draw once even if paused
  const MAX_STEP = 0.25;
  const runListeners = (): void => {
    for (const listener of tickListeners) listener(mapTime);
    invalidate();
  };
  const tick = (now: number): void => {
    ambient = requestAnimationFrame(tick);
    if (now - lastTick < FRAME_MS) return;
    const seconds = lastTick === 0 ? 0 : Math.min((now - lastTick) / 1000, MAX_STEP);
    lastTick = now;
    if (playing) mapTime += seconds;
    else if (!moved) return; // paused and nothing changed: nothing to draw
    moved = false;
    runListeners();
  };
  const setAmbient = (on: boolean): void => {
    if (on && !reducedMotion && ambient === 0) ambient = requestAnimationFrame(tick);
    if (!on && ambient !== 0) {
      cancelAnimationFrame(ambient);
      ambient = 0;
    }
  };

  // A flight moves the camera and its target together, so the view keeps its
  // isometric angle. People who ask for less motion get the jump.
  let flight = 0;
  const cancelFlight = (): void => {
    if (flight !== 0) cancelAnimationFrame(flight);
    flight = 0;
  };
  controls.addEventListener("start", cancelFlight);
  const flyTo = (to: THREE.Vector3, zoom: number, ms = 800): void => {
    cancelFlight();
    const fromTarget = controls.target.clone();
    const fromZoom = camera.zoom;
    const duration = reducedMotion ? 0 : ms;
    const began = performance.now();
    const step = (): void => {
      const t = duration <= 0 ? 1 : Math.min(1, (performance.now() - began) / duration);
      const k = easeInOut(t);
      const next = fromTarget.clone().lerp(to, k);
      camera.position.add(next.clone().sub(controls.target));
      controls.target.copy(next);
      camera.zoom = THREE.MathUtils.clamp(THREE.MathUtils.lerp(fromZoom, zoom, k), ZOOM_LIMITS.min, ZOOM_LIMITS.max);
      camera.updateProjectionMatrix();
      invalidate();
      flight = t < 1 ? requestAnimationFrame(step) : 0;
    };
    flight = requestAnimationFrame(step);
  };

  const setView = (to: THREE.Vector3, zoom: number): void => {
    cancelFlight();
    camera.position.add(to.clone().sub(controls.target));
    controls.target.copy(to);
    camera.zoom = THREE.MathUtils.clamp(zoom, ZOOM_LIMITS.min, ZOOM_LIMITS.max);
    camera.updateProjectionMatrix();
    invalidate();
  };

  const resize = (): void => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    const f = frustumFor(w / h, viewSize);
    camera.left = f.left;
    camera.right = f.right;
    camera.top = f.top;
    camera.bottom = f.bottom;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    labels.setSize(w, h);
    invalidate();
  };
  window.addEventListener("resize", resize);

  return {
    scene,
    camera,
    input: labels.domElement,
    view: () => ({ target: controls.target.clone(), zoom: camera.zoom }),
    setView,
    simulate: (seconds) => {
      for (const listener of tickListeners) listener(seconds);
    },
    clock: {
      time: () => mapTime,
      isPlaying: () => playing,
      play: () => {
        if (playing) return;
        playing = true;
        changed();
      },
      pause: () => {
        if (!playing) return;
        playing = false;
        changed();
      },
      seek: (seconds) => {
        mapTime = Math.max(0, seconds);
        moved = false;
        runListeners();
        changed();
      },
      onChange: (listener) => {
        changeListeners.push(listener);
      },
    },
    stats: () => ({ frames: framesDrawn, renderMs, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }),
    flyTo,
    onRender: (listener) => {
      renderListeners.push(listener);
    },
    invalidate,
    onTick: (listener) => {
      tickListeners.push(listener);
    },
    start: () => {
      setAmbient(true);
      invalidate({ shadows: true });
    },
    dispose: () => {
      cancelFlight();
      setAmbient(false);
      cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener("resize", resize);
      controls.dispose();
      renderer.dispose();
      container.replaceChildren();
    },
  };
}
