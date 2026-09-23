import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createCharacter } from "../character";
import {
  ATLAS_CARD_AT,
  ATLAS_START_ARRIVES,
  ATLAS_WRITE_LEAVES,
  CHECK_PER_FOLDER,
  FOLDERS_PER_TASK,
  VERDICT_ARRIVES,
  TASK_LEAVES,
  since,
} from "../timeline";
import { glowSprite } from "./datacenter";

// Atlas seen from afar: "orquestador de contexto", the first context of the
// project (acta 0004), drawn as a cartographer who hands out the work and checks
// everything. Above a drafting table floats a holographic city of the
// repository, one building per folder. Atlas sends each task to one of its
// workers; when a worker's report comes back, Atlas sends it to Sentinel,
// and once Sentinel's record is back, a holographic lens hops over
// that part of the city, folder by folder, and each checked building turns
// solid with a green light on top and the streets light up, while the
// person draws the map of what is already checked on the sheet and a
// floating panel counts the folders. Then a card with the checked knowledge
// rises, on its way to Engram.

export type AtlasNode = {
  group: THREE.Group;
  // One pair of cable ports per node it talks to, in the order given, and
  // one pair per worker, relative to the node's center.
  ports: THREE.Vector3[][];
  workerPorts: THREE.Vector3[][];
  update(seconds: number): void;
};

export const ATLAS = "#86c2a4";
const ATLAS_LIGHT = "#c4ecd6";
const READY = "#8fbf7a";
// Planes face +z by default; this turns them toward the isometric camera.
const FACE_CAMERA = Math.PI / 4;
export const FOLDERS = 24;
const COLS = 6;
const ROWS = 4;

function solid(geometry: THREE.BufferGeometry, color: string, roughness = 0.6, metalness = 0.1): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// A canvas drawn on a plane, redrawn only when asked.
function canvasPlane(width: number, height: number, pixels: number): { mesh: THREE.Mesh; context: CanvasRenderingContext2D; canvas: HTMLCanvasElement; refresh(): void } {
  const canvas = document.createElement("canvas");
  canvas.width = pixels;
  canvas.height = Math.round((pixels * height) / width);
  const context = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }));
  return { mesh, context, canvas, refresh: () => (texture.needsUpdate = true) };
}

// `towards` are the directions from Atlas to each node it talks to both
// ways, on the floor (world space), so each pair of cable ports faces its
// node; the workers' ports sit on the right side of the base.
export function createAtlas(top: number, towards: THREE.Vector2[], workers: number): AtlasNode {
  const group = new THREE.Group();
  const face = new THREE.Group();

  // The drafting table with the sheet where the map gets drawn.
  const table = new THREE.Group();
  const board = solid(new RoundedBoxGeometry(3.2, 0.08, 1.8, 3, 0.03), "#d9c7a6", 0.7);
  board.rotation.x = 0.25;
  board.position.y = 1.45;
  table.add(board);
  for (const x of [-1.3, 1.3]) {
    const leg = solid(new THREE.BoxGeometry(0.1, 1.4, 1.2), "#2a2f3d", 0.5);
    leg.position.set(x, 0.7, 0);
    table.add(leg);
  }
  const sheet = canvasPlane(2.6, 1.4, 512);
  sheet.mesh.rotation.x = -Math.PI / 2 + 0.25;
  sheet.mesh.position.set(0, 1.5, 0.01);
  table.add(sheet.mesh);
  table.position.set(0, top, 0.6);
  face.add(table);

  // The city of the repository: one building per folder.
  const city = new THREE.Group();
  city.position.set(0, top + 2.5, -0.5);
  city.rotation.y = Math.PI / 4;
  const rand = (i: number): number => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
  const buildings = Array.from({ length: FOLDERS }, (_, i) => {
    const gx = i % COLS;
    const gz = Math.floor(i / COLS);
    const h = 0.25 + rand(i) * 1.0;
    const material = new THREE.MeshBasicMaterial({ color: ATLAS_LIGHT, transparent: true, opacity: 0.1, depthWrite: false });
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.3, h, 0.3), material);
    block.add(new THREE.LineSegments(new THREE.EdgesGeometry(block.geometry), new THREE.LineBasicMaterial({ color: ATLAS_LIGHT, transparent: true, opacity: 0.55 })));
    block.position.set((gx - (COLS - 1) / 2) * 0.44, h / 2, (gz - (ROWS - 1) / 2) * 0.44);
    const check = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: READY }));
    check.position.set(block.position.x, h + 0.08, block.position.z);
    city.add(block, check);
    return { material, check, height: h, at: block.position };
  });
  // Streets: a faint grid under the buildings, brighter as they are inspected.
  const streetMaterial = new THREE.LineBasicMaterial({ color: ATLAS, transparent: true, opacity: 0.25 });
  const streetPoints: THREE.Vector3[] = [];
  for (let gx = 0; gx <= COLS; gx++) {
    const x = (gx - COLS / 2) * 0.44;
    streetPoints.push(new THREE.Vector3(x, 0.01, -ROWS * 0.22), new THREE.Vector3(x, 0.01, ROWS * 0.22));
  }
  for (let gz = 0; gz <= ROWS; gz++) {
    const z = (gz - ROWS / 2) * 0.44;
    streetPoints.push(new THREE.Vector3(-COLS * 0.22, 0.01, z), new THREE.Vector3(COLS * 0.22, 0.01, z));
  }
  city.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(streetPoints), streetMaterial));
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(COLS * 0.44, ROWS * 0.44),
    new THREE.MeshBasicMaterial({ color: ATLAS, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }),
  );
  ground.rotation.x = -Math.PI / 2;
  city.add(ground);

  // The inspection lens: a glowing ring with a beam down to the building.
  const lens = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 8, 32), new THREE.MeshBasicMaterial({ color: "#e9fff3" }));
  ring.rotation.x = Math.PI / 2;
  const lensGlass = new THREE.Mesh(
    new THREE.CircleGeometry(0.23, 32),
    new THREE.MeshBasicMaterial({ color: ATLAS_LIGHT, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }),
  );
  lensGlass.rotation.x = -Math.PI / 2;
  const lensBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.12, 0.5, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: ATLAS_LIGHT, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  lensBeam.position.y = -0.25;
  lens.add(ring, lensGlass, lensBeam, glowSprite(ATLAS_LIGHT, 0.6, 0.9));
  city.add(lens);

  const halo = glowSprite(ATLAS, 0.25, 4.4);
  halo.position.copy(city.position).add(new THREE.Vector3(0, 0.5, 0));
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 0.5, 0.9, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: ATLAS_LIGHT, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  beam.position.set(0, top + 2.05, -0.3);
  face.add(city, halo, beam);

  // The progress panel.
  const panel = canvasPlane(1.9, 0.8, 512);
  panel.mesh.position.set(2.3, top + 3.6, -0.9);
  panel.mesh.rotation.y = -0.3;
  face.add(panel.mesh);

  const person = createCharacter(ATLAS, "typing");
  person.group.scale.setScalar(1.5);
  person.group.position.set(0, top, 2.3);
  person.group.rotation.y = Math.PI;
  face.add(person.group);

  // The card with the checked knowledge, rising before it goes to Engram.
  const card = new THREE.Group();
  card.add(
    new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.34), new THREE.MeshBasicMaterial({ color: ATLAS_LIGHT })),
    glowSprite(ATLAS, 0.8, 1.1),
  );
  face.add(card);

  // Two ports at the foot of the table for each node it talks to, on the
  // side facing it, on a small base so they read as plugged in.
  const turn = (v: THREE.Vector3): THREE.Vector3 => v.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), FACE_CAMERA);
  const hub = solid(new THREE.CylinderGeometry(0.9, 1.0, 0.3, 32), "#20252f", 0.45, 0.5);
  hub.position.set(0, top + 0.15, -0.5);
  const hubRim = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.03, 8, 48), new THREE.MeshBasicMaterial({ color: ATLAS }));
  hubRim.rotation.x = Math.PI / 2;
  hubRim.position.set(0, top + 0.3, -0.5);
  face.add(hub, hubRim);
  const ports = towards.map((toward) => {
    const out = new THREE.Vector3(toward.x, 0, toward.y).applyAxisAngle(new THREE.Vector3(0, 1, 0), -FACE_CAMERA).normalize();
    const across = new THREE.Vector3(-out.z, 0, out.x);
    return [-1, 1].map((side) => {
      const at = new THREE.Vector3(0, top + 0.15, -0.5).addScaledVector(out, 1.0).addScaledVector(across, side * 0.3);
      const mouth = solid(new THREE.BoxGeometry(0.26, 0.18, 0.06), "#0b0e13", 0.6);
      mouth.position.copy(at);
      mouth.lookAt(at.clone().add(out));
      face.add(mouth);
      return turn(at);
    });
  });
  // Two ports per worker on the right side of the base: the task leaves
  // through one and the report comes back through the other.
  const right = new THREE.Vector3(1, 0, 0);
  const workerPorts = Array.from({ length: workers }, (_, i) =>
    [0, 1].map((j) => {
      const at = new THREE.Vector3(0.98, top + 0.15, -0.5 + (i * 2 + j - (workers * 2 - 1) / 2) * 0.22);
      const mouth = solid(new THREE.BoxGeometry(0.16, 0.14, 0.05), "#0b0e13", 0.6);
      mouth.position.copy(at);
      mouth.lookAt(at.clone().add(right));
      face.add(mouth);
      return turn(at);
    }),
  );

  face.rotation.y = FACE_CAMERA;
  group.add(face);

  let drawn = "";
  const draw = (done: number, status: string): void => {
    // The sheet: the map of the inspected folders, in ink.
    const s = sheet.context;
    s.fillStyle = "#eef2ea";
    s.fillRect(0, 0, sheet.canvas.width, sheet.canvas.height);
    const cw = sheet.canvas.width / (COLS + 1);
    const ch = sheet.canvas.height / (ROWS + 1);
    s.strokeStyle = "#2f6b55";
    s.lineWidth = 3;
    for (let i = 0; i < done; i++) {
      const x = cw * (0.5 + (i % COLS)) + cw * 0.15;
      const y = ch * (0.5 + Math.floor(i / COLS)) + ch * 0.15;
      s.strokeRect(x, y, cw * 0.7, ch * 0.7);
      if (i % COLS > 0) {
        s.beginPath();
        s.moveTo(x - cw * 0.3, y + ch * 0.35);
        s.lineTo(x, y + ch * 0.35);
        s.stroke();
      }
    }
    sheet.refresh();
    // The panel: folders inspected and a progress bar.
    const p = panel.context;
    const w = panel.canvas.width;
    const h = panel.canvas.height;
    p.fillStyle = "rgba(10,24,18,0.92)";
    p.fillRect(0, 0, w, h);
    p.strokeStyle = ATLAS;
    p.lineWidth = 4;
    p.strokeRect(2, 2, w - 4, h - 4);
    p.fillStyle = ATLAS_LIGHT;
    p.font = "600 30px ui-monospace, monospace";
    p.fillText(status, 24, 50);
    p.font = "500 28px ui-monospace, monospace";
    p.fillText(`${done} / ${FOLDERS} carpetas`, 24, 96);
    p.fillStyle = "#1f3a30";
    p.fillRect(24, 120, w - 48, 30);
    p.fillStyle = done < FOLDERS ? ATLAS : READY;
    p.fillRect(24, 120, ((w - 48) * done) / FOLDERS, 30);
    panel.refresh();
  };
  const cityCenter = new THREE.Vector3(0, top + 3.9, -0.5);

  // Folders checked so far: each report is checked folder by folder from
  // the moment Sentinel's record for it arrives.
  const checkedFolders = (seconds: number): { done: number; checking: number } => {
    let done = 0;
    let checking = -1;
    for (const at of VERDICT_ARRIVES) {
      const s = since(seconds, at);
      if (s < 0) continue;
      const n = Math.min(FOLDERS_PER_TASK, Math.floor(s / CHECK_PER_FOLDER));
      done += n;
      if (n < FOLDERS_PER_TASK) checking = s;
    }
    return { done, checking };
  };

  return {
    group,
    ports,
    workerPorts,
    update: (seconds) => {
      const { done, checking } = checkedFolders(seconds);
      const handingOut = since(seconds, TASK_LEAVES[0]!) >= 0;
      const status = done >= FOLDERS ? "repositorio revisado" : checking >= 0 ? "revisando informe" : handingOut ? "repartiendo tareas" : "esperando";
      const key = `${done}:${status}`;
      if (key !== drawn) {
        drawn = key;
        draw(done, status);
      }
      buildings.forEach((b, i) => {
        b.material.opacity = i < done ? 0.5 : 0.1;
        b.check.visible = i < done;
      });
      streetMaterial.opacity = 0.25 + (done / FOLDERS) * 0.45;
      // The lens glides to the building being inspected and hovers above it.
      const working = checking >= 0 && done < FOLDERS;
      lens.visible = working;
      if (working) {
        const current = buildings[done]!;
        const previous = buildings[Math.max(done - 1, 0)]!;
        const glide = Math.min(((checking % CHECK_PER_FOLDER) / CHECK_PER_FOLDER) * 3, 1);
        lens.position.set(
          THREE.MathUtils.lerp(previous.at.x, current.at.x, glide),
          Math.max(previous.height, current.height) + 0.55,
          THREE.MathUtils.lerp(previous.at.z, current.at.z, glide),
        );
      }
      person.update(seconds, working);
      // The city brightens when Shell tells Atlas to start.
      const started = since(seconds, ATLAS_START_ARRIVES);
      halo.material.opacity = 0.25 + (started >= 0 && started < 0.6 ? (1 - started / 0.6) * 0.4 : 0);
      // The knowledge card rises, then leaves for Engram through the cable.
      const rise = since(seconds, ATLAS_CARD_AT);
      card.visible = rise >= 0 && since(seconds, ATLAS_WRITE_LEAVES) < 0;
      card.position.copy(cityCenter).add(new THREE.Vector3(0, Math.min(Math.max(rise, 0), 1) * 0.5, 0));
      card.rotation.y = rise * 2;
    },
  };
}
