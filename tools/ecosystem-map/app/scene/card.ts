import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

// Floating title for a node: a small caps line with its role above the
// large name, and under it whether the node works on its own or what it
// needs. Plain HTML, so it stays sharp at any zoom.

export type CardText = {
  name: string;
  role: string;
  accent: string;
  // Nodes it needs to work; empty means it works on its own.
  needs: readonly string[];
};

export function createCard(text: CardText): CSS2DObject {
  const card = document.createElement("div");
  card.className = "node-card";
  card.style.setProperty("--accent", text.accent);

  const eyebrow = document.createElement("div");
  eyebrow.className = "node-card__eyebrow";
  eyebrow.textContent = `NODO · ${text.role.toUpperCase()}`;

  const name = document.createElement("div");
  name.className = "node-card__name";
  name.textContent = text.name;

  const status = document.createElement("div");
  status.className = text.needs.length === 0 ? "node-card__status node-card__status--alone" : "node-card__status";
  status.textContent = text.needs.length === 0 ? "funciona solo" : `necesita: ${text.needs.join(" · ")}`;

  card.append(eyebrow, name, status);
  return new CSS2DObject(card);
}
