import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createCharacter } from "../character";
import { glowSprite } from "./datacenter";

// One worker, on its own small plate: a person seated at a
// computer. While a task is theirs, lines of code fill the screen as they
// type; then the screen shows the report sent. Each task starts from
// scratch: the worker keeps nothing afterwards.

export type WorkerNode = {
  group: THREE.Group;
  // Where the two cables from Atlas plug in, relative to the node's center.
  ports: THREE.Vector3[];
  update(seconds: number): void;
};

// When this worker works in the cycle: from the moment the task arrives to
// the moment the report leaves.
export type WorkerSchedule = { cycle: number; from: number; to: number };

export const WORKERS = "#d9876f";
const WORKERS_LIGHT = "#f2c3b4";
const READY = "#8fbf7a";
const FACE_CAMERA = Math.PI / 4;

function solid(geometry: THREE.BufferGeometry, color: string, roughness = 0.6, metalness = 0.1): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

type State = { kind: "waiting" } | { kind: "working"; lines: number } | { kind: "done" };

// `toAtlas` is the direction from this worker to Atlas on the floor
// (world space), so the port faces it.
export function createWorker(top: number, index: number, schedule: WorkerSchedule, toAtlas: THREE.Vector2): WorkerNode {
  const group = new THREE.Group();
  const face = new THREE.Group();

  const desk = solid(new RoundedBoxGeometry(2.0, 0.08, 1.0, 3, 0.03), "#d9c7a6", 0.7);
  desk.position.set(0, top + 1.2, -0.3);
  face.add(desk);
  for (const x of [-0.9, 0.9]) {
    const leg = solid(new THREE.BoxGeometry(0.08, 1.16, 0.8), "#2a2f3d", 0.5);
    leg.position.set(x, top + 0.58, -0.3);
    face.add(leg);
  }
  const keyboard = solid(new RoundedBoxGeometry(0.8, 0.04, 0.28, 2, 0.02), "#20262f", 0.5);
  keyboard.position.set(0, top + 1.26, 0.05);
  face.add(keyboard);

  // The monitor, with its screen drawn on a canvas.
  const stand = solid(new THREE.BoxGeometry(0.08, 0.35, 0.08), "#2a2f3d", 0.5);
  stand.position.set(0, top + 1.42, -0.6);
  const frame = solid(new RoundedBoxGeometry(1.25, 0.8, 0.06, 2, 0.03), "#141a23", 0.4, 0.4);
  frame.position.set(0, top + 1.95, -0.62);
  face.add(stand, frame);
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 240;
  const context = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.72), new THREE.MeshBasicMaterial({ map: texture }));
  screen.position.set(0, top + 1.95, -0.585);
  const glow = glowSprite(WORKERS, 0.25, 1.8);
  glow.position.set(0, top + 1.95, -0.7);
  face.add(glow, screen);

  // The computer tower under the desk, where the cable from Atlas plugs
  // in, on the side facing Atlas.
  const tower = solid(new RoundedBoxGeometry(0.4, 0.8, 0.7, 2, 0.03), "#20252f", 0.45, 0.5);
  tower.position.set(0.55, top + 0.4, -0.35);
  const towerLight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.02), new THREE.MeshBasicMaterial({ color: WORKERS_LIGHT }));
  towerLight.position.set(0.55, top + 0.5, 0.01);
  face.add(tower, towerLight);
  const out = new THREE.Vector3(toAtlas.x, 0, toAtlas.y).applyAxisAngle(new THREE.Vector3(0, 1, 0), -FACE_CAMERA).normalize();
  // Two ports: the task comes in through one, the report leaves through
  // the other.
  const across = new THREE.Vector3(-out.z, 0, out.x);
  const portsAt = [-1, 1].map((side) => {
    const at = new THREE.Vector3(0.55, top + 0.3, -0.35).addScaledVector(out, 0.36).addScaledVector(across, side * 0.14);
    const mouth = solid(new THREE.BoxGeometry(0.16, 0.14, 0.05), "#0b0e13", 0.6);
    mouth.position.copy(at);
    mouth.lookAt(at.clone().add(out));
    face.add(mouth);
    return at;
  });

  const person = createCharacter(WORKERS, "typing");
  person.group.scale.setScalar(1.25);
  person.group.position.set(0, top, 0.9);
  person.group.rotation.y = Math.PI;
  face.add(person.group);

  face.rotation.y = FACE_CAMERA;
  group.add(face);

  const title = `worker ${index + 1}`;
  let lastKey = "";
  const draw = (state: State): void => {
    context.fillStyle = "#0b1118";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#161e29";
    context.fillRect(0, 0, canvas.width, 34);
    context.fillStyle = "#6f7f93";
    context.font = "600 18px ui-monospace, monospace";
    context.fillText(title, 14, 23);
    context.font = "500 20px ui-monospace, monospace";
    if (state.kind === "waiting") {
      context.fillStyle = "#6f7f93";
      context.fillText("esperando tarea…", 14, 80);
    } else if (state.kind === "done") {
      context.fillStyle = READY;
      context.fillText("✓ informe enviado", 14, 80);
    } else {
      context.fillStyle = WORKERS_LIGHT;
      context.fillText("› analizando tarea", 14, 64);
      for (let i = 0; i < state.lines; i++) {
        context.fillStyle = i % 3 === 0 ? "#7fb2d9" : "#c9d6e3";
        context.fillRect(14 + (i % 2) * 20, 84 + i * 18, 120 + ((i * 53) % 180), 8);
      }
    }
    texture.needsUpdate = true;
  };
  draw({ kind: "waiting" });

  const turn = (v: THREE.Vector3): THREE.Vector3 => v.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), FACE_CAMERA);
  return {
    group,
    ports: portsAt.map(turn),
    update: (seconds) => {
      const t = seconds % schedule.cycle;
      const working = t >= schedule.from && t < schedule.to;
      const state: State = working
        ? { kind: "working", lines: Math.min(8, Math.floor(((t - schedule.from) / (schedule.to - schedule.from)) * 9)) }
        : t >= schedule.to
          ? { kind: "done" }
          : { kind: "waiting" };
      const key = state.kind === "working" ? `w${state.lines}` : state.kind;
      if (key !== lastKey) {
        lastKey = key;
        draw(state);
      }
      glow.material.opacity = working ? 0.45 : 0.2;
      (towerLight.material as THREE.MeshBasicMaterial).color.set(working ? WORKERS : state.kind === "done" ? READY : "#3a4152");
      person.update(seconds, working);
    },
  };
}
