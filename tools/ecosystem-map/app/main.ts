import "@fontsource-variable/manrope";
import * as THREE from "three";
import { fatalMessage } from "./fatal";
import { createCard } from "./scene/card";
import { createFloor } from "./scene/floor";
import { createMessenger } from "./scene/messenger";
import { SAVE_CYCLE, createEngram } from "./scene/nodes/engram";
import { createShell } from "./scene/nodes/shell";
import { createPlatform } from "./scene/platform";
import { createStage } from "./scene/stage";

const container = document.getElementById("office");
if (!container) throw new Error("missing #office container");

// Each node's signature scene, so it reads before any label does.
const SCENES = { shell: createShell, engram: createEngram } as const;

// Nodes shown so far. They sit far apart along the screen's horizontal axis
// so each node's circuit has room and they never overlap. `needs` comes from
// the contract's responsibilities table (section 2): both work on their own.
const SPACING = 22;
const PLATE_TOP = 1.7; // top of every node plate, where bridges meet them
const NODES = [
  { id: "shell", name: "Shell", role: "La terminal", accent: "#7fb2d9", offset: -1, needs: [] },
  { id: "engram", name: "Engram", role: "La memoria", accent: "#d98ca0", offset: 1, needs: [] },
] as const;

type NodeId = (typeof NODES)[number]["id"];

// What travels between the nodes shown: one messenger walks each flow. The
// contract (section 11, line 218) has Engram serving memory to Shell, so
// memories travel from Shell to Engram to be saved: a person from Shell
// carries a memory card across the bridge and hands it over just as Engram's
// archivist starts sliding a card into the rack.
const FLOWS: ReadonlyArray<{ from: NodeId; to: NodeId; card: string; cycle: number; arriveAt: number }> = [
  { from: "shell", to: "engram", card: "#f3b7c6", cycle: SAVE_CYCLE * 4, arriveAt: 0 },
];

// Screen-horizontal direction in the isometric view.
function centerOf(id: NodeId): THREE.Vector2 {
  const offset = NODES.find((node) => node.id === id)!.offset;
  return new THREE.Vector2(offset * SPACING * Math.SQRT1_2, -offset * SPACING * Math.SQRT1_2);
}

try {
  const stage = createStage(container, 40);

  NODES.forEach((node, index) => {
    const center = centerOf(node.id);

    const floor = createFloor(center, index * 17);
    stage.scene.add(floor.object);
    stage.onTick((seconds) => floor.setTime(seconds));

    const platform = createPlatform(node.accent);
    platform.group.position.set(center.x, 0, center.y);
    stage.scene.add(platform.group);

    const scene = SCENES[node.id](platform.top);
    scene.group.position.set(center.x, 0, center.y);
    stage.scene.add(scene.group);
    stage.onTick((seconds) => scene.update(seconds));

    const card = createCard({ name: node.name, role: node.role, accent: node.accent, needs: node.needs });
    card.position.set(center.x, platform.top + 8.5, center.y);
    stage.scene.add(card);
  });

  for (const flow of FLOWS) {
    const sender = NODES.find((node) => node.id === flow.from)!;
    const receiver = NODES.find((node) => node.id === flow.to)!;
    const messenger = createMessenger({
      from: centerOf(flow.from),
      to: centerOf(flow.to),
      color: sender.accent,
      toColor: receiver.accent,
      cardColor: flow.card,
      height: PLATE_TOP,
      cycle: flow.cycle,
      arriveAt: flow.arriveAt,
    });
    stage.scene.add(messenger.group);
    stage.onTick((seconds) => messenger.update(seconds));
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
