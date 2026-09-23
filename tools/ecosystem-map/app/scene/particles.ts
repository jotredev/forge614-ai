import * as THREE from "three";

export type Animated = { update(time: number, delta: number): void };

type ParticleOptions = {
  count: number;
  center: THREE.Vector3;
  spread: THREE.Vector3;
  color: string;
  size: number;
  rise: number;
  opacity: number;
};

// Drifting points that wrap back to the bottom of their box. Used for the
// ambient dust and for the sparks rising from a working platform.
export function createParticles(options: ParticleOptions): THREE.Points & Animated {
  const positions = new Float32Array(options.count * 3);
  const speeds = new Float32Array(options.count);
  for (let i = 0; i < options.count; i++) {
    positions[i * 3] = options.center.x + (Math.random() - 0.5) * options.spread.x;
    positions[i * 3 + 1] = options.center.y + Math.random() * options.spread.y;
    positions[i * 3 + 2] = options.center.z + (Math.random() - 0.5) * options.spread.z;
    speeds[i] = 0.4 + Math.random() * 0.6;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: options.color,
    size: options.size,
    sizeAttenuation: false,
    transparent: true,
    opacity: options.opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  const top = options.center.y + options.spread.y;
  const update = (time: number, delta: number): void => {
    for (let i = 0; i < options.count; i++) {
      const y = i * 3 + 1;
      positions[y] = (positions[y] ?? 0) + options.rise * (speeds[i] ?? 1) * delta;
      if ((positions[y] ?? 0) > top) positions[y] = options.center.y;
      const x = i * 3;
      positions[x] = (positions[x] ?? 0) + Math.sin(time * 0.6 + i) * 0.002;
    }
    geometry.attributes.position!.needsUpdate = true;
  };
  return Object.assign(new THREE.Points(geometry, material), { update });
}
