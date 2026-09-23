import * as THREE from "three";
import { theme } from "./theme";

const vertexShader = /* glsl */ `
  varying vec2 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

// Minor lines every unit, major lines every five, and a small "+" marker on
// each major intersection. Everything fades out radially.
const fragmentShader = /* glsl */ `
  uniform vec3 uMinor;
  uniform vec3 uMajor;
  uniform vec3 uCross;
  uniform float uFade;
  varying vec2 vWorld;

  float gridLine(vec2 p, float spacing, float width) {
    vec2 g = abs(fract(p / spacing - 0.5) - 0.5) * spacing;
    vec2 fw = fwidth(p) * width;
    vec2 l = 1.0 - smoothstep(vec2(0.0), fw, g);
    return max(l.x, l.y);
  }

  void main() {
    float minor = gridLine(vWorld, 1.0, 1.0);
    float major = gridLine(vWorld, 5.0, 1.2);
    vec2 d = abs(fract(vWorld / 5.0 - 0.5) - 0.5) * 5.0;
    vec2 fw = fwidth(vWorld) * 1.6;
    float armX = (1.0 - smoothstep(0.0, fw.y, d.y)) * step(d.x, 0.22);
    float armY = (1.0 - smoothstep(0.0, fw.x, d.x)) * step(d.y, 0.22);
    float marker = max(armX, armY);
    float fade = 1.0 - smoothstep(uFade * 0.3, uFade, length(vWorld));
    vec3 color = uMinor * minor + uMajor * major + uCross * marker;
    float alpha = max(max(minor * 0.4, major * 0.55), marker * 0.7) * fade;
    gl_FragColor = vec4(color, alpha);
  }
`;

export function createBlueprintFloor(): THREE.Group {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: theme.floor, roughness: 0.9, metalness: 0.2 }),
  );
  base.rotation.x = -Math.PI / 2;
  base.receiveShadow = true;

  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uMinor: { value: new THREE.Color(theme.gridMinor) },
        uMajor: { value: new THREE.Color(theme.gridMajor) },
        uCross: { value: new THREE.Color(theme.gridCross) },
        uFade: { value: 60 },
      },
    }),
  );
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = 0.01;

  group.add(base, grid);
  return group;
}
