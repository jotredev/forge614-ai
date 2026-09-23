import "@fontsource-variable/manrope";
import * as THREE from "three";
import { fatalMessage } from "./fatal";
import { createCard } from "./scene/card";
import { createFloor } from "./scene/floor";
import { CLOUD, createDataCenter } from "./scene/nodes/datacenter";
import { type Sync, createSync } from "./scene/sync";
import { createEngram } from "./scene/nodes/engram";
import { ENGINES, createEngines } from "./scene/nodes/engines";
import {
  APPLY_LEAVES,
  APPLY_REPLY_LEAVES,
  COPY_LEAVES,
  CYCLE,
  ENGINES_ASK_LEAVES,
  ENGINES_REPLY_LEAVES,
  LINE_STARTS,
  PREVIEW_ASK_LEAVES,
  PREVIEW_REPLY_LEAVES,
  RECALL_LEAVES,
  SAVE_LEAVES,
} from "./scene/timeline";
import { createShell } from "./scene/nodes/shell";
import { createPlatform } from "./scene/platform";
import { createStage } from "./scene/stage";

const container = document.getElementById("office");
if (!container) throw new Error("missing #office container");

// Nodes shown so far. They sit far apart, 44 units from each other, so each
// node's circuit has room and they never overlap: Shell and Engram side by
// side, Engines below, centered between them.
const PLATE_TOP = 1.7; // top of every node plate, where cables rest on them
const NODES = [
  { id: "shell", name: "Shell", role: "La terminal", accent: "#7fb2d9", across: -22, down: 0 },
  { id: "engram", name: "Engram", role: "La memoria", accent: "#d98ca0", across: 22, down: 0 },
  { id: "engines", name: "Engines", role: "Los motores", accent: ENGINES, across: 0, down: 38 },
] as const;

type NodeId = (typeof NODES)[number]["id"];

// Floor position from screen directions in the isometric view: `across` to
// the right, `down` toward the bottom of the screen.
function centerOf(id: NodeId): THREE.Vector2 {
  const node = NODES.find((n) => n.id === id)!;
  return new THREE.Vector2((node.across + node.down) * Math.SQRT1_2, (node.down - node.across) * Math.SQRT1_2);
}

try {
  // Framed so the three nodes and the floating data center fit.
  const stage = createStage(container, 66, new THREE.Vector3(15, 3, 8));

  const engramScene = createEngram(PLATE_TOP);
  const enginesScene = createEngines(PLATE_TOP, [centerOf("shell").sub(centerOf("engines")).normalize()]);
  const shellScene = createShell(PLATE_TOP, { starts: LINE_STARTS, cycle: CYCLE });
  const scenes = { shell: shellScene, engram: engramScene, engines: enginesScene };

  NODES.forEach((node, index) => {
    const center = centerOf(node.id);

    const floor = createFloor(center, index * 17);
    stage.scene.add(floor.object);
    stage.onTick((seconds) => floor.setTime(seconds));

    const platform = createPlatform(node.accent);
    platform.group.position.set(center.x, 0, center.y);
    stage.scene.add(platform.group);

    const scene = scenes[node.id];
    scene.group.position.set(center.x, 0, center.y);
    stage.scene.add(scene.group);
    stage.onTick((seconds) => scene.update(seconds));

    const card = createCard({ name: node.name, role: node.role, accent: node.accent });
    card.position.set(center.x, platform.top + 8.5, center.y);
    stage.scene.add(card);
  });

  // Engram's optional cloud copy (contract, section 6: optional sync with
  // PostgreSQL), as a remote data center floating up in the air, above and
  // behind Engram, joined by a fiber cable. It is outside the ecosystem: no
  // circuit under it. The copy goes over the internet on its own, every
  // second saved memory, right after Engram's hologram glows.
  const CLOUD_LIFT = 8; // how high the data center floats above the plates
  const engramAt = centerOf("engram");
  // Up and to the right on screen, so the ramp never crosses Engram's title.
  const cloudAt = engramAt.clone().add(new THREE.Vector2(3, -14));
  const cloudPlate = createPlatform(CLOUD, true);
  cloudPlate.group.position.set(cloudAt.x, CLOUD_LIFT, cloudAt.y);
  const dataCenter = createDataCenter(cloudPlate.top);
  dataCenter.group.position.set(cloudAt.x, CLOUD_LIFT, cloudAt.y);
  // Floating things cast no shadow: it would land far away on the floor.
  for (const floating of [cloudPlate.group, dataCenter.group]) {
    floating.traverse((part) => {
      part.castShadow = false;
    });
  }
  const cloudCard = createCard({ name: "PostgreSQL", role: "Opcional", accent: CLOUD, kind: "nube" });
  cloudCard.position.set(cloudAt.x, CLOUD_LIFT + cloudPlate.top + 6, cloudAt.y);
  stage.scene.add(cloudPlate.group, dataCenter.group, cloudCard);
  stage.onTick((seconds) => dataCenter.update(seconds));

  // The cable, fully in view like a real one: out of the side of Engram's
  // rack near the floor, along the plate to its edge on the cloud's side,
  // taut across the air to the facing edge of the floating plate, along
  // that plate, and into the foot of the middle rack, in front.
  const faceTurn = (x: number, y: number, z: number): THREE.Vector3 =>
    new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
  const toCloud = cloudAt.clone().sub(engramAt).normalize();
  const engram3 = new THREE.Vector3(engramAt.x, 0, engramAt.y);
  const cloud3 = new THREE.Vector3(cloudAt.x, 0, cloudAt.y);
  // Resting on a plate: the cable's radius above its top, never sunk in.
  const onEngram = PLATE_TOP + 0.1;
  const onCloud = CLOUD_LIFT + PLATE_TOP + 0.1;
  const engramEdge = engram3.clone().add(new THREE.Vector3(toCloud.x * 3.6, onEngram, toCloud.y * 3.6));
  const cloudEdge = cloud3.clone().add(new THREE.Vector3(-toCloud.x * 3.6, onCloud, -toCloud.y * 3.6));
  const inlet = dataCenter.inlet.clone().setY(dataCenter.inlet.y + CLOUD_LIFT);
  // Out of the plug straight away from the rack, then gently down to rest
  // on the plate, then along it (several points so it never dips).
  const outOfPlug = engram3.clone().add(faceTurn(1.35, PLATE_TOP + 0.45, -0.3));
  const onPlate = engram3.clone().add(faceTurn(1.8, onEngram, -0.3));
  const alongPlate = onPlate.clone().lerp(engramEdge, 0.5);
  const sync = createSync({
    from: engramAt,
    to: cloudAt,
    color: "#e6c9f0",
    origin: faceTurn(0.95, PLATE_TOP + 0.45, -0.3),
    route: [outOfPlug, onPlate, alongPlate, engramEdge, cloudEdge, cloud3.clone().add(inlet).add(faceTurn(0, 0, 0.6)).setY(onCloud)],
    clips: [alongPlate.clone().setY(onEngram), engramEdge.clone().setY(onEngram), cloudEdge.clone().setY(onCloud)],
    inlet,
    trips: [{ color: "#e6c9f0", leaves: COPY_LEAVES, onArrive: (amount) => dataCenter.flash(amount) }],
  });
  stage.scene.add(sync.group);
  stage.onTick((seconds) => sync.update(seconds));

  // Shell and Engram talk on their own (contract, section 11), through two
  // fiber cables side by side, one per direction: each leaves the side of
  // Shell's desk, goes down onto its plate, taut across the air to Engram's
  // plate, and into its own port at the foot of the rack. Shell saves what
  // it did through the blue one; Engram sends memories back through the
  // pink one.
  const shellAt = centerOf("shell");
  const shell3 = new THREE.Vector3(shellAt.x, 0, shellAt.y);
  // Shell-to-Engram route of one cable, given its lane on each plate
  // (face z at Shell's desk and at Engram's rack).
  const lane = (shellZ: number, engramZ: number, engramPort: THREE.Vector3): { route: THREE.Vector3[]; clips: THREE.Vector3[] } => {
    const desk = shell3.clone().add(faceTurn(2.35, PLATE_TOP + 1.25, shellZ));
    const floor = shell3.clone().add(faceTurn(2.7, onEngram, shellZ));
    const shellEdge = shell3.clone().add(faceTurn(3.6, onEngram, shellZ - 0.3));
    const engramNear = engram3.clone().add(faceTurn(-3.6, onEngram, engramZ + 0.1));
    const onPlate = engram3.clone().add(faceTurn(-1.8, onEngram, engramZ));
    const along = onPlate.clone().lerp(engramNear, 0.5);
    const port = engram3.clone().add(engramPort);
    const outOfPort = port.clone().add(faceTurn(-0.42, 0, 0));
    return { route: [desk, floor, shellEdge, engramNear, along, onPlate, outOfPort], clips: [floor, shellEdge, engramNear, along] };
  };
  const deskPlug = (z: number): THREE.Vector3 => faceTurn(1.9, PLATE_TOP + 1.25, z);

  const saveLane = lane(0.55, -0.6, engramScene.inlet);
  const save = createSync({
    from: shellAt,
    to: engramAt,
    color: "#b9d7ee",
    origin: deskPlug(0.55),
    route: saveLane.route,
    clips: saveLane.clips,
    inlet: engramScene.inlet,
    trips: [{ color: "#b9d7ee", leaves: SAVE_LEAVES }],
  });
  const recallLane = lane(1.25, 0.05, engramScene.outlet);
  const recall = createSync({
    from: engramAt,
    to: shellAt,
    color: "#f3b7c6",
    origin: engramScene.outlet,
    route: [...recallLane.route].reverse(),
    clips: recallLane.clips,
    inlet: deskPlug(1.25),
    trips: [{ color: "#f3b7c6", leaves: RECALL_LEAVES }],
  });
  // Shell and Engines (contract, sections 5 and 11) talk through two cables,
  // one per direction, from a small network box on Shell's floor, right of
  // the desk, into two ports on Engines' projector base. Through the blue
  // one Shell asks, in turn, for the AI engines installed, for a preview of
  // the change, and to apply it once the person confirms; through the amber
  // one Engines answers each.
  const enginesAt = centerOf("engines");
  const engines3 = new THREE.Vector3(enginesAt.x, 0, enginesAt.y);
  const linkToEngines = (
    node3: THREE.Vector3,
    // The node's ends of both cables (relative to its center) and the
    // direction they come out of.
    ends: { ask: THREE.Vector3; reply: THREE.Vector3; outward: THREE.Vector3 },
    ports: { inlet: THREE.Vector3; outlet: THREE.Vector3 },
    ask: { color: string; leaves: number[] },
    replies: number[],
  ): Sync[] => {
    const toEngines = engines3.clone().sub(node3).normalize();
    const across = new THREE.Vector3(-toEngines.z, 0, toEngines.x);
    // Just inside a plate's edge, toward the other node, moved sideways.
    const edge = (center: THREE.Vector3, toward: THREE.Vector3, side: number): THREE.Vector3 =>
      center
        .clone()
        .addScaledVector(toward, 3.5 / Math.max(Math.abs(toward.x), Math.abs(toward.z)))
        .addScaledVector(across, side)
        .setY(onEngram);
    // One cable, on its side of the pair (+1 or -1), from the node to a port.
    const lane = (side: number, end: THREE.Vector3, port: THREE.Vector3): { route: THREE.Vector3[]; clips: THREE.Vector3[] } => {
      const plug = node3.clone().add(end);
      const outOfBox = plug.clone().addScaledVector(ends.outward, 0.4);
      const floor = plug.clone().addScaledVector(ends.outward, 0.9).setY(onEngram);
      const nodeEdge = edge(node3, toEngines, side * 0.35);
      const enginesEdge = edge(engines3, toEngines.clone().negate(), side * 0.35);
      const portAt = engines3.clone().add(port);
      const outward = portAt.clone().sub(engines3).setY(0).normalize();
      const onPlate = portAt.clone().addScaledVector(outward, 0.9).setY(onEngram);
      const outOfPort = portAt.clone().addScaledVector(outward, 0.4);
      const along = onPlate.clone().lerp(enginesEdge, 0.5);
      return {
        route: [outOfBox, floor, nodeEdge, enginesEdge, along, onPlate, outOfPort],
        clips: [floor, nodeEdge, enginesEdge, along],
      };
    };
    const node2 = new THREE.Vector2(node3.x, node3.z);
    // Seen from the node, Engines' inlet is on the +1 side of the pair.
    const askLane = lane(1, ends.ask, ports.inlet);
    const replyLane = lane(-1, ends.reply, ports.outlet);
    return [
      createSync({
        from: node2,
        to: enginesAt,
        color: ask.color,
        origin: ends.ask,
        route: askLane.route,
        clips: askLane.clips,
        inlet: ports.inlet,
        trips: ask.leaves.map((leaves) => ({ color: ask.color, leaves })),
      }),
      createSync({
        from: enginesAt,
        to: node2,
        color: "#f0cf8f",
        origin: ports.outlet,
        route: [...replyLane.route].reverse(),
        clips: replyLane.clips,
        inlet: ends.reply,
        trips: replies.map((leaves) => ({ color: "#f0cf8f", leaves })),
      }),
    ];
  };
  // Shell's network box, facing Engines, with one plug per cable.
  const shellToEngines = engines3.clone().sub(shell3).normalize();
  const shellAcross = new THREE.Vector3(-shellToEngines.z, 0, shellToEngines.x);
  const boxAt = faceTurn(1.6, PLATE_TOP + 0.25, 2.3);
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: "#2a2f3d", roughness: 0.5, metalness: 0.4 }),
  );
  box.castShadow = true;
  box.position.copy(shell3).add(boxAt);
  box.rotation.y = Math.atan2(shellToEngines.x, shellToEngines.z);
  stage.scene.add(box);
  const boxPlug = (side: number): THREE.Vector3 =>
    boxAt.clone().addScaledVector(shellToEngines, 0.26).addScaledVector(shellAcross, side * 0.18);
  const shellLinks = linkToEngines(
    shell3,
    { ask: boxPlug(1), reply: boxPlug(-1), outward: shellToEngines },
    enginesScene.ports[0]!,
    { color: "#b9d7ee", leaves: [ENGINES_ASK_LEAVES, PREVIEW_ASK_LEAVES, APPLY_LEAVES] },
    [ENGINES_REPLY_LEAVES, PREVIEW_REPLY_LEAVES, APPLY_REPLY_LEAVES],
  );

  for (const cable of [save, recall, ...shellLinks]) {
    stage.scene.add(cable.group);
    stage.onTick((seconds) => cable.update(seconds));
  }

  stage.start();
  // Labels measure their text, so draw again once the typeface has loaded.
  void document.fonts.ready.then(() => stage.invalidate());
} catch (error) {
  const message = document.createElement("pre");
  message.className = "fatal";
  message.textContent = fatalMessage(error);
  container.replaceChildren(message);
}
