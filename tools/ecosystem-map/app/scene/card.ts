import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

// Floating title for a node: a small caps line with its role above the
// large name. Plain HTML, so it stays sharp at any zoom.

export type CardText = {
  name: string;
  role: string;
  accent: string;
  // What kind of place it is; nodes by default.
  kind?: string;
};

export function createCard(text: CardText): CSS2DObject {
  const card = document.createElement("div");
  card.className = "node-card";
  card.style.setProperty("--accent", text.accent);

  const eyebrow = document.createElement("div");
  eyebrow.className = "node-card__eyebrow";
  eyebrow.textContent = `${(text.kind ?? "nodo").toUpperCase()} · ${text.role.toUpperCase()}`;

  const name = document.createElement("div");
  name.className = "node-card__name";
  name.textContent = text.name;

  card.append(eyebrow, name);
  return new CSS2DObject(card);
}
