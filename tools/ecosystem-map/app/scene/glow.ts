import * as THREE from "three";

// A color pushed above 1.0 so the bloom pass picks it up. Tone mapping is
// off for these materials, otherwise the boost would be flattened again.
export function glowMaterial(hex: string, intensity: number): THREE.MeshBasicMaterial {
  const color = new THREE.Color(hex).multiplyScalar(intensity);
  return new THREE.MeshBasicMaterial({ color, toneMapped: false });
}
