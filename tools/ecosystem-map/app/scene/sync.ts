import * as THREE from "three";
import { glowSprite } from "./nodes/datacenter";
import { CYCLE, TRAVEL } from "./timeline";

// An automatic copy over the network: no one carries it. A thick fiber
// cable runs from one node to another, and each memory runs inside it as a
// flash of light; the plug it reaches glows on arrival.

// One memory traveling through the cable, once per cycle of the map clock.
export type Trip = {
  color: string; // color of the light that travels
  leaves: number; // moment in the cycle it leaves
  onArrive?(amount: number): void; // arrival flash, 0 to 1
};

export type SyncOptions = {
  from: THREE.Vector2; // source center
  to: THREE.Vector2; // destination center
  color: string; // faint color of the glass core
  origin: THREE.Vector3; // where the cable leaves, relative to the source center
  // Points the cable runs through between both ends, in world space, so it
  // never crosses what is on either plate.
  route: THREE.Vector3[];
  clips: THREE.Vector3[]; // world points where a metal clip holds the cable
  inlet: THREE.Vector3; // where the cable enters, relative to the destination center
  trips: Trip[];
};
export type Sync = { group: THREE.Group; update(seconds: number): void };

const FLASH = 0.6; // seconds the arrival flash lasts
const TRAIL = 4; // glowing dots trailing the flash

export function createSync(options: SyncOptions): Sync {
  const group = new THREE.Group();
  const start = new THREE.Vector3(options.from.x, 0, options.from.y).add(options.origin);
  const end = new THREE.Vector3(options.to.x, 0, options.to.y).add(options.inlet);
  const path = new THREE.CatmullRomCurve3([start, ...options.route, end], false, "centripetal");
  path.arcLengthDivisions = 400;
  const trailGap = 0.8 / path.getLength(); // trail dots 0.8 units apart
  const cable = new THREE.Mesh(
    new THREE.TubeGeometry(path, 120, 0.09, 10),
    new THREE.MeshStandardMaterial({ color: "#1f2430", roughness: 0.4, metalness: 0.3 }),
  );
  // The core: a faint colored line along the cable, like glass fiber.
  const core = new THREE.Mesh(
    new THREE.TubeGeometry(path, 120, 0.1, 10),
    new THREE.MeshBasicMaterial({ color: options.color, transparent: true, opacity: 0.12, depthWrite: false }),
  );
  // A metal plug at each end, lined up with the cable, and a socket plate
  // behind it, so each end reads as plugged in.
  const metal = new THREE.MeshStandardMaterial({ color: "#8d96a8", roughness: 0.3, metalness: 0.7 });
  const up = new THREE.Vector3(0, 1, 0);
  const plugs = [
    { at: start, along: path.getTangent(0) },
    { at: end, along: path.getTangent(1).negate() },
  ].flatMap(({ at, along }) => {
    const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.34, 16), metal);
    plug.quaternion.setFromUnitVectors(up, along);
    plug.position.copy(at).addScaledVector(along, 0.12);
    const socket = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.06), new THREE.MeshStandardMaterial({ color: "#2a2f3d", roughness: 0.5 }));
    socket.lookAt(along);
    socket.position.copy(at).addScaledVector(along, -0.03);
    return [plug, socket];
  });
  // Metal clips hold the cable where it lies on a plate and where it leaves
  // an edge, like real cables are fastened.
  const clips = options.clips.map((at) => {
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34), metal);
    clip.position.copy(at);
    return clip;
  });
  group.add(cable, core, ...plugs, ...clips);

  // Each trip: a bright flash with a short fading trail, and a glow on the
  // plug it reaches.
  const trips = options.trips.map((trip) => {
    const flashes = Array.from({ length: TRAIL }, (_, i) => {
      const sprite = glowSprite(trip.color, 0, i === 0 ? 1.1 : 0.7 - i * 0.12);
      group.add(sprite);
      return sprite;
    });
    const arrival = glowSprite(trip.color, 0, 1.3);
    arrival.position.copy(end);
    group.add(arrival);
    return { trip, flashes, arrival };
  });

  return {
    group,
    update: (seconds) => {
      for (const { trip, flashes, arrival } of trips) {
        const since = (((seconds - trip.leaves) % CYCLE) + CYCLE) % CYCLE;
        const t = since / TRAVEL;
        flashes.forEach((sprite, i) => {
          const along = t - i * trailGap;
          const inside = along >= 0 && along <= 1;
          sprite.visible = inside;
          // By distance along the cable, so the speed is even end to end.
          if (inside) sprite.position.copy(path.getPointAt(along));
          sprite.material.opacity = inside ? 0.95 - i * 0.2 : 0;
        });
        const after = since - TRAVEL;
        const amount = after >= 0 && after < FLASH ? 1 - after / FLASH : 0;
        arrival.material.opacity = amount * 0.8;
        trip.onArrive?.(amount);
      }
    },
  };
}
