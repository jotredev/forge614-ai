import * as THREE from "three";
import { fatalMessage } from "./fatal";
import { createEnergyLink } from "./scene/energy-link";
import { createParticles } from "./scene/particles";
import { createPlatform } from "./scene/platform";
import { createStage } from "./scene/stage";
import { theme } from "./scene/theme";

const container = document.getElementById("office");
if (!container) throw new Error("missing #office container");

const PLATFORM = { size: 8, height: 1 };

try {
  const stage = createStage(container);

  // Two test platforms to judge the style: one for information and memory,
  // one for work in progress. Real nodes arrive in step 2.
  const memory = createPlatform({
    ...PLATFORM,
    accent: theme.memory,
    code: "PRUEBA · 01",
    title: "Memoria",
    subtitle: "Información que se guarda",
  });
  memory.position.set(-6.5, 0, 3);

  const forge = createPlatform({
    ...PLATFORM,
    accent: theme.forge,
    code: "PRUEBA · 02",
    title: "Forja",
    subtitle: "Trabajo en marcha",
  });
  forge.position.set(6.5, 0, -3);

  const link = createEnergyLink(
    new THREE.Vector3(-6.5 + PLATFORM.size / 2, PLATFORM.height + 0.1, 3),
    new THREE.Vector3(6.5 - PLATFORM.size / 2, PLATFORM.height + 0.1, -3),
    theme.memory,
    3.5,
  );

  const dust = createParticles({
    count: 700,
    center: new THREE.Vector3(0, 0, 0),
    spread: new THREE.Vector3(70, 18, 70),
    color: theme.dust,
    size: 1.6,
    rise: 0.25,
    opacity: 0.45,
  });

  const sparks = createParticles({
    count: 90,
    center: new THREE.Vector3(6.5, PLATFORM.height, -3),
    spread: new THREE.Vector3(3, 5, 3),
    color: theme.forge,
    size: 2.4,
    rise: 1.4,
    opacity: 0.9,
  });

  stage.scene.add(memory, forge, link, dust, sparks);
  for (const item of [memory, forge, link, dust, sparks]) stage.animate(item);

  // Live camera readout in the corner: real telemetry, nothing invented.
  const telemetry = document.getElementById("telemetry");
  let tick = 0;
  stage.onFrame(({ camera, target }) => {
    if (!telemetry || tick++ % 6 !== 0) return;
    telemetry.textContent = [
      `X ${target.x.toFixed(2).padStart(7)}`,
      `Z ${target.z.toFixed(2).padStart(7)}`,
      `ZOOM ${camera.zoom.toFixed(2)}`,
    ].join("   ");
  });

  stage.start();
} catch (error) {
  const message = document.createElement("pre");
  message.className = "fatal";
  message.textContent = fatalMessage(error);
  container.replaceChildren(message);
}
