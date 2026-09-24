import { type Term, splitTerms, termFor } from "./glossary";
import type { NodeInfo } from "./nodes/info";
import { createTip } from "./tip";

// The panel opened by clicking a node: a pane of tinted glass in the node's
// color, joined to the node by a line (see leader.ts). Everything is in one
// scroll; a rail of dots on its left, like a circuit trace, shows where the
// reading is and jumps to each part. Plain HTML built with textContent, never
// markup from strings; `code` spans come from `backticks` in the text, and
// the technical words in glossary.ts open an explanation (see tip.ts), the
// first time each one appears.

export type PanelContent = { name: string; role: string; accent: string; info: NodeInfo };

export type InfoPanel = {
  show(content: PanelContent): void;
  hide(): void;
  // Where the panel is on screen, to aim the line at it.
  rect(): DOMRect;
  dispose(): void;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// What the sections use to write text: it turns `commands` into code and
// marks each glossary word the first time it shows up in the panel.
type Text = {
  rich(text: string): (string | HTMLElement)[];
  paragraph(className: string, text: string): HTMLElement;
};

type Section = { rail: string; build: (content: PanelContent, text: Text) => HTMLElement };

const SECTIONS: Section[] = [
  {
    rail: "Resumen",
    build: ({ info }, { paragraph }) => {
      const section = el("section", "info__section");
      // In reading order, so a word is marked where it first appears.
      section.append(paragraph("info__lead", info.analogy), el("h3", "info__title", "Para qué sirve"), paragraph("info__text", info.purpose));
      const never = el("div", "info__never");
      never.append(el("h4", "info__never-title", "Lo que no hace"), paragraph("info__text", info.never));
      section.append(never);
      return section;
    },
  },
  {
    rail: "Cómo funciona",
    build: ({ info }, { paragraph }) => {
      const section = el("section", "info__section");
      const trace = el("ol", "info__trace");
      for (const step of info.steps) {
        const item = el("li", "info__stop");
        item.append(el("strong", "info__stop-title", step.title), paragraph("info__text", step.text));
        trace.append(item);
      }
      section.append(el("h3", "info__title", "Cómo funciona"), trace);
      return section;
    },
  },
  {
    rail: "Conexiones",
    build: ({ info }, { rich }) => {
      const section = el("section", "info__section");
      section.append(el("h3", "info__title", "Conexiones"));
      for (const link of info.links) {
        const port = el("div", "info__port");
        port.append(el("h4", "info__port-name", link.name));
        for (const [kind, label, text] of [
          ["in", "Recibe", link.receives],
          ["out", "Envía", link.sends],
        ] as const) {
          const row = el("p", `info__flow info__flow--${kind}`);
          row.append(el("span", "info__flow-label", label), ...rich(text));
          port.append(row);
        }
        section.append(port);
      }
      return section;
    },
  },
  {
    rail: "Detalles",
    build: ({ info }, { paragraph }) => {
      const section = el("section", "info__section");
      const list = el("dl", "info__facts");
      for (const fact of info.facts) {
        const value = el("dd", "info__fact-value");
        // A new line in the text starts a new paragraph.
        for (const line of fact.value.split("\n")) value.append(paragraph("info__fact-line", line));
        list.append(el("dt", "info__fact-label", fact.label), value);
      }
      section.append(el("h3", "info__title", "Detalles"), list);
      return section;
    },
  },
];

export function createInfoPanel(onClose: () => void): InfoPanel {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const root = el("aside", "info");
  root.setAttribute("aria-label", "Ficha del nodo");
  // Closed, it must not be reachable with the keyboard.
  root.inert = true;
  const shape = el("div", "info__shape");
  root.append(shape);
  document.body.append(root);

  const head = el("header", "info__head");
  const name = el("h2", "info__name");
  const role = el("p", "info__role");
  const close = el("button", "info__close", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Cerrar ficha");
  close.addEventListener("click", onClose);
  head.append(name, role, close);

  const tip = createTip();

  // A word with an explanation: a button that opens its bubble.
  const marked = new Set<string>();
  const termButton = (content: string | HTMLElement, term: Term): HTMLButtonElement => {
    marked.add(term.name);
    const button = el("button", "info__term");
    button.type = "button";
    button.append(content);
    tip.attach(button, term);
    return button;
  };
  const text: Text = {
    rich: (source) =>
      source.split("`").flatMap((part, i): (string | HTMLElement)[] => {
        if (i % 2 === 1) {
          const code = el("code", "info__code", part);
          const term = termFor(part);
          return [term && !marked.has(term.name) ? termButton(code, term) : code];
        }
        return splitTerms(part).map((piece) => (typeof piece === "string" || marked.has(piece.term.name) ? (typeof piece === "string" ? piece : piece.text) : termButton(piece.text, piece.term)));
      }),
    paragraph: (className, source) => {
      const node = el("p", className);
      node.append(...text.rich(source));
      return node;
    },
  };

  const scroller = el("div", "info__scroll");
  scroller.tabIndex = 0;
  scroller.setAttribute("role", "region");
  scroller.setAttribute("aria-label", "Contenido de la ficha");

  const rail = el("nav", "info__rail");
  rail.setAttribute("aria-label", "Secciones de la ficha");
  const dots = SECTIONS.map((section, i) => {
    const dot = el("button", "info__dot");
    dot.type = "button";
    dot.title = section.rail;
    dot.setAttribute("aria-label", section.rail);
    dot.addEventListener("click", () => {
      const target = scroller.children[i] as HTMLElement | undefined;
      if (target) scroller.scrollTo({ top: target.offsetTop - 8, behavior: reducedMotion ? "auto" : "smooth" });
    });
    return dot;
  });
  rail.append(...dots);

  const main = el("div", "info__main");
  main.append(rail, scroller);
  shape.append(head, main);

  // The dot of the part being read: the last one whose top has passed the
  // top of the scroll, and the last dot once the end is reached.
  const follow = (): void => {
    const sections = [...scroller.children] as HTMLElement[];
    let current = 0;
    sections.forEach((section, i) => {
      if (section.offsetTop <= scroller.scrollTop + 40) current = i;
    });
    if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4) current = sections.length - 1;
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === current));
  };
  scroller.addEventListener("scroll", follow, { passive: true });
  scroller.addEventListener("scroll", tip.onScroll, { passive: true });

  return {
    show(next) {
      root.style.setProperty("--accent", next.accent);
      tip.setAccent(next.accent);
      tip.hide();
      name.textContent = next.name;
      role.textContent = next.role;
      marked.clear();
      scroller.replaceChildren(...SECTIONS.map((section) => section.build(next, text)));
      scroller.scrollTop = 0;
      follow();
      root.inert = false;
      root.classList.add("is-open");
    },
    hide() {
      tip.hide();
      root.classList.remove("is-open");
      root.inert = true;
    },
    rect: () => root.getBoundingClientRect(),
    dispose() {
      tip.dispose();
      root.remove();
    },
  };
}
