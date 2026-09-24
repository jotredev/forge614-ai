import type { Term } from "./glossary";

// The small bubble that explains a technical word, next to the word. It
// opens on hover (mouse), on focus (keyboard) and on tap (touch), and closes
// when the pointer leaves, on blur, on Escape, on a tap elsewhere or when the
// panel scrolls. Only one is open at a time. Built with textContent.

export type Tip = {
  // Make `button` open the explanation of `term`.
  attach(button: HTMLButtonElement, term: Term): void;
  setAccent(color: string): void;
  // The panel scrolled: a word under the keyboard's focus keeps its bubble
  // (moved along with it); one opened by the mouse closes.
  onScroll(): void;
  hide(): void;
  dispose(): void;
};

const GAP = 8; // space between the word and the bubble
const MARGIN = 8; // space kept from the edge of the screen

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createTip(id = "info-tip"): Tip {
  const root = el("div", "tip");
  root.id = id;
  root.setAttribute("role", "tooltip");
  const shape = el("div", "tip__shape");
  root.append(shape);
  document.body.append(root);

  let current: HTMLElement | null = null;
  let currentTerm: Term | null = null;

  const hide = (): void => {
    root.classList.remove("is-open");
    current = null;
    currentTerm = null;
  };

  const show = (button: HTMLElement, term: Term): void => {
    const parts: HTMLElement[] = [el("h4", "tip__term", term.name), el("h5", "tip__label", "Qué es"), el("p", "tip__text", term.what)];
    if (term.look) parts.push(el("h5", "tip__label", "Cómo se ve"), el("pre", "tip__look", term.look));
    parts.push(el("h5", "tip__label", "Aquí"), el("p", "tip__text", term.here));
    shape.replaceChildren(...parts);
    current = button;
    currentTerm = term;
    // Measure while invisible, then place: below the word if there is room,
    // above it if not, and never past the sides of the screen.
    root.classList.add("is-measuring");
    const box = root.getBoundingClientRect();
    const word = button.getClientRects()[0] ?? button.getBoundingClientRect();
    const below = word.bottom + GAP + box.height <= window.innerHeight - MARGIN;
    const top = below ? word.bottom + GAP : Math.max(MARGIN, word.top - GAP - box.height);
    const left = Math.min(Math.max(MARGIN, word.left + word.width / 2 - box.width / 2), window.innerWidth - box.width - MARGIN);
    root.style.top = `${top}px`;
    root.style.left = `${left}px`;
    root.classList.remove("is-measuring");
    root.classList.add("is-open");
  };

  // A tap anywhere but on a word closes the bubble.
  const onOutside = (event: PointerEvent): void => {
    if (current && !(event.target instanceof Node && current.contains(event.target))) hide();
  };
  document.addEventListener("pointerdown", onOutside);

  return {
    attach(button, term) {
      button.setAttribute("aria-describedby", root.id);
      button.setAttribute("aria-label", `${button.textContent ?? term.name}: ver qué significa`);
      // Only a real mouse opens it by hovering; touch opens it with the tap.
      let pointer = "mouse";
      button.addEventListener("pointerenter", (event) => {
        pointer = event.pointerType;
        if (event.pointerType === "mouse") show(button, term);
      });
      button.addEventListener("pointerleave", (event) => {
        if (event.pointerType === "mouse" && current === button) hide();
      });
      button.addEventListener("pointerdown", (event) => {
        pointer = event.pointerType;
      });
      button.addEventListener("click", () => {
        if (pointer === "mouse") show(button, term);
        else if (current === button) hide();
        else show(button, term);
      });
      // Keyboard focus, not the focus a click leaves behind.
      button.addEventListener("focus", () => {
        if (button.matches(":focus-visible")) show(button, term);
      });
      button.addEventListener("blur", () => {
        if (current === button) hide();
      });
      button.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && current === button) {
          // Close only the bubble, not the whole panel.
          event.stopPropagation();
          hide();
        }
      });
    },
    setAccent: (color) => root.style.setProperty("--accent", color),
    onScroll: () => {
      if (current && currentTerm && document.activeElement === current) show(current, currentTerm);
      else hide();
    },
    hide,
    dispose() {
      document.removeEventListener("pointerdown", onOutside);
      root.remove();
    },
  };
}
