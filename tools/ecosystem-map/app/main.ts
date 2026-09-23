import { fatalMessage } from "./fatal";
import { createCard } from "./scene/card";
import { createEngram } from "./scene/nodes/engram";
import { createPlatform } from "./scene/platform";
import { createStage } from "./scene/stage";

const container = document.getElementById("office");
if (!container) throw new Error("missing #office container");

// Engram's color: the soft pink of the neurons.
const ENGRAM_ACCENT = "#d98ca0";

try {
  const stage = createStage(container);

  const platform = createPlatform(ENGRAM_ACCENT);
  const engram = createEngram(platform.top - 0.2);
  const card = createCard({ name: "Engram", role: "La memoria", accent: ENGRAM_ACCENT });
  card.position.set(0, platform.top + 7, 0);

  stage.scene.add(platform.group, engram, card);
  stage.start();
} catch (error) {
  const message = document.createElement("pre");
  message.className = "fatal";
  message.textContent = fatalMessage(error);
  container.replaceChildren(message);
}
