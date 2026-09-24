import "@fontsource-variable/manrope";
import * as THREE from "three";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { fatalMessage } from "./fatal";
import { createCard } from "./scene/card";
import { createFloor } from "./scene/floor";
import { CLOUD, createDataCenter } from "./scene/nodes/datacenter";
import { type Sync, type Trip, createSync } from "./scene/sync";
import { ATLAS, createAtlas } from "./scene/nodes/atlas";
import { createEngram } from "./scene/nodes/engram";
import { ENGINES, createEngines } from "./scene/nodes/engines";
import { type Led, createLed } from "./scene/led";
import { NODE_INFO } from "./scene/nodes/info";
import { batchStatic, mergeByMaterial } from "./scene/batch";
import { createEmphasis } from "./scene/emphasis";
import { fitView } from "./scene/framing";
import { createHud } from "./scene/hud";

import type { Palette } from "./scene/story";
import { createTracker } from "./scene/tracker";
import { type Selectable, createInteraction } from "./scene/interaction";
import { SENTINEL, createSentinel } from "./scene/nodes/sentinel";
import { WORKERS, createWorker } from "./scene/nodes/worker";
import {
  APPLY_LEAVES,
  APPLY_REPLY_LEAVES,
  ATLAS_ENGINES_ASK_LEAVES,
  ATLAS_ENGINES_REPLY_LEAVES,
  ATLAS_LOOKUP_LEAVES,
  ATLAS_LOOKUP_REPLY_LEAVES,
  ATLAS_PROGRESS_LEAVES,
  ATLAS_REPORT_LEAVES,
  ATLAS_START_LEAVES,
  ATLAS_STORED_AT,
  ATLAS_WRITE_LEAVES,
  CHECK_ASK_LEAVES,
  COPY_LEAVES,
  CYCLE,
  ENGINES_ASK_LEAVES,
  ENGINES_REPLY_LEAVES,
  LINE_STARTS,
  PREVIEW_ASK_LEAVES,
  PREVIEW_REPLY_LEAVES,
  RECALL_LEAVES,
  REPORT_LEAVES,
  SAVE_LEAVES,
  TASK_LEAVES,
  TRAVEL,
  VERDICT_LEAVES,
  WORKER_COUNT,
} from "./scene/timeline";

const ATLAS_LIGHT = "#c4ecd6";
const SENTINEL_LIGHT = "#bdeef0";
const WORKERS_LIGHT = "#f2c3b4";
import { createShell } from "./scene/nodes/shell";
import { createPlatform } from "./scene/platform";
import { createStage } from "./scene/stage";

const container = document.getElementById("office");
if (!container) throw new Error("missing #office container");

// Nodes shown so far. They sit far apart, 44 units from each other, so each
// node's circuit has room and they never overlap: Shell and Engram side by
// side, Engines and Atlas in the row below.
const PLATE_TOP = 1.7; // top of every node plate, where cables rest on them
const NODES = [
  { id: "shell", name: "Shell", role: "La terminal", accent: "#7fb2d9", across: -22, down: 0 },
  { id: "engram", name: "Engram", role: "La memoria", accent: "#d98ca0", across: 22, down: 0 },
  { id: "engines", name: "Engines", role: "Los motores", accent: ENGINES, across: 0, down: 38 },
  { id: "atlas", name: "Atlas", role: "Orquestador de contexto", accent: ATLAS, across: 44, down: 38 },
  { id: "sentinel", name: "Sentinel", role: "El verificador", accent: SENTINEL, across: 66, down: 0 },
] as const;

type NodeId = (typeof NODES)[number]["id"];

// Floor position from screen directions in the isometric view: `across` to
// the right, `down` toward the bottom of the screen.
function centerOf(id: NodeId): THREE.Vector2 {
  const node = NODES.find((n) => n.id === id)!;
  return new THREE.Vector2((node.across + node.down) * Math.SQRT1_2, (node.down - node.across) * Math.SQRT1_2);
}

try {
  // Framed so every node, the workers and the floating data center fit.
  const VIEW_SIZE = 84;
  const stage = createStage(container, VIEW_SIZE, new THREE.Vector3(35, 3, 4));

  // Direction on the floor from one node to another.
  const toward = (from: NodeId, to: NodeId): THREE.Vector2 => centerOf(to).sub(centerOf(from)).normalize();
  const engramScene = createEngram(PLATE_TOP);
  const enginesScene = createEngines(PLATE_TOP, [toward("engines", "shell"), toward("engines", "atlas")]);
  const shellScene = createShell(PLATE_TOP, { starts: LINE_STARTS, cycle: CYCLE });
  const atlasScene = createAtlas(
    PLATE_TOP,
    [toward("atlas", "shell"), toward("atlas", "engines"), toward("atlas", "engram"), toward("atlas", "sentinel")],
    WORKER_COUNT,
  );
  const sentinelScene = createSentinel(PLATE_TOP);
  const scenes = { shell: shellScene, engram: engramScene, engines: enginesScene, atlas: atlasScene, sentinel: sentinelScene };

  // Each plate's LED lights when a message arrives at it, by cable.
  const leds = new Map<string, Led>();
  const selectables: Selectable[] = [];
  // Points that must fit on screen: the corners of every plate and the spot
  // of each floating title. The camera is framed from these.
  const extent: THREE.Vector3[] = [];
  const remember = (at: THREE.Vector2, half: number, baseY: number, cardY: number): void => {
    for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) extent.push(new THREE.Vector3(at.x + sx * half, baseY, at.y + sz * half));
    extent.push(new THREE.Vector3(at.x, cardY, at.y));
  };
  NODES.forEach((node, index) => {
    const center = centerOf(node.id);

    const floor = createFloor(center, index * 17);
    stage.scene.add(floor.object);
    stage.onTick((seconds) => floor.setTime(seconds));

    const platform = createPlatform(node.accent);
    platform.group.position.set(center.x, 0, center.y);
    stage.scene.add(platform.group);
    leds.set(node.id, createLed(platform.light));

    const scene = scenes[node.id];
    scene.group.position.set(center.x, 0, center.y);
    stage.scene.add(scene.group);
    stage.onTick((seconds) => scene.update(seconds));

    const card = createCard({ name: node.name, role: node.role, accent: node.accent });
    card.position.set(center.x, platform.top + 8.5, center.y);
    stage.scene.add(card);
    remember(center, 3.8, 1.4, platform.top + 8.5);
    selectables.push({ id: node.id, name: node.name, role: node.role, accent: node.accent, center, card, info: NODE_INFO[node.id] });
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
  leds.set("cloud", createLed(cloudPlate.light));
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
  remember(cloudAt, 3.8, CLOUD_LIFT + 1.4, CLOUD_LIFT + cloudPlate.top + 6);
  selectables.push({
    id: "cloud",
    name: "PostgreSQL",
    role: "Copia en la nube, opcional",
    accent: CLOUD,
    center: cloudAt,
    card: cloudCard,
    info: NODE_INFO.cloud,
    lift: CLOUD_LIFT,
  });
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
    trips: [ATLAS_STORED_AT, COPY_LEAVES].map((leaves) => ({
      color: "#e6c9f0",
      leaves,
      onArrive: (amount: number) => {
        dataCenter.flash(amount);
        leds.get("cloud")?.hit(amount);
      },
    })),
  });
  const cables: Sync[] = [sync];
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
    trips: [{ color: "#b9d7ee", leaves: SAVE_LEAVES, onArrive: (amount: number) => leds.get("engram")?.hit(amount) }],
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
    trips: [{ color: "#f3b7c6", leaves: RECALL_LEAVES, onArrive: (amount: number) => leds.get("shell")?.hit(amount) }],
  });
  // Every other cable is laid the same way: out of its plug, down onto the
  // plate, to the plate's edge facing the other node, taut across the air,
  // and the same on the other side into its port. A pair of nodes that talk
  // both ways get two cables side by side, one per direction; a single
  // cable can also carry both ways.
  type End = {
    id: string; // which plate's LED lights when a message arrives here
    center: THREE.Vector3; // the node's center on the floor
    plugs: THREE.Vector3[]; // plug positions, relative to the center
    outward: THREE.Vector3 | undefined; // direction cables leave in; away from the center if none
    half: number; // half the plate's size
  };
  const endOf = (id: NodeId, plugs: THREE.Vector3[], outward?: THREE.Vector3, half = 3.8): End => {
    const at = centerOf(id);
    return { id, center: new THREE.Vector3(at.x, 0, at.y), plugs, outward, half };
  };
  const outwardOf = (end: End, plug: THREE.Vector3): THREE.Vector3 => end.outward ?? plug.clone().setY(0).normalize();
  const cable = (
    a: End,
    aPlug: THREE.Vector3,
    b: End,
    bPlug: THREE.Vector3,
    side: number,
    color: string,
    trips: Trip[],
  ): Sync => {
    const toB = b.center.clone().sub(a.center).setY(0).normalize();
    const across = new THREE.Vector3(-toB.z, 0, toB.x);
    const edge = (end: End, toward: THREE.Vector3): THREE.Vector3 =>
      end.center
        .clone()
        .addScaledVector(toward, (end.half - 0.3) / Math.max(Math.abs(toward.x), Math.abs(toward.z)))
        .addScaledVector(across, side * 0.35)
        .setY(onEngram);
    const leaving = (end: End, plug: THREE.Vector3): THREE.Vector3[] => {
      const at = end.center.clone().add(plug);
      const out = outwardOf(end, plug);
      return [at.clone().addScaledVector(out, 0.4), at.clone().addScaledVector(out, 0.9).setY(onEngram)];
    };
    const aEdge = edge(a, toB);
    const bEdge = edge(b, toB.clone().negate());
    const [aOut, aFloor] = leaving(a, aPlug);
    const [bOut, bFloor] = leaving(b, bPlug);
    const aAlong = aFloor!.clone().lerp(aEdge, 0.5);
    const bAlong = bFloor!.clone().lerp(bEdge, 0.5);
    const arriving = trips.map((trip) => ({
      ...trip,
      onArrive: (amount: number) => {
        trip.onArrive?.(amount);
        leds.get(b.id)?.hit(amount);
      },
    }));
    return createSync({
      from: new THREE.Vector2(a.center.x, a.center.z),
      to: new THREE.Vector2(b.center.x, b.center.z),
      color,
      origin: aPlug,
      route: [aOut!, aFloor!, aAlong, aEdge, bEdge, bAlong, bFloor!, bOut!],
      clips: [aAlong, aEdge, bEdge, bAlong],
      inlet: bPlug,
      trips: arriving,
    });
  };
  // Two cables between a and b, one per direction, each on its own side;
  // each end's plugs are matched to the side they sit on.
  const pair = (a: End, b: End, forward: { color: string; leaves: number[] }, backward: { color: string; leaves: number[] }): Sync[] => {
    const toB = b.center.clone().sub(a.center).setY(0).normalize();
    const across = new THREE.Vector3(-toB.z, 0, toB.x);
    const bySide = (end: End): THREE.Vector3[] => [...end.plugs].sort((p, q) => q.dot(across) - p.dot(across));
    const [aPlus, aMinus] = bySide(a);
    const [bPlus, bMinus] = bySide(b);
    return [
      cable(a, aPlus!, b, bPlus!, 1, forward.color, forward.leaves.map((leaves) => ({ color: forward.color, leaves }))),
      cable(b, bMinus!, a, aMinus!, 1, backward.color, backward.leaves.map((leaves) => ({ color: backward.color, leaves }))),
    ];
  };
  // A small network box on a node's floor, facing another node, with one
  // plug per cable.
  const networkBox = (id: NodeId, boxAt: THREE.Vector3, toward: NodeId): End => {
    const from = centerOf(id);
    const to = centerOf(toward);
    const dir = new THREE.Vector3(to.x - from.x, 0, to.y - from.y).normalize();
    const across = new THREE.Vector3(-dir.z, 0, dir.x);
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: "#2a2f3d", roughness: 0.5, metalness: 0.4 }),
    );
    box.castShadow = true;
    box.position.set(from.x, 0, from.y).add(boxAt);
    box.rotation.y = Math.atan2(dir.x, dir.z);
    stage.scene.add(box);
    const plug = (s: number): THREE.Vector3 => boxAt.clone().addScaledVector(dir, 0.26).addScaledVector(across, s * 0.18);
    return endOf(id, [plug(1), plug(-1)], dir);
  };

  // Shell and Engines (contract, sections 5 and 11): from a network box on
  // Shell's floor, right of the desk, into two ports on Engines' projector
  // base. Through the blue one Shell asks, in turn, for the AI engines
  // installed, for a preview of the change, and to apply it once the person
  // confirms; through the amber one Engines answers each.
  const enginesPorts = (i: number): End => endOf("engines", [enginesScene.ports[i]!.inlet, enginesScene.ports[i]!.outlet]);
  const shellEngines = pair(
    networkBox("shell", faceTurn(1.6, PLATE_TOP + 0.25, 2.3), "engines"),
    enginesPorts(0),
    { color: "#b9d7ee", leaves: [ENGINES_ASK_LEAVES, PREVIEW_ASK_LEAVES, APPLY_LEAVES] },
    { color: "#f0cf8f", leaves: [ENGINES_REPLY_LEAVES, PREVIEW_REPLY_LEAVES, APPLY_REPLY_LEAVES] },
  );

  // Atlas (contract, section 7; acta 0004). Shell tells it to start and
  // Atlas reports its progress and final report back; it asks Engines which
  // engines can run its workers; it asks Engram for saved progress and
  // writes the checked knowledge there. Atlas' light is green.
  const atlasEnd = (i: number): End => endOf("atlas", atlasScene.ports[i]!);
  const shellAtlas = pair(
    networkBox("shell", faceTurn(2.8, PLATE_TOP + 0.25, 1.9), "atlas"),
    atlasEnd(0),
    { color: "#b9d7ee", leaves: [ATLAS_START_LEAVES] },
    { color: ATLAS_LIGHT, leaves: [ATLAS_PROGRESS_LEAVES, ATLAS_REPORT_LEAVES] },
  );
  const atlasEngines = pair(
    atlasEnd(1),
    enginesPorts(1),
    { color: ATLAS_LIGHT, leaves: [ATLAS_ENGINES_ASK_LEAVES] },
    { color: "#f0cf8f", leaves: [ATLAS_ENGINES_REPLY_LEAVES] },
  );
  const atlasEngram = pair(
    atlasEnd(2),
    endOf("engram", engramScene.atlasPorts, faceTurn(0, 0, 1)),
    { color: ATLAS_LIGHT, leaves: [ATLAS_LOOKUP_LEAVES, ATLAS_WRITE_LEAVES] },
    { color: "#f3b7c6", leaves: [ATLAS_LOOKUP_REPLY_LEAVES] },
  );

  // Atlas and Sentinel (acta 0004): each worker's report goes to Sentinel,
  // which checks it against the rulebook and sends back its record. The
  // cables leave a network box on Sentinel's floor, by the start of its
  // belt. Sentinel's light is turquoise.
  const atlasSentinel = pair(
    atlasEnd(3),
    networkBox("sentinel", faceTurn(-2.4, PLATE_TOP + 0.25, 1.3), "atlas"),
    { color: ATLAS_LIGHT, leaves: CHECK_ASK_LEAVES },
    { color: SENTINEL_LIGHT, leaves: VERDICT_LEAVES },
  );

  // Atlas' workers, one small plate each, fanned out below Atlas; no circuit
  // of their own, since they are part of Workers. Two cables each: the task
  // comes from Atlas through one, and the raw report goes back through the
  // other (contract, section 7).
  const atlasAt = centerOf("atlas");
  const workerCables = [-18, 0, 18].map((offset, i) => {
    const node = { across: 44 + offset, down: 60 };
    const at = new THREE.Vector2((node.across + node.down) * Math.SQRT1_2, (node.down - node.across) * Math.SQRT1_2);
    const plate = createPlatform(WORKERS, false, 4.6);
    leds.set(`worker-${i}`, createLed(plate.light));
    plate.group.position.set(at.x, 0, at.y);
    const worker = createWorker(
      PLATE_TOP,
      i,
      { cycle: CYCLE, from: TASK_LEAVES[i]! + TRAVEL, to: REPORT_LEAVES[i]! },
      atlasAt.clone().sub(at).normalize(),
    );
    worker.group.position.set(at.x, 0, at.y);
    const card = createCard({ name: `Worker ${i + 1}`, role: "Obrero", accent: WORKERS, kind: "worker" });
    card.position.set(at.x, PLATE_TOP + 5.2, at.y);
    stage.scene.add(plate.group, worker.group, card);
    remember(at, 2.3, 1.4, PLATE_TOP + 5.2);
    selectables.push({
      id: `worker-${i}`,
      name: `Worker ${i + 1}`,
      role: "Obrero",
      accent: WORKERS,
      center: at,
      card,
      info: NODE_INFO.worker,
      hit: { width: 5.6, height: 7.4 },
      zoom: 2.9,
      anchor: 3.4,
    });
    stage.onTick((seconds) => worker.update(seconds));
    const workerEnd: End = { id: `worker-${i}`, center: new THREE.Vector3(at.x, 0, at.y), plugs: worker.ports, outward: undefined, half: 2.3 };
    return pair(
      endOf("atlas", atlasScene.workerPorts[i]!, faceTurn(1, 0, 0)),
      workerEnd,
      { color: ATLAS_LIGHT, leaves: [TASK_LEAVES[i]!] },
      { color: WORKERS_LIGHT, leaves: [REPORT_LEAVES[i]!] },
    );
  }).flat();

  for (const c of [save, recall, ...shellEngines, ...shellAtlas, ...atlasEngines, ...atlasEngram, ...atlasSentinel, ...workerCables]) {
    stage.scene.add(c.group);
    stage.onTick((seconds) => c.update(seconds));
    cables.push(c);
  }
  // The cables' fixed parts (tubes, plugs, sockets, clips) never move, so they
  // are joined: a few meshes for all the cables instead of ten for each.
  stage.scene.add(...mergeByMaterial(cables.flatMap((c) => c.staticParts)));
  // The nodes in the current process keep their plate softly lit and the titles
  // of the rest fade. It runs before the LEDs update below, so a jump in time
  // shows in the same frame.
  const titlesOf = (match: (id: string) => boolean): CSS2DObject[] => selectables.filter((item) => match(item.id)).map((item) => item.card);
  createEmphasis(
    stage,
    {
      shell: titlesOf((id) => id === "shell"),
      engram: titlesOf((id) => id === "engram"),
      engines: titlesOf((id) => id === "engines"),
      atlas: titlesOf((id) => id === "atlas"),
      sentinel: titlesOf((id) => id === "sentinel"),
      workers: titlesOf((id) => id.startsWith("worker-")),
      cloud: [cloudCard],
    },
    (party, amount) => {
      if (party === "workers") for (let i = 0; i < WORKER_COUNT; i++) leds.get(`worker-${i}`)?.hit(amount);
      else leds.get(party)?.hit(amount);
    },
  );

  // After every cable has reported its arrivals this tick.
  stage.onTick((seconds) => {
    for (const led of leds.values()) led.update(seconds);
  });

  // Join the pieces that never move. It watches one whole cycle of the story
  // without drawing it, then merges the solids that stayed still into a few
  // meshes. It must run before anything invisible is added to the scene (the
  // click boxes), and before the first frame.
  batchStatic(stage.scene, { step: (seconds) => stage.simulate(seconds), to: CYCLE, every: 0.2 });

  // The time panel, in the map's own colors, with the counters inside it.
  const accentOf = (id: NodeId): string => NODES.find((node) => node.id === id)!.accent;
  const palette: Palette = {
    shell: { name: "Shell", color: accentOf("shell") },
    engram: { name: "Engram", color: accentOf("engram") },
    engines: { name: "Engines", color: accentOf("engines") },
    atlas: { name: "Atlas", color: accentOf("atlas") },
    sentinel: { name: "Sentinel", color: accentOf("sentinel") },
    workers: { name: "Workers", color: WORKERS },
    cloud: { name: "PostgreSQL", color: CLOUD },
  };
  const tracker = createTracker(stage, palette);
  createHud(stage, tracker.metrics);

  // Frame the whole map: fitted to the content and centered in the free area
  // (below the top bar), now and whenever the window changes size, as long as
  // the person has not moved the view themselves.
  const topbar = document.querySelector(".topbar");
  const frame = (): { target: THREE.Vector3; zoom: number } => {
    // Room for the titles at the sides: they keep their size while the map
    // shrinks, so a narrow screen needs at least 80px on each side.
    const side = Math.min(130, Math.max(80, container.clientWidth * 0.07));
    const view = fitView(
      {
        camera: stage.camera,
        points: extent,
        width: container.clientWidth,
        height: container.clientHeight,
        viewSize: VIEW_SIZE,
        // 32px of air above (and half a title's height more) and below.
        pad: { left: side, right: side, top: (topbar?.getBoundingClientRect().height ?? 44) + 57, bottom: 32 },
        maxZoom: 1.6,
        minZoom: 0.85,
      },
      stage.view(),
    );
    stage.setView(view.target, view.zoom);
    return view;
  };
  frame();
  const interaction = createInteraction(stage, VIEW_SIZE, selectables);
  let moved = false;
  stage.input.addEventListener("wheel", () => (moved = true), { passive: true });
  stage.input.addEventListener("pointermove", (event) => {
    if (event.buttons !== 0) moved = true;
  });
  window.addEventListener("resize", () => {
    if (!moved && !interaction.isOpen()) interaction.setHome(frame());
  });


  stage.start();
  // Labels measure their text, so draw again once the typeface has loaded.
  void document.fonts.ready.then(() => stage.invalidate());
} catch (error) {
  const message = document.createElement("pre");
  message.className = "fatal";
  message.textContent = fatalMessage(error);
  container.replaceChildren(message);
}
