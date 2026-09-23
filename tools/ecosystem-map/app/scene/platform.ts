import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// Every node stands on a thin plate floating above the floor, held by a
// slim column, with a line of the node's color under its edge.

export type Platform = { group: THREE.Group; top: number };

const COLUMN = "#2a2f3d";
const PLATE = "#343a4a";

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

  group.add(plate, edge);
  return { group, top: 1.7 };
}
