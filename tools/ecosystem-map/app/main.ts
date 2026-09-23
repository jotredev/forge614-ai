import "@fontsource-variable/manrope";
import * as THREE from "three";
import { fatalMessage } from "./fatal";
import { createCard } from "./scene/card";
import { createFloor } from "./scene/floor";
import { createLink } from "./scene/link";
import { createEngram } from "./scene/nodes/engram";
import { ENGRAM_READY_AT, SHELL_CYCLE, createShell } from "./scene/nodes/shell";
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
const NODES = [
  { id: "shell", name: "Shell", role: "La terminal", accent: "#7fb2d9", offset: -1, needs: [] },
  { id: "engram", name: "Engram", role: "La memoria", accent: "#d98ca0", offset: 1, needs: [] },
] as const;

// Screen-horizontal direction in the isometric view.
function centerOf(offset: number): THREE.Vector2 {
  return new THREE.Vector2(offset * SPACING * Math.SQRT1_2, -offset * SPACING * Math.SQRT1_2);
}

try {
  const stage = createStage(container, 40);

  NODES.forEach((node, index) => {
    const center = centerOf(node.offset);

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

  // Engram hands Shell memory, status and MCP (contract, section 11). The
  // envelope reaches Shell just as its terminal prints "engram listo".
  const link = createLink({
    from: centerOf(1),
    to: centerOf(-1),
    color: "#d98ca0",
    what: "memoria · estado · MCP",
    source: "Contrato del ecosistema §11, línea 218",
    cycle: SHELL_CYCLE,
    arriveAt: ENGRAM_READY_AT,
  });
  stage.scene.add(link.object);
  stage.onTick((seconds) => link.update(seconds));

  stage.start();
  // Labels measure their text, so draw again once the typeface has loaded.
  void document.fonts.ready.then(() => stage.invalidate());
} catch (error) {
  const message = document.createElement("pre");
  message.className = "fatal";
  message.textContent = fatalMessage(error);
  container.replaceChildren(message);
}
