import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

// A link between two nodes, as the contract declares it: one more trace of
// the same faint circuit, running from the provider's circuit to the
// consumer's, and a small envelope in the provider's color traveling along
// it. A label in the middle says what travels; hovering it shows where the
// contract says so.

export type LinkOptions = {
  from: THREE.Vector2; // provider's center
  to: THREE.Vector2; // consumer's center
  color: string; // provider's color
  what: string; // what travels, in plain words
  source: string; // where the contract says so
  cycle: number; // seconds between envelopes
  arriveAt: number; // moment in the cycle the envelope reaches the consumer
};
export type Link = { object: THREE.Object3D; update(seconds: number): void };

const TRACE = new THREE.Color("#6b8cb3");
const TRACE_OPACITY = 0.09; // same as the node circuits
const Y = 0.02;
const EDGE = 11.5; // where the trace leaves each node's circuit
const TRAVEL = 3.2; // seconds the envelope spends on the way
const LIFT = 0.55; // envelope height above the floor

function envelope(color: string): THREE.Group {
  const group = new THREE.Group();
  // No shadow: shadows are computed once, and the envelope keeps moving.
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.6), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
  const shape = new THREE.Shape([new THREE.Vector2(-0.45, 0.3), new THREE.Vector2(0.45, 0.3), new THREE.Vector2(0, -0.05)]);
  const flap = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: "#f6dde4", roughness: 0.6 }));
  flap.rotation.x = -Math.PI / 2;
  flap.position.y = 0.035;
  group.add(body, flap);
  return group;
}

function label(what: string, source: string): CSS2DObject {
  const element = document.createElement("div");
  element.className = "link-label";
  const text = document.createElement("span");
  text.textContent = what;
  const receipt = document.createElement("span");
  receipt.className = "link-label__source";
  receipt.textContent = source;
  element.append(text, receipt);
  return new CSS2DObject(element);
}

export function createLink(options: LinkOptions): Link {
  const group = new THREE.Group();
  const direction = options.to.clone().sub(options.from).normalize();
  const start = options.from.clone().addScaledVector(direction, EDGE);
  const end = options.to.clone().addScaledVector(direction, -EDGE);

  const trace = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(start.x, Y, start.y), new THREE.Vector3(end.x, Y, end.y)]),
    new THREE.LineBasicMaterial({ color: TRACE, transparent: true, opacity: TRACE_OPACITY }),
  );
  const padGeometry = new THREE.RingGeometry(0.1, 0.17, 20);
  const padMaterial = new THREE.MeshBasicMaterial({ color: TRACE, transparent: true, opacity: TRACE_OPACITY * 1.8 });
  for (const point of [start, end]) {
    const pad = new THREE.Mesh(padGeometry, padMaterial);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(point.x, Y, point.y);
    group.add(pad);
  }
  group.add(trace);

  const letter = envelope(options.color);
  letter.rotation.y = Math.atan2(direction.x, direction.y);
  group.add(letter);

  const middle = start.clone().lerp(end, 0.5);
  const caption = label(options.what, options.source);
  caption.position.set(middle.x, 1.2, middle.y);
  group.add(caption);

  return {
    object: group,
    update: (seconds) => {
      // The envelope leaves TRAVEL seconds before it must arrive.
      const since = (((seconds - options.arriveAt + TRAVEL) % options.cycle) + options.cycle) % options.cycle;
      letter.visible = since <= TRAVEL;
      const t = THREE.MathUtils.smoothstep(since / TRAVEL, 0, 1);
      const at = start.clone().lerp(end, t);
      letter.position.set(at.x, LIFT + Math.sin(t * Math.PI) * 0.3, at.y);
    },
  };
}
