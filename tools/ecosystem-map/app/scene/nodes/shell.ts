import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createCharacter } from "../character";

// Shell seen from afar: "la terminal". A person sits at a wooden desk,
// typing, while a holographic terminal floats above a small projector at the
// back of the desk and types the session line by line.

export type ShellNode = { group: THREE.Group; update(seconds: number): void };

const SHELL = "#7fb2d9";
const DESK_TOP = 1.55; // height of the desk surface above the plate
// Planes face +z by default; this turns them toward the isometric camera.
const FACE_CAMERA = Math.PI / 4;

function solid(geometry: THREE.BufferGeometry, color: string, roughness = 0.6, metalness = 0.1): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

type Line = { prefix: string; prefixColor: string; text: string };

// The commands are the real global commands of the ecosystem; the outputs
// are neutral confirmations, not invented numbers.
const SESSION: Line[] = [
  { prefix: "$", prefixColor: SHELL, text: "forge614 status" },
  { prefix: "✓", prefixColor: "#8fbf7a", text: "engram   listo" },
  { prefix: "✓", prefixColor: "#8fbf7a", text: "engines  listo" },
  { prefix: "$", prefixColor: SHELL, text: "forge614 prepare" },
  { prefix: "›", prefixColor: "#e0b458", text: "preparando proyecto…" },
];

// Typing rhythm of the terminal, shared so the whole map follows it:
// characters per second, one full loop (typing plus a pause while the
// memories travel), and the moment "forge614 prepare" is entered.
const TYPE_SPEED = 14;
const TOTAL_CHARS = SESSION.reduce((sum, line) => sum + line.text.length, 0);
export const SHELL_CYCLE = TOTAL_CHARS / TYPE_SPEED + 7;
export const PREPARE_ENTERED_AT = SESSION.slice(0, 4).reduce((sum, line) => sum + line.text.length, 0) / TYPE_SPEED;
export const TYPED_AT = TOTAL_CHARS / TYPE_SPEED;

type Terminal = { mesh: THREE.Mesh; update(seconds: number): void; isTyping(): boolean };

// A terminal screen: a title bar with the three dots and the window name,
// then the session typing itself line by line, with a blinking cursor. It
// redraws only when something visible changes.
function typingTerminal(width: number, height: number, title: string): Terminal {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = Math.round((768 * height) / width);
  const context = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const bar = 64;
  const lineHeight = 52;
  let lastKey = "";
  let typing = false;

  const draw = (typed: number, cursorOn: boolean): void => {
    context.fillStyle = "#0b1118";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#161e29";
    context.fillRect(0, 0, canvas.width, bar);
    ["#e07a6a", "#e0b458", "#8fbf7a"].forEach((color, i) => {
      context.fillStyle = color;
      context.beginPath();
      context.arc(36 + i * 30, bar / 2, 9, 0, Math.PI * 2);
      context.fill();
    });
    context.font = "600 24px ui-monospace, Menlo, Consolas, monospace";
    context.fillStyle = "#6f7f93";
    context.textAlign = "center";
    context.fillText(title, canvas.width / 2, bar / 2 + 8);
    context.textAlign = "left";

    context.font = "500 30px ui-monospace, Menlo, Consolas, monospace";
    let remaining = typed;
    let y = bar + 56;
    let cursorX = 40;
    for (const line of SESSION) {
      if (remaining <= 0) break;
      const shown = line.text.slice(0, remaining);
      remaining -= line.text.length;
      context.fillStyle = line.prefixColor;
      context.fillText(line.prefix, 40, y);
      context.fillStyle = "#c9d6e3";
      context.fillText(shown, 76, y);
      cursorX = 76 + context.measureText(shown).width + 6;
      if (remaining > 0) y += lineHeight;
    }
    if (cursorOn) {
      context.fillStyle = SHELL;
      context.fillRect(cursorX, y - 26, 16, 32);
    }
    texture.needsUpdate = true;
  };
  draw(0, true);

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture }));
  return {
    mesh,
    update: (seconds) => {
      // Type at a steady pace, hold the finished screen, then start over.
      const typed = Math.min(TOTAL_CHARS, Math.floor((seconds % SHELL_CYCLE) * TYPE_SPEED));
      typing = typed < TOTAL_CHARS;
      const cursorOn = Math.floor(seconds * 1.8) % 2 === 0;
      const key = `${typed}:${cursorOn}`;
      if (key !== lastKey) {
        lastKey = key;
        draw(typed, cursorOn);
      }
    },
    isTyping: () => typing,
  };
}

function softGlowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// A glass window: dark frame, a glass rim around the screen, and a soft
// glow of Shell's color behind it.
function glassWindow(width: number, height: number, title: string): { group: THREE.Group } & Omit<Terminal, "mesh"> {
  const group = new THREE.Group();
  const frame = solid(new RoundedBoxGeometry(width + 0.3, height + 0.3, 0.14, 5, 0.12), "#141a23", 0.35, 0.4);
  const rim = new THREE.Mesh(
    new RoundedBoxGeometry(width + 0.42, height + 0.42, 0.06, 5, 0.16),
    new THREE.MeshPhysicalMaterial({ color: "#bfe0ff", transparent: true, opacity: 0.18, roughness: 0.1, clearcoat: 1, depthWrite: false }),
  );
  rim.position.z = -0.02;
  const screen = typingTerminal(width, height, title);
  screen.mesh.position.z = 0.075;
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 1.9, height * 2.1),
    new THREE.MeshBasicMaterial({ map: softGlowTexture(), color: SHELL, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  glow.position.z = -0.2;
  group.add(glow, rim, frame, screen.mesh);
  return { group, update: screen.update, isTyping: screen.isTyping };
}

// The small projector the window floats above, with a faint beam of light.
function projector(top: number, beamHeight: number): THREE.Group {
  const group = new THREE.Group();
  const base = solid(new THREE.CylinderGeometry(0.7, 0.85, 0.22, 40), "#1b2230", 0.4, 0.5);
  base.position.y = top + 0.11;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 8, 48), new THREE.MeshBasicMaterial({ color: SHELL }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = top + 0.23;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 0.55, beamHeight, 40, 1, true),
    new THREE.MeshBasicMaterial({ color: SHELL, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  beam.position.y = top + 0.23 + beamHeight / 2;
  group.add(base, ring, beam);
  return group;
}

// A wooden desk with a keyboard (softly lit in Shell's color), a mouse and a
// coffee mug.
function desk(top: number): THREE.Group {
  const group = new THREE.Group();
  const surface = solid(new RoundedBoxGeometry(3.8, 0.12, 1.7, 3, 0.04), "#d9c7a6", 0.7);
  surface.position.set(0, top + DESK_TOP - 0.06, 0.9);
  group.add(surface);
  for (const x of [-1.75, 1.75]) {
    for (const z of [0.18, 1.62]) {
      const leg = solid(new THREE.BoxGeometry(0.1, DESK_TOP - 0.12, 0.1), "#2a2f3d", 0.5);
      leg.position.set(x, top + (DESK_TOP - 0.12) / 2, z);
      group.add(leg);
    }
  }

  const on = top + DESK_TOP;
  const keyboard = solid(new RoundedBoxGeometry(1.25, 0.05, 0.42, 2, 0.02), "#20262f", 0.5);
  keyboard.position.set(-0.05, on + 0.025, 1.45);
  const keys = solid(new THREE.BoxGeometry(1.12, 0.02, 0.32), "#cfd6e0", 0.6);
  keys.position.set(-0.05, on + 0.06, 1.45);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.66),
    new THREE.MeshBasicMaterial({ color: SHELL, transparent: true, opacity: 0.18, depthWrite: false }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(-0.05, on + 0.002, 1.45);
  const mouse = solid(new THREE.SphereGeometry(0.1, 16, 12), "#20262f", 0.4);
  mouse.scale.set(0.8, 0.45, 1.1);
  mouse.position.set(0.85, on + 0.04, 1.45);
  const mug = solid(new THREE.CylinderGeometry(0.12, 0.11, 0.24, 20), "#f1ece3", 0.5);
  mug.position.set(-1.25, on + 0.12, 1.2);
  const handle = solid(new THREE.TorusGeometry(0.07, 0.022, 8, 16), "#f1ece3", 0.5);
  handle.position.set(-1.12, on + 0.13, 1.2);
  const coffee = solid(new THREE.CircleGeometry(0.1, 20), "#4a2f22", 0.3);
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.set(-1.25, on + 0.23, 1.2);
  group.add(keyboard, keys, glow, mouse, mug, handle, coffee);
  return group;
}

export function createShell(top: number): ShellNode {
  const group = new THREE.Group();
  const face = new THREE.Group();

  const table = desk(top);
  const emitter = projector(top + DESK_TOP, 1.0);
  emitter.position.z = 0.4;
  emitter.scale.set(0.8, 1, 0.8);
  const panel = glassWindow(4.2, 2.8, "forge614 · shell");
  panel.group.position.set(0, top + DESK_TOP + 2.55, 0.35);

  // Toy scale, seated on an office chair and typing on the desk keyboard,
  // facing the screen so the camera sees their back, like someone at work.
  const person = createCharacter(SHELL, "typing");
  person.group.scale.setScalar(1.55);
  person.group.position.set(0, top, 2.75);
  person.group.rotation.y = Math.PI;

  face.add(table, emitter, panel.group, person.group);
  face.rotation.y = FACE_CAMERA;
  group.add(face);
  return {
    group,
    update: (seconds) => {
      panel.update(seconds);
      person.update(seconds, panel.isTyping());
    },
  };
}
