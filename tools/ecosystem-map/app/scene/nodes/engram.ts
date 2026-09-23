import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createCharacter } from "../character";

// Engram seen from afar: "la memoria", as a vault saving a memory. A person
// takes a glowing memory card and slides it into a slot of a server rack;
// the slot flashes, a pulse of light rises from the rack into the neuron
// hologram above it, and the hologram brightens: the memory is saved. Then
// it starts again with a new card.

export type EngramNode = { group: THREE.Group; update(seconds: number): void };

const ENGRAM = "#d98ca0";
const ENGRAM_LIGHT = "#f3b7c6";
// Planes face +z by default; this turns them toward the isometric camera.
const FACE_CAMERA = Math.PI / 4;
const SAVE_CYCLE = 5; // seconds for one saved memory

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
function neuronHologram(scale: number): EngramNode & { flash(amount: number): void } {
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

  // The slot the card goes into, with a flash when it lands.
  const slotY = top + 2.25;
  const slotMouth = solid(new THREE.BoxGeometry(0.46, 0.06, 0.05), "#0b0e13", 0.6);
  slotMouth.position.set(-0.35, slotY, 0.4);
  const slotFlash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.5),
    new THREE.MeshBasicMaterial({ map: glowTexture(), color: ENGRAM_LIGHT, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  slotFlash.position.set(-0.35, slotY, 0.45);
  face.add(slotMouth, slotFlash);

  // The memory card: a glowing pink card with a soft halo, big enough to
  // read from the overview.
  const card = new THREE.Group();
  card.add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.3), new THREE.MeshBasicMaterial({ color: ENGRAM_LIGHT })));
  card.add(glowSprite(ENGRAM, 0.8, 1.1));
  face.add(card);

  // The pulse that rises from the rack into the hologram.
  const pulse = glowSprite(ENGRAM_LIGHT, 0, 0.7);
  face.add(pulse);

  const hologram = neuronHologram(1.05);
  hologram.group.position.set(0, top + 4.6, -0.3);

  // The person stands beside the rack, in profile to the camera, so the near
  // arm, the card and the slot are in view instead of their back.
  const slotIn = new THREE.Vector3(-0.35, slotY, 0.36);
  const stand = new THREE.Vector3(-1.6, top, 0.65);
  const person = createCharacter(ENGRAM, "inserting");
  person.group.scale.setScalar(1.5);
  person.group.position.copy(stand);
  person.group.rotation.y = Math.atan2(slotIn.x - stand.x, slotIn.z - stand.z);

  face.add(hologram.group, person.group);
  face.rotation.y = FACE_CAMERA;
  group.add(face);

  // The card starts at the person's hand, at waist height, a little ahead.
  const toSlot = new THREE.Vector3(slotIn.x - stand.x, 0, slotIn.z - stand.z).normalize();
  const handLow = stand.clone().addScaledVector(toSlot, 0.45).setY(top + 1.45);
  const rackTop = new THREE.Vector3(0, top + rackHeight, -0.3);
  const hologramCenter = new THREE.Vector3(0, top + 4.6, -0.3);

  return {
    group,
    update: (seconds) => {
      const t = (seconds % SAVE_CYCLE) / SAVE_CYCLE;
      // 0.05-0.35 lift the card; 0.35-0.50 slide it in; 0.50-0.62 flash;
      // 0.55-0.80 pulse rises; 0.78-0.95 hologram glows; then rest.
      const lift = ramp(t, 0.05, 0.35);
      const slide = ramp(t, 0.35, 0.5);
      const reach = t < 0.55 ? lift : 1 - ramp(t, 0.55, 0.75);
      person.update(seconds, false, reach);

      card.visible = t < 0.5;
      card.position.copy(handLow).lerp(slotIn, lift * 0.85 + slide * 0.15);
      card.rotation.x = -lift * 1.2;

      const flash = t >= 0.5 && t < 0.62 ? 1 - (t - 0.5) / 0.12 : 0;
      (slotFlash.material as THREE.MeshBasicMaterial).opacity = flash * 0.9;

      const rise = ramp(t, 0.55, 0.8);
      pulse.visible = t >= 0.55 && t < 0.82;
      pulse.position.copy(slotIn).lerp(rackTop, Math.min(rise * 2, 1)).lerp(hologramCenter, Math.max(rise * 2 - 1, 0));
      pulse.material.opacity = pulse.visible ? 0.9 : 0;

      const glow = t >= 0.78 && t < 0.95 ? Math.sin(((t - 0.78) / 0.17) * Math.PI) : 0;
      hologram.flash(glow);
      hologram.update(seconds);

      lights.forEach((light, i) => {
        light.visible = Math.sin(seconds * (2 + (i % 5)) + i * 1.7) > -0.3;
      });
    },
  };
}
