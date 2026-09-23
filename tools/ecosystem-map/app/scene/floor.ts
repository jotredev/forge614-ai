import * as THREE from "three";

// Floor pattern: a few loose, faint circuit traces scattered over a clean
// floor, each with a small comet of light traveling along it, like data
// moving through the system. Drawn by a shader on a transparent layer just
// above the real floor, so the floor keeps receiving shadows.

const vertexShader = /* glsl */ `
  varying vec2 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vWorld;

  const vec3 TRACE = vec3(0.42, 0.55, 0.70);
  const vec3 LIGHT = vec3(0.70, 0.86, 1.0);

  // Lanes are 3 units apart; each lane is split into 18-unit chunks and only
  // a few chunks hold a trace, so most of the floor stays clean.
  const float LANE = 3.0;
  const float CHUNK = 18.0;
  const float DENSITY = 0.14;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  // Anti-aliased line of a given half width (in pixels) around distance 0.
  float stroke(float distance, float halfWidthPx) {
    float px = abs(distance) / max(fwidth(distance), 1e-5);
    return 1.0 - smoothstep(halfWidthPx - 0.5, halfWidthPx + 0.5, px);
  }

  // One family of traces running along "along", stacked across "across".
  // Returns (trace, pad, comet).
  vec3 traces(float along, float across, float seed) {
    float lane = floor(across / LANE + 0.5);
    float offset = across - lane * LANE;
    float chunk = floor(along / CHUNK);
    vec2 id = vec2(lane, chunk + seed);
    if (hash(id) > DENSITY) return vec3(0.0);

    float start = chunk * CHUNK + 1.0 + hash(id + 1.3) * 4.0;
    float end = (chunk + 1.0) * CHUNK - 1.0 - hash(id + 2.7) * 4.0;
    float inside = step(start, along) * step(along, end);
    float trace = stroke(offset, 0.6) * inside;

    float pad = max(
      stroke(length(vec2(along - start, offset)) - 0.14, 0.7),
      stroke(length(vec2(along - end, offset)) - 0.14, 0.7)
    );

    // The comet: a bright head with a short fading tail, looping along the trace.
    float speed = 0.08 + hash(id + 4.1) * 0.06;
    float head = mix(start, end, fract(uTime * speed + hash(id + 5.9)));
    float behind = head - along;
    float tail = (1.0 - smoothstep(0.0, 2.2, behind)) * step(0.0, behind) * inside;
    float comet = stroke(offset, 1.2) * tail;
    return vec3(trace, pad, comet);
  }

  void main() {
    vec3 horizontal = traces(vWorld.x, vWorld.y, 0.0);
    vec3 vertical = traces(vWorld.y, vWorld.x, 91.0);
    vec3 t = max(horizontal, vertical);
    float fade = 1.0 - smoothstep(20.0, 60.0, length(vWorld));
    float alpha = max(max(t.x * 0.1, t.y * 0.2), t.z * 0.85) * fade;
    vec3 color = t.z > 0.05 ? LIGHT : TRACE;
    gl_FragColor = vec4(color, alpha);
  }
`;

export type Floor = { mesh: THREE.Mesh; setTime(seconds: number): void };

export function createFloor(): Floor {
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.01;
  return {
    mesh,
    setTime: (seconds) => {
      material.uniforms.uTime!.value = seconds;
    },
  };
}
