import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { theme } from "./theme";

export type PlatformOptions = { size: number; height: number; color: string; title: string; subtitle: string };

export function createPlatform(options: PlatformOptions): THREE.Group {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new RoundedBoxGeometry(options.size, options.height, options.size, 4, 0.35),
    new THREE.MeshStandardMaterial({ color: theme.platformSide, roughness: 0.85 }),
  );
  base.position.y = options.height / 2;
  base.castShadow = true;
  base.receiveShadow = true;

  const top = new THREE.Mesh(
    new RoundedBoxGeometry(options.size - 0.3, 0.12, options.size - 0.3, 4, 0.05),
    new THREE.MeshStandardMaterial({ color: options.color, roughness: 0.7 }),
  );
  top.position.y = options.height + 0.06;
  top.receiveShadow = true;

  group.add(base, top);

  const card = document.createElement("div");
  card.className = "platform-card";
  const title = document.createElement("div");
  title.className = "platform-card__title";
  title.textContent = options.title;
  const subtitle = document.createElement("div");
  subtitle.className = "platform-card__subtitle";
  subtitle.textContent = options.subtitle;
  card.append(title, subtitle);

  const label = new CSS2DObject(card);
  // Float the card above the back corner so it never hides the platform.
  label.position.set(-options.size / 2, options.height + 4.5, -options.size / 2);
  group.add(label);

  return group;
}
