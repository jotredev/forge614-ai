import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// Every node stands on a thin plate floating above the floor, held by a
// slim column, with a line of the node's color under its edge. That line is
// an LED: it lights up when a message arrives at the node.

// `light(amount)` sets how lit the LED is, from 0 (as at rest) to 1.
export type Platform = { group: THREE.Group; top: number; light(amount: number): void };

const COLUMN = "#2a2f3d";
const PLATE = "#343a4a";
const LED_GLOW = 1.1; // emissive strength of the LED at full
const LED_DIM = 0.55; // how much of its resting color the LED gives up at full,
// so the light keeps its hue instead of washing out to white
const HALO_OPACITY = 0.42; // strength of the soft glow around it at full

function solid(geometry: THREE.BufferGeometry, color: string, roughness: number, metalness = 0.2): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// `floating` leaves the column out, for a plate that hangs in the air.
export function createPlatform(accent: string, floating = false, size = 7.6): Platform {
  const group = new THREE.Group();

  if (!floating) {
    const column = solid(new THREE.CylinderGeometry(0.35, 0.5, 1.4, 24), COLUMN, 0.6);
    column.position.y = 0.7;
    group.add(column);
  }

  const plate = solid(new RoundedBoxGeometry(size, 0.3, size, 4, 0.12), PLATE, 0.5);
  plate.position.y = 1.55;

  const edge = solid(new RoundedBoxGeometry(size + 0.1, 0.06, size + 0.1, 2, 0.03), accent, 0.5);
  edge.position.y = 1.42;
  const led = edge.material as THREE.MeshStandardMaterial;
  const resting = led.color.clone();
  led.emissive = new THREE.Color(accent);
  led.emissiveIntensity = 0;

  // The light spilling past the LED: a slightly larger glass-like band that
  // only shows, in the same color, while the LED is on.
  const halo = new THREE.Mesh(
    new RoundedBoxGeometry(size + 0.45, 0.16, size + 0.45, 2, 0.06),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  halo.position.y = 1.42;
  halo.visible = false;

  group.add(plate, edge, halo);
  return {
    group,
    top: 1.7,
    light: (amount) => {
      led.emissiveIntensity = amount * LED_GLOW;
      led.color.copy(resting).multiplyScalar(1 - LED_DIM * amount);
      (halo.material as THREE.MeshBasicMaterial).opacity = amount * HALO_OPACITY;
      halo.visible = amount > 0.01;
    },
  };
}
