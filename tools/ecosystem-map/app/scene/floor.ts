import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Floor decoration: one complete, connected circuit drawn very faintly. A
// closed loop runs around the center with 45° corners like board traces,
// branches leave it inward and outward ending in small pads, and an outer
// ring fills the rest of the floor. A single signal travels the loop without
// ever stopping: a short stretch of the wire brightens and fades behind.

const TRACE = new THREE.Color("#6b8cb3");
const LIGHT = new THREE.Color("#b8dcff");
const Y = 0.02;
const LOOP_OPACITY = 0.09;
const BRANCH_OPACITY = 0.07;
const OUTER_OPACITY = 0.05;
const SPEED = 3.2; // world units per second
const TAIL = 5; // world units
const TAIL_POINTS = 40;
const SIGNAL_OPACITY = 0.45;
const KEEP_CLEAR = 6.5; // nothing inside this radius, where the nodes stand

// Small deterministic random generator, so the layout is the same on every
// load.
function random(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Joins two points the way board traces do: a 45° run for the shared part
// of the move, then a straight run for the rest.
function octilinear(a: THREE.Vector2, b: THREE.Vector2): THREE.Vector2[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const diagonal = Math.min(Math.abs(dx), Math.abs(dy));
  const corner = new THREE.Vector2(a.x + Math.sign(dx) * diagonal, a.y + Math.sign(dy) * diagonal);
  return corner.distanceTo(a) < 1e-3 || corner.distanceTo(b) < 1e-3 ? [b] : [corner, b];
}

// A closed loop: points around a ring, with a little random wobble, joined
// octilinearly. The last point connects back to the first.
function ringLoop(rand: () => number, radius: number, wobble: number, count: number): THREE.Vector2[] {
  const anchors = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + rand() * 0.15;
    const r = radius + (rand() - 0.5) * wobble;
    return new THREE.Vector2(Math.round(Math.cos(angle) * r * 2) / 2, Math.round(Math.sin(angle) * r * 2) / 2);
  });
  const path = [anchors[0]!.clone()];
  for (let i = 0; i < count; i++) path.push(...octilinear(anchors[i]!, anchors[(i + 1) % count]!));
  return path;
}

// A short branch leaving `from` toward (outward) or away from (inward) the
// center, with one bend, ending in a pad.
function branch(rand: () => number, from: THREE.Vector2, outward: boolean): THREE.Vector2[] {
  const radial = from.clone().normalize().multiplyScalar(outward ? 1 : -1);
  const length = 2 + rand() * 3;
  const side = new THREE.Vector2(-radial.y, radial.x).multiplyScalar((rand() - 0.5) * 3);
  let end = from.clone().addScaledVector(radial, length).add(side);
  if (!outward && end.length() < KEEP_CLEAR) end = end.setLength(KEEP_CLEAR);
  end.set(Math.round(end.x * 2) / 2, Math.round(end.y * 2) / 2);
  return [from.clone(), ...octilinear(from, end)];
}

// The fixed part of the circuit is the same around every node (the same seed
// draws the same pattern), so it is built once and shared. All the traces of
// one strength go in a single set of segments and all the pads in a single
// mesh: a handful of draw calls per floor instead of dozens.
type Layout = {
  loop: THREE.Vector2[];
  lengths: number[]; // cumulative lengths along the loop
  total: number;
  traces: Array<{ opacity: number; geometry: THREE.BufferGeometry }>;
  pads: THREE.BufferGeometry;
};

function buildLayout(): Layout {
  const rand = random(614);
  const segments = new Map<number, number[]>();
  const padSpots: THREE.Vector2[] = [];
  const addTrace = (points: THREE.Vector2[], opacity: number): void => {
    const list = segments.get(opacity) ?? [];
    for (let i = 0; i < points.length - 1; i++) list.push(points[i]!.x, Y, points[i]!.y, points[i + 1]!.x, Y, points[i + 1]!.y);
    segments.set(opacity, list);
  };

  // The main loop the light travels, and a wider, fainter outer ring.
  const loop = ringLoop(rand, 11, 3, 12);
  addTrace(loop, LOOP_OPACITY);
  const outer = ringLoop(rand, 21, 4, 18);
  addTrace(outer, OUTER_OPACITY);

  // Branches off every other corner of the loop, alternating in and out, so
  // the whole pattern stays connected.
  for (let i = 0; i < loop.length - 1; i += 2) {
    const trace = branch(rand, loop[i]!, i % 4 === 0);
    addTrace(trace, BRANCH_OPACITY);
    padSpots.push(trace[trace.length - 1]!);
  }
  // Short spurs off the outer ring toward the edge of the floor.
  for (let i = 0; i < outer.length - 1; i += 3) {
    const trace = branch(rand, outer[i]!, true);
    addTrace(trace, OUTER_OPACITY);
    padSpots.push(trace[trace.length - 1]!);
  }

  // Cumulative lengths along the loop, so any distance maps to a point.
  const lengths = [0];
  for (let i = 1; i < loop.length; i++) lengths.push(lengths[i - 1]! + loop[i]!.distanceTo(loop[i - 1]!));

  const ring = new THREE.RingGeometry(0.1, 0.17, 20).rotateX(-Math.PI / 2);
  return {
    loop,
    lengths,
    total: lengths[lengths.length - 1]!,
    traces: [...segments].map(([opacity, list]) => ({
      opacity,
      geometry: new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(list, 3)),
    })),
    pads: mergeGeometries(padSpots.map((p) => ring.clone().translate(p.x, Y, p.y)))!,
  };
}

let layout: Layout | null = null;
const traceMaterials = new Map<number, THREE.LineBasicMaterial>();
const traceMaterial = (opacity: number): THREE.LineBasicMaterial => {
  let material = traceMaterials.get(opacity);
  if (!material) {
    material = new THREE.LineBasicMaterial({ color: TRACE, transparent: true, opacity });
    traceMaterials.set(opacity, material);
  }
  return material;
};
let padMaterial: THREE.MeshBasicMaterial | null = null;

export type Floor = { object: THREE.Object3D; setTime(seconds: number): void };

// Every node gets the same circuit around it; `phase` shifts its signal so
// the lights of different nodes do not move in step.
export function createFloor(center = new THREE.Vector2(0, 0), phase = 0): Floor {
  const { loop, lengths, total, traces, pads } = (layout ??= buildLayout());
  padMaterial ??= new THREE.MeshBasicMaterial({ color: TRACE, transparent: true, opacity: BRANCH_OPACITY * 1.8 });
  const group = new THREE.Group();
  group.position.set(center.x, 0, center.y);
  for (const { opacity, geometry } of traces) group.add(new THREE.LineSegments(geometry, traceMaterial(opacity)));
  group.add(new THREE.Mesh(pads, padMaterial));

  const pointAt = (distance: number): THREE.Vector2 => {
    const d = ((distance % total) + total) % total;
    let i = 1;
    while (i < loop.length - 1 && d > lengths[i]!) i++;
    const span = lengths[i]! - lengths[i - 1]!;
    return loop[i - 1]!.clone().lerp(loop[i]!, span === 0 ? 0 : (d - lengths[i - 1]!) / span);
  };

  // The traveling signal: the wire itself brightens along a short stretch
  // and fades out behind, like current running through it. No glow blob.
  const signalPositions = new Float32Array(TAIL_POINTS * 3);
  const signalColors = new Float32Array(TAIL_POINTS * 4);
  for (let i = 0; i < TAIL_POINTS; i++) {
    const k = i / (TAIL_POINTS - 1); // 0 at the end of the tail, 1 at the head
    signalColors.set([LIGHT.r, LIGHT.g, LIGHT.b, SIGNAL_OPACITY * k * k], i * 4);
  }
  const signalGeometry = new THREE.BufferGeometry();
  signalGeometry.setAttribute("position", new THREE.BufferAttribute(signalPositions, 3));
  signalGeometry.setAttribute("color", new THREE.BufferAttribute(signalColors, 4));
  const signal = new THREE.Line(signalGeometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true }));
  signal.frustumCulled = false;
  signal.renderOrder = 1;
  group.add(signal);

  // The loop is closed, so the signal simply keeps going around it.
  const setTime = (seconds: number): void => {
    const front = seconds * SPEED + phase;
    for (let i = 0; i < TAIL_POINTS; i++) {
      const k = i / (TAIL_POINTS - 1);
      const p = pointAt(front - TAIL * (1 - k));
      signalPositions.set([p.x, Y + 0.005, p.y], i * 3);
    }
    signalGeometry.attributes.position!.needsUpdate = true;
  };

  setTime(0);
  return { object: group, setTime };
}
