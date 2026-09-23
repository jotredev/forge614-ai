import * as THREE from "three";

// Engram seen from afar: memory as a network of neurons, a large central
// sphere joined by threads to smaller ones around it.

const NEURON = "#e8a7b6";
const THREAD = "#cfc6b4";

function shadowed(mesh: THREE.Mesh): THREE.Mesh {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createEngram(top: number): THREE.Group {
  const group = new THREE.Group();
  const neuronMaterial = new THREE.MeshStandardMaterial({ color: NEURON, roughness: 0.4, emissive: "#6b2a3a", emissiveIntensity: 0.4 });
  const threadMaterial = new THREE.MeshStandardMaterial({ color: THREAD, roughness: 0.6 });

  const center = new THREE.Vector3(0, top + 2, 0);
  const points: THREE.Vector3[] = [center];
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    const radius = 1.6 + (i % 3) * 0.7;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, top + 0.7 + (i % 4) * 0.7, Math.sin(angle) * radius));
  }

  points.forEach((p, i) => {
    const sphere = shadowed(new THREE.Mesh(new THREE.SphereGeometry(i === 0 ? 0.6 : 0.28, 24, 16), neuronMaterial));
    sphere.position.copy(p);
    group.add(sphere);
  });

  const link = (a: THREE.Vector3, b: THREE.Vector3): void => {
    const thread = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, a.distanceTo(b), 8), threadMaterial));
    thread.position.copy(a).lerp(b, 0.5);
    thread.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    group.add(thread);
  };
  for (let i = 1; i < points.length; i++) {
    link(center, points[i]!);
    link(points[i]!, points[i === points.length - 1 ? 1 : i + 1]!);
  }
  return group;
}
