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
