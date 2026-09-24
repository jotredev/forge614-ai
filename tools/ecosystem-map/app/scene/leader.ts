import type { Point } from "./pointer";

// The line that joins the selected node to its panel, like a call-out on a
// ship's display: a dot on the node, a diagonal (the map's own angle) and a
// straight run into the panel's edge. It is redrawn after every frame, so it
// stays pinned to the node while the camera flies. Opening it draws the line
// from the node to the panel once.

const NS = "http://www.w3.org/2000/svg";

export type Leader = {
  show(accent: string): void;
  hide(): void;
  // `from` is the node's point on screen. `to` is where the line lands on
  // the panel; `vertical` drops straight down onto a sheet at the bottom.
  update(from: Point, to: Point, vertical: boolean): void;
  dispose(): void;
};

function svg<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(NS, tag);
}

export function createLeader(): Leader {
  const root = svg("svg");
  root.setAttribute("class", "leader");
  root.setAttribute("aria-hidden", "true");

  // pathLength 1 lets the draw-in animation ignore the line's real length,
  // which changes on every frame while the camera moves.
  const line = svg("path");
  line.setAttribute("class", "leader__line");
  line.setAttribute("pathLength", "1");
  const ring = svg("circle");
  ring.setAttribute("class", "leader__ring");
  ring.setAttribute("r", "9");
  const dot = svg("circle");
  dot.setAttribute("class", "leader__dot");
  dot.setAttribute("r", "3.5");
  const cap = svg("circle");
  cap.setAttribute("class", "leader__cap");
  cap.setAttribute("r", "2.5");
  root.append(line, ring, dot, cap);
  document.body.append(root);

  return {
    show(accent) {
      root.style.setProperty("--accent", accent);
      root.classList.remove("is-open");
      // Reading a layout property restarts the animation on re-open.
      void root.getBoundingClientRect();
      root.classList.add("is-open");
    },
    hide() {
      root.classList.remove("is-open");
    },
    update(from, to, vertical) {
      let path: string;
      if (vertical) {
        path = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
      } else {
        // Diagonal until level with the panel, then straight in.
        const rise = Math.abs(to.y - from.y);
        const bend = from.x + rise;
        path = bend < to.x ? `M ${from.x} ${from.y} L ${bend} ${to.y} L ${to.x} ${to.y}` : `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
      }
      line.setAttribute("d", path);
      ring.setAttribute("cx", String(from.x));
      ring.setAttribute("cy", String(from.y));
      dot.setAttribute("cx", String(from.x));
      dot.setAttribute("cy", String(from.y));
      cap.setAttribute("cx", String(to.x));
      cap.setAttribute("cy", String(to.y));
    },
    dispose() {
      root.remove();
    },
  };
}
