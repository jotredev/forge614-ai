import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// The optional cloud copy of Engram (PostgreSQL), shown as another place: a
// small remote data center with three racks. Copies arrive on their own,
// over the internet, so nobody works here: the middle rack flashes when a
// copy slides in. It is not part of the ecosystem, so it has no circuit.

export type DataCenterNode = {
  group: THREE.Group;
  // Where an arriving copy enters, relative to the node's center.
  inlet: THREE.Vector3;
  update(seconds: number): void;
  // Brightness of the arrival flash (0 = none, 1 = peak).
  flash(amount: number): void;
};

export const CLOUD = "#a99bd6";
const CLOUD_LIGHT = "#d4cbf2";
// Planes face +z by default; this turns them toward the isometric camera.
const FACE_CAMERA = Math.PI / 4;

function solid(geometry: THREE.BufferGeometry, color: string, roughness = 0.6, metalness = 0.1): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function glowSprite(color: string, opacity: number, size: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  sprite.scale.setScalar(size);
  return sprite;
}

// A rack with rows of lights; returns the lights so they can blink.
function rack(height: number): { group: THREE.Group; lights: THREE.Mesh[] } {
  const group = new THREE.Group();
  const body = solid(new RoundedBoxGeometry(1.2, height, 1.2, 3, 0.05), "#20232e", 0.4, 0.5);
  body.position.y = height / 2;
  group.add(body);
  const lights: THREE.Mesh[] = [];
  const rows = Math.floor((height - 0.4) / 0.36);
  for (let row = 0; row < rows; row++) {
    const y = 0.35 + row * 0.36;
    const slot = solid(new THREE.BoxGeometry(1.0, 0.26, 0.04), "#2c3040", 0.5, 0.3);
    slot.position.set(0, y, 0.61);
    group.add(slot);
    for (let i = 0; i < 3; i++) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: i === 0 ? CLOUD_LIGHT : "#8fbf7a" }));
      light.position.set(0.18 + i * 0.12, y, 0.64);
      group.add(light);
      lights.push(light);
    }
  }
  return { group, lights };
}

export function createDataCenter(top: number): DataCenterNode {
  const group = new THREE.Group();
  const face = new THREE.Group();

  const racks = [-1.45, 0, 1.45].map((x, i) => {
    const r = rack(i === 1 ? 3.2 : 2.8);
    r.group.position.set(x, top, -0.6);
    face.add(r.group);
    return r;
  });
  const lights = racks.flatMap((r) => r.lights);

  // The inlet at the foot of the middle rack, in front where it is seen,
  // where the fiber cable plugs in; it flashes when a copy arrives.
  const inletFace = new THREE.Vector3(0, top + 0.3, 0.02);
  const inletMouth = solid(new THREE.BoxGeometry(0.3, 0.2, 0.06), "#0b0e13", 0.6);
  inletMouth.position.copy(inletFace);
  const inletFlash = glowSprite(CLOUD_LIGHT, 0, 1.2);
  inletFlash.position.copy(inletFace).add(new THREE.Vector3(0, 0, 0.1));
  face.add(inletMouth, inletFlash);

  face.rotation.y = FACE_CAMERA;
  group.add(face);

  return {
    group,
    inlet: inletFace.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), FACE_CAMERA),
    update: (seconds) => {
      lights.forEach((light, i) => {
        light.visible = Math.sin(seconds * (1.5 + (i % 4)) + i * 2.1) > -0.35;
      });
    },
    flash: (amount) => {
      inletFlash.material.opacity = amount * 0.9;
    },
  };
}
