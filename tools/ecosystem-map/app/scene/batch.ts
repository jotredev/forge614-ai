import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Joins meshes that share a material into one mesh per material, with each
// one's position and rotation baked into its shape. Only for parts that never
// move on their own: a scene of a thousand small pieces asks the graphics card
// for a thousand jobs a frame, and after joining them it asks for a few.
//
// The meshes must all sit directly in the parent that will receive the result
// (their own transform is taken as relative to it). Their old shapes are freed.
export function mergeByMaterial(meshes: THREE.Mesh[]): THREE.Mesh[] {
  const groups = new Map<string, THREE.Mesh[]>();
  for (const mesh of meshes) {
    const material = mesh.material as THREE.Material;
    // Meshes are joined only if they look and cast shadows the same way.
    const key = `${material.uuid}:${mesh.castShadow ? 1 : 0}:${mesh.receiveShadow ? 1 : 0}:${mesh.renderOrder}`;
    const list = groups.get(key);
    if (list) list.push(mesh);
    else groups.set(key, [mesh]);
  }

  const result: THREE.Mesh[] = [];
  for (const list of groups.values()) {
    const first = list[0]!;
    const baked = list.map((mesh) => {
      mesh.updateMatrix();
      return mesh.geometry.clone().applyMatrix4(mesh.matrix);
    });
    const geometry = baked.length === 1 ? baked[0]! : mergeGeometries(baked);
    if (!geometry) {
      // Shapes that cannot be joined (different attributes): keep them as they were.
      for (const shape of baked) shape.dispose();
      result.push(...list);
      continue;
    }
    if (geometry !== baked[0]) for (const shape of baked) shape.dispose();
    for (const mesh of list) mesh.geometry.dispose();
    const merged = new THREE.Mesh(geometry, first.material);
    merged.castShadow = first.castShadow;
    merged.receiveShadow = first.receiveShadow;
    merged.renderOrder = first.renderOrder;
    result.push(merged);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Finding out by watching which pieces never move.

export type BatchOptions = {
  // Draws (or just advances) the scene at a given second of the map's clock.
  step: (seconds: number) => void;
  // The stretch of the clock to watch, and how often to look.
  to: number;
  every: number;
};

export type BatchResult = { pieces: number; joined: number; meshes: number; ms: number };

const WATCHED = ["MeshStandardMaterial", "MeshBasicMaterial"];

// A piece is a candidate to be joined if it is a plain solid: one opaque
// material with no image on it, and not marked `userData.noBatch`.
function isCandidate(object: THREE.Object3D): object is THREE.Mesh {
  if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || object.userData.noBatch === true) return false;
  const material = object.material;
  if (Array.isArray(material) || !WATCHED.includes(material.type) || material.transparent || !material.visible) return false;
  const m = material as THREE.MeshStandardMaterial;
  if (m.map || m.alphaMap || m.normalMap || m.emissiveMap || m.roughnessMap || m.metalnessMap || m.envMap || m.aoMap) return false;
  // (A box carries a group per face, but with one material they are ignored.)
  return object.geometry.attributes.position !== undefined;
}

function visibleInScene(object: THREE.Object3D): boolean {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) if (!node.visible) return false;
  return true;
}

// Everything about a piece that changing would make it look different, as
// plain numbers: where it is, whether it shows, and its material.
const SIGNATURE = 30;
function signature(mesh: THREE.Mesh, out: Float64Array, at: number): void {
  const m = mesh.material as THREE.MeshStandardMaterial;
  const e = mesh.matrixWorld.elements;
  for (let i = 0; i < 16; i++) out[at + i] = e[i]!;
  out[at + 16] = visibleInScene(mesh) ? 1 : 0;
  out[at + 17] = m.color.r;
  out[at + 18] = m.color.g;
  out[at + 19] = m.color.b;
  out[at + 20] = m.opacity;
  out[at + 21] = m.emissive ? m.emissive.r : 0;
  out[at + 22] = m.emissive ? m.emissive.g : 0;
  out[at + 23] = m.emissive ? m.emissive.b : 0;
  out[at + 24] = m.emissiveIntensity ?? 0;
  out[at + 25] = m.roughness ?? 0;
  out[at + 26] = m.metalness ?? 0;
  out[at + 27] = (mesh.geometry.attributes.position as THREE.BufferAttribute).version;
  out[at + 28] = mesh.geometry.drawRange.count === Infinity ? -1 : mesh.geometry.drawRange.count;
  out[at + 29] = mesh.scale.x + mesh.scale.y + mesh.scale.z;
}

// What makes two pieces look alike, so they can share one mesh.
function lookKey(mesh: THREE.Mesh): string {
  const m = mesh.material as THREE.MeshStandardMaterial;
  return [
    m.type,
    m.color.getHex(),
    m.emissive ? m.emissive.getHex() : 0,
    m.emissiveIntensity ?? 0,
    m.roughness ?? 0,
    m.metalness ?? 0,
    m.side,
    m.flatShading ? 1 : 0,
    m.depthWrite ? 1 : 0,
    mesh.castShadow ? 1 : 0,
    mesh.receiveShadow ? 1 : 0,
    mesh.renderOrder,
  ].join("|");
}

// Shapes can only be joined if they carry the same data. A mix of indexed and
// plain shapes becomes all plain, and data that not every shape has (such as
// texture coordinates) is dropped, as nothing here uses it.
function makeCompatible(shapes: THREE.BufferGeometry[]): THREE.BufferGeometry[] {
  const mixed = shapes.some((shape) => shape.index) && shapes.some((shape) => !shape.index);
  const prepared = mixed ? shapes.map((shape) => (shape.index ? shape.toNonIndexed() : shape)) : shapes;
  const shared = Object.keys(prepared[0]!.attributes).filter((name) => prepared.every((shape) => shape.attributes[name]));
  for (const shape of prepared) for (const name of Object.keys(shape.attributes)) if (!shared.includes(name)) shape.deleteAttribute(name);
  return prepared;
}

// Watches the scene for a stretch of the clock and joins, into a few meshes,
// every plain solid that never moved, changed or hid itself in that time.
// What moves (people, blinking lights, rollers, whatever a node animates) is
// left as it is. Works from the scene root: the joined meshes are added to it.
//
// Anything that only moves in response to something the watching does not
// reproduce (a click, say) would be frozen; mark such a mesh with
// `userData.noBatch = true`.
export function batchStatic(root: THREE.Object3D, { step, to, every }: BatchOptions): BatchResult {
  const began = performance.now();
  const candidates: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (isCandidate(object)) candidates.push(object);
  });

  root.updateMatrixWorld(true);
  const first = new Float64Array(candidates.length * SIGNATURE);
  const now = new Float64Array(candidates.length * SIGNATURE);
  candidates.forEach((mesh, i) => signature(mesh, first, i * SIGNATURE));

  const moved = new Uint8Array(candidates.length);
  for (let t = 0; t <= to; t += every) {
    step(t);
    root.updateMatrixWorld(true);
    candidates.forEach((mesh, i) => {
      if (moved[i]) return;
      signature(mesh, now, i * SIGNATURE);
      for (let k = 0; k < SIGNATURE; k++) {
        if (Math.abs(now[i * SIGNATURE + k]! - first[i * SIGNATURE + k]!) > 1e-6) {
          moved[i] = 1;
          return;
        }
      }
    });
  }
  // Leave the scene as it was at the start.
  step(0);
  root.updateMatrixWorld(true);

  // The pieces that never changed, and that show, grouped by how they look.
  const groups = new Map<string, THREE.Mesh[]>();
  candidates.forEach((mesh, i) => {
    if (moved[i] || first[i * SIGNATURE + 16] === 0) return;
    const key = lookKey(mesh);
    const list = groups.get(key);
    if (list) list.push(mesh);
    else groups.set(key, [mesh]);
  });

  let joined = 0;
  let meshes = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const baked = makeCompatible(list.map((mesh) => mesh.geometry.clone().applyMatrix4(mesh.matrixWorld)));
    const geometry = mergeGeometries(baked);
    for (const shape of baked) shape.dispose();
    if (!geometry) continue;
    const lead = list[0]!;
    const merged = new THREE.Mesh(geometry, lead.material);
    merged.castShadow = lead.castShadow;
    merged.receiveShadow = lead.receiveShadow;
    merged.renderOrder = lead.renderOrder;
    for (const mesh of list) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
    }
    root.add(merged);
    joined += list.length;
    meshes += 1;
  }
  return { pieces: candidates.length, joined, meshes, ms: performance.now() - began };
}
