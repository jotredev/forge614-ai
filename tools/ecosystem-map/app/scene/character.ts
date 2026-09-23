import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// A toy-like person built from simple shapes: round head with hair, capsule
// body and limbs. Used to show who works at each node:
//   - "typing": seated on an office chair; hands tap while `busy`;
//   - "inserting": standing, lifting one arm to a slot in front; `reach`
//     (0 to 1) says how far, so a scene can time it with what is moved;
//   - "walking": legs and arms swing while `busy`; with `reach` above zero
//     one arm holds something in front.

export type Pose = "typing" | "inserting" | "walking";
export type Character = { group: THREE.Group; update(seconds: number, busy: boolean, reach?: number): void };

const SKIN = "#e8b98f";
const HAIR = "#2b2320";
const PANTS = "#2f3542";
const SEAT = "#3a4152";

function part(geometry: THREE.BufferGeometry, color: string, roughness = 0.65): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// A limb hanging from a pivot, so it can swing around its joint.
function limb(length: number, radius: number, color: string): { pivot: THREE.Group; tip: THREE.Group } {
  const pivot = new THREE.Group();
  const mesh = part(new THREE.CapsuleGeometry(radius, length, 6, 12), color);
  mesh.position.y = -length / 2;
  const tip = new THREE.Group();
  tip.position.y = -length - radius;
  pivot.add(mesh, tip);
  return { pivot, tip };
}

// An office chair: seat, backrest, gas post and a five-spoke base with
// small wheels.
function officeChair(seatHeight: number): THREE.Group {
  const chair = new THREE.Group();
  const seat = part(new RoundedBoxGeometry(0.72, 0.1, 0.66, 3, 0.05), SEAT, 0.55);
  seat.position.y = seatHeight;
  const back = part(new RoundedBoxGeometry(0.66, 0.7, 0.08, 3, 0.04), SEAT, 0.55);
  back.position.set(0, seatHeight + 0.45, -0.34);
  back.rotation.x = -0.12;
  const post = part(new THREE.CylinderGeometry(0.04, 0.04, seatHeight - 0.12, 10), "#8a93a6", 0.3);
  post.position.y = (seatHeight - 0.12) / 2 + 0.08;
  chair.add(seat, back, post);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const spoke = part(new THREE.BoxGeometry(0.05, 0.04, 0.38), "#8a93a6", 0.3);
    spoke.position.set(Math.sin(angle) * 0.19, 0.1, Math.cos(angle) * 0.19);
    spoke.rotation.y = angle;
    const wheel = part(new THREE.SphereGeometry(0.05, 10, 8), "#1b1f29", 0.5);
    wheel.position.set(Math.sin(angle) * 0.38, 0.05, Math.cos(angle) * 0.38);
    chair.add(spoke, wheel);
  }
  return chair;
}

export function createCharacter(shirt: string, pose: Pose): Character {
  const group = new THREE.Group();
  const seated = pose === "typing";
  const hip = seated ? 0.62 : 1.02;

  // Legs: bent over an office chair when seated, straight when standing.
  if (seated) {
    group.add(officeChair(0.5));
    for (const side of [-1, 1]) {
      const thigh = part(new THREE.CapsuleGeometry(0.1, 0.34, 6, 10), PANTS);
      thigh.rotation.x = Math.PI / 2;
      thigh.position.set(side * 0.13, hip, 0.22);
      const shin = part(new THREE.CapsuleGeometry(0.09, 0.4, 6, 10), PANTS);
      shin.position.set(side * 0.13, hip - 0.3, 0.42);
      group.add(thigh, shin);
    }
  }
  // Standing legs hang from the hip, so they can swing when walking.
  const legs = seated
    ? []
    : [-1, 1].map((side) => {
        const leg = limb(0.72, 0.1, PANTS);
        leg.pivot.position.set(side * 0.13, 0.92, 0);
        group.add(leg.pivot);
        return leg.pivot;
      });

  const body = part(new THREE.CapsuleGeometry(0.27, 0.42, 8, 16), shirt);
  body.position.y = hip + 0.38;
  const neck = part(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10), SKIN);
  neck.position.y = hip + 0.86;
  const head = part(new THREE.SphereGeometry(0.3, 24, 18), SKIN);
  head.position.y = hip + 1.1;
  // Hair: a cap over the top and back of the head.
  const hair = part(new THREE.SphereGeometry(0.315, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.58), HAIR, 0.8);
  hair.position.y = hip + 1.12;
  hair.rotation.x = -0.35;
  group.add(body, neck, head, hair);

  // Arms hang from the shoulders; the pose decides where they point.
  const shoulders = hip + 0.68;
  const arms = [-1, 1].map((side) => {
    const arm = limb(0.46, 0.075, shirt);
    arm.pivot.position.set(side * 0.33, shoulders, 0);
    const hand = part(new THREE.SphereGeometry(0.085, 12, 10), SKIN);
    arm.tip.add(hand);
    group.add(arm.pivot);
    return arm.pivot;
  });

  const update = (seconds: number, busy: boolean, reach = 0): void => {
    if (seated) {
      // Forearms reach forward to the keyboard; while busy, the hands tap
      // one after the other.
      arms.forEach((arm, i) => {
        const tap = busy ? Math.sin(seconds * 18 + i * Math.PI) * 0.12 : 0;
        arm.rotation.x = -1.15 + tap;
        arm.rotation.z = (i === 0 ? -1 : 1) * 0.12;
      });
      head.rotation.x = busy ? 0.08 + Math.sin(seconds * 3) * 0.03 : 0.02;
    } else if (pose === "inserting") {
      // The near arm lifts up to the slot; the other rests.
      arms[0]!.rotation.x = THREE.MathUtils.lerp(-0.2, -1.5, reach);
      arms[0]!.rotation.z = -0.08;
      arms[1]!.rotation.x = 0.1;
      head.rotation.x = THREE.MathUtils.lerp(0.15, -0.05, reach);
    } else {
      // Walking while `busy`: legs and the free arm swing in step. `reach`
      // above zero means carrying something, so the other arm holds it in
      // front instead of swinging.
      const step = busy ? Math.sin(seconds * 7) : 0;
      legs[0]!.rotation.x = step * 0.45;
      legs[1]!.rotation.x = -step * 0.45;
      arms[1]!.rotation.x = step * 0.4;
      arms[0]!.rotation.x = reach > 0 ? -1.0 : -step * 0.4;
      head.rotation.x = 0.05;
      group.position.y = busy ? Math.abs(Math.cos(seconds * 7)) * 0.04 : 0;
    }
    hair.rotation.x = -0.35 + head.rotation.x;
  };
  update(0, false);

  return { group, update };
}
