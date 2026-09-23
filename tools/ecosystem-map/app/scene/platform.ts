import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { glowMaterial } from "./glow";
import type { Animated } from "./particles";
import { theme } from "./theme";

export type PlatformOptions = {
  size: number;
  height: number;
  accent: string;
  code: string;
  title: string;
  subtitle: string;
};

const TRIM = 0.07;

const surfaceVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fine tech grid tinted with the node color, plus a scan band that sweeps
// across the surface.
const surfaceFragment = /* glsl */ `
  uniform vec3 uAccent;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 16.0;
    vec2 g = abs(fract(p - 0.5) - 0.5);
    float lines = 1.0 - smoothstep(0.0, fwidth(p.x) * 1.2, min(g.x, g.y));
    float scan = fract(uTime * 0.12);
    float band = smoothstep(0.08, 0.0, abs(vUv.y - scan));
    float edge = smoothstep(0.42, 0.5, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)));
    float alpha = lines * 0.12 + band * 0.35 + edge * 0.18;
    gl_FragColor = vec4(uAccent * (1.0 + band * 2.0), alpha);
  }
`;

const haloFragment = /* glsl */ `
  uniform vec3 uAccent;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float pulse = 0.85 + 0.15 * sin(uTime * 1.6);
    float alpha = smoothstep(1.0, 0.2, d) * 0.22 * pulse;
    gl_FragColor = vec4(uAccent, alpha);
  }
`;

function trimFrame(size: number, y: number, material: THREE.Material): THREE.Group {
  const frame = new THREE.Group();
  const half = size / 2;
  const long = new THREE.BoxGeometry(size, TRIM, TRIM);
  const side = new THREE.BoxGeometry(TRIM, TRIM, size);
  const pieces: Array<[THREE.BoxGeometry, number, number]> = [
    [long, 0, half],
    [long, 0, -half],
    [side, half, 0],
    [side, -half, 0],
  ];
  for (const [geometry, x, z] of pieces) {
    const bar = new THREE.Mesh(geometry, material);
    bar.position.set(x, y, z);
    frame.add(bar);
  }
  return frame;
}

function hudCard(options: PlatformOptions): HTMLDivElement {
  const card = document.createElement("div");
  card.className = "platform-card";
  card.style.setProperty("--accent", options.accent);
  const code = document.createElement("div");
  code.className = "platform-card__code";
  code.textContent = options.code;
  const title = document.createElement("div");
  title.className = "platform-card__title";
  title.textContent = options.title;
  const subtitle = document.createElement("div");
  subtitle.className = "platform-card__subtitle";
  subtitle.textContent = options.subtitle;
  card.append(code, title, subtitle);
  return card;
}

export function createPlatform(options: PlatformOptions): THREE.Group & Animated {
  const group = new THREE.Group() as THREE.Group & Animated;
  const { size, height, accent } = options;

  const base = new THREE.Mesh(
    new RoundedBoxGeometry(size, height, size, 4, 0.25),
    new THREE.MeshStandardMaterial({ color: theme.platformSide, metalness: 0.7, roughness: 0.35 }),
  );
  base.position.y = height / 2;
  base.castShadow = true;
  base.receiveShadow = true;

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(size - 0.4, 0.06, size - 0.4),
    new THREE.MeshStandardMaterial({ color: theme.platformTop, metalness: 0.5, roughness: 0.5 }),
  );
  top.position.y = height + 0.03;
  top.receiveShadow = true;

  const surfaceMaterial = new THREE.ShaderMaterial({
    vertexShader: surfaceVertex,
    fragmentShader: surfaceFragment,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uAccent: { value: new THREE.Color(accent) }, uTime: { value: 0 } },
  });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(size - 0.4, size - 0.4), surfaceMaterial);
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = height + 0.065;

  const haloMaterial = new THREE.ShaderMaterial({
    vertexShader: surfaceVertex,
    fragmentShader: haloFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uAccent: { value: new THREE.Color(accent) }, uTime: { value: 0 } },
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(size * 1.9, size * 1.9), haloMaterial);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.02;

  const upperTrim = trimFrame(size - 0.2, height + 0.04, glowMaterial(accent, 2.4));
  const lowerTrim = trimFrame(size + 0.02, 0.12, glowMaterial(accent, 1.2));

  // Colored light spilling onto the floor around the platform.
  const spill = new THREE.PointLight(accent, 18, size * 1.6, 2);
  spill.position.set(0, height + 1.5, 0);

  group.add(halo, base, top, surface, upperTrim, lowerTrim, spill);

  const label = new CSS2DObject(hudCard(options));
  label.position.set(-size / 2, height + 4.5, -size / 2);
  group.add(label);

  group.update = (time) => {
    surfaceMaterial.uniforms.uTime!.value = time;
    haloMaterial.uniforms.uTime!.value = time;
  };
  return group;
}
