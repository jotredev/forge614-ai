import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  APPLIED_AT,
  APPLY_ARRIVES,
  ENGINE_FOUND_AT,
  ENGINES_ASK_ARRIVES,
  ENGINES_REPLY_LEAVES,
  PREVIEW_ASK_ARRIVES,
  PREVIEW_REPLY_LEAVES,
  since,
} from "../timeline";
import { createCharacter } from "../character";
import { glowSprite } from "./datacenter";

// Engines seen from afar: "los motores", as a test bench. A projector
// raises a beam into a hologram of a working engine (moving pistons, a
// spinning pulley). When Shell asks which AI engines are installed, a ring
// scans the hologram and the four engines are found one by one: a floating
// panel and the tablet of the person beside it mark each one as ready.
// Then the answer goes back to Shell. When Shell asks for a preview of a
// change, the panel shows it; once the person confirms it in Shell, Engines
// applies only that and the hologram turns amber for a moment.

export type EnginesNode = {
  group: THREE.Group;
  // One pair of ports per node it talks to, in the order given: where
  // requests come in and answers leave, relative to the node's center.
  ports: Array<{ inlet: THREE.Vector3; outlet: THREE.Vector3 }>;
  update(seconds: number): void;
};

export const ENGINES = "#d9a95b";
const ENGINES_LIGHT = "#f0cf8f";
const READY = "#8fbf7a";
// Planes face +z by default; this turns them toward the isometric camera.
const FACE_CAMERA = Math.PI / 4;
const SCAN_TIME = ENGINES_REPLY_LEAVES - ENGINES_ASK_ARRIVES;

function solid(geometry: THREE.BufferGeometry, color: string, roughness = 0.6, metalness = 0.1): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// A projector: a round metal base with an amber rim and a glowing lens,
// and a soft cone of light rising from it.
function projector(radius: number, beam: number): THREE.Group {
  const group = new THREE.Group();
  const base = solid(new THREE.CylinderGeometry(radius, radius + 0.15, 0.4, 48), "#20252f", 0.45, 0.5);
  base.position.y = 0.2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.02, 0.035, 8, 64), new THREE.MeshBasicMaterial({ color: ENGINES }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.4;
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, 0.04, 40), new THREE.MeshBasicMaterial({ color: ENGINES_LIGHT }));
  lens.position.y = 0.42;
  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.05, radius * 0.55, beam, 40, 1, true),
    new THREE.MeshBasicMaterial({ color: ENGINES_LIGHT, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  cone.position.y = 0.42 + beam / 2;
  const glow = glowSprite(ENGINES_LIGHT, 0.5, radius * 2.2);
  glow.position.y = 0.5;
  group.add(base, rim, lens, cone, glow);
  return group;
}

// A working engine as a hologram (translucent faces and bright edges):
// block, four cylinders with pistons that move, oil pan and a front pulley
// that spins.
function engineHologram(): { group: THREE.Group; update(seconds: number): void; setColor(color: string): void } {
  const group = new THREE.Group();
  const fill = new THREE.MeshBasicMaterial({ color: ENGINES_LIGHT, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide });
  const line = new THREE.LineBasicMaterial({ color: ENGINES_LIGHT, transparent: true, opacity: 0.95 });
  const part = (geometry: THREE.BufferGeometry, x: number, y: number, z: number): THREE.Group => {
    const holder = new THREE.Group();
    holder.add(new THREE.Mesh(geometry, fill), new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 25), line));
    holder.position.set(x, y, z);
    group.add(holder);
    return holder;
  };
  part(new THREE.BoxGeometry(1.7, 0.8, 0.9), 0, 0, 0);
  part(new THREE.BoxGeometry(1.5, 0.22, 0.7), 0, -0.51, 0);
  const pistons: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * 0.35;
    part(new THREE.CylinderGeometry(0.14, 0.14, 0.3, 14), x, 0.55, 0);
    pistons.push(part(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 12), x, 0.8, 0));
  }
  const pulley = part(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 20), 0, -0.05, 0.5);
  pulley.rotation.x = Math.PI / 2;
  return {
    group,
    update: (seconds) => {
      pistons.forEach((p, i) => {
        p.position.y = 0.8 + Math.sin(seconds * 9 + i * (Math.PI / 2)) * 0.09;
      });
      pulley.rotation.y = seconds * 4;
    },
    setColor: (color) => {
      fill.color.set(color);
      line.color.set(color);
    },
  };
}

// What happens to the engine that gets the change: nothing yet, a preview
// is ready, or the confirmed change is applied.
type Change = "none" | "preview" | "applied";
const CHANGED = 2; // the engine that gets the change ("motor 3")

// A screen listing the four engines, each searching or ready (green); the
// one that gets the change shows its preview, then applied (amber).
// Redraws only when something changes.
function readout(width: number, height: number, title: string): { mesh: THREE.Mesh; update(found: number, change: Change): void } {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = Math.round((512 * height) / width);
  const context = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  let last = "";
  const draw = (found: number, change: Change): void => {
    context.fillStyle = "rgba(20,16,8,0.92)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = ENGINES;
    context.lineWidth = 4;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    context.fillStyle = ENGINES_LIGHT;
    context.font = "600 34px ui-monospace, monospace";
    context.fillText(title, 28, 52);
    const row = (canvas.height - 80) / 4;
    for (let i = 0; i < 4; i++) {
      const y = 80 + i * row + row / 2;
      const changed = i === CHANGED && change !== "none";
      context.fillStyle = changed ? ENGINES_LIGHT : i < found ? READY : "#6b7485";
      context.beginPath();
      context.arc(44, y, 12, 0, Math.PI * 2);
      context.fill();
      context.font = "500 30px ui-monospace, monospace";
      context.fillText(`motor ${i + 1}`, 72, y + 10);
      context.textAlign = "right";
      const status = changed ? (change === "preview" ? "vista previa" : "aplicado") : i < found ? "listo" : "buscando…";
      context.fillText(status, canvas.width - 28, y + 10);
      context.textAlign = "left";
    }
    texture.needsUpdate = true;
  };
  draw(0, "none");
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.95, side: THREE.DoubleSide }),
  );
  return {
    mesh,
    update: (found, change) => {
      const key = `${found}:${change}`;
      if (key !== last) {
        last = key;
        draw(found, change);
      }
    },
  };
}

// `towards` are the directions from Engines to each node it talks to, on
// the floor (world space), so each pair of cable ports faces its node.
export function createEngines(top: number, towards: THREE.Vector2[]): EnginesNode {
  const group = new THREE.Group();
  const face = new THREE.Group();
  const center = new THREE.Vector3(0.5, top, -0.6);

  const base = projector(1.1, 1.3);
  base.position.copy(center);
  const hologram = engineHologram();
  hologram.group.scale.setScalar(1.15);
  hologram.group.position.set(center.x, top + 2.55, center.z);
  const halo = glowSprite(ENGINES, 0.3, 4.2);
  halo.position.copy(hologram.group.position);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.3, 0.03, 6, 64),
    new THREE.MeshBasicMaterial({ color: ENGINES_LIGHT, transparent: true, opacity: 0.85 }),
  );
  ring.rotation.x = Math.PI / 2;
  const panel = readout(2.0, 1.5, "motores de IA");
  panel.mesh.position.set(2.5, top + 3.5, -1.4);
  panel.mesh.rotation.y = -0.35;

  // The person stands to the left, in profile, a little to the front so the
  // cables that come in from behind never pass by them, holding a lit
  // tablet that mirrors the panel.
  const stand = new THREE.Vector3(-1.5, top, 3.0);
  const person = createCharacter(ENGINES, "holding");
  person.group.scale.setScalar(1.55);
  person.group.position.copy(stand);
  // Facing the front of the projector, so the camera sees them in profile.
  person.group.rotation.y = Math.atan2(center.x - stand.x, center.z + 1.6 - stand.z);
  // The tablet in both hands, its screen tilted up toward the face.
  const tablet = readout(0.5, 0.36, "diagnóstico");
  tablet.mesh.rotation.set(-1.15, Math.PI, 0, "YXZ");
  const tabletBody = solid(new RoundedBoxGeometry(0.54, 0.02, 0.4, 2, 0.01), "#1b1f29", 0.4, 0.3);
  // Same tilt as the screen, just under it.
  tabletBody.rotation.x = -(Math.PI / 2 - 1.15);
  tabletBody.position.set(0, -0.012, 0.005);
  const tabletGlow = glowSprite(ENGINES_LIGHT, 0.3, 0.55);
  tabletGlow.position.y = 0.1;
  person.hold.add(tabletBody, tablet.mesh, tabletGlow);

  // Two ports on the projector base for each node it talks to, on the side
  // facing that node: the inlet for requests and the outlet for answers.
  const turn = (v: THREE.Vector3): THREE.Vector3 => v.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), FACE_CAMERA);
  const ports = towards.map((toward) => {
    const out = new THREE.Vector3(toward.x, 0, toward.y).applyAxisAngle(new THREE.Vector3(0, 1, 0), -FACE_CAMERA).normalize();
    const across = new THREE.Vector3(-out.z, 0, out.x);
    const port = (side: number): THREE.Vector3 => {
      const at = center.clone().addScaledVector(out, 1.22).addScaledVector(across, side * 0.35).setY(top + 0.2);
      const mouth = solid(new THREE.BoxGeometry(0.3, 0.2, 0.06), "#0b0e13", 0.6);
      mouth.position.copy(at);
      mouth.lookAt(at.clone().add(out));
      face.add(mouth);
      return turn(at);
    };
    return { inlet: port(-1), outlet: port(1) };
  });

  face.add(base, hologram.group, halo, ring, panel.mesh, person.group);
  face.rotation.y = FACE_CAMERA;
  group.add(face);

  return {
    group,
    ports,
    update: (seconds) => {
      const found = ENGINE_FOUND_AT.filter((at) => since(seconds, at) >= 0).length;
      const change: Change = since(seconds, APPLIED_AT) >= 0 ? "applied" : since(seconds, PREVIEW_REPLY_LEAVES) >= 0 ? "preview" : "none";
      panel.update(found, change);
      tablet.update(found, change);

      hologram.update(seconds);
      // Applying the confirmed change turns the hologram amber for a moment.
      const applying = since(seconds, APPLY_ARRIVES);
      hologram.setColor(applying >= 0 && applying < APPLIED_AT - APPLY_ARRIVES + 0.8 ? "#ffc56b" : ENGINES_LIGHT);
      hologram.group.rotation.y = -0.5 + seconds * 0.35;
      // The ring always sweeps the hologram up and down; while the engines
      // are being found it sweeps faster and brighter.
      const scan = since(seconds, ENGINES_ASK_ARRIVES);
      const scanning = scan >= 0 && scan < SCAN_TIME;
      const sweep = scanning ? (1 - Math.cos((scan / SCAN_TIME) * Math.PI * 4)) / 2 : (Math.sin(seconds * 1.8) + 1) / 2;
      ring.position.set(center.x, top + 1.7 + sweep * 1.8, center.z);
      ring.material.opacity = scanning ? 1 : 0.7;
      // The hologram brightens when each request arrives and as each engine
      // is found.
      const pulse = Math.max(
        ...[ENGINES_ASK_ARRIVES, ...ENGINE_FOUND_AT, PREVIEW_ASK_ARRIVES, APPLY_ARRIVES].map((at) => {
          const s = since(seconds, at);
          return s >= 0 && s < 0.5 ? 1 - s / 0.5 : 0;
        }),
      );
      halo.material.opacity = 0.3 + pulse * 0.35;
      // The person taps the tablet while Engines scans, prepares the preview
      // and applies the change.
      const during = (from: number, to: number): boolean => since(seconds, from) >= 0 && since(seconds, to) < 0;
      person.update(
        seconds,
        during(ENGINES_ASK_ARRIVES, ENGINES_REPLY_LEAVES) || during(PREVIEW_ASK_ARRIVES, PREVIEW_REPLY_LEAVES) || during(APPLY_ARRIVES, APPLIED_AT),
      );
    },
  };
}
