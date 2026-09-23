import * as THREE from "three";

// Floor decoration: one complete, connected circuit drawn very faintly. A
// closed loop runs around the center with 45° corners like board traces,
// branches leave it inward and outward ending in small pads, and an outer
// ring fills the rest of the floor. A single light travels the loop without
// ever stopping, leaving a short fading tail.

const TRACE = new THREE.Color("#6b8cb3");
const LIGHT = new THREE.Color("#b8dcff");
const Y = 0.02;
const LOOP_OPACITY = 0.09;
const BRANCH_OPACITY = 0.07;
const OUTER_OPACITY = 0.05;
const SPEED = 3.2; // world units per second
const TAIL = 4; // world units
const TAIL_POINTS = 28;
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

function lineOf(points: THREE.Vector2[], opacity: number): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(p.x, Y, p.y)));
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: TRACE, transparent: true, opacity }));
}

function glowTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export type Floor = { object: THREE.Object3D; setTime(seconds: number): void };

export function createFloor(): Floor {
  const group = new THREE.Group();
  const rand = random(614);
  const padGeometry = new THREE.RingGeometry(0.1, 0.17, 20);
  const padMaterial = new THREE.MeshBasicMaterial({ color: TRACE, transparent: true, opacity: BRANCH_OPACITY * 1.8 });
  const addPad = (p: THREE.Vector2): void => {
    const pad = new THREE.Mesh(padGeometry, padMaterial);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(p.x, Y, p.y);
    group.add(pad);
  };

  // The main loop the light travels, and a wider, fainter outer ring.
  const loop = ringLoop(rand, 11, 3, 12);
  group.add(lineOf(loop, LOOP_OPACITY));
  const outer = ringLoop(rand, 21, 4, 18);
  group.add(lineOf(outer, OUTER_OPACITY));

  // Branches off every other corner of the loop, alternating in and out, so
  // the whole pattern stays connected.
  for (let i = 0; i < loop.length - 1; i += 2) {
    const trace = branch(rand, loop[i]!, i % 4 === 0);
    group.add(lineOf(trace, BRANCH_OPACITY));
    addPad(trace[trace.length - 1]!);
  }
  // Short spurs off the outer ring toward the edge of the floor.
  for (let i = 0; i < outer.length - 1; i += 3) {
    const trace = branch(rand, outer[i]!, true);
    group.add(lineOf(trace, OUTER_OPACITY));
    addPad(trace[trace.length - 1]!);
  }

  // Cumulative lengths along the loop, so any distance maps to a point.
  const lengths = [0];
  for (let i = 1; i < loop.length; i++) lengths.push(lengths[i - 1]! + loop[i]!.distanceTo(loop[i - 1]!));
  const total = lengths[lengths.length - 1]!;
  const pointAt = (distance: number): THREE.Vector2 => {
    const d = ((distance % total) + total) % total;
    let i = 1;
    while (i < loop.length - 1 && d > lengths[i]!) i++;
    const span = lengths[i]! - lengths[i - 1]!;
    return loop[i - 1]!.clone().lerp(loop[i]!, span === 0 ? 0 : (d - lengths[i - 1]!) / span);
  };

  // The traveling light: a comet of soft glowing dots, largest and brightest
  // at the head and fading along the tail. Drawn over the floor so the glow
  // is never cut by it.
  const glow = glowTexture();
  const comet = Array.from({ length: TAIL_POINTS }, (_, i) => {
    const k = i / (TAIL_POINTS - 1); // 0 at the end of the tail, 1 at the head
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glow,
        color: LIGHT,
        transparent: true,
        opacity: 0.85 * k * k,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    sprite.scale.setScalar(0.2 + k * k * 0.7);
    sprite.renderOrder = 10;
    group.add(sprite);
    return { sprite, k };
  });

  // The loop is closed, so the light simply keeps going around it.
  const setTime = (seconds: number): void => {
    const front = seconds * SPEED;
    for (const { sprite, k } of comet) {
      const p = pointAt(front - TAIL * (1 - k));
      sprite.position.set(p.x, Y + 0.05, p.y);
    }
  };

  setTime(0);
  return { object: group, setTime };
}
