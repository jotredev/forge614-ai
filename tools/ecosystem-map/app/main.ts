import "@fontsource-variable/manrope";
import * as THREE from "three";
import { fatalMessage } from "./fatal";
import { createCard } from "./scene/card";
import { createFloor } from "./scene/floor";
import { createEngram } from "./scene/nodes/engram";
import { createPlatform } from "./scene/platform";
import { createStage } from "./scene/stage";

const container = document.getElementById("office");
if (!container) throw new Error("missing #office container");

// Nodes shown so far. They sit far apart along the screen's horizontal axis
// so each node's circuit has room and they never overlap.
const SPACING = 22;
const NODES = [
  { id: "shell", name: "Shell", role: "La terminal", accent: "#7fb2d9", offset: -1 },
  { id: "engram", name: "Engram", role: "La memoria", accent: "#d98ca0", offset: 1 },
];

try {
  const stage = createStage(container, 40);

  NODES.forEach((node, index) => {
    // Screen-horizontal direction in the isometric view.
    const center = new THREE.Vector2(node.offset * SPACING * Math.SQRT1_2, -node.offset * SPACING * Math.SQRT1_2);

    const floor = createFloor(center, index * 17);
    stage.scene.add(floor.object);
    stage.onTick((seconds) => floor.setTime(seconds));

    const platform = createPlatform(node.accent);
    platform.group.position.set(center.x, 0, center.y);
    stage.scene.add(platform.group);

    if (node.id === "engram") {
      const engram = createEngram(platform.top - 0.2);
      engram.position.set(center.x, 0, center.y);
      stage.scene.add(engram);
    }

    const card = createCard({ name: node.name, role: node.role, accent: node.accent });
    card.position.set(center.x, platform.top + 7, center.y);
    stage.scene.add(card);
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
