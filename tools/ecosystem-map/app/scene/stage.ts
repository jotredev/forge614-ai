import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { ZOOM_LIMITS, clampPixelRatio, frustumFor, isoOffset } from "./iso-camera";
import { theme } from "./theme";

const DEFAULT_VIEW_SIZE = 24;
const CAMERA_DISTANCE = 60;

export type Stage = {
  scene: THREE.Scene;
  // Ask for a new frame after changing the scene. Pass `shadows` when
  // something moved, so the shadow map is recomputed too.
  invalidate(options?: { shadows?: boolean }): void;
  start(): void;
  dispose(): void;
};

// The scene is static, so it is drawn only when something changes (camera
// moves, window resizes, the scene is edited) instead of 60 times a second.
export function createStage(container: HTMLElement, viewSize = DEFAULT_VIEW_SIZE): Stage {
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

  const grid = new THREE.GridHelper(120, 60, theme.floorLine, theme.floorLine);
  grid.position.y = 0.01;
  const gridMaterial = grid.material as THREE.Material;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.5;
  scene.add(grid);

  let frame = 0;
  const draw = (): void => {
    frame = 0;
    // While the camera is still gliding (damping), keep asking for frames.
    const moving = controls.update();
    renderer.render(scene, camera);
    labels.render(scene, camera);
    if (moving) invalidate();
  };

  const invalidate = (options?: { shadows?: boolean }): void => {
    if (options?.shadows) renderer.shadowMap.needsUpdate = true;
    if (frame === 0) frame = requestAnimationFrame(draw);
  };

  controls.addEventListener("change", () => invalidate());

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
    invalidate,
    start: () => invalidate({ shadows: true }),
    dispose: () => {
      cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener("resize", resize);
      controls.dispose();
      renderer.dispose();
      container.replaceChildren();
    },
  };
}
