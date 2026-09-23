import * as THREE from "three";
import { glowMaterial } from "./glow";
import type { Animated } from "./particles";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Moving dashes along the tube plus a brighter pulse that travels from the
// source to the target, so the direction of the flow is always readable.
const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float dash = step(0.45, fract(vUv.x * 36.0 - uTime * 1.8));
    float head = fract(uTime * 0.28);
    float pulse = exp(-pow((vUv.x - head) * 14.0, 2.0));
    float intensity = dash * 0.9 + pulse * 5.0;
    gl_FragColor = vec4(uColor * intensity, (dash * 0.7 + pulse));
  }
`;

export function createEnergyLink(from: THREE.Vector3, to: THREE.Vector3, color: string, lift = 3): THREE.Group & Animated {
  const group = new THREE.Group() as THREE.Group & Animated;
  const middle = from.clone().lerp(to, 0.5);
  middle.y += lift;
  const curve = new THREE.QuadraticBezierCurve3(from, middle, to);

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 } },
  });
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, 0.045, 8), material);

  // Glowing sockets where the link plugs into each platform.
  const socketGeometry = new THREE.SphereGeometry(0.16, 16, 12);
  const socketMaterial = glowMaterial(color, 4);
  const start = new THREE.Mesh(socketGeometry, socketMaterial);
  start.position.copy(from);
  const end = new THREE.Mesh(socketGeometry, socketMaterial);
  end.position.copy(to);

  group.add(tube, start, end);
  group.update = (time) => {
    material.uniforms.uTime!.value = time;
  };
  return group;
}
