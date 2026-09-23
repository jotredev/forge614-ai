import * as THREE from "three";
import { fatalMessage } from "./fatal";
import { createPlatform } from "./scene/platform";
import { createStage } from "./scene/stage";
import { theme } from "./scene/theme";

const container = document.getElementById("office");
if (!container) throw new Error("missing #office container");

try {
  const stage = createStage(container);
  stage.scene.add(
    createPlatform({ size: 10, height: 1.2, color: theme.testPlatform, title: "Plataforma de prueba", subtitle: "Paso 1 · ambiente" }),
  );

  // One block on the platform so soft and contact shadows can be judged.
  const block = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.2, 1),
    new THREE.MeshStandardMaterial({ color: "#e9dcc4", roughness: 0.6 }),
  );
  block.position.set(-1.5, 1.32 + 0.6, 0.8);
  block.castShadow = true;
  block.receiveShadow = true;
  stage.scene.add(block);

  stage.start();
} catch (error) {
  const message = document.createElement("pre");
  message.className = "fatal";
  message.textContent = fatalMessage(error);
  container.replaceChildren(message);
}
