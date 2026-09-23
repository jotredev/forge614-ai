import * as THREE from "three";
import { createBridge } from "./bridge";
import { createCharacter } from "./character";

// How nodes talk to each other: a messenger. For every flow between two
// nodes, a person in the sender's color walks across a bridge from the
// sender's plate to the receiver's, carrying a glowing card; at the receiver
// the card is handed over with a small flash, and the person walks back
// empty-handed. A node that sends to several nodes has several messengers,
// one per destination, each on its own bridge.

export type MessengerOptions = {
  from: THREE.Vector2; // sender's center
  to: THREE.Vector2; // receiver's center
  color: string; // sender's color
  toColor: string; // receiver's color
  cardColor: string; // what is carried
  height: number; // plate top, where the bridge deck is
  cycle: number; // seconds for one round trip plus rest
  arriveAt: number; // moment in the cycle the card is handed over
};
export type Messenger = { group: THREE.Group; update(seconds: number): void };

const WALK = 8; // seconds each way
const HANDOVER = 0.6; // seconds standing still to hand the card over
const CLEAR = 4.2; // distance from a node's center where walking starts/ends
const PLATE_REACH = 5.2; // distance from a node's center to its plate corner

function glowTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function glow(color: string, size: number): THREE.Sprite {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  sprite.scale.setScalar(size);
  return sprite;
}

export function createMessenger(options: MessengerOptions): Messenger {
  const group = new THREE.Group();
  const direction = options.to.clone().sub(options.from).normalize();
  const start = options.from.clone().addScaledVector(direction, CLEAR);
  const end = options.to.clone().addScaledVector(direction, -CLEAR);

  // The bridge joins the two plates at their facing corners.
  group.add(
    createBridge(
      { at: options.from.clone().addScaledVector(direction, PLATE_REACH), color: options.color },
      { at: options.to.clone().addScaledVector(direction, -PLATE_REACH), color: options.toColor },
      options.height,
    ),
  );

  // The walker lives in its own holder, so the character can bob up and
  // down on its own while the holder moves along the path.
  const holder = new THREE.Group();
  const person = createCharacter(options.color, "walking");
  person.group.scale.setScalar(1.5);
  // Shadows are computed once for the whole scene, so a moving person would
  // leave a ghost shadow behind; the messenger casts none.
  person.group.traverse((part) => {
    part.castShadow = false;
  });
  holder.add(person.group);

  // The card, held in front at chest height.
  const card = new THREE.Group();
  card.add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.3), new THREE.MeshBasicMaterial({ color: options.cardColor })));
  card.add(glow(options.cardColor, 1.0));
  card.position.set(0, 2.2, 0.75);
  holder.add(card);
  group.add(holder);

  // A small flash where the card is handed over.
  const flash = glow(options.cardColor, 1.6);
  flash.position.set(end.x, options.height + 2.2, end.y);
  group.add(flash);

  const place = (from: THREE.Vector2, to: THREE.Vector2, t: number): void => {
    const at = from.clone().lerp(to, t);
    holder.position.set(at.x, options.height, at.y);
    holder.rotation.y = Math.atan2(to.x - from.x, to.y - from.y);
  };

  return {
    group,
    update: (seconds) => {
      // Phase 0 is the moment the card is handed over.
      const phase = (((seconds - options.arriveAt) % options.cycle) + options.cycle) % options.cycle;
      const out = options.cycle - WALK; // leaves this long after the handover
      let carrying = false;
      let walking = false;
      if (phase < HANDOVER) {
        place(start, end, 1);
      } else if (phase < HANDOVER + WALK) {
        walking = true;
        place(end, start, (phase - HANDOVER) / WALK);
      } else if (phase < out) {
        place(start, end, 0);
      } else {
        walking = true;
        carrying = true;
        place(start, end, (phase - out) / WALK);
      }
      card.visible = carrying || phase < HANDOVER * 0.4;
      (flash.material as THREE.SpriteMaterial).opacity = phase < HANDOVER ? (1 - phase / HANDOVER) * 0.9 : 0;
      person.update(seconds, walking, carrying || phase < HANDOVER ? 1 : 0);
    },
  };
}
