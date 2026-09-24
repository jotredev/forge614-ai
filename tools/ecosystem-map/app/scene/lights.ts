import * as THREE from "three";

// A bank of small lights that only switch on and off (the blinking lights of a
// server rack, the check marks over Atlas' buildings), drawn as one instanced
// mesh instead of one mesh each. A light is switched off by shrinking its
// instance to nothing, which looks exactly like the light not being there.
//
// It takes the lights already built, works out where each one sits relative to
// `parent`, replaces them with a single mesh added to `parent` and removes
// the originals. Call it once everything under `parent` has been placed.
// All the lights must share one shape.

export type LightBank = {
  // Switch light number `index` (in the order given) on or off.
  set(index: number, on: boolean): void;
};

export function bankOf(lights: THREE.Mesh[], parent: THREE.Object3D): LightBank {
  if (lights.length === 0) return { set: () => {} };

  parent.updateWorldMatrix(true, true);
  const inverse = new THREE.Matrix4().copy(parent.matrixWorld).invert();
  const material = new THREE.MeshBasicMaterial();
  const bank = new THREE.InstancedMesh(lights[0]!.geometry, material, lights.length);
  const shown: THREE.Matrix4[] = [];
  const state: boolean[] = [];
  const gone = new THREE.Matrix4().makeScale(0, 0, 0);

  lights.forEach((light, i) => {
    light.updateWorldMatrix(true, false);
    const place = new THREE.Matrix4().multiplyMatrices(inverse, light.matrixWorld);
    shown.push(place);
    state.push(light.visible);
    bank.setMatrixAt(i, light.visible ? place : gone);
    // Each light keeps its own color (the material's color is already in the
    // working color space, like the instance colors are).
    bank.setColorAt(i, (light.material as THREE.MeshBasicMaterial).color);
    light.removeFromParent();
  });

  bank.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // The instances are switched by their size, so the bounds would be stale.
  bank.frustumCulled = false;
  parent.add(bank);

  return {
    set(index, on) {
      if (state[index] === on) return;
      state[index] = on;
      bank.setMatrixAt(index, on ? shown[index]! : gone);
      bank.instanceMatrix.needsUpdate = true;
    },
  };
}
