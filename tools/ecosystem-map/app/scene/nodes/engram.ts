import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RECALL_LEAVES, RECALL_LOOKUP, SAVE_ARRIVES, STORE_TIME, since } from "../timeline";

// Engram seen from afar: "la memoria", as a vault that works on its own,
// on the map's shared clock. When Shell asks, the neuron hologram glows and
// a pulse goes down the server rack and out through the fiber cable. When
// Shell saves, the memory comes in at the foot of the rack, a pulse rises
// into the hologram, and the hologram brightens: the memory is saved.

export type EngramNode = {
  group: THREE.Group;
  // Where incoming memories plug in, relative to the node's center.
  inlet: THREE.Vector3;
  // Where recalled memories leave for Shell, relative to the node's center.
  outlet: THREE.Vector3;
  update(seconds: number): void;
};
type Hologram = { group: THREE.Group; update(seconds: number): void; flash(amount: number): void };

const ENGRAM = "#d98ca0";
const ENGRAM_LIGHT = "#f3b7c6";
// Planes face +z by default; this turns them toward the isometric camera.
const FACE_CAMERA = Math.PI / 4;

function solid(geometry: THREE.BufferGeometry, color: string, roughness = 0.6, metalness = 0.1): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function glowTexture(): THREE.Texture {
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

function glowSprite(color: string, opacity: number, size: number): THREE.Sprite {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  sprite.scale.setScalar(size);
  return sprite;
}

// The neuron network as a hologram: glowing translucent spheres and threads,
// a soft halo, slow rotation, and pulses traveling along the threads.
function neuronHologram(scale: number): Hologram {
  const group = new THREE.Group();
  const spin = new THREE.Group();
  group.add(spin);

  const nodeMaterial = new THREE.MeshBasicMaterial({ color: ENGRAM_LIGHT, transparent: true, opacity: 0.85 });
  const threadMaterial = new THREE.MeshBasicMaterial({ color: ENGRAM, transparent: true, opacity: 0.45, depthWrite: false });
  const center = new THREE.Vector3(0, 0, 0);
  const points = [center];
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    const radius = 0.8 + (i % 3) * 0.35;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, -0.6 + (i % 4) * 0.4, Math.sin(angle) * radius));
  }
  points.forEach((p, i) => {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(i === 0 ? 0.3 : 0.13, 20, 14), nodeMaterial);
    sphere.position.copy(p);
    spin.add(sphere);
  });

  const threads: Array<[THREE.Vector3, THREE.Vector3]> = [];
  const link = (a: THREE.Vector3, b: THREE.Vector3): void => {
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, a.distanceTo(b), 6), threadMaterial);
    thread.position.copy(a).lerp(b, 0.5);
    thread.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    spin.add(thread);
    threads.push([a, b]);
  };
  for (let i = 1; i < points.length; i++) {
    link(center, points[i]!);
    link(points[i]!, points[i === points.length - 1 ? 1 : i + 1]!);
  }

  // Pulses: small bright dots running from the outside into the center.
  const pulses = Array.from({ length: 4 }, (_, i) => {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
    spin.add(dot);
    return { dot, thread: (i * 5) % threads.length, offset: i * 0.37 };
  });

  const halo = glowSprite(ENGRAM, 0.4, 3.6);
  group.add(halo);
  group.scale.setScalar(scale);

  return {
    group,
    update: (seconds) => {
      spin.rotation.y = seconds * 0.25;
      for (const pulse of pulses) {
        const t = (seconds * 0.5 + pulse.offset) % 1;
        const cycle = Math.floor(seconds * 0.5 + pulse.offset);
        const [a, b] = threads[(pulse.thread + cycle * 3) % threads.length]!;
        pulse.dot.position.copy(b).lerp(a, t);
      }
    },
    // A brief brightening when a new memory arrives (0 = calm, 1 = peak).
    flash: (amount) => {
      halo.material.opacity = 0.4 + amount * 0.5;
      halo.scale.setScalar(3.6 + amount * 1.2);
    },
  };
}

// Smooth 0→1 ramp of `t` between `from` and `to`.
function ramp(t: number, from: number, to: number): number {
  return THREE.MathUtils.smoothstep(t, from, to);
}

export function createEngram(top: number): EngramNode {
  const group = new THREE.Group();
  const face = new THREE.Group();

  // The server rack with rows of blinking lights.
  const rackHeight = 3.4;
  const rack = solid(new RoundedBoxGeometry(1.8, rackHeight, 1.3, 3, 0.05), "#1d222c", 0.4, 0.5);
  rack.position.set(0, top + rackHeight / 2, -0.3);
  face.add(rack);
  const lights: THREE.Mesh[] = [];
  for (let row = 0; row < 8; row++) {
    const slot = solid(new THREE.BoxGeometry(1.5, 0.3, 0.04), "#2a3140", 0.5, 0.3);
    slot.position.set(0, top + 0.35 + row * 0.38, 0.37);
    face.add(slot);
    for (let i = 0; i < 4; i++) {
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.05, 0.02),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? ENGRAM_LIGHT : "#8fbf7a" }),
      );
      light.position.set(0.45 + i * 0.14, top + 0.35 + row * 0.38, 0.4);
      face.add(light);
      lights.push(light);
    }
  }

  // Two ports at the foot of the rack, on the side facing Shell: the inlet
  // where saved memories come in, and the outlet where recalled memories
  // leave. Each has its own cable and flashes when a memory goes through.
  const port = (z: number): { at: THREE.Vector3; flash: THREE.Sprite } => {
    const at = new THREE.Vector3(-0.93, top + 0.45, z);
    const mouth = solid(new THREE.BoxGeometry(0.06, 0.3, 0.3), "#0b0e13", 0.6);
    mouth.position.copy(at);
    const flash = glowSprite(ENGRAM_LIGHT, 0, 1.2);
    flash.position.copy(at).add(new THREE.Vector3(-0.1, 0, 0));
    face.add(mouth, flash);
    return { at, flash };
  };
  const { at: inletAt, flash: inletFlash } = port(-0.6);
  const { at: outletAt, flash: outletFlash } = port(0.05);

  // The pulse that rises through the rack into the hologram.
  const pulse = glowSprite(ENGRAM_LIGHT, 0, 0.7);
  face.add(pulse);

  const hologram = neuronHologram(1.05);
  hologram.group.position.set(0, top + 4.6, -0.3);

  face.add(hologram.group);
  face.rotation.y = FACE_CAMERA;
  group.add(face);

  const rackTop = new THREE.Vector3(0, top + rackHeight, -0.3);
  const hologramCenter = new THREE.Vector3(0, top + 4.6, -0.3);

  return {
    group,
    inlet: inletAt.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), FACE_CAMERA),
    outlet: outletAt.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), FACE_CAMERA),
    update: (seconds) => {
      // Recall: Shell asked, so the hologram glows and a pulse goes down
      // to the inlet, leaving through the cable as RECALL_LEAVES.
      const lookup = since(seconds, RECALL_LEAVES - RECALL_LOOKUP);
      const down = lookup >= 0 && lookup < RECALL_LOOKUP ? ramp(lookup, 0.2, RECALL_LOOKUP) : -1;
      // Save: a memory arrives from Shell, the inlet flashes, a pulse rises
      // into the hologram, and the hologram glows: the memory is saved.
      const stored = since(seconds, SAVE_ARRIVES);
      const up = stored >= 0 && stored < STORE_TIME * 0.6 ? ramp(stored, 0.1, STORE_TIME * 0.6) : -1;

      const fade = (at: number, length: number): number => (at >= 0 && at < length ? 1 - at / length : 0);
      inletFlash.material.opacity = fade(stored, 0.6) * 0.9;
      outletFlash.material.opacity = Math.max(down >= 0 ? down : 0, fade(lookup - RECALL_LOOKUP, 0.4)) * 0.9;

      // Along the rack: 0 = the port, 1 = hologram.
      const height = down >= 0 ? 1 - down : up;
      pulse.visible = height >= 0;
      pulse.position
        .copy(down >= 0 ? outletAt : inletAt)
        .lerp(rackTop, Math.min(height * 2, 1))
        .lerp(hologramCenter, Math.max(height * 2 - 1, 0));
      pulse.material.opacity = pulse.visible ? 0.9 : 0;

      const bump = (at: number, from: number, length: number): number =>
        at >= from && at < from + length ? Math.sin(((at - from) / length) * Math.PI) : 0;
      hologram.flash(Math.max(bump(lookup, 0, 0.5), bump(stored, STORE_TIME * 0.55, STORE_TIME * 0.45)));
      hologram.update(seconds);

      lights.forEach((light, i) => {
        light.visible = Math.sin(seconds * (2 + (i % 5)) + i * 1.7) > -0.3;
      });
    },
  };
}
