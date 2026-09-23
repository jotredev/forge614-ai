import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { createBlueprintFloor } from "./blueprint-floor";
import { ZOOM_LIMITS, clampPixelRatio, frustumFor, isoOffset } from "./iso-camera";
import type { Animated } from "./particles";
import { theme } from "./theme";

const VIEW_SIZE = 26;
const CAMERA_DISTANCE = 60;

export type FrameInfo = { time: number; delta: number; camera: THREE.OrthographicCamera; target: THREE.Vector3 };

export type Stage = {
  scene: THREE.Scene;
  animate(item: Animated): void;
  onFrame(listener: (info: FrameInfo) => void): void;
  start(): void;
  dispose(): void;
};

export function createStage(container: HTMLElement): Stage {
  const width = container.clientWidth;
  const height = container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(clampPixelRatio(window.devicePixelRatio));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
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

  // Cool, low ambient light so the neon accents carry the scene.
  scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x05070b, 0.45));
  const key = new THREE.DirectionalLight(0xcfe4ff, 1.4);
  // Light from the left of the camera so shadows fall into view.
  key.position.set(-12, 30, 22);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -30;
  key.shadow.camera.right = 30;
  key.shadow.camera.top = 30;
  key.shadow.camera.bottom = -30;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 100;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 4;
  scene.add(key);

  scene.add(createBlueprintFloor());

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(clampPixelRatio(window.devicePixelRatio));
  composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new GTAOPass(scene, camera, width, height));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.7, 0.5, 0.85));
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

  // People who ask the system for less motion get a much slower scene.
  const timeScale = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.15 : 1;
  const animated: Animated[] = [];
  const listeners: Array<(info: FrameInfo) => void> = [];
  const timer = new THREE.Timer();

  let frame = 0;
  const loop = (timestamp?: number): void => {
    frame = requestAnimationFrame(loop);
    timer.update(timestamp);
    const delta = Math.min(timer.getDelta(), 0.1) * timeScale;
    const time = timer.getElapsed() * timeScale;
    for (const item of animated) item.update(time, delta);
    controls.update();
    composer.render();
    labels.render(scene, camera);
    for (const listener of listeners) listener({ time, delta, camera, target: controls.target });
  };

  return {
    scene,
    animate: (item) => {
      animated.push(item);
    },
    onFrame: (listener) => {
      listeners.push(listener);
    },
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
