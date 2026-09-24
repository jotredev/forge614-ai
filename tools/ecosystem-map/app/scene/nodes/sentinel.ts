import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createCharacter } from "../character";
import { CHECK_ASK_ARRIVES, SENTINEL_PASS, since } from "../timeline";
import { glowSprite } from "./datacenter";

// Sentinel seen from afar: "el verificador", as a checkpoint. It comes with
// the rulebook, checks each report against its 19 checks and hands in a
// record: it judges, it never builds or repairs. Each report Atlas sends
// rides a belt with rollers into a lit scanner arch and stops inside while
// a bar of light sweeps it; a board on the arch lights the checks and names
// the one being checked; in a glass booth, a person follows them on a
// monitor, with the rulebook on the desk; the report goes on to the booth
// and the person stamps the record, which goes back to Atlas.

export type SentinelNode = { group: THREE.Group; update(seconds: number): void };

export const SENTINEL = "#5fc4c9";
const SENTINEL_LIGHT = "#bdeef0";
const PASS = "#8fbf7a";
const CAUTION = "#e0b458";
const FACE_CAMERA = Math.PI / 4;

// The checks of the rulebook (Sentinel 0.1), by their real names.
export const CHECK_NAMES = [
  "layout",
  "node-pointer",
  "node-contract",
  "stack",
  "versions",
  "package-naming",
  "forbidden-mentions",
  "bilingual-docs",
  "docs-parity",
  "decisions",
  "agent-checklist-impact",
  "support-matrix",
  "error-codes",
  "workflows",
  "context-budget",
  "ecosystem-contract",
  "rules-catalog",
  "packs-catalog",
  "secrets-hygiene",
];
const CHECKS = CHECK_NAMES.length;
// The one report and check that come out as a caution (not a failure).
const CAUTION_REPORT = 1;
const CAUTION_CHECK = 11;

// Moments inside one pass, from the report arriving at the belt.
const MOVE_IN = 0.3;
const PER_CHECK = (SENTINEL_PASS - 0.9) / CHECKS;
const SCAN_END = MOVE_IN + CHECKS * PER_CHECK;
const EXIT_END = SCAN_END + 0.3;
const STAMP = EXIT_END + 0.1;

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
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  return { mesh, context, canvas, refresh: () => (texture.needsUpdate = true) };
}

// The rulebook, open, with a glowing cover.
function rulebook(): THREE.Group {
  const book = new THREE.Group();
  for (const side of [-1, 1]) {
    const page = solid(new THREE.BoxGeometry(0.42, 0.04, 0.56), "#f1ede2", 0.9);
    page.position.x = side * 0.22;
    page.rotation.z = side * -0.08;
    book.add(page);
  }
  const cover = solid(new THREE.BoxGeometry(0.92, 0.03, 0.6), SENTINEL, 0.5);
  cover.position.y = -0.035;
  book.add(cover, glowSprite(SENTINEL_LIGHT, 0.5, 1.2));
  return book;
}

const resultOf = (report: number, check: number): string => (report === CAUTION_REPORT && check === CAUTION_CHECK ? CAUTION : PASS);

export function createSentinel(top: number): SentinelNode {
  const group = new THREE.Group();
  const face = new THREE.Group();
  const archX = -0.7;
  const beltY = top + 0.85;

  // The belt, the arch and the booth run diagonally on screen, from back
  // left to front right, so the arch is seen from the front.
  const line = new THREE.Group();
  line.position.set(-0.9, 0, -0.9);
  line.rotation.y = -Math.PI / 4;
  face.add(line);
  const onLine = (x: number, y: number, z: number): THREE.Vector3 =>
    new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 4).add(line.position);

  // The belt: legs, a light top, rails and rollers that turn.
  const belt = solid(new RoundedBoxGeometry(4.6, 0.1, 0.8, 2, 0.03), "#4a5263", 0.4, 0.3);
  belt.position.set(0, beltY, 0);
  line.add(belt);
  for (const z of [-0.43, 0.43]) {
    const rail = solid(new THREE.BoxGeometry(4.6, 0.1, 0.05), "#8d96a8", 0.3, 0.7);
    rail.position.set(0, beltY + 0.07, z);
    line.add(rail);
  }
  // (The rollers are plain smooth cylinders: turning them about their own axis
  // changes nothing on screen, so they stay still and can be joined with the rest.)
  for (let i = 0; i < 9; i++) {
    const roller = solid(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 10), "#aab3c2", 0.3, 0.7);
    roller.rotation.x = Math.PI / 2;
    roller.position.set(-2.1 + i * 0.52, beltY - 0.08, 0);
    line.add(roller);
  }
  for (const x of [-2.1, 0, 2.1]) {
    const leg = solid(new THREE.BoxGeometry(0.1, 0.8, 0.6), "#2a2f3d", 0.5);
    leg.position.set(x, top + 0.4, 0);
    line.add(leg);
  }

  // The scanner arch: light posts and beam, a glowing frame, a sweeping bar
  // of light and a curtain that brightens while scanning.
  const arch = new THREE.Group();
  for (const z of [-0.7, 0.7]) {
    const post = solid(new RoundedBoxGeometry(0.2, 2.3, 0.2, 2, 0.04), "#c9d2de", 0.3, 0.6);
    post.position.set(0, 1.15, z);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.9, 0.06), new THREE.MeshBasicMaterial({ color: SENTINEL }));
    glow.position.set(0.11, 1.15, z * 0.86);
    arch.add(post, glow);
  }
  const beam = solid(new RoundedBoxGeometry(0.34, 0.26, 1.6, 2, 0.04), "#c9d2de", 0.3, 0.6);
  beam.position.y = 2.3;
  const topGlow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.2), new THREE.MeshBasicMaterial({ color: SENTINEL }));
  topGlow.position.set(0.18, 2.15, 0);
  const curtain = new THREE.Mesh(
    new THREE.PlaneGeometry(1.25, 1.4),
    new THREE.MeshBasicMaterial({ color: SENTINEL_LIGHT, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  curtain.rotation.y = Math.PI / 2;
  curtain.position.y = 1.45;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.25), new THREE.MeshBasicMaterial({ color: "#e8feff" }));
  const barGlow = glowSprite(SENTINEL_LIGHT, 0.6, 0.9);
  arch.add(beam, topGlow, curtain, bar, barGlow);
  arch.position.set(archX, top, 0);
  line.add(arch);

  // The board on the arch, facing the camera.
  const board = canvasPlane(2.4, 1.2, 512);
  board.mesh.position.copy(onLine(archX, top + 3.3, 0));
  face.add(board.mesh);

  // The report: a folder with a turquoise tab.
  const folder = new THREE.Group();
  folder.add(solid(new RoundedBoxGeometry(0.56, 0.12, 0.44, 2, 0.02), "#e6d9b8", 0.8));
  const tab = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.13, 0.06), new THREE.MeshBasicMaterial({ color: SENTINEL }));
  tab.position.set(-0.12, 0.02, -0.22);
  folder.add(tab);
  line.add(folder);

  // The glass booth at the end of the belt, with a desk, a monitor, the
  // rulebook, the record and the stamp.
  const boothAt = new THREE.Vector3(3.3, top, 0);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 2.3, 2.0),
    new THREE.MeshPhysicalMaterial({ color: "#d8f0ff", transparent: true, opacity: 0.1, roughness: 0.1, depthWrite: false }),
  );
  glass.position.set(boothAt.x, top + 1.15, boothAt.z);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(glass.geometry), new THREE.LineBasicMaterial({ color: SENTINEL, transparent: true, opacity: 0.8 }));
  frame.position.copy(glass.position);
  const desk = solid(new RoundedBoxGeometry(0.8, 0.06, 1.6, 2, 0.02), "#d9c7a6", 0.7);
  desk.position.set(boothAt.x - 0.55, top + 1.0, boothAt.z);
  const deskLeg = solid(new THREE.BoxGeometry(0.7, 1.0, 0.08), "#2a2f3d", 0.5);
  deskLeg.position.set(boothAt.x - 0.55, top + 0.5, boothAt.z + 0.7);
  const monitorFrame = solid(new RoundedBoxGeometry(0.06, 0.62, 0.9, 2, 0.02), "#141a23", 0.4, 0.4);
  monitorFrame.position.set(boothAt.x - 0.85, top + 1.42, boothAt.z - 0.2);
  const monitor = canvasPlane(0.84, 0.56, 320);
  monitor.mesh.rotation.y = Math.PI / 2;
  monitor.mesh.position.set(boothAt.x - 0.81, top + 1.42, boothAt.z - 0.2);
  const book = rulebook();
  book.scale.setScalar(0.6);
  book.rotation.y = Math.PI / 2;
  book.position.set(boothAt.x - 0.55, top + 1.06, boothAt.z + 0.45);
  line.add(glass, frame, desk, deskLeg, monitorFrame, monitor.mesh, book);

  // The record and the stamp that comes down on it.
  const acta = new THREE.Group();
  acta.add(new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.02, 0.6), new THREE.MeshBasicMaterial({ color: "#f4f1ea" })));
  const mark = new THREE.Mesh(new THREE.RingGeometry(0.09, 0.14, 24), new THREE.MeshBasicMaterial({ color: PASS, side: THREE.DoubleSide }));
  mark.rotation.x = -Math.PI / 2;
  mark.position.set(0.08, 0.02, 0.13);
  const stamp = new THREE.Group();
  const handle = solid(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 12), "#3a2f28", 0.6);
  handle.position.y = 0.25;
  stamp.add(handle, solid(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 20), SENTINEL, 0.5));
  stamp.position.set(0.08, 0.5, 0.13);
  acta.add(mark, stamp);
  acta.position.set(boothAt.x - 0.55, top + 1.04, boothAt.z - 0.1);
  line.add(acta);

  const person = createCharacter(SENTINEL, "typing");
  person.group.scale.setScalar(1.3);
  person.group.position.set(boothAt.x + 0.35, top, boothAt.z);
  person.group.rotation.y = -Math.PI / 2;
  line.add(person.group);

  face.rotation.y = FACE_CAMERA;
  group.add(face);

  let drawn = "";
  const draw = (report: number, done: number, finished: boolean): void => {
    const b = board.context;
    const w = board.canvas.width;
    const h = board.canvas.height;
    b.fillStyle = "#0d1a1c";
    b.fillRect(0, 0, w, h);
    b.strokeStyle = SENTINEL;
    b.lineWidth = 4;
    b.strokeRect(2, 2, w - 4, h - 4);
    b.fillStyle = SENTINEL_LIGHT;
    b.font = "600 26px ui-monospace, monospace";
    b.fillText(report < 0 ? "sentinel · check" : `sentinel · informe ${report + 1}`, 20, 38);
    for (let i = 0; i < CHECKS; i++) {
      b.fillStyle = i < done ? resultOf(report, i) : "#2a3a3d";
      b.beginPath();
      b.arc(34 + (i % 10) * 48, 80 + Math.floor(i / 10) * 44, 14, 0, Math.PI * 2);
      b.fill();
    }
    b.font = "500 24px ui-monospace, monospace";
    const caution = report === CAUTION_REPORT;
    b.fillStyle = finished && caution ? CAUTION : finished ? PASS : SENTINEL_LIGHT;
    const summary = caution ? "18 cumplen · 1 precaución" : "19 cumplen";
    b.fillText(report < 0 ? "esperando informe" : finished ? summary : `› ${CHECK_NAMES[Math.min(done, CHECKS - 1)]}`, 20, h - 26);
    board.refresh();

    const m = monitor.context;
    m.fillStyle = "#0b1118";
    m.fillRect(0, 0, monitor.canvas.width, monitor.canvas.height);
    m.font = "500 17px ui-monospace, monospace";
    const first = Math.max(0, Math.min(done - 6, CHECKS - 9));
    for (let r = 0; r < 9; r++) {
      const i = first + r;
      if (i >= CHECKS) break;
      const bad = resultOf(report, i) === CAUTION;
      const state = i < done ? (bad ? "!" : "✓") : i === done && !finished && report >= 0 ? "›" : " ";
      m.fillStyle = i < done ? resultOf(report, i) : i === done ? SENTINEL_LIGHT : "#4a5566";
      m.fillText(`${state} ${CHECK_NAMES[i]}`, 12, 26 + r * 22);
    }
    monitor.refresh();
  };

  return {
    group,
    update: (seconds) => {
      // Which report is being checked (the latest that has arrived), and
      // how far into its pass.
      let report = -1;
      let t = 0;
      CHECK_ASK_ARRIVES.forEach((at, i) => {
        const s = since(seconds, at);
        if (s >= 0) {
          report = i;
          t = s;
        }
      });
      const active = report >= 0 && t < SENTINEL_PASS;
      const scanning = active && t >= MOVE_IN && t < SCAN_END;
      const done = report < 0 ? 0 : t < MOVE_IN ? 0 : Math.min(CHECKS, Math.floor((t - MOVE_IN) / PER_CHECK));
      const finished = report >= 0 && t >= SCAN_END;
      const key = `${report}:${done}:${finished}`;
      if (key !== drawn) {
        drawn = key;
        draw(report, done, finished);
      }
      // The folder: comes onto the belt, waits inside the arch, goes on.
      let x = -2.1;
      if (t < MOVE_IN) x = THREE.MathUtils.lerp(-2.1, archX, t / MOVE_IN);
      else if (t < SCAN_END) x = archX;
      else x = THREE.MathUtils.lerp(archX, 2.1, Math.min((t - SCAN_END) / (EXIT_END - SCAN_END), 1));
      folder.position.set(x, beltY + 0.12, 0);
      folder.visible = active && t < STAMP;
      const sweep = scanning ? (1 - Math.cos((t - MOVE_IN) * 8)) / 2 : 0;
      bar.visible = scanning;
      barGlow.visible = scanning;
      bar.position.set(0, 0.95 + sweep * 1.0, 0);
      barGlow.position.copy(bar.position);
      (curtain.material as THREE.MeshBasicMaterial).opacity = scanning ? 0.3 : 0.08;
      // The stamp comes down on the record at the end of each pass.
      const s = t - STAMP;
      const down = active && s >= 0 && s < 0.4 ? Math.sin((s / 0.4) * Math.PI) : 0;
      stamp.position.y = 0.5 - down * 0.4;
      stamp.visible = active && t >= EXIT_END - 0.4;
      mark.visible = report >= 0 && (t >= STAMP + 0.2 || !active);
      (mark.material as THREE.MeshBasicMaterial).color.set(report === CAUTION_REPORT ? CAUTION : PASS);
      person.update(seconds, scanning);
    },
  };
}
