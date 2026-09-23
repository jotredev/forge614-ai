import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// A walkway between two node plates, at plate height, so the people who
// carry things between nodes walk across it instead of on the floor. It is
// joined to each plate by an octagonal landing that covers the plate's
// corner, and carries the same colored line under its edge as the plates:
// each half in the color of the node it leads to.

export type BridgeEnd = { at: THREE.Vector2; color: string };

const DECK = "#343a4a";
const COLUMN = "#2a2f3d";
const RAIL = "#4a5264";
const WIDTH = 1.6;
const LANDING = 1.35; // radius of the octagonal landing at each end

function solid(geometry: THREE.BufferGeometry, color: string, roughness = 0.5): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.2 }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// An octagonal landing with the node's colored line under its edge, like
// the plates.
function landing(color: string, height: number): THREE.Group {
  const group = new THREE.Group();
  const pad = solid(new THREE.CylinderGeometry(LANDING, LANDING, 0.3, 8), DECK);
  pad.rotation.y = Math.PI / 8;
  pad.position.y = height - 0.15;
  const line = solid(new THREE.CylinderGeometry(LANDING + 0.05, LANDING + 0.05, 0.06, 8), color);
  line.rotation.y = Math.PI / 8;
  line.position.y = height - 0.28;
  group.add(pad, line);
  return group;
}

// `from` and `to` are the plate corners the bridge joins, on the floor plan;
// `height` is the top of the plates.
export function createBridge(from: BridgeEnd, to: BridgeEnd, height: number): THREE.Group {
  const group = new THREE.Group();
  const length = from.at.distanceTo(to.at);

  // Everything below is built along +z, centered, then turned into place.
  const span = new THREE.Group();
  const deck = solid(new RoundedBoxGeometry(WIDTH, 0.22, length, 3, 0.06), DECK);
  deck.position.y = height - 0.11;
  span.add(deck);

  // Colored line under each edge: the half nearer each node in its color.
  for (const [end, sign] of [[from, -1], [to, 1]] as const) {
    for (const side of [-1, 1]) {
      const line = solid(new THREE.BoxGeometry(0.06, 0.06, length / 2), end.color);
      line.position.set(side * (WIDTH / 2 + 0.01), height - 0.25, (sign * length) / 4);
      span.add(line);
    }
  }

  for (const side of [-1, 1]) {
    const rail = solid(new THREE.BoxGeometry(0.06, 0.06, length - LANDING * 2), RAIL, 0.4);
    rail.position.set(side * (WIDTH / 2 - 0.08), height + 0.55, 0);
    span.add(rail);
    const posts = Math.max(2, Math.round((length - LANDING * 2) / 2.2));
    for (let i = 0; i <= posts; i++) {
      const post = solid(new THREE.BoxGeometry(0.05, 0.55, 0.05), RAIL, 0.4);
      const z = -(length / 2 - LANDING) + (i * (length - LANDING * 2)) / posts;
      post.position.set(side * (WIDTH / 2 - 0.08), height + 0.28, z);
      span.add(post);
    }
  }

  // Two slim columns hold it up, like the plates' own column.
  for (const at of [-length / 4, length / 4]) {
    const column = solid(new THREE.CylinderGeometry(0.22, 0.32, height - 0.22, 16), COLUMN, 0.6);
    column.position.set(0, (height - 0.22) / 2, at);
    span.add(column);
  }

  const middle = from.at.clone().lerp(to.at, 0.5);
  span.position.set(middle.x, 0, middle.y);
  span.rotation.y = Math.atan2(to.at.x - from.at.x, to.at.y - from.at.y);
  group.add(span);

  // Landings over each plate corner, joining the bridge to the plate.
  for (const end of [from, to]) {
    const pad = landing(end.color, height);
    pad.position.set(end.at.x, 0, end.at.y);
    group.add(pad);
  }
  return group;
}
